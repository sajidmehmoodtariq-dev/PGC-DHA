/**
 * Level History Helper Functions
 * 
 * These functions help with managing level history for students
 */

/**
 * Add a level history entry to a student
 * @param {Object} student - The student document
 * @param {Number} newLevel - The new level (1-5)
 * @param {String} updatedByUserId - ID of user making the change
 * @param {String} updatedByName - Name of user making the change
 * @param {Date} achievedOn - When the level was achieved (defaults to now)
 */
function addLevelHistoryEntry(student, newLevel, updatedByUserId = null, updatedByName = 'System', achievedOn = new Date()) {
  // Initialize levelHistory if it doesn't exist
  if (!student.levelHistory) {
    student.levelHistory = [];
  }

  // Check if this level was already achieved
  const existingEntry = student.levelHistory.find(entry => entry.level === newLevel);
  if (existingEntry) {
    console.log(`Student ${student.fullName?.firstName} ${student.fullName?.lastName} already has level ${newLevel} in history`);
    return false;
  }

  // Add the new level entry
  student.levelHistory.push({
    level: newLevel,
    achievedOn: achievedOn,
    updatedBy: updatedByUserId,
    updatedByName: updatedByName
  });

  // Sort level history by achievedOn date
  student.levelHistory.sort((a, b) => new Date(a.achievedOn) - new Date(b.achievedOn));

  console.log(`Added level ${newLevel} to history for student ${student.fullName?.firstName} ${student.fullName?.lastName}`);
  return true;
}

/**
 * Get the date when a student achieved a specific level
 * @param {Object} student - The student document
 * @param {Number} level - The level to check (1-5)
 * @returns {Date|null} - The date the level was achieved, or null if not achieved
 */
function getLevelAchievedDate(student, level) {
  if (!student.levelHistory || student.levelHistory.length === 0) {
    return null;
  }

  const entry = student.levelHistory.find(entry => entry.level === level);
  return entry ? entry.achievedOn : null;
}

/**
 * Get all levels achieved on a specific date
 * @param {Object} student - The student document
 * @param {Date} date - The date to check
 * @returns {Array} - Array of levels achieved on that date
 */
function getLevelsAchievedOnDate(student, date) {
  if (!student.levelHistory || student.levelHistory.length === 0) {
    return [];
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return student.levelHistory
    .filter(entry => {
      const entryDate = new Date(entry.achievedOn);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === targetDate.getTime();
    })
    .map(entry => entry.level);
}

/**
 * Get level progression timeline for a student
 * @param {Object} student - The student document
 * @returns {Array} - Array of level progression events
 */
function getLevelTimeline(student) {
  if (!student.levelHistory || student.levelHistory.length === 0) {
    return [];
  }

  return student.levelHistory
    .sort((a, b) => new Date(a.achievedOn) - new Date(b.achievedOn))
    .map(entry => ({
      level: entry.level,
      date: entry.achievedOn,
      updatedBy: entry.updatedByName || 'System'
    }));
}

module.exports = {
  addLevelHistoryEntry,
  getLevelAchievedDate,
  getLevelsAchievedOnDate,
  getLevelTimeline
};
