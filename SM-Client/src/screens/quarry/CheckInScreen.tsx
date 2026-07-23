import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

import { ClipboardList } from 'lucide-react-native';
import { Input, DateTimeField, Button } from '../../components/ui';

export const CheckInScreen: React.FC = () => {
  const { checkInVehicle } = useAuth();

  // Form Fields State
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize fields with current timestamp on mount
  useEffect(() => {
    const now = new Date();

    // YYYY-MM-DD format
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // HH:MM format (24 hour)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    setEntryDate(dateStr);
    setEntryTime(timeStr);
  }, []);

  const handleCheckIn = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!transporterName.trim()) {
      newErrors.transporterName = 'Transporter name is required';
    }
    if (!vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    } else {
      // Basic Indian or international vehicle plate validation style (alphanumeric validation)
      const plateRegex = /^[A-Z0-9-]{4,15}$/i;
      if (!plateRegex.test(vehicleNumber.trim())) {
        newErrors.vehicleNumber = 'Invalid format (Use uppercase letters, numbers, hyphens)';
      }
    }
    if (!entryDate.trim()) {
      newErrors.entryDate = 'Entry Date is required';
    }
    if (!entryTime.trim()) {
      newErrors.entryTime = 'Entry Time is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await checkInVehicle(transporterName, vehicleNumber, entryDate, entryTime);
      Alert.alert(
        'Check-In Successful',
        `Vehicle ${vehicleNumber.toUpperCase()} has been registered in the waiting queue.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset non-date inputs
              setTransporterName('');
              setVehicleNumber('');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Check-In Failed', err.message || 'An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ClipboardList size={28} color="#818CF8" />
            <Text style={styles.cardTitle}>Vehicle Check-In Registration</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Complete entry logs for incoming transport vehicles entering the quarry loading terminal.
          </Text>

          <View style={styles.form}>
            <Input
              label="Transporter Name"
              placeholder="Enter logistics company name"
              value={transporterName}
              onChangeText={setTransporterName}
              error={errors.transporterName}
              required={true}
              autoCapitalize="words"
              editable={!loading}
              labelStyle={{ color: '#94A3B8' }}
            />

            <Input
              label="Vehicle Number"
              placeholder="e.g. MH-12-PQ-9876"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              error={errors.vehicleNumber}
              required={true}
              autoCapitalize="characters"
              isAlphanumeric={true}
              editable={!loading}
              labelStyle={{ color: '#94A3B8' }}
            />

            <View style={styles.dateTimeRow}>
              <View style={styles.halfWidth}>
                <DateTimeField
                  label="Entry Date"
                  value={entryDate}
                  onChange={setEntryDate}
                  mode="date"
                  required={true}
                  disabled={loading}
                  labelStyle={{ color: '#94A3B8' }}
                />
              </View>
              <View style={styles.halfWidth}>
                <DateTimeField
                  label="Entry Time"
                  value={entryTime}
                  onChange={setEntryTime}
                  mode="time"
                  required={true}
                  disabled={loading}
                  labelStyle={{ color: '#94A3B8' }}
                />
              </View>
            </View>

            <Button
              title="Check-in Vehicle"
              loadingTitle="Checking in..."
              variant="primary"
              onPress={handleCheckIn}
              disabled={loading}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        </View>

        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>⚠️ OUTDOOR LOGISTICS PROTOCOL</Text>
          <Text style={styles.warningText}>
            Ensure the vehicle number matches the physical license plate exactly. Background GPS monitoring is active.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginLeft: 8,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 18,
  },
  form: {
    marginTop: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfWidth: {
    width: '48%',
  },
  submitBtn: {
    marginTop: 12,
    height: 54, // Large high-contrast touch target
  },
  warningContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#D97706',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FBBF24',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 11,
    color: '#F59E0B',
    lineHeight: 15,
  },
});
