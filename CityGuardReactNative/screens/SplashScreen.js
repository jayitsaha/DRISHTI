import React, {useState, useReducer, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {COLORS as colors, icons} from '../constants';
import { useLocalNotification } from "./useLocalNotification";
import * as Notifications from "expo-notifications";
import { schedulePushNotification } from "./handle-local-notification";
import { Button } from "react-native";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

const SplashScreen = ({navigation}) => {


    useLocalNotification();
  const handleLocalPushNotification = async () => {
    await schedulePushNotification();
  };

  useEffect(() => {
    setTimeout(() => {
      navigation.navigate('AcceptRejection');
    }, 2000);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2F4858" barStyle="light-content" />
      <View
        style={{
          alignItems: 'center',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={styles.header_text}>
          <Animatable.Image
            animation="bounceIn"
            // duration="1500"
            source={require("../assets/images/bin-modified.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerSquirrel}>
            <Text style={styles.text_header}>PSP CONNECT</Text>
          </View>
        </View>
      </View>

      <Animatable.View
        style={[
          styles.footer,
          {
            backgroundColor: colors.white,
          },
        ]}
        animation="fadeInUpBig">
        <Text
          style={[
            styles.title,
            {
              color: "#05375a",
            },
          ]}>
          Optimizing PSPs Realtime
        </Text>


         <Text
                  style={[
                    styles.title,
                    {
                      color: "#05375a",
                      marginTop: 10
                    },
                  ]}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Walmart Inc.
                </Text>

        <View style={styles.button}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            style={[
              styles.signIn,
              {
                borderColor: '#2F4858',
                borderWidth: 1,
                marginTop: 15,
                backgroundColor: '#2F4858',
              },
            ]}>
            <View>
              <Text style={styles.textSign}>LETS MAKE A DIFFERENCE</Text>

            </View>
          </TouchableOpacity>
        </View>
      </Animatable.View>
    </View>
  );
};

export default SplashScreen;

const {height} = Dimensions.get('screen');
const height_logo = height * 0.28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2F4858',
  },
  header: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  logo: {
    width: height_logo,
    height: height_logo,
    marginLeft: 10,
    marginTop: 60
  },
  title: {
    color: '#05375a',
    fontSize: 27,
    fontWeight: 'bold',
  },
  text: {
    color: 'grey',
    marginTop: 5,
  },
  button: {
    alignItems: 'flex-end',
    marginTop: 30,

  },
  signIn: {
    width: 300,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    flexDirection: 'row',
  },
  textSign: {
    color: 'white',
    fontWeight: 'bold',
  },
  text_header: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 30,
    marginTop: 20
  },
  header_text: {
    // flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  headerSquirrel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
});