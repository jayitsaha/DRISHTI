import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Dimensions, TextInput } from "react-native";
import * as Animatable from 'react-native-animatable';
import Icon from '@expo/vector-icons/Ionicons'
import { DataTable } from 'react-native-paper';
import { Button } from "react-native-paper";
import { SafeAreaView, Modal, Image, ScrollView } from "react-native";
import tw from "tailwind-react-native-classnames";


const MyComponent = () => {
  const [page, setPage] = useState(0);
  const [numberOfItemsPerPageList] = useState([2, 3, 4]);
  const [itemsPerPage, onItemsPerPageChange] = useState(
    numberOfItemsPerPageList[0]
  );
  const height = Dimensions.get('window').height;


  const [items] = useState([
   {
     key: 1,
     name: 'Overall',
     calories: 43,
     
   },
   {
     key: 2,
     name: 'Breakdown',
     calories: "",
     
   },
   {
     key: 3,
     name: 'No Shelf Availability',
     calories: 9,
   },
   {
     key: 4,
     name: 'Partial OSA',
     calories: 9,
   },

   {
    key: 5,
    name: 'Mod Non-Compliance',
    calories: 57,
  },

  {
    key: 6,
    name: '        Wanderers',
    calories: 47,
  },


  {
    key: 7,
    name: '        Invaders',
    calories: 10,
  },


  {
    key: 8,
    name: 'PTM (Price Tag Missing)',
    calories: 0,
  },
  ]);
  
  const [items_after] = useState([
    {
      key: 1,
      name: 'Overall',
      calories: 85,
      
    },
    {
      key: 2,
      name: 'Breakdown',
      calories: "",
      
    },
    {
      key: 3,
      name: 'No Shelf Availability',
      calories: 0,
    },
    {
      key: 4,
      name: 'Partial OSA',
      calories: 4,
    },
 
    {
     key: 5,
     name: 'Mod Non-Compliance',
     calories: 6,
   },
 
   {
     key: 6,
     name: '        Wanderers',
     calories: 0,
   },
 
 
   {
     key: 7,
     name: '        Invaders',
     calories: 6,
   },
 
 
   {
     key: 8,
     name: 'PTM (Price Tag Missing)',
     calories: 0,
   },
   ]);

   const [add_insights] = useState([
    {
      key: 1,
      name: 'UPCs 45435346767 <Provide Actual UPCs> missing 50% facings in in Z-52-1 Shelf 2 - Restock',
      calories: 85,
      
    },
    {
      key: 2,
      name: ' UPC 8655546 in Z-52-1 Shelf 3 does not belong to this Mod Category - Remove',
      calories: "",
      
    },
    
   ]);
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, items.length);

  useEffect(() => {
    setPage(0);
  }, [itemsPerPage]);

  return (


    <Animatable.View
        animation="fadeInUpBig"
        style={{marginTop: 30}}
        >
      <View style={styles.row}>
      
      <View style={styles.mailText}>
        <Text style={[styles.title, styles.bold]}>TASK COMPLETION VERIFICATION: <Text style={{color: "green"}}>PASSED</Text> </Text>
        
      </View>
    </View>

    <ScrollView style={{height: 700}}>

    <Button
        style={{
            width: "80%",
            marginTop: 26,
            marginBottom: 20,
            zIndex: 9999,
            backgroundColor: "#3B228A",
            alignSelf: "center"

        }}
        icon="library-shelves"
        mode="contained"
        >
        SHELF BEFORE
    </Button>
    <DataTable>
      <DataTable.Header style={{backgroundColor: "#EAE8F3"}}>
      <DataTable.Title><Text style={{fontSize: 15, color:"black", fontWeight: 'bold',}}>Section Health</Text></DataTable.Title>
        <DataTable.Title numeric><Text style={{fontSize: 15, color:"black", fontWeight: 'bold',}}>Score</Text></DataTable.Title>
      </DataTable.Header>

      {items.slice(0, items.length).map((item) => (
        <DataTable.Row key={item.key} >
          <DataTable.Cell ><Text style={{fontWeight: 'bold',}}>{item.name}</Text></DataTable.Cell>
          {item.name === "Overall" ? <DataTable.Cell numeric>
            <Text style={{color: "red"}}>{item.calories}</Text>
            <Text style={{color: "red"}}>{"%"}</Text>
        </DataTable.Cell> : (
        <DataTable.Cell numeric>
            {item.calories}
            {item.name == "Breakdown"? "": "%"}
  </DataTable.Cell>
)}
        </DataTable.Row>
      ))}

      
    </DataTable>



    <Button
        style={{
            width: "80%",
            marginTop: 26,
            marginBottom: 20,
            zIndex: 9999,
            backgroundColor: "#3B228A",
            alignSelf: "center"

        }}
        icon="library-shelves"
        mode="contained"
        >
        SHELF AFTER
        </Button>
    <DataTable>
      <DataTable.Header style={{backgroundColor: "#EAE8F3"}}>
        <DataTable.Title><Text style={{fontSize: 15, color:"black", fontWeight: 'bold',}}>Section Health</Text></DataTable.Title>
        <DataTable.Title numeric><Text style={{fontSize: 15, color:"black", fontWeight: 'bold',}}>Score</Text></DataTable.Title>
      </DataTable.Header>

      {items_after.slice(0, items_after.length).map((item) => (
        <DataTable.Row key={item.key}>
          <DataTable.Cell ><Text style={{fontWeight: 'bold',}}>{item.name}</Text></DataTable.Cell>
          {item.name === "Overall" ? <DataTable.Cell numeric>
            <Text style={{color: "green"}}>{item.calories}</Text>
            <Text style={{color: "green"}}>{"%"}</Text>
        </DataTable.Cell> : (
        <DataTable.Cell numeric>
            {item.calories}
            {item.name == "Breakdown"? "": "%"}
  </DataTable.Cell>
)}
        </DataTable.Row>
      ))}

      
    </DataTable>



    <Button
        style={{
            width: "80%",
            marginTop: 26,
            marginBottom: 20,
            zIndex: 9999,
            backgroundColor: "#3B228A",
            alignSelf: "center"

        }}
        icon="magnify"
        mode="contained"
        >
        ADDITIONAL ACTIONS
        </Button>
    <DataTable>
      

      {add_insights.slice(0, add_insights.length).map((item) => (
        <DataTable.Row key={item.key}>
          <DataTable.Cell ><Text style={{fontWeight: 'bold', marginBottom: 20}}>{item.name}</Text></DataTable.Cell>
        </DataTable.Row>
      ))}

      
    </DataTable>


    <Button
    icon="check-bold"
    style={{ marginLeft: 0, marginBottom: 60, width: "80%", alignSelf: "center", marginTop: 15 }}
    mode="outlined"
    color="white"
    onPress={() => {
        setShowCamera(false);
    }}
    >
    COMPLETE
    </Button>
    

    </ScrollView>


    </Animatable.View>
    
  );
};

export default MyComponent;

const styles = StyleSheet.create({
    
  
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 20,
      backgroundColor: 'white',
      width: "90%",
      marginLeft: 20,
      borderRadius: 50,
      marginTop: 30
    },
    mailText: {
    
      marginLeft: 15,
      width: '100%',
    },
    bold: {
      fontWeight: 'bold',
    },
    title: {
      fontSize: 12,
    },
    subTitle: {
      fontSize: 13,
    },
    ext_header: {
      color: '#fff',
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: 30,
    },
    text_footer: {
      color: '#05375a',
      fontSize: 18,
    },
    action: {
      flexDirection: 'row',
      marginTop: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f2f2f2',
      paddingBottom: 5,
    },
    actionError: {
      flexDirection: 'row',
      marginTop: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#FF0000',
      paddingBottom: 5,
    },
    textInput: {
      flex: 1,
      marginTop: Platform.OS === 'ios' ? 0 : -12,
      paddingLeft: 10,
      color: '#05375a',
    },
  });