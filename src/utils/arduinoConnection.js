// Web Serial API connection to Arduino
class ArduinoConnection {
  constructor() {
    this.port = null;
    this.reader = null;
    this.readableStreamClosed = null;
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
      this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      console.log('📡 Started reading from Arduino...');

      // Read data continuously
      while (this.isConnected) {
        try {
          const { value, done } = await this.reader.read();
          
          if (done) {
            console.log('⚠️ Reader done, stream closed');
            break;
          }

          if (!value) continue;

          console.log('📥 Raw data received:', value);

          // Process incoming data
          const lines = value.split('\n');
          lines.forEach(line => {
            const trimmed = line.trim();
            
            if (!trimmed) return; // Skip empty lines
            
            console.log('Processing line:', trimmed);
            
            // Parse your Arduino's output format: "X cm"
            if (trimmed.includes(' cm')) {
              const cmMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*cm/);
              if (cmMatch) {
                const distance = parseFloat(cmMatch[1]);
                console.log('✅ Parsed distance:', distance, 'cm');
                
                if (this.onDataCallback && distance > 0 && distance < 400) { // Valid range for HC-SR04
                  this.onDataCallback({
                    distance: distance,
                    time: new Date().toLocaleTimeString(),
                    timestamp: Date.now()
                  });
                }
              }
            }
          });
        } catch (readError) {
          console.error('❌ Error in read loop:', readError);
          // Continue reading even if one read fails
          if (!this.isConnected) break;
        }
      }
    } catch (error) {
      console.error('❌ Fatal error reading from Arduino:', error);
      this.isConnected = false;
    } finally {
      console.log('🔌 Reading loop ended');
    }
  }

  onData(callback) {
    this.onDataCallback = callback;
  }

  async disconnect() {
    try {
      console.log('🔌 Disconnecting from Arduino...');
      this.isConnected = false;
      
      if (this.reader) {
        try {
          await this.reader.cancel();
        } catch (e) {
          console.log('Reader cancel error (expected):', e.message);
        }
        this.reader = null;
      }
      
      if (this.readableStreamClosed) {
        try {
          await this.readableStreamClosed.catch(() => {}); // Ignore errors
        } catch (e) {
          console.log('Stream close error (expected):', e.message);
        }
      }
      
      if (this.port) {
        try {
          await this.port.close();
        } catch (e) {
          console.log('Port close error:', e.message);
        }
        this.port = null;
      }
      
      console.log('✅ Disconnected from Arduino');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default ArduinoConnection;