import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">404 — Page Not Found</h1>
        <p className="text-gray-600 mb-6">The page you requested could not be found.</p>
        <Link to="/dashboard" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Return to Dashboard</Link>
      </div>
    </div>
  );
};

export default NotFound;
