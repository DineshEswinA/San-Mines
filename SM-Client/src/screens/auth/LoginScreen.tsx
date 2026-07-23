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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';

interface LoginScreenProps {
  onForgotPassword: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onForgotPassword }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleLogin = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await login(email, password);
      if (error) {
        Alert.alert('Authentication Failed', error);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected authentication error occurred.');
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
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../../assets/splash-icon.png')}
                style={{ width: 36, height: 36, marginRight: 10 }}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>SAN MINES</Text>
            </View>
            <Text style={styles.title}>Welcome back, Operator</Text>
            <Text style={styles.subtitle}>
              Access your facility's real-time manifest and tracking logs.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Address */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="operator@sanmines.in"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.formGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>SECURITY PASSWORD</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={onForgotPassword}>
                  <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
                <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Enter Dashboard Button */}
            <Button
              title="Enter Dashboard"
              loadingTitle="Signing in..."
              variant="primary"
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>

          {/* End-to-end encrypted security banner */}
          <View style={styles.encryptedBanner}>
            <ShieldCheck size={24} color="#16A34A" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.encryptedTitle}>END-TO-END ENCRYPTED</Text>
              <Text style={styles.encryptedSubtext}>
                This terminal is protected by enterprise-grade 256-bit AES encryption. Unauthorized
                access is strictly monitored and logged.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              SAN MINES LOGISTICS © 2026 • QUARRY OPERATIONS PORTAL
            </Text>
          </View>
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
  scrollContainer: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#818CF8',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  form: {
    width: '100%',
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordLink: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#818CF8',
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
  encryptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 16,
    marginTop: 32,
  },
  encryptedTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34D399',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  encryptedSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
});
