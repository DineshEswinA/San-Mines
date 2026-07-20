import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { LiveLedgerScreen } from '../screens/admin/LiveLedgerScreen';
import { MasterConfigScreen } from '../screens/admin/MasterConfigScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { Activity, ClipboardList, Settings, Users } from 'lucide-react-native';

export const AdminNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'config' | 'users'>('dashboard');

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardScreen />;
      case 'ledger':
        return <LiveLedgerScreen />;
      case 'config':
        return <MasterConfigScreen />;
      case 'users':
        return <UserManagementScreen />;
      default:
        return <AdminDashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Main Viewport */}
      <View style={styles.body}>{renderActiveScreen()}</View>

      {/* 2. Custom Bottom Tab Bar (Indigo Slate Accent) */}
      <View style={styles.bottomTab}>
        {/* Tab 1: Live Ops */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('dashboard')}
          style={[styles.tabBtn, activeTab === 'dashboard' ? styles.tabBtnActive : null]}
        >
          <Activity size={20} color={activeTab === 'dashboard' ? '#6366F1' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'dashboard' ? styles.tabBtnTextActive : null]}>
            Live Ops
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Live Ledger */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('ledger')}
          style={[styles.tabBtn, activeTab === 'ledger' ? styles.tabBtnActive : null]}
        >
          <ClipboardList size={20} color={activeTab === 'ledger' ? '#6366F1' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'ledger' ? styles.tabBtnTextActive : null]}>
            Ledger
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Config */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('config')}
          style={[styles.tabBtn, activeTab === 'config' ? styles.tabBtnActive : null]}
        >
          <Settings size={20} color={activeTab === 'config' ? '#6366F1' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'config' ? styles.tabBtnTextActive : null]}>
            Configs
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Workers */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('users')}
          style={[styles.tabBtn, activeTab === 'users' ? styles.tabBtnActive : null]}
        >
          <Users size={20} color={activeTab === 'users' ? '#6366F1' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'users' ? styles.tabBtnTextActive : null]}>
            Staff
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  body: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  bottomTab: {
    flexDirection: 'row',
    height: 64, // Touch target height checks
    backgroundColor: '#1E293B',
    borderTopWidth: 1.5,
    borderTopColor: '#334155',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  tabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: 'transparent',
    height: '100%',
  },
  tabBtnActive: {
    borderTopColor: '#6366F1', // Slate/Indigo active border
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 4,
  },
  tabBtnTextActive: {
    color: '#F8FAFC',
  },
});
export default AdminNavigator;
