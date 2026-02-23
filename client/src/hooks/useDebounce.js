import { useRef, useCallback } from 'react';

/**
 * Custom hook for debouncing function calls
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    // Clear the previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup function to clear timeout on unmount
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [debouncedCallback, cancel];
};
