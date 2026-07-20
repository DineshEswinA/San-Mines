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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Input, PickerField } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MapPin, Plus, Layers, Disc, Trash2, Edit2, X } from 'lucide-react-native';

export const MasterConfigScreen: React.FC = () => {
  const {
    locations,
    materials,
    wheelTypes,
    fetchConfigData,
    addLocationState,
    updateLocationState,
    removeLocationState,
    addMaterialState,
    updateMaterialState,
    removeMaterialState,
    addWheelTypeState,
    updateWheelTypeState,
    removeWheelTypeState,
  } = useAuth();
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

  // Add Location State
  const [locModalVisible, setLocModalVisible] = useState(false);
  const [locName, setLocName] = useState('');
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [locNodeType, setLocNodeType] = useState<'QUARRY' | 'UNLOAD_SITE'>('QUARRY');
  const [locRadius, setLocRadius] = useState<number>(100);

  // Edit Location State
  const [editLocModalVisible, setEditLocModalVisible] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState<number | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocLat, setEditLocLat] = useState('');
  const [editLocLng, setEditLocLng] = useState('');
  const [editLocNodeType, setEditLocNodeType] = useState<'QUARRY' | 'UNLOAD_SITE'>('QUARRY');
  const [editLocRadius, setEditLocRadius] = useState<number>(100);

  // Material State
  const [newMaterialName, setNewMaterialName] = useState('');
  // Edit Material State
  const [editMatModalVisible, setEditMatModalVisible] = useState(false);
  const [selectedMatId, setSelectedMatId] = useState<number | null>(null);
  const [editMatDisplayName, setEditMatDisplayName] = useState('');

  // Wheel State
  const [localWheelTypes, setLocalWheelTypes] = useState<any[]>([]);
  const [newWheelCount, setNewWheelCount] = useState('');
  const [newWheelLabel, setNewWheelLabel] = useState('');
  // Edit Wheel State
  const [editWheelModalVisible, setEditWheelModalVisible] = useState(false);
  const [selectedWheelId, setSelectedWheelId] = useState<number | null>(null);
  const [editWheelCount, setEditWheelCount] = useState('');
  const [editWheelLabel, setEditWheelLabel] = useState('');

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

      const createdObj = res.data?.location || res.data;
      if (createdObj) {
        addLocationState(createdObj);
      }

      Alert.alert('Success', `Location "${locName}" created successfully.`);
      setLocModalVisible(false);
      setLocName('');
      setLocLat('');
      setLocLng('');
      setLocNodeType('QUARRY');
      setLocRadius(100);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add location node.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Edit Location
  const handleEditLocationOpen = (loc: any) => {
    setSelectedLocId(loc.id);
    setEditLocName(loc.name);
    setEditLocLat(String(loc.latitude));
    setEditLocLng(String(loc.longitude));
    setEditLocNodeType(loc.node_type);
    setEditLocRadius(loc.allowed_radius_meters || 100);
    setEditLocModalVisible(true);
  };

  const handleEditLocationSubmit = async () => {
    if (!selectedLocId) return;
    if (!editLocName.trim() || !editLocLat.trim() || !editLocLng.trim()) {
      Alert.alert('Validation Error', 'All location coordinates and name are required.');
      return;
    }

    const latVal = parseFloat(editLocLat);
    const lngVal = parseFloat(editLocLng);

    if (isNaN(latVal) || isNaN(lngVal)) {
      Alert.alert('Validation Error', 'Latitude and Longitude must be valid numbers.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.updateLocation(selectedLocId, {
        name: editLocName.trim(),
        node_type: editLocNodeType,
        latitude: latVal,
        longitude: lngVal,
        allowed_radius_meters: editLocRadius,
      });

      if (res.error) throw new Error(res.error);

      const updatedObj = res.data?.location || res.data;
      if (updatedObj) {
        updateLocationState(selectedLocId, updatedObj);
      }

      Alert.alert('Success', `Location "${editLocName}" updated successfully.`);
      setEditLocModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update location node.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Delete Location
  const handleDeleteLocation = (loc: any) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to permanently delete location "${loc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await api.deleteLocation(loc.id);
              if (res.error) {
                Alert.alert('Deletion Blocked', res.error);
                return;
              }
              removeLocationState(loc.id);
              Alert.alert('Deleted', 'Location node has been removed successfully.');
            } catch (err: any) {
              Alert.alert('Deletion Blocked', err.message || 'Could not delete location because it is mapped to trips.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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

      const createdObj = res.data?.material || res.data;
      if (createdObj) {
        addMaterialState(createdObj);
      }

      Alert.alert('Success', `Material "${newMaterialName}" appended successfully.`);
      setNewMaterialName('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add material type.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Edit Material
  const handleEditMaterialOpen = (mat: any) => {
    setSelectedMatId(mat.id);
    setEditMatDisplayName(mat.display_name);
    setEditMatModalVisible(true);
  };

  const handleEditMaterialSubmit = async () => {
    if (!selectedMatId) return;
    if (!editMatDisplayName.trim()) {
      Alert.alert('Validation Error', 'Material name display string is required.');
      return;
    }

    setLoading(true);
    try {
      const internalName = editMatDisplayName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

      const res = await api.updateMaterial(selectedMatId, {
        material_name: internalName,
        display_name: editMatDisplayName.trim(),
      });

      if (res.error) throw new Error(res.error);

      const updatedObj = res.data?.material || res.data;
      if (updatedObj) {
        updateMaterialState(selectedMatId, updatedObj);
      }

      Alert.alert('Success', `Material updated to "${editMatDisplayName}".`);
      setEditMatModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update material.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Delete Material
  const handleDeleteMaterial = (mat: any) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to permanently delete material "${mat.display_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await api.deleteMaterial(mat.id);
              if (res.error) {
                Alert.alert('Deletion Blocked', res.error);
                return;
              }
              removeMaterialState(mat.id);
              Alert.alert('Deleted', 'Material chip has been removed successfully.');
            } catch (err: any) {
              Alert.alert('Deletion Blocked', err.message || 'Could not delete material because it is mapped to trips.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handler: Toggle Wheel Type Status (Optimistic Update)
  const handleToggleWheelType = async (id: number, currentStatus: boolean) => {
    setLocalWheelTypes((prev) =>
      prev.map((w) => (w.id === id ? { ...w, is_active: !currentStatus } : w))
    );

    try {
      const res = await api.updateWheelType(id, !currentStatus);
      if (res.error) throw new Error(res.error);
      await fetchConfigData(true);
    } catch (err: any) {
      setLocalWheelTypes((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_active: currentStatus } : w))
      );
      Alert.alert('Update Failed', err.message || 'Could not save wheel status to backend.');
    }
  };

  // Handler: Add Wheel Type
  const handleAddWheelType = async () => {
    if (!newWheelCount.trim() || !newWheelLabel.trim()) {
      Alert.alert('Validation Error', 'Both wheel count and label are required.');
      return;
    }

    const countVal = parseInt(newWheelCount, 10);
    if (isNaN(countVal) || countVal <= 0) {
      Alert.alert('Validation Error', 'Wheel count must be a positive integer.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createWheelType({
        wheel_count: countVal,
        display_label: newWheelLabel.trim(),
      });

      if (res.error) throw new Error(res.error);

      const createdObj = res.data?.wheel_type || res.data;
      if (createdObj) {
        addWheelTypeState(createdObj);
      }

      Alert.alert('Success', `Lorry Class "${newWheelLabel}" appended successfully.`);
      setNewWheelCount('');
      setNewWheelLabel('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add lorry configuration.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Edit Wheel Type
  const handleEditWheelOpen = (wheel: any) => {
    setSelectedWheelId(wheel.id);
    setEditWheelCount(String(wheel.wheel_count));
    setEditWheelLabel(wheel.display_label);
    setEditWheelModalVisible(true);
  };

  const handleEditWheelSubmit = async () => {
    if (!selectedWheelId) return;
    if (!editWheelCount.trim() || !editWheelLabel.trim()) {
      Alert.alert('Validation Error', 'Both wheel count and label are required.');
      return;
    }

    const countVal = parseInt(editWheelCount, 10);
    if (isNaN(countVal) || countVal <= 0) {
      Alert.alert('Validation Error', 'Wheel count must be a positive integer.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.updateWheelType(selectedWheelId, {
        wheel_count: countVal,
        display_label: editWheelLabel.trim(),
      });

      if (res.error) throw new Error(res.error);

      const updatedObj = res.data?.wheel_type || res.data;
      if (updatedObj) {
        updateWheelTypeState(selectedWheelId, updatedObj);
      }

      Alert.alert('Success', `Lorry class updated to "${editWheelLabel}".`);
      setEditWheelModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update lorry configuration.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Delete Wheel Type
  const handleDeleteWheel = (wheel: any) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to permanently delete configuration "${wheel.wheel_count} Wheeler Lorry"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await api.deleteWheelType(wheel.id);
              if (res.error) {
                Alert.alert('Deletion Blocked', res.error);
                return;
              }
              removeWheelTypeState(wheel.id);
              Alert.alert('Deleted', 'Lorry configuration has been removed successfully.');
            } catch (err: any) {
              Alert.alert('Deletion Blocked', err.message || 'Could not delete configuration because it is mapped to trips.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
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
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* PANEL 1: LOCATIONS */}
          <View style={{ width: screenWidth }}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                    <Text style={[styles.nodeTypeBadge, loc.node_type === 'QUARRY' ? styles.badgeQuarry : styles.badgeUnload, { marginBottom: 8 }]}>
                      {loc.node_type === 'QUARRY' ? 'Quarry' : 'Unload Site'}
                    </Text>
                    <View style={styles.iconActionRow}>
                      <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={() => handleEditLocationOpen(loc)}>
                        <Edit2 size={16} color="#94A3B8" />
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={() => handleDeleteLocation(loc)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* PANEL 2: MATERIALS */}
          <View style={{ width: screenWidth }}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ecosystem Materials Registry</Text>
                <Text style={styles.sectionSubtitle}>Material chips loaded on outbound lorries</Text>
              </View>

              {/* Structured Material List Cards */}
              <View style={{ gap: 10, marginBottom: 24 }}>
                {materials.map((mat) => (
                  <View key={mat.id} style={styles.listItem}>
                    <View style={styles.itemLeft}>
                      <Layers size={20} color="#818CF8" style={{ marginRight: 12 }} />
                      <View>
                        <Text style={styles.itemTitle}>{mat.display_name}</Text>
                        <Text style={styles.itemDetail}>Identifier: {mat.material_name}</Text>
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <View style={styles.iconActionRow}>
                        <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={() => handleEditMaterialOpen(mat)}>
                          <Edit2 size={16} color="#94A3B8" />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={() => handleDeleteMaterial(mat)}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
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
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Button
                  title="Append to Registry"
                  loadingTitle="Appending..."
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  onPress={handleAddMaterial}
                  style={styles.appendBtn}
                />
              </View>
            </ScrollView>
          </View>

          {/* PANEL 3: WHEELS */}
          <View style={{ width: screenWidth }}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Vehicle Classes Registry</Text>
                <Text style={styles.sectionSubtitle}>Activate, deactivate or customize wheel count configurations</Text>
              </View>

              <View style={{ gap: 10, marginBottom: 24 }}>
                {localWheelTypes.map((wheel) => (
                  <View key={wheel.id} style={styles.listItem}>
                    <View style={styles.itemLeft}>
                      <Disc size={20} color="#818CF8" style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{wheel.wheel_count} Wheeler Lorry</Text>
                        <Text style={styles.itemDetail}>Identifier: {wheel.display_label}</Text>
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Switch
                          trackColor={{ false: '#475569', true: '#6366F1' }}
                          thumbColor={wheel.is_active ? '#F8FAFC' : '#94A3B8'}
                          ios_backgroundColor="#334155"
                          onValueChange={() => handleToggleWheelType(wheel.id, wheel.is_active)}
                          value={wheel.is_active}
                        />
                        <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={() => handleEditWheelOpen(wheel)}>
                          <Edit2 size={16} color="#94A3B8" />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={() => handleDeleteWheel(wheel)}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Add New Wheel Form */}
              <View style={styles.formCard}>
                <Text style={styles.cardFormTitle}>Append New Lorry Class</Text>
                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Input
                      label="Wheel Count"
                      placeholder="e.g. 10"
                      value={newWheelCount}
                      onChangeText={setNewWheelCount}
                      keyboardType="numeric"
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Input
                      label="Display Label"
                      placeholder="e.g. 10"
                      value={newWheelLabel}
                      onChangeText={setNewWheelLabel}
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                </View>
                <Button
                  title="Append Lorry Class"
                  loadingTitle="Appending..."
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  onPress={handleAddWheelType}
                  style={styles.appendBtn}
                />
              </View>
            </ScrollView>
          </View>
        </ScrollView>

        {/* Floating Action Button for Location creation */}
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
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
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

              <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Input
                  label="Yard / Station Name"
                  placeholder="e.g. Quarry Hub Gamma"
                  value={locName}
                  onChangeText={setLocName}
                  required={true}
                  labelStyle={{ color: '#94A3B8' }}
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
                      labelStyle={{ color: '#94A3B8' }}
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
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                </View>

                <PickerField
                  label="Node Designation Type"
                  options={['Quarry', 'Unload Site']}
                  selectedValue={locNodeType === 'QUARRY' ? 'Quarry' : 'Unload Site'}
                  onValueChange={(val) => setLocNodeType(val === 'Quarry' ? 'QUARRY' : 'UNLOAD_SITE')}
                  required={true}
                  labelStyle={{ color: '#94A3B8' }}
                />

                <View style={styles.sliderGroup}>
                  <Text style={[styles.sliderLabel, { color: '#94A3B8' }]}>Allowed Geofence Radius: {locRadius}m</Text>
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
                  loadingTitle="Creating..."
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  onPress={handleAddLocation}
                  style={styles.submitBtn}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Edit Existing Location Node */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editLocModalVisible}
          onRequestClose={() => setEditLocModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Location Node</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setEditLocModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={20} color="#F1F5F9" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Input
                  label="Yard / Station Name"
                  placeholder="e.g. Quarry Hub Gamma"
                  value={editLocName}
                  onChangeText={setEditLocName}
                  required={true}
                  labelStyle={{ color: '#94A3B8' }}
                />

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Input
                      label="Latitude"
                      placeholder="e.g. 13.0475"
                      value={editLocLat}
                      onChangeText={setEditLocLat}
                      keyboardType="numeric"
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Input
                      label="Longitude"
                      placeholder="e.g. 80.2089"
                      value={editLocLng}
                      onChangeText={setEditLocLng}
                      keyboardType="numeric"
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                </View>

                <PickerField
                  label="Node Designation Type"
                  options={['Quarry', 'Unload Site']}
                  selectedValue={editLocNodeType === 'QUARRY' ? 'Quarry' : 'Unload Site'}
                  onValueChange={(val) => setEditLocNodeType(val === 'Quarry' ? 'QUARRY' : 'UNLOAD_SITE')}
                  required={true}
                  labelStyle={{ color: '#94A3B8' }}
                />

                <View style={styles.sliderGroup}>
                  <Text style={[styles.sliderLabel, { color: '#94A3B8' }]}>Allowed Geofence Radius: {editLocRadius}m</Text>
                  <View style={styles.sliderBar}>
                    {[50, 100, 150, 200, 300, 400, 500].map((step) => {
                      const isSelected = editLocRadius === step;
                      return (
                        <TouchableOpacity
                          key={step}
                          activeOpacity={0.8}
                          style={[styles.sliderStep, isSelected && styles.sliderStepActive]}
                          onPress={() => setEditLocRadius(step)}
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
                  title="Save Changes"
                  loadingTitle="Saving..."
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  onPress={handleEditLocationSubmit}
                  style={styles.submitBtn}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Edit Material */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={editMatModalVisible}
          onRequestClose={() => setEditMatModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: 320 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Material Type</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setEditMatModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={20} color="#F1F5F9" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Input
                  label="Material Display Name"
                  placeholder="e.g. Granite Chips (40mm)"
                  value={editMatDisplayName}
                  onChangeText={setEditMatDisplayName}
                  required={true}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Button
                  title="Save Material Name"
                  loadingTitle="Saving..."
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  onPress={handleEditMaterialSubmit}
                  style={styles.submitBtn}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal: Edit Wheel Type */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={editWheelModalVisible}
          onRequestClose={() => setEditWheelModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: 380 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Lorry Class</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setEditWheelModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={20} color="#F1F5F9" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Input
                      label="Wheel Count"
                      placeholder="e.g. 10"
                      value={editWheelCount}
                      onChangeText={setEditWheelCount}
                      keyboardType="numeric"
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Input
                      label="Display Label"
                      placeholder="e.g. 10"
                      value={editWheelLabel}
                      onChangeText={setEditWheelLabel}
                      required={true}
                      labelStyle={{ color: '#94A3B8' }}
                    />
                  </View>
                </View>
                <Button
                  title="Save Configuration"
                  loadingTitle="Saving..."
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  onPress={handleEditWheelSubmit}
                  style={styles.submitBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 260,
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
  iconActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
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
    color: '#94A3B8',
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
