// screens/CleanerDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
  Image,
  Easing,
  Vibration,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  or,
} from 'firebase/firestore';
import { db } from '../firebase/authConfig';
import { 
  getCurrentUserProfile, 
  getUserStatistics,
  signOutUser,
  USER_TYPES 
} from '../firebase/authConfig';
import NavOptions from '../components/NavOptions';
import ChartCleaner from '../components/ChartCleaner';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const colors = {
  // Cleaner Theme Colors
  primary: '#22C55E', // Green
  primaryLight: '#4ADE80',
  primaryDark: '#16A34A',
  accent: '#10B981', // Emerald
  accentLight: '#34D399',
  
  // Background colors
  background: '#F0FDF4',
  surface: '#FFFFFF',
  
  // Text colors
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Gradients
  primaryGradient: ['#22C55E', '#10B981'],
  backgroundGradient: ['#F0FDF4', '#ECFDF5', '#E6FFFA'],
  glassGradient: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'],
  cleanGradient: ['#4ADE80', '#22C55E', '#16A34A'],
};

const CleanerDashboard = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const isMounted = useRef(true);
  const unsubscribers = useRef([]);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const leafFloat = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const statsAnimations = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  
  // Leaf particles
  const leafParticles = useRef([...Array(10)].map(() => ({
    x: new Animated.Value(Math.random() * screenWidth),
    y: new Animated.Value(-50),
    rotate: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    isMounted.current = true;
    loadUserData();
    startContinuousAnimations();
    
    return () => {
      isMounted.current = false;
      // Clean up all listeners
      unsubscribers.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (userProfile && !loading) {
      animateEntrance();
    }
  }, [userProfile, loading]);

  const loadUserData = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem("userId");
      if (!storedUserId) {
        Alert.alert("Error", "User not found. Please sign in again.");
        navigation.navigate("SignInScreen");
        return;
      }
      
      setUserId(storedUserId);
      
      // Try to load cached profile first for faster UI
      const cachedProfile = await AsyncStorage.getItem("userProfile");
      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile);
        if (parsedProfile.userType === USER_TYPES.CLEANER) {
          setUserProfile(parsedProfile);
        }
      }
      
      // Load fresh data from Firebase
      try {
        const profile = await getCurrentUserProfile();
        if (profile && profile.userType === USER_TYPES.CLEANER) {
          setUserProfile(profile);
          // Cache the profile
          await AsyncStorage.setItem("userProfile", JSON.stringify(profile));
        } else if (!profile && !cachedProfile) {
          // If no profile from Firebase and no cache, try direct Firestore
          const userDoc = await getDoc(doc(db, 'users', storedUserId));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() };
            if (userData.userType === USER_TYPES.CLEANER) {
              setUserProfile(userData);
              await AsyncStorage.setItem("userProfile", JSON.stringify(userData));
            } else {
              Alert.alert("Error", "Invalid user type");
              navigation.navigate("SignInScreen");
              return;
            }
          } else {
            Alert.alert("Error", "User profile not found");
            navigation.navigate("SignInScreen");
            return;
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        // If Firebase fails but we have cached data, continue with cached
        if (!cachedProfile) {
          Alert.alert("Error", "Failed to load user profile");
          navigation.navigate("SignInScreen");
          return;
        }
      }
      
      // Load user statistics
      try {
        const stats = await getUserStatistics(storedUserId);
        if (isMounted.current) {
          setUserStats(stats);
        }
      } catch (error) {
        console.error("Error loading stats:", error);
        // Set default stats if loading fails
        setUserStats({
          tasksCompleted: 0,
          activeTasks: 0,
          completionRate: 0,
          totalTasksAssigned: 0
        });
      }
      
      // Setup task listeners
      setupTaskListeners(storedUserId);
      
    } catch (error) {
      console.error("Error in loadUserData:", error);
      Alert.alert("Error", "Failed to load user data");
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const setupTaskListeners = (userIdParam) => {
    const currentUserId = userIdParam || userId;
    if (!currentUserId) return;

    try {
      // Listen for unassigned cleaning tasks
      const unassignedQuery = query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'cleaning'),
        where('status', '==', 'pending'),
        orderBy('priorityScore', 'desc'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      // Listen for tasks assigned to this cleaner
      const assignedQuery = query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'cleaning'),
        where('assignedTo', '==', currentUserId),
        where('status', 'in', ['assigned', 'in_progress']),
        orderBy('timestamp', 'desc')
      );

      // Unassigned tasks listener
      const unsubscribePending = onSnapshot(unassignedQuery, (snapshot) => {
        const tasks = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          tasks.push({ 
            id: doc.id, 
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
          });
        });
        if (isMounted.current) {
          setPendingTasks(tasks);
        }
      }, (error) => {
        console.error("Error fetching pending tasks:", error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.log("Index needs to be created for pending tasks query");
          // Set empty array to prevent UI issues
          setPendingTasks([]);
        }
      });

      // Assigned tasks listener with fallback
      const unsubscribeAssigned = onSnapshot(assignedQuery, (snapshot) => {
        const tasks = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          tasks.push({ 
            id: doc.id, 
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
          });
        });
        if (isMounted.current) {
          setActiveTasks(tasks);
        }
      }, (error) => {
        console.error("Error fetching assigned tasks:", error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.log("Index needs to be created, using fallback query");
          
          // Fallback: Try simpler query
          const fallbackQuery = query(
            collection(db, 'citizenReports'),
            where('assignedTo', '==', currentUserId),
            limit(20)
          );
          
          const unsubscribeFallback = onSnapshot(fallbackQuery, (snapshot) => {
            const tasks = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.issueType === 'cleaning' && 
                  (data.status === 'assigned' || data.status === 'in_progress')) {
                tasks.push({ 
                  id: doc.id, 
                  ...data,
                  timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
                });
              }
            });
            tasks.sort((a, b) => {
              const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp || 0);
              const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp || 0);
              return timeB - timeA;
            });
            if (isMounted.current) {
              setActiveTasks(tasks);
            }
          }, (fallbackError) => {
            console.error("Fallback query also failed:", fallbackError);
            setActiveTasks([]);
          });
          
          unsubscribers.current.push(unsubscribeFallback);
        }
      });

      unsubscribers.current.push(unsubscribePending);
      unsubscribers.current.push(unsubscribeAssigned);
      
    } catch (error) {
      console.error("Error setting up listeners:", error);
      setPendingTasks([]);
      setActiveTasks([]);
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
    ]).start();

    // Animate stats cards
    statsAnimations.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(200 + index * 100),
        Animated.spring(anim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const startContinuousAnimations = () => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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

    // Leaf floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(leafFloat, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(leafFloat, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
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

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Leaf particles animation
    leafParticles.forEach((particle, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 500),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: screenHeight + 100,
              duration: 10000 + Math.random() * 5000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(particle.x, {
              toValue: particle.x._value + (Math.random() - 0.5) * 200,
              duration: 10000 + Math.random() * 5000,
              useNativeDriver: true,
            }),
            Animated.timing(particle.rotate, {
              toValue: 360,
              duration: 10000 + Math.random() * 5000,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 0.7,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 8000,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: -50,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(particle.x, {
              toValue: Math.random() * screenWidth,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(particle.rotate, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadUserData();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userId', 'userProfile']);
              await signOutUser();
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignInScreen' }],
              });
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleTaskPress = (task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CleanerViewTask', { task });
  };

  const StatCard = ({ stat, value, label, icon, color, index }) => (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: statsAnimations[index],
          transform: [
            { scale: statsAnimations[index] },
            {
              translateY: statsAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9}>
        <BlurView intensity={90} tint="light" style={styles.statCardBlur}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
            style={styles.statCardGradient}
          >
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
              <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
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
              <MaterialCommunityIcons name="sparkles" size={16} color={colors.accent} />
            </Animated.View>
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={colors.backgroundGradient}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={colors.backgroundGradient}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Animated Background Elements */}
      <Animated.View 
        style={[
          styles.backgroundCircle1,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.3],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              },
            ],
          },
        ]} 
      />
      <Animated.View 
        style={[
          styles.backgroundCircle2,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.1],
            }),
          },
        ]} 
      />

      {/* Shimmer Overlay */}
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            opacity: 0.03,
            transform: [
              {
                translateX: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-screenWidth, screenWidth],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.surface, colors.accent, colors.surface]}
          style={styles.shimmerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Leaf Particles */}
      {leafParticles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.leafParticle,
            {
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                {
                  rotate: particle.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              opacity: particle.opacity,
            },
          ]}
        >
          <MaterialCommunityIcons name="leaf" size={20} color={colors.primary} />
        </Animated.View>
      ))}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>
                {getGreeting()},
              </Text>
              <Text style={styles.userName}>
                {userProfile?.firstName || userProfile?.username || 'Cleaner'}
              </Text>
              <View style={styles.badgeContainer}>
                <LinearGradient
                  colors={colors.primaryGradient}
                  style={styles.badgeGradient}
                >
                  <MaterialCommunityIcons name="broom" size={14} color="#FFF" />
                  <Text style={styles.badgeText}>
                    Zone {userProfile?.assignedZone || 'A'}
                  </Text>
                </LinearGradient>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              activeOpacity={0.7}
            >
              <BlurView intensity={90} tint="light" style={styles.logoutBlur}>
                <MaterialIcons name="power-settings-new" size={24} color={colors.danger} />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Hero Card */}
          <Animated.View
            style={[
              styles.heroCard,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={colors.cleanGradient}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroTitle}>Keep it Clean!</Text>
                  <Text style={styles.heroSubtitle}>
                    {userProfile?.shift === 'morning' ? 'Morning Shift' : 
                     userProfile?.shift === 'evening' ? 'Evening Shift' : 
                     'Night Shift'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.heroButton}
                    onPress={() => navigation.navigate('MapView')}
                  >
                    <Text style={styles.heroButtonText}>View Area Map</Text>
                    <MaterialIcons name="map" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <Animated.View
                  style={[
                    styles.heroImageContainer,
                    {
                      transform: [
                        {
                          translateY: leafFloat.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -10],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="recycle" size={80} color="#FFF" />
                </Animated.View>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>
                    {userStats?.completionRate || '0'}%
                  </Text>
                  <Text style={styles.heroStatLabel}>Completion Rate</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>
                    {userStats?.rating || '0'}/5
                  </Text>
                  <Text style={styles.heroStatLabel}>Rating</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Chart Section */}
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance Overview</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>Details →</Text>
              </TouchableOpacity>
            </View>
            <BlurView intensity={90} tint="light" style={styles.chartCard}>
              <ChartCleaner />
            </BlurView>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              value={userStats?.tasksCompleted || 0}
              label="Completed"
              icon="check-circle"
              color={colors.success}
              index={0}
            />
            <StatCard
              value={userStats?.activeTasks || 0}
              label="Active Tasks"
              icon="progress-clock"
              color={colors.warning}
              index={1}
            />
            <StatCard
              value={userStats?.completionRate ? `${userStats.completionRate}%` : "0%"}
              label="Success Rate"
              icon="chart-line"
              color={colors.accent}
              index={2}
            />
            <StatCard
              value={userStats?.totalTasksAssigned || 0}
              label="Total Assigned"
              icon="clipboard-list"
              color={colors.info}
              index={3}
            />
          </View>

          {/* Active Tasks Section */}
          {activeTasks.length > 0 && (
            <View style={styles.tasksSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Active Tasks</Text>
                <TouchableOpacity onPress={() => navigation.navigate('FieldTasks')}>
                  <Text style={styles.viewAllText}>View all →</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tasksScrollContent}
              >
                {activeTasks.map((task, index) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskCard}
                    activeOpacity={0.8}
                    onPress={() => handleTaskPress(task)}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.taskGradient}
                    >
                      <View style={styles.taskHeader}>
                        <MaterialCommunityIcons 
                          name="broom" 
                          size={20} 
                          color="#FFF" 
                        />
                        <Text style={styles.taskStatus}>
                          {task.status?.toUpperCase() || 'ASSIGNED'}
                        </Text>
                      </View>
                      <Text style={styles.taskType} numberOfLines={2}>
                        {task.description || 'Cleaning task'}
                      </Text>
                      <Text style={styles.taskLocation} numberOfLines={1}>
                        {task.address || 'Location'}
                      </Text>
                      <Text style={styles.taskTime}>
                        {formatTimeAgo(task.timestamp)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Pending Tasks */}
          <View style={styles.tasksSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Cleaning Reports</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AcceptReject')}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>
            
            {pendingTasks.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tasksScrollContent}
              >
                {pendingTasks.slice(0, 5).map((task, index) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskCard}
                    activeOpacity={0.8}
                    onPress={() => handleTaskPress(task)}
                  >
                    <LinearGradient
                      colors={
                        task.severity === 'Critical' 
                          ? ['#ef4444', '#dc2626']
                          : task.severity === 'High'
                          ? ['#f59e0b', '#d97706'] 
                          : ['#3b82f6', '#2563eb']
                      }
                      style={styles.taskGradient}
                    >
                      <View style={styles.taskHeader}>
                        <MaterialCommunityIcons 
                          name="alert-circle" 
                          size={20} 
                          color="#FFF" 
                        />
                        <Text style={styles.taskStatus}>
                          {task.severity || 'MEDIUM'}
                        </Text>
                      </View>
                      <Text style={styles.taskType} numberOfLines={2}>
                        {task.description || 'Cleaning required'}
                      </Text>
                      <Text style={styles.taskLocation} numberOfLines={1}>
                        {task.address || 'Location'}
                      </Text>
                      <Text style={styles.taskTime}>
                        {formatTimeAgo(task.timestamp)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noTasksContainer}>
                <BlurView intensity={90} tint="light" style={styles.noTasksCard}>
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={48} 
                    color={colors.textLight} 
                  />
                  <Text style={styles.noTasksTitle}>All Clean!</Text>
                  <Text style={styles.noTasksText}>
                    No pending cleaning tasks in your area
                  </Text>
                </BlurView>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          {/* <View style={styles.navSection}>
            <NavOptions />
          </View> */}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  try {
    // Handle both Date objects and strings
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recently';
    
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);
    
    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    return 'Recently';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  // Background Elements
  backgroundCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
  },
  backgroundCircle2: {
    position: 'absolute',
    top: 200,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.accent,
  },
  shimmerOverlay: {
    position: "absolute",
    width: screenWidth * 2,
    height: screenHeight,
  },
  shimmerGradient: {
    flex: 1,
  },
  leafParticle: {
    position: 'absolute',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  logoutBlur: {
    flex: 1,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Hero Card
  heroCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  heroGradient: {
    borderRadius: 24,
    padding: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  heroImageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  // Chart Section
  chartSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginLeft: 20
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 10

  },
  chartCard: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginTop: 24,
    justifyContent: 'space-between',
  },
  statCard: {
    width: (screenWidth - 48) / 2,
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statCardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Tasks Section
  tasksSection: {
    marginTop: 24,
  },
  tasksScrollContent: {
    paddingHorizontal: 20,
  },
  taskCard: {
    width: 200,
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  taskGradient: {
    padding: 16,
    minHeight: 140,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  taskLocation: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  taskTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  noTasksContainer: {
    padding: 20,
  },
  noTasksCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  noTasksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  noTasksText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  navSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
});

export default CleanerDashboard;