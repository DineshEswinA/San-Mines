import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CheckInScreen } from './src/screens/quarry/CheckInScreen';
import { QuarryQueueScreen } from './src/screens/quarry/QuarryQueueScreen';
import { IncomingFleetScreen } from './src/screens/unload/IncomingFleetScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignupScreen } from './src/screens/auth/SignupScreen';
import { HardDrive, User, ChevronDown, Check, ClipboardCheck, ListFilter, LogOut } from 'lucide-react-native';

const MainAppContent: React.FC = () => {
  const { role, setRole, isAuthenticated, logout } = useAuth();
  
  // Quarry Operator active tab: 'checkin' | 'queue'
  const [quarryTab, setQuarryTab] = useState<'checkin' | 'queue'>('checkin');
  
  // Profile dropdown visibility
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Authentication mode ('login' | 'signup')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

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
          <HardDrive size={22} color="#60A5FA" />
          <Text style={styles.logoText}>San Mines</Text>
        </View>

        {/* Profile Simulator Dropdown Trigger */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setDropdownVisible(true)}
          style={[
            styles.profileTrigger,
            role === 'QUARRY_OPERATOR' ? styles.profileQuarry : styles.profileUnload,
          ]}
        >
          <User size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.profileTriggerText}>
            {role === 'QUARRY_OPERATOR' ? 'Quarry User' : 'Unload User'}
          </Text>
          <ChevronDown size={14} color="#FFFFFF" />
        </TouchableOpacity>
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
        ) : (
          // Unloading Operator flow - Strictly isolated screen context
          <IncomingFleetScreen />
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
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
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
  profileTriggerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 6,
  },
  body: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  // Custom bottom tab layout for Quarry Operator
  bottomTab: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
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
    borderTopColor: '#1E40AF',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 4,
  },
  tabBtnTextActive: {
    color: '#1E40AF',
  },
  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  dropdownMenu: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9CA3AF',
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
    backgroundColor: '#F3F4F6',
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
    color: '#374151',
    fontWeight: '500',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
});
