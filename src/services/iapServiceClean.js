import CreditService from './creditService';
import { Alert } from 'react-native';

/**
 * v1.0.50 - GLOBAL LISTENER ARCHITECTURE
 * Listener App.js'de, burada sadece yardımcı metodlar
 */

// Güvenli Alert Helper
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

  /**
   * Initialize - SADECE CONNECT (Listener App.js'de)
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
      console.log('Service: Initializing IAP...');
      // Connect yapılmış olabilir (App.js'de), ama tekrar çağırmak zararsız
      await InAppPurchases.connectAsync();
      console.log('Service: IAP connected');
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Service: Init error:', error);
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * App.js'den çağrılacak - Satın alma başarılı olduğunda
   */
  static async handleSuccessfulPurchase(purchase) {
    console.log('Service: Handling successful purchase:', purchase.productId);
    safeAlert('💰 HANDLING PURCHASE', `ID: ${purchase.productId}`);

    const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
    if (!packageInfo) {
      console.error('Unknown product:', purchase.productId);
      safeAlert('❌ UNKNOWN PRODUCT', purchase.productId);
      return false;
    }

    try {
      // Eğer acknowledged ise kredi ekleme (restore durumu)
      if (purchase.acknowledged) {
        console.log('Already acknowledged, finishing only with consumeItem=true');
        safeAlert('⚠️ ALREADY ACK', 'Already acknowledged\nFinishing with consumeItem=true');
        try {
          await InAppPurchases.finishTransactionAsync(purchase, true);
          safeAlert('✅ ACK FINISHED', 'Already ack item finished (consumed)');
        } catch (e) {
          console.error('Finish error:', e);
          safeAlert('❌ FINISH ERROR', e.message);
        }
        return false;
      }

      // Kredi ekle
      console.log('Adding credits:', packageInfo.credits);
      await CreditService.addCredits(packageInfo.credits);
      console.log('Credits added!');
      safeAlert('✅ CREDITS ADDED', `Added: ${packageInfo.credits}`);
      
      // Transaction bitir - CONSUMABLE için consumeItem: true
      try {
        console.log('Finishing transaction with consumeItem=true...');
        await InAppPurchases.finishTransactionAsync(purchase, true);
        console.log('Transaction finished!');
        safeAlert('✅ FINISHED', 'Transaction finished (consumed)');
      } catch (finishError) {
        console.error('Finish error:', finishError);
        safeAlert('⚠️ FINISH ERROR', finishError.message);
      }
      
      return true;
    } catch (error) {
      console.error('Handle purchase error:', error);
      safeAlert('❌ HANDLE ERROR', error.message);
      return false;
    }
  }

  /**
   * Purchase Product - Sadece tetikler, sonucu App.js listener yakalar
   */
  static async purchaseProduct(productId) {
    try {
      console.log('Service: Purchase start:', productId);
      safeAlert('🚀 SERVICE', `Purchase start: ${productId}`);

      // Initialize
      if (!this.isInitialized) {
        safeAlert('⚙️ INIT', 'Initializing IAP...');
        await this.initialize();
        safeAlert('✅ INIT DONE', 'IAP initialized');
      }

      // Check package
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (!packageInfo) {
        safeAlert('❌ INVALID', `Invalid product: ${productId}`);
        throw new Error('Geçersiz ürün');
      }
      
      safeAlert('📦 PACKAGE', `Credits: ${packageInfo.credits}\nPrice: ${packageInfo.price}`);

      // Check IAP availability
      if (!IAPAvailable || !InAppPurchases) {
        console.log('IAP not available, using mock');
        safeAlert('⚠️ MOCK MODE', 'IAP not available\nUsing mock purchase');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await CreditService.addCredits(packageInfo.credits);
        const total = await CreditService.getCredits();
        safeAlert('✅ MOCK DONE', `Added ${packageInfo.credits} credits\nTotal: ${total}`);
        return { success: true, mock: true, totalCredits: total };
      }

      // Call purchase - sonucu beklemiyoruz, App.js listener yakalar
      console.log('Service: Calling purchaseItemAsync...');
      safeAlert('📱 CALLING APPLE', `Calling purchaseItemAsync\nProduct: ${productId}`);
      
      try {
        await InAppPurchases.purchaseItemAsync(productId);
        console.log('Service: purchaseItemAsync returned');
        safeAlert('✅ APPLE CALLED', 'purchaseItemAsync returned successfully\nWaiting for App.js listener...');
        
        // Başarıyla çağrıldı, sonuç App.js'den gelecek
        // PurchaseScreen'e "pending" döndür
        return { status: 'pending' };
        
      } catch (purchaseError) {
        console.error('Service: purchaseItemAsync error:', purchaseError);
        safeAlert('❌ APPLE ERROR', `Code: ${purchaseError.code}\nMessage: ${purchaseError.message}`);
        
        // User canceled
        if (purchaseError.code === 'USER_CANCELED' || 
            purchaseError.message?.toLowerCase().includes('cancel')) {
          safeAlert('🚫 CANCELED', 'User canceled the purchase');
          throw new Error('İptal edildi');
        }
        
        // "Already owned" durumunda bile hata fırlat
        // (App.js listener eğer gerçekten bir işlem varsa yakalayacak)
        throw purchaseError;
      }

    } catch (error) {
      console.error('Service: Purchase error:', error);
      safeAlert('❌ SERVICE ERROR', `Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load Products
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
