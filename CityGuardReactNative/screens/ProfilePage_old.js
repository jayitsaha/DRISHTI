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
  subscribeToLeaderboard 
} from '../firebase/gamificationConfig'; // Assuming these are correctly set up
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/gamificationConfig'; // Assuming db is exported

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Mock function to simulate streak calculation based on dates
const calculateStreak = (dates) => {
    if (!dates || dates.length === 0) return { current: 0, longest: 0 };
    const sortedDates = dates.map(d => new Date(d)).sort((a, b) => b - a);
    let currentStreak = 0;
    let longestStreak = 0;
    if (sortedDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const mostRecentDate = new Date(sortedDates[0]);
        mostRecentDate.setHours(0,0,0,0);
        if (mostRecentDate.getTime() === today.getTime() || mostRecentDate.getTime() === yesterday.getTime()) {
            currentStreak = 1;
            let lastDate = mostRecentDate;
            for (let i = 1; i < sortedDates.length; i++) {
                const currentDate = new Date(sortedDates[i]);
                currentDate.setHours(0,0,0,0);
                const expectedPreviousDate = new Date(lastDate);
                expectedPreviousDate.setDate(lastDate.getDate() - 1);
                if (currentDate.getTime() === expectedPreviousDate.getTime()) {
                    currentStreak++;
                } else if (currentDate.getTime() !== lastDate.getTime()) {
                    break; 
                }
                lastDate = currentDate;
            }
        }
    }
    longestStreak = currentStreak > 0 ? Math.max(currentStreak, 5) : 0;
    return { current: currentStreak, longest: longestStreak };
};


