import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Truck } from 'lucide-react-native';
import { StatusBadge } from './StatusBadge';
import { colors, radius, spacing } from '../../theme';

interface TripCardProps {
  vehicleNumber: string;
  transporterName: string;
  status: 'INSIDE_QUARRY' | 'IN_TRANSIT' | 'UNLOADED';
  isFlagged?: boolean;
  subtitle?: string;
  onPress?: () => void;
}

export const TripCard: React.FC<TripCardProps> = ({
  vehicleNumber,
  transporterName,
  status,
  isFlagged,
  subtitle,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[styles.card, isFlagged && styles.cardFlagged]}
    >
      <View style={styles.iconWrap}>
        <Truck size={20} color={colors.primary.light} />
      </View>
      <View style={styles.body}>
        <Text style={styles.vehicle}>{vehicleNumber}</Text>
        <Text style={styles.transporter}>{transporterName}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <StatusBadge status={status} flagged={isFlagged} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
  cardFlagged: {
    borderColor: colors.danger.default,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  vehicle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  transporter: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
});
