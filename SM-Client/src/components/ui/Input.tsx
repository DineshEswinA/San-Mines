import React, { useState, useEffect } from 'react';
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
  TextStyle,
  ScrollView,
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
        <Text style={[styles.label, labelStyle]}>
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
  labelStyle?: TextStyle;
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  mode,
  required = false,
  containerStyle,
  disabled = false,
  labelStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('07');
  const [selectedDay, setSelectedDay] = useState('19');
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');

  useEffect(() => {
    if (modalVisible && value) {
      if (mode === 'date') {
        const parts = value.split('-');
        if (parts.length === 3) {
          setSelectedYear(parts[0]);
          setSelectedMonth(parts[1]);
          setSelectedDay(parts[2]);
        }
      } else {
        const parts = value.split(':');
        if (parts.length >= 2) {
          setSelectedHour(parts[0]);
          setSelectedMinute(parts[1]);
        }
      }
    }
  }, [modalVisible, value]);

  const handleSave = () => {
    if (mode === 'date') {
      onChange(`${selectedYear}-${selectedMonth}-${selectedDay}`);
    } else {
      onChange(`${selectedHour}:${selectedMinute}`);
    }
    setModalVisible(false);
  };

  const years = ['2025', '2026', '2027'];
  const months = [
    { label: 'Jan', val: '01' },
    { label: 'Feb', val: '02' },
    { label: 'Mar', val: '03' },
    { label: 'Apr', val: '04' },
    { label: 'May', val: '05' },
    { label: 'Jun', val: '06' },
    { label: 'Jul', val: '07' },
    { label: 'Aug', val: '08' },
    { label: 'Sep', val: '09' },
    { label: 'Oct', val: '10' },
    { label: 'Nov', val: '11' },
    { label: 'Dec', val: '12' },
  ];

  const getDaysArray = () => {
    const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
    const arr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(String(i).padStart(2, '0'));
    }
    return arr;
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]}>
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
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { maxHeight: '85%', backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 2 }]}
          >
            <Text style={[styles.modalTitle, { color: '#F8FAFC' }]}>Set {label}</Text>

            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {mode === 'date' ? (
                <View>
                  <Text style={styles.pickerSublabel}>YEAR</Text>
                  <View style={styles.gridRow}>
                    {years.map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.pillBtn, selectedYear === y && styles.pillBtnActive]}
                        onPress={() => setSelectedYear(y)}
                      >
                        <Text style={[styles.pillText, selectedYear === y && styles.pillTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.pickerSublabel}>MONTH</Text>
                  <View style={styles.gridContainer}>
                    {months.map(m => (
                      <TouchableOpacity
                        key={m.val}
                        style={[styles.gridCell, selectedMonth === m.val && styles.gridCellActive]}
                        onPress={() => setSelectedMonth(m.val)}
                      >
                        <Text style={[styles.gridText, selectedMonth === m.val && styles.gridTextActive]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.pickerSublabel}>DAY</Text>
                  <View style={styles.dayGridContainer}>
                    {getDaysArray().map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dayCell, selectedDay === d && styles.dayCellActive]}
                        onPress={() => setSelectedDay(d)}
                      >
                        <Text style={[styles.dayText, selectedDay === d && styles.dayTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.pickerSublabel}>HOUR (24h)</Text>
                  <View style={styles.gridContainer}>
                    {hours.map(h => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.gridCell, selectedHour === h && styles.gridCellActive]}
                        onPress={() => setSelectedHour(h)}
                      >
                        <Text style={[styles.gridText, selectedHour === h && styles.gridTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.pickerSublabel}>MINUTE</Text>
                  <View style={styles.gridContainer}>
                    {minutes.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.gridCell, selectedMinute === m && styles.gridCellActive]}
                        onPress={() => setSelectedMinute(m)}
                      >
                        <Text style={[styles.gridText, selectedMinute === m && styles.gridTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.actionBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={handleSave}
              >
                <Text style={styles.actionBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
  // Custom Date/Time Picker styles
  pickerSublabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
  },
  pillBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  pillText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridCell: {
    width: '23%',
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  gridCellActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  gridText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  gridTextActive: {
    color: '#FFFFFF',
  },
  dayGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: '12.8%',
    aspectRatio: 1,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayCellActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  dayText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 12,
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#334155',
    paddingTop: 14,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#475569',
  },
  saveBtn: {
    backgroundColor: '#16A34A',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
