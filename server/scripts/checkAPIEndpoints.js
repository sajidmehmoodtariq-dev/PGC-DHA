const axios = require('axios');

async function checkAPIEndpoints() {
  try {
    console.log('Checking API endpoints...\n');

    // Check users endpoint (enquiry management count)
    const usersResponse = await axios.get('http://localhost:5000/api/users?role=Student&page=1&limit=10');
    const usersData = usersResponse.data;
    console.log('Users API Response:');
    console.log('- Total Users (Enquiry Management):', usersData.totalDocs);
    console.log('- Current Page Users:', usersData.docs.length);
    console.log('- Total Pages:', usersData.totalPages);

    // Check principal enquiries endpoint (dashboard count)
    const enquiriesResponse = await axios.get('http://localhost:5000/api/enquiries/statistics?period=all');
    const enquiriesData = enquiriesResponse.data;
    console.log('\nPrincipal Enquiries API Response:');
    console.log('- Total Enquiries:', enquiriesData.totalEnquiries);
    console.log('- Level Statistics:', {
      level1: enquiriesData.levelStatistics?.level1 || 0,
      level2: enquiriesData.levelStatistics?.level2 || 0,
      level3: enquiriesData.levelStatistics?.level3 || 0,
      level4: enquiriesData.levelStatistics?.level4 || 0,
      level5: enquiriesData.levelStatistics?.level5 || 0
    });

    // Calculate Level 1+ from statistics
    const level1Plus = (enquiriesData.levelStatistics?.level1 || 0) +
                      (enquiriesData.levelStatistics?.level2 || 0) +
                      (enquiriesData.levelStatistics?.level3 || 0) +
                      (enquiriesData.levelStatistics?.level4 || 0) +
                      (enquiriesData.levelStatistics?.level5 || 0);

    console.log('- Calculated Level 1+:', level1Plus);
    console.log('\nDifference:', usersData.totalDocs - level1Plus);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAPIEndpoints();
