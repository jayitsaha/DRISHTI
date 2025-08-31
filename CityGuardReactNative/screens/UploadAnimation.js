import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image
} from 'react-native';
import LottieView from 'lottie-react-native'
import tw from 'tailwind-react-native-classnames';


function uploadAnimation({onFinish, visible}){

        console.log("I AM IN SPLASH")

        return (

            <Modal visible={visible}>
                <View style={styles.container} >
                <LottieView
                source={require('../assets/images/finished.json')}
                loop={false}
                autoPlay
                style={{flex: 1, width: 400, height: 400}}
                onAnimationFinish={onFinish}

                />
                </View>
            </Modal>

        )
        }

const styles = StyleSheet.create({
    container:{
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
    },

})


export default uploadAnimation;
