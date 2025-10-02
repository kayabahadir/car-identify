import CreditService from './creditService';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import DebugService from './debugService';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
  console.log('✅ InAppPurchases module loaded successfully');
} catch (error) {
  console.error('❌ InAppPurchases module load error:', error);
  // Development ortamında hata fırlatma, sadece log
  console.warn('⚠️ IAP will run in mock mode');
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
  static isCheckingAvailability = false; // Promise guard

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
      // Consumable IAP için her seferinde listener'ı yenile
      console.log('🔄 Initializing IAP (listener refresh for consumable)...');

      // Mock mode'da direkt initialize
      if (!InAppPurchases) {
        console.log('IAP Mock mode - initializing');
        this.isInitialized = true;
        return true;
      }
      
      // IAP sistemini başlat (sadece ilk kez)
      if (!this.isInitialized) {
        console.log('Connecting to IAP service...');
        await InAppPurchases.connectAsync();
        this.isInitialized = true;
      }

      // Satın alma listener'ını her seferinde yeniden kur (consumable IAP için gerekli)
      if (typeof InAppPurchases.setPurchaseListener === 'function') {
        console.log('🎧 Setting up purchase listener...');
        this.purchaseListener = InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
          try {
            console.log('🎧 Purchase listener triggered!', { responseCode, results, errorCode });
            
            if (responseCode === InAppPurchases.IAPResponseCode.OK && Array.isArray(results)) {
              console.log('✅ Purchase successful, processing results:', results.length);
              
              for (const purchase of results) {
                console.log('📦 Processing purchase:', purchase);
                
                // Başarılı satın alma
                if (purchase.acknowledged === false || purchase.acknowledged === undefined) {
                  console.log('💰 Handling successful purchase...');
                  await this.handleSuccessfulPurchase(purchase);
                  
                  if (purchase.transactionId || purchase.purchaseToken) {
                    console.log('✅ Finishing transaction...');
                    await InAppPurchases.finishTransactionAsync(purchase, true);
                  }
                } else {
                  console.log('⚠️ Purchase already acknowledged, skipping');
                }
              }
            } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
              console.log('❌ IAP purchase canceled by user');
            } else if (errorCode) {
              console.error('❌ IAP listener error:', errorCode);
            } else {
              console.log('⚠️ Unknown purchase listener response:', { responseCode, errorCode });
            }
          } catch (listenerErr) {
            console.error('❌ Error in purchase listener:', listenerErr);
          }
        });
        console.log('✅ Purchase listener set up successfully');
      } else {
        console.log('⚠️ setPurchaseListener not available');
      }

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
   * SDK 54'te isAvailableAsync kaldırıldı, direkt product loading ile kontrol ediyoruz
   */
  static async isAvailable() {
    try {
      // Promise guard - aynı anda birden fazla çağrı engelle
      if (this.isCheckingAvailability) {
        DebugService.log('IAP Wait', 'Already checking availability, waiting...', true);
        // Kısa bekle ve cached sonucu dön
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.products.length > 0;
      }

      this.isCheckingAvailability = true;
      
      console.log('🔍 Checking IAP availability (SDK 54 fix)...');
      
      // Mock mode'da her zaman available
      if (!InAppPurchases) {
        console.log('⚠️ IAP Mock Mode - Module not loaded');
        this.isCheckingAvailability = false;
        return true;
      }

      console.log('✅ InAppPurchases module loaded successfully');

      if (!this.isInitialized) {
        console.log('🔄 IAP not initialized, initializing...');
        const initResult = await this.initialize();
        if (!initResult) {
          console.log('❌ IAP initialization failed');
          this.isCheckingAvailability = false;
          return false;
        }
        console.log('✅ IAP initialized successfully');
      }

      // Eğer products zaten cache'de varsa, tekrar yükleme
      if (this.products.length > 0) {
        console.log(`📦 Using cached products (${this.products.length})`);
        this.isCheckingAvailability = false;
        return true;
      }

      // SDK 54'te isAvailableAsync fonksiyonu kaldırıldı
      // Direkt product loading ile availability kontrol edelim
      console.log('🛍️ Testing IAP by loading products directly (isAvailableAsync removed in SDK 54)');
      
      try {
        const productIds = Object.values(this.PRODUCT_IDS);
        console.log('📋 Loading products:', productIds.join(', '));
        
        const result = await InAppPurchases.getProductsAsync(productIds);
        console.log('📊 getProductsAsync completed');
        
        const products = result?.results || [];
        
        if (products.length > 0) {
          console.log(`✅ Found ${products.length} products - IAP is available!`);
          // Cache products for later use
          this.products = products;
          this.isCheckingAvailability = false;
          return true;
        } else {
          console.log('❌ No products found. Check App Store Connect configuration.');
          this.isCheckingAvailability = false;
          return false;
        }
      } catch (productError) {
        console.error('❌ Product loading failed:', productError.message);
        this.isCheckingAvailability = false;
        return false;
      }
    } catch (error) {
      console.error('❌ Overall availability check failed:', error.message);
      this.isCheckingAvailability = false;
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
      console.log('🛍️ Loading IAP products...');
      
      // Mock mode'da products yüklemeyeceğiz
      if (!InAppPurchases) {
        console.log('⚠️ IAP Mock mode - no products to load');
        this.products = [];
        return [];
      }
      
      const productIds = Object.values(this.PRODUCT_IDS);
      console.log('📦 Product IDs to load:', productIds);
      
      const result = await InAppPurchases.getProductsAsync(productIds);
      console.log('📊 getProductsAsync raw result:', result);
      
      const products = result?.results || [];
      this.products = products;
      
      console.log('✅ Successfully loaded products count:', products.length);
      console.log('📋 Product details:', products.map(p => ({
        productId: p.productId,
        price: p.price,
        title: p.title,
        description: p.description
      })));
      
      if (products.length === 0) {
        console.log('⚠️ No products loaded! Possible reasons:');
        console.log('- Products not configured in App Store Connect');
        console.log('- Products not approved');
        console.log('- Bundle ID mismatch');
        console.log('- IAP not enabled for this app');
      }
      
      return this.products;
    } catch (error) {
      console.error('❌ Failed to load products:', error);
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
      console.log('🛒 Starting purchase for product:', productId);
      
      // Her purchase'da listener'ı yeniden kur (consumable IAP için kritik)
      console.log('🔄 Re-initializing IAP for fresh listener...');
      await this.initialize();

      // Mock mode'da simulated purchase
      if (!InAppPurchases) {
        console.log('🎭 InAppPurchases not available - using mock');
        return await this.mockPurchase(productId);
      }
      
      console.log('💳 Starting real IAP purchase - Platform:', Platform.OS, 'Product:', productId);
      
      // Purchase işlemini başlat - sadece Apple ödeme ekranını aç
      const result = await InAppPurchases.purchaseItemAsync(productId);
      console.log('✅ Purchase dialog completed:', result);
      
      // ÖNEMLİ: Burada manuel processing YAPMA!
      // Purchase listener otomatik olarak çalışacak ve kredileri ekleyecek
      // Manuel processing sadece listener çalışmazsa gerekli
      
      return { productId, status: 'purchase_initiated', result };
      
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
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
   * Mock purchase for development - Enhanced for testing
   */
  static async mockPurchase(productId) {
    console.log('🎭 Starting mock purchase for', productId);
    
    // 2 saniye bekle (simulate purchase flow)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock success
    const packageInfo = this.CREDIT_PACKAGES[productId];
    console.log('📦 Package info for', productId, ':', packageInfo);
    
    if (packageInfo) {
      console.log('💰 Adding', packageInfo.credits, 'credits (mock)');
      
      try {
        const currentCredits = await CreditService.getCredits();
        console.log('📊 Current credits before:', currentCredits);
        
        await CreditService.addCredits(packageInfo.credits);
        
        const newCredits = await CreditService.getCredits();
        console.log('📊 Current credits after:', newCredits);
        
        // Mock purchase completed successfully
        
        console.log('✅ Successfully added', packageInfo.credits, 'credits!');
      } catch (error) {
        console.error('❌ Error adding credits:', error);
      }
    } else {
      console.error('❌ Product', productId, 'not found in CREDIT_PACKAGES');
    }
    
    return { productId, status: 'mock_completed' };
  }

  /**
   * Başarılı satın alma işlemini handle eder
   */
  static async handleSuccessfulPurchase(purchase) {
    try {
      console.log('🎉 handleSuccessfulPurchase called with:', purchase);
      
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      console.log('📦 Package info for', purchase.productId, ':', packageInfo);
      
      if (!packageInfo) {
        console.error('❌ Unknown product ID:', purchase.productId);
        Alert.alert('Purchase Error', `Unknown product: ${purchase.productId}`);
        return;
      }

      console.log('💰 Adding credits from real purchase:', packageInfo.credits);
      
      // Kredi ekle
      const currentCredits = await CreditService.getCredits();
      console.log('📊 Credits before real purchase:', currentCredits);
      
      await CreditService.addCredits(packageInfo.credits);
      
      const newCredits = await CreditService.getCredits();
      console.log('📊 Credits after real purchase:', newCredits);
      
      // Başarılı satın alma mesajını göster (listener içinden)
      Alert.alert(
        '🎉 Purchase Successful!',
        `${packageInfo.credits} credits have been added to your account.`,
        [{ 
          text: 'Continue', 
          onPress: () => {
            // Navigation burada mümkün değil, global event gönderebiliriz
            console.log('✅ Purchase completed successfully');
          }
        }]
      );

    } catch (error) {
      console.error('❌ Error handling successful purchase:', error);
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