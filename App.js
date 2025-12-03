import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FirstTimeService from './src/services/firstTimeService';
import CleanIAPService from './src/services/iapServiceClean';
import * as InAppPurchases from 'expo-in-app-purchases';
import { Alert } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PurchaseScreen from './src/screens/PurchaseScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LegalScreen from './src/screens/LegalScreen';

// Import language context
import { LanguageProvider } from './src/contexts/LanguageContext';

const Stack = createStackNavigator();

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    // GLOBAL IAP LISTENER
    console.log('App mounted, setting up IAP listener...');
    
    const setupIAP = async () => {
      try {
        // Connect
        await InAppPurchases.connectAsync();
        console.log('App.js: IAP Connected');
        
        // CLEANUP PENDING TRANSACTIONS - KRITIK!
        try {
          console.log('App.js: Checking for pending transactions...');
          const history = await InAppPurchases.getPurchaseHistoryAsync();
          
          if (history && history.results && history.results.length > 0) {
            console.log('App.js: Found', history.results.length, 'pending transactions, cleaning...');
            
            for (const purchase of history.results) {
              if (purchase && !purchase.acknowledged) {
                console.log('App.js: Finishing pending:', purchase.productId);
                await InAppPurchases.finishTransactionAsync(purchase, false);
              }
            }
            console.log('App.js: Cleanup done');
          } else {
            console.log('App.js: No pending transactions');
          }
        } catch (historyErr) {
          console.error('App.js: History cleanup error:', historyErr);
        }
        
        // SET LISTENER
        InAppPurchases.setPurchaseListener(async (result) => {
          console.log('App.js: LISTENER TRIGGERED', result?.responseCode);
          
          // DEBUG ALERT
          try {
            Alert.alert('🔔 APP LISTENER', `Code: ${result?.responseCode}`);
          } catch (e) {}
          
          if (result && result.responseCode === InAppPurchases.IAPResponseCode.OK) {
            if (result.results && result.results.length > 0) {
              for (const purchase of result.results) {
                console.log('App.js: Processing purchase', purchase.productId);
                // Delegate to Service
                await CleanIAPService.handleSuccessfulPurchase(purchase);
              }
            }
          } else if (result?.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            console.log('App.js: User canceled');
          } else {
             console.log('App.js: Other response', result?.responseCode);
          }
        });
      } catch (e) {
        console.error('App.js: IAP Setup error:', e);
      }
    };
    
    setupIAP();
    
    checkFirstLaunch();
  }, []);

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
            <Stack.Screen name="Purchase" component={PurchaseScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Legal" component={LegalScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </LanguageProvider>
    </SafeAreaProvider>
  );
} 