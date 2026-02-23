import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  X,
  Info,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../ui/button';
import { userAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useDashboard } from '../../contexts/DashboardContext';

/**
 * Student Import Component
 * Allows IT and Institute Admin to import student data from Excel files
 */
const StudentImport = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const { addNewEnquiry } = useDashboard();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [importResults, setImportResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Upload, 2: Map Fields, 3: Preview, 4: Results

  // Expected student fields for import
  const STUDENT_FIELDS = {
    // Required fields
    'firstName': { label: 'First Name *', required: true, example: 'John' },
    'fatherName': { label: 'Father Name * (will be used as Last Name)', required: true, example: 'Robert Doe' },
    'phoneNumber': { label: 'Phone Number *', required: true, example: '+923001234567' },
    'gender': { label: 'Gender *', required: true, example: 'Male or Female' },
    'program': { label: 'Program *', required: true, example: 'ICS-PHY, ICS-STAT, ICOM, Pre Engineering, Pre Medical, FA, FA IT, General Science' },
    'enquiryLevel': { label: 'Enquiry Level *', required: true, example: '1 to 5' },
    
    // Optional fields
    'email': { label: 'Email', required: false, example: 'john.doe@email.com' },
    'cnic': { label: 'CNIC', required: false, example: '12345-1234567-1' },
    'secondaryPhone': { label: 'Secondary Phone', required: false, example: '+923009876543' },
    'dateOfBirth': { label: 'Date of Birth', required: false, example: '2005-01-15' },
    'address': { label: 'Address', required: false, example: 'House 123, Street 456' },
    'previousSchool': { label: 'Previous School', required: false, example: 'ABC High School' },
    'matricMarks': { label: 'Matric Obtained Marks', required: false, example: '850' },
    'matricTotal': { label: 'Matric Total Marks', required: false, example: '1100' },
    
    // For Level 5 students (campus will be auto-assigned based on gender)
    'admissionGrade': { label: 'Grade (Level 5)', required: false, example: '11th or 12th' },
    'className': { label: 'Class Name (Level 5)', required: false, example: 'A-1, B-2, etc.' }
  };

  // Generate sample Excel template
  const downloadTemplate = () => {
    const headers = Object.keys(STUDENT_FIELDS);
    
    // Create simple worksheet data - just headers and one empty row for data
    // Create dummy record as example (will be ignored during import)
    const dummyRecord = [
      'Ahmad Ali',        // firstName
      'Muhammad Khan',    // fatherName
      'Fatima Bibi',     // motherName
      '42101-1234567-8', // cnic
      '2005-03-15',      // dateOfBirth
      'Male',            // gender
      '03001234567',     // phoneNumber
      'House 123, Street 45, Karachi', // address
      'ICS-PHY',         // program
      '2',               // enquiryLevel
      'Interested in engineering', // remarks
      'Example record - delete this row and add your data below'  // notes
    ];

    const worksheetData = [
      headers,     // Field names as headers
      dummyRecord, // Example record showing format
      []          // Empty row for user to start adding data
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    
    // Add field information as comments or in a separate sheet
    const infoData = [
      ['Field Name', 'Description', 'Required', 'Example'],
      ...Object.entries(STUDENT_FIELDS).map(([key, field]) => [
        key,
        field.label,
        field.required ? 'Yes' : 'No',
        field.example
      ])
    ];
    
    const infoWorksheet = XLSX.utils.aoa_to_sheet(infoData);
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 20 }));
    worksheet['!cols'] = colWidths;
    infoWorksheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 30 }];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student_Data');
    XLSX.utils.book_append_sheet(workbook, infoWorksheet, 'Field_Information');
    XLSX.writeFile(workbook, 'Student_Import_Template.xlsx');
    
    toast.success('Template downloaded successfully!');
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setSelectedFile(file);
    parseExcelFile(file);
  };

  // Parse Excel file
  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          toast.error('Excel file must have at least a header row and one data row');
          return;
        }

        // Extract headers from first row and data starting from row 2
        const headers = jsonData[0];
        const allRows = jsonData.slice(1).filter(row => {
          // Filter out empty rows and dummy records
          const hasData = row.some(cell => cell !== undefined && cell !== '' && cell !== null);
          if (!hasData) return false;
          
          // Skip dummy record (contains "Example record" in the last column)
          const lastCell = row[row.length - 1];
          if (lastCell && lastCell.toString().includes('Example record')) {
            return false;
          }
          
          return true;
        });
        
        if (allRows.length === 0) {
          toast.error('No data rows found. Please add student data starting from row 2.');
          return;
        }

        setPreviewData(allRows.slice(0, 5)); // Show first 5 rows for preview
        
        // Auto-map fields based on header names
        const autoMapping = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header?.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
          Object.keys(STUDENT_FIELDS).forEach(fieldKey => {
            const normalizedField = fieldKey.toLowerCase();
            if (normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader)) {
              autoMapping[index] = fieldKey;
            }
          });
        });

        setFieldMapping(autoMapping);
        setCurrentStep(2);
        
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Error reading Excel file. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Update field mapping
  const updateFieldMapping = (columnIndex, fieldKey) => {
    setFieldMapping(prev => ({
      ...prev,
      [columnIndex]: fieldKey
    }));
  };

  // Validate and prepare data for import
  const prepareImportData = () => {
    if (!selectedFile || previewData.length === 0) return;

    // Read full file data
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // Simple parsing - headers in row 1, data starts from row 2
        const allRows = jsonData.slice(1).filter(row => {
          // Filter out empty rows and dummy records
          const hasData = row.some(cell => cell !== undefined && cell !== '' && cell !== null);
          if (!hasData) return false;
          
          // Skip dummy record (contains "Example record" in the last column)
          const lastCell = row[row.length - 1];
          if (lastCell && lastCell.toString().includes('Example record')) {
            return false;
          }
          
          return true;
        });
        
        const mappedData = allRows.map((row, rowIndex) => {
          const studentData = { role: 'Student' };
          
          // Map columns to fields
          Object.entries(fieldMapping).forEach(([colIndex, fieldKey]) => {
            const value = row[colIndex];
            if (value !== undefined && value !== '') {
              // Handle nested fields
              if (fieldKey === 'admissionGrade') {
                studentData.admissionInfo = studentData.admissionInfo || {};
                studentData.admissionInfo.grade = value.toString();
              } else if (fieldKey === 'className') {
                studentData.admissionInfo = studentData.admissionInfo || {};
                studentData.admissionInfo.className = value.toString();
              } else if (fieldKey === 'firstName') {
                // If the firstName field contains a full name, split it
                const nameValue = value.toString().trim();
                const nameParts = nameValue.split(' ');
                if (nameParts.length > 1) {
                  // If multiple words, use first word as firstName
                  studentData.firstName = nameParts[0];
                } else {
                  // Single word, use as is
                  studentData.firstName = nameValue;
                }
              } else if (fieldKey === 'fatherName') {
                // For students, father name serves as both father name and last name
                studentData.fatherName = value.toString();
                studentData.lastName = value.toString(); // Father name becomes last name
              } else if (fieldKey === 'enquiryLevel') {
                // Map enquiryLevel to prospectusStage (backend field name)
                const level = parseInt(value);
                if (level >= 1 && level <= 5) {
                  studentData.prospectusStage = level;
                } else {
                  studentData.prospectusStage = 1; // Default to level 1
                }
              } else if (fieldKey === 'program') {
                // Clean and standardize program names
                const program = value.toString().trim();
                const programMappings = {
                  'ICS PHY': 'ICS-PHY',
                  'ICS STAT': 'ICS-STAT',
                  'ICS-PHY': 'ICS-PHY',
                  'ICS-STAT': 'ICS-STAT',
                  'ICOM': 'ICOM',
                  'Pre Engineering': 'Pre Engineering',
                  'Pre Medical': 'Pre Medical',
                  'F.A': 'FA',
                  'FA': 'FA',
                  'FA IT': 'FA IT',
                  'General Science': 'General Science'
                };
                studentData.program = programMappings[program] || program;
              } else if (fieldKey === 'gender') {
                // Standardize gender values
                const gender = value.toString().trim().toLowerCase();
                studentData.gender = (gender === 'male' || gender === 'm') ? 'Male' : 
                                    (gender === 'female' || gender === 'f') ? 'Female' : 
                                    value.toString();
              } else if (fieldKey === 'dateOfBirth') {
                // Handle date of birth
                studentData.dateOfBirth = value.toString();
              } else if (fieldKey === 'matricMarks' || fieldKey === 'matricTotal') {
                // Handle numeric fields
                const numValue = parseInt(value);
                if (!isNaN(numValue)) {
                  studentData[fieldKey] = numValue;
                }
              } else {
                studentData[fieldKey] = value.toString();
              }
            }
          });

          // Validate required fields
          const errors = [];
          Object.entries(STUDENT_FIELDS).forEach(([key, field]) => {
            if (field.required) {
              let hasValue = false;
              if (key === 'firstName') {
                hasValue = studentData.firstName;
              } else if (key === 'fatherName') {
                hasValue = studentData.fatherName;
              } else if (key === 'enquiryLevel') {
                hasValue = studentData.prospectusStage; // Check prospectusStage instead
              } else {
                hasValue = studentData[key];
              }
              if (!hasValue) {
                errors.push(`${field.label} is required`);
              }
            }
          });

          return {
            rowNumber: rowIndex + 2, // +2 because we start from row 1 and skip header
            data: studentData,
            errors
          };
        });

        setPreviewData(mappedData.slice(0, 10)); // Show first 10 for preview
        setCurrentStep(3);
        
      } catch (error) {
        console.error('Error preparing import data:', error);
        toast.error('Error processing data for import');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Perform the actual import
  const performImport = async () => {
    setIsProcessing(true);
    
    try {
      // Read full file data again for final import
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          const rows = jsonData.slice(1).filter(row => {
            // Filter out empty rows and dummy records
            const hasData = row.some(cell => cell !== undefined && cell !== '');
            if (!hasData) return false;
            
            // Skip dummy record (contains "Example record" in the last column)
            const lastCell = row[row.length - 1];
            if (lastCell && lastCell.toString().includes('Example record')) {
              return false;
            }
            
            return true;
          });
          
          const results = {
            total: rows.length,
            successful: 0,
            failed: 0,
            errors: []
          };

          // Process each row
          for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const studentData = { role: 'Student' };
            
            try {
              // Map columns to fields
              Object.entries(fieldMapping).forEach(([colIndex, fieldKey]) => {
                const value = row[colIndex];
                if (value !== undefined && value !== '') {
                  if (fieldKey === 'admissionGrade') {
                    studentData.admissionInfo = studentData.admissionInfo || {};
                    studentData.admissionInfo.grade = value.toString();
                  } else if (fieldKey === 'className') {
                    studentData.admissionInfo = studentData.admissionInfo || {};
                    studentData.admissionInfo.className = value.toString();
                  } else if (fieldKey === 'firstName') {
                    // Handle first name - split if it contains full name
                    const nameValue = value.toString().trim();
                    const nameParts = nameValue.split(' ');
                    if (nameParts.length > 1) {
                      // If multiple words, use first word as firstName
                      studentData.firstName = nameParts[0];
                    } else {
                      // Single word, use as is
                      studentData.firstName = nameValue;
                    }
                  } else if (fieldKey === 'fatherName') {
                    // For students, father name serves as both father name and last name
                    studentData.fatherName = value.toString();
                    studentData.lastName = value.toString(); // Father name becomes last name
                  } else if (fieldKey === 'enquiryLevel') {
                    // Map enquiryLevel to prospectusStage (backend field name)
                    const level = parseInt(value);
                    if (level >= 1 && level <= 5) {
                      studentData.prospectusStage = level;
                    } else {
                      studentData.prospectusStage = 1; // Default to level 1
                    }
                  } else if (fieldKey === 'program') {
                    // Clean and standardize program names
                    const program = value.toString().trim();
                    const programMappings = {
                      'ICS PHY': 'ICS-PHY',
                      'ICS STAT': 'ICS-STAT',
                      'ICS-PHY': 'ICS-PHY',
                      'ICS-STAT': 'ICS-STAT',
                      'ICOM': 'ICOM',
                      'Pre Engineering': 'Pre Engineering',
                      'Pre Medical': 'Pre Medical',
                      'F.A': 'FA',
                      'FA': 'FA',
                      'FA IT': 'FA IT',
                      'General Science': 'General Science'
                    };
                    studentData.program = programMappings[program] || program;
                  } else if (fieldKey === 'gender') {
                    // Standardize gender values
                    const gender = value.toString().trim().toLowerCase();
                    studentData.gender = (gender === 'male' || gender === 'm') ? 'Male' : 
                                        (gender === 'female' || gender === 'f') ? 'Female' : 
                                        value.toString();
                  } else if (fieldKey === 'dateOfBirth') {
                    // Handle date of birth
                    studentData.dateOfBirth = value.toString();
                  } else if (fieldKey === 'matricMarks' || fieldKey === 'matricTotal') {
                    // Handle numeric fields
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      studentData[fieldKey] = numValue;
                    }
                  } else {
                    studentData[fieldKey] = value.toString();
                  }
                }
              });

              // Attempt to create the user - format data to match User model schema
              const formattedUser = {
                fullName: {
                  firstName: studentData.firstName || '',
                  lastName: studentData.lastName || studentData.fatherName || ''
                },
                fatherName: studentData.fatherName || '',
                motherName: studentData.motherName || '',
                cnic: studentData.cnic || '',
                dob: studentData.dateOfBirth || '',
                gender: studentData.gender || '',
                phoneNumber: studentData.phoneNumber || '',
                address: studentData.address || '',
                program: studentData.program || '',
                prospectusStage: studentData.prospectusStage || 1,
                remarks: studentData.remarks || '',
                status: 1, // Default status for new students
                role: 'Student',
                userName: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Generate unique userName
              };

              const createdUser = await userAPI.createUser(formattedUser);
              results.successful++;

              // Notify dashboard of new enquiry
              if (createdUser?.data?.user) {
                addNewEnquiry(createdUser.data.user);
              }
              
            } catch (error) {
              results.failed++;
              results.errors.push({
                row: rowIndex + 2,
                email: studentData.email || 'Unknown',
                error: error.message || 'Unknown error'
              });
            }
          }

          setImportResults(results);
          setCurrentStep(4);
          
          if (results.successful > 0) {
            toast.success(`Successfully imported ${results.successful} students!`);
            onSuccess?.();
          }
          
        } catch (error) {
          console.error('Error during import:', error);
          toast.error('Error during import process');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
      
    } catch (error) {
      console.error('Error starting import:', error);
      toast.error('Error starting import process');
      setIsProcessing(false);
    }
  };

  // Reset component state
  const resetImport = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setFieldMapping({});
    setImportResults(null);
    setIsProcessing(false);
    setCurrentStep(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">Import Students</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 -pb-40">
          {/* Steps Indicator */}
          <div className="flex items-center justify-center mb-0">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-primary' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Upload File */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 1: Upload Excel File
                </h3>
                <p className="text-gray-600">
                  Download the template first to see the expected format, then upload your Excel file
                </p>
              </div>

              {/* Download Template Button */}
              <div className="flex justify-center">
                <Button
                  onClick={downloadTemplate}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              {/* Field Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Required Fields:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                      {Object.entries(STUDENT_FIELDS)
                        .filter(([, field]) => field.required)
                        .map(([key, field]) => (
                          <div key={key}>• {field.label}</div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">Important Instructions:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Download the template - it has clean headers and an empty row for data</li>
                      <li>• Add your student data starting from row 2 (after the headers)</li>
                      <li>• Check the "Field_Information" sheet for field descriptions and examples</li>
                      <li>• For students, the "fatherName" field should contain the father's name</li>
                      <li>• Email and CNIC are optional fields</li>
                      <li>• Campus will be automatically assigned based on gender</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <label className="cursor-pointer">
                    <span className="text-primary hover:text-primary-dark font-medium">
                      Click to upload Excel file
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-gray-500 text-sm">or drag and drop</p>
                  <p className="text-gray-400 text-xs">Excel files only (.xlsx, .xls)</p>
                </div>
              </div>

              {selectedFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      File selected: {selectedFile.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Map Fields */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 2: Map Excel Columns to Student Fields
                </h3>
                <p className="text-gray-600">
                  Map each column from your Excel file to the corresponding student field
                </p>
              </div>

              {previewData.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Preview Data (First 5 rows):</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            {previewData[0]?.map((_, colIndex) => (
                              <th key={colIndex} className="px-3 py-2 bg-gray-100 text-left">
                                Column {colIndex + 1}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 3).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-t">
                              {row.map((cell, colIndex) => (
                                <td key={colIndex} className="px-3 py-2 border-r">
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Field Mapping:</h4>
                    {previewData[0]?.map((_, colIndex) => (
                      <div key={colIndex} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-24 text-sm font-medium">
                          Column {colIndex + 1}
                        </div>
                        <div className="flex-1">
                          <select
                            value={fieldMapping[colIndex] || ''}
                            onChange={(e) => updateFieldMapping(colIndex, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="">Skip this column</option>
                            {Object.entries(STUDENT_FIELDS).map(([key, field]) => (
                              <option key={key} value={key}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-48 text-sm text-gray-600">
                          Sample: {previewData[0]?.[colIndex] || 'No data'}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <Button
                      onClick={() => setCurrentStep(1)}
                      variant="outline"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={prepareImportData}
                      className="bg-primary hover:bg-primary-dark text-white"
                      disabled={Object.keys(fieldMapping).length === 0}
                    >
                      Continue to Preview
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview Import */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 3: Preview Import Data
                </h3>
                <p className="text-gray-600">
                  Review the mapped data before importing (showing first 10 records)
                </p>
              </div>

              {previewData.length > 0 && (
                <div className="space-y-4">
                  {previewData.map((item, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${
                      item.errors?.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          Row {item.rowNumber} - {item.data.fullName?.firstName} {item.data.fullName?.lastName}
                        </h4>
                        {item.errors?.length > 0 ? (
                          <div className="flex items-center gap-1 text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {item.errors.length} error(s)
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Valid
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(item.data).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {JSON.stringify(value)}
                          </div>
                        ))}
                      </div>

                      {item.errors?.length > 0 && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                          <strong>Errors:</strong>
                          <ul className="list-disc list-inside">
                            {item.errors.map((error, i) => (
                              <li key={i} className="text-red-700">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-between">
                    <Button
                      onClick={() => setCurrentStep(2)}
                      variant="outline"
                    >
                      Back to Mapping
                    </Button>
                    <Button
                      onClick={performImport}
                      className="bg-primary hover:bg-primary-dark text-white"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Importing...' : 'Start Import'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Import Results */}
          {currentStep === 4 && importResults && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 4: Import Results
                </h3>
                <p className="text-gray-600">
                  Import process completed
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
                  <div className="text-blue-800">Total Records</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{importResults.successful}</div>
                  <div className="text-green-800">Successful</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                  <div className="text-red-800">Failed</div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Import Errors:
                  </h4>
                  <div className="space-y-2 text-sm">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="text-red-800">
                        <strong>Row {error.row} ({error.email}):</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button
                  onClick={resetImport}
                  variant="outline"
                >
                  Import More Students
                </Button>
                <Button
                  onClick={onClose}
                  className="bg-primary hover:bg-primary-dark text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentImport;
