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
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import {
  Globe,
  Phone,
  Eye,
  EyeOff,
  Lock,
  User,
  Mail,
  ShieldAlert,
} from 'lucide-react-native';

interface SignupScreenProps {
  onToggleAuthMode: () => void;
}

export const SignupScreen: React.FC<{ onToggleAuthMode: () => void }> = ({ onToggleAuthMode }) => {
  const { signUp } = useAuth();

  // Input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSignup = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Work Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      // Enforce: "Must be at least 8 characters with a symbol"
      const hasSymbol = /[^A-Za-z0-9]/;
      if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!hasSymbol.test(password)) {
        newErrors.password = 'Password must contain at least one symbol (e.g. @, #, $, !)';
      }
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await signUp(fullName, email, password);
      if (error) {
        Alert.alert('Signup Failed', error);
      } else {
        Alert.alert(
          'Account Created',
          'Your administrator account has been successfully configured. Please check your inbox if email confirmation is required.',
          [{ text: 'OK', onPress: onToggleAuthMode }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected registration error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClick = (provider: string) => {
    Alert.alert('Simulated OAuth', `${provider} OAuth integration triggered.`);
  };

  const handleTermsLink = (type: string) => {
    Alert.alert(type, `Simulated redirection to LogiTrack ${type} portal.`);
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
            <Text style={styles.title}>Join the Fleet</Text>
            <Text style={styles.subtitle}>
              Create your administrator account to start tracking.
            </Text>
          </View>

          {/* Social OAuth Buttons */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOAuthClick('Google')}
              style={styles.oauthBtn}
            >
              <View style={styles.fakeGoogleLogo}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.oauthBtnText}>Sign up with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOAuthClick('Phone')}
              style={styles.oauthBtn}
            >
              <Phone size={18} color="#1F2937" style={{ marginRight: 8 }} />
              <Text style={styles.oauthBtnText}>Sign up with Phone Number</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputWrapper, errors.fullName ? styles.inputWrapperError : null]}>
                <User size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="John Doe"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={fullName}
                  onChangeText={(val) => {
                    setFullName(val);
                    setErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                />
              </View>
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
            </View>

            {/* Work Email */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Work Email</Text>
              <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@company.com"
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

            {/* Create Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Create Password</Text>
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
              <Text style={styles.passValidationHint}>
                Must be at least 8 characters with a symbol.
              </Text>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Terms checkbox */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAgreedToTerms(!agreedToTerms);
                  setErrors((prev) => ({ ...prev, terms: '' }));
                }}
                style={[
                  styles.checkbox,
                  agreedToTerms ? styles.checkboxChecked : null,
                  errors.terms ? styles.checkboxError : null,
                ]}
              >
                {agreedToTerms && <View style={styles.checkboxInner} />}
              </TouchableOpacity>

              <Text style={styles.checkboxLabel}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={() => handleTermsLink('Terms of Service')}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.termsLink} onPress={() => handleTermsLink('Privacy Policy')}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
            {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

            {/* Create Account Button */}
            <Button
              title="Create Account"
              loadingTitle="Creating Account..."
              variant="primary"
              onPress={handleSignup}
              disabled={loading}
              loading={loading}
              style={styles.submitBtn}
            />

            {/* Login toggle link */}
            <View style={styles.loginToggleRow}>
              <Text style={styles.toggleText}>Already have an account? </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={onToggleAuthMode}>
                <Text style={styles.toggleLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Line separator */}
          <View style={styles.lineSpacer} />

          {/* Secure Lock & Regional Info Footer Banner */}
          <View style={styles.encryptionFooterBar}>
            <View style={styles.footerLeft}>
              <Lock size={12} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.footerBarText}>256-BIT AES ENCRYPTED</Text>
            </View>

            <View style={styles.footerRight}>
              <Text style={styles.footerBarText}>NORTH HUB REGION</Text>
              <Globe size={12} color="#64748B" style={{ marginLeft: 6 }} />
            </View>
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
    paddingBottom: 32,
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
  oauthContainer: {
    width: '100%',
    marginBottom: 24,
  },
  oauthBtn: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 8,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    color: '#F8FAFC',
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
    backgroundColor: '#334155',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
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
  passValidationHint: {
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F1',
  },
  checkboxError: {
    borderColor: '#EF4444',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  termsLink: {
    color: '#818CF8',
    fontWeight: '600',
  },
  submitBtn: {
    height: 54,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loginToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  toggleText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#818CF8',
  },
  lineSpacer: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 24,
  },
  encryptionFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerBarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5,
  },
});
