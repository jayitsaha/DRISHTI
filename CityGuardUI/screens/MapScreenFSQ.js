import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  Linking
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// --- Enhanced Foursquare API Configuration ---
const FSQ_API_KEY = '4LA4LWEFYKNMDAJMZQEDTM1X2P4F1TDJVPKG5KGDLTXWKHXS';
const FSQ_BASE_URL = 'https://places-api.foursquare.com';
const FSQ_API_VERSION = '2025-06-17';

const CivicFoursquareExplorer = () => {
  // --- Enhanced State Management ---
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('civic');
  const [mapRegion, setMapRegion] = useState(null);
  const mapRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Data states
  const [civicPlaces, setCivicPlaces] = useState([]);
  const [emergencyServices, setEmergencyServices] = useState([]);
  const [publicServices, setPublicServices] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentCityName, setCurrentCityName] = useState('Detecting...');
  
  // Place details
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState(null);
  const [selectedPlacePhotos, setSelectedPlacePhotos] = useState([]);
  
  // Report states
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLocation, setReportLocation] = useState(null);
  
  // Filter states
  const radii = [1000, 2000, 5000, 10000, 20000];
  const [radiusIndex, setRadiusIndex] = useState(2);

  // --- Civic Categories for Society Betterment ---
  const civicCategories = [
    { id: '12000', name: 'Government', icon: 'business-outline', color: '#dc2626' },
    { id: '12001', name: 'City Hall', icon: 'library-outline', color: '#ea580c' },
    { id: '12002', name: 'Courthouse', icon: 'library-outline', color: '#d97706' },
    { id: '12003', name: 'Embassy/Consulate', icon: 'flag-outline', color: '#ca8a04' },
    { id: '12004', name: 'Fire Station', icon: 'flame-outline', color: '#dc2626' },
    { id: '12005', name: 'Police Station', icon: 'shield-outline', color: '#2563eb' },
    { id: '12006', name: 'Post Office', icon: 'mail-outline', color: '#7c3aed' },
    { id: '12007', name: 'Prison', icon: 'lock-closed-outline', color: '#6b7280' },
    { id: '15000', name: 'Healthcare', icon: 'medical-outline', color: '#059669' },
    { id: '15001', name: 'Hospital', icon: 'medical-outline', color: '#dc2626' },
    { id: '15002', name: 'Clinic', icon: 'fitness-outline', color: '#059669' },
    { id: '15003', name: 'Dentist', icon: 'happy-outline', color: '#0891b2' },
    { id: '15004', name: 'Pharmacy', icon: 'medical-outline', color: '#7c2d12' },
    { id: '13000', name: 'Education', icon: 'school-outline', color: '#0369a1' },
    { id: '13001', name: 'School', icon: 'school-outline', color: '#0369a1' },
    { id: '13002', name: 'College/University', icon: 'library-outline', color: '#1e40af' },
    { id: '13003', name: 'Library', icon: 'library-outline', color: '#6366f1' }
  ];

  // Report types for civic engagement
  const reportTypes = [
    { id: 'pothole', name: 'Road Issue', icon: 'car-outline', color: '#dc2626' },
    { id: 'lighting', name: 'Street Light', icon: 'bulb-outline', color: '#f59e0b' },
    { id: 'waste', name: 'Waste Management', icon: 'trash-outline', color: '#059669' },
    { id: 'safety', name: 'Safety Concern', icon: 'shield-outline', color: '#dc2626' },
    { id: 'accessibility', name: 'Accessibility', icon: 'accessibility-outline', color: '#7c3aed' },
    { id: 'noise', name: 'Noise Complaint', icon: 'volume-high-outline', color: '#ea580c' },
    { id: 'vandalism', name: 'Vandalism', icon: 'warning-outline', color: '#dc2626' },
    { id: 'suggestion', name: 'Improvement Idea', icon: 'bulb-outline', color: '#059669' }
  ];

  // --- Animation Effects ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true })
    ]).start();
  }, []);

  // --- Initialization ---
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await getCurrentLocation();
    setLoading(false);
  };

  // --- Enhanced Location Handler ---
  const getCurrentLocation = async () => {
    setLoading(true);
    
    try {
      if (!Location?.requestForegroundPermissionsAsync) {
        await useDefaultLocation();
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        await useDefaultLocation();
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setUserLocation(coords);
      setCurrentCityName('Current Location');
      setMapRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 });

      console.log("getCurrentLocation OK")
      
      // Fetch civic places for current location
      await fetchCivicServices(coords);
      
    } catch (error) {
      console.warn("Location Error:", error.message);
      Alert.alert(
        "Location Access", 
        "Using default location. You can manually select a city from the location button.",
        [{ text: "OK", onPress: () => useDefaultLocation() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const useDefaultLocation = async () => {
    const defaultCoords = { latitude: 28.6139, longitude: 77.2090 }; // Delhi
    setUserLocation(defaultCoords);
    setCurrentCityName('Delhi');
    setMapRegion({ ...defaultCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 });
    await fetchCivicServices(defaultCoords);
  };

  // --- Enhanced API Methods ---
  const fetchFSQ = async (endpoint, params = {}) => {
    setLoading(true);
    try {
      let url = `${FSQ_BASE_URL}${endpoint}`

      console.log("URL")
      console.log(url)

      // url+= `query=sobha&`
      url += `?ll=${userLocation.latitude},${userLocation.longitude}`

      console.log(params)

      


      console.log("FINAL URL")
      console.log(url)
      
      const response = await fetch(url, {
        headers: {
          'authorization': `Bearer ${FSQ_API_KEY}`,
          'Accept': 'application/json',
          'X-Places-Api-Version': FSQ_API_VERSION,
        },
        method: 'GET',
      });


      console.log(response)
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Fetch error for ${endpoint}:`, error);
      Alert.alert('Connection Error', 'Please check your internet connection and try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };


  const fetchFSQCivic = async (endpoint, params, coords) => {
    setLoading(true);
    try {
      let url = `${FSQ_BASE_URL}${endpoint}`

      console.log("URL")
      console.log(url)

      // url+= `query=sobha&`
      url += `?ll=${coords.latitude},${coords.longitude}&fsq_category_ids=${params.categories}&radius=${params.radius}`

      console.log("FINAL URL")
      console.log(url)
      
      const response = await fetch(url, {
        headers: {
          'authorization': `Bearer ${FSQ_API_KEY}`,
          'Accept': 'application/json',
          'X-Places-Api-Version': FSQ_API_VERSION,
        },
        method: 'GET',
      });

      console.log(response)
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Deduplicate based on name field
      if (data && data.results && Array.isArray(data.results)) {
        const seen = new Set();
        data.results = data.results.filter(item => {
          if (item.name && !seen.has(item.name)) {
            seen.add(item.name);
            return true;
          }
          return false;
        });
      }
      
      return data;
    } catch (error) {
      console.error(`Fetch error for ${endpoint}:`, error);
      Alert.alert('Connection Error', 'Please check your internet connection and try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };


  const fetchFSQAuto = async (endpoint, params = {}) => {
    setLoading(true);
    try {
      let url = `${FSQ_BASE_URL}${endpoint}`

      console.log("URL")
      console.log(url)

      // url+= `query=sobha&`
      

      console.log(params)

      if (params.query){

        url +=`?query=${params.query}`
        url += `&ll=${userLocation.latitude},${userLocation.longitude}`

        
      }

      else{

        url += `?ll=${userLocation.latitude},${userLocation.longitude}`

        
      }

      if(params.limit){
        url +=`&limit=${params.limit}`
      }

      if(params.sort){
        url +=`&sort=${params.sort}`
      }

      if(params.radius){
        url +=`&radius=${params.radius}`
      }

      if(params.fields){

        url +=`&fields=${params.fields}`
        
      }


      

      
      // // Add location if available and not already specified
      // if (userLocation && !params.ll && !params.near) {
      //   params.ll = `${userLocation.latitude},${userLocation.longitude}`;
      // }
      
      // Convert params object to URLSearchParams
      // const searchParams = new URLSearchParams();
      // Object.entries(params).forEach(([key, value]) => {
      //   if (value !== undefined && value !== null) {
      //     searchParams.set(key, value.toString());
      //   }
      // });

      // console.log("Search Param String")
      // console.log(searchParams.toString())
      
      // url.search = searchParams.toString();


      console.log("FINAL URL")
      console.log(url)
      
      const response = await fetch(url, {
        headers: {
          'authorization': `Bearer ${FSQ_API_KEY}`,
          'Accept': 'application/json',
          'X-Places-Api-Version': FSQ_API_VERSION,
        },
        method: 'GET',
      });


      console.log(response)
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Fetch error for ${endpoint}:`, error);
      Alert.alert('Connection Error', 'Please check your internet connection and try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // --- Civic-Focused API Methods ---
  const fetchCivicServices = async (coords) => {
    if (!coords) return;
    
    const civicData = await fetchFSQCivic('/places/search', {
      categories: '4bf58dd8d48988d163941735,4bf58dd8d48988d129941735,52f2ab2ebcbc57f1066b8b4f,4f04afc02fb6e1c99f3db0bc', // Government, City Hall, Fire, Police
      radius: radii[radiusIndex],
      limit: 20,
      sort: 'DISTANCE',
      fields: 'fsq_place_id,name,location,geocodes,categories,rating,distance,photos,tel,website,hours'
    }, coords);
    
    const emergencyData = await fetchFSQCivic('/places/search', {
      categories: '4bf58dd8d48988d12c941735,4bf58dd8d48988d12e941735,4bf58dd8d48988d196941735', // Fire Station, Police, Hospital
      radius: radii[radiusIndex],
      limit: 15,
      sort: 'DISTANCE',
      fields: 'fsq_place_id,name,location,geocodes,categories,distance,tel'
    }, coords);
    
    const publicData = await fetchFSQCivic('/places/search', {
      categories: '4bf58dd8d48988d172941735,52e81612bcbc57f1066b7a46,4bf58dd8d48988d12f941735,4bf58dd8d48988d10f951735', // Post Office, School, Library, Pharmacy
      radius: radii[radiusIndex],
      limit: 25,
      sort: 'DISTANCE',
      fields: 'fsq_place_id,name,location,geocodes,categories,rating,distance,photos'
    }, coords);
    
    setCivicPlaces(civicData?.results || []);
    setEmergencyServices(emergencyData?.results || []);
    setPublicServices(publicData?.results || []);
  };

  const searchPlaces = async (query) => {
    const data = await fetchFSQ('/places/search', {
      query,
      radius: radii[radiusIndex],
      limit: 20,
      sort: 'RELEVANCE',
      fields: 'fsq_place_id,name,location,geocodes,categories,rating,distance,photos,tel,website'
    });
    setSearchResults(data?.results || []);
  };

  const fetchAutocomplete = async (query) => {
    const data = await fetchFSQAuto('/places/search', {
      query,
      radius: 50000,
      limit: 5,
      fields: 'fsq_place_id,name,location,categories'
    });
    setAutocompleteResults(data?.results || []);
  };

  const fetchPlaceDetails = async (placeId) => {
    const [details, photos] = await Promise.all([
      fetchFSQ(`/places/${placeId}`, {
        fields: 'fsq_place_id,name,location,geocodes,categories,rating,tel,website,hours,description,social_media,verified,features'
      }),
      fetchFSQ(`/places/${placeId}/photos`, { limit: 10 })
    ]);
    
    setSelectedPlaceDetails(details);
    setSelectedPlacePhotos(photos || []);
  };

  // --- Civic Engagement Handlers ---
  const handleEmergencyCall = (phoneNumber) => {
    Alert.alert(
      "Emergency Call",
      `Call ${phoneNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call", onPress: () => Linking.openURL(`tel:${phoneNumber}`) }
      ]
    );
  };

  const openReportModal = (location = userLocation) => {
    setReportLocation(location);
    setShowReportModal(true);
  };

  const submitCivicReport = async () => {
    if (!reportType || !reportDescription.trim()) {
      Alert.alert("Incomplete Report", "Please select a report type and provide a description.");
      return;
    }

    // In a real app, this would submit to a civic API or database
    Alert.alert(
      "Report Submitted",
      `Your ${reportTypes.find(r => r.id === reportType)?.name} report has been submitted to local authorities. Thank you for helping improve our community!`,
      [{ 
        text: "OK", 
        onPress: () => {
          setShowReportModal(false);
          setReportType('');
          setReportDescription('');
        }
      }]
    );
  };

  // --- UI Handlers ---
  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setShowAutocomplete(false);
    await searchPlaces(searchQuery);
    setActiveTab('search');
  };

  const handleAutocompleteSelect = async (item) => {
    console.log("handleAutocompleteSelect")
    console.log(item)
    setShowAutocomplete(false);
    setSearchQuery(item.name);
    await showDetails(item.fsq_place_id);
  };

  const showDetails = async (placeId) => {
    setShowDetailsModal(true);
    await fetchPlaceDetails(placeId);
  };

  const handleAutocomplete = async (text) => {
    setSearchQuery(text);
    setShowAutocomplete(text.length > 2);
    if (text.length > 2) {
      await fetchAutocomplete(text);
    }
  };

  // --- Render Components ---
  const renderCivicItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.civicCard} 
      onPress={() => showDetails(item.fsq_place_id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#ffffff', '#f8fafc']}
        style={styles.cardGradient}
      >
        <View style={styles.civicCardHeader}>
          <View style={[styles.civicIcon, { backgroundColor: getCategoryColor(item.categories?.[0]?.id) }]}>
            <Ionicons name={getCategoryIcon(item.categories?.[0]?.id)} size={24} color="#ffffff" />
          </View>
          <View style={styles.civicInfo}>
            <Text style={styles.civicName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.civicCategory}>
              {item.categories?.[0]?.name || 'Public Service'}
            </Text>
            {item.distance && (
              <Text style={styles.civicDistance}>
                {(item.distance / 1000).toFixed(1)} km away
              </Text>
            )}
          </View>
          {item.tel && (
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => handleEmergencyCall(item.tel)}
            >
              <LinearGradient colors={['#10b981', '#059669']} style={styles.callButtonGradient}>
                <Ionicons name="call" size={20} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.civicAddress} numberOfLines={2}>
          {item.location?.formatted_address || 'Address not available'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmergencyService = ({ item }) => (
    <TouchableOpacity 
      style={styles.emergencyCard}
      onPress={() => item.tel ? handleEmergencyCall(item.tel) : showDetails(item.fsq_place_id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={getEmergencyGradient(item.categories?.[0]?.id)}
        style={styles.emergencyGradient}
      >
        <View style={styles.emergencyIcon}>
          <Ionicons name={getEmergencyIcon(item.categories?.[0]?.id)} size={28} color="#ffffff" />
        </View>
        <View style={styles.emergencyInfo}>
          <Text style={styles.emergencyName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.emergencyDistance}>
            {item.distance ? `${(item.distance / 1000).toFixed(1)} km` : 'Distance unknown'}
          </Text>
        </View>
        <Ionicons name="call" size={24} color="#ffffff" />
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderReportType = ({ item }) => (
    <TouchableOpacity 
      style={[styles.reportTypeCard, reportType === item.id && styles.selectedReportType]}
      onPress={() => setReportType(item.id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={reportType === item.id ? ['#6366f1', '#8b5cf6'] : ['#f3f4f6', '#e5e7eb']}
        style={styles.reportTypeGradient}
      >
        <Ionicons 
          name={item.icon} 
          size={24} 
          color={reportType === item.id ? '#ffffff' : item.color} 
        />
        <Text style={[
          styles.reportTypeName,
          reportType === item.id && styles.selectedReportTypeName
        ]}>
          {item.name}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // --- Helper Functions ---
  const getCategoryColor = (categoryId) => {
    const category = civicCategories.find(c => c.id === categoryId);
    return category?.color || '#6366f1';
  };

  const getCategoryIcon = (categoryId) => {
    const category = civicCategories.find(c => c.id === categoryId);
    return category?.icon || 'business-outline';
  };

  const getEmergencyGradient = (categoryId) => {
    switch (categoryId) {
      case '12004': return ['#dc2626', '#b91c1c']; // Fire
      case '12005': return ['#2563eb', '#1d4ed8']; // Police
      case '15001': return ['#059669', '#047857']; // Hospital
      default: return ['#6366f1', '#4f46e5'];
    }
  };

  const getEmergencyIcon = (categoryId) => {
    switch (categoryId) {
      case '12004': return 'flame';
      case '12005': return 'shield';
      case '15001': return 'medical';
      default: return 'call';
    }
  };

  // --- Content Rendering ---
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading civic services...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'civic':
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Emergency Services</Text>
              <FlatList 
                data={emergencyServices.slice(0, 3)}
                renderItem={renderEmergencyService}
                keyExtractor={(item) => item.fsq_place_id}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.emergencyList}
              />
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Government & Civic</Text>
              <FlatList 
                data={civicPlaces}
                renderItem={renderCivicItem}
                keyExtractor={(item) => item.fsq_place_id}
                scrollEnabled={false}
              />
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Public Services</Text>
              <FlatList 
                data={publicServices}
                renderItem={renderCivicItem}
                keyExtractor={(item) => item.fsq_place_id}
                scrollEnabled={false}
              />
            </View>
          </ScrollView>
        );
      
      case 'report':
        return (
          <ScrollView style={styles.reportContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.reportHeader}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.reportHeaderGradient}>
                <Ionicons name="megaphone" size={32} color="#ffffff" />
                <Text style={styles.reportHeaderTitle}>Report an Issue</Text>
                <Text style={styles.reportHeaderSubtitle}>
                  Help improve your community by reporting issues
                </Text>
              </LinearGradient>
            </View>

            <Text style={styles.reportSectionTitle}>Select Issue Type</Text>
            <FlatList 
              data={reportTypes}
              renderItem={renderReportType}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              style={styles.reportTypesList}
            />

            <TouchableOpacity 
              style={styles.reportLocationButton}
              onPress={openReportModal}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#059669', '#047857']} style={styles.reportLocationGradient}>
                <Ionicons name="location" size={24} color="#ffffff" />
                <Text style={styles.reportLocationText}>Report Issue at Current Location</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );
      
      case 'search':
        return (
          <FlatList 
            data={searchResults} 
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.placeCard} 
                onPress={() => showDetails(item.fsq_place_id)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.cardGradient}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeAddress} numberOfLines={2}>
                    {item.location?.formatted_address || 'Address not available'}
                  </Text>
                  {item.distance && (
                    <Text style={styles.placeDistance}>
                      {(item.distance / 1000).toFixed(1)} km away
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.fsq_place_id} 
            showsVerticalScrollIndicator={false}
          />
        );
      
      case 'map':
        const allPlaces = [...civicPlaces, ...emergencyServices, ...publicServices];
        return (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            initialRegion={mapRegion}
            showsUserLocation={true}
          >
            {userLocation && (
              <Circle 
                center={userLocation} 
                radius={radii[radiusIndex]} 
                fillColor="rgba(99, 102, 241, 0.1)" 
                strokeColor="rgba(99, 102, 241, 0.5)"
                strokeWidth={2}
              />
            )}
            {allPlaces.map(place => place.geocodes?.main && (
              <Marker
                key={place.fsq_place_id}
                coordinate={place.geocodes.main}
                title={place.name}
                onPress={() => showDetails(place.fsq_place_id)}
              >
                <View style={[styles.mapMarker, { backgroundColor: getCategoryColor(place.categories?.[0]?.id) }]}>
                  <Ionicons name={getCategoryIcon(place.categories?.[0]?.id)} size={16} color="white" />
                </View>
              </Marker>
            ))}
          </MapView>
        );
      
      default:
        return null;
    }
  };

  // --- Main Component Return ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
      
      {/* Enhanced Header */}
      <LinearGradient colors={['#6366f1', '#8b5cf6', '#d946ef']} style={styles.header}>
        <Animated.View style={[styles.headerContent, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.headerTitle}>Civic Lens</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => openReportModal()}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} style={styles.headerButtonGradient}>
                <Ionicons name="megaphone-outline" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => getCurrentLocation()}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} style={styles.headerButtonGradient}>
                <Ionicons name="navigate-circle-outline" size={28} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Search Section */}
      <Animated.View style={[styles.searchSection, { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <View style={styles.locationStatus}>
          <Ionicons name="location" size={16} color="#6366f1" />
          <Text style={styles.locationStatusText}>Location: {currentCityName}</Text>
        </View>

        <View style={styles.searchContainer}>
          <LinearGradient 
            colors={['#ffffff', '#f8fafc']} 
            style={styles.searchInputContainer}
          >
            <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search civic services, hospitals..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleAutocomplete}
              onSubmitEditing={handleSearch}
            />
          </LinearGradient>
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.filterButton} 
            onPress={() => setRadiusIndex((radiusIndex + 1) % radii.length)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#f3f4f6', '#e5e7eb']} style={styles.filterGradient}>
              <Ionicons name="resize-outline" size={16} color="#6366f1" />
              <Text style={styles.filterText}>{radii[radiusIndex]/1000}km radius</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {showAutocomplete && autocompleteResults.length > 0 && (
        <Animated.View style={[styles.autocompleteList, { opacity: fadeAnim }]}>

          <FlatList
            data={autocompleteResults}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.autocompleteItem} 
                onPress={() => handleAutocompleteSelect(item)}
              >
                <Ionicons name="location-outline" size={16} color="#6366f1" />

                <View style={styles.autocompleteTextContainer}>

                  <Text style={styles.autocompleteMain}>{item.name}</Text>
                  <Text style={styles.autocompleteSub}>{item.location.formatted_address}</Text>
                  
                </View>
               
              </TouchableOpacity>
            )}
          />
          </Animated.View>
      )}

      {/* Enhanced Tab Navigation */}
      <View style={styles.tabsContainer}>
        <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.tabsGradient}>
          {[
            { key: 'civic', icon: 'business-outline', label: 'Civic' },
            { key: 'report', icon: 'megaphone-outline', label: 'Report' },
            { key: 'search', icon: 'search-outline', label: 'Search' },
            { key: 'map', icon: 'map-outline', label: 'Map' }
          ].map(tab => (
            <TouchableOpacity 
              key={tab.key} 
              style={[styles.tab, activeTab === tab.key && styles.activeTab]} 
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              {activeTab === tab.key && (
                <LinearGradient 
                  colors={['#6366f1', '#8b5cf6']} 
                  style={styles.activeTabGradient}
                />
              )}
              <Ionicons 
                name={tab.icon} 
                size={20} 
                color={activeTab === tab.key ? '#6366f1' : '#9ca3af'} 
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </LinearGradient>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {/* Civic Report Modal */}
      <Modal 
        visible={showReportModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReportModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Civic Report</Text>
            <TouchableOpacity 
              onPress={() => setShowReportModal(false)}
              style={styles.closeButton}
            >
              <LinearGradient 
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} 
                style={styles.closeButtonGradient}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSectionTitle}>Select Issue Type</Text>
            <FlatList 
              data={reportTypes}
              renderItem={renderReportType}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              style={styles.reportTypesList}
            />

            <Text style={styles.modalSectionTitle}>Describe the Issue</Text>
            <TextInput
              style={styles.reportTextArea}
              placeholder="Please provide details about the issue you're reporting..."
              placeholderTextColor="#9ca3af"
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={submitCivicReport}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#059669', '#047857']} style={styles.submitButtonGradient}>
                <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Place Details Modal */}
      <Modal 
        visible={showDetailsModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Place Details</Text>
            <TouchableOpacity 
              onPress={() => setShowDetailsModal(false)}
              style={styles.closeButton}
            >
              <LinearGradient 
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} 
                style={styles.closeButtonGradient}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
          
          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedPlaceDetails && (
                <>
                  <View style={styles.detailsHeader}>
                    <Text style={styles.detailsName}>{selectedPlaceDetails.name}</Text>
                    <Text style={styles.detailsAddress}>
                      {selectedPlaceDetails.location?.formatted_address}
                    </Text>
                    
                    {selectedPlaceDetails.rating && (
                      <View style={styles.ratingContainer}>
                        <View style={styles.ratingStars}>
                          {[...Array(5)].map((_, i) => (
                            <Ionicons 
                              key={i}
                              name="star" 
                              size={20} 
                              color={i < Math.floor(selectedPlaceDetails.rating) ? "#f59e0b" : "#d1d5db"} 
                            />
                          ))}
                        </View>
                        <Text style={styles.ratingNumber}>{selectedPlaceDetails.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Contact Information */}
                  <View style={styles.contactSection}>
                    {selectedPlaceDetails.tel && (
                      <TouchableOpacity 
                        style={styles.contactItem}
                        onPress={() => Linking.openURL(`tel:${selectedPlaceDetails.tel}`)}
                      >
                        <LinearGradient colors={['#10b981', '#059669']} style={styles.contactIcon}>
                          <Ionicons name="call" size={20} color="#ffffff" />
                        </LinearGradient>
                        <Text style={styles.contactText}>{selectedPlaceDetails.tel}</Text>
                      </TouchableOpacity>
                    )}
                    
                    {selectedPlaceDetails.website && (
                      <TouchableOpacity 
                        style={styles.contactItem}
                        onPress={() => Linking.openURL(selectedPlaceDetails.website)}
                      >
                        <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.contactIcon}>
                          <Ionicons name="globe" size={20} color="#ffffff" />
                        </LinearGradient>
                        <Text style={styles.contactText}>Visit Website</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Photos Section */}
                  {selectedPlacePhotos.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Photos</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
                        {selectedPlacePhotos.map((photo, index) => (
                          <Image 
                            key={photo.id || index} 
                            source={{uri: `${photo.prefix}400x400${photo.suffix}`}} 
                            style={styles.placePhoto} 
                          />
                        ))}
                      </ScrollView>
                    </>
                  )}

                  {/* Features Section */}
                  {selectedPlaceDetails.features?.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Features</Text>
                      <View style={styles.featuresContainer}>
                        {selectedPlaceDetails.features.slice(0, 6).map((feature, index) => (
                          <View key={index} style={styles.featureChip}>
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Civic Action Button */}
                  <TouchableOpacity 
                    style={styles.civicActionButton}
                    onPress={() => {
                      setReportLocation(selectedPlaceDetails.geocodes?.main || userLocation);
                      setShowDetailsModal(false);
                      setShowReportModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.civicActionGradient}>
                      <Ionicons name="flag" size={24} color="#ffffff" />
                      <Text style={styles.civicActionText}>Report Issue Here</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// --- Enhanced StyleSheet ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    height: 100,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10
  },
  headerActions: {
    flexDirection: 'row',
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 20
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: -2
  },
  headerButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginLeft: 12
  },
  headerButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchSection: {
    padding: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
    marginTop: -20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: '#f8fafc'
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 20,
    alignSelf: 'center'
  },
  locationStatusIcon: {
    marginRight: 6
  },
  locationStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1'
  },
  searchContainer: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    overflow: 'hidden'
  },
  searchIcon: {
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937'
  },
  filterContainer: {
    marginTop: 16,
    alignItems: 'center'
  },
  filterButton: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  filterGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    marginRight: 6
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151'
  },
  autocompleteList: {
    position: 'absolute',
    top: 160,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    maxHeight: 250,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 20,
    overflow: 'hidden'
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229,231,235,0.5)',
  },
  autocompleteIcon: {
    marginRight: 12
  },
  autocompleteTextContainer: {
    flex: 1
  },
  autocompleteMain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937'
  },
  autocompleteSub: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2
  },
  tabsContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  tabsGradient: {
    flexDirection: 'row',
    paddingVertical: 8
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
    borderRadius: 12,
    margin: 4
  },
  activeTab: {
    overflow: 'hidden'
  },
  activeTabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    opacity: 0.1
  },
  tabIcon: {
    marginBottom: 4
  },
  tabText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: '700'
  },
  contentContainer: {
    flex: 1,
    marginTop: 16
  },
  
  // Civic-specific styles
  sectionContainer: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    marginHorizontal: 20
  },
  emergencyList: {
    paddingHorizontal: 20
  },
  emergencyCard: {
    width: width * 0.8,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  emergencyGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  emergencyInfo: {
    flex: 1
  },
  emergencyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  emergencyDistance: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4
  },
  civicCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6
  },
  cardGradient: {
    padding: 16
  },
  civicCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  civicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  civicInfo: {
    flex: 1
  },
  civicName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937'
  },
  civicCategory: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 2
  },
  civicDistance: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  civicAddress: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20
  },
  callButton: {
    borderRadius: 20,
    overflow: 'hidden'
  },
  callButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  // Report-specific styles
  reportContainer: {
    flex: 1,
    padding: 20
  },
  reportHeader: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8
  },
  reportHeaderGradient: {
    padding: 24,
    alignItems: 'center',
  },
  reportHeaderIcon: {
    marginBottom: 8
  },
  reportHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center'
  },
  reportHeaderSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8
  },
  reportSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16
  },
  reportTypesList: {
    marginBottom: 24,
    margin: -8  // Negative margin for grid spacing
  },
  reportTypeCard: {
    flex: 1,
    margin: 8,  // Positive margin for grid items
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  selectedReportType: {
    shadowColor: '#6366f1',
    shadowOpacity: 0.3
  },
  reportTypeGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 80
  },
  reportTypeIcon: {
    marginBottom: 8
  },
  reportTypeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center'
  },
  selectedReportTypeName: {
    color: '#ffffff'
  },
  reportLocationButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  reportLocationGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportLocationIcon: {
    marginRight: 12
  },
  reportLocationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  modalHeader: {
    height: 100,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff'
  },
  closeButton: {
    borderRadius: 20,
    overflow: 'hidden'
  },
  closeButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16
  },
  reportTextArea: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  submitButtonGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonIcon: {
    marginRight: 12
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff'
  },
  
  // Place details styles
  detailsHeader: {
    marginBottom: 24
  },
  detailsName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8
  },
  detailsAddress: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 16
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 8
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b'
  },
  contactSection: {
    marginBottom: 32
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  contactText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  },
  photosContainer: {
    marginBottom: 24
  },
  placePhoto: {
    width: 150,
    height: 150,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#e5e7eb'
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -4,
    marginBottom: 24
  },
  featureChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    margin: 4
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6'
  },
  civicActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16
  },
  civicActionGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  civicActionIcon: {
    marginRight: 12
  },
  civicActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  
  // Map styles
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6
  },
  
  // Search result styles
  placeCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4
  },
  placeAddress: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8
  },
  placeDistance: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600'
  },
  
  // Loading and empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    marginBottom: 16
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280'
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingIcon: {
    marginBottom: 16
  }
});

export default CivicFoursquareExplorer;