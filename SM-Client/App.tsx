import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  StatusBar as RNStatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CheckInScreen } from './src/screens/quarry/CheckInScreen';
import { QuarryQueueScreen } from './src/screens/quarry/QuarryQueueScreen';
import { IncomingFleetScreen } from './src/screens/unload/IncomingFleetScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignupScreen } from './src/screens/auth/SignupScreen';
import { HardDrive, User, ChevronDown, Check, ClipboardCheck, ListFilter, LogOut } from 'lucide-react-native';
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

      {/* Left triangle */}
      <Path
        d="M 46,24 L 28,76 L 54,76 Z"
        fill="url(#headerLeftGrad)"
      />

      {/* Right triangle */}
      <Path
        d="M 54,24 L 46,76 L 72,76 Z"
        fill="url(#headerRightGrad)"
      />

      {/* Glowing Apexes */}
      <Circle cx={46} cy={24} r={6} fill="url(#headerGlowGrad)" />
      <Circle cx={46} cy={24} r={2} fill="#FFFFFF" />

      <Circle cx={54} cy={24} r={6} fill="url(#headerGlowGrad)" />
      <Circle cx={54} cy={24} r={2} fill="#FFFFFF" />
    </Svg>
  );
};

const MainAppContent: React.FC = () => {
  const { role, setRole, isSuperAdmin, isAuthenticated, logout, isLoading } = useAuth();

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  // Quarry Operator active tab: 'checkin' | 'queue'
  const [quarryTab, setQuarryTab] = useState<'checkin' | 'queue'>('checkin');

  // Profile dropdown visibility
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Authentication mode ('login' | 'signup')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Show splash screen strictly while auth is loading or API requests are resolving
  const showSplash = isLoading;

  if (showSplash) {
    return <SplashScreen />;
  }

  // If not authenticated, render Login/Signup flow
  if (!isAuthenticated) {
    return authMode === 'login' ? (
      <LoginScreen onToggleAuthMode={() => setAuthMode('signup')} />
    ) : (
      <SignupScreen onToggleAuthMode={() => setAuthMode('login')} />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* 1. Mocked Top-Bar Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <BrandLogo size={28} />
          <Text style={[styles.logoText, { marginLeft: 6 }]}>SAN MINES</Text>
        </View>

        {/* Profile Simulator Dropdown Trigger */}
        {isSuperAdmin ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDropdownVisible(true)}
            style={[
              styles.profileTrigger,
              role === 'QUARRY_OPERATOR' ? styles.profileQuarry : role === 'UNLOAD_OPERATOR' ? styles.profileUnload : styles.profileAdmin,
            ]}
          >
            <User size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.profileTriggerText}>
              {role === 'QUARRY_OPERATOR' ? 'Quarry User (Sim)' : role === 'UNLOAD_OPERATOR' ? 'Unload User (Sim)' : 'Super Admin'}
            </Text>
            <ChevronDown size={14} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogoutPress}
            style={[
              styles.profileTrigger,
              role === 'QUARRY_OPERATOR' ? styles.profileQuarry : styles.profileUnload,
            ]}
          >
            <User size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.profileTriggerText}>
              {role === 'QUARRY_OPERATOR' ? 'Quarry Operator' : 'Unload Operator'}
            </Text>
            <LogOut size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Global Role Switcher Modal (Simulator Dropdown) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={dropdownVisible}
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
          style={styles.dropdownOverlay}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownTitle}>SIMULATE LOGGED IN OPERATOR</Text>

            {/* Quarry Operator selection */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setRole('QUARRY_OPERATOR');
                setDropdownVisible(false);
              }}
              style={[
                styles.dropdownItem,
                role === 'QUARRY_OPERATOR' ? styles.dropdownItemActive : null,
              ]}
            >
              <View style={styles.dropdownItemLeft}>
                <View style={[styles.avatarDot, { backgroundColor: '#1E40AF' }]} />
                <Text style={styles.dropdownItemText}>Logged in as: Quarry User</Text>
              </View>
              {role === 'QUARRY_OPERATOR' && <Check size={18} color="#1E40AF" />}
            </TouchableOpacity>

            {/* Unload Operator selection */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setRole('UNLOAD_OPERATOR');
                setDropdownVisible(false);
              }}
              style={[
                styles.dropdownItem,
                role === 'UNLOAD_OPERATOR' ? styles.dropdownItemActive : null,
              ]}
            >
              <View style={styles.dropdownItemLeft}>
                <View style={[styles.avatarDot, { backgroundColor: '#16A34A' }]} />
                <Text style={styles.dropdownItemText}>Logged in as: Unload User</Text>
              </View>
              {role === 'UNLOAD_OPERATOR' && <Check size={18} color="#16A34A" />}
            </TouchableOpacity>

            {/* Super Admin selection */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setRole('SUPER_ADMIN');
                setDropdownVisible(false);
              }}
              style={[
                styles.dropdownItem,
                role === 'SUPER_ADMIN' ? styles.dropdownItemActive : null,
              ]}
            >
              <View style={styles.dropdownItemLeft}>
                <View style={[styles.avatarDot, { backgroundColor: '#6366F1' }]} />
                <Text style={styles.dropdownItemText}>Logged in as: Super Admin</Text>
              </View>
              {role === 'SUPER_ADMIN' && <Check size={18} color="#6366F1" />}
            </TouchableOpacity>

            {/* Simulated Logout Selection */}
            <View style={styles.dropdownDivider} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setDropdownVisible(false);
                logout();
              }}
              style={styles.dropdownItem}
            >
              <View style={styles.dropdownItemLeft}>
                <LogOut size={16} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={[styles.dropdownItemText, { color: '#EF4444', fontWeight: 'bold' }]}>
                  Log Out Session
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 3. Screen Hot-swapping & Tab layout depending on current role context */}
      <View style={styles.body}>
        {role === 'QUARRY_OPERATOR' ? (
          // Quarry Operator flow
          quarryTab === 'checkin' ? (
            <CheckInScreen onSuccess={() => setQuarryTab('queue')} />
          ) : (
            <QuarryQueueScreen />
          )
        ) : role === 'UNLOAD_OPERATOR' ? (
          // Unloading Operator flow - Strictly isolated screen context
          <IncomingFleetScreen />
        ) : role === 'SUPER_ADMIN' ? (
          // Super Admin Multi-Tab Mobile Console
          <AdminNavigator />
        ) : (
          // Fallback welcome screen or error
          <View style={styles.adminWelcomeContainer}>
            <Text style={styles.adminWelcomeTitle}>Unknown Privilege Tier</Text>
          </View>
        )}
      </View>

      {/* 4. Quarry Operator Bottom-Tab Bar (rendered only for Quarry operator) */}
      {role === 'QUARRY_OPERATOR' && (
        <View style={styles.bottomTab}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setQuarryTab('checkin')}
            style={[styles.tabBtn, quarryTab === 'checkin' ? styles.tabBtnActive : null]}
          >
            <ClipboardCheck size={20} color={quarryTab === 'checkin' ? '#1E40AF' : '#6B7280'} />
            <Text style={[styles.tabBtnText, quarryTab === 'checkin' ? styles.tabBtnTextActive : null]}>
              Check-In Form
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setQuarryTab('queue')}
            style={[styles.tabBtn, quarryTab === 'queue' ? styles.tabBtnActive : null]}
          >
            <ListFilter size={20} color={quarryTab === 'queue' ? '#1E40AF' : '#6B7280'} />
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
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827', // Pitch dark for top status alignment
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    height: 60,
    backgroundColor: '#1F2937', // Sleek industrial dark grey
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
    backgroundColor: '#1E40AF', // Blue background for Quarry User
    borderColor: '#3B82F6',
  },
  profileUnload: {
    backgroundColor: '#16A34A', // Green background for Unloading User
    borderColor: '#4ADE80',
  },
  profileAdmin: {
    backgroundColor: '#374151', // Dark grey background for Super Admin
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
  // Custom bottom tab layout for Quarry Operator
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
  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  dropdownMenu: {
    width: 250,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  dropdownTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: '#0F172A',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 6,
  },
  adminWelcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  adminCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  adminWelcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  adminWelcomeSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  adminRoleBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  adminRoleBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
