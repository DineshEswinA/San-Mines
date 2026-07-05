import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryBtn;
      case 'danger':
        return styles.dangerBtn;
      case 'outline':
        return styles.outlineBtn;
      case 'primary':
      default:
        return styles.primaryBtn;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      default:
        return styles.buttonText;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.buttonBase,
        getButtonStyle(),
        disabled && styles.disabledBtn,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#1E40AF' : '#FFFFFF'} />
      ) : (
        <Text style={[getTextStyle(), disabled && styles.disabledText, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    height: 52, // Ultra-accessible touch target (> 48px)
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
  primaryBtn: {
    backgroundColor: '#1E40AF', // Enterprise Dark Blue
  },
  secondaryBtn: {
    backgroundColor: '#16A34A', // Safety/Arrival Green
  },
  dangerBtn: {
    backgroundColor: '#DC2626', // Alert Red
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1E40AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledBtn: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outlineText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disabledText: {
    color: '#9CA3AF',
  },
});
