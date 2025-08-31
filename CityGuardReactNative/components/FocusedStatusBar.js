import React, {Component} from 'react';

import { StatusBar } from "react-native";
import { useIsFocused } from "@react-navigation/core";

// Focused Status Bar
const FocusedStatusBar = (props) => {
  const isFocused = useIsFocused();

  // Show Status Bar if focused
  return isFocused ? <StatusBar animated={true} {...props} hidden/> : null;
};

export default FocusedStatusBar;
