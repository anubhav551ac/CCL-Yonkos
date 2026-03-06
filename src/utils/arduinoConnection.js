// Web Serial API connection to Arduino
class ArduinoConnection {
  constructor() {
    this.port = null;
    this.reader = null;
    this.isConnected = false;
    this.onDataCallback = null;
  }

  async connect() {
    try {
      // Check if Web Serial API is supported
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser. Please use Chrome or Edge.');
      }

      // Request port access
      this.port = await navigator.serial.requestPort();
      
      // Open the port with Arduino's baud rate and additional settings
      await this.port.open({ 
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });
      
      this.isConnected = true;
      console.log('Connected to Arduino');
      
      // Start reading data
      this.startReading();
      
      return true;
    } catch (error) {
      console.error('Failed to connect to Arduino:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Failed to open serial port')) {
        throw new Error('Port is busy. Close Arduino IDE Serial Monitor and try again.');
      } else if (error.message.includes('No port selected')) {
        throw new Error('No port selected. Please select your Arduino port.');
      } else {
        throw new Error(`Connection failed: ${error.message}`);
      }
    }
  }

  async startReading() {
    if (!this.port) return;

    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      // Read data continuously
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;

        // Process incoming data
        const lines = value.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          
          // Parse your Arduino's output format: "X cm"
          if (trimmed.includes(' cm')) {
            const cmMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*cm/);
            if (cmMatch) {
              const distance = parseFloat(cmMatch[1]);
              if (this.onDataCallback && distance > 0) {
                this.onDataCallback({
                  distance: distance,
                  time: new Date().toLocaleTimeString(),
                  timestamp: Date.now()
                });
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error reading from Arduino:', error);
      this.isConnected = false;
    }
  }

  onData(callback) {
    this.onDataCallback = callback;
  }

  async disconnect() {
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      this.isConnected = false;
      console.log('Disconnected from Arduino');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default ArduinoConnection;