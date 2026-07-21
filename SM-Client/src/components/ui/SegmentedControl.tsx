import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, touchTarget } from '../../theme';

interface SegmentedControlProps {
  label: string;
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  label,
  values,
  selectedValue,
  onValueChange,
  containerStyle,
  labelStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <View style={styles.track}>
        {values.map((val) => {
          const isActive = selectedValue === val;
          return (
            <TouchableOpacity
              key={val}
              activeOpacity={0.8}
              onPress={() => onValueChange(val)}
              style={[styles.segment, isActive && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {val}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  track: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.primary.default,
    borderRadius: radius.md,
    overflow: 'hidden',
    height: touchTarget,
    backgroundColor: colors.bg.surface,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
  },
  segmentActive: {
    backgroundColor: colors.primary.default,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary.light,
  },
  segmentTextActive: {
    color: colors.white,
  },
});
