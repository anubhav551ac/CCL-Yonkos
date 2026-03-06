const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class ArduinoManager {
  constructor() {
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.onDataCallback = null;
    this.connectionInfo = null;
  }

  // List available serial ports
  async listPorts() {
    try {
      console.log('🔍 Scanning for serial ports...');
      const { SerialPort } = require('serialport');
      const ports = await SerialPort.list();
      
      console.log('📋 All detected ports:', ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        vendorId: p.vendorId,
        productId: p.productId
      })));
      
      const arduinoPorts = ports.filter(port => 
        port.manufacturer && 
        (port.manufacturer.includes('Arduino') || 
         port.manufacturer.includes('CH340') || 
         port.manufacturer.includes('FTDI') ||
         port.manufacturer.includes('Silicon Labs') ||
         port.vendorId === '2341' || // Arduino VID
         port.vendorId === '1a86' || // CH340 VID
         port.path.includes('ttyUSB') || // Linux Arduino
         port.path.includes('ttyACM') || // Linux Arduino
         port.path.includes('COM'))      // Windows COM ports
      );
      
      console.log('🎯 Arduino-like ports found:', arduinoPorts);
      return arduinoPorts;
    } catch (error) {
      console.error('❌ Error listing ports:', error);
      return [];
    }
  }

  // Connect to Arduino
  async connect(portPath = null) {
    try {
      // If no port specified, try to find Arduino automatically
      if (!portPath) {
        const availablePorts = await this.listPorts();
        if (availablePorts.length === 0) {
          throw new Error('No Arduino found. Please check connection.');
        }
        portPath = availablePorts[0].path;
        console.log(`🔍 Auto-detected Arduino on port: ${portPath}`);
      }

      // Disconnect existing connection
      if (this.isConnected) {
        await this.disconnect();
      }

      // Create new connection
      this.port = new SerialPort({
        path: portPath,
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      // Set up event handlers
      this.port.on('open', () => {
        this.isConnected = true;
        this.connectionInfo = {
          port: portPath,
          connectedAt: new Date().toISOString(),
          status: 'connected'
        };
        console.log(`✅ Arduino connected on ${portPath}`);
      });

      this.port.on('error', (error) => {
        console.error('❌ Arduino connection error:', error);
        this.isConnected = false;
        this.connectionInfo = {
          ...this.connectionInfo,
          status: 'error',
          error: error.message
        };
      });

      this.port.on('close', () => {
        console.log('🔌 Arduino connection closed');
        this.isConnected = false;
        this.connectionInfo = {
          ...this.connectionInfo,
          status: 'disconnected',
          disconnectedAt: new Date().toISOString()
        };
      });

      // Handle incoming data
      this.parser.on('data', (data) => {
        const line = data.toString().trim();
        if (!line) return;

        console.log('📥 Arduino data:', line);

        // Parse distance data: "123 cm"
        if (line.includes(' cm')) {
          const match = line.match(/(\d+(?:\.\d+)?)\s*cm/);
          if (match) {
            const distance = parseFloat(match[1]);
            if (distance > 0 && distance < 400) { // Valid HC-SR04 range
              // Create Nepal time timestamp (UTC+5:45)
              const now = new Date();
              const nepalTime = new Date(now.getTime() + (5.75 * 60 * 60 * 1000));
              
              const reading = {
                distance: distance,
                timestamp: nepalTime.toISOString(),
                source: 'arduino'
              };
              
              console.log(`✅ Parsed reading: ${distance}cm at Nepal time: ${nepalTime.toLocaleString()}`);
              
              if (this.onDataCallback) {
                this.onDataCallback(reading);
              }
            }
          }
        }
      });

      return new Promise((resolve, reject) => {
        this.port.on('open', () => resolve(true));
        this.port.on('error', reject);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      });

    } catch (error) {
      console.error('❌ Failed to connect to Arduino:', error);
      throw error;
    }
  }

  // Disconnect from Arduino
  async disconnect() {
    try {
      if (this.port && this.port.isOpen) {
        await new Promise((resolve) => {
          this.port.close(resolve);
        });
      }
      this.isConnected = false;
      this.port = null;
      this.parser = null;
      console.log('🔌 Arduino disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting Arduino:', error);
    }
  }

  // Set callback for incoming data
  onData(callback) {
    this.onDataCallback = callback;
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionInfo: this.connectionInfo
    };
  }

  // Send command to Arduino (if needed)
  async sendCommand(command) {
    if (!this.isConnected || !this.port) {
      throw new Error('Arduino not connected');
    }

    return new Promise((resolve, reject) => {
      this.port.write(command + '\n', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  }
}

module.exports = ArduinoManager;