import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../contexts/AuthContext";
import { navigationRef } from "./navigationRef";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import OtpVerifyScreen from "../screens/OtpVerifyScreen";
import HomeScreen from "../screens/HomeScreen";
import NetworkScreen from "../screens/NetworkScreen";
import ShopScreen from "../screens/ShopScreen";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import MemberDetailsScreen from "../screens/MemberDetailsScreen";
import ProductDetailsScreen from "../screens/ProductDetailsScreen"; // NEW
import CartScreen from "../screens/CartScreen"; // NEW
import CheckoutReviewScreen from "../screens/CheckoutReviewScreen";
import OrderPlacedScreen from "../screens/OrderPlacedScreen";
import WalletScreen from "../screens/WalletScreen";
import AddressScreen from "../screens/AddressScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderDetailsScreen from "../screens/OrderDetailsScreen";
import CmsScreen from "../screens/CmsScreen";
import DeleteAccountScreen from "../screens/DeleteAccountScreen";
import AboutUsScreen from "../screens/AboutUsScreen";
import ContactUsScreen from "../screens/ContactUsScreen";
import BottomBar from "../components/BottomBar";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FAF7F8" }}>
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
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FAF7F8",
        }}
      >
        <ActivityIndicator size="large" color="#E64A78" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "Main" : "Login"}
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="MemberDetails"
          component={MemberDetailsScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="ProductDetails"
          component={ProductDetailsScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="CheckoutReview"
          component={CheckoutReviewScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="OrderPlaced"
          component={OrderPlacedScreen}
          options={{ animation: "fade" }}
        />
        <Stack.Screen
          name="Shop"
          component={ShopScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="Wallet"
          component={WalletScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="Addresses"
          component={AddressScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="Orders"
          component={OrdersScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="OrderDetails"
          component={OrderDetailsScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="TermsConditions"
          component={CmsScreen}
          initialParams={{ type: 'terms' }}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={CmsScreen}
          initialParams={{ type: 'privacy' }}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="AboutUs"
          component={AboutUsScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="ContactUs"
          component={ContactUsScreen}
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="DeleteAccount"
          component={DeleteAccountScreen}
          options={{ animation: "slide_from_right" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
