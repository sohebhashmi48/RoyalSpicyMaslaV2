import { createContext, useContext, useState, useEffect } from 'react';

const SafetyContext = createContext();

export const useSafety = () => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};

export const SafetyProvider = ({ children }) => {
  // Safety mechanism settings
  const [safetyEnabled, setSafetyEnabled] = useState(true);
  const [safetyPassword, setSafetyPassword] = useState('admin123'); // Default password
  const [hasFetchedSafety, setHasFetchedSafety] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('safetySettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setSafetyEnabled(settings.enabled ?? true);
        // Don't load password from localStorage anymore, it will come from database
      } catch (error) {
        console.error('Error loading safety settings:', error);
      }
    }

    // Load current safety password from database (only once per session)
    if (!hasFetchedSafety) {
      fetchSafetyPassword();
    }
  }, [hasFetchedSafety]);

  // Save settings to localStorage whenever they change (only enabled status)
  useEffect(() => {
    const settings = {
      enabled: safetyEnabled
    };
    localStorage.setItem('safetySettings', JSON.stringify(settings));
  }, [safetyEnabled]);

  // Fetch current safety password from database
  const fetchSafetyPassword = async () => {
    try {
      setHasFetchedSafety(true);
      let token = localStorage.getItem('adminToken');
      if (!token) return;

      let response = await fetch('http://localhost:5000/api/admin/safety-password', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 403) {
        token = await refreshAdminToken();
        if (!token) return;
        response = await fetch('http://localhost:5000/api/admin/safety-password', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.password) setSafetyPassword(data.password);
      }
    } catch (_) {
      // Silent fail, keep default password
    }
  };

  // Verify password
  const verifyPassword = (inputPassword) => {
    return inputPassword === safetyPassword;
  };

  // Update safety settings (requires password verification)
  const refreshAdminToken = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/refresh-token', {
        method: 'POST',
        credentials: 'include', // Use cookies for refresh token
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          localStorage.setItem('adminToken', data.token);
          console.log('Token refreshed successfully');
          return data.token;
        }
      }

      console.error('Failed to refresh token');
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  const updateSafetySettings = async (newEnabled, newPassword, currentPassword) => {
    console.log('Attempting to update safety settings');
    console.log('New Enabled:', newEnabled);
    console.log('New Password:', newPassword);
    console.log('Current Password:', currentPassword);

    // First verify locally to avoid unnecessary API calls
    if (!verifyPassword(currentPassword)) {
      console.error('Password verification failed locally');
      return { success: false, message: 'Invalid password' };
    }

    try {
      let token = localStorage.getItem('adminToken');
      if (!token) {
        console.error('No admin token found');
        return { success: false, message: 'Authentication required' };
      }

      console.log('Token:', token);

      // Update settings via API
      let response = await fetch('http://localhost:5000/api/admin/update-safety', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: newEnabled,
          newPassword: newPassword || null,
          currentPassword
        }),
      });

      if (response.status === 403) {
        console.warn('Token expired, attempting to refresh');
        token = await refreshAdminToken();
        if (!token) {
          return { success: false, message: 'Authentication failed. Please log in again.' };
        }

        // Retry API call with refreshed token
        response = await fetch('http://localhost:5000/api/admin/update-safety', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            enabled: newEnabled,
            newPassword: newPassword || null,
            currentPassword
          }),
        });
      }

      const data = await response.json();

      console.log('API Response:', data);

      if (data.success) {
        setSafetyEnabled(newEnabled);
        if (newPassword && newPassword.trim() !== '') {
          setSafetyPassword(newPassword.trim());
        }
        return { success: true, message: 'Safety settings updated successfully' };
      } else {
        console.error('API Error:', data.message);
        return { success: false, message: data.message || 'Failed to update settings' };
      }
    } catch (error) {
      console.error('Error updating safety settings:', error);

      // Fallback to local update if API fails
      setSafetyEnabled(newEnabled);
      if (newPassword && newPassword.trim() !== '') {
        setSafetyPassword(newPassword.trim());
      }

      return {
        success: true,
        message: 'Settings updated locally. Server update failed - changes may not persist after reload.'
      };
    }
  };

  // Check if safety verification is needed for an operation
  const requiresSafetyCheck = (operation) => {
    if (!safetyEnabled) return false;
    if (!operation) return true; // Default to requiring safety check if no operation specified

    const protectedOperations = ['add', 'edit', 'delete', 'update'];
    return protectedOperations.includes(operation.toLowerCase());
  };

  const value = {
    safetyEnabled,
    safetyPassword,
    verifyPassword,
    updateSafetySettings,
    requiresSafetyCheck
  };

  return (
    <SafetyContext.Provider value={value}>
      {children}
    </SafetyContext.Provider>
  );
};
