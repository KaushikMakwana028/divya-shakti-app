import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OtpVerifyScreen from '../screens/OtpVerifyScreen';
import HomeScreen from '../screens/HomeScreen';
import NetworkScreen from '../screens/NetworkScreen';
import ShopScreen from '../screens/ShopScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MemberDetailsScreen from '../screens/MemberDetailsScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen'; // NEW
import CartScreen from '../screens/CartScreen'; // NEW
import BottomBar from '../components/BottomBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <View style={{ flex: 1, backgroundColor: '#FAF7F8' }}>
            <Tab.Navigator
                tabBar={(props) => <BottomBar {...props} />}
                screenOptions={{ headerShown: false }}
            >
                <Tab.Screen name="Home" component={HomeScreen} />
                <Tab.Screen name="Network" component={NetworkScreen} />
                <Tab.Screen name="Shop" component={ShopScreen} />
                <Tab.Screen name="Profile" component={ProfileScreen} />
            </Tab.Navigator>
        </View>
    );
}

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{ headerShown: false, animation: 'fade' }}
            >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen
                    name="MemberDetails"
                    component={MemberDetailsScreen}
                    options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                    name="ProductDetails"
                    component={ProductDetailsScreen}
                    options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                    name="Cart"
                    component={CartScreen}
                    options={{ animation: 'slide_from_bottom' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}