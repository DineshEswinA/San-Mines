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
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Globe,
} from 'lucide-react-native';

interface LoginScreenProps {
  onToggleAuthMode: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onToggleAuthMode }) => {
  const { login } = useAuth();

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error states
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

  const handleOAuthClick = (provider: string) => {
    Alert.alert('Simulated OAuth', `${provider} OAuth integration triggered.`);
  };

  const handleForgotPassword = () => {
    Alert.alert('Reset Password', 'Password reset instructions sent to your email.');
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
              <Globe size={32} color="#3B2FD9" style={styles.logoIcon} />
              <Text style={styles.logoText}>San Mines</Text>
            </View>
            <Text style={styles.title}>Welcome back, Operator</Text>
            <Text style={styles.subtitle}>
              Access your facility's real-time manifest and tracking logs.
            </Text>
          </View>

          {/* Social OAuth Buttons */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOAuthClick('Google')}
              style={styles.oauthBtn}
            >
              {/* Fake Google Logo colors using layout */}
              <View style={styles.fakeGoogleLogo}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.oauthBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOAuthClick('Phone')}
              style={styles.oauthBtn}
            >
              <Phone size={18} color="#1F2937" style={{ marginRight: 8 }} />
              <Text style={styles.oauthBtnText}>Login with Phone Number</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR EMAIL LOGIN</Text>
            <View style={styles.dividerLine} />
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
                  placeholder="operator@logitrack.pro"
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
                <TouchableOpacity activeOpacity={0.7} onPress={handleForgotPassword}>
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

            {/* Remember terminal checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setRememberSession(!rememberSession)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, rememberSession ? styles.checkboxChecked : null]}>
                {rememberSession && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.checkboxLabel}>Remember this terminal session</Text>
            </TouchableOpacity>

            {/* Enter Dashboard Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading}
              style={[styles.submitBtn, loading ? { opacity: 0.8 } : null]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Enter Dashboard</Text>
                  <ArrowRight size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Sign up toggle link */}
            <View style={styles.signupToggleRow}>
              <Text style={styles.toggleText}>Don't have an account? </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={onToggleAuthMode}>
                <Text style={styles.toggleLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
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

          {/* Footer system details */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              LOGITRACK ENTERPRISE SYSTEMS © 2024 • BUILD V2.4.0-STABLE
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
    backgroundColor: '#F8FAFC', // Slate background
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
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    marginRight: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3B2FD9', // LogiTrack Pro blue
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  oauthContainer: {
    width: '100%',
    marginBottom: 24,
  },
  oauthBtn: {
    height: 52, // >= 48px target
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  fakeGoogleLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  googleG: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  oauthBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginHorizontal: 16,
    letterSpacing: 1.5,
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
    color: '#475569',
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
    color: '#3B2FD9',
  },
  inputWrapper: {
    height: 52, // >= 48px
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: '#3B2FD9',
    backgroundColor: '#3B2FD9',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#475569',
  },
  submitBtn: {
    height: 54, // Large high-contrast touch target
    backgroundColor: '#3B2FD9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#3B2FD9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signupToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  toggleText: {
    fontSize: 14,
    color: '#64748B',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B2FD9',
  },
  encryptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  encryptedTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16A34A',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  encryptedSubtext: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 15,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
});
