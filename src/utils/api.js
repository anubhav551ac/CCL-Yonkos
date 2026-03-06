// Simple API utility using fetch instead of axios
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    console.log(`Making API call to: ${API_BASE_URL}${endpoint}`, options)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    console.log(`API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API error response: ${errorText}`)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log(`API response data:`, result)
    return result;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// API functions
export const saveReading = async (distance, locationId = null) => {
  return await apiCall('/readings', {
    method: 'POST',
    body: JSON.stringify({ distance, location_id: locationId }),
  });
};

export const getRecentReadings = async (limit = 50, locationId = null) => {
  const locationQuery = locationId ? `&location_id=${locationId}` : '';
  return await apiCall(`/readings?limit=${limit}${locationQuery}`);
};

export const getReadingsByDateRange = async (startDate, endDate, locationId = null) => {
  const locationQuery = locationId ? `&location_id=${locationId}` : '';
  return await apiCall(`/readings/range?startDate=${startDate}&endDate=${endDate}${locationQuery}`);
};

export const getDailyStats = async (days = 30, locationId = null) => {
  const locationQuery = locationId ? `&location_id=${locationId}` : '';
  return await apiCall(`/stats/daily?days=${days}${locationQuery}`);
};

export const getAnalytics = async (period = 'week', locationId = null) => {
  const locationQuery = locationId ? `&location_id=${locationId}` : '';
  return await apiCall(`/analytics?period=${period}${locationQuery}`);
};

// SMS functions
export const sendTestSMS = async (phone, message) => {
  return await apiCall('/sms/test', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  });
};

export const sendAlert = async (phone, distance, riskLevel) => {
  return await apiCall('/alerts/send', {
    method: 'POST',
    body: JSON.stringify({ phone, distance, riskLevel }),
  });
};

// SMS Auto-alert settings functions
export const getSMSSettings = async () => {
  return await apiCall('/sms/settings');
};

export const updateSMSSettings = async (settings) => {
  return await apiCall('/sms/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

// Alert settings functions (phone number and cooldown)
export const getAlertSettings = async () => {
  return await apiCall('/alert/settings');
};

export const updateAlertSettings = async (settings) => {
  return await apiCall('/alert/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

// Location functions
export const getLocations = async () => {
  return await apiCall('/locations');
};

// Arduino functions
export const getArduinoPorts = async () => {
  return await apiCall('/arduino/ports');
};

export const connectArduino = async (port = null, locationId = null) => {
  return await apiCall('/arduino/connect', {
    method: 'POST',
    body: JSON.stringify({ port, location_id: locationId }),
  });
};

export const disconnectArduino = async () => {
  return await apiCall('/arduino/disconnect', {
    method: 'POST',
  });
};

export const getArduinoStatus = async () => {
  return await apiCall('/arduino/status');
};