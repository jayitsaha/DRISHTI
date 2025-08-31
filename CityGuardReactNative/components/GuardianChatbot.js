import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  Vibration,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GuardianChatbot = ({ visible, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I'm Drishti AI, your city intelligence assistant. I can help you with real-time traffic, power updates, weather conditions, and report issues. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date(),
      type: 'welcome',
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickActions, setQuickActions] = useState(true);
  
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Start pulse animation for bot avatar
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setQuickActions(false);
    
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
    
    try {
      const response = await fetch('http://192.168.1.17:8005/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputText,
          user_id: 'pedestrian_user_1',
          location: { lat: 12.9352, lng: 77.6245 }, // Koramangala coordinates
        }),
      });
      
      const data = await response.json();
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        sender: 'bot',
        timestamp: new Date(),
        type: data.type,
        data: data.data,
        suggestions: data.suggestions,
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting to the city services. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date(),
        type: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    setIsTyping(false);
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };
  
  const handleQuickAction = (action) => {
    setInputText(action);
    sendMessage();
  };
  
  const renderMessage = (message) => {
    const isBot = message.sender === 'bot';
    
    return (
      <Animated.View
        key={message.id}
        style={[
          styles.messageContainer,
          isBot ? styles.botMessageContainer : styles.userMessageContainer,
          {
            transform: [{
              translateX: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [isBot ? -50 : 50, 0],
              })
            }]
          }
        ]}
      >
        {isBot && (
          <Animated.View style={[
            styles.botAvatar,
            {
              transform: [{ scale: pulseAnim }]
            }
          ]}>
            <View
              // colors={['#FF6B9D', '#FF4757']}
              style={styles.avatarGradient}
            >
              <Image
                style={{
                  width: 50,
                  height: 50,
                  resizeMode: 'cover',
                  justifyContent: "center",
                  alignSelf:"center",
                  
                }}
                source={require("../assets/images/robot.png")}
              />
            </View>
          </Animated.View>
        )}
        
        <View style={[
          styles.messageBubble,
          isBot ? styles.botBubble : styles.userBubble,
        ]}>
          {isBot ? (
            <LinearGradient
              colors={['rgba(26, 26, 46, 0.95)', 'rgba(22, 33, 62, 0.95)']}
              style={styles.botBubbleGradient}
            >
              <Text style={styles.botMessageText}>{message.text}</Text>
              
              {message.suggestions && (
                <View style={styles.suggestionsContainer}>
                  {message.suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionPill}
                      onPress={() => handleQuickAction(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#FF6B9D', '#FF4757']}
              style={styles.userBubbleGradient}
            >
              <Text style={styles.userMessageText}>{message.text}</Text>
            </LinearGradient>
          )}
        </View>
      </Animated.View>
    );
  };
  
  const quickActionsData = [
    { icon: 'traffic-light', text: "What's the traffic like?", color: '#FF6B9D' },
    { icon: 'weather-cloudy', text: 'Will it rain today?', color: '#4C6EF5' },
    { icon: 'power-plug', text: 'Any power cuts?', color: '#FFA500' },
    { icon: 'alert-circle', text: 'Report an issue', color: '#FF4757' },
  ];
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <Animated.View
          style={[
            styles.chatContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            <LinearGradient
              colors={['rgba(15, 15, 26, 0.98)', 'rgba(10, 10, 21, 0.98)']}
              style={styles.gradientContainer}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
                  <View>
                    <Text style={styles.headerTitle}>Drishti AI</Text>
                    <Text style={styles.headerSubtitle}>City Intelligence Assistant</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#999" />
                </TouchableOpacity>
              </View>
              
              {/* Messages */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.messagesContainer}
                keyboardVerticalOffset={100}
              >
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.map(renderMessage)}
                  
                  {isTyping && (
                    <View style={styles.typingIndicator}>
                      <ActivityIndicator size="small" color="#FF6B9D" />
                      <Text style={styles.typingText}>Drishti AI is thinking...</Text>
                    </View>
                  )}
                </ScrollView>
              </KeyboardAvoidingView>
              
              {/* Quick Actions */}
              {quickActions && messages.length === 1 && (
                <View style={styles.quickActionsContainer}>
                  <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                  <View style={styles.quickActionsGrid}>
                    {quickActionsData.map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.quickAction}
                        onPress={() => handleQuickAction(action.text)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[action.color + '20', action.color + '10']}
                          style={styles.quickActionGradient}
                        >
                          <MaterialCommunityIcons 
                            name={action.icon} 
                            size={24} 
                            color={action.color} 
                          />
                          <Text style={styles.quickActionText}>{action.text}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask me anything about your city..."
                    placeholderTextColor="#666"
                    multiline
                    maxHeight={100}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!inputText.trim()}
                  >
                    <LinearGradient
                      colors={inputText.trim() ? ['#FF6B9D', '#FF4757'] : ['#333', '#333']}
                      style={styles.sendButtonGradient}
                    >
                      <Ionicons name="send" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.85,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  botMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 10,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  botBubble: {
    flex: 1,
  },
  userBubble: {},
  botBubbleGradient: {
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.2)',
    borderRadius: 18,
  },
  userBubbleGradient: {
    padding: 14,
  },
  botMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  userMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // gap: 8,
    marginTop: 12,
  },
  suggestionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#FF6B9D',
    fontWeight: '500',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 46,
    marginTop: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  quickAction: {
    width: (screenWidth - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 6,
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  quickActionText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GuardianChatbot;