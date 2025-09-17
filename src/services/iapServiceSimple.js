import CreditService from './creditService';
import { Alert } from 'react-native';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (error) {
  console.error('❌ InAppPurchases module load error:', error);
  throw error;
}

/**
 * Simple IAP Service - CONSUMABLE IAP uyumlu basit yaklaşım
 */
class IAPServiceSimple {
  static isInitialized = false;

  // IAP ürün ID'leri - YENİ CONSUMABLE products
  static PRODUCT_IDS = {
    CREDITS_10: 'com.caridentify.credits.pack10',
    CREDITS_50: 'com.caridentify.credits.pack50', 
    CREDITS_200: 'com.caridentify.credits.pack200'
  };

  // Kredi paketleri mapping
  static CREDIT_PACKAGES = {
    'com.caridentify.credits.pack10': { credits: 10 },
    'com.caridentify.credits.pack50': { credits: 50 },
    'com.caridentify.credits.pack200': { credits: 200 }
  };

  /**
   * IAP servisini başlatır
   */
  static async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      if (!InAppPurchases) {
        if (__DEV__) {
          console.log('🔧 Simple IAP mock mode initialized');
        }
        this.isInitialized = true;
        return true;
      }

      await InAppPurchases.connectAsync();
      this.isInitialized = true;
      
      if (__DEV__) {
        console.log('✅ Simple CONSUMABLE IAP initialized');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Simple IAP initialization failed:', error);
      return false;
    }
  }

  /**
   * IAP kullanılabilirlik kontrolü
   */
  static async isAvailable() {
    try {
      if (!InAppPurchases) {
        return true; // Mock mode
      }

      if (!this.isInitialized) {
        await this.initialize();
      }

      return await InAppPurchases.isAvailableAsync();
    } catch (error) {
      console.error('❌ Error checking IAP availability:', error);
      return false;
    }
  }

  /**
   * Ürün satın alma - CONSUMABLE için basit yaklaşım
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
        console.log('💳 Simple CONSUMABLE purchase for:', productId);
      }

      const result = await InAppPurchases.purchaseItemAsync(productId);
      
      // Kredi ekleme
      if (result && result.results && result.results.length > 0) {
        const purchase = result.results[0];
        await this.handleSuccessfulPurchase(purchase);
        
        // Consumable purchase'ı consume et
        if (purchase.transactionId || purchase.purchaseToken) {
          await InAppPurchases.finishTransactionAsync(purchase, true);
        }
      }

      return { productId, status: 'completed' };

    } catch (error) {
      console.error('❌ Simple purchase failed:', error);
      throw error;
    }
  }

  /**
   * Mock purchase
   */
  static async mockPurchase(productId) {
    if (__DEV__) {
      console.log('🧪 Simple mock CONSUMABLE purchase:', productId);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const packageInfo = this.CREDIT_PACKAGES[productId];
    if (packageInfo) {
      await CreditService.addCredits(packageInfo.credits);
    }
    
    return { productId, status: 'mock_completed' };
  }

  /**
   * Başarılı satın alma işlemi
   */
  static async handleSuccessfulPurchase(purchase) {
    try {
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (packageInfo) {
        await CreditService.addCredits(packageInfo.credits);
        
        if (__DEV__) {
          console.log(`✅ Simple CONSUMABLE: Added ${packageInfo.credits} credits`);
        }
      }
    } catch (error) {
      console.error('❌ Error in simple purchase handling:', error);
    }
  }

  /**
   * CONSUMABLE ürünler restore edilmez
   * Apple Guidelines 3.1.1: Consumable products cannot be restored
   */
  static async restorePurchases() {
    // Consumable IAP'lar için restore işlemi yapılmaz
    // Apple'ın policy'sine göre consumable ürünler restore edilemez
    return Promise.resolve();
  }
}

export default IAPServiceSimple;