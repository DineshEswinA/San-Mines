import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useAuth, UnloadVerification, formatTimeTo12Hour, formatDateOnly } from '../../context/AuthContext';
import { CheckCircle2, History, X } from 'lucide-react-native';
import { SearchBar, Button } from '../../components/ui';

export const UnloadArchiveScreen: React.FC = () => {
  const { getCompletedArchives, fetchCompletedArchives, fetchConfigData } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [detailVehicle, setDetailVehicle] = useState<UnloadVerification | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const historyList = getCompletedArchives();

  const filteredList = historyList.filter((item) => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      item.transporterName.toLowerCase().includes(q) ||
      item.vehicleNumber.toLowerCase().includes(q)
    );
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCompletedArchives();
      await fetchConfigData(true);
    } catch (e) {
      console.error('Failed to refresh unload archive:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const renderCard = ({ item }: { item: UnloadVerification }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.vehicleRow}>
          <CheckCircle2 size={16} color="#10B981" />
          <Text style={styles.vehicleNo}>{item.vehicleNumber}</Text>
        </View>
        <View style={styles.closedBadge}>
          <Text style={styles.closedBadgeText}>CLOSED</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>
          Trip ID: <Text style={{ fontWeight: 'bold', color: '#F8FAFC' }}>{item.id}</Text> | {item.material} ({item.netWeight}T)
        </Text>
        <Text style={styles.detailText}>
          Unloaded at: <Text style={{ fontWeight: '600', color: '#F8FAFC' }}>{item.unloadingLocation}</Text>
        </Text>
        <Text style={styles.detailText}>
          Close Time: <Text style={{ fontWeight: '600', color: '#F8FAFC' }}>{item.unloadDate} {item.unloadExitTime}</Text>
        </Text>
      </View>

      <Button
        title="View Details"
        variant="outline"
        onPress={() => {
          setDetailVehicle(item);
          setDetailModalVisible(true);
        }}
        style={{ marginTop: 10, height: 48 }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {historyList.length > 0 && (
        <View style={styles.searchWrapper}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      )}

      {historyList.length === 0 ? (
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
      ) : filteredList.length === 0 ? (
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
          data={filteredList}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} tintColor="#6366F1" />
          }
        />
      )}

      {detailVehicle && (
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
                  <Text style={styles.modalSubtitle}>Trip ID: {detailVehicle.id} | {detailVehicle.vehicleNumber}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setDetailModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color="#F1F5F9" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flexGrow: 0, flexShrink: 1 }}
                contentContainerStyle={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.manifestCard}>
                  <Text style={styles.manifestTitle}>VEHICLE DISPATCH MANIFEST</Text>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Transporter:</Text>
                    <Text style={styles.manifestValue}>{detailVehicle.transporterName}</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Material Type:</Text>
                    <Text style={styles.manifestValue}>{detailVehicle.material}</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Tyre Configuration:</Text>
                    <Text style={styles.manifestValue}>{detailVehicle.tyres} Wheeler Vehicle</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Net Weight:</Text>
                    <Text style={styles.manifestValue}>{detailVehicle.netWeight} Tons</Text>
                  </View>
                  <View style={styles.manifestRow}>
                    <Text style={styles.manifestLabel}>Quarry Exit Time:</Text>
                    <Text style={styles.manifestValue}>{formatDateOnly(detailVehicle.exitTime)}, {formatTimeTo12Hour(detailVehicle.exitTime)}</Text>
                  </View>
                </View>

                <View style={styles.unloadLog}>
                  <Text style={[styles.logText, { textAlign: 'left', fontWeight: 'bold', marginBottom: 6, color: '#F8FAFC' }]}>
                    UNLOADING LOG
                  </Text>
                  <Text style={styles.logText}>Unloading Location: {detailVehicle.unloadingLocation}</Text>
                  <Text style={styles.logText}>Unload Entry Time: {detailVehicle.unloadDate}, {detailVehicle.unloadEntryTime}</Text>
                  <Text style={styles.logText}>Unload Exit Time: {detailVehicle.unloadDate}, {detailVehicle.unloadExitTime}</Text>
                </View>

                {detailVehicle.unloadPhoto && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.photoLabel, { marginBottom: 6 }]}>Security Offload Verification Photo</Text>
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: detailVehicle.unloadPhoto }} style={styles.photo} />
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
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
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginLeft: 6,
  },
  closedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  closedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#34D399',
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 3,
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
  modalBody: {
    padding: 20,
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
  unloadLog: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  logText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  photoLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  photoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
