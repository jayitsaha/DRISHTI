// screens/BadgesScreen.js - Optimized Version
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Vibration,
  Platform,
  Modal,
  InteractionManager,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { getUserData, BADGES } from '../firebase/gamificationConfig';
import { useAuth } from '../contexts/AuthContext';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Memoized Badge Item Component
const BadgeItem = React.memo(({ badge, index, earned, progress, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Simple entrance animation with delay
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 30, 150), // Reduced delay
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Quick bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress(badge);
  };

  return (
    <Animated.View
      style={[
        styles.badgeCard,
        {
          transform: [{ scale: scaleAnim }],
          opacity: scaleAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.badgeTouchable}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={earned ? 90 : 70}
            tint={earned ? "light" : "dark"}
            style={styles.badgeGlassCard}
          >
            <BadgeContent badge={badge} earned={earned} progress={progress} />
          </BlurView>
        ) : (
          <View style={[styles.badgeGlassCard, !earned && styles.badgeGlassCardLocked]}>
            <BadgeContent badge={badge} earned={earned} progress={progress} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// Badge Content Component
const BadgeContent = ({ badge, earned, progress }) => (
  <View style={styles.badgeContent}>
    <View style={styles.badgeIconContainer}>
      {earned ? (
        <LinearGradient
          colors={[badge.color, badge.color + 'CC']}
          style={styles.badgeIconGradient}
        >
          <MaterialIcons name={badge.icon} size={32} color="#FFF" />
        </LinearGradient>
      ) : (
        <View style={styles.badgeIconLocked}>
          <MaterialIcons name={badge.icon} size={32} color="#94a3b8" />
          <View style={styles.lockOverlay}>
            <MaterialIcons name="lock" size={14} color="#FFF" />
          </View>
        </View>
      )}
    </View>

    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>
      {badge.name}
    </Text>

    {earned ? (
      <View style={styles.earnedIndicator}>
        <MaterialIcons name="check-circle" size={16} color="#10b981" />
        <Text style={styles.earnedText}>Earned</Text>
      </View>
    ) : (
      <View style={styles.badgeProgress}>
        <View style={styles.badgeProgressBar}>
          <View
            style={[
              styles.badgeProgressFill,
              { width: `${progress.percentage}%` },
            ]}
          />
        </View>
        <Text style={styles.badgeProgressText}>
          {progress.current}/{progress.total}
        </Text>
      </View>
    )}

    <View style={[styles.infoLabel, earned && styles.infoLabelEarned]}>
      <Text style={[styles.infoLabelText, earned && styles.infoLabelTextEarned]}>info</Text>
    </View>
  </View>
);

const BadgesScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const { user } = useAuth();

  // Simplified animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressWidthAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalBlurAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadUserData();
    animateEntrance();
    
    // Start pulse animation for header stats
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

  const loadUserData = async () => {
    try {
      if (user) {
        const data = await getUserData(user.uid);
        setUserData(data);
        animateProgress(data);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateProgress = (data) => {
    const progress = ((data?.badges?.length || 0) / Object.keys(BADGES).length) * 100;
    Animated.spring(progressWidthAnim, {
      toValue: progress,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleBadgePress = useCallback((badge) => {
    setSelectedBadge(badge);
    animateModalOpen();
  }, []);

  const animateModalOpen = () => {
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(modalBlurAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalBlurAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedBadge(null);
    });
  };

  const handleCategoryPress = useCallback((category) => {
    Vibration.vibrate(10);
    setSelectedCategory(category);
  }, []);

  const isEarned = useCallback((badgeId) => {
    return userData?.badges?.some(b => b.id === badgeId) || false;
  }, [userData]);

  const getProgress = useCallback((badge) => {
    if (!userData) return { current: 0, total: 1, percentage: 0 };

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
    return { current, total, percentage };
  }, [userData]);

  // Memoized filtered badges
  const filteredBadges = useMemo(() => {
    const allBadges = Object.values(BADGES);
    if (selectedCategory === 'all') return allBadges;
    
    return allBadges.filter(badge => {
      switch (selectedCategory) {
        case 'starter':
          return badge.id.includes('FIRST') || badge.id.includes('REPORT_5');
        case 'powerful':
          return badge.requirement.value >= 10 && badge.requirement.value < 50;
        case 'level-up':
          return badge.requirement.value >= 50;
        case 'combo':
          return badge.requirement.type === 'streak' || 
                 badge.requirement.type === 'category_count' ||
                 badge.requirement.type === 'time_based';
        default:
          return true;
      }
    });
  }, [selectedCategory]);

  const categories = [
    { id: 'all', name: 'All', icon: 'apps', color: '#6366f1' },
    { id: 'starter', name: 'Starter', icon: 'flag', color: '#3b82f6' },
    { id: 'powerful', name: 'Powerful', icon: 'bolt', color: '#a855f7' },
    { id: 'level-up', name: 'Level Up', icon: 'trending-up', color: '#ec4899' },
    { id: 'combo', name: 'Combo', icon: 'stars', color: '#f59e0b' },
  ];

  const renderBadgeItem = ({ item, index }) => (
    <BadgeItem
      badge={item}
      index={index}
      earned={isEarned(item.id)}
      progress={getProgress(item)}
      onPress={handleBadgePress}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f0f4ff', '#e5ecff', '#faf5ff']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Background shapes */}
      <View style={styles.backgroundShape1} />
      <View style={styles.backgroundShape2} />
      <View style={styles.backgroundShape3} />
      
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              Vibration.vibrate(10);
              navigation.goBack();
            }}
            activeOpacity={0.7}
          >
            {Platform.OS === 'ios' ? (
              <BlurView intensity={90} tint="light" style={styles.glassButton}>
                <MaterialIcons name="arrow-back" size={24} color="#333" />
              </BlurView>
            ) : (
              <View style={styles.glassButton}>
                <MaterialIcons name="arrow-back" size={24} color="#333" />
              </View>
            )}
          </TouchableOpacity>

          <MaskedView
            maskElement={<Text style={styles.headerTitle}>Badges</Text>}
          >
            <LinearGradient
              colors={['#6366f1', '#a855f7', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.headerTitle, { opacity: 0 }]}>Badges</Text>
            </LinearGradient>
          </MaskedView>

          <Animated.View
            style={[
              styles.headerStats,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#6366f1', '#a855f7']}
              style={styles.statsGradient}
            >
              <Text style={styles.headerStatsText}>
                {userData?.badges?.length || 0} of {Object.keys(BADGES).length}
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={95} tint="light" style={styles.glassCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(99, 102, 241, 0.05)']}
                style={styles.cardInner}
              >
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Collection Progress</Text>
                  <View style={styles.progressPercentage}>
                    <Text style={styles.progressPercentageText}>
                      {Math.round(((userData?.badges?.length || 0) / Object.keys(BADGES).length) * 100)}%
                    </Text>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View
              style={[
                styles.modalBlurOverlay,
                {
                  opacity: modalBlurAnim,
                },
              ]}
            />
            
            <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressWidthAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  
                  <View style={styles.progressMilestones}>
                    {[25, 50, 75, 100].map((milestone) => (
                      <View
                        key={milestone}
                        style={[
                          styles.milestone,
                          { left: `${milestone}%` },
                        ]}
                      >
                        <View style={styles.milestoneDot} />
                      </View>
                    ))}
                  </View>
                </View>
                
                <View style={styles.progressStats}>
                  <View style={styles.progressStatItem}>
                    <MaterialIcons name="emoji-events" size={20} color="#f59e0b" />
                    <Text style={styles.progressStatValue}>{userData?.badges?.length || 0}</Text>
                    <Text style={styles.progressStatLabel}>Earned</Text>
                  </View>
                  <View style={styles.progressStatDivider} />
                  <View style={styles.progressStatItem}>
                    <MaterialIcons name="lock-open" size={20} color="#3b82f6" />
                    <Text style={styles.progressStatValue}>
                      {Object.keys(BADGES).length - (userData?.badges?.length || 0)}
                    </Text>
                    <Text style={styles.progressStatLabel}>Remaining</Text>
                  </View>
                  <View style={styles.progressStatDivider} />
                  <View style={styles.progressStatItem}>
                    <FontAwesome5 name="coins" size={20} color="#fbbf24" />
                    <Text style={styles.progressStatValue}>
                      {userData?.badges?.reduce((sum, badge) => sum + (BADGES[badge.id]?.coins || 0), 0) || 0}
                    </Text>
                    <Text style={styles.progressStatLabel}>Coins</Text>
                  </View>
                </View>
              </LinearGradient>
            </BlurView>
          ) : (
            <View style={styles.glassCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(243, 232, 255, 0.7)']}
                style={styles.cardInner}
              >
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Collection Progress</Text>
                  <View style={styles.progressPercentage}>
                    <Text style={styles.progressPercentageText}>
                      {Math.round(((userData?.badges?.length || 0) / Object.keys(BADGES).length) * 100)}%
                    </Text>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressWidthAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  
                  <View style={styles.progressMilestones}>
                    {[25, 50, 75, 100].map((milestone) => (
                      <View
                        key={milestone}
                        style={[
                          styles.milestone,
                          { left: `${milestone}%` },
                        ]}
                      >
                        <View style={styles.milestoneDot} />
                      </View>
                    ))}
                  </View>
                </View>
                
                <View style={styles.progressStats}>
                  <View style={styles.progressStatItem}>
                    <MaterialIcons name="emoji-events" size={20} color="#f59e0b" />
                    <Text style={styles.progressStatValue}>{userData?.badges?.length || 0}</Text>
                    <Text style={styles.progressStatLabel}>Earned</Text>
                  </View>
                  <View style={styles.progressStatDivider} />
                  <View style={styles.progressStatItem}>
                    <MaterialIcons name="lock-open" size={20} color="#3b82f6" />
                    <Text style={styles.progressStatValue}>
                      {Object.keys(BADGES).length - (userData?.badges?.length || 0)}
                    </Text>
                    <Text style={styles.progressStatLabel}>Remaining</Text>
                  </View>
                  <View style={styles.progressStatDivider} />
                  <View style={styles.progressStatItem}>
                    <FontAwesome5 name="coins" size={20} color="#fbbf24" />
                    <Text style={styles.progressStatValue}>
                      {userData?.badges?.reduce((sum, badge) => sum + (BADGES[badge.id]?.coins || 0), 0) || 0}
                    </Text>
                    <Text style={styles.progressStatLabel}>Coins</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}
          </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => handleCategoryPress(category.id)}
              activeOpacity={0.7}
            >
              {selectedCategory === category.id ? (
                <LinearGradient
                  colors={[category.color, category.color + 'DD']}
                  style={styles.categoryGradient}
                >
                  <MaterialIcons name={category.icon} size={22} color="#FFF" />
                  <Text style={styles.categoryTextActive}>{category.name}</Text>
                </LinearGradient>
              ) : (
                <>
                  <MaterialIcons name={category.icon} size={22} color={category.color} />
                  <Text style={styles.categoryText}>{category.name}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Badges Grid - Using FlatList for better performance */}
        <FlatList
          data={filteredBadges}
          renderItem={renderBadgeItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.badgesGrid}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={6}
        />
      </Animated.View>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <Modal
          transparent
          visible={true}
          animationType="none"
          onRequestClose={closeModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeModal}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: modalScaleAnim }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={98} tint="light" style={styles.modalCard}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.2)', 'rgba(99, 102, 241, 0.1)']}
                      style={styles.modalCardInner}
                    >
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={closeModal}
                    >
                      <MaterialIcons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>

                    <View style={styles.modalBadgeIcon}>
                      {isEarned(selectedBadge.id) ? (
                        <LinearGradient
                          colors={[selectedBadge.color, selectedBadge.color + 'DD']}
                          style={styles.modalBadgeIconGradient}
                        >
                          <MaterialIcons name={selectedBadge.icon} size={60} color="#FFF" />
                        </LinearGradient>
                      ) : (
                        <View style={styles.modalBadgeIconLocked}>
                          <MaterialIcons name={selectedBadge.icon} size={60} color="#94a3b8" />
                        </View>
                      )}
                    </View>

                    <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>
                    <Text style={styles.modalBadgeDescription}>{selectedBadge.description}</Text>

                    {!isEarned(selectedBadge.id) && (
                      <View style={styles.modalProgressSection}>
                        <Text style={styles.modalProgressTitle}>Progress</Text>
                        <View style={styles.modalProgressBar}>
                          <View
                            style={[
                              styles.modalProgressFill,
                              { width: `${getProgress(selectedBadge).percentage}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.modalProgressText}>
                          {getProgress(selectedBadge).current} / {getProgress(selectedBadge).total}
                        </Text>
                      </View>
                    )}

                    <View style={styles.modalRewardSection}>
                      <LinearGradient
                        colors={['#fef3c7', '#fde68a']}
                        style={styles.modalRewardCard}
                      >
                        <FontAwesome5 name="coins" size={24} color="#f59e0b" />
                        <Text style={styles.modalRewardText}>+{selectedBadge.coins} Coins</Text>
                      </LinearGradient>
                    </View>

                    {isEarned(selectedBadge.id) ? (
                      <View style={styles.modalEarnedBadge}>
                        <MaterialIcons name="verified" size={20} color="#10b981" />
                        <Text style={styles.modalEarnedText}>Badge Earned!</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={closeModal}
                      >
                        <LinearGradient
                          colors={['#6366f1', '#a855f7']}
                          style={styles.modalActionGradient}
                        >
                          <Text style={styles.modalActionText}>Continue Progress</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                                          )}
                    </LinearGradient>
                  </BlurView>
                ) : (
                  <View style={styles.modalCard}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.95)', 'rgba(243, 232, 255, 0.9)']}
                      style={styles.modalCardInner}
                    >
                      <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={closeModal}
                      >
                        <MaterialIcons name="close" size={24} color="#64748b" />
                      </TouchableOpacity>

                      <View style={styles.modalBadgeIcon}>
                        {isEarned(selectedBadge.id) ? (
                          <LinearGradient
                            colors={[selectedBadge.color, selectedBadge.color + 'DD']}
                            style={styles.modalBadgeIconGradient}
                          >
                            <MaterialIcons name={selectedBadge.icon} size={60} color="#FFF" />
                          </LinearGradient>
                        ) : (
                          <View style={styles.modalBadgeIconLocked}>
                            <MaterialIcons name={selectedBadge.icon} size={60} color="#94a3b8" />
                          </View>
                        )}
                      </View>

                      <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>
                      <Text style={styles.modalBadgeDescription}>{selectedBadge.description}</Text>

                      {!isEarned(selectedBadge.id) && (
                        <View style={styles.modalProgressSection}>
                          <Text style={styles.modalProgressTitle}>Progress</Text>
                          <View style={styles.modalProgressBar}>
                            <View
                              style={[
                                styles.modalProgressFill,
                                { width: `${getProgress(selectedBadge).percentage}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.modalProgressText}>
                            {getProgress(selectedBadge).current} / {getProgress(selectedBadge).total}
                          </Text>
                        </View>
                      )}

                      <View style={styles.modalRewardSection}>
                        <LinearGradient
                          colors={['#fef3c7', '#fde68a']}
                          style={styles.modalRewardCard}
                        >
                          <FontAwesome5 name="coins" size={24} color="#f59e0b" />
                          <Text style={styles.modalRewardText}>+{selectedBadge.coins} Coins</Text>
                        </LinearGradient>
                      </View>

                      {isEarned(selectedBadge.id) ? (
                        <View style={styles.modalEarnedBadge}>
                          <MaterialIcons name="verified" size={20} color="#10b981" />
                          <Text style={styles.modalEarnedText}>Badge Earned!</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.modalActionButton}
                          onPress={closeModal}
                        >
                          <LinearGradient
                            colors={['#6366f1', '#a855f7']}
                            style={styles.modalActionGradient}
                          >
                            <Text style={styles.modalActionText}>Continue Progress</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </LinearGradient>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  glassButton: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a3e',
    letterSpacing: 0.5,
  },
  headerStats: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  statsGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerStatsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  progressCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.7)',
    borderRadius: 24,
    borderWidth: Platform.OS === 'ios' ? 0 : 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  cardInner: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a3e',
  },
  progressPercentage: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPercentageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  progressBarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 6,
  },
  progressMilestones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  milestone: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 20,
    marginLeft: -10,
  },
  milestoneDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#e5e7eb',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStatItem: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a3e',
    marginTop: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  progressStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  categoryContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  categoryContent: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: -20,
    marginVertical: -12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  categoryTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 8,
  },
  badgesGrid: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 8,
  },
  badgeCard: {
    width: (screenWidth - 48) / 2,
    padding: 6,
  },
  badgeTouchable: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
  },
  badgeGlassCardLocked: {
    backgroundColor: 'rgba(241, 245, 249, 0.9)',
  },
  badgeContent: {
    padding: 16,
    alignItems: 'center',
  },
  badgeIconContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  badgeIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIconLocked: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(203, 213, 225, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(71, 85, 105, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a3e',
    textAlign: 'center',
    marginBottom: 6,
  },
  badgeNameLocked: {
    color: '#64748b',
  },
  earnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  earnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 4,
  },
  badgeProgress: {
    width: '100%',
  },
  badgeProgressBar: {
    height: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  badgeProgressText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  infoLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  infoLabelEarned: {
    backgroundColor: '#3b82f6',
  },
  infoLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3b82f6',
  },
  infoLabelTextEarned: {
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: screenWidth * 0.9,
    maxWidth: 400,
  },
  modalCard: {
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  modalCardInner: {
    padding: 32,
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBadgeIcon: {
    marginBottom: 24,
  },
  modalBadgeIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBadgeIconLocked: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(203, 213, 225, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBadgeName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a3e',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBadgeDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalProgressSection: {
    width: '100%',
    marginBottom: 24,
  },
  modalProgressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  modalProgressBar: {
    height: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 5,
  },
  modalProgressText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'right',
  },
  modalRewardSection: {
    width: '100%',
    marginBottom: 24,
  },
  modalRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  modalRewardText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400e',
    marginLeft: 10,
  },
  modalEarnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalEarnedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginLeft: 6,
  },
  modalActionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalActionGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  // Background elements
  backgroundShape1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  backgroundShape2: {
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
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
});

export default BadgesScreen;