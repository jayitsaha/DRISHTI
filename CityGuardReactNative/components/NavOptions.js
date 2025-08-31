import React from 'react';
import { TouchableOpacity, FlatList, Text, View, Image, StyleSheet } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import Icon from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/core';
import { useSelector } from 'react-redux';
import { selectOrigin } from '../slices/navSlice';

const data = [
  {
    id: '123',
    title: 'Tasks List',
    image: 'https://links.papareact.com/3pn',
    screen: 'FieldTasks',
    icon: 'notifications-outline'
  },

  // {
  //     id: '568',
  //     title: 'Map View',
  //     image: 'https://links.papareact.com/3pn',
  //     screen: 'MapView',
  //     icon: 'compass-outline'

  //   },


];

const NavOptions = () => {
  const navigation = useNavigation();
  const origin = useSelector(selectOrigin);

  return (
    <FlatList
      data={data}
      horizontal
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate(item.screen)}
          style={tw` w-48 h-40`}
          horizontal
          >
          <View style={styles.centered}>

            <Text style={tw`mt-2 text-lg font-semibold`}>{item.title}</Text>
            <Icon
              style={tw`p-2 bg-violet-900 rounded-full w-13 mt-4`}
              name={item.icon}
              size={35}
              color="rgba(93, 144, 73, 1.0)"
            />
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

export default NavOptions;


const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
//    backgroundColor: "#ffc2c2",
  },
  title: {
    fontSize: 18,
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
  },
});