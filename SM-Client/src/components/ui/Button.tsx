import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, touchTarget, shadow } from '../../theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  loadingTitle?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingTitle,
  style,
  textStyle,
}) => {
  const variantStyle = variantStyles[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, variantStyle.container, disabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading && (
        <ActivityIndicator
          color={variant === 'outline' ? '#A5B4FC' : colors.white}
          style={{ marginRight: 10 }}
        />
      )}
      <Text style={[styles.text, variantStyle.text, textStyle]}>
        {loading ? (loadingTitle || `${title}...`) : title}
      </Text>
    </TouchableOpacity>
  );
};

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.primary.default },
    text: { color: colors.white },
  },
  secondary: {
    container: { backgroundColor: colors.success.default },
    text: { color: colors.white },
  },
  danger: {
    container: { backgroundColor: colors.danger.default },
    text: { color: colors.white },
  },
  outline: {
    container: {
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
      borderWidth: 1.5,
      borderColor: '#6366F1',
      shadowOpacity: 0,
      elevation: 0,
    },
    text: { color: '#A5B4FC' },
  },
};

const styles = StyleSheet.create({
  base: {
    height: touchTarget,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    ...shadow.subtle,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
