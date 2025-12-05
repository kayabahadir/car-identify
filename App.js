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

// Global flag to ignore listener during cleanup
let isCleanupPhase = true;

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    // GLOBAL IAP LISTENER - KRİTİK: HEMEN KUR!
    console.log('App mounted, setting up IAP listener...');
    
    // Reset cleanup flag
    isCleanupPhase = true;
    
    // LISTENER'I HEMEN KUR (async işlemlerden önce)
    try {
      InAppPurchases.setPurchaseListener(async (result) => {
        console.log('App.js: LISTENER TRIGGERED', result?.responseCode);
        console.log('App.js: Result:', JSON.stringify(result));
        
        // CRITICAL: Ignore listener during cleanup phase!
        if (isCleanupPhase) {
          console.log('App.js: IGNORED - Cleanup phase active');
          setTimeout(() => {
            Alert.alert('🛑 LISTENER IGNORED', 'Cleanup phase is active\nListener will activate after cleanup');
          }, 100);
          return;
        }
        
        // DEBUG ALERT - KRİTİK!
        setTimeout(() => {
          Alert.alert(
            '🔔 APP LISTENER TRIGGERED!', 
            `Code: ${result?.responseCode}\nResults: ${result?.results?.length || 0}\nError: ${result?.errorCode || 'none'}`
          );
        }, 100);
        
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
          Alert.alert('🚫 USER CANCELED', 'User canceled the purchase');
        } else {
          console.log('App.js: Other response', result?.responseCode);
          Alert.alert('⚠️ OTHER RESPONSE', `Code: ${result?.responseCode}`);
        }
      });
      console.log('App.js: Listener set!');
      Alert.alert('✅ LISTENER SET', 'Purchase listener is now set\n⏸️ Paused during cleanup phase');
    } catch (listenerErr) {
      console.error('App.js: Listener error:', listenerErr);
      Alert.alert('❌ LISTENER ERROR', listenerErr.message);
    }
    
    // SONRA async işlemleri yap
    const setupIAP = async () => {
      try {
        // Connect
        await InAppPurchases.connectAsync();
        console.log('App.js: IAP Connected');
        Alert.alert('✅ IAP CONNECTED', 'Connected to Apple IAP');
        
        // CLEANUP PENDING TRANSACTIONS - KRITIK! CONSUMABLE için consumeItem: true
        try {
          console.log('App.js: Checking for pending transactions...');
          const history = await InAppPurchases.getPurchaseHistoryAsync();
          
          if (history && history.results && history.results.length > 0) {
            console.log('App.js: Found', history.results.length, 'pending transactions, cleaning...');
            Alert.alert('🧹 CLEANUP START', `Found ${history.results.length} pending items\nCleaning with consumeItem=true...`);
            
            let cleanedCount = 0;
            for (const purchase of history.results) {
              if (purchase) {
                console.log('App.js: Finishing:', purchase.productId, 'acknowledged:', purchase.acknowledged);
                try {
                  // CONSUMABLE için consumeItem: true (ikinci parametre)
                  await InAppPurchases.finishTransactionAsync(purchase, true);
                  cleanedCount++;
                  console.log('App.js: Cleaned:', purchase.productId);
                } catch (finishErr) {
                  console.error('App.js: Finish error:', finishErr);
                }
              }
            }
            console.log('App.js: Cleanup done, cleaned:', cleanedCount);
            Alert.alert('✅ CLEANUP DONE', `Cleaned ${cleanedCount}/${history.results.length} items`);
          } else {
            console.log('App.js: No pending transactions');
            Alert.alert('✅ CLEANUP DONE', 'No pending transactions');
          }
        } catch (historyErr) {
          console.error('App.js: History cleanup error:', historyErr);
          Alert.alert('❌ CLEANUP ERROR', historyErr.message);
        }
        
        // CLEANUP PHASE BİTTİ - Listener'ı aktif et!
        isCleanupPhase = false;
        console.log('App.js: Cleanup phase ended, listener is now ACTIVE');
        Alert.alert('✅ LISTENER ACTIVE', '🎉 Purchase listener is now monitoring!\n\nYou can now make purchases safely.');
        
      } catch (e) {
        console.error('App.js: IAP Setup error:', e);
        Alert.alert('❌ IAP SETUP ERROR', e.message);
        // Hata olsa bile listener'ı aktif et
        isCleanupPhase = false;
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