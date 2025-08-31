import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Dimensions, TextInput } from "react-native";
import tw from "tailwind-react-native-classnames";
import Map from "../components/Map";
import { createStackNavigator } from "@react-navigation/stack";
import NavigateCard from "../components/NavigateCard";
import RideOptionsCard from "../components/RideOptionsCard";
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
import Card from '../components/card';
import TextAvatar from '../components/textAvatar';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import * as Animatable from 'react-native-animatable';
import Icon from '@expo/vector-icons/Ionicons'

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

  const [finishmodal, setFinishModal] = useState(false);

  const [showbottom, setshowbottom] = useState(true);

  const data = [{ id: 1 }, { id: 2 }];

  const [data1, setData] = React.useState({
    username: '',
    
  });

  const [activeTab, setActiveTab] = useState('tab1'); // State to track active tab

    // Function to handle tab press
    const handleTabPress = (tabName) => {
      setActiveTab(tabName);
    };

    const textInputChange = val => {
      setData({
        ...data1,
        username: val,
      });
    };



  return (
    <View>
      <TouchableOpacity
        onPress={() => navigation.navigate("HomeScreen")}
        style={tw`bg-gray-100 absolute top-5 left-8 z-50 p-3 rounded-full shadow-lg`}
      >
        <Icon name="arrow-back-outline" />
      </TouchableOpacity>

      <ScrollView style={tw`h-1/2`}>
        <FlashMessage position="top" style={{ width: 400, marginTop: 0 }} />
        {!showbottom && (
          <Image
            source={require("../assets/images/success.png")}
            style={{ width: 200, height: 200, marginTop: 100, marginLeft: 90 }}
          />
        )}

        <Text
          style={{
            marginLeft: 95,
            marginTop: 25,
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          {" "}
          GET SHELF INSIGHTS
        </Text>

        <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          <View style={{ height: 300, justifyContent: "center", alignItems: "center", marginTop: 30 }}>
            {showbottom && (
              <>
                <View
                  style={{
                    backgroundColor: "#eeee",
                    width: 200,
                    height: 200,
                    borderRadius: 0,

                    justifyContent: "center", alignItems: "center"
                  }}
                >
                  <Button
                    style={{
                      width: "100%",
                      marginTop: 16,
                      marginBottom: 20,
                      zIndex: 9999,

                    }}
                    icon="camera"
                    mode="contained"
                    onPress={() => {
                      setShowCamera(true);
                    }}
                  >
                    SCAN SHELF
                  </Button>

                  <Image
                    source={{ uri: image }}
                    style={{ width: 200, height: 200, borderRadius: 0 }}
                  />
                </View>
              </>
            )}
          </View>
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

        
      </ScrollView>

      <ScrollView vertical style={tw`h-1/2`}>
      <Animatable.View
        animation="fadeInUpBig"
        style={[
          styles.footer,
          {
            backgroundColor: "white",
            marginTop: 30,
            paddingBottom: 20,
            paddingLeft: 50,
            paddingRight: 50,
            borderRadius: 50,
            width: "90%",
            marginLeft: 20
          },
        ]}>
      <Text
          style={[
            styles.text_footer,
            {
              color: colors.text,
            },
          ]}>
          Username
        </Text>
        <View style={styles.action}>
          <Icon name="location-outline" color={colors.text} size={25} style={{marginBottom: 10}} />
          <TextInput
            autoCompleteType="username"
            placeholder={'Type In zone_aisle_section'}
            // value={data['username']}
            placeholderTextColor="#666666"
            style={[
              styles.textInput,
              {
                color: "black",
              },
            ]}
            autoCapitalize="none"
            onChangeText={val => textInputChange(val)}
            //onEndEditing={e => handleValidUser(e.nativeEvent.text)}
          />
          
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
        color={"#3B228A"}
      />
      <View style={styles.mailText}>
        <Text style={[styles.title, styles.bold]}>Store 5343 for LIQUID LAUNDRY</Text>
        <Text style={[styles.subTitle, styles.bold]}>
        Restock UPCs 45435343, 343534242 in Z-52-1 Shelf 2 {'\n'}{'\n'}

Restock 335353535 in Z-52-4 Shelf 4 {'\n'}{'\n'}

Restock 433535353 in Z-52-8 Shelf 1 {'\n'}
        </Text>
        <Text style={[styles.subTitle]}>
        IMPACT REALISATION OF $1000 
        </Text>
      </View>
    </View>
    </Animatable.View>


    <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Button
            style={{ width: "30%", marginTop: 16 }}
            icon="camera"
            mode="contained"
            onPress={() => {
              
              setshowbottom(false);
              showMessage({
                message: "TASK ANALYSIS IN PROGRESS",
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
                navigation.navigate("TaskApproval")
              }, 2000);
            }}
          >
            UPLOAD
          </Button>
        </View>

   
        </ScrollView>

    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  backgroundImage: {
    height: height * 0.6,
    justifyContent: 'space-between',
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
    borderBottomColor: '#f2f2f2',
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
});