import AsyncStorage from '@react-native-async-storage/async-storage';

const saveData = async(tag, data) => {

  if (typeof(tag) != 'string') {
    tag = JSON.stringify(tag);
  }

  if (typeof(data) != 'string') {
    data = JSON.stringify(data);
  }

  let returnVal;
  try {
    await AsyncStorage.setItem(tag, data);
    console.log("GREAT SUCCESS");
    returnVal = 1; 
  } catch (err) {
    console.log("Error: ", err);
    returnVal =  0;
  }

  return returnVal;
};

export default saveData;