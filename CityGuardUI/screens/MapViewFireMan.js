import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Vibration,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import MapView, { 
  Marker, 
  PROVIDER_GOOGLE,
  Circle,
  Heatmap,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { Button } from "react-native-paper";
import LuxuryModal from '../components/LuxuryModal';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  or
} from 'firebase/firestore';
import { db } from '../firebase/authConfig';
import { useAuth } from '../contexts/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SCREEN_HEIGHT = screenHeight;

// API Configuration
const API_BASE_URL = Platform.select({
  ios: 'http://192.168.1.17:8005',
  android: 'http://192.168.1.17:8005',
  default: 'http://192.168.1.17:8005'
});

// Fire-themed dark map style
const fireMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1a0f0f" }]
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#5a4a4a" }]
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1a0f0f" }]
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#2e1a1a" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#3e1616" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2e1a1a" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a0f0f" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f0a0a" }]
  }
];

// Fire incident type configurations
const FIRE_INCIDENT_TYPES = {
  building_fire: {
    icon: 'fire',
    color: '#FF4757',
    priority: 'critical',
    label: 'Building Fire'
  },
  vehicle_fire: {
    icon: 'car',
    color: '#FF6348',
    priority: 'high',
    label: 'Vehicle Fire'
  },
  forest_fire: {
    icon: 'pine-tree',
    color: '#FF7979',
    priority: 'critical',
    label: 'Forest Fire'
  },
  electrical_fire: {
    icon: 'flash',
    color: '#FFA502',
    priority: 'high',
    label: 'Electrical Fire'
  },
  gas_leak: {
    icon: 'gas-cylinder',
    color: '#FF9F40',
    priority: 'critical',
    label: 'Gas Leak'
  },
  chemical_hazard: {
    icon: 'chemical-weapon',
    color: '#B33939',
    priority: 'critical',
    label: 'Chemical Hazard'
  },
  rescue: {
    icon: 'human',
    color: '#E55039',
    priority: 'high',
    label: 'Rescue Operation'
  },
  false_alarm: {
    icon: 'bell-off',
    color: '#F39C12',
    priority: 'low',
    label: 'False Alarm'
  }
};

