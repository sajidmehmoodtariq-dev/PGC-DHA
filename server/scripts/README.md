# Test Data Seeding Scripts

This directory contains scripts to seed and manage test data for the PGC-DHA attendance system.

## Available Scripts

### 1. Seed Test Data
```bash
npm run seed:test-data
```
Creates comprehensive test data including:
- 4 Test Teachers
- 1 Test Coordinator
- 1 Test Principal  
- 20 Test Students
- 3 Test Classes
- 88+ Timetable Entries

### 2. Clean Test Data
```bash
npm run clean:test-data
```
Removes all test data (users with usernames starting with `test_` and emails ending with `@test.com`)

## Test User Credentials

All test users have the same password: `password123`

### Teachers:
- `test_teacher_ahmad` - Ahmad Khan
- `test_teacher_fatima` - Fatima Ali  
- `test_teacher_hassan` - Hassan Ahmed
- `test_teacher_sara` - Sara Sheikh

### Coordinator:
- `test_coordinator` - Muhammad Coordinator

### Principal:
- `test_principal` - Dr. Muhammad Principal

### Students:
- `test_student_001` to `test_student_020` - Various test students

## Testing Workflow

### 1. Teacher Attendance Testing
1. Login as coordinator: `test_coordinator`
2. Navigate to `/coordinator/teacher-attendance`
3. Mark teacher attendance for today's date
4. Add coordinator remarks for different teachers

### 2. Student Attendance Testing  
1. Login as any teacher (e.g., `test_teacher_ahmad`)
2. Navigate to `/attendance`
3. Select a test class and mark student attendance
4. Test different attendance statuses (Present, Absent, Late)

### 3. Principal Dashboard Testing
1. Login as principal: `test_principal`
2. Navigate to `/principal/attendance-reports`
3. View attendance statistics and reports
4. Test monthly and daily report views

## Test Data Structure

### Classes Created:
- Test Class 11th Pre-Medical Boys (Floor 1)
- Test Class 11th Pre-Engineering Boys (Floor 2)  
- Test Class 12th ICS-PHY Girls (Floor 3)

### Subjects Included:
- **Pre Medical**: Biology, Chemistry, Physics, English, Urdu, Islamic Studies
- **Pre Engineering**: Mathematics, Physics, Chemistry, English, Urdu, Computer Science
- **ICS-PHY**: Computer Science, Mathematics, Physics, English, Urdu, Statistics

### Timetable:
- Monday to Friday schedule
- 8 time slots per day (8:00 AM to 2:30 PM)
- Random subject assignments with breaks
- Mix of Theory and Practical lectures

## Notes

- Test data is automatically cleaned before seeding to avoid duplicates
- All test users have status = 1 (Active)
- Students are randomly assigned to different programs and campuses
- Coordinator is assigned to 11th grade Boys campus
- Test data includes proper relationships between users, classes, and timetables

## Cleanup

Always run the clean script before seeding fresh data:
```bash
npm run clean:test-data && npm run seed:test-data
```
