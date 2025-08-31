// screens/FiremanViewTask.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Video } from 'expo-av';
import { Audio } from 'expo-av';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { showMessage } from 'react-native-flash-message';
import * as Animatable from 'react-native-animatable';
import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDoc,
  arrayRemove,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/authConfig';
import { useAuth } from '../contexts/AuthContext';
import { assignTaskToUser, completeTask } from '../firebase/authConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const colors = {
  // Fire Theme Colors
  fireRed: "#DC2626",
  fireOrange: "#F97316",
  fireYellow: "#FCD34D",
  ember: "#B91C1C",
  smoke: "#374151",
  ash: "#6B7280",
  
  // Backgrounds
  pureWhite: "#FFFFFF",
  softWhite: "#FEFEFE",
  cream: "#FFF5F5",
  pearl: "#FEF2F2",
  
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

const FiremanViewTask = ({ navigation, route }) => {
  const { task } = route.params || {};
  const [taskData, setTaskData] = useState(task);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const { user } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fireFlicker = useRef(new Animated.Value(1)).current;
  const emergencyPulse = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadTaskDetails();
    animateEntrance();
    startContinuousAnimations();
    
    // Simulate analysis loading
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000);
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadTaskDetails = async () => {
    if (task?.id) {
      try {
        const taskDoc = await getDoc(doc(db, 'citizenReports', task.id));
        if (taskDoc.exists()) {
          setTaskData({ id: taskDoc.id, ...taskDoc.data() });
        }
      } catch (error) {
        console.error("Error loading task details:", error);
      }
    }
  };

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
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
  };

  const startContinuousAnimations = () => {
    // Fire flicker effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(fireFlicker, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fireFlicker, {
          toValue: 0.8,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fireFlicker, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Emergency pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyPulse, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(emergencyPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 60000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const playPauseAudio = async () => {
    if (!taskData?.mediaUrls?.audioUrl) return;

    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: taskData.mediaUrls.audioUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    }
  };

  const handleAcceptTask = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      // For firemen, we need to use emergency-specific fields
      await assignTaskToUser(user.uid, {
        taskId: taskData.id,
        emergencyId: taskData.id, // Use emergencyId for firemen
        issueType: 'fire',
        severity: taskData.severity,
        location: taskData.location,
        address: taskData.address,
      });

      await updateDoc(doc(db, 'citizenReports', taskData.id), {
        status: 'assigned',
        assignedTo: user.uid,
        assignedAt: serverTimestamp(),
      });

      showMessage({
        message: "Emergency Accepted Successfully",
        description: "You have been assigned to this fire emergency",
        type: "success",
        icon: "success",
        duration: 3000,
        style: {
          backgroundColor: colors.pureWhite,
          borderWidth: 1,
          borderColor: colors.lightGray,
        },
        titleStyle: {
          color: colors.text,
          fontWeight: "600",
        },
        textStyle: {
          color: colors.textLight,
        },
      });

      navigation.navigate('FiremanDashboard');
    } catch (error) {
      console.error("Error accepting task:", error);
      Alert.alert("Error", "Failed to accept emergency. Please try again.");
    }
  };

  const handleRejectTask = () => {
    Alert.alert(
      "Reject Emergency",
      "Are you sure you want to reject this emergency call?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleCompleteTask = () => {
    setShowActionModal(true);
    Animated.spring(modalScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const submitCompletion = async () => {
    if (!actionNotes.trim()) {
      Alert.alert("Error", "Please provide completion notes");
      return;
    }

    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Update the citizen report first
      await updateDoc(doc(db, 'citizenReports', taskData.id), {
        status: 'resolved',
        resolvedBy: user.uid,
        resolvedAt: serverTimestamp(),
        resolutionNotes: actionNotes,
      });

      // Then update user's task history with fireman-specific fields
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        activeEmergencies: arrayRemove(taskData.id),
        emergenciesResponded: increment(1),
        emergencyHistory: arrayUnion({
          emergencyId: taskData.id,
          closedAt: new Date().toISOString(),
          actionTaken: actionNotes,
        }),
      });

      showMessage({
        message: "Emergency Resolved Successfully",
        description: "Fire emergency has been resolved and closed",
        type: "success",
        icon: "success",
        duration: 3000,
      });

      setTimeout(() => {
        navigation.navigate('FiremanDashboard');
      }, 1500);
    } catch (error) {
      console.error("Error completing task:", error);
      Alert.alert("Error", "Failed to complete emergency. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return colors.danger;
      case 'High': return colors.fireOrange;
      case 'Medium': return colors.warning;
      default: return colors.info;
    }
  };

  const getSeverityGradient = (severity) => {
    switch (severity) {
      case "Critical": return [colors.danger, colors.ember];
      case "High": return [colors.fireOrange, colors.fireRed];
      case "Medium": return [colors.warning, colors.fireOrange];
      default: return [colors.fireYellow, colors.warning];
    }
  };

  const getPriorityGradient = (score) => {
    if (score >= 8) return [colors.danger, colors.fireOrange];
    if (score >= 5) return [colors.fireOrange, colors.fireYellow];
    return [colors.fireYellow, colors.softGray];
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.pureWhite, colors.pearl, colors.cream]}
        style={StyleSheet.absoluteFillObject}
        locations={[0, 0.5, 1]}
      />

      {/* Luxury Background Elements */}
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
          colors={[colors.pureWhite, colors.fireOrange, colors.pureWhite]}
          style={styles.shimmerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <View style={styles.backButtonCard}>
            <MaterialIcons name="arrow-back" size={24} color={colors.charcoal} />
          </View>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Emergency Details</Text>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
          {/* Media Section */}
          {(taskData?.mediaUrls?.photoUrl || taskData?.mediaUrls?.videoUrl) && (
            <Animatable.View animation="fadeInUp" delay={200}>
              <View style={styles.mediaCard}>
                {taskData.mediaUrls.videoUrl ? (
                  <Video
                    source={{ uri: taskData.mediaUrls.videoUrl }}
                    style={styles.media}
                    useNativeControls
                    resizeMode="cover"
                    isLooping
                  />
                ) : (
                  <Image
                    source={{ uri: taskData.mediaUrls.photoUrl }}
                    style={styles.media}
                    resizeMode="cover"
                  />
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.mediaOverlay}
                >
                  <View style={styles.mediaInfo}>
                    <MaterialIcons name="verified" size={16} color="#FFF" />
                    <Text style={styles.mediaText}>Verified Evidence</Text>
                  </View>
                </LinearGradient>
              </View>
            </Animatable.View>
          )}

          {/* Audio Evidence */}
          {taskData?.mediaUrls?.audioUrl && (
            <Animatable.View animation="fadeInUp" delay={300}>
              <TouchableOpacity
                style={styles.audioCard}
                onPress={playPauseAudio}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.fireRed, colors.ember]}
                  style={styles.audioGradient}
                >
                  <Animated.View
                    style={[
                      styles.audioIcon,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <MaterialIcons
                      name={isPlaying ? "pause" : "play-arrow"}
                      size={32}
                      color="#FFF"
                    />
                  </Animated.View>
                  <View style={styles.audioTextContainer}>
                    <Text style={styles.audioTitle}>Audio Report</Text>
                    <Text style={styles.audioSubtitle}>
                      {isPlaying ? "Playing..." : "Tap to play emergency call"}
                    </Text>
                  </View>
                  <View style={styles.audioWaveform}>
                    {[...Array(5)].map((_, i) => (
                      <Animatable.View
                        key={i}
                        animation={isPlaying ? {
                          0: { height: 10 },
                          0.5: { height: Math.random() * 20 + 10 },
                          1: { height: 10 },
                        } : undefined}
                        iterationCount="infinite"
                        duration={800 + i * 100}
                        style={[
                          styles.audioBar,
                          { height: isPlaying ? 20 : 10 },
                        ]}
                      />
                    ))}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          )}

          {/* Fire Analysis Section */}
          <Animatable.View animation="fadeInUp" delay={400}>
            <View style={styles.analysisContainer}>
              {isAnalyzing ? (
                <View style={styles.analyzingContainer}>
                  <Animatable.View
                    animation={{
                      0: { scale: 0.8, opacity: 0.5 },
                      0.5: { scale: 1.1, opacity: 1 },
                      1: { scale: 0.8, opacity: 0.5 },
                    }}
                    iterationCount="infinite"
                    duration={2000}
                  >
                    <LinearGradient
                      colors={[colors.fireRed, colors.fireOrange]}
                      style={styles.aiLoadingGradient}
                    >
                      <MaterialCommunityIcons name="fire" size={60} color={colors.pureWhite} />
                    </LinearGradient>
                  </Animatable.View>
                  
                  <Animatable.Text animation="fadeIn" style={styles.analyzingText}>
                    Analyzing Fire Hazard
                  </Animatable.Text>
                  <Text style={styles.analyzingSubtext}>
                    Processing evidence and determining response requirements
                  </Text>
                </View>
              ) : (
                <View style={styles.analysisCard}>
                  <View style={styles.analysisHeader}>
                    <MaterialCommunityIcons name="fire-alert" size={24} color={colors.fireRed} />
                    <Text style={styles.analysisTitle}>Fire Analysis Complete</Text>
                  </View>

                  {/* Severity & Priority */}
                  <View style={styles.analysisRow}>
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>Fire Severity</Text>
                      <View style={styles.severityBadge}>
                        <LinearGradient
                          colors={getSeverityGradient(taskData?.severity)}
                          style={styles.severityGradient}
                        >
                          <Text style={styles.severityText}>{taskData?.severity || "Medium"}</Text>
                        </LinearGradient>
                      </View>
                    </View>

                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>Priority Score</Text>
                      <View style={styles.priorityContainer}>
                        <View style={styles.priorityBar}>
                          <Animated.View
                            style={[
                              styles.priorityFill,
                              {
                                width: `${(taskData?.priorityScore || 5) * 10}%`,
                              },
                            ]}
                          >
                            <LinearGradient
                              colors={getPriorityGradient(taskData?.priorityScore || 5)}
                              style={StyleSheet.absoluteFillObject}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                            />
                          </Animated.View>
                        </View>
                        <Text style={styles.priorityScore}>
                          {taskData?.priorityScore || 5}/10
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Response Time */}
                  <View style={styles.responseTimeContainer}>
                    <Feather name="clock" size={16} color={colors.fireOrange} />
                    <Text style={styles.responseTimeText}>
                      Response Required: {taskData?.responseTime || "Immediate"}
                    </Text>
                  </View>

                  {/* Fire Description */}
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Fire Assessment</Text>
                    <Text style={styles.descriptionText}>
                      {taskData?.description || "Fire emergency requiring immediate response from fire department"}
                    </Text>
                  </View>

                  {/* Immediate Actions */}
                  <View style={styles.actionsContainer}>
                    <Text style={styles.actionsLabel}>Emergency Response Actions</Text>
                    {(taskData?.immediateActions || [
                      "Deploy fire engines to the scene",
                      "Establish perimeter and evacuate civilians",
                      "Assess fire spread and containment needs",
                      "Request additional resources if needed"
                    ]).map((action, index) => (
                      <Animatable.View
                        key={index}
                        animation="fadeInLeft"
                        delay={index * 100}
                        style={styles.actionItem}
                      >
                        <View style={styles.actionBullet}>
                          <LinearGradient
                            colors={[colors.fireRed, colors.ember]}
                            style={styles.actionBulletGradient}
                          />
                        </View>
                        <Text style={styles.actionText}>{action}</Text>
                      </Animatable.View>
                    ))}
                  </View>

                  {/* Additional Details */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCard}>
                      <MaterialCommunityIcons name="fire-truck" size={20} color={colors.fireOrange} />
                      <Text style={styles.detailLabel}>Resources</Text>
                      <Text style={styles.detailValue}>
                        {taskData?.requiredResources || "2-3 Units"}
                      </Text>
                    </View>

                    <View style={styles.detailCard}>
                      <MaterialCommunityIcons name="fire" size={20} color={colors.fireOrange} />
                      <Text style={styles.detailLabel}>Fire Type</Text>
                      <Text style={styles.detailValue}>
                        {taskData?.fireType || "Structure Fire"}
                      </Text>
                    </View>

                    <View style={styles.detailCard}>
                      <MaterialIcons name="location-on" size={20} color={colors.fireOrange} />
                      <Text style={styles.detailLabel}>Area Impact</Text>
                      <Text style={styles.detailValue}>
                        {taskData?.affectedArea || "Medium"}
                      </Text>
                    </View>

                    <View style={styles.detailCard}>
                      <MaterialIcons name="warning" size={20} color={colors.fireOrange} />
                      <Text style={styles.detailLabel}>Hazard Level</Text>
                      <Text style={styles.detailValue}>
                        {taskData?.hazardLevel || "High"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </Animatable.View>

          {/* Location Section */}
          <Animatable.View animation="fadeInUp" delay={500}>
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <MaterialIcons name="location-on" size={20} color={colors.fireRed} />
                <Text style={styles.locationTitle}>Emergency Location</Text>
              </View>
              
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: taskData?.location?.latitude || 12.9716,
                  longitude: taskData?.location?.longitude || 77.5946,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                customMapStyle={mapStyle}
              >
                <Marker
                  coordinate={{
                    latitude: taskData?.location?.latitude || 12.9716,
                    longitude: taskData?.location?.longitude || 77.5946,
                  }}
                >
                  <Animated.View 
                    style={[
                      styles.markerContainer,
                      {
                        transform: [{ scale: emergencyPulse }]
                      }
                    ]}
                  >
                    <MaterialCommunityIcons name="fire" size={24} color={colors.danger} />
                  </Animated.View>
                </Marker>
              </MapView>

              <Text style={styles.addressText}>
                {taskData?.address || 'Bengaluru, Karnataka, India'}
              </Text>
            </View>
          </Animatable.View>

          {/* Action Buttons */}
          <Animatable.View animation="fadeInUp" delay={600}>
            <View style={styles.actionButtons}>
              {taskData?.status === 'pending' ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={handleRejectTask}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="close" size={20} color={colors.danger} />
                    <Text style={[styles.actionButtonText, { color: colors.danger }]}>
                      Decline
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={handleAcceptTask}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.success, colors.success + 'DD']}
                      style={styles.acceptGradient}
                    >
                      <MaterialIcons name="check" size={20} color="#FFF" />
                      <Text style={[styles.actionButtonText, { color: '#FFF' }]}>
                        Respond to Emergency
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={handleCompleteTask}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.fireRed, colors.ember]}
                    style={styles.completeGradient}
                  >
                    <MaterialIcons name="done-all" size={20} color="#FFF" />
                    <Text style={[styles.actionButtonText, { color: '#FFF' }]}>
                      Mark as Contained
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </Animatable.View>
        </Animated.View>
      </ScrollView>

      {/* Completion Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowActionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowActionModal(false)}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: modalScale }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                <View style={styles.modalCard}>
                  <LinearGradient
                    colors={[colors.pureWhite, colors.pearl]}
                    style={styles.modalGradient}
                  >
                    <Text style={styles.modalTitle}>Emergency Resolution</Text>
                    <Text style={styles.modalSubtitle}>
                      Provide details about how this fire emergency was handled
                    </Text>
                    
                    <View style={styles.modalInputContainer}>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Describe the actions taken and outcome..."
                        placeholderTextColor={colors.textUltraLight}
                        multiline
                        numberOfLines={6}
                        value={actionNotes}
                        onChangeText={setActionNotes}
                      />
                    </View>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={styles.modalCancelButton}
                        onPress={() => setShowActionModal(false)}
                      >
                        <Text style={styles.modalCancelText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalSubmitButton}
                        onPress={submitCompletion}
                        disabled={isSubmitting}
                      >
                        <LinearGradient
                          colors={[colors.fireRed, colors.ember]}
                          style={styles.modalSubmitGradient}
                        >
                          {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <MaterialIcons name="check" size={20} color="#FFF" />
                              <Text style={styles.modalSubmitText}>Complete Emergency</Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const mapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#f5f5f5" }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pureWhite,
  },
  shimmerOverlay: {
    position: "absolute",
    width: screenWidth * 2,
    height: screenHeight,
  },
  shimmerGradient: {
    flex: 1,
  },
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
  headerRight: {
    width: 48,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  content: {
    padding: 20,
  },
  // Media Section
  mediaCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  media: {
    width: '100%',
    height: 250,
    backgroundColor: colors.lightGray,
  },
  mediaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'flex-end',
    padding: 16,
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Audio Section
  audioCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.fireRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  audioGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  audioIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  audioSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  audioBar: {
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 2,
    borderRadius: 1.5,
  },
  // Analysis Section
  analysisContainer: {
    marginBottom: 20,
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  aiLoadingGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.text,
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  analyzingSubtext: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    fontWeight: '300',
  },
  analysisCard: {
    backgroundColor: colors.pureWhite,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 10,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  analysisItem: {
    flex: 1,
  },
  analysisLabel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    overflow: 'hidden',
  },
  severityGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  severityText: {
    color: colors.pureWhite,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  priorityFill: {
    height: '100%',
    borderRadius: 4,
  },
  priorityScore: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
  },
  responseTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fireOrange + '10',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  responseTimeText: {
    color: colors.fireOrange,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  descriptionText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '300',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionsLabel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionBullet: {
    width: 20,
    height: 20,
    marginRight: 12,
    marginTop: 2,
  },
  actionBulletGradient: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: 6,
  },
  actionText: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
    fontWeight: '300',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  detailCard: {
    width: '50%',
    padding: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '400',
  },
  // Location Section
  locationCard: {
    backgroundColor: colors.pureWhite,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 8,
  },
  map: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  rejectButton: {
    backgroundColor: colors.danger + '10',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  completeButton: {
    backgroundColor: colors.fireRed,
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  completeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.9,
    maxWidth: 400,
  },
  modalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '300',
  },
  modalInputContainer: {
    backgroundColor: colors.lightGray,
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  modalInput: {
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
    marginRight: 6,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
  },
  modalSubmitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 6,
  },
  modalSubmitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
});

export default FiremanViewTask;