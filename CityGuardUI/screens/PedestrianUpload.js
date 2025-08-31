import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Animated,
  Image,
  Vibration,
  Easing,
  TouchableWithoutFeedback,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { Camera, CameraType } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as Location from "expo-location";
import { Audio, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  Feather,
  Entypo,
  AntDesign,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import FlashMessage, { showMessage } from "react-native-flash-message";
import * as Animatable from "react-native-animatable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MaskedView from "@react-native-masked-view/masked-view";
import Svg, { Path, Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop, G, Ellipse, Pattern } from "react-native-svg";
import * as Haptics from 'expo-haptics';
import { 
  initializeUserGamification, 
  updateUserAfterReport,
  getUserData 
} from '../firebase/gamificationConfig';

import { addReportToUserHistory } from '../firebase/authConfig';


const { width: screenWidth, height: screenHeight } = Dimensions.get("window");


const firebaseConfig = {
  apiKey: "AIzaSyBOb36ckOf3Tu3uIvV4IBPOqv7aiamsSfo",
  authDomain: "cityai-8987c.firebaseapp.com",
  projectId: "cityai-8987c",
  storageBucket: "cityai-8987c.firebasestorage.app",
  messagingSenderId: "629908792550",
  appId: "1:629908792550:android:16d35484ccd5d6c0570727",
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);


const genAI = new GoogleGenerativeAI("AIzaSyBi4SRdJxbv7gBZrikckoUx8XUWrN7DMqs");


const colors = {
  
  pureWhite: "#FFFFFF",
  softWhite: "#FEFEFE",
  cream: "#FAF9F6",
  pearl: "#F8F7F4",
  ivory: "#FFFFF0",
  
  
  gold: "#D4AF37",
  champagne: "#F7E7CE",
  platinum: "#E5E4E2",
  rosegold: "#E8B4B8",
  success: "#28a745",
  
  
  safety: "#C41E3A", 
  cleaning: "#4169E1", 
  fire: "#FF6347", 
  
  
  lightGray: "#F5F5F5",
  softGray: "#E8E8E8",
  mediumGray: "#D3D3D3",
  darkGray: "#A9A9A9",
  charcoal: "#36454F",
  
  
  text: "#2C2C2C",
  textLight: "#6B6B6B",
  textUltraLight: "#9B9B9B",
  
  
  shadow: "rgba(0, 0, 0, 0.04)",
  shadowMedium: "rgba(0, 0, 0, 0.08)",
  shadowDark: "rgba(0, 0, 0, 0.12)",
  
  
  luxuryGradient1: ["#FFFFFF", "#F8F7F4"],
  luxuryGradient2: ["#FAF9F6", "#F0EFE9"],
  goldGradient: ["#D4AF37", "#F4E4BC"],
  pearlGradient: ["#FFFFFF", "#E8E8E8"],
};


const luxuryMapStyle = [
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
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dadada" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9c9c9" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
];


const LuxuryBackground = ({ children }) => {
  const shimmer1 = useRef(new Animated.Value(0)).current;
  const shimmer2 = useRef(new Animated.Value(0)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    
    Animated.loop(
      Animated.parallel([
        Animated.timing(shimmer1, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer2, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();

    
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(float1, {
            toValue: 1,
            duration: 6000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(float1, {
            toValue: 0,
            duration: 6000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(float2, {
            toValue: 1,
            duration: 8000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(float2, {
            toValue: 0,
            duration: 8000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.8,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.luxuryBackground}>
      <LinearGradient
        colors={[colors.pureWhite, colors.pearl, colors.cream]}
        style={StyleSheet.absoluteFillObject}
        locations={[0, 0.5, 1]}
      />
      
      
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            opacity: 0.03,
            transform: [
              {
                translateX: shimmer1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-screenWidth, screenWidth],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.pureWhite, colors.gold, colors.pureWhite]}
          style={styles.shimmerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      
      <Animated.View
        style={[
          styles.floatingOrb1,
          {
            opacity: glow.interpolate({
              inputRange: [0.8, 1],
              outputRange: [0.05, 0.1],
            }),
            transform: [
              {
                translateY: float1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -50],
                }),
              },
              {
                scale: float1.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 1.1, 1],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.champagne, colors.pureWhite]}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.floatingOrb2,
          {
            opacity: glow.interpolate({
              inputRange: [0.8, 1],
              outputRange: [0.05, 0.1],
            }),
            transform: [
              {
                translateY: float2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -30],
                }),
              },
              {
                translateX: float2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 30],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.rosegold, colors.pureWhite]}
          style={styles.orbGradient}
        />
      </Animated.View>

      
      <Svg
        width={screenWidth}
        height={screenHeight}
        style={StyleSheet.absoluteFillObject}
        opacity={0.02}
      >
        <Defs>
          <Pattern
            id="luxuryPattern"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <Circle cx="20" cy="20" r="1" fill={colors.gold} />
            <Circle cx="0" cy="0" r="1" fill={colors.gold} />
            <Circle cx="40" cy="0" r="1" fill={colors.gold} />
            <Circle cx="0" cy="40" r="1" fill={colors.gold} />
            <Circle cx="40" cy="40" r="1" fill={colors.gold} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#luxuryPattern)" />
      </Svg>

      {children}
    </View>
  );
};


const LuxuryCard = ({ children, style, onPress, disabled, ...props }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      Vibration.vibrate(10);
    }
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        {...props}
      >
        <Animated.View
          style={[
            styles.luxuryCard,
            style,
            {
              transform: [{ scale: scaleAnim }],
              shadowOpacity: shadowAnim.interpolate({
                inputRange: [0.7, 1],
                outputRange: [0.08, 0.15],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={[colors.pureWhite, colors.softWhite]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.luxuryCard, style]} {...props}>
      <LinearGradient
        colors={[colors.pureWhite, colors.softWhite]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {children}
    </View>
  );
};


const LuxuryButton = ({ title, onPress, icon, variant = "primary", style, disabled }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      Vibration.vibrate(10);
    }
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getGradientColors = () => {
    switch (variant) {
      case "safety":
        return [colors.safety, colors.safety + "DD"];
      case "cleaning":
        return [colors.cleaning, colors.cleaning + "DD"];
      case "fire":
        return [colors.fire, colors.fire + "DD"];
      case "gold":
        return colors.goldGradient;
      default:
        return [colors.charcoal, colors.darkGray];
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.luxuryButton, style]}
    >
      <Animated.View
        style={[
          styles.luxuryButtonInner,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        
        <Animated.View
          style={[
            styles.buttonGlow,
            {
              opacity: glowAnim,
            },
          ]}
        >
          <LinearGradient
            colors={[...getGradientColors(), "transparent"]}
            style={styles.glowGradient}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        
        <LinearGradient
          colors={getGradientColors()}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {icon && <View style={styles.buttonIcon}>{icon}</View>}
          <Text style={styles.buttonText}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};


const ISSUE_TYPES = {
  safety: {
    id: "safety",
    title: "Safety Issue",
    icon: "security",
    color: colors.safety,
    description: "Report safety hazards or security concerns",
    keywords: ["danger", "hazard", "security", "unsafe", "risk"],
  },
  cleaning: {
    id: "cleaning",
    title: "Cleaning Issue",
    icon: "cleaning-services",
    color: colors.cleaning,
    description: "Report areas that need cleaning or waste removal",
    keywords: ["dirty", "waste", "garbage", "litter", "unsanitary"],
  },
  fire: {
    id: "fire",
    title: "Fire Issue",
    icon: "local-fire-department",
    color: colors.fire,
    description: "Report fire hazards or active fire situations",
    keywords: ["fire", "smoke", "burning", "flame", "emergency"],
  },
};


const PedestrianUpload = ({ navigation, route }) => {
  
  const steps = [
    { id: 0, title: "Issue Type", icon: "report-problem" },
    { id: 1, title: "Capture", icon: "camera" },
    { id: 2, title: "AI Analysis", icon: "psychology" },
    { id: 3, title: "Submit", icon: "cloud-upload" },
  ];

  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIssueType, setSelectedIssueType] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [capturedMedia, setCapturedMedia] = useState({
    photo: null,
    video: null,
    audio: null,
  });
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("Bengaluru, Karnataka, India");
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  
  const [hasPermissions, setHasPermissions] = useState(false);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState('photo'); 
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const mapRef = useRef(null);
  const recordingInterval = useRef(null);
  const isMounted = useRef(false);

  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const stepTransition = useRef(new Animated.Value(0)).current;
  
  
  const stepScale = useRef(steps.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    isMounted.current = true;
    initializePermissions();
    animateEntrance();
    startBackgroundAnimations();

    return () => {
      isMounted.current = false;
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    const hasAnyMedia = capturedMedia.photo || capturedMedia.video || capturedMedia.audio;
    if (currentStep === 2 && hasAnyMedia && !aiAnalysis && selectedIssueType) {
      analyzeMediaWithAI();
    }
    
  }, [currentStep, capturedMedia, selectedIssueType, aiAnalysis]);

  
  useEffect(() => {
    steps.forEach((step, index) => {
      if (currentStep === index) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(stepScale[index], {
              toValue: 1.1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(stepScale[index], {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else {
        stepScale[index].setValue(1);
      }
    });
    
  }, [currentStep]);
  
  
  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const initializePermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: microphoneStatus } = await Camera.requestMicrophonePermissionsAsync();
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

      if (
        cameraStatus === "granted" &&
        microphoneStatus === "granted" &&
        audioStatus === "granted" &&
        mediaLibraryStatus === "granted" &&
        locationStatus === "granted"
      ) {
        setHasPermissions(true);
        await getCurrentLocation();
      } else {
        Alert.alert(
          "Permissions Required",
          "Please grant all permissions to use this feature"
        );
      }
    } catch (error) {
      console.error("Error getting permissions:", error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc.coords);

      const addressResult = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (addressResult.length > 0) {
        const addr = addressResult[0];
        const formattedAddress = `${addr.street || ""} ${addr.city || ""} ${addr.region || ""}`.trim();
        setAddress(formattedAddress || "Bengaluru, Karnataka, India");
      } else {
        setAddress("Bengaluru, Karnataka, India");
      }
    } catch (error) {
      console.error("Error getting location:", error);
      setAddress("Bengaluru, Karnataka, India");
    }
  };

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
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
    ]).start();
  };

  const startBackgroundAnimations = () => {
    
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    
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
  };

  const animateStepTransition = (toStep) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.sequence([
      Animated.timing(stepTransition, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(stepTransition, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: (toStep + 1) / steps.length,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  };

  const handleIssueTypeSelection = (issueType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIssueType(issueType);
    
    setTimeout(() => {
      setCurrentStep(1);
      animateStepTransition(1);
    }, 300);
  };

  const handleMediaSelection = (type) => {
    setMediaType(type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (type === "photo") {
      showPhotoOptions();
    } else if (type === "video") {
      showVideoOptions();
    } else if (type === "audio") {
      if (capturedMedia.audio) {
        Alert.alert(
          "Replace Audio",
          "Would you like to record a new audio file? The current one will be replaced.",
          [
            { text: "Record New", onPress: () => setShowAudioRecorder(true) },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        setShowAudioRecorder(true);
      }
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      "Select Photo",
      "Choose from where you want to select a photo",
      [
        { text: "Camera", onPress: () => takePicture() },
        { text: "Gallery", onPress: () => pickFromGallery("photo") },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const showVideoOptions = () => {
    Alert.alert(
      "Select Video",
      "Choose from where you want to select a video",
      [
        { text: "Record Video", onPress: () => recordVideo() },
        { text: "Gallery", onPress: () => pickFromGallery("video") },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const takePicture = () => {
    setCameraMode('photo');
    setShowCamera(true);
  };

  const pickFromGallery = async (type) => {
    try {
      console.log("Opening gallery for:", type);
      const mediaTypeOptions =
        type === "photo"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypeOptions,
        allowsEditing: false,
        quality: 0.9,
        base64: false,
      });

      console.log("Gallery result:", result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log("Selected URI:", result.assets[0].uri);
        setCapturedMedia(prev => ({
          ...prev,
          [type]: result.assets[0].uri
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error picking from gallery:", error);
      Alert.alert("Error", "Failed to pick from gallery. Please try again.");
    }
  };

  const recordVideo = () => {
    setCameraMode('video');
    setShowCamera(true);
  };

  const startVideoRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecordingVideo(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
        });
        
        if (video && video.uri) {
          setCapturedMedia(prev => ({
            ...prev,
            video: video.uri
          }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        setShowCamera(false);
        setIsRecordingVideo(false);
      } catch (error) {
        console.error("Error recording video:", error);
        setIsRecordingVideo(false);
        
      }
    }
  };

  const stopVideoRecording = async () => {
    if (cameraRef.current && isRecordingVideo) {
      try {
        await cameraRef.current.stopRecording();
        setIsRecordingVideo(false);
      } catch (error) {
        console.error("Error stopping video:", error);
        setIsRecordingVideo(false);
      }
    }
  };
  
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    
    
    if (cameraMode === 'photo') {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          exif: false, 
        });

        if (photo && photo.uri) {
          setCapturedMedia(prev => ({ ...prev, photo: photo.uri }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setShowCamera(false); 
      } catch (error) {
        console.error("Error taking picture from custom camera:", error);
        Alert.alert("Error", "Failed to take a picture. Please try again.");
      }
    } 
    
    else {
      if (isRecordingVideo) {
        stopVideoRecording();
      } else {
        startVideoRecording();
      }
    }
  };

  const startAudioRecording = async () => {
    try {
      console.log("Starting audio recording...");
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant audio recording permission');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
            extension: '.m4a',
            outputFormat: 2,
            audioEncoder: 3,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
        },
        ios: {
            extension: '.m4a',
            audioQuality: 127,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
        },
        web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
        },
      });

      setRecording(recording);
      setIsRecordingAudio(true);
      setRecordingDuration(0);
      
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      console.log("Audio recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start audio recording. Please try again.");
    }
  };

  const stopAudioRecording = async () => {
    if (!recording) return;

    try {
      console.log("Stopping audio recording...");
      setIsRecordingAudio(false);
      clearInterval(recordingInterval.current);
      
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      console.log("Audio recording saved to:", uri);
      
      if (uri) {
        setCapturedMedia(prev => ({
          ...prev,
          audio: uri
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setRecording(null);
      setRecordingDuration(0);
      setShowAudioRecorder(false); 
    } catch (error) {
      console.error("Error stopping recording:", error);
      Alert.alert("Error", "Failed to stop recording. Please try again.");
    }
  };
  
  async function playPauseAudio() {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.replayAsync();
        setIsPlaying(true);
      }
    } else {
      console.log('Loading Sound');
      const { sound: newSound } = await Audio.Sound.createAsync(
         { uri: capturedMedia.audio },
         { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
              setIsPlaying(false);
              newSound.setPositionAsync(0);
          }
      });
    }
  }

  const analyzeMediaWithAI = async () => {
    if (!selectedIssueType) {
      console.error("No issue type selected");
      Alert.alert("Error", "Please select an issue type first");
      return;
    }

    setIsAnalyzing(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      let prompt = `Analyze this citizen report for a smart city emergency response system. 
      This report is specifically about a ${selectedIssueType.title}.
      
      The citizen has provided the following media:
      ${capturedMedia.photo ? '- Photo evidence' : ''}
      ${capturedMedia.video ? '- Video evidence' : ''}
      ${capturedMedia.audio ? '- Audio recording' : ''}
      
      Focus ONLY on these three types of issues:
      1. Safety Issue - Security threats, dangerous conditions, accidents
      2. Cleaning Issue - Waste, garbage, unsanitary conditions, litter
      3. Fire Issue - Fire hazards, smoke, active fires, burning materials
      
      Based on ALL the provided media content, provide a comprehensive analysis.
      1. Confirm if this matches the selected category: ${selectedIssueType.title}
      2. Severity level (Low, Medium, High, Critical)
      3. Detailed description of the specific issue based on all evidence
      4. Immediate actions required
      5. Priority score (1-10, where 10 is most urgent)
      6. Response time needed (Immediate, Within 1 hour, Within 24 hours, Scheduled)
      7. Required personnel/department
      8. Estimated resources needed
      
      Location: ${address || "Bengaluru, Karnataka, India"}
      Time: ${new Date().toLocaleString()}
      
      IMPORTANT: Your response MUST be only a raw JSON object. Do not include markdown formatting (like \`\`\`json\`), comments, or any other text outside of the JSON structure. The entire response should be parsable as JSON.
      The JSON object must have these fields:
      {
        "matchesCategory": true/false,
        "actualCategory": "Safety Issue/Cleaning Issue/Fire Issue",
        "severity": "",
        "description": "",
        "immediateActions": [],
        "priorityScore": 0,
        "responseTime": "",
        "requiredPersonnel": "",
        "estimatedResources": "",
        "publicSafetyRisk": "None/Low/Medium/High",
        "affectedArea": "Small/Medium/Large",
        "mediaAnalysis": {
          "photoFindings": "",
          "videoFindings": "",
          "audioFindings": ""
        }
      }`;

      const parts = [{ text: prompt }];

      if (capturedMedia.photo) {
        try {
          const imageData = await fetch(capturedMedia.photo);
          const blob = await imageData.blob();
          const base64data = await blobToBase64(blob);
          parts.push({
            inlineData: {
              data: base64data,
              mimeType: "image/jpeg",
            },
          });
        } catch (error) {
          console.error("Error processing photo:", error);
        }
      }

      if (capturedMedia.video) {
        try {
          const videoData = await fetch(capturedMedia.video);
          const blob = await videoData.blob();
          const base64data = await blobToBase64(blob);
          parts.push({
            inlineData: {
              data: base64data,
              mimeType: "video/mp4",
            },
          });
        } catch (error) {
          console.error("Error processing video:", error);
        }
      }

      if (capturedMedia.audio) {
        try {
          const audioData = await fetch(capturedMedia.audio);
          const blob = await audioData.blob();
          const base64data = await blobToBase64(blob);
          parts.push({
            inlineData: {
              data: base64data,
              mimeType: "audio/mp4",
            },
          });
        } catch (error) {
          console.error("Error processing audio:", error);
        }
      }

      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      const analysisResult = result.response.text();

      try {
        let jsonString = analysisResult.replace(/```json|```/g, '').trim();
        const analysis = JSON.parse(jsonString);

        if (isMounted.current) {
          setAiAnalysis(analysis);
        }
          
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", analysisResult);
        if (isMounted.current) {
          setAiAnalysis({
            matchesCategory: true,
            actualCategory: selectedIssueType.title,
            severity: "Medium",
            description: "AI analysis could not be completed. The report has been filed with the provided media.",
            immediateActions: ["Manual review required"],
            priorityScore: 5,
            responseTime: "Within 24 hours",
            requiredPersonnel: "City Response Team",
            estimatedResources: "Standard response unit",
            publicSafetyRisk: "Unknown",
            affectedArea: "Unknown",
            mediaAnalysis: {
              photoFindings: capturedMedia.photo ? "Photo evidence provided" : "",
              videoFindings: capturedMedia.video ? "Video evidence provided" : "",
              audioFindings: capturedMedia.audio ? "Audio recording provided" : "",
            }
          });
        }
      }
    } catch (error) {
      console.error("Error analyzing media:", error);
      Alert.alert("Analysis Error", "Failed to analyze media. Proceeding to submission screen.");
      if (isMounted.current) {
        setAiAnalysis({
          matchesCategory: true,
          actualCategory: selectedIssueType.title,
          severity: "Medium",
          description: "AI analysis failed. The report has been filed with the provided media.",
          immediateActions: ["Manual review required"],
          priorityScore: 5,
          responseTime: "Within 24 hours",
          requiredPersonnel: "City Response Team",
          estimatedResources: "Standard response unit",
          publicSafetyRisk: "Unknown",
          affectedArea: "Unknown",
          mediaAnalysis: {
            photoFindings: capturedMedia.photo ? "Photo evidence provided" : "",
            videoFindings: capturedMedia.video ? "Video evidence provided" : "",
            audioFindings: capturedMedia.audio ? "Audio recording provided" : "",
          }
        });
      }
    } finally {
      if (isMounted.current) {
        setIsAnalyzing(false);
        // **FIX**: Removed setCurrentStep(3) from here to prevent skipping the analysis screen.
        // The user will now press a button on the analysis screen to proceed.
      }
    }
  };


  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(",")[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const submitReport = async () => {
    if (!aiAnalysis || !location || !selectedIssueType) {
      Alert.alert("Error", "Missing required information. Please ensure all steps are completed.");
      return;
    }

    const finalAddress = address || "Bengaluru, Karnataka, India";

    setIsUploading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      let uploadedMedia = {
        photoUrl: null,
        videoUrl: null,
        audioUrl: null,
      };

      // Upload media files
      if (capturedMedia.photo) {
        try {
          const photoBlob = await fetch(capturedMedia.photo).then((r) => r.blob());
          const photoRef = ref(storage, `reports/${Date.now()}_photo.jpg`);
          await uploadBytes(photoRef, photoBlob);
          uploadedMedia.photoUrl = await getDownloadURL(photoRef);
        } catch (error) {
          console.error("Error uploading photo:", error);
        }
      }

      if (capturedMedia.video) {
        try {
          const videoBlob = await fetch(capturedMedia.video).then((r) => r.blob());
          const videoRef = ref(storage, `reports/${Date.now()}_video.mp4`);
          await uploadBytes(videoRef, videoBlob);
          uploadedMedia.videoUrl = await getDownloadURL(videoRef);
        } catch (error) {
          console.error("Error uploading video:", error);
        }
      }

      if (capturedMedia.audio) {
        try {
          const audioBlob = await fetch(capturedMedia.audio).then((r) => r.blob());
          const audioRef = ref(storage, `reports/${Date.now()}_audio.m4a`);
          await uploadBytes(audioRef, audioBlob);
          uploadedMedia.audioUrl = await getDownloadURL(audioRef);
        } catch (error) {
          console.error("Error uploading audio:", error);
        }
      }

      // Get user ID
      const userId = await AsyncStorage.getItem("userId") || "anonymous";
      
      // Initialize user gamification if needed
      await initializeUserGamification(userId);

      const reportData = {
        ...aiAnalysis,
        issueType: selectedIssueType.id,
        mediaUrls: uploadedMedia,
        hasPhoto: !!uploadedMedia.photoUrl,
        hasVideo: !!uploadedMedia.videoUrl,
        hasAudio: !!uploadedMedia.audioUrl,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        address: finalAddress,
        additionalNotes,
        userId: userId,
        timestamp: serverTimestamp(),
        status: "pending",
        viewCount: 0,
        resolved: false,
      };

      // Submit report to Firestore
      const docRef = await addDoc(collection(db, "citizenReports"), reportData);

      // Create clean data for user history without serverTimestamp
      const reportHistoryData = {
        issueType: selectedIssueType.id,
        severity: aiAnalysis?.severity || "Medium",
        address: finalAddress,
        status: "pending",
      };

      // Add report to user's history
      await addReportToUserHistory(userId, docRef.id, reportHistoryData);

      // Update user gamification data
      const gamificationResult = await updateUserAfterReport(userId, reportData);
      
      // Get updated user data
      const updatedUserData = await getUserData(userId);

      showMessage({
        message: "Report Submitted Successfully!",
        description: `Emergency response team has been notified`,
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

      setShowSuccess(true);

      setTimeout(() => {
        // Navigate to Badge Progress Screen with gamification results
        navigation.navigate("BadgeProgressScreen", {
          reportResult: gamificationResult,
          userData: updatedUserData,
        });
      }, 1500);

    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={colors.goldGradient}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        </View>
        
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isActive = currentStep >= index;
            const isCurrent = currentStep === index;

            return (
              <Animatable.View
                key={step.id}
                animation={isActive ? "fadeIn" : undefined}
                delay={index * 100}
              >
                <TouchableOpacity
                  style={styles.stepItem}
                  onPress={() => {
                    if (index < currentStep) {
                      setCurrentStep(index);
                      animateStepTransition(index);
                    }
                  }}
                  disabled={index > currentStep}
                >
                  <Animated.View
                    style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isCurrent && styles.stepCircleCurrent,
                      {
                        transform: [{ scale: stepScale[index] }],
                      },
                    ]}
                  >
                    {isActive ? (
                      <MaterialIcons
                        name={step.icon}
                        size={24}
                        color={isCurrent ? colors.gold : colors.charcoal}
                      />
                    ) : (
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    )}
                  </Animated.View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isCurrent && styles.stepLabelCurrent,
                    ]}
                  >
                    {step.title}
                  </Text>
                </TouchableOpacity>
              </Animatable.View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderIssueTypeSelection = () => (
    <Animated.View
      style={[
        styles.contentContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <Animatable.Text 
        animation="fadeInDown" 
        style={styles.sectionTitle}
      >
        What type of issue are you reporting?
      </Animatable.Text>
      <Animatable.Text 
        animation="fadeInDown" 
        delay={100}
        style={styles.sectionSubtitle}
      >
        Select the category that best describes the issue
      </Animatable.Text>

      <View style={styles.issueTypesContainer}>
        {Object.values(ISSUE_TYPES).map((issueType, index) => (
          <Animatable.View
            key={issueType.id}
            animation="fadeInUp"
            delay={200 + index * 100}
          >
            <LuxuryCard
              style={[
                styles.issueTypeCard,
                selectedIssueType?.id === issueType.id && styles.issueTypeCardSelected,
              ]}
              onPress={() => handleIssueTypeSelection(issueType)}
            >
              <View style={styles.issueTypeIconContainer}>
                <LinearGradient
                  colors={[issueType.color + "20", issueType.color + "10"]}
                  style={styles.issueTypeIconGradient}
                >
                  <MaterialIcons
                    name={issueType.icon}
                    size={40}
                    color={issueType.color}
                  />
                </LinearGradient>
              </View>
              <View style={styles.issueTypeContent}>
                <Text style={styles.issueTypeTitle}>{issueType.title}</Text>
                <Text style={styles.issueTypeDescription}>{issueType.description}</Text>
              </View>
              <Feather 
                name="chevron-right" 
                size={24} 
                color={colors.darkGray}
                style={styles.issueTypeArrow}
              />
            </LuxuryCard>
          </Animatable.View>
        ))}
      </View>

      {location && (
        <Animatable.View animation="fadeInUp" delay={500}>
          <LuxuryCard style={styles.locationInfo}>
            <MaterialIcons name="location-on" size={20} color={colors.gold} />
            <Text style={styles.locationText}>
              {String(address || "Getting your location...")}
            </Text>
          </LuxuryCard>
        </Animatable.View>
      )}
    </Animated.View>
  );

  const renderMediaSelection = () => (
    <Animated.View
      style={[
        styles.contentContainer,
        {
          opacity: stepTransition.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.8],
          }),
          transform: [
            {
              scale: stepTransition.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.95],
              }),
            },
          ],
        },
      ]}
    >
      <Animatable.Text 
        animation="fadeInDown" 
        style={styles.sectionTitle}
      >
        Capture the {selectedIssueType?.title}
      </Animatable.Text>
      <Animatable.Text 
        animation="fadeInDown" 
        delay={100}
        style={styles.sectionSubtitle}
      >
        Add multiple types of evidence for better analysis
      </Animatable.Text>

      <View style={styles.mediaOptionsContainer}>
        <Animatable.View animation="fadeInLeft" delay={200}>
          <LuxuryCard
            style={[
              styles.mediaOption,
              capturedMedia.photo && styles.mediaOptionCaptured
            ]}
            onPress={() => handleMediaSelection("photo")}
          >
            <View style={styles.mediaIconContainer}>
              <LinearGradient
                colors={capturedMedia.photo ? [colors.success + "30", colors.success + "10"] : [colors.gold + "30", colors.gold + "10"]}
                style={styles.mediaIconGradient}
              >
                <MaterialIcons 
                  name={capturedMedia.photo ? "check-circle" : "photo-camera"} 
                  size={36} 
                  color={capturedMedia.photo ? colors.success : colors.gold} 
                />
              </LinearGradient>
            </View>
            <View style={styles.mediaOptionContent}>
              <Text style={styles.mediaOptionTitle}>
                {capturedMedia.photo ? "Photo Captured" : "Add Photo"}
              </Text>
              <Text style={styles.mediaOptionDescription}>
                {capturedMedia.photo ? "Tap to replace" : "Take or select a photo"}
              </Text>
            </View>
            <Feather name={capturedMedia.photo ? "check" : "camera"} size={20} color={colors.darkGray} />
          </LuxuryCard>
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={300}>
          <LuxuryCard
            style={[
              styles.mediaOption,
              capturedMedia.video && styles.mediaOptionCaptured
            ]}
            onPress={() => handleMediaSelection("video")}
          >
            <View style={styles.mediaIconContainer}>
              <LinearGradient
                colors={capturedMedia.video ? [colors.success + "30", colors.success + "10"] : [colors.rosegold + "30", colors.rosegold + "10"]}
                style={styles.mediaIconGradient}
              >
                <MaterialIcons 
                  name={capturedMedia.video ? "check-circle" : "videocam"} 
                  size={36} 
                  color={capturedMedia.video ? colors.success : colors.rosegold} 
                />
              </LinearGradient>
            </View>
            <View style={styles.mediaOptionContent}>
              <Text style={styles.mediaOptionTitle}>
                {capturedMedia.video ? "Video Captured" : "Add Video"}
              </Text>
              <Text style={styles.mediaOptionDescription}>
                {capturedMedia.video ? "Tap to replace" : "Record a video"}
              </Text>
            </View>
            <Feather name={capturedMedia.video ? "check" : "video"} size={20} color={colors.darkGray} />
          </LuxuryCard>
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={400}>
          <LuxuryCard
            style={[
              styles.mediaOption,
              capturedMedia.audio && styles.mediaOptionCaptured
            ]}
            onPress={() => handleMediaSelection("audio")}
          >
            <View style={styles.mediaIconContainer}>
              <LinearGradient
                colors={capturedMedia.audio ? [colors.success + "30", colors.success + "10"] : [colors.platinum + "30", colors.platinum + "10"]}
                style={styles.mediaIconGradient}
              >
                <MaterialIcons 
                  name={capturedMedia.audio ? "check-circle" : "mic"} 
                  size={36} 
                  color={capturedMedia.audio ? colors.success : colors.charcoal} 
                />
              </LinearGradient>
            </View>
            <View style={styles.mediaOptionContent}>
              <Text style={styles.mediaOptionTitle}>
                {capturedMedia.audio ? "Audio Captured" : "Add Audio"}
              </Text>
              <Text style={styles.mediaOptionDescription}>
                {capturedMedia.audio ? "Tap to replace" : "Record audio description"}
              </Text>
            </View>
            <Feather name={capturedMedia.audio ? "check" : "mic"} size={20} color={colors.darkGray} />
          </LuxuryCard>
        </Animatable.View>
      </View>

      
      {(capturedMedia.photo || capturedMedia.video || capturedMedia.audio) && (
        <Animatable.View animation="fadeInUp" delay={500}>
          <LuxuryCard style={styles.mediaSummaryCard}>
            <Text style={styles.mediaSummaryText}>
              {Object.values(capturedMedia).filter(Boolean).length} media item(s) captured
            </Text>
            <LuxuryButton
              title="Proceed to Analysis"
              icon={<MaterialIcons name="arrow-forward" size={20} color={colors.pureWhite} />}
              onPress={() => {
                setCurrentStep(2);
                animateStepTransition(2);
              }}
              variant="gold"
              style={styles.proceedAnalysisButton}
            />
          </LuxuryCard>
        </Animatable.View>
      )}
    </Animated.View>
  );

  const renderAudioRecordingModal = () => {
    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <Modal 
        animationType="slide" 
        transparent={false} 
        visible={showAudioRecorder}
        onShow={startAudioRecording} 
      >
        <LuxuryBackground>
          <View style={styles.audioRecordingContainer}>
            <Animatable.View
              animation="zoomIn"
              style={styles.recordingCard}
            >
              <LuxuryCard style={styles.recordingInnerCard}>
                <TouchableOpacity 
                  style={styles.closeModalButton}
                  onPress={() => {
                    if (isRecordingAudio) stopAudioRecording();
                    setShowAudioRecorder(false);
                  }}
                >
                  <MaterialIcons name="close" size={28} color={colors.darkGray} />
                </TouchableOpacity>

                <Animatable.View
                  animation="pulse"
                  iterationCount="infinite"
                  style={styles.recordingIndicator}
                >
                  <LinearGradient
                    colors={[colors.fire + "20", colors.fire + "40"]}
                    style={styles.recordingGradient}
                  >
                    <MaterialIcons name="mic" size={60} color={colors.fire} />
                  </LinearGradient>
                </Animatable.View>
                
                <Text style={styles.recordingText}>Recording Audio</Text>
                <Text style={styles.recordingDuration}>{formatDuration(recordingDuration)}</Text>
                
                
                <View style={styles.audioVisualizer}>
                  {[...Array(25)].map((_, i) => (
                    <Animatable.View
                      key={i}
                      animation={{
                        0: { height: 10 },
                        0.5: { height: Math.random() * 40 + 15 },
                        1: { height: 10 },
                      }}
                      iterationCount="infinite"
                      duration={800 + Math.random() * 400}
                      delay={i * 40}
                      style={[
                        styles.audioBar,
                        { backgroundColor: colors.gold },
                      ]}
                    />
                  ))}
                </View>
                
                <LuxuryButton
                  title="Stop Recording"
                  icon={<MaterialIcons name="stop" size={24} color={colors.pureWhite} />}
                  onPress={stopAudioRecording}
                  variant="fire"
                  style={styles.stopRecordingButton}
                />
              </LuxuryCard>
            </Animatable.View>
          </View>
        </LuxuryBackground>
      </Modal>
    );
  };

  const renderAIAnalysis = () => (
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
              colors={colors.goldGradient}
              style={styles.aiLoadingGradient}
            >
              <MaterialCommunityIcons name="brain" size={60} color={colors.pureWhite} />
            </LinearGradient>
          </Animatable.View>
          
          <Animatable.Text 
            animation="fadeIn" 
            style={styles.analyzingText}
          >
            AI is analyzing your report
          </Animatable.Text>
          <Text style={styles.analyzingSubtext}>
            Determining severity and response requirements
          </Text>
          
          
          <View style={styles.loadingDotsContainer}>
            {[0, 1, 2, 3, 4].map((index) => (
              <Animatable.View
                key={index}
                animation={{
                  0: { scale: 0.5, opacity: 0.3 },
                  0.5: { scale: 1, opacity: 1 },
                  1: { scale: 0.5, opacity: 0.3 },
                }}
                iterationCount="infinite"
                duration={1500}
                delay={index * 200}
                style={[styles.loadingDot, { backgroundColor: colors.gold }]}
              />
            ))}
          </View>
        </View>
      ) : (
        aiAnalysis && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Animatable.View 
              animation="fadeInUp" 
              style={styles.analysisResultContainer}
            >
              <Text style={styles.analysisTitle}>AI Analysis Complete</Text>

              <LuxuryCard style={styles.analysisCard}>
                
                {/* {!aiAnalysis.matchesCategory && selectedIssueType && (
                  <View style={styles.categoryMismatchWarning}>
                    <MaterialIcons name="warning" size={20} color={colors.fire} />
                    <Text style={styles.warningText}>
                      Detected as {String(aiAnalysis.actualCategory || "Unknown")} instead of {String(selectedIssueType.title || "Unknown")}
                    </Text>
                  </View>
                )} */}

                
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Severity Level</Text>
                  <View style={styles.severityBadge}>
                    <LinearGradient
                      colors={getSeverityGradient(aiAnalysis.severity)}
                      style={styles.severityGradient}
                    >
                      <Text style={styles.severityText}>{String(aiAnalysis.severity || "Medium")}</Text>
                    </LinearGradient>
                  </View>
                </View>

                
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Priority Score</Text>
                  <View style={styles.priorityContainer}>
                    <View style={styles.priorityBar}>
                      <Animated.View
                        style={[
                          styles.priorityFill,
                          {
                            width: `${(Number(aiAnalysis.priorityScore) || 5) * 10}%`,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={getPriorityGradient(Number(aiAnalysis.priorityScore) || 5)}
                          style={StyleSheet.absoluteFillObject}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </Animated.View>
                    </View>
                    <Text style={styles.priorityScore}>
                      {Number(aiAnalysis.priorityScore) || 5}/10
                    </Text>
                  </View>
                </View>

                
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Response Time</Text>
                  <View style={styles.responseTimeBadge}>
                    <Feather name="clock" size={16} color={colors.gold} />
                    <Text style={styles.responseTimeText}>{String(aiAnalysis.responseTime || "Within 24 hours")}</Text>
                  </View>
                </View>

                
                <View style={styles.descriptionContainer}>
                  <Text style={styles.analysisLabel}>Issue Description</Text>
                  <Text style={styles.descriptionText}>
                    {String(aiAnalysis.description || "")}
                  </Text>
                </View>

                
                <View style={styles.actionsContainer}>
                  <Text style={styles.analysisLabel}>Immediate Actions Required</Text>
                  {aiAnalysis.immediateActions && Array.isArray(aiAnalysis.immediateActions) && aiAnalysis.immediateActions.map((action, index) => (
                    <Animatable.View
                      key={index}
                      animation="fadeInLeft"
                      delay={index * 100}
                      style={styles.actionItem}
                    >
                      <View style={styles.actionBullet}>
                        <LinearGradient
                          colors={colors.goldGradient}
                          style={styles.actionBulletGradient}
                        />
                      </View>
                      <Text style={styles.actionText}>{String(action)}</Text>
                    </Animatable.View>
                  ))}
                </View>

                
                {aiAnalysis.mediaAnalysis && (
                  <View style={styles.mediaAnalysisContainer}>
                    <Text style={styles.analysisLabel}>Media Analysis</Text>
                    {aiAnalysis.mediaAnalysis.photoFindings && aiAnalysis.mediaAnalysis.photoFindings !== "" ? (
                      <View style={styles.mediaFindingItem}>
                        <MaterialIcons name="photo" size={18} color={colors.gold} />
                        <Text style={styles.mediaFindingText}>
                          Photo: {String(aiAnalysis.mediaAnalysis.photoFindings)}
                        </Text>
                      </View>
                    ) : null}
                    {aiAnalysis.mediaAnalysis.videoFindings && aiAnalysis.mediaAnalysis.videoFindings !== "" ? (
                      <View style={styles.mediaFindingItem}>
                        <MaterialIcons name="videocam" size={18} color={colors.rosegold} />
                        <Text style={styles.mediaFindingText}>
                          Video: {String(aiAnalysis.mediaAnalysis.videoFindings)}
                        </Text>
                      </View>
                    ) : null}
                    {aiAnalysis.mediaAnalysis.audioFindings && aiAnalysis.mediaAnalysis.audioFindings !== "" ? (
                      <View style={styles.mediaFindingItem}>
                        <MaterialIcons name="mic" size={18} color={colors.charcoal} />
                        <Text style={styles.mediaFindingText}>
                          Audio: {String(aiAnalysis.mediaAnalysis.audioFindings)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                
                <View style={styles.infoCardsContainer}>
                  <LuxuryCard style={styles.infoCard}>
                    <MaterialIcons name="people" size={20} color={colors.gold} />
                    <Text style={styles.infoCardLabel}>Personnel</Text>
                    <Text style={styles.infoCardValue}>{String(aiAnalysis.requiredPersonnel || "")}</Text>
                  </LuxuryCard>

                  <LuxuryCard style={styles.infoCard}>
                    <MaterialIcons name="build" size={20} color={colors.gold} />
                    <Text style={styles.infoCardLabel}>Resources</Text>
                    <Text style={styles.infoCardValue}>{String(aiAnalysis.estimatedResources || "")}</Text>
                  </LuxuryCard>
                </View>
              </LuxuryCard>

              <LuxuryButton
                title="Continue to Review"
                icon={<MaterialIcons name="arrow-forward" size={20} color={colors.pureWhite} />}
                onPress={() => {
                  setCurrentStep(3);
                  animateStepTransition(3);
                }}
                style={styles.continueButton}
              />
            </Animatable.View>
          </ScrollView>
        )
      )}
    </View>
  );

  const renderReviewAndSubmit = () => {
    try {
      
      console.log("Review data:", {
        selectedIssueType: selectedIssueType ? { 
          title: selectedIssueType.title, 
          icon: selectedIssueType.icon, 
          color: selectedIssueType.color 
        } : null,
        aiAnalysis: aiAnalysis ? {
          severity: aiAnalysis.severity,
          responseTime: aiAnalysis.responseTime,
          description: aiAnalysis.description
        } : null,
        location,
        address,
        capturedMedia
      });
      
      
      if (!selectedIssueType || !aiAnalysis) {
        return (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewTitle}>Loading review data...</Text>
          </View>
        );
      }
      
      return (
    <ScrollView style={styles.reviewContainer} showsVerticalScrollIndicator={false}>
      <Animatable.Text 
        animation="fadeInDown" 
        style={styles.reviewTitle}
      >
        Final Review
      </Animatable.Text>
      <Animatable.Text 
        animation="fadeInDown" 
        delay={100}
        style={styles.reviewSubtitle}
      >
        Confirm the details below before submitting your report.
      </Animatable.Text>

      
      <Animatable.View animation="fadeInUp" delay={200}>
        <LuxuryCard style={styles.reviewMainCard}>
          
          {selectedIssueType && (
            <View style={styles.issueSummaryHeader}>
              <View style={[styles.issueIcon, { backgroundColor: (selectedIssueType.color || colors.gold) + "20" }]}>
                <MaterialIcons
                  name={selectedIssueType.icon || "report-problem"}
                  size={28}
                  color={selectedIssueType.color || colors.gold}
                />
              </View>
              <View style={styles.issueSummaryContent}>
                <Text style={styles.issueSummaryTitle}>{String(selectedIssueType.title || "Issue")}</Text>
                <Text style={styles.issueSummarySubtitle}>
                  {String(aiAnalysis?.severity || "Medium")} Priority • {String(aiAnalysis?.responseTime || "Within 24 hours")}
                </Text>
              </View>
            </View>
          )}

          
          {aiAnalysis && aiAnalysis.description && (
            <View style={styles.summaryDescription}>
              <Text style={styles.summaryDescriptionText}>
                {String(aiAnalysis.description)}
              </Text>
            </View>
          )}

          
          {location && (
            <View style={styles.locationReview}>
              <MaterialIcons name="location-on" size={20} color={colors.gold} />
              <Text style={styles.locationReviewText}>{String(address || "Bengaluru, Karnataka, India")}</Text>
            </View>
          )}
        </LuxuryCard>
      </Animatable.View>

      
      {(capturedMedia.photo || capturedMedia.video || capturedMedia.audio) && (
        <Animatable.View animation="fadeInUp" delay={300} style={styles.mediaGrid}>
          {capturedMedia.photo && (
            <LuxuryCard style={styles.mediaGridItem}>
              <Image source={{ uri: capturedMedia.photo }} style={styles.mediaPreview} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.mediaGridOverlay} />
              <View style={styles.mediaGridLabel}>
                <MaterialIcons name="photo-camera" size={16} color={colors.pureWhite} />
                <Text style={styles.mediaGridText}>Photo</Text>
              </View>
            </LuxuryCard>
          )}
          {capturedMedia.video && (
            <LuxuryCard style={styles.mediaGridItem}>
               <Video
                  source={{ uri: capturedMedia.video }}
                  style={styles.mediaPreview}
                  resizeMode="cover"
                  isMuted
                  shouldPlay
                  isLooping
                />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.mediaGridOverlay} />
              <View style={styles.mediaGridLabel}>
                <MaterialIcons name="videocam" size={16} color={colors.pureWhite} />
                <Text style={styles.mediaGridText}>Video</Text>
              </View>
            </LuxuryCard>
          )}
          {capturedMedia.audio && (
            <LuxuryCard style={styles.mediaGridItem} onPress={playPauseAudio}>
              <LinearGradient colors={colors.goldGradient} style={styles.audioGridItem}>
                <MaterialIcons name={isPlaying ? "pause" : "multitrack-audio"} size={40} color={colors.pureWhite} />
              </LinearGradient>
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.mediaGridOverlay} />
              <View style={styles.mediaGridLabel}>
                <MaterialIcons name="mic" size={16} color={colors.pureWhite} />
                <Text style={styles.mediaGridText}>Audio</Text>
              </View>
            </LuxuryCard>
          )}
        </Animatable.View>
      )}

      
      <Animatable.View 
        animation="fadeInUp" 
        delay={400}
        style={styles.notesContainer}
      >
        <Text style={styles.notesLabel}>Additional Information</Text>
        <LuxuryCard style={styles.notesCard}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional details..."
            placeholderTextColor={colors.textUltraLight}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
          />
        </LuxuryCard>
      </Animatable.View>

      
      <Animatable.View animation="fadeInUp" delay={500}>
        <LuxuryButton
          title={isUploading ? "Submitting Report..." : "Confirm & Submit Report"}
          icon={
            isUploading ? 
            <ActivityIndicator size="small" color={colors.pureWhite} /> :
            <MaterialIcons name="send" size={20} color={colors.pureWhite} />
          }
          onPress={submitReport}
          disabled={isUploading}
          variant="gold"
          style={styles.submitButton}
        />
      </Animatable.View>

      <View style={styles.bottomPadding} />
    </ScrollView>
      );
    } catch (error) {
      console.error("Error rendering review:", error);
      return (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewTitle}>Error loading review</Text>
          <Text style={styles.reviewSubtitle}>Please try again</Text>
        </View>
      );
    }
  };

  
  const getSeverityGradient = (severity) => {
    const severityStr = String(severity || "Medium");
    switch (severityStr) {
      case "Critical":
        return [colors.fire, colors.fire + "DD"];
      case "High":
        return [colors.safety, colors.safety + "DD"];
      case "Medium":
        return [colors.cleaning, colors.cleaning + "DD"];
      default:
        return colors.goldGradient;
    }
  };

  const getPriorityGradient = (score) => {
    const scoreNum = Number(score) || 5;
    if (scoreNum >= 8) return [colors.fire, colors.safety];
    if (scoreNum >= 5) return [colors.champagne, colors.gold];
    return [colors.platinum, colors.softGray];
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case "High":
        return colors.fire;
      case "Medium":
        return colors.gold;
      case "Low":
        return colors.cleaning;
      default:
        return colors.textLight;
    }
  };

  if (!hasPermissions) {
    return (
      <View style={styles.permissionContainer}>
        <LuxuryBackground>
          <View style={styles.permissionContent}>
            <LuxuryCard style={styles.permissionCard}>
              <MaterialIcons name="security" size={80} color={colors.gold} />
              <Text style={styles.permissionTitle}>Permissions Required</Text>
              <Text style={styles.permissionText}>
                To report issues, we need access to your camera, microphone, and location
              </Text>
              <LuxuryButton
                title="Grant Permissions"
                icon={<MaterialIcons name="check" size={20} color={colors.pureWhite} />}
                onPress={initializePermissions}
                variant="gold"
                style={styles.permissionButton}
              />
            </LuxuryCard>
          </View>
        </LuxuryBackground>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LuxuryBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <LuxuryCard style={styles.backButtonCard}>
                <MaterialIcons name="arrow-back" size={24} color={colors.charcoal} />
              </LuxuryCard>
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Report Issue</Text>
            
            <View style={styles.headerRight} />
          </View>

          
          {renderStepIndicator()}

          
          <View style={{flex: 1}}>
            {currentStep === 0 && renderIssueTypeSelection()}
            {currentStep === 1 && renderMediaSelection()}
            {currentStep === 2 && renderAIAnalysis()}
            {currentStep === 3 && renderReviewAndSubmit()}
          </View>

          
          {renderAudioRecordingModal()}

          
          {showCamera && (
            <Modal animationType="slide" transparent={false} visible={showCamera}>
              <Camera
                style={styles.camera}
                type={cameraType}
                ref={cameraRef}
                onCameraReady={() => console.log("Camera ready")}
              >
                <View style={styles.cameraOverlay}>
                  
                  <View style={styles.cameraHeader}>
                    <TouchableOpacity
                      style={styles.cameraCloseButton}
                      onPress={() => {
                        if (isRecordingVideo) {
                          stopVideoRecording();
                        }
                        setShowCamera(false);
                      }}
                    >
                      <BlurView intensity={80} tint="dark" style={styles.cameraButtonBlur}>
                        <MaterialIcons name="close" size={28} color={colors.pureWhite} />
                      </BlurView>
                    </TouchableOpacity>
                  </View>

                  
                  <View style={styles.cameraGuide}>
                    <Svg width={screenWidth * 0.8} height={screenWidth * 0.8}>
                      <Rect
                        x={2}
                        y={2}
                        width={screenWidth * 0.8 - 4}
                        height={screenWidth * 0.8 - 4}
                        fill="none"
                        stroke={colors.pureWhite}
                        strokeWidth={2}
                        strokeDasharray="10 5"
                        opacity={0.5}
                      />
                      
                      <Path
                        d="M2 20 L2 2 L20 2"
                        fill="none"
                        stroke={colors.gold}
                        strokeWidth={3}
                      />
                      <Path
                        d={`M${screenWidth * 0.8 - 20} 2 L${screenWidth * 0.8 - 2} 2 L${screenWidth * 0.8 - 2} 20`}
                        fill="none"
                        stroke={colors.gold}
                        strokeWidth={3}
                      />
                      <Path
                        d={`M2 ${screenWidth * 0.8 - 20} L2 ${screenWidth * 0.8 - 2} L20 ${screenWidth * 0.8 - 2}`}
                        fill="none"
                        stroke={colors.gold}
                        strokeWidth={3}
                      />
                      <Path
                        d={`M${screenWidth * 0.8 - 20} ${screenWidth * 0.8 - 2} L${screenWidth * 0.8 - 2} ${screenWidth * 0.8 - 2} L${screenWidth * 0.8 - 2} ${screenWidth * 0.8 - 20}`}
                        fill="none"
                        stroke={colors.gold}
                        strokeWidth={3}
                      />
                    </Svg>
                  </View>

                  
                  <View style={styles.cameraControls}>
                    <TouchableOpacity
                      style={styles.cameraFlipButton}
                      onPress={() => {
                        setCameraType(
                          cameraType === CameraType.back
                            ? CameraType.front
                            : CameraType.back
                        );
                      }}
                    >
                      <BlurView intensity={80} tint="dark" style={styles.cameraButtonBlur}>
                        <MaterialIcons
                          name="flip-camera-ios"
                          size={28}
                          color={colors.pureWhite}
                        />
                      </BlurView>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cameraRecordButton,
                        isRecordingVideo && styles.cameraRecordButtonActive,
                      ]}
                      onPress={handleCapture}
                    >
                      <Animated.View
                        style={[
                          styles.cameraRecordOuter,
                          {
                            transform: [{ scale: isRecordingVideo ? pulseAnim : 1 }],
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={isRecordingVideo ? [colors.fire, colors.fire] : [colors.pureWhite, colors.pearl]}
                          style={styles.cameraRecordGradient}
                        >
                          {cameraMode === 'video' ? (
                            <View style={[
                              styles.cameraRecordInner,
                              isRecordingVideo && styles.cameraRecordInnerActive,
                            ]} />
                           ) : (
                            <MaterialIcons name="photo-camera" size={32} color={colors.charcoal} />
                           )}
                        </LinearGradient>
                      </Animated.View>
                    </TouchableOpacity>

                    <View style={styles.cameraFlipButton} />
                  </View>
                </View>
              </Camera>
            </Modal>
          )}

          
          {showSuccess && (
            <Modal animationType="fade" transparent visible={showSuccess}>
              <View style={styles.successModal}>
                <Animatable.View
                  animation="bounceIn"
                  style={styles.successModalContent}
                >
                  <LuxuryCard style={styles.successCard}>
                    <Animatable.View
                      animation="bounceIn"
                      delay={200}
                    >
                      <LinearGradient
                        colors={colors.goldGradient}
                        style={styles.successIconContainer}
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={60}
                          color={colors.pureWhite}
                        />
                      </LinearGradient>
                    </Animatable.View>
                    
                    <Animatable.Text 
                      animation="fadeInUp" 
                      delay={400}
                      style={styles.successTitle}
                    >
                      Report Submitted Successfully
                    </Animatable.Text>
                    
                    <Animatable.Text 
                      animation="fadeInUp" 
                      delay={500}
                      style={styles.successMessage}
                    >
                      Emergency response team has been notified and will respond according to priority
                    </Animatable.Text>
                    
                    <Animatable.View
                      animation="fadeInUp"
                      delay={600}
                      style={styles.successDetails}
                    >
                      <View style={styles.successDetailItem}>
                        <Text style={styles.successDetailLabel}>Response Time</Text>
                        <Text style={styles.successDetailValue}>{String(aiAnalysis?.responseTime || "Within 24 hours")}</Text>
                      </View>
                      <View style={styles.successDetailDivider} />
                      <View style={styles.successDetailItem}>
                        <Text style={styles.successDetailLabel}>Priority Level</Text>
                        <Text style={styles.successDetailValue}>{String(aiAnalysis?.severity || "Medium")}</Text>
                      </View>
                    </Animatable.View>
                  </LuxuryCard>
                </Animatable.View>
              </View>
            </Modal>
          )}

          <FlashMessage position="top" />
        </KeyboardAvoidingView>
      </LuxuryBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pureWhite,
  },
  luxuryBackground: {
    flex: 1,
    position: "relative",
  },
  keyboardAvoid: {
    flex: 1,
  },
  
  
  shimmerOverlay: {
    position: "absolute",
    width: screenWidth * 2,
    height: screenHeight,
  },
  shimmerGradient: {
    flex: 1,
  },
  floatingOrb1: {
    position: "absolute",
    top: 100,
    right: -50,
    width: 200,
    height: 200,
  },
  floatingOrb2: {
    position: "absolute",
    bottom: 150,
    left: -50,
    width: 150,
    height: 150,
  },
  orbGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  
  
  luxuryCard: {
    backgroundColor: colors.pureWhite,
    borderRadius: 20,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    overflow: "hidden",
  },
  
  
  luxuryButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 8,
  },
  luxuryButtonInner: {
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonGlow: {
    position: "absolute",
    width: "120%",
    height: "120%",
    left: "-10%",
    top: "-10%",
  },
  glowGradient: {
    flex: 1,
    borderRadius: 16,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: colors.pureWhite,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "300",
    color: colors.text,
    letterSpacing: 1,
  },
  headerRight: {
    width: 48,
  },
  
  
  stepIndicatorContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.lightGray,
    borderRadius: 2,
    marginBottom: 28,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.lightGray,
  },
  stepCircleActive: {
    backgroundColor: colors.pureWhite,
    borderColor: colors.mediumGray,
  },
  stepCircleCurrent: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  stepNumber: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: "500",
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textUltraLight,
    fontWeight: "400",
  },
  stepLabelActive: {
    color: colors.textLight,
    fontWeight: "500",
  },
  stepLabelCurrent: {
    color: colors.gold,
    fontWeight: "600",
  },
  
  
  content: {
    flex: 1,
  },
  contentScrollContainer: {
    paddingBottom: 40,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "300",
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: "300",
  },
  
  
  issueTypesContainer: {
    marginBottom: 24,
  },
  issueTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 16,
  },
  issueTypeCardSelected: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  issueTypeIconContainer: {
    marginRight: 16,
  },
  issueTypeIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  issueTypeContent: {
    flex: 1,
  },
  issueTypeTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 4,
  },
  issueTypeDescription: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  issueTypeArrow: {
    opacity: 0.3,
  },
  
  
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  locationText: {
    color: colors.text,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontWeight: "400",
  },
  
  
  mediaOptionsContainer: {
    marginBottom: 24,
  },
  mediaOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginBottom: 12,
  },
  mediaOptionCaptured: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  mediaIconContainer: {
    marginRight: 16,
  },
  mediaIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaOptionContent: {
    flex: 1,
  },
  mediaOptionTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 2,
  },
  mediaOptionDescription: {
    fontSize: 14,
    color: colors.textLight,
  },
  mediaSummaryCard: {
    padding: 20,
    alignItems: "center",
  },
  mediaSummaryText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "400",
    marginBottom: 16,
  },
  proceedAnalysisButton: {
    minWidth: 200,
  },
  
  
  audioRecordingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  recordingCard: {
    width: "100%",
    maxWidth: 400,
    position: 'relative',
  },
  recordingInnerCard: {
    padding: 32,
    alignItems: "center",
  },
  closeModalButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  recordingIndicator: {
    marginBottom: 24,
  },
  recordingGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  recordingText: {
    fontSize: 24,
    fontWeight: "300",
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  recordingDuration: {
    fontSize: 32,
    fontWeight: "200",
    color: colors.gold,
    marginBottom: 32,
  },
  audioVisualizer: {
    flexDirection: "row",
    height: 60,
    alignItems: "center",
    marginBottom: 32,
  },
  audioBar: {
    width: 2,
    marginHorizontal: 1.5,
    borderRadius: 1,
    backgroundColor: colors.gold,
  },
  stopRecordingButton: {
    minWidth: 200,
  },
  
  
  analysisContainer: {
    flex: 1,
    padding: 20,
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  aiLoadingGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  analyzingText: {
    fontSize: 24,
    fontWeight: "300",
    color: colors.text,
    marginTop: 32,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  analyzingSubtext: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 40,
    textAlign: "center",
    fontWeight: "300",
  },
  loadingDotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  
  
  analysisResultContainer: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 28,
    fontWeight: "300",
    color: colors.text,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  analysisCard: {
    padding: 24,
  },
  categoryMismatchWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fire + "10",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  warningText: {
    color: colors.fire,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  analysisRow: {
    marginBottom: 24,
  },
  analysisLabel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  severityBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    overflow: "hidden",
  },
  severityGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  severityText: {
    color: colors.pureWhite,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  priorityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    marginRight: 12,
    overflow: "hidden",
  },
  priorityFill: {
    height: "100%",
    borderRadius: 4,
  },
  priorityScore: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.text,
    minWidth: 40,
  },
  responseTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.gold + "10",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  responseTimeText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "300",
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    fontWeight: "300",
  },
  mediaAnalysisContainer: {
    marginBottom: 24,
    backgroundColor: colors.pearl,
    padding: 16,
    borderRadius: 12,
  },
  mediaFindingItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },
  mediaFindingText: {
    color: colors.text,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
    fontWeight: "300",
  },
  infoCardsContainer: {
    flexDirection: "row",
    marginTop: 8,
    marginHorizontal: -6,
  },
  infoCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 6,
    alignItems: "center",
  },
  infoCardLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "400",
    textAlign: "center",
  },
  continueButton: {
    marginTop: 24,
  },
  
  
  reviewContainer: {
    flex: 1,
    padding: 20,
  },
  reviewTitle: {
    fontSize: 32,
    fontWeight: "300",
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  reviewSubtitle: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 24,
    fontWeight: "300",
  },
  reviewMainCard: {
    padding: 24,
    marginBottom: 16,
  },
  issueSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    paddingBottom: 16,
    marginBottom: 16,
  },
  issueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  issueSummaryContent: {
    flex: 1,
  },
  issueSummaryTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: colors.text,
  },
  issueSummarySubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },
  summaryDescription: {
    marginBottom: 16,
  },
  summaryDescriptionText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "300",
  },
  locationReview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  locationReviewText: {
    color: colors.text,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  mediaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mediaGridItem: {
    flex: 1,
    height: 150,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mediaGridOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  mediaGridLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaGridText: {
    color: colors.pureWhite,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  audioGridItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  notesCard: {
    padding: 0,
  },
  notesInput: {
    padding: 16,
    color: colors.text,
    fontSize: 15,
    minHeight: 80,
    fontWeight: "300",
  },
  submitButton: {
    marginBottom: 16,
  },
  bottomPadding: {
    height: 40,
  },
  
  
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
  },
  cameraHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  cameraCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
  },
  cameraButtonBlur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraGuide: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -(screenWidth * 0.4),
    marginLeft: -(screenWidth * 0.4),
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 50,
  },
  cameraFlipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
  },
  cameraRecordButton: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraRecordButtonActive: {
    
  },
  cameraRecordOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 4,
  },
  cameraRecordGradient: {
    flex: 1,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraRecordInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.fire,
  },
  cameraRecordInnerActive: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.pureWhite,
  },
  
  
  successModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    width: screenWidth * 0.85,
  },
  successCard: {
    padding: 40,
    alignItems: "center",
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "300",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  successMessage: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "300",
    marginBottom: 24,
  },
  successDetails: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  successDetailItem: {
    flex: 1,
    alignItems: "center",
  },
  successDetailLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  successDetailValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  successDetailDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.lightGray,
    marginHorizontal: 20,
  },
  
  
  permissionContainer: {
    flex: 1,
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionCard: {
    padding: 40,
    alignItems: "center",
    maxWidth: 400,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "300",
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  permissionText: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: "300",
  },
  permissionButton: {
    minWidth: 200,
  },
});

export default PedestrianUpload;
