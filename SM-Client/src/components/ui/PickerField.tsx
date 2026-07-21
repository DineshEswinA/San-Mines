import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors, radius, spacing, touchTarget, shadow } from '../../theme';

interface PickerFieldProps {
  label: string;
  options: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  labelStyle?: TextStyle;
}

export const PickerField: React.FC<PickerFieldProps> = ({
  label,
  options,
  selectedValue,
  onValueChange,
  required = false,
  error,
  containerStyle,
  disabled = false,
  labelStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]}>
        {label} {required && <Text style={styles.asterisk}>*</Text>}
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => !disabled && setModalVisible(true)}
        style={[styles.trigger, error ? styles.triggerError : null, disabled && styles.triggerDisabled]}
      >
        <Text style={selectedValue ? styles.triggerText : styles.placeholderText}>
          {selectedValue || `Select ${label}`}
        </Text>
        <ChevronDown size={20} color={disabled ? colors.text.muted : colors.primary.light} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={styles.overlay}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select {label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, selectedValue === item && styles.optionActive]}
                  onPress={() => {
                    onValueChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, selectedValue === item && styles.optionTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  asterisk: {
    color: colors.danger.light,
    fontWeight: 'bold',
  },
  trigger: {
    height: touchTarget,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
  },
  triggerError: {
    borderColor: colors.border.error,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
    color: colors.text.muted,
  },
  errorText: {
    color: colors.danger.light,
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    ...shadow.modal,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    color: colors.text.primary,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  optionActive: {
    backgroundColor: colors.bg.elevated,
  },
  optionText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  optionTextActive: {
    fontWeight: 'bold',
    color: colors.primary.lighter,
  },
});
