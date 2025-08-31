// screens/PedestrianDashboard.js - Enhanced Header Section
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, MaterialCommunityIcons, Ionicons, FontAwesome5,  } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useAuth } from "../contexts/AuthContext";
import { getUserData } from "../firebase/gamificationConfig";
import NavOptionsPedestrian from "../components/NavOptionsPedestrian";
import GuardianChatbot from "../components/GuardianChatbot";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const PedestrianDashboard = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const { user } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const coinPulse = useRef(new Animated.Value(1)).current;
  const profileRing = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const chatbotScale = useRef(new Animated.Value(0)).current;
  const chatbotRotate = useRef(new Animated.Value(0)).current;
  const chatbotBounce = useRef(new Animated.Value(0)).current;
  const chatbotGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserData();
    animateEntrance();
    startContinuousAnimations();
  }, []);

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
    ]).start(() => {
      // Animate chatbot entrance
      Animated.spring(chatbotScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const startContinuousAnimations = () => {
    // Coin pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(coinPulse, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(coinPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Profile ring rotation
    Animated.loop(
      Animated.timing(profileRing, {
        toValue: 1,
        duration: 3000,
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

    // Chatbot animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(chatbotBounce, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(chatbotBounce, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(chatbotRotate, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(chatbotGlow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(chatbotGlow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadUserData = async () => {
    try {
      if (user) {
        const data = await getUserData(user.uid);
        setUserData(data);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadUserData().then(() => setRefreshing(false));
  }, []);

  const handleCoinPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(coinPulse, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(coinPulse, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    navigation.navigate("OffersRedeem");
  };

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ProfilePage");
  };

  const handleChatbotPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChatModalVisible(true);
    
    // Animate chatbot press
    Animated.sequence([
      Animated.timing(chatbotScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(chatbotScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#f8faff", "#f0f4ff", "#e8ecff"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Background Decorations */}
      <Animated.View 
        style={[
          styles.backgroundCircle1,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.3],
            }),
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#667eea"
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
          {/* Enhanced Header Section */}
          <View style={styles.header}>
            <BlurView intensity={80} tint="light" style={styles.headerBlur}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.9)", "rgba(255, 255, 255, 0.7)"]}
                style={styles.headerGradient}
              >
                <View style={styles.headerTop}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.greetingText}>
                      {getGreeting()},
                    </Text>
                    <Text style={styles.userName}>
                      {userData?.firstName || userData?.username || "User"}
                    </Text>
                  </View>

                  <View style={styles.headerRight}>
                    {/* Coins Button */}
                    <TouchableOpacity
                      onPress={handleCoinPress}
                      activeOpacity={0.9}
                    >
                      <Animated.View
                        style={[
                          styles.coinContainer,
                          {
                            transform: [{ scale: coinPulse }],
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={["#fbbf24", "#f59e0b"]}
                          style={styles.coinButton}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <FontAwesome5 name="coins" size={18} color="#FFF" />
                          <Text style={styles.coinText}>{userData?.coins || 0}</Text>
                          <View style={styles.coinArrow}>
                            <MaterialIcons name="chevron-right" size={16} color="#FFF" />
                          </View>
                        </LinearGradient>
                      </Animated.View>
                    </TouchableOpacity>

                    {/* Profile Button */}
                    <TouchableOpacity
                      onPress={handleProfilePress}
                      activeOpacity={0.9}
                      style={styles.profileButtonWrapper}
                    >
                      <Animated.View
                        style={[
                          styles.profileRing,
                          {
                            transform: [
                              {
                                rotate: profileRing.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ["0deg", "360deg"],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={["#667eea", "#764ba2", "#f093fb"]}
                          style={styles.profileRingGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                      </Animated.View>
                      <View style={styles.profileButton}>
                        <Image
                          source={{
                            uri:
                              userData?.profilePicture ||
                              "https://i.pravatar.cc/100?u=default",
                          }}
                          style={styles.profileImage}
                        />
                        {userData?.level && (
                          <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>{userData.level}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.headerBottom}>
                  <View style={styles.motivationCard}>
                    <LinearGradient
                      colors={["rgba(102, 126, 234, 0.1)", "rgba(118, 75, 162, 0.1)"]}
                      style={styles.motivationGradient}
                    >
                      <FontAwesome5 name="trophy" size={16} color="#667eea" />
                      <Text style={styles.motivationText}>
                        {getMotivationalMessage(userData?.reportCount || 0)}
                      </Text>
                    </LinearGradient>
                  </View>
                </View>
              </LinearGradient>
            </BlurView>
          </View>

          {/* Stats Overview */}
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <MaterialIcons name="report" size={24} color="#667eea" />
                <Text style={styles.statValue}>{userData?.reportCount || 0}</Text>
                <Text style={styles.statLabel}>Issues Reported</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="fire" size={24} color="#f97316" />
                <Text style={styles.statValue}>{userData?.currentStreak || 0}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="medal" size={24} color="#fbbf24" />
                <Text style={styles.statValue}>{userData?.badges?.length || 0}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("BadgesScreen");
              }}
            >
              <View style={styles.actionIcon}>
                <MaterialCommunityIcons name="trophy" size={20} color="#fbbf24" />
              </View>
              <Text style={styles.actionText}>Badges</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("LeaderboardScreen");
              }}
            >
              <View style={styles.actionIcon}>
                <MaterialIcons name="leaderboard" size={20} color="#667eea" />
              </View>
              <Text style={styles.actionText}>Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("RewardsPedestrian");
              }}
            >
              <View style={styles.actionIcon}>
                <MaterialCommunityIcons name="gift" size={20} color="#f472b6" />
              </View>
              <Text style={styles.actionText}>Rewards</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("MapViewGeoFencing");
              }}
            >
              <View style={styles.actionIcon}>
                <MaterialIcons name="explore" size={20} color="#10b981" />
              </View>
              <Text style={styles.actionText}>Explore</Text>
            </TouchableOpacity>
          </View>

          {/* Nav Options */}
          <View style={styles.navSection}>
            <NavOptionsPedestrian />
          </View>

          {/* Recent Activity */}
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityContainer}>
              {userData?.reportsSubmitted && userData.reportsSubmitted.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activityScrollContent}
                >
                  {userData.reportsSubmitted.slice(-5).reverse().map((report, index) => (
                    <TouchableOpacity
                      key={report.reportId}
                      style={styles.activityCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        // Navigate to report details if needed
                      }}
                    >
                      <LinearGradient
                        colors={
                          report.status === 'resolved' 
                            ? ['#10b981', '#059669']
                            : report.status === 'in_progress'
                            ? ['#f59e0b', '#d97706'] 
                            : ['#6366f1', '#4f46e5']
                        }
                        style={styles.activityGradient}
                      >
                        <View style={styles.activityHeader}>
                          <MaterialIcons 
                            name={
                              report.issueType === 'safety' ? 'security' :
                              report.issueType === 'cleaning' ? 'cleaning-services' :
                              'local-fire-department'
                            } 
                            size={20} 
                            color="#FFF" 
                          />
                          <Text style={styles.activityStatus}>
                            {report.status.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.activityType}>
                          {report.issueType.charAt(0).toUpperCase() + report.issueType.slice(1)} Issue
                        </Text>
                        <Text style={styles.activityLocation} numberOfLines={1}>
                          {report.location}
                        </Text>
                        <Text style={styles.activityTime}>
                          {formatTimeAgo(report.timestamp)}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noActivityContainer}>
                  <LinearGradient
                    colors={['rgba(99, 102, 241, 0.05)', 'rgba(168, 85, 247, 0.05)']}
                    style={styles.noActivityGradient}
                  >
                    <MaterialCommunityIcons 
                      name="calendar-blank" 
                      size={48} 
                      color="#cbd5e1" 
                    />
                    <Text style={styles.noActivityTitle}>No Recent Activity</Text>
                    <Text style={styles.noActivityText}>
                      Start reporting issues to see your activity here
                    </Text>
                    <TouchableOpacity
                      style={styles.noActivityButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate("PedestrianUpload");
                      }}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.noActivityButtonGradient}
                      >
                        <Text style={styles.noActivityButtonText}>Report First Issue</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Chatbot Floating Button */}
      <TouchableOpacity
        style={styles.chatbotButton}
        onPress={handleChatbotPress}
        activeOpacity={0.9}
      >
        <Animated.View
          style={[
            styles.chatbotContainer,
            {
              transform: [
                { scale: chatbotScale },
                { translateY: chatbotBounce },
               
              ],
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.chatbotGlow,
              {
                opacity: chatbotGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                transform: [
                  {
                    scale: chatbotGlow.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />
          
          <View
            // colors={["#FF6B9D", "#FF4757"]}
            style={styles.chatbotGradient}
            // start={{ x: 0, y: 0 }}
            // end={{ x: 1, y: 1 }}
          >
            <View style={styles.chatbotInner}>
              {/* <MaterialCommunityIcons name="robot-happy" size={28} color="#FFF" /> */}

              <Image
                style={{
                  width: 200,
                  height: 200,
                  resizeMode: 'contain',
                  justifyContent: "center",
                  alignSelf:"center",
                  marginRight: 30,
                  marginTop: -25
                }}
                source={require("../assets/images/robot.png")}
              />
              {/* Pulse indicator */}
              <Animated.View
                style={[
                  styles.chatbotIndicator,
                  {
                    opacity: chatbotGlow,
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Guardian Chatbot */}
      <GuardianChatbot 
        visible={chatModalVisible} 
        onClose={() => setChatModalVisible(false)} 
      />
    </SafeAreaView>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getMotivationalMessage = (reportCount) => {
  if (reportCount === 0) return "Start making a difference today!";
  if (reportCount < 5) return "Great start! Keep reporting to help your community.";
  if (reportCount < 10) return "You're on fire! Your reports are making an impact.";
  if (reportCount < 25) return "Community hero in the making! 🌟";
  return "You're a city champion! Thank you for your dedication.";
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  backgroundCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#667eea",
  },
  backgroundCircle2: {
    position: "absolute",
    top: 200,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "#f093fb",
  },
  header: {
    margin: 20,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#667eea",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  headerBlur: {
    borderRadius: 24,
  },
  headerGradient: {
    padding: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  coinContainer: {
    marginRight: 12,
  },
  coinButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  coinText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 6,
    marginRight: 4,
  },
  coinArrow: {
    opacity: 0.8,
  },
  profileButtonWrapper: {
    position: "relative",
  },
  profileRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 30,
    zIndex: -1,
  },
  profileRingGradient: {
    flex: 1,
    borderRadius: 30,
  },
  profileButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    backgroundColor: "#FFF",
    padding: 2,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
  levelBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fbbf24",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  levelText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
  },
  headerBottom: {
    marginTop: 8,
  },
  motivationCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  motivationGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  motivationText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 10,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: "center",
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: "#64748b",
  },
  navSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  // Chatbot Styles
  chatbotButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    zIndex: 1000,
  },
  chatbotContainer: {
    position: "relative",
  },
  chatbotGlow: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 40,
    // backgroundColor: "#FF6B9D",
  },
  chatbotGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B9D",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  chatbotInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  chatbotIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4ade80",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  // Recent Activity Styles
  activityContainer: {
    marginTop: 10,
  },
  activityScrollContent: {
    paddingRight: 20,
  },
  activityCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  activityGradient: {
    padding: 16,
    height: 140,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activityStatus: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activityType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  activityLocation: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  activityTime: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  noActivityContainer: {
    borderRadius: 20,
    overflow: "hidden",
  },
  noActivityGradient: {
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.2)",
    borderRadius: 20,
  },
  noActivityTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#64748b",
    marginTop: 16,
    marginBottom: 8,
  },
  noActivityText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },
  noActivityButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  noActivityButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  noActivityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});

export default PedestrianDashboard;