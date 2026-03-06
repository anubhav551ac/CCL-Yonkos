# Landslide Monitor Dashboard

A React-based dashboard for monitoring landslide risk using Arduino Nano ultrasonic distance sensors.

## Features

- Real-time distance monitoring from Arduino via Web Serial API
- Risk level assessment (Safe/Warning/Danger)
- Interactive charts showing distance trends
- Connection status monitoring
- Demo mode with mock data
- Responsive design

## Hardware Requirements

- Arduino Nano
- HC-SR04 Ultrasonic Distance Sensor
- USB cable for connection

## Wiring Diagram

```
Arduino Nano    HC-SR04 Sensor
-----------     --------------
5V         -->  VCC
GND        -->  GND
Pin 9      -->  Trig
Pin 10     -->  Echo
```

## Setup Instructions

### 1. Arduino Setup

1. Open Arduino IDE
2. Upload the code from `arduino/landslide_sensor.ino` to your Arduino Nano
3. Connect the HC-SR04 sensor as shown in the wiring diagram
4. Connect Arduino to your computer via USB

### 2. Web App Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open http://localhost:3000

### 3. Connect to Arduino

1. Click "Connect Arduino" button in the dashboard
2. Select your Arduino's COM port from the browser dialog
3. The dashboard will start receiving real sensor data

## Browser Compatibility

The Web Serial API requires:
- Chrome 89+ or Edge 89+
- HTTPS connection (or localhost for development)
- User gesture to initiate connection

## Alternative Connection Methods

If Web Serial API isn't available, you can:

1. **Use Chrome with flags**: Enable `chrome://flags/#enable-experimental-web-platform-features`

2. **Node.js Server Method**: Create a local server that reads from Arduino and serves data via WebSocket

## Risk Levels

- **SAFE** (Green): Distance > 100cm
- **WARNING** (Yellow): Distance 50-100cm  
- **DANGER** (Red): Distance < 50cm

## Troubleshooting

- **Can't connect**: Make sure Arduino is plugged in and drivers are installed
- **No data**: Check serial monitor in Arduino IDE first
- **Browser not supported**: Use Chrome/Edge 89+ or implement Node.js bridge
- **Permission denied**: Try refreshing page and clicking connect again

## Future Enhancements

- Data logging and export
- Email/SMS alerts for danger levels
- Multiple sensor support
- Historical data analysis
- Mobile app version# CCL-Yonkos
