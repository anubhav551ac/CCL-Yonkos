import { useState, useEffect } from 'react'
import { getLocations } from '../utils/api'

const LandingPage = ({ onNavigate, onAdminAccess }) => {
  const [selectedProvince, setSelectedProvince] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [locations, setLocations] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  // Nepal's 7 provinces with colors
  const provinces = [
    { id: 'Province 1', name: 'Province 1 (Koshi)', color: '#FF6B6B', icon: '🏔️' },
    { id: 'Madhesh', name: 'Madhesh Province', color: '#4ECDC4', icon: '🌾' },
    { id: 'Bagmati', name: 'Bagmati Province', color: '#45B7D1', icon: '🏛️' },
    { id: 'Gandaki', name: 'Gandaki Province', color: '#96CEB4', icon: '⛰️' },
    { id: 'Lumbini', name: 'Lumbini Province', color: '#FFEAA7', icon: '🕉️' },
    { id: 'Karnali', name: 'Karnali Province', color: '#DFE6E9', icon: '🏞️' },
    { id: 'Sudurpashchim', name: 'Sudurpashchim Province', color: '#A29BFE', icon: '🌄' }
  ]

  // Fetch available locations on component mount
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

  // Group locations by province
  const locationsByProvince = locations.reduce((acc, location) => {
    const province = location.province || 'Bagmati'
    if (!acc[province]) acc[province] = []
    acc[province].push(location)
    return acc
  }, {})

  const sensors = [
    { 
      id: 'slope', 
      name: 'Slope Monitoring', 
      icon: '📐', 
      status: 'active',
      description: 'Real-time ultrasonic distance measurement for landslide detection',
      accuracy: '±2cm',
      coverage: '50m radius'
    },
    { 
      id: 'soil', 
      name: 'Soil Moisture', 
      icon: '🌱', 
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

  const newsArticles = [
    {
      id: 1,
      title: "Nepal's Monsoon Season Increases Landslide Risk",
      summary: "Heavy rainfall during monsoon season has increased landslide warnings across mountainous regions.",
      image: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=250&fit=crop",
      date: "March 2, 2026",
      source: "Nepal Weather Service"
    },
    {
      id: 2,
      title: "Early Warning Systems Save Lives in Sindhupalchok",
      summary: "Advanced monitoring technology helped evacuate 200 families before a major landslide event.",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop",
      date: "February 28, 2026",
      source: "Disaster Management Authority"
    },
    {
      id: 3,
      title: "Technology Innovation in Landslide Prevention",
      summary: "New sensor networks are being deployed across Nepal's most vulnerable areas.",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=250&fit=crop",
      date: "February 25, 2026",
      source: "Tech Nepal"
    }
  ]

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)', fontWeight: '800' }}>
          🏔️ Nepal Landslide Monitoring
        </h1>
        <p style={{ fontSize: '1.4rem', marginBottom: '30px', opacity: 0.95, fontWeight: '300' }}>
          Advanced Early Warning Network for Landslide Prevention
        </p>
        <div style={{ 
          background: 'rgba(255,255,255,0.15)', 
          backdropFilter: 'blur(10px)',
          padding: '25px', 
          borderRadius: '20px',
          maxWidth: '800px',
          margin: '0 auto',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0 }}>
            State-of-the-art monitoring system using multiple sensors to detect early signs of landslides, 
            providing crucial warnings to save lives across Nepal's mountainous regions.
          </p>
        </div>
      </div>

      {/* Province & Location Selection */}
      <div style={{ 
        background: 'rgba(255,255,255,0.15)', 
        backdropFilter: 'blur(10px)',
        padding: '40px', 
        borderRadius: '25px',
        marginBottom: '50px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h2 style={{ marginBottom: '30px', fontSize: '2.2rem', textAlign: 'center', fontWeight: '700' }}>
          📍 Select Your Province & Location
        </h2>
        
        {loadingLocations ? (
          <div style={{ padding: '60px', fontSize: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔄</div>
            <div style={{ marginBottom: '10px', fontSize: '1.3rem' }}>Loading monitoring locations...</div>
            <div style={{ fontSize: '1rem', opacity: 0.8 }}>
              Fetching sites from database
            </div>
          </div>
        ) : (
          <>
            {/* Province Selection */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', opacity: 0.9 }}>Choose Province:</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                {provinces.map(province => {
                  const locationCount = locationsByProvince[province.id]?.length || 0
                  const isSelected = selectedProvince === province.id
                  
                  return (
                    <button
                      key={province.id}
                      onClick={() => {
                        setSelectedProvince(isSelected ? null : province.id)
                        setSelectedLocation(null)
                      }}
                      disabled={locationCount === 0}
                      style={{ 
                        padding: '20px', 
                        background: isSelected 
                          ? `linear-gradient(135deg, ${province.color}, ${province.color}dd)` 
                          : locationCount > 0 
                            ? 'rgba(255,255,255,0.2)' 
                            : 'rgba(255,255,255,0.1)',
                        color: 'white', 
                        border: isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.3)', 
                        borderRadius: '15px',
                        cursor: locationCount > 0 ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                        textAlign: 'center',
                        fontSize: '1rem',
                        fontWeight: '600',
                        opacity: locationCount === 0 ? 0.5 : 1,
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: isSelected ? '0 8px 25px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.1)'
                      }}
                      onMouseOver={(e) => {
                        if (locationCount > 0 && !isSelected) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (locationCount > 0 && !isSelected) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{province.icon}</div>
                      <div style={{ fontSize: '1rem', marginBottom: '5px' }}>{province.name}</div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                        {locationCount > 0 ? `${locationCount} location${locationCount !== 1 ? 's' : ''}` : 'Coming Soon'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Location Selection (shown when province is selected) */}
            {selectedProvince && locationsByProvince[selectedProvince] && (
              <div style={{ 
                marginTop: '30px',
                padding: '25px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', opacity: 0.9 }}>
                  Select Monitoring Site in {provinces.find(p => p.id === selectedProvince)?.name}:
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '15px'
                }}>
                  {locationsByProvince[selectedProvince].map(location => {
                    const isSelected = selectedLocation?.id === location.id
                    const provinceColor = provinces.find(p => p.id === selectedProvince)?.color || '#45B7D1'
                    
                    return (
                      <div
                        key={location.id}
                        onClick={() => setSelectedLocation(location)}
                        style={{ 
                          padding: '20px', 
                          background: isSelected 
                            ? `linear-gradient(135deg, ${provinceColor}, ${provinceColor}dd)` 
                            : 'rgba(255,255,255,0.15)',
                          color: 'white', 
                          border: isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.3)', 
                          borderRadius: '15px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          textAlign: 'left',
                          transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                          boxShadow: isSelected ? '0 8px 25px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.1)'
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                            e.currentTarget.style.transform = 'translateY(-2px)'
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>
                            {isSelected ? '📍' : '📌'}
                          </span>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                            {location.name}
                          </h4>
                        </div>
                        
                        {location.description && (
                          <p style={{ 
                            margin: '0 0 10px 0', 
                            fontSize: '0.9rem', 
                            opacity: 0.9,
                            lineHeight: '1.4'
                          }}>
                            {location.description}
                          </p>
                        )}
                        
                        <div style={{ 
                          fontSize: '0.8rem',
                          opacity: 0.85,
                          marginTop: '10px'
                        }}>
                          📊 {location.region} • 📍 {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                        </div>
                        
                        {isSelected && (
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '8px 12px', 
                            background: 'rgba(255,255,255,0.25)', 
                            borderRadius: '10px',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            fontWeight: '700'
                          }}>
                            ✅ Selected
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {locations.length === 0 && (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📍</div>
                <div style={{ fontSize: '1.3rem', marginBottom: '10px' }}>No monitoring locations available</div>
                <div style={{ fontSize: '1rem', opacity: 0.8 }}>
                  Contact your administrator to set up monitoring locations.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sensor Selection */}
      <div style={{ marginBottom: '50px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '35px', fontSize: '2.2rem', fontWeight: '700' }}>
          🔬 Choose Monitoring System
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '25px'
        }}>
          {sensors.map(sensor => (
            <div 
              key={sensor.id}
              style={{ 
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
                padding: '30px', 
                borderRadius: '20px',
                color: '#2d3748',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                border: sensor.status === 'active' ? '3px solid #48bb78' : '3px solid #ed8936',
                opacity: sensor.status === 'active' ? 1 : 0.75,
                cursor: sensor.status === 'active' && selectedLocation ? 'pointer' : 'not-allowed',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}
              onClick={() => {
                if (sensor.status === 'active' && selectedLocation) {
                  onNavigate(sensor.id, selectedLocation)
                }
              }}
              onMouseOver={(e) => {
                if (sensor.status === 'active' && selectedLocation) {
                  e.currentTarget.style.transform = 'translateY(-5px)'
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.3)'
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '3rem', marginRight: '15px' }}>{sensor.icon}</span>
                <div>
                  <h3 style={{ fontSize: '1.4rem', margin: 0, marginBottom: '8px', fontWeight: '700' }}>{sensor.name}</h3>
                  <span style={{ 
                    background: sensor.status === 'active' ? '#48bb78' : '#ed8936', 
                    color: 'white', 
                    padding: '5px 14px', 
                    borderRadius: '20px', 
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {sensor.status === 'active' ? 'ACTIVE' : 'COMING SOON'}
                  </span>
                </div>
              </div>
              
              <p style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '20px', lineHeight: '1.6' }}>
                {sensor.description}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#718096' }}>Accuracy:</strong>
                  <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#2d3748' }}>{sensor.accuracy}</div>
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#718096' }}>Coverage:</strong>
                  <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#2d3748' }}>{sensor.coverage}</div>
                </div>
              </div>
              
              {sensor.status === 'active' && (
                <button 
                  disabled={!selectedLocation}
                  style={{ 
                    width: '100%',
                    padding: '14px',
                    background: selectedLocation 
                      ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' 
                      : '#cbd5e0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: selectedLocation ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    boxShadow: selectedLocation ? '0 4px 12px rgba(72, 187, 120, 0.4)' : 'none'
                  }}
                >
                  {selectedLocation 
                    ? 'Enter Dashboard →' 
                    : 'Select Location First'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Landslide Information Section */}
      <div style={{ 
        background: 'rgba(255,255,255,0.15)', 
        backdropFilter: 'blur(10px)',
        padding: '40px', 
        borderRadius: '25px',
        marginBottom: '50px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '35px', fontSize: '2.2rem', fontWeight: '700' }}>
          📚 Understanding Landslides
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '30px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#ffd93d', fontWeight: '700' }}>⚠️ What Causes Landslides?</h3>
            <ul style={{ fontSize: '1rem', lineHeight: '1.7', paddingLeft: '20px', margin: 0 }}>
              <li>Heavy rainfall and monsoon seasons</li>
              <li>Steep slopes and unstable soil</li>
              <li>Deforestation and construction activities</li>
              <li>Earthquakes and ground vibrations</li>
              <li>Poor drainage and water accumulation</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#ffd93d', fontWeight: '700' }}>🚨 Warning Signs</h3>
            <ul style={{ fontSize: '1rem', lineHeight: '1.7', paddingLeft: '20px', margin: 0 }}>
              <li>Cracks in ground or structures</li>
              <li>Tilting trees, poles, or walls</li>
              <li>Changes in water flow patterns</li>
              <li>Unusual sounds from the ground</li>
              <li>Sudden increase in water turbidity</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#ffd93d', fontWeight: '700' }}>🛡️ How We Help</h3>
            <ul style={{ fontSize: '1rem', lineHeight: '1.7', paddingLeft: '20px', margin: 0 }}>
              <li>24/7 real-time monitoring</li>
              <li>Instant SMS alerts to authorities</li>
              <li>Historical data analysis</li>
              <li>Early warning system activation</li>
              <li>Community evacuation support</li>
            </ul>
          </div>
        </div>
      </div>

      {/* News Section */}
      <div style={{ marginBottom: '50px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '35px', fontSize: '2.2rem', fontWeight: '700' }}>
          📰 Latest News & Updates
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '25px'
        }}>
          {newsArticles.map(article => (
            <div 
              key={article.id}
              style={{ 
                background: 'white', 
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                transition: 'transform 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <img 
                src={article.image} 
                alt={article.title}
                style={{ 
                  width: '100%', 
                  height: '200px', 
                  objectFit: 'cover'
                }}
              />
              <div style={{ padding: '25px', color: '#2d3748' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', lineHeight: '1.4', fontWeight: '700' }}>
                  {article.title}
                </h3>
                <p style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '15px', lineHeight: '1.6' }}>
                  {article.summary}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '600' }}>{article.source}</span>
                  <span style={{ fontSize: '0.85rem', color: '#718096' }}>{article.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        padding: '30px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '20px',
        position: 'relative'
      }}>
        <p style={{ fontSize: '1.05rem', marginBottom: '10px', fontWeight: '600' }}>
          🏔️ Nepal Landslide Monitoring System
        </p>
        <p style={{ fontSize: '0.95rem', opacity: 0.85, marginBottom: '0' }}>
          Protecting Communities Through Technology • Developed with ❤️ for Nepal
        </p>
        
        {/* Admin Access Button */}
        <button
          onClick={onAdminAccess}
          style={{
            position: 'absolute',
            bottom: '15px',
            right: '15px',
            padding: '10px 18px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.25)'
            e.target.style.color = 'white'
            e.target.style.transform = 'translateY(-2px)'
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.15)'
            e.target.style.color = 'rgba(255,255,255,0.8)'
            e.target.style.transform = 'translateY(0)'
          }}
        >
          🛠️ Admin
        </button>
      </div>
    </div>
  )
}

export default LandingPage
