import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  Dimensions
} from "react-native";
import tw from "tailwind-react-native-classnames";
import Map from "../components/Map";
import { createStackNavigator } from "@react-navigation/stack";
import NavigateCard from "../components/NavigateCard";
import RideOptionsCard from "../components/RideOptionsCard";
import { Icon } from "react-native-elements";
import { useNavigation } from "@react-navigation/native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import MapView, { Marker } from "react-native-maps";
import { useSelector } from "react-redux";
import {
  selectOrigin,
  selectDestination,
  setTravelTimeInformation,
} from "../slices/navSlice";
import MapViewDirections from "react-native-maps-directions";
import { GOOGLE_MAPS_APIKEY } from "@env";
import { useDispatch } from "react-redux";
import { SafeAreaView, Modal, Image, ScrollView } from "react-native";
import { setDestination } from "../slices/navSlice";
//import NavFavourites from './NavFavourites';
import { icons, SIZES, COLORS, FONTS, images } from "../constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Camera, CameraType } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { MaterialIcons } from "@expo/vector-icons";
//import Button from '../components/Button';
import ImagePickerExample from "../components/ImagePickerExample";
import { Button } from "react-native-paper";
import UploadAnimation from "../screens/UploadAnimation";
import { showMessage } from "react-native-flash-message";
import FlashMessage from "react-native-flash-message";
import * as Animatable from 'react-native-animatable';
import TextAvatar from '../components/textAvatar';
import Icon1 from '@expo/vector-icons/Ionicons'

import { PanGestureHandler } from "react-native-gesture-handler";

// import Animated, {
//   useAnimatedGestureHandler,
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
// } from "react-native-reanimated";
const colors = {
  gray: '#D1D3D2',
  darkGray: '#676767',
  orange: '#F35D38',
  black: '#0C0D0E',
  white: '#FBFCFE',
};

