import { Alert, Platform } from 'react-native';
import CreditService from './creditService';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (error) {
  if (!__DEV__) {
    console.error('❌ CRITICAL: InAppPurchases module not available in production');
    throw new Error('IAP module required for production builds');
  }
  console.warn('⚠️ InAppPurchases module not available in development environment');
}

/**
 * Simple IAP Service - TestFlight uyumlu basit yaklaşım
 */
class IAPServiceSimple {
  static isInitialized = false;
  static products = [];
  static purchaseListener = null;

  // Ürün ID'leri - App Store Connect'te tanımlanmış olanlar
  static PRODUCT_IDS = {
    CREDITS_10: 'com.caridentify.credits10',
    CREDITS_50: 'com.caridentify.credits50', 
    CREDITS_200: 'com.caridentify.credits200'
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
        console.log('💳 Purchase request sent, waiting for Apple...');
      }
      
      // Apple UI tamamlandıktan sonra credit refresh yapacağız
      // Purchase listener çalışmazsa manuel credit ekleyeceğiz
      
      return { productId, status: 'requested' };
      
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
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const packageInfo = this.CREDIT_PACKAGES[productId];
    if (packageInfo) {
      await CreditService.addCredits(packageInfo.credits, 'in_app_purchase');
    }
    
    return { productId, status: 'completed', credits: packageInfo.credits };
  }

  /**
   * Purchase listener - basit
   */
  static setPurchaseListener() {
    if (!InAppPurchases) {
      return;
    }

    if (this.purchaseListener) {
      this.purchaseListener.remove();
    }

    this.purchaseListener = InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
      if (__DEV__) {
        console.log('📱 Purchase listener called:', { responseCode, results, errorCode });
      }

      if (InAppPurchases && responseCode === InAppPurchases.IAPResponseCode.OK) {
        // Başarılı satın almalar
        results?.forEach(purchase => {
          if (purchase.acknowledged === false) {
            this.handleSuccessfulPurchase(purchase);
          }
        });
      } else if (InAppPurchases && responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        if (__DEV__) {
          console.log('🚫 User canceled purchase');
        }
      } else {
        console.error('❌ Purchase failed with response code:', responseCode, errorCode);
      }
    });
  }

  /**
   * Başarılı purchase'ı işle - basit
   */
  static async handleSuccessfulPurchase(purchase) {
    try {
      const { productId } = purchase;
      const packageInfo = this.CREDIT_PACKAGES[productId];
      
      if (!packageInfo) {
        console.error('❌ Unknown product:', productId);
        return;
      }

      // Kredileri ekle
      await CreditService.addCredits(packageInfo.credits, 'in_app_purchase');
      
      // Transaction'ı acknowledge et
      if (InAppPurchases) {
        await InAppPurchases.finishTransactionAsync(purchase, true);
      }
      
      if (__DEV__) {
        console.log('✅ Purchase processed successfully:', productId);
      }
      
    } catch (error) {
      console.error('❌ Failed to process purchase:', error);
    }
  }

  /**
   * Kredi refresh - Manual fallback
   */
  static async refreshCreditsAfterPurchase(productId) {
    try {
      if (__DEV__) {
        console.log('🔄 Manual credit refresh for:', productId);
      }
      
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (packageInfo) {
        // Duplicate kontrolü için transaction history kontrol et
        const currentCredits = await CreditService.getCredits();
        
        // Purchase history'den bu productId için son 2 dakikada transaction var mı?
        if (InAppPurchases) {
          try {
            const { results } = await InAppPurchases.getPurchaseHistoryAsync();
            const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
            
            const recentPurchase = results?.find(p => 
              p.productId === productId && 
              p.purchaseTime >= twoMinutesAgo &&
              !p.acknowledged
            );
            
            if (recentPurchase) {
              if (__DEV__) {
                console.log('🔄 Found unprocessed purchase, adding credits');
              }
              
              await this.handleSuccessfulPurchase(recentPurchase);
              return true;
            }
          } catch (error) {
            if (__DEV__) {
              console.log('⚠️ Could not check purchase history:', error);
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Credit refresh failed:', error);
      return false;
    }
  }

  /**
   * Purchase'dan sonra credit kontrol helper
   */
  static async checkAndRefreshCredits(productId, expectedCredits) {
    try {
      // 3 saniye bekle (Apple UI kapanması için)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const initialCredits = await CreditService.getCredits();
      
      // 5 saniye boyunca her saniye kontrol et
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentCredits = await CreditService.getCredits();
        const creditIncrease = currentCredits - initialCredits;
        
        if (creditIncrease >= expectedCredits) {
          if (__DEV__) {
            console.log(`✅ Credits increased by ${creditIncrease}, expected ${expectedCredits}`);
          }
          return true; // Credits başarıyla arttı
        }
      }
      
      // Hala artmadıysa manual refresh dene
      if (__DEV__) {
        console.log('⚠️ Credits not increased, trying manual refresh');
      }
      
      const refreshed = await this.refreshCreditsAfterPurchase(productId);
      return refreshed;
      
    } catch (error) {
      console.error('❌ Check and refresh failed:', error);
      return false;
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
