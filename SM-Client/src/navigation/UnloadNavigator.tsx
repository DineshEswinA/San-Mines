import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Route, History } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { InTransitScreen } from '../screens/unload/InTransitScreen';
import { UnloadArchiveScreen } from '../screens/unload/UnloadArchiveScreen';

type UnloadTab = 'transit' | 'archive';

export const UnloadNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<UnloadTab>('transit');
  const [initializing, setInitializing] = useState(true);

  const { getIncomingFleet, getCompletedArchives, fetchTransitFleet, fetchCompletedArchives, fetchConfigData } = useAuth();

  const incomingCount = getIncomingFleet().length;
  const archiveCount = getCompletedArchives().length;

  useEffect(() => {
    const init = async () => {
      // Load config first so both parallel trip fetches skip their internal guard
      await fetchConfigData();
      await Promise.all([fetchTransitFleet(), fetchCompletedArchives()]);
    };
    init().catch(() => {}).finally(() => setInitializing(false));
  }, []);

  if (initializing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loaderText}>Loading Fleet Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        {activeTab === 'transit' ? <InTransitScreen /> : <UnloadArchiveScreen />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('transit')}
          style={[styles.tabItem, activeTab === 'transit' && styles.tabItemActive]}
        >
          <Route size={20} color={activeTab === 'transit' ? '#818CF8' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'transit' && styles.tabTextActive]}>
            Incoming Fleet ({incomingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('archive')}
          style={[styles.tabItem, activeTab === 'archive' && styles.tabItemActive]}
        >
          <History size={20} color={activeTab === 'archive' ? '#818CF8' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'archive' && styles.tabTextActive]}>
            Unload Archive ({archiveCount})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1.5,
    borderTopColor: '#334155',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {},
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#818CF8',
  },
});
