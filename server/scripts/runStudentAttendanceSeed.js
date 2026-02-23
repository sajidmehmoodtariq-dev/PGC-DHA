#!/usr/bin/env node

/**
 * Student Attendance Data Seeder
 * 
 * This script creates test data for the Student Attendance Management system:
 * - Creates a coordinator user
 * - Creates classes and assigns coordinator as floor incharge
 * - Creates students for each class
 * - Creates sample attendance records
 * 
 * Usage: node server/scripts/runStudentAttendanceSeed.js
 */

require('dotenv').config();
const { seedStudentAttendanceData } = require('./seedStudentAttendanceData');

console.log('🌱 Student Attendance Data Seeder');
console.log('=================================\n');

// Run the seeding process
seedStudentAttendanceData();