import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FirstTimeService from './src/services/firstTimeService';
import RevenueCatService from './src/services/revenueCatService';
import { Alert } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CreditsStoreScreen from './src/screens/CreditsStoreScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LegalScreen from './src/screens/LegalScreen';

// Import language context
import { LanguageProvider } from './src/contexts/LanguageContext';

const Stack = createStackNavigator();

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    // Initialize RevenueCat on app startup
    initializeRevenueCat();
    
    checkFirstLaunch();
  }, []);

  const initializeRevenueCat = async () => {
    try {
      console.log('App: Initializing RevenueCat...');
      await RevenueCatService.initialize();
      console.log('App: RevenueCat initialized successfully');
    } catch (error) {
      console.error('App: RevenueCat initialization error:', error);
    }
  };

  const checkFirstLaunch = async () => {
    try {
      const isFirst = await FirstTimeService.isFirstLaunch();
      setIsFirstLaunch(isFirst);
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(false);
    }
  };

  // Loading state
  if (isFirstLaunch === null) {
    return null; // You could show a splash screen here
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName={isFirstLaunch ? "Onboarding" : "Home"}
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="CreditsStore" component={CreditsStoreScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Legal" component={LegalScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </LanguageProvider>
    </SafeAreaProvider>
  );
} 