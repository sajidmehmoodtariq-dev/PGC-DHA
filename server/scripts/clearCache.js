const CacheService = require('../services/cacheService');

async function clearCacheAndCheck() {
  try {
    console.log('=== CLEARING ALL CACHE ===');
    
    // Clear all cache
    CacheService.flushAll();
    console.log('✅ All cache cleared');

    // Show cache stats
    const stats = CacheService.getStats();
    console.log('Cache Stats:', stats);

    console.log('\n=== CACHE CLEARED SUCCESSFULLY ===');
    console.log('Please refresh your browser pages to see updated counts.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

clearCacheAndCheck();
