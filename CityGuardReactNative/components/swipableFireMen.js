import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableHighlight,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

import {SwipeListView} from 'react-native-swipe-list-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TextAvatar from './textAvatar';
import Icon from 'react-native-vector-icons/Ionicons';
import { useLocalNotification } from "./useLocalNotification";
import * as Notifications from "expo-notifications";
import { schedulePushNotification } from "./handle-local-notification";
import { Button } from "react-native";
import { useNavigation } from '@react-navigation/core';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});
//import Notifications from '../model/Notifications';
const Notifications_arr = [

//            {
//              title: 'Quora Digest',
//              subTitle: 'Is becoming an engineering manager right for you?',
//              avatarText: 'Q',
//              avatarColor: '#313552',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Coursera',
//              subTitle: 'Trending this week at Coursera',
//              avatarText: 'C',
//              avatarColor: '#2EB086',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Codementor',
//              subTitle: 'Is becoming an engineering manager right for you?',
//              avatarText: 'C',
//              avatarColor: '#96CEB4',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'foodpanda',
//              subTitle: 'Tk. 70 off home made meals! ',
//              avatarText: 'F',
//              avatarColor: '#FFEEAD',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Codementor',
//              subTitle: 'Is becoming an engineering manager right for you?',
//              avatarText: 'C',
//              avatarColor: '#D9534F',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Quora Digest',
//              subTitle: 'Is becoming an engineering manager right for you?',
//              avatarText: 'Q',
//              avatarColor: '#FFAD60',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Coursera',
//              subTitle: 'Trending this week at Coursera',
//              avatarText: 'C',
//              avatarColor: '#CCD1E4',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Codementor',
//              subTitle: 'Is becoming an engineering manager right for you?',
//              avatarText: 'C',
//              avatarColor: '#FE7E6D',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'foodpanda',
//              subTitle: 'Tk. 70 off home made meals! ',
//              avatarText: 'F',
//              avatarColor: '#FFEEAD',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Codementor',
//              subTitle: 'Is becoming an engineering manager right for you?',
//              avatarText: 'C',
//              avatarColor: '#D9534F',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Quora Digest',
//              subTitle: 'Is becoming an engineering manager right for you?',
//              avatarText: 'Q',
//              avatarColor: '#FFAD60',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Coursera',
//              subTitle: 'Trending this week at Coursera',
//              avatarText: 'C',
//              avatarColor: '#CCD1E4',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
//            {
//              title: 'Codementor',
//              subTitle: 'Is becoming an engineering manager right for you?',
//              avatarText: 'C',
//              avatarColor: '#FE7E6D',
//              description: 'Lorem Ipsum is simply dummy text of the printing and typese',
//            },
      ];
