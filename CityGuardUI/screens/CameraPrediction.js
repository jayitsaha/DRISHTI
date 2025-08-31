import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

import { cameraWithTensors } from '@tensorflow/tfjs-react-native';

const textureDims = Platform.OS === 'ios' ?
  {
    height: 1920,
    width: 1080,
  } :
   {
    height: 1200,
    width: 1600,
  };

let frame = 0;
const computeRecognitionEveryNFrames = 60;

const TensorCamera = cameraWithTensors(Camera);

const initialiseTensorflow = async () => {
  await tf.ready();
  tf.getBackend();
  
}

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [detections, setDetections] = useState([]);
  const [detections1, setDetections1] = useState([]);

  const [net, setNet] = useState();
  const [net1, setNet1] = useState();

  const [boundingBoxes, setBoundingBoxes] = useState([0, 0, 0, 0]);  


  const handleCameraStream = (images) => {
    const loop = async () => {
      if(net) {
        if(frame % computeRecognitionEveryNFrames === 0){
          const nextImageTensor = images.next().value;
          if(nextImageTensor){
            const objects = await net.classify(nextImageTensor);
            const objects1 = await net1.detect(nextImageTensor);
            console.log(objects)
            console.log(objects1)
            if(objects && objects.length > 0){
              setDetections(objects.map(object => object.className));
              // setBoundingBoxes()
            }

            if(objects1 && objects1.length > 0){
              console.log(objects1[0].bbox[0])
              // let temp_arr = []

              setBoundingBoxes([objects1[0].bbox[0], objects1[0].bbox[1], objects1[0].bbox[2], objects1[0].bbox[3]]);

              // console.log(objects1.map(object => object.bbox))
              
              // setBoundingBoxes(objects1.map(object => object.bbox))
              // setBoundingBoxes()
            }

            
            tf.dispose([nextImageTensor]);
          }
        }
        frame += 1;
        frame = frame % computeRecognitionEveryNFrames;
      }

      requestAnimationFrame(loop);
    }
    loop();
  }

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      await initialiseTensorflow();
      setNet(await mobilenet.load({version: 1, alpha: 0.25}));
      setNet1(await cocoSsd.load());

    })();
  }, []);

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }
  if(!net){
    return <Text>Model not loaded</Text>;
  }

  return (
    <View style={styles.container}>
      <TensorCamera 
        style={styles.camera} 
        onReady={handleCameraStream}
        type={Camera.Constants.Type.back}
        cameraTextureHeight={textureDims.height}
        cameraTextureWidth={textureDims.width}
        resizeHeight={200}
        resizeWidth={152}
        resizeDepth={3}
        autorender={true}
      />

      
        
        <View style={{
        position: 'absolute',
        top: boundingBoxes[0],
        left: boundingBoxes[1],
        width: boundingBoxes[2]*2.2,
        height: boundingBoxes[1]* 10,
        borderWidth: 2,
        borderColor: 'red',
        zIndex: 99999
        
        }}/>
          
      {/* <View style={styles.text}>
      {detections.map((detection, index) => 
          <Text key={index}>{detection}</Text>
      )}
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  camera: {
    flex: 10,
    width: '100%',
  },
  
});