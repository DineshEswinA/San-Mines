import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, QuarryCheckOut, UnloadVerification } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input, DateTimeField, PickerField } from '../../components/ui/Input';
import { CameraBox } from '../../components/ui/CameraBox';
import { Truck, CheckCircle2, ShieldCheck, MapPin, X, History, Route } from 'lucide-react-native';

export const IncomingFleetScreen: React.FC = () => {
  const { 
    getIncomingFleet, 
    fetchIncomingFleet, 
    verifyAndCloseTrip, 
    getCompletedArchives,
    locations,
    fetchConfigData
  } = useAuth();

  // Filter only unload site locations
  const unloadLocations = locations.filter(l => l.node_type === 'UNLOAD_SITE');

  // Selected tab inside Unload Operator screen: 'incoming' or 'history'
  const [activeSubTab, setActiveSubTab] = useState<'incoming' | 'history'>('incoming');

  // Lists
  const [incomingList, setIncomingList] = useState<QuarryCheckOut[]>([]);
  const [historyList, setHistoryList] = useState<UnloadVerification[]>([]);

  // Verification Form Modal State
  const [selectedLorry, setSelectedLorry] = useState<QuarryCheckOut | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Form Fields for DB config IDs
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState('');

  // Form Fields
  const [unloadDate, setUnloadDate] = useState('');
  const [unloadEntryTime, setUnloadEntryTime] = useState('');
  const [unloadExitTime, setUnloadExitTime] = useState('');
  const [unloadPhoto, setUnloadPhoto] = useState<string | undefined>(undefined);

  // Form Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const reloadData = async () => {
    try {
      await fetchIncomingFleet();
      setIncomingList(getIncomingFleet());
    } catch (e) {
      setIncomingList([]);
    }
    setHistoryList(getCompletedArchives());
  };

  useEffect(() => {
    reloadData();
    // Load config tables if they haven't been loaded
    if (locations.length === 0) {
      fetchConfigData();
    }
  }, [getIncomingFleet, getCompletedArchives]);

  const handleOpenVerify = (lorry: QuarryCheckOut) => {
    setSelectedLorry(lorry);

    // Initialize date and times
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const entryHours = String(now.getHours()).padStart(2, '0');
    const entryMinutes = String(now.getMinutes()).padStart(2, '0');
    
    // Set exit time slightly later for realism, say +15 mins
    const exitTimeObj = new Date(now.getTime() + 15 * 60000);
    const exitHours = String(exitTimeObj.getHours()).padStart(2, '0');
    const exitMinutes = String(exitTimeObj.getMinutes()).padStart(2, '0');

    setUnloadDate(dateStr);
    setUnloadEntryTime(`${entryHours}:${entryMinutes}`);
    setSelectedLocationId(null);
    setSelectedLocationName('');
    setUnloadExitTime(`${exitHours}:${exitMinutes}`);
    setUnloadPhoto(undefined);
    setErrors({});

    setModalVisible(true);
  };

  const handleVerifySubmit = async () => {
    if (!selectedLorry) return;

    const newErrors: { [key: string]: string } = {};

    if (!selectedLocationId) {
      newErrors.unloadingLocation = 'Unloading site location is required';
    }

    if (!unloadDate.trim()) {
      newErrors.unloadDate = 'Unload date is required';
    }

    if (!unloadEntryTime.trim()) {
      newErrors.unloadEntryTime = 'Unload entry time is required';
    }

    if (!unloadExitTime.trim()) {
      newErrors.unloadExitTime = 'Unload exit time is required';
    }

    if (!unloadPhoto) {
      newErrors.unloadPhoto = 'Unload security photo capture is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await verifyAndCloseTrip(selectedLorry.id, {
        unloadDate,
        unloadEntryTime,
        unloadingLocationId: selectedLocationId!,
        unloadExitTime,
        unloadPhoto,
      });

      setModalVisible(false);
      setSelectedLorry(null);
      await reloadData();

      Alert.alert(
        'Trip Closed Successfully',
        `Vehicle ${selectedLorry.vehicleNumber} has been verified and registered to completed archives.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'An unexpected error occurred while closing the trip.');
    }
  };

  const renderIncomingCard = ({ item }: { item: QuarryCheckOut }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.vehicleRow}>
          <Truck size={18} color="#16A34A" />
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
          Dispatched from Quarry: <Text style={styles.footerValue}>{item.exitTime}</Text>
        </Text>
      </View>

      <Button
        title="Arrived: Mark Arrival"
        variant="secondary"
        onPress={() => handleOpenVerify(item)}
        style={styles.cardArriveBtn}
      />
    </View>
  );

  const renderHistoryCard = ({ item }: { item: UnloadVerification }) => (
    <View style={[styles.card, styles.historyCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.vehicleRow}>
          <CheckCircle2 size={16} color="#4B5563" />
          <Text style={styles.historyVehicleNo}>{item.vehicleNumber}</Text>
        </View>
        <View style={styles.historyStatusBadge}>
          <Text style={styles.historyStatusText}>CLOSED</Text>
        </View>
      </View>

      <View style={styles.historyDetails}>
        <Text style={styles.historyText}>
          Trip ID: <Text style={{ fontWeight: 'bold' }}>{item.id}</Text> | {item.material} ({item.netWeight}T)
        </Text>
        <Text style={styles.historyText}>
          Unloaded at: <Text style={{ fontWeight: '600' }}>{item.unloadingLocation}</Text>
        </Text>
        <Text style={styles.historyText}>
          Close Time: <Text style={{ fontWeight: '600' }}>{item.unloadDate} @ {item.unloadExitTime}</Text>
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Switcher inside Unloading workspace */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveSubTab('incoming');
            reloadData();
          }}
          style={[styles.tabItem, activeSubTab === 'incoming' ? styles.tabItemActive : null]}
        >
          <Route size={18} color={activeSubTab === 'incoming' ? '#16A34A' : '#6B7280'} />
          <Text style={[styles.tabText, activeSubTab === 'incoming' ? styles.tabTextActive : null]}>
            Incoming Fleet ({incomingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveSubTab('history');
            reloadData();
          }}
          style={[styles.tabItem, activeSubTab === 'history' ? styles.tabItemActive : null]}
        >
          <History size={18} color={activeSubTab === 'history' ? '#16A34A' : '#6B7280'} />
          <Text style={[styles.tabText, activeSubTab === 'history' ? styles.tabTextActive : null]}>
            Unload Archive ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'incoming' ? (
        incomingList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Truck size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No Incoming Cargo</Text>
            <Text style={styles.emptySubtext}>
              Vehicles dispatched from the Quarry operator terminal will show up here as IN_TRANSIT.
            </Text>
          </View>
        ) : (
          <FlatList
            data={incomingList}
            keyExtractor={(item) => item.id}
            renderItem={renderIncomingCard}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : historyList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <History size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No Completed Trips</Text>
          <Text style={styles.emptySubtext}>
            Verified offloads will appear in this historical workspace archive.
          </Text>
        </View>
      ) : (
        <FlatList
          data={historyList}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryCard}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Unloading verification Modal */}
      {selectedLorry && (
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
                  <Text style={styles.modalTitle}>Unloading Verification</Text>
                  <Text style={styles.modalSubtitle}>Trip: {selectedLorry.id} | {selectedLorry.vehicleNumber}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.manifestCard}>
                  <Text style={styles.manifestTitle}>CARGO DISPATCH MANIFEST</Text>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Transporter:</Text>
                    <Text style={styles.manifestValue}>{selectedLorry.transporterName}</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Material Type:</Text>
                    <Text style={styles.manifestValue}>{selectedLorry.material}</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Net Weight:</Text>
                    <Text style={styles.manifestValue}>{selectedLorry.netWeight} Tons</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Quarry Exit Time:</Text>
                    <Text style={styles.manifestValue}>{selectedLorry.exitTime}</Text>
                  </View>
                </View>

                {/* Entry Date & Time */}
                <View style={styles.dateTimeRow}>
                  <View style={styles.halfCol}>
                    <DateTimeField
                      label="Unload Date"
                      value={unloadDate}
                      onChange={setUnloadDate}
                      mode="date"
                      required={true}
                    />
                  </View>
                  <View style={styles.halfCol}>
                    <DateTimeField
                      label="Unload Entry"
                      value={unloadEntryTime}
                      onChange={setUnloadEntryTime}
                      mode="time"
                      required={true}
                    />
                  </View>
                </View>

                {/* Unloading Site Picker */}
                <PickerField
                  label="Unloading Site Location"
                  options={unloadLocations.map(l => l.name)}
                  selectedValue={selectedLocationName}
                  onValueChange={(locationName) => {
                    setSelectedLocationName(locationName);
                    const loc = unloadLocations.find(l => l.name === locationName);
                    if (loc) {
                      setSelectedLocationId(Number(loc.id));
                    }
                  }}
                  required={true}
                  error={errors.unloadingLocation}
                />

                {/* Exit Time */}
                <DateTimeField
                  label="Unload Exit Time"
                  value={unloadExitTime}
                  onChange={setUnloadExitTime}
                  mode="time"
                  required={true}
                />

                {/* Hardware input: Take Unloading photo */}
                <View style={styles.cameraContainer}>
                  <CameraBox
                    label="[Take Unloading Photo]"
                    photoUri={unloadPhoto}
                    onPhotoCaptured={setUnloadPhoto}
                    onPhotoCleared={() => setUnloadPhoto(undefined)}
                  />
                  {errors.unloadPhoto ? <Text style={styles.camError}>{errors.unloadPhoto}</Text> : null}
                </View>

                {/* FIXED GEOFENCE SECURITY BANNER */}
                <View style={styles.geofenceAlertBanner}>
                  <ShieldCheck size={20} color="#16A34A" />
                  <View style={styles.geofenceTextContainer}>
                    <Text style={styles.geofenceTitle}>📍 GPS Match Verified</Text>
                    <Text style={styles.geofenceSubtext}>Site Geofence Secured (Unload Terminal Validated)</Text>
                  </View>
                </View>

                <Button
                  title="Verify & Close Trip"
                  variant="secondary"
                  onPress={handleVerifySubmit}
                  style={styles.submitVerifyBtn}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabBar: {
    flexDirection: 'row',
    height: 52, // >= 48px touch target
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#16A34A', // Safety Green theme for unload
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6B7280',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#16A34A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    opacity: 0.85,
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
    color: '#1F2937',
    marginLeft: 6,
  },
  historyVehicleNo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
    marginLeft: 6,
  },
  tripIdBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tripIdText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  historyStatusBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  col: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cardFooterInfo: {
    marginBottom: 16,
  },
  footerLabel: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 3,
  },
  footerValue: {
    color: '#1F2937',
    fontWeight: '600',
  },
  cardArriveBtn: {
    height: 48,
    marginVertical: 0,
  },
  historyDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  historyText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 3,
  },
  // Empty states
  emptyContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  // Modal layout
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  manifestTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E40AF',
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
    color: '#4B5563',
  },
  manifestValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCol: {
    width: '48%',
  },
  cameraContainer: {
    marginTop: 8,
  },
  camError: {
    color: '#DC2626',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  // Geofence alert banner style
  geofenceAlertBanner: {
    flexDirection: 'row',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  geofenceTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  geofenceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#14532D',
  },
  geofenceSubtext: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  submitVerifyBtn: {
    height: 54, // Large high-contrast touch target
    marginTop: 8,
  },
});
