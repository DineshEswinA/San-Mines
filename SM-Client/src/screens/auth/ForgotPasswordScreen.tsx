import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react-native';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack }) => {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      setEmailError('Email address is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    setLoading(true);

    try {
      const { error } = await forgotPassword(email);
      if (error) {
        setEmailError(error);
      } else {
        setSent(true);
      }
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

          {/* Back button */}
          <TouchableOpacity activeOpacity={0.7} onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={20} color="#818CF8" />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../../assets/splash-icon.png')}
                style={{ width: 36, height: 36, marginRight: 10 }}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>SAN MINES</Text>
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered email address and we'll send you a secure reset link.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successCard}>
              <CheckCircle2 size={48} color="#10B981" style={{ marginBottom: 16 }} />
              <Text style={styles.successTitle}>Reset Link Sent</Text>
              <Text style={styles.successText}>
                Check your inbox at{' '}
                <Text style={{ color: '#818CF8', fontWeight: 'bold' }}>{email}</Text>
                {'. '}
                Open the link in the email to set a new password. The link expires in 1 hour.
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={onBack} style={styles.returnBtn}>
                <Text style={styles.returnBtnText}>Return to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>REGISTERED EMAIL</Text>
                <View style={[styles.inputWrapper, emailError ? styles.inputWrapperError : null]}>
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
                      setEmailError('');
                    }}
                  />
                </View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <Button
                title="Send Reset Link"
                loadingTitle="Sending..."
                variant="primary"
                onPress={handleSend}
                disabled={loading}
                loading={loading}
                style={styles.submitBtn}
              />

              <Text style={styles.hint}>
                Reset links expire after 1 hour. Contact your administrator if you don't receive the email within a few minutes.
              </Text>
            </View>
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
  scrollContainer: {
    padding: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#818CF8',
    marginLeft: 6,
  },
  header: {
    marginBottom: 36,
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
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  submitBtn: {
    height: 54,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  successCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#134E4A',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  returnBtn: {
    marginTop: 24,
    height: 48,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#818CF8',
  },
});
