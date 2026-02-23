const CacheService = require('./cacheService');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Class = require('../models/Class');

class AttendanceService {
  /**
   * Get optimized attendance overview with caching and progressive loading
   */
  static async getOptimizedOverview(params) {
    const { startDate, endDate, campus, floor, program, classId, useCache = true } = params;
    
    // Generate cache key
    const cacheKey = CacheService.generateKey('attendance:overview', {
      startDate, endDate, campus, floor, program, classId
    });

    if (useCache) {
      const cached = CacheService.get(cacheKey);
      if (cached) {
        console.log('Returning cached attendance overview');
        return cached;
      }
    }

    try {
      console.log('Computing fresh attendance overview...');
      
      // Step 1: Get basic statistics quickly
      const basicStats = await this.getBasicStats(params);
      
      // Step 2: Get campus breakdown
      const campusBreakdown = await this.getCampusBreakdown(params);
      
      // Step 3: Get floor and program breakdowns (only if needed)
      const floorBreakdown = await this.getFloorBreakdown(params);
      const programBreakdown = await this.getProgramBreakdown(params);
      
      // Step 4: Get class breakdown (lazy load if specific filters applied)
      const classBreakdown = await this.getClassBreakdown(params);

      const result = {
        ...basicStats,
        campusBreakdown,
        floorBreakdown,
        programBreakdown,
        classBreakdown,
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'All time'
        },
        timestamp: new Date().toISOString()
      };

      // Cache for 5 minutes for specific queries, 15 minutes for overview
      const ttl = (campus || floor || program || classId) ? 300 : 900;
      if (useCache) {
        CacheService.set(cacheKey, result, ttl);
      }

      return result;
    } catch (error) {
      console.error('Error in getOptimizedOverview:', error);
      throw error;
    }
  }

  /**
   * Get basic statistics with optimized aggregation
   */
  static async getBasicStats(params) {
    const { startDate, endDate } = params;
    
    const today = new Date();
    const queryStartDate = startDate ? new Date(startDate + 'T00:00:00.000Z') : new Date('2020-01-01');
    const queryEndDate = endDate ? new Date(endDate + 'T23:59:59.999Z') : today;

    // Use efficient aggregation for basic stats
    const pipeline = [
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] }
          },
          lateCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] }
          },
          uniqueStudents: { $addToSet: '$studentId' }
        }
      },
      {
        $project: {
          totalRecords: 1,
          presentCount: 1,
          absentCount: 1,
          lateCount: 1,
          totalStudents: { $size: '$uniqueStudents' },
          attendancePercentage: {
            $cond: [
              { $eq: ['$totalRecords', 0] },
              0,
              { $multiply: [{ $divide: ['$presentCount', '$totalRecords'] }, 100] }
            ]
          }
        }
      }
    ];

    const [result] = await Attendance.aggregate(pipeline);
    
    return {
      totalStudents: result?.totalStudents || 0,
      presentStudents: result?.presentCount || 0,
      absentStudents: result?.absentCount || 0,
      lateStudents: result?.lateCount || 0,
      totalRecords: result?.totalRecords || 0,
      attendancePercentage: Math.round(result?.attendancePercentage || 0)
    };
  }

  /**
   * Get campus breakdown with optimized queries
   */
  static async getCampusBreakdown(params) {
    const { startDate, endDate } = params;
    
    const today = new Date();
    const queryStartDate = startDate ? new Date(startDate + 'T00:00:00.000Z') : new Date('2020-01-01');
    const queryEndDate = endDate ? new Date(endDate + 'T23:59:59.999Z') : today;

    const pipeline = [
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class',
          pipeline: [{ $project: { campus: 1 } }] // Only get campus field
        }
      },
      { $unwind: '$class' },
      {
        $group: {
          _id: '$class.campus',
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] }
          },
          uniqueStudents: { $addToSet: '$studentId' }
        }
      },
      {
        $project: {
          campus: '$_id',
          total: { $size: '$uniqueStudents' },
          present: '$presentCount',
          absent: '$absentCount',
          totalRecords: '$totalRecords',
          percentage: {
            $cond: [
              { $eq: ['$totalRecords', 0] },
              0,
              { $multiply: [{ $divide: ['$presentCount', '$totalRecords'] }, 100] }
            ]
          }
        }
      }
    ];

    const results = await Attendance.aggregate(pipeline);
    
    const breakdown = {};
    ['Boys', 'Girls'].forEach(campus => {
      const data = results.find(r => r.campus === campus);
      breakdown[campus.toLowerCase()] = {
        total: data?.total || 0,
        present: data?.present || 0,
        absent: data?.absent || 0,
        totalRecords: data?.totalRecords || 0,
        percentage: Math.round(data?.percentage || 0)
      };
    });

    return breakdown;
  }

  /**
   * Get floor breakdown with optimized queries
   */
  static async getFloorBreakdown(params) {
    const { startDate, endDate } = params;
    
    const today = new Date();
    const queryStartDate = startDate ? new Date(startDate + 'T00:00:00.000Z') : new Date('2020-01-01');
    const queryEndDate = endDate ? new Date(endDate + 'T23:59:59.999Z') : today;

    const pipeline = [
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class',
          pipeline: [{ $project: { campus: 1, grade: 1 } }]
        }
      },
      { $unwind: '$class' },
      {
        $group: {
          _id: {
            campus: '$class.campus',
            floor: {
              $cond: [{ $eq: ['$class.grade', '11th'] }, '1st', '2nd']
            }
          },
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          uniqueStudents: { $addToSet: '$studentId' }
        }
      }
    ];

    const results = await Attendance.aggregate(pipeline);
    
    const breakdown = {};
    ['Boys', 'Girls'].forEach(campus => {
      breakdown[campus.toLowerCase()] = {};
      ['1st', '2nd'].forEach(floor => {
        const data = results.find(r => 
          r._id.campus === campus && r._id.floor === floor
        );
        breakdown[campus.toLowerCase()][floor] = {
          total: data ? data.uniqueStudents.length : 0,
          present: data?.presentCount || 0,
          absent: data ? (data.uniqueStudents.length - data.presentCount) : 0,
          percentage: data ? Math.round((data.presentCount / data.totalRecords) * 100) : 0,
          grade: floor === '1st' ? '11th' : '12th'
        };
      });
    });

    return breakdown;
  }

  /**
   * Get program breakdown with optimized queries
   */
  static async getProgramBreakdown(params) {
    const { startDate, endDate } = params;
    
    const today = new Date();
    const queryStartDate = startDate ? new Date(startDate + 'T00:00:00.000Z') : new Date('2020-01-01');
    const queryEndDate = endDate ? new Date(endDate + 'T23:59:59.999Z') : today;

    const pipeline = [
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class',
          pipeline: [{ $project: { campus: 1, program: 1 } }]
        }
      },
      { $unwind: '$class' },
      {
        $group: {
          _id: {
            campus: '$class.campus',
            // Group null/empty program values under "Unknown" so UI still displays
            program: {
              $cond: [
                { $or: [
                  { $eq: ['$class.program', null] },
                  { $eq: ['$class.program', ''] }
                ] },
                'Unknown',
                '$class.program'
              ]
            }
          },
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          uniqueStudents: { $addToSet: '$studentId' }
        }
      }
    ];

    const results = await Attendance.aggregate(pipeline);

    // Preload all programs from Class collection for each campus so UI shows zeroed entries
    const [boysPrograms, girlsPrograms] = await Promise.all([
      Class.distinct('program', { campus: 'Boys' }),
      Class.distinct('program', { campus: 'Girls' })
    ]);

    const breakdown = {};
    ['Boys', 'Girls'].forEach(campus => {
      const campusKey = campus.toLowerCase();
      breakdown[campusKey] = {};

      const basePrograms = campus === 'Boys' ? boysPrograms : girlsPrograms;
      basePrograms.forEach(programName => {
        if (!programName) return;
        breakdown[campusKey][programName] = {
          total: 0,
          present: 0,
          absent: 0,
          percentage: 0
        };
      });
      // Ensure Unknown bucket exists
      breakdown[campusKey]['Unknown'] = breakdown[campusKey]['Unknown'] || {
        total: 0,
        present: 0,
        absent: 0,
        percentage: 0
      };

      const campusResults = results.filter(r => r._id.campus === campus);
      campusResults.forEach(data => {
        breakdown[campusKey][data._id.program] = {
          total: data.uniqueStudents.length,
          present: data.presentCount,
          absent: data.uniqueStudents.length - data.presentCount,
          percentage: Math.round((data.presentCount / data.totalRecords) * 100)
        };
      });
    });

    return breakdown;
  }

  /**
   * Get class breakdown with optimized queries
   */
  static async getClassBreakdown(params) {
    const { startDate, endDate, campus, floor, program } = params;
    
    const today = new Date();
    const queryStartDate = startDate ? new Date(startDate + 'T00:00:00.000Z') : new Date('2020-01-01');
    const queryEndDate = endDate ? new Date(endDate + 'T23:59:59.999Z') : today;

    // Build class filter
    let classFilter = {};
    if (campus && campus !== 'all') classFilter.campus = campus;
    if (floor && floor !== 'all') classFilter.grade = floor === '1st' ? '11th' : '12th';
    if (program && program !== 'all') classFilter.program = program;

    // Get relevant classes first
    const relevantClasses = await Class.find(classFilter).select('_id').lean();
    const classIds = relevantClasses.map(c => c._id);

    if (classIds.length === 0) {
      return {};
    }

    const pipeline = [
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate },
          classId: { $in: classIds }
        }
      },
      {
        $group: {
          _id: '$classId',
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          uniqueStudents: { $addToSet: '$studentId' }
        }
      }
    ];

    const results = await Attendance.aggregate(pipeline);
    
    const breakdown = {};
    results.forEach(data => {
      breakdown[data._id.toString()] = {
        total: data.uniqueStudents.length,
        present: data.presentCount,
        absent: data.uniqueStudents.length - data.presentCount,
        percentage: Math.round((data.presentCount / data.totalRecords) * 100)
      };
    });

    return breakdown;
  }

  /**
   * Clear cache when attendance is updated
   */
  static clearCache() {
    CacheService.clearAttendanceCache();
  }
}

module.exports = AttendanceService;
