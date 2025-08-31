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
  Modal,
  FlatList,
  Image,
  Easing,  
} from 'react-native';
import MapView, { 
  Marker, 
  PROVIDER_GOOGLE,
  Circle,
  Polyline,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LuxuryModal from '../components/LuxuryModal';
import axios from 'axios';
import yaml from 'js-yaml';
import AsyncStorage from '@react-native-async-storage/async-storage';


import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { GoogleGenerativeAI } from "@google/generative-ai";

import * as Notifications from 'expo-notifications';




// Initialize Firebase (add after imports)
const firebaseConfig = {
  apiKey: "AIzaSyBOb36ckOf3Tu3uIvV4IBPOqv7aiamsSfo",
  authDomain: "cityai-8987c.firebaseapp.com",
  projectId: "cityai-8987c",
  storageBucket: "cityai-8987c.firebasestorage.app",
  messagingSenderId: "629908792550",
  appId: "1:629908792550:android:16d35484ccd5d6c0570727",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const genAI = new GoogleGenerativeAI("AIzaSyBi4SRdJxbv7gBZrikckoUx8XUWrN7DMqs");



const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SCREEN_HEIGHT = screenHeight;

// API Configuration
const API_BASE_URL = Platform.select({
  ios: 'http://192.168.1.17:8005',
  android: 'http://192.168.1.17:8005',
  default: 'http://192.168.1.17:8005'
  
});

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyBmH2_ZA7jxVWAwTh-fRw9gv1d6MPun9jk';

// Pothole data URL
const POTHOLE_DATA_URL = 'https://gist.github.com/warlockdn/0b7ec8ca726075c58d8423ec17cf806a/raw/076ca3feb6e7f57c95d28d6223527dd3e123926a/bmap.yaml';

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



const moodMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#0a0a0f" }] // Even darker for better contrast
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#3a3a4a" }] // Dimmer labels
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0a0a0f" }]
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#15152a" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#12122a" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#15152a" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0a0a0f" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#05050a" }]
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }] // Hide transit for cleaner look
  }
];

// Route colors based on traffic
const ROUTE_COLORS = {
  fastest: '#2ED573',
  moderate: '#FFA502',
  slowest: '#FF4757',
  selected: '#4C6EF5',
  alternative: '#999999'
};

// Pothole category colors
const POTHOLE_CATEGORY_COLORS = {
  0: '#FFA502', // Minor - Orange
  1: '#FF6B6B', // Moderate - Light Red
  2: '#FF4757', // Major - Red
  3: '#D32F2F', // Severe - Dark Red
};


const NotificationCard = ({ notification, index }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    if (notification.isNew) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [notification.isNew]);
  
  return (
    <Animated.View
      style={[
        styles.notificationCard,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim }
          ],
        },
      ]}
    >
      <View style={[styles.notificationIconContainer, { backgroundColor: notification.color + '20' }]}>
        <MaterialIcons name={notification.icon} size={24} color={notification.color} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationTime}>{notification.time}</Text>
        </View>
        <Text style={styles.notificationBody}>{notification.body}</Text>
      </View>
    </Animated.View>
  );
};

export default function MapScreenGeoFencing() {
  // State Management
  const [location, setLocation] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unifiedData, setUnifiedData] = useState({
    areas: {},
    weather: null,
    timestamp: null
  });
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  // Modal States
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [modalPosition, setModalPosition] = useState('center');

  // Navigation States
  const [destination, setDestination] = useState(null);
  const [destinationInput, setDestinationInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [navigationMode, setNavigationMode] = useState(false);
  const [routeRecommendations, setRouteRecommendations] = useState([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  
  // Pothole States
  const [potholeData, setPotholeData] = useState([]);
  const [routePotholes, setRoutePotholes] = useState({});
  const [selectedPothole, setSelectedPothole] = useState(null);
  const [showPotholeModal, setShowPotholeModal] = useState(false);

  const [isLoadingReports, setIsLoadingReports] = useState(false);


  // Add these state variables in the MapScreenGeoFencing component
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [isAnalyzingTime, setIsAnalyzingTime] = useState(false);
  const [timePredictions, setTimePredictions] = useState(null);
  const [showTimePredictionModal, setShowTimePredictionModal] = useState(false);


  const [showMoodMap, setShowMoodMap] = useState(false);
  const [moodData, setMoodData] = useState(null);
  const [isLoadingMoodData, setIsLoadingMoodData] = useState(false);
  const [selectedMoodArea, setSelectedMoodArea] = useState(null);
  const [showMoodDetailModal, setShowMoodDetailModal] = useState(false);
  const [moodMapOpacity] = useState(new Animated.Value(0));


  const [showNotificationButton, setShowNotificationButton] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribedLocations, setSubscribedLocations] = useState([]);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);


  const [dummyNotifications, setDummyNotifications] = useState([]);
  const [showNotificationDemo, setShowNotificationDemo] = useState(false);


  const AnimatedCircle = Animated.createAnimatedComponent(Circle);




  // Refs
  const mapRef = useRef(null);
  const dataFetchController = useRef(null);
  const searchTimeout = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.8)).current;
  const destinationBarAnim = useRef(new Animated.Value(-100)).current;
  
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
        await fetchPotholeData();
        startAnimations();
        loadSubscriptions();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      if (dataFetchController.current) {
        dataFetchController.current.abort();
      }
    };
  }, []);

  useEffect(() => {
  // Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}, []);


  const loadSubscriptions = async () => {
  try {
    const saved = await AsyncStorage.getItem('subscribedLocations');
    if (saved) {
      const locations = JSON.parse(saved);
      setSubscribedLocations(locations);
      setIsSubscribed(locations.length > 0);
    }
  } catch (error) {
    console.error('Error loading subscriptions:', error);
  }
};



  // Fetch area data when map is ready
  useEffect(() => {
    if (mapReady && location) {
      fetchUnifiedData();
    }


    
  }, [mapReady, location]);

  // Show destination bar animation
  useEffect(() => {
    Animated.spring(destinationBarAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

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


  const subscribeToLocationNotifications = async () => {
  if (!location) {
    Alert.alert('Location Required', 'Please enable location services to subscribe to notifications');
    return;
  }
  
  setIsSubscribing(true);
  
  try {
    // Get the area name for current location
    const currentLat = location.coords.latitude;
    const currentLng = location.coords.longitude;
    const nearestArea = await getNearestArea(currentLat, currentLng);
    
    if (!nearestArea) {
      Alert.alert('Error', 'Could not determine your current area');
      return;
    }
    
    // Check if already subscribed
    if (subscribedLocations.includes(nearestArea)) {
      Alert.alert(
        'Already Subscribed',
        `You are already receiving notifications for ${nearestArea}`,
        [
          { text: 'OK' },
          { 
            text: 'Unsubscribe', 
            onPress: () => unsubscribeFromLocation(nearestArea),
            style: 'destructive'
          }
        ]
      );
      return;
    }
    
    // Subscribe to notifications
    const userId = await AsyncStorage.getItem('userId');
    
    // Simulated API call - replace with your actual endpoint
    const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId || 'anonymous',
        location: {
          area: nearestArea,
          coordinates: {
            latitude: currentLat,
            longitude: currentLng
          }
        },
        notificationTypes: ['traffic', 'power', 'emergency', 'weather'],
        deviceToken: 'device-token-here'
      })
    });
    
    if (response.ok) {
      setSubscribedLocations([...subscribedLocations, nearestArea]);
      setIsSubscribed(true);
      
      // Store in AsyncStorage
      await AsyncStorage.setItem(
        'subscribedLocations', 
        JSON.stringify([...subscribedLocations, nearestArea])
      );
      
      // Show the subscriptions modal with demo notifications
      setShowSubscriptionsModal(true);
      setShowNotificationDemo(true);
      
      // Trigger dummy notifications
      setTimeout(() => {
        sendDummyNotification(nearestArea, 'traffic');
      }, 1000);
      
      setTimeout(() => {
        sendDummyNotification(nearestArea, 'power');
      }, 6000); // 5 seconds after the first one
      
      // Vibrate for feedback
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      } else {
        Vibration.vibrate(100);
      }
    }
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    Alert.alert('Error', 'Failed to subscribe to notifications. Please try again.');
  } finally {
    setIsSubscribing(false);
  }
};


const sendDummyNotification = async (area, type) => {
  const notificationId = Date.now().toString();
  
  let notificationData = {};
  
  if (type === 'traffic') {
    notificationData = {
      id: notificationId,
      title: '🚦 Traffic Alert - ' + area,
      body: 'Heavy traffic reported on MG Road near Forum Mall. Expected delay: 15-20 minutes',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      icon: 'car',
      color: '#FF6B9D',
      type: 'traffic'
    };
  } else if (type === 'power') {
    notificationData = {
      id: notificationId,
      title: '⚡ Power Update - ' + area,
      body: 'Scheduled maintenance tomorrow 10 AM - 2 PM. Please plan accordingly.',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      icon: 'flash-off',
      color: '#FFA502',
      type: 'power'
    };
  }
  
  // Add to dummy notifications with animation
  setDummyNotifications(prev => [...prev, { ...notificationData, isNew: true }]);
  
  // Play notification sound
  try {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    
    // Schedule a local notification (won't show in app, just for sound)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationData.title,
        body: notificationData.body,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.log('Notification sound error:', error);
  }
  
  // Remove the "new" flag after animation
  setTimeout(() => {
    setDummyNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isNew: false } : notif
      )
    );
  }, 500);
};

  const unsubscribeFromLocation = async (area) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      
      // API call to unsubscribe
      const response = await fetch(`${API_BASE_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || 'anonymous',
          area: area
        })
      });
      
      if (response.ok) {
        const updatedLocations = subscribedLocations.filter(loc => loc !== area);
        setSubscribedLocations(updatedLocations);
        
        if (updatedLocations.length === 0) {
          setIsSubscribed(false);
        }
        
        await AsyncStorage.setItem('subscribedLocations', JSON.stringify(updatedLocations));
        
        Alert.alert('Unsubscribed', `You will no longer receive notifications for ${area}`);
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      Alert.alert('Error', 'Failed to unsubscribe. Please try again.');
    }
  };

  const getNearestArea = async (lat, lng) => {
    // Define area coordinates (same as in your unified data)
    const areas = {
      "Koramangala": { lat: 12.9352, lng: 77.6245 },
      "Whitefield": { lat: 12.9698, lng: 77.7500 },
      "Electronic City": { lat: 12.8399, lng: 77.6770 },
      "Indiranagar": { lat: 12.9783, lng: 77.6408 },
      "Marathahalli": { lat: 12.9562, lng: 77.7019 },
      "Jayanagar": { lat: 12.9308, lng: 77.5838 },
      "BTM Layout": { lat: 12.9165, lng: 77.6101 },
      "HSR Layout": { lat: 12.9121, lng: 77.6446 },
      "Madavara": {lat: 13.057431968609581, lng: 77.47293226763847} , 
    };
    
    let minDistance = Infinity;
    let nearestArea = null;
    
    for (const [areaName, coords] of Object.entries(areas)) {
      const distance = Math.sqrt(
        Math.pow(coords.lat - lat, 2) + 
        Math.pow(coords.lng - lng, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestArea = areaName;
      }
    }
    
    // Only return area if within reasonable distance (about 3km)
    return minDistance < 0.03 ? nearestArea : null;
  };


  const fetchMoodMapData = async () => {
  if (!unifiedData.areas || Object.keys(unifiedData.areas).length === 0) {
    Alert.alert('No Data', 'Please wait for area data to load');
    return;
  }
  
  setIsLoadingMoodData(true);
  
  try {
    // Use the existing area data from unifiedData
    const areasData = Object.entries(unifiedData.areas).map(([areaName, areaData]) => ({
      name: areaName,
      coordinates: areaData.coordinates,
      status: areaData.status,
      metrics: areaData.metrics,
      issues: areaData.details?.issues || [],
      citizen_reports: areaData.details?.citizen_reports || [],
      current_status: areaData.details?.current_status || {},
      summary: areaData.summary,
      citizen_reports_summary: areaData.details?.citizen_reports_summary || null
    }));
    
    console.log('Sending mood analysis request for areas:', areasData.map(a => a.name));
    
    const response = await fetch(`${API_BASE_URL}/map/mood-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas_data: areasData,
        weather: unifiedData.weather,
        timestamp: unifiedData.timestamp
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Received mood data:', data.mood_areas?.map(a => ({ name: a.name, score: a.mood_score })));
      setMoodData(data);
    } else {
      console.error('Failed to fetch mood data:', response.status);
    }
  } catch (error) {
    console.error('Error fetching mood data:', error);
    Alert.alert('Error', 'Failed to load mood analysis');
  } finally {
    setIsLoadingMoodData(false);
  }
};





const toggleMoodMap = async () => {
  if (!showMoodMap && !moodData) {
    await fetchMoodMapData();
  }
  
  setShowMoodMap(!showMoodMap);
  
  // Animate transition with map style change
  Animated.parallel([
    Animated.timing(moodMapOpacity, {
      toValue: !showMoodMap ? 1 : 0,
      duration: 500,
      useNativeDriver: true,
    }),
    // Add a subtle zoom effect
    mapRef.current?.animateCamera({
      zoom: !showMoodMap ? 12 : 13,
    }, { duration: 500 })
  ]).start();
};


const MoodMapToggle = () => {
  // Animated value for the glow effect
  const glowAnim = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    if (showMoodMap && moodData) {
      // Create a glowing effect when mood map is active
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.2,
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
    }
  }, [showMoodMap, moodData]);
  
  const cityMoodScore = moodData?.city_insights?.city_mood_score || 0;
  const moodColor = cityMoodScore >= 7 ? '#2ED573' : 
                   cityMoodScore >= 5 ? '#FFA502' : '#FF4757';
  
  return (
    <TouchableOpacity
      style={styles.moodMapToggle}
      onPress={toggleMoodMap}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.moodMapToggleWrapper,
          showMoodMap && {
            transform: [{ scale: glowAnim }],
          }
        ]}
      >
        <LinearGradient
          colors={showMoodMap ? [moodColor, '#FF4757'] : ['#6C63FF', '#4C4C6D']}
          style={styles.moodMapToggleGradient}
        >
          {isLoadingMoodData ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons 
                name={showMoodMap ? "emoticon-cool" : "emoticon-happy"} 
                size={24} 
                color="#FFFFFF" 
              />
              <View style={styles.moodMapToggleContent}>
                <Text style={styles.moodMapToggleText}>
                  {showMoodMap ? 'Normal Map' : 'Mood Map'}
                </Text>
                {showMoodMap && moodData && (
                  <Text style={styles.cityMoodScore}>
                    City Mood: {cityMoodScore.toFixed(1)}/10
                  </Text>
                )}
              </View>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const MoodHeatmapOverlay = ({ moodData }) => {
  const [pulseAnims] = useState({});
  const [scaleAnims] = useState({});
  const [opacityAnims] = useState({});
  
  useEffect(() => {
    if (moodData && moodData.mood_areas) {
      // Initialize animations for each area
      moodData.mood_areas.forEach((area) => {
        const key = area.id;
        
        if (!pulseAnims[key]) {
          pulseAnims[key] = new Animated.Value(1);
          scaleAnims[key] = new Animated.Value(0);
          opacityAnims[key] = new Animated.Value(0);
          
          // Entrance animation
          Animated.parallel([
            Animated.spring(scaleAnims[key], {
              toValue: 1,
              tension: 40,
              friction: 7,
              delay: Math.random() * 300,
              useNativeDriver: false,
            }),
            Animated.timing(opacityAnims[key], {
              toValue: 1,
              duration: 800,
              delay: Math.random() * 300,
              useNativeDriver: false,
            })
          ]).start();
          
          // Continuous pulse animation - faster for higher mood scores
          const pulseDuration = 4000 - (area.mood_score * 200);
          
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnims[key], {
                toValue: 1.05,
                duration: pulseDuration / 2,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false,
              }),
              Animated.timing(pulseAnims[key], {
                toValue: 1,
                duration: pulseDuration / 2,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false,
              }),
            ])
          ).start();
        }
      });
    }
  }, [moodData]);
  
  if (!moodData || !moodData.mood_areas) return null;
  
  // Define sentiment colors
  const SENTIMENT_COLORS = {
    positive: '#2ED573',   // Green
    neutral: '#FFA502',    // Orange
    negative: '#FF4757'    // Red
  };
  
  // Base radius and mood score multiplier
  const MIN_BASE_RADIUS = 4000;  // Minimum radius for lowest mood
  const MAX_BASE_RADIUS = 8000;  // Maximum radius for highest mood
  
  return (
    <>
      {moodData.mood_areas.map((area, index) => {
        const key = area.id;
        const animValue = pulseAnims[key] || new Animated.Value(1);
        const scaleAnim = scaleAnims[key] || new Animated.Value(1);
        const opacityAnim = opacityAnims[key] || new Animated.Value(1);
        
        // Calculate base radius based on mood score (0-10)
        const moodMultiplier = (area.mood_score || 5) / 10; // Normalize to 0-1
        const baseRadius = MIN_BASE_RADIUS + (MAX_BASE_RADIUS - MIN_BASE_RADIUS) * moodMultiplier;
        
        // Get sentiment breakdown from backend
        const sentimentBreakdown = area.sentiment_breakdown || {
          positive: 33,
          neutral: 34,
          negative: 33
        };
        
        // Sort sentiments by percentage (largest to smallest for proper layering)
        const sentiments = [
          { type: 'positive', percentage: sentimentBreakdown.positive, color: SENTIMENT_COLORS.positive },
          { type: 'neutral', percentage: sentimentBreakdown.neutral, color: SENTIMENT_COLORS.neutral },
          { type: 'negative', percentage: sentimentBreakdown.negative, color: SENTIMENT_COLORS.negative }
        ].sort((a, b) => b.percentage - a.percentage);
        
        const circles = [];
        
        // Create concentric circles based on sentiment percentages
        sentiments.forEach((sentiment, sentimentIndex) => {
          // Only show circles for sentiments with meaningful percentages
          if (sentiment.percentage < 5) return;
          
          // Calculate radius: base radius (from mood score) * sentiment percentage
          const sentimentMultiplier = sentiment.percentage / 100;
          const finalRadius = baseRadius * sentimentMultiplier;
          
          // Add main sentiment circle
          circles.push(
            <AnimatedCircle
              key={`${key}-${sentiment.type}`}
              center={{
                latitude: area.coordinates.latitude,
                longitude: area.coordinates.longitude,
              }}
              radius={Animated.multiply(
                animValue,
                scaleAnim
              ).interpolate({
                inputRange: [0, 1, 1.05],
                outputRange: [0, finalRadius, finalRadius * 1.02]
              })}
              fillColor={Animated.multiply(
                opacityAnim,
                1
              ).interpolate({
                inputRange: [0, 1],
                outputRange: [
                  sentiment.color + '00',
                  sentiment.color + '20' // 12.5% opacity
                ]
              })}
              strokeColor={Animated.multiply(
                opacityAnim,
                1
              ).interpolate({
                inputRange: [0, 1],
                outputRange: [
                  sentiment.color + '00',
                  sentiment.color + '60' // 37.5% opacity
                ]
              })}
              strokeWidth={2.5}
              zIndex={index * 10 - sentimentIndex} // Proper layering
            />
          );
        });
        
        // Add a subtle center glow based on mood score
        // const glowRadius = 100 + (area.mood_score * 10); // 100-200 meter glow
        // circles.push(
        //   <AnimatedCircle
        //     key={`${key}-glow`}
        //     center={{
        //       latitude: area.coordinates.latitude,
        //       longitude: area.coordinates.longitude,
        //     }}
        //     radius={Animated.multiply(
        //       animValue,
        //       scaleAnim
        //     ).interpolate({
        //       inputRange: [0, 1, 1.05],
        //       outputRange: [0, glowRadius, glowRadius * 1.05]
        //     })}
        //     fillColor={Animated.multiply(
        //       opacityAnim,
        //       1
        //     ).interpolate({
        //       inputRange: [0, 1],
        //       outputRange: [
        //         area.mood_color + '00',
        //         area.mood_color + '40' // 25% opacity
        //       ]
        //     })}
        //     strokeWidth={0}
        //     zIndex={index * 10 + 10}
        //   />
        // );
        
        return circles;
      })}
    </>
  );
};