export default function MapViewFireMan() {
  // State Management
  const [location, setLocation] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fireIncidents, setFireIncidents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapImage, setMapImage] = useState(null);
  const [showMapImage, setShowMapImage] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Filter States
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [modalPosition, setModalPosition] = useState('center');
  
  // Auth context
  const { user } = useAuth();
  
  // Refs
  const mapRef = useRef(null);
  const scale = useRef(new Animated.Value(1)).current;
  const unsubscribeRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.8)).current;
  const fireAnim = useRef(new Animated.Value(0)).current;
  
  // Map region
  const mapRegion = useMemo(() => ({
    latitude: location?.coords?.latitude || 12.9716,
    longitude: location?.coords?.longitude || 77.5946,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  }), [location]);

  // Initialize map and location
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (mounted) {
        await initializeMap();
        startAnimations();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      // Clean up real-time listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Set up real-time listener for fire incidents
  useEffect(() => {
    if (mapReady && location) {
      setupRealtimeListener();
    }
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [mapReady, location]);

  const initializeMap = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        setIsLoading(false);
        return;
      }
      
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to get your location');
    }
  };

  const startAnimations = () => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Fire animation for critical incidents
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.5,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fire flicker animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(fireAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fireAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fireAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fireAnim, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Set up real-time listener for fire incidents
  const setupRealtimeListener = () => {
    try {
      console.log('Setting up real-time listener for fire incidents...');
      
      const q = query(
        collection(db, 'citizenReports'),
        or(
          where('issueType', '==', 'fire'),
          where('category', 'in', ['fire', 'Fire', 'Fire Emergency']),
          where('actualCategory', 'in', ['fire', 'building fire', 'electrical fire', 'gas leak'])
        ),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      unsubscribeRef.current = onSnapshot(q, 
        (snapshot) => {
          const incidents = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            const incident = {
              id: doc.id,
              type: mapFireIncidentType(data.actualCategory || data.category || 'building_fire'),
              title: data.title || data.description?.substring(0, 50) || 'Fire Incident',
              description: data.description || 'Fire incident reported',
              location: data.location || { latitude: 12.9716, longitude: 77.5946 },
              reportedAt: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
              status: data.status || 'pending',
              priority: mapPriority(data.severity || data.priorityScore),
              severity: data.severity,
              priorityScore: data.priorityScore,
              address: data.address,
              mediaUrls: data.mediaUrls,
              assignedTo: data.assignedTo,
              category: data.actualCategory || data.category,
              reporterInfo: data.reporterInfo,
              requiredUnits: getRequiredUnits(data),
              estimatedSize: data.affectedArea || 'Unknown',
            };
            
            incidents.push(incident);
          });
          
          setFireIncidents(incidents);
          console.log(`Real-time update: ${incidents.length} fire incidents`);
        },
        (error) => {
          console.error('Real-time listener error:', error);
          // Fall back to one-time fetch
          fetchFireIncidents();
        }
      );
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
      // Fall back to one-time fetch
      fetchFireIncidents();
    }
  };

  // Fetch fire incidents from Firebase
  const fetchFireIncidents = async (forceRefresh = false) => {
    try {
      console.log('Fetching fire incidents from Firebase...');
      setRefreshing(true);
      
      // Try multiple queries to catch all fire-related incidents
      const queries = [
        query(
          collection(db, 'citizenReports'),
          where('issueType', '==', 'fire'),
          orderBy('timestamp', 'desc'),
          limit(30)
        ),
        query(
          collection(db, 'citizenReports'),
          where('category', 'in', ['fire', 'Fire', 'Fire Emergency']),
          limit(20)
        )
      ];
      
      const allIncidents = new Map();
      
      for (const q of queries) {
        try {
          const querySnapshot = await getDocs(q);
          
          querySnapshot.forEach((doc) => {
            if (!allIncidents.has(doc.id)) {
              const data = doc.data();
              
              const incident = {
                id: doc.id,
                type: mapFireIncidentType(data.actualCategory || data.category || 'building_fire'),
                title: data.title || data.description?.substring(0, 50) || 'Fire Incident',
                description: data.description || 'Fire incident reported',
                location: data.location || { latitude: 12.9716, longitude: 77.5946 },
                reportedAt: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
                status: data.status || 'pending',
                priority: mapPriority(data.severity || data.priorityScore),
                severity: data.severity,
                priorityScore: data.priorityScore,
                address: data.address,
                mediaUrls: data.mediaUrls,
                assignedTo: data.assignedTo,
                category: data.actualCategory || data.category,
                reporterInfo: data.reporterInfo,
                requiredUnits: getRequiredUnits(data),
                estimatedSize: data.affectedArea || 'Unknown',
              };
              
              allIncidents.set(doc.id, incident);
            }
          });
        } catch (queryError) {
          console.error('Query error:', queryError);
        }
      }
      
      const incidents = Array.from(allIncidents.values());
      incidents.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
      
      setFireIncidents(incidents);
      console.log(`Loaded ${incidents.length} fire incidents from Firebase`);
      
    } catch (error) {
      console.error('Error fetching fire incidents:', error);
      Alert.alert(
        'Connection Error',
        'Unable to fetch fire incidents. Please check your connection.',
        [
          { text: 'Retry', onPress: () => fetchFireIncidents(forceRefresh) },
          { text: 'OK' }
        ]
      );
    } finally {
      setRefreshing(false);
    }
  };
  
  // Helper function to map category to fire incident type
  const mapFireIncidentType = (category) => {
    const categoryMap = {
      'building fire': 'building_fire',
      'house fire': 'building_fire',
      'apartment fire': 'building_fire',
      'vehicle fire': 'vehicle_fire',
      'car fire': 'vehicle_fire',
      'forest fire': 'forest_fire',
      'wildfire': 'forest_fire',
      'electrical fire': 'electrical_fire',
      'electrical': 'electrical_fire',
      'gas leak': 'gas_leak',
      'gas': 'gas_leak',
      'chemical': 'chemical_hazard',
      'hazmat': 'chemical_hazard',
      'rescue': 'rescue',
      'trapped': 'rescue',
      'false alarm': 'false_alarm',
    };
    
    const lowerCategory = category?.toLowerCase() || '';
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }
    
    // Default to building fire if no match
    return 'building_fire';
  };
  
  // Helper function to map priority
  const mapPriority = (severityOrScore) => {
    if (typeof severityOrScore === 'string') {
      const severityMap = {
        'critical': 'critical',
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
      };
      return severityMap[severityOrScore.toLowerCase()] || 'medium';
    } else if (typeof severityOrScore === 'number') {
      if (severityOrScore >= 8) return 'critical';
      if (severityOrScore >= 6) return 'high';
      if (severityOrScore >= 4) return 'medium';
      return 'low';
    }
    return 'medium';
  };
  
  // Helper function to determine required units
  const getRequiredUnits = (data) => {
    const units = [];
    
    if (data.severity === 'Critical' || data.priorityScore >= 8) {
      units.push('3-4 Fire Engines');
      units.push('Ladder Truck');
      units.push('Rescue Unit');
    } else if (data.severity === 'High' || data.priorityScore >= 6) {
      units.push('2 Fire Engines');
      units.push('Rescue Unit');
    } else {
      units.push('1 Fire Engine');
    }
    
    if (data.actualCategory?.includes('chemical') || data.actualCategory?.includes('gas')) {
      units.push('HazMat Unit');
    }
    
    if (data.actualCategory?.includes('rescue') || data.description?.toLowerCase().includes('trapped')) {
      units.push('Ambulance');
    }
    
    return units;
  };

  // Filter incidents based on selected filters and search
  const filteredIncidents = useMemo(() => {
    let filtered = fireIncidents;
    
    // Apply type filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(incident => selectedFilters.includes(incident.type));
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(incident => 
        incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [fireIncidents, selectedFilters, searchQuery]);

  // Get heatmap data for fire intensity visualization
  const heatmapData = useMemo(() => {
    return filteredIncidents.map(incident => ({
      latitude: incident.location.latitude,
      longitude: incident.location.longitude,
      weight: incident.priority === 'critical' ? 100 : incident.priority === 'high' ? 70 : 40
    }));
  }, [filteredIncidents]);

  const handleIncidentMarkerPress = useCallback((incident) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    } else {
      Vibration.vibrate(20);
    }
    
    setSelectedIncident(incident);
    
    mapRef.current?.animateCamera({
      center: {
        latitude: incident.location.latitude - 0.01,
        longitude: incident.location.longitude,
      },
      zoom: 15,
    }, { duration: 800 });
    
    setModalPosition('bottom');
    setShowIncidentModal(true);
  }, []);

  const renderIncidentMarker = useCallback((incident) => {
    const incidentConfig = FIRE_INCIDENT_TYPES[incident.type];
    const isSelected = selectedIncident?.id === incident.id;
    const isCritical = incident.priority === 'critical';
    
    return (
      <Marker
        key={incident.id}
        coordinate={incident.location}
        onPress={() => handleIncidentMarkerPress(incident)}
        tracksViewChanges={false}
      >
        <Animated.View style={[
          styles.incidentMarkerContainer,
          isCritical && { transform: [{ scale: pulseAnim }] }
        ]}>
          <Animated.View style={[
            styles.incidentMarkerOuter,
            { 
              borderColor: incidentConfig.color,
              transform: [
                { scale: isSelected ? 1.1 : 1 },
                isCritical && { scale: fireAnim }
              ].filter(Boolean)
            }
          ]}>
            <LinearGradient
              colors={[incidentConfig.color + '40', incidentConfig.color + '80']}
              style={styles.incidentMarkerInner}
            >
              <MaterialCommunityIcons 
                name={incidentConfig.icon} 
                size={28} 
                color={incidentConfig.color} 
              />
              {isCritical && (
                <View style={[styles.criticalBadge, { backgroundColor: incidentConfig.color }]}>
                  <MaterialCommunityIcons name="alert" size={12} color="#FFFFFF" />
                </View>
              )}
            </LinearGradient>
          </Animated.View>
          <View style={[styles.incidentLabelContainer, { backgroundColor: incidentConfig.color + 'F0' }]}>
            <Text style={styles.incidentLabelText}>{incidentConfig.label}</Text>
          </View>
        </Animated.View>
      </Marker>
    );
  }, [selectedIncident, handleIncidentMarkerPress, pulseAnim, fireAnim]);

  const renderIncidentDetails = () => {
    if (!selectedIncident) {
      return (
        <View style={styles.modalEmpty}>
          <MaterialCommunityIcons name="fire-alert" size={48} color="#666" />
          <Text style={styles.modalEmptyText}>Select an incident to view details</Text>
        </View>
      );
    }
    
    const incidentConfig = FIRE_INCIDENT_TYPES[selectedIncident.type];
    const timeSinceReport = getTimeSince(selectedIncident.reportedAt);
    
    return (
      <ScrollView 
        style={styles.modalContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFireIncidents(true)}
            tintColor="#FF4757"
          />
        }
      >
        {/* Incident Header */}
        <View style={styles.incidentHeader}>
          <View style={[styles.incidentStatusIcon, { backgroundColor: incidentConfig.color + '20' }]}>
            <MaterialCommunityIcons 
              name={incidentConfig.icon} 
              size={32} 
              color={incidentConfig.color} 
            />
          </View>
          <View style={styles.incidentHeaderInfo}>
            <Text style={styles.incidentTitle}>{selectedIncident.title}</Text>
            <View style={styles.incidentMetaRow}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedIncident.priority) }]}>
                <Text style={styles.priorityText}>{selectedIncident.priority.toUpperCase()}</Text>
              </View>
              <Text style={styles.incidentTime}>{timeSinceReport}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => fetchFireIncidents(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={24} color="#666" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Critical Alert */}
        {selectedIncident.priority === 'critical' && (
          <View style={styles.criticalAlert}>
            <LinearGradient
              colors={['#FF4757', '#EE5A6F']}
              style={styles.criticalAlertGradient}
            >
              <MaterialCommunityIcons name="alert-octagon" size={20} color="#FFFFFF" />
              <Text style={styles.criticalAlertText}>CRITICAL EMERGENCY - IMMEDIATE RESPONSE REQUIRED</Text>
            </LinearGradient>
          </View>
        )}
        
        {/* Incident Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incident Details</Text>
          <Text style={styles.incidentDescription}>{selectedIncident.description}</Text>
        </View>
        
        {/* Required Units */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Required Units</Text>
            <MaterialCommunityIcons name="fire-truck" size={20} color="#FF4757" />
          </View>
          <View style={styles.unitsContainer}>
            {selectedIncident.requiredUnits?.map((unit, index) => (
              <View key={index} style={styles.unitCard}>
                <MaterialCommunityIcons 
                  name={getUnitIcon(unit)} 
                  size={20} 
                  color="#FF4757" 
                />
                <Text style={styles.unitText}>{unit}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Fire Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fire Information</Text>
            <MaterialCommunityIcons name="fire" size={20} color="#FF6348" />
          </View>
          <View style={styles.fireDetailsGrid}>
            <View style={styles.fireDetailCard}>
              <MaterialCommunityIcons name="resize" size={20} color="#FF6348" />
              <Text style={styles.fireDetailLabel}>Estimated Size</Text>
              <Text style={styles.fireDetailValue}>{selectedIncident.estimatedSize}</Text>
            </View>
            <View style={styles.fireDetailCard}>
              <MaterialCommunityIcons name="home-group" size={20} color="#FF6348" />
              <Text style={styles.fireDetailLabel}>Structure Type</Text>
              <Text style={styles.fireDetailValue}>
                {selectedIncident.type === 'building_fire' ? 'Building' : 
                 selectedIncident.type === 'vehicle_fire' ? 'Vehicle' : 
                 selectedIncident.type === 'forest_fire' ? 'Forest' : 'Other'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Response Status */}
        {selectedIncident.assignedTo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Response Status</Text>
              <MaterialCommunityIcons name="speedometer" size={20} color="#2ED573" />
            </View>
            <View style={styles.responseCard}>
              <View style={styles.responseIcon}>
                <MaterialCommunityIcons name="fire-truck" size={20} color="#2ED573" />
              </View>
              <Text style={styles.responseText}>Units Dispatched</Text>
              <View style={styles.responseStatus}>
                <Text style={styles.responseStatusText}>En Route</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Location Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            <MaterialIcons name="location-on" size={20} color="#FF4757" />
          </View>
          <TouchableOpacity 
            style={styles.locationCard}
            onPress={() => {
              // Navigate to location
            }}
            activeOpacity={0.8}
          >
            <View style={styles.locationInfo}>
              <Text style={styles.locationCoords}>
                {selectedIncident.location.latitude.toFixed(6)}, {selectedIncident.location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationAddress}>{selectedIncident.address || 'Tap to get directions'}</Text>
            </View>
            <MaterialIcons name="directions" size={24} color="#4C6EF5" />
          </TouchableOpacity>
        </View>
        
        {/* Water Sources Nearby */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearest Water Sources</Text>
            <MaterialCommunityIcons name="water" size={20} color="#54A0FF" />
          </View>
          <View style={styles.waterSourcesList}>
            <View style={styles.waterSourceItem}>
              <MaterialCommunityIcons name="fire-hydrant" size={16} color="#54A0FF" />
              <Text style={styles.waterSourceText}>Fire Hydrant - 150m</Text>
            </View>
            <View style={styles.waterSourceItem}>
              <MaterialCommunityIcons name="water" size={16} color="#54A0FF" />
              <Text style={styles.waterSourceText}>Water Tank - 500m</Text>
            </View>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {selectedIncident.status === 'pending' && !selectedIncident.assignedTo ? (
            <TouchableOpacity 
              style={styles.actionButton} 
              activeOpacity={0.8}
              onPress={() => handleAcceptIncident(selectedIncident)}
            >
              <LinearGradient
                colors={['#FF4757', '#EE5A6F']}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="fire-truck" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Dispatch Units</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : selectedIncident.assignedTo === user?.uid ? (
            <>
              <TouchableOpacity 
                style={styles.actionButton} 
                activeOpacity={0.8}
                onPress={() => handleControlled(selectedIncident)}
              >
                <LinearGradient
                  colors={['#2ED573', '#27AE60']}
                  style={styles.actionButtonGradient}
                >
                  <MaterialCommunityIcons name="fire-extinguisher" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Fire Controlled</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonSpacing]} 
                activeOpacity={0.8}
                onPress={() => handleUpdateStatus(selectedIncident)}
              >
                <LinearGradient
                  colors={['#4C6EF5', '#3949AB']}
                  style={styles.actionButtonGradient}
                >
                  <MaterialIcons name="update" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Update Status</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.assignedToOtherContainer}>
              <MaterialCommunityIcons name="account-lock" size={24} color="#999" />
              <Text style={styles.assignedToOtherText}>
                Units Already Dispatched
              </Text>
            </View>
          )}
        </View>
        
        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderFilterModal = () => {
    return (
      <View style={styles.filterModalContent}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter Incidents</Text>
          <TouchableOpacity onPress={() => setSelectedFilters([])}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.entries(FIRE_INCIDENT_TYPES).map(([key, config]) => {
            const isSelected = selectedFilters.includes(key);
            const incidentCount = fireIncidents.filter(i => i.type === key).length;
            
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterOption,
                  isSelected && styles.filterOptionSelected
                ]}
                onPress={() => {
                  if (isSelected) {
                    setSelectedFilters(prev => prev.filter(f => f !== key));
                  } else {
                    setSelectedFilters(prev => [...prev, key]);
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.filterOptionLeft}>
                  <View style={[styles.filterIcon, { backgroundColor: config.color + '20' }]}>
                    <MaterialCommunityIcons 
                      name={config.icon} 
                      size={24} 
                      color={config.color} 
                    />
                  </View>
                  <Text style={styles.filterLabel}>{config.label}</Text>
                </View>
                <View style={styles.filterOptionRight}>
                  <Text style={styles.filterCount}>{incidentCount}</Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={20} color="#FF4757" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Helper functions
  const getTimeSince = (timestamp) => {
    const now = new Date();
    const reportTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - reportTime) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#FF4757';
      case 'high': return '#FF6348';
      case 'medium': return '#FFA502';
      case 'low': return '#F39C12';
      default: return '#999999';
    }
  };

  const getUnitIcon = (unit) => {
    if (unit.includes('Engine')) return 'fire-truck';
    if (unit.includes('Ladder')) return 'ladder';
    if (unit.includes('Rescue')) return 'ambulance';
    if (unit.includes('HazMat')) return 'biohazard';
    return 'truck';
  };

  const handleAcceptIncident = async (incident) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please sign in to dispatch units');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'citizenReports', incident.id), {
        status: 'assigned',
        assignedTo: user.uid,
        assignedAt: serverTimestamp(),
      });
      
      Alert.alert(
        'Units Dispatched',
        'Fire units have been dispatched to the location',
        [{ text: 'OK', onPress: () => setShowIncidentModal(false) }]
      );
    } catch (error) {
      console.error('Error dispatching units:', error);
      Alert.alert('Error', 'Failed to dispatch units. Please try again.');
    }
  };

  const handleControlled = async (incident) => {
    Alert.alert(
      'Fire Controlled',
      'Confirm that the fire has been controlled?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'citizenReports', incident.id), {
                status: 'controlled',
                controlledAt: serverTimestamp(),
              });
              
              Alert.alert(
                'Status Updated',
                'Fire has been marked as controlled',
                [{ text: 'OK', onPress: () => setShowIncidentModal(false) }]
              );
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Failed to update status. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleUpdateStatus = async (incident) => {
    Alert.alert(
      'Update Status',
      'Select new status',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'On Scene',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'citizenReports', incident.id), {
                status: 'on_scene',
                arrivedAt: serverTimestamp(),
              });
              Alert.alert('Success', 'Status updated to On Scene');
            } catch (error) {
              Alert.alert('Error', 'Failed to update status');
            }
          }
        },
        {
          text: 'Fighting Fire',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'citizenReports', incident.id), {
                status: 'fighting_fire',
                lastUpdated: serverTimestamp(),
              });
              Alert.alert('Success', 'Status updated to Fighting Fire');
            } catch (error) {
              Alert.alert('Error', 'Failed to update status');
            }
          }
        }
      ]
    );
  };

  const rotateImage = () => {
    const newRotationAngle = rotationAngle + 90;
    setRotationAngle(newRotationAngle);
  };

  const onZoomEventFunction = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );

  const onZoomStateChangeFunction = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true
      }).start();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4757" />
        <Text style={styles.loadingText}>Initializing Fire Response System...</Text>
      </View>
    );
  }

  if (showMapImage && mapImage) {
    return (
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <Button
          icon="rotate-right"
          style={styles.rotateButton}
          mode="outlined"
          color="white"
          onPress={rotateImage}
        >
          ROTATE
        </Button>
        
        <TouchableOpacity 
          style={styles.backToMapButton}
          onPress={() => setShowMapImage(false)}
        >
          <LinearGradient
            colors={['#FF4757', '#EE5A6F']}
            style={styles.backToMapGradient}
          >
            <MaterialIcons name="map" size={20} color="#FFFFFF" />
            <Text style={styles.backToMapText}>Back to Live Map</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <PinchGestureHandler
          onGestureEvent={onZoomEventFunction}
          onHandlerStateChange={onZoomStateChangeFunction}
        >
          <Animated.View style={[
            { transform: [{ rotate: `${rotationAngle}deg` }] },
            styles.imageContainer
          ]}>
            <Animated.Image
              source={mapImage}
              style={[styles.mapImage, { transform: [{ scale: scale }] }]}
              resizeMode="contain"
            />
          </Animated.View>
        </PinchGestureHandler>
      </ScrollView>
    );
  }
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        customMapStyle={fireMapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => {
          console.log('Map is ready');
          setMapReady(true);
        }}
        onPress={() => {
          if (showIncidentModal) setShowIncidentModal(false);
          if (showFilterModal) setShowFilterModal(false);
        }}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* User Location */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            tracksViewChanges={false}
          >
            <View style={styles.userLocationDot}>
              <View style={styles.userLocationInnerDot} />
            </View>
          </Marker>
        )}
        
        {/* Fire Incident Markers */}
        {filteredIncidents.map((incident) => renderIncidentMarker(incident))}
        
        {/* Critical Incident Radius Circles */}
        {filteredIncidents.filter(incident => incident.priority === 'critical').map((incident) => (
          <Circle
            key={`circle-${incident.id}`}
            center={incident.location}
            radius={300}
            fillColor={FIRE_INCIDENT_TYPES[incident.type].color + '20'}
            strokeColor={FIRE_INCIDENT_TYPES[incident.type].color + '40'}
            strokeWidth={2}
          />
        ))}
        
        {/* Heatmap overlay for fire intensity */}
        {showHeatmap && heatmapData.length > 0 && (
          <Heatmap
            points={heatmapData}
            radius={40}
            opacity={0.6}
            gradient={{
              colors: ['yellow', 'orange', 'red', 'darkred'],
              startPoints: [0.2, 0.4, 0.6, 1.0],
              colorMapSize: 256
            }}
          />
        )}
      </MapView>
      
      {/* Search Bar */}
      <Animated.View style={[
        styles.searchBar,
        {
          opacity: fadeAnim,
          transform: [{ translateY: scaleAnim.interpolate({
            inputRange: [0.8, 1],
            outputRange: [-20, 0]
          })}]
        }
      ]}>
        <LinearGradient
          colors={['#1a1a2e', '#2e1616']}
          style={styles.searchGradient}
        >
          <View style={styles.searchContent}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search incidents..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
      
      {/* Filter Button */}
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowFilterModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF4757', '#EE5A6F']}
          style={styles.filterButtonGradient}
        >
          <MaterialCommunityIcons name="filter" size={24} color="#FFFFFF" />
          {selectedFilters.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedFilters.length}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Stats Widget */}
      <View style={styles.statsWidget}>
        <LinearGradient
          colors={['#1a1a2e', '#2e1616']}
          style={styles.statsGradient}
        >
          <TouchableOpacity style={styles.statItem} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#FF4757' }]} />
            <Text style={styles.statCount}>
              {filteredIncidents.filter(i => i.priority === 'critical').length}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#FF6348' }]} />
            <Text style={styles.statCount}>
              {filteredIncidents.filter(i => i.priority === 'high').length}
            </Text>
            <Text style={styles.statLabel}>High</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#FFA502' }]} />
            <Text style={styles.statCount}>
              {filteredIncidents.filter(i => i.status === 'pending' || i.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#2ED573' }]} />
            <Text style={styles.statCount}>
              {filteredIncidents.filter(i => i.assignedTo === user?.uid).length}
            </Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
      
      {/* Heatmap Toggle */}
      <TouchableOpacity 
        style={styles.heatmapButton}
        onPress={() => setShowHeatmap(!showHeatmap)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={showHeatmap ? ['#FFA502', '#FF6348'] : ['#666', '#444']}
          style={styles.heatmapButtonGradient}
        >
          <MaterialCommunityIcons name="fire" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Map Type Toggle */}
      <TouchableOpacity 
        style={styles.mapToggleButton}
        onPress={() => {
          setMapImage(require("../assets/images/map.png"));
          setShowMapImage(true);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#B33939', '#CD6133']}
          style={styles.mapToggleGradient}
        >
          <MaterialCommunityIcons name="map-legend" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Refresh Button */}
      <TouchableOpacity 
        style={styles.floatingRefreshButton}
        onPress={() => fetchFireIncidents(true)}
        activeOpacity={0.8}
        disabled={refreshing}
      >
        <LinearGradient
          colors={['#E55039', '#F39C12']}
          style={styles.floatingButtonGradient}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Location Button */}
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={() => {
          if (location && mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }, 500);
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4C6EF5', '#3949AB']}
          style={styles.locationButtonGradient}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Modal Position Toggle */}
      {(showIncidentModal || showFilterModal) && (
        <TouchableOpacity 
          style={styles.modalPositionToggle}
          onPress={() => {
            const positions = ['center', 'bottom', 'right', 'left'];
            const currentIndex = positions.indexOf(modalPosition);
            const nextIndex = (currentIndex + 1) % positions.length;
            setModalPosition(positions[nextIndex]);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6348', '#EE5A6F']}
            style={styles.modalPositionGradient}
          >
            <MaterialCommunityIcons name="window-restore" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      {/* Incident Details Modal */}
      <LuxuryModal
        visible={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        title={selectedIncident ? FIRE_INCIDENT_TYPES[selectedIncident.type].label : 'Incident Details'}
        position={modalPosition}
        animationType="slide"
        blurBackground={true}
      >
        {renderIncidentDetails()}
      </LuxuryModal>
      
      {/* Filter Modal */}
      <LuxuryModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Incidents"
        position="bottom"
        animationType="slide"
        blurBackground={true}
      >
        {renderFilterModal()}
      </LuxuryModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a15',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  map: {
    flex: 1,
  },
  scrollViewContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a15',
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapImage: {
    width: "100%",
    height: "100%",
    marginTop: -150,
  },
  rotateButton: {
    marginLeft: 0,
    width: "80%",
    alignSelf: "center",
    marginTop: 150,
  },
  backToMapButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backToMapGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backToMapText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Search Bar
  searchBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchGradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  
  // Filter Button
  filterButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  filterButtonGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF4757',
  },
  filterBadgeText: {
    color: '#FF4757',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Stats Widget
  statsWidget: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  statsGradient: {
    flexDirection: 'row',
    padding: 14,
  },
  statItem: {
    alignItems: 'center',
  },
  statItemSpacing: {
    marginLeft: 20,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statCount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statLabel: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // User Location
  userLocationDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4C6EF5',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4C6EF5',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  userLocationInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  
  // Incident Markers
  incidentMarkerContainer: {
    alignItems: 'center',
  },
  incidentMarkerOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  incidentMarkerInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  criticalBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  incidentLabelContainer: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  incidentLabelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Floating Buttons
  heatmapButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFA502',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heatmapButtonGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapToggleButton: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#B33939',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  mapToggleGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingRefreshButton: {
    position: 'absolute',
    bottom: 250,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#E55039',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  locationButton: {
    position: 'absolute',
    bottom: 320,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4C6EF5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  floatingButtonGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButtonGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPositionToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FF6348',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalPositionGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal Styles
  modalEmpty: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  modalEmptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  
  // Incident Details
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  incidentStatusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  incidentHeaderInfo: {
    flex: 1,
  },
  incidentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  incidentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  incidentTime: {
    color: '#999',
    fontSize: 14,
  },
  refreshButton: {
    padding: 8,
  },
  incidentDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 24,
  },
  
  // Critical Alert
  criticalAlert: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  criticalAlertGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  criticalAlertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  
  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Units
  unitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  unitText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Fire Details
  fireDetailsGrid: {
    flexDirection: 'row',
    marginTop: 8,
  },
  fireDetailCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 99, 72, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  fireDetailLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  fireDetailValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Response
  responseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 213, 115, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  responseIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(46, 213, 115, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  responseText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  responseStatus: {
    backgroundColor: '#2ED573',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  responseStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationCoords: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationAddress: {
    color: '#999',
    fontSize: 12,
  },
  
  // Water Sources
  waterSourcesList: {
    backgroundColor: 'rgba(84, 160, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  waterSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  waterSourceText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonSpacing: {
    marginLeft: 12,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  assignedToOtherContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(153, 153, 153, 0.1)',
    borderRadius: 16,
  },
  assignedToOtherText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Filter Modal
  filterModalContent: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearFiltersText: {
    color: '#FF4757',
    fontSize: 14,
    fontWeight: '600',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterOptionSelected: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  filterLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filterOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterCount: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
});