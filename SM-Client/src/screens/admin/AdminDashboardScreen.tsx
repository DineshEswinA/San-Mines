import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { BUILD_CONFIG } from '../../config/version';
import { RefreshCw, Truck, MapPin, AlertOctagon, ShieldAlert, Navigation, ShieldCheck } from 'lucide-react-native';
import Svg, { Circle, Line, Rect, G, Text as SvgText } from 'react-native-svg';

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

export const AdminDashboardScreen: React.FC = () => {
  const { locations, fetchConfigData } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Stats computed from active database records
  const [yardQueueCount, setYardQueueCount] = useState(0);
  const [enRouteCount, setEnRouteCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await fetchConfigData();
      const res = await api.getTrips();
      if (res.data && res.data.trips) {
        const rawTrips = res.data.trips;
        setTrips(rawTrips);

        // Compute metrics
        let queue = 0;
        let transit = 0;
        let completed = 0;

        rawTrips.forEach((trip: any) => {
          if (trip.status === 'INSIDE_QUARRY') {
            queue++;
          } else if (trip.status === 'IN_TRANSIT') {
            transit++;
          } else if (trip.status === 'UNLOADED') {
            completed++;
          }
        });

        setYardQueueCount(queue);
        setEnRouteCount(transit);
        setCompletedCount(completed);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Screen layout constants
  const screenWidth = Dimensions.get('window').width - 32;
  const mapHeight = 320;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Area */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>LIVE OPS COMMAND</Text>
          <Text style={styles.subtitle}>Outdoor Terminal Auditing & Geofence Tracker</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={fetchDashboardData}
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

      {/* 1. Executive Metric Strip */}
      <View style={styles.metricStrip}>
        {/* Card 1: Yard Queue */}
        <View style={[styles.metricCard, styles.bgSlate800]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Yard Queue</Text>
            <Truck size={18} color="#818CF8" />
          </View>
          <Text style={styles.cardValue}>{yardQueueCount}</Text>
          <Text style={styles.cardLabel}>Inside Quarry</Text>
        </View>

        {/* Card 2: En-Route */}
        <View style={[styles.metricCard, styles.bgSlate800]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>En-Route</Text>
            <Navigation size={18} color="#60A5FA" style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
          <Text style={styles.cardValue}>{enRouteCount}</Text>
          <Text style={styles.cardLabel}>Vehicles Active</Text>
        </View>

        {/* Card 3: Completed (Green border card) */}
        <View style={[styles.metricCard, styles.completedCard]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, styles.textGreen]}>Completed</Text>
            <ShieldCheck size={18} color="#10B981" />
          </View>
          <Text style={[styles.cardValue, styles.textGreen]}>{completedCount}</Text>
          <Text style={styles.cardLabel}>Trips Archived</Text>
        </View>
      </View>

      {/* 2. Global Map View */}
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <MapPin size={18} color="#6366F1" style={{ marginRight: 8 }} />
          <Text style={styles.mapTitle}>Live Geofence Tactical Map</Text>
        </View>

        <View style={styles.mapWrapper}>
          {/* SVG Map Layout */}
          <Svg width={screenWidth} height={mapHeight} style={styles.svgMap}>
            {/* Background Grid */}
            <Rect width="100%" height="100%" fill="#1E293B" />
            <Line x1="10%" y1="0" x2="10%" y2="100%" stroke="#334155" strokeWidth="0.5" />
            <Line x1="30%" y1="0" x2="30%" y2="100%" stroke="#334155" strokeWidth="0.5" />
            <Line x1="50%" y1="0" x2="50%" y2="100%" stroke="#334155" strokeWidth="0.5" />
            <Line x1="70%" y1="0" x2="70%" y2="100%" stroke="#334155" strokeWidth="0.5" />
            <Line x1="90%" y1="0" x2="90%" y2="100%" stroke="#334155" strokeWidth="0.5" />

            <Line x1="0" y1="20%" x2="100%" y2="20%" stroke="#334155" strokeWidth="0.5" />
            <Line x1="0" y1="40%" x2="100%" y2="40%" stroke="#334155" strokeWidth="0.5" />
            <Line x1="0" y1="60%" x2="100%" y2="60%" stroke="#334155" strokeWidth="0.5" />
            <Line x1="0" y1="80%" x2="100%" y2="80%" stroke="#334155" strokeWidth="0.5" />

            {/* Dotted Route Connectors (Visual Paths) */}
            <Line
              x1={screenWidth * 0.25}
              y1={mapHeight * 0.25}
              x2={screenWidth * 0.75}
              y2={mapHeight * 0.7}
              stroke="#6366F1"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity={0.6}
            />
            <Line
              x1={screenWidth * 0.3}
              y1={mapHeight * 0.75}
              x2={screenWidth * 0.75}
              y2={mapHeight * 0.7}
              stroke="#10B981"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity={0.6}
            />

            {/* Draw Location Pins */}
            {locations.map((loc, idx) => {
              const isQuarry = loc.node_type === 'QUARRY';
              // Distribute pins visually based on coordinates or indices for testing
              const xPos = isQuarry
                ? screenWidth * (0.2 + idx * 0.1)
                : screenWidth * 0.75;
              const yPos = isQuarry
                ? mapHeight * (0.25 + idx * 0.4)
                : mapHeight * 0.7;

              return (
                <G key={loc.id}>
                  {/* Outer Allowed Geofence Area */}
                  <Circle
                    cx={xPos}
                    cy={yPos}
                    r={loc.allowed_radius_meters ? loc.allowed_radius_meters / 3 : 30}
                    fill={isQuarry ? '#6366F1' : '#10B981'}
                    fillOpacity="0.12"
                    stroke={isQuarry ? '#818CF8' : '#34D399'}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {/* Core Node Center Pin */}
                  <Circle
                    cx={xPos}
                    cy={yPos}
                    r="8"
                    fill={isQuarry ? '#4F46E5' : '#059669'}
                  />
                  <Circle
                    cx={xPos}
                    cy={yPos}
                    r="4"
                    fill="#FFFFFF"
                  />
                  {/* Name Tag */}
                  <SvgText
                    x={xPos}
                    y={yPos - 14}
                    fill="#F1F5F9"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {loc.name}
                  </SvgText>
                </G>
              );
            })}

            {/* Transit vehicle pins */}
            {trips
              .filter((t) => t.status === 'IN_TRANSIT')
              .map((trip, idx) => {
                // Calculate simulated intermediate coordinate along the route for representation
                const progress = (0.3 + (idx * 0.25)) % 0.8;
                const startX = screenWidth * 0.25;
                const startY = mapHeight * 0.25;
                const endX = screenWidth * 0.75;
                const endY = mapHeight * 0.7;

                const truckX = startX + (endX - startX) * progress;
                const truckY = startY + (endY - startY) * progress;

                // Detect if this trip has a geofence breach to color it red
                let hasBreach = false;
                if (trip.quarryGpsLat && trip.quarryGpsLong && trip.dispatchLocationId) {
                  const loc = locations.find((l) => Number(l.id) === Number(trip.dispatchLocationId));
                  if (loc) {
                    const dist = getDistance(
                      Number(trip.quarryGpsLat),
                      Number(trip.quarryGpsLong),
                      Number(loc.latitude),
                      Number(loc.longitude)
                    );
                    if (dist > Number(loc.allowed_radius_meters || 100)) {
                      hasBreach = true;
                    }
                  }
                }

                return (
                  <G key={trip.id}>
                    <Rect
                      x={truckX - 10}
                      y={truckY - 8}
                      width="20"
                      height="16"
                      rx="3"
                      fill={hasBreach ? '#EF4444' : '#60A5FA'}
                      stroke="#FFFFFF"
                      strokeWidth="1"
                    />
                    <SvgText
                      x={truckX}
                      y={truckY + 18}
                      fill={hasBreach ? '#F87171' : '#93C5FD'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {trip.vehicleNumber}
                    </SvgText>
                  </G>
                );
              })}
          </Svg>

          {/* Map Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4F46E5' }]} />
              <Text style={styles.legendText}>Quarry Node</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
              <Text style={styles.legendText}>Unload Node</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
              <Text style={styles.legendText}>Vehicle (Transit)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Geofence Breach</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Version Footer */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>
          Version {BUILD_CONFIG.version} (Build {BUILD_CONFIG.buildNumber}) • {BUILD_CONFIG.buildDate}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Premium Slate Dark
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#334155',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bgSlate800: {
    backgroundColor: '#1E293B',
  },
  completedCard: {
    backgroundColor: '#1E293B',
    borderColor: '#10B981', // Safety/Completed Green border
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
  },
  cardLabel: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  textGreen: {
    color: '#10B981',
  },
  mapContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
  },
  mapTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  mapWrapper: {
    padding: 0,
    alignItems: 'center',
  },
  svgMap: {
    backgroundColor: '#1E293B',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#334155',
    width: '100%',
    backgroundColor: '#0F172A',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#1E293B',
  },
  versionText: {
    color: '#475569', // Muted slate gray
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
