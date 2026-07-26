import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

interface KeyValueRowProps {
  label: string;
  value: string | number | undefined | null;
  valueColor?: string;
  accent?: boolean;
}

export const KeyValueRow: React.FC<KeyValueRowProps> = ({ label, value, valueColor, accent }) => {
  return (
    <View style={[styles.row, accent && styles.rowAccent]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
        {value ?? '—'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  rowAccent: {
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: colors.text.muted,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
  },
});
