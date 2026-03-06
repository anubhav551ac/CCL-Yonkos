// Mock data generator for Arduino ultrasonic sensor
export const generateMockData = () => {
  const baseDistance = 120 // Base distance in cm
  const variation = 40 // Random variation
  const trend = Math.sin(Date.now() / 10000) * 20 // Slow trend
  
  const distance = Math.max(10, 
    baseDistance + 
    trend + 
    (Math.random() - 0.5) * variation
  )

  return {
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
    time: new Date().toLocaleTimeString(),
    timestamp: Date.now()
  }
}

// Simulate serial communication with Arduino
export const connectToArduino = async () => {
  // In a real implementation, this would use Web Serial API
  // navigator.serial.requestPort() etc.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ connected: true, port: 'COM3' })
    }, 1000)
  })
}