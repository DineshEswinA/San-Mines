import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { colors, radius, spacing, touchTarget, shadow } from '../../theme';

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
    if (!modalVisible || !value) return;
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
  }, [modalVisible, value, mode]);

  const handleSave = () => {
    onChange(mode === 'date'
      ? `${selectedYear}-${selectedMonth}-${selectedDay}`
      : `${selectedHour}:${selectedMinute}`
    );
    setModalVisible(false);
  };

  const years = ['2025', '2026', '2027'];
  const months = [
    { label: 'Jan', val: '01' }, { label: 'Feb', val: '02' }, { label: 'Mar', val: '03' },
    { label: 'Apr', val: '04' }, { label: 'May', val: '05' }, { label: 'Jun', val: '06' },
    { label: 'Jul', val: '07' }, { label: 'Aug', val: '08' }, { label: 'Sep', val: '09' },
    { label: 'Oct', val: '10' }, { label: 'Nov', val: '11' }, { label: 'Dec', val: '12' },
  ];
  const getDays = () => {
    const count = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
    return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'));
  };
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]}>
        {label} {required && <Text style={styles.asterisk}>*</Text>}
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => !disabled && setModalVisible(true)}
        style={[styles.trigger, disabled && styles.triggerDisabled]}
      >
        <Text style={styles.triggerText}>{value}</Text>
        {mode === 'date'
          ? <Calendar size={20} color={colors.primary.light} />
          : <Clock size={20} color={colors.primary.light} />
        }
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={styles.overlay}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <Text style={styles.sheetTitle}>Set {label}</Text>

            <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {mode === 'date' ? (
                <View>
                  <Text style={styles.sublabel}>YEAR</Text>
                  <View style={styles.row}>
                    {years.map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.pill, selectedYear === y && styles.pillActive]}
                        onPress={() => setSelectedYear(y)}
                      >
                        <Text style={[styles.pillText, selectedYear === y && styles.pillTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.sublabel}>MONTH</Text>
                  <View style={styles.grid}>
                    {months.map(m => (
                      <TouchableOpacity
                        key={m.val}
                        style={[styles.cell, selectedMonth === m.val && styles.cellActive]}
                        onPress={() => setSelectedMonth(m.val)}
                      >
                        <Text style={[styles.cellText, selectedMonth === m.val && styles.cellTextActive]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.sublabel}>DAY</Text>
                  <View style={styles.dayGrid}>
                    {getDays().map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dayCell, selectedDay === d && styles.cellActive]}
                        onPress={() => setSelectedDay(d)}
                      >
                        <Text style={[styles.cellText, selectedDay === d && styles.cellTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.sublabel}>HOUR (24h)</Text>
                  <View style={styles.grid}>
                    {hours.map(h => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.cell, selectedHour === h && styles.cellActive]}
                        onPress={() => setSelectedHour(h)}
                      >
                        <Text style={[styles.cellText, selectedHour === h && styles.cellTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.sublabel}>MINUTE</Text>
                  <View style={styles.grid}>
                    {minutes.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.cell, selectedMinute === m && styles.cellActive]}
                        onPress={() => setSelectedMinute(m)}
                      >
                        <Text style={[styles.cellText, selectedMinute === m && styles.cellTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.bg.elevated }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.actionBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.success.default }]}
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
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
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
    maxHeight: '85%',
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
  sublabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.bg.screen,
    borderColor: colors.border.default,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.lighter,
  },
  pillText: {
    color: colors.text.secondary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  pillTextActive: {
    color: colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: '23%',
    paddingVertical: 10,
    backgroundColor: colors.bg.screen,
    borderColor: colors.border.default,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: 4,
  },
  cellActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.lighter,
  },
  cellText: {
    color: colors.text.secondary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  cellTextActive: {
    color: colors.white,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: '12.8%',
    aspectRatio: 1,
    backgroundColor: colors.bg.screen,
    borderColor: colors.border.default,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: colors.border.default,
    paddingTop: 14,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