const ProfilePage = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [displayedXp, setDisplayedXp] = useState(0);

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
    
    const mockLeaderboardData = [
        { userId: 'user2', username: 'Alex', profilePicture: 'https://i.pravatar.cc/150?u=alex', coins: 1500 },
        { userId: 'user3', username: 'Mia', profilePicture: 'https://i.pravatar.cc/150?u=mia', coins: 1250 },
        { userId: 'user1', username: 'Kamelia Ahmed', profilePicture: null, coins: 1100 },
        { userId: 'user4', username: 'David', profilePicture: 'https://i.pravatar.cc/150?u=david', coins: 900 },
    ];

    const unsubscribe = subscribeToLeaderboard('coins', (data = mockLeaderboardData) => {
      if (isMounted.current) {
        const sortedData = data.sort((a,b) => b.coins - a.coins);
        setLeaderboard(sortedData);
        AsyncStorage.getItem("userId").then(userId => {
          if (isMounted.current) {
            const rank = sortedData.findIndex(item => item.userId === (userId || 'user1')) + 1;
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
      if(userData && !loading) {
          animateEntrance();
      }
  }, [userData, loading]);

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

    if (userData) {
        const progress = (userData.xp || 0) / (userData.nextLevelXp || 1);
        Animated.timing(levelProgressAnim, {
            toValue: progress,
            duration: 1500,
            delay: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false, 
        }).start();
        Animated.timing(xpCounterAnim, {
            toValue: userData.xp || 0,
            duration: 1500,
            delay: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }

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
      const userId = await AsyncStorage.getItem("userId") || 'user1';
      const data = {
          userId: 'user1',
          username: 'Kamelia Ahmed',
          profilePicture: null,
          memberSince: '2024-01-15T10:00:00Z',
          following: 12,
          followers: 4,
          level: 8,
          xp: 750,
          nextLevelXp: 1000,
          stats: { completedChapters: 8, completedStories: 2, totalPractices: 45, totalReadingHours: 22 },
          coins: 1100,
          badges: [
              { name: 'Confident Reader', icon: 'school', color: '#3b82f6', isNew: true },
              { name: 'Responsible Reader', icon: 'favorite', color: '#f59e0b', isNew: false },
              { name: 'Serious Learner', icon: 'psychology', color: '#8b5cf6', isNew: false },
          ],
          reportDates: ['2025-07-15', '2025-07-16', '2025-07-17', '2025-07-18', '2025-07-20', '2025-07-21', '2025-07-22', '2025-07-23'],
          recentActivity: [
              { type: 'badge', title: 'Unlocked "Serious Learner"', time: '2d ago', icon: 'psychology' },
              { type: 'streak', title: 'Reached a 5-day streak!', time: '3d ago', icon: 'whatshot' },
              { type: 'story', title: 'Completed "The Lost City"', time: '5d ago', icon: 'menu-book' },
          ]
      };
      
      if (isMounted.current) {
        const streak = calculateStreak(data.reportDates || []);
        const enhancedData = { ...data, streak };
        setUserData(enhancedData);
        
        if (data.reportDates) {
          const marked = {};
          const today = new Date();
          today.setHours(0,0,0,0);
          data.reportDates.forEach(dateStr => {
            const date = new Date(dateStr);
            date.setHours(0,0,0,0);
            marked[dateStr] = {
              selected: true,
              selectedColor: date.getTime() === today.getTime() ? '#f97316' : '#9333ea',
              selectedTextColor: '#fff',
            };
          });
          setMarkedDates(marked);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
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
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, { profilePicture: result.assets[0].uri });
          if (isMounted.current) {
            loadUserData();
            triggerRipple();
          }
        }
      }
    } catch (error) {
      console.error("Error updating profile picture:", error);
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

    if(isBack) {
        return (
            <>
                <View style={styles.cardBackContent}>
                    <View style={styles.magneticStrip} />
                    <View style={styles.qrCodeArea}>
                        <Image source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=userid-12345' }} style={styles.qrCode} />
                    </View>
                    <Text style={styles.cardBackText}>ID: {userData?.userId || 'user1'}</Text>
                    <Text style={styles.cardBackText}>Member Since: {new Date(userData?.memberSince || Date.now()).toLocaleDateString()}</Text>
                    <FontAwesome5 name="gem" size={24} color="rgba(255,255,255,0.7)" style={{marginTop: 10}} />
                </View>
            </>
        )
    }

    return (
      <>
        <Animated.View pointerEvents="none" style={[styles.holographicGlare, { transform: [{ rotate: glareRotate }] }]}>
            <LinearGradient 
                colors={['rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.3)', 'rgba(99, 102, 241, 0.3)']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={{flex: 1}}
            />
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: cardRotateX.interpolate({ inputRange: [-25, 25], outputRange: [-15, 15] }) }] }}>
            <TouchableOpacity onPress={handleProfilePictureUpdate} activeOpacity={0.9}>
              <View style={styles.profilePictureWrapper}>
                <Svg width="120" height="120" viewBox="0 0 120 120" style={{position: 'absolute'}}>
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

                <Animated.View style={[ styles.profilePictureContainer, { transform: [{ scale: profileImageScale }] } ]}>
                  {userData?.profilePicture ? (
                    <Image source={{ uri: userData.profilePicture }} style={styles.profilePicture} />
                  ) : (
                    <LinearGradient colors={['#6366f1', '#a855f7']} style={styles.profilePicturePlaceholder}>
                      <MaterialIcons name="person" size={60} color="#FFF" />
                    </LinearGradient>
                  )}
                  <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>{userData?.level || 1}</Text>
                  </View>
                  <View style={styles.xpTextContainer}>
                    <Text style={styles.xpText}>{displayedXp} / {userData?.nextLevelXp || 1000} XP</Text>
                  </View>
                </Animated.View>
              </View>
            </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: cardRotateX.interpolate({ inputRange: [-25, 25], outputRange: [-5, 5] }) }] }}>
            <Animated.Text style={[ styles.userName, { transform: [{ scale: pulseAnim }] }]}>
              {userData?.username || 'Kamelia Ahmed'} <Text style={styles.verifiedBadge}> ✨</Text>
            </Animated.Text>
        </Animated.View>
        
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
      </>
    );
  };

  const renderStatsContent = () => (
    <>
      <Text style={styles.statTitle}>Your Overall Progress</Text>
      <View style={styles.statRow}>
        <StatBox label="Completed Chapters" value={userData?.stats?.completedChapters || 0} anim={statCountAnims[0]} />
        <StatBox label="Completed Stories" value={userData?.stats?.completedStories || 0} anim={statCountAnims[1]} />
      </View>
      <View style={styles.statRow}>
        <StatBox label="Total Practices" value={userData?.stats?.totalPractices || 0} anim={statCountAnims[2]} />
        <StatBox label="Reading Time" value={`${userData?.stats?.totalReadingHours || 0}h`} anim={statCountAnims[3]} isText={true} />
      </View>
      <View style={styles.scoredPointsContainer}>
        <View style={styles.scoredPointsHeader}>
          <Text style={styles.scoredPointsLabel}>Scored Points</Text>
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

  const StatBox = ({ label, value, anim, isText = false }) => {
    const animValue = isText ? null : anim.interpolate({ inputRange: [0, 1], outputRange: [0, value] });
    return (
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>{label}</Text>
        {isText ? (
           <Animated.Text style={[styles.statValue, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>{value}</Animated.Text>
        ) : (
          <Animated.Text style={[styles.statValue, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            {animValue && animValue.interpolate ? animValue.interpolate({ inputRange: [0, value], outputRange: [0, value] }).__getValue().toFixed(0) : value}
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
        <Animated.View key={index} style={[ styles.particle, { transform: [{ translateX: particle.x }, { translateY: particle.y }], opacity: particle.opacity }]} />
      ))}

      <Animated.ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: parallaxScroll } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Animated.View style={[ styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          <Animated.View style={[ styles.header, { transform: [{ translateY: parallaxScroll.interpolate({ inputRange: [0, 100], outputRange: [0, -50], extrapolate: 'clamp' }) }] }]}>
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
            <TouchableOpacity style={styles.headerButton} activeOpacity={0.7} onPress={() => Vibration.vibrate(10)}>
              <BlurView intensity={90} tint="light" style={styles.glassButton}>
                <MaterialIcons name="settings" size={24} color="#333" />
              </BlurView>
            </TouchableOpacity>
          </Animated.View>

          <View>
            <Animated.View {...panResponder.panHandlers} style={[ styles.profileCard, frontFlip, { backfaceVisibility: 'hidden'}]}>
              <BlurView intensity={95} tint="light" style={styles.glassCard}>
                <LinearGradient colors={['rgba(255, 255, 255, 0.2)', 'rgba(99, 102, 241, 0.1)', 'rgba(236, 72, 153, 0.1)']} style={styles.cardInnerGradient}>
                  {renderCardContent(false)}
                </LinearGradient>
                <TouchableOpacity style={styles.flipButton} onPress={handleCardFlip}>
                    <MaterialCommunityIcons name="rotate-3d-variant" size={24} color="rgba(0,0,0,0.5)" />
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
            
            <Animated.View style={[ styles.profileCard, backFlip, { backfaceVisibility: 'hidden', position: 'absolute', top: 0, left: 0, right: 0 }]}>
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

          <View style={styles.badgesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <TouchableOpacity onPress={() => { Vibration.vibrate(10); navigation.navigate('BadgesScreen'); }}>
                <Text style={styles.viewAllText}>View all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScrollContent}>
              {(userData?.badges || []).map((badge, index) => (
                <Animated.View key={index} style={[ styles.badgeItem, { transform: [
                    { scale: badgeScaleAnims[index] || 1 },
                    { rotate: (badgeScaleAnims[index] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-360deg', '0deg']
                    })}
                ]}]}>
                  <TouchableOpacity activeOpacity={0.8}>
                    <View style={styles.badgeContainer}>
                      {badge.isNew && (
                        <View style={styles.newBadgeIndicator}><Text style={styles.newBadgeText}>NEW</Text></View>
                      )}
                      <LinearGradient colors={[badge.color || '#3b82f6', (badge.color || '#3b82f6') + 'DD']} style={styles.badgeGradient}>
                        <View style={styles.badgeIconWrapper}>
                          <MaterialIcons name={badge.icon || 'school'} size={40} color="#FFF" />
                        </View>
                      </LinearGradient>
                      <Text style={styles.badgeName}>{badge.name}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.statsGrid}>
            <BlurView intensity={90} tint="light" style={styles.glassStatsCard}>
                <LinearGradient colors={['rgba(255, 255, 255, 0.9)', 'rgba(243, 232, 255, 0.4)']} style={styles.statCardGradient}>
                    {renderStatsContent()}
                </LinearGradient>
            </BlurView>
          </View>
          
          <View style={styles.activitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>
              <BlurView intensity={90} tint="light" style={styles.glassActivityCard}>
                  {(userData?.recentActivity || []).map((activity, index) => (
                      <View key={index} style={styles.activityRow}>
                          <View style={[styles.activityIcon, {backgroundColor: `rgba(99, 102, 241, 0.1)`}]}>
                              <MaterialIcons name={activity.icon} size={22} color="#6366f1" />
                          </View>
                          <View style={styles.activityTextContainer}>
                            <Text style={styles.activityTitle}>{activity.title}</Text>
                            <Text style={styles.activityTime}>{activity.time}</Text>
                          </View>
                      </View>
                  ))}
              </BlurView>
          </View>

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
                              <Text style={[styles.leaderboardRankText, {color: rankColors[index]}]}>{index + 1}</Text>
                          </View>
                          <Image source={{ uri: user.profilePicture || `https://placehold.co/40x40/6366f1/FFF?text=${user.username.charAt(0)}` }} style={styles.leaderboardAvatar} />
                          <Text style={styles.leaderboardName}>{user.username}</Text>
                          <Text style={styles.leaderboardScore}>{user.coins} pts</Text>
                      </View>
                  )})}
                  {userRank > 3 && (
                    <>
                        <View style={styles.leaderboardDivider} />
                        <View style={styles.leaderboardRow}>
                            <View style={[styles.leaderboardRank, styles.currentUserRank]}>
                                <Text style={[styles.leaderboardRankText, styles.currentUserRankText]}>{userRank}</Text>
                            </View>
                            <Image source={{ uri: userData.profilePicture || `https://placehold.co/40x40/a855f7/FFF?text=${userData.username.charAt(0)}` }} style={styles.leaderboardAvatar} />
                            <Text style={styles.leaderboardName}>{userData.username}</Text>
                            <Text style={styles.leaderboardScore}>{userData.coins} pts</Text>
                        </View>
                    </>
                  )}
              </BlurView>
          </View>
          
          <View style={styles.streakSection}>
            <BlurView intensity={90} tint="light" style={styles.glassStreakCard}>
              <View style={styles.streakHeader}>
                <Text style={styles.sectionTitleNoPadding}>Streak</Text>
                <Animated.View style={[ styles.fireIcon, { transform: [{ scale: pulseAnim }] }]}>
                  <MaterialCommunityIcons name="fire" size={40} color="#f97316" />
                </Animated.View>
              </View>
              <View style={styles.streakContent}>
                <Text style={styles.streakNumber}>{userData?.streak?.current || 0}</Text>
                <Text style={styles.streakLabel}>Streak Days</Text>
                <Text style={styles.streakMessage}>
                  {userData?.streak?.current >= userData?.streak?.longest ? "This is your longest streak ever!" : `Longest streak: ${userData?.streak?.longest || 0} days`}
                </Text>
              </View>
            </BlurView>
          </View>

          <View style={styles.calendarSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Streak Calendar</Text>
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
  userName: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, letterSpacing: 0.5 },
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
});

export default ProfilePage;
