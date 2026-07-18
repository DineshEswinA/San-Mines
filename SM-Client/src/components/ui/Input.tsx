import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Calendar, Clock, ChevronDown } from 'lucide-react-native';

// ----------------------------------------------------
// 1. Alphanumeric TextInput Component
// ----------------------------------------------------
interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  // If true, restricts inputs to alphanumeric characters (and optional hyphens)
  isAlphanumeric?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required = false,
  containerStyle,
  isAlphanumeric = false,
  onChangeText,
  ...rest
}) => {
  const handleTextChange = (text: string) => {
    if (isAlphanumeric) {
      // Allow letters, numbers, and hyphens (as requested: "accepts letters, numbers, hyphens")
      const filtered = text.replace(/[^a-zA-Z0-9-]/g, '');
      if (onChangeText) onChangeText(filtered);
    } else {
      if (onChangeText) onChangeText(text);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label} {required ? <Text style={styles.asterisk}>*</Text> : <Text style={styles.optional}>(Optional)</Text>}
        </Text>
      </View>
      <TextInput
        style={[styles.textInput, error ? styles.textInputError : null]}
        placeholderTextColor="#9CA3AF"
        onChangeText={handleTextChange}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// ----------------------------------------------------
// 2. Segmented Control Toggle Component
// ----------------------------------------------------
interface SegmentedControlProps {
  label: string;
  values: string[];
  selectedValue: string;
  onValueChange: (value: any) => void;
  containerStyle?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  label,
  values,
  selectedValue,
  onValueChange,
  containerStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentedContainer}>
        {values.map((val) => {
          const isActive = selectedValue === val;
          return (
            <TouchableOpacity
              key={val}
              activeOpacity={0.8}
              onPress={() => onValueChange(val)}
              style={[
                styles.segmentItem,
                isActive ? styles.segmentItemActive : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive ? styles.segmentTextActive : null,
                ]}
              >
                {val}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ----------------------------------------------------
// 3. Dropdown Picker Component
// ----------------------------------------------------
interface PickerFieldProps {
  label: string;
  options: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
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
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.asterisk}>*</Text> : null}
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (disabled) return;
          setModalVisible(true);
        }}
        style={[
          styles.pickerTrigger,
          error ? styles.textInputError : null,
          disabled && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
        ]}
      >
        <Text style={selectedValue ? styles.pickerTriggerText : styles.pickerPlaceholderText}>
          {selectedValue || 'Select Material'}
        </Text>
        <ChevronDown size={20} color="#1E40AF" />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select {label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                   style={[
                    styles.modalItem,
                    selectedValue === item ? styles.modalItemActive : null,
                  ]}
                  onPress={() => {
                    onValueChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedValue === item ? styles.modalItemTextActive : null,
                    ]}
                  >
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

// ----------------------------------------------------
// 4. Interactive Date / Time Field Component
// ----------------------------------------------------
interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  mode: 'date' | 'time';
  required?: boolean;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  mode,
  required = false,
  containerStyle,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Generate realistic simulator choices so user can select easily without typing errors
  const getSimulatedOptions = () => {
    if (mode === 'date') {
      return ['2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07'];
    } else {
      // Generate some hours surrounding the current simulated 13:00 time
      return ['07:30', '08:45', '10:00', '11:15', '12:00', '13:00', '13:15', '14:30', '15:45', '17:00'];
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.asterisk}>*</Text> : null}
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (disabled) return;
          setTempValue(value);
          setModalVisible(true);
        }}
        style={[
          styles.pickerTrigger,
          disabled && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
        ]}
      >
        <Text style={styles.pickerTriggerText}>{value}</Text>
        {mode === 'date' ? (
          <Calendar size={20} color="#1E40AF" />
        ) : (
          <Clock size={20} color="#1E40AF" />
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: 300 }]}>
            <Text style={styles.modalTitle}>Set {label}</Text>
            
            {/* Quick-tap options */}
            <FlatList
              data={getSimulatedOptions()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    tempValue === item ? styles.modalItemActive : null,
                  ]}
                  onPress={() => {
                    onChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      tempValue === item ? styles.modalItemTextActive : null,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Custom Input fallback at bottom */}
            <View style={styles.customDateRow}>
              <TextInput
                style={styles.customDateInput}
                value={tempValue}
                placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
                onChangeText={setTempValue}
              />
              <TouchableOpacity
                style={styles.customDateSaveBtn}
                onPress={() => {
                  if (tempValue.trim() !== '') {
                    onChange(tempValue);
                  }
                  setModalVisible(false);
                }}
              >
                <Text style={styles.customDateSaveText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
    color: '#374151',
    textTransform: 'uppercase',
  },
  asterisk: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  optional: {
    color: '#6B7280',
    fontSize: 12,
    textTransform: 'none',
  },
  textInput: {
    height: 52, // >= 48px touch target
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textInputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  // Segmented control styles
  segmentedContainer: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#1E40AF',
    borderRadius: 8,
    overflow: 'hidden',
    height: 52, // >= 48px touch target
    backgroundColor: '#FFFFFF',
  },
  segmentItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentItemActive: {
    backgroundColor: '#1E40AF',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  // Picker & Trigger styles
  pickerTrigger: {
    height: 52, // >= 48px touch target
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  pickerTriggerText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  pickerPlaceholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  // Modal overlay styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemActive: {
    backgroundColor: '#EFF6FF',
  },
  modalItemText: {
    fontSize: 16,
    color: '#374151',
  },
  modalItemTextActive: {
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  // Custom Date input fallback in Modal
  customDateRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  customDateInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  customDateSaveBtn: {
    marginLeft: 12,
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    borderRadius: 6,
  },
  customDateSaveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
