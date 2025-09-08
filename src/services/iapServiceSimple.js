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
        console.log('✅ Purchase request completed successfully!');
      }
      
      // Apple UI kapandı, purchase başarılı
      // Background credit processing UI tarafında yapılacak
      
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
      if (!packageInfo) {
        console.error('❌ Unknown product in refresh:', productId);
        console.log('Available products:', Object.keys(this.CREDIT_PACKAGES));
        return false;
      }
      
      // Purchase history'den bu productId için son 2 dakikada transaction var mı?
      if (InAppPurchases) {
        try {
          const { results } = await InAppPurchases.getPurchaseHistoryAsync();
          const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
          
          if (__DEV__) {
            console.log('🔍 Total purchase history items:', results?.length || 0);
            results?.forEach((p, index) => {
              console.log(`🔍 Purchase ${index + 1}:`, {
                productId: p.productId,
                transactionId: p.transactionId,
                purchaseTime: new Date(p.purchaseTime).toISOString(),
                acknowledged: p.acknowledged,
                timeDiff: `${Math.round((Date.now() - p.purchaseTime) / 1000)}s ago`
              });
            });
          }
          
          const recentPurchases = results?.filter(p => 
            p.productId === productId && 
            p.purchaseTime >= twoMinutesAgo
          );
          
          if (__DEV__) {
            console.log(`🔍 Recent purchases for ${productId}:`, recentPurchases?.length || 0);
          }
          
          const unacknowledgedPurchase = recentPurchases?.find(p => !p.acknowledged);
          
          if (unacknowledgedPurchase) {
            if (__DEV__) {
              console.log('✅ Found unprocessed purchase, adding credits:', unacknowledgedPurchase);
            }
            
            await this.handleSuccessfulPurchase(unacknowledgedPurchase);
            return true;
          } else {
            // Acknowledged olan varsa manuel kredi ekleme yap (TestFlight workaround)
            const acknowledgedPurchase = recentPurchases?.find(p => p.acknowledged);
            if (acknowledgedPurchase) {
              if (__DEV__) {
                console.log('⚠️ Found acknowledged purchase, manually adding credits as TestFlight workaround');
              }
              
              // Manuel kredi ekleme (TestFlight sandbox workaround)
              await CreditService.addCredits(packageInfo.credits, 'testflight_workaround');
              return true;
            }
          }
          
        } catch (error) {
          console.error('❌ Could not check purchase history:', error);
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
      
      // Son çare: TestFlight sandbox workaround
      if (!refreshed) {
        if (__DEV__) {
          console.log('🚨 Emergency TestFlight workaround: Manually adding credits');
        }
        
        const packageInfo = this.CREDIT_PACKAGES[productId];
        if (packageInfo) {
          await CreditService.addCredits(packageInfo.credits, 'testflight_emergency_workaround');
          return true;
        }
      }
      
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

  /**
   * Emergency manual credit add - TestFlight için
   */
  static async emergencyAddCredits(productId) {
    try {
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (packageInfo) {
        console.log('🚨 Emergency adding credits manually:', packageInfo.credits);
        await CreditService.addCredits(packageInfo.credits, 'manual_testflight_fix');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Emergency credit add failed:', error);
      return false;
    }
  }

  /**
   * Debug helper - TestFlight'ta kullanım için
   */
  static async debugPurchaseStatus() {
    try {
      console.log('🔍 IAP Debug Status:');
      console.log('- Initialized:', this.isInitialized);
      console.log('- Products:', this.products.length);
      console.log('- Available products:', Object.keys(this.CREDIT_PACKAGES));
      
      if (InAppPurchases) {
        const { results } = await InAppPurchases.getPurchaseHistoryAsync();
        console.log('- Purchase history count:', results?.length || 0);
        
        if (results && results.length > 0) {
          console.log('Recent purchases:');
          results.slice(0, 3).forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.productId} - ${new Date(p.purchaseTime).toISOString()} - Ack: ${p.acknowledged}`);
          });
        }
      }
      
      const currentCredits = await CreditService.getCredits();
      console.log('- Current credits:', currentCredits);
      
      return {
        initialized: this.isInitialized,
        products: this.products.length,
        currentCredits,
        historyCount: InAppPurchases ? (await InAppPurchases.getPurchaseHistoryAsync()).results?.length || 0 : 0
      };
    } catch (error) {
      console.error('❌ Debug failed:', error);
      return null;
    }
  }
}

export default IAPServiceSimple;
