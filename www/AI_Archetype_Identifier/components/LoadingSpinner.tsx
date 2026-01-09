
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-8" role="status" aria-label="Loading...">
      <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin-custom"></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
};
