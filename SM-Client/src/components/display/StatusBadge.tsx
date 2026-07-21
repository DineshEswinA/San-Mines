import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize } from '../../theme';

type TripStatus = 'INSIDE_QUARRY' | 'IN_TRANSIT' | 'UNLOADED';

interface StatusBadgeProps {
  status: TripStatus;
  flagged?: boolean;
}

const STATUS_CONFIG: Record<TripStatus, { label: string; bg: string; text: string; border: string }> = {
  INSIDE_QUARRY: {
    label: 'IN QUARRY',
    bg: colors.status.insideQuarry.bg,
    text: colors.status.insideQuarry.text,
    border: colors.status.insideQuarry.border,
  },
  IN_TRANSIT: {
    label: 'IN TRANSIT',
    bg: colors.status.inTransit.bg,
    text: colors.status.inTransit.text,
    border: colors.status.inTransit.border,
  },
  UNLOADED: {
    label: 'UNLOADED',
    bg: colors.status.unloaded.bg,
    text: colors.status.unloaded.text,
    border: colors.status.unloaded.border,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, flagged }) => {
  const config = STATUS_CONFIG[status];

  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
        <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
      </View>
      {flagged && (
        <View style={styles.flagBadge}>
          <Text style={styles.flagText}>⚑ FLAGGED</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  flagBadge: {
    backgroundColor: colors.status.flagged.bg,
    borderWidth: 1,
    borderColor: colors.status.flagged.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  flagText: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    color: colors.status.flagged.text,
    letterSpacing: 0.5,
  },
});
