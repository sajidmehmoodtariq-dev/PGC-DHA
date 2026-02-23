import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading Spinner Component
 * Reusable loading indicator with customizable message
 */
const LoadingSpinner = ({ 
  message = "Loading...", 
  size = "default", 
  className = "" 
}) => {
  const sizeClasses = {
    small: "h-4 w-4",
    default: "h-6 w-6", 
    large: "h-8 w-8"
  };

  return (
    <div className={`flex items-center justify-center min-h-96 ${className}`}>
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Loader2 className={`${sizeClasses[size]} text-blue-500 animate-spin`} />
        </div>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
