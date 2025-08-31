// components/NavOptionsPedestrian.js
import React, { useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

const { width: screenWidth } = Dimensions.get("window");

const NavOptionsPedestrian = () => {
  const navigation = useNavigation();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideLeftAnim = useRef(new Animated.Value(-50)).current;
  const slideRightAnim = useRef(new Animated.Value(50)).current;
  const scaleReportAnim = useRef(new Animated.Value(0.8)).current;
  const scaleMapAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideLeftAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(slideRightAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleReportAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleMapAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation
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
  }, []);

  const handlePressIn = (anim) => {
    Animated.spring(anim, {
      toValue: 0.95,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (anim, destination) => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      navigation.navigate(destination);
    });
  };

  const handlePress = (destination) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Main Actions Row */}
      <View style={styles.mainActionsRow}>
        {/* Report Issue Card */}
        <Animated.View
          style={[
            styles.actionCard,
            {
              transform: [
                { translateX: slideLeftAnim },
                { scale: scaleReportAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity
            onPressIn={() => handlePressIn(scaleReportAnim)}
            onPressOut={() => handlePressOut(scaleReportAnim, "PedestrianUpload")}
            onPress={() => handlePress("PedestrianUpload")}
            activeOpacity={0.9}
            style={styles.touchableCard}
          >
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons name="report-problem" size={32} color="#FFF" />
                  <Animated.View
                    style={[
                      styles.pulseIcon,
                      {
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  >
                    <View style={styles.plusBadge}>
                      <MaterialIcons name="add" size={14} color="#FFF" />
                    </View>
                  </Animated.View>
                </View>
                <Text style={styles.cardTitle}>Report Issue</Text>
                <Text style={styles.cardSubtitle}>Help improve your city</Text>
                
                <View style={styles.rewardsBadge}>
                  <FontAwesome5 name="coins" size={14} color="#fbbf24" />
                  <Text style={styles.rewardsText}>Earn Rewards</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Map View Card */}
        <Animated.View
          style={[
            styles.actionCard,
            {
              transform: [
                { translateX: slideRightAnim },
                { scale: scaleMapAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity
            onPressIn={() => handlePressIn(scaleMapAnim)}
            onPressOut={() => handlePressOut(scaleMapAnim, "MapViewGeoFencing")}
            onPress={() => handlePress("MapViewGeoFencing")}
            activeOpacity={0.9}
            style={styles.touchableCard}
          >
            <LinearGradient
              colors={["#f093fb", "#f5576c"]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconWrapper}>
                  <MaterialCommunityIcons name="map-marker-radius" size={32} color="#FFF" />
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>City Map</Text>
                <Text style={styles.cardSubtitle}>Track issues nearby</Text>
                
                <View style={styles.featureBadge}>
                  <Ionicons name="location" size={14} color="#4ade80" />
                  <Text style={styles.featureText}>Real-time</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Quick Stats Bar */}
      <View style={styles.statsBar}>
        <BlurView intensity={80} tint="light" style={styles.blurContainer}>
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrapper}>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#fbbf24" />
              </View>
              <Text style={styles.statLabel}>Quick Report</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <View style={styles.statIconWrapper}>
                <MaterialIcons name="verified" size={16} color="#3b82f6" />
              </View>
              <Text style={styles.statLabel}>AI Verified</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <View style={styles.statIconWrapper}>
                <MaterialCommunityIcons name="shield-check" size={16} color="#10b981" />
              </View>
              <Text style={styles.statLabel}>Safe & Secure</Text>
            </View>
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth - 40,
    alignItems: "center",
  },
  mainActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  actionCard: {
    width: "48%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  touchableCard: {
    width: "100%",
  },
  cardGradient: {
    padding: 20,
    alignItems: "center",
    minHeight: 180,
    justifyContent: "space-between",
  },
  cardContent: {
    alignItems: "center",
    width: "100%",
  },
  iconWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  pulseIcon: {
    position: "absolute",
    top: -5,
    right: -10,
  },
  plusBadge: {
    backgroundColor: "#4ade80",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  liveBadge: {
    position: "absolute",
    top: -5,
    right: -35,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 16,
  },
  rewardsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  rewardsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 5,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  featureText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 5,
  },
  statsBar: {
    width: "100%",
    borderRadius: 20,
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
  blurContainer: {
    borderRadius: 20,
  },
  statsContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 10,
  },
});

export default NavOptionsPedestrian;