import React, {Component} from 'react';

import { View, Text, Image, TextInput } from "react-native";

import { COLORS, FONTS, SIZES, assets } from "../constants_nft";
import { Button } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

// Home Header
const HomeHeader = ({ onSearch }) => {
  const navigation = useNavigation();

  return (
    <View
      style={{
        backgroundColor: "#3B228A",
        padding: SIZES.font,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20
        }}
      >
        {/* Brand Logo */}
        <Text style={{
          fontFamily: FONTS.regular,
          fontSize: SIZES.Large,
          color: COLORS.white}}>SUPPLIER DASHBOARD </Text>

        <View style={{ width: 45, height: 45 }}>
          {/* Avatar */}
          <Image
            source={assets.person01}
            resizeMode="contain"
            style={{ width: "100%", height: "100%" }}
          />

          {/* Verfied Badge */}
          <Image
            source={assets.badge}
            resizeMode="contain"
            style={{
              position: "absolute",
              width: 15,
              height: 15,
              bottom: 0,
              right: 0,
            }}
          />
        </View>
      </View>

      

      <View style={{ marginTop: SIZES.font }}>
        <View
          style={{
            width: "100%",
            borderRadius: SIZES.font,
            backgroundColor: "white",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: SIZES.font,
            paddingVertical: SIZES.small - 2,
          }}
        >
          {/* Search Icon */}
          <Image
            source={assets.search}
            resizeMode="contain"
            style={{ width: 20, height: 20, marginRight: SIZES.base }}
          />

          {/* Search Input */}
          <TextInput
            placeholder="Filter Based on Store and Category"
            style={{ flex: 1 }}
            onChangeText={onSearch}
          />
        </View>
        <Button
            style={{ width: "100%", marginTop: 16 }}
            icon="view-module-outline"
            mode="contained"
            onPress={() => {

              navigation.navigate("AcceptRejection")
              
            }}
          >
            GENERATE TASKS
          </Button>
      </View>
    </View>
  );
};

export default HomeHeader;
