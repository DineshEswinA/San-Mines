import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth, formatTimeTo12Hour, formatDateOnly } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { SearchBar } from '../../components/ui';
import { Truck, X, Clock, Calendar, ShieldCheck, ShieldAlert, User, Image as ImageIcon } from 'lucide-react-native';

// Helper function to calculate distance using Haversine formula
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

export const LiveLedgerScreen: React.FC = () => {
  const { locations, materials, fetchConfigData } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'INSIDE' | 'TRANSIT' | 'COMPLETED' | 'FLAGGED'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  // Supervisor modal detail state
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ImageViewer modal state for zoom inspection
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      await fetchConfigData();
      const tripsRes = await api.getTrips();
      const usersRes = await api.getUsers();

      if (tripsRes.data && tripsRes.data.trips) {
        setTrips(tripsRes.data.trips);
      }
      if (usersRes.data) {
        setProfiles(usersRes.data);
      }
    } catch (err: any) {
      Alert.alert('Load Error', 'Failed to retrieve logs from backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (err) {
      console.error('Failed to refresh ledger:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper profile resolver
  const getProfileEmail = (id: string | null) => {
    if (!id) return 'Unassigned';
    const prof = profiles.find((p) => p.id === id);
    return prof ? prof.email : 'Unknown Operator';
  };

  // Helper geofence breach analyzer
  const analyzeGeofenceBreach = (trip: any) => {
    if (trip.quarryGpsLat && trip.quarryGpsLong && trip.dispatchLocationId) {
      const loc = locations.find((l) => Number(l.id) === Number(trip.dispatchLocationId));
      if (loc) {
        const dist = getDistance(
          Number(trip.quarryGpsLat),
          Number(trip.quarryGpsLong),
          Number(loc.latitude),
          Number(loc.longitude)
        );
        return dist > Number(loc.allowed_radius_meters || 100);
      }
    }
    return false;
  };

  // Filtering Logic
  const filteredTrips = trips.filter((trip) => {
    // Alphanumeric plate filter
    const matchesSearch =
      searchQuery.trim() === '' ||
      trip.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.transporterName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Quick Pill Filter
    if (activeFilter === 'INSIDE') {
      return trip.status === 'INSIDE_QUARRY';
    }
    if (activeFilter === 'TRANSIT') {
      return trip.status === 'IN_TRANSIT';
    }
    if (activeFilter === 'COMPLETED') {
      return trip.status === 'UNLOADED';
    }
    if (activeFilter === 'FLAGGED') {
      return analyzeGeofenceBreach(trip);
    }

    return true;
  });

  const renderBadge = (trip: any) => {
    const isBreached = analyzeGeofenceBreach(trip);
    if (isBreached) {
      return (
        <View style={[styles.badge, styles.badgeRed]}>
          <ShieldAlert size={12} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, styles.textRed]}>Breach</Text>
        </View>
      );
    }

    switch (trip.status) {
      case 'INSIDE_QUARRY':
        return (
          <View style={[styles.badge, styles.badgeYellow]}>
            <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, styles.textYellow]}>Inside Quarry</Text>
          </View>
        );
      case 'IN_TRANSIT':
        return (
          <View style={[styles.badge, styles.badgeBlue]}>
            <Truck size={12} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, styles.textBlue]}>In Transit</Text>
          </View>
        );
      case 'UNLOADED':
        return (
          <View style={[styles.badge, styles.badgeGreen]}>
            <ShieldCheck size={12} color="#059669" style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, styles.textGreen]}>Completed</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const getMaterialName = (id: number | null) => {
    if (!id) return 'Raw Aggregate';
    const mat = materials.find((m) => Number(m.id) === Number(id));
    return mat ? mat.display_name : `Material #${id}`;
  };

  const getLocationName = (id: number | null) => {
    if (!id) return 'Not Dispatched';
    const loc = locations.find((l) => Number(l.id) === Number(id));
    return loc ? loc.name : `Location #${id}`;
  };

  const formatEpoch = (epoch: any) => {
    if (!epoch) return 'N/A';
    const num = Number(epoch);
    if (isNaN(num)) return 'N/A';
    return `${formatDateOnly(num)} ${formatTimeTo12Hour(num)}`;
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by Vehicle / Transporter..."
        />

        {/* Quick-pill Filters */}
        <View style={styles.filterStrip}>
          <TouchableOpacity
            style={[styles.pill, activeFilter === 'ALL' && styles.pillActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.pillText, activeFilter === 'ALL' && styles.pillTextActive]}>
              Show All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, activeFilter === 'INSIDE' && styles.pillActive]}
            onPress={() => setActiveFilter('INSIDE')}
          >
            <Text style={[styles.pillText, activeFilter === 'INSIDE' && styles.pillTextActive]}>
              Inside Quarry
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, activeFilter === 'TRANSIT' && styles.pillActive]}
            onPress={() => setActiveFilter('TRANSIT')}
          >
            <Text style={[styles.pillText, activeFilter === 'TRANSIT' && styles.pillTextActive]}>
              In Transit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, activeFilter === 'COMPLETED' && styles.pillActive]}
            onPress={() => setActiveFilter('COMPLETED')}
          >
            <Text style={[styles.pillText, activeFilter === 'COMPLETED' && styles.pillTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, activeFilter === 'FLAGGED' && styles.pillActiveFlagged]}
            onPress={() => setActiveFilter('FLAGGED')}
          >
            <Text style={[styles.pillText, activeFilter === 'FLAGGED' && styles.pillTextActiveFlagged]}>
              Flagged Only
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trips flat list */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => {
                setSelectedTrip(item);
                setModalVisible(true);
              }}
            >
              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.tripId}>#TRP-{item.id}</Text>
                  <Text style={styles.vehicleNo}>{item.vehicleNumber}</Text>
                </View>
                {renderBadge(item)}
              </View>

              <View style={styles.divider} />

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Transporter:</Text>
                  <Text style={styles.value}>{item.transporterName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Material:</Text>
                  <Text style={styles.value}>{getMaterialName(item.materialId)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Dispatch Node:</Text>
                  <Text style={styles.value}>{getLocationName(item.dispatchLocationId)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transaction records matched the active filter.</Text>
            </View>
          }
        />
      )}

      {/* un-bypassable Supervisor Modal */}
      {selectedTrip && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>SUPERVISOR SECURITY AUDIT</Text>
                  <Text style={styles.modalSubtitle}>Trip ID: #TRP-{selectedTrip.id} | {selectedTrip.vehicleNumber}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={22} color="#F1F5F9" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                {/* 1. Geofence Check Area */}
                {analyzeGeofenceBreach(selectedTrip) ? (
                  <View style={styles.alertBanner}>
                    <ShieldAlert size={20} color="#F87171" style={{ marginRight: 10 }} />
                    <Text style={styles.alertText}>
                      WARNING: Check-out GPS coordinates exceed the permitted allowed radius limit from dispatch station boundary.
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.alertBanner, styles.alertBannerGreen]}>
                    <ShieldCheck size={20} color="#34D399" style={{ marginRight: 10 }} />
                    <Text style={[styles.alertText, styles.textGreen]}>
                      SECURITY CHECK: Geofence coordinates valid and inside bounds at check-out.
                    </Text>
                  </View>
                )}

                {/* 2. Cross-Phase Timeline Logs */}
                <Text style={styles.sectionTitle}>Cross-Phase Timeline Logs</Text>
                <View style={styles.timelineContainer}>
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelinePhase}>Phase 1: Inbound Entry</Text>
                      <Text style={styles.timelineTime}>{formatEpoch(selectedTrip.quarryEntryTime)}</Text>
                      <Text style={styles.timelineUser}>Operator: {getProfileEmail(selectedTrip.quarryOperatorId)}</Text>
                    </View>
                  </View>

                  <View style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelinePhase}>Phase 2: Outbound Checkout</Text>
                      <Text style={styles.timelineTime}>{formatEpoch(selectedTrip.quarryExitTime)}</Text>
                      <Text style={styles.timelineUser}>Operator: {getProfileEmail(selectedTrip.quarryOperatorId)}</Text>
                      <Text style={styles.timelineDetail}>Govt Code: {selectedTrip.govtStationaryNumber || 'N/A'}</Text>
                      <Text style={styles.timelineDetail}>Net Weight: {selectedTrip.netWeightTonne ? `${selectedTrip.netWeightTonne} Tons` : 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, !selectedTrip.unloadEntryTime && styles.dotPending]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelinePhase}>Phase 3: Unload Verify</Text>
                      <Text style={styles.timelineTime}>{formatEpoch(selectedTrip.unloadEntryTime)}</Text>
                      <Text style={styles.timelineUser}>Operator: {getProfileEmail(selectedTrip.unloadOperatorId)}</Text>
                      <Text style={styles.timelineDetail}>Unloaded Location: {getLocationName(selectedTrip.unloadingLocationId)}</Text>
                    </View>
                  </View>
                </View>

                {/* 3. Photo Captures */}
                <Text style={styles.sectionTitle}>Security Photograph Logs</Text>
                <View style={styles.photosGrid}>
                  {/* Photo 1: Inbound / Lorry Photo */}
                  <TouchableOpacity
                    style={styles.photoBox}
                    onPress={() => {
                      if (selectedTrip.lorryPhotoUrl) {
                        setViewerPhotoUrl(selectedTrip.lorryPhotoUrl);
                      } else {
                        Alert.alert('Not Found', 'No Lorry photo uploaded.');
                      }
                    }}
                  >
                    {selectedTrip.lorryPhotoUrl ? (
                      <Image source={{ uri: selectedTrip.lorryPhotoUrl }} style={styles.thumbnail} />
                    ) : (
                      <View style={styles.emptyPhoto}>
                        <ImageIcon size={24} color="#64748B" />
                        <Text style={styles.emptyPhotoText}>Lorry Photo</Text>
                        <Text style={styles.emptyPhotoSub}>Missing</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Photo 2: Transit Pass / Form Photo */}
                  <TouchableOpacity
                    style={styles.photoBox}
                    onPress={() => {
                      if (selectedTrip.transitFormPhotoUrl) {
                        setViewerPhotoUrl(selectedTrip.transitFormPhotoUrl);
                      } else {
                        Alert.alert('Not Found', 'No Transit Form photo uploaded.');
                      }
                    }}
                  >
                    {selectedTrip.transitFormPhotoUrl ? (
                      <Image source={{ uri: selectedTrip.transitFormPhotoUrl }} style={styles.thumbnail} />
                    ) : (
                      <View style={styles.emptyPhoto}>
                        <ImageIcon size={24} color="#64748B" />
                        <Text style={styles.emptyPhotoText}>Transit Pass</Text>
                        <Text style={styles.emptyPhotoSub}>Missing</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Photo 3: Unload Verify Photo */}
                  <TouchableOpacity
                    style={styles.photoBox}
                    onPress={() => {
                      if (selectedTrip.unloadingPhotoUrl) {
                        setViewerPhotoUrl(selectedTrip.unloadingPhotoUrl);
                      } else {
                        Alert.alert('Not Found', 'No Unload photo uploaded.');
                      }
                    }}
                  >
                    {selectedTrip.unloadingPhotoUrl ? (
                      <Image source={{ uri: selectedTrip.unloadingPhotoUrl }} style={styles.thumbnail} />
                    ) : (
                      <View style={styles.emptyPhoto}>
                        <ImageIcon size={24} color="#64748B" />
                        <Text style={styles.emptyPhotoText}>Unload Photo</Text>
                        <Text style={styles.emptyPhotoSub}>Missing</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ImageViewer Modal for Inspecting Photos */}
      {viewerPhotoUrl && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={!!viewerPhotoUrl}
          onRequestClose={() => setViewerPhotoUrl(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.viewerOverlay}
            onPress={() => setViewerPhotoUrl(null)}
          >
            <View style={styles.viewerContent}>
              <TouchableOpacity
                style={styles.viewerCloseBtn}
                onPress={() => setViewerPhotoUrl(null)}
              >
                <X size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Image source={{ uri: viewerPhotoUrl }} style={styles.viewerImage} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  searchHeader: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
  },
  filterStrip: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#334155',
    marginRight: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  pillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  pillActiveFlagged: {
    backgroundColor: '#EF4444',
    borderColor: '#F87171',
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextActiveFlagged: {
    color: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripId: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  vehicleNo: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeYellow: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: '#D97706',
  },
  badgeBlue: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: '#2563EB',
  },
  badgeGreen: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: '#059669',
  },
  badgeRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textYellow: { color: '#FBBF24' },
  textBlue: { color: '#60A5FA' },
  textGreen: { color: '#34D399' },
  textRed: { color: '#F87171' },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  value: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 2,
    borderColor: '#334155',
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  alertBannerGreen: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: '#34D399',
  },
  alertText: {
    flex: 1,
    color: '#F87171',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  timelineContainer: {
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#334155',
    marginBottom: 24,
    gap: 20,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -22,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  dotPending: {
    backgroundColor: '#475569',
  },
  timelineContent: {
    gap: 2,
  },
  timelinePhase: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: 'bold',
  },
  timelineTime: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  timelineUser: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  timelineDetail: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  photosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  photoBox: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  emptyPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  emptyPhotoText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyPhotoSub: {
    color: '#475569',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 1,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '90%',
    height: '80%',
  },
});
