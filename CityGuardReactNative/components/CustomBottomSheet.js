import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CustomBottomSheet = forwardRef(({ 
  snapPoints = ['15%', '50%', '90%'],
  children,
  backgroundStyle,
  handleIndicatorStyle,
}, ref) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const active = useSharedValue(false);
  const currentIndex = useSharedValue(0);
  
  // Convert percentage snap points to pixel values
  const snapPointsPixels = snapPoints.map(point => {
    if (typeof point === 'string' && point.endsWith('%')) {
      const percentage = parseFloat(point) / 100;
      return SCREEN_HEIGHT - (SCREEN_HEIGHT * percentage);
    }
    return SCREEN_HEIGHT - point;
  });
  
  useImperativeHandle(ref, () => ({
    snapToIndex: (index) => {
      'worklet';
      if (index >= 0 && index < snapPointsPixels.length) {
        translateY.value = withSpring(snapPointsPixels[index], {
          damping: 50,
          stiffness: 400,
        });
        currentIndex.value = index;
      }
    },
    close: () => {
      'worklet';
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 50,
        stiffness: 400,
      });
    },
  }));
  
  // Initialize to first snap point
  React.useEffect(() => {
    translateY.value = withSpring(snapPointsPixels[0], {
      damping: 50,
      stiffness: 400,
    });
  }, []);
  
  const findClosestSnapPoint = (y) => {
    'worklet';
    let closestIndex = 0;
    let minDistance = Math.abs(y - snapPointsPixels[0]);
    
    for (let i = 1; i < snapPointsPixels.length; i++) {
      const distance = Math.abs(y - snapPointsPixels[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  };
  
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startY = translateY.value;
      active.value = true;
    },
    onActive: (event, ctx) => {
      translateY.value = Math.max(
        snapPointsPixels[snapPointsPixels.length - 1],
        Math.min(SCREEN_HEIGHT, ctx.startY + event.translationY)
      );
    },
    onEnd: (event) => {
      active.value = false;
      
      if (Math.abs(event.velocityY) > 500) {
        // Handle swipe
        if (event.velocityY > 0) {
          // Swipe down
          const nextIndex = Math.min(currentIndex.value + 1, snapPointsPixels.length - 1);
          translateY.value = withSpring(snapPointsPixels[nextIndex], {
            damping: 50,
            stiffness: 400,
            velocity: event.velocityY,
          });
          currentIndex.value = nextIndex;
        } else {
          // Swipe up
          const nextIndex = Math.max(currentIndex.value - 1, 0);
          translateY.value = withSpring(snapPointsPixels[nextIndex], {
            damping: 50,
            stiffness: 400,
            velocity: event.velocityY,
          });
          currentIndex.value = nextIndex;
        }
      } else {
        // Find closest snap point
        const closestIndex = findClosestSnapPoint(translateY.value);
        translateY.value = withSpring(snapPointsPixels[closestIndex], {
          damping: 50,
          stiffness: 400,
        });
        currentIndex.value = closestIndex;
      }
    },
  });
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });
  
  const backdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [SCREEN_HEIGHT, snapPointsPixels[snapPointsPixels.length - 1]],
      [0, 0.5]
    );
    
    return {
      opacity,
    };
  });
  
  return (
    <>
      <Animated.View 
        style={[styles.backdrop, backdropStyle]} 
        pointerEvents={translateY.value < SCREEN_HEIGHT ? 'auto' : 'none'}
      />
      
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.container, animatedStyle, backgroundStyle]}>
          <View style={styles.handle}>
            <View style={[styles.handleIndicator, handleIndicatorStyle]} />
          </View>
          
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SCREEN_HEIGHT,
    paddingBottom: 34, // For safe area
  },
  handle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default CustomBottomSheet;