const height = Dimensions.get('window').height;
const width = Dimensions.get('window').width;
const MapScreen = () => {
  const Stack = createStackNavigator();
  const navigation = useNavigation();

  const origin = useSelector(selectOrigin);
  const destination = useSelector(selectDestination);
  const mapRef = useRef(null);
  const dispatch = useDispatch();

  const scaleAnimationRef = useRef(new Animated.Value(0)).current;
  const opacityAnimationRef = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scaleAnimationRef, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, [scaleAnimationRef]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(opacityAnimationRef, {
        toValue: 0,
        duration: 1800,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, [opacityAnimationRef]);

  useEffect(() => {
    if (!origin || !destination) return;

    // Zoom and fit to markers
    mapRef.current.fitToSuppliedMarkers(["origin", "destination"], {
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
  const [upload2, setUpload2] = useState(false);
  const [upload3, setUpload3] = useState(false);

  const [uploadedGarbagePath, setUploadedGarbagePath] = useState("");
  const [uploadStart, setUploadStart] = useState(false);
  const [uploadScreen, setUploadScreen] = useState(false);
  const [imageURI, setImageURI] = useState("");



  

  const [finishmodal, setFinishModal] = useState(false);

  const [showbottom, setshowbottom] = useState(true);

  const data = [{ id: 1 }, { id: 2 }];

  //         if (hasPermission === null) {
  //             return <View />;
  //           }
  //           if (hasPermission === false) {
  //             return <Text>No access to camera</Text>;
  //           }



  const loadPictureUri = async () => {
    
    setUploadScreen(true)
    const assets = await MediaLibrary.getAssetsAsync({
      first: 1,
      mediaType: ["photo"],
      sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
  });
  const tempImageURI = assets.assets[0].uri;
  console.log(tempImageURI)
  console.log("DISPLAY IMAGE")
  setImageURI(tempImageURI)

    


  };

  return (
    <View>
    
      <TouchableOpacity
        onPress={() => navigation.navigate("CleanerDashboard")}
        style={tw`bg-gray-100 absolute top-5 left-5 z-50 p-3 rounded-full shadow-lg`}
      >
        <Icon1 name="arrow-back-outline" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("SignInScreen")}
        style={tw`bg-gray-100 absolute top-5 right-5 z-50 p-3 rounded-full shadow-lg`}
      >
        <Icon1 name="power-sharp" />
      </TouchableOpacity>

      <View style={tw`h-1/2`}>
        <MapView
          ref={mapRef}
          style={tw`flex-1`}
          mapType="mutedStandard"
          initialRegion={{
            latitude: 12.978968876353623,
            longitude: 77.71912210807271,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          {/* {1==1 && 2==2 && (
                <MapViewDirections
                  origin="Origin"
                  destination="destination"
                  apikey="AIzaSyBQivdVNxU7quHhW_ARw2VuXKmHVwXhNMk"
                  strokeWidth={3}
                  strokeColor='black'
                />
              )}*/}

          {1 == 1 && (
            <Marker
              coordinate={{
                latitude: 12.979603805668434,
                longitude: 77.71977189582657,
              }}
              title="Origin"
              description="Origin"
              identifier="origin"
            >
              <Animated.View style={styles.markerWrap}>
                <Animated.View
                  style={[
                    styles.ring,
                    { opacity: opacityAnimationRef },
                    { transform: [{ scale: scaleAnimationRef }] },
                  ]}
                />
                <Image
                  source={require("../assets/images/cleaner.png")}
                  style={styles.marker}
                />
              </Animated.View>
            </Marker>
          )}

          {!upload1 && (
            <Marker
              coordinate={{
                latitude: 12.980725106333104,
                longitude: 77.71940386996064,
              }}
              title="Garbage 1"
              description="Garbage 1"
              identifier="Garbage 1"
              onPress={() => {
                setGarbageNum(1);
                loadPictureUri()
              }}
            >
              <Image
                source={require("../assets/images/dustbin.png")}
                style={{ height: 35, width: 35 }}
              />
            </Marker>
          )}

          {!upload2 && (
            <Marker
              coordinate={{
                latitude: 12.977464959195158,
                longitude: 77.71895659447502,
              }}
              title="Garbage 2"
              description="Garbage 2"
              identifier="Garbage 2"
              onPress={() => {
                setGarbageNum(2);
              }}
            >
              <Image
                source={require("../assets/images/dustbin.png")}
                style={{ height: 35, width: 35 }}
              />
            </Marker>
          )}
          {!upload3 && (
            <Marker
              coordinate={{
                latitude: 12.978968876353623,
                longitude: 77.71912210807271,
              }}
              title="Garbage 3"
              description="Garbage 3"
              identifier="Garbage 3"
              onPress={() => {
                setGarbageNum(3);
              }}
            >
              <Image
                source={require("../assets/images/dustbin.png")}
                style={{ height: 35, width: 35 }}
              />
            </Marker>
          )}
        </MapView>
      </View>

      <ScrollView style={tw`h-1/2`}>
        <FlashMessage position="top" style={{ width: 400, marginTop: 0 }} />
        {!showbottom && (
          <Image
            source={require("../assets/images/success.png")}
            style={{ width: 200, height: 200, marginTop: 100, marginLeft: 90 }}
          />
        )}

        

        <View style={{ flex: 1, flexDirection: "row" }}>

          {!uploadStart && !uploadScreen && <ScrollView vertical>

          {/* <Text
          style={{
            // marginLeft: 70,
            marginTop: 20,
            fontSize: 18,
            fontWeight: "bold",
            alignSelf: "center"
          }}
        >
          {" "}
          TAKE ACTION FOR MISSION {garbagenum == 0 ? null : garbagenum}
        </Text> */}

        <Button
            style={{ width: "80%", marginTop: 16, alignSelf:"center", backgroundColor: "rgba(123, 174, 103, 1.0)" }}
            icon="camera"
            mode="contained"
            
          >
            TAKE ACTION FOR MISSION {garbagenum == 0 ? null : garbagenum}
          </Button>

        <Animatable.View
        animation="fadeInUpBig"
        
        >
      <View style={styles.row}>
      <TextAvatar
        size={38}
        fontSize={18}
        text={"T"}
        color={"rgba(93, 144, 73, 1.0)"}
      />
      <View style={styles.mailText}>
        <Text style={[styles.title, styles.bold]}>Garbage getting collected near Tech Park</Text>
        <Text style={[styles.subTitle, styles.bold]}>
        12.973826, 77.590591 {'\n'}{'\n'}

        Garbage is getting deposited near the back gate of cessna business park. Due to which employees are facing constant discomfort.{'\n'}{'\n'}

        </Text>
        <Text style={[styles.subTitle]}>
        IMPACT: CRITICAL
        </Text>
      </View>
    </View>
    </Animatable.View>

    <Animatable.View
        animation="fadeInUpBig"
        
        >
      <View style={styles.row}>
      <TextAvatar
        size={38}
        fontSize={18}
        text={"T"}
        color={"rgba(93, 144, 73, 1.0)"}
      />
      <View style={styles.mailText}>
        <Text style={[styles.title, styles.bold]}>Cholera alert: PGs take preventive measures amid outbreak concerns in Bengaluru</Text>
        <Text style={[styles.subTitle, styles.bold]}>
        12.973826, 87.590591 {'\n'}{'\n'}

        PGs are putting in place several measures to combat the threat, including prioritising clean food and water along with maintaining hygienic surroundings. {'\n'}{'\n'}

        </Text>
        <Text style={[styles.subTitle]}>
        IMPACT: CRITICAL
        </Text>
      </View>
    </View>
    </Animatable.View>

    

          </ScrollView>}



          {uploadScreen && (
              <>
                <View
                  style={{
                    backgroundColor: "#eeee",
                    // width: 200,
                    // height: 200,
                    borderRadius: 0,
                    marginBottom: 8,
                    justifyContent: "center",
                    alignSelf: "center",
                    marginLeft: 90,
                  }}
                >
                  <Button
                    style={{
                      width: "100%",
                      marginTop: 16,
                      marginBottom: 20,
                      zIndex: 9999,
                      justifyContent: "center",
                      alignSelf: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(123, 174, 103, 1.0)"
                      
                    }}
                    icon="camera"
                    mode="contained"
                    onPress={() => {
                      setShowCamera(true);
                    }}
                  >
                    UPLOADED IMAGE
                  </Button>

                  <Image
                    source={{ uri: imageURI? imageURI: "" }}
                    style={{ width: 200, height: 200, borderRadius: 10 }}
                  />
                </View>

                


                
              </>
            )}


          <ScrollView horizontal style={{ height: 300, padding: 10 }}>
            {showbottom && uploadStart && (
              <>
                <View
                  style={{
                    backgroundColor: "#eeee",
                    width: 200,
                    height: 200,
                    borderRadius: 0,
                    marginBottom: 8,
                    marginRight: 100,
                  }}
                >
                  <Button
                    style={{
                      width: "100%",
                      marginTop: 16,
                      marginBottom: 20,
                      zIndex: 9999,
                      backgroundColor: "rgba(123, 174, 103, 1.0)"
                    }}
                    icon="camera"
                    mode="contained"
                    onPress={() => {
                      setShowCamera(true);
                    }}
                  >
                    GARBAGE
                  </Button>

                  <Image
                    source={{ uri: image }}
                    style={{ width: 200, height: 200, borderRadius: 0 }}
                  />
                </View>
              </>
            )}

            {showbottom && uploadStart && (
              <>
                <View
                  style={{
                    backgroundColor: "#eeee",
                    width: 200,
                    height: 200,
                    borderRadius: 0,
                    marginBottom: 8,
                  }}
                >
                  <Button
                    style={{ width: "100%", marginTop: 16, marginBottom: 20, backgroundColor: "rgba(123, 174, 103, 1.0)" }}
                    icon="camera"
                    mode="contained"
                    onPress={() => {
                      setShowCamera1(true);
                    }}
                  >
                    CLEAN
                  </Button>

                  <Image
                    source={{ uri: image1 }}
                    style={{ width: 200, height: 200, borderRadius: 0 }}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
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
                        setImage(photo.uri);
                        setShowCamera(false);
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

        {camera1 && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={true}
            onRequestClose={() => {
              setShowCamera1(false);
            }}
          >
            <Camera
              style={{ flex: 1 }}
              ratio="16:9"
              flashMode={Camera.Constants.FlashMode.off}
              type={type1}
              ref={(ref) => {
                setCameraRef1(ref);
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
                      setShowCamera1(false);
                    }}
                  >
                    Close
                  </Button>
                  <TouchableOpacity
                    onPress={async () => {
                      if (cameraRef1) {
                        let photo = await cameraRef1.takePictureAsync();
                        setImage1(photo.uri);
                        setShowCamera1(false);
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
                      setType1(
                        type1 === Camera.Constants.Type.back
                          ? Camera.Constants.Type.front
                          : Camera.Constants.Type.back
                      );
                    }}
                  >
                    {type1 === Camera.Constants.Type.back ? "Front" : "Back "}
                  </Button>
                </View>
              </View>
            </Camera>
          </Modal>
        )}

        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          {uploadStart && <Button
            style={{ width: "30%", marginTop: 16, backgroundColor: "rgba(123, 174, 103, 1.0)" }}
            icon="camera"
            mode="contained"
            onPress={() => {
              if (garbagenum == 1) {
                setUpload1(true);
              }

              if (garbagenum == 2) {
                setUpload2(true);
              }

              if (garbagenum == 3) {
                setUpload3(true);
              }
              setshowbottom(false);
              showMessage({
                message: "CLEANING ACTIVITY COMPLETED",
                //                                                              description: `Congratulations! You have cleaned`,
                type: "success",
                icon: (props) => (
                  <Image
                    source={require("../assets/images/happy.png")}
                    {...props}
                  />
                ),
              });
              setTimeout(() => {
                setshowbottom(true);
                setImage(null);
                setImage1(null);
              }, 2000);
            }}
          >
            UPLOAD
          </Button>}
        </View>


        {showbottom && uploadScreen && <Animatable.View
        animation="fadeInUpBig"
        
        >
      <View style={styles.row}>
      <TextAvatar
        size={38}
        fontSize={18}
        text={"T"}
        color={"rgba(93, 144, 73, 1.0)"}
      />
      <View style={styles.mailText}>
        <Text style={[styles.title, styles.bold]}>Garbage getting collected near Tech Park</Text>
        <Text style={[styles.subTitle, styles.bold]}>
        12.973826, 77.590591 {'\n'}{'\n'}

        Garbage is getting deposited near the back gate of cessna business park. Due to which employees are facing constant discomfort.{'\n'}{'\n'}

        </Text>
        <Text style={[styles.subTitle]}>
        IMPACT: CRITICAL
        </Text>
      </View>
    </View>
    </Animatable.View>}


    {showbottom && uploadScreen && <Button
            style={{ width: "50%", marginTop: 16, alignSelf: "center", marginBottom: 10, backgroundColor: "rgba(123, 174, 103, 1.0)" }}
            icon="camera"
            mode="contained"
            onPress={() => {

              setshowbottom(true)
              setUploadStart(true)
              setUploadScreen(false)
              
            }}
          >
            CONTINUE
          </Button>}
      </ScrollView>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  markerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: 38,
    height: 38,
    borderRadius: 4,
    // backgroundColor: 'rgba(130,4,150, 0.9)',
    position: "absolute",
  },
  ring: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(66, 133, 244, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(66, 133, 244, 0.5)",
    opacity: 1,
  },
  descriptionWrapper: {
    flex: 1,
    backgroundColor: colors.white,
    marginTop: 20,
    borderRadius: 25,
    height: height * 1,
//    width: width * 0.5
  },
  backIcon: {
    marginLeft: 20,
    marginTop: 60,
  },
  titlesWrapper: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  itemTitle: {
    fontFamily: 'Lato-Bold',
    fontSize: 32,
    color: colors.white,
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  locationText: {
    fontFamily: 'Lato-Bold',
    fontSize: 16,
    color: colors.white,
  },
  heartWrapper: {
    position: 'absolute',
    right: 40,
    top: -30,
    width: 64,
    height: 64,
    backgroundColor: colors.white,
    borderRadius: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  descriptionTextWrapper: {
    marginTop: 30,
    marginHorizontal: 20,



  },
  descriptionTitle: {
    fontFamily: 'Lato-Bold',
    fontSize: 24,
    color: colors.black,
  },
  descriptionText: {
    marginTop: 20,
    fontFamily: 'Lato-Regular',
    fontSize: 16,
    color: colors.darkGray,
  },
  infoWrapper: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  infoItem: {},
  infoTitle: {
    fontFamily: 'Lato-Bold',
    fontSize: 12,
    color: colors.black,
  },
  infoTextWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 5,
  },
  infoText: {
    fontFamily: 'Lato-Bold',
    fontSize: 24,
    color: colors.orange,
  },
  infoSubText: {
    fontFamily: 'Lato-Bold',
    fontSize: 14,
    color: colors.gray,
  },
  buttonWrapper: {
    marginHorizontal: 20,
    marginTop: 40,
    backgroundColor: colors.orange,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    fontFamily: 'Lato-Bold',
    fontSize: 18,
    color: colors.white,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    width: "90%",
    marginLeft: 20,
    borderRadius: 50,
    marginTop: 30
  },
  mailText: {
    marginLeft: 15,
    width: '80%',
  },
  bold: {
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
  },
  subTitle: {
    fontSize: 13,
  },
  ext_header: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 30,
  },
  text_footer: {
    color: '#05375a',
    fontSize: 18,
  },
  action: {
    flexDirection: 'row',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fff',
    paddingBottom: 5,
  },
  actionError: {
    flexDirection: 'row',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FF0000',
    paddingBottom: 5,
  },
  textInput: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : -12,
    paddingLeft: 10,
    color: '#05375a',
  },
  video: {
    flex: 1,
    alignSelf: "stretch"
  }
});
