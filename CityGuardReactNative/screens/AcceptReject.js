// AcceptReject.js - Cleaner Task Management Portal
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable';
import { Swipeable } from 'react-native-gesture-handler';
import MaskedView from '@react-native-masked-view/masked-view';
import { 
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/authConfig';
import { useAuth } from '../contexts/AuthContext';
import { assignTaskToUser } from '../firebase/authConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// API Configuration
const API_BASE_URL = 'http://192.168.1.17:3000'; // Update with your server IP

const colors = {
  // Green theme colors for cleaners
  emerald: "#10B981",
  green: "#22C55E",
  lime: "#84CC16",
  lightGreen: "#ECFCCB",
  forest: "#14532D",
  mint: "#D1FAE5",
  
  // Backgrounds
  pureWhite: "#FFFFFF",
  softWhite: "#FEFEFE",
  cream: "#F0FDF4",
  pearl: "#F7FEE7",
  
  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  
  // Grays
  lightGray: "#F5F5F5",
  softGray: "#E8E8E8",
  mediumGray: "#D3D3D3",
  darkGray: "#A9A9A9",
  charcoal: "#36454F",
  
  // Text
  text: "#2C2C2C",
  textLight: "#6B6B6B",
  textUltraLight: "#9B9B9B",
};

const AcceptReject = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const swipeableRefs = useRef({});
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const leafFloat = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-100)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadTasks();
    animateEntrance();
    startContinuousAnimations();
    
    // Set up polling for updates
    const interval = setInterval(loadTasks, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadTasks = async () => {
    try {
      setError(null);
      
      // Fetch from Flask API
      const response = await fetch(`${API_BASE_URL}/api/data_cleaner`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter for pending cleaning tasks only
      const pendingTasks = data.filter(task => 
        task.status === 'pending' || !task.status
      );
      
      // Sort by priority
      pendingTasks.sort((a, b) => 
        (b.priorityScore || 5) - (a.priorityScore || 5)
      );
      
      setTasks(pendingTasks);
      setLoading(false);
      
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError(error.message);
      setLoading(false);
      
      // Show alert for connection errors
      if (error.message.includes('Network request failed')) {
        Alert.alert(
          "Connection Error",
          "Unable to connect to the server. Please check:\n\n" +
          "1. Flask server is running\n" +
          "2. IP address is correct\n" +
          "3. Your device is on the same network",
          [
            {
              text: "Retry",
              onPress: () => {
                setLoading(true);
                loadTasks();
              }
            },
            { text: "OK", style: "cancel" }
          ]
        );
      }
    }
  };

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startContinuousAnimations = () => {
    // Leaf floating effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(leafFloat, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(leafFloat, {
          toValue: -1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sparkle effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadTasks().then(() => {
      setRefreshing(false);
    });
  }, []);

  const handleAccept = async (task) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Update in Firebase
      if (user?.uid && task.id) {
        // For cleaners, use task-specific fields
        await assignTaskToUser(user.uid, {
          taskId: task.id,
          cleaningTaskId: task.id, // Use cleaningTaskId for cleaners
          issueType: 'cleaning',
          severity: task.severity,
          location: task.location,
          address: task.address,
        });

        await updateDoc(doc(db, 'citizenReports', task.id), {
          status: 'assigned',
          assignedTo: user.uid,
          assignedAt: serverTimestamp(),
        });
      }

      // Remove from local list immediately for better UX
      setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));

      // Close the swipeable
      if (swipeableRefs.current[task.id]) {
        swipeableRefs.current[task.id].close();
      }

      Alert.alert(
        "Task Accepted",
        "You have been assigned to this cleaning task",
        [
          {
            text: "View Details",
            onPress: () => navigation.navigate('CleanerViewTask', { task })
          },
          { text: "OK", style: "cancel" }
        ]
      );
      
      // Refresh the list to get updated data
      setTimeout(loadTasks, 1000);
      
    } catch (error) {
      console.error("Error accepting task:", error);
      Alert.alert("Error", "Failed to accept task. Please try again.");
    }
  };

  const handleReject = (task) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      "Reject Task",
      "Are you sure you want to reject this cleaning task?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            if (swipeableRefs.current[task.id]) {
              swipeableRefs.current[task.id].close();
            }
          }
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            // Remove from local list
            setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
            
            if (swipeableRefs.current[task.id]) {
              swipeableRefs.current[task.id].close();
            }
          }
        }
      ]
    );
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return colors.danger;
      case 'High': return colors.warning;
      case 'Medium': return colors.emerald;
      default: return colors.info;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = typeof timestamp === 'string' 
        ? new Date(timestamp) 
        : timestamp instanceof Date 
          ? timestamp 
          : new Date();
          
      const now = new Date();
      const diffInMs = now - date;
      const diffInMins = Math.floor(diffInMs / 60000);
      const diffInHours = Math.floor(diffInMs / 3600000);
      
      if (diffInMins < 1) return 'Just now';
      if (diffInMins < 60) return `${diffInMins}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const renderRightActions = (progress, dragX, task) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
    });

    return (
      <Animated.View
        style={[
          styles.rightActions,
          {
            transform: [{ translateX: trans }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptAction]}
          onPress={() => handleAccept(task)}
        >
          <LinearGradient
            colors={[colors.success, colors.success + 'DD']}
            style={styles.actionGradient}
          >
            <MaterialIcons name="check" size={24} color="#FFF" />
            <Text style={styles.actionText}>Accept</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = (progress, dragX, task) => {
    const trans = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [-100, 0],
    });

    return (
      <Animated.View
        style={[
          styles.leftActions,
          {
            transform: [{ translateX: trans }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectAction]}
          onPress={() => handleReject(task)}
        >
          <LinearGradient
            colors={[colors.danger, colors.danger + 'DD']}
            style={styles.actionGradient}
          >
            <MaterialIcons name="close" size={24} color="#FFF" />
            <Text style={styles.actionText}>Reject</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderTaskCard = ({ item, index }) => {
    const severityColor = getSeverityColor(item.severity);
    
    return (
      <Animatable.View
        animation="fadeInUp"
        delay={index * 100}
        duration={600}
      >
        <Swipeable
          ref={(ref) => swipeableRefs.current[item.id] = ref}
          renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
          renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
          friction={2}
          leftThreshold={80}
          rightThreshold={80}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CleanerViewTask', { task: item })}
          >
            <View style={styles.taskCard}>
              <LinearGradient
                colors={[colors.pureWhite, colors.pearl]}
                style={styles.cardGradient}
              >
                {/* Priority Indicator */}
                <View style={[styles.priorityIndicator, { backgroundColor: severityColor }]} />
                
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <Animated.View 
                      style={[
                        styles.iconContainer, 
                        { 
                          backgroundColor: severityColor + '20',
                          transform: [
                            {
                              translateY: leafFloat.interpolate({
                                inputRange: [-1, 1],
                                outputRange: [-3, 3],
                              }),
                            },
                          ],
                        }
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name="leaf" 
                        size={24} 
                        color={severityColor} 
                      />
                    </Animated.View>
                    <View style={styles.headerInfo}>
                      <Text style={styles.taskTitle}>Cleaning Task</Text>
                      <View style={styles.metaInfo}>
                        <View style={[styles.severityBadge, { backgroundColor: severityColor + '15' }]}>
                          <Text style={[styles.severityText, { color: severityColor }]}>
                            {item.severity || 'Medium'}
                          </Text>
                        </View>
                        <Text style={styles.timeText}>{formatTimeAgo(item.timestamp)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.priorityScore}>
                    <Text style={styles.priorityNumber}>{item.priorityScore || 5}</Text>
                    <Text style={styles.priorityLabel}>Priority</Text>
                  </View>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {item.description || item.title || 'Cleaning task reported requiring attention'}
                  </Text>
                  
                  {/* Location */}
                  <View style={styles.locationContainer}>
                    <MaterialIcons name="location-on" size={16} color={colors.emerald} />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {item.address || 'Bengaluru, Karnataka'}
                    </Text>
                  </View>

                  {/* Task Details */}
                  <View style={styles.taskDetails}>
                    {item.wasteType && (
                      <View style={styles.detailTag}>
                        <MaterialCommunityIcons name="trash-can" size={14} color={colors.textLight} />
                        <Text style={styles.detailTagText}>{item.wasteType}</Text>
                      </View>
                    )}
                    {item.area && (
                      <View style={styles.detailTag}>
                        <MaterialIcons name="square-foot" size={14} color={colors.textLight} />
                        <Text style={styles.detailTagText}>{item.area}</Text>
                      </View>
                    )}
                  </View>

                  {/* Media Indicators */}
                  <View style={styles.mediaIndicators}>
                    {item.hasPhoto && (
                      <View style={styles.mediaTag}>
                        <MaterialIcons name="photo-camera" size={14} color={colors.textLight} />
                        <Text style={styles.mediaTagText}>Photo</Text>
                      </View>
                    )}
                    {item.hasVideo && (
                      <View style={styles.mediaTag}>
                        <MaterialIcons name="videocam" size={14} color={colors.textLight} />
                        <Text style={styles.mediaTagText}>Video</Text>
                      </View>
                    )}
                    {item.hasAudio && (
                      <View style={styles.mediaTag}>
                        <MaterialIcons name="mic" size={14} color={colors.textLight} />
                        <Text style={styles.mediaTagText}>Audio</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.responseTime}>
                    <Feather name="clock" size={14} color={colors.emerald} />
                    <Text style={styles.responseTimeText}>
                      {item.responseTime || 'Within 2 hours'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textLight} />
                </View>

                {/* Sparkle Effect */}
                <Animated.View
                  style={[
                    styles.sparkle,
                    {
                      opacity: sparkleAnim,
                      transform: [
                        {
                          scale: sparkleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="sparkles" size={20} color={colors.emerald} />
                </Animated.View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </Swipeable>
      </Animatable.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Animatable.View animation="bounceIn" style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[colors.emerald + '20', colors.green + '10']}
          style={styles.emptyIconGradient}
        >
          <MaterialCommunityIcons name="leaf-circle" size={80} color={colors.emerald} />
        </LinearGradient>
      </Animatable.View>
      <Text style={styles.emptyTitle}>All Clean!</Text>
      <Text style={styles.emptyText}>
        No pending cleaning tasks in your assigned areas
      </Text>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.errorState}>
      <MaterialIcons name="error-outline" size={60} color={colors.danger} />
      <Text style={styles.errorTitle}>Connection Error</Text>
      <Text style={styles.errorText}>{error || 'Unable to load tasks'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadTasks}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.pureWhite, colors.pearl, colors.cream]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.pureWhite, colors.pearl, colors.cream]}
          style={StyleSheet.absoluteFillObject}
        />
        <ErrorState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.pureWhite, colors.pearl, colors.cream]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated Background Elements */}
      <Animated.View
        style={[
          styles.leafGlow,
          {
            opacity: sparkleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.3],
            }),
          },
        ]}
      />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <View style={styles.backButtonCard}>
            <MaterialIcons name="arrow-back" size={24} color={colors.charcoal} />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Pending Tasks</Text>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Add filter functionality
          }}
        >
          <View style={styles.filterButtonCard}>
            <MaterialIcons name="filter-list" size={24} color={colors.green} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Stats Bar */}
      <Animated.View
        style={[
          styles.statsBar,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {tasks.filter(t => t.severity === 'Critical').length}
          </Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {tasks.filter(t => t.severity === 'High').length}
          </Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
      </Animated.View>

      {/* Task List */}
      <Animated.View
        style={[
          styles.listContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id || item.key?.toString()}
          renderItem={renderTaskCard}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.green}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pureWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textLight,
  },
  leafGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.emerald,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 48,
    height: 48,
  },
  backButtonCard: {
    width: 48,
    height: 48,
    backgroundColor: colors.pureWhite,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
  },
  filterButtonCard: {
    width: 48,
    height: 48,
    backgroundColor: colors.pureWhite,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.pureWhite,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.green,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '400',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.lightGray,
    marginHorizontal: 16,
  },
  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  // Task Card
  taskCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  cardGradient: {
    padding: 20,
    position: 'relative',
  },
  priorityIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: colors.textLight,
  },
  priorityScore: {
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: 10,
  },
  priorityNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.green,
  },
  priorityLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  cardContent: {
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 6,
    flex: 1,
  },
  taskDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 4,
  },
  detailTagText: {
    fontSize: 12,
    color: colors.forest,
    marginLeft: 4,
    fontWeight: '500',
  },
  mediaIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mediaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 4,
  },
  mediaTagText: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responseTimeText: {
    fontSize: 13,
    color: colors.emerald,
    marginLeft: 6,
    fontWeight: '500',
  },
  sparkle: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  // Swipeable Actions
  leftActions: {
    flex: 1,
    marginBottom: 16,
    marginLeft: 20,
  },
  rightActions: {
    flex: 1,
    marginBottom: 16,
    marginRight: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  acceptAction: {
    marginLeft: 12,
  },
  rejectAction: {
    marginRight: 12,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    fontWeight: '300',
  },
  // Error State
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.green,
    borderRadius: 20,
  },
  retryButtonText: {
    color: colors.pureWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AcceptReject;