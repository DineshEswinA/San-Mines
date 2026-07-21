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
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, QuarryCheckOut, UnloadVerification, formatTimeTo12Hour, formatDateOnly } from '../../context/AuthContext';

import { Truck, CheckCircle2, ShieldCheck, MapPin, X, History, Route } from 'lucide-react-native';
import { SearchBar, Button, Input, DateTimeField, PickerField, CameraBox } from '../../components/ui';

export const IncomingFleetScreen: React.FC = () => {
  const {
    getIncomingFleet,
    fetchIncomingFleet,
    verifyAndCloseTrip,
    getCompletedArchives,
    locations,
    fetchConfigData
  } = useAuth();

  const unloadLocations = locations.filter(l => l.node_type === 'UNLOAD_SITE');

  const [activeSubTab, setActiveSubTab] = useState<'incoming' | 'history'>('incoming');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const incomingList = getIncomingFleet();
  const historyList = getCompletedArchives();

  const filteredIncomingList = incomingList.filter((item) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      item.transporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const filteredHistoryList = historyList.filter((item) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      item.transporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  // Verification Form Modal State
  const [selectedLorry, setSelectedLorry] = useState<QuarryCheckOut | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Detail Viewer Modal State
  const [detailLorry, setDetailLorry] = useState<UnloadVerification | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Form Fields
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [unloadDate, setUnloadDate] = useState('');
  const [unloadEntryTime, setUnloadEntryTime] = useState('');
  const [unloadPhoto, setUnloadPhoto] = useState<string | undefined>(undefined);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [refreshing, setRefreshing] = useState(false);

  const reloadData = async () => {
    setLoading(true);
    try {
      await fetchIncomingFleet();
    } catch (e) {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchIncomingFleet();
      await fetchConfigData(true);
    } catch (e) {
      console.error('Failed to refresh incoming fleet data:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    reloadData();
    if (locations.length === 0) {
      fetchConfigData();
    }
  }, []);

  const handleOpenVerify = (lorry: QuarryCheckOut) => {
    setSelectedLorry(lorry);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const entryHours = String(now.getHours()).padStart(2, '0');
    const entryMinutes = String(now.getMinutes()).padStart(2, '0');

    setUnloadDate(dateStr);
    setUnloadEntryTime(`${entryHours}:${entryMinutes}`);
    setSelectedLocationId(null);
    setSelectedLocationName('');
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitLoading(true);

    try {
      await verifyAndCloseTrip(selectedLorry.id, {
        unloadDate,
        unloadEntryTime,
        unloadingLocationId: selectedLocationId!,
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
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderIncomingCard = ({ item }: { item: QuarryCheckOut }) => (
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
          <CheckCircle2 size={16} color="#10B981" />
          <Text style={styles.historyVehicleNo}>{item.vehicleNumber}</Text>
        </View>
        <View style={styles.historyStatusBadge}>
          <Text style={styles.historyStatusText}>CLOSED</Text>
        </View>
      </View>

      <View style={styles.historyDetails}>
        <Text style={styles.historyText}>
          Trip ID: <Text style={{ fontWeight: 'bold', color: '#F8FAFC' }}>{item.id}</Text> | {item.material} ({item.netWeight}T)
        </Text>
        <Text style={styles.historyText}>
          Unloaded at: <Text style={{ fontWeight: '600', color: '#F8FAFC' }}>{item.unloadingLocation}</Text>
        </Text>
        <Text style={styles.historyText}>
          Close Time: <Text style={{ fontWeight: '600', color: '#F8FAFC' }}>{item.unloadDate} {item.unloadExitTime}</Text>
        </Text>
      </View>

      <Button
        title="View Details"
        variant="outline"
        onPress={() => {
          setDetailLorry(item);
          setDetailModalVisible(true);
        }}
        style={{ marginTop: 10, height: 40 }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* SearchBar Filter */}
      {!loading && (
        ((activeSubTab === 'incoming' && incomingList.length > 0) ||
          (activeSubTab === 'history' && historyList.length > 0)) && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loaderText}>Fetching Transit Cargo...</Text>
        </View>
      ) : activeSubTab === 'incoming' ? (
        incomingList.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
            }
          >
            <View style={styles.emptyContainer}>
              <Truck size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No Incoming Cargo</Text>
              <Text style={styles.emptySubtext}>
                Vehicles dispatched from the Quarry operator terminal will show up here as IN_TRANSIT.
              </Text>
            </View>
          </ScrollView>
        ) : filteredIncomingList.length === 0 ? (
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
            data={filteredIncomingList}
            keyExtractor={(item) => item.id}
            renderItem={renderIncomingCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
            }
          />
        )
      ) : historyList.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        >
          <View style={styles.emptyContainer}>
            <History size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No Completed Trips</Text>
            <Text style={styles.emptySubtext}>
              Verified offloads will appear in this historical archive.
            </Text>
          </View>
        </ScrollView>
      ) : filteredHistoryList.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        >
          <View style={styles.emptyContainer}>
            <History size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No matching vehicles found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search query.</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredHistoryList}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Unloading Verification</Text>
                  <Text style={styles.modalSubtitle}>Trip: {selectedLorry.id} | {selectedLorry.vehicleNumber}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={24} color="#F8FAFC" />
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
                    <Text style={styles.manifestValue}>{formatDateOnly(selectedLorry.exitTime)} {formatTimeTo12Hour(selectedLorry.exitTime)}</Text>
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
                  labelStyle={{ color: '#94A3B8' }}
                />
                {errors.unloadingLocation ? <Text style={styles.inlineError}>{errors.unloadingLocation}</Text> : null}

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
                  <ShieldCheck size={20} color="#10B981" />
                  <View style={styles.geofenceTextContainer}>
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
                  style={styles.submitVerifyBtn}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Detail Viewer Modal */}
      {detailLorry && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={detailModalVisible}
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Trip Offload Details</Text>
                  <Text style={styles.modalSubtitle}>Trip ID: {detailLorry.id} | {detailLorry.vehicleNumber}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setDetailModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={20} color="#F1F5F9" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.manifestCard}>
                  <Text style={styles.manifestTitle}>CARGO DISPATCH MANIFEST</Text>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Transporter:</Text>
                    <Text style={styles.manifestValue}>{detailLorry.transporterName}</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Material Type:</Text>
                    <Text style={styles.manifestValue}>{detailLorry.material}</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Tyre Configuration:</Text>
                    <Text style={styles.manifestValue}>{detailLorry.tyres} Wheeler Lorry</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Net Weight:</Text>
                    <Text style={styles.manifestValue}>{detailLorry.netWeight} Tons</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Quarry Exit Time:</Text>
                    <Text style={styles.manifestValue}>{formatDateOnly(detailLorry.exitTime)} {formatTimeTo12Hour(detailLorry.exitTime)}</Text>
                  </View>
                </View>

                <View style={styles.summaryBar}>
                  <Text style={[styles.summaryText, { textAlign: 'left', fontWeight: 'bold', marginBottom: 6, color: '#F8FAFC' }]}>
                    UNLOADING LOG
                  </Text>
                  <Text style={styles.summaryText}>Unloading Location: {detailLorry.unloadingLocation}</Text>
                  <Text style={styles.summaryText}>Unload Entry Time: {detailLorry.unloadDate} {detailLorry.unloadEntryTime}</Text>
                  <Text style={styles.summaryText}>Unload Exit Time: {detailLorry.unloadDate} {detailLorry.unloadExitTime}</Text>
                </View>

                {detailLorry.unloadPhoto && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.detailLabel, { marginBottom: 6 }]}>Security Offload Verification Photo</Text>
                    <View style={styles.detailPhotoContainer}>
                      <Image source={{ uri: detailLorry.unloadPhoto }} style={styles.detailPhoto} />
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Tab Switcher inside Unloading workspace (Bottom placement) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveSubTab('incoming');
            reloadData();
          }}
          style={[styles.tabItem, activeSubTab === 'incoming' ? styles.tabItemActive : null]}
        >
          <Route size={20} color={activeSubTab === 'incoming' ? '#818CF8' : '#6B7280'} />
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
          <History size={20} color={activeSubTab === 'history' ? '#818CF8' : '#6B7280'} />
          <Text style={[styles.tabText, activeSubTab === 'history' ? styles.tabTextActive : null]}>
            Unload Archive ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1.5,
    borderTopColor: '#334155',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {},
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#818CF8',
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
  historyCard: {
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    opacity: 0.9,
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
  historyVehicleNo: {
    fontSize: 16,
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
  historyStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#34D399',
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
  cardArriveBtn: {
    height: 48,
    marginVertical: 0,
  },
  historyDetails: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  historyText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 3,
  },
  // Empty states
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
  // Modal layout
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
  cameraContainer: {
    marginTop: 8,
  },
  camError: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  geofenceAlertBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    borderWidth: 1.5,
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
    color: '#34D399',
  },
  geofenceSubtext: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
  },
  submitVerifyBtn: {
    height: 54, // Large high-contrast touch target
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    elevation: 5,
    overflow: 'hidden',
  },
  modalBody: {
    padding: 20,
  },
  inlineError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    fontWeight: 'bold',
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
  },
  detailPhotoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  detailPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
