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
                                    1, 12, 7, 5, 3, 2, 1 
                                ],
                                color: (opacity = 1) => "#FFC200",
                            },

                            {
                                data: [
                                    1, 8, 3, 1, 2, 1, 1 
                                ],
                                color: (opacity = 1) => "#E6E6FA",
                            },
                            {
                                data: [
                                    1, 10, 5, 3, 1, 2, 2
                                ],
                                color: (opacity = 1) => "#7EF4CC",
                            },

                            
                        ],
                        legend: ['Fireman', 'Cleaner', 'Police'],
                    }}
                    width={360}
                    height={200}
                    yAxisInterval={2}
                    chartConfig={{
                        backgroundColor:"#FFF",
                        backgroundGradientFrom:"#FFF",
                        backgroundGradientTo:"#FFF",
                        decimalPlaces:2,
                        color:(opacity = 0) => "#d3d3d3",
                        labelColor:(opacity = 0) => `rgba(59,34,138, ${opacity})`,
                        style:{
                            borderRadius:16
                        },
                        propsForDots:{
                            r:'6',
                            strokeWidth:"2",
                            stroke:"#3B228A"
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