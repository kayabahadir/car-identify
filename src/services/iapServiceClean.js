import CreditService from './creditService';
import { Alert } from 'react-native';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
  console.log('✅ InAppPurchases module loaded successfully');
} catch (error) {
  console.error('❌ InAppPurchases module load error:', error);
  console.warn('⚠️ IAP will run in mock mode');
}

/**
 * Clean IAP Service - Basit ve çalışan consumable IAP sistemi
 * Akış: Buy Button > Apple Payment > Success > Navigate Home > Credits Added
 */
class CleanIAPService {
  static isInitialized = false;
  static products = [];
  static navigationCallback = null;

  // Mevcut consumable product ID'ler
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
   * IAP sistemini başlat
   */
  static async initialize() {
    try {
      if (!InAppPurchases) {
        console.log('⚠️ IAP Mock mode - initialized');
        this.isInitialized = true;
        return true;
      }

      // HER SEFERINDE yeniden initialize et (TestFlight için)
      console.log('🔄 Re-initializing IAP service...');

      // IAP'ı bağla
      await InAppPurchases.connectAsync();
      
      // Purchase listener kur - HER SEFERINDE yeniden
      InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
        console.log('🎧 Purchase listener triggered:', { responseCode, results, errorCode });
        
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
          for (const purchase of results) {
            console.log('🎯 Processing purchase:', purchase);
            await this.handlePurchaseSuccess(purchase);
          }
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('❌ User canceled purchase');
        } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
          console.log('⏳ Purchase deferred');
        } else {
          console.log('⚠️ Purchase listener - other response:', responseCode, errorCode);
        }
      });

      this.isInitialized = true;
      console.log('✅ Clean IAP Service initialized');
      return true;

    } catch (error) {
      console.error('❌ IAP initialization failed:', error);
      return false;
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
      
      console.log('📦 Loaded products:', this.products.length);
      return this.products;

    } catch (error) {
      console.error('❌ Failed to load products:', error);
      return [];
    }
  }

  /**
   * Ürün satın al - TEK FONKSİYON
   */
  static async purchaseProduct(productId) {
    try {
      console.log('🛒 Starting purchase:', productId);

      // Initialize et - HER SEFERINDE
      await this.initialize();

      if (!InAppPurchases) {
        // Mock purchase
        return await this.mockPurchase(productId);
      }

      // Gerçek purchase
      console.log('💳 Starting real purchase...');
      const result = await InAppPurchases.purchaseItemAsync(productId);
      
      console.log('✅ Purchase API result:', result);
      
      // Eğer result.results varsa ve içinde purchase varsa, hemen işle
      if (result && result.results && result.results.length > 0) {
        console.log('🎯 Processing immediate results:', result.results);
        for (const purchase of result.results) {
          // RESTORE durumunu ZORLA yeni purchase olarak işle
          console.log('🔄 Force processing as new purchase:', purchase.productId);
          await this.handlePurchaseSuccess(purchase);
        }
      }
      
      return { success: true, result };

    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
      if (error.code === InAppPurchases?.IAPErrorCode?.USER_CANCELED) {
        throw new Error('Purchase canceled');
      }
      
      throw new Error('Purchase failed: ' + error.message);
    }
  }

  /**
   * Mock purchase (development)
   */
  static async mockPurchase(productId) {
    if (__DEV__) {
      console.log('🎭 Mock purchase started:', productId);
    }
    
    // 2 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Kredileri ekle
    const packageInfo = this.CREDIT_PACKAGES[productId];
    
    if (packageInfo) {
      try {
        await CreditService.addCredits(packageInfo.credits);
        
        // Kredileri kontrol et
        const currentCredits = await CreditService.getCredits();
        
        // Success mesajı göster - setTimeout ile delay
        setTimeout(() => {
          Alert.alert(
            '🎉 Purchase Successful!',
            `${packageInfo.credits} credits added to your account.`,
            [{ 
              text: 'Continue', 
              onPress: () => {
                if (this.navigationCallback) {
                  this.navigationCallback();
                }
              }
            }]
          );
        }, 500);
        
      } catch (creditError) {
        if (__DEV__) {
          console.error('❌ Error adding credits:', creditError);
        }
      }
    } else {
      if (__DEV__) {
        console.error('❌ Package info not found for product:', productId);
        console.log('📋 Available packages:', Object.keys(this.CREDIT_PACKAGES));
      }
    }
    
    return { success: true, mock: true };
  }

  /**
   * Purchase başarılı olduğunda
   */
  static async handlePurchaseSuccess(purchase) {
    try {
      console.log('🎉 Purchase success:', purchase.productId);
      
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('❌ Unknown product:', purchase.productId);
        return;
      }

      // Kredileri ekle
      await CreditService.addCredits(packageInfo.credits);
      console.log('✅ Credits added successfully');
      
      // Transaction'ı bitir - ÖNCE bitir
      if (purchase.transactionId || purchase.purchaseToken) {
        await InAppPurchases.finishTransactionAsync(purchase, true);
        console.log('✅ Transaction finished');
      }

      // Success mesajı göster - setTimeout ile delay
      setTimeout(() => {
        Alert.alert(
          '🎉 Purchase Successful!',
          `${packageInfo.credits} credits added to your account.`,
          [{ 
            text: 'Continue', 
            onPress: () => {
              console.log('🏠 Navigating to home...');
              if (this.navigationCallback) {
                this.navigationCallback();
              } else {
                console.log('⚠️ No navigation callback set');
              }
            }
          }]
        );
      }, 500);

    } catch (error) {
      console.error('❌ Error handling purchase success:', error);
    }
  }

  /**
   * Navigation callback set et
   */
  static setNavigationCallback(callback) {
    this.navigationCallback = callback;
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
