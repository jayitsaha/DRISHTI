// screens/ProfilePage.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  PanResponder,
  Vibration,
  Easing,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { 
  getUserData, 
  subscribeToLeaderboard,
  USER_LEVELS
} from '../firebase/gamificationConfig';
import { 
  getCurrentUserProfile, 
  updateProfilePicture,
  getUserStatistics,
  USER_TYPES,
  signOutUser
} from '../firebase/authConfig';
import { db } from '../firebase/gamificationConfig';
import { updateDoc, doc } from 'firebase/firestore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { BADGES } from '../firebase/gamificationConfig';

const ProfilePage = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [displayedXp, setDisplayedXp] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const parallaxScroll = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const badgeScaleAnims = useRef([...Array(10)].map(() => new Animated.Value(0))).current;
  const statCountAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const profileImageScale = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const levelProgressAnim = useRef(new Animated.Value(0)).current;
  const xpCounterAnim = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const rippleAnims = useRef([...Array(3)].map(() => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;
  const isMounted = useRef(true);

  // Particle animations
  const particleAnims = useRef([...Array(20)].map(() => ({
    x: new Animated.Value(Math.random() * screenWidth),
    y: new Animated.Value(screenHeight + 50),
    opacity: new Animated.Value(0),
  }))).current;

  // 3D card rotation
  const cardRotateX = useRef(new Animated.Value(0)).current;
  const cardRotateY = useRef(new Animated.Value(0)).current;

  // Pan responder for 3D effect
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (isCardFlipped) return;
        const xPercentage = gestureState.dx / screenWidth;
        const yPercentage = gestureState.dy / screenHeight;
        Animated.parallel([
          Animated.spring(cardRotateY, { toValue: xPercentage * 25, useNativeDriver: false }),
          Animated.spring(cardRotateX, { toValue: -yPercentage * 25, useNativeDriver: false }),
        ]).start();
      },
      onPanResponderRelease: () => {
        Animated.parallel([
          Animated.spring(cardRotateX, { toValue: 0, friction: 7, useNativeDriver: false }),
          Animated.spring(cardRotateY, { toValue: 0, friction: 7, useNativeDriver: false }),
        ]).start();
      },
    })
  ).current;

  useEffect(() => {
    isMounted.current = true;
    loadUserData();
    startContinuousAnimations();
    
    const unsubscribe = subscribeToLeaderboard('coins', (data) => {
      if (isMounted.current) {
        const sortedData = data.sort((a, b) => b.coins - a.coins);
        setLeaderboard(sortedData);
        AsyncStorage.getItem("userId").then(userId => {
          if (isMounted.current && userId) {
            const rank = sortedData.findIndex(item => item.userId === userId) + 1;
            setUserRank(rank > 0 ? rank : null);
          }
        });
      }
    });

    xpCounterAnim.addListener(({ value }) => {
      setDisplayedXp(Math.floor(value));
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
      xpCounterAnim.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    if (userData && userProfile && !loading) {
      animateEntrance();
    }
  }, [userData, userProfile, loading]);

  const startContinuousAnimations = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatingAnim, { toValue: -15, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(floatingAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    
    particleAnims.forEach((particle, index) => {
      Animated.loop(Animated.sequence([
        Animated.delay(index * 200),
        Animated.parallel([
          Animated.timing(particle.y, { toValue: -50, duration: 8000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(particle.opacity, { toValue: 0.7, duration: 2000, useNativeDriver: true }),
            Animated.timing(particle.opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(particle.y, { toValue: screenHeight + 50, duration: 0, useNativeDriver: true }),
          Animated.timing(particle.x, { toValue: Math.random() * screenWidth, duration: 0, useNativeDriver: true }),
        ]),
      ])).start();
    });
  };

  const animateEntrance = () => {
    const nativeAnimations = [
      Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 20, friction: 7, useNativeDriver: true }),
    ];
    Animated.parallel(nativeAnimations).start();

    // if (userData) {
    //   // Calculate XP for current level
    //   const level = userData.level || 1;
    //   const xpForLevel = (level - 1) * 100;
    //   const currentXp = userData.totalCoinsEarned ? Math.min(userData.totalCoinsEarned - xpForLevel, 100) : 0;
      
    //   const progress = currentXp / 100;
    //   Animated.timing(levelProgressAnim, {
    //     toValue: progress,
    //     duration: 1500,
    //     delay: 500,
    //     easing: Easing.out(Easing.cubic),
    //     useNativeDriver: false,
    //   }).start();
      
    //   Animated.timing(xpCounterAnim, {
    //     toValue: currentXp,
    //     duration: 1500,
    //     delay: 500,
    //     easing: Easing.out(Easing.cubic),
    //     useNativeDriver: false,
    //   }).start();
    // }

    badgeScaleAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 100 + 500),
        Animated.spring(anim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
    });
    
    statCountAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(800 + index * 200),
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: false }),
      ]).start();
    });
  };

  const triggerRipple = () => {
    rippleAnims.forEach((ripple, index) => {
      ripple.scale.setValue(0);
      ripple.opacity.setValue(0.5);
      Animated.sequence([
        Animated.delay(index * 150),
        Animated.parallel([
          Animated.timing(ripple.scale, { toValue: 3, duration: 1000, useNativeDriver: true }),
          Animated.timing(ripple.opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]),
      ]).start();
    });
  };

  const loadUserData = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "User not found. Please sign in again.");
        navigation.navigate("SignInScreen");
        return;
      }

      // Load user profile from Firebase Auth
      const profile = await getCurrentUserProfile();
      if (!profile) {
        Alert.alert("Error", "Failed to load user profile.");
        return;
      }
      
      // Load user statistics
      const stats = await getUserStatistics(userId);
      
      // For pedestrians, load gamification data
      let gamificationData = null;
      if (profile.userType === USER_TYPES.PEDESTRIAN) {
        gamificationData = await getUserData(userId);
      }
      
      if (isMounted.current) {
        setUserProfile(profile);
        setUserStats(stats);
        setUserData(gamificationData || profile);
        
        // Calculate current level
        if (gamificationData) {
        const badgeCount = gamificationData.badges?.length || 0;
        const level = USER_LEVELS.find(l => badgeCount >= l.minBadges) || USER_LEVELS[0];
        setCurrentLevel(level);
        
        // Calculate XP based on reports and badges since last level
        const currentLevelIndex = USER_LEVELS.findIndex(l => l.level === (gamificationData.level || 1));
        const currentLevelData = USER_LEVELS[currentLevelIndex] || USER_LEVELS[0];
        const nextLevelData = USER_LEVELS[currentLevelIndex + 1];
        
        if (nextLevelData) {
          const badgesNeededForCurrentLevel = currentLevelData.minBadges;
          const badgesNeededForNextLevel = nextLevelData.minBadges;
          const badgesProgress = badgeCount - badgesNeededForCurrentLevel;
          const badgesRequired = badgesNeededForNextLevel - badgesNeededForCurrentLevel;
          
          // XP is percentage progress to next level
          const xpProgress = Math.min((badgesProgress / badgesRequired) * 100, 100);
          
          // Update the animated value
          Animated.timing(levelProgressAnim, {
            toValue: xpProgress / 100,
            duration: 1500,
            delay: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
          
          Animated.timing(xpCounterAnim, {
            toValue: Math.floor(xpProgress),
            duration: 1500,
            delay: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        } else {
          // Max level reached
          Animated.timing(levelProgressAnim, {
            toValue: 1,
            duration: 1500,
            delay: 500,
            useNativeDriver: false,
          }).start();
          
          Animated.timing(xpCounterAnim, {
            toValue: 100,
            duration: 1500,
            delay: 500,
            useNativeDriver: false,
          }).start();
        }
      }
        
        // Mark calendar dates for pedestrians
        if (gamificationData?.reportsSubmitted) {
          const marked = {};
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          gamificationData.reportsSubmitted.forEach(report => {
            if (report.timestamp) {
              // Handle both old format (Firestore timestamp) and new format (ISO string)
              const date = report.timestamp.seconds 
                ? new Date(report.timestamp.seconds * 1000)
                : new Date(report.timestamp);
              const dateStr = date.toISOString().split('T')[0];
              date.setHours(0, 0, 0, 0);
              marked[dateStr] = {
                selected: true,
                selectedColor: date.getTime() === today.getTime() ? '#f97316' : '#9333ea',
                selectedTextColor: '#fff',
              };
            }
          });
          setMarkedDates(marked);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      Alert.alert("Error", "Failed to load user data.");
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleProfilePictureUpdate = async () => {
    Vibration.vibrate(50);
    Animated.sequence([
      Animated.timing(profileImageScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(profileImageScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      
      if (!result.canceled && result.assets[0] && isMounted.current) {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          const { profilePicture } = await updateProfilePicture(userId, result.assets[0].uri);
          
          if (isMounted.current) {
            setUserProfile(prev => ({ ...prev, profilePicture }));
            triggerRipple();
          }
        }
      }
    } catch (error) {
      console.error("Error updating profile picture:", error);
      Alert.alert("Error", "Failed to update profile picture.");
    }
  };

  const handleCardFlip = () => {
    setIsCardFlipped(!isCardFlipped);
    Animated.spring(flipAnim, {
      toValue: isCardFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };


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
              await signOutUser();
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignInScreen' }],
              });
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        }
      ]
    );
  };

  const renderCardContent = (isBack = false) => {
    const glareRotate = cardRotateY.interpolate({
      inputRange: [-25, 25],
      outputRange: ['-20deg', '20deg'],
      extrapolate: 'clamp',
    });

    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = levelProgressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [circumference, 0]
    });

    if (isBack) {
      return (
        <>
          <View style={styles.cardBackContent}>
            <View style={styles.magneticStrip} />
            <View style={styles.qrCodeArea}>
              <Image 
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=userid-${userProfile?.userId || ''}` }} 
                style={styles.qrCode} 
              />
            </View>
            <Text style={styles.cardBackText}>ID: {userProfile?.userId || 'unknown'}</Text>
            <Text style={styles.cardBackText}>Member Since: {userProfile?.createdAt?.seconds ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString() : userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
            <Text style={styles.cardBackText}>Type: {userProfile?.userType?.toUpperCase() || 'USER'}</Text>
            <FontAwesome5 name="gem" size={24} color="rgba(255,255,255,0.7)" style={{ marginTop: 10 }} />
          </View>
        </>
      );
    }

    return (
      <>
        <Animated.View pointerEvents="none" style={[styles.holographicGlare, { transform: [{ rotate: glareRotate }] }]}>
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.3)', 'rgba(99, 102, 241, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: cardRotateX.interpolate({ inputRange: [-25, 25], outputRange: [-15, 15] }) }] }}>
          <TouchableOpacity onPress={handleProfilePictureUpdate} activeOpacity={0.9}>
            <View style={styles.profilePictureWrapper}>
              {userProfile?.userType === USER_TYPES.PEDESTRIAN && (
                <Svg width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute' }}>
                  <Defs>
                    <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor="#a855f7" stopOpacity="1" />
                      <Stop offset="1" stopColor="#f97316" stopOpacity="1" />
                    </SvgGradient>
                  </Defs>
                  <Circle cx="60" cy="60" r={radius} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="4" />
                  <AnimatedCircle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="url(#grad)"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </Svg>
              )}

              <Animated.View style={[styles.profilePictureContainer, { transform: [{ scale: profileImageScale }] }]}>
                {userProfile?.profilePicture ? (
                  <Image source={{ uri: userProfile.profilePicture }} style={styles.profilePicture} />
                ) : (
                  <LinearGradient colors={['#6366f1', '#a855f7']} style={styles.profilePicturePlaceholder}>
                    <MaterialIcons name="person" size={60} color="#FFF" />
                  </LinearGradient>
                )}
                {userProfile?.userType === USER_TYPES.PEDESTRIAN && userData?.level && (
                  <>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>{userData.level}</Text>
                    </View>
                    <View style={styles.xpTextContainer}>
                      <Text style={styles.xpText}>{displayedXp} / 100 XP</Text>
                    </View>
                  </>
                )}
              </Animated.View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: cardRotateX.interpolate({ inputRange: [-25, 25], outputRange: [-5, 5] }) }] }}>
          <Animated.Text style={[styles.userName, { transform: [{ scale: pulseAnim }] }]}>
            {userProfile?.firstName && userProfile?.lastName 
              ? `${userProfile.firstName} ${userProfile.lastName}`
              : userProfile?.username || 'User'} 
            <Text style={styles.verifiedBadge}> ✨</Text>
          </Animated.Text>
          <Text style={styles.userRole}>{userProfile?.userType?.replace('_', ' ').toUpperCase() || 'USER'}</Text>
        </Animated.View>

        {userProfile?.userType === USER_TYPES.PEDESTRIAN && (
          <Animated.View style={[styles.socialStats, { transform: [{ translateY: cardRotateX.interpolate({ inputRange: [-25, 25], outputRange: [5, -5] }) }] }]}>
            <TouchableOpacity activeOpacity={0.7} style={styles.socialStatItem}>
              <Text style={styles.socialStatNumber}>{userData?.following || 0}</Text>
              <Text style={styles.socialStatLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.socialDivider} />
            <TouchableOpacity activeOpacity={0.7} style={styles.socialStatItem}>
              <Text style={styles.socialStatNumber}>{userData?.followers || 0}</Text>
              <Text style={styles.socialStatLabel}>Followers</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </>
    );
  };

  const renderStatsContent = () => {
    if (userProfile?.userType === USER_TYPES.PEDESTRIAN) {
      return (
        <>
          <Text style={styles.statTitle}>Your Overall Progress</Text>
          <View style={styles.statRow}>
            <StatBox label="Reports Submitted" value={userData?.reportCount || 0} anim={statCountAnims[0]} />
            <StatBox label="Badges Earned" value={userData?.badges?.length || 0} anim={statCountAnims[1]} />
          </View>
          <View style={styles.statRow}>
            <StatBox label="Current Streak" value={`${userData?.currentStreak || 0} days`} anim={statCountAnims[2]} isText={true} />
            <StatBox label="Total Coins" value={userData?.totalCoinsEarned || 0} anim={statCountAnims[3]} />
          </View>
          <View style={styles.scoredPointsContainer}>
            <View style={styles.scoredPointsHeader}>
              <Text style={styles.scoredPointsLabel}>Available Coins</Text>
              <MaterialIcons name="info" size={20} color="#a855f7" />
            </View>
            <View style={styles.scoredPointsValue}>
              <Text style={styles.pointsNumber}>{userData?.coins || 0}</Text>
              <View style={styles.coinIcon}>
                <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.coinGradient}>
                  <FontAwesome5 name="coins" size={16} color="#FFF" />
                </LinearGradient>
              </View>
            </View>
          </View>
        </>
      );
    } else {
      // For service personnel
      return (
        <>
          <Text style={styles.statTitle}>Your Service Statistics</Text>
          {userStats && Object.entries(userStats).map(([key, value], index) => {
            if (index % 2 === 0) {
              const nextKey = Object.keys(userStats)[index + 1];
              return (
                <View key={key} style={styles.statRow}>
                  <StatBox 
                    label={key.replace(/([A-Z])/g, ' $1').trim()} 
                    value={value} 
                    anim={statCountAnims[index % 4]} 
                    isText={typeof value === 'string'}
                  />
                  {nextKey && (
                    <StatBox 
                      label={nextKey.replace(/([A-Z])/g, ' $1').trim()} 
                      value={userStats[nextKey]} 
                      anim={statCountAnims[(index + 1) % 4]} 
                      isText={typeof userStats[nextKey] === 'string'}
                    />
                  )}
                </View>
              );
            }
            return null;
          })}
        </>
      );
    }
  };

  const StatBox = ({ label, value, anim, isText = false }) => {
    const animValue = isText ? null : anim.interpolate({ inputRange: [0, 1], outputRange: [0, value] });
    return (
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>{label}</Text>
        {isText ? (
          <Animated.Text style={[styles.statValue, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>{value}</Animated.Text>
        ) : (
          <Animated.Text style={[styles.statValue, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            {animValue && animValue.interpolate ? Math.floor(animValue.__getValue()) : value}
          </Animated.Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#f0f4ff', '#e5ecff', '#faf5ff']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loadingBackgroundShape1} />
        <View style={styles.loadingBackgroundShape2} />
        <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <LinearGradient colors={['#6366f1', '#a855f7', '#ec4899']} style={styles.loadingGradient}>
            <ActivityIndicator size="large" color="#FFF" />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  const frontFlip = {
    transform: [{ rotateY: flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }]
  };
  const backFlip = {
    transform: [{ rotateY: flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }]
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#f0f4ff', '#e5ecff', '#faf5ff']} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[styles.backgroundShape1, { transform: [{ translateY: parallaxScroll.interpolate({ inputRange: [0, 300], outputRange: [0, -50], extrapolate: 'clamp' }) }] }]} />
      <Animated.View style={[styles.backgroundShape2, { transform: [{ translateY: parallaxScroll.interpolate({ inputRange: [0, 300], outputRange: [0, -80], extrapolate: 'clamp' }) }] }]} />
      <View style={styles.backgroundShape3} />

      {particleAnims.map((particle, index) => (
        <Animated.View key={index} style={[styles.particle, { transform: [{ translateX: particle.x }, { translateY: particle.y }], opacity: particle.opacity }]} />
      ))}

      <Animated.ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: parallaxScroll } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          <Animated.View style={[styles.header, { transform: [{ translateY: parallaxScroll.interpolate({ inputRange: [0, 100], outputRange: [0, -50], extrapolate: 'clamp' }) }] }]}>
            <TouchableOpacity style={styles.headerButton} onPress={() => { Vibration.vibrate(10); navigation.goBack(); }} activeOpacity={0.7}>
              <BlurView intensity={90} tint="light" style={styles.glassButton}>
                <MaterialIcons name="arrow-back" size={24} color="#333" />
              </BlurView>
            </TouchableOpacity>
            <MaskedView maskElement={<Text style={styles.headerTitle}>Profile</Text>}>
              <LinearGradient colors={['#6366f1', '#a855f7', '#ec4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={[styles.headerTitle, { opacity: 0 }]}>Profile</Text>
              </LinearGradient>
            </MaskedView>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerButton} activeOpacity={0.7} onPress={() => Vibration.vibrate(10)}>
                <BlurView intensity={90} tint="light" style={styles.glassButton}>
                  <MaterialIcons name="settings" size={24} color="#333" />
                </BlurView>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerButton, styles.logoutButton]} activeOpacity={0.7} onPress={handleLogout}>
                <BlurView intensity={90} tint="light" style={styles.glassButton}>
                  <MaterialIcons name="logout" size={24} color="#e53e3e" />
                </BlurView>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View>
            <Animated.View {...panResponder.panHandlers} style={[styles.profileCard, frontFlip, { backfaceVisibility: 'hidden' }]}>
              <BlurView intensity={95} tint="light" style={styles.glassCard}>
                <LinearGradient colors={['rgba(255, 255, 255, 0.2)', 'rgba(99, 102, 241, 0.1)', 'rgba(236, 72, 153, 0.1)']} style={styles.cardInnerGradient}>
                  {renderCardContent(false)}
                </LinearGradient>
                <TouchableOpacity style={styles.flipButton} onPress={handleCardFlip}>
                  <MaterialCommunityIcons name="rotate-3d-variant" size={24} color="rgba(0,0,0,0.5)" />
                </TouchableOpacity>
              </BlurView>
            </Animated.View>

            <Animated.View style={[styles.profileCard, backFlip, { backfaceVisibility: 'hidden', position: 'absolute', top: 0, left: 0, right: 0 }]}>
              <BlurView intensity={95} tint="dark" style={styles.glassCard}>
                <LinearGradient colors={['#2c3e50', '#34495e']} style={styles.cardInnerGradient}>
                  {renderCardContent(true)}
                </LinearGradient>
                <TouchableOpacity style={styles.flipButton} onPress={handleCardFlip}>
                  <MaterialCommunityIcons name="rotate-3d-variant" size={24} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
          </View>

          
          {/* Badges Section - Only for Pedestrians */}
        {userProfile?.userType === USER_TYPES.PEDESTRIAN && userData?.badges && userData.badges.length > 0 && (
        <View style={styles.badgesSection}>
            <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <TouchableOpacity onPress={() => { Vibration.vibrate(10); navigation.navigate('BadgesScreen'); }}>
                <Text style={styles.viewAllText}>View all →</Text>
            </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScrollContent}>
            {userData.badges.slice(0, 5).map((badge, index) => {
                const badgeInfo = BADGES[badge.id];
                if (!badgeInfo) return null;
                
                return (
                <Animated.View key={badge.id} style={[styles.badgeItem, { transform: [
                    { scale: badgeScaleAnims[index] || 1 },
                    { rotate: (badgeScaleAnims[index] || new Animated.Value(1)).interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-360deg', '0deg']
                    })}
                ]}]}>
                    <TouchableOpacity activeOpacity={0.8}>
                    <View style={styles.badgeContainer}>
                        {/* Check if badge was earned in last 24 hours */}
                        {badge.earnedAt && (() => {
                          const earnedDate = badge.earnedAt.seconds 
                            ? new Date(badge.earnedAt.seconds * 1000) 
                            : new Date(badge.earnedAt);
                          return new Date() - earnedDate < 86400000;
                        })() && (
                        <View style={styles.newBadgeIndicator}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                        )}
                        <LinearGradient 
                        colors={[badgeInfo.color || '#3b82f6', (badgeInfo.color || '#3b82f6') + 'DD']} 
                        style={styles.badgeGradient}
                        >
                        <View style={styles.badgeIconWrapper}>
                            <MaterialIcons name={badgeInfo.icon || 'star'} size={40} color="#FFF" />
                        </View>
                        </LinearGradient>
                        <Text style={styles.badgeName}>{badgeInfo.name}</Text>
                    </View>
                    </TouchableOpacity>
                </Animated.View>
                );
            })}
            </ScrollView>
        </View>
        )}

          <View style={styles.statsGrid}>
            <BlurView intensity={90} tint="light" style={styles.glassStatsCard}>
              <LinearGradient colors={['rgba(255, 255, 255, 0.9)', 'rgba(243, 232, 255, 0.4)']} style={styles.statCardGradient}>
                {renderStatsContent()}
              </LinearGradient>
            </BlurView>
          </View>

          {userProfile?.userType === USER_TYPES.PEDESTRIAN && leaderboard.length > 0 && (
            <View style={styles.leaderboardSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Leaderboard</Text>
                <TouchableOpacity onPress={() => { Vibration.vibrate(10); navigation.navigate('LeaderboardScreen'); }}>
                  <Text style={styles.viewAllText}>View all →</Text>
                </TouchableOpacity>
              </View>
              <BlurView intensity={90} tint="light" style={styles.glassLeaderboardCard}>
                {leaderboard.slice(0, 3).map((user, index) => {
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                  return (
                    <View key={user.userId} style={styles.leaderboardRow}>
                      <View style={styles.leaderboardRank}>
                        <FontAwesome5 name="crown" size={16} color={rankColors[index]} />
                        <Text style={[styles.leaderboardRankText, { color: rankColors[index] }]}>{index + 1}</Text>
                      </View>
                      <Image source={{ uri: user.profilePicture || `https://placehold.co/40x40/6366f1/FFF?text=${user.username.charAt(0)}` }} style={styles.leaderboardAvatar} />
                      <Text style={styles.leaderboardName}>{user.username}</Text>
                      <Text style={styles.leaderboardScore}>{user.coins} pts</Text>
                    </View>
                  );
                })}
                {userRank && userRank > 3 && (
                  <>
                    <View style={styles.leaderboardDivider} />
                    <View style={styles.leaderboardRow}>
                      <View style={[styles.leaderboardRank, styles.currentUserRank]}>
                        <Text style={[styles.leaderboardRankText, styles.currentUserRankText]}>{userRank}</Text>
                      </View>
                      <Image source={{ uri: userProfile.profilePicture || `https://placehold.co/40x40/a855f7/FFF?text=${userProfile.username.charAt(0)}` }} style={styles.leaderboardAvatar} />
                      <Text style={styles.leaderboardName}>{userProfile.username}</Text>
                      <Text style={styles.leaderboardScore}>{userData.coins} pts</Text>
                    </View>
                  </>
                )}
              </BlurView>
            </View>
          )}

          {userProfile?.userType === USER_TYPES.PEDESTRIAN && (
            <>
              <View style={styles.streakSection}>
                <BlurView intensity={90} tint="light" style={styles.glassStreakCard}>
                  <View style={styles.streakHeader}>
                    <Text style={styles.sectionTitleNoPadding}>Streak</Text>
                    <Animated.View style={[styles.fireIcon, { transform: [{ scale: pulseAnim }] }]}>
                      <MaterialCommunityIcons name="fire" size={40} color="#f97316" />
                    </Animated.View>
                  </View>
                  <View style={styles.streakContent}>
                    <Text style={styles.streakNumber}>{userData?.currentStreak || 0}</Text>
                    <Text style={styles.streakLabel}>Streak Days</Text>
                    <Text style={styles.streakMessage}>
                      {userData?.currentStreak >= userData?.longestStreak ? "This is your longest streak ever!" : `Longest streak: ${userData?.longestStreak || 0} days`}
                    </Text>
                  </View>
                </BlurView>
              </View>

              <View style={styles.calendarSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Activity Calendar</Text>
                </View>
                <BlurView intensity={90} tint="light" style={styles.glassCalendarCard}>
                  <Calendar
                    current={currentMonth}
                    markedDates={markedDates}
                    onMonthChange={(month) => setCurrentMonth(month.dateString)}
                    theme={{
                      backgroundColor: 'transparent',
                      calendarBackground: 'transparent',
                      textSectionTitleColor: '#94a3b8',
                      selectedDayBackgroundColor: '#9333ea',
                      selectedDayTextColor: '#ffffff',
                      todayTextColor: '#f97316',
                      dayTextColor: '#1a1a3e',
                      textDisabledColor: '#d9e1e8',
                      arrowColor: '#a855f7',
                      monthTextColor: '#1a1a3e',
                      indicatorColor: 'blue',
                      textDayFontWeight: '300',
                      textMonthFontWeight: 'bold',
                      textDayHeaderFontWeight: '600',
                      textDayFontSize: 16,
                      textMonthFontSize: 18,
                      textDayHeaderFontSize: 12,
                      'stylesheet.calendar.header': { week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between' } }
                    }}
                  />
                </BlurView>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  loadingBackgroundShape1: { position: 'absolute', top: 100, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  loadingBackgroundShape2: { position: 'absolute', bottom: 100, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(236, 72, 153, 0.15)' },
  content: { paddingBottom: 30 },
  particle: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(99, 102, 241, 0.4)' },
  backgroundShape1: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(168, 85, 247, 0.15)' },
  backgroundShape2: { position: 'absolute', top: 200, left: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  backgroundShape3: { position: 'absolute', bottom: 100, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(236, 72, 153, 0.1)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, zIndex: 10 },
  headerButton: { width: 44, height: 44, borderRadius: 22 },
  glassButton: { flex: 1, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a3e', letterSpacing: 0.5 },
  profileCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 24, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
  glassCard: { borderRadius: 24, overflow: 'hidden' },
  cardInnerGradient: { paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  holographicGlare: { position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', zIndex: 0 },
  profilePictureWrapper: { position: 'relative', marginBottom: 10, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(99, 102, 241, 0.2)', top: 0, left: 0 },
  profilePictureContainer: { position: 'relative', width: 100, height: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4ff', borderRadius: 50 },
  profilePicture: { width: '100%', height: '100%', borderRadius: 50 },
  profilePicturePlaceholder: { width: '100%', height: '100%', borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  levelBadge: { position: 'absolute', top: -5, right: -5, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 6 },
  levelText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  xpTextContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 4, borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  xpText: { color: '#fff', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  userName: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 4, letterSpacing: 0.5 },
  userRole: { fontSize: 14, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  verifiedBadge: { fontSize: 22 },
  socialStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 8, marginTop: 10 },
  socialStatItem: { alignItems: 'center', paddingHorizontal: 16 },
  socialStatNumber: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  socialStatLabel: { fontSize: 13, color: '#475569', marginTop: 2 },
  socialDivider: { width: 1, height: 30, backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  badgesSection: { marginTop: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a3e' },
  sectionTitleNoPadding: { fontSize: 22, fontWeight: '700', color: '#1a1a3e' },
  viewAllText: { fontSize: 14, color: '#6366f1', fontWeight: '600' },
  badgesScrollContent: { paddingHorizontal: 20, paddingVertical: 10 },
  badgeItem: { marginRight: 16 },
  badgeContainer: { position: 'relative', alignItems: 'center' },
  newBadgeIndicator: { position: 'absolute', top: -5, right: -5, backgroundColor: '#f97316', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, zIndex: 1, elevation: 6 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  badgeGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  badgeIconWrapper: { backgroundColor: 'rgba(255, 255, 255, 0.3)', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  badgeName: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 8, width: 80 },
  statsGrid: { marginTop: 30, paddingHorizontal: 20 },
  glassStatsCard: { borderRadius: 20, overflow: 'hidden' },
  statCardGradient: { padding: 20 },
  statTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a3e', marginBottom: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, marginHorizontal: 8 },
  statLabel: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1a1a3e' },
  scoredPointsContainer: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(99, 102, 241, 0.1)' },
  scoredPointsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  scoredPointsLabel: { fontSize: 16, color: '#64748b', marginRight: 8 },
  scoredPointsValue: { flexDirection: 'row', alignItems: 'center' },
  pointsNumber: { fontSize: 40, fontWeight: '800', color: '#fbbf24', marginRight: 12, textShadowColor: 'rgba(251, 191, 36, 0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  coinIcon: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  coinGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  leaderboardSection: { marginTop: 30 },
  glassLeaderboardCard: { borderRadius: 20, overflow: 'hidden', marginHorizontal: 20, padding: 10 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  leaderboardRank: { width: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  leaderboardRankText: { fontWeight: 'bold', marginLeft: 5 },
  currentUserRank: { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  currentUserRankText: { color: '#6366f1' },
  leaderboardAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  leaderboardName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a3e' },
  leaderboardScore: { fontSize: 16, fontWeight: 'bold', color: '#a855f7' },
  leaderboardDivider: { height: 1, backgroundColor: 'rgba(99, 102, 241, 0.1)', marginVertical: 5, marginHorizontal: 10 },
  streakSection: { marginTop: 30, paddingHorizontal: 20 },
  glassStreakCard: { borderRadius: 20, padding: 24, overflow: 'hidden' },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  fireIcon: { shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  streakContent: { alignItems: 'center', marginBottom: 24 },
  streakNumber: { fontSize: 48, fontWeight: '800', color: '#f97316', marginBottom: 4, textShadowColor: 'rgba(249, 115, 22, 0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  streakLabel: { fontSize: 16, color: '#64748b', marginBottom: 12 },
  streakMessage: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  calendarSection: { marginTop: 30, paddingBottom: 30 },
  glassCalendarCard: { borderRadius: 20, overflow: 'hidden', marginHorizontal: 20 },
  flipButton: { position: 'absolute', top: 15, right: 15, padding: 5, zIndex: 10 },
  cardBackContent: { alignItems: 'center', justifyContent: 'center', flex: 1, padding: 20, minHeight: 400 },
  magneticStrip: { width: '100%', height: 50, backgroundColor: 'rgba(0,0,0,0.8)', position: 'absolute', top: 30 },
  qrCodeArea: { marginTop: 100, padding: 10, backgroundColor: '#fff', borderRadius: 8 },
  qrCode: { width: 100, height: 100 },
  cardBackText: { color: 'rgba(255,255,255,0.7)', marginTop: 10, fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  activitySection: { marginTop: 30 },
  glassActivityCard: { borderRadius: 20, overflow: 'hidden', marginHorizontal: 20, paddingHorizontal: 15 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(99, 102, 241, 0.05)' },
  activityIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  activityTextContainer: { flex: 1 },
  activityTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a3e' },
  activityTime: { fontSize: 13, color: '#64748b', marginTop: 2 },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  logoutButton: { marginLeft: 10 },
});

export default ProfilePage;