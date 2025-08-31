// screens/OffersRedeem.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { getUserData, OFFERS, redeemOffer, generateRedemptionCode } from '../firebase/gamificationConfig';
import { useAuth } from '../contexts/AuthContext';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/gamificationConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OffersRedeem = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { user } = useAuth();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const coinBounce = useRef(new Animated.Value(1)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  // Background animations
  const backgroundFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      loadUserData();
      animateEntrance();
      startContinuousAnimations();

      // Subscribe to real-time coin updates
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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
    // Coin bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(coinBounce, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(coinBounce, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
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

    // Background float
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundFloat, {
          toValue: -20,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundFloat, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animateCoinDeduction = () => {
    Animated.sequence([
      Animated.timing(coinBounce, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(coinBounce, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
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

  const toggleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSearch(!showSearch);
    Animated.timing(searchBarAnim, {
      toValue: showSearch ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const categories = [
    { id: 'all', name: 'All', icon: 'apps', color: '#667eea' },
    { id: 'Food & Beverage', name: 'Food', icon: 'restaurant', color: '#FF6B6B' },
    { id: 'Entertainment', name: 'Fun', icon: 'movie', color: '#4ECDC4' },
    { id: 'Shopping', name: 'Shop', icon: 'shopping-cart', color: '#45B7D1' },
    { id: 'Transport', name: 'Travel', icon: 'directions-bus', color: '#96CEB4' },
    { id: 'Fitness', name: 'Fitness', icon: 'fitness-center', color: '#DDA0DD' },
  ];

  const filteredOffers = useMemo(() => {
    let offers = OFFERS;
    
    // Category filter
    if (selectedCategory !== 'all') {
      offers = offers.filter(offer => offer.category === selectedCategory);
    }
    
    // Search filter
    if (searchQuery) {
      offers = offers.filter(offer => 
        offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort by coins (ascending)
    return offers.sort((a, b) => a.coins - b.coins);
  }, [selectedCategory, searchQuery]);

  const handleOfferSelect = (offer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOffer(offer);
    
    Animated.spring(modalScaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const closeOfferModal = () => {
    Animated.timing(modalScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedOffer(null);
    });
  };

  const handleRedeem = async () => {
    if (!selectedOffer || !userData || !user) return;

    if (userData.coins < selectedOffer.coins) {
      Alert.alert(
        "Insufficient Coins",
        `You need ${selectedOffer.coins - userData.coins} more coins to redeem this offer.`,
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Confirm Redemption",
      `Redeem "${selectedOffer.title}" for ${selectedOffer.coins} coins?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem",
          onPress: async () => {
            setLoading(true);
            try {
              await redeemOffer(user.uid, selectedOffer.id);
              
              // Generate redemption code
              const code = generateRedemptionCode();
              setRedeemCode(code);
              
              // Close offer modal and show success
              closeOfferModal();
              
              setTimeout(() => {
                setShowRedeemModal(true);
                Animated.spring(successScaleAnim, {
                  toValue: 1,
                  friction: 8,
                  tension: 40,
                  useNativeDriver: true,
                }).start();
              }, 300);
              
              // Animate coin deduction
              animateCoinDeduction();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert("Error", "Failed to redeem offer. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getCategoryInfo = useCallback((categoryId) => {
    return categories.find(c => c.id === categoryId) || categories[0];
  }, []);

  const renderOfferCard = ({ item: offer, index }) => {
    const categoryInfo = getCategoryInfo(offer.category);
    const canAfford = userData?.coins >= offer.coins;
    
    return (
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() => handleOfferSelect(offer)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={canAfford 
            ? ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']
            : ['rgba(240, 240, 240, 0.95)', 'rgba(230, 230, 230, 0.85)']
          }
          style={styles.offerCardGradient}
        >
          <View style={styles.offerHeader}>
            <View style={[styles.offerIconContainer, { backgroundColor: categoryInfo.color + '20' }]}>
              <MaterialIcons name={categoryInfo.icon} size={32} color={categoryInfo.color} />
            </View>
            <View style={styles.offerBadge}>
              <Text style={[styles.offerBadgeText, { color: categoryInfo.color }]}>
                {offer.category}
              </Text>
            </View>
          </View>
          
          <View style={styles.offerContent}>
            <Text style={styles.offerTitle} numberOfLines={2}>{offer.title}</Text>
            <Text style={styles.offerDescription} numberOfLines={2}>{offer.description}</Text>
            
            <View style={styles.offerFooter}>
              <View style={[styles.offerCoins, !canAfford && styles.offerCoinsDisabled]}>
                <FontAwesome5 name="coins" size={20} color={canAfford ? "#fbbf24" : "#ccc"} />
                <Text style={[styles.offerCoinsText, !canAfford && styles.offerCoinsTextDisabled]}>
                  {offer.coins}
                </Text>
              </View>
              <Text style={styles.offerValidity}>
                {new Date(offer.validUntil) > new Date() 
                  ? `Valid till ${new Date(offer.validUntil).toLocaleDateString()}`
                  : 'Expired'
                }
              </Text>
            </View>
          </View>
          
          {!canAfford && userData && (
            <View style={styles.offerOverlay}>
              <MaterialIcons name="lock" size={24} color="#999" />
              <Text style={styles.offerOverlayText}>Need {offer.coins - userData.coins} more coins</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f8faff', '#f0f4ff', '#e8ecff']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Background Decorations */}
      <Animated.View 
        style={[
          styles.backgroundCircle1,
          {
            transform: [{ translateY: backgroundFloat }],
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.2],
            }),
          },
        ]} 
      />
      <Animated.View 
        style={[
          styles.backgroundCircle2,
          {
            transform: [{ translateY: Animated.multiply(backgroundFloat, -1) }],
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.1],
            }),
          },
        ]} 
      />

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
            onPress={() => navigation.goBack()}
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
            maskElement={<Text style={styles.headerTitle}>Rewards Store</Text>}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2', '#f093fb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.headerTitle, { opacity: 0 }]}>Rewards</Text>
            </LinearGradient>
          </MaskedView>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={toggleSearch}
              activeOpacity={0.7}
            >
              <MaterialIcons name="search" size={24} color="#333" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.coinsContainer} activeOpacity={0.8}>
              <LinearGradient
                colors={['#fbbf24', '#f59e0b']}
                style={styles.coinsGradient}
              >
                <Animated.View 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    transform: [{ scale: coinBounce }] 
                  }}
                >
                  <FontAwesome5 name="coins" size={18} color="#FFF" />
                  <Text style={styles.coinsText}>{userData?.coins || 0}</Text>
                </Animated.View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <Animated.View
          style={[
            styles.searchContainer,
            {
              opacity: searchBarAnim,
              transform: [
                {
                  translateY: searchBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search offers..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

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
                styles.categoryTab,
                selectedCategory === category.id && styles.categoryTabActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(category.id);
              }}
              activeOpacity={0.7}
            >
              {selectedCategory === category.id ? (
                <LinearGradient
                  colors={[category.color, category.color + 'DD']}
                  style={styles.categoryGradient}
                >
                  <MaterialIcons name={category.icon} size={20} color="#FFF" />
                  <Text style={styles.categoryTextActive}>{category.name}</Text>
                </LinearGradient>
              ) : (
                <>
                  <MaterialIcons name={category.icon} size={20} color={category.color} />
                  <Text style={styles.categoryText}>{category.name}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Offers Grid */}
        <FlatList
          data={filteredOffers}
          renderItem={renderOfferCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.offersContainer}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.offerRow}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="gift-off" size={60} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No offers found</Text>
              <Text style={styles.emptyText}>Try changing the category or search term</Text>
            </View>
          }
        />
      </Animated.View>

      {/* Offer Detail Modal */}
      {selectedOffer && (
        <Modal
          animationType="none"
          transparent={true}
          visible={!!selectedOffer}
          onRequestClose={closeOfferModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeOfferModal}
          >
            <Animated.View
              style={[
                styles.offerDetailModal,
                {
                  transform: [{ scale: modalScaleAnim }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={98} tint="light" style={styles.modalCard}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.2)', 'rgba(99, 102, 241, 0.05)']}
                      style={styles.modalCardInner}
                    >
                      <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={closeOfferModal}
                      >
                        <MaterialIcons name="close" size={24} color="#64748b" />
                      </TouchableOpacity>

                      <View style={styles.modalHeader}>
                        <LinearGradient
                          colors={[getCategoryInfo(selectedOffer.category).color, getCategoryInfo(selectedOffer.category).color + 'DD']}
                          style={styles.modalIconGradient}
                        >
                          <MaterialIcons 
                            name={getCategoryInfo(selectedOffer.category).icon} 
                            size={48} 
                            color="#FFF" 
                          />
                        </LinearGradient>
                      </View>

                      <Text style={styles.modalTitle}>{selectedOffer.title}</Text>
                      <Text style={styles.modalDescription}>{selectedOffer.description}</Text>

                      <View style={styles.modalInfoContainer}>
                        <View style={styles.modalInfoItem}>
                          <MaterialIcons name="category" size={18} color="#64748b" />
                          <Text style={styles.modalInfoText}>{selectedOffer.category}</Text>
                        </View>
                        <View style={styles.modalInfoItem}>
                          <MaterialIcons name="event" size={18} color="#64748b" />
                          <Text style={styles.modalInfoText}>
                            Valid till {new Date(selectedOffer.validUntil).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modalCoinsContainer}>
                        <LinearGradient
                          colors={['#fef3c7', '#fde68a']}
                          style={styles.modalCoinsGradient}
                        >
                          <FontAwesome5 name="coins" size={32} color="#f59e0b" />
                          <Text style={styles.modalCoinsRequired}>{selectedOffer.coins}</Text>
                          <Text style={styles.modalCoinsLabel}>Coins Required</Text>
                        </LinearGradient>
                      </View>

                      {userData?.coins >= selectedOffer.coins ? (
                        <TouchableOpacity
                          style={styles.redeemButton}
                          onPress={handleRedeem}
                          disabled={loading}
                        >
                          <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.redeemButtonGradient}
                          >
                            {loading ? (
                              <ActivityIndicator color="#FFF" />
                            ) : (
                              <>
                                <Text style={styles.redeemButtonText}>Redeem Now</Text>
                                <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
                              </>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.insufficientContainer}>
                          <View style={styles.insufficientBadge}>
                            <MaterialIcons name="lock" size={20} color="#ef4444" />
                            <Text style={styles.insufficientText}>
                              Need {selectedOffer.coins - userData.coins} more coins
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.earnMoreButton}
                            onPress={() => {
                              closeOfferModal();
                              navigation.navigate('PedestrianDashboard');
                            }}
                          >
                            <Text style={styles.earnMoreText}>Earn More Coins</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </LinearGradient>
                  </BlurView>
                ) : (
                  <View style={styles.modalCard}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.95)', 'rgba(243, 232, 255, 0.9)']}
                      style={styles.modalCardInner}
                    >
                      {/* Same content as iOS version */}
                      <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={closeOfferModal}
                      >
                        <MaterialIcons name="close" size={24} color="#64748b" />
                      </TouchableOpacity>

                      <View style={styles.modalHeader}>
                        <LinearGradient
                          colors={[getCategoryInfo(selectedOffer.category).color, getCategoryInfo(selectedOffer.category).color + 'DD']}
                          style={styles.modalIconGradient}
                        >
                          <MaterialIcons 
                            name={getCategoryInfo(selectedOffer.category).icon} 
                            size={48} 
                            color="#FFF" 
                          />
                        </LinearGradient>
                      </View>

                      <Text style={styles.modalTitle}>{selectedOffer.title}</Text>
                      <Text style={styles.modalDescription}>{selectedOffer.description}</Text>

                      <View style={styles.modalInfoContainer}>
                        <View style={styles.modalInfoItem}>
                          <MaterialIcons name="category" size={18} color="#64748b" />
                          <Text style={styles.modalInfoText}>{selectedOffer.category}</Text>
                        </View>
                        <View style={styles.modalInfoItem}>
                          <MaterialIcons name="event" size={18} color="#64748b" />
                          <Text style={styles.modalInfoText}>
                            Valid till {new Date(selectedOffer.validUntil).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modalCoinsContainer}>
                        <LinearGradient
                          colors={['#fef3c7', '#fde68a']}
                          style={styles.modalCoinsGradient}
                        >
                          <FontAwesome5 name="coins" size={32} color="#f59e0b" />
                          <Text style={styles.modalCoinsRequired}>{selectedOffer.coins}</Text>
                          <Text style={styles.modalCoinsLabel}>Coins Required</Text>
                        </LinearGradient>
                      </View>

                      {userData?.coins >= selectedOffer.coins ? (
                        <TouchableOpacity
                          style={styles.redeemButton}
                          onPress={handleRedeem}
                          disabled={loading}
                        >
                          <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.redeemButtonGradient}
                          >
                            {loading ? (
                              <ActivityIndicator color="#FFF" />
                            ) : (
                              <>
                                <Text style={styles.redeemButtonText}>Redeem Now</Text>
                                <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
                              </>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.insufficientContainer}>
                          <View style={styles.insufficientBadge}>
                            <MaterialIcons name="lock" size={20} color="#ef4444" />
                            <Text style={styles.insufficientText}>
                              Need {selectedOffer.coins - userData.coins} more coins
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.earnMoreButton}
                            onPress={() => {
                              closeOfferModal();
                              navigation.navigate('PedestrianDashboard');
                            }}
                          >
                            <Text style={styles.earnMoreText}>Earn More Coins</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </LinearGradient>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Redemption Success Modal */}
      {showRedeemModal && redeemCode && (
        <Modal
          animationType="none"
          transparent={true}
          visible={showRedeemModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
          >
            <Animated.View
              style={[
                styles.successModal,
                {
                  transform: [{ scale: successScaleAnim }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                <LinearGradient
                  colors={['#ffffff', '#f8faff']}
                  style={styles.successModalContent}
                >
                  <View style={styles.successHeader}>
                    <View style={styles.successIconContainer}>
                      <LinearGradient
                        colors={['#4ade80', '#22c55e']}
                        style={styles.successIconGradient}
                      >
                        <MaterialIcons name="check" size={48} color="#FFF" />
                      </LinearGradient>
                    </View>
                    
                    <Text style={styles.successTitle}>Redeemed Successfully!</Text>
                    <Text style={styles.successSubtitle}>Your reward is ready to use</Text>
                  </View>

                  <View style={styles.qrContainer}>
                    <QRCode
                      value={redeemCode}
                      size={180}
                      color="#1e293b"
                      backgroundColor="#FFF"
                    />
                    <View style={styles.qrOverlay}>
                      <LinearGradient
                        colors={['transparent', 'rgba(255, 255, 255, 0.8)', 'transparent']}
                        style={styles.scanLine}
                      />
                    </View>
                  </View>

                  <View style={styles.codeContainer}>
                    <Text style={styles.codeLabel}>Redemption Code</Text>
                    <Text style={styles.redeemCodeText}>{redeemCode}</Text>
                  </View>

                  <Text style={styles.instructionText}>
                    Show this QR code or redemption code at the store to claim your reward
                  </Text>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => {
                        // Implement share functionality
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <MaterialIcons name="share" size={20} color="#667eea" />
                      <Text style={styles.shareButtonText}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={() => {
                        Animated.timing(successScaleAnim, {
                          toValue: 0,
                          duration: 200,
                          useNativeDriver: true,
                        }).start(() => {
                          setShowRedeemModal(false);
                          setSelectedOffer(null);
                          setRedeemCode(null);
                        });
                      }}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.doneButtonGradient}
                      >
                        <Text style={styles.doneButtonText}>Done</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
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
  backgroundCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#667eea',
  },
  backgroundCircle2: {
    position: 'absolute',
    top: 300,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#f093fb',
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
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a3e',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coinsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  coinsGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  coinsText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryContent: {
    paddingHorizontal: 20,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  categoryTabActive: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginHorizontal: -18,
    marginVertical: -10,
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
  offersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  offerRow: {
    justifyContent: 'space-between',
  },
  offerCard: {
    width: (screenWidth - 52) / 2,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  offerCardGradient: {
    padding: 16,
    minHeight: 220,
  },
  offerHeader: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  offerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerBadge: {
    position: 'absolute',
    top: 0,
    right: -8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  offerDescription: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  offerCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerCoinsDisabled: {
    backgroundColor: 'rgba(203, 213, 225, 0.1)',
  },
  offerCoinsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 4,
  },
  offerCoinsTextDisabled: {
    color: '#94a3b8',
  },
  offerValidity: {
    fontSize: 10,
    color: '#94a3b8',
  },
  offerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  offerOverlayText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerDetailModal: {
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
    zIndex: 10,
  },
  modalHeader: {
    marginBottom: 24,
  },
  modalIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a3e',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalInfoContainer: {
    width: '100%',
    marginBottom: 24,
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
  },
  modalCoinsContainer: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalCoinsGradient: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  modalCoinsRequired: {
    fontSize: 40,
    fontWeight: '800',
    color: '#92400e',
    marginVertical: 8,
  },
  modalCoinsLabel: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  redeemButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  redeemButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  redeemButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginRight: 8,
  },
  insufficientContainer: {
    width: '100%',
    alignItems: 'center',
  },
  insufficientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  insufficientText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  earnMoreButton: {
    paddingVertical: 8,
  },
  earnMoreText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  successModal: {
    width: screenWidth * 0.9,
    maxWidth: 400,
  },
  successModalContent: {
    borderRadius: 30,
    padding: 32,
    alignItems: 'center',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  qrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // pointerEvents: 'none',
  },
  scanLine: {
    width: '100%',
    height: 40,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  redeemCodeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 2,
  },
  instructionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    width: '100%',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#667eea',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 6,
  },
  doneButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  doneButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default OffersRedeem;