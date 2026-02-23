const axios = require('axios');

async function testServerHealth() {
  try {
    console.log('Testing server health...');
    
    // Test if server is running
    const response = await axios.get('http://localhost:5000/api/test', {
      timeout: 5000
    });
    
    console.log('✅ Server is running');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Server health check failed:');
    if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running or not accessible on port 5000');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Cannot resolve localhost');
    } else if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testServerHealth();
