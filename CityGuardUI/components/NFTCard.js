import React, {Component} from 'react';

import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Modal, Text,  ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import tw from "tailwind-react-native-classnames";
import { COLORS, SIZES, SHADOWS, assets } from "../constants_nft";
import {CircleButton} from "./ButtonNFT";
import {RectButton} from "./ButtonNFT";
import {SubInfo} from "./SubInfo";
import {EthPrice} from "./SubInfo";
import {NFTTitle}  from "./SubInfo";
const colors = {
  gray: '#D1D3D2',
  darkGray: '#676767',
  orange: '#F35D38',
  black: '#0C0D0E',
  white: '#FBFCFE',
};
const height = Dimensions.get('window').height;
  const width = Dimensions.get('window').width;
// NFT Card
const NFTCard = ({ data }) => {
  // initialize navigator
  const navigation = useNavigation();

  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: SIZES.font,
        marginBottom: SIZES.extraLarge,
        margin: SIZES.base,
        ...SHADOWS.dark,
      }}
    >
      <View style={{ width: "100%", height: 200 }}>
        <Image
          source={data.image}
          resizeMode="contain"
          style={{
            width: "100%",
            height: "100%",
            borderTopLeftRadius: SIZES.font,
            borderTopRightRadius: SIZES.font,

          }}
        />

        {/* Add to Favourite Button */}
        <CircleButton imgUrl={assets.heart} right={10} top={10} />
      </View>

      
      <View style={{ width: "100%", padding: SIZES.font }}>
        <NFTTitle
          title={data.name}
          // subTitle={data.creator}
          titleSize={SIZES.large}
          subTitleSize={SIZES.small}
        />

<View style={styles.infoWrapper}>
      <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>SHELF HEALTH SCORE</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>{data.SHOPPER}%</Text>
        </View>
      </View>
      <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>POTENTIAL DOLLAR IMPACT</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>${data.IMPACT}</Text>
        </View>
      </View>
      
    </View>

  <View style={styles.descriptionWrapper}>
    <View style={styles.infoWrapper}>
      <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>OSA</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>{data.OSA}%</Text>
        </View>
      </View>

      <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>OOS</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>{data.OOS}%</Text>
        </View>
      </View>

      <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>PTA</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>{data.PRIORITY}%</Text>
        </View>
      </View>
      {/* <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>INVADER</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>20%</Text>
        </View>
      </View> */}
      {/* <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>WANDERER</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>20%</Text>
        </View>
      </View> */}
    </View>

    {/* <View style={styles.infoWrapper}>
      
      <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>ITEM COUNT</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>5</Text>
        </View>
      </View>
      
    </View> */}


    {/* <View style={styles.infoWrapper}>
      <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>SHELF HEALTH SCORE</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>{data.SHELF}</Text>
        </View>
      </View>
      <View style={styles.infoItem}>
        <Text style={styles.infoTitle}>PRICE TAG AVAILABILITY</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoText}>{data.PRICE}</Text>
        </View>
      </View>
      
    </View> */}


    


  </View>

      </View>
    </View>
  );
};

export default NFTCard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  backgroundImage: {
    // height: height * 0.6,
    justifyContent: 'space-between',
  },
  descriptionWrapper: {
    flex: 1,
    backgroundColor: colors.white,
    marginTop: 0,
    borderRadius: 25,
    // height: height * 1,
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
    alignItems: 'center',
  },
  infoItem: {},
  infoTitle: {
    fontFamily: 'Lato-Bold',
    fontSize: 12,
    color: colors.black,
  },
  infoTextWrapper: {
    // flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  infoText: {
    fontFamily: 'Lato-Bold',
    fontSize: 24,
    color: "#3B228A",
  },
  infoSubText: {
    fontFamily: 'Lato-Bold',
    fontSize: 14,
    color: colors.gray,
  },
  buttonWrapper: {
    marginHorizontal: 20,
    marginTop: 40,
    backgroundColor: "#3B228A",
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    fontFamily: 'Lato-Bold',
    fontSize: 18,
    color: colors.white,
  },
});