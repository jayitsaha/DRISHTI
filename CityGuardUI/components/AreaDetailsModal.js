import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AreaDetailsModal = ({ visible, selectedArea, onClose, onRefresh, refreshing }) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  if (!selectedArea) return null;

  const details = selectedArea.details || {};
  const statusColors = {
    good: '#2ED573',
    warning: '#FFA502',
    critical: '#FF4757'
  };
  const color = statusColors[selectedArea.status] || '#999999';

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View 
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
            opacity: fadeAnim,
          }
        ]}
      >
        <BlurView intensity={100} tint="dark" style={styles.modalContent}>
          {/* Handle Bar */}
          <Pressable onPress={onClose} style={styles.handleBar}>
            <View style={styles.handle} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: color + '20' }]}>
              <MaterialCommunityIcons 
                name={selectedArea.icon || 'map-marker'} 
                size={32} 
                color={color} 
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.areaName}>{selectedArea.name}</Text>
              <Text style={[styles.areaStatus, { color }]}>{selectedArea.summary}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Quick Status Grid */}
            <View style={styles.statusGrid}>
              <TouchableOpacity style={styles.statusGridItem} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#FF6B9D20', '#FF475720']}
                  style={styles.statusGridGradient}
                >
                  <MaterialCommunityIcons name="car" size={28} color="#FF6B9D" />
                  <Text style={styles.statusGridTitle}>Traffic</Text>
                  <Text style={styles.statusGridValue}>
                    {details.current_status?.traffic?.status || selectedArea.metrics?.traffic_level || 'Normal'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statusGridItem} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#4CAF5020', '#43A04720']}
                  style={styles.statusGridGradient}
                >
                  <MaterialCommunityIcons name="flash" size={28} color="#4CAF50" />
                  <Text style={styles.statusGridTitle}>Power</Text>
                  <Text style={styles.statusGridValue}>
                    {details.current_status?.power?.status || selectedArea.metrics?.power_status || 'Normal'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statusGridItem} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#4C6EF520', '#3949AB20']}
                  style={styles.statusGridGradient}
                >
                  <MaterialCommunityIcons 
                    name={details.current_status?.weather?.condition === 'Clear' ? 'weather-sunny' : 'weather-cloudy'} 
                    size={28} 
                    color="#4C6EF5" 
                  />
                  <Text style={styles.statusGridTitle}>Weather</Text>
                  <Text style={styles.statusGridValue}>
                    {details.current_status?.weather?.temperature 
                      ? `${Math.round(details.current_status.weather.temperature)}°C`
                      : 'N/A'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statusGridItem} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#FFA50220', '#FF6F0020']}
                  style={styles.statusGridGradient}
                >
                  <MaterialCommunityIcons name="alert-circle" size={28} color="#FFA502" />
                  <Text style={styles.statusGridTitle}>Alerts</Text>
                  <Text style={styles.statusGridValue}>
                    {details.issues?.length || 0}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Issues Section */}
            {details.issues && details.issues.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Current Issues</Text>
                  <View style={[styles.badge, { backgroundColor: '#FF4757' }]}>
                    <Text style={styles.badgeText}>{details.issues.length}</Text>
                  </View>
                </View>
                {details.issues.map((issue, index) => (
                  <TouchableOpacity 
                    key={issue.id || index} 
                    style={styles.issueCard}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.issueIcon, { backgroundColor: issue.color + '20' }]}>
                      <MaterialCommunityIcons name={issue.icon} size={20} color={issue.color} />
                    </View>
                    <View style={styles.issueContent}>
                      <Text style={styles.issueTitle}>{issue.title}</Text>
                      <Text style={styles.issueDescription}>{issue.description}</Text>
                      {issue.start_time && (
                        <Text style={styles.issueTime}>Since: {issue.start_time}</Text>
                      )}
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Citizen Reports */}
            {details.citizen_reports && details.citizen_reports.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Reports</Text>
                {details.citizen_reports.slice(0, 3).map((report, index) => (
                  <View key={report.id || index} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View style={[styles.reportCategory, { 
                        backgroundColor: report.category === 'traffic' ? '#FF6B9D20' : '#4CAF5020' 
                      }]}>
                        <Text style={styles.reportCategoryText}>{report.category}</Text>
                      </View>
                      <Text style={styles.reportTime}>
                        {new Date(report.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <Text style={styles.reportDescription} numberOfLines={2}>
                      {report.description}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {details.recommendations && details.recommendations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Smart Recommendations</Text>
                  <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#FFA502" />
                </View>
                {details.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationCard}>
                    <MaterialCommunityIcons name="lightbulb" size={16} color="#FFA502" />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#FF6B9D', '#FF4757']}
                  style={styles.actionButtonGradient}
                >
                  <MaterialIcons name="report" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Report Issue</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#4C6EF5', '#3949AB']}
                  style={styles.actionButtonGradient}
                >
                  <MaterialIcons name="notifications" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Get Alerts</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bottom padding */}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Floating Refresh Button */}
          <TouchableOpacity 
            style={styles.floatingRefresh}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B9D', '#FF4757']}
              style={styles.floatingRefreshGradient}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  areaStatus: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statusGridItem: {
    width: (screenWidth - 52) / 2,
    marginRight: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusGridGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  statusGridTitle: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
  },
  statusGridValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  issueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  issueDescription: {
    color: '#999',
    fontSize: 12,
  },
  issueTime: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  reportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportCategory: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reportCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  reportTime: {
    color: '#666',
    fontSize: 11,
  },
  reportDescription: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 165, 2, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    // gap: 12,
  },
  recommendationText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    // gap: 12,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    // gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingRefresh: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  floatingRefreshGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AreaDetailsModal;