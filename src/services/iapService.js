import CreditService from './creditService';
import { Alert, Platform } from 'react-native';

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
    CREDITS_10: 'com.caridentify.credits.pack10',
    CREDITS_50: 'com.caridentify.credits.pack50', 
    CREDITS_200: 'com.caridentify.credits.pack200'
  };

  // Kredi paketleri mapping
  static CREDIT_PACKAGES = {
    'com.caridentify.credits.pack10': { credits: 10, price: 1.99 },
    'com.caridentify.credits.pack50': { credits: 50, price: 6.99 },
    'com.caridentify.credits.pack200': { credits: 200, price: 19.99 }
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
        this.isInitialized = true;
        return true;
      }
      
      // IAP sistemini başlat
      await InAppPurchases.connectAsync();
      
      this.isInitialized = true;
      return true;
      
    } catch (error) {
      console.error('Failed to initialize IAP service:', error);
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
        return true;
      }

      if (!this.isInitialized) {
        await this.initialize();
      }

      const available = await InAppPurchases.isAvailableAsync();
      return available;
    } catch (error) {
      console.error('Error checking IAP availability:', error);
      return false;
    }
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
      
      const productIds = Object.values(this.PRODUCT_IDS);
      const result = await InAppPurchases.getProductsAsync(productIds);
      
      const products = result?.results || [];
      this.products = products;
      
      return this.products;
    } catch (error) {
      console.error('Failed to load products:', error);
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
      
      // Purchase başarılıysa kredileri ekle
      if (result && result.results && result.results.length > 0) {
        const purchase = result.results[0];
        
        // CONSUMABLE IAP için her zaman kredileri ekle
        await this.handleSuccessfulPurchase(purchase);
        
        // Purchase'ı consume et (consumable için gerekli)
        if (purchase.transactionId || purchase.purchaseToken) {
          await InAppPurchases.finishTransactionAsync(purchase, true);
        }
      }
      
      return { productId, status: 'completed', result };
      
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
   */
  static async restorePurchases() {
    Alert.alert(
      'Kredi Geri Yükleme',
      'Kredi paketleri tüketilebilir ürünlerdir ve otomatik olarak geri yüklenmez. Krediniz bittiyse yeni kredi paketi satın alabilirsiniz.',
      [{ text: 'Anladım' }]
    );
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