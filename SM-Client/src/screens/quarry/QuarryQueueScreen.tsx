import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth, QuarryCheckIn, formatTimeTo12Hour, formatDateOnly } from '../../context/AuthContext';
import { haversineDistance } from '../../utils/geo';

import { Truck, Compass, CheckCircle2, AlertTriangle, X } from 'lucide-react-native';
import { Button, Input, SegmentedControl, PickerField, DateTimeField, SearchBar, CameraBox } from '../../components/ui';
import { Toast } from '../../components/ui/Toast';

export const QuarryQueueScreen: React.FC = () => {
  const {
    getQuarryQueue,
    fetchQuarryQueue,
    checkOutVehicle,
    materials,
    wheelTypes,
    locations,
    fetchConfigData
  } = useAuth();

  // Filter only quarry locations
  const quarryLocations = locations.filter(l => l.node_type === 'QUARRY');

  // Active wait list from context
  const quarryList = getQuarryQueue();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered Quarry queue
  const filteredQuarryList = quarryList.filter((item) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      item.transporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());

    return matchSearch;
  });

  // Checkout Modal State
  const [selectedVehicle, setSelectedVehicle] = useState<QuarryCheckIn | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Form Field States for DB config IDs
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedWheelTypeId, setSelectedWheelTypeId] = useState<number | null>(null);

  // Form Field States
  const [exitTime, setExitTime] = useState('');
  const [transitType, setTransitType] = useState<'MANUAL' | 'DIGITAL'>('DIGITAL');
  const [govtStationaryNumber, setGovtStationaryNumber] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [amount, setAmount] = useState('');

  // Camera images
  const [transitFormPhoto, setTransitFormPhoto] = useState<string | undefined>(undefined);
  const [vehiclePhoto, setVehiclePhoto] = useState<string | undefined>(undefined);

  // GPS coordinates
  const [gpsCoordinates, setGpsCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState('Acquiring Lock...');
  const [geofenceStatus, setGeofenceStatus] = useState<'unknown' | 'inside' | 'outside'>('unknown');

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Toast notification
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'live' | 'offline'>('live');

  const loadQueue = async () => {
    setLoading(true);
    try {
      await fetchQuarryQueue();
    } catch (err: any) {
      Alert.alert('Load Failed', err.message || 'Failed to load the quarry queue. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchQuarryQueue();
      await fetchConfigData(true);
    } catch {
      // pull-to-refresh failure is visible via empty list; no alert needed
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // Load config tables if they haven't been loaded
    if (materials.length === 0 || wheelTypes.length === 0 || locations.length === 0) {
      fetchConfigData();
    }
  }, []);

  const acquireGpsLock = async (locationId?: number | null) => {
    setGpsLoading(true);
    setGpsCoordinates(null);
    setGeofenceStatus('unknown');
    setGpsStatusText('Requesting location permission...');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setGpsStatusText('Location access denied. GPS permission is required to dispatch.');
        setGpsLoading(false);
        return;
      }

      setGpsStatusText('Acquiring satellite lock...');
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = result.coords;
      setGpsCoordinates({ latitude, longitude });

      // Check against selected quarry location boundary
      const resolvedId = locationId ?? selectedLocationId;
      const targetLoc = locations.find(l => Number(l.id) === Number(resolvedId));

      if (targetLoc) {
        const distanceMeters = haversineDistance(
          latitude, longitude,
          Number(targetLoc.latitude), Number(targetLoc.longitude)
        );
        const allowedRadius = Number(targetLoc.allowed_radius_meters) || 500;

        if (distanceMeters <= allowedRadius) {
          setGeofenceStatus('inside');
          setGpsStatusText(`📍 GPS Locked — Inside Quarry Boundary (${Math.round(distanceMeters)}m from centre)`);
        } else {
          setGeofenceStatus('outside');
          setGpsStatusText(`⚠️ Outside Quarry Boundary — ${Math.round(distanceMeters)}m from site centre`);
        }
      } else {
        setGpsStatusText('📍 GPS Locked via Device API');
      }
    } catch {
      setGpsStatusText('Failed to acquire GPS lock. Please try again before dispatching.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleOpenCheckout = (vehicle: QuarryCheckIn) => {
    setSelectedVehicle(vehicle);

    // Auto-fill Exit Time with current local runtime
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setExitTime(`${hours}:${minutes}`);

    // Reset other fields
    setTransitType('DIGITAL');
    setGovtStationaryNumber('');
    setSelectedLocationId(null);
    setSelectedLocationName('');
    setSelectedMaterial('');
    setSelectedMaterialId(null);

    const activeWheels = wheelTypes.filter((w) => w.is_active !== false);
    const defaultWheel = activeWheels.find(w => w.wheel_count === 10) || activeWheels[0];
    if (defaultWheel) {
      setSelectedWheelTypeId(defaultWheel.id);
    } else {
      setSelectedWheelTypeId(null);
    }

    setNetWeight('');
    setAmount('');
    setTransitFormPhoto(undefined);
    setVehiclePhoto(undefined);
    setErrors({});
    setGeofenceStatus('unknown');
    setGpsCoordinates(null);
    setGpsStatusText('Acquiring Lock...');

    setModalVisible(true);
    acquireGpsLock(null);
  };

  const handleAmountChange = (text: string) => {
    const cleanNum = text.replace(/[^0-9]/g, '');
    if (!cleanNum) {
      setAmount('');
      return;
    }
    const parsed = parseInt(cleanNum, 10);
    const formatted = new Intl.NumberFormat('en-IN').format(parsed);
    setAmount(formatted);
  };

  const handleCheckoutSubmit = async () => {
    if (!selectedVehicle) return;

    const newErrors: { [key: string]: string } = {};

    if (!selectedLocationId) {
      newErrors.location = 'Dispatch Quarry Location is required';
    }

    if (!gpsCoordinates) {
      newErrors.gps = 'GPS lock is required. Enable location access and wait for lock before dispatching.';
    }

    if (transitType === 'DIGITAL') {
      if (!govtStationaryNumber.trim()) {
        newErrors.govtStationaryNumber = 'Govt Stationary Number is mandatory for Digital Transit';
      }
    }

    if (!exitTime.trim()) {
      newErrors.exitTime = 'Exit Time is required';
    }

    if (!selectedMaterialId) {
      newErrors.material = 'Material selection is required';
    }

    if (!selectedWheelTypeId) {
      newErrors.wheelType = 'Tyre configuration is required';
    }

    if (!netWeight.trim() || isNaN(Number(netWeight)) || Number(netWeight) <= 0) {
      newErrors.netWeight = 'Enter a valid numeric Net Weight (Tons)';
    }

    const cleanAmount = amount.replace(/,/g, '');
    if (amount.trim() && (isNaN(Number(cleanAmount)) || Number(cleanAmount) < 0)) {
      newErrors.amount = 'Enter a valid numeric Amount';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Verification Failed', 'Please fix form validation errors and verify camera captures before dispatch.');
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const result = await checkOutVehicle(selectedVehicle.id, {
        exitTime,
        transitType,
        govtStationaryNumber: transitType === 'DIGITAL' ? govtStationaryNumber.trim() : undefined,
        dispatchLocationId: selectedLocationId!,
        materialId: selectedMaterialId!,
        wheelTypeId: selectedWheelTypeId!,
        netWeight: Number(netWeight),
        amount: amount.trim() ? Number(cleanAmount) : 0,
        transitFormPhoto,
        vehiclePhoto,
        gpsCoordinates,
      });

      setModalVisible(false);
      setSelectedVehicle(null);

      if (result.status === 'LIVE_SUCCESS') {
        await loadQueue();
        setToastMessage(`✓ Vehicle ${selectedVehicle.vehicleNumber} dispatched — posted live.`);
        setToastType('live');
        setToastVisible(true);
        Alert.alert('Dispatch Confirmed', `Vehicle ${selectedVehicle.vehicleNumber} dispatched and status changed to IN_TRANSIT.`);
      } else {
        setLoading(false);
        setToastMessage(result.message ?? 'Dispatch saved to device queue.');
        setToastType('offline');
        setToastVisible(true);
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Checkout Failed', err.message || 'An unexpected error occurred during dispatch.');
    }
  };

  const renderVehicleCard = ({ item }: { item: QuarryCheckIn }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badge}>
          <Truck size={18} color="#818CF8" />
          <Text style={styles.vehicleNo}>{item.vehicleNumber}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {item.status === 'INSIDE_QUARRY' ? 'Inside Quarry' : item.status}
          </Text>
        </View>
      </View>

      {item.syncStatus === 'PENDING' && (
        <View style={styles.syncPendingBadge}>
          <Text style={styles.syncPendingText}>🕒 Saved Locally</Text>
        </View>
      )}

      <View style={styles.cardDetails}>
        <Text style={styles.detailLabel}>
          Transporter: <Text style={styles.detailValue}>{item.transporterName}</Text>
        </Text>
        <Text style={styles.detailLabel}>
          Checked-In: <Text style={styles.detailValue}>{formatDateOnly(item.entryTime)}, {formatTimeTo12Hour(item.entryTime)}</Text>
        </Text>
      </View>

      <Button
        title="Dispatch Vehicle"
        variant="outline"
        onPress={() => handleOpenCheckout(item)}
        style={styles.cardCheckoutBtn}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle}>Quarry Waiting Yard</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{filteredQuarryList.length} Vehicles Waiting</Text>
        </View>
      </View>

      {quarryList.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loaderText}>Loading Yard Records...</Text>
        </View>
      ) : quarryList.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        >
          <View style={styles.emptyContainer}>
            <Truck size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Yard is Clear</Text>
            <Text style={styles.emptySubtext}>New vehicles checked-in will appear here immediately.</Text>
          </View>
        </ScrollView>
      ) : filteredQuarryList.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        >
          <View style={styles.emptyContainer}>
            <Truck size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No matching vehicles found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search query or time range filter.</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredQuarryList}
          keyExtractor={(item) => item.id}
          renderItem={renderVehicleCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        />
      )}

      {/* Full Screen Check-Out Modal */}
      {selectedVehicle && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.safeContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Dispatch Vehicle (Quarry Check-Out)</Text>
                  <Text style={styles.modalSubtitle}>Dispatching {selectedVehicle.vehicleNumber}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(false)}
                  style={styles.closeModalBtn}
                >
                  <X size={24} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalFormContent} keyboardShouldPersistTaps="handled">
                {/* Vehicle Quick Info */}
                <View style={styles.summaryBar}>
                  <Text style={styles.summaryText}>
                    Transporter: <Text style={{ fontWeight: 'bold' }}>{selectedVehicle.transporterName}</Text> | In: <Text style={{ fontWeight: 'bold' }}>{formatTimeTo12Hour(selectedVehicle.entryTime)}</Text>
                  </Text>
                </View>

                {/* Dispatch Location Picker */}
                <PickerField
                  label="Dispatch Quarry Location"
                  options={quarryLocations.map(l => l.name)}
                  selectedValue={selectedLocationName}
                  onValueChange={(locationName) => {
                    setSelectedLocationName(locationName);
                    const loc = quarryLocations.find(l => l.name === locationName);
                    if (loc) {
                      setSelectedLocationId(Number(loc.id));
                      acquireGpsLock(Number(loc.id));
                    }
                  }}
                  required={true}
                  error={errors.location}
                  labelStyle={{ color: '#94A3B8' }}
                />

                {/* Exit Time (Editable) */}
                <DateTimeField
                  label="Exit Time"
                  value={exitTime}
                  onChange={setExitTime}
                  mode="time"
                  required={true}
                  labelStyle={{ color: '#94A3B8' }}
                />

                {/* Transit Type (Segmented control) */}
                <SegmentedControl
                  label="Transit Type"
                  values={['MANUAL', 'DIGITAL']}
                  selectedValue={transitType}
                  onValueChange={(val) => {
                    setTransitType(val as 'MANUAL' | 'DIGITAL');
                    setErrors((prev) => ({ ...prev, govtStationaryNumber: '' }));
                  }}
                  labelStyle={{ color: '#94A3B8' }}
                />

                {/* Govt Stationary Number - CONDITIONAL VALIDATION */}
                <Input
                  label="Govt Stationary Number"
                  placeholder="e.g. GOV-1234-X"
                  value={govtStationaryNumber}
                  onChangeText={setGovtStationaryNumber}
                  error={errors.govtStationaryNumber}
                  required={transitType === 'DIGITAL'}
                  isAlphanumeric={true}
                  labelStyle={{ color: '#94A3B8' }}
                />

                {/* Material Picker */}
                <PickerField
                  label="Material Loaded"
                  options={materials.map(m => m.display_name)}
                  selectedValue={selectedMaterial}
                  onValueChange={(matDisplayName) => {
                    setSelectedMaterial(matDisplayName);
                    const mat = materials.find(m => m.display_name === matDisplayName);
                    if (mat) {
                      setSelectedMaterialId(Number(mat.id));
                    }
                  }}
                  required={true}
                  error={errors.material}
                  labelStyle={{ color: '#94A3B8' }}
                />
 
                {/* Tyre Selector: Horizontal Buttons */}
                <View style={styles.formGroup}>
                  <Text style={styles.tyreLabel}>Vehicle Tyre Configuration</Text>
                  <View style={styles.tyreRow}>
                    {wheelTypes.filter((w) => w.is_active !== false).map((wheel) => {
                      const isSelected = selectedWheelTypeId === wheel.id;
                      return (
                        <TouchableOpacity
                          key={wheel.id}
                          activeOpacity={0.8}
                          onPress={() => setSelectedWheelTypeId(wheel.id)}
                          style={[
                            styles.tyreBtn,
                            isSelected ? styles.tyreBtnActive : null,
                          ]}
                        >
                          <Text style={[styles.tyreBtnText, isSelected ? styles.tyreBtnTextActive : null]}>
                            {wheel.display_label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.wheelType ? <Text style={styles.inlineError}>{errors.wheelType}</Text> : null}
                </View>
 
                {/* Net Weight and Amount */}
                <View style={styles.row}>
                  <View style={styles.halfCol}>
                    <Input
                      label="Net Weight (Tons)"
                      placeholder="e.g. 28.5"
                      value={netWeight}
                      onChangeText={setNetWeight}
                      keyboardType="numeric"
                      error={errors.netWeight}
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                  <View style={styles.halfCol}>
                    <Input
                      label="Amount (INR)"
                      placeholder="e.g. 1,45,000"
                      value={amount}
                      onChangeText={handleAmountChange}
                      keyboardType="numeric"
                      error={errors.amount}
                      required={false}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                </View>
 
                {/* Hardware Security: Cameras */}
                <View style={styles.cameraRow}>
                  <View style={styles.cameraCol}>
                    <CameraBox
                      label="Transit Form"
                      photoUri={transitFormPhoto}
                      onPhotoCaptured={setTransitFormPhoto}
                      onPhotoCleared={() => setTransitFormPhoto(undefined)}
                    />
                    {errors.transitFormPhoto ? <Text style={styles.camError}>{errors.transitFormPhoto}</Text> : null}
                  </View>
                  <View style={styles.cameraCol}>
                    <CameraBox
                      label="Vehicle Photo"
                      photoUri={vehiclePhoto}
                      onPhotoCaptured={setVehiclePhoto}
                      onPhotoCleared={() => setVehiclePhoto(undefined)}
                    />
                    {errors.vehiclePhoto ? <Text style={styles.camError}>{errors.vehiclePhoto}</Text> : null}
                  </View>
                </View>
 
                {/* Hardware Security: GPS lock */}
                <View style={[
                  styles.gpsReadoutBox,
                  gpsCoordinates
                    ? (geofenceStatus === 'outside' ? styles.gpsOutside : styles.gpsLocked)
                    : styles.gpsLocking,
                ]}>
                  <Compass
                    size={20}
                    color={gpsCoordinates ? (geofenceStatus === 'outside' ? '#F59E0B' : '#10B981') : '#64748B'}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.gpsReadoutText,
                      gpsCoordinates
                        ? (geofenceStatus === 'outside' ? styles.gpsTextOutside : styles.gpsTextLocked)
                        : styles.gpsTextLocking,
                    ]}>
                      {gpsStatusText}
                    </Text>
                    {gpsCoordinates && (
                      <Text style={[
                        styles.gpsCoordinatesDetail,
                        geofenceStatus === 'outside' ? { color: '#FCD34D' } : null,
                      ]}>
                        {gpsCoordinates.latitude.toFixed(6)}° N, {gpsCoordinates.longitude.toFixed(6)}° E
                      </Text>
                    )}
                  </View>
                </View>

                {/* Geofence violation warning banner */}
                {geofenceStatus === 'outside' && (
                  <View style={styles.geofenceWarningBanner}>
                    <AlertTriangle size={16} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.geofenceWarningText}>
                      Trip flagged: dispatch location is outside the authorised quarry boundary. The server will validate and may reject this dispatch.
                    </Text>
                  </View>
                )}

                {/* GPS error if coordinates not acquired before submit */}
                {errors.gps ? (
                  <Text style={styles.inlineError}>{errors.gps}</Text>
                ) : null}
 
                {/* Final dispatch button */}
                <Button
                  title="Confirm & Dispatch Vehicle"
                  loadingTitle="Dispatching..."
                  variant="secondary"
                  onPress={handleCheckoutSubmit}
                  disabled={loading}
                  loading={loading}
                  style={styles.dispatchBtn}
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
    padding: 16,
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  boardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  counterBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366F1',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#818CF8',
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleNo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginLeft: 6,
  },
  statusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#D97706',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  cardDetails: {
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  detailValue: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  cardCheckoutBtn: {
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
    fontWeight: '600',
    color: '#FCD34D',
  },
  // Loader styles
  loaderContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty queue styles
  emptyContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 4,
    paddingHorizontal: 32,
  },
  // Modal layout styles
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
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
  closeModalBtn: {
    padding: 8,
  },
  modalFormContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryBar: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  tyreLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tyreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tyreBtn: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: '#0F172A',
  },
  tyreBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  tyreBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  tyreBtnTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCol: {
    width: '48%',
  },
  cameraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cameraCol: {
    flex: 1,
  },
  inlineError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  camError: {
    color: '#EF4444',
    fontSize: 11,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  // GPS Locked Box Styles
  gpsReadoutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  gpsLocking: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderColor: '#475569',
  },
  gpsLocked: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  gpsOutside: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#D97706',
  },
  gpsReadoutText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  gpsTextLocking: {
    color: '#94A3B8',
  },
  gpsTextLocked: {
    color: '#34D399',
  },
  gpsTextOutside: {
    color: '#FCD34D',
  },
  gpsCoordinatesDetail: {
    fontSize: 11,
    color: '#34D399',
    marginTop: 2,
    fontWeight: '600',
  },
  geofenceWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#DC2626',
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 10,
    marginTop: -8,
    marginBottom: 8,
  },
  geofenceWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 17,
  },
  dispatchBtn: {
    height: 54, // Large high-contrast touch target
    marginTop: 8,
  },
});
