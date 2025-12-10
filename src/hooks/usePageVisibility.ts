import { useState, useEffect, useCallback } from 'react';

export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

// Cache helper for storing page data
export const usePageCache = <T>(key: string) => {
  const getFromCache = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(`page_cache_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Cache expires after 5 minutes
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }
    return null;
  }, [key]);

  const setToCache = useCallback((data: T) => {
    try {
      localStorage.setItem(`page_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Cache write error:', e);
    }
  }, [key]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(`page_cache_${key}`);
    } catch (e) {
      console.error('Cache clear error:', e);
    }
  }, [key]);

  return { getFromCache, setToCache, clearCache };
};
