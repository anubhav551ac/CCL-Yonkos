import { useState, useEffect, useRef } from 'react'
import { generateMockData } from '../utils/mockData'
import { saveReading, getAnalytics, sendTestSMS, sendAlert, getSMSSettings, updateSMSSettings, getAlertSettings, updateAlertSettings, getRecentReadings, getArduinoPorts, connectArduino, disconnectArduino, getArduinoStatus } from '../utils/api'

const SlopeMonitoring = ({ location, onBack, isAdminMode = false }) => {
  const [sensorData, setSensorData] = useState([])
  const [currentDistance, setCurrentDistance] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [useRealArduino, setUseRealArduino] = useState(false)
  const [useMockData, setUseMockData] = useState(false)
  const [analytics, setAnalytics] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [smsStatus, setSmsStatus] = useState('')
  const [bulkSaveCount, setBulkSaveCount] = useState(0)
  const [pendingReadings, setPendingReadings] = useState([])
  const [trendAnalysis, setTrendAnalysis] = useState({
    daily: { change: 0, risk: 'SAFE' },
    weekly: { change: 0, risk: 'SAFE' },
    monthly: { change: 0, risk: 'SAFE' },
    overall: 'SAFE'
  })
  const [smsSettings, setSmsSettings] = useState({
    enabled: false,
    dangerEnabled: true,
    warningEnabled: false,
    safeEnabled: false
  })
  const [alertSettings, setAlertSettings] = useState({
    phone: '9779860809730',
    cooldown: 300000
  })
  const [editingPhone, setEditingPhone] = useState(false)
  const [tempPhone, setTempPhone] = useState('')
  const arduinoRef = useRef(null)

  // Load recent readings from database for this specific location
  const loadRecentReadings = async () => {
    try {
      console.log('📊 Loading recent readings from database...');
      const readings = await getRecentReadings(50, location?.id || null);
      
      console.log('📥 Raw readings response:', readings);
      
      // Handle both array response and object response
      const readingsArray = Array.isArray(readings) ? readings : (readings.readings || []);
      
      if (readingsArray && readingsArray.length > 0) {
        // Convert database readings to sensor data format (timestamps are already in Nepal time)
        const formattedReadings = readingsArray.map(r => {
          const date = new Date(r.timestamp);
          
          return {
            distance: r.distance,
            time: date.toLocaleTimeString('en-US', {
              hour12: true,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            timestamp: date.getTime()
          };
        });
        
        setSensorData(formattedReadings);
        setCurrentDistance(formattedReadings[0]?.distance || 0);
        setIsConnected(true);
        console.log(`✅ Loaded ${formattedReadings.length} readings from database`);
        console.log('📊 Latest reading:', formattedReadings[0]);
      } else {
        console.log('📊 No readings found in database');
        setSensorData([]);
        setCurrentDistance(0);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('❌ Failed to load recent readings:', error);
      setSensorData([]);
      setCurrentDistance(0);
      setIsConnected(false);
    }
  }

  // Load data on mount for non-admin users
  useEffect(() => {
    if (!isAdminMode) {
      loadRecentReadings()
      // Refresh data every 30 seconds for non-admin users
      const interval = setInterval(loadRecentReadings, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdminMode])

  // Load recent readings from database for all users (both admin and non-admin)
  useEffect(() => {
    loadRecentReadings()
    // Refresh data every 5 seconds to show latest readings
    const interval = setInterval(loadRecentReadings, 5000)
    return () => clearInterval(interval)
  }, [])

  const connectToArduino = async () => {
    try {
      console.log('🔌 Connecting to Arduino via server...')
      
      // First check if server is running
      try {
        const statusCheck = await fetch('http://localhost:5000/api/arduino/status')
        if (!statusCheck.ok) {
          throw new Error(`Server not responding: ${statusCheck.status}`)
        }
        console.log('✅ Server is running, checking available ports...')
        
        // Check available ports
        const portsResponse = await fetch('http://localhost:5000/api/arduino/ports')
        const portsData = await portsResponse.json()
        console.log('📋 Available Arduino ports:', portsData.ports)
        
        if (portsData.ports.length === 0) {
          alert('No Arduino ports detected. Please check:\n1. Arduino is connected via USB\n2. Arduino drivers are installed\n3. Arduino IDE Serial Monitor is closed')
          return
        }
        
      } catch (serverCheck) {
        console.error('❌ Server is not running or Arduino endpoints not available:', serverCheck.message)
        alert('Server is not running with Arduino support. Please:\n1. Run "cd server && npm install"\n2. Run "npm run dev" in server directory\n3. Try connecting again')
        return
      }
      
      // Try server-side connection, binding Arduino readings to this location
      const result = await connectArduino(null, location?.id || null)
      
      if (result.success) {
        setUseRealArduino(true)
        setIsConnected(true)
        console.log('✅ Arduino connected successfully via server!')
        alert('Arduino connected successfully! Data will be collected continuously even after page refresh.')
      } else {
        throw new Error(result.error || 'Server connection failed')
      }
      
    } catch (error) {
      console.error('❌ Failed to connect to Arduino:', error)
      
      if (error.message.includes('404') || error.message.includes('Server not responding')) {
        alert('Arduino server endpoints not available. Please:\n1. Install packages: cd server && npm install\n2. Restart server: npm run dev\n3. Try again')
      } else {
        alert(`Connection failed: ${error.message}\n\nCheck server console for detailed error logs.`)
      }
    }
  }

  const disconnectArduinoHandler = async () => {
    try {
      console.log('🔌 Disconnecting Arduino via server...')
      const result = await disconnectArduino()
      
      if (result.success) {
        setUseRealArduino(false)
        setIsConnected(false)
        console.log('✅ Arduino disconnected successfully!')
        alert('Arduino disconnected.')
      } else {
        throw new Error(result.error || 'Disconnect failed')
      }
    } catch (error) {
      console.error('❌ Failed to disconnect Arduino:', error)
      alert(`Disconnect failed: ${error.message}`)
    }
  }

  // Check Arduino status periodically
  useEffect(() => {
    const checkArduinoStatus = async () => {
      try {
        const status = await getArduinoStatus()
        if (status.success) {
          const attachedLocationId = status.location_id || null
          const isForThisLocation = status.isConnected && (!location?.id || location.id === attachedLocationId)

          setIsConnected(isForThisLocation)

          if (isForThisLocation && !useRealArduino) {
            setUseRealArduino(true)
            console.log('📡 Arduino connection detected for this location from server')
          } else if (!isForThisLocation && useRealArduino) {
            setUseRealArduino(false)
            console.log('🔌 Arduino not attached to this location (or disconnected)')
          }
        }
      } catch (error) {
        console.error('Error checking Arduino status:', error)
      }
    }

    // Check status immediately and then every 5 seconds
    checkArduinoStatus()
    const interval = setInterval(checkArduinoStatus, 5000)
    
    return () => clearInterval(interval)
  }, [useRealArduino, location?.id])

  const handleSendTestSMS = async () => {
    setSmsStatus('Sending test SMS...')
    try {
      await sendTestSMS(alertSettings.phone, 'Hi from Landslide Monitor! System is working.')
      setSmsStatus('✅ Test SMS sent successfully!')
      setTimeout(() => setSmsStatus(''), 3000)
    } catch (error) {
      setSmsStatus('❌ Failed to send test SMS')
      setTimeout(() => setSmsStatus(''), 3000)
    }
  }

  const handleSendAlert = async () => {
    const risk = getEnhancedRiskLevel(currentDistance)
    setSmsStatus('Sending alert...')
    try {
      await sendAlert(alertSettings.phone, currentDistance, risk.level)
      setSmsStatus(`✅ ${risk.level} alert sent successfully!`)
      setTimeout(() => setSmsStatus(''), 3000)
    } catch (error) {
      setSmsStatus('❌ Failed to send alert')
      setTimeout(() => setSmsStatus(''), 3000)
    }
  }

  const loadAnalytics = async () => {
    try {
      const data = await getAnalytics(selectedPeriod, location?.id || null)
      setAnalytics(data)
      
      // Perform trend analysis on real data only
      if (useRealArduino && data.length > 0) {
        performTrendAnalysis(data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  // Advanced trend analysis for landslide risk assessment
  const performTrendAnalysis = async (analyticsData) => {
    try {
      // Get data for different periods
      const [dailyData, weeklyData, monthlyData] = await Promise.all([
        getAnalytics('day', location?.id || null),
        getAnalytics('week', location?.id || null), 
        getAnalytics('month', location?.id || null)
      ])

      const analysis = {
        daily: analyzePeriodTrend(dailyData, 5.0), // 5% threshold for daily
        weekly: analyzePeriodTrend(weeklyData, 8.0), // 8% threshold for weekly
        monthly: analyzePeriodTrend(monthlyData, 10.0), // 10% threshold for monthly
        overall: 'SAFE'
      }

      // Determine overall risk based on worst case
      const risks = [analysis.daily.risk, analysis.weekly.risk, analysis.monthly.risk]
      if (risks.includes('CRITICAL')) {
        analysis.overall = 'CRITICAL'
      } else if (risks.includes('HIGH')) {
        analysis.overall = 'HIGH'
      } else if (risks.includes('MODERATE')) {
        analysis.overall = 'MODERATE'
      } else {
        analysis.overall = 'SAFE'
      }

      setTrendAnalysis(analysis)
      
      // Log trend analysis for monitoring
      console.log('🔍 Trend Analysis Results:', analysis)
      
    } catch (error) {
      console.error('Failed to perform trend analysis:', error)
    }
  }

  const analyzePeriodTrend = (data, threshold) => {
    if (!data || data.length < 2) {
      return { change: 0, risk: 'SAFE', status: 'Insufficient data' }
    }

    // Calculate trend over the period
    const recent = data.slice(0, Math.ceil(data.length / 3)) // Recent 1/3 of data
    const older = data.slice(-Math.ceil(data.length / 3)) // Older 1/3 of data

    const recentAvg = recent.reduce((sum, d) => sum + parseFloat(d.avg_distance), 0) / recent.length
    const olderAvg = older.reduce((sum, d) => sum + parseFloat(d.avg_distance), 0) / older.length

    // Calculate percentage change (negative = getting closer = more dangerous)
    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100

    // Determine risk level based on change
    let risk = 'SAFE'
    let status = 'Stable'

    if (Math.abs(percentChange) >= threshold * 2) {
      risk = 'CRITICAL'
      status = percentChange < 0 ? 'Rapid ground movement detected' : 'Significant distance increase'
    } else if (Math.abs(percentChange) >= threshold * 1.5) {
      risk = 'HIGH'
      status = percentChange < 0 ? 'Concerning ground movement' : 'Notable distance change'
    } else if (Math.abs(percentChange) >= threshold) {
      risk = 'MODERATE'
      status = percentChange < 0 ? 'Ground movement detected' : 'Distance change observed'
    } else if (Math.abs(percentChange) >= threshold * 0.5) {
      risk = 'LOW'
      status = 'Minor variations detected'
    }

    return {
      change: percentChange,
      risk,
      status,
      recentAvg: recentAvg.toFixed(1),
      olderAvg: olderAvg.toFixed(1)
    }
  }

  // Enhanced risk level that considers both current distance and trends
  const getEnhancedRiskLevel = (distance) => {
    // Basic distance-based risk
    let distanceRisk = 'SAFE'
    let distanceColor = '#10b981'
    
    if (distance < 50) {
      distanceRisk = 'DANGER'
      distanceColor = '#ef4444'
    } else if (distance < 100) {
      distanceRisk = 'WARNING'
      distanceColor = '#f59e0b'
    }

    // If using real Arduino, consider trend analysis
    if (useRealArduino && trendAnalysis.overall !== 'SAFE') {
      // Trend analysis overrides if more severe
      const trendRiskLevels = {
        'SAFE': 0,
        'LOW': 1,
        'MODERATE': 2,
        'HIGH': 3,
        'CRITICAL': 4
      }

      const distanceRiskLevels = {
        'SAFE': 0,
        'WARNING': 2,
        'DANGER': 4
      }

      const maxRiskLevel = Math.max(
        trendRiskLevels[trendAnalysis.overall] || 0,
        distanceRiskLevels[distanceRisk] || 0
      )

      if (maxRiskLevel >= 4) {
        return { level: 'CRITICAL', color: '#dc2626', source: 'trend' }
      } else if (maxRiskLevel >= 3) {
        return { level: 'HIGH RISK', color: '#ea580c', source: 'trend' }
      } else if (maxRiskLevel >= 2) {
        return { level: 'MODERATE', color: '#f59e0b', source: 'trend' }
      } else if (maxRiskLevel >= 1) {
        return { level: 'LOW RISK', color: '#65a30d', source: 'trend' }
      }
    }

    return { level: distanceRisk, color: distanceColor, source: 'distance' }
  }

  const loadSMSSettings = async () => {
    try {
      const settings = await getSMSSettings()
      setSmsSettings(settings)
    } catch (error) {
      console.error('Failed to load SMS settings:', error)
    }
  }

  const loadAlertSettings = async () => {
    try {
      const settings = await getAlertSettings()
      setAlertSettings(settings)
      setTempPhone(settings.phone)
    } catch (error) {
      console.error('Failed to load alert settings:', error)
    }
  }

  const handlePhoneUpdate = async () => {
    try {
      setSmsStatus('Updating phone number...')
      const updated = await updateAlertSettings({ phone: tempPhone })
      setAlertSettings(updated)
      setEditingPhone(false)
      setSmsStatus('✅ Phone number updated!')
      setTimeout(() => setSmsStatus(''), 2000)
    } catch (error) {
      console.error('Failed to update phone number:', error)
      setSmsStatus('❌ Failed to update phone number')
      setTimeout(() => setSmsStatus(''), 3000)
    }
  }

  const handleSMSSettingsChange = async (newSettings) => {
    try {
      console.log('Updating SMS settings:', newSettings)
      setSmsStatus('Updating settings...')
      const updatedSettings = await updateSMSSettings(newSettings)
      console.log('Settings updated successfully:', updatedSettings)
      setSmsSettings(updatedSettings)
      setSmsStatus('✅ SMS settings updated!')
      setTimeout(() => setSmsStatus(''), 2000)
    } catch (error) {
      console.error('Failed to update SMS settings:', error)
      console.error('Error details:', error.message)
      setSmsStatus(`❌ Failed to update settings: ${error.message}`)
      setTimeout(() => setSmsStatus(''), 3000)
    }
  }

  useEffect(() => {
    let interval = null;

    // Only generate mock data if both conditions are met:
    // 1. Not using real Arduino
    // 2. Mock data toggle is enabled
    if (!useRealArduino && useMockData) {
      interval = setInterval(async () => {
        const newReading = generateMockData()
        setCurrentDistance(newReading.distance)
        
        setSensorData(prev => {
          const updated = [...prev, newReading].slice(-50)
          return updated
        })
        
        setPendingReadings(prev => [...prev, newReading])
        setIsConnected(Math.random() > 0.1)
      }, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [useRealArduino, useMockData])

  useEffect(() => {
    loadAnalytics()
    loadSMSSettings()
    loadAlertSettings()
  }, [selectedPeriod])

  const getRiskLevel = (distance) => {
    if (distance < 50) return { level: 'DANGER', color: '#ef4444' }
    if (distance < 100) return { level: 'WARNING', color: '#f59e0b' }
    return { level: 'SAFE', color: '#10b981' }
  }

  // Generate hill visualization points - Realistic rough slope based on sensor readings
  const generateHillPoints = () => {
    if (sensorData.length < 3) return { hillPoints: [], sensorPosition: null }
    
    const width = 600
    const height = 250
    const readings = sensorData.slice(-20) // Use last 20 readings for realistic terrain
    
    // Calculate average distance
    const avgDistance = readings.reduce((sum, r) => sum + r.distance, 0) / readings.length
    
    // Generate realistic hill profile with natural variations
    const hillPoints = []
    const numPoints = 30 // More points for smoother curve
    
    for (let i = 0; i <= numPoints; i++) {
      const x = (width / numPoints) * i
      
      // Base slope - descending from left to right
      const baseSlope = height * 0.75 - (x / width) * (height * 0.4)
      
      // Add natural terrain variations using multiple sine waves
      const variation1 = Math.sin(x / 50) * 15 // Large undulations
      const variation2 = Math.sin(x / 20) * 8  // Medium bumps
      const variation3 = Math.sin(x / 10) * 4  // Small roughness
      
      // Add some randomness based on actual sensor readings
      const readingIndex = Math.floor((i / numPoints) * Math.min(readings.length - 1, 10))
      const readingVariation = readings[readingIndex] ? (readings[readingIndex].distance - avgDistance) * 0.3 : 0
      
      // Combine all variations
      const y = Math.max(40, Math.min(height - 20, 
        baseSlope + variation1 + variation2 + variation3 + readingVariation
      ))
      
      hillPoints.push({ x, y })
    }
    
    // Sensor position at center, perpendicular to hill surface
    const centerX = width / 2
    const centerIndex = Math.floor(hillPoints.length / 2)
    const hillY = hillPoints[centerIndex]?.y || height * 0.6
    
    // Position sensor based on average distance reading
    const sensorY = Math.max(20, hillY - avgDistance * 0.8)
    
    return {
      hillPoints,
      sensorPosition: { x: centerX, y: sensorY, distance: avgDistance, hillY }
    }
  }

  const { hillPoints, sensorPosition } = generateHillPoints()
  const risk = getEnhancedRiskLevel(currentDistance)

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button 
          onClick={onBack}
          style={{ 
            padding: '10px 20px', 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '20px'
          }}
        >
          ← Back to Home
        </button>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>📐 Slope Monitoring</h1>
          <p style={{ fontSize: '1.2rem', margin: 0, opacity: 0.9 }}>
            {location?.name || 'Unknown Location'} - Real-time Hill Stability Analysis
          </p>
          {location?.description && (
            <p style={{ fontSize: '1rem', margin: '5px 0 0 0', opacity: 0.8 }}>
              {location.description}
            </p>
          )}
          {location?.latitude && location?.longitude && (
            <p style={{ fontSize: '0.9rem', margin: '5px 0 0 0', opacity: 0.7 }}>
              📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          )}
        </div>
      </div>

      {/* Data Source Indicator for Non-Admin Users */}
      {!isAdminMode && sensorData.length > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          padding: '15px',
          background: 'rgba(16, 185, 129, 0.15)',
          borderRadius: '15px',
          marginBottom: '30px',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>📡 Live Data</span>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>
              Viewing real-time sensor readings from this location (updates every 5s)
            </span>
          </div>
          <button
            onClick={loadRecentReadings}
            style={{
              padding: '8px 16px',
              background: 'rgba(16, 185, 129, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(16, 185, 129, 1)'
              e.target.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(16, 185, 129, 0.8)'
              e.target.style.transform = 'translateY(0)'
            }}
          >
            🔄 Refresh Now
          </button>
        </div>
      )}

      {/* No Data Indicator */}
      {!isAdminMode && sensorData.length === 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          padding: '15px',
          background: 'rgba(245, 158, 11, 0.15)',
          borderRadius: '15px',
          marginBottom: '30px',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>⏳ No Data</span>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>
              No sensor readings available yet. Admin needs to connect Arduino first.
            </span>
          </div>
          <button
            onClick={loadRecentReadings}
            style={{
              padding: '8px 16px',
              background: 'rgba(245, 158, 11, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🔄 Check Again
          </button>
        </div>
      )}

      {/* Arduino Connection Status - Admin Only */}
      {isAdminMode && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          padding: '20px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '15px',
          marginBottom: '30px',
          gap: '15px'
        }}>
          {/* Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {useRealArduino ? (
              isConnected ? (
                <>
                  <span style={{ fontSize: '16px', fontWeight: '600' }}>🔌 Arduino Connected</span>
                  <button 
                    onClick={disconnectArduinoHandler}
                    style={{ 
                      padding: '10px 20px', 
                      background: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '16px', fontWeight: '600' }}>🔌 Arduino Disconnected</span>
              )
            ) : (
              <>
                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                  {useMockData ? '📊 Mock Data Mode' : '⏸️ Standby Mode'}
                </span>
                <button 
                  onClick={connectToArduino}
                  style={{ 
                    padding: '10px 20px', 
                    background: '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Connect Arduino
                </button>
              </>
            )}
          </div>

          {/* Arduino Status Indicator */}
          {useRealArduino && (
            <div style={{
              padding: '12px 20px',
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: '600',
              justifyContent: 'center'
            }}>
              <span>🔌</span>
              <span>Arduino connected - Data being collected and saved automatically</span>
            </div>
          )}

          {/* Mock Data Controls - Only show when not using real Arduino */}
          {!useRealArduino && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px',
              padding: '15px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Mock Data Generation:</span>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                <input 
                  type="checkbox" 
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                  style={{ 
                    marginRight: '8px',
                    width: '18px',
                    height: '18px',
                    accentColor: '#10b981'
                  }}
                />
                <span style={{ color: useMockData ? '#10b981' : '#f59e0b' }}>
                  {useMockData ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </label>
              
              {useMockData && (
                <span style={{ 
                  fontSize: '12px', 
                  color: 'rgba(255,255,255,0.7)',
                  fontStyle: 'italic'
                }}>
                  Generating readings every 3 seconds
                </span>
              )}
            </div>
          )}

          {/* Status Info */}
          <div style={{ 
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.8)', 
            textAlign: 'center',
            maxWidth: '600px'
          }}>
            {useRealArduino 
              ? '✅ Real Arduino sensor data is being collected by server and saved to database automatically'
              : useMockData 
                ? '✅ Mock data is being generated and saved to database for demonstration'
                : 'No data is being generated. Enable mock data or connect Arduino to see readings'
            }
          </div>
        </div>
      )}

      {/* Current Status Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '30px',
        marginBottom: '50px'
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
          padding: '35px', 
          borderRadius: '25px',
          color: '#333',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${risk.color}, ${risk.color}aa)`
          }} />
          <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Current Distance
          </h3>
          <div style={{ fontSize: '3.5rem', fontWeight: '800', color: risk.color, marginBottom: '15px', lineHeight: '1' }}>
            {currentDistance}
          </div>
          <div style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: '500' }}>centimeters</div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
          padding: '35px', 
          borderRadius: '25px',
          color: '#333',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${risk.color}, ${risk.color}aa)`
          }} />
          <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Risk Assessment
          </h3>
          <div style={{ fontSize: '2.8rem', fontWeight: '800', color: risk.color, marginBottom: '15px', lineHeight: '1' }}>
            {risk.level}
          </div>
          <div style={{ fontSize: '1.1rem', color: risk.color, fontWeight: '600' }}>
            {risk.level === 'SAFE' ? '✅ Area Secure' : 
             risk.level === 'WARNING' ? '⚠️ Monitor Closely' : 
             '🚨 Immediate Action Required'}
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
          padding: '35px', 
          borderRadius: '25px',
          color: '#333',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6, #3b82f6aa)'
          }} />
          <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Data Points
          </h3>
          <div style={{ fontSize: '3.5rem', fontWeight: '800', color: '#3b82f6', marginBottom: '15px', lineHeight: '1' }}>
            {sensorData.length}
          </div>
          <div style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: '500' }}>total readings</div>
        </div>
      </div>

      {/* Trend Analysis Section - Only show for real Arduino data */}
      {useRealArduino && (
        <div style={{ 
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
          padding: '40px', 
          borderRadius: '25px',
          color: '#333',
          marginBottom: '50px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '10px', color: '#1e293b' }}>
              📈 Advanced Trend Analysis
            </h3>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>
              Real-time ground movement analysis based on historical data patterns
            </p>
          </div>

          {/* Overall Risk Assessment */}
          <div style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '20px',
            marginBottom: '30px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <h4 style={{ fontSize: '1.2rem', color: '#374151', marginBottom: '20px' }}>
              🎯 Overall Risk Assessment
            </h4>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800', 
              color: risk.color, 
              marginBottom: '15px' 
            }}>
              {risk.level}
            </div>
            <div style={{ 
              fontSize: '1rem', 
              color: '#64748b',
              marginBottom: '10px'
            }}>
              Based on: {risk.source === 'trend' ? 'Historical trend analysis' : 'Current distance measurement'}
            </div>
            {risk.source === 'trend' && (
              <div style={{ 
                padding: '15px', 
                background: '#fef3c7', 
                borderRadius: '10px',
                fontSize: '14px',
                color: '#92400e'
              }}>
                ⚠️ Risk elevated due to significant ground movement patterns detected in historical data
              </div>
            )}
          </div>

          {/* Period Analysis */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '25px'
          }}>
            {[
              { period: 'daily', label: 'Daily Trend', threshold: '5%', icon: '📅' },
              { period: 'weekly', label: 'Weekly Trend', threshold: '8%', icon: '📊' },
              { period: 'monthly', label: 'Monthly Trend', threshold: '10%', icon: '📈' }
            ].map(({ period, label, threshold, icon }) => {
              const data = trendAnalysis[period]
              const riskColors = {
                'SAFE': '#10b981',
                'LOW': '#65a30d', 
                'MODERATE': '#f59e0b',
                'HIGH': '#ea580c',
                'CRITICAL': '#dc2626'
              }
              
              return (
                <div key={period} style={{ 
                  background: 'white', 
                  padding: '25px', 
                  borderRadius: '15px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                  border: `2px solid ${riskColors[data.risk] || '#e5e7eb'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{icon}</span>
                    <h5 style={{ fontSize: '1.1rem', color: '#374151', margin: 0 }}>{label}</h5>
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: '700', 
                      color: riskColors[data.risk] || '#6b7280',
                      marginBottom: '5px'
                    }}>
                      {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}%
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Change over {period.replace('ly', '')}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    background: `${riskColors[data.risk] || '#f3f4f6'}20`, 
                    borderRadius: '8px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: '600', 
                      color: riskColors[data.risk] || '#6b7280',
                      marginBottom: '5px'
                    }}>
                      {data.risk} RISK
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {data.status || 'No significant changes detected'}
                    </div>
                  </div>

                  {data.recentAvg && data.olderAvg && (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Recent avg: {data.recentAvg}cm | Previous: {data.olderAvg}cm
                    </div>
                  )}

                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#94a3b8', 
                    marginTop: '10px',
                    fontStyle: 'italic'
                  }}>
                    Threshold: {threshold} change
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ 
            marginTop: '30px', 
            padding: '20px', 
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
            borderRadius: '15px',
            border: '1px solid #3b82f6'
          }}>
            <h5 style={{ fontSize: '1rem', color: '#1e40af', marginBottom: '10px' }}>
              📋 Risk Assessment Methodology
            </h5>
            <div style={{ fontSize: '0.9rem', color: '#1e40af', lineHeight: '1.5' }}>
              • <strong>Daily:</strong> 5%+ change indicates rapid ground movement<br/>
              • <strong>Weekly:</strong> 8%+ change suggests concerning slope instability<br/>
              • <strong>Monthly:</strong> 10%+ change shows significant geological shifts<br/>
              • <strong>Negative changes</strong> (decreasing distance) are more critical as they indicate ground approaching the sensor
            </div>
          </div>
        </div>
      )}

      {/* Hill Visualization */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
        padding: '40px', 
        borderRadius: '25px',
        color: '#333',
        marginBottom: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '10px', color: '#1e293b' }}>
            🏔️ Real-time Slope Analysis
          </h3>
          <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
            Realistic terrain visualization with natural slope variations based on ultrasonic sensor measurements
          </p>
        </div>
        
        {hillPoints.length > 0 && sensorPosition ? (
          <div style={{ 
            background: 'white', 
            borderRadius: '20px', 
            padding: '30px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
          }}>
            <svg width="100%" height="320" viewBox="0 0 600 280" style={{ borderRadius: '15px' }}>
              {/* Gradient Definitions */}
              <defs>
                <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#87CEEB', stopOpacity: 1 }} />
                  <stop offset="70%" style={{ stopColor: '#B0E0E6', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#F0F8FF', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="hillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#22c55e', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#16a34a', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#15803d', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
                </filter>
              </defs>
              
              {/* Sky Background */}
              <rect width="600" height="280" fill="url(#skyGradient)" rx="15" />
              
              {/* Clouds */}
              <ellipse cx="150" cy="40" rx="25" ry="15" fill="white" opacity="0.8" />
              <ellipse cx="170" cy="35" rx="30" ry="18" fill="white" opacity="0.7" />
              <ellipse cx="450" cy="50" rx="20" ry="12" fill="white" opacity="0.6" />
              
              {/* Ground/Base Line */}
              <line x1="0" y1="260" x2="600" y2="260" stroke="#8B4513" strokeWidth="3" />
              
              {/* Hill Surface - Linear Slope */}
              <path
                d={`M 0,260 ${hillPoints.map(point => `L ${point.x},${point.y}`).join(' ')} L 600,260 Z`}
                fill="url(#hillGradient)"
                stroke="#15803d"
                strokeWidth="2"
                filter="url(#shadow)"
              />
              
              {/* Hill Surface Line (cleaner edge) */}
              <path
                d={`M 0,${hillPoints[0]?.y || 200} ${hillPoints.map(point => `L ${point.x},${point.y}`).join(' ')}`}
                fill="none"
                stroke="#166534"
                strokeWidth="3"
              />
              
              {/* Sensor Mount/Pole */}
              <line 
                x1={sensorPosition.x} 
                y1="20" 
                x2={sensorPosition.x} 
                y2={sensorPosition.y + 15} 
                stroke="#374151" 
                strokeWidth="4"
              />
              
              {/* Sensor Device */}
              <rect 
                x={sensorPosition.x - 12} 
                y={sensorPosition.y} 
                width="24" 
                height="16" 
                fill="#1f2937" 
                rx="3"
                filter="url(#shadow)"
              />
              <rect 
                x={sensorPosition.x - 8} 
                y={sensorPosition.y + 3} 
                width="16" 
                height="4" 
                fill="#3b82f6" 
                rx="2"
              />
              
              {/* Ultrasonic Beam - Perpendicular to Hill */}
              <line 
                x1={sensorPosition.x} 
                y1={sensorPosition.y + 16} 
                x2={sensorPosition.x} 
                y2={sensorPosition.hillY} 
                stroke="#ef4444" 
                strokeWidth="3" 
                strokeDasharray="8,4"
                opacity="0.8"
              />
              
              {/* Measurement Point on Hill */}
              <circle 
                cx={sensorPosition.x} 
                cy={sensorPosition.hillY} 
                r="6" 
                fill={risk.color}
                stroke="white"
                strokeWidth="3"
                filter="url(#shadow)"
              />
              
              {/* Distance Label */}
              <rect 
                x={sensorPosition.x - 25} 
                y={sensorPosition.y - 35} 
                width="50" 
                height="25" 
                fill="rgba(255,255,255,0.95)" 
                rx="12"
                filter="url(#shadow)"
              />
              <text 
                x={sensorPosition.x} 
                y={sensorPosition.y - 18} 
                textAnchor="middle" 
                fontSize="14" 
                fill="#1e293b"
                fontWeight="bold"
              >
                {sensorPosition.distance.toFixed(1)}cm
              </text>
              
              {/* Legend */}
              <rect x="20" y="20" width="200" height="80" fill="rgba(255,255,255,0.9)" rx="10" filter="url(#shadow)" />
              <text x="30" y="40" fontSize="14" fill="#1e293b" fontWeight="bold">📡 Ultrasonic Sensor</text>
              <line x1="30" y1="50" x2="50" y2="50" stroke="#ef4444" strokeWidth="3" strokeDasharray="4,2" />
              <text x="55" y="55" fontSize="12" fill="#64748b">Measurement Beam</text>
              <circle cx="35" cy="70" r="4" fill={risk.color} />
              <text x="45" y="75" fontSize="12" fill="#64748b">Measurement Point</text>
              
              {/* Risk Level Indicator */}
              <rect x="420" y="20" width="160" height="50" fill={risk.color} rx="10" filter="url(#shadow)" />
              <text x="500" y="40" textAnchor="middle" fontSize="16" fill="white" fontWeight="bold">
                {risk.level}
              </text>
              <text x="500" y="58" textAnchor="middle" fontSize="12" fill="white" opacity="0.9">
                Current Status
              </text>
            </svg>
            
            <div style={{ 
              marginTop: '25px', 
              padding: '20px', 
              background: '#f1f5f9', 
              borderRadius: '15px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>Terrain Type</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>Natural Slope</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>Sensor Position</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>Perpendicular</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>Visualization</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>Real-time Data</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px', 
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📊</div>
            <h4 style={{ color: '#64748b', marginBottom: '10px' }}>Collecting Slope Data...</h4>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              Please wait for sensor readings to generate the slope visualization.
            </p>
          </div>
        )}
      </div>

      {/* SMS Controls */}
      {/* SMS Controls - Admin Only */}
      {isAdminMode && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
          padding: '40px', 
          borderRadius: '25px',
          color: '#333',
          marginBottom: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '10px', color: '#1e293b' }}>📱 SMS Alert System</h3>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>Manage emergency notifications and balance settings</p>
          </div>
        
        {/* Manual SMS Controls */}
        <div style={{ marginBottom: '35px' }}>
          <h4 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#374151', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '10px' }}>🎯</span> Manual Controls
          </h4>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={handleSendTestSMS}
              style={{ 
                padding: '15px 30px', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              📧 Send Test SMS
            </button>
            
            <button 
              onClick={handleSendAlert}
              style={{ 
                padding: '15px 30px', 
                background: `linear-gradient(135deg, ${risk.color} 0%, ${risk.color}dd 100%)`, 
                color: 'white', 
                border: 'none', 
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: `0 8px 20px ${risk.color}40`,
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🚨 Send {risk.level} Alert
            </button>
            
            {smsStatus && (
              <div style={{ 
                padding: '12px 24px',
                background: smsStatus.includes('✅') ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: smsStatus.includes('✅') ? '0 8px 20px rgba(16, 185, 129, 0.3)' : '0 8px 20px rgba(239, 68, 68, 0.3)',
                animation: 'fadeIn 0.3s ease'
              }}>
                {smsStatus}
              </div>
            )}
          </div>
        </div>

        {/* Auto SMS Settings */}
        <div style={{ 
          padding: '30px', 
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', 
          borderRadius: '20px',
          border: '2px solid #cbd5e1'
        }}>
          <h4 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#374151', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '10px' }}>💰</span> Auto SMS Settings (Balance Protection)
          </h4>
          
          {/* Master Toggle */}
          <div style={{ 
            marginBottom: '25px',
            padding: '20px',
            background: 'white',
            borderRadius: '15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              <div style={{ position: 'relative', marginRight: '15px' }}>
                <input 
                  type="checkbox" 
                  checked={smsSettings.enabled}
                  onChange={(e) => handleSMSSettingsChange({ ...smsSettings, enabled: e.target.checked })}
                  style={{ 
                    width: '24px', 
                    height: '24px',
                    accentColor: smsSettings.enabled ? '#10b981' : '#ef4444'
                  }}
                />
              </div>
              <span style={{ color: smsSettings.enabled ? '#10b981' : '#ef4444' }}>
                {smsSettings.enabled ? '✅ Auto SMS Enabled' : '❌ Auto SMS Disabled'}
              </span>
            </label>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px', marginLeft: '39px' }}>
              Master switch for all automatic SMS alerts
            </p>
          </div>

          {/* Individual Risk Level Toggles */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px',
            opacity: smsSettings.enabled ? 1 : 0.5,
            transition: 'opacity 0.3s ease'
          }}>
            {[
              { key: 'dangerEnabled', label: '🚨 DANGER Alerts', color: '#ef4444' },
              { key: 'warningEnabled', label: '⚠️ WARNING Alerts', color: '#f59e0b' },
              { key: 'safeEnabled', label: '✅ SAFE Alerts', color: '#10b981' }
            ].map(({ key, label, color }) => (
              <div key={key} style={{
                padding: '15px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: smsSettings.enabled ? 'pointer' : 'not-allowed'
                }}>
                  <input 
                    type="checkbox" 
                    checked={smsSettings[key]}
                    onChange={(e) => handleSMSSettingsChange({ ...smsSettings, [key]: e.target.checked })}
                    disabled={!smsSettings.enabled}
                    style={{ 
                      marginRight: '12px',
                      width: '18px',
                      height: '18px',
                      accentColor: color
                    }}
                  />
                  <span style={{ color: smsSettings.enabled ? color : '#94a3b8' }}>{label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          textAlign: 'center',
          marginTop: '25px',
          padding: '15px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px'
        }}>
          {editingPhone ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: '#1e40af' }}>📞 Emergency Phone:</span>
              <input
                type="text"
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                placeholder="9779860809730"
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid #3b82f6',
                  fontSize: '14px',
                  width: '200px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handlePhoneUpdate}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✓ Save
              </button>
              <button
                onClick={() => {
                  setEditingPhone(false)
                  setTempPhone(alertSettings.phone)
                }}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✕ Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
                📞 Emergency alerts will be sent to: <strong>+{alertSettings.phone}</strong>
              </p>
              <button
                onClick={() => setEditingPhone(true)}
                style={{
                  padding: '6px 12px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Analytics and Recent Readings */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '30px'
      }}>
        {/* Analytics */}
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '20px',
          color: '#333',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ fontSize: '1.3rem' }}>📊 Historical Analytics</h3>
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          {analytics.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {analytics.map((day, index) => (
                <div key={index} style={{ 
                  padding: '15px 0', 
                  borderBottom: '1px solid #eee'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <strong>{day.date}</strong>
                    <span style={{ 
                      color: day.percent_change > 0 ? '#ef4444' : day.percent_change < 0 ? '#10b981' : '#666',
                      fontWeight: 'bold'
                    }}>
                      {day.percent_change > 0 ? '↑' : day.percent_change < 0 ? '↓' : '→'} {Math.abs(day.percent_change)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Avg: {parseFloat(day.avg_distance).toFixed(1)}cm | 
                    Range: {parseFloat(day.min_distance).toFixed(1)}-{parseFloat(day.max_distance).toFixed(1)}cm
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Loading analytics...</p>
          )}
        </div>

        {/* Recent Readings */}
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '20px',
          color: '#333',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ marginBottom: '25px', fontSize: '1.3rem' }}>📊 Recent Readings</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {sensorData.slice(-15).reverse().map((reading, index) => (
              <div key={index} style={{ 
                padding: '12px 0', 
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '14px', color: '#666' }}>{reading.time}</span>
                <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  color: getRiskLevel(reading.distance).color
                }}>
                  {reading.distance} cm
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SlopeMonitoring