import React, {Component} from 'react';
import {View,Dimensions} from 'react-native'
import {LineChart } from 'react-native-chart-kit'

export default class Chart extends Component{
    render(){
        return(
            <View style={{
//                marginHorizontal:20,
                marginTop:35
            }}>
               <LineChart

//                    withHorizontalLabels={false}
                    data={{
                        labels:["mon","tue","wed","thu", "fri", "sat", "sun"],
                        datasets: [
                            {
                                data: [
                                    3, 7, 5, 4, 5, 7, 5 
                                ],
                            },
                        ],
                    }}
                    width={400}
                    height={200}
                    yAxisInterval={2}
                    chartConfig={{
                        backgroundColor:"#FFF",
                        backgroundGradientFrom:"#FFF",
                        backgroundGradientTo:"#FFF",
                        decimalPlaces:2,
                        color:(opacity = 0) => `rgba(93, 144, 73, ${opacity})`,
                        labelColor:(opacity = 0) => `rgba(59,34,138, ${opacity})`,
                        style:{
                            borderRadius:16
                        },
                        propsForDots:{
                            r:'6',
                            strokeWidth:"2",
                            stroke:"rgba(153, 204, 133, 1)"
                        },
                    }}
                    bezier
                    style={{
                        marginVertical:8,
                        borderRadius:16
                    }}
                    
               />
            </View>
        )
    }
}