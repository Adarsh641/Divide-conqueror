import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import { colors } from './src/config/colors';

// Screens
import SplashScreen from './src/screens/auth/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import HomeScreen from './src/screens/main/HomeScreen';
import TripsHubScreen from './src/screens/trips/TripsHubScreen';
import CreateTripScreen from './src/screens/trips/CreateTripScreen';
import TripDetailsScreen from './src/screens/trips/TripDetailsScreen';
import FriendsScreen from './src/screens/friends/FriendsScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Splash');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const { isAuthenticated, checkSession } = useAuthStore();

  useEffect(() => {
    async function init() {
      const token = await checkSession();
      setTimeout(() => {
        if (token) {
          setCurrentScreen('Home');
        } else {
          setCurrentScreen('Login');
        }
      }, 1500);
    }
    init();
  }, []);

  // Navigation Controller Mock
  const navigation = {
    navigate: (screenName, params = {}) => {
      if (params?.tripId) setSelectedTripId(params.tripId);
      if (screenName === 'MainTabs' || screenName === 'Home') setCurrentScreen('Home');
      else if (screenName === 'Trips' || screenName === 'TripsHub') setCurrentScreen('Trips');
      else if (screenName === 'Friends') setCurrentScreen('Friends');
      else if (screenName === 'CreateTrip') setCurrentScreen('CreateTrip');
      else if (screenName === 'TripDetails') setCurrentScreen('TripDetails');
      else if (screenName === 'Login') setCurrentScreen('Login');
      else if (screenName === 'Signup') setCurrentScreen('Signup');
      else setCurrentScreen(screenName);
    },
    replace: (screenName, params = {}) => {
      navigation.navigate(screenName, params);
    },
    goBack: () => {
      if (currentScreen === 'TripDetails' || currentScreen === 'CreateTrip') {
        setCurrentScreen('Trips');
      } else {
        setCurrentScreen('Home');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {currentScreen === 'Splash' && (
        <SplashScreen navigation={navigation} />
      )}

      {currentScreen === 'Login' && (
        <LoginScreen navigation={navigation} />
      )}

      {currentScreen === 'Signup' && (
        <SignupScreen navigation={navigation} />
      )}

      {currentScreen === 'Home' && (
        <HomeScreen navigation={navigation} />
      )}

      {currentScreen === 'Trips' && (
        <TripsHubScreen navigation={navigation} />
      )}

      {currentScreen === 'CreateTrip' && (
        <CreateTripScreen navigation={navigation} />
      )}

      {currentScreen === 'TripDetails' && (
        <TripDetailsScreen navigation={navigation} route={{ params: { tripId: selectedTripId } }} />
      )}

      {currentScreen === 'Friends' && (
        <FriendsScreen navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#051B14',
  },
});
