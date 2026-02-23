const NodeCache = require('node-cache');

// Create cache instance with 5 minute TTL by default
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

class CacheService {
  /**
   * Generate cache key based on parameters
   */
  static generateKey(prefix, params) {
    const sortedParams = Object.keys(params || {})
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get data from cache
   */
  static get(key) {
    return cache.get(key);
  }

  /**
   * Set data in cache with optional TTL
   */
  static set(key, data, ttl = 300) {
    return cache.set(key, data, ttl);
  }

  /**
   * Delete specific key from cache
   */
  static del(key) {
    return cache.del(key);
  }

  /**
   * Clear all cache
   */
  static flushAll() {
    return cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    return cache.getStats();
  }

  /**
   * Clear attendance-related cache when attendance is marked
   */
  static clearAttendanceCache() {
    const keys = cache.keys();
    const attendanceKeys = keys.filter(key => 
      key.startsWith('attendance:') || 
      key.startsWith('stats:') || 
      key.startsWith('overview:')
    );
    
    attendanceKeys.forEach(key => cache.del(key));
    console.log(`Cleared ${attendanceKeys.length} attendance cache entries`);
  }

  /**
   * Get or set with async function
   */
  static async getOrSet(key, asyncFn, ttl = 300) {
    let data = this.get(key);
    
    if (data === undefined) {
      console.log(`Cache miss for key: ${key}`);
      data = await asyncFn();
      this.set(key, data, ttl);
    } else {
      console.log(`Cache hit for key: ${key}`);
    }
    
    return data;
  }
}

module.exports = CacheService;
