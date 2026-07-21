import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps, TextStyle } from 'react-native';
import { colors, radius, spacing, touchTarget } from '../../theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  isAlphanumeric?: boolean;
  labelStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required = false,
  containerStyle,
  isAlphanumeric = false,
  onChangeText,
  labelStyle,
  ...rest
}) => {
  const handleTextChange = (text: string) => {
    if (isAlphanumeric) {
      const filtered = text.replace(/[^a-zA-Z0-9-]/g, '');
      onChangeText?.(filtered);
    } else {
      onChangeText?.(text);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, labelStyle]}>
          {label}{' '}
          {required ? (
            <Text style={styles.asterisk}>*</Text>
          ) : (
            <Text style={styles.optional}>(Optional)</Text>
          )}
        </Text>
      </View>
      <TextInput
        style={[styles.textInput, error ? styles.textInputError : null]}
        placeholderTextColor={colors.text.muted}
        onChangeText={handleTextChange}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  asterisk: {
    color: colors.danger.light,
    fontWeight: 'bold',
  },
  optional: {
    color: colors.text.muted,
    fontSize: 12,
    textTransform: 'none',
    fontWeight: '400',
  },
  textInput: {
    height: touchTarget,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.bg.surface,
  },
  textInputError: {
    borderColor: colors.border.error,
  },
  errorText: {
    color: colors.danger.light,
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
});
