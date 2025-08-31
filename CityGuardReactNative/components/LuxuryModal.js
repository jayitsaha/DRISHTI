import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LuxuryModal = ({
  visible,
  onClose,
  children,
  title,
  position = 'center', // 'center', 'bottom', 'right', 'left'
  showCloseButton = true,
  blurBackground = true,
  animationType = 'fade', // 'fade', 'slide', 'scale'
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Start animations
      startEntranceAnimations();
      startPulseAnimation();
    } else {
      // Reverse animations
      startExitAnimations();
    }
  }, [visible]);

  const startEntranceAnimations = () => {
    // Fade in background
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Scale or slide animation based on type
    if (animationType === 'scale') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else if (animationType === 'slide') {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }

    // Glow effect
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const startExitAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      animationType === 'scale' 
        ? Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          })
        : Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
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

  const getModalPosition = () => {
    switch (position) {
      case 'bottom':
        return {
          bottom: 20,
          left: 20,
          right: 20,
          maxHeight: SCREEN_HEIGHT * 0.7,
        };
      case 'right':
        return {
          top: 100,
          right: 20,
          width: SCREEN_WIDTH * 0.4,
          maxHeight: SCREEN_HEIGHT * 0.7,
        };
      case 'left':
        return {
          top: 100,
          left: 20,
          width: SCREEN_WIDTH * 0.4,
          maxHeight: SCREEN_HEIGHT * 0.7,
        };
      case 'center':
      default:
        return {
          top: SCREEN_HEIGHT * 0.15,
          left: 20,
          right: 20,
          maxHeight: SCREEN_HEIGHT * 0.7,
        };
    }
  };

  const modalStyle = getModalPosition();

  const getAnimatedStyle = () => {
    if (animationType === 'scale') {
      return {
        opacity: fadeAnim,
        transform: [
          { scale: scaleAnim },
          { scale: pulseAnim },
        ],
      };
    } else if (animationType === 'slide') {
      return {
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: pulseAnim },
        ],
      };
    } else {
      return {
        opacity: fadeAnim,
        transform: [{ scale: pulseAnim }],
      };
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Background with blur */}
      <Animated.View style={[styles.modalBackground, { opacity: fadeAnim }]}>
        {blurBackground ? (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
          </BlurView>
        ) : (
          <Pressable style={[StyleSheet.absoluteFillObject, styles.darkOverlay]} onPress={onClose} />
        )}
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          modalStyle,
          getAnimatedStyle(),
        ]}
        pointerEvents="box-none"
      >
        {/* Glow Effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
              transform: [{
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              }],
            },
          ]}
        />

        {/* Main Content */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.contentGradient}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && (
                <Text style={styles.headerTitle}>{title}</Text>
              )}
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.closeButtonGradient}
                  >
                    <MaterialIcons name="close" size={24} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  darkOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    position: 'absolute',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  glowEffect: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 74,
    backgroundColor: '#4C6EF5',
  },
  contentGradient: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
});

export default LuxuryModal;