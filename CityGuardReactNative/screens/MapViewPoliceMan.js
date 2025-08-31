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
  serverTimestamp
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

// Enhanced dark map style
const luxuryDarkMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#0f0f1a" }]
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a4a5a" }]
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0f0f1a" }]
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#1a1a2e" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#16213e" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a1a2e" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f0f1a" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a0a15" }]
  }
];

// Safety issue type configurations
const ISSUE_TYPES = {
  accident: {
    icon: 'car-crash',
    color: '#FF4757',
    priority: 'high',
    label: 'Accident'
  },
  crime: {
    icon: 'shield-alert',
    color: '#FF6348',
    priority: 'high',
    label: 'Crime'
  },
  medical: {
    icon: 'hospital',
    color: '#FF6B9D',
    priority: 'high',
    label: 'Medical Emergency'
  },
  fire: {
    icon: 'fire',
    color: '#FF9F40',
    priority: 'critical',
    label: 'Fire'
  },
  flood: {
    icon: 'water',
    color: '#54A0FF',
    priority: 'high',
    label: 'Flood'
  },
  traffic: {
    icon: 'traffic-light',
    color: '#FFA502',
    priority: 'medium',
    label: 'Traffic Violation'
  },
  suspicious: {
    icon: 'eye',
    color: '#A55EEA',
    priority: 'medium',
    label: 'Suspicious Activity'
  },
  infrastructure: {
    icon: 'road-variant',
    color: '#FD79A8',
    priority: 'low',
    label: 'Infrastructure'
  }
};

