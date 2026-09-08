import React, { useState, useEffect, Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';
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

/**
 * Crash Guard Error Boundary
 * Catches any unexpected render errors and provides an elegant recovery interface
 * instead of letting Android abruptly terminate the application process.
 */
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[DivideAndRule:CrashGuard]', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRestart?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#051B14" />
          <Text style={errorStyles.icon}>✦</Text>
          <Text style={errorStyles.title}>Divide & Rule</Text>
          <Text style={errorStyles.subtitle}>
            An unexpected error occurred. Tap below to reload.
          </Text>
          {this.state.error?.message ? (
            <Text style={errorStyles.details} numberOfLines={3}>
              {this.state.error.message}
            </Text>
          ) : null}
          <TouchableOpacity
            style={errorStyles.button}
            onPress={this.handleRestart}
            activeOpacity={0.85}
          >
            <Text style={errorStyles.buttonText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function MainNavigator() {
  const [currentScreen, setCurrentScreen] = useState('Splash');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const { checkSession } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const token = await checkSession();
        setTimeout(() => {
          if (!isMounted) return;
          if (token) {
            setCurrentScreen('Home');
          } else {
            setCurrentScreen('Login');
          }
        }, 1200);
      } catch (e) {
        if (isMounted) setCurrentScreen('Login');
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Universal Navigation Bridge
  const navigation = {
    navigate: (screenName, params = {}) => {
      if (params?.tripId) setSelectedTripId(params.tripId);
      if (screenName === 'MainTabs' || screenName === 'Home') setCurrentScreen('Home');
      else if (screenName === 'Trips' || screenName === 'TripsHub') setCurrentScreen('Trips');
      else if (screenName === 'Friends') setCurrentScreen('Friends');
      else if (screenName === 'CreateTrip') setCurrentScreen('CreateTrip');
      else if (screenName === 'TripDetails') setCurrentScreen('TripDetails');
      else if (screenName === 'Login' || screenName === 'Welcome') setCurrentScreen('Login');
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
    },
  };

  return (
    <ErrorBoundary onRestart={() => setCurrentScreen('Login')}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background || '#051B14'} />

        {currentScreen === 'Splash' && (
          <SplashScreen navigation={navigation} />
        )}

        {currentScreen === 'Login' && (
          <LoginScreen
            navigation={navigation}
            onNavigateToSignup={() => setCurrentScreen('Signup')}
            onLoginSuccess={() => setCurrentScreen('Home')}
          />
        )}

        {currentScreen === 'Signup' && (
          <SignupScreen
            navigation={navigation}
            onNavigateToLogin={() => setCurrentScreen('Login')}
            onSignupSuccess={() => setCurrentScreen('Home')}
          />
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
          <TripDetailsScreen
            navigation={navigation}
            route={{ params: { tripId: selectedTripId } }}
          />
        )}

        {currentScreen === 'Friends' && (
          <FriendsScreen navigation={navigation} />
        )}
      </View>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainNavigator />
    </SafeAreaProvider>
  );
}

// Register the root component with Expo and React Native AppRegistry
registerRootComponent(App);
AppRegistry.registerComponent('main', () => App);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#051B14',
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#051B14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 48,
    color: '#00E599',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A1B0AB',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  details: {
    fontSize: 12,
    color: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#00E599',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: {
    color: '#051B14',
    fontWeight: '800',
    fontSize: 15,
  },
});
