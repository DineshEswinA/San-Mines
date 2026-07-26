import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps, TextStyle, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, touchTarget } from '../../theme';
import { Eye, EyeOff } from 'lucide-react-native';

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
  secureTextEntry,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleTextChange = (text: string) => {
    if (isAlphanumeric) {
      const filtered = text.replace(/[^a-zA-Z0-9-]/g, '');
      onChangeText?.(filtered);
    } else {
      onChangeText?.(text);
    }
  };

  const isPassword = secureTextEntry !== undefined;

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
      <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
        <TextInput
          style={styles.textInput}
          placeholderTextColor={colors.text.muted}
          onChangeText={handleTextChange}
          secureTextEntry={isPassword ? !showPassword : false}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
          >
            {showPassword ? (
              <EyeOff size={20} color={colors.text.secondary} />
            ) : (
              <Eye size={20} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
        )}
      </View>
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: touchTarget,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
  },
  inputWrapperError: {
    borderColor: colors.border.error,
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
  },
  eyeBtn: {
    paddingHorizontal: spacing.md,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger.light,
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
});

