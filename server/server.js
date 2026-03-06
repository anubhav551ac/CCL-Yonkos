const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const path = require('path');
const SMSService = require('./smsService');

const app = express();
const PORT = 5000;
const smsService = new SMSService();

// Middleware
app.use(cors());
app.use(express.json());

// Alert settings
let alertSettings = {
  phone: '9779860809730', // Nepal number with country code
  cooldown: 5 * 60 * 1000 // 5 minutes cooldown between alerts
};
let lastAlertTime = {};

// SMS Auto-alert settings
let smsAutoAlertSettings = {
  enabled: false, // Default to disabled to save balance
  dangerEnabled: true, // Always send DANGER alerts
  warningEnabled: false, // User can toggle WARNING alerts
  safeEnabled: false // Usually don't send SAFE alerts
};

// Initialize SQLite database
const db = new sqlite3.Database('./landslide_data.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Admin credentials (in production, use proper hashing)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'landslide2024!' // Change this in production
};

// Create tables
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER,
      distance REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      risk_level TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES locations (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER,
      date DATE NOT NULL,
      avg_distance REAL,
      min_distance REAL,
      max_distance REAL,
      reading_count INTEGER,
      risk_hours INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES locations (id)
    )
  `);

  // New tables for admin functionality
  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      province TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT DEFAULT 'observer',
      priority INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES locations (id)
    )
  `);

  // Insert default location if none exists
  db.get('SELECT COUNT(*) as count FROM locations', (err, row) => {
    if (!err && row.count === 0) {
      db.run(`
        INSERT INTO locations (name, region, latitude, longitude, description, status)
        VALUES ('Kathmandu Valley Site 1', 'kathmandu', 27.7172, 85.3240, 'Primary monitoring site in Kathmandu Valley', 'active')
      `);
    }
  });
}

// Helper function to determine risk level
function getRiskLevel(distance) {
  if (distance < 50) return 'DANGER';
  if (distance < 100) return 'WARNING';
  return 'SAFE';
}

// API Routes

// Save new sensor reading
app.post('/api/readings', async (req, res) => {
  const { distance } = req.body;
  const riskLevel = getRiskLevel(distance);
  
  db.run(
    'INSERT INTO sensor_readings (distance, risk_level) VALUES (?, ?)',
    [distance, riskLevel],
    async function(err) {
      if (err) {
        console.error('Error saving reading:', err);
        res.status(500).json({ error: 'Failed to save reading' });
      } else {
        console.log(`Saved reading: ${distance}cm (${riskLevel})`);
        
        // Check if SMS alert should be sent
        await checkAndSendAlert(distance, riskLevel);
        
        // Update daily stats
        updateDailyStats();
        
        res.json({ 
          id: this.lastID, 
          distance, 
          riskLevel,
          timestamp: new Date().toISOString()
        });
      }
    }
  );
});

// Test SMS endpoint
app.post('/api/sms/test', async (req, res) => {
  const { phone, message } = req.body;
  
  try {
    const result = await smsService.sendTestSMS(phone || alertSettings.phone, message || 'Hi');
    res.json({
      success: true,
      message: 'Test SMS sent successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test SMS',
      error: error.message
    });
  }
});

// Manual alert endpoint
app.post('/api/alerts/send', async (req, res) => {
  const { phone, distance, riskLevel } = req.body;
  
  try {
    const result = await smsService.sendLandslideAlert(
      phone || alertSettings.phone, 
      distance, 
      riskLevel
    );
    res.json({
      success: true,
      message: 'Alert sent successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send alert',
      error: error.message
    });
  }
});

// Admin authentication
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    // In production, use JWT tokens
    res.json({ 
      success: true, 
      token: 'admin-session-' + Date.now(),
      message: 'Login successful' 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
});

// Middleware to check admin authentication (simplified)
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization;
  if (token && token.startsWith('admin-session-')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Get all locations (public endpoint for users to see available monitoring sites)
app.get('/api/locations', (req, res) => {
  db.all('SELECT id, name, description, region, province, latitude, longitude, created_at FROM locations ORDER BY province, region, created_at DESC', (err, rows) => {
    if (err) {
      console.error('Error fetching locations:', err)
      return res.status(500).json({ error: 'Failed to fetch locations' })
    }
    res.json({ success: true, locations: rows })
  })
})

// Get all locations (admin endpoint with full details)
app.get('/api/admin/locations', requireAdmin, (req, res) => {
  db.all('SELECT * FROM locations ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch locations' });
    } else {
      res.json(rows);
    }
  });
});

// Add new location
app.post('/api/admin/locations', requireAdmin, (req, res) => {
  const { name, region, province, latitude, longitude, description } = req.body;
  
  db.run(
    'INSERT INTO locations (name, region, province, latitude, longitude, description) VALUES (?, ?, ?, ?, ?, ?)',
    [name, region, province || 'Province 1', latitude, longitude, description],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to add location' });
      } else {
        res.json({ 
          id: this.lastID, 
          name, 
          region,
          province: province || 'Province 1',
          latitude, 
          longitude, 
          description,
          status: 'active'
        });
      }
    }
  );
});

