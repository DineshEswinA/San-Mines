import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import { Lock, Eye, EyeOff, ShieldAlert, X } from 'lucide-react-native';

interface ChangePasswordScreenProps {
  onClose: () => void;
  isRecoveryFlow?: boolean;
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  onClose,
  isRecoveryFlow = false,
}) => {
  const { updatePassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one symbol (e.g. @, #, $, !)';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        Alert.alert('Update Failed', error);
      } else {
        Alert.alert(
          'Password Updated',
          'Your password has been changed successfully.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Change Password</Text>
            <Text style={styles.headerSubtitle}>
              {isRecoveryFlow ? 'Set your new account password' : 'Update your security password'}
            </Text>
          </View>
          {!isRecoveryFlow && (
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#F8FAFC" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

          {isRecoveryFlow && (
            <View style={styles.recoveryBanner}>
              <ShieldAlert size={20} color="#F59E0B" style={{ marginRight: 10 }} />
              <Text style={styles.recoveryText}>
                You are in password recovery mode. Please set a new password to continue.
              </Text>
            </View>
          )}

          {/* New Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <View style={[styles.inputWrapper, errors.newPassword ? styles.inputWrapperError : null]}>
              <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={(val) => {
                  setNewPassword(val);
                  setErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
              />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                {showNew ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>At least 8 characters with at least one symbol.</Text>
            {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputWrapperError : null]}>
              <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
              />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                {showConfirm ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          <Button
            title="Update Password"
            loadingTitle="Updating..."
            variant="primary"
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
            style={styles.submitBtn}
          />

          {!isRecoveryFlow && (
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
    backgroundColor: '#0F172A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#D97706',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  recoveryText: {
    flex: 1,
    fontSize: 13,
    color: '#FCD34D',
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  inputWrapper: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 8,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#F8FAFC',
  },
  eyeBtn: {
    padding: 8,
  },
  hint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  submitBtn: {
    height: 54,
    marginTop: 8,
  },
  cancelBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
});
