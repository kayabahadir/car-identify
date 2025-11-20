import CreditService from './creditService';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (e) {
  console.log('IAP module not available');
}

/**
 * ULTRA SIMPLE IAP SERVICE - NO CRASH
 */
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
  static isMockMode = false;
  static products = [];
  
  // SIMPLE FLAG - Listener'dan işlem gördüğünü işaretle
  static lastPurchaseResult = null;

  /**
   * Initialize - EN BASIT
   */
  static async initialize() {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      if (!InAppPurchases) {
        this.isInitialized = true;
        this.isMockMode = true;
        return true;
      }
      
      // Connect
      await InAppPurchases.connectAsync();
      
      // SIMPLE LISTENER - SADECE FLAG SET ET (SAFE)
      InAppPurchases.setPurchaseListener((result) => {
        try {
          console.log('LISTENER CALLED');
          if (result) {
            this.lastPurchaseResult = result;
          }
        } catch (e) {
          console.error('Listener error:', e);
        }
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Init error:', error);
      return false;
    }
  }

  /**
   * Purchase - SIMPLE
   */
  static async purchaseProduct(productId) {
    try {
      console.log('Purchase:', productId);

      // Init
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Package check
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (!packageInfo) {
        throw new Error('Unknown product');
      }

      // Mock mode
      if (this.isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await CreditService.addCredits(packageInfo.credits);
        const total = await CreditService.getCredits();
        return { success: true, mock: true, totalCredits: total };
      }
      
      // PRODUCT CHECK - ChatGPT önerisi (products yüklenmemişse crash olabilir)
      if (!InAppPurchases) {
        throw new Error('IAP not available');
      }

      // RECONNECT - ChatGPT önerisi (arka plandan gelince disconnect olabilir)
      try {
        await InAppPurchases.connectAsync();
        console.log('Reconnected');
      } catch (reconnectError) {
        console.log('Reconnect error (ignored):', reconnectError);
      }
      
      // Reset flag
      this.lastPurchaseResult = null;

      // CALL PURCHASE
      try {
        await InAppPurchases.purchaseItemAsync(productId);
      } catch (purchaseError) {
        console.error('Purchase error:', purchaseError);
        if (purchaseError.code === 'USER_CANCELED') {
          throw new Error('Purchase canceled');
        }
        throw purchaseError;
      }
      
      // WAIT FOR LISTENER (max 5 seconds)
      console.log('Waiting for listener...');
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (this.lastPurchaseResult) {
          console.log('Listener responded');
          break;
        }
      }
      
      // PROCESS OUTSIDE OF LISTENER
      const result = this.lastPurchaseResult;
      
      // NULL CHECK - ChatGPT kritik öneri
      if (!result || typeof result !== 'object') {
        console.log('No listener response or invalid result');
        throw new Error('Purchase timeout');
      }
      
      // Check response code
      if (!result.responseCode && result.responseCode !== 0) {
        console.log('Invalid response code');
        throw new Error('Invalid purchase response');
      }
      
      if (result.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        throw new Error('Purchase canceled');
      }
      
      if (result.responseCode === InAppPurchases.IAPResponseCode.OK && result.results && result.results.length > 0) {
        console.log('Processing purchase...');
        
        for (const purchase of result.results) {
          // NULL CHECK - ChatGPT kritik öneri
          if (!purchase || !purchase.transactionIdentifier) {
            console.log('Invalid purchase object, skipping');
            continue;
          }
          
          // Add credits
          await CreditService.addCredits(packageInfo.credits);
          console.log('Credits added');
          
          // Finish transaction - SIN SEGUNDO PARAMETRO
          try {
            await InAppPurchases.finishTransactionAsync(purchase);
            console.log('Transaction finished');
          } catch (e) {
            console.error('Finish error:', e);
          }
        }
        
        const total = await CreditService.getCredits();
        return { success: true, totalCredits: total };
      }
      
      throw new Error('Purchase failed');
      
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  }

  /**
   * Load products
   */
  static async loadProducts() {
    try {
      if (!InAppPurchases || this.isMockMode) {
        return [];
      }

      const productIds = Object.values(this.PRODUCT_IDS);
      const result = await InAppPurchases.getProductsAsync(productIds);
      this.products = result?.results || [];
      
      return this.products;
    } catch (error) {
      console.error('Load products error:', error);
      return [];
    }
  }

  /**
   * Get products
   */
  static async getProducts() {
    if (this.products.length === 0) {
      await this.loadProducts();
    }
    return this.products;
  }
}

export default CleanIAPService;
