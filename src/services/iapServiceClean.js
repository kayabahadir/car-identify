import CreditService from './creditService';
import { Alert } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';

/**
 * v1.0.55 - FIXED MODULE INSTANCE + AUTO LISTENER
 * CRITICAL FIX: App.js ve Service aynı InAppPurchases instance'ını kullanıyor
 * Listener otomatik çalışacak, manuel history check kaldırıldı
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

// IAP availability check
let IAPAvailable = false;

try {
  IAPAvailable = !!InAppPurchases && !!InAppPurchases.connectAsync;
  console.log('IAP module available:', IAPAvailable);
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
   * App.js'den VEYA Service'in kendisinden çağrılacak
   */
  static async handleSuccessfulPurchase(purchase) {
    console.log('Service: Handling successful purchase:', purchase.productId);
    safeAlert('💰 HANDLING PURCHASE', `ID: ${purchase.productId}\nAck: ${purchase.acknowledged}`);

    const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
    if (!packageInfo) {
      console.error('Unknown product:', purchase.productId);
      safeAlert('❌ UNKNOWN PRODUCT', purchase.productId);
      return false;
    }

    safeAlert('📦 PACKAGE FOUND', `Credits: ${packageInfo.credits}\nPrice: ${packageInfo.price}`);

    try {
      // Eğer acknowledged ise kredi ekleme (restore durumu)
      if (purchase.acknowledged === true) {
        console.log('Already acknowledged, finishing only with consumeItem=true');
        safeAlert('⚠️ ALREADY ACK', 'Already acknowledged=true\nSKIPPING credit add\nFinishing with consumeItem=true');
        try {
          await InAppPurchases.finishTransactionAsync(purchase, true);
          console.log('Already ack item finished');
          safeAlert('✅ ACK FINISHED', 'Already ack item finished (consumed)');
        } catch (e) {
          console.error('Finish error:', e);
          safeAlert('❌ FINISH ERROR', e.message);
        }
        return false;
      }

      // Kredi ekle
      console.log('Adding credits:', packageInfo.credits);
      safeAlert('💳 ADDING CREDITS', `Adding ${packageInfo.credits} credits...`);
      
      await CreditService.addCredits(packageInfo.credits);
      console.log('Credits added!');
      
      const newTotal = await CreditService.getCredits();
      safeAlert('✅ CREDITS ADDED', `Added: ${packageInfo.credits}\nNew Total: ${newTotal}`);
      
      // Transaction bitir - CONSUMABLE için consumeItem: true
      try {
        console.log('Finishing transaction with consumeItem=true...');
        safeAlert('🏁 FINISHING', 'Calling finishTransactionAsync\nconsumeItem=true');
        
        await InAppPurchases.finishTransactionAsync(purchase, true);
        console.log('Transaction finished!');
        safeAlert('✅ TRANSACTION FINISHED', 'Transaction finished (consumed)');
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

      // Call purchase - Listener otomatik yakalayacak
      console.log('Service: Calling purchaseItemAsync...');
      safeAlert('📱 CALLING APPLE', `Calling purchaseItemAsync\nProduct: ${productId}`);
      
      try {
        await InAppPurchases.purchaseItemAsync(productId);
        console.log('Service: purchaseItemAsync returned successfully');
        safeAlert('✅ APPLE CALLED', 'purchaseItemAsync returned\nApp.js listener will catch the result');
        
        // Başarıyla çağrıldı, sonuç App.js listener'dan gelecek
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
        
        // Diğer hatalar
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
