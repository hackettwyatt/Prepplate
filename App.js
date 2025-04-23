import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./screens/firebaseConfig"; 
import { ActivityIndicator, View } from "react-native";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";

import HomeScreen from "./screens/HomeScreen";
import Meals from "./screens/meals";
import Ingredients from "./screens/ingredients";
import Profile from "./screens/Profile";
import CalendarApp from "./screens/Calendar";

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['com.wyatth.mealplanner://'],
  config: {
    screens: {
      Login: 'Login',
      Home: 'Home',
      Profile: 'Profile',
      Calendar: 'Calendar',
      Meals: 'Meals',
      Ingredients: 'Ingredients',
    },
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); 
      setLoading(false); 
    });

    return unsubscribe; 
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Meals" component={Meals} />
            <Stack.Screen name="Ingredients" component={Ingredients} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="Calendar" component={CalendarApp} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
