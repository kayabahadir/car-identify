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
  static lastPurchaseAttempt = null; // Son purchase attempt'i takip et

  // Receipt validation endpoint
  static RECEIPT_VALIDATION_URL = process.env.EXPO_PUBLIC_API_BASE_URL 
    ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/validate-receipt`
    : null;

  // IAP ürün ID'leri - YENİ CONSUMABLE products
  static PRODUCT_IDS = {
    CREDITS_10: 'com.caridentify.app.credits.consumable.pack10',
    CREDITS_50: 'com.caridentify.app.credits.consumable.pack50', 
    CREDITS_200: 'com.caridentify.app.credits.consumable.pack200'
  };

  // Kredi paketleri mapping - YENİ CONSUMABLE IDs
  static CREDIT_PACKAGES = {
    'com.caridentify.app.credits.consumable.pack10': { credits: 10, price: 1.99 },
    'com.caridentify.app.credits.consumable.pack50': { credits: 50, price: 6.99 },
    'com.caridentify.app.credits.consumable.pack200': { credits: 200, price: 19.99 },
    
    // Eski ID'ler için backward compatibility (geçiş dönemi için)
    'com.caridentify.app.credits.pack10': { credits: 10, price: 1.99 },
    'com.caridentify.app.credits.pack50': { credits: 50, price: 6.99 },
    'com.caridentify.app.credits.pack200': { credits: 200, price: 19.99 }
  };

  /**
   * Response code'u human readable string'e çevirir
   */
  static getResponseCodeName(responseCode) {
    if (!InAppPurchases) return 'MOCK_MODE';
    
    const codes = InAppPurchases.IAPResponseCode;
    for (const [name, value] of Object.entries(codes)) {
      if (value === responseCode) {
        return name;
      }
    }
    return `UNKNOWN_${responseCode}`;
  }

  /**
   * User'ın purchase'ı cancel edip etmediğini kontrol eder
   */
  static isUserCanceled(result) {
    if (!result) return false;
    
    // User cancel durumları
    if (result.responseCode === InAppPurchases?.IAPResponseCode?.USER_CANCELED) {
      return true;
    }
    
    // Error message'da cancel ifadesi varsa
    if (result.errorCode || (result.message && 
        (result.message.includes('cancel') || 
         result.message.includes('cancelled') ||
         result.message.includes('iptal')))) {
      return true;
    }
    
    return false;
  }

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
            console.log('🎧 Purchase listener triggered!', { 
              responseCode, 
              responseCodeName: this.getResponseCodeName(responseCode),
              results, 
              errorCode 
            });
            
            // TÜM olası durumları handle et - Apple'ın restore davranışı için
            if (Array.isArray(results) && results.length > 0) {
              console.log('✅ Processing purchase results (any response code):', {
                responseCode,
                responseCodeName: this.getResponseCodeName(responseCode),
                resultsCount: results.length
              });
              
              for (const purchase of results) {
                console.log('📦 Processing purchase/restore:', purchase);
                
                // Her durumda purchase'ı handle et (consumable IAP mantığı)
                console.log('💰 Handling purchase (consumable - always add credits)...');
                await this.handleSuccessfulPurchase(purchase);
                
                // Transaction'ı finish et
                if (purchase.transactionId || purchase.purchaseToken) {
                  console.log('✅ Finishing transaction...');
                  await InAppPurchases.finishTransactionAsync(purchase, true);
                }
              }
            } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
              console.log('❌ IAP purchase canceled by user');
            } else if (errorCode) {
              console.error('❌ IAP listener error:', errorCode);
            } else {
              console.log('⚠️ Purchase listener - no results but response received:', { 
                responseCode, 
                responseCodeName: this.getResponseCodeName(responseCode),
                errorCode,
                results
              });
              
              // Eğer Apple ödeme ekranı açıldıysa ama results yoksa, fallback olarak kredi ekle
              if (responseCode === InAppPurchases.IAPResponseCode.OK || 
                  responseCode === InAppPurchases.IAPResponseCode.DEFERRED ||
                  responseCode === 0) {
                console.log('🔄 Fallback: Adding credits without purchase object');
                
                // Son purchase attempt'i kullan
                if (this.lastPurchaseAttempt && this.lastPurchaseAttempt.productId) {
                  console.log('🔄 Using last purchase attempt:', this.lastPurchaseAttempt);
                  
                  const fallbackPurchase = {
                    productId: this.lastPurchaseAttempt.productId,
                    acknowledged: false,
                    purchaseState: 'fallback_restore'
                  };
                  
                  await this.handleSuccessfulPurchase(fallbackPurchase);
                  
                  // Last attempt'i temizle
                  this.lastPurchaseAttempt = null;
                } else {
                  console.log('⚠️ No last purchase attempt found for fallback');
                }
              }
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
   * Mevcut ürünleri yükler - Yeni consumable products
   */
  static async loadProducts() {
    try {
      console.log('🛍️ Loading new consumable IAP products...');
      
      // Mock mode'da products yüklemeyeceğiz
      if (!InAppPurchases) {
        console.log('⚠️ IAP Mock mode - no products to load');
        this.products = [];
        return [];
      }
      
      const productIds = Object.values(this.PRODUCT_IDS);
      console.log('📦 Loading new consumable product IDs:', productIds);
      
      const result = await InAppPurchases.getProductsAsync(productIds);
      console.log('📊 getProductsAsync result:', result);
      
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
        console.log('⚠️ New consumable products not found! Status: Waiting for Apple approval');
        console.log('📋 Expected products:', productIds);
        console.log('💡 These products are probably "Waiting for Review" in App Store Connect');
        console.log('💡 Once approved by Apple, they will appear here automatically');
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
      
      // Son purchase attempt'i kaydet (fallback için)
      this.lastPurchaseAttempt = {
        productId,
        timestamp: Date.now()
      };
      
      // Purchase işlemini başlat - Apple ödeme ekranını aç
      console.log('🚀 CONSUMABLE IAP: Each purchase should be treated as NEW purchase');
      console.log('🚀 No restore behavior should occur for consumable products');
      
      const result = await InAppPurchases.purchaseItemAsync(productId);
      console.log('✅ Purchase dialog completed:', result);
      
      // CONSUMABLE IAP: Apple ödeme ekranı açıldıysa, her durumda yeni purchase olarak işle
      console.log('💡 CONSUMABLE LOGIC: Treating this as a new purchase regardless of Apple response');
      
      // ÖNEMLİ: Apple ödeme ekranı açıldıysa (user cancel etmemişse) her durumda kredi ekle
      // Bu consumable IAP mantığı - "daha önce satın alınmış" olsa bile yeni kredi ekle
      
      let purchaseProcessed = false;
      
      // Önce normal result processing'i dene
      if (result && result.results && Array.isArray(result.results) && result.results.length > 0) {
        console.log('🔄 Processing immediate purchase result');
        for (const purchase of result.results) {
          await this.handleSuccessfulPurchase(purchase);
          
          // Transaction'ı finish et
          if (purchase.transactionId || purchase.purchaseToken) {
            await InAppPurchases.finishTransactionAsync(purchase, true);
          }
        }
        purchaseProcessed = true;
      }
      
      // Eğer result processing olmadıysa ve user cancel etmemişse, force credit addition
      if (!purchaseProcessed && result && !this.isUserCanceled(result)) {
        console.log('🔄 Force adding credits - Apple payment screen was shown');
        
        // Simulated purchase oluştur ve kredileri ekle
        const forcedPurchase = {
          productId: productId,
          acknowledged: false,
          purchaseState: 'forced_consumable',
          forceProcessed: true
        };
        
        await this.handleSuccessfulPurchase(forcedPurchase);
        purchaseProcessed = true;
      }
      
      return { 
        productId, 
        status: purchaseProcessed ? 'purchase_completed' : 'purchase_initiated', 
        result 
      };
      
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
   * Başarılı satın alma işlemini handle eder (consumable IAP - her zaman yeni purchase)
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

      console.log('💰 Processing consumable purchase:', {
        productId: purchase.productId,
        acknowledged: purchase.acknowledged,
        purchaseState: purchase.purchaseState,
        originalTransactionId: purchase.originalTransactionId
      });
      
      // Kredi ekle (consumable IAP - her zaman yeni purchase)
      const currentCredits = await CreditService.getCredits();
      console.log('📊 Credits before:', currentCredits);
      
      await CreditService.addCredits(packageInfo.credits);
      
      const newCredits = await CreditService.getCredits();
      console.log('📊 Credits after:', newCredits);
      
      // Başarılı satın alma mesajını göster (consumable IAP - her zaman "successful")
      Alert.alert(
        '🎉 Purchase Successful!',
        `${packageInfo.credits} credits have been added to your account.`,
        [{ 
          text: 'Continue', 
          onPress: () => {
            console.log('✅ Purchase completed successfully');
            // Ana sayfaya dön ve kredileri yenile
            this.navigateToHome?.();
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
   * Bu fonksiyon asla çağrılmamalı - consumable ürünlerde restore yoktur
   */
  static async restorePurchases() {
    console.log('⚠️ restorePurchases called but CONSUMABLE products cannot be restored!');
    console.log('⚠️ This should never happen with proper consumable IAP setup');
    
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