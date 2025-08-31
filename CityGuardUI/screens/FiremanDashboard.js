// screens/FiremanDashboard.js
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
import NavOptionsFireMan from '../components/NavOptionsFireMan';
import ChartFire from '../components/ChartFire';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const colors = {
  // Fire Theme Colors
  primary: '#DC2626', // Fire Red
  primaryLight: '#EF4444',
  primaryDark: '#B91C1C',
  accent: '#F97316', // Orange
  accentLight: '#FB923C',
  
  // Background colors
  background: '#FFF5F5',
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
  primaryGradient: ['#DC2626', '#F97316'],
  backgroundGradient: ['#FFF5F5', '#FEF3C7', '#FEE2E2'],
  glassGradient: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'],
  emergencyGradient: ['#EF4444', '#DC2626', '#B91C1C'],
};

const FiremanDashboard = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
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
  const emergencyPulse = useRef(new Animated.Value(1)).current;
  const fireFlicker = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const statsAnimations = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  
  // Fire particles
  const fireParticles = useRef([...Array(15)].map(() => ({
    x: new Animated.Value(Math.random() * screenWidth),
    y: new Animated.Value(screenHeight + 50),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(Math.random() * 0.5 + 0.5),
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
        if (parsedProfile.userType === USER_TYPES.FIREMAN) {
          setUserProfile(parsedProfile);
        }
      }
      
      // Load fresh data from Firebase
      try {
        const profile = await getCurrentUserProfile();
        if (profile && profile.userType === USER_TYPES.FIREMAN) {
          setUserProfile(profile);
          // Cache the profile
          await AsyncStorage.setItem("userProfile", JSON.stringify(profile));
        } else if (!profile && !cachedProfile) {
          // If no profile from Firebase and no cache, try direct Firestore
          const userDoc = await getDoc(doc(db, 'users', storedUserId));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() };
            if (userData.userType === USER_TYPES.FIREMAN) {
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
          emergenciesResponded: 0,
          activeEmergencies: 0,
          responseRate: 0,
          totalEmergenciesAssigned: 0
        });
      }
      
      // Setup emergency listeners
      setupEmergencyListeners(storedUserId);
      
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

  const setupEmergencyListeners = (userIdParam) => {
    const currentUserId = userIdParam || userId;
    if (!currentUserId) return;

    try {
      // Listen for unassigned fire emergencies
      const unassignedQuery = query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'fire'),
        where('status', '==', 'pending'),
        orderBy('priorityScore', 'desc'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      // Listen for emergencies assigned to this fireman
      const assignedQuery = query(
        collection(db, 'citizenReports'),
        where('issueType', '==', 'fire'),
        where('assignedTo', '==', currentUserId),
        where('status', 'in', ['assigned', 'in_progress']),
        orderBy('timestamp', 'desc')
      );

      // Unassigned emergencies listener
      const unsubscribePending = onSnapshot(unassignedQuery, (snapshot) => {
        const emergencies = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          emergencies.push({ 
            id: doc.id, 
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
          });
        });
        if (isMounted.current) {
          setPendingEmergencies(emergencies);
        }
      }, (error) => {
        console.error("Error fetching pending emergencies:", error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.log("Index needs to be created for pending emergencies query");
          // Set empty array to prevent UI issues
          setPendingEmergencies([]);
        }
      });

      // Assigned emergencies listener with fallback
      const unsubscribeAssigned = onSnapshot(assignedQuery, (snapshot) => {
        const emergencies = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          emergencies.push({ 
            id: doc.id, 
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
          });
        });
        if (isMounted.current) {
          setActiveEmergencies(emergencies);
        }
      }, (error) => {
        console.error("Error fetching assigned emergencies:", error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.log("Index needs to be created, using fallback query");
          
          // Fallback: Try simpler query
          const fallbackQuery = query(
            collection(db, 'citizenReports'),
            where('assignedTo', '==', currentUserId),
            limit(20)
          );
          
          const unsubscribeFallback = onSnapshot(fallbackQuery, (snapshot) => {
            const emergencies = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.issueType === 'fire' && 
                  (data.status === 'assigned' || data.status === 'in_progress')) {
                emergencies.push({ 
                  id: doc.id, 
                  ...data,
                  timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp
                });
              }
            });
            emergencies.sort((a, b) => {
              const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp || 0);
              const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp || 0);
              return timeB - timeA;
            });
            if (isMounted.current) {
              setActiveEmergencies(emergencies);
            }
          }, (fallbackError) => {
            console.error("Fallback query also failed:", fallbackError);
            setActiveEmergencies([]);
          });
          
          unsubscribers.current.push(unsubscribeFallback);
        }
      });

      unsubscribers.current.push(unsubscribePending);
      unsubscribers.current.push(unsubscribeAssigned);
      
    } catch (error) {
      console.error("Error setting up listeners:", error);
      setPendingEmergencies([]);
      setActiveEmergencies([]);
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

    // Emergency pulse for critical alerts
    Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyPulse, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(emergencyPulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fire flicker effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(fireFlicker, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fireFlicker, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fireFlicker, {
          toValue: 1,
          duration: 200,
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

    // Fire particles animation
    fireParticles.forEach((particle, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: -100,
              duration: 4000 + Math.random() * 2000,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(particle.x, {
              toValue: particle.x._value + (Math.random() - 0.5) * 100,
              duration: 4000 + Math.random() * 2000,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 0.8,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 2000,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: screenHeight + 50,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(particle.x, {
              toValue: Math.random() * screenWidth,
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

  const handleEmergencyPress = (emergency) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('FiremanViewTask', { task: emergency });
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

  const hasCriticalEmergency = pendingEmergencies.some(e => e.severity === 'Critical') || 
                               activeEmergencies.some(e => e.severity === 'Critical');

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
              outputRange: [0.15, 0.35],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.3],
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
              outputRange: [0.35, 0.15],
            }),
          },
        ]} 
      />

      {/* Fire Particles */}
      {fireParticles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.fireParticle,
            {
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
              ],
              opacity: particle.opacity,
            },
          ]}
        />
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
                {userProfile?.rank || 'Firefighter'} {userProfile?.firstName || userProfile?.username || 'Hero'}
              </Text>
              <View style={styles.badgeContainer}>
                <LinearGradient
                  colors={colors.primaryGradient}
                  style={styles.badgeGradient}
                >
                  <FontAwesome5 name="fire-alt" size={14} color="#FFF" />
                  <Text style={styles.badgeText}>
                    Station #{userProfile?.stationNumber || 'XX'}
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

          {/* Emergency Alert Card */}
          {hasCriticalEmergency && (
            <Animated.View
              style={[
                styles.emergencyAlert,
                {
                  transform: [{ scale: emergencyPulse }],
                },
              ]}
            >
              <LinearGradient
                colors={colors.emergencyGradient}
                style={styles.emergencyAlertGradient}
              >
                <Animated.View
                  style={[
                    styles.emergencyIcon,
                    {
                      transform: [{ scale: fireFlicker }],
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="fire-alert" size={32} color="#FFF" />
                </Animated.View>
                <View style={styles.emergencyTextContainer}>
                  <Text style={styles.emergencyTitle}>EMERGENCY ALERT</Text>
                  <Text style={styles.emergencySubtitle}>
                    Critical fire incident requires immediate response
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.emergencyButton}
                  onPress={() => {
                    const criticalEmergency = pendingEmergencies.find(e => e.severity === 'Critical') || 
                                            activeEmergencies.find(e => e.severity === 'Critical');
                    if (criticalEmergency) {
                      handleEmergencyPress(criticalEmergency);
                    }
                  }}
                >
                  <Text style={styles.emergencyButtonText}>RESPOND</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          )}

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
              colors={[colors.primary, colors.accent]}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroTitle}>On Duty</Text>
                  <Text style={styles.heroSubtitle}>
                    {userProfile?.unit || 'Engine Company'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.heroButton}
                    onPress={() => navigation.navigate('MapViewFireMan')}
                  >
                    <Text style={styles.heroButtonText}>View Coverage Area</Text>
                    <MaterialIcons name="map" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.heroImageContainer}>
                  <MaterialCommunityIcons name="fire-truck" size={80} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Chart Section */}
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Response Analytics</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>Details →</Text>
              </TouchableOpacity>
            </View>
            <BlurView intensity={90} tint="light" style={styles.chartCard}>
              <ChartFire />
            </BlurView>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              value={userStats?.emergenciesResponded || 0}
              label="Responses"
              icon="fire-extinguisher"
              color={colors.success}
              index={0}
            />
            <StatCard
              value={userStats?.activeEmergencies || 0}
              label="Active Calls"
              icon="fire-truck"
              color={colors.danger}
              index={1}
            />
            <StatCard
              value={userStats?.responseRate ? `${userStats.responseRate}%` : "0%"}
              label="Response Rate"
              icon="speedometer"
              color={colors.accent}
              index={2}
            />
            <StatCard
              value={userStats?.totalEmergenciesAssigned || 0}
              label="Total Assigned"
              icon="clipboard-list"
              color={colors.info}
              index={3}
            />
          </View>

          {/* Active Emergencies Section */}
          {activeEmergencies.length > 0 && (
            <View style={styles.emergenciesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Active Calls</Text>
                <TouchableOpacity onPress={() => navigation.navigate('FieldTasks')}>
                  <Text style={styles.viewAllText}>View all →</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emergenciesScrollContent}
              >
                {activeEmergencies.map((emergency, index) => (
                  <TouchableOpacity
                    key={emergency.id}
                    style={styles.emergencyCard}
                    activeOpacity={0.8}
                    onPress={() => handleEmergencyPress(emergency)}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.emergencyGradient}
                    >
                      <View style={styles.emergencyHeader}>
                        <MaterialCommunityIcons 
                          name="fire" 
                          size={20} 
                          color="#FFF" 
                        />
                        <Text style={styles.emergencyStatus}>
                          {emergency.status?.toUpperCase() || 'ASSIGNED'}
                        </Text>
                      </View>
                      <Text style={styles.emergencyType} numberOfLines={2}>
                        {emergency.description || 'Fire emergency reported'}
                      </Text>
                      <Text style={styles.emergencyLocation} numberOfLines={1}>
                        {emergency.address || 'Location'}
                      </Text>
                      <Text style={styles.emergencyTime}>
                        {formatTimeAgo(emergency.timestamp)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Pending Emergencies */}
          <View style={styles.emergenciesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Fire Reports</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AcceptRejectFiremen')}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>
            
            {pendingEmergencies.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emergenciesScrollContent}
              >
                {pendingEmergencies.slice(0, 5).map((emergency, index) => (
                  <TouchableOpacity
                    key={emergency.id}
                    style={styles.emergencyCard}
                    activeOpacity={0.8}
                    onPress={() => handleEmergencyPress(emergency)}
                  >
                    <LinearGradient
                      colors={
                        emergency.severity === 'Critical' 
                          ? colors.emergencyGradient
                          : emergency.severity === 'High'
                          ? ['#f59e0b', '#d97706'] 
                          : ['#3b82f6', '#2563eb']
                      }
                      style={[
                        styles.emergencyGradient,
                        emergency.severity === 'Critical' && styles.criticalEmergency
                      ]}
                    >
                      <View style={styles.emergencyHeader}>
                        <MaterialIcons 
                          name="local-fire-department" 
                          size={20} 
                          color="#FFF" 
                        />
                        <Text style={styles.emergencyStatus}>
                          {emergency.severity || 'MEDIUM'}
                        </Text>
                      </View>
                      <Text style={styles.emergencyType} numberOfLines={2}>
                        {emergency.description || 'Fire hazard reported'}
                      </Text>
                      <Text style={styles.emergencyLocation} numberOfLines={1}>
                        {emergency.address || 'Location'}
                      </Text>
                      <Text style={styles.emergencyTime}>
                        {formatTimeAgo(emergency.timestamp)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noEmergenciesContainer}>
                <BlurView intensity={90} tint="light" style={styles.noEmergenciesCard}>
                  <MaterialCommunityIcons 
                    name="fire-off" 
                    size={48} 
                    color={colors.textLight} 
                  />
                  <Text style={styles.noEmergenciesTitle}>All Clear</Text>
                  <Text style={styles.noEmergenciesText}>
                    No pending fire emergencies in your area
                  </Text>
                </BlurView>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          {/* <View style={styles.navSection}>
            <NavOptionsFireMan />
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
  fireParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
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
  // Emergency Alert
  emergencyAlert: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  emergencyAlertGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  emergencyIcon: {
    marginRight: 12,
  },
  emergencyTextContainer: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  emergencySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  emergencyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emergencyButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  // Emergencies Section
  emergenciesSection: {
    marginTop: 24,
  },
  emergenciesScrollContent: {
    paddingHorizontal: 20,
  },
  emergencyCard: {
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
  emergencyGradient: {
    padding: 16,
    minHeight: 140,
  },
  criticalEmergency: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  emergencyStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emergencyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  emergencyLocation: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  emergencyTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  noEmergenciesContainer: {
    padding: 20,
  },
  noEmergenciesCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  noEmergenciesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  noEmergenciesText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  navSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
});

export default FiremanDashboard;