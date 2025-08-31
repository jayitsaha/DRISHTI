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
  Polygon,
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
  ios: 'http://10.201.18.82:8005',
  android: 'http://10.201.18.82:8005',
  default: 'http://10.201.18.82:8005'
});

// Light green-tinted map style with whitish background
const cleanerLightMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f8fdf9" }]
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#2d5a2d" }]
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#e8f5e9" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#c8e6c9" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e0e0e0" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#b2dfdb" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#dcedc8" }]
  }
];

// Enhanced cleanliness issue type configurations
const CLEANLINESS_TYPES = {
  garbage_overflow: {
    icon: 'trash-can',
    color: '#795548',
    priority: 'high',
    label: 'Garbage Overflow',
    gradient: ['#8D6E63', '#6D4C41']
  },
  street_littering: {
    icon: 'road',
    color: '#FF9800',
    priority: 'medium',
    label: 'Street Littering',
    gradient: ['#FFB74D', '#F57C00']
  },
  public_urination: {
    icon: 'emoticon-angry',
    color: '#F44336',
    priority: 'high',
    label: 'Public Nuisance',
    gradient: ['#EF5350', '#C62828']
  },
  blocked_drain: {
    icon: 'water-off',
    color: '#3F51B5',
    priority: 'critical',
    label: 'Blocked Drain',
    gradient: ['#5C6BC0', '#283593']
  },
  dead_animal: {
    icon: 'paw-off',
    color: '#9C27B0',
    priority: 'critical',
    label: 'Dead Animal',
    gradient: ['#AB47BC', '#6A1B9A']
  },
  construction_waste: {
    icon: 'hammer',
    color: '#607D8B',
    priority: 'medium',
    label: 'Construction Waste',
    gradient: ['#78909C', '#37474F']
  },
  garden_waste: {
    icon: 'leaf',
    color: '#4CAF50',
    priority: 'low',
    label: 'Garden Waste',
    gradient: ['#66BB6A', '#2E7D32']
  },
  broken_bin: {
    icon: 'delete-alert',
    color: '#E91E63',
    priority: 'medium',
    label: 'Broken Bin',
    gradient: ['#EC407A', '#AD1457']
  },
  illegal_dumping: {
    icon: 'alert-octagon',
    color: '#D32F2F',
    priority: 'critical',
    label: 'Illegal Dumping',
    gradient: ['#E53935', '#B71C1C']
  },
  recycling: {
    icon: 'recycle',
    color: '#00BCD4',
    priority: 'low',
    label: 'Recycling Issue',
    gradient: ['#26C6DA', '#0097A7']
  }
};

// Cleaning zones with enhanced colors
const CLEANING_ZONES = {
  zone_a: { color: '#4CAF5020', borderColor: '#4CAF50', gradient: ['#4CAF5040', '#4CAF5020'] },
  zone_b: { color: '#2196F320', borderColor: '#2196F3', gradient: ['#2196F340', '#2196F320'] },
  zone_c: { color: '#FF980020', borderColor: '#FF9800', gradient: ['#FF980040', '#FF980020'] },
  zone_d: { color: '#9C27B020', borderColor: '#9C27B0', gradient: ['#9C27B040', '#9C27B020'] }
};

export default function MapViewCleaner() {
  // State Management
  const [location, setLocation] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cleanlinessIssues, setCleanlinessIssues] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapImage, setMapImage] = useState(null);
  const [showMapImage, setShowMapImage] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [showZones, setShowZones] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Filter States
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  // Modal States
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [modalPosition, setModalPosition] = useState('center');
  
  // Work tracking
  const [activeRoute, setActiveRoute] = useState(null);
  const [completedToday, setCompletedToday] = useState(0);
  
  // Auth context
  const { user } = useAuth();
  
  // Refs
  const mapRef = useRef(null);
  const scale = useRef(new Animated.Value(1)).current;
  const unsubscribeRef = useRef(null);
  
  // Enhanced animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const leafAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
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

  // Set up real-time listener for cleanliness issues
  useEffect(() => {
    if (mapReady && location) {
      setupRealtimeListener();
      loadTodayStats();
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
    // Enhanced entrance animations
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
    
    // Enhanced pulse animation for critical issues
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.5,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation for recycling
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    // Bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Leaf float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(leafAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(leafAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const setupRealtimeListener = () => {
  try {
    console.log('Setting up real-time listener for cleanliness issues...');
    
    // Updated query to match the issueType used in CleanerDashboard
    const q = query(
      collection(db, 'citizenReports'),
      where('issueType', '==', 'cleaning'), // Changed from 'cleanliness' to 'cleaning'
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    unsubscribeRef.current = onSnapshot(q, 
      (snapshot) => {
        const issues = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          const issue = {
            id: doc.id,
            type: mapCleanlinessType(data.actualCategory || data.category || 'garbage_overflow'),
            title: data.title || data.description?.substring(0, 50) || 'Cleanliness Issue',
            description: data.description || 'Cleanliness issue reported',
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
            estimatedTime: getEstimatedCleaningTime(data),
            wasteAmount: data.wasteAmount || 'Medium',
            zone: assignZone(data.location),
          };
          
          issues.push(issue);
        });
        
        setCleanlinessIssues(issues);
        console.log(`Real-time update: ${issues.length} cleanliness issues`);
      },
      (error) => {
        console.error('Real-time listener error:', error);
        // Fall back to fetching all issues and filtering locally
        fetchAllIssuesAndFilter();
      }
    );
  } catch (error) {
    console.error('Error setting up real-time listener:', error);
    // Fall back to fetching all issues and filtering locally
    fetchAllIssuesAndFilter();
  }
};

// Fetch cleanliness issues from Firebase
const fetchCleanlinessIssues = async (forceRefresh = false) => {
  try {
    console.log('Fetching cleanliness issues from Firebase...');
    setRefreshing(true);
    
    // Try multiple queries to catch all cleanliness-related issues
    const queries = [
      // Primary query - matching CleanerDashboard
      query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'cleaning'),
        orderBy('timestamp', 'desc'),
        limit(50)
      ),
      // Fallback query for legacy data
      query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'cleanliness'),
        orderBy('timestamp', 'desc'),
        limit(50)
      ),
    ];
    
    // Also try a simpler query for categories
    try {
      queries.push(
        query(
          collection(db, 'citizenReports'),
          where('category', 'in', ['garbage', 'waste', 'cleaning', 'cleanliness', 'sanitation', 'littering']),
          limit(50)
        )
      );
    } catch (e) {
      console.log('Category query not added:', e);
    }
    
    const allIssues = new Map();
    
    for (const q of queries) {
      try {
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
          if (!allIssues.has(doc.id)) {
            const data = doc.data();
            
            const issue = {
              id: doc.id,
              type: mapCleanlinessType(data.actualCategory || data.category || 'garbage_overflow'),
              title: data.title || data.description?.substring(0, 50) || 'Cleanliness Issue',
              description: data.description || 'Cleanliness issue reported',
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
              estimatedTime: getEstimatedCleaningTime(data),
              wasteAmount: data.wasteAmount || 'Medium',
              zone: assignZone(data.location),
            };
            
            allIssues.set(doc.id, issue);
          }
        });
      } catch (queryError) {
        console.error('Query error:', queryError);
        
        // If index error, try simpler query
        if (queryError.code === 'failed-precondition') {
          console.log('Trying simpler query without ordering...');
          try {
            const simpleQuery = query(
              collection(db, 'citizenReports'),
              where('issueType', '==', 'cleaning'),
              limit(50)
            );
            
            const simpleSnapshot = await getDocs(simpleQuery);
            simpleSnapshot.forEach((doc) => {
              if (!allIssues.has(doc.id)) {
                const data = doc.data();
                
                const issue = {
                  id: doc.id,
                  type: mapCleanlinessType(data.actualCategory || data.category || 'garbage_overflow'),
                  title: data.title || data.description?.substring(0, 50) || 'Cleanliness Issue',
                  description: data.description || 'Cleanliness issue reported',
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
                  estimatedTime: getEstimatedCleaningTime(data),
                  wasteAmount: data.wasteAmount || 'Medium',
                  zone: assignZone(data.location),
                };
                
                allIssues.set(doc.id, issue);
              }
            });
          } catch (simpleError) {
            console.error('Simple query also failed:', simpleError);
          }
        }
      }
    }
    
    // If still no issues, try the fallback approach
    if (allIssues.size === 0) {
      console.log('No issues found with specific queries, trying fallback...');
      await fetchAllIssuesAndFilter();
      return;
    }
    
    const issues = Array.from(allIssues.values());
    issues.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
    
    setCleanlinessIssues(issues);
    console.log(`Loaded ${issues.length} cleanliness issues from Firebase`);
    
  } catch (error) {
    console.error('Error fetching cleanliness issues:', error);
    // Try fallback
    await fetchAllIssuesAndFilter();
  } finally {
    setRefreshing(false);
  }
};

