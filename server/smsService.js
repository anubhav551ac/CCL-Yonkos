const https = require('https');
const querystring = require('querystring');

class SMSService {
  constructor() {
    this.apiKey = '4ab7b3a7d05c13739af5731d7c46fb16ad3696770f7cba5d';
    // SMS Mobile API endpoint from documentation
    this.baseUrl = 'api.smsmobileapi.com';
  }

  async sendSMS(phone, message) {
    return new Promise((resolve, reject) => {
      // SMS Mobile API format based on documentation
      const postData = querystring.stringify({
        apikey: this.apiKey,
        recipients: phone,
        message: message,
        sendsms: 1 // Send via SMS (default)
      });

      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: '/sendsms/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      console.log('Sending SMS with data:', { phone, message, apikey: this.apiKey.substring(0, 10) + '...' });

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('SMS API Response:', data);
          try {
            const response = JSON.parse(data);
            
            // Check for SMS Mobile API success indicators
            if (response.result && response.result.error === 0 && response.result.sent === '1') {
              resolve({
                success: true,
                message: 'SMS sent successfully',
                data: response
              });
            } else if (response.success || response.status === 'success') {
              resolve({
                success: true,
                message: 'SMS sent successfully',
                data: response
              });
            } else {
              reject({
                success: false,
                message: response.message || response.error || 'Failed to send SMS',
                data: response
              });
            }
          } catch (error) {
            // If response is not JSON, check if it's a success message
            if (data.includes('success') || data.includes('sent')) {
              resolve({
                success: true,
                message: 'SMS sent successfully',
                data: { response: data }
              });
            } else {
              console.error('SMS Parse Error:', error, 'Raw response:', data);
              reject({
                success: false,
                message: 'Failed to parse SMS response',
                error: error.message,
                rawResponse: data
              });
            }
          }
        });
      });

      req.on('error', (error) => {
        console.error('SMS Request Error:', error);
        reject({
          success: false,
          message: 'SMS request failed',
          error: error.message
        });
      });

      req.write(postData);
      req.end();
    });
  }

  async sendLandslideAlert(phone, distance, riskLevel) {
    const messages = {
      DANGER: `🚨 LANDSLIDE ALERT! Distance: ${distance}cm - IMMEDIATE EVACUATION REQUIRED! Stay safe.`,
      WARNING: `⚠️ Landslide Warning: Distance ${distance}cm detected. Monitor closely and prepare for evacuation.`,
      SAFE: `✅ Landslide Monitor: Distance normalized to ${distance}cm. Area is currently safe.`
    };

    const message = messages[riskLevel] || `Landslide Monitor: Distance ${distance}cm, Risk: ${riskLevel}`;
    
    try {
      const result = await this.sendSMS(phone, message);
      console.log(`Alert sent to ${phone}: ${message}`);
      return result;
    } catch (error) {
      console.error(`Failed to send alert to ${phone}:`, error);
      throw error;
    }
  }

  // Test SMS function
  async sendTestSMS(phone, message = 'Hi from Landslide Monitor!') {
    try {
      const result = await this.sendSMS(phone, message);
      return result;
    } catch (error) {
      console.error('Test SMS failed:', error);
      throw error;
    }
  }
}

module.exports = SMSService;