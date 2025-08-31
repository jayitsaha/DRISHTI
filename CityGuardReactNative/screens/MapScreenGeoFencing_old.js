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
} from 'react-native';
import MapView, { 
  Marker, 
  PROVIDER_GOOGLE,
  Circle,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomBottomSheet from '../components/CustomBottomSheet';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

  // Refs
  const mapRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const dataFetchController = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.8)).current;
  
  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['10%', '50%', '85%'], []);
  
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
      // Cancel any ongoing fetch
      if (dataFetchController.current) {
        dataFetchController.current.abort();
      }
    };
  }, []);

  // Fetch area data when map is ready
  useEffect(() => {
    if (mapReady && location) {
      fetchUnifiedData();
    }
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
    // Cancel previous request if any
    if (dataFetchController.current) {
      dataFetchController.current.abort();
    }
    
    // Create new abort controller
    dataFetchController.current = new AbortController();
    
    try {
      console.log('Fetching unified area data...');
      setRefreshing(true);
      
      const response = await fetch(`${API_BASE_URL}/map/areas/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          areas: [], // Empty array gets all areas
          force_refresh: forceRefresh
        }),
        signal: dataFetchController.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received unified data for ${Object.keys(data.areas || {}).length} areas`);
      
      // Update unified data state
      setUnifiedData({
        areas: data.areas || {},
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
    }
  };

  const handleAreaMarkerPress = useCallback(async (areaName) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    } else {
      Vibration.vibrate(20);
    }
    
    // Get area data from unified data
    const areaData = unifiedData.areas[areaName];
    if (!areaData) {
      console.error('Area data not found:', areaName);
      return;
    }
    
    // Set selected area with all available details
    setSelectedArea({
      ...areaData,
      ...areaData.details,
      timestamp: unifiedData.timestamp
    });
    
    // Animate to location
    mapRef.current?.animateCamera({
      center: {
        latitude: areaData.coordinates.latitude - 0.01,
        longitude: areaData.coordinates.longitude,
      },
      zoom: 14,
    }, { duration: 800 });
    
    // Open bottom sheet
    bottomSheetRef.current?.snapToIndex(1);
  }, [unifiedData]);

  const renderAreaMarker = useCallback((areaName, areaData) => {
    const isSelected = selectedArea?.name === areaName;
    const color = areaData.color || '#999999';
    
    return (
      <Marker
        key={areaData.id}
        coordinate={areaData.coordinates}
        onPress={() => handleAreaMarkerPress(areaName)}
        tracksViewChanges={false}
      >
        <View style={styles.areaMarkerContainer}>
          <Animated.View style={[
            styles.areaMarkerOuter,
            { 
              borderColor: color,
              transform: [{ scale: isSelected ? 1.1 : 1 }]
            }
          ]}>
            <LinearGradient
              colors={[color + '20', color + '40']}
              style={styles.areaMarkerInner}
            >
              <MaterialCommunityIcons 
                name={areaData.icon || 'map-marker'} 
                size={28} 
                color={color} 
              />
              {areaData.metrics?.issue_count > 0 && (
                <View style={[styles.areaBadge, { backgroundColor: color }]}>
                  <Text style={styles.areaBadgeText}>{areaData.metrics.issue_count}</Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
          <View style={[styles.areaLabelContainer, { backgroundColor: color + 'F0' }]}>
            <Text style={styles.areaLabelText}>{areaData.name}</Text>
          </View>
        </View>
      </Marker>
    );
  }, [selectedArea, handleAreaMarkerPress]);

  const renderBottomSheetContent = () => {
    if (!selectedArea) {
      return (
        <View style={styles.bottomSheetEmpty}>
          <MaterialCommunityIcons name="map-marker-question" size={48} color="#666" />
          <Text style={styles.bottomSheetEmptyText}>Select an area to view details</Text>
        </View>
      );
    }
    
    const color = selectedArea.color || '#999999';
    
    return (
      <ScrollView 
        style={styles.bottomSheetContent} 
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
                // In a real implementation, you could fetch predictions separately here
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
        <Text style={styles.loadingText}>Initializing CityPulse...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
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
        
        {/* Area Markers */}
        {Object.entries(unifiedData.areas).map(([areaName, areaData]) => 
          renderAreaMarker(areaName, areaData)
        )}
      </MapView>
      
      {/* Top Status Bar */}
      <Animated.View style={[
        styles.topStatusBar,
        {
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
          })}]
        }
      ]}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.topStatusGradient}
        >
          <View style={styles.cityHeader}>
            <MaterialCommunityIcons name="city" size={24} color="#FF6B9D" />
            <Text style={styles.cityTitle}>Bangalore CityPulse</Text>
          </View>
          {refreshing && (
            <ActivityIndicator size="small" color="#FF6B9D" />
          )}
        </LinearGradient>
      </Animated.View>
      
      {/* Weather Widget */}
      {unifiedData.weather && unifiedData.weather.current && (
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
      
      {/* Quick Stats */}
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
      
      {/* Refresh Button */}
      <TouchableOpacity 
        style={styles.floatingRefreshButton}
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
      
      {/* Bottom Sheet */}
      <GestureHandlerRootView style={styles.bottomSheetWrapper}>
        <CustomBottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetIndicator}
        >
          {renderBottomSheetContent()}
        </CustomBottomSheet>
      </GestureHandlerRootView>
    </View>
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
  
  // Top Status Bar
  topStatusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  topStatusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  
  // Weather Widget
  weatherWidget: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    right: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  weatherBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  weatherInfo: {
    marginLeft: 8,
  },
  weatherTemp: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  weatherDesc: {
    color: '#999',
    fontSize: 12,
  },
  
  // Quick Stats
  quickStats: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickStatsGradient: {
    flexDirection: 'row',
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statItemSpacing: {
    marginLeft: 16,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: '#999',
    fontSize: 10,
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
  
  // Area Markers
  areaMarkerContainer: {
    alignItems: 'center',
  },
  areaMarkerOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  areaMarkerInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  areaBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  areaLabelContainer: {
    marginTop: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  areaLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Floating Buttons
  floatingRefreshButton: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  locationButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  floatingButtonGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButtonGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Bottom Sheet
  bottomSheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheetBackground: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomSheetIndicator: {
    backgroundColor: '#666',
    width: 40,
  },
  bottomSheetEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  bottomSheetEmptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 16,
  },
  bottomSheetContent: {
    flex: 1,
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
});