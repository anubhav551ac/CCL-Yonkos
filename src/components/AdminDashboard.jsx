import { useState, useEffect } from 'react'
import { 
  getArduinoStatus, 
  connectArduino, 
  disconnectArduino,
  getSMSSettings,
  updateSMSSettings,
  getAlertSettings,
  updateAlertSettings,
  sendTestSMS,
  sendAlert
} from '../utils/api'

const AdminDashboard = ({ onBack, onAdminLogin, onAdminLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState('')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [activeTab, setActiveTab] = useState('overview')
  const [locations, setLocations] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Sensors / Arduino state
  const [arduinoStatus, setArduinoStatus] = useState({ isConnected: false, connectionInfo: null })

  // SMS settings state
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
  const [smsStatusMessage, setSmsStatusMessage] = useState('')

  // Location form state
  const [locationForm, setLocationForm] = useState({
    name: '',
    region: '',
    province: '',
    latitude: '',
    longitude: '',
    description: ''
  })

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    role: 'observer',
    priority: 1
  })

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsAuthenticated(true)
        setAuthToken(data.token)
        setMessage('Login successful!')
        if (onAdminLogin) onAdminLogin() // Notify parent that admin logged in
        loadDashboardData(data.token)
      } else {
        setMessage('Invalid credentials')
      }
    } catch (error) {
      setMessage('Login failed: ' + error.message)
    }
    
    setLoading(false)
  }

  const loadDashboardData = async (token) => {
    try {
      const headers = { 'Authorization': token }
      
      console.log('Loading dashboard data with token:', token)
      
      // Load stats
      const statsRes = await fetch('http://localhost:5000/api/admin/stats', { headers })
      console.log('Stats response status:', statsRes.status)
      const statsData = await statsRes.json()
      console.log('Stats data:', statsData)
      setStats(statsData)
      
      // Load locations
      const locationsRes = await fetch('http://localhost:5000/api/admin/locations', { headers })
      console.log('Locations response status:', locationsRes.status)
      const locationsData = await locationsRes.json()
      console.log('Locations data:', locationsData)
      setLocations(locationsData)
      
    } catch (error) {
      console.error('Dashboard data loading error:', error)
      setMessage('Failed to load dashboard data: ' + error.message)
    }
  }

  const loadSensorsAndSMSConfig = async () => {
    try {
      // Arduino status
      try {
        const status = await getArduinoStatus()
        if (status.success) {
          setArduinoStatus({ isConnected: status.isConnected, connectionInfo: status.connectionInfo })
        }
      } catch (error) {
        console.error('Failed to load Arduino status:', error)
      }

      // SMS auto-alert settings
      try {
        const settings = await getSMSSettings()
        setSmsSettings(settings)
      } catch (error) {
        console.error('Failed to load SMS settings:', error)
      }

      // Alert phone/cooldown
      try {
        const settings = await getAlertSettings()
        setAlertSettings(settings)
        setTempPhone(settings.phone)
      } catch (error) {
        console.error('Failed to load alert settings:', error)
      }
    } catch (error) {
      console.error('Failed to load sensors/SMS config:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadSensorsAndSMSConfig()
    }
  }, [isAuthenticated])

  const handleAddLocation = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      console.log('Adding location:', locationForm)
      const response = await fetch('http://localhost:5000/api/admin/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken
        },
        body: JSON.stringify(locationForm)
      })
      
      console.log('Add location response status:', response.status)
      const data = await response.json()
      console.log('Add location response data:', data)
      
      if (response.ok) {
        setLocations([data, ...locations])
        setLocationForm({ name: '', region: '', province: '', latitude: '', longitude: '', description: '' })
        setMessage('✅ Location added successfully!')
        
        // Reload stats
        loadDashboardData(authToken)
      } else {
        setMessage('❌ Failed to add location: ' + data.error)
      }
    } catch (error) {
      console.error('Add location error:', error)
      setMessage('❌ Error: ' + error.message)
    }
    
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleAddContact = async (e) => {
    e.preventDefault()
    if (!selectedLocation) return
    
    setLoading(true)
    
    try {
      const response = await fetch(`http://localhost:5000/api/admin/locations/${selectedLocation.id}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken
        },
        body: JSON.stringify(contactForm)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setContacts([data, ...contacts])
        setContactForm({ name: '', phone: '', role: 'observer', priority: 1 })
        setMessage('Contact added successfully!')
      } else {
        setMessage('Failed to add contact: ' + data.error)
      }
    } catch (error) {
      setMessage('Error: ' + error.message)
    }
    
    setLoading(false)
  }

  const loadLocationContacts = async (location) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/locations/${location.id}/contacts`, {
        headers: { 'Authorization': authToken }
      })
      const data = await response.json()
      setContacts(data)
      setSelectedLocation(location)
    } catch (error) {
      setMessage('Failed to load contacts: ' + error.message)
    }
  }

  const handleDeleteLocation = async (locationId) => {
    if (!confirm('Are you sure you want to delete this location?')) return
    
    try {
      const response = await fetch(`http://localhost:5000/api/admin/locations/${locationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': authToken }
      })
      
      if (response.ok) {
        setLocations(locations.filter(loc => loc.id !== locationId))
        setMessage('Location deleted successfully!')
      }
    } catch (error) {
      setMessage('Failed to delete location: ' + error.message)
    }
  }

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    
    try {
      const response = await fetch(`http://localhost:5000/api/admin/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'Authorization': authToken }
      })
      
      if (response.ok) {
        setContacts(contacts.filter(contact => contact.id !== contactId))
        setMessage('Contact deleted successfully!')
      }
    } catch (error) {
      setMessage('Failed to delete contact: ' + error.message)
    }
  }

  const handleConnectArduino = async (locationId) => {
    if (!locationId) {
      setMessage('Please select a location to attach the Arduino to.')
      return
    }
    try {
      setLoading(true)
      const result = await connectArduino(null, locationId)
      if (result.success) {
        setArduinoStatus({ isConnected: true, connectionInfo: result.status?.connectionInfo || null })
        setMessage(`✅ Arduino connected for location ID ${result.location_id || locationId}`)
      } else {
        setMessage('❌ Failed to connect Arduino: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Arduino connect error:', error)
      setMessage('❌ Failed to connect Arduino: ' + error.message)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleDisconnectArduino = async () => {
    try {
      setLoading(true)
      const result = await disconnectArduino()
      if (result.success) {
        setArduinoStatus({ isConnected: false, connectionInfo: null })
        setMessage('✅ Arduino disconnected.')
      } else {
        setMessage('❌ Failed to disconnect Arduino: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Arduino disconnect error:', error)
      setMessage('❌ Failed to disconnect Arduino: ' + error.message)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleSendTestSMSFromDashboard = async () => {
    setSmsStatusMessage('Sending test SMS...')
    try {
      await sendTestSMS(alertSettings.phone, 'Hi from Landslide Monitor! System is working.')
      setSmsStatusMessage('✅ Test SMS sent successfully!')
    } catch (error) {
      setSmsStatusMessage('❌ Failed to send test SMS: ' + error.message)
    } finally {
      setTimeout(() => setSmsStatusMessage(''), 3000)
    }
  }

  const handleSendAlertFromDashboard = async () => {
    setSmsStatusMessage('Sending manual alert...')
    try {
      // Use a generic distance/risk for manual dashboard alert
      await sendAlert(alertSettings.phone, 0, 'DANGER')
      setSmsStatusMessage('✅ DANGER alert sent successfully!')
    } catch (error) {
      setSmsStatusMessage('❌ Failed to send alert: ' + error.message)
    } finally {
      setTimeout(() => setSmsStatusMessage(''), 3000)
    }
  }

  const handleSMSSettingsChange = async (newSettings) => {
    try {
      setSmsStatusMessage('Updating SMS settings...')
      const updated = await updateSMSSettings(newSettings)
      setSmsSettings(updated)
      setSmsStatusMessage('✅ SMS settings updated!')
    } catch (error) {
      console.error('Failed to update SMS settings:', error)
      setSmsStatusMessage('❌ Failed to update settings: ' + error.message)
    } finally {
      setTimeout(() => setSmsStatusMessage(''), 3000)
    }
  }

  const handlePhoneUpdate = async () => {
    try {
      setSmsStatusMessage('Updating phone number...')
      const updated = await updateAlertSettings({ phone: tempPhone })
      setAlertSettings(updated)
      setEditingPhone(false)
      setSmsStatusMessage('✅ Phone number updated!')
    } catch (error) {
      console.error('Failed to update phone number:', error)
      setSmsStatusMessage('❌ Failed to update phone number: ' + error.message)
    } finally {
      setTimeout(() => setSmsStatusMessage(''), 3000)
    }
  }

  // Login Form
  if (!isAuthenticated) {
    return (
      <div style={{ 
        padding: '20px', 
        fontFamily: 'Arial, sans-serif',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '20px',
          color: '#333',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>🔐 Admin Login</h2>
            <p style={{ color: '#64748b' }}>Landslide Monitoring System</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Username
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                background: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {message && (
            <div style={{ 
              marginTop: '20px', 
              padding: '12px', 
              background: message.includes('successful') ? '#dcfce7' : '#fef2f2',
              color: message.includes('successful') ? '#166534' : '#dc2626',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Admin Dashboard
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>🛠️ Admin Dashboard</h1>
          <p style={{ fontSize: '1.2rem', margin: 0, opacity: 0.9 }}>
            Landslide Monitoring System Management
          </p>
        </div>
        <button 
          onClick={onBack}
          style={{ 
            padding: '10px 20px', 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'locations', label: '📍 Locations', icon: '📍' },
          { id: 'contacts', label: '📞 Contacts', icon: '📞' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              padding: '12px 24px', 
              background: activeTab === tab.id ? '#10b981' : 'rgba(255,255,255,0.2)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Message Display */}
      {message && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: message.includes('successful') ? '#dcfce7' : '#fef2f2',
          color: message.includes('successful') ? '#166534' : '#dc2626',
          borderRadius: '10px'
        }}>
          {message}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '25px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              background: 'white', 
              padding: '30px', 
              borderRadius: '20px',
              color: '#333',
              textAlign: 'center'
            }}>
              <h3>📍 Total Locations</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {stats.totalLocations || 0}
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '30px', 
              borderRadius: '20px',
              color: '#333',
              textAlign: 'center'
            }}>
              <h3>✅ Active Locations</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981' }}>
                {stats.activeLocations || 0}
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '30px', 
              borderRadius: '20px',
              color: '#333',
              textAlign: 'center'
            }}>
              <h3>📞 Total Contacts</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {stats.totalContacts || 0}
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '30px', 
              borderRadius: '20px',
              color: '#333',
              textAlign: 'center'
            }}>
              <h3>📊 Readings Today</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                {stats.readingsToday || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div>
          {/* Add Location Form */}
          <div style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '20px',
            color: '#333',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '20px' }}>➕ Add New Location</h3>
            <form onSubmit={handleAddLocation}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Location Name"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({...locationForm, name: e.target.value})}
                  style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                  required
                />
                <select
                  value={locationForm.province}
                  onChange={(e) => setLocationForm({...locationForm, province: e.target.value})}
                  style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                  required
                >
                  <option value="">Select Province</option>
                  <option value="Province 1">Province 1 (Koshi)</option>
                  <option value="Madhesh">Madhesh Province</option>
                  <option value="Bagmati">Bagmati Province</option>
                  <option value="Gandaki">Gandaki Province</option>
                  <option value="Lumbini">Lumbini Province</option>
                  <option value="Karnali">Karnali Province</option>
                  <option value="Sudurpashchim">Sudurpashchim Province</option>
                </select>
                <input
                  type="text"
                  placeholder="Region/District (e.g., Kathmandu)"
                  value={locationForm.region}
                  onChange={(e) => setLocationForm({...locationForm, region: e.target.value})}
                  style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                  required
                />
                <input
                  type="number"
                  step="0.000001"
                  placeholder="Latitude"
                  value={locationForm.latitude}
                  onChange={(e) => setLocationForm({...locationForm, latitude: e.target.value})}
                  style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                />
                <input
                  type="number"
                  step="0.000001"
                  placeholder="Longitude"
                  value={locationForm.longitude}
                  onChange={(e) => setLocationForm({...locationForm, longitude: e.target.value})}
                  style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                />
              </div>
              <textarea
                placeholder="Description"
                value={locationForm.description}
                onChange={(e) => setLocationForm({...locationForm, description: e.target.value})}
                style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '15px', minHeight: '80px' }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 25px',
                  background: loading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Adding...' : 'Add Location'}
              </button>
            </form>
          </div>

          {/* Locations List */}
          <div style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '20px',
            color: '#333'
          }}>
            <h3 style={{ marginBottom: '20px' }}>📍 Monitoring Locations</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              {locations.map(location => (
                <div key={location.id} style={{ 
                  padding: '20px', 
                  border: '2px solid #e5e7eb', 
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: 0, marginBottom: '5px' }}>{location.name}</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                      {location.province && <span>🏛️ {location.province} • </span>}
                      📍 {location.region} • 🌍 {location.latitude}, {location.longitude}
                    </p>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '12px', marginTop: '5px' }}>
                      {location.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => loadLocationContacts(location)}
                      style={{
                        padding: '8px 15px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Contacts
                    </button>
                    <button
                      onClick={() => handleConnectArduino(location.id)}
                      style={{
                        padding: '8px 15px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Set Arduino
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      style={{
                        padding: '8px 15px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div>
          {selectedLocation && (
            <>
              {/* Add Contact Form */}
              <div style={{ 
                background: 'white', 
                padding: '30px', 
                borderRadius: '20px',
                color: '#333',
                marginBottom: '30px'
              }}>
                <h3 style={{ marginBottom: '20px' }}>
                  ➕ Add Contact for {selectedLocation.name}
                </h3>
                <form onSubmit={handleAddContact}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    <input
                      type="text"
                      placeholder="Contact Name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                      style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number (with country code)"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                      style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                      required
                    />
                    <select
                      value={contactForm.role}
                      onChange={(e) => setContactForm({...contactForm, role: e.target.value})}
                      style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                    >
                      <option value="observer">Observer</option>
                      <option value="emergency">Emergency Contact</option>
                      <option value="authority">Local Authority</option>
                      <option value="technical">Technical Team</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="Priority (1-10)"
                      value={contactForm.priority}
                      onChange={(e) => setContactForm({...contactForm, priority: parseInt(e.target.value)})}
                      style={{ padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '12px 25px',
                      background: loading ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {loading ? 'Adding...' : 'Add Contact'}
                  </button>
                </form>
              </div>

              {/* Contacts List */}
              <div style={{ 
                background: 'white', 
                padding: '30px', 
                borderRadius: '20px',
                color: '#333'
              }}>
                <h3 style={{ marginBottom: '20px' }}>
                  📞 Notification Contacts for {selectedLocation.name}
                </h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {contacts.map(contact => (
                    <div key={contact.id} style={{ 
                      padding: '20px', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ margin: 0, marginBottom: '5px' }}>{contact.name}</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                          📞 {contact.phone} • {contact.role} • Priority: {contact.priority}
                        </p>
                        <span style={{ 
                          fontSize: '12px', 
                          padding: '2px 8px', 
                          borderRadius: '10px',
                          background: contact.active ? '#dcfce7' : '#fef2f2',
                          color: contact.active ? '#166534' : '#dc2626'
                        }}>
                          {contact.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        style={{
                          padding: '8px 15px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!selectedLocation && (
            <div style={{ 
              background: 'white', 
              padding: '60px', 
              borderRadius: '20px',
              color: '#333',
              textAlign: 'center'
            }}>
              <h3>📞 Contact Management</h3>
              <p>Select a location from the Locations tab to manage its notification contacts.</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default AdminDashboard