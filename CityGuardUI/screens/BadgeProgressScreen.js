// screens/BadgeProgressScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Vibration,
  Platform,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { BADGES, USER_LEVELS, getUserData } from '../firebase/gamificationConfig';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getFirestore, 
  doc, 
  updateDoc, 
  increment,
  serverTimestamp,
  arrayUnion,
  getDoc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop, G } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const db = getFirestore();

// Luxury color palette
const luxuryColors = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#0f3460',
  gold: '#FFD700',
  goldLight: '#FFF8DC',
  goldDark: '#DAA520',
  platinum: '#E5E4E2',
  rose: '#FF6B9D',
  purple: '#C44569',
  white: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.1)',
  glassLight: 'rgba(255, 255, 255, 0.05)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
};

const BadgeProgressScreen = ({ navigation, route }) => {
  // Route params with defaults
  const { reportResult = {}, userData: initialUserData = {} } = route.params || {};
  
  // State management
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [displayedCoins, setDisplayedCoins] = useState(0);
  const [displayedXP, setDisplayedXP] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(initialUserData);
  const [showShareModal, setShowShareModal] = useState(false);
  const [achievementToShare, setAchievementToShare] = useState(null);
  const [previousXP, setPreviousXP] = useState(0);
  const [targetXP, setTargetXP] = useState(0);
  
  // Auth context
  const { user } = useAuth();
  
  // Refs
  const confettiRef = useRef(null);
  const shareViewRef = useRef(null);
  const isMounted = useRef(true);
  
  // Core animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const xpProgressAnim = useRef(new Animated.Value(0)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0)).current;
  const levelScaleAnim = useRef(new Animated.Value(0)).current;
  
  // Luxury animations
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef([...Array(20)].map(() => ({
    x: new Animated.Value(Math.random() * screenWidth),
    y: new Animated.Value(screenHeight + 50),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;
  const orbAnims = useRef([...Array(3)].map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0.3),
  }))).current;

  useEffect(() => {
    isMounted.current = true;
    initializeScreen();
    
    return () => {
      isMounted.current = false;
      coinAnim.removeAllListeners();
      xpAnim.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    // Animate coin counter
    const coinListener = coinAnim.addListener(({ value }) => {
      if (isMounted.current) {
        setDisplayedCoins(Math.floor(value));
      }
    });

    // Animate XP counter
    const xpListener = xpAnim.addListener(({ value }) => {
      if (isMounted.current) {
        setDisplayedXP(Math.floor(value));
      }
    });

    return () => {
      coinAnim.removeListener(coinListener);
      xpAnim.removeListener(xpListener);
    };
  }, []);

  const initializeScreen = async () => {
    try {
      // Start ambient animations
      startAmbientAnimations();
      
      // Start entrance animations
      animateEntrance();
      
      // Calculate XP progression
      calculateXPProgression();
      
      // Fetch latest user data if needed
      if (user?.uid) {
        const latestUserData = await getUserData(user.uid);
        if (isMounted.current && latestUserData) {
          setUserData(latestUserData);
        }
      }
      
      // Track screen view in Firebase
      await trackScreenView();
      
      // Check for badges to show
      if (reportResult.newBadges && reportResult.newBadges.length > 0) {
        setTimeout(() => {
          if (isMounted.current) {
            showBadgeAnimation();
          }
        }, 2000);
      } else if (reportResult.leveledUp) {
        setTimeout(() => {
          if (isMounted.current) {
            setShowLevelUp(true);
            animateLevelUp();
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Error initializing screen:", error);
    }
  };

  const calculateXPProgression = () => {
    // Calculate previous XP and target XP
    const currentLevel = userData.level || 1;
    const badgeCount = userData.badges?.length || 0;
    
    // Find current level data
    const currentLevelIndex = USER_LEVELS.findIndex(l => l.level === currentLevel);
    const currentLevelData = USER_LEVELS[currentLevelIndex] || USER_LEVELS[0];
    const nextLevelData = USER_LEVELS[currentLevelIndex + 1];
    
    if (nextLevelData) {
      const badgesNeededForCurrentLevel = currentLevelData.minBadges;
      const badgesNeededForNextLevel = nextLevelData.minBadges;
      const badgesProgress = badgeCount - badgesNeededForCurrentLevel;
      const badgesRequired = badgesNeededForNextLevel - badgesNeededForCurrentLevel;
      
      // Calculate XP before and after this report
      const previousBadgeCount = badgeCount - (reportResult.newBadges?.length || 0);
      const previousProgress = Math.max(previousBadgeCount - badgesNeededForCurrentLevel, 0);
      
      const previousXPPercent = (previousProgress / badgesRequired) * 100;
      const currentXPPercent = (badgesProgress / badgesRequired) * 100;
      
      setPreviousXP(Math.floor(previousXPPercent));
      setTargetXP(Math.floor(currentXPPercent));
    } else {
      // Max level
      setPreviousXP(100);
      setTargetXP(100);
    }
  };

  const trackScreenView = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          lastScreenView: "BadgeProgressScreen",
          lastActiveAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error tracking screen view:", error);
    }
  };

  const startAmbientAnimations = () => {
    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -20,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particle animations
    particleAnims.forEach((particle, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: -50,
              duration: 8000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 0.6,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 2000,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(particle.scale, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: screenHeight + 50,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });

    // Floating orbs
    orbAnims.forEach((orb, index) => {
      const radius = 100 + index * 50;
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb.x, {
            toValue: Math.cos(index * Math.PI / 3) * radius,
            duration: 5000 + index * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(orb.x, {
            toValue: 0,
            duration: 5000 + index * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(coinAnim, {
        toValue: reportResult.coinsEarned || 0,
        duration: 2000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }),
    ]).start(() => {
      // After entrance, animate XP gain
      animateXPGain();
    });
  };

  const animateXPGain = () => {
    // Animate from previous XP to target XP
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(xpAnim, {
          toValue: targetXP,
          duration: 2000,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
        Animated.timing(xpProgressAnim, {
          toValue: targetXP / 100,
          duration: 2000,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      // Haptic feedback when XP animation completes
      if (targetXP > previousXP) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
    
    // Set initial value
    xpAnim.setValue(previousXP);
    xpProgressAnim.setValue(previousXP / 100);
  };

  const showBadgeAnimation = () => {
    setShowBadgeUnlock(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Badge scale animation
    Animated.sequence([
      Animated.spring(badgeScaleAnim, {
        toValue: 1.2,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (confettiRef.current) {
      confettiRef.current.start();
    }
  };

  const animateLevelUp = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Animated.sequence([
      Animated.spring(levelScaleAnim, {
        toValue: 1.3,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(levelScaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (confettiRef.current) {
      confettiRef.current.start();
    }
  };

  const nextBadge = () => {
    if (currentBadgeIndex < reportResult.newBadges.length - 1) {
      setCurrentBadgeIndex(currentBadgeIndex + 1);
      showBadgeAnimation();
    } else if (reportResult.leveledUp) {
      setShowBadgeUnlock(false);
      setTimeout(() => {
        setShowLevelUp(true);
        animateLevelUp();
      }, 500);
    } else {
      handleContinue();
    }
  };

  const handleContinue = async () => {
    try {
      // Track completion
      await trackProgressCompletion();
      
      // Navigate to dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: 'PedestrianDashboard' }],
      });
    } catch (error) {
      console.error("Error in handleContinue:", error);
      navigation.navigate('PedestrianDashboard');
    }
  };

  const trackProgressCompletion = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          progressScreensViewed: increment(1),
          lastProgressViewAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error tracking progress completion:", error);
    }
  };

  const calculateProgress = (badgeId) => {
    const badge = Object.values(BADGES).find(b => b.id === badgeId);
    if (!badge) return { percentage: 0, current: 0, total: 1 };

    let current = 0;
    let total = badge.requirement.value || 1;

    switch (badge.requirement.type) {
      case 'report_count':
        current = userData.reportCount || 0;
        break;
      case 'streak':
        current = userData.currentStreak || 0;
        break;
      case 'category_count':
        current = userData.categoryReports?.[badge.requirement.category] || 0;
        break;
      case 'priority_count':
        current = userData.priorityReports?.[badge.requirement.priority] || 0;
        break;
      case 'weekend_count':
        current = userData.weekendReports || 0;
        break;
      default:
        current = 0;
    }

    const percentage = Math.min((current / total) * 100, 100);
    return { percentage, current, total };
  };

  const getNextBadges = () => {
    const earnedBadgeIds = userData.badges?.map(b => b.id) || [];
    const nextBadges = Object.values(BADGES)
      .filter(badge => !earnedBadgeIds.includes(badge.id))
      .sort((a, b) => {
        // Sort by closest to completion
        const progressA = calculateProgress(a.id).percentage;
        const progressB = calculateProgress(b.id).percentage;
        return progressB - progressA;
      })
      .slice(0, 3);
    return nextBadges;
  };

  const renderFloatingOrbs = () => {
    return orbAnims.map((orb, index) => (
      <Animated.View
        key={index}
        style={[
          styles.floatingOrb,
          {
            transform: [
              { translateX: orb.x },
              { translateY: floatAnim },
            ],
            opacity: orb.opacity,
          },
        ]}
      >
        <LinearGradient
          colors={[luxuryColors.gold + '30', luxuryColors.gold + '10']}
          style={styles.orbGradient}
        />
      </Animated.View>
    ));
  };

  const renderParticles = () => {
    return particleAnims.map((particle, index) => (
      <Animated.View
        key={index}
        style={[
          styles.particle,
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
    ));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[luxuryColors.primary, luxuryColors.secondary, luxuryColors.accent]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated background elements */}
      <Animated.View
        style={[
          styles.backgroundGlow,
          {
            opacity: glowAnim,
            transform: [
              { scale: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2],
              })},
            ],
          },
        ]}
      />

      {/* Floating orbs */}
      {renderFloatingOrbs()}

      {/* Particles */}
      {renderParticles()}

      {/* Shimmer overlay */}
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            transform: [
              { translateX: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-screenWidth, screenWidth],
              })},
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', luxuryColors.gold + '20', 'transparent']}
          style={styles.shimmer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>

      <ConfettiCannon
        ref={confettiRef}
        count={150}
        origin={{ x: screenWidth / 2, y: 0 }}
        autoStart={false}
        fadeOut={true}
        colors={[luxuryColors.gold, luxuryColors.goldLight, luxuryColors.platinum, luxuryColors.rose, luxuryColors.purple]}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
            {/* Skip button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleContinue}
              activeOpacity={0.7}
            >
              <BlurView intensity={30} tint="dark" style={styles.skipBlur}>
                <Text style={styles.skipText}>Skip</Text>
                <Feather name="arrow-right" size={18} color={luxuryColors.textSecondary} />
              </BlurView>
            </TouchableOpacity>

            {/* Congratulations Section */}
            <View style={styles.congratsSection}>
              <MaskedView
                maskElement={
                  <Text style={styles.congratsText}>Excellent Work!</Text>
                }
              >
                <LinearGradient
                  colors={[luxuryColors.goldLight, luxuryColors.gold, luxuryColors.goldDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[styles.congratsText, { opacity: 0 }]}>Excellent Work!</Text>
                </LinearGradient>
              </MaskedView>
              <Text style={styles.congratsSubtext}>Your contribution makes our city better</Text>
            </View>

            {/* Coins Earned Card */}
            <Animated.View
              style={[
                styles.coinsCard,
                {
                  transform: [
                    { scale: pulseAnim },
                    { translateY: floatAnim.interpolate({
                      inputRange: [-20, 0],
                      outputRange: [-10, 0],
                    })},
                  ],
                },
              ]}
            >
              <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
                <LinearGradient
                  colors={[luxuryColors.glass, luxuryColors.glassLight]}
                  style={styles.cardGradient}
                >
                  <View style={styles.coinIconContainer}>
                    <LinearGradient
                      colors={[luxuryColors.gold, luxuryColors.goldDark]}
                      style={styles.coinIconGradient}
                    >
                      <MaterialCommunityIcons name="coin" size={60} color={luxuryColors.white} />
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.coinsTextContainer}>
                    <Text style={styles.coinsLabel}>Coins Earned</Text>
                    <Text style={styles.coinsValue}>+{displayedCoins}</Text>
                    <View style={styles.coinsDivider} />
                    <Text style={styles.totalCoins}>
                      Total: {(userData.coins || 0) + (reportResult.coinsEarned || 0)}
                    </Text>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* XP Progress Card */}
            <View style={styles.xpCard}>
              <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
                <LinearGradient
                  colors={[luxuryColors.glass, luxuryColors.glassLight]}
                  style={styles.xpCardGradient}
                >
                  <View style={styles.xpHeader}>
                    <View>
                      <Text style={styles.xpTitle}>Experience Progress</Text>
                      <Text style={styles.xpLevel}>
                        Level {userData.level || 1} • {USER_LEVELS.find(l => l.level === (userData.level || 1))?.name}
                      </Text>
                    </View>
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpBadgeText}>{displayedXP}%</Text>
                    </View>
                  </View>

                  <View style={styles.xpProgressContainer}>
                    <View style={styles.xpProgressBar}>
                      <Animated.View
                        style={[
                          styles.xpProgressFill,
                          {
                            width: xpProgressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={[luxuryColors.gold, luxuryColors.goldDark]}
                          style={styles.xpProgressGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </Animated.View>
                      
                      {/* XP gain indicator */}
                      {targetXP > previousXP && (
                        <Animated.View
                          style={[
                            styles.xpGainIndicator,
                            {
                              left: `${previousXP}%`,
                              width: `${targetXP - previousXP}%`,
                              opacity: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 0.3],
                              }),
                            },
                          ]}
                        />
                      )}
                    </View>
                    
                    <View style={styles.xpMilestones}>
                      {[0, 25, 50, 75, 100].map((milestone) => (
                        <View
                          key={milestone}
                          style={[
                            styles.xpMilestone,
                            { left: `${milestone}%` },
                          ]}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.xpStats}>
                    <View style={styles.xpStatItem}>
                      <Text style={styles.xpStatValue}>
                        {userData.badges?.length || 0}/{USER_LEVELS.find(l => l.level === (userData.level || 1) + 1)?.minBadges || '∞'}
                      </Text>
                      <Text style={styles.xpStatLabel}>Badges to Next Level</Text>
                    </View>
                    {reportResult.newBadges && reportResult.newBadges.length > 0 && (
                      <View style={styles.xpGainBadge}>
                        <Feather name="trending-up" size={16} color={luxuryColors.gold} />
                        <Text style={styles.xpGainText}>+{reportResult.newBadges.length} Badge{reportResult.newBadges.length > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </BlurView>
            </View>

            {/* Streak Info */}
            {reportResult.currentStreak > 0 && (
              <Animated.View 
                style={[
                  styles.streakCard,
                  {
                    transform: [
                      { translateX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      })},
                      { scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      })},
                    ],
                  },
                ]}
              >
                <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
                  <LinearGradient
                    colors={[luxuryColors.glass, luxuryColors.glassLight]}
                    style={styles.streakGradient}
                  >
                    <Animated.View
                      style={[
                        styles.streakIcon,
                        {
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    >
                      <MaterialCommunityIcons name="fire" size={40} color={luxuryColors.rose} />
                    </Animated.View>
                    <View style={styles.streakContent}>
                      <Text style={styles.streakValue}>{reportResult.currentStreak}</Text>
                      <Text style={styles.streakLabel}>Day Streak</Text>
                      {reportResult.currentStreak > (userData.longestStreak || 0) && (
                        <View style={styles.newRecordBadge}>
                          <Text style={styles.newRecordText}>NEW RECORD!</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </BlurView>
              </Animated.View>
            )}

            {/* Badge Progress Section */}
            <View style={styles.badgeProgressSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Progress</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('BadgesScreen')}
                  style={styles.viewAllButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Feather name="arrow-right" size={16} color={luxuryColors.gold} />
                </TouchableOpacity>
              </View>
              
              {getNextBadges().map((badge, index) => {
                const progress = calculateProgress(badge.id);
                return (
                  <Animated.View 
                    key={badge.id} 
                    style={[
                      styles.badgeProgressCard,
                      {
                        opacity: fadeAnim,
                        transform: [
                          { translateX: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                          })},
                          { scale: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                          })},
                        ],
                      },
                    ]}
                  >
                    <BlurView intensity={30} tint="dark" style={styles.badgeProgressBlur}>
                      <View style={styles.badgeProgressContent}>
                        <View style={styles.badgeProgressHeader}>
                          <View style={[styles.badgeProgressIcon, { backgroundColor: badge.color + '20' }]}>
                            <MaterialIcons name={badge.icon} size={28} color={badge.color} />
                          </View>
                          <View style={styles.badgeProgressInfo}>
                            <Text style={styles.badgeProgressName}>{badge.name}</Text>
                            <Text style={styles.badgeProgressDescription}>{badge.description}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.badgeProgressBarContainer}>
                          <View style={styles.badgeProgressBar}>
                            <Animated.View
                              style={[
                                styles.badgeProgressFill,
                                {
                                  width: `${progress.percentage}%`,
                                  backgroundColor: badge.color,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.badgeProgressText}>
                            {progress.current}/{progress.total}
                          </Text>
                        </View>
                      </View>
                    </BlurView>
                  </Animated.View>
                );
              })}
            </View>

            {/* Continue Button */}
            <TouchableOpacity 
              style={styles.continueButton} 
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[luxuryColors.gold, luxuryColors.goldDark]}
                style={styles.continueGradient}
              >
                <Text style={styles.continueText}>Continue to Dashboard</Text>
                <Feather name="arrow-right" size={24} color={luxuryColors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Badge Unlock Modal */}
      {showBadgeUnlock && reportResult.newBadges && reportResult.newBadges[currentBadgeIndex] && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showBadgeUnlock}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: badgeScaleAnim }],
                },
              ]}
            >
              <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
                <LinearGradient
                  colors={[luxuryColors.glass, 'rgba(255, 255, 255, 0.02)']}
                  style={styles.modalGradient}
                >
                  <Text style={styles.modalTitle}>Achievement Unlocked</Text>
                  
                  <View style={styles.badgeShowcase}>
                    <Animated.View
                      style={[
                        styles.badgeGlowRing,
                        {
                          transform: [
                            { scale: pulseAnim },
                            { rotate: rotateAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            })},
                          ],
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={[reportResult.newBadges[currentBadgeIndex].color, 'transparent']}
                        style={styles.glowGradient}
                      />
                    </Animated.View>
                    
                    <View
                      style={[
                        styles.badgeLarge,
                        { backgroundColor: reportResult.newBadges[currentBadgeIndex].color },
                      ]}
                    >
                      <MaterialIcons
                        name={reportResult.newBadges[currentBadgeIndex].icon}
                        size={60}
                        color={luxuryColors.white}
                      />
                    </View>
                  </View>

                  <Text style={styles.badgeName}>
                    {reportResult.newBadges[currentBadgeIndex].name}
                  </Text>
                  <Text style={styles.badgeDescription}>
                    {reportResult.newBadges[currentBadgeIndex].description}
                  </Text>

                  <View style={styles.badgeReward}>
                    <MaterialCommunityIcons name="coin" size={24} color={luxuryColors.gold} />
                    <Text style={styles.badgeRewardText}>
                      +{reportResult.newBadges[currentBadgeIndex].coins} Coins
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.collectButton} onPress={nextBadge}>
                    <LinearGradient
                      colors={[luxuryColors.gold, luxuryColors.goldDark]}
                      style={styles.collectGradient}
                    >
                      <Text style={styles.collectText}>
                        {currentBadgeIndex < reportResult.newBadges.length - 1
                          ? 'Next Achievement'
                          : reportResult.leveledUp
                          ? 'Continue'
                          : 'Collect & Continue'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Level Up Modal */}
      {showLevelUp && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showLevelUp}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: levelScaleAnim }],
                },
              ]}
            >
              <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
                <LinearGradient
                  colors={[luxuryColors.glass, 'rgba(255, 255, 255, 0.02)']}
                  style={styles.modalGradient}
                >
                  <MaskedView
                    maskElement={
                      <Text style={styles.levelUpTitle}>LEVEL UP</Text>
                    }
                  >
                    <LinearGradient
                      colors={[luxuryColors.goldLight, luxuryColors.gold, luxuryColors.goldDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={[styles.levelUpTitle, { opacity: 0 }]}>LEVEL UP</Text>
                    </LinearGradient>
                  </MaskedView>
                  
                  <View style={styles.levelShowcase}>
                    <Animated.View
                      style={[
                        styles.levelGlowRing,
                        {
                          transform: [
                            { scale: pulseAnim },
                            { rotate: rotateAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            })},
                          ],
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={[luxuryColors.gold, 'transparent']}
                        style={styles.glowGradient}
                      />
                    </Animated.View>
                    
                    <LinearGradient
                      colors={[luxuryColors.gold, luxuryColors.goldDark]}
                      style={styles.levelBadge}
                    >
                      <Text style={styles.levelNumber}>{reportResult.newLevel}</Text>
                    </LinearGradient>
                  </View>

                  <Text style={styles.levelName}>
                    {USER_LEVELS.find(l => l.level === reportResult.newLevel)?.name}
                  </Text>

                  <View style={styles.levelReward}>
                    <MaterialCommunityIcons name="coin" size={24} color={luxuryColors.gold} />
                    <Text style={styles.levelRewardText}>
                      +{reportResult.newLevel * 100} Coins Bonus
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.collectButton} onPress={handleContinue}>
                    <LinearGradient
                      colors={[luxuryColors.gold, luxuryColors.goldDark]}
                      style={styles.collectGradient}
                    >
                      <Text style={styles.collectText}>Continue</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: luxuryColors.primary,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Background elements
  backgroundGlow: {
    position: 'absolute',
    top: -200,
    left: -200,
    width: screenWidth + 400,
    height: screenWidth + 400,
    borderRadius: (screenWidth + 400) / 2,
    backgroundColor: luxuryColors.gold,
    opacity: 0.05,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmer: {
    width: screenWidth * 2,
    height: screenHeight,
  },
  floatingOrb: {
    position: 'absolute',
    width: 150,
    height: 150,
    top: screenHeight / 2 - 75,
    left: screenWidth / 2 - 75,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: luxuryColors.gold,
  },
  
  // Skip button
  skipButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  skipBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    color: luxuryColors.textSecondary,
    marginRight: 6,
    fontWeight: '500',
  },
  
  // Congratulations section
  congratsSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  congratsText: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
  congratsSubtext: {
    fontSize: 16,
    color: luxuryColors.textSecondary,
    marginTop: 10,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  
  // Cards
  coinsCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  xpCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  streakCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardBlur: {
    borderRadius: 24,
  },
  cardGradient: {
    padding: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Coins card
  coinIconContainer: {
    marginRight: 24,
  },
  coinIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsTextContainer: {
    flex: 1,
  },
  coinsLabel: {
    fontSize: 14,
    color: luxuryColors.textSecondary,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  coinsValue: {
    fontSize: 48,
    fontWeight: '200',
    color: luxuryColors.gold,
    letterSpacing: -1,
  },
  coinsDivider: {
    width: 40,
    height: 1,
    backgroundColor: luxuryColors.gold + '30',
    marginVertical: 12,
  },
  totalCoins: {
    fontSize: 16,
    color: luxuryColors.textSecondary,
    fontWeight: '400',
  },
  
  // XP Card
  xpCardGradient: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  xpTitle: {
    fontSize: 18,
    color: luxuryColors.text,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  xpLevel: {
    fontSize: 14,
    color: luxuryColors.textSecondary,
    marginTop: 4,
  },
  xpBadge: {
    backgroundColor: luxuryColors.gold + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  xpBadgeText: {
    fontSize: 16,
    color: luxuryColors.gold,
    fontWeight: '600',
  },
  xpProgressContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  xpProgressBar: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpProgressFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpProgressGradient: {
    flex: 1,
  },
  xpGainIndicator: {
    position: 'absolute',
    height: '100%',
    backgroundColor: luxuryColors.gold,
    borderRadius: 6,
  },
  xpMilestones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  xpMilestone: {
    position: 'absolute',
    width: 2,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  xpStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpStatItem: {
    flex: 1,
  },
  xpStatValue: {
    fontSize: 16,
    color: luxuryColors.text,
    fontWeight: '600',
  },
  xpStatLabel: {
    fontSize: 12,
    color: luxuryColors.textSecondary,
    marginTop: 2,
  },
  xpGainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: luxuryColors.gold + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  xpGainText: {
    fontSize: 14,
    color: luxuryColors.gold,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Streak card
  streakGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  streakIcon: {
    marginRight: 20,
  },
  streakContent: {
    flex: 1,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: '300',
    color: luxuryColors.text,
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 14,
    color: luxuryColors.textSecondary,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  newRecordBadge: {
    backgroundColor: luxuryColors.rose + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  newRecordText: {
    fontSize: 10,
    fontWeight: '700',
    color: luxuryColors.rose,
    letterSpacing: 1,
  },
  
  // Badge progress section
  badgeProgressSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: luxuryColors.text,
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: luxuryColors.gold,
    marginRight: 4,
    fontWeight: '500',
  },
  badgeProgressCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeProgressBlur: {
    borderRadius: 20,
  },
  badgeProgressContent: {
    padding: 20,
    backgroundColor: luxuryColors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeProgressIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  badgeProgressInfo: {
    flex: 1,
  },
  badgeProgressName: {
    fontSize: 18,
    fontWeight: '500',
    color: luxuryColors.text,
    marginBottom: 4,
  },
  badgeProgressDescription: {
    fontSize: 14,
    color: luxuryColors.textSecondary,
  },
  badgeProgressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  badgeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  badgeProgressText: {
    fontSize: 14,
    color: luxuryColors.textSecondary,
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'right',
  },
  
  // Continue button
  continueButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: luxuryColors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  continueText: {
    fontSize: 18,
    fontWeight: '500',
    color: luxuryColors.white,
    marginRight: 10,
    letterSpacing: 0.5,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    borderRadius: 30,
    overflow: 'hidden',
  },
  modalBlur: {
    borderRadius: 30,
  },
  modalGradient: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: luxuryColors.text,
    letterSpacing: 2,
    marginBottom: 30,
    textTransform: 'uppercase',
  },
  badgeShowcase: {
    position: 'relative',
    marginBottom: 30,
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 70,
  },
  badgeLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  badgeName: {
    fontSize: 28,
    fontWeight: '300',
    color: luxuryColors.text,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  badgeDescription: {
    fontSize: 16,
    color: luxuryColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '300',
  },
  badgeReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: luxuryColors.gold + '20',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  badgeRewardText: {
    fontSize: 18,
    fontWeight: '500',
    color: luxuryColors.gold,
    marginLeft: 10,
  },
  collectButton: {
    borderRadius: 25,
    overflow: 'hidden',
    minWidth: 200,
  },
  collectGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  collectText: {
    fontSize: 16,
    fontWeight: '600',
    color: luxuryColors.white,
    letterSpacing: 0.5,
  },
  levelUpTitle: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 4,
    marginBottom: 30,
  },
  levelShowcase: {
    position: 'relative',
    marginBottom: 30,
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelGlowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  levelBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: luxuryColors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '300',
    color: luxuryColors.white,
  },
  levelName: {
    fontSize: 24,
    fontWeight: '300',
    color: luxuryColors.text,
    marginBottom: 20,
    letterSpacing: 1,
  },
  levelReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: luxuryColors.gold + '20',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  levelRewardText: {
    fontSize: 18,
    fontWeight: '500',
    color: luxuryColors.gold,
    marginLeft: 10,
  },
});

export default BadgeProgressScreen;