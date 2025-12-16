import CreditService from './creditService';

/**
 * ULTRA MINIMAL IAP - NO CRASH GUARANTEED
 * Her adım try-catch ile korunmuş
 */

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
      return true;
    }

    if (!IAPAvailable || !InAppPurchases) {
      console.log('IAP not available');
      this.isInitialized = true;
      return false;
    }

    try {
      // Connect
      await InAppPurchases.connectAsync();
      console.log('IAP connected');

      // Set listener - EN BASIT
      InAppPurchases.setPurchaseListener((result) => {
        try {
          if (result) {
            this.purchaseResult = result;
            console.log('Purchase result received');
          }
        } catch (e) {
          console.error('Listener error:', e);
        }
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('IAP init error:', error);
      this.isInitialized = true; // Mark as initialized even on error to prevent retry crashes
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
      this.purchaseResult = null;

      // Step 5: Call purchase
      console.log('Calling purchaseItemAsync...');
      try {
        await InAppPurchases.purchaseItemAsync(productId);
        console.log('purchaseItemAsync returned');
      } catch (purchaseError) {
        console.error('purchaseItemAsync error:', purchaseError);
        
        // User canceled
        if (purchaseError.code === 'USER_CANCELED' || 
            purchaseError.message?.toLowerCase().includes('cancel')) {
          throw new Error('İptal edildi');
        }
        
        throw new Error('Satın alma başlatılamadı');
      }

      // Step 6: Wait for listener
      console.log('Waiting for listener...');
      let waitCount = 0;
      while (!this.purchaseResult && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }

      // Step 7: Check result
      const result = this.purchaseResult;
      if (!result) {
        console.log('Timeout - no result');
        throw new Error('Zaman aşımı');
      }

      console.log('Result received:', result.responseCode);

      // Step 8: Process result
      try {
        // Canceled
        if (result.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          throw new Error('İptal edildi');
        }

        // Success
        if (result.responseCode === InAppPurchases.IAPResponseCode.OK) {
          if (!result.results || result.results.length === 0) {
            throw new Error('Satın alma verisi alınamadı');
          }

          console.log('Processing purchases...');
          
          // Process each purchase
          for (const purchase of result.results) {
            try {
              // Null check
              if (!purchase) {
                console.log('Null purchase, skipping');
                continue;
              }

              console.log('Processing purchase:', purchase.productId);

              // Add credits
              await CreditService.addCredits(packageInfo.credits);
              console.log('Credits added');

              // Finish transaction
              try {
                await InAppPurchases.finishTransactionAsync(purchase);
                console.log('Transaction finished');
              } catch (finishError) {
                console.error('Finish error:', finishError);
                // Continue anyway - credits already added
              }
            } catch (processPurchaseError) {
              console.error('Process purchase error:', processPurchaseError);
              // Continue with next purchase
            }
          }

          // Get total credits
          const total = await CreditService.getCredits();
          console.log('=== PURCHASE SUCCESS ===');
          return { success: true, totalCredits: total };
        }

        // Other response codes
        console.log('Unexpected response code:', result.responseCode);
        throw new Error('Satın alma tamamlanamadı');

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
