require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

// Simulate the exact IT enquiry management API call
async function simulateITEnquiryRequest() {
  await mongoose.connect(process.env.MONGO_URI);
  
  console.log('=== SIMULATING IT ENQUIRY MANAGEMENT REQUEST ===\n');
  
  // Import the users route to test it directly
  const usersRoute = require('./routes/users');
  
  // Create a mock express app
  const app = express();
  app.use(express.json());
  
  // Mock authentication middleware
  app.use((req, res, next) => {
    req.user = { id: 'test', email: 'test@test.com', role: 'ITAdmin' };
    next();
  });
  
  app.use('/api/users', usersRoute);
  
  // Test different scenarios that IT enquiry management might use
  const scenarios = [
    {
      name: 'Default users query',
      params: {}
    },
    {
      name: 'Students only',
      params: { role: 'Student' }
    },
    {
      name: 'Enquiry management (excludeClassAssigned=true)',
      params: { role: 'Student', excludeClassAssigned: 'true' }
    },
    {
      name: 'With pagination',
      params: { role: 'Student', excludeClassAssigned: 'true', page: 1, limit: 10 }
    },
    {
      name: 'With status=all (admin only)',
      params: { role: 'Student', status: 'all' }
    }
  ];
  
  // Test each scenario by making a direct call to the filter logic
  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name}`);
    console.log(`Params: ${JSON.stringify(scenario.params)}`);
    
    // Simulate the filter building logic from users.js
    const {
      role = '',
      excludeClassAssigned = '',
      status = ''
    } = scenario.params;
    
    const filter = {};
    
    // ALWAYS exclude deleted users unless explicitly requested by admin
    filter.status = { $ne: 3 };
    
    // Role filter
    if (role) {
      filter.role = role;
    }
    
    // Status filter
    if (status) {
      if (status === 'active') {
        filter.isActive = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      } else if (status === 'approved') {
        filter.isApproved = true;
      } else if (status === 'pending') {
        filter.isApproved = false;
      } else if (status === 'all') {
        // If explicitly requesting all users, remove the default status filter
        // BUT this should be restricted to admin users only
        const userRole = 'ITAdmin'; // Mock user role
        if (['SystemAdmin', 'ITAdmin'].includes(userRole)) {
          delete filter.status;
          console.log('  Admin override: Including deleted users');
        }
      }
    }
    
    // Exclude students with class assignments (for enquiry reports)
    if (excludeClassAssigned === 'true') {
      filter.classId = { $exists: false };
      filter.prospectusStage = { $gte: 1, $lte: 5 };
    }
    
    const User = require('./models/User');
    const count = await User.countDocuments(filter);
    
    console.log(`  Filter: ${JSON.stringify(filter, null, 2)}`);
    console.log(`  Count: ${count}`);
    console.log('');
  }
  
  // Test what would happen with a problematic query (no status filter)
  console.log('Testing PROBLEMATIC query (no status filter):');
  const problematicFilter = {
    role: 'Student',
    classId: { $exists: false },
    prospectusStage: { $gte: 1, $lte: 5 }
    // Missing: status: { $ne: 3 }
  };
  
  const User = require('./models/User');
  const problematicCount = await User.countDocuments(problematicFilter);
  console.log(`  Filter: ${JSON.stringify(problematicFilter, null, 2)}`);
  console.log(`  Count: ${problematicCount} (This should NOT be used by IT dashboard)`);
  
  process.exit(0);
}

simulateITEnquiryRequest().catch(console.error);