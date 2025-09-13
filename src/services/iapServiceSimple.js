import { Alert, Platform } from 'react-native';
import CreditService from './creditService';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (error) {
  console.error('❌ InAppPurchases module load error:', error);
  throw error;
}

/**
 * Simple IAP Service - TestFlight uyumlu basit yaklaşım
 */
class IAPServiceSimple {
  static isInitialized = false;
  static products = [];
  static purchaseListener = null;

  // Ürün ID'leri - YENİ Non-Consumable ürünler
  static PRODUCT_IDS = {
    CREDITS_10: 'com.caridentify.credits10.permanent',
    CREDITS_50: 'com.caridentify.credits50.permanent', 
    CREDITS_200: 'com.caridentify.credits200.permanent'
  };

  // Kredi paketleri mapping
  static CREDIT_PACKAGES = {
    [this.PRODUCT_IDS.CREDITS_10]: { credits: 10, packageInfo: 'Başlangıç Paketi' },
    [this.PRODUCT_IDS.CREDITS_50]: { credits: 50, packageInfo: 'Popüler Paket' },
    [this.PRODUCT_IDS.CREDITS_200]: { credits: 200, packageInfo: 'Premium Paket' }
  };

  /**
   * IAP servisini başlatır
   */
  static async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Mock mode
      if (!InAppPurchases) {
        if (__DEV__) {
          console.log('🔧 IAP not available - using mock mode');
        }
        this.isInitialized = true;
        return true;
      }

      await InAppPurchases.connectAsync();
      this.setPurchaseListener();
      await this.loadProducts();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize In-App Purchases:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Ürünleri yükler
   */
  static async loadProducts() {
    try {
      if (!InAppPurchases) {
        this.products = [];
        return [];
      }

      const productIds = Object.values(this.PRODUCT_IDS);
      const { results: products } = await InAppPurchases.getProductsAsync(productIds);
      this.products = products || [];
      return this.products;
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      this.products = [];
      return [];
    }
  }

  /**
   * SIMPLE: Belirli bir ürünü satın alır
   */
  static async purchaseProduct(productId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Mock mode
      if (!InAppPurchases) {
        return await this.mockPurchase(productId);
      }

      if (__DEV__) {
        console.log('💳 Starting simple purchase for:', productId);
      }
      
      // SIMPLE: Apple'a purchase request gönder
      await InAppPurchases.purchaseItemAsync(productId);
      
      if (__DEV__) {
        console.log('✅ Purchase request completed successfully!');
      }
      
      return { productId, status: 'completed' };
      
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
      if (InAppPurchases && error.code === InAppPurchases.IAPErrorCode.PAYMENT_CANCELLED) {
        throw new Error('Satın alma iptal edildi');
      } else if (InAppPurchases && error.code === InAppPurchases.IAPErrorCode.PAYMENT_NOT_ALLOWED) {
        throw new Error('Satın alma işlemi bu cihazda izin verilmiyor');
      } else {
        throw new Error(error.message || 'Satın alma işlemi başarısız oldu');
      }
    }
  }

  /**
   * Mock purchase for development
   */
  static async mockPurchase(productId) {
    if (__DEV__) {
      console.log('🧪 Mock purchase for:', productId);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const packageInfo = this.CREDIT_PACKAGES[productId];
    if (packageInfo) {
      await CreditService.addCredits(packageInfo.credits);
      if (__DEV__) {
        console.log(`✅ Mock purchase successful: +${packageInfo.credits} credits`);
      }
    }
    
    return { productId, status: 'mock_completed' };
  }

  static setPurchaseListener() {
    if (!InAppPurchases) return;
    
    this.purchaseListener = InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        results?.forEach(purchase => {
          this.handleSuccessfulPurchase(purchase);
        });
      }
    });
  }

  static async handleSuccessfulPurchase(purchase) {
    try {
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('❌ Unknown product ID:', purchase.productId);
        return;
      }

      await CreditService.addCredits(packageInfo.credits);
      
      if (InAppPurchases && !purchase.acknowledged) {
        await InAppPurchases.finishTransactionAsync(purchase, false);
      }

    } catch (error) {
      console.error('❌ Error handling successful purchase:', error);
    }
  }

  static async isAvailable() {
    try {
      if (!InAppPurchases) {
        return true; // Mock mode
      }
      
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        return initialized;
      }
      return this.isInitialized;
    } catch (error) {
      console.error('❌ IAP availability check failed:', error);
      return false;
    }
  }

  static getProducts() {
    return this.products;
  }
}

export default IAPServiceSimple;