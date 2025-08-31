// CityPulse React Native App
// Main app with map visualization and chatbot interface

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, Polygon, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'http://your-server-ip:8000'; // Replace with your server IP

// Map style for dark mode
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  }
];

const CityPulseApp = () => {
  // State management
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const [mapData, setMapData] = useState({
    traffic: [],
    power: [],
    reports: []
  });
  
  const [selectedDataType, setSelectedDataType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const mapRef = useRef(null);
  const chatScrollViewRef = useRef(null);
  const ws = useRef(null);

  // Initialize app
  useEffect(() => {
    requestLocationPermission();
    connectWebSocket();
    fetchMapData();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Connect to WebSocket for real-time updates
  const connectWebSocket = () => {
    try {
      ws.current = new WebSocket(`ws://${API_BASE_URL.replace('http://', '')}/ws`);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        // Subscribe to updates
        ws.current.send(JSON.stringify({ action: 'subscribe', types: ['all'] }));
      };
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealtimeUpdate(data);
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  // Handle real-time updates
  const handleRealtimeUpdate = (update) => {
    if (update.type === 'update') {
      // Show notification for critical updates
      update.data.forEach(item => {
        if (item.severity === 'critical' || item.priority === 'high') {
          Alert.alert(
            'City Alert',
            item.message || item.description,
            [{ text: 'OK' }]
          );
        }
      });
      
      // Refresh map data
      fetchMapData();
    }
  };

  // Fetch map data
  const fetchMapData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/map/data`, {
        params: { data_type: selectedDataType }
      });
      
      const features = response.data.features;
      
      // Categorize features
      const traffic = features.filter(f => f.properties.type === 'traffic_hotspot');
      const power = features.filter(f => f.properties.type === 'power_outage');
      const reports = features.filter(f => f.properties.type === 'citizen_report');
      
      setMapData({ traffic, power, reports });
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: inputMessage,
        user_id: 'mobile_user_' + Math.random().toString(36).substr(2, 9),
        location: location ? { lat: location.latitude, lng: location.longitude } : null
      });
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.data.message,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        data: response.data.data,
        suggestions: response.data.suggestions
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        chatScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I couldn\'t process your request. Please try again.',
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Report issue
  const reportIssue = async (issueData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/report/issue`, {
        ...issueData,
        location: {
          lat: selectedLocation.latitude,
          lng: selectedLocation.longitude
        }
      });
      
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting. We\'ll look into it immediately.',
        [{ text: 'OK' }]
      );
      
      setReportModalVisible(false);
      setSelectedLocation(null);
      
      // Refresh map data
      fetchMapData();
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  // Render map markers
  const renderMarkers = () => {
    const markers = [];
    
    // Traffic markers
    if (selectedDataType === 'all' || selectedDataType === 'traffic') {
      mapData.traffic.forEach((item, index) => {
        const [lng, lat] = item.geometry.coordinates;
        const severity = item.properties.severity;
        const color = severity === 'high' ? '#FF3B30' : severity === 'medium' ? '#FF9500' : '#FFCC00';
        
        markers.push(
          <Marker
            key={`traffic-${index}`}
            coordinate={{ latitude: lat, longitude: lng }}
            title="Traffic Alert"
            description={item.properties.description}
          >
            <View style={[styles.markerContainer, { backgroundColor: color }]}>
              <FontAwesome5 name="car" size={16} color="#FFF" />
            </View>
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>Traffic Update</Text>
                <Text>{item.properties.description}</Text>
                <Text style={styles.calloutTime}>
                  {new Date(item.properties.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </Callout>
          </Marker>
        );
      });
    }
    
    // Power outage polygons
    if (selectedDataType === 'all' || selectedDataType === 'power') {
      mapData.power.forEach((item, index) => {
        if (item.geometry.type === 'Polygon') {
          const coordinates = item.geometry.coordinates[0].map(coord => ({
            latitude: coord[1],
            longitude: coord[0]
          }));
          
          markers.push(
            <Polygon
              key={`power-${index}`}
              coordinates={coordinates}
              fillColor="rgba(255, 59, 48, 0.3)"
              strokeColor="rgba(255, 59, 48, 0.8)"
              strokeWidth={2}
            />
          );
        }
      });
    }
    
    // Citizen reports
    if (selectedDataType === 'all' || selectedDataType === 'reports') {
      mapData.reports.forEach((item, index) => {
        const [lng, lat] = item.geometry.coordinates;
        const category = item.properties.category;
        const icon = category === 'traffic' ? 'car' : 
                    category === 'power' ? 'bolt' : 
                    category === 'water' ? 'water' : 'exclamation-circle';
        
        markers.push(
          <Marker
            key={`report-${index}`}
            coordinate={{ latitude: lat, longitude: lng }}
            title={`Citizen Report: ${category}`}
            description={item.properties.description}
          >
            <View style={[styles.markerContainer, { backgroundColor: '#007AFF' }]}>
              <FontAwesome5 name={icon} size={16} color="#FFF" />
            </View>
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>Citizen Report</Text>
                <Text>{item.properties.description}</Text>
                <Text style={styles.calloutCategory}>{category.toUpperCase()}</Text>
                <Text style={styles.calloutTime}>
                  {new Date(item.properties.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </Callout>
          </Marker>
        );
      });
    }
    
    return markers;
  };

  // Render chat interface
  const renderChatInterface = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={chatVisible}
      onRequestClose={() => setChatVisible(false)}
    >
      <SafeAreaView style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>CityPulse Assistant</Text>
          <TouchableOpacity onPress={() => setChatVisible(false)}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          ref={chatScrollViewRef}
          style={styles.chatMessages}
          contentContainerStyle={styles.chatMessagesContent}
        >
          {messages.length === 0 && (
            <View style={styles.welcomeMessage}>
              <Text style={styles.welcomeText}>
                👋 Hi! I'm your CityPulse Assistant.
              </Text>
              <Text style={styles.welcomeSubtext}>
                Ask me about traffic, power outages, weather, or report any city issues!
              </Text>
            </View>
          )}
          
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.sender === 'user' ? styles.userMessage : styles.botMessage
              ]}
            >
              <Text style={[
                styles.messageText,
                message.sender === 'user' ? styles.userMessageText : styles.botMessageText
              ]}>
                {message.text}
              </Text>
              
              {message.suggestions && (
                <View style={styles.suggestionsContainer}>
                  {message.suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => setInputMessage(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatInputContainer}
        >
          <TextInput
            style={styles.chatInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Ask about traffic, power, weather..."
            onSubmitEditing={sendChatMessage}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendChatMessage}>
            <Ionicons name="send" size={24} color="#FFF" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  // Render report modal
  const renderReportModal = () => {
    const [category, setCategory] = useState('traffic');
    const [description, setDescription] = useState('');
    const [urgency, setUrgency] = useState('medium');
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report an Issue</Text>
            
            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.categoryContainer}>
              {['traffic', 'power', 'water', 'other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.categoryButtonActive
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    category === cat && styles.categoryButtonTextActive
                  ]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={styles.modalTextInput}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue..."
            />
            
            <Text style={styles.modalLabel}>Urgency</Text>
            <View style={styles.urgencyContainer}>
              {['low', 'medium', 'high', 'critical'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.urgencyButton,
                    urgency === level && styles.urgencyButtonActive
                  ]}
                  onPress={() => setUrgency(level)}
                >
                  <Text style={[
                    styles.urgencyButtonText,
                    urgency === level && styles.urgencyButtonTextActive
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setReportModalVisible(false);
                  setSelectedLocation(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={() => {
                  if (description.trim()) {
                    reportIssue({ category, description, urgency });
                  } else {
                    Alert.alert('Error', 'Please provide a description');
                  }
                }}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSubmit]}>
                  Submit Report
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onLongPress={(event) => {
          setSelectedLocation(event.nativeEvent.coordinate);
          setReportModalVisible(true);
        }}
      >
        {renderMarkers()}
        
        {/* Current location marker */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude
            }}
            title="You are here"
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </Marker>
        )}
      </MapView>
      
      {/* Data type selector */}
      <View style={styles.dataTypeSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { type: 'all', label: 'All', icon: 'layers' },
            { type: 'traffic', label: 'Traffic', icon: 'car' },
            { type: 'power', label: 'Power', icon: 'bolt' },
            { type: 'reports', label: 'Reports', icon: 'flag' }
          ].map((item) => (
            <TouchableOpacity
              key={item.type}
              style={[
                styles.dataTypeButton,
                selectedDataType === item.type && styles.dataTypeButtonActive
              ]}
              onPress={() => {
                setSelectedDataType(item.type);
                fetchMapData();
              }}
            >
              <FontAwesome5
                name={item.icon}
                size={16}
                color={selectedDataType === item.type ? '#FFF' : '#666'}
              />
              <Text style={[
                styles.dataTypeText,
                selectedDataType === item.type && styles.dataTypeTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (location) {
              mapRef.current.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 1000);
            }
          }}
        >
          <MaterialIcons name="my-location" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={fetchMapData}
        >
          <MaterialIcons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {/* Chat button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => setChatVisible(true)}
      >
        <Ionicons name="chatbubbles" size={28} color="#FFF" />
        <Text style={styles.chatButtonText}>Ask CityPulse</Text>
      </TouchableOpacity>
      
      {/* Status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {loading ? 'Updating...' : 'Live City Data'}
        </Text>
        {loading && <ActivityIndicator size="small" color="#FFF" />}
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: '#FF3B30' }]} />
          <Text style={styles.legendText}>High Traffic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: '#FF9500' }]} />
          <Text style={styles.legendText}>Medium Traffic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: '#007AFF' }]} />
          <Text style={styles.legendText}>Citizen Reports</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendArea, { backgroundColor: 'rgba(255, 59, 48, 0.3)' }]} />
          <Text style={styles.legendText}>Power Outage</Text>
        </View>
      </View>
      
      {renderChatInterface()}
      {renderReportModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  dataTypeSelector: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    height: 50,
  },
  dataTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  dataTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  dataTypeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  dataTypeTextActive: {
    color: '#FFF',
  },
  controls: {
    position: 'absolute',
    right: 20,
    bottom: 120,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  chatButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  chatButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusBar: {
    position: 'absolute',
    top: 110,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    marginRight: 8,
  },
  legend: {
    position: 'absolute',
    left: 20,
    bottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 10,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendArea: {
    width: 16,
    height: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.8)',
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
  calloutContainer: {
    padding: 10,
    minWidth: 150,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  calloutCategory: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 5,
  },
  calloutTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 16,
  },
  welcomeMessage: {
    alignItems: 'center',
    marginVertical: 50,
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 10,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
  },
  messageText: {
    fontSize: 15,
  },
  userMessageText: {
    color: '#FFF',
  },
  botMessageText: {
    color: '#333',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 4,
  },
  suggestionText: {
    fontSize: 13,
    color: '#333',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
    marginBottom: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#FFF',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  urgencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  urgencyButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    marginBottom: 8,
  },
  urgencyButtonActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  urgencyButtonText: {
    fontSize: 13,
    color: '#666',
  },
  urgencyButtonTextActive: {
    color: '#FFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  modalButtonSubmit: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonTextSubmit: {
    color: '#FFF',
  },
});

export default CityPulseApp;