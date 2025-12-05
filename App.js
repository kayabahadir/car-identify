import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FirstTimeService from './src/services/firstTimeService';
import CleanIAPService from './src/services/iapServiceClean';
import ProcessedTransactions from './src/services/processedTransactions';
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
    // GLOBAL IAP SETUP - ROBUST DEDUPE ARCHITECTURE
    console.log('App mounted, setting up IAP...');
    
    let isMounted = true;
    
    const setupIAP = async () => {
      try {
        // 1. Connect to IAP
        await InAppPurchases.connectAsync();
        console.log('✅ IAP Connected');
        Alert.alert('✅ IAP CONNECTED', 'Connected to Apple IAP');
        
        // 2. SET LISTENER - AFTER connect, with DEDUPE
        InAppPurchases.setPurchaseListener(async (result) => {
          try {
            console.log('🔔 LISTENER TRIGGERED:', result?.responseCode);
            
            // Basic response code handling
            if (result?.responseCode === InAppPurchases.IAPResponseCode.OK) {
              Alert.alert('🔔 LISTENER OK', `Processing ${result?.results?.length || 0} items`);
              
              const results = result.results || [];
              for (const purchase of results) {
                // CRITICAL: Validate purchaseState FIRST
                if (purchase.purchaseState !== InAppPurchases.IAPPurchaseState.PURCHASED) {
                  console.log('⚠️ Not PURCHASED state, skipping:', purchase.purchaseState);
                  continue;
                }
                
                // Get stable transaction ID
                const txId = purchase.transactionIdentifier || purchase.orderId || purchase.transactionId || `${purchase.productId}_${purchase.transactionDate}`;
                console.log('📝 Transaction ID:', txId);
                
                // Deduplicate
                const alreadyProcessed = await ProcessedTransactions.has(txId);
                if (alreadyProcessed) {
                  console.log('✓ Already processed tx:', txId);
                  Alert.alert('ℹ️ ALREADY PROCESSED', `Transaction ${txId} already processed, skipping`);
                  // Still try to finish to clear from Apple queue
                  try {
                    await InAppPurchases.finishTransactionAsync(purchase, true);
                  } catch (e) {
                    console.error('Finish error:', e);
                  }
                  continue;
                }
                
                // Process the purchase
                console.log('🔄 Processing new purchase:', txId);
                const handled = await CleanIAPService.handleSuccessfulPurchase(purchase, txId);
                
                if (handled) {
                  await ProcessedTransactions.mark(txId);
                  Alert.alert('✅ PURCHASE SUCCESS', `Transaction ${txId} processed successfully!`);
                } else {
                  console.warn('⚠️ handleSuccessfulPurchase returned false for', txId);
                }
              }
            } else if (result?.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
              console.log('🚫 User canceled');
              Alert.alert('🚫 CANCELED', 'Purchase was canceled');
            } else {
              console.log('⚠️ Other response code:', result?.responseCode);
              Alert.alert('⚠️ OTHER RESPONSE', `Code: ${result?.responseCode}`);
            }
          } catch (listenerError) {
            console.error('❌ Listener error:', listenerError);
            Alert.alert('❌ LISTENER ERROR', listenerError.message);
          }
        });
        
        console.log('✅ Listener set with dedupe');
        Alert.alert('✅ LISTENER SET', 'Purchase listener is active with deduplication');
        
        // 3. Cleanup old transaction records (30 days+)
        await ProcessedTransactions.cleanup();
        
        // 4. Optional: Process any pending transactions from history
        // (This is safe now with dedupe)
        try {
          console.log('🧹 Checking for pending transactions...');
          const history = await InAppPurchases.getPurchaseHistoryAsync();
          
          if (history && history.results && history.results.length > 0) {
            console.log('📋 Found', history.results.length, 'items in history');
            Alert.alert('🧹 PROCESSING HISTORY', `Found ${history.results.length} items, processing with dedupe...`);
            
            // Process each with dedupe (safe)
            for (const purchase of history.results) {
              if (!purchase) continue;
              
              const txId = purchase.transactionIdentifier || purchase.orderId || purchase.transactionId || `${purchase.productId}_${purchase.transactionDate}`;
              
              const alreadyProcessed = await ProcessedTransactions.has(txId);
              if (alreadyProcessed) {
                // Already processed, just finish
                try {
                  await InAppPurchases.finishTransactionAsync(purchase, true);
                  console.log('✓ Finished already processed:', txId);
                } catch (e) {
                  console.error('Finish error:', e);
                }
              } else {
                // New transaction, process it
                console.log('🔄 Processing history item:', txId);
                const handled = await CleanIAPService.handleSuccessfulPurchase(purchase, txId);
                if (handled) {
                  await ProcessedTransactions.mark(txId);
                }
              }
            }
            
            Alert.alert('✅ HISTORY PROCESSED', 'All pending transactions processed with dedupe');
          } else {
            console.log('✓ No pending transactions');
            Alert.alert('✅ NO PENDING', 'No pending transactions found');
          }
        } catch (historyErr) {
          console.error('❌ History error:', historyErr);
          Alert.alert('❌ HISTORY ERROR', historyErr.message);
        }
        
        console.log('✅ IAP Setup complete');
        Alert.alert('✅ IAP READY', '🎉 IAP is ready for purchases!');
        
      } catch (e) {
        console.error('❌ IAP Setup error:', e);
        Alert.alert('❌ IAP SETUP ERROR', e.message);
      }
    };
    
    setupIAP();
    
    checkFirstLaunch();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      try {
        InAppPurchases.setPurchaseListener(null);
        InAppPurchases.disconnectAsync();
        console.log('✅ IAP disconnected');
      } catch (e) {
        console.error('Disconnect error:', e);
      }
    };
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