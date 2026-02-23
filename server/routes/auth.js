const express = require('express');
const User = require('../models/User');
const Session = require('../models/Session');
const jwtService = require('../services/jwtService');
const passwordService = require('../services/passwordService');
const { normalizeRole, getValidRoles, getRoleDisplayName } = require('../services/roleNormalizer');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, AppError, sendSuccessResponse, sendErrorResponse } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user for PGC DHA Campus
 * @access  Public
 */
router.post('/register', asyncHandler(async (req, res) => {
  const {
    email,
    userName,
    password,
    phoneNumbers,
    fullName,
    gender,
    dateOfBirth,
    cnic,
    role = 'Student',
    familyInfo,
    academicHistory,
    currentClass,
    academicSession,
    academicYear
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { userName: userName?.toLowerCase() },
      { cnic }
    ]
  });

  if (existingUser) {
    let field = 'email';
    if (existingUser.userName === userName?.toLowerCase()) field = 'userName';
    if (existingUser.cnic === cnic) field = 'cnic';
    throw new AppError(`User with this ${field} already exists`, 400, 'USER_EXISTS');
  }

  // Normalize role before creating user
  const normalizedRole = normalizeRole(role);

  // Create user data with simplified schema
  const userData = {
    email: email.toLowerCase(),
    userName: userName?.toLowerCase(),
    password,
    phoneNumber: phoneNumbers?.primary || phoneNumbers,
    secondaryPhone: phoneNumbers?.secondary,
    fullName: {
      firstName: fullName?.firstName || fullName?.split(' ')[0] || '',
      lastName: fullName?.lastName || fullName?.split(' ').slice(1).join(' ') || ''
    },
    gender,
    dob: dateOfBirth,
    cnic,
    role: normalizedRole,
    familyInfo,
    classId: currentClass,
    isActive: true,
    isApproved: false, // Requires approval
    status: 1 // Active status
  };

  // Create and save user (password will be hashed by pre-save hook)
  const newUser = new User(userData);
  await newUser.save();

  // Remove sensitive data
  const userResponse = newUser.toJSON();
  delete userResponse.password;

  sendSuccessResponse(res, {
    user: userResponse,
    message: 'Registration successful! Your account is pending approval.'
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user to PGC DHA Campus
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { login, password } = req.body;
  
  if (!login || !password) {
    throw new AppError('Login and password are required', 400, 'MISSING_CREDENTIALS');
  }
  
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ipAddress = req.ip || req.connection.remoteAddress;

  // Find user by email or userName
  const user = await User.findOne({
    $or: [
      { email: login.toLowerCase() },
      { userName: login }
    ]
  }).select('+password');

  // Check if user exists and password is correct
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is locked (optional: implement lock logic if needed)
  if (user.isLocked) {
    throw new AppError('Account is temporarily locked due to multiple failed login attempts', 423, 'ACCOUNT_LOCKED');
  }

  // Check account status using virtual
  if (user.accountStatus !== 'Active') {
    throw new AppError(`Account is ${user.accountStatus.toLowerCase()}`, 403, 'ACCOUNT_INACTIVE');
  }

  // Reset login attempts on successful login (optional: implement if needed)
  if (typeof user.resetLoginAttempts === 'function') {
    await user.resetLoginAttempts();
  }

  // Generate tokens
  const sessionData = {
    userAgent,
    ipAddress,
    loginMethod: 'Password'
  };

  const tokenData = await jwtService.generateTokenPair(user, sessionData);

  // Remove sensitive data from user object
  const userResponse = user.toJSON();
  delete userResponse.password;
  delete userResponse.loginAttempts;
  delete userResponse.lockUntil;
  delete userResponse.passwordResetToken;
  delete userResponse.passwordResetExpires;

  sendSuccessResponse(res, {
    user: userResponse,
    tokens: {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn
    },
    session: {
      id: tokenData.sessionId
    },
    message: 'Login successful. Welcome to PGC DHA Campus!'
  });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
  }

  try {
    const tokenData = await jwtService.refreshAccessToken(refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    sendSuccessResponse(res, {
      tokens: {
        accessToken: tokenData.accessToken,
        expiresIn: tokenData.expiresIn
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const sessionId = req.session?._id;
  
  if (sessionId) {
    // Invalidate session
    await Session.findByIdAndUpdate(sessionId, {
      isActive: false,
      endTime: new Date()
    });
  }

  sendSuccessResponse(res, {
    message: 'Logout successful'
  });
}));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists or not for security
    return sendSuccessResponse(res, {
      message: 'If an account with that email exists, we have sent a password reset link.'
    });
  }

  // Generate reset token
  const resetToken = await passwordService.generateResetToken(user);

  // In a real app, you would send an email here
  // For now, we'll just return the token for testing
  sendSuccessResponse(res, {
    message: 'Password reset token generated',
    resetToken // Remove this in production
  });
}));

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    throw new AppError('New password is required', 400, 'PASSWORD_REQUIRED');
  }

  const user = await passwordService.verifyResetToken(token);
  
  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  // Update password
  await passwordService.updatePassword(user, newPassword);

  sendSuccessResponse(res, {
    message: 'Password reset successful. You can now login with your new password.'
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const userResponse = user.toJSON();
  delete userResponse.password;

  sendSuccessResponse(res, {
    user: userResponse,
    message: 'User profile retrieved successfully'
  });
}));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updateData = req.body;

  // Remove sensitive fields that shouldn't be updated via this endpoint
  delete updateData.password;
  delete updateData.email;
  delete updateData.userName;
  delete updateData.role;
  delete updateData.isActive;
  delete updateData.isApproved;

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  sendSuccessResponse(res, {
    user,
    message: 'Profile updated successfully'
  });
}));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400, 'PASSWORDS_REQUIRED');
  }

  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
  }

  // Update password
  await passwordService.updatePassword(user, newPassword);

  sendSuccessResponse(res, {
    message: 'Password changed successfully'
  });
}));

/**
 * @route   GET /api/auth/roles
 * @desc    Get all valid roles with display names
 * @access  Public
 */
router.get('/roles', asyncHandler(async (req, res) => {
  const validRoles = getValidRoles();
  const rolesWithDisplayNames = validRoles.map(role => ({
    value: role,
    label: getRoleDisplayName(role)
  }));

  sendSuccessResponse(res, {
    roles: rolesWithDisplayNames,
    message: 'Roles retrieved successfully'
  });
}));

module.exports = router;
