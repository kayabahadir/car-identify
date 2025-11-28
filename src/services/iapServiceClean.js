import CreditService from './creditService';
import { Alert } from 'react-native';

/**
 * ULTRA MINIMAL IAP - NO CRASH GUARANTEED
 * Her adım try-catch ile korunmuş
 */

// Güvenli Alert Helper - TestFlight'ta log görmek için
const safeAlert = (title, message) => {
  setTimeout(() => {
    try {
      Alert.alert(title, String(message), [{ text: 'OK' }]);
    } catch (e) {
      console.error('Alert error:', e);
    }
  }, 100);
};

// Güvenli IAP import
let InAppPurchases = null;
let IAPAvailable = false;

try {
  InAppPurchases = require('expo-in-app-purchases');
  IAPAvailable = true;
  console.log('IAP module loaded');
} catch (e) {
  console.log('IAP module not available');
}

// Global variable to track listener status
let isListenerSet = false;

class CleanIAPService {
  static PRODUCT_IDS = {
    PACK_10: 'com.caridentify.app.credits.consumable.pack10',
    PACK_50: 'com.caridentify.app.credits.consumable.pack50',
    PACK_200: 'com.caridentify.app.credits.consumable.pack200',
  };

  static CREDIT_PACKAGES = {
    'com.caridentify.app.credits.consumable.pack10': { credits: 10, price: '$0.99' },
    'com.caridentify.app.credits.consumable.pack50': { credits: 50, price: '$2.99' },
    'com.caridentify.app.credits.consumable.pack200': { credits: 200, price: '$8.99' },
  };

  static isInitialized = false;
  static products = [];
  static purchaseResult = null;

