const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://pgc-blond.vercel.app',
    'https://pgcdha.vercel.app',
    "https://pgc-dha.vercel.app"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database Connection with caching for serverless
const connectDB = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) return;

  // Connection in progress — wait for it
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false, // Fail fast instead of buffering when disconnected
      maxPoolSize: 10,
    });
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    throw error; // Propagate so the request returns a proper error
  }
};

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const studentRoutes = require('./routes/students');
const remarksRoutes = require('./routes/remarks');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const principalEnquiriesRoutes = require('./routes/principalEnquiries');
const correspondenceRoutes = require('./routes/correspondence');
const timetableRoutes = require('./routes/timetable');
const examinationRoutes = require('./routes/examinations');
const teacherAttendanceRoutes = require('./routes/teacherAttendance');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const teacherAnalyticsRoutes = require('./routes/teacherAnalytics');
const studentProfileRoutes = require('./routes/studentProfiles');

// Ensure DB connection on every request (critical for serverless/Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('DB connection middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed. Please try again.',
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/remarks', remarksRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/teacher-attendance', teacherAttendanceRoutes);
app.use('/api/enquiries', principalEnquiriesRoutes);
app.use('/api/correspondence', correspondenceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/examinations', examinationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/teacher-analytics', teacherAnalyticsRoutes);
app.use('/api/student-profiles', studentProfileRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PGC-DHA API is running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be after 404 handler)
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
