const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../models/Session');

class JWTService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || this.accessTokenSecret + '-refresh';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRE || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRE || '7d';
  }

  /**
   * Generate access token
   * @param {Object} payload - Token payload containing user info
   * @returns {String} - JWT access token
   */
  generateAccessToken(payload) {
    const tokenPayload = {
      userId: payload.userId,
      instituteName: 'Punjab Group of Colleges - DHA Campus',
      role: payload.role,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
      tokenVersion: payload.tokenVersion || 0,
      type: 'access'
    };

    // Use infinite expiration for Principal role (100 years)
    const expiresIn = payload.role === 'Principal' ? '100y' : this.accessTokenExpiry;

    return jwt.sign(tokenPayload, this.accessTokenSecret, {
      expiresIn: expiresIn,
      issuer: 'pgc-system',
      audience: 'pgc-client'
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {String} - JWT refresh token
   */
  generateRefreshToken(payload) {
    const tokenPayload = {
      userId: payload.userId,
      instituteName: 'Punjab Group of Colleges - DHA Campus',
      sessionId: payload.sessionId,
      tokenVersion: payload.tokenVersion || 0,
      jti: crypto.randomUUID(), // JWT ID for unique identification
      type: 'refresh'
    };

    // Use infinite expiration for Principal role (100 years)
    const expiresIn = payload.role === 'Principal' ? '100y' : this.refreshTokenExpiry;

    return jwt.sign(tokenPayload, this.refreshTokenSecret, {
      expiresIn: expiresIn,
      issuer: 'pgc-system',
      audience: 'pgc-client'
    });
  }

  /**
   * Verify access token
   * @param {String} token - JWT access token
   * @returns {Object} - Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'pgc-system',
        audience: 'pgc-client'
      });
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   * @param {String} token - JWT refresh token
   * @returns {Object} - Decoded token payload
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'pgc-system',
        audience: 'pgc-client'
      });
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @param {Object} sessionData - Session information
   * @returns {Object} - Object containing both tokens
   */
  async generateTokenPair(user, sessionData) {
    try {
      // Calculate expiration date - infinite for Principal (100 years), 7 days for others
      const expirationDays = user.role === 'Principal' ? 100 * 365 : 7;
      const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
      
      // Generate a temporary refresh token for session creation
      const tempRefreshToken = crypto.randomUUID();
      
      // Create session record with temporary token
      const session = new Session({
        user: user._id,
        refreshToken: tempRefreshToken, // Temporary token, will be replaced
        expiresAt: expiresAt,
        deviceInfo: {
          userAgent: sessionData.userAgent,
          deviceId: sessionData.deviceId
        },
        ipAddress: sessionData.ipAddress,
        location: sessionData.location,
        loginMethod: sessionData.loginMethod || 'Password'
      });

      await session.save();

      const tokenPayload = {
        userId: user._id,
        role: user.role,
        permissions: user.permissions,
        sessionId: session._id,
        tokenVersion: session.accessTokenVersion
      };

      const accessToken = this.generateAccessToken(tokenPayload);
      const refreshToken = this.generateRefreshToken(tokenPayload);

      // Update session with the actual refresh token
      session.refreshToken = refreshToken;
      await session.save();

      // Calculate appropriate expiresIn value based on role
      const expiresIn = user.role === 'Principal' ? 
        this.getTokenExpiry('100y') : 
        this.getTokenExpiry(this.accessTokenExpiry);

      return {
        accessToken,
        refreshToken,
        sessionId: session._id,
        expiresIn: expiresIn
      };
    } catch (error) {
      throw new Error(`Failed to generate token pair: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {String} refreshToken - Valid refresh token
   * @param {Object} requestInfo - Request information for audit
   * @returns {Object} - New access token
   */
  async refreshAccessToken(refreshToken, requestInfo) {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Find session
      const session = await Session.findOne({
        _id: decoded.sessionId,
        refreshToken: refreshToken,
        isActive: true,
        isRevoked: false
      }).populate('user');

      if (!session || session.isExpired) {
        throw new Error('Invalid or expired session');
      }

      // Check if user still exists and is active
      if (!session.user || session.user.accountStatus !== 'Active') {
        await session.revoke('AccountDeactivated');
        throw new Error('User account is not active');
      }

      // Update session activity
      await session.updateActivity();

      // Generate new access token with incremented version
      session.accessTokenVersion += 1;
      await session.save();

      const tokenPayload = {
        userId: session.user._id,
        instituteId: session.user.institute,
        role: session.user.role,
        permissions: session.user.permissions,
        sessionId: session._id,
        tokenVersion: session.accessTokenVersion
      };

      const newAccessToken = this.generateAccessToken(tokenPayload);

      // Calculate appropriate expiresIn value based on role
      const expiresIn = session.user.role === 'Principal' ? 
        this.getTokenExpiry('100y') : 
        this.getTokenExpiry(this.accessTokenExpiry);

      return {
        accessToken: newAccessToken,
        expiresIn: expiresIn
      };
    } catch (error) {
      // Log failed refresh attempt
      if (requestInfo) {
      }

      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revoke session and tokens
   * @param {String} sessionId - Session ID to revoke
   * @param {String} reason - Reason for revocation
   * @returns {Boolean} - Success status
   */
  async revokeSession(sessionId, reason = 'UserLogout') {
    try {
      const session = await Session.findById(sessionId);
      if (session) {
        await session.revoke(reason);
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to revoke session: ${error.message}`);
    }
  }

  /**
   * Revoke all user sessions
   * @param {String} userId - User ID
   * @param {String} reason - Reason for revocation
   * @returns {Number} - Number of sessions revoked
   */
  async revokeAllUserSessions(userId, reason = 'SecurityBreach') {
    try {
      const result = await Session.revokeAllUserSessions(userId, reason);
      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Failed to revoke user sessions: ${error.message}`);
    }
  }

  /**
   * Validate session and token version
   * @param {Object} tokenPayload - Decoded token payload
   * @returns {Object} - Session validation result
   */
  async validateSession(tokenPayload) {
    try {
      const session = await Session.findById(tokenPayload.sessionId).populate('user');

      if (!session || !session.isValid) {
        return { valid: false, reason: 'Invalid session' };
      }

      // Check token version
      if (tokenPayload.tokenVersion !== session.accessTokenVersion) {
        return { valid: false, reason: 'Token version mismatch' };
      }

      // Check user status
      if (!session.user || session.user.accountStatus !== 'Active') {
        return { valid: false, reason: 'User account inactive' };
      }

      return { valid: true, session, user: session.user };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Get active sessions for user
   * @param {String} userId - User ID
   * @returns {Array} - Array of active sessions
   */
  async getUserSessions(userId) {
    try {
      return await Session.getActiveSessions(userId);
    } catch (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  /**
   * Convert expiry string to seconds
   * @param {String} expiry - Expiry string (e.g., '15m', '7d', '100y')
   * @returns {Number} - Expiry in seconds
   */
  getTokenExpiry(expiry) {
    const timeUnits = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      y: 31536000 // 365 days in seconds
    };

    const match = expiry.match(/^(\d+)([smhdy])$/);
    if (match) {
      const [, amount, unit] = match;
      return parseInt(amount) * timeUnits[unit];
    }

    return 900; // Default 15 minutes
  }

  /**
   * Extract token from Authorization header
   * @param {String} authHeader - Authorization header value
   * @returns {String} - Extracted token
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }
    return authHeader.substring(7);
  }

  /**
   * Generate secure random token for password reset
   * @returns {String} - Random token
   */
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token for storage
   * @param {String} token - Token to hash
   * @returns {String} - Hashed token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = new JWTService();
