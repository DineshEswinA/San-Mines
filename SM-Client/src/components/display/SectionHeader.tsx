import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';

interface SectionHeaderProps {
  title: string;
  count?: number;
  right?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, count, right }) => {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {count !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </View>
      {right && <View>{right}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
});