// Update the fallback function to also check for 'cleaning' issueType
const fetchAllIssuesAndFilter = async () => {
  try {
    console.log('Fetching all citizen reports and filtering for cleanliness...');
    
    const q = query(
      collection(db, 'citizenReports'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    
    const querySnapshot = await getDocs(q);
    const issues = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Updated filter to include both 'cleaning' and 'cleanliness'
      const isCleanlinessIssue = 
        data.issueType === 'cleaning' ||  // Added this
        data.issueType === 'cleanliness' ||
        data.issueType === 'garbage' ||
        data.issueType === 'sanitation' ||
        ['garbage', 'waste', 'cleaning', 'cleanliness', 'sanitation', 'littering', 'dumping'].includes(data.category?.toLowerCase()) ||
        ['garbage', 'waste', 'littering', 'dumping', 'cleaning'].includes(data.actualCategory?.toLowerCase());
      
      if (isCleanlinessIssue) {
        const issue = {
          id: doc.id,
          type: mapCleanlinessType(data.actualCategory || data.category || 'garbage_overflow'),
          title: data.title || data.description?.substring(0, 50) || 'Cleanliness Issue',
          description: data.description || 'Cleanliness issue reported',
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
          estimatedTime: getEstimatedCleaningTime(data),
          wasteAmount: data.wasteAmount || 'Medium',
          zone: assignZone(data.location),
        };
        
        issues.push(issue);
      }
    });
    
    setCleanlinessIssues(issues);
    console.log(`Loaded ${issues.length} cleanliness issues from ${querySnapshot.size} total reports`);
    
  } catch (error) {
    console.error('Error in fallback fetch:', error);
    setCleanlinessIssues([]);
  }
};
  
  // Load today's statistics
  const loadTodayStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'cleanliness'),
        where('status', '==', 'resolved'),
        where('resolvedBy', '==', user?.uid),
        where('resolvedAt', '>=', today)
      );
      
      const snapshot = await getDocs(q);
      setCompletedToday(snapshot.size);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  // Helper function to map category to cleanliness type
  const mapCleanlinessType = (category) => {
    const categoryMap = {
      'garbage': 'garbage_overflow',
      'garbage overflow': 'garbage_overflow',
      'trash': 'garbage_overflow',
      'waste': 'garbage_overflow',
      'litter': 'street_littering',
      'littering': 'street_littering',
      'street cleaning': 'street_littering',
      'public nuisance': 'public_urination',
      'urination': 'public_urination',
      'drain': 'blocked_drain',
      'drainage': 'blocked_drain',
      'blocked drain': 'blocked_drain',
      'dead animal': 'dead_animal',
      'carcass': 'dead_animal',
      'construction': 'construction_waste',
      'debris': 'construction_waste',
      'garden': 'garden_waste',
      'leaves': 'garden_waste',
      'green waste': 'garden_waste',
      'broken bin': 'broken_bin',
      'damaged bin': 'broken_bin',
      'illegal dumping': 'illegal_dumping',
      'dumping': 'illegal_dumping',
      'recycling': 'recycling',
      'recyclable': 'recycling',
    };
    
    const lowerCategory = category?.toLowerCase() || '';
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }
    
    return 'garbage_overflow'; // Default
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
  
  // Helper function to estimate cleaning time
  const getEstimatedCleaningTime = (data) => {
    const baseTime = {
      'garbage_overflow': 30,
      'street_littering': 15,
      'public_urination': 20,
      'blocked_drain': 45,
      'dead_animal': 40,
      'construction_waste': 60,
      'garden_waste': 25,
      'broken_bin': 35,
      'illegal_dumping': 90,
      'recycling': 20
    };
    
    const type = mapCleanlinessType(data.actualCategory || data.category);
    return baseTime[type] || 30;
  };
  
  // Helper function to assign zone
  const assignZone = (location) => {
    if (!location) return 'zone_a';
    
    // Simple zone assignment based on location
    // In real app, this would be based on actual municipal zones
    const lat = location.latitude;
    const lng = location.longitude;
    
    if (lat > 12.98 && lng > 77.60) return 'zone_a';
    if (lat > 12.98 && lng <= 77.60) return 'zone_b';
    if (lat <= 12.98 && lng > 77.60) return 'zone_c';
    return 'zone_d';
  };

  // Helper function to calculate zone distance
  const calculateZoneDistance = (issues) => {
    if (issues.length <= 1) return '0 km';
    
    let totalDistance = 0;
    for (let i = 1; i < issues.length; i++) {
      const prev = issues[i-1].location;
      const curr = issues[i].location;
      const distance = Math.sqrt(
        Math.pow(prev.latitude - curr.latitude, 2) + 
        Math.pow(prev.longitude - curr.longitude, 2)
      ) * 111; // Rough conversion to km
      totalDistance += distance;
    }
    
    return `${totalDistance.toFixed(1)} km`;
  };

  // Helper function to calculate distance between two issues
  const calculateDistanceToNext = (issue1, issue2) => {
    const distance = Math.sqrt(
      Math.pow(issue1.location.latitude - issue2.location.latitude, 2) + 
      Math.pow(issue1.location.longitude - issue2.location.longitude, 2)
    ) * 111; // Rough conversion to km
    
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  // Helper function to sort route by priority and proximity
  const sortRouteByPriorityAndProximity = (issues) => {
    // First, separate by priority
    const critical = issues.filter(i => i.priority === 'critical');
    const high = issues.filter(i => i.priority === 'high');
    const medium = issues.filter(i => i.priority === 'medium');
    const low = issues.filter(i => i.priority === 'low');
    
    // Sort each priority group by proximity to user location if available
    const sortByProximity = (issueArray) => {
      if (!location) return issueArray;
      
      return issueArray.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(a.location.latitude - location.coords.latitude, 2) + 
          Math.pow(a.location.longitude - location.coords.longitude, 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.location.latitude - location.coords.latitude, 2) + 
          Math.pow(b.location.longitude - location.coords.longitude, 2)
        );
        return distA - distB;
      });
    };
    
    return [
      ...sortByProximity(critical),
      ...sortByProximity(high),
      ...sortByProximity(medium),
      ...sortByProximity(low)
    ];
  };

  // Helper function to get unique equipment count
  const getUniqueEquipmentCount = (issues) => {
    const uniqueEquipment = new Set();
    issues.forEach(issue => {
      getRequiredEquipment(issue.type).forEach(eq => {
        uniqueEquipment.add(eq.name);
      });
    });
    return uniqueEquipment.size;
  };

  // Helper function to get recommended team size
  const getRecommendedTeamSize = (issues) => {
    const totalTime = issues.reduce((sum, issue) => sum + issue.estimatedTime, 0);
    const criticalCount = issues.filter(i => i.priority === 'critical').length;
    const hasHazardous = issues.some(i => 
      i.type === 'dead_animal' || 
      i.type === 'chemical_hazard' || 
      i.type === 'illegal_dumping'
    );
    
    if (hasHazardous || criticalCount >= 3 || totalTime > 480) {
      return 3;
    } else if (criticalCount >= 1 || totalTime > 240) {
      return 2;
    }
    return 1;
  };

  // Helper function to navigate to first stop
  const navigateToFirstStop = (issues) => {
    const sortedIssues = sortRouteByPriorityAndProximity(issues);
    if (sortedIssues.length > 0) {
      handleIssueMarkerPress(sortedIssues[0]);
    }
  };

  // Filter issues based on selected filters and search
  const filteredIssues = useMemo(() => {
    let filtered = cleanlinessIssues;
    
    // Apply type filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(issue => selectedFilters.includes(issue.type));
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(issue => issue.priority === priorityFilter);
    }
    
    // Apply zone filter
    if (selectedZone) {
      filtered = filtered.filter(issue => issue.zone === selectedZone);
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(issue => 
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [cleanlinessIssues, selectedFilters, searchQuery, priorityFilter, selectedZone]);

  // Get heatmap data for waste concentration visualization
  const heatmapData = useMemo(() => {
    return filteredIssues.map(issue => ({
      latitude: issue.location.latitude,
      longitude: issue.location.longitude,
      weight: issue.priority === 'critical' ? 100 : issue.priority === 'high' ? 70 : 40
    }));
  }, [filteredIssues]);

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
  const issueConfig = CLEANLINESS_TYPES[issue.type];
  const isSelected = selectedIssue?.id === issue.id;
  const isCritical = issue.priority === 'critical';
  const isRecycling = issue.type === 'recycling';
  
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
        {/* Shadow layer */}
        <View style={styles.markerShadow} />
        
        {/* Main marker */}
        <Animated.View style={[
          styles.issueMarkerOuter,
          { 
            transform: [
              { scale: isSelected ? 1.15 : 1 },
              isRecycling && {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })
              }
            ].filter(Boolean)
          }
        ]}>
          <LinearGradient
            colors={['#FFFFFF', '#F0FDF4']}
            style={styles.issueMarkerBackground}
          >
            <View style={[styles.issueMarkerInner, { backgroundColor: issueConfig.color + '15' }]}>
              <MaterialCommunityIcons 
                name={issueConfig.icon} 
                size={24} 
                color={issueConfig.color} 
              />
            </View>
            
            {/* Priority indicator */}
            {isCritical && (
              <View style={styles.criticalDot}>
                <Animated.View style={[
                  styles.criticalDotInner,
                  {
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.3],
                      outputRange: [1, 0.6]
                    })
                  }
                ]} />
              </View>
            )}
            
            {/* Status indicator */}
            {issue.status === 'in_progress' && (
              <View style={styles.statusIndicator}>
                <MaterialCommunityIcons name="progress-wrench" size={10} color="#FFFFFF" />
              </View>
            )}
          </LinearGradient>
        </Animated.View>
        
        {/* Label below marker */}
        <View style={[
          styles.markerLabel,
          { backgroundColor: '#FFFFFF' }
        ]}>
          <Text style={[styles.markerLabelText, { color: issueConfig.color }]}>
            {issueConfig.label}
          </Text>
        </View>
      </Animated.View>
    </Marker>
  );
}, [selectedIssue, handleIssueMarkerPress, pulseAnim, rotateAnim]);

  const renderIssueDetails = () => {
    if (!selectedIssue) {
      return (
        <View style={styles.modalEmpty}>
          <MaterialCommunityIcons name="leaf" size={48} color="#22C55E" />
          <Text style={styles.modalEmptyText}>Select an issue to view details</Text>
        </View>
      );
    }
    
    const issueConfig = CLEANLINESS_TYPES[selectedIssue.type];
    const timeSinceReport = getTimeSince(selectedIssue.reportedAt);
    
    return (
      <ScrollView 
        style={styles.modalContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCleanlinessIssues(true)}
            tintColor="#22C55E"
          />
        }
      >
        {/* Issue Header */}
        <View style={styles.issueHeader}>
          <View style={[styles.issueStatusIcon, { backgroundColor: issueConfig.color + '20' }]}>
            <MaterialCommunityIcons 
              name={issueConfig.icon} 
              size={36} 
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
            onPress={() => fetchCleanlinessIssues(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#22C55E" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={24} color="#22C55E" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Critical Alert */}
        {selectedIssue.priority === 'critical' && (
          <View style={styles.criticalAlert}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.criticalAlertGradient}
            >
              <MaterialCommunityIcons name="alert-octagon" size={20} color="#FFFFFF" />
              <Text style={styles.criticalAlertText}>URGENT CLEANING REQUIRED</Text>
            </LinearGradient>
          </View>
        )}
        
        {/* Cleaning Info */}
        <View style={styles.cleaningInfoCard}>
          <LinearGradient
            colors={['rgba(34, 197, 94, 0.1)', 'rgba(16, 185, 129, 0.1)']}
            style={styles.cleaningInfoGradient}
          >
            <View style={styles.cleaningInfoRow}>
              <View style={styles.cleaningInfoItem}>
                <MaterialCommunityIcons name="timer-outline" size={24} color="#22C55E" />
                <Text style={styles.cleaningInfoLabel}>Est. Time</Text>
                <Text style={styles.cleaningInfoValue}>{selectedIssue.estimatedTime} min</Text>
              </View>
              <View style={styles.cleaningInfoDivider} />
              <View style={styles.cleaningInfoItem}>
                <MaterialCommunityIcons name="weight" size={24} color="#F59E0B" />
                <Text style={styles.cleaningInfoLabel}>Waste Amount</Text>
                <Text style={styles.cleaningInfoValue}>{selectedIssue.wasteAmount}</Text>
              </View>
              <View style={styles.cleaningInfoDivider} />
              <View style={styles.cleaningInfoItem}>
                <MaterialCommunityIcons name="map-marker-radius" size={24} color="#3B82F6" />
                <Text style={styles.cleaningInfoLabel}>Zone</Text>
                <Text style={styles.cleaningInfoValue}>{selectedIssue.zone.toUpperCase()}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        {/* Issue Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.issueDescription}>{selectedIssue.description}</Text>
        </View>
        
        {/* Photo Evidence */}
        {selectedIssue.mediaUrls?.photoUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo Evidence</Text>
            <Image 
              source={{ uri: selectedIssue.mediaUrls.photoUrl }}
              style={styles.evidenceImage}
              resizeMode="cover"
            />
          </View>
        )}
        
        {/* Equipment Needed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Equipment Needed</Text>
            <MaterialCommunityIcons name="tools" size={20} color="#795548" />
          </View>
          <View style={styles.equipmentList}>
            {getRequiredEquipment(selectedIssue.type).map((equipment, index) => (
              <View key={index} style={styles.equipmentItem}>
                <LinearGradient
                  colors={['rgba(121, 85, 72, 0.1)', 'rgba(109, 76, 65, 0.1)']}
                  style={styles.equipmentGradient}
                >
                  <MaterialCommunityIcons 
                    name={equipment.icon} 
                    size={18} 
                    color="#795548" 
                  />
                  <Text style={styles.equipmentText}>{equipment.name}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        </View>
        
        {/* Location Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            <MaterialIcons name="location-on" size={20} color="#22C55E" />
          </View>
          <TouchableOpacity 
            style={styles.locationCard}
            onPress={() => {
              // Navigate to location
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.1)', 'rgba(16, 185, 129, 0.1)']}
              style={styles.locationGradient}
            >
              <View style={styles.locationInfo}>
                <Text style={styles.locationAddress}>
                  {selectedIssue.address || 'Tap to get directions'}
                </Text>
                <Text style={styles.locationCoords}>
                  {selectedIssue.location.latitude.toFixed(6)}, {selectedIssue.location.longitude.toFixed(6)}
                </Text>
              </View>
              <MaterialIcons name="directions" size={24} color="#22C55E" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Special Instructions */}
        {getSpecialInstructions(selectedIssue.type) && (
          <View style={styles.section}>
            <View style={styles.instructionsCard}>
              <LinearGradient
                colors={['rgba(251, 146, 60, 0.1)', 'rgba(249, 115, 22, 0.1)']}
                style={styles.instructionsGradient}
              >
                <MaterialCommunityIcons name="alert-circle" size={20} color="#F97316" />
                <Text style={styles.instructionsText}>
                  {getSpecialInstructions(selectedIssue.type)}
                </Text>
              </LinearGradient>
            </View>
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {selectedIssue.status === 'pending' && !selectedIssue.assignedTo ? (
            <TouchableOpacity 
              style={styles.actionButton} 
              activeOpacity={0.8}
              onPress={() => handleAcceptIssue(selectedIssue)}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Accept Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : selectedIssue.assignedTo === user?.uid ? (
            <>
              <TouchableOpacity 
                style={styles.actionButton} 
                activeOpacity={0.8}
                onPress={() => handleStartCleaning(selectedIssue)}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.actionButtonGradient}
                >
                  <MaterialCommunityIcons name="broom" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Start Cleaning</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonSpacing]} 
                activeOpacity={0.8}
                onPress={() => handleMarkComplete(selectedIssue)}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.actionButtonGradient}
                >
                  <MaterialCommunityIcons name="check-all" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark Complete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.assignedToOtherContainer}>
              <MaterialCommunityIcons name="account-lock" size={24} color="#9CA3AF" />
              <Text style={styles.assignedToOtherText}>
                Assigned to Another Cleaner
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
      <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
        {/* Priority Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Priority Level</Text>
          <View style={styles.priorityFilterRow}>
            {['all', 'critical', 'high', 'medium', 'low'].map((priority) => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityFilterButton,
                  priorityFilter === priority && styles.priorityFilterButtonActive
                ]}
                onPress={() => setPriorityFilter(priority)}
              >
                <LinearGradient
                  colors={priorityFilter === priority ? ['#22C55E', '#16A34A'] : ['#E5E7EB', '#D1D5DB']}
                  style={styles.priorityFilterGradient}
                >
                  <Text style={[
                    styles.priorityFilterText,
                    priorityFilter === priority && styles.priorityFilterTextActive
                  ]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Type Filter */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterSectionTitle}>Issue Type</Text>
            <TouchableOpacity onPress={() => setSelectedFilters([])}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          {Object.entries(CLEANLINESS_TYPES).map(([key, config]) => {
            const isSelected = selectedFilters.includes(key);
            const issueCount = cleanlinessIssues.filter(i => i.type === key).length;
            
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
                  <LinearGradient
                    colors={config.gradient}
                    style={styles.filterIconGradient}
                  >
                    <MaterialCommunityIcons 
                      name={config.icon} 
                      size={24} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                  <Text style={styles.filterLabel}>{config.label}</Text>
                </View>
                <View style={styles.filterOptionRight}>
                  <Text style={styles.filterCount}>{issueCount}</Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={20} color="#22C55E" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderRouteModal = () => {
    const zoneIssues = filteredIssues.filter(issue => issue.zone === selectedZone);
    const totalTime = zoneIssues.reduce((sum, issue) => sum + issue.estimatedTime, 0);
    const totalDistance = calculateZoneDistance(zoneIssues);
    const criticalCount = zoneIssues.filter(issue => issue.priority === 'critical').length;
    const highPriorityCount = zoneIssues.filter(issue => issue.priority === 'high').length;
    
    return (
      <View style={styles.routeModalContent}>
        {/* Route Header with Enhanced Info */}
        <View style={styles.routeHeader}>
          <View style={[styles.zoneIndicator, { backgroundColor: CLEANING_ZONES[selectedZone]?.borderColor }]} />
          <View style={styles.routeHeaderInfo}>
            <Text style={styles.routeTitle}>Zone {selectedZone?.split('_')[1]?.toUpperCase()} Route</Text>
            <Text style={styles.routeSubtitle}>
              {zoneIssues.length} locations • ~{Math.ceil(totalTime / 60)}h {totalTime % 60}min
            </Text>
          </View>
        </View>
        
        {/* Route Statistics */}
        <View style={styles.routeStats}>
          <View style={styles.routeStatCard}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color="#22C55E" />
            <Text style={styles.routeStatValue}>{totalDistance}</Text>
            <Text style={styles.routeStatLabel}>Total Distance</Text>
          </View>
          <View style={styles.routeStatCard}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#3B82F6" />
            <Text style={styles.routeStatValue}>{Math.ceil(totalTime / 60)}h {totalTime % 60}m</Text>
            <Text style={styles.routeStatLabel}>Est. Duration</Text>
          </View>
          <View style={styles.routeStatCard}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.routeStatValue}>{criticalCount}</Text>
            <Text style={styles.routeStatLabel}>Critical Tasks</Text>
          </View>
        </View>
        
        {/* Priority Summary */}
        {(criticalCount > 0 || highPriorityCount > 0) && (
          <View style={styles.routePriorityAlert}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.1)', 'rgba(220, 38, 38, 0.1)']}
              style={styles.routePriorityGradient}
            >
              <MaterialCommunityIcons name="alert" size={20} color="#EF4444" />
              <View style={styles.routePriorityContent}>
                <Text style={styles.routePriorityTitle}>Priority Tasks</Text>
                <Text style={styles.routePriorityText}>
                  {criticalCount > 0 && `${criticalCount} critical`}
                  {criticalCount > 0 && highPriorityCount > 0 && ', '}
                  {highPriorityCount > 0 && `${highPriorityCount} high priority`} tasks need immediate attention
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}
        
        {/* Optimized Route Order */}
        <View style={styles.routeOptimizedSection}>
          <View style={styles.routeOptimizedHeader}>
            <Text style={styles.routeOptimizedTitle}>Optimized Route Order</Text>
            <TouchableOpacity>
              <MaterialCommunityIcons name="sort" size={20} color="#22C55E" />
            </TouchableOpacity>
          </View>
          <Text style={styles.routeOptimizedSubtext}>
            Route optimized for efficiency and priority
          </Text>
        </View>
        
        <ScrollView style={styles.routeList}>
          {sortRouteByPriorityAndProximity(zoneIssues).map((issue, index) => (
            <TouchableOpacity
              key={issue.id}
              style={[
                styles.routeItem,
                issue.priority === 'critical' && styles.routeItemCritical
              ]}
              onPress={() => {
                setShowRouteModal(false);
                handleIssueMarkerPress(issue);
              }}
            >
              <View style={styles.routeItemLeft}>
                <View style={styles.routeItemNumber}>
                  <LinearGradient
                    colors={issue.priority === 'critical' ? ['#EF4444', '#DC2626'] : ['#22C55E', '#16A34A']}
                    style={styles.routeItemNumberGradient}
                  >
                    <Text style={styles.routeItemNumberText}>{index + 1}</Text>
                  </LinearGradient>
                </View>
                {index < zoneIssues.length - 1 && (
                  <View style={styles.routeItemConnector} />
                )}
              </View>
              <View style={styles.routeItemContent}>
                <View style={styles.routeItemHeader}>
                  <MaterialCommunityIcons 
                    name={CLEANLINESS_TYPES[issue.type].icon} 
                    size={20} 
                    color={CLEANLINESS_TYPES[issue.type].color} 
                  />
                  <Text style={styles.routeItemTitle}>{issue.title}</Text>
                </View>
                <Text style={styles.routeItemAddress} numberOfLines={1}>
                  {issue.address || 'Location'}
                </Text>
                <View style={styles.routeItemMeta}>
                  <View style={styles.routeItemMetaLeft}>
                    <Text style={styles.routeItemTime}>
                      <MaterialCommunityIcons name="timer-outline" size={12} /> {issue.estimatedTime}min
                    </Text>
                    {index > 0 && (
                      <Text style={styles.routeItemDistance}>
                        <MaterialCommunityIcons name="map-marker-distance" size={12} /> {calculateDistanceToNext(zoneIssues[index-1], issue)}
                      </Text>
                    )}
                  </View>
                  <View style={[
                    styles.routeItemPriorityBadge,
                    { backgroundColor: getPriorityColor(issue.priority) + '20' }
                  ]}>
                    <Text style={[
                      styles.routeItemPriority,
                      { color: getPriorityColor(issue.priority) }
                    ]}>
                      {issue.priority}
                    </Text>
                  </View>
                </View>
                {/* Required Equipment Preview */}
                <View style={styles.routeItemEquipment}>
                  {getRequiredEquipment(issue.type).slice(0, 3).map((equipment, eqIndex) => (
                    <View key={eqIndex} style={styles.routeItemEquipmentChip}>
                      <MaterialCommunityIcons 
                        name={equipment.icon} 
                        size={12} 
                        color="#9CA3AF" 
                      />
                    </View>
                  ))}
                  {getRequiredEquipment(issue.type).length > 3 && (
                    <Text style={styles.routeItemEquipmentMore}>
                      +{getRequiredEquipment(issue.type).length - 3}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Route Summary Card */}
        <View style={styles.routeSummaryCard}>
          <LinearGradient
            colors={['rgba(34, 197, 94, 0.1)', 'rgba(16, 185, 129, 0.1)']}
            style={styles.routeSummaryGradient}
          >
            <View style={styles.routeSummaryRow}>
              <MaterialCommunityIcons name="truck-outline" size={20} color="#22C55E" />
              <Text style={styles.routeSummaryText}>
                Equipment needed: {getUniqueEquipmentCount(zoneIssues)} items
              </Text>
            </View>
            <View style={styles.routeSummaryRow}>
              <MaterialCommunityIcons name="account-group" size={20} color="#22C55E" />
              <Text style={styles.routeSummaryText}>
                Recommended team size: {getRecommendedTeamSize(zoneIssues)} cleaners
              </Text>
            </View>
          </LinearGradient>
        </View>
        
        <TouchableOpacity 
          style={styles.startRouteButton}
          onPress={() => {
            setActiveRoute(selectedZone);
            setShowRouteModal(false);
            Alert.alert(
              'Route Started', 
              `You've started cleaning route for Zone ${selectedZone?.split('_')[1]?.toUpperCase()}\n\nFirst stop: ${sortRouteByPriorityAndProximity(zoneIssues)[0]?.title || 'Unknown'}`,
              [
                { text: 'Navigate', onPress: () => navigateToFirstStop(zoneIssues) },
                { text: 'OK' }
              ]
            );
          }}
        >
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
            style={styles.startRouteGradient}
          >
            <MaterialCommunityIcons name="routes" size={24} color="#FFFFFF" />
            <Text style={styles.startRouteText}>Start This Route</Text>
          </LinearGradient>
        </TouchableOpacity>
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
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#F97316';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getRequiredEquipment = (type) => {
    const equipment = {
      garbage_overflow: [
        { icon: 'shovel', name: 'Shovel' },
        { icon: 'sack', name: 'Garbage Bags' },
        { icon: 'broom', name: 'Broom' },
        { icon: 'safety-goggles', name: 'Gloves' }
      ],
      street_littering: [
        { icon: 'broom', name: 'Broom' },
        { icon: 'dustpan', name: 'Dustpan' },
        { icon: 'sack', name: 'Collection Bag' }
      ],
      public_urination: [
        { icon: 'spray-bottle', name: 'Disinfectant' },
        { icon: 'water', name: 'Water' },
        { icon: 'mop', name: 'Mop' }
      ],
      blocked_drain: [
        { icon: 'plunger', name: 'Drain Rod' },
        { icon: 'water-pump', name: 'Pump' },
        { icon: 'tools', name: 'Tools' }
      ],
      dead_animal: [
        { icon: 'biohazard', name: 'Protective Gear' },
        { icon: 'package-variant', name: 'Body Bag' },
        { icon: 'spray-bottle', name: 'Disinfectant' }
      ],
      construction_waste: [
        { icon: 'truck', name: 'Loading Vehicle' },
        { icon: 'shovel', name: 'Shovel' },
        { icon: 'hard-hat', name: 'Safety Gear' }
      ],
      garden_waste: [
        { icon: 'rake', name: 'Rake' },
        { icon: 'sack', name: 'Compost Bags' },
        { icon: 'cart', name: 'Wheelbarrow' }
      ],
      broken_bin: [
        { icon: 'wrench', name: 'Tools' },
        { icon: 'hammer', name: 'Hammer' },
        { icon: 'screw', name: 'Spare Parts' }
      ],
      illegal_dumping: [
        { icon: 'truck', name: 'Truck' },
        { icon: 'account-group', name: 'Team Required' },
        { icon: 'camera', name: 'Evidence Camera' }
      ],
      recycling: [
        { icon: 'recycle', name: 'Sorting Bins' },
        { icon: 'sack', name: 'Recycling Bags' },
        { icon: 'clipboard-list', name: 'Checklist' }
      ]
    };
    
    return equipment[type] || equipment.garbage_overflow;
  };

  const getSpecialInstructions = (type) => {
    const instructions = {
      dead_animal: 'Wear full protective gear. Handle with care and follow biohazard protocols.',
      public_urination: 'Use proper disinfectant. Ensure area is thoroughly cleaned and sanitized.',
      blocked_drain: 'Check for hazardous materials before clearing. May require special equipment.',
      illegal_dumping: 'Document with photos before removal. Report to authorities if needed.',
      construction_waste: 'Heavy lifting required. Work in teams and use proper equipment.'
    };
    
    return instructions[type];
  };

  const handleAcceptIssue = async (issue) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please sign in to accept tasks');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'citizenReports', issue.id), {
        status: 'assigned',
        assignedTo: user.uid,
        assignedAt: serverTimestamp(),
        cleanerInfo: {
          name: user.displayName || 'Cleaner',
          id: user.uid
        }
      });
      
      Alert.alert(
        'Task Accepted',
        'You have been assigned to this cleaning task',
        [{ text: 'OK', onPress: () => setShowIssueModal(false) }]
      );
    } catch (error) {
      console.error('Error accepting task:', error);
      Alert.alert('Error', 'Failed to accept task. Please try again.');
    }
  };

  const handleStartCleaning = async (issue) => {
    try {
      await updateDoc(doc(db, 'citizenReports', issue.id), {
        status: 'in_progress',
        startedAt: serverTimestamp(),
      });
      
      Alert.alert(
        'Cleaning Started',
        'Task status updated to In Progress',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error starting task:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  const handleMarkComplete = async (issue) => {
    Alert.alert(
      'Complete Task',
      'Confirm that this area has been cleaned?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'citizenReports', issue.id), {
                status: 'resolved',
                resolvedBy: user.uid,
                resolvedAt: serverTimestamp(),
                completedAt: serverTimestamp()
              });
              
              setCompletedToday(prev => prev + 1);
              
              Alert.alert(
                'Task Completed',
                'Great job! The area has been marked as clean.',
                [{ text: 'OK', onPress: () => setShowIssueModal(false) }]
              );
            } catch (error) {
              console.error('Error completing task:', error);
              Alert.alert('Error', 'Failed to complete task. Please try again.');
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

  // Mock zone polygons - replace with actual municipal zone data
  const getZonePolygon = (zone) => {
    const zones = {
      zone_a: [
        { latitude: 12.98, longitude: 77.60 },
        { latitude: 13.00, longitude: 77.60 },
        { latitude: 13.00, longitude: 77.62 },
        { latitude: 12.98, longitude: 77.62 },
      ],
      zone_b: [
        { latitude: 12.98, longitude: 77.58 },
        { latitude: 13.00, longitude: 77.58 },
        { latitude: 13.00, longitude: 77.60 },
        { latitude: 12.98, longitude: 77.60 },
      ],
      zone_c: [
        { latitude: 12.96, longitude: 77.60 },
        { latitude: 12.98, longitude: 77.60 },
        { latitude: 12.98, longitude: 77.62 },
        { latitude: 12.96, longitude: 77.62 },
      ],
      zone_d: [
        { latitude: 12.96, longitude: 77.58 },
        { latitude: 12.98, longitude: 77.58 },
        { latitude: 12.98, longitude: 77.60 },
        { latitude: 12.96, longitude: 77.60 },
      ]
    };
    
    return zones[zone] || zones.zone_a;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#0a1f0f', '#1a2e1a']}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Initializing Cleanliness Monitor...</Text>
      </View>
    );
  }

  if (showMapImage && mapImage) {
    return (
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <LinearGradient
          colors={['#0a1f0f', '#1a2e1a']}
          style={StyleSheet.absoluteFillObject}
        />
        <Button
          icon="rotate-right"
          style={styles.rotateButton}
          mode="outlined"
          color="#22C55E"
          onPress={rotateImage}
        >
          ROTATE
        </Button>
        
        <TouchableOpacity 
          style={styles.backToMapButton}
          onPress={() => setShowMapImage(false)}
        >
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
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
        customMapStyle={cleanerLightMapStyle}
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
          if (showRouteModal) setShowRouteModal(false);
        }}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* User Location with green pulse */}
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
        
        {/* Zone Polygons */}
        {showZones && Object.entries(CLEANING_ZONES).map(([zone, config]) => (
          <Polygon
            key={zone}
            coordinates={getZonePolygon(zone)}
            fillColor={config.color}
            strokeColor={config.borderColor}
            strokeWidth={2}
            tappable
            onPress={() => {
              setSelectedZone(zone);
              setShowRouteModal(true);
            }}
          />
        ))}
        
        {/* Cleanliness Issue Markers */}
        {filteredIssues.map((issue) => renderIssueMarker(issue))}
        
        {/* Critical Issue Radius Circles */}
        {filteredIssues.filter(issue => issue.priority === 'critical').map((issue) => (
          <Circle
            key={`circle-${issue.id}`}
            center={issue.location}
            radius={200}
            fillColor={CLEANLINESS_TYPES[issue.type].color + '20'}
            strokeColor={CLEANLINESS_TYPES[issue.type].color + '40'}
            strokeWidth={2}
          />
        ))}
        
        {/* Heatmap overlay for waste concentration */}
        {showHeatmap && heatmapData.length > 0 && (
          <Heatmap
            points={heatmapData}
            radius={40}
            opacity={0.6}
            gradient={{
              colors: ['#22C55E', '#16A34A', '#14532D', '#052E16'],
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
        <View style={styles.searchContainer}>
          <View style={styles.searchContent}>
            <MaterialIcons name="search" size={20} color="#22C55E" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search locations..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
      
      {/* Filter Button */}
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowFilterModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#22C55E', '#16A34A']}
          style={styles.filterButtonGradient}
        >
          <MaterialCommunityIcons name="filter" size={24} color="#FFFFFF" />
          {(selectedFilters.length > 0 || priorityFilter !== 'all') && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {selectedFilters.length + (priorityFilter !== 'all' ? 1 : 0)}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Stats Widget */}
      <View style={styles.statsWidget}>
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem} activeOpacity={0.8}>
            <Animated.View style={[
              styles.statDot,
              { 
                backgroundColor: '#22C55E',
                transform: [{ scale: glowAnim }]
              }
            ]} />
            <Text style={styles.statCount}>{completedToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.statCount}>
              {filteredIssues.filter(i => i.priority === 'critical').length}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.statCount}>
              {filteredIssues.filter(i => i.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
            <View style={[styles.statDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.statCount}>
              {filteredIssues.filter(i => i.assignedTo === user?.uid).length}
            </Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Zone Toggle Button */}
      <TouchableOpacity 
        style={styles.zoneToggleButton}
        onPress={() => setShowZones(!showZones)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={showZones ? ['#22C55E', '#16A34A'] : ['#374151', '#1F2937']}
          style={styles.zoneToggleGradient}
        >
          <MaterialCommunityIcons 
            name="map-marker-radius" 
            size={24} 
            color="#FFFFFF" 
          />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Heatmap Toggle */}
      <TouchableOpacity 
        style={styles.heatmapButton}
        onPress={() => setShowHeatmap(!showHeatmap)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={showHeatmap ? ['#10B981', '#059669'] : ['#374151', '#1F2937']}
          style={styles.heatmapButtonGradient}
        >
          <MaterialCommunityIcons name="blur" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Route Planning Button - Enhanced */}
      <Animated.View style={[
        styles.routeButton,
        {
          transform: [
            { translateY: bounceAnim }
          ]
        }
      ]}>
        <TouchableOpacity 
          onPress={() => {
            if (!showZones) {
              setShowZones(true);
              Alert.alert(
                'Plan Your Route', 
                'Select a zone on the map to view and plan your cleaning route.\n\nZones are color-coded based on cleaning tasks:',
                [{ text: 'OK' }]
              );
            } else {
              setShowZones(false);
            }
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={showZones ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']}
            style={styles.routeButtonGradient}
          >
            <MaterialCommunityIcons 
              name={showZones ? "map-marker-check" : "routes"} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.routeButtonText}>
              {showZones ? 'Select Zone' : 'Plan Route'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      
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
          colors={['#795548', '#5D4037']}
          style={styles.mapToggleGradient}
        >
          <MaterialCommunityIcons name="map-legend" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Refresh Button */}
      <TouchableOpacity 
        style={styles.floatingRefreshButton}
        onPress={() => fetchCleanlinessIssues(true)}
        activeOpacity={0.8}
        disabled={refreshing}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.floatingButtonGradient}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Animated.View style={{
              transform: [{
                rotate: leafAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })
              }]
            }}>
              <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
            </Animated.View>
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
          colors={['#22C55E', '#16A34A']}
          style={styles.locationButtonGradient}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Active Route Indicator */}
      {activeRoute && (
        <Animated.View style={[
          styles.activeRouteIndicator,
          {
            opacity: shimmerAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.8, 1, 0.8]
            })
          }
        ]}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            style={styles.activeRouteGradient}
          >
            <MaterialCommunityIcons name="routes" size={16} color="#FFFFFF" />
            <Text style={styles.activeRouteText}>
              Active Route: Zone {activeRoute.split('_')[1].toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => setActiveRoute(null)}>
              <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}
      
      {/* Modal Position Toggle */}
      {(showIssueModal || showFilterModal || showRouteModal) && (
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
            colors={['#6366F1', '#4F46E5']}
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
        title={selectedIssue ? CLEANLINESS_TYPES[selectedIssue.type].label : 'Issue Details'}
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
      
      {/* Route Planning Modal */}
      <LuxuryModal
        visible={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        title="Route Planning"
        position={modalPosition}
        animationType="slide"
        blurBackground={true}
      >
        {renderRouteModal()}
      </LuxuryModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#1F2937',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  map: {
    flex: 1,
  },
  scrollViewContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
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
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    color: '#1F2937',
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
        shadowColor: '#22C55E',
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
    backgroundColor: '#EF4444',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
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
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statCount: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statLabel: {
    color: '#6B7280',
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
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#22C55E',
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
    width: 68,
    height: 68,
    borderRadius: 34,
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
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  statusBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
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
  
  // Zone Toggle Button
  zoneToggleButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  zoneToggleGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Heatmap Button
  heatmapButton: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
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
  
  // Route Button
  routeButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    borderRadius: 25,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  routeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  routeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Floating Buttons
  mapToggleButton: {
    position: 'absolute',
    bottom: 250,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#795548',
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
    bottom: 320,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
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
    bottom: 390,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#22C55E',
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
        shadowColor: '#6366F1',
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
  
  // Active Route Indicator
  activeRouteIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 190 : 170,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  activeRouteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  activeRouteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  
  // Modal Styles
  modalEmpty: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  modalEmptyText: {
    color: '#6B7280',
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
    color: '#9CA3AF',
    fontSize: 14,
  },
  refreshButton: {
    padding: 8,
  },
  issueDescription: {
    color: '#D1D5DB',
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
  
  // Cleaning Info Card
  cleaningInfoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cleaningInfoGradient: {
    padding: 16,
  },
  cleaningInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cleaningInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  cleaningInfoLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  cleaningInfoValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cleaningInfoDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
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
  
  // Evidence Image
  evidenceImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  
  // Equipment
  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  equipmentItem: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  equipmentGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  equipmentText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  
  // Location
  locationCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  locationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationAddress: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationCoords: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  
  // Instructions
  instructionsCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  instructionsGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  instructionsText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
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
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  assignedToOtherText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Filter Modal
  filterModalContent: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  clearFiltersText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '500',
  },
  priorityFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  priorityFilterButton: {
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  priorityFilterGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  priorityFilterButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  priorityFilterText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  priorityFilterTextActive: {
    color: '#FFFFFF',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterOptionSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterIconGradient: {
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
    fontWeight: '500',
  },
  filterOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterCount: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  
  // Route Modal
  routeModalContent: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  zoneIndicator: {
    width: 8,
    height: 50,
    borderRadius: 4,
    marginRight: 16,
  },
  routeHeaderInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Route Statistics
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  routeStatCard: {
    alignItems: 'center',
  },
  routeStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  routeStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Priority Alert
  routePriorityAlert: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  routePriorityGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  routePriorityContent: {
    flex: 1,
    marginLeft: 12,
  },
  routePriorityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  routePriorityText: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  // Optimized Section
  routeOptimizedSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  routeOptimizedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeOptimizedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  routeOptimizedSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  // Route List
  routeList: {
    flex: 1,
  },
  routeItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  routeItemCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  routeItemLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  routeItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  routeItemNumberGradient: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeItemNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  routeItemConnector: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  routeItemContent: {
    flex: 1,
  },
  routeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  routeItemAddress: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  routeItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeItemMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap: 12,
  },
  routeItemTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  routeItemDistance: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  routeItemPriorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  routeItemPriority: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  routeItemEquipment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  routeItemEquipmentChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  routeItemEquipmentMore: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  // Route Summary
  routeSummaryCard: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  routeSummaryGradient: {
    padding: 16,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeSummaryText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  startRouteButton: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startRouteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  startRouteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },


  issueMarkerContainer: {
    alignItems: 'center',
  },
  markerShadow: {
    position: 'absolute',
    bottom: 2,
    width: 40,
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 20,
    transform: [{ scaleX: 1.5 }],
  },
  issueMarkerOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  issueMarkerBackground: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  issueMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerLabel: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  markerLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Compact Modal Styles
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  modalEmptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  issueHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.1)',
  },
  issueIconCompact: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  issueHeaderContent: {
    flex: 1,
  },
  issueTitleCompact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 20,
  },
  issueMetaCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  issueTimeCompact: {
    color: '#6B7280',
    fontSize: 12,
  },
  criticalAlertSlim: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  criticalAlertTextSlim: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    alignItems: 'center',
  },
  quickStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  quickStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  sectionCompact: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionCompact: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  evidenceImageCompact: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  equipmentScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  equipmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  equipmentChipText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 4,
    fontWeight: '500',
  },
  locationCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  locationTextCompact: {
    flex: 1,
    marginLeft: 8,
  },
  locationAddressCompact: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  locationCoordsCompact: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButtonsCompact: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButtonRow: {
    flexDirection: 'row',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 44,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 6,
  },
  assignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  assignedInfoText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});