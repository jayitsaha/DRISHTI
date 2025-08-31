import React from "react";
import { KeyboardAvoidingView, Platform, LogBox } from "react-native";
import { Provider } from "react-redux";
import { store } from "./store";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider } from "./contexts/AuthContext";
import FlashMessage from "react-native-flash-message";
import { useState } from "react";

// Import all screens
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import SignInScreen from "./screens/SignInScreen";
import SplashScreen from "./screens/SplashScreen";
import SignUpScreen from "./screens/SignUpScreen";
import Test from "./screens/Test";
import Rewards from "./screens/Rewards";
import AcceptReject from "./screens/AcceptReject";
import FieldTasks from "./screens/FieldTasks";
import TaskApproval from "./screens/TaskApproval";
import MapView from "./screens/MapView";

import HomeScreenPedestrian from "./screens/HomeScreenPedestrian";
import MapScreenPedestrian from "./screens/MapScreenPedestrian";
import SplashScreenPedestrian from "./screens/SplashScreenPedestrian";
import RewardsPedestrian from "./screens/RewardsPedestrian";

import UploadAnimation from "./screens/UploadAnimation";
import IntroductionAnimationScreen from "./screens/IntroductionAnimationScreen";
import CameraPrediction from "./screens/CameraPrediction";

import FiremanDashboard from "./screens/FiremanDashboard";
import AcceptRejectFiremen from "./screens/AcceptRejectFiremen";
import MapViewFireMan from "./screens/MapViewFireMan";
import FiremanViewTask from "./screens/FiremanViewTask";

import PoliceManDashboard from "./screens/PoliceManDashboard";
import AcceptRejectPoliceMan from "./screens/AcceptRejectPoliceMan";
import MapViewPoliceMan from "./screens/MapViewPoliceMan";
import PoliceManViewTask from "./screens/PoliceManViewTask";

import CleanerDashboard from "./screens/CleanerDashboard";
import CleanerUpload from "./screens/CleanerUpload";

import PedestrianUpload from "./screens/PedestrianUpload";
import PedestrianDashboard from "./screens/PedestrianDashboard";

// Gamification Screens
import BadgeProgressScreen from "./screens/BadgeProgressScreen";
import ProfilePage from "./screens/ProfilePage";
import BadgesScreen from "./screens/BadgesScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import OffersRedeem from "./screens/OffersRedeem";

import recordAudio from "./screens/recordAudio";
import recordVideo from "./screens/recordVideo";
// import MapViewGeoFencing from "./screens/MapScreenGeoFencingfoursquare";
// import MapViewGeoFencing from "./screens/MapScreenGeoFencing";
import MapViewGeoFencing from "./screens/MapScreenFSQ";

import CleanerViewTask from "./screens/CleanerViewTask";

export default function App() {
  const Stack = createStackNavigator();
  const [userType, setuserType] = useState("cleaner");
  LogBox.ignoreAllLogs();

  return (
    <Provider store={store}>
      <AuthProvider>
        <NavigationContainer>
          <SafeAreaProvider>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? -64 : 0}
            >
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                }}
                initialRouteName={"SignInScreen"}
              >
                <Stack.Screen
                  name="IntroductionAnimationScreen"
                  component={IntroductionAnimationScreen}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="FieldTasks"
                  component={FieldTasks}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="SignInScreen"
                  component={SignInScreen}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="AcceptRejection"
                  component={AcceptReject}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="TaskApproval"
                  component={TaskApproval}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="MapView"
                  component={MapView}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="SignUpScreen"
                  component={SignUpScreen}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="FiremanDashboard"
                  component={FiremanDashboard}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AcceptRejectFiremen"
                  component={AcceptRejectFiremen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="MapViewFireMan"
                  component={MapViewFireMan}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="FiremanViewTask"
                  component={FiremanViewTask}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="PoliceManDashboard"
                  component={PoliceManDashboard}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AcceptRejectPoliceMan"
                  component={AcceptRejectPoliceMan}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="MapViewPoliceMan"
                  component={MapViewPoliceMan}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="PoliceManViewTask"
                  component={PoliceManViewTask}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="CleanerDashboard"
                  component={CleanerDashboard}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="CleanerUpload"
                  component={CleanerUpload}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="PedestrianDashboard"
                  component={PedestrianDashboard}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="PedestrianUpload"
                  component={PedestrianUpload}
                  options={{ headerShown: false }}
                />

                {/* Gamification Screens */}
                <Stack.Screen
                  name="BadgeProgressScreen"
                  component={BadgeProgressScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="ProfilePage"
                  component={ProfilePage}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="BadgesScreen"
                  component={BadgesScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="LeaderboardScreen"
                  component={LeaderboardScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="OffersRedeem"
                  component={OffersRedeem}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="CameraPrediction"
                  component={CameraPrediction}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="MapViewGeoFencing"
                  component={MapViewGeoFencing}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="CleanerViewTask"
                  component={CleanerViewTask}
                  options={{ headerShown: false }}
                />

                

                <Stack.Screen name="Splash" component={SplashScreen} />

                {userType == "cleaner" && (
                  <>
                    <Stack.Screen
                      name="Rewards"
                      component={Rewards}
                      options={{ headerShown: false }}
                    />

                    <Stack.Screen
                      name="HomeScreen"
                      component={HomeScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="MapScreen"
                      component={MapScreen}
                      options={{ headerShown: false }}
                    />

                    <Stack.Screen
                      name="AcceptReject"
                      component={AcceptReject}
                      options={{ headerShown: false }}
                    />
                  </>
                )}

                {userType == "pedestrian" && (
                  <>
                    <Stack.Screen
                      name="RewardsPedestrian"
                      component={RewardsPedestrian}
                      options={{ headerShown: false }}
                    />

                    <Stack.Screen
                      name="HomeScreenPedestrian"
                      component={HomeScreenPedestrian}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="MapScreenPedestrian"
                      component={MapScreenPedestrian}
                      options={{ headerShown: false }}
                    />
                  </>
                )}
              </Stack.Navigator>
              <FlashMessage position="top" />
            </KeyboardAvoidingView>
          </SafeAreaProvider>
        </NavigationContainer>
      </AuthProvider>
    </Provider>
  );
}