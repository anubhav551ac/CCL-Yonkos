import { useState } from 'react'
import LandingPage from './components/LandingPage'
import SlopeMonitoring from './components/SlopeMonitoring'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isAdminMode, setIsAdminMode] = useState(false)

  const handleNavigate = (sensorType, location) => {
    setSelectedLocation(location)
    if (sensorType === 'slope') {
      setCurrentPage('slope')
    }
    // Add other sensor types here when implemented
  }

  const handleBack = () => {
    setCurrentPage('landing')
    // Don't reset admin mode when going back
  }

  const handleAdminAccess = () => {
    setCurrentPage('admin')
  }

  const handleAdminLogin = () => {
    setIsAdminMode(true)
  }

  const handleAdminLogout = () => {
    setIsAdminMode(false)
    setCurrentPage('landing')
  }

  return (
    <div>
      {currentPage === 'landing' && (
        <LandingPage 
          onNavigate={handleNavigate} 
          onAdminAccess={handleAdminAccess}
          isAdminMode={isAdminMode}
        />
      )}
      
      {currentPage === 'slope' && (
        <SlopeMonitoring 
          location={selectedLocation} 
          onBack={handleBack}
          isAdminMode={isAdminMode}
        />
      )}

      {currentPage === 'admin' && (
        <AdminDashboard 
          onBack={handleBack}
          onAdminLogin={handleAdminLogin}
          onAdminLogout={handleAdminLogout}
        />
      )}
    </div>
  )
}

export default App