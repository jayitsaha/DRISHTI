import AsyncStorage from '@react-native-async-storage/async-storage';

const getData = async(tag) => {

  if (typeof(tag) != 'String') {
    tag = JSON.stringify(tag);
  }
  
  try {
      const data = await AsyncStorage.getItem(tag)
      if (data) {
        return data
      }
      return 0; 
  } catch (err) {
      console.log("error", err);
      return 0;
  }
};

export default getData;