const NotificationScreen = ({navigation}) => {


const navigations = useNavigation();

useLocalNotification();
  const handleLocalPushNotification = async (title, subtitle, body) => {
    await schedulePushNotification(title, subtitle, body);
  };

  const [listData, setListData] = useState(
    Notifications_arr.map((NotificationItem, index) => ({
      key: `${index}`,
      title: NotificationItem.title,
      details: NotificationItem.description,
      avatarText: NotificationItem.avatarText,
      avatarColor: NotificationItem.avatarColor,
      subTitle: NotificationItem.subTitle


    })),
  );

//  console.log(listData)

useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://192.168.1.17:3000/api/data_fire');
                const data = await response.json();
                console.log(data);

                setListData(data);

                // Map each data item to a promise returned by handleLocalPushNotification
                const notificationPromises = data.map(async (data_item, index) => {
                    await new Promise(resolve => setTimeout(resolve, 5000 * index)); // Delay 5 seconds multiplied by the index
                    await handleLocalPushNotification(data_item.title, data_item.subTitle, data_item.description);
                });

                // Wait for all notifications to complete before setting list data
                await Promise.all(notificationPromises);


            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

  const closeRow = (rowMap, rowKey) => {
    if (rowMap[rowKey]) {
      rowMap[rowKey].closeRow();
    }
  };

  const deleteRow = (rowMap, rowKey) => {
    closeRow(rowMap, rowKey);
    const newData = [...listData];
    const prevIndex = listData.findIndex(item => item.key === rowKey);
    newData.splice(prevIndex, 1);
    setListData(newData);
  };

  const onRowDidOpen = rowKey => {
    console.log('This row opened', rowKey);
  };

  const onLeftActionStatusChange = rowKey => {
    console.log('onLeftActionStatusChange', rowKey);
  };

  const onRightActionStatusChange = rowKey => {
    console.log('onRightActionStatusChange', rowKey);
  };

  const onRightAction = rowKey => {
    console.log('onRightAction', rowKey);
    navigations.navigate('FiremanViewTask', {
      username: 'username',
      jwt: 'token',
    });
  };

  const onLeftAction = rowKey => {
    console.log('onLeftAction', rowKey);
  };

  const VisibleItem = props => {
    const {
      data,
      rowHeightAnimatedValue,
      removeRow,
      leftActionState,
      rightActionState,
    } = props;

    if (rightActionState) {
      Animated.timing(rowHeightAnimatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        removeRow();
      });
    }

    return (

      <Animated.View style={styles.row}>
                <TextAvatar
                  size={38}
                  fontSize={18}
                  text={data.item.avatarText}
                  color={data.item.avatarColor}
                />
                <View style={styles.mailText}>
                  <Text style={[styles.title, styles.bold]}>{data.item.title}</Text>
                  <Text style={[styles.subTitle]} numberOfLines={8}>
                    {data.item.subTitle}
                  </Text>
                  <Text styles={[styles.subTitle]} numberOfLines={4}>
                    {data.item.description}
                  </Text>
                </View>
              </Animated.View>
    );


  };

  const renderItem = (data, rowMap) => {
    const rowHeightAnimatedValue = new Animated.Value(60);

    return (
      <VisibleItem
        data={data}
        rowHeightAnimatedValue={rowHeightAnimatedValue}
        removeRow={() => deleteRow(rowMap, data.item.key)}
      />
    );
  };

  const HiddenItemWithActions = props => {
    const {
      swipeAnimatedValue,
      leftActionActivated,
      rightActionActivated,
      rowActionAnimatedValue,
      rowHeightAnimatedValue,
      onClose,
      onDelete,
    } = props;

    if (rightActionActivated) {
      Animated.spring(rowActionAnimatedValue, {
        toValue: 500,
        useNativeDriver: false
      }).start();
    } else {
      Animated.spring(rowActionAnimatedValue, {
        toValue: 75,
        useNativeDriver: false
      }).start();
    }

    return (
      <Animated.View style={[styles.rowBack, {height: rowHeightAnimatedValue}]}>
        <Text>Left</Text>
        {!leftActionActivated && (
          <TouchableOpacity
            style={[styles.backRightBtn, styles.backRightBtnLeft]}
            onPress={onClose}>
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={25}
              style={styles.trash}
              color="#fff"
            />
          </TouchableOpacity>
        )}
        {!leftActionActivated && (
          <Animated.View
            style={[
              styles.backRightBtn,
              styles.backRightBtnRight,
              {
                flex: 1,
                width: rowActionAnimatedValue,
              },
            ]}>
            <TouchableOpacity
              style={[styles.backRightBtn, styles.backRightBtnRight]}
              onPress={onDelete}>
              <Animated.View
                style={[
                  styles.trash,
                  {
                    transform: [
                      {
                        scale: swipeAnimatedValue.interpolate({
                          inputRange: [-90, -45],
                          outputRange: [1, 0],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}>


                <Icon name="ios-checkmark" size={25} color="#fff" />

              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const renderHiddenItem = (data, rowMap) => {
    const rowActionAnimatedValue = new Animated.Value(75);
    const rowHeightAnimatedValue = new Animated.Value(60);

    return (
      <HiddenItemWithActions
        data={data}
        rowMap={rowMap}
        rowActionAnimatedValue={rowActionAnimatedValue}
        rowHeightAnimatedValue={rowHeightAnimatedValue}
        onClose={() => closeRow(rowMap, data.item.key)}
        onDelete={() => {
          deleteRow(rowMap, data.item.key)
          navigations.navigate('FiremanViewTask', {
            username: 'username',
            jwt: 'token',
          });
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden barStyle="dark-content"/>
      {/* <StatusBar backgroundColor="#FF6347" barStyle="light-content"/> */}
      <SwipeListView
        data={listData}
        renderItem={renderItem}
        renderHiddenItem={renderHiddenItem}
        leftOpenValue={75}
        rightOpenValue={-150}
        disableRightSwipe
        onRowDidOpen={onRowDidOpen}
        leftActivationValue={100}
        rightActivationValue={-200}
        leftActionValue={0}
        rightActionValue={-500}
        onLeftAction={onLeftAction}
        onRightAction={onRightAction}
        onLeftActionStatusChange={onLeftActionStatusChange}
        onRightActionStatusChange={onRightActionStatusChange}
      />


    </View>


  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  backTextWhite: {
    color: '#FFF',
  },
  rowFront: {
    backgroundColor: '#FFF',
    borderRadius: 5,
    height: 60,
    margin: 5,
    marginBottom: 15,
    shadowColor: '#999',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  rowFrontVisible: {
    backgroundColor: '#FFF',
    borderRadius: 5,
    height: 60,
    padding: 10,
    marginBottom: 15,
  },
  rowBack: {
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 15,
    margin: 5,
    marginBottom: 15,
    borderRadius: 5,
  },
  backRightBtn: {
    alignItems: 'flex-end',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 75,
    paddingRight: 17,
  },
  backRightBtnLeft: {
    backgroundColor: '#CCD1E4',
    right: 75,
  },
  backRightBtnRight: {
    backgroundColor: '#96CEB4',
    right: 0,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  trash: {
    height: 25,
    width: 25,
    marginRight: 7,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#666',
  },
  details: {
    fontSize: 12,
    color: '#999',
  },

  row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: '#FFCC99',
      borderRadius: 23,
      marginBottom: 10
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
      marginTop: 10,

    },
    subTitle: {
      fontSize: 15,
      marginTop: 10,
      marginBottom: 10,
    },
});
