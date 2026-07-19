import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Input, PickerField } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MapPin, Plus, Layers, Disc, Trash2, CheckCircle2, ChevronRight, X } from 'lucide-react-native';

export const MasterConfigScreen: React.FC = () => {
  const { locations, materials, wheelTypes, fetchConfigData } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'LOCATIONS' | 'MATERIALS' | 'WHEELS'>('LOCATIONS');
  const [loading, setLoading] = useState(false);

  const { width: screenWidth } = Dimensions.get('window');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffset / screenWidth);
    if (pageIndex === 0) {
      setActiveSubTab('LOCATIONS');
    } else if (pageIndex === 1) {
      setActiveSubTab('MATERIALS');
    } else if (pageIndex === 2) {
      setActiveSubTab('WHEELS');
    }
  };

  const handleTabPress = (tab: 'LOCATIONS' | 'MATERIALS' | 'WHEELS') => {
    setActiveSubTab(tab);
    let pageIndex = 0;
    if (tab === 'MATERIALS') pageIndex = 1;
    if (tab === 'WHEELS') pageIndex = 2;
    scrollViewRef.current?.scrollTo({ x: pageIndex * screenWidth, animated: true });
  };

  // Locations State
  const [locModalVisible, setLocModalVisible] = useState(false);
  const [locName, setLocName] = useState('');
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [locNodeType, setLocNodeType] = useState<'QUARRY' | 'UNLOAD_SITE'>('QUARRY');
  const [locRadius, setLocRadius] = useState<number>(100);

  const [localWheelTypes, setLocalWheelTypes] = useState<any[]>([]);
  const [newMaterialName, setNewMaterialName] = useState('');

  useEffect(() => {
    fetchConfigData();
  }, []);

  useEffect(() => {
    setLocalWheelTypes(wheelTypes);
  }, [wheelTypes]);

  // Handler: Add Location
  const handleAddLocation = async () => {
    if (!locName.trim() || !locLat.trim() || !locLng.trim()) {
      Alert.alert('Validation Error', 'All location coordinates and name are required.');
      return;
    }

    const latVal = parseFloat(locLat);
    const lngVal = parseFloat(locLng);

    if (isNaN(latVal) || isNaN(lngVal)) {
      Alert.alert('Validation Error', 'Latitude and Longitude must be valid numbers.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createLocation({
        name: locName.trim(),
        node_type: locNodeType,
        latitude: latVal,
        longitude: lngVal,
        allowed_radius_meters: locRadius,
      });

      if (res.error) throw new Error(res.error);

      Alert.alert('Success', `Location "${locName}" created successfully.`);
      setLocModalVisible(false);
      // Reset form
      setLocName('');
      setLocLat('');
      setLocLng('');
      setLocNodeType('QUARRY');
      setLocRadius(100);
      await fetchConfigData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add location node.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Add Material
  const handleAddMaterial = async () => {
    if (!newMaterialName.trim()) {
      Alert.alert('Validation Error', 'Material name display string is required.');
      return;
    }

    setLoading(true);
    try {
      const internalName = newMaterialName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

      const res = await api.createMaterial({
        material_name: internalName,
        display_name: newMaterialName.trim(),
      });

      if (res.error) throw new Error(res.error);

      Alert.alert('Success', `Material "${newMaterialName}" appended successfully.`);
      setNewMaterialName('');
      await fetchConfigData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add material type.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Toggle Wheel Type Status (Optimistic Update)
  const handleToggleWheelType = async (id: number, currentStatus: boolean) => {
    // 1. Instantly flip the switch state locally
    setLocalWheelTypes((prev) =>
      prev.map((w) => (w.id === id ? { ...w, is_active: !currentStatus } : w))
    );

    try {
      // 2. Perform the server update in the background
      const res = await api.updateWheelType(id, !currentStatus);

      if (res.error) throw new Error(res.error);

      // 3. Sync backend configuration state to keep other screens updated
      await fetchConfigData();
    } catch (err: any) {
      // 4. Revert the switch state if the API fails
      setLocalWheelTypes((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_active: currentStatus } : w))
      );
      Alert.alert('Update Failed', err.message || 'Could not save wheel status to backend.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub-tab Navigation */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'LOCATIONS' && styles.subTabActive]}
          onPress={() => handleTabPress('LOCATIONS')}
        >
          <MapPin size={16} color={activeSubTab === 'LOCATIONS' ? '#6366F1' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.subTabText, activeSubTab === 'LOCATIONS' && styles.subTabTextActive]}>
            Locations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'MATERIALS' && styles.subTabActive]}
          onPress={() => handleTabPress('MATERIALS')}
        >
          <Layers size={16} color={activeSubTab === 'MATERIALS' ? '#6366F1' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.subTabText, activeSubTab === 'MATERIALS' && styles.subTabTextActive]}>
            Materials
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'WHEELS' && styles.subTabActive]}
          onPress={() => handleTabPress('WHEELS')}
        >
          <Disc size={16} color={activeSubTab === 'WHEELS' ? '#6366F1' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.subTabText, activeSubTab === 'WHEELS' && styles.subTabTextActive]}>
            Wheels
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Configurations Section (Swipable Pager) */}
      <ScrollView
        ref={scrollViewRef}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={{ flex: 1 }}
      >
        {/* PANEL 1: LOCATIONS */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Yards Registry</Text>
              <Text style={styles.sectionSubtitle}>Locations where GPS checks are run</Text>
            </View>

            {locations.map((loc) => (
              <View key={loc.id} style={styles.listItem}>
                <View style={styles.itemLeft}>
                  <View style={[styles.nodeDot, loc.node_type === 'QUARRY' ? styles.nodeQuarry : styles.nodeUnload]} />
                  <View>
                    <Text style={styles.itemTitle}>{loc.name}</Text>
                    <Text style={styles.itemDetail}>
                      GPS: {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                    </Text>
                    <Text style={styles.itemRadius}>Allowed Radius: {loc.allowed_radius_meters || 100}m</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.nodeTypeBadge, loc.node_type === 'QUARRY' ? styles.badgeQuarry : styles.badgeUnload]}>
                    {loc.node_type}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* PANEL 2: MATERIALS */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ecosystem Materials Registry</Text>
              <Text style={styles.sectionSubtitle}>Material chips loaded on outbound lorries</Text>
            </View>

            {/* Chip Grid */}
            <View style={styles.chipGrid}>
              {materials.map((mat) => (
                <View key={mat.id} style={styles.chip}>
                  <Layers size={14} color="#818CF8" style={{ marginRight: 6 }} />
                  <Text style={styles.chipText}>{mat.display_name}</Text>
                </View>
              ))}
            </View>

            {/* Add New Material Form */}
            <View style={styles.formCard}>
              <Text style={styles.cardFormTitle}>Append New Material Type</Text>
              <Input
                label="Material Display Name"
                placeholder="e.g. Granite Chips (40mm)"
                value={newMaterialName}
                onChangeText={setNewMaterialName}
                required={true}
              />
              <Button
                title="Append to Registry"
                loading={loading}
                variant="primary"
                onPress={handleAddMaterial}
                style={styles.appendBtn}
              />
            </View>
          </ScrollView>
        </View>

        {/* PANEL 3: WHEELS */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vehicle Classes Registry</Text>
              <Text style={styles.sectionSubtitle}>Instantly activate or deactivate wheel count configurations</Text>
            </View>

            {localWheelTypes.map((wheel) => (
              <View key={wheel.id} style={styles.listItem}>
                <View style={styles.itemLeft}>
                  <Disc size={20} color="#818CF8" style={{ marginRight: 12 }} />
                  <View>
                    <Text style={styles.itemTitle}>{wheel.wheel_count} Wheeler Lorry</Text>
                    <Text style={styles.itemDetail}>System Identifier: {wheel.display_label}</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Switch
                    trackColor={{ false: '#475569', true: '#6366F1' }}
                    thumbColor={wheel.is_active ? '#F8FAFC' : '#94A3B8'}
                    ios_backgroundColor="#334155"
                    onValueChange={() => handleToggleWheelType(wheel.id, wheel.is_active)}
                    value={wheel.is_active}
                    disabled={false}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {activeSubTab === 'LOCATIONS' && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setLocModalVisible(true)}
          style={styles.fab}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Modal: Add New Location Node */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={locModalVisible}
        onRequestClose={() => setLocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Location Node</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setLocModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color="#F1F5F9" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Input
                label="Yard / Station Name"
                placeholder="e.g. Quarry Hub Gamma"
                value={locName}
                onChangeText={setLocName}
                required={true}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Input
                    label="Latitude"
                    placeholder="e.g. 13.0475"
                    value={locLat}
                    onChangeText={setLocLat}
                    keyboardType="numeric"
                    required={true}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Input
                    label="Longitude"
                    placeholder="e.g. 80.2089"
                    value={locLng}
                    onChangeText={setLocLng}
                    keyboardType="numeric"
                    required={true}
                  />
                </View>
              </View>

              <PickerField
                label="Node Designation Type"
                options={['QUARRY', 'UNLOAD_SITE']}
                selectedValue={locNodeType}
                onValueChange={(val) => setLocNodeType(val as any)}
                required={true}
              />

              {/* Custom Rugged Stepper Slider (50m - 500m) */}
              <View style={styles.sliderGroup}>
                <Text style={styles.sliderLabel}>Allowed Geofence Radius: {locRadius}m</Text>
                <View style={styles.sliderBar}>
                  {[50, 100, 150, 200, 300, 400, 500].map((step) => {
                    const isSelected = locRadius === step;
                    return (
                      <TouchableOpacity
                        key={step}
                        activeOpacity={0.8}
                        style={[styles.sliderStep, isSelected && styles.sliderStepActive]}
                        onPress={() => setLocRadius(step)}
                      >
                        <Text style={[styles.sliderStepText, isSelected && styles.sliderStepTextActive]}>
                          {step}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Button
                title="Create Location Node"
                loading={loading}
                variant="primary"
                onPress={handleAddLocation}
                style={styles.submitBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
    height: 52,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#6366F1',
  },
  subTabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subTabTextActive: {
    color: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 14,
  },
  nodeQuarry: {
    backgroundColor: '#6366F1',
  },
  nodeUnload: {
    backgroundColor: '#10B981',
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemDetail: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  itemRadius: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  itemRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  nodeTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeQuarry: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366F1',
    borderWidth: 1,
    color: '#818CF8',
  },
  badgeUnload: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    borderWidth: 1,
    color: '#34D399',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 16,
    elevation: 3,
  },
  cardFormTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  appendBtn: {
    marginTop: 8,
    height: 48,
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
    maxHeight: '90%',
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
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    padding: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfWidth: {
    width: '48%',
  },
  sliderGroup: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sliderBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 4,
    justifyContent: 'space-between',
  },
  sliderStep: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  sliderStepActive: {
    backgroundColor: '#6366F1',
  },
  sliderStepText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sliderStepTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    marginTop: 20,
    height: 48,
  },
});
