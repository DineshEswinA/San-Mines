import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOfflineStatus } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, fontWeight } from '../theme/tokens';

export const SyncStatusBanner: React.FC = () => {
  const { isOffline, isSyncing, pendingCount } = useOfflineStatus();
  const { role } = useAuth();

  // Only show for field operators
  if (role === 'SUPER_ADMIN') return null;

  if (isOffline) {
    return (
      <View style={[styles.banner, styles.bannerOffline]}>
        <Text style={[styles.dot, styles.dotRed]}>●</Text>
        <Text style={styles.text}>Offline Mode Active. Entries will sync when signal returns.</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={[styles.banner, styles.bannerPending]}>
        <Text style={[styles.dot, styles.dotAmber]}>●</Text>
        <Text style={styles.text}>
          {isSyncing
            ? `${pendingCount} log${pendingCount !== 1 ? 's' : ''} saved on device. Syncing in progress...`
            : `${pendingCount} log${pendingCount !== 1 ? 's' : ''} pending sync.`}
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  bannerOffline: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderBottomColor: colors.danger.default,
  },
  bannerPending: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderBottomColor: colors.warning.default,
  },
  dot: {
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
  },
  dotRed: {
    color: colors.danger.light,
  },
  dotAmber: {
    color: colors.warning.light,
  },
  text: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
});