export default function MapViewPoliceMan() {
  // State Management
  const [location, setLocation] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [safetyIssues, setSafetyIssues] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapImage, setMapImage] = useState(null);
  const [showMapImage, setShowMapImage] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  
  // Filter States
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [showIssueModal, setShowIssueModal] = useState(false);
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

  // Set up real-time listener for safety issues
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
    
    // Pulse animation for critical issues
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
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
  };

  // Set up real-time listener for safety issues
  const setupRealtimeListener = () => {
    try {
      console.log('Setting up real-time listener for safety issues...');
      
      const q = query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'safety'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      unsubscribeRef.current = onSnapshot(q, 
        (snapshot) => {
          const issues = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            const issue = {
              id: doc.id,
              type: mapIssueType(data.actualCategory || data.category || 'crime'),
              title: data.title || data.description?.substring(0, 50) || 'Safety Issue',
              description: data.description || 'Safety issue reported',
              location: data.location || { latitude: 12.9716, longitude: 77.5946 },
              reportedAt: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
              status: data.status || 'pending',
              priority: mapPriority(data.severity || data.priorityScore),
              reporterCount: 1,
              responders: getResponders(data),
              images: data.mediaUrls?.photoUrl ? [data.mediaUrls.photoUrl] : [],
              severity: data.severity,
              priorityScore: data.priorityScore,
              address: data.address,
              mediaUrls: data.mediaUrls,
              assignedTo: data.assignedTo,
              category: data.actualCategory || data.category,
            };
            
            issues.push(issue);
          });
          
          setSafetyIssues(issues);
          console.log(`Real-time update: ${issues.length} safety issues`);
        },
        (error) => {
          console.error('Real-time listener error:', error);
          // Fall back to one-time fetch
          fetchSafetyIssues();
        }
      );
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
      // Fall back to one-time fetch
      fetchSafetyIssues();
    }
  };

  // Fetch safety issues from Firebase
  const fetchSafetyIssues = async (forceRefresh = false) => {
    try {
      console.log('Fetching safety issues from Firebase...');
      setRefreshing(true);
      
      // Query Firebase for safety issues
      const q = query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'safety'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const issues = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Map Firebase data to our issue format
        const issue = {
          id: doc.id,
          type: mapIssueType(data.actualCategory || data.category || 'crime'),
          title: data.title || data.description?.substring(0, 50) || 'Safety Issue',
          description: data.description || 'Safety issue reported',
          location: data.location || { latitude: 12.9716, longitude: 77.5946 },
          reportedAt: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
          status: data.status || 'pending',
          priority: mapPriority(data.severity || data.priorityScore),
          reporterCount: 1,
          responders: getResponders(data),
          images: data.mediaUrls?.photoUrl ? [data.mediaUrls.photoUrl] : [],
          severity: data.severity,
          priorityScore: data.priorityScore,
          address: data.address,
          mediaUrls: data.mediaUrls,
          assignedTo: data.assignedTo,
          category: data.actualCategory || data.category,
        };
        
        issues.push(issue);
      });
      
      setSafetyIssues(issues);
      console.log(`Loaded ${issues.length} safety issues from Firebase`);
      
    } catch (error) {
      console.error('Error fetching safety issues:', error);
      
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        // Try simpler query without ordering
        try {
          const simpleQuery = query(
            collection(db, 'citizenReports'),
            where('issueType', '==', 'safety'),
            limit(50)
          );
          
          const querySnapshot = await getDocs(simpleQuery);
          const issues = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const issue = {
              id: doc.id,
              type: mapIssueType(data.actualCategory || data.category || 'crime'),
              title: data.title || data.description?.substring(0, 50) || 'Safety Issue',
              description: data.description || 'Safety issue reported',
              location: data.location || { latitude: 12.9716, longitude: 77.5946 },
              reportedAt: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
              status: data.status || 'pending',
              priority: mapPriority(data.severity || data.priorityScore),
              reporterCount: 1,
              responders: getResponders(data),
              images: data.mediaUrls?.photoUrl ? [data.mediaUrls.photoUrl] : [],
              severity: data.severity,
              priorityScore: data.priorityScore,
              address: data.address,
              mediaUrls: data.mediaUrls,
              assignedTo: data.assignedTo,
              category: data.actualCategory || data.category,
            };
            issues.push(issue);
          });
          
          // Sort by timestamp manually
          issues.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
          
          setSafetyIssues(issues);
          console.log(`Loaded ${issues.length} safety issues from Firebase (fallback query)`);
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          Alert.alert(
            'Database Error',
            'Unable to fetch safety issues. Please try again later.',
            [
              { text: 'Retry', onPress: () => fetchSafetyIssues(forceRefresh) },
              { text: 'OK' }
            ]
          );
        }
      } else {
        Alert.alert(
          'Connection Error',
          'Unable to fetch safety issues. Please check your connection.',
          [
            { text: 'Retry', onPress: () => fetchSafetyIssues(forceRefresh) },
            { text: 'OK' }
          ]
        );
      }
    } finally {
      setRefreshing(false);
    }
  };
  
  // Helper function to map category to issue type
  const mapIssueType = (category) => {
    const categoryMap = {
      'accident': 'accident',
      'vehicle accident': 'accident',
      'road accident': 'accident',
      'crime': 'crime',
      'theft': 'crime',
      'robbery': 'crime',
      'assault': 'crime',
      'fire': 'fire',
      'building fire': 'fire',
      'medical': 'medical',
      'medical emergency': 'medical',
      'health': 'medical',
      'traffic': 'traffic',
      'traffic violation': 'traffic',
      'flood': 'flood',
      'flooding': 'flood',
      'suspicious': 'suspicious',
      'suspicious activity': 'suspicious',
      'infrastructure': 'infrastructure',
      'road damage': 'infrastructure',
    };
    
    const lowerCategory = category?.toLowerCase() || '';
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }
    
    // Default to crime if no match
    return 'crime';
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
  
  // Helper function to get responders
  const getResponders = (data) => {
    const responders = [];
    
    if (data.assignedTo) {
      responders.push(`Officer ${data.assignedTo.substring(0, 6)}`);
    }
    
    if (data.status === 'assigned' || data.status === 'in_progress') {
      if (data.actualCategory?.includes('fire')) {
        responders.push('Fire Station');
      }
      if (data.actualCategory?.includes('medical')) {
        responders.push('Ambulance');
      }
      if (!responders.length || data.actualCategory?.includes('crime')) {
        responders.push('Police Unit');
      }
    }
    
    return responders;
  };

  // Filter issues based on selected filters and search
  const filteredIssues = useMemo(() => {
    let filtered = safetyIssues;
    
    // Apply type filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(issue => selectedFilters.includes(issue.type));
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(issue => 
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [safetyIssues, selectedFilters, searchQuery]);

  const handleIssueMarkerPress = useCallback((issue) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    } else {
      Vibration.vibrate(20);
    }
    
    setSelectedIssue(issue);
    
    mapRef.current?.animateCamera({
      center: {
        latitude: issue.location.latitude - 0.01,
        longitude: issue.location.longitude,
      },
      zoom: 15,
    }, { duration: 800 });
    
    setModalPosition('bottom');
    setShowIssueModal(true);
  }, []);

  const renderIssueMarker = useCallback((issue) => {
    const issueConfig = ISSUE_TYPES[issue.type];
    const isSelected = selectedIssue?.id === issue.id;
    const isCritical = issue.priority === 'critical';
    
    return (
      <Marker
        key={issue.id}
        coordinate={issue.location}
        onPress={() => handleIssueMarkerPress(issue)}
        tracksViewChanges={false}
      >
        <Animated.View style={[
          styles.issueMarkerContainer,
          isCritical && { transform: [{ scale: pulseAnim }] }
        ]}>
          <View style={[
            styles.issueMarkerOuter,
            { 
              borderColor: issueConfig.color,
              transform: [{ scale: isSelected ? 1.1 : 1 }]
            }
          ]}>
            <LinearGradient
              colors={[issueConfig.color + '20', issueConfig.color + '40']}
              style={styles.issueMarkerInner}
            >
              <MaterialCommunityIcons 
                name={issueConfig.icon} 
                size={28} 
                color={issueConfig.color} 
              />
              {issue.reporterCount > 1 && (
                <View style={[styles.reporterBadge, { backgroundColor: issueConfig.color }]}>
                  <Text style={styles.reporterBadgeText}>{issue.reporterCount}</Text>
                </View>
              )}
            </LinearGradient>
          </View>
          <View style={[styles.issueLabelContainer, { backgroundColor: issueConfig.color + 'F0' }]}>
            <Text style={styles.issueLabelText}>{issueConfig.label}</Text>
          </View>
        </Animated.View>
      </Marker>
    );
  }, [selectedIssue, handleIssueMarkerPress, pulseAnim]);

  const renderIssueDetails = () => {
    if (!selectedIssue) {
      return (
        <View style={styles.modalEmpty}>
          <MaterialCommunityIcons name="shield-alert" size={48} color="#666" />
          <Text style={styles.modalEmptyText}>Select an issue to view details</Text>
        </View>
      );
    }
    
    const issueConfig = ISSUE_TYPES[selectedIssue.type];
    const timeSinceReport = getTimeSince(selectedIssue.reportedAt);
    
    return (
      <ScrollView 
        style={styles.modalContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchSafetyIssues(true)}
            tintColor="#FF6B9D"
          />
        }
      >
        {/* Issue Header */}
        <View style={styles.issueHeader}>
          <View style={[styles.issueStatusIcon, { backgroundColor: issueConfig.color + '20' }]}>
            <MaterialCommunityIcons 
              name={issueConfig.icon} 
              size={32} 
              color={issueConfig.color} 
            />
          </View>
          <View style={styles.issueHeaderInfo}>
            <Text style={styles.issueTitle}>{selectedIssue.title}</Text>
            <View style={styles.issueMetaRow}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedIssue.priority) }]}>
                <Text style={styles.priorityText}>{selectedIssue.priority.toUpperCase()}</Text>
              </View>
              <Text style={styles.issueTime}>{timeSinceReport}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => fetchSafetyIssues(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={24} color="#666" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Issue Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.issueDescription}>{selectedIssue.description}</Text>
        </View>
        
        {/* Reporters Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reported By</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#4C6EF5' }]}>
              <Text style={styles.sectionBadgeText}>{selectedIssue.reporterCount}</Text>
            </View>
          </View>
          <View style={styles.reportersInfo}>
            <MaterialCommunityIcons name="account-group" size={20} color="#4C6EF5" />
            <Text style={styles.reportersText}>
              {selectedIssue.reporterCount} citizen{selectedIssue.reporterCount > 1 ? 's' : ''} reported this issue
            </Text>
          </View>
        </View>
        
        {/* Responders Section */}
        {selectedIssue.responders && selectedIssue.responders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Responders</Text>
              <MaterialCommunityIcons name="police-badge" size={20} color="#2ED573" />
            </View>
            {selectedIssue.responders.map((responder, index) => (
              <View key={index} style={styles.responderCard}>
                <View style={styles.responderIcon}>
                  <MaterialCommunityIcons 
                    name={getResponderIcon(responder)} 
                    size={20} 
                    color="#2ED573" 
                  />
                </View>
                <Text style={styles.responderName}>{responder}</Text>
                <View style={styles.responderStatus}>
                  <Text style={styles.responderStatusText}>En Route</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        
        {/* Location Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            <MaterialIcons name="location-on" size={20} color="#FF6B9D" />
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
                {selectedIssue.location.latitude.toFixed(6)}, {selectedIssue.location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationHint}>Tap to get directions</Text>
            </View>
            <MaterialIcons name="directions" size={24} color="#4C6EF5" />
          </TouchableOpacity>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {selectedIssue.status === 'pending' && !selectedIssue.assignedTo ? (
            <TouchableOpacity 
              style={styles.actionButton} 
              activeOpacity={0.8}
              onPress={() => handleAcceptIssue(selectedIssue)}
            >
              <LinearGradient
                colors={['#2ED573', '#27AE60']}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="shield-check" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Accept Case</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : selectedIssue.assignedTo === user?.uid ? (
            <>
              <TouchableOpacity 
                style={styles.actionButton} 
                activeOpacity={0.8}
                onPress={() => handleMarkResolved(selectedIssue)}
              >
                <LinearGradient
                  colors={['#2ED573', '#27AE60']}
                  style={styles.actionButtonGradient}
                >
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark Resolved</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonSpacing]} 
                activeOpacity={0.8}
                onPress={() => handleUpdateStatus(selectedIssue)}
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
                Assigned to {selectedIssue.assignedTo === user?.uid ? 'You' : 'Another Officer'}
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
          <Text style={styles.filterTitle}>Filter Issues</Text>
          <TouchableOpacity onPress={() => setSelectedFilters([])}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.entries(ISSUE_TYPES).map(([key, config]) => {
            const isSelected = selectedFilters.includes(key);
            const issueCount = safetyIssues.filter(i => i.type === key).length;
            
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
                  <Text style={styles.filterCount}>{issueCount}</Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={20} color="#4C6EF5" />
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
      case 'low': return '#4CAF50';
      default: return '#999999';
    }
  };

  const getResponderIcon = (responder) => {
    if (responder.includes('Police')) return 'police-badge';
    if (responder.includes('Ambulance')) return 'ambulance';
    if (responder.includes('Fire')) return 'fire-truck';
    if (responder.includes('Traffic')) return 'traffic-light';
    return 'account';
  };

  const handleAcceptIssue = async (issue) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please sign in to accept cases');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'citizenReports', issue.id), {
        status: 'assigned',
        assignedTo: user.uid,
        assignedAt: serverTimestamp(),
      });
      
      Alert.alert(
        'Success',
        'You have been assigned to this case',
        [{ text: 'OK', onPress: () => setShowIssueModal(false) }]
      );
    } catch (error) {
      console.error('Error accepting issue:', error);
      Alert.alert('Error', 'Failed to accept case. Please try again.');
    }
  };

  const handleMarkResolved = async (issue) => {
    Alert.alert(
      'Mark as Resolved',
      'Are you sure this issue has been resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'citizenReports', issue.id), {
                status: 'resolved',
                resolvedBy: user.uid,
                resolvedAt: serverTimestamp(),
              });
              
              Alert.alert(
                'Success',
                'Case has been marked as resolved',
                [{ text: 'OK', onPress: () => setShowIssueModal(false) }]
              );
            } catch (error) {
              console.error('Error resolving issue:', error);
              Alert.alert('Error', 'Failed to resolve case. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleUpdateStatus = async (issue) => {
    Alert.alert(
      'Update Status',
      'Change status to "In Progress"?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'citizenReports', issue.id), {
                status: 'in_progress',
                lastUpdated: serverTimestamp(),
              });
              
              Alert.alert(
                'Success',
                'Status updated to In Progress',
                [{ text: 'OK' }]
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
        <ActivityIndicator size="large" color="#FF6B9D" />
        <Text style={styles.loadingText}>Initializing Safety Monitor...</Text>
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
            colors={['#4C6EF5', '#3949AB']}
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
        customMapStyle={luxuryDarkMapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => {
          console.log('Map is ready');
          setMapReady(true);
        }}
        onPress={() => {
          if (showIssueModal) setShowIssueModal(false);
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
        
        {/* Safety Issue Markers */}
        {filteredIssues.map((issue) => renderIssueMarker(issue))}
        
        {/* Critical Issue Radius Circles */}
        {filteredIssues.filter(issue => issue.priority === 'critical').map((issue) => (
          <Circle
            key={`circle-${issue.id}`}
            center={issue.location}
            radius={200}
            fillColor={ISSUE_TYPES[issue.type].color + '20'}
            strokeColor={ISSUE_TYPES[issue.type].color + '40'}
            strokeWidth={2}
          />
        ))}
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
          colors={['#1a1a2e', '#16213e']}
          style={styles.searchGradient}
        >
          <View style={styles.searchContent}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search issues..."
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
          colors={['#6C63FF', '#4C4C6D']}
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
          colors={['#1a1a2e', '#16213e']}
          style={styles.statsGradient}
        >
          <TouchableOpacity style={styles.statItem} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#FF4757' }]} />
            <Text style={styles.statCount}>
              {filteredIssues.filter(i => i.priority === 'critical').length}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#FF6348' }]} />
            <Text style={styles.statCount}>
              {filteredIssues.filter(i => i.priority === 'high').length}
            </Text>
            <Text style={styles.statLabel}>High</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#2ED573' }]} />
            <Text style={styles.statCount}>
              {filteredIssues.filter(i => i.status === 'pending' || i.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#4C6EF5' }]} />
            <Text style={styles.statCount}>
              {filteredIssues.filter(i => i.assignedTo === user?.uid).length}
            </Text>
            <Text style={styles.statLabel}>Yours</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
      
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
          colors={['#FF6B9D', '#FF4757']}
          style={styles.mapToggleGradient}
        >
          <MaterialCommunityIcons name="map-legend" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Refresh Button */}
      <TouchableOpacity 
        style={styles.floatingRefreshButton}
        onPress={() => fetchSafetyIssues(true)}
        activeOpacity={0.8}
        disabled={refreshing}
      >
        <LinearGradient
          colors={['#2ED573', '#27AE60']}
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
      {(showIssueModal || showFilterModal) && (
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
            colors={['#A55EEA', '#8B5CF6']}
            style={styles.modalPositionGradient}
          >
            <MaterialCommunityIcons name="window-restore" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      {/* Issue Details Modal */}
      <LuxuryModal
        visible={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title={selectedIssue ? ISSUE_TYPES[selectedIssue.type].label : 'Issue Details'}
        position={modalPosition}
        animationType="slide"
        blurBackground={true}
      >
        {renderIssueDetails()}
      </LuxuryModal>
      
      {/* Filter Modal */}
      <LuxuryModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Issues"
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
        shadowColor: '#6C63FF',
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
    backgroundColor: '#FF4757',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: {
    color: '#FFFFFF',
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
  
  // Issue Markers
  issueMarkerContainer: {
    alignItems: 'center',
  },
  issueMarkerOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  issueMarkerInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  reporterBadge: {
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
  reporterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  issueLabelContainer: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  issueLabelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Floating Buttons
  mapToggleButton: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B9D',
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
        shadowColor: '#2ED573',
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
        shadowColor: '#A55EEA',
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
  
  // Issue Details
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  issueStatusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  issueHeaderInfo: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  issueMetaRow: {
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
  issueTime: {
    color: '#999',
    fontSize: 14,
  },
  refreshButton: {
    padding: 8,
  },
  issueDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 24,
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
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Reporters
  reportersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 110, 245, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  reportersText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
  },
  
  // Responders
  responderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 213, 115, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  responderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(46, 213, 115, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  responderName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  responderStatus: {
    backgroundColor: '#2ED573',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  responderStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
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
  locationHint: {
    color: '#999',
    fontSize: 12,
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
    color: '#4C6EF5',
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
    backgroundColor: 'rgba(76, 110, 245, 0.1)',
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