// Update location
app.put('/api/admin/locations/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, region, latitude, longitude, description, status } = req.body;
  
  db.run(
    'UPDATE locations SET name = ?, region = ?, latitude = ?, longitude = ?, description = ?, status = ? WHERE id = ?',
    [name, region, latitude, longitude, description, status, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to update location' });
      } else {
        res.json({ success: true, changes: this.changes });
      }
    }
  );
});

// Delete location
app.delete('/api/admin/locations/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM locations WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: 'Failed to delete location' });
    } else {
      res.json({ success: true, changes: this.changes });
    }
  });
});

// Get notification contacts for a location
app.get('/api/admin/locations/:id/contacts', requireAdmin, (req, res) => {
  const { id } = req.params;
  
  db.all('SELECT * FROM notification_contacts WHERE location_id = ? ORDER BY priority, name', [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch contacts' });
    } else {
      res.json(rows);
    }
  });
});

// Add notification contact
app.post('/api/admin/locations/:id/contacts', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, phone, role, priority } = req.body;
  
  db.run(
    'INSERT INTO notification_contacts (location_id, name, phone, role, priority) VALUES (?, ?, ?, ?, ?)',
    [id, name, phone, role || 'observer', priority || 1],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to add contact' });
      } else {
        res.json({ 
          id: this.lastID, 
          location_id: id,
          name, 
          phone, 
          role: role || 'observer',
          priority: priority || 1,
          active: 1
        });
      }
    }
  );
});

// Update notification contact
app.put('/api/admin/contacts/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, phone, role, priority, active } = req.body;
  
  db.run(
    'UPDATE notification_contacts SET name = ?, phone = ?, role = ?, priority = ?, active = ? WHERE id = ?',
    [name, phone, role, priority, active ? 1 : 0, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to update contact' });
      } else {
        res.json({ success: true, changes: this.changes });
      }
    }
  );
});

// Delete notification contact
app.delete('/api/admin/contacts/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM notification_contacts WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: 'Failed to delete contact' });
    } else {
      res.json({ success: true, changes: this.changes });
    }
  });
});

// Get admin dashboard stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const stats = {};
  
  // Get total locations
  db.get('SELECT COUNT(*) as total FROM locations', (err, row) => {
    if (!err) stats.totalLocations = row.total;
    
    // Get active locations
    db.get('SELECT COUNT(*) as active FROM locations WHERE status = "active"', (err, row) => {
      if (!err) stats.activeLocations = row.active;
      
      // Get total contacts
      db.get('SELECT COUNT(*) as total FROM notification_contacts', (err, row) => {
        if (!err) stats.totalContacts = row.total;
        
        // Get total readings today
        db.get('SELECT COUNT(*) as today FROM sensor_readings WHERE DATE(timestamp) = DATE("now")', (err, row) => {
          if (!err) stats.readingsToday = row.today;
          
          res.json(stats);
        });
      });
    });
  });
});

// Update SMS auto-alert settings
app.put('/api/sms/settings', (req, res) => {
  const { enabled, dangerEnabled, warningEnabled, safeEnabled } = req.body;
  
  smsAutoAlertSettings = {
    enabled: enabled !== undefined ? enabled : smsAutoAlertSettings.enabled,
    dangerEnabled: dangerEnabled !== undefined ? dangerEnabled : smsAutoAlertSettings.dangerEnabled,
    warningEnabled: warningEnabled !== undefined ? warningEnabled : smsAutoAlertSettings.warningEnabled,
    safeEnabled: safeEnabled !== undefined ? safeEnabled : smsAutoAlertSettings.safeEnabled
  };
  
  console.log('SMS Auto-alert settings updated:', smsAutoAlertSettings);
  res.json(smsAutoAlertSettings);
});

// Get alert settings (phone number and cooldown)
app.get('/api/alert/settings', (req, res) => {
  res.json({
    phone: alertSettings.phone,
    cooldown: alertSettings.cooldown
  });
});

// Update alert settings (phone number and cooldown)
app.put('/api/alert/settings', (req, res) => {
  const { phone, cooldown } = req.body;
  
  if (phone !== undefined) {
    alertSettings.phone = phone;
  }
  
  if (cooldown !== undefined) {
    alertSettings.cooldown = cooldown;
  }
  
  console.log('Alert settings updated:', alertSettings);
  res.json({
    success: true,
    phone: alertSettings.phone,
    cooldown: alertSettings.cooldown
  });
});

