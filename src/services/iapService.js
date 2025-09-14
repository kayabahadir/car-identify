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
 * TESTFLIGHT OPTIMIZED: Enhanced for TestFlight environment
 */
class IAPService {
  static isInitialized = false;
  static products = [];
  static purchaseListener = null;

  // Receipt validation endpoint
  static RECEIPT_VALIDATION_URL = process.env.EXPO_PUBLIC_API_BASE_URL 
    ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/validate-receipt`
    : null;

  // IAP ürün ID'leri - YENİ CONSUMABLE products (tekrar satın alınabilir)
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
   * TESTFLIGHT ENHANCED: IAP servisini başlatır
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

      if (__DEV__) {
        console.log('🚀 [TESTFLIGHT] Initializing CONSUMABLE IAP service...');
        console.log('📱 Platform:', Platform.OS);
        console.log('🔍 Environment:', __DEV__ ? 'Development' : 'Production');
      }
      
      // IAP sistemini başlat - TestFlight için enhanced
      await InAppPurchases.connectAsync();
      
      if (__DEV__) {
        console.log('✅ [TESTFLIGHT] CONSUMABLE IAP service initialized successfully');
      }
      
      this.isInitialized = true;
      return true;
      
    } catch (error) {
      console.error('❌ [TESTFLIGHT] Failed to initialize IAP service:', error);
      console.error('❌ [TESTFLIGHT] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      return false;
    }
  }

  /**
   * TESTFLIGHT SPECIFIC: Enhanced IAP availability check
   */
  static async isAvailable() {
    try {
      if (__DEV__) {
        console.log('🔍 === [TESTFLIGHT] IAP AVAILABILITY CHECK START ===');
        console.log('📱 Platform:', Platform.OS);
        console.log('🏗️ Build type:', __DEV__ ? 'Development' : 'Production/TestFlight');
      }

      // Mock mode'da her zaman available
      if (!InAppPurchases) {
        if (__DEV__) {
          console.log('📱 [TESTFLIGHT] Running in mock mode (no InAppPurchases module)');
        }
        return true;
      }

      if (!this.isInitialized) {
        if (__DEV__) {
          console.log('🔧 [TESTFLIGHT] IAP not initialized, initializing now...');
        }
        const initResult = await this.initialize();
        if (!initResult) {
          console.error('❌ [TESTFLIGHT] Initialization failed!');
          return false;
        }
      }

      if (__DEV__) {
        console.log('🔍 [TESTFLIGHT] Calling InAppPurchases.isAvailableAsync()...');
      }

      const available = await InAppPurchases.isAvailableAsync();
      
      if (__DEV__) {
        console.log('💳 [TESTFLIGHT] InAppPurchases.isAvailableAsync() result:', available);
        
        if (!available) {
          console.log('❌ [TESTFLIGHT] IAP NOT AVAILABLE - TestFlight specific reasons:');
          console.log('   • TestFlight sandbox test user not signed in');
          console.log('   • IAP disabled in Settings > Screen Time > Content & Privacy');
          console.log('   • Network connectivity issues');
          console.log('   • Bundle ID mismatch in App Store Connect');
          console.log('   • Product IDs not created in App Store Connect');
          console.log('   • Device region/currency restrictions');
          
          // TestFlight specific additional checks
          console.log('🔧 [TESTFLIGHT] Additional debug info:');
          console.log('   • Try signing out of App Store and signing in with test user');
          console.log('   • Check Settings > App Store > Sandbox Account');
          console.log('   • Ensure IAPs exist in App Store Connect with exact same Bundle ID');
        }
        
        console.log('🔍 === [TESTFLIGHT] IAP AVAILABILITY CHECK END ===');
      }

      return available;
    } catch (error) {
      console.error('❌ [TESTFLIGHT] Error checking IAP availability:', error);
      console.error('❌ [TESTFLIGHT] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * TESTFLIGHT ENHANCED: Product loading with detailed debugging
   */
  static async loadProducts() {
    try {
      // Mock mode'da products yüklemeyeceğiz
      if (!InAppPurchases) {
        this.products = [];
        return [];
      }

      if (__DEV__) {
        console.log('🔍 === [TESTFLIGHT] LOADING IAP PRODUCTS START ===');
        console.log('📦 [TESTFLIGHT] Product IDs to load:', Object.values(this.PRODUCT_IDS));
      }
      
      const productIds = Object.values(this.PRODUCT_IDS);
      const result = await InAppPurchases.getProductsAsync(productIds);
      
      if (__DEV__) {
        console.log('📦 [TESTFLIGHT] getProductsAsync() raw result:', result);
      }
      
      const products = result?.results || [];
      this.products = products;
      
      if (__DEV__) {
        console.log(`📦 [TESTFLIGHT] Successfully loaded ${products.length} products:`);
        products.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.productId}: ${product.price || 'NO PRICE'}`);
          console.log(`      Title: ${product.title || 'NO TITLE'}`);
          console.log(`      Description: ${product.description || 'NO DESCRIPTION'}`);
        });
        
        if (products.length === 0) {
          console.log('❌ [TESTFLIGHT] NO PRODUCTS LOADED - TestFlight specific reasons:');
          console.log('   • Product IDs not matching App Store Connect exactly');
          console.log('   • Bundle ID mismatch between app and App Store Connect');
          console.log('   • IAPs not created for this Bundle ID in App Store Connect');
          console.log('   • Sandbox environment connection issues');
          console.log('   • Test user account issues');
          
          // Individual product test
          console.log('🔧 [TESTFLIGHT] Testing individual products...');
          for (const productId of productIds) {
            try {
              const singleResult = await InAppPurchases.getProductsAsync([productId]);
              const singleProducts = singleResult?.results || [];
              console.log(`   • ${productId}: ${singleProducts.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
            } catch (err) {
              console.log(`   • ${productId}: ❌ ERROR - ${err.message}`);
            }
          }
        }
        
        console.log('🔍 === [TESTFLIGHT] LOADING IAP PRODUCTS END ===');
      }
      
      return this.products;
    } catch (error) {
      console.error('❌ [TESTFLIGHT] Failed to load products:', error);
      console.error('❌ [TESTFLIGHT] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
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
      console.error('❌ [TESTFLIGHT] Error getting products:', error);
      return [];
    }
  }

  /**
   * TESTFLIGHT ENHANCED: Debug product availability specifically
   */
  static async debugProductAvailability() {
    try {
      if (__DEV__) {
        console.log('🔍 === [TESTFLIGHT] PRODUCT AVAILABILITY DEBUG ===');
        
        const isAvail = await this.isAvailable();
        console.log('1. [TESTFLIGHT] IAP Service Available:', isAvail);
        
        if (isAvail) {
          const products = await this.loadProducts();
          console.log('2. [TESTFLIGHT] Products loaded count:', products.length);
          
          if (products.length === 0) {
            console.log('3. [TESTFLIGHT] Zero products - this is the main issue!');
            console.log('4. [TESTFLIGHT] Likely causes:');
            console.log('   • App Store Connect: IAPs not created for Bundle ID com.caridentify.app');
            console.log('   • Bundle ID mismatch');
            console.log('   • TestFlight sandbox issues');
          }
        } else {
          console.log('2. [TESTFLIGHT] IAP Service not available - this is blocking everything!');
        }
        
        console.log('🔍 === [TESTFLIGHT] PRODUCT DEBUG END ===');
      }
    } catch (error) {
      console.error('❌ [TESTFLIGHT] Debug failed:', error);
    }
  }

  /**
   * TESTFLIGHT: Force fallback mode for testing
   */
  static async enableTestFlightFallback() {
    if (__DEV__) {
      console.log('🔧 [TESTFLIGHT] Enabling fallback mode for testing...');
    }
    
    // Override isAvailable to return true
    this.isAvailable = async () => {
      console.log('🔧 [TESTFLIGHT] FALLBACK MODE: Forcing IAP available = true');
      return true;
    };
    
    // Override getProducts to return mock data
    this.getProducts = async () => {
      console.log('🔧 [TESTFLIGHT] FALLBACK MODE: Returning mock products');
      return [
        { productId: 'com.caridentify.credits.pack10', price: '₺99,99', title: '10 Credits', description: 'Test product' },
        { productId: 'com.caridentify.credits.pack50', price: '₺289,99', title: '50 Credits', description: 'Test product' },
        { productId: 'com.caridentify.credits.pack200', price: '₺829,99', title: '200 Credits', description: 'Test product' }
      ];
    };
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

      if (__DEV__) {
        console.log('💳 [TESTFLIGHT] Initiating CONSUMABLE purchase for:', productId);
      }
      
      // Purchase işlemini başlat
      const result = await InAppPurchases.purchaseItemAsync(productId);
      
      if (__DEV__) {
        console.log('💳 [TESTFLIGHT] CONSUMABLE Purchase result:', result);
      }
      
      // Purchase başarılıysa kredileri ekle
      if (result && result.results && result.results.length > 0) {
        const purchase = result.results[0];
        
        // CONSUMABLE IAP için her zaman kredileri ekle
        await this.handleSuccessfulPurchase(purchase);
        
        // Purchase'ı consume et (consumable için gerekli)
        if (purchase.transactionId || purchase.purchaseToken) {
          await InAppPurchases.finishTransactionAsync(purchase, true);
          
          if (__DEV__) {
            console.log('✅ [TESTFLIGHT] CONSUMABLE purchase completed and consumed');
          }
        }
      }
      
      return { productId, status: 'completed', result };
      
    } catch (error) {
      console.error('❌ [TESTFLIGHT] CONSUMABLE Purchase failed:', error);
      
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
      console.log('🧪 [TESTFLIGHT] Mock CONSUMABLE purchase for:', productId);
    }
    
    // 2 saniye bekle (simulate purchase flow)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock success
    const packageInfo = this.CREDIT_PACKAGES[productId];
    if (packageInfo) {
      await CreditService.addCredits(packageInfo.credits);
      if (__DEV__) {
        console.log(`✅ [TESTFLIGHT] Mock CONSUMABLE purchase successful: +${packageInfo.credits} credits`);
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
        console.log('🎉 [TESTFLIGHT] Processing successful CONSUMABLE purchase:', purchase.productId);
      }

      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('❌ [TESTFLIGHT] Unknown product ID:', purchase.productId);
        return;
      }

      // Kredi ekle
      await CreditService.addCredits(packageInfo.credits);
      
      if (__DEV__) {
        console.log(`✅ [TESTFLIGHT] Added ${packageInfo.credits} credits for CONSUMABLE ${purchase.productId}`);
      }

    } catch (error) {
      console.error('❌ [TESTFLIGHT] Error handling successful CONSUMABLE purchase:', error);
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
        if (__DEV__) {
          console.log('🔌 [TESTFLIGHT] CONSUMABLE IAP service disconnected');
        }
      }
      
      this.isInitialized = false;
      this.products = [];
      this.purchaseListener = null;
      
    } catch (error) {
      console.error('❌ [TESTFLIGHT] Error disconnecting IAP service:', error);
    }
  }
}

export default IAPService;