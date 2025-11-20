import CreditService from './creditService';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  const iapModule = require('expo-in-app-purchases');
  InAppPurchases = iapModule.default || iapModule;
  console.log('✅ InAppPurchases module loaded');
} catch (error) {
  console.error('❌ InAppPurchases module load error:', error);
}

/**
 * BASIT IAP SERVİSİ - Sadece temel flow
 * Flow: Buy Button → Apple Payment → Listener → Credits Added
 */
class CleanIAPService {
  static isInitialized = false;
  static products = [];
  static isMockMode = false;
  static processedTransactions = new Set(); // Duplicate prevention

  // Product ID'ler
  static PRODUCT_IDS = {
    CREDITS_10: 'com.caridentify.app.credits.consumable.pack10',
    CREDITS_50: 'com.caridentify.app.credits.consumable.pack50', 
    CREDITS_200: 'com.caridentify.app.credits.consumable.pack200'
  };

  // Kredi paketleri
  static CREDIT_PACKAGES = {
    'com.caridentify.app.credits.consumable.pack10': { credits: 10 },
    'com.caridentify.app.credits.consumable.pack50': { credits: 50 },
    'com.caridentify.app.credits.consumable.pack200': { credits: 200 }
  };

  /**
   * Initialize - Sadece connect ve listener
   */
  static async initialize() {
    try {
      console.log('Initialize starting...');
      
      // Zaten initialized
      if (this.isInitialized) {
        console.log('Already initialized');
        return true;
      }
      
      if (!InAppPurchases) {
        console.log('IAP Mock mode');
        this.isInitialized = true;
        this.isMockMode = true;
        return true;
      }
      
      this.isMockMode = false;
      console.log('Initializing IAP...');

      // Connect
      try {
        await InAppPurchases.connectAsync();
        console.log('Connected to IAP');
      } catch (connectError) {
        console.error('Connect error:', connectError);
        throw connectError;
      }
      
      // Listener - SADECE BU!
      InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
        try {
          console.log('LISTENER:', { responseCode, results: results?.length || 0, errorCode });
          
          // Başarılı purchase
          if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
            console.log('LISTENER: OK, processing', results.length, 'purchases');
            
            // Async olarak işle (crash'i önlemek için)
            results.forEach(purchase => {
              this.processPurchase(purchase).catch(err => {
                console.error('Process error:', err);
              });
            });
          } 
          // Cancel
          else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            console.log('LISTENER: USER_CANCELED');
          }
          // Diğer
          else {
            console.log('LISTENER: OTHER', { responseCode, errorCode });
          }
        } catch (listenerError) {
          console.error('LISTENER ERROR:', listenerError);
        }
      });

      this.isInitialized = true;
      console.log('IAP initialized');
      return true;

    } catch (error) {
      console.error('IAP init failed:', error);
      return false;
    }
  }

  /**
   * Purchase işle - TEK NOKTA
   */
  static async processPurchase(purchase) {
    try {
      console.log('PROCESS: Starting for', purchase.productId);
      
      // Duplicate check - transaction ID ile
      const txId = purchase.transactionIdentifier || purchase.orderId || `${purchase.productId}_${Date.now()}`;
      
      if (this.processedTransactions.has(txId)) {
        console.log('DUPLICATE: Already processed');
        return;
      }
      
      // Acknowledged check
      if (purchase.acknowledged === true) {
        console.log('ACKNOWLEDGED: Already acknowledged');
        return;
      }
      
      // Product check
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('UNKNOWN PRODUCT:', purchase.productId);
        return;
      }

      // Kredi öncesi
      let creditsBefore = 0;
      try {
        creditsBefore = await CreditService.getCredits();
        console.log('Credits before:', creditsBefore);
      } catch (e) {
        console.error('Get credits error:', e);
      }

      // Kredi ekle
      try {
        await CreditService.addCredits(packageInfo.credits);
        console.log('Credits added:', packageInfo.credits);
      } catch (addError) {
        console.error('Add credits error:', addError);
        throw addError;
      }
      
      // Kredi sonrası
      let creditsAfter = creditsBefore;
      try {
        creditsAfter = await CreditService.getCredits();
        console.log('Credits after:', creditsAfter);
        console.log('CREDITS ADDED! Total added:', creditsAfter - creditsBefore);
      } catch (e) {
        console.error('Get final credits error:', e);
      }
      
      // Transaction finish
      try {
        await InAppPurchases.finishTransactionAsync(purchase, false);
        console.log('TRANSACTION FINISHED');
      } catch (finishError) {
        console.error('Finish transaction error:', finishError);
        // Devam et, kredi zaten eklendi
      }
      
      // Duplicate prevention
      this.processedTransactions.add(txId);
      
      // Set cleanup (10 dakika sonra temizle)
      setTimeout(() => {
        this.processedTransactions.delete(txId);
      }, 600000);
      
    } catch (error) {
      console.error('PROCESS ERROR:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }

  /**
   * Ürünleri yükle
   */
  static async loadProducts() {
    try {
      if (!InAppPurchases) {
        return [];
      }

      const productIds = Object.values(this.PRODUCT_IDS);
      const result = await InAppPurchases.getProductsAsync(productIds);
      this.products = result?.results || [];
      
      console.log('📦 Products loaded:', this.products.length);
      return this.products;

    } catch (error) {
      console.error('❌ Load products failed:', error);
      return [];
    }
  }

  /**
   * Satın al - SADECE purchaseItemAsync çağır
   */
  static async purchaseProduct(productId) {
    let creditsBefore = 0;
    
    try {
      console.log('Purchase started:', productId);

      // Initialize (ilk kez)
      if (!this.isInitialized) {
        console.log('Initializing IAP...');
        try {
          await this.initialize();
          console.log('IAP initialized');
        } catch (initError) {
          console.error('Initialize error:', initError);
          throw new Error('Initialize failed');
        }
      }

      // Product check
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (!packageInfo) {
        console.error('Unknown product:', productId);
        throw new Error('Unknown product');
      }

      // Mock mode
      if (!InAppPurchases || this.isMockMode) {
        console.log('Mock purchase');
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await CreditService.addCredits(packageInfo.credits);
          const total = await CreditService.getCredits();
          return { success: true, mock: true, totalCredits: total };
        } catch (mockError) {
          console.error('Mock error:', mockError);
          throw mockError;
        }
      }

      // Kredi kontrol
      try {
        creditsBefore = await CreditService.getCredits();
        console.log('Credits before:', creditsBefore);
      } catch (e) {
        console.error('Could not get credits:', e);
        creditsBefore = 0;
      }

      // GERÇEK PURCHASE
      console.log('Calling purchaseItemAsync...');
      try {
        await InAppPurchases.purchaseItemAsync(productId);
        console.log('purchaseItemAsync completed');
      } catch (purchaseError) {
        console.error('purchaseItemAsync error:', purchaseError);
        
        // Cancel check
        if (purchaseError.code === 'USER_CANCELED' || purchaseError.message?.includes('cancel')) {
          throw new Error('Purchase canceled');
        }
        
        throw purchaseError;
      }
      
      // Listener işleyecek
      console.log('Waiting for listener...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Kredi kontrol
      let totalAfter = creditsBefore;
      try {
        totalAfter = await CreditService.getCredits();
        console.log('Credits after:', totalAfter);
      } catch (e) {
        console.error('Could not get final credits:', e);
        totalAfter = creditsBefore;
      }
      
      return { success: true, totalCredits: totalAfter };

    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  }

  /**
   * Ürünleri getir
   */
  static async getProducts() {
    if (this.products.length === 0) {
      await this.loadProducts();
    }
    return this.products;
  }
}

export default CleanIAPService;
