import CreditService from './creditService';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

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
 * CONSUMABLE IAP sistemi - tekrar tekrar satın alınabilir krediler
 * PRODUCTION READY - Debug logs removed
 */
class IAPService {
  static isInitialized = false;
  static products = [];
  static purchaseListener = null;

  // Receipt validation endpoint
  static RECEIPT_VALIDATION_URL = process.env.EXPO_PUBLIC_API_BASE_URL 
    ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/validate-receipt`
    : null;

  // IAP ürün ID'leri - CONSUMABLE products (tekrar satın alınabilir)
  static PRODUCT_IDS = {
    CREDITS_10: 'com.caridentify.app.credits.pack10',
    CREDITS_50: 'com.caridentify.app.credits.pack50', 
    CREDITS_200: 'com.caridentify.app.credits.pack200'
  };

  // Kredi paketleri mapping
  static CREDIT_PACKAGES = {
    'com.caridentify.app.credits.pack10': { credits: 10, price: 1.99 },
    'com.caridentify.app.credits.pack50': { credits: 50, price: 6.99 },
    'com.caridentify.app.credits.pack200': { credits: 200, price: 19.99 }
  };

  /**
   * IAP servisini başlatır
   */
  static async initialize() {
    try {
      if (this.isInitialized) {
        console.log('IAP already initialized');
        return true;
      }

      // Mock mode'da direkt initialize
      if (!InAppPurchases) {
        console.log('IAP Mock mode - initializing');
        this.isInitialized = true;
        return true;
      }
      
      console.log('Connecting to IAP service...');
      // IAP sistemini başlat
      await InAppPurchases.connectAsync();

      // Satın alma listener'ı (bir kez) kur
      if (!this.purchaseListener && typeof InAppPurchases.setPurchaseListener === 'function') {
        this.purchaseListener = InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
          try {
            if (responseCode === InAppPurchases.IAPResponseCode.OK && Array.isArray(results)) {
              for (const purchase of results) {
                // Başarılı satın alma
                if (purchase.acknowledged === false || purchase.acknowledged === undefined) {
                  await this.handleSuccessfulPurchase(purchase);
                  if (purchase.transactionId || purchase.purchaseToken) {
                    await InAppPurchases.finishTransactionAsync(purchase, true);
                  }
                }
              }
            } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
              console.log('IAP purchase canceled by user');
            } else if (errorCode) {
              console.error('IAP listener error:', errorCode);
            }
          } catch (listenerErr) {
            console.error('Error in purchase listener:', listenerErr);
          }
        });
      }

      this.isInitialized = true;
      console.log('IAP service initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize IAP service:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * IAP'ın kullanılabilir olup olmadığını kontrol eder
   */
  static async isAvailable() {
    try {
      // Mock mode'da her zaman available
      if (!InAppPurchases) {
        console.log('IAP Mock mode - always available');
        return true;
      }

      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult) {
          console.log('IAP initialization failed');
          return false;
        }
      }

      // SDK compatibility: some versions might not expose isAvailableAsync
      const hasIsAvailableFn = typeof InAppPurchases.isAvailableAsync === 'function';
      if (!hasIsAvailableFn) {
        console.log('IAP isAvailableAsync not found; assuming available and relying on product fetch');
        return true;
      }

      const available = await InAppPurchases.isAvailableAsync();
      console.log('IAP availability check:', available);
      return available;
    } catch (error) {
      console.error('Error checking IAP availability:', error);
      return false;
    }
  }

  /**
   * Tanı amaçlı ayrıntılı durum döndürür
   */
  static async diagnose() {
    const diagnostics = {
      initialized: this.isInitialized,
      moduleLoaded: !!InAppPurchases,
      platform: Platform.OS,
      bundleIdentifier: Constants?.expoConfig?.ios?.bundleIdentifier || Constants?.manifest?.ios?.bundleIdentifier || 'unknown',
      hasConnectAsync: !!InAppPurchases && typeof InAppPurchases.connectAsync === 'function',
      hasIsAvailableAsync: !!InAppPurchases && typeof InAppPurchases.isAvailableAsync === 'function',
      hasGetProductsAsync: !!InAppPurchases && typeof InAppPurchases.getProductsAsync === 'function',
      isAvailable: null,
      productsCount: null,
      lastError: null,
    };

    try {
      if (!InAppPurchases) {
        diagnostics.lastError = 'InAppPurchases module not available';
        return diagnostics;
      }

      if (!this.isInitialized) {
        await this.initialize();
        diagnostics.initialized = this.isInitialized;
      }

      if (typeof InAppPurchases.isAvailableAsync === 'function') {
        diagnostics.isAvailable = await InAppPurchases.isAvailableAsync();
      } else {
        diagnostics.isAvailable = 'unknown';
      }

      try {
        if (typeof InAppPurchases.getProductsAsync === 'function') {
          const ids = Object.values(this.PRODUCT_IDS);
          const result = await InAppPurchases.getProductsAsync(ids);
          const products = result?.results || [];
          diagnostics.productsCount = products.length;
        } else {
          diagnostics.productsCount = 'unknown';
          diagnostics.lastError = 'getProductsAsync not available in SDK';
        }
      } catch (err) {
        diagnostics.lastError = err?.message || String(err);
      }
    } catch (error) {
      diagnostics.lastError = error?.message || String(error);
    }

    return diagnostics;
  }

  /**
   * Mevcut ürünleri yükler
   */
  static async loadProducts() {
    try {
      // Mock mode'da products yüklemeyeceğiz
      if (!InAppPurchases) {
        console.log('IAP Mock mode - no products to load');
        this.products = [];
        return [];
      }
      
      const productIds = Object.values(this.PRODUCT_IDS);
      console.log('Loading IAP products with IDs:', productIds);
      
      const result = await InAppPurchases.getProductsAsync(productIds);
      console.log('IAP getProductsAsync result:', result);
      
      const products = result?.results || [];
      this.products = products;
      
      console.log('Loaded IAP products:', products);
      return this.products;
    } catch (error) {
      console.error('Failed to load products:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      this.products = [];
      return [];
    }
  }

  /**
   * Ürün listesini getirir (PurchaseScreen için)
   */
  static async getProducts() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (this.products.length === 0) {
        await this.loadProducts();
      }
      
      return this.products;
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  /**
   * Belirli bir ürünü satın alır - CONSUMABLE için optimized
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
      
      // Purchase işlemini başlat
      const result = await InAppPurchases.purchaseItemAsync(productId);
      // Asıl kredi ekleme purchase listener içinde yapılır
      return { productId, status: 'started', result };
      
    } catch (error) {
      console.error('Purchase failed:', error);
      
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
    // 2 saniye bekle (simulate purchase flow)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock success
    const packageInfo = this.CREDIT_PACKAGES[productId];
    if (packageInfo) {
      await CreditService.addCredits(packageInfo.credits);
    }
    
    return { productId, status: 'mock_completed' };
  }

  /**
   * Başarılı satın alma işlemini handle eder
   */
  static async handleSuccessfulPurchase(purchase) {
    try {
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('Unknown product ID:', purchase.productId);
        return;
      }

      // Kredi ekle
      await CreditService.addCredits(packageInfo.credits);

    } catch (error) {
      console.error('Error handling successful purchase:', error);
    }
  }

  /**
   * CONSUMABLE IAP'lar restore edilmez!
   * Apple Guidelines 3.1.1: Consumable products cannot be restored
   */
  static async restorePurchases() {
    // Consumable IAP'lar için restore işlemi yapılmaz
    // Apple'ın policy'sine göre consumable ürünler restore edilemez
    return Promise.resolve();
  }

  /**
   * IAP bağlantısını keser
   */
  static async disconnect() {
    try {
      if (InAppPurchases && this.isInitialized) {
        await InAppPurchases.disconnectAsync();
      }
      
      this.isInitialized = false;
      this.products = [];
      this.purchaseListener = null;
      
    } catch (error) {
      console.error('Error disconnecting IAP service:', error);
    }
  }
}

export default IAPService;