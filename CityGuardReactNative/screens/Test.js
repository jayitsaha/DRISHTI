import React, { useEffect, useRef, useState } from 'react';
import LottieView from 'lottie-react-native';
//import {Text} from 'react-native-paper';
import {
  View,
  Text

} from 'react-native';
import { useIsFocused } from "@react-navigation/native";
import { NavigationContainer } from '@react-navigation/native';




export default function App()  {
const isFocused = useIsFocused();
const confettiRef = useRef();
    useEffect(() => {
        if (isFocused) {
          confettiRef?.current?.play()
        }
      }, [isFocused]);
    return (
    <>
    <Text>HUEHUEHHE</Text>
      <View style={{ flex: 1 }}>
              <LottieView
                ref={confettiRef}
                source={require("../assets/images/finished.json")}
                style={{
                 flex: 1 ,

                }}
                autoPlay={false}
                loop={false}
                resizeMode="cover"
              />
            </View>
            </>
    );
}