// Mood Detail Modal Component
const MoodDetailModal = () => {
  if (!showMoodDetailModal || !selectedMoodArea) return null;
  
  return (
    <Modal
      visible={showMoodDetailModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowMoodDetailModal(false)}
    >
      <View style={styles.moodModalOverlay}>
        <Animated.View 
          style={[
            styles.moodModalContent,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim
            }
          ]}
        >
          {/* Header with gradient background */}
          <LinearGradient
            colors={[selectedMoodArea.mood_color + 'FF', selectedMoodArea.mood_color + '99']}
            style={styles.moodModalHeader}
          >
            <View style={styles.moodModalHeaderContent}>
              <MaterialCommunityIcons 
                name={selectedMoodArea.mood_icon} 
                size={48} 
                color="#FFFFFF" 
              />
              <View style={styles.moodModalHeaderText}>
                <Text style={styles.moodModalTitle}>{selectedMoodArea.name}</Text>
                <Text style={styles.moodModalSubtitle}>
                  Mood Score: {selectedMoodArea.mood_score}/10
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => setShowMoodDetailModal(false)}
              style={styles.moodModalClose}
            >
              <MaterialIcons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.moodModalBody} showsVerticalScrollIndicator={false}>
            {/* Sentiment Overview */}
            <View style={styles.sentimentOverview}>
              <Text style={styles.sentimentTitle}>Overall Sentiment</Text>
              <View style={styles.sentimentBadge}>
                <LinearGradient
                  colors={[selectedMoodArea.mood_color + '20', selectedMoodArea.mood_color + '10']}
                  style={styles.sentimentBadgeGradient}
                >
                  <Text style={[
                    styles.sentimentText,
                    { color: selectedMoodArea.mood_color }
                  ]}>
                    {selectedMoodArea.sentiment.toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
            </View>
            
            {/* AI Analysis */}
            <View style={styles.aiAnalysisSection}>
              <View style={styles.sectionHeaderWithIcon}>
                <MaterialCommunityIcons name="brain" size={24} color="#FF6B9D" />
                <Text style={styles.sectionTitle}>AI Sentiment Analysis</Text>
              </View>
              <Text style={styles.aiAnalysisText}>
                {selectedMoodArea.ai_analysis}
              </Text>
            </View>
            
            {/* Key Factors */}
            <View style={styles.keyFactorsSection}>
              <View style={styles.sectionHeaderWithIcon}>
                <MaterialIcons name="analytics" size={24} color="#4C6EF5" />
                <Text style={styles.sectionTitle}>Key Contributing Factors</Text>
              </View>
              {selectedMoodArea.key_factors.map((factor, index) => (
                <View key={index} style={styles.factorCard}>
                  <View style={[
                    styles.factorIcon,
                    { backgroundColor: factor.color + '20' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={factor.icon} 
                      size={20} 
                      color={factor.color} 
                    />
                  </View>
                  <View style={styles.factorContent}>
                    <Text style={styles.factorTitle}>{factor.category}</Text>
                    <Text style={styles.factorDescription}>{factor.description}</Text>
                    <View style={styles.factorImpact}>
                      <Text style={styles.factorImpactLabel}>Impact:</Text>
                      <View style={styles.impactBar}>
                        <View style={[
                          styles.impactFill,
                          { 
                            width: `${factor.impact * 100}%`,
                            backgroundColor: factor.color 
                          }
                        ]} />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            
            {/* Citizen Sentiment */}
            <View style={styles.citizenSentimentSection}>
              <View style={styles.sectionHeaderWithIcon}>
                <MaterialIcons name="people" size={24} color="#FFA502" />
                <Text style={styles.sectionTitle}>Sentiment Distribution</Text>
              </View>
              <View style={styles.sentimentBreakdown}>
                {Object.entries(selectedMoodArea.sentiment_breakdown).map(([sentiment, percentage]) => (
                  <View key={sentiment} style={styles.sentimentItem}>
                    <MaterialCommunityIcons 
                      name={
                        sentiment === 'positive' ? 'emoticon-happy' :
                        sentiment === 'negative' ? 'emoticon-sad' :
                        'emoticon-neutral'
                      } 
                      size={48} 
                      color={
                        sentiment === 'positive' ? '#2ED573' :
                        sentiment === 'negative' ? '#FF4757' :
                        '#FFA502'
                      } 
                    />
                    <Text style={[
                      styles.sentimentPercentage,
                      {
                        color: sentiment === 'positive' ? '#2ED573' :
                              sentiment === 'negative' ? '#FF4757' :
                              '#FFA502'
                      }
                    ]}>
                      {percentage}%
                    </Text>
                    <Text style={styles.sentimentLabel}>
                      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                    </Text>
                    <View style={[
                      styles.sentimentBar,
                      {
                        height: `${percentage}%`,
                        backgroundColor: sentiment === 'positive' ? '#2ED573' :
                                      sentiment === 'negative' ? '#FF4757' :
                                      '#FFA502',
                      }
                    ]} />
                  </View>
                ))}
              </View>
            </View>
            
            {/* Time Trends */}
            <View style={styles.timeTrendsSection}>
              <View style={styles.sectionHeaderWithIcon}>
                <MaterialIcons name="timeline" size={24} color="#9C27B0" />
                <Text style={styles.sectionTitle}>24-Hour Mood Trend</Text>
              </View>
              <View style={styles.trendChart}>
                {selectedMoodArea.mood_trend.map((point, index) => (
                  <View key={index} style={styles.trendPoint}>
                    <View style={[
                      styles.trendBar,
                      { 
                        height: `${point.score * 10}%`,
                        backgroundColor: point.color
                      }
                    ]} />
                    <Text style={styles.trendTime}>{point.time}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Recommendations */}
            <View style={styles.recommendationsSection}>
              <View style={styles.sectionHeaderWithIcon}>
                <MaterialIcons name="lightbulb" size={24} color="#4CAF50" />
                <Text style={styles.sectionTitle}>AI Recommendations</Text>
              </View>
              {selectedMoodArea.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationCard}>
                  <LinearGradient
                    colors={['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.05)']}
                    style={styles.recommendationGradient}
                  >
                    <MaterialIcons 
                      name={rec.icon} 
                      size={20} 
                      color="#4CAF50" 
                    />
                    <Text style={styles.recommendationText}>{rec.text}</Text>
                  </LinearGradient>
                </View>
              ))}
            </View>
            
            {/* Data Sources */}
            <View style={styles.dataSourcesSection}>
              <Text style={styles.dataSourcesTitle}>Analysis based on:</Text>
              <View style={styles.dataSourcesList}>
                {selectedMoodArea.data_sources.map((source, index) => (
                  <View key={index} style={styles.dataSourceChip}>
                    <Text style={styles.dataSourceText}>{source}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};



  const handleTimeConfirm = (time) => {
    setShowTimePicker(false);
    if (time) {
      // Create a new date with today's date but selected time
      const now = new Date();
      const newTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        time.getHours(),
        time.getMinutes()
      );
      setSelectedTime(newTime);
    }
  };


  // Custom Time Picker Component (no external dependencies needed)
const CustomTimePicker = ({ visible, onClose, onSelectTime, currentTime }) => {
  const [selectedHour, setSelectedHour] = useState(currentTime.getHours());
  const [selectedMinute, setSelectedMinute] = useState(currentTime.getMinutes());
  const [isPM, setIsPM] = useState(currentTime.getHours() >= 12);
  
  // Convert 24h to 12h format
  const displayHour = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
  
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 5-minute intervals
  
  const handleConfirm = () => {
    const newTime = new Date();
    let hour24 = displayHour;
    
    if (isPM && displayHour !== 12) {
      hour24 = displayHour + 12;
    } else if (!isPM && displayHour === 12) {
      hour24 = 0;
    }
    
    newTime.setHours(hour24);
    newTime.setMinutes(selectedMinute);
    newTime.setSeconds(0);
    
    onSelectTime(newTime);
    onClose();
  };
  
  const handleHourSelect = (hour) => {
    let hour24 = hour;
    if (isPM && hour !== 12) {
      hour24 = hour + 12;
    } else if (!isPM && hour === 12) {
      hour24 = 0;
    }
    setSelectedHour(hour24);
  };
  
  const handleQuickTime = (hours24, minutes) => {
    setSelectedHour(hours24);
    setSelectedMinute(minutes);
    setIsPM(hours24 >= 12);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.timePickerOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.timePickerContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Quick time selections */}
          <View style={styles.quickTimeSection}>
            <Text style={styles.quickTimeLabel}>Quick Select</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickTimeScroll}
            >
              <TouchableOpacity
                style={styles.quickTimeButton}
                onPress={() => {
                  const now = new Date();
                  handleQuickTime(now.getHours(), now.getMinutes());
                }}
              >
                <MaterialIcons name="schedule" size={16} color="#6C63FF" />
                <Text style={styles.quickTimeText}>Now</Text>
              </TouchableOpacity>
              
              {[
                { label: '6:00 AM', hour: 6, min: 0 },
                { label: '8:00 AM', hour: 8, min: 0 },
                { label: '10:00 AM', hour: 10, min: 0 },
                { label: '12:00 PM', hour: 12, min: 0 },
                { label: '3:00 PM', hour: 15, min: 0 },
                { label: '5:00 PM', hour: 17, min: 0 },
                { label: '7:00 PM', hour: 19, min: 0 },
                { label: '9:00 PM', hour: 21, min: 0 },
              ].map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickTimeButton}
                  onPress={() => handleQuickTime(time.hour, time.min)}
                >
                  <Text style={styles.quickTimeText}>{time.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Time display */}
          <View style={styles.timeDisplayContainer}>
            <Text style={styles.timeDisplay}>
              {displayHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {isPM ? 'PM' : 'AM'}
            </Text>
          </View>

          {/* Time selection wheels */}
          <View style={styles.timeWheelsContainer}>
            {/* Hour selector */}
            <View style={styles.timeWheel}>
              <Text style={styles.wheelLabel}>Hour</Text>
              <ScrollView 
                style={styles.wheelScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.wheelContent}
              >
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.wheelItem,
                      displayHour === hour && styles.wheelItemSelected
                    ]}
                    onPress={() => handleHourSelect(hour)}
                  >
                    <Text style={[
                      styles.wheelItemText,
                      displayHour === hour && styles.wheelItemTextSelected
                    ]}>
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Colon separator */}
            <Text style={styles.colonSeparator}>:</Text>

            {/* Minute selector */}
            <View style={styles.timeWheel}>
              <Text style={styles.wheelLabel}>Minute</Text>
              <ScrollView 
                style={styles.wheelScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.wheelContent}
              >
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.wheelItem,
                      selectedMinute === minute && styles.wheelItemSelected
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text style={[
                      styles.wheelItemText,
                      selectedMinute === minute && styles.wheelItemTextSelected
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM selector */}
            <View style={styles.periodSelector}>
              <Text style={styles.wheelLabel}>Period</Text>
              <TouchableOpacity
                style={[styles.periodButton, !isPM && styles.periodButtonSelected]}
                onPress={() => {
                  setIsPM(false);
                  if (selectedHour >= 12) {
                    setSelectedHour(selectedHour - 12);
                  }
                }}
              >
                <Text style={[styles.periodText, !isPM && styles.periodTextSelected]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, isPM && styles.periodButtonSelected]}
                onPress={() => {
                  setIsPM(true);
                  if (selectedHour < 12) {
                    setSelectedHour(selectedHour + 12);
                  }
                }}
              >
                <Text style={[styles.periodText, isPM && styles.periodTextSelected]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.timePickerActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <LinearGradient
                colors={['#6C63FF', '#4C4C6D']}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonText}>Set Time</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};


  // Fetch pothole data from Gist
  const fetchPotholeData = async () => {
    try {
      const response = await axios.get(POTHOLE_DATA_URL);
      const yamlData = yaml.load(response.data);
      
      if (yamlData && yamlData.data) {
        setPotholeData(yamlData.data);
        console.log(`Fetched ${yamlData.data.length} pothole records`);
      }
    } catch (error) {
      console.error('Error fetching pothole data:', error);
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
    
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.3,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const fetchUnifiedData = async (forceRefresh = false) => {
  if (dataFetchController.current) {
    dataFetchController.current.abort();
  }
  
  dataFetchController.current = new AbortController();
  
  try {
    console.log('Fetching unified area data...');
    setRefreshing(true);
    setIsLoadingReports(true); // Add this
    
    const response = await fetch(`${API_BASE_URL}/map/areas/unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas: [],
        force_refresh: forceRefresh
      }),
      signal: dataFetchController.current.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Received unified data for ${Object.keys(data.areas || {}).length} areas`);
    
    // Set initial data quickly
    setUnifiedData({
      areas: data.areas || {},
      weather: data.weather || null,
      timestamp: data.timestamp
    });
    
    // Then fetch citizen reports in background
    const areasWithReports = await fetchAllAreasCitizenReports(data.areas);
    
    // Update with citizen reports
    setUnifiedData({
      areas: areasWithReports,
      weather: data.weather || null,
      timestamp: data.timestamp
    });
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch cancelled');
      return;
    }
    
    console.error('Error fetching unified data:', error);
    Alert.alert(
      'Connection Error',
      'Unable to fetch real-time data. Please check your connection.',
      [
        { text: 'Retry', onPress: () => fetchUnifiedData(forceRefresh) },
        { text: 'OK' }
      ]
    );
  } finally {
    setRefreshing(false);
    setIsLoadingReports(false); // Add this
  }
};

const fetchAllAreasCitizenReports = async (areas) => {
  try {
    console.log('Fetching citizen reports for all areas...');
    
    // Create an array of promises for parallel processing
    const reportPromises = Object.entries(areas).map(async ([areaName, areaData]) => {
      try {
        const summary = await fetchAndSummarizeCitizenReports(areaName, areaData.coordinates);
        return {
          areaName,
          summary
        };
      } catch (error) {
        console.error(`Error fetching reports for ${areaName}:`, error);
        return {
          areaName,
          summary: null
        };
      }
    });
    
    // Wait for all summaries to complete
    const summaries = await Promise.all(reportPromises);
    
    // Merge summaries back into areas data
    const updatedAreas = { ...areas };
    summaries.forEach(({ areaName, summary }) => {
      if (updatedAreas[areaName]) {
        updatedAreas[areaName] = {
          ...updatedAreas[areaName],
          details: {
            ...updatedAreas[areaName].details,
            citizen_reports_summary: summary
          }
        };
      }
    });
    
    console.log('Completed fetching citizen reports for all areas');
    return updatedAreas;
    
  } catch (error) {
    console.error('Error in batch fetching citizen reports:', error);
    return areas; // Return original areas if batch processing fails
  }
};

  // Google Places Autocomplete
  const searchDestination = async (text) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (!text || text.length < 3) {
      setSearchResults([]);
      return;
    }
    
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
          `input=${encodeURIComponent(text)}` +
          `&location=${location?.coords?.latitude},${location?.coords?.longitude}` +
          `&radius=50000` +
          `&components=country:in` +
          `&key=${GOOGLE_MAPS_API_KEY}`
        );
        
        const data = await response.json();
        if (data.predictions) {
          setSearchResults(data.predictions);
        }
      } catch (error) {
        console.error('Error searching places:', error);
      }
    }, 300);
  };

  // Get place details
  const selectDestination = async (placeId, description) => {
    setShowSearchModal(false);
    setDestinationInput(description);
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}` +
        `&fields=geometry,name,formatted_address` +
        `&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      if (data.result) {
        const dest = {
          name: data.result.name,
          address: data.result.formatted_address,
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          placeId: placeId
        };
        
        setDestination(dest);
        await calculateRoutes(dest);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Error', 'Failed to get destination details');
    }
  };

  // Calculate routes with traffic consideration
  const calculateRoutes = async (dest) => {
    if (!location || !dest) return;
    
    setIsCalculatingRoute(true);
    setNavigationMode(true);
    
    try {
      // Get multiple route alternatives
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${location.coords.latitude},${location.coords.longitude}` +
        `&destination=${dest.latitude},${dest.longitude}` +
        `&alternatives=true` +
        `&departure_time=now` +
        `&traffic_model=best_guess` +
        `&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        // Process routes and decode polylines
        const processedRoutes = data.routes.map((route, index) => ({
          ...route,
          coordinates: decodePolyline(route.overview_polyline.points),
          index: index,
          color: index === 0 ? ROUTE_COLORS.selected : ROUTE_COLORS.alternative
        }));
        
        setRoutes(processedRoutes);
        
        // Find potholes along each route
        await findPotholesAlongRoutes(processedRoutes);
        
        // Analyze routes through our area data
        await analyzeRoutesWithAreaData(processedRoutes, dest);
        
        // Fit map to show all routes
        fitMapToRoutes(processedRoutes);
      }
    } catch (error) {
      console.error('Error calculating routes:', error);
      Alert.alert('Error', 'Failed to calculate routes');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Find potholes along routes
  const findPotholesAlongRoutes = async (routes) => {
    const routePotholesData = {};
    
    routes.forEach((route, routeIndex) => {
      const potholesOnRoute = [];
      
      potholeData.forEach(pothole => {
        // Check if pothole is near any point on the route
        for (let i = 0; i < route.coordinates.length; i++) {
          const coord = route.coordinates[i];
          const distance = calculateDistance(
            coord.latitude,
            coord.longitude,
            pothole.lat,
            pothole.long
          );
          
          // If pothole is within 50 meters of the route, include it
          if (distance < 0.05) { // ~50 meters
            potholesOnRoute.push({
              ...pothole,
              distance: distance,
              nearestRoutePoint: i
            });
            break; // Don't check rest of route points for this pothole
          }
        }
      });
      
      // Sort potholes by their position along the route
      potholesOnRoute.sort((a, b) => a.nearestRoutePoint - b.nearestRoutePoint);
      routePotholesData[routeIndex] = potholesOnRoute;
      
      console.log(`Route ${routeIndex}: Found ${potholesOnRoute.length} potholes`);
    });
    
    setRoutePotholes(routePotholesData);
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get pothole severity text
  const getPotholeSeverity = (category) => {
    switch(category) {
      case 0: return 'Minor';
      case 1: return 'Moderate';
      case 2: return 'Major';
      case 3: return 'Severe';
      default: return 'Unknown';
    }
  };

  // Analyze routes with area data and potholes
  const analyzeRoutesWithAreaData = async (routes, dest) => {
    const recommendations = [];
    
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const affectedAreas = [];
      const allIssues = [];
      const trafficLevels = [];
      
      // Check which areas the route passes through
      for (const [areaName, areaData] of Object.entries(unifiedData.areas)) {
        if (routePassesThroughArea(route, areaData)) {
          // Collect detailed area information
          const areaInfo = {
            name: areaName,
            status: areaData.status,
            color: areaData.color,
            summary: areaData.summary,
            metrics: areaData.metrics,
            traffic: areaData.metrics?.traffic_level || 'normal',
            power: areaData.metrics?.power_status || 'normal',
            issueCount: areaData.metrics?.issue_count || 0
          };
          
          // Add detailed information if available
          if (areaData.details) {
            areaInfo.currentStatus = areaData.details.current_status;
            areaInfo.issues = areaData.details.issues || [];
            areaInfo.recommendations = areaData.details.recommendations || [];
            
            // Collect all issues from this area
            if (areaData.details.issues) {
              allIssues.push(...areaData.details.issues.map(issue => ({
                ...issue,
                area: areaName
              })));
            }
          }
          
          affectedAreas.push(areaInfo);
          
          // Track traffic levels
          if (areaData.metrics?.traffic_level) {
            trafficLevels.push(areaData.metrics.traffic_level);
          }
        }
      }
      
      // Add pothole information
      const routePotholesCount = routePotholes[i]?.length || 0;
      const potholeSeverities = routePotholes[i]?.map(p => p.category) || [];
      const severePotholes = potholeSeverities.filter(cat => cat >= 2).length;
      const moderatePotholes = potholeSeverities.filter(cat => cat === 1).length;
      const minorPotholes = potholeSeverities.filter(cat => cat === 0).length;
      
      // Calculate route traffic score based on affected areas and potholes
      const trafficScore = calculateRouteTrafficScore(affectedAreas, routePotholesCount, severePotholes);
      
      // Use Gemini to analyze the route with detailed area information
      const geminiAnalysis = await analyzeRouteWithGemini(
        route, 
        affectedAreas, 
        allIssues, 
        dest,
        trafficScore,
        routePotholes[i] || []
      );
      
      recommendations.push({
        routeIndex: i,
        duration: route.legs[0].duration,
        distance: route.legs[0].distance,
        affectedAreas,
        issues: allIssues,
        trafficScore,
        potholeCount: routePotholesCount,
        severePotholes: severePotholes,
        moderatePotholes: moderatePotholes,
        minorPotholes: minorPotholes,
        recommendation: geminiAnalysis.recommendation,
        trafficLevel: geminiAnalysis.trafficLevel,
        alternativeReason: geminiAnalysis.reason,
        specificConcerns: geminiAnalysis.specificConcerns || [],
        alternativeTimeSlots: geminiAnalysis.alternativeTimeSlots || [],
        color: getRouteColor(geminiAnalysis.trafficLevel)
      });
    }
    
    // Sort by traffic score (lower is better)
    recommendations.sort((a, b) => a.trafficScore - b.trafficScore);
    
    setRouteRecommendations(recommendations);
    
    // Show navigation modal
    setModalPosition('center');
    setShowNavigationModal(true);
  };

  // Calculate traffic score for route ranking (updated to include potholes)
  const calculateRouteTrafficScore = (affectedAreas, potholeCount, severePotholes) => {
    let score = 0;
    
    affectedAreas.forEach(area => {
      // Base score from traffic level
      switch (area.traffic) {
        case 'heavy':
          score += 10;
          break;
        case 'moderate':
          score += 5;
          break;
        case 'normal':
          score += 1;
          break;
      }
      
      // Add score based on area status
      switch (area.status) {
        case 'critical':
          score += 8;
          break;
        case 'warning':
          score += 4;
          break;
        case 'good':
          score += 0;
          break;
      }
      
      // Add score based on issue count
      score += area.issueCount * 2;
    });
    
    // Add score based on potholes
    score += potholeCount * 0.5; // Each pothole adds 0.5 to score
    score += severePotholes * 2; // Severe potholes add extra 2 points
    
    return score;
  };

  // Check if route passes through an area
  const routePassesThroughArea = (route, areaData) => {
    const areaLat = areaData.coordinates.latitude;
    const areaLng = areaData.coordinates.longitude;
    const areaRadius = 0.02; // Approximately 2km
    
    // Check if any point in the route is within the area
    return route.coordinates.some(coord => {
      const distance = Math.sqrt(
        Math.pow(coord.latitude - areaLat, 2) + 
        Math.pow(coord.longitude - areaLng, 2)
      );
      return distance < areaRadius;
    });
  };

  // Analyze route with Gemini (updated to include potholes)
  const analyzeRouteWithGemini = async (route, affectedAreas, issues, dest, trafficScore, potholes) => {
    try {
      // Create detailed area summary for analysis
      const areasSummary = affectedAreas.map(area => ({
        name: area.name,
        status: area.status,
        traffic: area.traffic,
        issueCount: area.issueCount,
        currentTrafficStatus: area.currentStatus?.traffic?.description || 'No data',
        recommendations: area.recommendations?.slice(0, 2) || []
      }));
      
      const response = await fetch(`${API_BASE_URL}/analyze-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route_summary: route.summary || route.legs[0].via_waypoint?.map(w => w.location).join(' → '),
          duration: route.legs[0].duration.text,
          distance: route.legs[0].distance.text,
          affected_areas: areasSummary,
          current_issues: issues,
          destination: dest.name,
          time_of_day: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
          traffic_score: trafficScore,
          detailed_area_status: affectedAreas,
          pothole_count: potholes.length,
          severe_potholes: potholes.filter(p => p.category >= 2).length
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          ...data,
          specificConcerns: data.specificConcerns || generateSpecificConcerns(affectedAreas, issues, potholes)
        };
      }
    } catch (error) {
      console.error('Error analyzing route with Gemini:', error);
    }
    
    // Enhanced fallback analysis using actual area data
    return performLocalRouteAnalysis(affectedAreas, issues, trafficScore, potholes);
  };

  // Generate specific concerns based on area data (updated to include potholes)
  const generateSpecificConcerns = (affectedAreas, issues, potholes) => {
    const concerns = [];
    
    // Add prominent pothole concerns first
    if (potholes.length > 0) {
      const severePotholes = potholes.filter(p => p.category >= 2).length;
      const moderatePotholes = potholes.filter(p => p.category === 1).length;
      
      if (severePotholes >= 5) {
        concerns.push(`⚠️ SEVERE: ${severePotholes} major/severe potholes - Drive very slowly`);
      } else if (severePotholes >= 2) {
        concerns.push(`⚠️ ${severePotholes} major/severe potholes require careful navigation`);
      }
      
      if (potholes.length >= 10) {
        concerns.push(`🚧 ${potholes.length} total potholes will significantly impact travel time`);
      } else if (potholes.length >= 5) {
        concerns.push(`${potholes.length} potholes detected along this route`);
      }
    }
    
    affectedAreas.forEach(area => {
      if (area.status === 'critical') {
        concerns.push(`Critical conditions in ${area.name}: ${area.summary}`);
      } else if (area.status === 'warning' && area.issueCount > 0) {
        concerns.push(`${area.issueCount} active issues in ${area.name}`);
      }
      
      // Add specific traffic concerns
      if (area.traffic === 'heavy') {
        concerns.push(`Heavy traffic reported in ${area.name}`);
      }
    });
    
    // Add issue-specific concerns
    const trafficIssues = issues.filter(issue => issue.type === 'traffic');
    const powerIssues = issues.filter(issue => issue.type === 'power');
    
    if (trafficIssues.length > 0) {
      concerns.push(`${trafficIssues.length} traffic incidents along the route`);
    }
    
    if (powerIssues.length > 0) {
      concerns.push(`Power issues may affect traffic signals`);
    }
    
    return concerns.slice(0, 6); // Limit to top 6 concerns
  };

  // Enhanced local route analysis (updated to include potholes)
  const performLocalRouteAnalysis = (affectedAreas, issues, trafficScore, potholes) => {
    // Determine traffic level based on score
    let trafficLevel = 'low';
    let recommendation = 'Recommended route';
    let reason = 'Good traffic conditions';
    
    const severePotholes = potholes.filter(p => p.category >= 2).length;
    const totalPotholes = potholes.length;
    
    // Consider both traffic and road conditions
    if (trafficScore >= 30 || severePotholes >= 5 || totalPotholes >= 10) {
      trafficLevel = 'heavy';
      if (severePotholes >= 5) {
        recommendation = 'Poor road conditions - Choose alternative route';
        reason = `${severePotholes} severe potholes make this route hazardous`;
      } else if (totalPotholes >= 10) {
        recommendation = 'Many road imperfections - Proceed with caution';
        reason = `${totalPotholes} potholes will significantly slow travel`;
      } else {
        recommendation = 'Heavy traffic - Consider alternatives';
        reason = 'Multiple areas with heavy traffic and issues';
      }
    } else if (trafficScore >= 15 || severePotholes >= 2 || totalPotholes >= 5) {
      trafficLevel = 'moderate';
      recommendation = 'Use with caution - expect delays';
      if (severePotholes >= 2) {
        reason = `Moderate traffic with ${severePotholes} severe potholes`;
      } else if (totalPotholes >= 5) {
        reason = `${totalPotholes} potholes may slow your journey`;
      } else {
        reason = 'Moderate traffic in several areas';
      }
    } else {
      recommendation = totalPotholes > 0 
        ? 'Good route - Minor road imperfections'
        : 'Excellent route - Clear roads';
      reason = totalPotholes > 0 
        ? `Minimal traffic, only ${totalPotholes} minor pothole${totalPotholes > 1 ? 's' : ''}`
        : 'Minimal traffic issues detected';
    }
    
    // Generate time-based recommendations
    const currentHour = new Date().getHours();
    const alternativeTimeSlots = [];
    
    if (trafficLevel !== 'low') {
      if (currentHour >= 7 && currentHour <= 10) {
        alternativeTimeSlots.push('After 10:30 AM', 'Before 6:30 AM');
      } else if (currentHour >= 17 && currentHour <= 20) {
        alternativeTimeSlots.push('After 8:30 PM', 'Before 4:30 PM');
      }
    }
    
    return {
      recommendation,
      trafficLevel,
      reason,
      alternativeTimeSlots,
      specificConcerns: generateSpecificConcerns(affectedAreas, issues, potholes)
    };
  };

  // Get route color based on traffic level
  const getRouteColor = (trafficLevel) => {
    switch (trafficLevel) {
      case 'low':
        return ROUTE_COLORS.fastest;
      case 'moderate':
        return ROUTE_COLORS.moderate;
      case 'heavy':
        return ROUTE_COLORS.slowest;
      default:
        return ROUTE_COLORS.alternative;
    }
  };

  // Decode Google polyline
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      
      shift = 0;
      result = 0;
      
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;
      
      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    
    return points;
  };

  // Fit map to show all routes
  const fitMapToRoutes = (routes) => {
    if (!routes || routes.length === 0) return;
    
    const allCoordinates = [];
    
    // Add origin
    if (location) {
      allCoordinates.push({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    }
    
    // Add destination
    if (destination) {
      allCoordinates.push({
        latitude: destination.latitude,
        longitude: destination.longitude
      });
    }
    
    // Add route coordinates
    routes.forEach(route => {
      allCoordinates.push(...route.coordinates);
    });
    
    if (allCoordinates.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(allCoordinates, {
        edgePadding: {
          top: 150,
          right: 50,
          bottom: 350,
          left: 50
        },
        animated: true
      });
    }
  };

  // Select a route
  const selectRoute = (index) => {
    setSelectedRouteIndex(index);
    
    // Update route colors
    const updatedRoutes = routes.map((route, i) => ({
      ...route,
      color: i === index ? ROUTE_COLORS.selected : ROUTE_COLORS.alternative
    }));
    
    setRoutes(updatedRoutes);
  };

  // Clear navigation
  const clearNavigation = () => {
    setDestination(null);
    setDestinationInput('');
    setRoutes([]);
    setRouteRecommendations([]);
    setNavigationMode(false);
    setSelectedRouteIndex(0);
    setShowNavigationModal(false);
    setRoutePotholes({});
    setSelectedPothole(null);
    setShowPotholeModal(false);
  };

  // Handle pothole marker press
  const handlePotholePress = (pothole) => {
    setSelectedPothole(pothole);
    setShowPotholeModal(true);
  };

  // Render pothole details modal
  const renderPotholeModal = () => {
    if (!selectedPothole) return null;

    return (
      <Modal
        visible={showPotholeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPotholeModal(false)}
      >
        <TouchableOpacity 
          style={styles.potholeModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPotholeModal(false)}
        >
          <View style={styles.potholeModalContent}>
            <View style={styles.potholeModalHeader}>
              <View style={styles.potholeModalTitleContainer}>
                <View style={[
                  styles.potholeSeverityIndicator,
                  { backgroundColor: POTHOLE_CATEGORY_COLORS[selectedPothole.category] }
                ]}>
                  <MaterialCommunityIcons name="road-variant" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.potholeModalTextContainer}>
                  <Text style={styles.potholeModalTitle}>
                    {getPotholeSeverity(selectedPothole.category)} Pothole
                  </Text>
                  <Text style={styles.potholeModalSubtitle}>
                    Reported on {new Date(selectedPothole.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowPotholeModal(false)}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {selectedPothole.image && (
              <View style={styles.potholeImageContainer}>
                <Image
                  source={{ uri: selectedPothole.image }}
                  style={styles.potholeImage}
                  resizeMode="cover"
                />
              </View>
            )}
            
            <View style={styles.potholeDetailsContainer}>
              <View style={styles.potholeDetailRow}>
                <MaterialIcons name="location-on" size={20} color="#666" />
                <Text style={styles.potholeDetailText}>
                  Lat: {selectedPothole.lat.toFixed(6)}, Long: {selectedPothole.long.toFixed(6)}
                </Text>
              </View>
              
              <View style={styles.potholeDetailRow}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#666" />
                <Text style={styles.potholeDetailText}>
                  Category {selectedPothole.category} - {getPotholeSeverity(selectedPothole.category)}
                </Text>
              </View>
              
              <View style={styles.potholeDetailRow}>
                <MaterialIcons name="access-time" size={20} color="#666" />
                <Text style={styles.potholeDetailText}>
                  {new Date(selectedPothole.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.potholeReportButton}
              onPress={() => {
                Alert.alert('Report Update', 'Feature to update pothole status coming soon!');
              }}
            >
              <LinearGradient
                colors={['#FF6B9D', '#FF4757']}
                style={styles.potholeReportGradient}
              >
                <MaterialIcons name="flag" size={20} color="#FFFFFF" />
                <Text style={styles.potholeReportText}>Report Update</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const handleAreaMarkerPress = useCallback((areaName) => {
  if (Platform.OS === 'ios') {
    Vibration.vibrate(10);
  } else {
    Vibration.vibrate(20);
  }
  
  const areaData = unifiedData.areas[areaName];
  if (!areaData) {
    console.error('Area data not found:', areaName);
    return;
  }
  
  setSelectedArea({
    ...areaData,
    ...areaData.details,
    timestamp: unifiedData.timestamp
  });
  
  mapRef.current?.animateCamera({
    center: {
      latitude: areaData.coordinates.latitude - 0.01,
      longitude: areaData.coordinates.longitude,
    },
    zoom: 14,
  }, { duration: 800 });
  
  setModalPosition('bottom');
  setShowAreaModal(true);
}, [unifiedData]);

  const renderAreaMarker = useCallback((areaName, areaData) => {
  // Debug log
  console.log(`Rendering marker for ${areaName}:`, {
    showMoodMap,
    hasMoodData: !!moodData,
    coordinates: areaData.coordinates,
    moodAreas: moodData?.mood_areas?.map(m => m.name)
  });
  
  const isSelected = selectedArea?.name === areaName;
  
  // Default values from area data
  let displayColor = areaData.color || '#999999';
  let displayIcon = areaData.icon || 'map-marker';
  let displayBadgeValue = areaData.metrics?.issue_count || 0;
  let displayBadgeText = displayBadgeValue > 0 ? displayBadgeValue.toString() : null;
  let moodInfo = null;
  let sentimentText = null;
  
  // Override with mood data if in mood mode
  if (showMoodMap && moodData && moodData.mood_areas) {
    const moodArea = moodData.mood_areas.find(m => m.name === areaName);
    console.log(`Found mood data for ${areaName}:`, moodArea);
    
    if (moodArea) {
      moodInfo = moodArea;
      // Use dominant sentiment color
      const sentiments = moodArea.sentiment_breakdown || {};
      const dominantSentiment = Object.entries(sentiments).reduce((a, b) => 
        sentiments[a[0]] > sentiments[b[0]] ? a : b
      );
      
      displayColor = dominantSentiment[0] === 'positive' ? '#2ED573' :
                     dominantSentiment[0] === 'negative' ? '#FF4757' : '#FFA502';
      displayIcon = dominantSentiment[0] === 'positive' ? 'emoticon-happy' :
                    dominantSentiment[0] === 'negative' ? 'emoticon-sad' : 'emoticon-neutral';
      displayBadgeText = `${Math.round(dominantSentiment[1])}%`;
      sentimentText = dominantSentiment[0];
    }
}
  
  // Make sure we have valid coordinates
  if (!areaData.coordinates || !areaData.coordinates.latitude || !areaData.coordinates.longitude) {
    console.error(`Invalid coordinates for ${areaName}:`, areaData.coordinates);
    return null;
  }
  
  return (
    <Marker
      key={`${areaData.id}-${showMoodMap ? 'mood' : 'normal'}`} // Unique key for each mode
      coordinate={{
        latitude: areaData.coordinates.latitude,
        longitude: areaData.coordinates.longitude,
      }}
      onPress={() => {
        console.log(`Marker pressed: ${areaName}, mood mode: ${showMoodMap}`);
        if (showMoodMap && moodInfo) {
          setSelectedMoodArea(moodInfo);
          setShowMoodDetailModal(true);
          
          if (Platform.OS === 'ios') {
            Vibration.vibrate(10);
          } else {
            Vibration.vibrate(20);
          }
        } else {
          handleAreaMarkerPress(areaName);
        }
      }}
      tracksViewChanges={false}
    >
      <View style={styles.areaMarkerContainer}>
        <View style={[
          styles.areaMarkerOuter,
          { 
            borderColor: displayColor,
            transform: [{ scale: isSelected ? 1.1 : 1 }]
          }
        ]}>
          <LinearGradient
            colors={[displayColor + '20', displayColor + '40']}
            style={styles.areaMarkerInner}
          >
            <MaterialCommunityIcons 
              name={displayIcon} 
              size={28} 
              color={displayColor} 
            />
            {displayBadgeText && (
              <View style={[styles.areaBadge, { backgroundColor: displayColor }]}>
                <Text style={styles.areaBadgeText}>{displayBadgeText}</Text>
              </View>
            )}
          </LinearGradient>
        </View>
        <View style={[styles.areaLabelContainer, { backgroundColor: displayColor + 'F0' }]}>
          <Text style={styles.areaLabelText}>{areaData.name}</Text>
          {showMoodMap && sentimentText && (
            <Text style={[styles.areaLabelText, { fontSize: 11, opacity: 0.8, marginTop: 2 }]}>
              {sentimentText}
            </Text>
          )}
        </View>
      </View>
    </Marker>
  );
}, [selectedArea, handleAreaMarkerPress, showMoodMap, moodData, setSelectedMoodArea, setShowMoodDetailModal]);


  const fetchAndSummarizeCitizenReports = async (areaName, areaCoordinates) => {
  try {
    // Define area boundaries (approximately 2km radius)
    const latRange = 0.018; // ~2km in latitude
    const lngRange = 0.018; // ~2km in longitude
    
    const minLat = areaCoordinates.latitude - latRange;
    const maxLat = areaCoordinates.latitude + latRange;
    const minLng = areaCoordinates.longitude - lngRange;
    const maxLng = areaCoordinates.longitude + lngRange;

    // Fetch reports from Firebase
    const reportsRef = collection(db, 'citizenReports');
    const reportsQuery = query(
      reportsRef,
      where('location.latitude', '>=', minLat),
      where('location.latitude', '<=', maxLat),
      orderBy('location.latitude', 'desc'),
      orderBy('timestamp', 'desc'),
      limit(30) // Reduced limit for batch processing
    );

    const querySnapshot = await getDocs(reportsQuery);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Additional longitude filtering
      if (data.location.longitude >= minLng && data.location.longitude <= maxLng) {
        reports.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        });
      }
    });

    if (reports.length === 0) {
      return null;
    }

    // Group reports by issue type and severity
    const reportsByType = reports.reduce((acc, report) => {
      const type = report.issueType || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(report);
      return acc;
    }, {});

    const reportsBySeverity = reports.reduce((acc, report) => {
      const severity = report.severity || 'medium';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    // For batch processing, we'll use a simpler prompt to reduce API calls
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using flash for faster batch processing
    
    const prompt = `Quickly analyze ${reports.length} citizen reports from ${areaName}:

Types: ${Object.entries(reportsByType).map(([type, reps]) => `${type}(${reps.length})`).join(', ')}
Severities: ${Object.entries(reportsBySeverity).map(([sev, count]) => `${sev}(${count})`).join(', ')}

Return a JSON with:
{
  "summary": "2-sentence summary",
  "keyIssues": [{"issue": "name", "count": n, "severity": "level"}] (top 3),
  "urgentAttentionNeeded": ["item1", "item2"] (max 3),
  "commonComplaints": ["type1", "type2"] (top 3),
  "recommendations": ["action1", "action2"] (2 actions),
  "citizenSentiment": "positive/neutral/concerned/alarmed"
}`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summary = JSON.parse(jsonMatch[0]);
        return {
          ...summary,
          totalReports: reports.length,
          severityBreakdown: reportsBySeverity,
          lastUpdated: new Date()
        };
      }
    } catch (aiError) {
      console.error(`AI summary failed for ${areaName}:`, aiError);
    }

    // Faster fallback summary
    return {
      summary: `${reports.length} reports in last 24 hours. Most issues: ${Object.keys(reportsByType).slice(0, 2).join(', ')}.`,
      keyIssues: Object.entries(reportsByType).slice(0, 3).map(([type, reps]) => ({
        issue: type,
        count: reps.length,
        severity: reps.find(r => r.severity === 'high' || r.severity === 'critical') ? 'high' : 'medium'
      })),
      urgentAttentionNeeded: reports
        .filter(r => r.severity === 'critical' || r.severity === 'high')
        .slice(0, 3)
        .map(r => r.issueType || 'Unknown issue'),
      commonComplaints: Object.keys(reportsByType).slice(0, 3),
      recommendations: ["Review high priority issues", "Deploy response teams"],
      totalReports: reports.length,
      severityBreakdown: reportsBySeverity,
      citizenSentiment: reports.length > 10 ? 'concerned' : 'neutral'
    };

  } catch (error) {
    console.error(`Error fetching reports for ${areaName}:`, error);
    return null;
  }
};



// Add this new function to handle time-based predictions
const analyzeRouteAtTime = async (targetTime) => {
  if (!routes || routes.length === 0 || !destination) {
    Alert.alert('No Route', 'Please select a destination and calculate routes first');
    return;
  }

  setIsAnalyzingTime(true);
  
  try {
    // Get the selected route
    const selectedRoute = routes[selectedRouteIndex];
    
    // Prepare request data
    const requestData = {
      route_summary: selectedRoute.summary || selectedRoute.legs[0].via_waypoint?.map(w => w.location).join(' → '),
      duration: selectedRoute.legs[0].duration,
      distance: selectedRoute.legs[0].distance,
      destination: destination.name,
      origin: {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      },
      selected_time: targetTime.toISOString(),
      current_time: new Date().toISOString(),
      route_coordinates: selectedRoute.coordinates.slice(0, 50), // First 50 points to limit data
      affected_areas: routeRecommendations[selectedRouteIndex]?.affectedAreas || [],
      day_of_week: targetTime.toLocaleDateString('en-US', { weekday: 'long' }),
      is_holiday: false, // You can enhance this with holiday API
      weather_forecast: null // Can be enhanced with weather API
    };

    // Call the time prediction endpoint
    const response = await fetch(`${API_BASE_URL}/predict-route-time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      const predictions = await response.json();
      setTimePredictions(predictions);
      setShowTimePredictionModal(true);
    } else {
      throw new Error('Failed to get predictions');
    }
  } catch (error) {
    console.error('Error analyzing route at time:', error);
    Alert.alert('Error', 'Failed to analyze route for selected time');
  } finally {
    setIsAnalyzingTime(false);
  }
};

// Add this component for the time selector button
const TimeSelector = () => {
  const currentTimeString = selectedTime.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  const isCurrentTime = Math.abs(selectedTime - new Date()) < 60000; // Within 1 minute

  return (
    <View style={styles.timeSelectorContainer}>
      <TouchableOpacity
        style={styles.timeSelectorButton}
        onPress={() => {
          console.log('Time selector pressed'); // Debug log
          setShowTimePicker(true);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#6C63FF', '#4C4C6D']}
          style={styles.timeSelectorGradient}
        >
          <MaterialIcons name="access-time" size={20} color="#FFFFFF" />
          <Text style={styles.timeSelectorText}>
            {isCurrentTime ? 'Present Time' : currentTimeString}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {selectedTime && !isCurrentTime && (
        <TouchableOpacity
          style={styles.analyzeFutureButton}
          onPress={() => analyzeRouteAtTime(selectedTime)}
          disabled={isAnalyzingTime}
        >
          <LinearGradient
            colors={['#FF6B9D', '#FF4757']}
            style={styles.analyzeFutureGradient}
          >
            {isAnalyzingTime ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="crystal-ball" size={20} color="#FFFFFF" />
                <Text style={styles.analyzeFutureText}>Predict at this time</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};


const TimePredictionModal = () => {
  if (!showTimePredictionModal || !timePredictions) return null;

  return (
    <Modal
      visible={showTimePredictionModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTimePredictionModal(false)}
    >
      <View style={styles.predictionModalOverlay}>
        <View style={styles.predictionModalContent}>
          <View style={styles.predictionModalHeader}>
            <View style={styles.predictionModalTitleContainer}>
              <MaterialCommunityIcons name="crystal-ball" size={24} color="#6C63FF" />
              <View style={styles.predictionModalTitleText}>
                <Text style={styles.predictionModalTitle}>Route Prediction</Text>
                <Text style={styles.predictionModalSubtitle}>
                  {selectedTime.toLocaleDateString('en-IN', { weekday: 'long' })}, {selectedTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowTimePredictionModal(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.predictionModalBody}>
            {/* Predicted Duration */}
            <View style={styles.predictionSection}>
              <View style={styles.predictionSectionHeader}>
                <MaterialIcons name="timer" size={20} color="#4C6EF5" />
                <Text style={styles.predictionSectionTitle}>Predicted Travel Time</Text>
              </View>
              <View style={styles.predictionDurationCard}>
                <Text style={styles.predictionDurationValue}>
                  {timePredictions.predicted_duration || 'N/A'}
                </Text>
                <Text style={styles.predictionDurationComparison}>
                  {timePredictions.duration_comparison}
                </Text>
                <View style={styles.confidenceBar}>
                  <View style={[
                    styles.confidenceFill,
                    { width: `${(timePredictions.confidence || 0) * 100}%` }
                  ]} />
                </View>
                <Text style={styles.confidenceText}>
                  {Math.round((timePredictions.confidence || 0) * 100)}% confidence
                </Text>
              </View>
            </View>

            {/* Traffic Conditions */}
            <View style={styles.predictionSection}>
              <View style={styles.predictionSectionHeader}>
                <MaterialIcons name="traffic" size={20} color="#FF6B9D" />
                <Text style={styles.predictionSectionTitle}>Expected Traffic Conditions</Text>
              </View>
              <View style={[
                styles.trafficConditionCard,
                { borderColor: timePredictions.traffic_color || '#FFA502' }
              ]}>
                <Text style={[
                  styles.trafficConditionLevel,
                  { color: timePredictions.traffic_color || '#FFA502' }
                ]}>
                  {timePredictions.traffic_level || 'Moderate'}
                </Text>
                <Text style={styles.trafficConditionDesc}>
                  {timePredictions.traffic_description}
                </Text>
              </View>
            </View>

            {/* Expected Issues */}
            {timePredictions.expected_issues && timePredictions.expected_issues.length > 0 && (
              <View style={styles.predictionSection}>
                <View style={styles.predictionSectionHeader}>
                  <MaterialIcons name="warning" size={20} color="#FFA502" />
                  <Text style={styles.predictionSectionTitle}>Potential Issues</Text>
                </View>
                {timePredictions.expected_issues.map((issue, index) => (
                  <View key={index} style={styles.issueCard}>
                    <MaterialIcons 
                      name={issue.icon || 'info'} 
                      size={18} 
                      color={issue.color || '#FFA502'} 
                    />
                    <View style={styles.issueContent}>
                      <Text style={styles.issueTitle}>{issue.title}</Text>
                      <Text style={styles.issueDescription}>{issue.description}</Text>
                      {issue.probability && (
                        <Text style={styles.issueProbability}>
                          {Math.round(issue.probability * 100)}% likely
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {timePredictions.recommendations && timePredictions.recommendations.length > 0 && (
              <View style={styles.predictionSection}>
                <View style={styles.predictionSectionHeader}>
                  <MaterialIcons name="lightbulb" size={20} color="#4CAF50" />
                  <Text style={styles.predictionSectionTitle}>Recommendations</Text>
                </View>
                {timePredictions.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationCard}>
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Alternative Times */}
            {timePredictions.better_times && timePredictions.better_times.length > 0 && (
              <View style={styles.predictionSection}>
                <View style={styles.predictionSectionHeader}>
                  <MaterialIcons name="schedule" size={20} color="#2ED573" />
                  <Text style={styles.predictionSectionTitle}>Better Travel Times</Text>
                </View>
                <View style={styles.betterTimesContainer}>
                  {timePredictions.better_times.map((time, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.betterTimeChip}
                      onPress={() => {
                        const newTime = new Date(time.time);
                        setSelectedTime(newTime);
                        setShowTimePredictionModal(false);
                        analyzeRouteAtTime(newTime);
                      }}
                    >
                      <Text style={styles.betterTimeText}>{time.display}</Text>
                      <Text style={styles.betterTimeSaving}>{time.time_saved}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Data Sources */}
            <View style={styles.predictionSection}>
              <Text style={styles.dataSources}>
                Analysis based on: {timePredictions.data_sources?.join(', ') || 'Historical patterns, real-time data'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

  const renderBottomSheetContent = () => {
    if (!selectedArea) {
      return (
        <View style={styles.modalEmpty}>
          <MaterialCommunityIcons name="map-marker-question" size={48} color="#666" />
          <Text style={styles.modalEmptyText}>Select an area to view details</Text>
        </View>
      );
    }
    
    const color = selectedArea.color || '#999999';
    
    return (
      <ScrollView 
        style={styles.modalContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchUnifiedData(true)}
            tintColor="#FF6B9D"
          />
        }
      >
        {/* Area Header */}
        <View style={styles.areaHeader}>
          <View style={[styles.areaStatusIcon, { backgroundColor: color + '20' }]}>
            <MaterialCommunityIcons 
              name={selectedArea.icon || 'map-marker'} 
              size={32} 
              color={color} 
            />
          </View>
          <View style={styles.areaHeaderInfo}>
            <Text style={styles.areaName}>{selectedArea.name}</Text>
            <Text style={[styles.areaStatus, { color }]}>{selectedArea.summary}</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => fetchUnifiedData(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={24} color="#666" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Quick Status Cards */}
        {selectedArea.current_status && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusCardsContainer}
          >
            {/* Traffic Card */}
            <TouchableOpacity style={styles.statusCard} activeOpacity={0.8}>
              <LinearGradient
                colors={['#FF6B9D20', '#FF475720']}
                style={styles.statusCardGradient}
              >
                <MaterialCommunityIcons name="car" size={24} color="#FF6B9D" />
                <Text style={styles.statusCardTitle}>Traffic</Text>
                <Text style={styles.statusCardValue}>
                  {selectedArea.current_status?.traffic?.status || 'Normal'}
                </Text>
                {selectedArea.current_status?.traffic?.severity && (
                  <View style={styles.severityBar}>
                    <View style={[
                      styles.severityFill,
                      { 
                        width: `${selectedArea.current_status.traffic.severity * 10}%`,
                        backgroundColor: '#FF6B9D'
                      }
                    ]} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Power Card */}
            <TouchableOpacity style={[styles.statusCard, styles.statusCardSpacing]} activeOpacity={0.8}>
              <LinearGradient
                colors={['#4CAF5020', '#43A04720']}
                style={styles.statusCardGradient}
              >
                <MaterialCommunityIcons name="flash" size={24} color="#4CAF50" />
                <Text style={styles.statusCardTitle}>Power</Text>
                <Text style={styles.statusCardValue}>
                  {selectedArea.current_status?.power?.status || 'Normal'}
                </Text>
                {selectedArea.current_status?.power?.outage_count > 0 && (
                  <Text style={styles.statusCardSubtext}>
                    {selectedArea.current_status.power.outage_count} outages
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {isLoadingReports && (
              <Animated.View style={[
                styles.reportsLoadingIndicator,
                {
                  opacity: fadeAnim,
                }
              ]}>
                <BlurView intensity={70} tint="dark" style={styles.reportsLoadingBlur}>
                  <ActivityIndicator size="small" color="#FF6B9D" />
                  <Text style={styles.reportsLoadingText}>Loading citizen reports...</Text>
                </BlurView>
              </Animated.View>
            )}
            
            {/* Weather Card */}
            <TouchableOpacity style={[styles.statusCard, styles.statusCardSpacing]} activeOpacity={0.8}>
              <LinearGradient
                colors={['#4C6EF520', '#3949AB20']}
                style={styles.statusCardGradient}
              >
                <MaterialCommunityIcons 
                  name={selectedArea.current_status?.weather?.condition === 'Clear' ? 'weather-sunny' : 'weather-cloudy'} 
                  size={24} 
                  color="#4C6EF5" 
                />
                <Text style={styles.statusCardTitle}>Weather</Text>
                <Text style={styles.statusCardValue}>
                  {selectedArea.current_status?.weather?.temperature 
                    ? `${Math.round(selectedArea.current_status.weather.temperature)}°C`
                    : 'N/A'}
                </Text>
                <Text style={styles.statusCardSubtext}>
                  {selectedArea.current_status?.weather?.condition || 'Unknown'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}
        
        {/* Issues Section */}
        {selectedArea.issues && selectedArea.issues.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Issues</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#FF4757' }]}>
                <Text style={styles.sectionBadgeText}>{selectedArea.issues.length}</Text>
              </View>
            </View>
            {selectedArea.issues.map((issue, index) => (
              <TouchableOpacity 
                key={issue.id || index} 
                style={styles.issueCard}
                activeOpacity={0.8}
              >
                <View style={[styles.issueIcon, { backgroundColor: issue.color + '20' }]}>
                  <MaterialCommunityIcons name={issue.icon} size={20} color={issue.color} />
                </View>
                <View style={styles.issueContent}>
                  <Text style={styles.issueTitle}>{issue.title}</Text>
                  <Text style={styles.issueDescription}>{issue.description}</Text>
                  {issue.start_time && (
                    <Text style={styles.issueTime}>Since: {issue.start_time}</Text>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Highlights Section */}
        {selectedArea.highlights && selectedArea.highlights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Area Highlights</Text>
              <MaterialCommunityIcons name="star" size={20} color="#FFA502" />
            </View>
            <View style={styles.highlightsContainer}>
              {selectedArea.highlights.map((highlight, index) => (
                <View key={highlight.id || index} style={[
                  styles.highlightCard,
                  index > 0 && styles.highlightCardSpacing
                ]}>
                  <MaterialCommunityIcons 
                    name={highlight.icon} 
                    size={20} 
                    color={highlight.color} 
                  />
                  <Text style={styles.highlightText}>{highlight.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}


        {/* AI-Powered Citizen Reports Summary */}
{selectedArea.citizen_reports_summary && selectedArea.citizen_reports_summary.totalReports > 0 && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Citizen Reports Analysis</Text>
      <View style={styles.sectionHeaderRight}>
        <MaterialCommunityIcons name="brain" size={20} color="#FF6B9D" />
        <Text style={styles.sectionSubtitle}>AI Summary</Text>
      </View>
    </View>
    
    {/* Summary Card */}
    <View style={styles.aiSummaryCard}>
      <LinearGradient
        colors={['rgba(255, 107, 157, 0.08)', 'rgba(255, 71, 87, 0.05)']}
        style={styles.aiSummaryGradient}
      >
        <View style={styles.aiSummaryHeader}>
          <View style={styles.reportCountBadge}>
            <Text style={styles.reportCountNumber}>
              {selectedArea.citizen_reports_summary.totalReports}
            </Text>
            <Text style={styles.reportCountLabel}>Reports</Text>
          </View>
          <View style={styles.summaryTimeframe}>
            <MaterialIcons name="access-time" size={14} color="#999" />
            <Text style={styles.summaryTimeframeText}>Last 24 hours</Text>
          </View>
        </View>
        
        <Text style={styles.aiSummaryText}>
          {selectedArea.citizen_reports_summary.summary}
        </Text>
        
        {/* Severity Breakdown */}
        {selectedArea.citizen_reports_summary.severityBreakdown && (
          <View style={styles.severityBreakdown}>
            <Text style={styles.severityTitle}>Severity Distribution</Text>
            <View style={styles.severityBars}>
              {Object.entries(selectedArea.citizen_reports_summary.severityBreakdown)
                .filter(([severity, count]) => count > 0)
                .map(([severity, count]) => (
                <View key={severity} style={styles.severityItem}>
                  <View style={[
                    styles.severityIndicator,
                    { 
                      backgroundColor: 
                        severity === 'critical' ? '#D32F2F' :
                        severity === 'high' ? '#FF4757' :
                        severity === 'medium' ? '#FFA502' :
                        '#4CAF50'
                    }
                  ]} />
                  <Text style={styles.severityLabel}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Text>
                  <Text style={styles.severityCount}>{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
    
    {/* Key Issues */}
    {selectedArea.citizen_reports_summary.keyIssues && 
     selectedArea.citizen_reports_summary.keyIssues.length > 0 && (
      <View style={styles.keyIssuesContainer}>
        <Text style={styles.keyIssuesTitle}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#FF6B9D" />
          {' '}Key Issues Identified
        </Text>
        {selectedArea.citizen_reports_summary.keyIssues.map((issue, index) => (
          <View key={index} style={styles.keyIssueCard}>
            <View style={styles.keyIssueHeader}>
              <Text style={styles.keyIssueTitle}>{issue.issue}</Text>
              <View style={[
                styles.keyIssueSeverityBadge,
                { 
                  backgroundColor: 
                    issue.severity === 'critical' ? '#D32F2F' :
                    issue.severity === 'high' ? '#FF4757' :
                    issue.severity === 'medium' ? '#FFA502' :
                    '#4CAF50'
                }
              ]}>
                <Text style={styles.keyIssueSeverityText}>{issue.severity}</Text>
              </View>
            </View>
            <View style={styles.keyIssueStats}>
              <Text style={styles.keyIssueCount}>
                <Text style={styles.keyIssueCountNumber}>{issue.count}</Text> reports
              </Text>
              {issue.trend && (
                <View style={styles.keyIssueTrend}>
                  <MaterialCommunityIcons 
                    name={
                      issue.trend === 'increasing' ? 'trending-up' :
                      issue.trend === 'decreasing' ? 'trending-down' :
                      'trending-neutral'
                    } 
                    size={16} 
                    color={
                      issue.trend === 'increasing' ? '#FF4757' :
                      issue.trend === 'decreasing' ? '#4CAF50' :
                      '#FFA502'
                    } 
                  />
                  <Text style={[
                    styles.keyIssueTrendText,
                    { 
                      color: 
                        issue.trend === 'increasing' ? '#FF4757' :
                        issue.trend === 'decreasing' ? '#4CAF50' :
                        '#FFA502'
                    }
                  ]}>
                    {issue.trend}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    )}
    
    {/* Urgent Attention Items */}
    {selectedArea.citizen_reports_summary.urgentAttentionNeeded && 
     selectedArea.citizen_reports_summary.urgentAttentionNeeded.length > 0 && (
      <View style={styles.urgentAttentionContainer}>
        <View style={styles.urgentAttentionHeader}>
          <MaterialIcons name="priority-high" size={20} color="#D32F2F" />
          <Text style={styles.urgentAttentionTitle}>Requires Immediate Attention</Text>
        </View>
        {selectedArea.citizen_reports_summary.urgentAttentionNeeded.map((item, index) => (
          <View key={index} style={styles.urgentAttentionItem}>
            <View style={styles.urgentAttentionBullet} />
            <Text style={styles.urgentAttentionText}>{item}</Text>
          </View>
        ))}
      </View>
    )}
    
    {/* Common Complaints */}
    {selectedArea.citizen_reports_summary.commonComplaints && 
     selectedArea.citizen_reports_summary.commonComplaints.length > 0 && (
      <View style={styles.commonComplaintsContainer}>
        <Text style={styles.commonComplaintsTitle}>Most Common Complaints</Text>
        <View style={styles.commonComplaintsList}>
          {selectedArea.citizen_reports_summary.commonComplaints.slice(0, 5).map((complaint, index) => (
            <View key={index} style={styles.commonComplaintChip}>
              <Text style={styles.commonComplaintText}>
                {complaint}
              </Text>
            </View>
          ))}
        </View>
      </View>
    )}
    
    {/* AI Recommendations */}
    {selectedArea.citizen_reports_summary.recommendations && 
     selectedArea.citizen_reports_summary.recommendations.length > 0 && (
      <View style={styles.aiRecommendationsContainer}>
        <View style={styles.aiRecommendationsHeader}>
          <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#4C6EF5" />
          <Text style={styles.aiRecommendationsTitle}>AI Recommendations</Text>
        </View>
        {selectedArea.citizen_reports_summary.recommendations.map((rec, index) => (
          <View key={index} style={styles.aiRecommendationItem}>
            <Text style={styles.aiRecommendationNumber}>{index + 1}</Text>
            <Text style={styles.aiRecommendationText}>{rec}</Text>
          </View>
        ))}
      </View>
    )}
    
    {/* Citizen Sentiment */}
    {selectedArea.citizen_reports_summary.citizenSentiment && (
      <View style={styles.citizenSentimentContainer}>
        <Text style={styles.citizenSentimentLabel}>Overall Citizen Sentiment</Text>
        <View style={[
          styles.citizenSentimentBadge,
          {
            backgroundColor: 
              selectedArea.citizen_reports_summary.citizenSentiment === 'alarmed' ? 'rgba(211, 47, 47, 0.1)' :
              selectedArea.citizen_reports_summary.citizenSentiment === 'concerned' ? 'rgba(255, 165, 2, 0.1)' :
              selectedArea.citizen_reports_summary.citizenSentiment === 'neutral' ? 'rgba(153, 153, 153, 0.1)' :
              'rgba(76, 175, 80, 0.1)'
          }
        ]}>
          <MaterialCommunityIcons 
            name={
              selectedArea.citizen_reports_summary.citizenSentiment === 'alarmed' ? 'emoticon-angry' :
              selectedArea.citizen_reports_summary.citizenSentiment === 'concerned' ? 'emoticon-confused' :
              selectedArea.citizen_reports_summary.citizenSentiment === 'neutral' ? 'emoticon-neutral' :
              'emoticon-happy'
            } 
            size={24} 
            color={
              selectedArea.citizen_reports_summary.citizenSentiment === 'alarmed' ? '#D32F2F' :
              selectedArea.citizen_reports_summary.citizenSentiment === 'concerned' ? '#FFA502' :
              selectedArea.citizen_reports_summary.citizenSentiment === 'neutral' ? '#999' :
              '#4CAF50'
            } 
          />
          <Text style={[
            styles.citizenSentimentText,
            {
              color: 
                selectedArea.citizen_reports_summary.citizenSentiment === 'alarmed' ? '#D32F2F' :
                selectedArea.citizen_reports_summary.citizenSentiment === 'concerned' ? '#FFA502' :
                selectedArea.citizen_reports_summary.citizenSentiment === 'neutral' ? '#999' :
                '#4CAF50'
            }
          ]}>
            {selectedArea.citizen_reports_summary.citizenSentiment.toUpperCase()}
          </Text>
        </View>
      </View>
    )}
  </View>
)}
        
        {/* Citizen Reports */}
        {selectedArea.citizen_reports && selectedArea.citizen_reports.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Reports</Text>
              <Text style={styles.sectionSubtitle}>from citizens</Text>
            </View>
            {selectedArea.citizen_reports.slice(0, 3).map((report, index) => (
              <View key={report.id || index} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={[styles.reportCategory, { 
                    backgroundColor: report.category === 'traffic' ? '#FF6B9D20' : '#4CAF5020' 
                  }]}>
                    <Text style={styles.reportCategoryText}>{report.category}</Text>
                  </View>
                  <Text style={styles.reportTime}>
                    {new Date(report.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.reportDescription} numberOfLines={2}>
                  {report.description}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Recommendations */}
        {selectedArea.recommendations && selectedArea.recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Smart Recommendations</Text>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#FFA502" />
            </View>
            {selectedArea.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationCard}>
                <MaterialCommunityIcons name="lightbulb" size={16} color="#FFA502" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Predictions Notice */}
        {selectedArea.predictions_available && !selectedArea.predictions && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.predictionsButton}
              onPress={() => {
                Alert.alert('Predictions', 'Predictions would be loaded on demand to save resources');
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="crystal-ball" size={20} color="#4C6EF5" />
              <Text style={styles.predictionsButtonText}>Load Traffic & Power Predictions</Text>
              <MaterialIcons name="chevron-right" size={20} color="#4C6EF5" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF6B9D', '#FF4757']}
              style={styles.actionButtonGradient}
            >
              <MaterialIcons name="report" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Report Issue</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonSpacing]} activeOpacity={0.8}>
            <LinearGradient
              colors={['#4C6EF5', '#3949AB']}
              style={styles.actionButtonGradient}
            >
              <MaterialIcons name="notifications" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Get Alerts</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderNavigationSheet = () => {
    if (routeRecommendations.length === 0) {
      return (
        <View style={styles.navigationModalEmpty}>
          <ActivityIndicator size="large" color="#4C6EF5" />
          <Text style={styles.navigationModalEmptyText}>Calculating best routes...</Text>
        </View>
      );
    }
    
    return (
      <ScrollView style={styles.navigationModalContent} showsVerticalScrollIndicator={false}>
        <View style={styles.navigationHeader}>
          <View>
            <Text style={styles.navigationTitle}>Routes to {destination?.name}</Text>
            <Text style={styles.navigationSubtitle}>
              {routeRecommendations.length} routes found
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowNavigationModal(false)}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        {/* Pothole Summary for All Routes */}
        {(() => {
          const totalPotholes = routeRecommendations.reduce((sum, rec) => sum + rec.potholeCount, 0);
          const totalSevere = routeRecommendations.reduce((sum, rec) => sum + rec.severePotholes, 0);
          
          if (totalPotholes > 0) {
            return (
              <View style={styles.navigationPotholeSummary}>
                <MaterialCommunityIcons name="road-variant" size={20} color="#FF6B6B" />
                <View style={styles.navigationPotholeSummaryText}>
                  <Text style={styles.navigationPotholeSummaryTitle}>
                    Road Condition Alert
                  </Text>
                  <Text style={styles.navigationPotholeSummarySubtitle}>
                    {totalPotholes} potholes detected across all routes
                    {totalSevere > 0 && ` (${totalSevere} severe)`}
                  </Text>
                </View>
              </View>
            );
          }
          return null;
        })()}
        
        {routeRecommendations.map((rec, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.routeCard,
              selectedRouteIndex === rec.routeIndex && styles.routeCardSelected
            ]}
            onPress={() => selectRoute(rec.routeIndex)}
            activeOpacity={0.8}
          >
            <View style={styles.routeCardHeader}>
              <View style={[styles.routeIndicator, { backgroundColor: rec.color }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeDuration}>{rec.duration.text}</Text>
                <Text style={styles.routeDistance}>{rec.distance.text}</Text>
              </View>
              {index === 0 && rec.potholeCount < 3 && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              )}
              {rec.potholeCount >= 5 && (
                <View style={styles.routeBadgeWarning}>
                  <MaterialIcons name="warning" size={16} color="#FFFFFF" />
                  <Text style={styles.routeBadgeWarningText}>Poor Road</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.routeRecommendation}>{rec.recommendation}</Text>
            
            {/* Enhanced Pothole Information */}
            {rec.potholeCount > 0 && (
              <View style={styles.potholeInfo}>
                <View style={styles.potholeHeader}>
                  <MaterialCommunityIcons name="road-variant" size={18} color="#FF6B6B" />
                  <Text style={styles.potholeTitle}>
                    Road Conditions: {rec.potholeCount} pothole{rec.potholeCount > 1 ? 's' : ''} detected
                  </Text>
                </View>
                
                {/* Visual pothole indicator bar */}
                <View style={styles.potholeIndicatorBar}>
                  <View style={[
                    styles.potholeIndicatorFill,
                    { 
                      width: `${Math.min((rec.potholeCount / 10) * 100, 100)}%`,
                      backgroundColor: rec.potholeCount >= 7 ? '#D32F2F' : 
                                     rec.potholeCount >= 4 ? '#FF6B6B' : '#FFA502'
                    }
                  ]} />
                </View>
                
                {/* Pothole breakdown by severity */}
                <View style={styles.potholeSeverityBreakdown}>
                  {routePotholes[rec.routeIndex] && (() => {
                    const severityCounts = routePotholes[rec.routeIndex].reduce((acc, p) => {
                      acc[p.category] = (acc[p.category] || 0) + 1;
                      return acc;
                    }, {});
                    
                    return Object.entries(severityCounts)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([category, count]) => (
                      <View key={category} style={styles.potholeSeverityItem}>
                        <View style={[
                          styles.potholeSeverityDot,
                          { backgroundColor: POTHOLE_CATEGORY_COLORS[category] }
                        ]} />
                        <Text style={styles.potholeSeverityText}>
                          {count} {getPotholeSeverity(parseInt(category))}
                        </Text>
                      </View>
                    ));
                  })()}
                </View>
                
                {rec.severePotholes > 0 && (
                  <View style={styles.potholeSevereWarning}>
                    <MaterialIcons name="warning" size={16} color="#D32F2F" />
                    <Text style={styles.potholeSevereText}>
                      {rec.severePotholes} severe pothole{rec.severePotholes > 1 ? 's' : ''} - Drive with extreme caution
                    </Text>
                  </View>
                )}
                
                {/* Driving recommendation based on potholes */}
                <View style={styles.potholeRecommendation}>
                  <MaterialCommunityIcons 
                    name="car-info" 
                    size={14} 
                    color="#4C6EF5" 
                  />
                  <Text style={styles.potholeRecommendationText}>
                    {rec.potholeCount >= 7 ? 'Consider alternative transport or drive very slowly' :
                     rec.potholeCount >= 4 ? 'Reduce speed and stay alert' :
                     'Minor road imperfections, normal driving with caution'}
                  </Text>
                </View>
              </View>
            )}
            
            {rec.affectedAreas.length > 0 && (
              <View style={styles.routeAreas}>
                <Text style={styles.routeAreasTitle}>Via:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {rec.affectedAreas.map((area, areaIndex) => (
                    <TouchableOpacity
                      key={areaIndex}
                      style={[
                        styles.routeAreaChip,
                        { 
                          backgroundColor: area.color ? area.color + '20' : 
                            area.status === 'critical' ? '#FF475720' :
                            area.status === 'warning' ? '#FFA50220' :
                            '#2ED57320'
                        }
                      ]}
                      onPress={() => {
                        // Show area details
                        const areaData = unifiedData.areas[area.name];
                        if (areaData) {
                          setSelectedArea({
                            ...areaData,
                            ...areaData.details,
                            timestamp: unifiedData.timestamp
                          });
                          setModalPosition('right');
                          setShowAreaModal(true);
                        }
                      }}
                    >
                      <View style={styles.routeAreaChipContent}>
                        <Text style={[styles.routeAreaText, { color: area.color || '#FFFFFF' }]}>
                          {area.name}
                        </Text>
                        {area.issueCount > 0 && (
                          <View style={[styles.routeAreaIssueBadge, { backgroundColor: area.color || '#FF4757' }]}>
                            <Text style={styles.routeAreaIssueText}>{area.issueCount}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {rec.issues.length > 0 && (
              <View style={styles.routeIssues}>
                <View style={styles.routeWarning}>
                  <MaterialIcons name="warning" size={16} color="#FFA502" />
                  <Text style={styles.routeWarningText}>
                    {rec.issues.length} issue{rec.issues.length > 1 ? 's' : ''} on this route:
                  </Text>
                </View>
                {rec.issues.slice(0, 2).map((issue, issueIndex) => (
                  <View key={issueIndex} style={styles.routeIssueItem}>
                    <MaterialCommunityIcons 
                      name={issue.icon || 'alert-circle'} 
                      size={14} 
                      color={issue.color || '#FF4757'} 
                    />
                    <Text style={styles.routeIssueText} numberOfLines={1}>
                      {issue.area}: {issue.title || issue.description}
                    </Text>
                  </View>
                ))}
                {rec.issues.length > 2 && (
                  <Text style={styles.routeMoreIssues}>
                    +{rec.issues.length - 2} more issues
                  </Text>
                )}
              </View>
            )}
            
            {rec.specificConcerns && rec.specificConcerns.length > 0 && (
              <View style={styles.routeConcerns}>
                {rec.specificConcerns.slice(0, 2).map((concern, index) => (
                  <Text key={index} style={styles.routeConcernText}>
                    • {concern}
                  </Text>
                ))}
              </View>
            )}
            
            {rec.alternativeTimeSlots && rec.alternativeTimeSlots.length > 0 && (
              <View style={styles.routeAlternativeTimes}>
                <Text style={styles.routeAlternativeLabel}>Better times:</Text>
                <Text style={styles.routeAlternativeText}>
                  {rec.alternativeTimeSlots.join(', ')}
                </Text>
              </View>
            )}
            
            <Text style={styles.routeReason}>{rec.alternativeReason}</Text>
          </TouchableOpacity>
        ))}
        
        <View style={styles.navigationActions}>
          <TouchableOpacity
            style={styles.startNavigationButton}
            onPress={() => {
              Alert.alert(
                'Start Navigation',
                `Navigate via Route ${selectedRouteIndex + 1}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Start', onPress: () => console.log('Start navigation') }
                ]
              );
            }}
          >
            <LinearGradient
              colors={['#4C6EF5', '#3949AB']}
              style={styles.startNavigationGradient}
            >
              <MaterialIcons name="navigation" size={24} color="#FFFFFF" />
              <Text style={styles.startNavigationText}>Start Navigation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
        <Text style={styles.loadingText}>Initializing CityPulse...</Text>
      </View>
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
        customMapStyle={showMoodMap ? moodMapStyle : luxuryDarkMapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => {
          console.log('Map is ready');
          setMapReady(true);
        }}
        onPress={() => {
          // Close modals when tapping on map
          if (showAreaModal) setShowAreaModal(false);
          if (showNavigationModal) setShowNavigationModal(false);
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
        
        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            tracksViewChanges={false}
          >
            <View style={styles.destinationMarker}>
              <MaterialIcons name="location-on" size={40} color="#FF4757" />
            </View>
          </Marker>
        )}
        
        {/* Routes */}
        {routes.map((route, index) => (
          <Polyline
            key={index}
            coordinates={route.coordinates}
            strokeColor={route.color}
            strokeWidth={index === selectedRouteIndex ? 6 : 4}
            zIndex={index === selectedRouteIndex ? 1000 : 100}
          />
        ))}
        
        {/* Pothole Markers - Only show for selected route */}
        {navigationMode && routePotholes[selectedRouteIndex] && routePotholes[selectedRouteIndex]
          .filter(pothole => pothole.category === 3) // Only show category 3 (Severe) potholes
          .map((pothole, index) => (
            <Marker
              key={`pothole-${selectedRouteIndex}-${index}`}
              coordinate={{
                latitude: pothole.lat,
                longitude: pothole.long,
              }}
              onPress={() => handlePotholePress(pothole)}
              tracksViewChanges={false}
            >
              <View style={styles.potholeMarker}>
                <View style={[
                  styles.potholeMarkerInner,
                  { backgroundColor: POTHOLE_CATEGORY_COLORS[pothole.category] }
                ]}>
                  <MaterialCommunityIcons 
                    name="road-variant" 
                    size={16} 
                    color="#FFFFFF" 
                  />
                </View>
              </View>
            </Marker>
          ))}

        {showMoodMap && moodData && (
          <MoodHeatmapOverlay moodData={moodData} />
        )}
        
        {/* Area Markers - Always visible */}
        {Object.entries(unifiedData.areas).map(([areaName, areaData]) => {
          console.log(`Map rendering marker for: ${areaName}`); // Debug log
          return renderAreaMarker(areaName, areaData);
        })}
      </MapView>
      
      {/* Destination Search Bar */}
      <Animated.View style={[
        styles.destinationBar,
        {
          transform: [{ translateY: destinationBarAnim }]
        }
      ]}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.destinationGradient}
        >
          <View style={styles.destinationContent}>
            <TouchableOpacity 
              onPress={() => {
                // If using React Navigation, use navigation.goBack()
                // Otherwise, you can handle back navigation differently
                // navigation.goBack()
                console.log('Back button pressed');
              }} 
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.destinationInputContainer}>
              <MaterialIcons name="search" size={20} color="#666" />
              <TextInput
                style={styles.destinationInput}
                placeholder="Where to?"
                placeholderTextColor="#666"
                value={destinationInput}
                onChangeText={(text) => {
                  setDestinationInput(text);
                  searchDestination(text);
                }}
                onFocus={() => setShowSearchModal(true)}
              />
              {destinationInput.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setDestinationInput('');
                    clearNavigation();
                  }}
                >
                  <MaterialIcons name="close" size={20} color="#666" />
                </TouchableOpacity>
              )}

              
            </View>


            


            
            
            {navigationMode && (
              <TouchableOpacity onPress={clearNavigation} style={styles.clearButton}>
                <MaterialIcons name="clear" size={24} color="#FF4757" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      {navigationMode && routes.length > 0 && (
              <TimeSelector />
      )}

      <MoodMapToggle />


      {showMoodMap && moodData && (
        <Animated.View 
          style={[
            styles.moodMapOverlay,
            { opacity: moodMapOpacity }
          ]}
          pointerEvents="none"
        >
          <MoodHeatmapOverlay moodData={moodData} />
        </Animated.View>
      )}

      {/* Mood Area Markers */}


      {!navigationMode && showNotificationButton && location && (
        <TouchableOpacity 
          style={[
            styles.notificationButton,
            isSubscribed && styles.notificationButtonSubscribed
          ]}
          onPress={subscribeToLocationNotifications}
          onLongPress={() => {
            if (subscribedLocations.length > 0) {
              setShowSubscriptionsModal(true);
            }
          }}
          delayLongPress={500}
          activeOpacity={0.8}
          disabled={isSubscribing}
        >
          <LinearGradient
            colors={isSubscribed ? ['#2ED573', '#27AE60'] : ['#9C27B0', '#7B1FA2']}
            style={styles.notificationButtonGradient}
          >
            {isSubscribing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons 
                  name={isSubscribed ? "notifications-active" : "notifications"} 
                  size={24} 
                  color="#FFFFFF" 
                />
                <Text style={styles.notificationButtonText}>
                  {isSubscribed ? 'Subscribed' : 'Get Alerts'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}
      

      
      {/* Weather Widget */}
      {unifiedData.weather && unifiedData.weather.current && !navigationMode && (
        <Animated.View style={[
          styles.weatherWidget,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <BlurView intensity={70} tint="dark" style={styles.weatherBlur}>
            <MaterialCommunityIcons 
              name={unifiedData.weather.current.weather === 'Clear' ? 'weather-sunny' : 'weather-cloudy'} 
              size={24} 
              color="#FFA500" 
            />
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherTemp}>
                {Math.round(unifiedData.weather.current.temperature || 0)}°C
              </Text>
              <Text style={styles.weatherDesc}>
                {unifiedData.weather.current.description || 'Unknown'}
              </Text>
            </View>
          </BlurView>
        </Animated.View>
      )}
      
      {/* Pothole Legend - Show when in navigation mode with potholes */}
      {/* {navigationMode && routePotholes[selectedRouteIndex] && routePotholes[selectedRouteIndex].length > 0 && (
        <View style={styles.potholeLegend}>
          <Text style={styles.potholeLegendTitle}>Pothole Severity</Text>
          <View style={styles.potholeLegendItems}>
            <View style={styles.potholeLegendItem}>
              <View style={[styles.potholeLegendDot, { backgroundColor: POTHOLE_CATEGORY_COLORS[0] }]} />
              <Text style={styles.potholeLegendText}>Minor</Text>
            </View>
            <View style={styles.potholeLegendItem}>
              <View style={[styles.potholeLegendDot, { backgroundColor: POTHOLE_CATEGORY_COLORS[1] }]} />
              <Text style={styles.potholeLegendText}>Moderate</Text>
            </View>
            <View style={styles.potholeLegendItem}>
              <View style={[styles.potholeLegendDot, { backgroundColor: POTHOLE_CATEGORY_COLORS[2] }]} />
              <Text style={styles.potholeLegendText}>Major</Text>
            </View>
            <View style={styles.potholeLegendItem}>
              <View style={[styles.potholeLegendDot, { backgroundColor: POTHOLE_CATEGORY_COLORS[3] }]} />
              <Text style={styles.potholeLegendText}>Severe</Text>
            </View>
          </View>
        </View>
      )} */}
      
      {/* Quick Stats */}
      {!navigationMode && (
        <View style={styles.quickStats}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.quickStatsGradient}
          >
            <TouchableOpacity style={styles.statItem} activeOpacity={0.8}>
              <View style={[styles.statDot, { backgroundColor: '#2ED573' }]} />
              <Text style={styles.statCount}>
                {Object.values(unifiedData.areas).filter(a => a.status === 'good').length}
              </Text>
              <Text style={styles.statLabel}>Good</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
              <View style={[styles.statDot, { backgroundColor: '#FFA502' }]} />
              <Text style={styles.statCount}>
                {Object.values(unifiedData.areas).filter(a => a.status === 'warning').length}
              </Text>
              <Text style={styles.statLabel}>Warning</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.statItem, styles.statItemSpacing]} activeOpacity={0.8}>
              <View style={[styles.statDot, { backgroundColor: '#FF4757' }]} />
              <Text style={styles.statCount}>
                {Object.values(unifiedData.areas).filter(a => a.status === 'critical').length}
              </Text>
              <Text style={styles.statLabel}>Critical</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
      
      {/* Refresh Button */}
      {!navigationMode && (
        <TouchableOpacity 
          style={[
            styles.floatingRefreshButton,
            // Adjust position if navigation modal can be shown
            navigationMode && { bottom: 110 }
          ]}
          
          onPress={() => fetchUnifiedData(true)}
          activeOpacity={0.8}
          disabled={refreshing}
        >
          <LinearGradient
            colors={['#FF6B9D', '#FF4757']}
            style={styles.floatingButtonGradient}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}
      
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


      {navigationMode && routes.length > 0 && !showNavigationModal && (
        <TouchableOpacity 
          style={styles.showNavigationButton}
          onPress={() => setShowNavigationModal(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4C6EF5', '#3949AB']}
            style={styles.showNavigationButtonGradient}
          >
            <MaterialIcons name="directions" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      {/* Modal Position Toggle */}
      {(showAreaModal || showNavigationModal) && (
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
            colors={['#6C63FF', '#4C4C6D']}
            style={styles.modalPositionGradient}
          >
            <MaterialCommunityIcons name="window-restore" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      {/* Area Details Modal */}
      <LuxuryModal
        visible={showAreaModal && !navigationMode}
        onClose={() => setShowAreaModal(false)}
        title={selectedArea?.name || 'Area Details'}
        position={modalPosition}
        animationType="slide"
        blurBackground={true}
      >
        {renderBottomSheetContent()}
      </LuxuryModal>
      
      {/* Navigation Modal */}
      <LuxuryModal
        visible={showNavigationModal && navigationMode}
        onClose={() => setShowNavigationModal(false)}
        title="Navigation Options"
        position={modalPosition}
        animationType="scale"
        blurBackground={true}
      >
        {renderNavigationSheet()}
      </LuxuryModal>
      
      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSearchModal(false)}
        >
          <View style={styles.searchModal}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Search Destination</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => selectDestination(item.place_id, item.description)}
                >
                  <MaterialIcons name="location-on" size={20} color="#666" />
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultMain}>
                      {item.structured_formatting.main_text}
                    </Text>
                    <Text style={styles.searchResultSecondary}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.searchEmpty}>
                  <Text style={styles.searchEmptyText}>
                    {destinationInput.length < 3 
                      ? 'Type at least 3 characters to search'
                      : 'No results found'}
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Pothole Details Modal */}
      {renderPotholeModal()}



      {showTimePicker && (
        <CustomTimePicker
          visible={showTimePicker}
          onClose={() => {
            console.log('Closing time picker'); // Debug log
            setShowTimePicker(false);
          }}
          onSelectTime={(time) => {
            console.log('Time selected:', time); // Debug log
            setSelectedTime(time);
            setShowTimePicker(false);
          }}
          currentTime={selectedTime}
        />
      )}

      {/* Add the prediction modal */}
      <TimePredictionModal />


      <MoodDetailModal />


      <Modal
        visible={showSubscriptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowSubscriptionsModal(false);
          setShowNotificationDemo(false);
          setDummyNotifications([]);
        }}
      >
        <View style={styles.subscriptionsModalOverlay}>
          <View style={styles.subscriptionsModalContent}>
            <View style={styles.subscriptionsModalHeader}>
              <Text style={styles.subscriptionsModalTitle}>
                {showNotificationDemo ? '🎉 Successfully Subscribed!' : 'Notification Subscriptions'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowSubscriptionsModal(false);
                  setShowNotificationDemo(false);
                  setDummyNotifications([]);
                }}
                style={styles.subscriptionsModalClose}
              >
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.subscriptionsModalBody}>
              {/* Notification Demo Section */}
              {showNotificationDemo && (
                <View style={styles.notificationDemoSection}>
                  <View style={styles.notificationDemoHeader}>
                    <MaterialCommunityIcons name="bell-ring" size={24} color="#6C63FF" />
                    <Text style={styles.notificationDemoTitle}>Notifications for Madavara</Text>
                  </View>
                  <Text style={styles.notificationDemoSubtitle}>
                    Here's what you can expect to receive:
                  </Text>
                  
                  {/* Dummy Notifications */}
                  <View style={styles.dummyNotificationsContainer}>
                    {dummyNotifications.length === 0 ? (
                      <View style={styles.waitingForNotifications}>
                        <ActivityIndicator size="small" color="#6C63FF" />
                        <Text style={styles.waitingText}>Preparing notifications...</Text>
                      </View>
                    ) : (
                      dummyNotifications.map((notification, index) => (
                        <NotificationCard 
                          key={notification.id} 
                          notification={notification} 
                          index={index}
                        />
                      ))
                    )}
                  </View>
                  
                  <View style={styles.notificationInfoBox}>
                    <MaterialIcons name="info" size={20} color="#6C63FF" />
                    <Text style={styles.notificationInfoText}>
                      You'll receive real-time alerts like these for your subscribed areas
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Subscriptions List */}
              {!showNotificationDemo && (
                <>
                  {subscribedLocations.length === 0 ? (
                    <View style={styles.subscriptionsEmptyState}>
                      <MaterialIcons name="notifications-off" size={48} color="#666" />
                      <Text style={styles.subscriptionsEmptyText}>
                        No active subscriptions
                      </Text>
                      <Text style={styles.subscriptionsEmptySubtext}>
                        Subscribe to areas to receive notifications about traffic, power, and emergencies
                      </Text>
                    </View>
                  ) : (
                    subscribedLocations.map((area, index) => (
                      <View key={index} style={styles.subscriptionItem}>
                        <View style={styles.subscriptionInfo}>
                          <MaterialIcons name="location-on" size={20} color="#6C63FF" />
                          <Text style={styles.subscriptionAreaName}>{area}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => unsubscribeFromLocation(area)}
                          style={styles.unsubscribeButton}
                        >
                          <Text style={styles.unsubscribeButtonText}>Unsubscribe</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
            
            <View style={styles.subscriptionsModalFooter}>
              {showNotificationDemo ? (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => {
                    setShowSubscriptionsModal(false);
                    setShowNotificationDemo(false);
                    setDummyNotifications([]);
                  }}
                >
                  <LinearGradient
                    colors={['#6C63FF', '#4C4C6D']}
                    style={styles.doneButtonGradient}
                  >
                    <Text style={styles.doneButtonText}>Got it!</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <Text style={styles.subscriptionsNote}>
                  You'll receive alerts for traffic updates, power outages, emergencies, and weather warnings
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>



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
  
  // Destination Bar - Enhanced
  destinationBar: {
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
  destinationGradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  destinationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destinationInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  destinationInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  
  // Search Modal - Enhanced
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  searchModal: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftColor: 'rgba(255, 255, 255, 0.05)',
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  searchResultText: {
    flex: 1,
    marginLeft: 14,
  },
  searchResultMain: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  searchResultSecondary: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  searchEmpty: {
    padding: 60,
    alignItems: 'center',
  },
  searchEmptyText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Navigation Modal
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  navigationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navigationSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  navigationPotholeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.15)',
  },
  navigationPotholeSummaryText: {
    flex: 1,
    marginLeft: 12,
  },
  navigationPotholeSummaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 2,
  },
  navigationPotholeSummarySubtitle: {
    fontSize: 13,
    color: '#CCCCCC',
  },
  
  // Route Cards - Enhanced Styling
  routeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  routeCardSelected: {
    borderColor: '#4C6EF5',
    borderWidth: 2,
    backgroundColor: 'rgba(76, 110, 245, 0.08)',
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeIndicator: {
    width: 6,
    height: 45,
    borderRadius: 3,
    marginRight: 16,
  },
  routeInfo: {
    flex: 1,
  },
  routeDuration: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  routeDistance: {
    fontSize: 15,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  recommendedBadge: {
    backgroundColor: '#2ED573',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  routeBadgeWarning: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeBadgeWarningText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  routeRecommendation: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    fontWeight: '600',
    lineHeight: 22,
  },
  routeAreas: {
    marginBottom: 12,
  },
  routeAreasTitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
    fontWeight: '600',
  },
  routeAreaChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  routeAreaChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeAreaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  routeAreaIssueBadge: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeAreaIssueText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  routeIssues: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
  },
  routeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeWarningText: {
    fontSize: 13,
    color: '#FFA502',
    marginLeft: 8,
    fontWeight: '600',
  },
  routeIssueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginLeft: 24,
  },
  routeIssueText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginLeft: 8,
    flex: 1,
  },
  routeMoreIssues: {
    fontSize: 12,
    color: '#999',
    marginLeft: 24,
    marginTop: 4,
    fontStyle: 'italic',
  },
  routeConcerns: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 165, 2, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 2, 0.15)',
  },
  routeConcernText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 4,
  },
  routeAlternativeTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(76, 110, 245, 0.08)',
    borderRadius: 12,
    padding: 12,
  },
  routeAlternativeLabel: {
    fontSize: 13,
    color: '#4C6EF5',
    fontWeight: '600',
    marginRight: 8,
  },
  routeAlternativeText: {
    fontSize: 13,
    color: '#AAAAAA',
    flex: 1,
  },
  routeReason: {
    fontSize: 13,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  
  // Navigation Actions
  navigationActions: {
    padding: 20,
  },
  startNavigationButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startNavigationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  startNavigationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Markers
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Weather Widget - Enhanced
  weatherWidget: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 20,
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
  weatherBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
  },
  weatherInfo: {
    marginLeft: 10,
  },
  weatherTemp: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  weatherDesc: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  
  // Quick Stats - Enhanced
  quickStats: {
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
  quickStatsGradient: {
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
    backgroundColor: '#FF6B9D',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B9D',
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
  
  // Area Markers - Enhanced
  areaMarkerContainer: {
    alignItems: 'center',
  },
  areaMarkerOuter: {
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
  areaMarkerInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  areaBadge: {
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
  areaBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  areaLabelContainer: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  areaLabelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Floating Buttons - Enhanced
  floatingRefreshButton: {
    position: 'absolute',
    bottom: 250,
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
  navigationModalEmpty: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  navigationModalEmptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  navigationModalContent: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  
  // Area Details
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  areaStatusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  areaHeaderInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  areaStatus: {
    fontSize: 16,
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  
  // Status Cards
  statusCardsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statusCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusCardSpacing: {
    marginLeft: 12,
  },
  statusCardGradient: {
    padding: 16,
    alignItems: 'center',
    width: 120,
  },
  statusCardTitle: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
  },
  statusCardValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  statusCardSubtext: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },
  severityBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 8,
  },
  severityFill: {
    height: '100%',
    borderRadius: 2,
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
  sectionSubtitle: {
    color: '#666',
    fontSize: 12,
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
  
  // Issue Cards
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  issueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  issueDescription: {
    color: '#999',
    fontSize: 12,
  },
  issueTime: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  
  // Highlights
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  highlightCardSpacing: {
    marginLeft: 8,
    marginTop: 8,
  },
  highlightText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 6,
  },
  
  // Reports
  reportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportCategory: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reportCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  reportTime: {
    color: '#666',
    fontSize: 11,
  },
  reportDescription: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Recommendations
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 165, 2, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recommendationText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    marginLeft: 12,
  },
  
  // Predictions Button
  predictionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 110, 245, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 110, 245, 0.3)',
  },
  predictionsButtonText: {
    flex: 1,
    color: '#4C6EF5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
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

  // Modal Position Toggle
  modalPositionToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
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
  modalPositionGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add this to your styles object at the bottom
  showNavigationButton: {
    position: 'absolute',
    bottom: 180,
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
  showNavigationButtonGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Pothole Styles
  potholeMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  potholeMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  potholeInfo: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  potholeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  potholeTitle: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
    fontWeight: '600',
  },
  potholeSeverityBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 8,
  },
  potholeSeverityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  potholeSeverityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  potholeSeverityText: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  potholeSevereWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  potholeSevereText: {
    fontSize: 13,
    color: '#D32F2F',
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
  },
  potholeIndicatorBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  potholeIndicatorFill: {
    height: '100%',
    borderRadius: 3,
    // transition: 'width 0.3s ease',
  },
  potholeRecommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  potholeRecommendationText: {
    fontSize: 12,
    color: '#AAAAAA',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  
  // Pothole Modal Styles
  potholeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  potholeModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  potholeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  potholeModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  potholeSeverityIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  potholeModalTextContainer: {
    flex: 1,
  },
  potholeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  potholeModalSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  potholeImageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#0a0a15',
  },
  potholeImage: {
    width: '100%',
    height: '100%',
  },
  potholeDetailsContainer: {
    padding: 20,
  },
  potholeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  potholeDetailText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginLeft: 12,
    flex: 1,
  },
  potholeReportButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  potholeReportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  potholeReportText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Pothole Legend Styles
  potholeLegend: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 200 : 180,
    left: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 16,
    padding: 12,
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
  potholeLegendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  potholeLegendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  potholeLegendItem: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  potholeLegendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  potholeLegendText: {
    fontSize: 10,
    color: '#AAAAAA',
    fontWeight: '500',
  },

  // AI Summary Styles
aiSummaryCard: {
  borderRadius: 16,
  overflow: 'hidden',
  marginBottom: 16,
},
aiSummaryGradient: {
  padding: 16,
  borderWidth: 1,
  borderColor: 'rgba(255, 107, 157, 0.2)',
  borderRadius: 16,
},
aiSummaryHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
reportCountBadge: {
  alignItems: 'center',
  backgroundColor: 'rgba(255, 107, 157, 0.1)',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
},
reportCountNumber: {
  fontSize: 24,
  fontWeight: '700',
  color: '#FF6B9D',
},
reportCountLabel: {
  fontSize: 11,
  color: '#FF6B9D',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
summaryTimeframe: {
  flexDirection: 'row',
  alignItems: 'center',
},
summaryTimeframeText: {
  fontSize: 12,
  color: '#999',
  marginLeft: 4,
},
aiSummaryText: {
  fontSize: 15,
  color: '#FFFFFF',
  lineHeight: 22,
  marginBottom: 16,
},
severityBreakdown: {
  marginTop: 12,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: 'rgba(255, 255, 255, 0.1)',
},
severityTitle: {
  fontSize: 13,
  fontWeight: '600',
  color: '#AAAAAA',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
severityBars: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
severityItem: {
  alignItems: 'center',
  flex: 1,
},
severityIndicator: {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginBottom: 4,
},
severityLabel: {
  fontSize: 11,
  color: '#999',
  marginBottom: 2,
},
severityCount: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
},
keyIssuesContainer: {
  marginBottom: 16,
},
keyIssuesTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FFFFFF',
  marginBottom: 12,
  flexDirection: 'row',
  alignItems: 'center',
},
keyIssueCard: {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.08)',
},
keyIssueHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
keyIssueTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FFFFFF',
  flex: 1,
},
keyIssueSeverityBadge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  marginLeft: 8,
},
keyIssueSeverityText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#FFFFFF',
  textTransform: 'uppercase',
},
keyIssueStats: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
keyIssueCount: {
  fontSize: 13,
  color: '#AAAAAA',
},
keyIssueCountNumber: {
  fontWeight: '600',
  color: '#FFFFFF',
},
keyIssueTrend: {
  flexDirection: 'row',
  alignItems: 'center',
},
keyIssueTrendText: {
  fontSize: 12,
  fontWeight: '500',
  marginLeft: 4,
  textTransform: 'capitalize',
},
urgentAttentionContainer: {
  backgroundColor: 'rgba(211, 47, 47, 0.08)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: 'rgba(211, 47, 47, 0.2)',
},
urgentAttentionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},
urgentAttentionTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#D32F2F',
  marginLeft: 8,
},
urgentAttentionItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 6,
  paddingLeft: 8,
},
urgentAttentionBullet: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: '#D32F2F',
  marginTop: 6,
  marginRight: 10,
},
urgentAttentionText: {
  fontSize: 13,
  color: '#FFFFFF',
  flex: 1,
  lineHeight: 18,
},
commonComplaintsContainer: {
  marginBottom: 16,
},
commonComplaintsTitle: {
  fontSize: 13,
  fontWeight: '600',
  color: '#AAAAAA',
  marginBottom: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
commonComplaintsList: {
  flexDirection: 'row',
  flexWrap: 'wrap',
},
commonComplaintChip: {
  backgroundColor: 'rgba(255, 107, 157, 0.1)',
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 6,
  marginRight: 8,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: 'rgba(255, 107, 157, 0.2)',
},
commonComplaintText: {
  fontSize: 12,
  color: '#FF6B9D',
  fontWeight: '500',
},
aiRecommendationsContainer: {
  backgroundColor: 'rgba(76, 110, 245, 0.05)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: 'rgba(76, 110, 245, 0.15)',
},
aiRecommendationsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},
aiRecommendationsTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#4C6EF5',
  marginLeft: 8,
},
aiRecommendationItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 8,
},
aiRecommendationNumber: {
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: 'rgba(76, 110, 245, 0.2)',
  color: '#4C6EF5',
  fontSize: 12,
  fontWeight: '600',
  textAlign: 'center',
  lineHeight: 20,
  marginRight: 10,
},
aiRecommendationText: {
  fontSize: 13,
  color: '#FFFFFF',
  flex: 1,
  lineHeight: 18,
},
citizenSentimentContainer: {
  alignItems: 'center',
  marginTop: 12,
  paddingTop: 16,
  borderTopWidth: 1,
  borderTopColor: 'rgba(255, 255, 255, 0.1)',
},
citizenSentimentLabel: {
  fontSize: 12,
  color: '#AAAAAA',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
citizenSentimentBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
},
citizenSentimentText: {
  fontSize: 14,
  fontWeight: '600',
  marginLeft: 8,
  letterSpacing: 0.5,
},
sectionHeaderRight: {
  flexDirection: 'row',
  alignItems: 'center',
},

reportsLoadingIndicator: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 200 : 180,
  right: 20,
  borderRadius: 20,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
},
reportsLoadingBlur: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  backgroundColor: 'rgba(26, 26, 46, 0.9)',
},
reportsLoadingText: {
  color: '#FF6B9D',
  fontSize: 12,
  marginLeft: 8,
  fontWeight: '500',
},


timeSelectorButton: {
  borderRadius: 20,
  overflow: 'hidden',
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
        zIndex: 9999,

  }),
},
timeSelectorGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
},
timeSelectorText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
  marginHorizontal: 8,
},
analyzeFutureButton: {
  // marginTop: 10,
  borderRadius: 20,
  overflow: 'hidden',
  zIndex: 9999
},
analyzeFutureGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
},
analyzeFutureText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
  marginLeft: 8,
},

// Prediction Modal Styles
predictionModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
predictionModalContent: {
  backgroundColor: '#1a1a2e',
  borderRadius: 28,
  width: '100%',
  maxWidth: 400,
  maxHeight: '85%',
  overflow: 'hidden',
},
predictionModalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
},
predictionModalTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
predictionModalTitleText: {
  marginLeft: 12,
},
predictionModalTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#FFFFFF',
},
predictionModalSubtitle: {
  fontSize: 14,
  color: '#AAAAAA',
  marginTop: 2,
},
predictionModalBody: {
  padding: 20,
},
predictionSection: {
  marginBottom: 24,
},
predictionSectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},
predictionSectionTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
  marginLeft: 8,
},
predictionDurationCard: {
  backgroundColor: 'rgba(76, 110, 245, 0.1)',
  borderRadius: 16,
  padding: 20,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(76, 110, 245, 0.2)',
},
predictionDurationValue: {
  fontSize: 32,
  fontWeight: '700',
  color: '#4C6EF5',
  marginBottom: 8,
},
predictionDurationComparison: {
  fontSize: 14,
  color: '#AAAAAA',
  marginBottom: 12,
},
confidenceBar: {
  width: '100%',
  height: 6,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 3,
  marginBottom: 8,
  overflow: 'hidden',
},
confidenceFill: {
  height: '100%',
  backgroundColor: '#4C6EF5',
  borderRadius: 3,
},
confidenceText: {
  fontSize: 12,
  color: '#AAAAAA',
},
trafficConditionCard: {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 16,
  padding: 16,
  borderWidth: 2,
},
trafficConditionLevel: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 8,
  textTransform: 'uppercase',
},
trafficConditionDesc: {
  fontSize: 14,
  color: '#CCCCCC',
  lineHeight: 20,
},
issueCard: {
  flexDirection: 'row',
  backgroundColor: 'rgba(255, 165, 2, 0.08)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: 'rgba(255, 165, 2, 0.15)',
},
issueContent: {
  flex: 1,
  marginLeft: 12,
},
issueTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FFFFFF',
  marginBottom: 4,
},
issueDescription: {
  fontSize: 13,
  color: '#AAAAAA',
  lineHeight: 18,
},
issueProbability: {
  fontSize: 12,
  color: '#FFA502',
  marginTop: 4,
  fontWeight: '500',
},
recommendationCard: {
  backgroundColor: 'rgba(76, 175, 80, 0.1)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: 'rgba(76, 175, 80, 0.2)',
},
recommendationText: {
  fontSize: 14,
  color: '#FFFFFF',
  lineHeight: 20,
},
betterTimesContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
},
betterTimeChip: {
  backgroundColor: 'rgba(46, 213, 115, 0.1)',
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 8,
  marginRight: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: 'rgba(46, 213, 115, 0.2)',
},
betterTimeText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#2ED573',
},
betterTimeSaving: {
  fontSize: 12,
  color: '#AAAAAA',
  marginTop: 2,
},
dataSources: {
  fontSize: 12,
  color: '#666',
  fontStyle: 'italic',
  textAlign: 'center',
},

// Time Picker Styles
timePickerOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  justifyContent: 'flex-end',
},
timePickerContent: {
  backgroundColor: '#16213e',
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  borderWidth: 1,
  borderTopColor: 'rgba(255, 255, 255, 0.1)',
  borderLeftColor: 'rgba(255, 255, 255, 0.05)',
  borderRightColor: 'rgba(255, 255, 255, 0.05)',
},
timePickerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 24,
  paddingTop: 20,
  paddingBottom: 16,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255, 255, 255, 0.08)',
},
timePickerTitle: {
  fontSize: 22,
  fontWeight: '700',
  color: '#FFFFFF',
  letterSpacing: 0.5,
},
closeButton: {
  padding: 8,
  borderRadius: 20,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
},
quickTimeSection: {
  paddingTop: 20,
  paddingBottom: 10,
},
quickTimeLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#AAAAAA',
  marginLeft: 24,
  marginBottom: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
quickTimeScroll: {
  paddingHorizontal: 24,
},
quickTimeButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(108, 99, 255, 0.1)',
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 10,
  marginRight: 12,
  borderWidth: 1,
  borderColor: 'rgba(108, 99, 255, 0.2)',
},
quickTimeText: {
  color: '#6C63FF',
  fontSize: 14,
  fontWeight: '600',
  marginLeft: 4,
},
timeDisplayContainer: {
  alignItems: 'center',
  paddingVertical: 20,
},
timeDisplay: {
  fontSize: 48,
  fontWeight: '700',
  color: '#FFFFFF',
  letterSpacing: 2,
},
timeWheelsContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 24,
  height: 200,
},
timeWheel: {
  flex: 1,
  alignItems: 'center',
},
wheelLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#AAAAAA',
  marginBottom: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
wheelScroll: {
  height: 150,
},
wheelContent: {
  paddingVertical: 60,
},
wheelItem: {
  paddingVertical: 12,
  paddingHorizontal: 24,
  marginVertical: 2,
  borderRadius: 12,
},
wheelItemSelected: {
  backgroundColor: 'rgba(108, 99, 255, 0.2)',
},
wheelItemText: {
  fontSize: 20,
  fontWeight: '500',
  color: '#666666',
},
wheelItemTextSelected: {
  fontSize: 24,
  fontWeight: '700',
  color: '#6C63FF',
},
colonSeparator: {
  fontSize: 32,
  fontWeight: '700',
  color: '#6C63FF',
  marginHorizontal: 10,
  marginBottom: 30,
},
periodSelector: {
  alignItems: 'center',
  marginLeft: 20,
},
periodButton: {
  paddingVertical: 12,
  paddingHorizontal: 24,
  marginVertical: 4,
  borderRadius: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  minWidth: 60,
  alignItems: 'center',
},
periodButtonSelected: {
  backgroundColor: 'rgba(108, 99, 255, 0.2)',
},
periodText: {
  fontSize: 18,
  fontWeight: '600',
  color: '#666666',
},
periodTextSelected: {
  color: '#6C63FF',
  fontWeight: '700',
},
timePickerActions: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingHorizontal: 24,
  paddingTop: 30,
  paddingBottom: 20,
},
cancelButton: {
  flex: 1,
  paddingVertical: 16,
  marginRight: 10,
  borderRadius: 16,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  alignItems: 'center',
},
cancelButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#AAAAAA',
},
confirmButton: {
  flex: 1,
  marginLeft: 10,
  borderRadius: 16,
  overflow: 'hidden',
},
confirmButtonGradient: {
  paddingVertical: 16,
  alignItems: 'center',
},
confirmButtonText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#FFFFFF',
},
timeSelectorContainer: {
  position: 'absolute',
  // display: 'flex',
  marginTop: -50,
  marginLeft: 20,
  top: Platform.OS === 'ios' ? 180 : 160,
  // right: 20,
  // alignItems: 'flex-end',
  flexDirection: 'row', // Arrange children horizontally
  justifyContent: 'space-around', // Distribute space evenly
  alignItems: 'center',
},
timeSelectorButton: {
  borderRadius: 20,
  overflow: 'hidden',
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
  marginRight: 20
},
timeSelectorGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 12, // Increased padding
  minWidth: 150, // Ensure minimum width
},
timeSelectorText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
  marginHorizontal: 8,
},


// Mood Map Styles
moodMapToggle: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 200 : 180,
  left: 20,
  borderRadius: 25,
  overflow: 'hidden',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    android: {
      elevation: 8,
    },
  }),
},
moodMapToggleGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 12,
},
moodMapToggleText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
  marginLeft: 10,
  letterSpacing: 0.5,
},
moodMapOverlay: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 1,
},
moodMarkerContainer: {
  alignItems: 'center',
  width: 100,
  height: 100,
},
moodMarkerGlow: {
  position: 'absolute',
  width: 100,
  height: 100,
  borderRadius: 50,
  ...Platform.select({
    ios: {
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
    },
    android: {
      elevation: 20,
    },
  }),
},
moodMarkerInner: {
  width: 80,
  height: 80,
  borderRadius: 40,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 3,
  borderColor: '#FFFFFF',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    android: {
      elevation: 10,
    },
  }),
},
moodScore: {
  fontSize: 18,
  fontWeight: '900',
  color: '#FFFFFF',
  marginTop: 4,
},
moodAreaLabel: {
  position: 'absolute',
  bottom: -35,
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.2)',
},
moodAreaLabelText: {
  fontSize: 14,
  fontWeight: '700',
  color: '#FFFFFF',
  textAlign: 'center',
  letterSpacing: 0.5,
},
moodSentiment: {
  fontSize: 12,
  fontWeight: '600',
  color: '#FFFFFF',
  opacity: 0.9,
  textAlign: 'center',
  marginTop: 2,
},

// Mood Detail Modal Styles
moodModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
moodModalContent: {
  backgroundColor: '#1a1a2e',
  borderRadius: 30,
  width: '100%',
  maxWidth: 400,
  maxHeight: '90%',
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
    },
    android: {
      elevation: 25,
    },
  }),
},
moodModalHeader: {
  paddingTop: 30,
  paddingBottom: 20,
  paddingHorizontal: 20,
},
moodModalHeaderContent: {
  flexDirection: 'row',
  alignItems: 'center',
},
moodModalHeaderText: {
  marginLeft: 16,
  flex: 1,
},
moodModalTitle: {
  fontSize: 28,
  fontWeight: '800',
  color: '#FFFFFF',
  letterSpacing: 0.5,
},
moodModalSubtitle: {
  fontSize: 16,
  color: '#FFFFFF',
  opacity: 0.9,
  marginTop: 4,
},
moodModalClose: {
  position: 'absolute',
  top: 20,
  right: 20,
  padding: 8,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderRadius: 20,
},
moodModalBody: {
  padding: 20,
},
sentimentOverview: {
  alignItems: 'center',
  marginBottom: 30,
},
sentimentTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#AAAAAA',
  marginBottom: 12,
  textTransform: 'uppercase',
  letterSpacing: 1,
},
sentimentBadge: {
  borderRadius: 30,
  overflow: 'hidden',
},
sentimentBadgeGradient: {
  paddingHorizontal: 32,
  paddingVertical: 16,
},
sentimentText: {
  fontSize: 24,
  fontWeight: '800',
  letterSpacing: 2,
},
sectionHeaderWithIcon: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#FFFFFF',
  marginLeft: 12,
},
aiAnalysisSection: {
  marginBottom: 30,
},
aiAnalysisText: {
  fontSize: 15,
  color: '#CCCCCC',
  lineHeight: 24,
  backgroundColor: 'rgba(255, 107, 157, 0.05)',
  padding: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255, 107, 157, 0.1)',
},
keyFactorsSection: {
  marginBottom: 30,
},
factorCard: {
  flexDirection: 'row',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.05)',
},
factorIcon: {
  width: 44,
  height: 44,
  borderRadius: 22,
  justifyContent: 'center',
  alignItems: 'center',
},
factorContent: {
  flex: 1,
  marginLeft: 16,
},
factorTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#FFFFFF',
  marginBottom: 4,
},
factorDescription: {
  fontSize: 14,
  color: '#AAAAAA',
  lineHeight: 20,
  marginBottom: 8,
},
factorImpact: {
  flexDirection: 'row',
  alignItems: 'center',
},
factorImpactLabel: {
  fontSize: 12,
  color: '#999',
  marginRight: 8,
},
impactBar: {
  flex: 1,
  height: 6,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 3,
  overflow: 'hidden',
},
impactFill: {
  height: '100%',
  borderRadius: 3,
},
citizenSentimentSection: {
  marginBottom: 30,
},
sentimentBreakdown: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: 20,
  padding: 20,
},
sentimentItem: {
  alignItems: 'center',
},
sentimentPercentage: {
  fontSize: 20,
  fontWeight: '700',
  color: '#FFFFFF',
  marginTop: 8,
  marginBottom: 4,
},
sentimentLabel: {
  fontSize: 13,
  color: '#AAAAAA',
  fontWeight: '600',
},
timeTrendsSection: {
  marginBottom: 30,
},
trendChart: {
  flexDirection: 'row',
  height: 120,
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: 16,
  padding: 16,
  alignItems: 'flex-end',
  justifyContent: 'space-between',
},
trendPoint: {
  flex: 1,
  alignItems: 'center',
  marginHorizontal: 2,
},
trendBar: {
  width: '80%',
  borderRadius: 4,
  marginBottom: 8,
},
trendTime: {
  fontSize: 10,
  color: '#666',
  transform: [{ rotate: '-45deg' }],
},
recommendationsSection: {
  marginBottom: 30,
},
recommendationCard: {
  marginBottom: 12,
  borderRadius: 16,
  overflow: 'hidden',
},
recommendationGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 16,
  borderWidth: 1,
  borderColor: 'rgba(76, 175, 80, 0.2)',
  borderRadius: 16,
},
recommendationText: {
  flex: 1,
  fontSize: 14,
  color: '#FFFFFF',
  marginLeft: 12,
  lineHeight: 20,
},
dataSourcesSection: {
  marginTop: 20,
  paddingTop: 20,
  borderTopWidth: 1,
  borderTopColor: 'rgba(255, 255, 255, 0.1)',
},
dataSourcesTitle: {
  fontSize: 12,
  color: '#666',
  marginBottom: 8,
},
dataSourcesList: {
  flexDirection: 'row',
  flexWrap: 'wrap',
},
dataSourceChip: {
  backgroundColor: 'rgba(108, 99, 255, 0.1)',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 6,
  marginRight: 8,
  marginBottom: 8,
},
dataSourceText: {
  fontSize: 12,
  color: '#6C63FF',
  fontWeight: '600',
},


moodMapToggle: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 200 : 180,
  left: 20,
  borderRadius: 30,
  overflow: 'visible', // Changed to visible for glow effect
},
moodMapToggleWrapper: {
  borderRadius: 30,
  overflow: 'hidden',
  ...Platform.select({
    ios: {
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 15,
    },
    android: {
      elevation: 12,
    },
  }),
},
moodMapToggleGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 14,
  minWidth: 180,
},
moodMapToggleContent: {
  marginLeft: 10,
},
moodMapToggleText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
  letterSpacing: 0.5,
},
cityMoodScore: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '600',
  opacity: 0.9,
  marginTop: 2,
},

// Mood Legend Styles
moodLegend: {
  position: 'absolute',
  bottom: Platform.OS === 'ios' ? 50 : 30,
  left: 20,
  right: 20,
  borderRadius: 20,
  overflow: 'hidden',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    android: {
      elevation: 8,
    },
  }),
},
moodLegendBlur: {
  padding: 16,
  backgroundColor: 'rgba(26, 26, 46, 0.9)',
},
moodLegendTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#FFFFFF',
  marginBottom: 12,
  textAlign: 'center',
  letterSpacing: 0.5,
},
moodLegendContent: {
  // gap: 10,
},
moodLegendRow: {
  flexDirection: 'row',
  alignItems: 'center',
  // gap: 12,
},
moodLegendCircle: {
  backgroundColor: '#6C63FF20',
  borderRadius: 50,
  borderWidth: 1,
  borderColor: '#6C63FF40',
},
moodLegendConcentricDemo: {
  width: 30,
  height: 30,
  justifyContent: 'center',
  alignItems: 'center',
},
moodLegendText: {
  fontSize: 13,
  color: '#CCCCCC',
  flex: 1,
},

sentimentBar: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  opacity: 0.1,
  zIndex: -1,
},


notificationButton: {
  position: 'absolute',
  bottom: 390,
  right: 20,
  borderRadius: 30,
  overflow: 'hidden',
  ...Platform.select({
    ios: {
      shadowColor: '#9C27B0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
},
notificationButtonSubscribed: {
  ...Platform.select({
    ios: {
      shadowColor: '#2ED573',
    },
  }),
},
notificationButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 12,
  minWidth: 130,
  justifyContent: 'center',
},
notificationButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '700',
  marginLeft: 8,
  letterSpacing: 0.5,
},

// Subscriptions Modal Styles
subscriptionsModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  justifyContent: 'flex-end',
},
subscriptionsModalContent: {
  backgroundColor: '#1a1a2e',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  maxHeight: '70%',
  paddingBottom: Platform.OS === 'ios' ? 30 : 20,
},
subscriptionsModalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 24,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
},
subscriptionsModalTitle: {
  fontSize: 22,
  fontWeight: '700',
  color: '#FFFFFF',
  letterSpacing: 0.5,
},
subscriptionsModalClose: {
  padding: 8,
},
subscriptionsModalBody: {
  padding: 20,
},
subscriptionsEmptyState: {
  alignItems: 'center',
  paddingVertical: 60,
},
subscriptionsEmptyText: {
  fontSize: 18,
  fontWeight: '600',
  color: '#FFFFFF',
  marginTop: 16,
},
subscriptionsEmptySubtext: {
  fontSize: 14,
  color: '#AAAAAA',
  marginTop: 8,
  textAlign: 'center',
  paddingHorizontal: 20,
  lineHeight: 20,
},
subscriptionItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
},
subscriptionInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
subscriptionAreaName: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
  marginLeft: 12,
},
unsubscribeButton: {
  backgroundColor: 'rgba(255, 71, 87, 0.2)',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 71, 87, 0.3)',
},
unsubscribeButtonText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#FF4757',
},
subscriptionsModalFooter: {
  padding: 20,
  borderTopWidth: 1,
  borderTopColor: 'rgba(255, 255, 255, 0.1)',
},
subscriptionsNote: {
  fontSize: 12,
  color: '#AAAAAA',
  textAlign: 'center',
  lineHeight: 18,
},


notificationDemoSection: {
  marginBottom: 20,
},
notificationDemoHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
notificationDemoTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#FFFFFF',
  marginLeft: 10,
},
notificationDemoSubtitle: {
  fontSize: 14,
  color: '#AAAAAA',
  marginBottom: 20,
  marginLeft: 34,
},
dummyNotificationsContainer: {
  marginBottom: 20,
},
waitingForNotifications: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
  backgroundColor: 'rgba(108, 99, 255, 0.1)',
  borderRadius: 16,
  marginBottom: 20,
},
waitingText: {
  fontSize: 14,
  color: '#6C63FF',
  marginLeft: 12,
  fontWeight: '600',
},
notificationCard: {
  flexDirection: 'row',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
  }),
},
notificationIconContainer: {
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 16,
},
notificationContent: {
  flex: 1,
},
notificationHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4,
},
notificationTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#FFFFFF',
  flex: 1,
},
notificationTime: {
  fontSize: 12,
  color: '#AAAAAA',
  marginLeft: 8,
},
notificationBody: {
  fontSize: 14,
  color: '#CCCCCC',
  lineHeight: 20,
},
notificationInfoBox: {
  flexDirection: 'row',
  backgroundColor: 'rgba(108, 99, 255, 0.1)',
  borderRadius: 12,
  padding: 16,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(108, 99, 255, 0.2)',
},
notificationInfoText: {
  fontSize: 13,
  color: '#FFFFFF',
  marginLeft: 12,
  flex: 1,
  lineHeight: 18,
},
doneButton: {
  borderRadius: 16,
  overflow: 'hidden',
  width: '100%',
},
doneButtonGradient: {
  paddingVertical: 16,
  alignItems: 'center',
},
doneButtonText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#FFFFFF',
  letterSpacing: 0.5,
},
});