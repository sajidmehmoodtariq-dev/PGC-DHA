const axios = require('axios');

async function testAnalyticsAPIWithAuth() {
  try {
    console.log('Testing Analytics API with authentication...\n');
    
    // Step 1: Login to get authentication token
    console.log('1. Logging in as test admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      login: 'test.admin@pgc.edu.pk',
      password: 'testadmin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    // Set up axios with authentication header
    const apiClient = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Step 2: Test analytics endpoints
    console.log('\n2. Testing /api/analytics/overview');
    const overviewResponse = await apiClient.get('/analytics/overview');
    console.log('✅ Overview Response:', JSON.stringify(overviewResponse.data, null, 2));
    
    console.log('\n3. Testing /api/analytics/zone-statistics');
    const zoneResponse = await apiClient.get('/analytics/zone-statistics');
    console.log('✅ Zone Statistics Response:', JSON.stringify(zoneResponse.data, null, 2));
    
    console.log('\n4. Testing /api/analytics/performance-matrix');
    const matrixResponse = await apiClient.get('/analytics/performance-matrix');
    console.log('✅ Performance Matrix Response:', JSON.stringify(matrixResponse.data, null, 2));
    
    console.log('\n🎉 Analytics API is working successfully with authentication!');
    
  } catch (error) {
    console.error('❌ Error testing analytics API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAnalyticsAPIWithAuth();
