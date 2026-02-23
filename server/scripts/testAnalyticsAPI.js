const axios = require('axios');

async function testAnalyticsAPI() {
  try {
    console.log('Testing Analytics API endpoints...\n');
    
    // Test overview endpoint
    console.log('1. Testing /api/analytics/overview');
    const overviewResponse = await axios.get('http://localhost:5000/api/analytics/overview');
    console.log('✅ Overview Response:', JSON.stringify(overviewResponse.data, null, 2));
    
    // Test zone statistics
    console.log('\n2. Testing /api/analytics/zone-statistics');
    const zoneResponse = await axios.get('http://localhost:5000/api/analytics/zone-statistics');
    console.log('✅ Zone Statistics Response:', JSON.stringify(zoneResponse.data, null, 2));
    
    console.log('\n🎉 Analytics API is working successfully!');
    
  } catch (error) {
    console.error('❌ Error testing analytics API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAnalyticsAPI();