// Function to check and send alerts
async function checkAndSendAlert(distance, riskLevel) {
  // Only send if auto-alerts are enabled and specific risk level is enabled
  if (!smsAutoAlertSettings.enabled) {
    console.log(`Auto-alerts disabled. Skipping ${riskLevel} alert for distance: ${distance}cm`);
    return;
  }

  const shouldSend = 
    (riskLevel === 'DANGER' && smsAutoAlertSettings.dangerEnabled) ||
    (riskLevel === 'WARNING' && smsAutoAlertSettings.warningEnabled) ||
    (riskLevel === 'SAFE' && smsAutoAlertSettings.safeEnabled);

  if (!shouldSend) {
    console.log(`${riskLevel} auto-alerts disabled. Skipping alert for distance: ${distance}cm`);
    return;
  }

  const now = Date.now();
  const lastAlert = lastAlertTime[riskLevel] || 0;
  
  // Send alert for DANGER immediately, WARNING/SAFE with cooldown
  if (riskLevel === 'DANGER' || (now - lastAlert) > alertSettings.cooldown) {
    try {
      await smsService.sendLandslideAlert(alertSettings.phone, distance, riskLevel);
      lastAlertTime[riskLevel] = now;
      console.log(`✅ Auto ${riskLevel} alert sent for distance: ${distance}cm`);
    } catch (error) {
      console.error('Failed to send automatic alert:', error);
    }
  } else {
    console.log(`${riskLevel} alert on cooldown. Last sent: ${Math.round((now - lastAlert) / 1000)}s ago`);
  }
}

// Get recent readings
app.get('/api/readings', (req, res) => {
  const limit = req.query.limit || 50;
  
  db.all(
    'SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT ?',
    [limit],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Failed to fetch readings' });
      } else {
        res.json(rows);
      }
    }
  );
});

// Get readings by date range
app.get('/api/readings/range', (req, res) => {
  const { startDate, endDate } = req.query;
  
  db.all(
    'SELECT * FROM sensor_readings WHERE DATE(timestamp) BETWEEN ? AND ? ORDER BY timestamp',
    [startDate, endDate],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Failed to fetch readings' });
      } else {
        res.json(rows);
      }
    }
  );
});

// Get daily statistics
app.get('/api/stats/daily', (req, res) => {
  const days = req.query.days || 30;
  
  db.all(
    'SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?',
    [days],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Failed to fetch daily stats' });
      } else {
        res.json(rows);
      }
    }
  );
});

// Get analytics and trends
app.get('/api/analytics', (req, res) => {
  const period = req.query.period || 'week'; // week, month, year, day
  
  let dateFilter = '';
  switch(period) {
    case 'day':
      dateFilter = "DATE(timestamp) >= DATE('now', '-1 day')";
      break;
    case 'week':
      dateFilter = "DATE(timestamp) >= DATE('now', '-7 days')";
      break;
    case 'month':
      dateFilter = "DATE(timestamp) >= DATE('now', '-30 days')";
      break;
    case 'year':
      dateFilter = "DATE(timestamp) >= DATE('now', '-365 days')";
      break;
  }
  
  db.all(`
    SELECT 
      DATE(timestamp) as date,
      AVG(distance) as avg_distance,
      MIN(distance) as min_distance,
      MAX(distance) as max_distance,
      COUNT(*) as reading_count,
      SUM(CASE WHEN risk_level = 'DANGER' THEN 1 ELSE 0 END) as danger_count,
      SUM(CASE WHEN risk_level = 'WARNING' THEN 1 ELSE 0 END) as warning_count
    FROM sensor_readings 
    WHERE ${dateFilter}
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch analytics' });
    } else {
      // Calculate percentage changes
      const analytics = rows.map((row, index) => {
        const prevRow = rows[index + 1];
        let percentChange = 0;
        
        if (prevRow) {
          percentChange = ((row.avg_distance - prevRow.avg_distance) / prevRow.avg_distance * 100);
        }
        
        return {
          ...row,
          percent_change: parseFloat(percentChange.toFixed(2))
        };
      });
      
      res.json(analytics);
    }
  });
});

// Update daily statistics
function updateDailyStats() {
  const today = new Date().toISOString().split('T')[0];
  
  db.all(`
    SELECT 
      AVG(distance) as avg_distance,
      MIN(distance) as min_distance,
      MAX(distance) as max_distance,
      COUNT(*) as reading_count,
      SUM(CASE WHEN risk_level != 'SAFE' THEN 1 ELSE 0 END) as risk_hours
    FROM sensor_readings 
    WHERE DATE(timestamp) = ?
  `, [today], (err, rows) => {
    if (err) {
      console.error('Error calculating daily stats:', err);
      return;
    }
    
    const stats = rows[0];
    
    db.run(`
      INSERT OR REPLACE INTO daily_stats 
      (date, avg_distance, min_distance, max_distance, reading_count, risk_hours)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [today, stats.avg_distance, stats.min_distance, stats.max_distance, stats.reading_count, stats.risk_hours]);
  });
}

// WebSocket for real-time updates
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Broadcast new readings to all connected clients
function broadcastReading(reading) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'new_reading',
        data: reading
      }));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:8080`);
});