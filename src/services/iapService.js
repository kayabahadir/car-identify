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
 * In-App Purchase Service - Expo IAP ile entegrasyon
 */
class IAPService {
  static isInitialized = false;
  static products = [];
  static purchaseListener = null;
  static purchasePromiseResolvers = new Map(); // Purchase promise tracking
  static activePurchaseMonitors = new Map(); // Active purchase monitoring

  // Receipt validation endpoint
  static RECEIPT_VALIDATION_URL = process.env.EXPO_PUBLIC_API_BASE_URL 
    ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/validate-receipt`
    : null;

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

      // Mock mode'da direkt initialize
      if (!InAppPurchases) {
        if (__DEV__) {
          console.log('🔧 IAP mock mode initialized');
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
   * Purchase listener'ını ayarlar
   */
  static setPurchaseListener() {
    if (!InAppPurchases) return;
    
    this.purchaseListener = InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
      if (__DEV__) {
        console.log('💳 Purchase listener triggered:', { responseCode, results, errorCode });
      }
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        results?.forEach(purchase => {
          this.handleSuccessfulPurchase(purchase);
        });
      }
    });
  }

  /**
   * Mevcut ürünleri yükler
   */
  static async loadProducts() {
    try {
      // Mock mode'da products yüklemeyeceğiz
      if (!InAppPurchases) {
        this.products = [];
        return [];
      }

      if (__DEV__) {
        console.log('📦 Loading IAP products...');
      }
      
      const productIds = Object.values(this.PRODUCT_IDS);
      const { results: products } = await InAppPurchases.getProductsAsync(productIds);
      
      this.products = products || [];
      
      if (__DEV__) {
        console.log(`📦 Loaded ${this.products.length} products:`, 
          this.products.map(p => ({ id: p.productId, price: p.price }))
        );
      }
      
      return this.products;
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      this.products = [];
      return [];
    }
  }

  /**
   * Belirli bir ürünü satın alır
   */
  static async purchaseProduct(productId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Mock mode'da simulated purchase
      if (!InAppPurchases) {
        return await this.mockPurchase(productId);
      }

      if (__DEV__) {
        console.log('💳 Initiating purchase for:', productId);
      }
      
      // Basit purchase approach
      await InAppPurchases.purchaseItemAsync(productId);
      
      if (__DEV__) {
        console.log('✅ Purchase request completed');
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
    
    // 2 saniye bekle (simulate purchase flow)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock success
    const packageInfo = this.CREDIT_PACKAGES[productId];
    if (packageInfo) {
      await CreditService.addCredits(packageInfo.credits);
      if (__DEV__) {
        console.log(`✅ Mock purchase successful: +${packageInfo.credits} credits`);
      }
    }
    
    return { productId, status: 'mock_completed' };
  }

  /**
   * Başarılı satın alma işlemini handle eder
   */
  static async handleSuccessfulPurchase(purchase) {
    try {
      if (__DEV__) {
        console.log('🎉 Processing successful purchase:', purchase.productId);
      }

      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('❌ Unknown product ID:', purchase.productId);
        return;
      }

      // Kredi ekle
      await CreditService.addCredits(packageInfo.credits);
      
      if (__DEV__) {
        console.log(`✅ Added ${packageInfo.credits} credits for ${purchase.productId}`);
      }

      // Purchase'ı acknowledge et (eğer gerekirse)
      if (InAppPurchases && !purchase.acknowledged) {
        await InAppPurchases.finishTransactionAsync(purchase, false);
      }

    } catch (error) {
      console.error('❌ Error handling successful purchase:', error);
    }
  }

  /**
   * Satın almaları geri yükler
   */
  static async restorePurchases() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Mock mode'da restore yapmayacağız
      if (!InAppPurchases) {
        Alert.alert(
          'Demo Mode',
          'Bu demo modudur. Gerçek satın alma geri yüklemesi development build gerektirir.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      if (__DEV__) {
        console.log('🔄 Restoring purchases...');
      }
      
      const { results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (results && results.length > 0) {
        if (__DEV__) {
          console.log(`🔄 Found ${results.length} previous purchases`);
        }
        
        // Önceki satın almaları işle
        for (const purchase of results) {
          if (purchase.acknowledged === false) {
            await this.handleSuccessfulPurchase(purchase);
          }
        }
        
        Alert.alert(
          '✅ Geri Yükleme Başarılı',
          `${results.length} önceki satın alma geri yüklendi.`,
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert(
          'ℹ️ Geri Yüklenecek Satın Alma Yok',
          'Bu hesapta daha önce yapılmış satın alma bulunamadı.',
          [{ text: 'Tamam' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw new Error(error.message || 'Satın almalar geri yüklenemedi');
    }
  }

  /**
   * Mevcut ürünleri getirir
   */
  static getProducts() {
    return this.products;
  }

  /**
   * IAP'ın kullanılabilir olup olmadığını kontrol eder
   */
  static async isAvailable() {
    try {
      // Mock mode'da da available dön (test için)
      if (!InAppPurchases) {
        return true;
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
}

export default IAPService;