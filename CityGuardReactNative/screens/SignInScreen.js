// screens/SignInScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
  StatusBar,
  Alert,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Vibration,
  KeyboardAvoidingView,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInUser, USER_TYPES } from '../firebase/authConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SignInScreen = ({ route, navigation }) => {
  const [data, setData] = useState({
    username: '',
    password: '',
    check_textInputChange: false,
    secureTextEntry: true,
    isValidPassword: true,
  });
  const { colors } = useTheme();
  const [checked, setChecked] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(screenHeight)).current;
  const logoScaleAnim = useRef(new Animated.Value(0)).current;
  const inputFocusAnims = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  
  // Particle animations
  const particleAnims = useRef([...Array(15)].map(() => ({
    x: new Animated.Value(Math.random() * screenWidth),
    y: new Animated.Value(screenHeight + 50),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(Math.random() * 0.5 + 0.5),
  }))).current;

  // Floating shapes animations
  const floatingShapes = useRef([...Array(3)].map(() => ({
    translateY: new Animated.Value(0),
    translateX: new Animated.Value(0),
    rotate: new Animated.Value(0),
    scale: new Animated.Value(1),
  }))).current;

  useEffect(() => {
    // Try to auto login
    getData();
    animateEntrance();
    startContinuousAnimations();
  }, []);

  const animateEntrance = () => {
    // Logo entrance
    Animated.sequence([
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(cardSlideAnim, {
          toValue: 0,
          tension: 20,
          friction: 8,
          delay: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
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

    // Shimmer animation
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particle animations
    particleAnims.forEach((particle, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 300),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: -50,
              duration: 10000,
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

    // Floating shapes
    floatingShapes.forEach((shape, index) => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(shape.translateY, {
              toValue: -20 - index * 10,
              duration: 3000 + index * 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(shape.translateY, {
              toValue: 0,
              duration: 3000 + index * 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(shape.translateX, {
              toValue: 10 - index * 5,
              duration: 4000 + index * 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(shape.translateX, {
              toValue: -10 + index * 5,
              duration: 4000 + index * 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(shape.rotate, {
            toValue: 1,
            duration: 10000 + index * 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const handleInputFocus = (index) => {
    Vibration.vibrate(10);
    Animated.spring(inputFocusAnims[index], {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleInputBlur = (index) => {
    Animated.timing(inputFocusAnims[index], {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const storeData = async (key, input) => {
    try {
      await AsyncStorage.setItem('@' + key, input);
    } catch (e) {
      console.log('error ', e);
    }
  };

  const getData = async () => {
    try {
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');

      if (username !== null && password != null) {
        setChecked(true);
        setData({
          ...data,
          username: username,
          password: password,
        });
      }
    } catch (e) {
      console.log('error ', e);
    }
  };

  const CheckBox = ({
    selected,
    onPress,
    style,
    textStyle,
    size = 24,
    color = '#667eea',
    text = '',
    ...props
  }) => (
    <TouchableOpacity
      style={[styles.checkBox, style]}
      onPress={() => {
        Vibration.vibrate(10);
        setChecked(!checked);
      }}>
      <Animated.View
        style={{
          transform: [{
            scale: selected ? pulseAnim : 1
          }]
        }}
      >
        <Icon
          size={size}
          color={color}
          name={selected ? 'check-box' : 'check-box-outline-blank'}
        />
      </Animated.View>
      <Text style={[styles.checkBoxText, textStyle]}>{text}</Text>
    </TouchableOpacity>
  );

  const textInputChange = val => {
    setData({
      ...data,
      username: val,
      check_textInputChange: true,
    });
  };

  const handlePasswordChange = val => {
    if (val.trim().length >= 8) {
      setData({
        ...data,
        password: val,
        isValidPassword: true,
      });
    } else {
      setData({
        ...data,
        password: val,
        isValidPassword: false,
      });
    }
  };

  const updateSecureTextEntry = () => {
    Vibration.vibrate(10);
    setData({
      ...data,
      secureTextEntry: !data.secureTextEntry,
    });
  };

  const handleValidUser = val => {
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (reg.test(val) === true) {
      setData({
        ...data,
        isValidUser: true,
      });
    } else {
      setData({
        ...data,
        isValidUser: false,
      });
    }
  };

  const checkData = () => {
    if (data['username'] != '' && data['password'] != '') {
      return true;
    }
    return false;
  };

  const sendLoginDetailsToServer = async () => {
    if (!checkData()) {
      Alert.alert('Please enter both the username and password to log in');
      return;
    }

    if (!data['isValidPassword']) {
      Alert.alert('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    Vibration.vibrate(10);

    try {
      const result = await signInUser(data.username, data.password);
      
      if (result.success) {
        // Save login details if remember me is checked
        if (checked) {
          await storeData('username', data.username);
          await storeData('password', data.password);
        } else {
          await storeData('username', '');
          await storeData('password', '');
        }

        // Navigate based on user type
        const userType = result.userProfile.userType;
        
        switch (userType) {
          case USER_TYPES.PEDESTRIAN:
            navigation.navigate('PedestrianDashboard');
            break;
          case USER_TYPES.CLEANER:
            navigation.navigate('CleanerDashboard');
            break;
          case USER_TYPES.POLICEMAN:
            navigation.navigate('PoliceManDashboard');
            break;
          case USER_TYPES.FIREMAN:
            navigation.navigate('FiremanDashboard');
            break;
          default:
            Alert.alert('Unknown user type');
        }
      }
    } catch (error) {
      let errorMessage = 'Invalid username or password';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar backgroundColor="transparent" translucent barStyle="dark-content" />
      
      <LinearGradient
        colors={['#f8faff', '#f0f4ff', '#e8ecff']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Background decorations */}
      <Animated.View
        style={[
          styles.backgroundCircle1,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.3],
            }),
            transform: [
              { translateY: floatingShapes[0].translateY },
              { translateX: floatingShapes[0].translateX },
              {
                rotate: floatingShapes[0].rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
              { scale: floatingShapes[0].scale },
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
            transform: [
              { translateY: floatingShapes[1].translateY },
              { translateX: floatingShapes[1].translateX },
              {
                rotate: floatingShapes[1].rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '-360deg'],
                }),
              },
            ],
          },
        ]}
      />
      
      <View style={styles.backgroundShape3} />
      
      {/* Particles */}
      {particleAnims.map((particle, index) => (
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
      ))}
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              opacity: fadeAnim,
              transform: [
                { scale: logoScaleAnim },
                { translateY: floatingAnim },
              ],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.logoGlow}
            />
            <Image
              style={styles.logo}
              source={require("../assets/images/drishti.png")}
            />
          </View>
          <MaskedView
            maskElement={
              <Text style={styles.welcomeText}>Welcome Back</Text>
            }
          >
            <LinearGradient
              colors={['#667eea', '#764ba2', '#f093fb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.welcomeText, { opacity: 0 }]}>
                Welcome Back
              </Text>
            </LinearGradient>
          </MaskedView>
          <Text style={styles.subtitleText}>Sign in to continue</Text>
        </Animated.View>

        {/* Login Form Card */}
        <Animated.View
          style={[
            styles.formCard,
            {
              transform: [
                { translateY: cardSlideAnim },
                { scale: scaleAnim.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [0.9, 1],
                }) },
              ],
            },
          ]}
        >
          <BlurView intensity={95} tint="light" style={styles.glassCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(243, 232, 255, 0.4)']}
              style={styles.cardInnerGradient}
            >
              {/* Username Input */}
              <Animated.View
                style={[
                  styles.inputContainer,
                  {
                    transform: [
                      {
                        scale: inputFocusAnims[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.02],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    inputFocusAnims[0]._value > 0
                      ? ['rgba(102, 126, 234, 0.1)', 'rgba(168, 85, 247, 0.1)']
                      : ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.3)']
                  }
                  style={styles.inputGradient}
                >
                  <View style={styles.inputWrapper}>
                    <FontAwesome name="user-o" color="#667eea" size={20} />
                    <TextInput
                      autoCompleteType="username"
                      placeholder="Username"
                      value={data.username}
                      placeholderTextColor="#94a3b8"
                      style={styles.textInput}
                      autoCapitalize="none"
                      onChangeText={textInputChange}
                      onFocus={() => handleInputFocus(0)}
                      onBlur={() => handleInputBlur(0)}
                      editable={!isLoading}
                    />
                    {data.check_textInputChange ? (
                      <Animatable.View animation="bounceIn">
                        <Feather name="check-circle" color="#10b981" size={20} />
                      </Animatable.View>
                    ) : null}
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Password Input */}
              <Animated.View
                style={[
                  styles.inputContainer,
                  {
                    transform: [
                      {
                        scale: inputFocusAnims[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.02],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    inputFocusAnims[1]._value > 0
                      ? ['rgba(102, 126, 234, 0.1)', 'rgba(168, 85, 247, 0.1)']
                      : ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.3)']
                  }
                  style={styles.inputGradient}
                >
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" color="#667eea" size={20} />
                    <TextInput
                      autoCompleteType="password"
                      placeholder="Password"
                      value={data.password}
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={data.secureTextEntry}
                      style={styles.textInput}
                      autoCapitalize="none"
                      onChangeText={handlePasswordChange}
                      onFocus={() => handleInputFocus(1)}
                      onBlur={() => handleInputBlur(1)}
                      editable={!isLoading}
                    />
                    <TouchableOpacity onPress={updateSecureTextEntry}>
                      {data.secureTextEntry ? (
                        <Feather name="eye-off" color="#94a3b8" size={20} />
                      ) : (
                        <Feather name="eye" color="#667eea" size={20} />
                      )}
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </Animated.View>

              {!data.isValidPassword && (
                <Animatable.View animation="fadeInLeft" duration={500}>
                  <Text style={styles.errorMsg}>
                    Password must be 8 characters long.
                  </Text>
                </Animatable.View>
              )}

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <CheckBox
                  selected={checked}
                  onPress={setChecked}
                  text="Remember me"
                />
                <TouchableOpacity
                  onPress={() => {
                    Vibration.vibrate(10);
                  }}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={styles.signInButton}
                onPress={sendLoginDetailsToServer}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.signInGradientWrapper,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.signInGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.signInText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => {
                    Vibration.vibrate(10);
                    navigation.navigate('SignUpScreen');
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 30,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(102, 126, 234, 0.4)',
  },
  backgroundCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  backgroundCircle2: {
    position: 'absolute',
    top: 300,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  backgroundShape3: {
    position: 'absolute',
    bottom: 100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGlow: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    borderRadius: 100,
    opacity: 0.5,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a3e',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#64748b',
  },
  formCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardInnerGradient: {
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1a1a3e',
  },
  errorMsg: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBoxText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  forgotText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  signInButton: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  signInGradientWrapper: {
    borderRadius: 16,
  },
  signInGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  signInText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#64748b',
  },
  signUpLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: 'bold',
  },
});