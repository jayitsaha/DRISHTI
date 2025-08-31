// import React, { useState } from 'react';
// import { Button, StyleSheet, Text, View } from 'react-native';
// import { Video } from 'expo-video';
// import { MediaLibrary } from 'expo-media-library';

// const App = () => {
//   const [videoURI, setVideoURI] = useState('');

//   async function saveVideo() {
//     const { status } = await MediaLibrary.saveToLibraryAsync(videoURI);
//     if (status !== 'success') {
//       // Handle error
//     }
//   }

//   async function getVideoURI() {
//     const assets = await MediaLibrary.getAssetsAsync({
//       mediaType: 'video',
//     });
//     const videoURI = assets[0].uri;
//     return videoURI;
//   }

//   return (
//     <View>
//       {/* <Video
//         source={{ uri: videoURI }}
//         style={{ width: 300, height: 300 }}
//       /> */}
//       <Button title="Save video" onPress={saveVideo} />
//       <Button title="Use saved video" onPress={() => {
//         const videoURI = getVideoURI();
//         setVideoURI(videoURI);
//       }} />
//     </View>
//   );
// };

// export default App;


import React from 'react';

import { StyleSheet, Text, View, Button, SafeAreaView } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { Camera } from 'expo-camera';
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

export default function App() {
  let cameraRef = useRef();
  const [hasCameraPermission, setHasCameraPermission] = useState();
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState();
  const [isRecording, setIsRecording] = useState(false);
  const [video, setVideo] = useState();
  const [videoURI, setVideoURI] = useState('');


  

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const microphonePermission = await Camera.requestMicrophonePermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();

      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMicrophonePermission(microphonePermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
    let x = await AsyncStorage.getItem('audio_file')
    console.log(x)
    const sound = new Audio.Sound();
    await sound.loadAsync({ x });
    await sound.playAsync();
    })();
  }, []);

  if (hasCameraPermission === undefined || hasMicrophonePermission === undefined) {
    return <Text>Requestion permissions...</Text>
  } else if (!hasCameraPermission) {
    return <Text>Permission for camera not granted.</Text>
  }

  let recordVideo = () => {
    setIsRecording(true);
    let options = {
      quality: "1080p",
      maxDuration: 60,
      mute: false
    };

    cameraRef.current.recordAsync(options).then((recordedVideo) => {
      setVideo(recordedVideo);
      setIsRecording(false);
    });
  };

  let stopRecording = () => {
    setIsRecording(false);
    cameraRef.current.stopRecording();
  };


  async function playAudio(){
    const assets = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: ["audio"],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    const audioUri = assets.assets[0].uri;

    console.log(assets)

    const playbackObject = new Audio.Sound();
    await playbackObject.loadAsync({ uri: audioUri});
    await playbackObject.playAsync();

  }

  async function getVideoURI() {
    const assets = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: ["video"],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    const videoURI = assets.assets[0].uri;
    setVideoURI(videoURI)
    return videoURI;
  }

  if (video) {
    let shareVideo = () => {
      shareAsync(video.uri).then(() => {
        setVideo(undefined);
      });
    };

    let saveVideo = () => {
      MediaLibrary.saveToLibraryAsync(video.uri).then(() => {
        setVideo(undefined);
      });
    };

    

    return (
      <SafeAreaView style={styles.container}>
        <Video
          style={styles.video}
          source={{uri: video.uri}}
          useNativeControls
          resizeMode='contain'
          isLooping
        />
        {hasMediaLibraryPermission ? <Button title="Save" onPress={saveVideo} /> : undefined}
        <Button title="Discard" onPress={() => setVideo(undefined)} />
      </SafeAreaView>
    );
  }

  return (
    // <Camera style={styles.container} ref={cameraRef}>
    //   <View style={styles.buttonContainer}>
    //     <Button title={isRecording ? "Stop Recording" : "Record Video"} onPress={isRecording ? stopRecording : recordVideo} />
    //   </View>
    // </Camera>
<View>
    {<Video
        source={{ uri: videoURI }}
        style={{ width: 300, height: 300 }}
        useNativeControls
        resizeMode="contain"
        isLooping
        autoplay={true}
      />}
      <Button title="Use saved video" onPress={() => {
        const videoURI = getVideoURI();
        
      }} />

    <Button title="Play Audio" onPress={() => {
        const videoURI = playAudio();
        
      }} />




</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    backgroundColor: "#fff",
    alignSelf: "flex-end"
  },
  video: {
    flex: 1,
    alignSelf: "stretch"
  }
});