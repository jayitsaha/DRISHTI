// screens/SignUpScreen.js
import React, { useState, useReducer, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Platform,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
  Image,
  ActivityIndicator
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ModalPopup from '../components/ModalPopup';
import { useTheme } from 'react-native-paper';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import { registerUser, USER_TYPES } from '../firebase/authConfig';

const SignUpScreen = ({ navigation }) => {
  const [selectedValue, setSelectedValue] = useState('Pedestrian');
  const [selectedValueTC, setSelectedValueTC] = useState('Disagree');
  const [visible, setVisible] = useState(false);
  const [visibleTC, setVisibleTC] = useState(false);
  const [visibleTCText, setVisibleTCText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useTheme();

  const [data, setData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm_password: '',
    phoneNumber: '',
    idCard: '',
    sex: '',
    check_textInputChange: false,
    check_usernameInputChange: false,
    secureTextEntry: true,
    confirm_secureTextEntry: true,
    isValidEmailAddress: true,
    isValidUsername: true,
    isValidPassword: true,
    isValidPasswordConfirmation: true,
    // Additional fields for specific user types
    badgeNumber: '',
    stationNumber: '',
    assignedZone: '',
    department: '',
  });

  const createObj = () => {
    if (
      !data['username'] ||
      !data['email'] ||
      !data['password'] ||
      !data['isValidUsername'] ||
      !data['isValidEmailAddress'] ||
      !data['isValidPassword'] ||
      !data['isValidPasswordConfirmation']
    ) {
      return false;
    } else {
      const userTypeMap = {
        'Pedestrian': USER_TYPES.PEDESTRIAN,
        'Cleaner': USER_TYPES.CLEANER,
        'Policeman': USER_TYPES.POLICEMAN,
        'Fireman': USER_TYPES.FIREMAN
      };

      const baseData = {
        username: data['username'],
        firstName: data['firstName'],
        lastName: data['lastName'],
        email: data['email'],
        password: data['password'],
        phoneNumber: data['phoneNumber'],
        userType: userTypeMap[selectedValue] || USER_TYPES.PEDESTRIAN,
      };

      // Add specific fields based on user type
      switch (userTypeMap[selectedValue]) {
        case USER_TYPES.POLICEMAN:
          return {
            ...baseData,
            badgeNumber: data['badgeNumber'],
            department: data['department'],
          };
        case USER_TYPES.FIREMAN:
          return {
            ...baseData,
            stationNumber: data['stationNumber'],
          };
        case USER_TYPES.CLEANER:
          return {
            ...baseData,
            assignedZone: data['assignedZone'],
          };
        default:
          return {
            ...baseData,
            idCard: data['idCard'],
            sex: data['sex'],
          };
      }
    }
  };

  const postDataToServer = async () => {
    const obj = createObj();
    
    if (!obj) {
      Alert.alert('Please fill all required fields correctly');
      return false;
    }

    if (selectedValueTC !== 'Agree') {
      Alert.alert('Please accept the Terms and Conditions');
      return false;
    }

    setIsLoading(true);

    try {
      const result = await registerUser(obj);
      
      if (result.success) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SignInScreen')
            }
          ]
        );
        clearState();
        setVisibleTC(false);
      }
    } catch (error) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.message === 'Username already taken') {
        errorMessage = 'This username is already taken';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const changeRole = value => {
    if (value != selectedValue) {
      setVisible(false);
      setTimeout(() => {
        setSelectedValue(value);
      }, 400);
    }
  };

  const acceptTC = value => {
    if (value != selectedValueTC) {
      setSelectedValueTC(value);
    }
  };

  const clearState = () => {
    setData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirm_password: '',
      phoneNumber: '',
      idCard: '',
      sex: '',
      check_textInputChange: false,
      check_usernameInputChange: false,
      secureTextEntry: true,
      confirm_secureTextEntry: true,
      isValidEmailAddress: true,
      isValidUsername: true,
      isValidPassword: true,
      isValidPasswordConfirmation: true,
      badgeNumber: '',
      stationNumber: '',
      assignedZone: '',
      department: '',
    });
  };

  const textInputChangeUsername = val => {
    if (val.length >= 3) {
      setData({
        ...data,
        username: val,
        check_usernameInputChange: true,
        isValidUsername: true,
      });
    } else {
      setData({
        ...data,
        username: val,
        check_usernameInputChange: false,
        isValidUsername: false,
      });
    }
  };

  const textInputChangeFirstName = val => {
    setData({
      ...data,
      firstName: val,
    });
  };

  const textInputChangeLastName = val => {
    setData({
      ...data,
      lastName: val,
    });
  };

  const textInputChange = val => {
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (reg.test(val.trim()) === true) {
      setData({
        ...data,
        email: val.trim(),
        check_textInputChange: true,
        isValidEmailAddress: true,
      });
    } else {
      setData({
        ...data,
        email: val,
        check_textInputChange: false,
        isValidEmailAddress: false,
      });
    }
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

  const handleConfirmPasswordChange = val => {
    if (val.trim().length >= 8) {
      if (val == data['password']) {
        setData({
          ...data,
          confirm_password: val,
          isValidPasswordConfirmation: true,
        });
        return;
      }
    }
    setData({
      ...data,
      confirm_password: val,
      isValidPasswordConfirmation: false,
    });
  };

  const updateSecureTextEntry = () => {
    setData({
      ...data,
      secureTextEntry: !data.secureTextEntry,
    });
  };

  const updateConfirmSecureTextEntry = () => {
    setData({
      ...data,
      confirm_secureTextEntry: !data.confirm_secureTextEntry,
    });
  };

  const renderUserTypeSpecificFields = () => {
    switch (selectedValue) {
      case 'Policeman':
        return (
          <>
            <Text style={styles.text_footer}>Badge Number</Text>
            <View style={styles.action}>
              <FontAwesome name="id-badge" color="#05375a" size={20} />
              <TextInput
                placeholder="Badge Number"
                placeholderTextColor="#05375a"
                style={styles.textInput}
                autoCapitalize="none"
                onChangeText={val => setData({...data, badgeNumber: val})}
                value={data.badgeNumber}
              />
            </View>

            <Text style={styles.text_footer}>Department</Text>
            <View style={styles.action}>
              <MaterialIcons name="work" color="#05375a" size={20} />
              <TextInput
                placeholder="Department"
                placeholderTextColor="#05375a"
                style={styles.textInput}
                autoCapitalize="words"
                onChangeText={val => setData({...data, department: val})}
                value={data.department}
              />
            </View>
          </>
        );

      case 'Fireman':
        return (
          <>
            <Text style={styles.text_footer}>Station Number</Text>
            <View style={styles.action}>
              <MaterialIcons name="local-fire-department" color="#05375a" size={20} />
              <TextInput
                placeholder="Station Number"
                placeholderTextColor="#05375a"
                style={styles.textInput}
                autoCapitalize="none"
                onChangeText={val => setData({...data, stationNumber: val})}
                value={data.stationNumber}
              />
            </View>
          </>
        );

      case 'Cleaner':
        return (
          <>
            <Text style={styles.text_footer}>Assigned Zone</Text>
            <View style={styles.action}>
              <MaterialIcons name="location-on" color="#05375a" size={20} />
              <TextInput
                placeholder="Assigned Zone"
                placeholderTextColor="#05375a"
                style={styles.textInput}
                autoCapitalize="none"
                onChangeText={val => setData({...data, assignedZone: val})}
                value={data.assignedZone}
              />
            </View>
          </>
        );

      default: // Pedestrian
        return (
          <>
            <Text style={styles.text_footer}>ID Card</Text>
            <View style={styles.action}>
              <Ionicons name="card" color="#05375a" size={20} />
              <TextInput
                placeholder="ID Card Number"
                placeholderTextColor="#05375a"
                style={styles.textInput}
                autoCapitalize="none"
                onChangeText={val => setData({...data, idCard: val})}
                value={data.idCard}
              />
            </View>

            <Text style={styles.text_footer}>Sex</Text>
            <View style={styles.action}>
              <FontAwesome name="user-o" color="#05375a" size={20} />
              <TextInput
                placeholder="Male/Female/Other"
                placeholderTextColor="#05375a"
                style={styles.textInput}
                autoCapitalize="none"
                onChangeText={val => setData({...data, sex: val})}
                value={data.sex}
              />
            </View>
          </>
        );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar backgroundColor="#90A4AE" hidden barStyle="light-content" />
      <View style={styles.header}>
        <Text style={{
          color: '#fff',
          fontWeight: 'bold',
          textAlign: 'center',
          paddingTop: '6%',
          fontSize: 30,
          marginTop: 20
        }}>
          SIGN UP TO DRISHTI
        </Text>
      </View>

      <ModalPopup visible={visible}>
        <View style={{alignItems: 'center'}}>
          <View style={styles.header_modal}>
            <Text style={(styles.text_footer, {fontWeight: 'bold'})}>
              SELECT YOUR ROLE
            </Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons
                name="close-outline"
                size={24}
                color="#52575D">
              </Ionicons>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.containerButton}>
          <View style={{marginTop: 19}}>
            <BouncyCheckbox
              isChecked={selectedValue == 'Pedestrian'}
              textColor="blue"
              borderColor="black"
              fillColor="#40c164"
              key={Math.random()}
              onPress={checked => changeRole('Pedestrian')}>
            </BouncyCheckbox>
          </View>
          <Text style={styles.text_footer}>Pedestrian</Text>
        </View>

        <View style={styles.containerButton}>
          <View style={{marginTop: 19}}>
            <BouncyCheckbox
              isChecked={selectedValue == 'Cleaner'}
              textColor="blue"
              borderColor="black"
              fillColor="#40c164"
              key={Math.random()}
              onPress={checked => changeRole('Cleaner')}>
            </BouncyCheckbox>
          </View>
          <Text style={styles.text_footer}>Cleaner</Text>
        </View>

        <View style={styles.containerButton}>
          <View style={{marginTop: 19}}>
            <BouncyCheckbox
              isChecked={selectedValue == 'Policeman'}
              textColor="blue"
              borderColor="black"
              fillColor="#40c164"
              key={Math.random()}
              onPress={checked => changeRole('Policeman')}>
            </BouncyCheckbox>
          </View>
          <Text style={styles.text_footer}>Policeman</Text>
        </View>

        <View style={styles.containerButton}>
          <View style={{marginTop: 19}}>
            <BouncyCheckbox
              isChecked={selectedValue == 'Fireman'}
              textColor="blue"
              borderColor="black"
              fillColor="#40c164"
              key={Math.random()}
              onPress={checked => changeRole('Fireman')}>
            </BouncyCheckbox>
          </View>
          <Text style={styles.text_footer}>Fireman</Text>
        </View>
      </ModalPopup>

      <ModalPopup visible={visibleTC}>
        <View style={{alignItems: 'center'}}>
          <View style={styles.header_modal}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  'https://docs.google.com/document/d/1q5OXTVLHrXZBxed2H5Pjb6kqzYLe5OsOewK33EM-zCU/edit?usp=sharing',
                )
              }>
              <Text
                style={(styles.text_footer, {textDecorationLine: 'underline'})}>
                Please Accept the Following T&C
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setVisibleTC(false)}>
              <Ionicons
                name="close-outline"
                size={24}
                color="#52575D">
              </Ionicons>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.containerButton}>
          <View style={{marginTop: 19}}>
            <BouncyCheckbox
              isChecked={selectedValueTC == 'Agree'}
              textColor="blue"
              borderColor="black"
              fillColor="#40c164"
              key={Math.random()}
              onPress={checked =>
                checked ? acceptTC('Agree') : acceptTC('Disagree')
              }>
            </BouncyCheckbox>
          </View>
          <Text style={styles.text_footer}>I accept the given T&C</Text>
        </View>

        <TouchableOpacity
          key={Math.random()}
          style={styles.mainViewModalTC}
          disabled={!(selectedValueTC == 'Agree') || isLoading}
          onPress={postDataToServer}>
          <View style={styles.buttonModal}>
            <View
              style={[
                styles.signIn,
                {
                  borderColor: '#2F4858',
                  borderWidth: 1,
                  marginTop: 15,
                  backgroundColor: '#2F4858',
                },
              ]}>
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  style={[
                    styles.text_footerModal,
                    {
                      color: selectedValueTC == 'Agree' ? 'white' : '#696969',
                    },
                  ]}>
                  SIGN UP
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </ModalPopup>

      <Animatable.View animation="fadeInUpBig" style={styles.footer}>
        <ScrollView>
          <Text
            style={[
              styles.text_footer,
              {
                marginTop: 35,
              },
            ]}>
            User Role
          </Text>
          <TouchableOpacity onPress={() => setVisible(true)}>
            <TextInput
              editable={false}
              style={styles.text_footer}
              autoCapitalize="none"
              defaultValue={selectedValue}
            />
          </TouchableOpacity>

          <Text style={styles.text_footer}>Username</Text>
          <View style={styles.action}>
            <FontAwesome name="user-o" color="#05375a" size={20} />
            <TextInput
              placeholder="Username (min 3 characters)"
              placeholderTextColor="#05375a"
              style={styles.textInput}
              autoCapitalize="none"
              onChangeText={val => textInputChangeUsername(val)}
              value={data.username}
            />
            {data.check_usernameInputChange ? (
              <Animatable.View animation="bounceIn">
                <Feather name="check-circle" color="green" size={20} />
              </Animatable.View>
            ) : null}
          </View>
          {data.isValidUsername ? null : (
            <Animatable.View animation="fadeInLeft" duration={500}>
              <Text style={styles.errorMsg}>
                Username must be at least 3 characters long.
              </Text>
            </Animatable.View>
          )}

          <Text style={styles.text_footer}>First Name</Text>
          <View style={styles.action}>
            <FontAwesome name="user-o" color="#05375a" size={20} />
            <TextInput
              placeholder="First Name"
              placeholderTextColor="#05375a"
              style={styles.textInput}
              autoCapitalize="words"
              onChangeText={val => textInputChangeFirstName(val)}
              value={data.firstName}
            />
          </View>

          <Text style={styles.text_footer}>Last Name</Text>
          <View style={styles.action}>
            <FontAwesome name="user-o" color="#05375a" size={20} />
            <TextInput
              placeholder="Last Name"
              placeholderTextColor="#05375a"
              style={styles.textInput}
              autoCapitalize="words"
              onChangeText={val => textInputChangeLastName(val)}
              value={data.lastName}
            />
          </View>

          <Text style={styles.text_footer}>Email</Text>
          <View style={styles.action}>
            <MaterialIcons name="email" color="#05375a" size={20} />
            <TextInput
              placeholder="Your Email"
              placeholderTextColor="#05375a"
              style={styles.textInput}
              autoCapitalize="none"
              onChangeText={val => textInputChange(val)}
              value={data.email}
            />
            {data.check_textInputChange ? (
              <Animatable.View animation="bounceIn">
                <Feather name="check-circle" color="green" size={20} />
              </Animatable.View>
            ) : null}
          </View>
          {data.isValidEmailAddress ? null : (
            <Animatable.View animation="fadeInLeft" duration={500}>
              <Text style={styles.errorMsg}>
                Please enter a valid email address.
              </Text>
            </Animatable.View>
          )}

          <Text style={styles.text_footer}>Mobile Number</Text>
          <View style={styles.action}>
            <Ionicons name="call" color="#05375a" size={20} />
            <TextInput
              placeholder="Mobile Number"
              placeholderTextColor="#05375a"
              style={styles.textInput}
              autoCapitalize="none"
              keyboardType="phone-pad"
              onChangeText={val => setData({...data, phoneNumber: val})}
              value={data.phoneNumber}
            />
          </View>

          {renderUserTypeSpecificFields()}

          <Text style={styles.text_footer}>Password</Text>
          <View style={styles.action}>
            <Feather name="lock" color="#05375a" size={20} />
            <TextInput
              placeholder="Your Password"
              placeholderTextColor="#05375a"
              secureTextEntry={data.secureTextEntry ? true : false}
              style={styles.textInput}
              autoCapitalize="none"
              onChangeText={val => handlePasswordChange(val)}
              value={data.password}
            />
            <TouchableOpacity onPress={updateSecureTextEntry}>
              {data.secureTextEntry ? (
                <Feather name="eye-off" color="grey" size={20} />
              ) : (
                <Feather name="eye" color="grey" size={20} />
              )}
            </TouchableOpacity>
          </View>
          {data.isValidPassword ? null : (
            <Animatable.View animation="fadeInLeft" duration={500}>
              <Text style={styles.errorMsg}>
                Password must be 8 characters long.
              </Text>
            </Animatable.View>
          )}

          <Text style={styles.text_footer}>Confirm Password</Text>
          <View style={styles.action}>
            <Feather name="lock" color="#05375a" size={20} />
            <TextInput
              placeholder="Confirm Your Password"
              placeholderTextColor="#05375a"
              secureTextEntry={data.confirm_secureTextEntry ? true : false}
              style={styles.textInput}
              autoCapitalize="none"
              onChangeText={val => handleConfirmPasswordChange(val)}
              value={data.confirm_password}
            />
            <TouchableOpacity onPress={updateConfirmSecureTextEntry}>
              {data.confirm_secureTextEntry ? (
                <Feather name="eye-off" color="grey" size={20} />
              ) : (
                <Feather name="eye" color="grey" size={20} />
              )}
            </TouchableOpacity>
          </View>
          {data.isValidPasswordConfirmation ? null : (
            <Animatable.View animation="fadeInLeft" duration={500}>
              <Text style={styles.errorMsg}>
                Passwords do not match.
              </Text>
            </Animatable.View>
          )}

          <View style={styles.textPrivate}>
            <Text style={styles.color_textPrivate}>
              By signing up you agree to our
            </Text>
            <Text style={[styles.color_textPrivate, {fontWeight: 'bold'}]}>
              {' '}
              Terms of service
            </Text>
            <Text style={styles.color_textPrivate}> and</Text>
            <Text style={[styles.color_textPrivate, {fontWeight: 'bold'}]}>
              {' '}
              Privacy policy
            </Text>
          </View>

          <View style={styles.button}>
            <TouchableOpacity
              onPress={() => setVisibleTC(true)}
              style={[
                styles.signIn,
                {
                  borderColor: '#90A4AE',
                  borderWidth: 1,
                  marginTop: 15,
                  backgroundColor: '#90A4AE',
                },
              ]}
              disabled={isLoading}>
              <Text
                style={[
                  styles.textSign,
                  {
                    color: '#fff',
                  },
                ]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.button}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[
                styles.signIn,
                {
                  borderColor: '#90A4AE',
                  borderWidth: 1,
                  marginTop: -20,
                },
              ]}
              disabled={isLoading}>
              <Text
                style={[
                  styles.textSign,
                  {
                    color: '#90A4AE',
                  },
                ]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animatable.View>
    </ScrollView>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#90A4AE',
    marginTop: 0
  },
  header: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  footer: {
    flex: Platform.OS === 'ios' ? 3 : 5,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  text_header: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: '6%',
    fontSize: 30,
  },
  text_footer: {
    color: '#05375a',
    fontSize: 18,
    marginTop: 20,
  },
  action: {
    flexDirection: 'row',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    paddingBottom: 5,
  },
  textInput: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : -12,
    paddingLeft: 10,
    color: '#05375a',
  },
  pickerInput: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : -12,
    marginBottom: 10,
    paddingLeft: 10,
    color: '#05375a',
  },
  button: {
    alignItems: 'center',
    marginTop: 50,
  },
  signIn: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  textSign: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  textPrivate: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  color_textPrivate: {
    color: 'grey',
  },
  modalBackGround: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderRadius: 20,
    elevation: 20,
  },
  header_modal: {
    width: '100%',
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginBottom: 10,
  },
  containerButton: {
    flexDirection: 'row',
    margin: 0,
    marginBottom: 10,
  },
  buttonModal: {
    width: '90%',
    height: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
    marginBottom: 35,
    marginTop: 40,
  },
  buttonMod: {
    width: '90%',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 35,
    marginTop: 35,
  },
  mainViewModalTC: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  text_footerModal: {
    color: '#05375a',
    fontSize: 18,
  },
  errorMsg: {
    color: '#FF0000',
    fontSize: 14,
  },
});