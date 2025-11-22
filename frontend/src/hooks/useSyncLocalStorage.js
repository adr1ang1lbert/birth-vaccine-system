// frontend/src/hooks/useSyncLocalStorage.js
import { useState, useEffect, useCallback } from "react";

export function useSyncLocalStorage(key, initialValue) {
  const readValue = useCallback(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading localStorage key:", key, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState(readValue);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
      window.dispatchEvent(new Event("local-storage-sync"));
    } catch (error) {
      console.error("Error setting localStorage key:", key, error);
    }
  }, [key, storedValue]);

  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage-sync", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage-sync", handleStorageChange);
    };
  }, [readValue]);

  return [storedValue, setStoredValue];
}
