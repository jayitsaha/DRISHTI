import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import Map from '../components/Map';
import { createStackNavigator } from '@react-navigation/stack';
import NavigateCard from '../components/NavigateCard';
import RideOptionsCard from '../components/RideOptionsCard';
import { Icon } from 'react-native-elements';
import { useNavigation } from '@react-navigation/native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { useSelector } from 'react-redux';
import { selectOrigin, selectDestination, setTravelTimeInformation } from '../slices/navSlice';
import MapViewDirections from 'react-native-maps-directions';
import { GOOGLE_MAPS_APIKEY } from '@env';
import { useDispatch } from 'react-redux';
import {

  SafeAreaView,
  Modal,
  Image,
  ScrollView
} from 'react-native';
import { setDestination } from '../slices/navSlice';
//import NavFavourites from './NavFavourites';
import {icons, SIZES, COLORS, FONTS, images} from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Camera, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { MaterialIcons } from '@expo/vector-icons';
//import Button from '../components/Button';
import ImagePickerExample from '../components/ImagePickerExample';
import { Button } from "react-native-paper";
import UploadAnimation from '../screens/UploadAnimation';
import { showMessage } from 'react-native-flash-message';
import FlashMessage from 'react-native-flash-message'


const MapScreen = () => {
  const Stack = createStackNavigator();
  const navigation = useNavigation();

    const origin = useSelector(selectOrigin);
    const destination = useSelector(selectDestination);
    const mapRef = useRef(null);
    const dispatch = useDispatch();


    useEffect(() => {
        if (!origin || !destination) return;

        // Zoom and fit to markers
        mapRef.current.fitToSuppliedMarkers(['origin', 'destination'], {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        });
      }, [origin, destination]);

      useEffect(() => {
        if (!origin || !destination) return;

        const getTravelTime = async () => {
          fetch(
            `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${origin.description}&destinations=${destination.description}&key=${GOOGLE_MAPS_APIKEY}`
          )
            .then((res) => res.json())
            .then((data) => {
              dispatch(setTravelTimeInformation(data.rows[0].elements[0]));
            });
        };

        getTravelTime();
      }, [origin, destination, GOOGLE_MAPS_APIKEY]);





         const [image, setImage] = useState(null);
                  const [image1, setImage1] = useState(null);

           const [camera, setShowCamera] = useState(false);
           const [camera1, setShowCamera1] = useState(false);
           const [hasPermission, setHasPermission] = useState(null);
         useEffect(() => {
             (async () => {
               const { status } = await Camera.requestPermissionsAsync();
               setHasPermission(status === "granted");
             })();
           }, []);


          const [cameraRef, setCameraRef] = useState(null);
          const [type, setType] = useState(Camera.Constants.Type.back);


          const [cameraRef1, setCameraRef1] = useState(null);
          const [type1, setType1] = useState(Camera.Constants.Type.back);


          const [garbagenum, setGarbageNum] = useState(0);

          const [upload1, setUpload1] = useState(false);

          const [finishmodal, setFinishModal] = useState(false);

          const [showbottom, setshowbottom] = useState(true);






//         if (hasPermission === null) {
//             return <View />;
//           }
//           if (hasPermission === false) {
//             return <Text>No access to camera</Text>;
//           }




  return (


    <View style={{marginTop: 30}}>

    <TouchableOpacity
              onPress={() => navigation.navigate('HomeScreenPedestrian')}
              style={tw`bg-gray-100 absolute left-8 z-50 p-3 rounded-full shadow-lg`}>
              <Icon name='menu' />
            </TouchableOpacity>






      <ScrollView>
        <FlashMessage position="top" style={{width: 400, marginTop: 50}}/>
        {!showbottom && <Image source={require("../assets/images/success.png")}
        style={{ width: 200, height: 200, marginTop: 150, marginLeft: 90 }}
 />}
        { <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 30 }}>
                {showbottom && <>
                <Text> GARBAGE TAGGER </Text>
                <View
                  style={{
                    backgroundColor: "#eeee",
                    width: 500,
                    height: 500,
                    borderRadius: 0,
                    marginBottom: 8,
                  }}
                >
                  <Image
                    source={{ uri: image }}
                    style={{ width: 500, height: 500, borderRadius: 0 }}
                  />
                </View>
                <Button
                  style={{ width: "60%", marginTop: 16 }}
                  icon="camera"
                  mode="contained"
                  onPress={() => {
                    setShowCamera(true);
                  }}
                >
                  TAG A GARBAGE PILE
                </Button>
                </>}
              {camera && (
                  <Modal
                        animationType="slide"
                        transparent={true}
                        visible={true}
                        onRequestClose={() => {
                         setShowCamera(false);
                        }}
                      >
                        <Camera
                          style={{ flex: 1 }}
                          ratio="16:9"
                          flashMode={Camera.Constants.FlashMode.off}
                          type={type}
                          ref={(ref) => {
                            setCameraRef(ref);
                          }}
                        >
                          <View
                            style={{
                              flex: 1,
                              backgroundColor: "transparent",
                              justifyContent: "flex-end",
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: "black",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Button
                                icon="close"
                                style={{ marginLeft: 12 }}
                                mode="outlined"
                                color="white"
                                onPress={() => {
                                setShowCamera(false);
                                }}
                              >
                                Close
                              </Button>
                             <TouchableOpacity
                                onPress={async () => {
                                  if (cameraRef) {
                                    let photo = await cameraRef.takePictureAsync();
                                    setImage(photo.uri)
                                    setShowCamera(false)
                                  }
                                }}
                              >
                                <View
                                  style={{
                                    borderWidth: 2,
                                    borderRadius: 50,
                                    borderColor: "white",
                                    height: 50,
                                    width: 50,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginBottom: 16,
                                    marginTop: 16,
                                  }}
                                >
                                  <View
                                    style={{
                                      borderWidth: 2,
                                      borderRadius: 50,
                                      borderColor: "white",
                                      height: 40,
                                      width: 40,
                                      backgroundColor: "white",
                                    }}
                                  ></View>
                                </View>
                              </TouchableOpacity>
                         <Button
                                icon="axis-z-rotate-clockwise"
                                style={{ marginRight: 12 }}
                                mode="outlined"
                                color="white"
                                onPress={() => {
                                  setType(
                                    type === Camera.Constants.Type.back
                                      ? Camera.Constants.Type.front
                                      : Camera.Constants.Type.back
                                  );
                                }}
                              >
                             {type === Camera.Constants.Type.back ? "Front" : "Back "}
                              </Button>
                            </View>
                          </View>
                        </Camera>
                      </Modal>
                )}






                                <Button
                                                  style={{ width: "30%", marginTop: 16 }}
                                                  icon="camera"
                                                  mode="contained"
                                                  onPress={() => {
                                                    setUpload1(true);
                                                    setshowbottom(false)
                                                    showMessage({
                                                              message: 'CLEANING ACTIVITY COMPLETED',
//                                                              description: `Congratulations! You have cleaned`,
                                                              type: 'success',
                                                              icon: props => <Image source={require("../assets/images/happy.png")} {...props} />
                                                            });
                                                     setTimeout(() => {setshowbottom(true);setImage(null); setImage1(null);}, 2000)

                                                  }}
                                                >
                                                  UPLOAD
                                                </Button>


              </View>}







      </ScrollView>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({});
