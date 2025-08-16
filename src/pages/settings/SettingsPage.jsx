import { useState, memo } from 'react';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useSafety } from '../../contexts/SafetyContext';
import { useToast } from '../../contexts/ToastContext';

const PasswordInput = memo(({ label, value, onChange, show, onToggleShow, placeholder, required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        placeholder={placeholder}
        required={required}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
      >
        {show ? (
          <EyeSlashIcon className="h-5 w-5" />
        ) : (
          <EyeIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  </div>
));

const SettingsPage = () => {
  const { safetyEnabled, updateSafetySettings } = useSafety();
  const { showSuccess, showError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempSafetyEnabled, setTempSafetyEnabled] = useState(safetyEnabled);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log('Current Password:', currentPassword);
    console.log('New Password:', newPassword);
    console.log('Confirm Password:', confirmPassword);
    console.log('Safety Enabled:', tempSafetyEnabled);

    // Validate current password
    if (!currentPassword.trim()) {
      showError('Current password is required');
      setLoading(false);
      return;
    }

    // Validate new password if provided
    if (newPassword && newPassword !== confirmPassword) {
      showError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Update settings (now async)
      const result = await updateSafetySettings(
        tempSafetyEnabled,
        newPassword || null,
        currentPassword
      );

      console.log('Update Safety Settings Response:', result);

      if (result.success) {
        showSuccess(result.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
        <div className="min-h-full px-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-4 mb-6">
        <div className="flex items-center">
          <CogIcon className="h-8 w-8 text-gray-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 text-sm">Manage your application settings and security</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full">
        {/* Your Safety Mechanism Section stays here */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <ShieldCheckIcon className="h-6 w-6 text-orange-600 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Safety Mechanism</h2>
                <p className="text-sm text-gray-600">
                  Control password protection for product operations
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Safety Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <LockClosedIcon className="h-5 w-5 text-gray-600 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Enable Safety Protection
                    </h3>
                    <p className="text-xs text-gray-600">
                      Require password for add, edit, and delete operations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTempSafetyEnabled(!tempSafetyEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    tempSafetyEnabled ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      tempSafetyEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Current Password */}
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPassword}
                onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
                placeholder="Enter current password"
                required
              />

              {/* New Password */}
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPassword}
                onToggleShow={() => setShowNewPassword(!showNewPassword)}
                placeholder="Leave blank to keep current password"
              />

              {/* Confirm New Password */}
              {newPassword && (
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPassword}
                  onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                  placeholder="Confirm new password"
                  required
                />
              )}

              {/* Status Indicator */}
              <div className={`p-3 rounded-lg ${tempSafetyEnabled ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center">
                  <ShieldCheckIcon className={`h-5 w-5 mr-2 ${tempSafetyEnabled ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`text-sm font-medium ${tempSafetyEnabled ? 'text-green-800' : 'text-red-800'}`}>
                    Safety mechanism is currently {tempSafetyEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${tempSafetyEnabled ? 'text-green-700' : 'text-red-700'}`}>
                  {tempSafetyEnabled
                    ? 'All product operations will require password verification'
                    : 'Product operations can be performed without password verification'
                  }
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
};

export default SettingsPage;
