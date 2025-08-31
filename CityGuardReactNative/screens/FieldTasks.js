import {View, StyleSheet, SafeAreaView} from 'react-native';
import React from 'react';
import Header from '../components/header';
import Card from '../components/card';
import Swipable from '../components/swipable1';
import {FlatList} from 'react-native-gesture-handler';

const data = [
  {
    title: 'foodpanda',
    subTitle: 'Tk. 70 off home made meals! ',
    avatarText: 'F',
    avatarColor: '#219F94',
    description: 'Lorem Ipsum is simply dummy text of the printing and typese',
  },

];

const AcceptReject = () => {
  return (
    <>
      <SafeAreaView style={style.container}>
        <View style={{paddingHorizontal: 10, paddingTop: 40}}>
          <Header />
          <FlatList
            data={data}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({item}) => (
              <>
                <Swipable backgroundColor={item.avatarColor}>
                  <Card {...item} />
                </Swipable>
              </>
            )}
          />
        </View>
      </SafeAreaView>
    </>
  );
};

export default AcceptReject;

const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});

