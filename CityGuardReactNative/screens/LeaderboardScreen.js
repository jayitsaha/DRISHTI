// screens/LeaderboardScreen.js
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
  Vibration,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { getLeaderboard, getUserData, subscribeToLeaderboard } from '../firebase/gamificationConfig';
import { useAuth } from '../contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, G, Rect } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const LeaderboardScreen = ({ navigation }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('coins');
  const [timeFilter, setTimeFilter] = useState('all');
  const [userRank, setUserRank] = useState(null);
  const [userPercentile, setUserPercentile] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [animationsReady, setAnimationsReady] = useState(false);
  const { user } = useAuth();

  // Core Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const headerHeight = useRef(new Animated.Value(320)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const crownBounce = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(0)).current;
  
  // Background orb animations
  const orbAnims = useRef([...Array(3)].map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    scale: new Animated.Value(0.8),
    opacity: new Animated.Value(0.2),
  }))).current;
  
  // Individual rank animations
  const [rankAnims, setRankAnims] = useState([]);
  
  // Podium animations
  const podiumAnims = useRef([...Array(3)].map(() => ({
    height: new Animated.Value(0),
    scale: new Animated.Value(0),
    glow: new Animated.Value(0),
    bounce: new Animated.Value(0),
  }))).current;
  
  // Particle system
  const particleAnims = useRef([...Array(20)].map(() => ({
    x: new Animated.Value(Math.random() * screenWidth),
    y: new Animated.Value(-50),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(Math.random() * 0.5 + 0.5),
  }))).current;
  
  // Confetti animations
  const confettiAnims = useRef([...Array(30)].map(() => ({
    x: new Animated.Value(Math.random() * screenWidth),
    y: new Animated.Value(-50),
    rotate: new Animated.Value(0),
    opacity: new Animated.Value(1),
  }))).current;
  
  // Progress ring animations
  const progressRing = useRef(new Animated.Value(0)).current;
  
  // Tab indicator animation
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Initialize rank animations
  useEffect(() => {
    const anims = [...Array(50)].map(() => ({
      scale: new Animated.Value(0),
      translateX: new Animated.Value(-screenWidth),
      opacity: new Animated.Value(0),
      glow: new Animated.Value(0),
    }));
    setRankAnims(anims);
    setAnimationsReady(true);
  }, []);

  // Trigger entrance animation when data is loaded
  useEffect(() => {
    if (animationsReady && leaderboardData.length > 0 && !loading) {
      animateEntrance();
    }
  }, [animationsReady, leaderboardData.length, loading]);

  useEffect(() => {
    if (user && animationsReady) {
      loadData();
      animateEntrance();
      startContinuousAnimations();
      startParticleAnimation();
      animateOrbs();

      if (selectedTab === 'coins' || selectedTab === 'badges') {
        const unsubscribe = subscribeToLeaderboard(selectedTab, (data) => {
          setLeaderboardData(data);
          const rank = data.findIndex(item => item.userId === user.uid) + 1;
          setUserRank(rank > 0 ? rank : null);
          setUserPercentile(rank > 0 ? ((data.length - rank) / data.length * 100).toFixed(1) : 0);
          animateRankChanges(data);
        });
        return () => unsubscribe();
      }
    }
  }, [selectedTab, user, animationsReady]);

  const startContinuousAnimations = () => {
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

    // Shimmer animation
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Crown bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(crownBounce, {
          toValue: -10,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(crownBounce, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Progress ring animation
    Animated.loop(
      Animated.timing(progressRing, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const animateOrbs = () => {
    orbAnims.forEach((orb, index) => {
      const animateOrb = () => {
        Animated.parallel([
          Animated.timing(orb.x, {
            toValue: (Math.random() - 0.5) * 100,
            duration: 4000 + index * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(orb.y, {
            toValue: (Math.random() - 0.5) * 100,
            duration: 4000 + index * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(orb.scale, {
              toValue: 1.2,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.timing(orb.scale, {
              toValue: 0.8,
              duration: 2500,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => animateOrb());
      };
      animateOrb();
    });
  };

  const startParticleAnimation = () => {
    particleAnims.forEach((particle, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: screenHeight + 50,
              duration: 8000 + Math.random() * 4000,
              easing: Easing.linear,
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
                delay: 4000,
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
          ]),
        ])
      ).start();
    });
  };

  const animateEntrance = () => {
    if (!animationsReady || leaderboardData.length === 0) return;
    
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
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
      Animated.spring(starScale, {
        toValue: 1,
        delay: 300,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      animatePodium();
    });
  };

  const animatePodium = () => {
    const positions = Math.min(leaderboardData.length, 3);
    for (let i = 0; i < positions; i++) {
      const delay = i * 200;
      const heights = [200, 160, 130];
      
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.spring(podiumAnims[i].height, {
            toValue: heights[i],
            friction: 7,
            tension: 50,
            useNativeDriver: false,
          }),
          Animated.spring(podiumAnims[i].scale, {
            toValue: 1,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Continuous glow and bounce
      Animated.loop(
        Animated.sequence([
          Animated.timing(podiumAnims[i].glow, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(podiumAnims[i].glow, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(podiumAnims[i].bounce, {
            toValue: -5,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(podiumAnims[i].bounce, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  };

  const animateRankChanges = (data) => {
    if (!animationsReady || rankAnims.length === 0) return;
    
    data.forEach((_, index) => {
      if (index < rankAnims.length && rankAnims[index]) {
        Animated.sequence([
          Animated.delay(index * 30),
          Animated.parallel([
            Animated.spring(rankAnims[index].scale, {
              toValue: 1,
              friction: 7,
              tension: 50,
              useNativeDriver: true,
            }),
            Animated.timing(rankAnims[index].translateX, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(rankAnims[index].opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }
    });
  };

  const triggerConfetti = () => {
    confettiAnims.forEach((confetti, index) => {
      confetti.x.setValue(screenWidth / 2 + (Math.random() - 0.5) * 100);
      confetti.y.setValue(-50);
      confetti.opacity.setValue(1);
      confetti.rotate.setValue(0);

      Animated.parallel([
        Animated.timing(confetti.y, {
          toValue: screenHeight,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.quad,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.x, {
          toValue: confetti.x._value + (Math.random() - 0.5) * 300,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.rotate, {
          toValue: Math.random() * 720,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.opacity, {
          toValue: 0,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const loadData = async () => {
    try {
      if (user) {
        const userInfo = await getUserData(user.uid);
        setUserData(userInfo);

        const leaderboard = await getLeaderboard(selectedTab);
        setLeaderboardData(leaderboard);

        const rank = leaderboard.findIndex(item => item.userId === user.uid) + 1;
        setUserRank(rank > 0 ? rank : null);
        setUserPercentile(rank > 0 ? ((leaderboard.length - rank) / leaderboard.length * 100).toFixed(1) : 0);
        
        if (leaderboard.length > 0 && animationsReady) {
          setTimeout(() => animateRankChanges(leaderboard), 500);
        }
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    triggerConfetti();
  };

  const handleTabChange = (tab) => {
    if (tab === selectedTab) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate tab indicator
    const tabIndex = tab === 'coins' ? 0 : tab === 'badges' ? 1 : 2;
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    // Simply change the tab without resetting animations
    setSelectedTab(tab);
  };

  const handleTimeFilterChange = (filter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeFilter(filter);
    triggerConfetti();
  };

  const handleUserPress = (user) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedUser(user);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    if (rank <= 20) return '✨';
    return null;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    if (rank <= 10) return '#667eea';
    if (rank <= 20) return '#a855f7';
    return '#64748b';
  };

  if (loading || !animationsReady) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#f8faff', '#f0f4ff', '#e8ecff']}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View style={[styles.loadingOrb, {
          transform: [{ scale: pulseAnim }],
          opacity: glowAnim,
        }]}>
          <LinearGradient
            colors={['#667eea', '#a855f7', '#f472b6']}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color="#FFF" />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f8faff', '#f0f4ff', '#e8ecff']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated Background Elements */}
      <Animated.View style={[styles.backgroundOrb1, {
        transform: [
          { translateX: orbAnims[0].x },
          { translateY: orbAnims[0].y },
          { scale: orbAnims[0].scale },
        ],
        opacity: orbAnims[0].opacity,
      }]} />
      <Animated.View style={[styles.backgroundOrb2, {
        transform: [
          { translateX: orbAnims[1].x },
          { translateY: orbAnims[1].y },
          { scale: orbAnims[1].scale },
        ],
        opacity: orbAnims[1].opacity,
      }]} />
      <Animated.View style={[styles.backgroundOrb3, {
        transform: [
          { translateX: orbAnims[2].x },
          { translateY: orbAnims[2].y },
          { scale: orbAnims[2].scale },
        ],
        opacity: orbAnims[2].opacity,
      }]} />

      {/* Particles */}
      {particleAnims.map((particle, index) => (
        <Animated.View
          key={`particle-${index}`}
          style={[styles.particle, {
            transform: [
              { translateX: particle.x },
              { translateY: particle.y },
              { scale: particle.scale },
            ],
            opacity: particle.opacity,
          }]}
        />
      ))}

      {/* Confetti */}
      {confettiAnims.map((confetti, index) => (
        <Animated.View
          key={`confetti-${index}`}
          style={[styles.confetti, {
            backgroundColor: ['#FFD700', '#667eea', '#a855f7', '#f472b6', '#10b981'][index % 5],
            transform: [
              { translateX: confetti.x },
              { translateY: confetti.y },
              { rotate: confetti.rotate.interpolate({
                inputRange: [0, 720],
                outputRange: ['0deg', '720deg'],
              }) },
            ],
            opacity: confetti.opacity,
          }]}
        />
      ))}

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#667eea" />
        }
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
          {/* Header */}
          <Animated.View style={[styles.header, {
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [0, -30],
                extrapolate: 'clamp',
              })
            }]
          }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <BlurView intensity={90} tint="light" style={styles.blurButton}>
                <MaterialIcons name="arrow-back" size={24} color="#1e293b" />
              </BlurView>
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <MaskedView
                maskElement={
                  <Text style={styles.headerTitle}>Leaderboard</Text>
                }
              >
                <LinearGradient
                  colors={['#667eea', '#a855f7', '#f472b6']}
                  start={{ x: shimmerAnim, y: 0 }}
                  end={{ x: shimmerAnim, y: 1 }}
                >
                  <Text style={[styles.headerTitle, { opacity: 0 }]}>Leaderboard</Text>
                </LinearGradient>
              </MaskedView>
              <Animated.View style={[styles.crownIcon, {
                transform: [
                  { translateY: crownBounce },
                  { scale: starScale },
                ],
              }]}>
                <Text style={styles.crownEmoji}>👑</Text>
              </Animated.View>
            </View>

            <TouchableOpacity style={styles.infoButton}>
              <BlurView intensity={90} tint="light" style={styles.blurButton}>
                <MaterialIcons name="info-outline" size={24} color="#1e293b" />
              </BlurView>
            </TouchableOpacity>
          </Animated.View>

          {/* Time Filter */}
          {/* <View style={styles.timeFilterContainer}>
            <BlurView intensity={90} tint="light" style={styles.timeFilterBlur}>
              <TouchableOpacity
                style={[styles.timeFilter, timeFilter === 'all' && styles.timeFilterActive]}
                onPress={() => handleTimeFilterChange('all')}
              >
                <Text style={[styles.timeFilterText, timeFilter === 'all' && styles.timeFilterTextActive]}>
                  All Time
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeFilter, timeFilter === 'all' && styles.timeFilterActive]}
                onPress={() => handleTimeFilterChange('all')}
              >
                <Text style={[styles.timeFilterText, timeFilter === 'all' && styles.timeFilterTextActive]}>
                  All Time
                </Text>
              </TouchableOpacity>
            </BlurView>
          </View> */}

          {/* User Stats Card */}
          {userRank && userData && (
            <Animated.View style={[styles.userStatsCard, { transform: [{ scale: pulseAnim }] }]}>
              <BlurView intensity={90} tint="light" style={styles.userStatsBlur}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(243, 232, 255, 0.4)']}
                  style={styles.userStatsGradient}
                >
                  <View style={styles.userStatsContent}>
                    <View style={styles.userRankSection}>
                      <View style={styles.userRankBadge}>
                        <LinearGradient
                          colors={['#667eea', '#a855f7']}
                          style={styles.userRankGradient}
                        >
                          <Text style={styles.userRankNumber}>#{userRank}</Text>
                          {getRankIcon(userRank) && (
                            <Animated.View style={{
                              transform: [{ scale: pulseAnim }],
                              position: 'absolute',
                              top: -8,
                              right: -8,
                            }}>
                              <Text style={styles.rankIcon}>{getRankIcon(userRank)}</Text>
                            </Animated.View>
                          )}
                        </LinearGradient>
                      </View>
                      
                      <View style={styles.userStatsInfo}>
                        <Text style={styles.userStatsTitle}>Your Ranking</Text>
                        <Text style={styles.userStatsText}>
                          Better than{' '}
                          <Text style={styles.userStatsHighlight}>{userPercentile}%</Text>{' '}
                          of players
                        </Text>
                        
                        <View style={styles.progressBarContainer}>
                          <Animated.View style={[styles.progressBar, {
                            width: `${userPercentile}%`,
                            backgroundColor: getRankColor(userRank),
                          }]} />
                          <View style={styles.progressBarGlow} />
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.userQuickStats}>
                      <View style={styles.quickStat}>
                        <FontAwesome5 name="coins" size={20} color="#FFD700" />
                        <Text style={styles.quickStatValue}>{userData?.totalCoinsEarned || userData?.coins || 0}</Text>
                        <Text style={styles.quickStatLabel}>Coins</Text>
                      </View>
                      <View style={styles.quickStatDivider} />
                      <View style={styles.quickStat}>
                        <MaterialIcons name="military-tech" size={20} color="#a855f7" />
                        <Text style={styles.quickStatValue}>{userData?.badges?.length || 0}</Text>
                        <Text style={styles.quickStatLabel}>Badges</Text>
                      </View>
                      <View style={styles.quickStatDivider} />
                      <View style={styles.quickStat}>
                        <MaterialIcons name="trending-up" size={20} color="#10b981" />
                        <Text style={styles.quickStatValue}>{userData?.level || 1}</Text>
                        <Text style={styles.quickStatLabel}>Level</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          )}

          {/* Tab Selector */}
          {/* <View style={styles.tabContainer}>
            <BlurView intensity={90} tint="light" style={styles.tabBlur}>
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    transform: [{
                      translateX: tabIndicatorAnim.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [0, screenWidth / 3 - 20, (screenWidth / 3 - 20) * 2],
                      }),
                    }],
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabChange('coins')}
              >
                <MaterialCommunityIcons 
                  name="coin" 
                  size={22} 
                  color={selectedTab === 'coins' ? '#667eea' : '#94a3b8'} 
                />
                <Text style={[styles.tabText, selectedTab === 'coins' && styles.tabTextActive]}>
                  Coins
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabChange('badges')}
              >
                <MaterialIcons 
                  name="military-tech" 
                  size={22} 
                  color={selectedTab === 'badges' ? '#667eea' : '#94a3b8'} 
                />
                <Text style={[styles.tabText, selectedTab === 'badges' && styles.tabTextActive]}>
                  Badges
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabChange('level')}
              >
                <MaterialIcons 
                  name="trending-up" 
                  size={22} 
                  color={selectedTab === 'level' ? '#667eea' : '#94a3b8'} 
                />
                <Text style={[styles.tabText, selectedTab === 'level' && styles.tabTextActive]}>
                  Level
                </Text>
              </TouchableOpacity>
            </BlurView>
          </View> */}

          {/* Top 3 Podium - Show only if we have more than 3 users */}
          {leaderboardData.length > 1 && (
            <View style={styles.podiumContainer}>
              
              {/* Silver - 2nd Place */}
              {leaderboardData.length > 1 && (
                <Animated.View style={[styles.podiumItem, {
                  transform: [
                    { scale: podiumAnims[1].scale },
                    { translateY: podiumAnims[1].bounce },
                  ]
                }]}>
                  <TouchableOpacity onPress={() => handleUserPress(leaderboardData[1])} activeOpacity={0.8}>
                    <Animated.View style={[styles.podiumAvatar, styles.silverPodium, {
                      shadowOpacity: 0.1,
                    }]}>
                      {leaderboardData[1].profilePicture ? (
                        <Image source={{ uri: leaderboardData[1].profilePicture }} style={styles.podiumPicture} />
                      ) : (
                        <LinearGradient colors={['#e5e7eb', '#9ca3af']} style={styles.avatarGradient}>
                          <Text style={styles.avatarInitial}>{leaderboardData[1].username?.charAt(0)?.toUpperCase() || '?'}</Text>
                        </LinearGradient>
                      )}
                      <View style={[styles.podiumRankBadge, styles.silverRankBadge]}>
                        <Text style={styles.podiumRankText}>2</Text>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                  <Text style={styles.podiumName}>{leaderboardData[1].username || 'User'}</Text>
                  <View style={styles.podiumStats}>
                    <FontAwesome5 name="coins" size={16} color="#9ca3af" />
                    <Text style={styles.podiumScore}>{leaderboardData[1].coins}</Text>
                  </View>
                  <Animated.View style={[styles.podiumBar, {
                    height: podiumAnims[1].height,
                  }]}>
                    <LinearGradient colors={['#e5e7eb', '#d1d5db']} style={styles.podiumBarGradient}>
                      <Text style={styles.podiumBarText}>2nd</Text>
                    </LinearGradient>
                  </Animated.View>
                </Animated.View>
              )}

              {/* Gold - 1st Place */}
              <Animated.View style={[styles.podiumItem, styles.firstPlace, {
                transform: [
                  { scale: podiumAnims[0].scale },
                  { translateY: podiumAnims[0].bounce },
                ]
              }]}>
                <TouchableOpacity onPress={() => handleUserPress(leaderboardData[0])} activeOpacity={0.8}>
                  <Animated.View style={[styles.podiumAvatar, styles.goldPodium, {
                    shadowOpacity: podiumAnims[0].glow.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 0.8],
                    }),
                  }]}>
                    {leaderboardData[0].profilePicture ? (
                      <Image source={{ uri: leaderboardData[0].profilePicture }} style={styles.podiumPicture} />
                    ) : (
                      <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.avatarGradient}>
                        <Text style={styles.avatarInitial}>{leaderboardData[0].username?.charAt(0)?.toUpperCase() || '?'}</Text>
                      </LinearGradient>
                    )}
                    <Animated.View style={[styles.podiumRankBadge, styles.goldRankBadge, {
                      transform: [{ rotate: progressRing.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }) }],
                    }]}>
                      <Text style={styles.podiumRankText}>👑</Text>
                    </Animated.View>
                  </Animated.View>
                </TouchableOpacity>
                <Text style={[styles.podiumName, styles.goldName]}>{leaderboardData[0].username || 'User'}</Text>
                <View style={styles.podiumStats}>
                  <FontAwesome5 name="coins" size={18} color="#f59e0b" />
                  <Text style={[styles.podiumScore, styles.goldScore]}>{leaderboardData[0].coins}</Text>
                </View>
                <Animated.View style={[styles.podiumBar, {
                  height: podiumAnims[0].height,
                }]}>
                  <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.podiumBarGradient}>
                    <Text style={styles.podiumBarText}>1st</Text>
                  </LinearGradient>
                </Animated.View>
              </Animated.View>

              {/* Bronze - 3rd Place */}
              {leaderboardData.length > 2 && (
                <Animated.View style={[styles.podiumItem, {
                  transform: [
                    { scale: podiumAnims[2].scale },
                    { translateY: podiumAnims[2].bounce },
                  ]
                }]}>
                  <TouchableOpacity onPress={() => handleUserPress(leaderboardData[2])} activeOpacity={0.8}>
                    <Animated.View style={[styles.podiumAvatar, styles.bronzePodium, {
                      shadowOpacity: 0.1,
                    }]}>
                      {leaderboardData[2].profilePicture ? (
                        <Image source={{ uri: leaderboardData[2].profilePicture }} style={styles.podiumPicture} />
                      ) : (
                        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.avatarGradient}>
                          <Text style={styles.avatarInitial}>{leaderboardData[2].username?.charAt(0)?.toUpperCase() || '?'}</Text>
                        </LinearGradient>
                      )}
                      <View style={[styles.podiumRankBadge, styles.bronzeRankBadge]}>
                        <Text style={styles.podiumRankText}>3</Text>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                  <Text style={styles.podiumName}>{leaderboardData[2].username || 'User'}</Text>
                  <View style={styles.podiumStats}>
                    <FontAwesome5 name="coins" size={16} color="#d97706" />
                    <Text style={styles.podiumScore}>{leaderboardData[2].coins}</Text>
                  </View>
                  <Animated.View style={[styles.podiumBar, {
                    height: podiumAnims[2].height,
                  }]}>
                    <LinearGradient colors={['#f59e0b', '#dc2626']} style={styles.podiumBarGradient}>
                      <Text style={styles.podiumBarText}>3rd</Text>
                    </LinearGradient>
                  </Animated.View>
                </Animated.View>
              )}
            </View>
          )}

          {/* Leaderboard List */}
          <View style={styles.listContainer}>
            {leaderboardData.length > 0 ? (
              // Show remaining users after top 3, or all users if 3 or fewer
              (leaderboardData.length <= 3 ? leaderboardData : leaderboardData.slice(3)).map((userItem, index) => {
                const actualIndex = leaderboardData.length <= 3 ? index : index + 3;
                const isCurrentUser = userItem.userId === user?.uid;
                const rankIndex = Math.min(index, rankAnims.length - 1);
                
                return (
                  <Animated.View
                    key={userItem.userId}
                    style={[
                      styles.listItem,
                      // isCurrentUser && styles.currentUserItem,
                      {
                        opacity: fadeAnim,
                        transform: [
                          { translateY: slideAnim },
                          { scale: scaleAnim },
                        ],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleUserPress(userItem)}
                      activeOpacity={0.7}
                      style={styles.listItemTouchable}
                    >
                      <BlurView intensity={90} tint="light" style={styles.listItemBlur}>
                        <LinearGradient
                          colors={isCurrentUser 
                            ? ['rgba(255, 255, 255, 0.9)', 'rgba(249, 250, 251, 0.9)']
                            : ['rgba(255, 255, 255, 0.9)', 'rgba(249, 250, 251, 0.9)']}
                          style={styles.listItemGradient}
                        >
                          <View style={styles.listItemContent}>
                            <View style={[styles.listRank, { backgroundColor: getRankColor(actualIndex + 1) + '20' }]}>
                              <Text style={[styles.listRankText, { color: getRankColor(actualIndex + 1) }]}>
                                {actualIndex + 1}
                              </Text>
                              {getRankIcon(actualIndex + 1) && (
                                <Text style={styles.listRankIcon}>{getRankIcon(actualIndex + 1)}</Text>
                              )}
                            </View>
                            
                            <View style={styles.listUserInfo}>
                              <View style={[styles.listAvatar, ]}>
                                {userItem.profilePicture ? (
                                  <Image source={{ uri: userItem.profilePicture }} style={styles.listPicture} />
                                ) : (
                                  <LinearGradient
                                    colors={isCurrentUser ? ['#667eea', '#a855f7'] : ['#e5e7eb', '#d1d5db']}
                                    style={styles.avatarGradient}
                                  >
                                    <Text style={[styles.avatarInitial, isCurrentUser && styles.currentUserInitial]}>
                                      {userItem.username?.charAt(0)?.toUpperCase() || '?'}
                                    </Text>
                                  </LinearGradient>
                                )}
                              </View>
                              
                              <View style={styles.listUserDetails}>
                                <Text style={[styles.listUsername, isCurrentUser && styles.currentUsername]}>
                                  {userItem.username || 'User'}
                                </Text>
                                <View style={styles.userProgressContainer}>
                                  <View style={styles.userProgressBar}>
                                    <Animated.View
                                      style={[styles.userProgress, {
                                        width: `${Math.min((userItem[selectedTab === 'badges' ? 'badges' : selectedTab === 'level' ? 'level' : 'coins'] / (leaderboardData[0]?.[selectedTab === 'badges' ? 'badges' : selectedTab === 'level' ? 'level' : 'coins'] || 1) * 100), 100)}%`,
                                        backgroundColor: getRankColor(actualIndex + 1),
                                      }]}
                                    />
                                  </View>
                                </View>
                              </View>
                            </View>
                            
                            <View style={styles.listScore}>
                              {selectedTab === 'coins' && (
                                <>
                                  <FontAwesome5 name="coins" size={20} color="#FFD700" />
                                  <Text style={styles.listScoreText}>{userItem.coins}</Text>
                                </>
                              )}
                              {selectedTab === 'badges' && (
                                <>
                                  <MaterialIcons name="military-tech" size={20} color="#a855f7" />
                                  <Text style={styles.listScoreText}>{userItem.badges}</Text>
                                </>
                              )}
                              {selectedTab === 'level' && (
                                <>
                                  <MaterialIcons name="trending-up" size={20} color="#10b981" />
                                  <Text style={styles.listScoreText}>Lv {userItem.level}</Text>
                                </>
                              )}
                            </View>
                          </View>
                        </LinearGradient>
                      </BlurView>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            ) : (
              !loading && (
                <View style={styles.emptyState}>
                  <BlurView intensity={90} tint="light" style={styles.emptyStateBlur}>
                    <MaterialIcons name="leaderboard" size={64} color="#cbd5e1" />
                    <Text style={styles.emptyStateText}>No players on the leaderboard yet</Text>
                    <Text style={styles.emptyStateSubtext}>Be the first to submit a report!</Text>
                  </BlurView>
                </View>
              )
            )}
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    zIndex: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  blurButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  headerTitleContainer: {
    alignItems: 'center',
    marginTop: 50
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  crownIcon: {
    position: 'absolute',
    top: -25,
  },
  crownEmoji: {
    fontSize: 24,
  },
  timeFilterContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeFilterBlur: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  timeFilter: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeFilterActive: {
    backgroundColor: '#667eea',
  },
  timeFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  timeFilterTextActive: {
    color: '#FFF',
  },
  userStatsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  userStatsBlur: {
    borderRadius: 24,
  },
  userStatsGradient: {
    padding: 20,
  },
  userStatsContent: {
    flex: 1,
  },
  userRankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userRankBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  userRankGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userRankNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
  },
  rankIcon: {
    fontSize: 24,
  },
  userStatsInfo: {
    flex: 1,
  },
  userStatsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  userStatsText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  userStatsHighlight: {
    color: '#667eea',
    fontWeight: '700',
    fontSize: 18,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressBarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 5,
  },
  userQuickStats: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  tabContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBlur: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: (screenWidth - 40 - 8) / 3,
    height: 48,
    backgroundColor: '#667eea',
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#FFF',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 40,
    minHeight: 280,
    position: 'relative',
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  firstPlace: {
    marginBottom: 30,
  },
  podiumAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 4,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  goldPodium: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: '#fbbf24',
    shadowColor: '#000',
    shadowOpacity: 0.15,
  },
  silverPodium: {
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  bronzePodium: {
    borderColor: '#f59e0b',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  podiumPicture: {
    width: '100%',
    height: '100%',
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  podiumRankBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goldRankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fbbf24',
    borderColor: '#fbbf24',
  },
  silverRankBadge: {
    backgroundColor: '#e5e7eb',
    borderColor: '#e5e7eb',
  },
  bronzeRankBadge: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  podiumRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  podiumName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  goldName: {
    fontSize: 18,
    color: '#1e293b',
  },
  podiumStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  podiumScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 4,
  },
  goldScore: {
    fontSize: 20,
  },
  podiumBar: {
    width: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  podiumBarGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
  },
  podiumBarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  listItem: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentUserItem: {
    borderWidth: 2,
    borderColor: '#667eea',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  listItemTouchable: {
    flex: 1,
  },
  listItemBlur: {
    borderRadius: 20,
  },
  listItemGradient: {
    flex: 1,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  listRank: {
    minWidth: 60,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexDirection: 'row',
  },
  listRankText: {
    fontSize: 16,
    fontWeight: '800',
  },
  listRankIcon: {
    fontSize: 14,
    marginLeft: 4,
  },
  listUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  currentUserAvatar: {
    borderColor: '#667eea',
  },
  listPicture: {
    width: '100%',
    height: '100%',
  },
  currentUserInitial: {
    color: '#FFF',
  },
  listUserDetails: {
    flex: 1,
  },
  listUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  currentUsername: {
    color: '#667eea',
  },
  userProgressContainer: {
    flex: 1,
  },
  userProgressBar: {
    height: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  userProgress: {
    height: '100%',
    borderRadius: 2,
  },
  listScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 6,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  backgroundOrb1: {
    position: 'absolute',
    top: 50,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#a855f7',
  },
  backgroundOrb2: {
    position: 'absolute',
    top: 300,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#667eea',
  },
  backgroundOrb3: {
    position: 'absolute',
    bottom: 100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#f472b6',
  },
  emptyState: {
    marginHorizontal: 20,
    marginTop: 50,
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyStateBlur: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
});

export default LeaderboardScreen;