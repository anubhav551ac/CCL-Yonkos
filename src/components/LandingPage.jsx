import { useState, useEffect } from 'react'
import { getLocations } from '../utils/api'

const LandingPage = ({ onNavigate, onAdminAccess }) => {
  const [step, setStep] = useState(1)
  const [selectedProvince, setSelectedProvince] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [locations, setLocations] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  const provinces = [
    { id: 'Province 1', name: 'Province 1 (Koshi)', color: '#FF6B6B', icon: '🏔️' },
    { id: 'Madhesh', name: 'Madhesh Province', color: '#4ECDC4', icon: '🌾' },
    { id: 'Bagmati', name: 'Bagmati Province', color: '#45B7D1', icon: '🏛️' },
    { id: 'Gandaki', name: 'Gandaki Province', color: '#96CEB4', icon: '⛰️' },
    { id: 'Lumbini', name: 'Lumbini Province', color: '#FFEAA7', icon: '🕉️' },
    { id: 'Karnali', name: 'Karnali Province', color: '#DFE6E9', icon: '🏞️' },
    { id: 'Sudurpashchim', name: 'Sudurpashchim Province', color: '#A29BFE', icon: '🌄' }
  ]

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true)
        const response = await getLocations()
        if (response.success && response.locations) {
          setLocations(response.locations)
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error)
        setLocations([])
      } finally {
        setLoadingLocations(false)
      }
    }
    fetchLocations()
  }, [])

  const locationsByProvince = locations.reduce((acc, location) => {
    const province = location.province || 'Bagmati'
    if (!acc[province]) acc[province] = []
    acc[province].push(location)
    return acc
  }, {})

  const handleProvinceSelect = (province) => {
    setSelectedProvince(province)
    setStep(2)
  }

  const handleLocationSelect = (location) => {
    setSelectedLocation(location)
    setStep(3)
  }

  const handleBack = () => {
    if (step === 3) {
      setStep(2)
      setSelectedLocation(null)
    } else if (step === 2) {
      setStep(1)
      setSelectedProvince(null)
    }
  }

  const sensors = [
    { 
      id: 'slope', 
      name: 'Slope Monitoring', 
      icon: '📏', 
      status: 'active',
      description: 'Real-time ultrasonic distance measurement for landslide detection',
      accuracy: '±2cm',
      coverage: '50m radius'
    },
    { 
      id: 'soil', 
      name: 'Soil Moisture', 
      icon: '💧', 
      status: 'coming-soon',
      description: 'Soil moisture levels affecting slope stability',
      accuracy: '±5%',
      coverage: '10m depth'
    },
    { 
      id: 'vibration', 
      name: 'Vibration Sensor', 
      icon: '📳', 
      status: 'coming-soon',
      description: 'Ground vibration and seismic activity detection',
      accuracy: '0.1Hz',
      coverage: '100m radius'
    },
    { 
      id: 'gps', 
      name: 'GPS Tracking', 
      icon: '🛰️', 
      status: 'coming-soon',
      description: 'Precise ground movement tracking via GPS',
      accuracy: '±1mm',
      coverage: 'Unlimited'
    }
  ]

  return (
    <div style={{ 
      padding: '40px 20px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      minHeight: '100vh',
      color: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', 
          marginBottom: '15px', 
          textShadow: '3px 3px 6px rgba(0,0,0,0.3)', 
          fontWeight: '800',
          letterSpacing: '-1px'
        }}>
          🏔️ Nepal Landslide Monitoring
        </h1>
        <p style={{ 
          fontSize: 'clamp(1rem, 3vw, 1.3rem)', 
          marginBottom: '0', 
          opacity: 0.95, 
          fontWeight: '300'
        }}>
          Advanced Early Warning Network
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '15px',
        marginBottom: '40px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '10px 20px',
          background: step >= 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          fontWeight: '600'
        }}>
          <span>{step > 1 ? '✓' : '1'}</span> Province
        </div>
        <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '10px 20px',
          background: step >= 2 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          fontWeight: '600',
          opacity: step >= 2 ? 1 : 0.5
        }}>
          <span>{step > 2 ? '✓' : '2'}</span> Location
        </div>
        <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '10px 20px',
          background: step >= 3 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          fontWeight: '600',
          opacity: step >= 3 ? 1 : 0.5
        }}>
          <span>3</span> Sensor
        </div>
      </div>

      {step > 1 && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            onClick={handleBack}
            style={{
              padding: '10px 25px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.25)'
              e.target.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.15)'
              e.target.style.transform = 'translateY(0)'
            }}
          >
            ← Back
          </button>
        </div>
      )}

      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto'
      }}>
        {step === 1 && !loadingLocations && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '30px', fontWeight: '700' }}>
              Choose Your Province
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {provinces.map(province => {
                const locationCount = locationsByProvince[province.id]?.length || 0
                
                return (
                  <button
                    key={province.id}
                    onClick={() => locationCount > 0 && handleProvinceSelect(province.id)}
                    disabled={locationCount === 0}
                    style={{ 
                      padding: '30px 20px', 
                      background: locationCount > 0 
                        ? `linear-gradient(135deg, ${province.color}ee, ${province.color})` 
                        : 'rgba(255,255,255,0.08)',
                      color: 'white', 
                      border: '2px solid rgba(255,255,255,0.3)', 
                      borderRadius: '24px',
                      cursor: locationCount > 0 ? 'pointer' : 'not-allowed',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      textAlign: 'center',
                      fontSize: 'clamp(0.9rem, 2vw, 1.05rem)',
                      fontWeight: '600',
                      opacity: locationCount === 0 ? 0.4 : 1,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }}
                    onMouseOver={(e) => {
                      if (locationCount > 0) {
                        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                        e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.25)'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (locationCount > 0) {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    <div style={{ fontSize: 'clamp(2.5rem, 5vw, 3rem)', marginBottom: '12px' }}>{province.icon}</div>
                    <div style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', marginBottom: '8px', lineHeight: '1.3' }}>{province.name}</div>
                    <div style={{ fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)', opacity: 0.9 }}>
                      {locationCount > 0 ? `${locationCount} location${locationCount !== 1 ? 's' : ''}` : 'Coming Soon'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && selectedProvince && locationsByProvince[selectedProvince] && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '15px', fontWeight: '700' }}>
              Select Monitoring Site
            </h2>
            <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', marginBottom: '30px', opacity: 0.9 }}>
              {provinces.find(p => p.id === selectedProvince)?.name}
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {locationsByProvince[selectedProvince].map(location => {
                const provinceColor = provinces.find(p => p.id === selectedProvince)?.color || '#45B7D1'
                
                return (
                  <button
                    key={location.id}
                    onClick={() => handleLocationSelect(location)}
                    style={{ 
                      padding: '25px', 
                      background: `linear-gradient(135deg, ${provinceColor}ee, ${provinceColor})`,
                      color: 'white', 
                      border: '2px solid rgba(255,255,255,0.3)', 
                      borderRadius: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      textAlign: 'left',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)'
                      e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.25)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '1.8rem', marginRight: '12px' }}>📍</span>
                      <h3 style={{ margin: 0, fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', fontWeight: '700' }}>
                        {location.name}
                      </h3>
                    </div>
                    
                    {location.description && (
                      <p style={{ 
                        margin: '0 0 12px 0', 
                        fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
                        opacity: 0.95,
                        lineHeight: '1.5'
                      }}>
                        {location.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                      opacity: 0.9
                    }}>
                      Region: {location.region} | GPS: {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && selectedLocation && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '15px', fontWeight: '700' }}>
              Choose Monitoring System
            </h2>
            <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', marginBottom: '30px', opacity: 0.9 }}>
              {selectedLocation.name}
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '25px',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {sensors.map(sensor => (
                <button 
                  key={sensor.id}
                  disabled={sensor.status !== 'active'}
                  onClick={() => sensor.status === 'active' && onNavigate(sensor.id, selectedLocation)}
                  style={{ 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
                    padding: '30px', 
                    borderRadius: '20px',
                    color: '#2d3748',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: sensor.status === 'active' ? '3px solid #48bb78' : '3px solid #ed8936',
                    opacity: sensor.status === 'active' ? 1 : 0.6,
                    cursor: sensor.status === 'active' ? 'pointer' : 'not-allowed',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => {
                    if (sensor.status === 'active') {
                      e.currentTarget.style.transform = 'translateY(-8px)'
                      e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.25)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (sensor.status === 'active') {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px' }}>
                    <span style={{ fontSize: 'clamp(2.5rem, 5vw, 3rem)', marginRight: '15px' }}>{sensor.icon}</span>
                    <div>
                      <h3 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', margin: 0, marginBottom: '8px', fontWeight: '700' }}>{sensor.name}</h3>
                      <span style={{ 
                        background: sensor.status === 'active' ? '#48bb78' : '#ed8936', 
                        color: 'white', 
                        padding: '5px 14px', 
                        borderRadius: '15px', 
                        fontSize: 'clamp(0.7rem, 1.5vw, 0.75rem)',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        {sensor.status === 'active' ? 'ACTIVE' : 'COMING SOON'}
                      </span>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', color: '#4a5568', marginBottom: '18px', lineHeight: '1.6' }}>
                    {sensor.description}
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <strong style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', color: '#718096' }}>Accuracy:</strong>
                      <div style={{ fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', fontWeight: '700', color: '#2d3748', marginTop: '4px' }}>{sensor.accuracy}</div>
                    </div>
                    <div>
                      <strong style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', color: '#718096' }}>Coverage:</strong>
                      <div style={{ fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', fontWeight: '700', color: '#2d3748', marginTop: '4px' }}>{sensor.coverage}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingLocations && (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
            <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', marginBottom: '10px' }}>Loading locations...</div>
          </div>
        )}
      </div>

      <div style={{ 
        textAlign: 'center', 
        padding: '25px',
        background: 'rgba(0,0,0,0.15)',
        borderRadius: '20px',
        marginTop: 'auto',
        position: 'relative'
      }}>
        <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', marginBottom: '5px', fontWeight: '600' }}>
          Nepal Landslide Monitoring System
        </p>
        <p style={{ fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)', opacity: 0.85, marginBottom: '0' }}>
          Protecting Communities Through Technology
        </p>
        
        <button
          onClick={onAdminAccess}
          style={{
            position: 'absolute',
            bottom: '15px',
            right: '15px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.25)'
            e.target.style.color = 'white'
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.15)'
            e.target.style.color = 'rgba(255,255,255,0.8)'
          }}
        >
          🔐 Admin
        </button>
      </div>
    </div>
  )
}

export default LandingPage
