import React, { useState } from 'react';
import { XCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import { getLevelInfo } from '../../constants/enquiryLevels';

const EnquiryLevelManager = ({ enquiry, availableLevels, onClose, onLevelUpdated }) => {
  const [selectedLevel, setSelectedLevel] = useState(enquiry?.prospectusStage || enquiry?.enquiryLevel || 1);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const { handleApiResponse } = useApiWithToast();

  const getStatusIconComponent = (levelId) => {
    switch (levelId) {
      case 5: return <CheckCircle className="h-4 w-4" />;
      case 6: return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleUpdateLevel = async () => {
    const currentLevel = enquiry.prospectusStage || enquiry.enquiryLevel || 1;

    // Check if level has changed or if it's the same level but user wants to add notes
    const levelChanged = selectedLevel !== currentLevel;

    // If level hasn't changed and no notes, just close
    if (!levelChanged && !notes.trim()) {
      onClose();
      return;
    }

    // If trying to set the same level
    if (selectedLevel === currentLevel) {
      alert(`Student is already at level ${currentLevel}`);
      return;
    }

    // If level has changed, notes are compulsory
    if (levelChanged && (!notes || !notes.trim())) {
      alert('Notes are required when changing enquiry level');
      return;
    }

    // Add confirmation for level changes, especially downgrades
    const isUpgrade = selectedLevel > currentLevel;
    const isDowngrade = selectedLevel < currentLevel;
    const changeType = isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'change';

    const confirmMessage = isDowngrade
      ? `Are you sure you want to downgrade this student from level ${currentLevel} to level ${selectedLevel}? This will remove their current progress.`
      : `Are you sure you want to ${changeType} this student from level ${currentLevel} to level ${selectedLevel}?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setUpdating(true);

    try {
      await handleApiResponse(
        async () => {
          const response = await api.put(`/students/${enquiry._id || enquiry.id}/level`, {
            level: selectedLevel,
            notes: notes.trim()
          });

          // Get the updated student data from the server response
          const updatedStudent = response.data?.data?.student || response.data?.student || response.data;

          const updatedEnquiry = {
            ...enquiry,
            ...updatedStudent,
            level: selectedLevel,
            prospectusStage: selectedLevel,
            lastUpdated: new Date().toLocaleDateString()
          };

          onLevelUpdated(updatedEnquiry);
          return response;
        },
        {
          successMessage: 'Enquiry level updated successfully',
          errorMessage: 'Failed to update enquiry level'
        }
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-start justify-center z-[9999] p-4 pt-8">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 p-6 w-full max-w-md mx-4 mt-[-360px] transform transition-all duration-200">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Update Enquiry Level
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={updating}
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student: {enquiry.fullName?.firstName} {enquiry.fullName?.lastName} {enquiry.studentName && !enquiry.fullName ? enquiry.studentName : ''}
            </label>
            <p className="text-sm text-gray-600">{enquiry.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Level
            </label>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getLevelInfo(enquiry.prospectusStage || enquiry.enquiryLevel || 1).bgColor} ${getLevelInfo(enquiry.prospectusStage || enquiry.enquiryLevel || 1).textColor}`}>
              {getStatusIconComponent(enquiry.prospectusStage || enquiry.enquiryLevel || 1)}
              {getLevelInfo(enquiry.prospectusStage || enquiry.enquiryLevel || 1).name}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              New Level
            </label>
            <div className="space-y-2">
              {availableLevels.map((level) => {
                const currentLevel = enquiry.prospectusStage || enquiry.enquiryLevel || 1;
                const isCurrent = level.id === currentLevel;

                return (
                  <label key={level.id} className={`flex items-center ${isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="level"
                      value={level.id}
                      checked={selectedLevel === level.id}
                      onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                      className="mr-3"
                      disabled={updating || isCurrent}
                    />
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${level.bgColor} ${level.textColor}`}>
                      {getStatusIconComponent(level.id)}
                      {level.name}
                      {isCurrent && <span className="text-xs">(Current)</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes {selectedLevel !== (enquiry.prospectusStage || enquiry.enquiryLevel || 1) ? '(Required)' : '(Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={selectedLevel !== (enquiry.prospectusStage || enquiry.enquiryLevel || 1) ? "Notes are required when changing level..." : "Add notes about this level change..."}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${selectedLevel !== (enquiry.prospectusStage || enquiry.enquiryLevel || 1) && !notes.trim()
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
                }`}
              rows="3"
              disabled={updating}
              required={selectedLevel !== (enquiry.prospectusStage || enquiry.enquiryLevel || 1)}
            />
            {selectedLevel !== (enquiry.prospectusStage || enquiry.enquiryLevel || 1) && !notes.trim() && (
              <p className="text-red-500 text-sm mt-1">Notes are required when changing enquiry level</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateLevel}
            disabled={updating || (selectedLevel !== (enquiry.prospectusStage || enquiry.enquiryLevel || 1) && !notes.trim())}
          >
            {updating ? 'Updating...' : 'Update Level'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnquiryLevelManager;
