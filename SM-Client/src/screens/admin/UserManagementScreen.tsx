import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { User, Shield, Check, RefreshCw } from 'lucide-react-native';

export const UserManagementScreen: React.FC = () => {
  const { role: currentUserRole, logout } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutatingUserId, setMutatingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res.data) {
        setUsers(res.data);
      } else if (res.error) {
        Alert.alert('Error', res.error);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch user profiles roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setMutatingUserId(userId);
    try {
      const res = await api.updateUserRole(userId, newRole);
      if (res.data) {
        // Optimistic UI updates
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        Alert.alert('Role Mutated', 'Security privileges updated successfully on database.');
      } else if (res.error) {
        Alert.alert('Mutation Failed', res.error);
      }
    } catch (err: any) {
      Alert.alert('Mutation Error', err.message || 'Failed to patch role.');
    } finally {
      setMutatingUserId(null);
    }
  };

  const renderUserCard = ({ item }: { item: any }) => {
    const roles: ('QUARRY_OPERATOR' | 'UNLOAD_OPERATOR' | 'SUPER_ADMIN')[] = [
      'QUARRY_OPERATOR',
      'UNLOAD_OPERATOR',
      'SUPER_ADMIN',
    ];

    const getRoleLabel = (r: string) => {
      switch (r) {
        case 'QUARRY_OPERATOR':
          return 'Quarry';
        case 'UNLOAD_OPERATOR':
          return 'Unload';
        case 'SUPER_ADMIN':
          return 'Admin';
        default:
          return r;
      }
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <User size={20} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.nameText}>
                {item.full_name || 'Unnamed Operator'}
              </Text>
              <Text numberOfLines={1} style={styles.emailText}>
                {item.email}
              </Text>
              <Text style={styles.userIdText}>ID: {item.id.substring(0, 8)}...</Text>
            </View>
          </View>
          <View style={styles.roleBadgeContainer}>
            <View style={[styles.badge, item.role === 'SUPER_ADMIN' ? styles.badgeAdmin : item.role === 'UNLOAD_OPERATOR' ? styles.badgeUnload : styles.badgeQuarry]}>
              <Text style={[styles.badgeText, item.role === 'SUPER_ADMIN' ? styles.textAdmin : item.role === 'UNLOAD_OPERATOR' ? styles.textUnload : styles.textQuarry]}>
                {getRoleLabel(item.role)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Inline Role Selector Selector */}
        <Text style={styles.pickerLabel}>Alter Access Privileges</Text>
        <View style={styles.pickerRow}>
          {roles.map((r) => {
            const isActive = item.role === r;
            const isMutating = mutatingUserId === item.id;

            return (
              <TouchableOpacity
                key={r}
                activeOpacity={0.8}
                disabled={isMutating}
                style={[
                  styles.pickerBtn,
                  isActive ? styles.pickerBtnActive : null,
                  r === 'SUPER_ADMIN' && isActive ? styles.pickerBtnActiveAdmin : null,
                ]}
                onPress={() => {
                  if (isActive) return;
                  Alert.alert(
                    'Confirm Privilege Overwrite',
                    `Are you sure you want to alter role permissions for ${item.email} to ${r}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Mutate Role',
                        style: 'destructive',
                        onPress: () => handleRoleChange(item.id, r),
                      },
                    ]
                  );
                }}
              >
                {isMutating && mutatingUserId === item.id && !isActive ? (
                  <ActivityIndicator size="small" color="#94A3B8" />
                ) : (
                  <Text style={[styles.pickerBtnText, isActive ? styles.pickerBtnTextActive : null]}>
                    {getRoleLabel(r)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Roster Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>STAFF ACCESS ROSTER</Text>
          <Text style={styles.subtitle}>Direct database privilege override control</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={fetchUsers}
          style={styles.refreshBtn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : (
            <RefreshCw size={20} color="#E2E8F0" />
          )}
        </TouchableOpacity>
      </View>

      {/* Roster List */}
      {loading && users.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No worker profiles found in the registry.</Text>
            </View>
          }
        />
      )}

      {/* Crimson Secure Disconnect Console Button (Absolute Bottom) */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Secure Disconnect Console',
              'This will destroy the local operational session and log you out. Proceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Disconnect',
                  style: 'destructive',
                  onPress: logout,
                },
              ]
            );
          }}
          style={styles.disconnectBtn}
        >
          <Shield size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.disconnectBtnText}>Secure Disconnect Console</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Clearance for absolute footer
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  nameText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emailText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 1,
  },
  userIdText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  roleBadgeContainer: {
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeAdmin: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366F1',
  },
  badgeUnload: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  badgeQuarry: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  textAdmin: { color: '#818CF8' },
  textUnload: { color: '#34D399' },
  textQuarry: { color: '#60A5FA' },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  pickerLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerBtn: {
    flex: 1,
    height: 48, // Minimum 48px touch target height
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  pickerBtnActiveAdmin: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  pickerBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pickerBtnTextActive: {
    color: '#FFFFFF',
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#0F172A',
    borderTopWidth: 1.5,
    borderTopColor: '#1E293B',
  },
  disconnectBtn: {
    width: '100%',
    height: 48, // Minimum 48px touch target height
    borderRadius: 8,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  disconnectBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
