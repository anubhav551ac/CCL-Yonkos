import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Wifi, WifiOff, AlertTriangle, CheckCircle, Usb, UsbOff } from 'lucide-react'

const Dashboard = ({ 
  sensorData, 
  currentDistance, 
  isConnected, 
  useRealArduino, 
  onConnectArduino, 
  onDisconnectArduino 
}) => {
  const getRiskLevel = (distance) => {
    if (distance < 50) return { level: 'DANGER', color: '#ef4444', status: 'status-danger' }
    if (distance < 100) return { level: 'WARNING', color: '#f59e0b', status: 'status-warning' }
    return { level: 'SAFE', color: '#10b981', status: 'status-safe' }
  }

  const risk = getRiskLevel(currentDistance)
  const avgDistance = sensorData.length > 0 
    ? (sensorData.reduce((sum, reading) => sum + reading.distance, 0) / sensorData.length).toFixed(1)
    : 0

  return (
    <div className="dashboard">
      <header className="header">
        <h1>🏔️ Landslide Monitor</h1>
        <p>Real-time Arduino Ultrasonic Distance Monitoring</p>
      </header>

      <div className="connection-status">
        {useRealArduino ? (
          isConnected ? (
            <>
              <Usb size={20} />
              <span style={{ marginLeft: '8px' }}>Arduino Connected</span>
              <button 
                onClick={onDisconnectArduino}
                style={{ 
                  marginLeft: '15px', 
                  padding: '5px 10px', 
                  background: '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <UsbOff size={20} className="pulse" />
              <span style={{ marginLeft: '8px' }}>Arduino Disconnected</span>
            </>
          )
        ) : (
          <>
            <Wifi size={20} />
            <span style={{ marginLeft: '8px' }}>Demo Mode (Mock Data)</span>
            <button 
              onClick={onConnectArduino}
              style={{ 
                marginLeft: '15px', 
                padding: '5px 10px', 
                background: '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Connect Arduino
            </button>
          </>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Current Distance</h3>
          <div className="stat-value" style={{ color: risk.color }}>
            {currentDistance}
          </div>
          <div className="stat-unit">centimeters</div>
        </div>

        <div className="stat-card">
          <h3>Risk Level</h3>
          <div className="stat-value" style={{ color: risk.color }}>
            <span className={`status-indicator ${risk.status}`}></span>
            {risk.level}
          </div>
        </div>

        <div className="stat-card">
          <h3>Average Distance</h3>
          <div className="stat-value">
            {avgDistance}
          </div>
          <div className="stat-unit">centimeters</div>
        </div>

        <div className="stat-card">
          <h3>Sensor Status</h3>
          <div className="stat-value">
            {isConnected ? (
              <>
                <CheckCircle size={24} color="#10b981" style={{ marginRight: '8px' }} />
                <span style={{ color: '#10b981' }}>ACTIVE</span>
              </>
            ) : (
              <>
                <AlertTriangle size={24} color="#ef4444" style={{ marginRight: '8px' }} />
                <span style={{ color: '#ef4444' }}>OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">
          <Activity size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Distance Readings Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sensorData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'Distance (cm)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              labelFormatter={(value) => `Time: ${value}`}
              formatter={(value) => [`${value} cm`, 'Distance']}
            />
            <Line 
              type="monotone" 
              dataKey="distance" 
              stroke="#667eea" 
              strokeWidth={2}
              dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#667eea', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Dashboard