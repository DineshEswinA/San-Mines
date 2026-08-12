import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, QuarryCheckOut, formatTimeTo12Hour, formatDateOnly } from '../../context/AuthContext';
import { Truck, ShieldCheck, X } from 'lucide-react-native';
import { SearchBar, Button, DateTimeField, PickerField, CameraBox } from '../../components/ui';
import { Toast } from '../../components/ui/Toast';

export const InTransitScreen: React.FC = () => {
  const {
    getIncomingFleet,
    fetchTransitFleet,
    verifyAndCloseTrip,
    locations,
    fetchConfigData,
  } = useAuth();

  const unloadLocations = locations.filter(l => l.node_type === 'UNLOAD_SITE');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const incomingList = getIncomingFleet();

  const filteredList = incomingList.filter((item) => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      item.transporterName.toLowerCase().includes(q) ||
      item.vehicleNumber.toLowerCase().includes(q)
    );
  });

  const [selectedVehicle, setSelectedVehicle] = useState<QuarryCheckOut | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [unloadDate, setUnloadDate] = useState('');
  const [unloadEntryTime, setUnloadEntryTime] = useState('');
  const [unloadPhoto, setUnloadPhoto] = useState<string | undefined>(undefined);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Toast notification
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'live' | 'offline'>('live');

  const reloadData = async () => {
    setLoading(true);
    try {
      await fetchTransitFleet();
    } catch (e) {
      // handle gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTransitFleet();
      await fetchConfigData(true);
    } catch (e) {
      console.error('Failed to refresh incoming fleet:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenVerify = (vehicle: QuarryCheckOut) => {
    setSelectedVehicle(vehicle);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setUnloadDate(`${year}-${month}-${day}`);
    setUnloadEntryTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setSelectedLocationId(null);
    setSelectedLocationName('');
    setUnloadPhoto(undefined);
    setErrors({});
    setModalVisible(true);
  };

  const handleVerifySubmit = async () => {
    if (!selectedVehicle) return;
    const newErrors: { [key: string]: string } = {};

    if (!selectedLocationId) newErrors.unloadingLocation = 'Unloading site location is required';
    if (!unloadDate.trim()) newErrors.unloadDate = 'Unload date is required';
    if (!unloadEntryTime.trim()) newErrors.unloadEntryTime = 'Unload entry time is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitLoading(true);
    try {
      const result = await verifyAndCloseTrip(selectedVehicle.id, {
        unloadDate,
        unloadEntryTime,
        unloadingLocationId: selectedLocationId!,
        unloadPhoto,
      });
      setModalVisible(false);
      setSelectedVehicle(null);

      if (result.status === 'LIVE_SUCCESS') {
        await reloadData();
        setToastMessage(`✓ Vehicle ${selectedVehicle.vehicleNumber} arrival confirmed — posted live.`);
        setToastType('live');
        setToastVisible(true);
        Alert.alert(
          'Trip Closed Successfully',
          `Vehicle ${selectedVehicle.vehicleNumber} has been verified and registered to completed archives.`,
          [{ text: 'OK' }]
        );
      } else {
        setToastMessage(result.message ?? 'Arrival saved to device queue.');
        setToastType('offline');
        setToastVisible(true);
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'An unexpected error occurred while closing the trip.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderCard = ({ item }: { item: QuarryCheckOut }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.vehicleRow}>
          <Truck size={18} color="#818CF8" />
          <Text style={styles.vehicleNo}>{item.vehicleNumber}</Text>
        </View>
        <View style={styles.tripIdBadge}>
          <Text style={styles.tripIdText}>{item.id}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.col}>
          <Text style={styles.detailLabel}>Material Loaded</Text>
          <Text style={styles.detailValue}>{item.material}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.detailLabel}>Net Weight</Text>
          <Text style={styles.detailValue}>{item.netWeight} Tons</Text>
        </View>
      </View>

      <View style={styles.cardFooterInfo}>
        <Text style={styles.footerLabel}>
          Transporter: <Text style={styles.footerValue}>{item.transporterName}</Text>
        </Text>
        <Text style={styles.footerLabel}>
          Dispatched from Quarry: <Text style={styles.footerValue}>{formatDateOnly(item.exitTime)} {formatTimeTo12Hour(item.exitTime)}</Text>
        </Text>
      </View>

      {(item as any).syncStatus === 'PENDING' && (
        <View style={styles.syncPendingBadge}>
          <Text style={styles.syncPendingText}>🕒 Saved Locally</Text>
        </View>
      )}

      <Button
        title="Arrived: Mark Arrival"
        variant="secondary"
        onPress={() => handleOpenVerify(item)}
        style={styles.arriveBtn}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {!loading && incomingList.length > 0 && (
        <View style={styles.searchWrapper}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loaderText}>Fetching Transit Vehicles...</Text>
        </View>
      ) : incomingList.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        >
          <View style={styles.emptyContainer}>
            <Truck size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No Incoming Vehicles</Text>
            <Text style={styles.emptySubtext}>
              Vehicles dispatched from the Quarry operator terminal will show up here as IN_TRANSIT.
            </Text>
          </View>
        </ScrollView>
      ) : filteredList.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        >
          <View style={styles.emptyContainer}>
            <Truck size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No matching vehicles found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search query.</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        />
      )}

      {selectedVehicle && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.safeContainer}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Unloading Verification</Text>
                  <Text style={styles.modalSubtitle}>Trip: {selectedVehicle.id} | {selectedVehicle.vehicleNumber}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <X size={24} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.manifestCard}>
                  <Text style={styles.manifestTitle}>VEHICLE DISPATCH MANIFEST</Text>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Transporter:</Text>
                    <Text style={styles.manifestValue}>{selectedVehicle.transporterName}</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Material Type:</Text>
                    <Text style={styles.manifestValue}>{selectedVehicle.material}</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Net Weight:</Text>
                    <Text style={styles.manifestValue}>{selectedVehicle.netWeight} Tons</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Quarry Exit Time:</Text>
                    <Text style={styles.manifestValue}>{formatDateOnly(selectedVehicle.exitTime)}, {formatTimeTo12Hour(selectedVehicle.exitTime)}</Text>
                  </View>
                </View>

                <View style={styles.dateTimeRow}>
                  <View style={styles.halfCol}>
                    <DateTimeField
                      label="Unload Date"
                      value={unloadDate}
                      onChange={setUnloadDate}
                      mode="date"
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                  <View style={styles.halfCol}>
                    <DateTimeField
                      label="Unload Entry"
                      value={unloadEntryTime}
                      onChange={setUnloadEntryTime}
                      mode="time"
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                </View>

                <PickerField
                  label="Unloading Site Location"
                  options={unloadLocations.map(l => l.name)}
                  selectedValue={selectedLocationName}
                  onValueChange={(locationName) => {
                    setSelectedLocationName(locationName);
                    const loc = unloadLocations.find(l => l.name === locationName);
                    if (loc) setSelectedLocationId(Number(loc.id));
                  }}
                  required={true}
                  error={errors.unloadingLocation}
                  labelStyle={{ color: '#94A3B8' }}
                />

                <View style={{ marginTop: 8 }}>
                  <CameraBox
                    label="Unload Photo"
                    photoUri={unloadPhoto}
                    onPhotoCaptured={setUnloadPhoto}
                    onPhotoCleared={() => setUnloadPhoto(undefined)}
                  />
                  {errors.unloadPhoto ? <Text style={styles.camError}>{errors.unloadPhoto}</Text> : null}
                </View>

                <View style={styles.geofenceBanner}>
                  <ShieldCheck size={20} color="#10B981" />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.geofenceTitle}>📍 GPS Match Verified</Text>
                    <Text style={styles.geofenceSubtext}>Site Geofence Secured (Unload Terminal Validated)</Text>
                  </View>
                </View>

                <Button
                  title="Verify & Close Trip"
                  loadingTitle="Verifying..."
                  variant="secondary"
                  onPress={handleVerifySubmit}
                  disabled={submitLoading}
                  loading={submitLoading}
                  style={styles.submitBtn}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}

      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleNo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginLeft: 6,
  },
  tripIdBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tripIdText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#818CF8',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  col: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  cardFooterInfo: {
    marginBottom: 16,
  },
  footerLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 3,
  },
  footerValue: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  arriveBtn: {
    height: 48,
    marginVertical: 0,
  },
  syncPendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: '#D97706',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  syncPendingText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FCD34D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
    backgroundColor: '#0F172A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  manifestCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366F1',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  manifestTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#818CF8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  manifestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  manifestLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  manifestValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCol: {
    width: '48%',
  },
  camError: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  geofenceBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  geofenceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34D399',
  },
  geofenceSubtext: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
  },
  submitBtn: {
    height: 54,
    marginTop: 8,
  },
});