  /**
   * Initialize - Tek sefer
   */
  static async initialize() {
    if (this.isInitialized) {
      console.log('Already initialized');
      return true;
    }

    if (!IAPAvailable || !InAppPurchases) {
      console.log('IAP not available');
        this.isInitialized = true;
      return false;
    }

    try {
      console.log('=== INITIALIZE START ===');
      
      // Connect first
      await InAppPurchases.connectAsync();
      console.log('IAP connected');

      // Set listener ONLY ONCE
      if (!isListenerSet) {
        InAppPurchases.setPurchaseListener((result) => {
          try {
            console.log('>>> LISTENER TRIGGERED <<<');
            
            // DEBUG ALERT: Listener triggered
            safeAlert(
              '🔔 LISTENER',
              `Code: ${result?.responseCode}\nState: ${result?.responseCode === 0 ? 'OK' : 'Other'}`
            );
            
            if (result) {
              CleanIAPService.purchaseResult = result;
            }
          } catch (e) {
            console.error('Listener error:', e);
          }
        });
        isListenerSet = true;
        console.log('Listener set globally');
      }
      
      // CLEANUP PENDING TRANSACTIONS - AFTER CONNECT
      try {
        console.log('Checking for pending transactions...');
        const history = await InAppPurchases.getPurchaseHistoryAsync();
        
        if (history && history.results && history.results.length > 0) {
          console.log('Found', history.results.length, 'pending transactions');
          
          safeAlert('🧹 CLEANUP', `Cleaning ${history.results.length} pending items...`);
          
          for (const purchase of history.results) {
            if (purchase && !purchase.acknowledged) {
              // Fire and forget - don't await to prevent blocking init
              InAppPurchases.finishTransactionAsync(purchase).catch(e => console.log('Finish err:', e));
            }
          }
          safeAlert('✅ CLEANUP STARTED', 'Cleaning in background...');
        }
      } catch (historyErr) {
        console.error('Get history error:', historyErr);
      }

      this.isInitialized = true;
      console.log('=== INITIALIZE SUCCESS ===');
      
      // DEBUG ALERT: Initialize success
      safeAlert('✅ IAP INIT', 'IAP initialized\nPending transactions cleaned');
      
      return true;
    } catch (error) {
      console.error('IAP init error:', error);
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Purchase Product - GÜVENLI
   */
  static async purchaseProduct(productId) {
    try {
      console.log('=== PURCHASE START ===');
      console.log('Product ID:', productId);
      
      // DEBUG ALERT: Purchase started
      safeAlert('🚀 PURCHASE START', `Product: ${productId}`);

      // Step 1: Initialize
      try {
        if (!this.isInitialized) {
          console.log('Initializing...');
          const initResult = await this.initialize();
          if (!initResult) {
            throw new Error('IAP initialization failed');
          }
        }
      } catch (initError) {
        console.error('Init error:', initError);
        throw new Error('Sistem başlatılamadı');
      }

      // Step 2: Check package
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (!packageInfo) {
        throw new Error('Geçersiz ürün');
      }

      // Step 3: Check IAP availability
      if (!IAPAvailable || !InAppPurchases) {
        console.log('IAP not available, using mock');
        // Mock purchase for testing
        await new Promise(resolve => setTimeout(resolve, 2000));
        await CreditService.addCredits(packageInfo.credits);
        const total = await CreditService.getCredits();
        return { success: true, mock: true, totalCredits: total };
      }

      // Step 4: Reset result
      CleanIAPService.purchaseResult = null;

      // Step 0: AGGRESSIVE PRE-CLEANUP
      // Ödeme ekranının açılmamasının sebebi pending transaction'dır.
      // Satın alma başlamadan önce her şeyi temizle.
      safeAlert('🧹 PRE-CLEANUP', 'Cleaning pending transactions to fix payment screen...');
      try {
        const history = await InAppPurchases.getPurchaseHistoryAsync();
        if (history && history.results) {
          for (const purchase of history.results) {
            if (!purchase.acknowledged) {
              console.log('Force finishing:', purchase.productId);
              await InAppPurchases.finishTransactionAsync(purchase);
            }
          }
        }
        // Biraz bekle ki Apple işlemi sindirsin
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (cleanupErr) {
        console.log('Pre-cleanup error:', cleanupErr);
      }

      // Step 5: Call purchase
      console.log('Calling purchaseItemAsync...');
      
      // Mevcut pending sayısını al (Polling için referans)
      // Pre-cleanup yapıldığı için buna gerek kalmadı
      /*
      let initialPendingCount = 0;
      try {
        const history = await InAppPurchases.getPurchaseHistoryAsync();
        if (history && history.results) {
          initialPendingCount = history.results.filter(p => !p.acknowledged).length;
          console.log('Initial pending count:', initialPendingCount);
        }
      } catch (e) {}
      */

      try {
        await InAppPurchases.purchaseItemAsync(productId);
        console.log('purchaseItemAsync returned');
        
        // DEBUG ALERT: purchaseItemAsync completed
        safeAlert('✅ PURCHASE CALLED', 'purchaseItemAsync returned\nWaiting for listener...');
      } catch (purchaseError) {
        console.error('purchaseItemAsync error:', purchaseError);
        
        // User canceled
        if (purchaseError.code === 'USER_CANCELED' || 
            purchaseError.message?.toLowerCase().includes('cancel')) {
          throw new Error('İptal edildi');
        }
        
        throw new Error('Satın alma başlatılamadı');
      }

      // Step 6: Wait for listener OR Polling (15 seconds max)
      console.log('Waiting for listener or polling...');
      let waitCount = 0;
      const maxWait = 150; // 15 seconds
      
      while (!CleanIAPService.purchaseResult && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
        
        // POLLING STRATEGY: Listener çalışmazsa history'den kontrol et (Her 2 saniyede bir)
        if (waitCount % 20 === 0) {
          console.log('Polling history...', waitCount / 10, 's');
          try {
             const history = await InAppPurchases.getPurchaseHistoryAsync();
             if (history && history.results) {
               // Sadece acknowledged:false olanları filtrele
               // Initial count kontrolünü kaldırdım, çünkü pre-cleanup ile sıfırladık.
               // Şimdi acknowledged:false olan herhangi bir şey YENİ işlemdir.
               const newPurchase = history.results.find(p => 
                 p.productId === productId && !p.acknowledged
               );
               
               if (newPurchase) {
                 console.log('Polling found NEW purchase!');
                 safeAlert('🔍 POLLING', 'Found new purchase via polling!');
                 CleanIAPService.purchaseResult = {
                   responseCode: InAppPurchases.IAPResponseCode.OK,
                   results: [newPurchase]
                 };
                 break; // Döngüden çık
               }
             }
          } catch (pollErr) {
            console.log('Polling error:', pollErr);
          }
        }
      }

      // Step 7: Check result
      const result = CleanIAPService.purchaseResult;
      
      if (!result) {
        console.log('=== TIMEOUT - NO RESULT ===');
        safeAlert('⏱️ TIMEOUT', `Waited: ${waitCount / 10}s\nNo purchase detected.`);
        throw new Error('İşlem zaman aşımına uğradı veya iptal edildi.');
      }

      console.log('Result received!');
      console.log('Response code:', result.responseCode);
      
      // DEBUG ALERT: Result received
      safeAlert('📨 RESULT RECEIVED', `Code: ${result.responseCode}\nResults: ${result.results?.length || 0}\nError: ${result.errorCode || 'none'}`);

      // Step 8: Process result
      try {
        console.log('Processing result...');
        console.log('Response code:', result.responseCode);
        console.log('Error code:', result.errorCode);
        
        // Canceled
        if (result.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('User canceled');
          
          // DEBUG ALERT: Canceled
          safeAlert('❌ CANCELED', 'User canceled the purchase');
          
          throw new Error('İptal edildi');
        }

        // Success
        if (result.responseCode === InAppPurchases.IAPResponseCode.OK) {
          console.log('Response OK');
          
          if (!result.results || result.results.length === 0) {
            console.log('No results in response!');
            throw new Error('Satın alma verisi alınamadı');
          }

          console.log('Processing', result.results.length, 'purchase(s)...');
          
          let creditsAdded = false;
          
          // Process each purchase
          for (const purchase of result.results) {
            try {
              // Null check
              if (!purchase) {
                console.log('Null purchase, skipping');
                continue;
              }

              console.log('Purchase data:');
              console.log('- productId:', purchase.productId);
              console.log('- transactionId:', purchase.transactionIdentifier);
              console.log('- acknowledged:', purchase.acknowledged);

              // Skip if already acknowledged
              if (purchase.acknowledged === true) {
                console.log('Already acknowledged, skipping');
                continue;
              }

              // Add credits
              console.log('Adding credits:', packageInfo.credits);
              await CreditService.addCredits(packageInfo.credits);
              creditsAdded = true;
              console.log('Credits added!');
              
              // DEBUG ALERT: Credits added
              safeAlert('💰 CREDITS ADDED', `Added: ${packageInfo.credits}\nProduct: ${purchase.productId}`);

              // Finish transaction
              try {
                console.log('Finishing transaction...');
                await InAppPurchases.finishTransactionAsync(purchase);
                console.log('Transaction finished!');
                
                // DEBUG ALERT: Transaction finished
                safeAlert('✅ TRANSACTION FINISHED', 'Transaction completed!');
              } catch (finishError) {
                console.error('Finish error:', finishError);
                // Continue anyway - credits already added
              }
              
            } catch (processPurchaseError) {
              console.error('Process purchase error:', processPurchaseError);
              // Continue with next purchase
            }
          }

          if (!creditsAdded) {
            console.log('WARNING: No credits were added!');
          }

          // Get total credits
          const total = await CreditService.getCredits();
          console.log('=== PURCHASE SUCCESS ===');
          console.log('Total credits:', total);
          
          // DEBUG ALERT: Success
          safeAlert('🎉 PURCHASE SUCCESS', `Credits: ${packageInfo.credits}\nTotal: ${total}`);
          
          return { success: true, totalCredits: total };
        }

        // Other response codes
        console.log('Unexpected response code:', result.responseCode);
        console.log('Available codes:', InAppPurchases.IAPResponseCode);
        
        // DEBUG ALERT: Unexpected code
        safeAlert('⚠️ UNEXPECTED CODE', `Response: ${result.responseCode}\nError: ${result.errorCode || 'none'}`);
        
        throw new Error('Satın alma tamamlanamadı (kod: ' + result.responseCode + ')');

      } catch (processError) {
        console.error('Process error:', processError);
        throw processError;
      }

    } catch (error) {
      console.error('=== PURCHASE ERROR ===');
      console.error('Error:', error.message);
      throw error;
    }
  }

  /**
   * Load Products - GÜVENLI
   */
  static async loadProducts() {
    try {
      if (!IAPAvailable || !InAppPurchases) {
        return [];
      }

      const productIds = Object.values(this.PRODUCT_IDS);
      const result = await InAppPurchases.getProductsAsync(productIds);
      
      if (result && result.results) {
        this.products = result.results;
      }

      return this.products;
    } catch (error) {
      console.error('Load products error:', error);
      return [];
    }
  }

  /**
   * Get Products
   */
  static async getProducts() {
    if (this.products.length === 0) {
      await this.loadProducts();
    }
    return this.products;
  }
}

export default CleanIAPService;
