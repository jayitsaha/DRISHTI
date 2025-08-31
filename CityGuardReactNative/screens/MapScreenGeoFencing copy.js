import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Button, TouchableOpacity, Modal, Image } from 'react-native';
import MapView, { Heatmap, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [inDanger, setInDanger] = useState(false); // Safety status
  const [taskRecommendation, setTaskRecommendation] = useState(null); // Task scheduling recommendation
  const [selectedPlace, setSelectedPlace] = useState(null); // State to hold selected place info
  const [modalVisible, setModalVisible] = useState(false); // State for modal visibility
  const [routeCoordinates, setRouteCoordinates] = useState([]); // State to hold polyline coordinates

// Function to calculate Bezier curve points
const calculateBezierPoints = (start, end, numPoints) => {
    const points = [];
    const controlPoint = {
      latitude: (start.latitude + end.latitude) / 2 - 0.001, // Control point above the line
      longitude: (start.longitude + end.longitude) / 2,
    };
  
    for (let t = 0; t <= 1; t += 1 / numPoints) {
      const x = Math.pow(1 - t, 2) * start.latitude +
                2 * (1 - t) * t * controlPoint.latitude +
                Math.pow(t, 2) * end.latitude;
  
      const y = Math.pow(1 - t, 2) * start.longitude +
                2 * (1 - t) * t * controlPoint.longitude +
                Math.pow(t, 2) * end.longitude;
  
      points.push({ latitude: x, longitude: y });
    }
    return points;
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      // Get the current location of the user
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      checkDangerZone(loc.coords.latitude, loc.coords.longitude); // Check for danger zones
    })();
  }, []);

  const popularPlaces = [
    {
      name: 'Gym',
      latitude:  12.935459 + 0.05, longitude: 77.723072 + 0.05,
      safetyScore: 8.5,
      peopleDensity: 'Moderate',
      icon: require('../assets/gym.png'), // Custom gym icon
    },
    {
      name: 'Park',
      latitude:  12.935459 - 0.007, longitude: 77.723072 - 0.006,
      safetyScore: 9.0,
      peopleDensity: 'Low',
      icon: require('../assets/park.png'), // Custom park icon
    },
    {
      name: 'Library',
      latitude:  12.935459 + 0.004, 
      longitude: 77.723072 + 0.005,
      safetyScore: 9.5,
      peopleDensity: 'Low',
      icon: require('../assets/library.png'), // Custom library icon
    },
  ];

    // Show place info in a modal
    const handleMarkerPress = (place) => {
        setSelectedPlace(place);
        setModalVisible(true);

        const userCoords = {
            latitude: location?.coords.latitude || 37.7749,
            longitude: location?.coords.longitude || -122.4194,
          };
      
          const bezierPoints = calculateBezierPoints(userCoords, place, 20); // Generate 20 points
          setRouteCoordinates(bezierPoints);
      };



  // Generate nearby heatmap points (500m radius from the user)
  const generateNearbyHeatmapPoints = (userLocation) => {
    if (!userLocation) return [];

    const { latitude, longitude } = userLocation.coords;

    return [
      { latitude: latitude - 0.005, longitude: longitude - 0.005, weight: 1 },
      { latitude: latitude + 0.004, longitude: longitude - 0.004, weight: 1 },
      { latitude: latitude - 0.004, longitude: longitude + 0.004, weight: 1 },
      { latitude: latitude + 0.003, longitude: longitude + 0.003, weight: 1 },
    ];
  };

  // Hardcoded Safe Zone and Danger Zone markers
  const safeZones = [
    { latitude: 12.935459 + 0.004, longitude: 77.723072 - 0.004, name: 'Police Station' },
    { latitude: 12.935459 - 0.004, longitude: 77.723072 + 0.004, name: 'Community Center' },
  ];

  const dangerZones = [
    { latitude: 12.935459 - 0.005, longitude: 77.723072 - 0.005, name: 'High-Crime Area' },
    { latitude: 12.935459 + 0.003, longitude: 77.723072 + 0.003, name: 'Dark Alley' },
  ];

  // Hardcoded popular locations for task scheduling
  const popularLocations = [
    { name: 'Supermarket', latitude:  12.935459 + 0.005, longitude: 77.723072 + 0.005 },
    { name: 'Park', latitude:  12.935459 + 0.005, longitude: 77.723072 + 0.005 },
    { name: 'Gym', latitude:  12.935459 + 0.005, longitude: 77.723072 + 0.005 },
  ];

  // Simulate crowd density data and generate task recommendations
  const generateTaskRecommendations = () => {
    const currentHour = new Date().getHours();
    let recommendations = [];

    popularLocations.forEach((location) => {
      let recommendedTime;

      // Generate recommendations based on the time of day
      if (location.name === 'Supermarket') {
        recommendedTime = currentHour < 11 ? '10 AM - 11 AM' : '3 PM - 4 PM'; // Suggest quieter hours
      } else if (location.name === 'Park') {
        recommendedTime = currentHour < 12 ? '10 AM - 11 AM' : '5 PM - 6 PM'; // Suggest quieter hours
      } else if (location.name === 'Gym') {
        recommendedTime = currentHour < 17 ? '4 PM - 5 PM' : '8 PM - 9 PM'; // Suggest quieter hours
      }

      recommendations.push(`${location.name}: ${recommendedTime}`);
    });

    setTaskRecommendation(recommendations.join('\n'));
  };

  // Check if the user is in a danger zone
  const checkDangerZone = (latitude, longitude) => {
    const radius = 0.01; // 1km radius for danger zones
    dangerZones.forEach((zone) => {
      const distance = calculateDistance(latitude, longitude, zone.latitude, zone.longitude);
      if (distance < radius) {
        setInDanger(true);
        return;
      } else {
        setInDanger(false);
      }
    });
  };

  // Function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  // S.O.S. Button Press Handler
  const handleSOSPress = () => {
    Alert.alert('S.O.S. Alert', 'Sending your location to emergency contacts!');
    // Implement sharing the user's location via SMS or any other method
  };

  // Show task recommendations when the user clicks a button
  const handleShowRecommendations = () => {
    generateTaskRecommendations();
    Alert.alert('Task Recommendations', taskRecommendation || 'No recommendations available.');
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={{
          latitude: location?.coords.latitude || 37.7749,
          longitude: location?.coords.longitude || -122.4194,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        customMapStyle={mapStyle} // Apply custom dark mode style
        showsUserLocation={true}
        showsMyLocationButton={true}
        onUserLocationChange={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          checkDangerZone(latitude, longitude);
        }}
      >
        {/* Safe Zones Markers */}
        {safeZones.map((zone, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
            title={zone.name}
            pinColor="#7bae67" // Safe zones are marked with green
          />
        ))}

        {/* Danger Zones Markers */}
        {dangerZones.map((zone, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
            title={zone.name}
            pinColor="#FF3535" // Danger zones are marked with red
          />
        ))}

        {popularPlaces.map((place, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            onPress={() => handleMarkerPress(place)} // Show place info on press
          >
            <Image source={place.icon} style={styles.markerIcon} />
          </Marker>
        ))}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#FF0000" // Color of the polyline
            strokeWidth={4} // Width of the polyline
          />
        )}

        {/* Heatmap Points */}
        {location && (
          <Heatmap
            points={generateNearbyHeatmapPoints(location)}
            opacity={0.6}
            radius={50}
            maxIntensity={100}
            gradient={{
              colors: ['green', 'yellow', 'red'],
              startPoints: [0.2, 0.6, 1],
              colorMapSize: 256,
            }}
          />
        )}
      </MapView>

      {/* Safety Status Banner */}
      <View style={[styles.banner, { backgroundColor: inDanger ? 'red' : '#7bae67' }]}>
        <Text style={styles.bannerText}>
          {inDanger ? 'You are in a danger zone!' : 'You are in a safe area!'}
        </Text>
      </View>

      {/* User Location Info */}
      {location && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Latitude: {location.coords.latitude.toFixed(4)}
          </Text>
          <Text style={styles.infoText}>
            Longitude: {location.coords.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      {/* S.O.S. Button */}
      <TouchableOpacity style={styles.sosButton} onPress={handleSOSPress}>
        <MaterialIcons name="sos" size={28} color="white" />
        <Text style={styles.sosButtonText}>S.O.S.</Text>
      </TouchableOpacity>

      {/* Show Recommendations Button */}
      {/* <TouchableOpacity style={styles.recommendationButton} onPress={handleShowRecommendations}>
        <Text style={styles.recommendationButtonText}>Get Task Recommendations</Text>
      </TouchableOpacity> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 5,
  },
  infoText: {
    fontSize: 16,
  },
  sosButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF3535',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
  },
  sosButtonText: {
    color: 'white',
    marginTop: 5,
  },
  recommendationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  recommendationButtonText: {
    color: 'white',
    fontSize: 16,
  },
  markerIcon:{
    height: 50,
    width: 50
  }
});

// Custom map style
const mapStyle = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#212121' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#212121' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.fill',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#282828' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#181818' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#393939' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{ color: '#393939' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f2f2f' }],
  },
];

