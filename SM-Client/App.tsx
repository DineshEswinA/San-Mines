import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { SyncStatusBanner } from './src/components/SyncStatusBanner';
import { CheckInScreen } from './src/screens/quarry/CheckInScreen';
import { QuarryQueueScreen } from './src/screens/quarry/QuarryQueueScreen';
import { UnloadNavigator } from './src/navigation/UnloadNavigator';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';
import { ChangePasswordScreen } from './src/screens/auth/ChangePasswordScreen';
import { User, ClipboardCheck, ListFilter, LogOut } from 'lucide-react-native';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import Svg, { Path, Defs, LinearGradient, RadialGradient, Stop, Circle } from 'react-native-svg';

const BrandLogo: React.FC<{ size?: number }> = ({ size = 26 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="headerLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#818CF8" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#4F46E5" stopOpacity={0.2} />
        </LinearGradient>
        <LinearGradient id="headerRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
          <Stop offset="100%" stopColor="#2563EB" stopOpacity={0.25} />
        </LinearGradient>
        <RadialGradient id="headerGlowGrad" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
          <Stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Path d="M 46,24 L 28,76 L 54,76 Z" fill="url(#headerLeftGrad)" />
      <Path d="M 54,24 L 46,76 L 72,76 Z" fill="url(#headerRightGrad)" />
      <Circle cx={46} cy={24} r={6} fill="url(#headerGlowGrad)" />
      <Circle cx={46} cy={24} r={2} fill="#FFFFFF" />
      <Circle cx={54} cy={24} r={6} fill="url(#headerGlowGrad)" />
      <Circle cx={54} cy={24} r={2} fill="#FFFFFF" />
    </Svg>
  );
};

const MainAppContent: React.FC = () => {
  const { role, isAuthenticated, isPasswordRecovery, logout, isLoading } = useAuth();

  // Auth screen state for unauthenticated users
  const [authScreen, setAuthScreen] = useState<'login' | 'forgot-password'>('login');

  // Change password overlay for logged-in users
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Quarry Operator tab: 'checkin' | 'queue'
  const [quarryTab, setQuarryTab] = useState<'checkin' | 'queue'>('checkin');

  const handleLogoutPress = () => {
    Alert.alert(
      'Account Options',
      'Choose an action for your session',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change Password', onPress: () => setShowChangePassword(true) },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  // Password recovery mode (user arrived via email reset link)
  if (isPasswordRecovery || showChangePassword) {
    return (
      <ChangePasswordScreen
        isRecoveryFlow={isPasswordRecovery}
        onClose={() => setShowChangePassword(false)}
      />
    );
  }

  // Unauthenticated flows
  if (!isAuthenticated) {
    if (authScreen === 'forgot-password') {
      return <ForgotPasswordScreen onBack={() => setAuthScreen('login')} />;
    }
    return <LoginScreen onForgotPassword={() => setAuthScreen('forgot-password')} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top-Bar Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <BrandLogo size={28} />
          <Text style={[styles.logoText, { marginLeft: 6 }]}>SAN MINES</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogoutPress}
          style={[
            styles.profileTrigger,
            role === 'QUARRY_OPERATOR'
              ? styles.profileQuarry
              : role === 'UNLOAD_OPERATOR'
              ? styles.profileUnload
              : styles.profileAdmin,
          ]}
        >
          <User size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.profileTriggerText}>
            {role === 'SUPER_ADMIN'
              ? 'Super Admin'
              : role === 'UNLOAD_OPERATOR'
              ? 'Unload Operator'
              : 'Quarry Operator'}
          </Text>
          <LogOut size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* Offline sync status banner — field operators only */}
      {isAuthenticated && <SyncStatusBanner />}

      {/* Main content area */}
      <View style={styles.body}>
        {role === 'QUARRY_OPERATOR' ? (
          quarryTab === 'checkin' ? (
            <CheckInScreen />
          ) : (
            <QuarryQueueScreen />
          )
        ) : role === 'UNLOAD_OPERATOR' ? (
          <UnloadNavigator />
        ) : role === 'SUPER_ADMIN' ? (
          <AdminNavigator />
        ) : (
          <View style={styles.unknownRoleContainer}>
            <Text style={styles.unknownRoleText}>Unknown Privilege Tier</Text>
          </View>
        )}
      </View>

      {/* Bottom tab bar — Quarry Operator only */}
      {role === 'QUARRY_OPERATOR' && (
        <View style={styles.bottomTab}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setQuarryTab('checkin')}
            style={[styles.tabBtn, quarryTab === 'checkin' ? styles.tabBtnActive : null]}
          >
            <ClipboardCheck size={20} color={quarryTab === 'checkin' ? '#818CF8' : '#6B7280'} />
            <Text style={[styles.tabBtnText, quarryTab === 'checkin' ? styles.tabBtnTextActive : null]}>
              Check-In Form
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setQuarryTab('queue')}
            style={[styles.tabBtn, quarryTab === 'queue' ? styles.tabBtnActive : null]}
          >
            <ListFilter size={20} color={quarryTab === 'queue' ? '#818CF8' : '#6B7280'} />
            <Text style={[styles.tabBtnText, quarryTab === 'queue' ? styles.tabBtnTextActive : null]}>
              Yard Queue
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <OfflineProvider>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </OfflineProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    height: 60,
    backgroundColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  profileTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  profileQuarry: {
    backgroundColor: '#1E40AF',
    borderColor: '#3B82F6',
  },
  profileUnload: {
    backgroundColor: '#16A34A',
    borderColor: '#4ADE80',
  },
  profileAdmin: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  profileTriggerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 6,
  },
  body: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  unknownRoleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  unknownRoleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  bottomTab: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#1E293B',
    borderTopWidth: 1.5,
    borderTopColor: '#334155',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: 'transparent',
  },
  tabBtnActive: {
    borderTopColor: '#818CF8',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 4,
  },
  tabBtnTextActive: {
    color: '#818CF8',
  },
});
