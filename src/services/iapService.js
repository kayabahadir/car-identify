import { Alert, Platform } from 'react-native';
import CreditService from './creditService';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (error) {
  // Production'da IAP eksikliği kritik hata olmalı
  if (!__DEV__) {
    console.error('❌ CRITICAL: InAppPurchases module not available in production');
    throw new Error('IAP module required for production builds');
  }
  console.warn('⚠️ InAppPurchases module not available in development environment');
}

/**
 * In-App Purchase Service - Expo IAP ile entegrasyon
 */
class IAPService {
  static isInitialized = false;
  static products = [];
  static purchaseListener = null;
  static purchasePromiseResolvers = new Map(); // Purchase promise tracking

  // Receipt validation endpoint
  static RECEIPT_VALIDATION_URL = process.env.EXPO_PUBLIC_API_BASE_URL 
    ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/validate-receipt`
    : null;

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

      // Expo Go'da IAP mevcut değilse mock mode'a geç
      if (!InAppPurchases) {
        if (__DEV__) {
          console.log('🔧 IAP not available - using mock mode');
          console.log('⚠️  WARNING: This is MOCK MODE - not suitable for production!');
          console.log('✅ Mock IAP Service initialized successfully');
        }
        this.isInitialized = true;
        return true;
      }

      if (__DEV__) {
        console.log('🔧 Initializing In-App Purchases...');
      }
      
      // IAP servisi ile bağlantı kur
      await InAppPurchases.connectAsync();
      
      // Purchase listener'ı ayarla
      this.setPurchaseListener();
      
      // Ürünleri yükle
      await this.loadProducts();
      
      this.isInitialized = true;
      
      if (__DEV__) {
        console.log('✅ IAP Service initialized successfully');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize In-App Purchases:', error);
      this.isInitialized = false;
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
      
      // Promise oluştur ve bekle
      return new Promise((resolve, reject) => {
        // Promise resolver'ı sakla
        this.purchasePromiseResolvers.set(productId, { resolve, reject });
        
        // Timeout ekle (60 saniye)
        const timeout = setTimeout(() => {
          this.purchasePromiseResolvers.delete(productId);
          reject(new Error('Satın alma işlemi zaman aşımına uğradı'));
        }, 60000);
        
        // Promise resolver'a timeout'u da ekle
        this.purchasePromiseResolvers.get(productId).timeout = timeout;
        
        // Gerçek satın alma işlemini başlat
        InAppPurchases.purchaseItemAsync(productId).catch((error) => {
          // purchaseItemAsync hata verirse
          clearTimeout(timeout);
          this.purchasePromiseResolvers.delete(productId);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
        // Kullanıcı iptali vs. için özel mesajlar
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
   * Mock purchase for development/testing
   */
  static async mockPurchase(productId) {
    if (__DEV__) {
      console.log('🧪 Mock purchase started for:', productId);
      console.log('⚠️  WARNING: This is a simulated purchase - no real money charged!');
    }
    
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock purchase object
    const mockPurchase = {
      productId,
      transactionId: `mock_${Date.now()}`,
      purchaseTime: Date.now(),
      acknowledged: false
    };
    
    // Process the mock purchase using client-side fallback
    await this.processPurchaseClientSide(mockPurchase);
    
    if (__DEV__) {
      console.log('🧪 Mock purchase completed successfully');
      console.log('⚠️  Remember: This was a MOCK purchase for testing only!');
    }
  }

  /**
   * Satın alma listener'ını ayarlar
   */
  static setPurchaseListener() {
    if (!InAppPurchases) {
      if (__DEV__) {
        console.log('🔧 Purchase listener not available in mock mode');
      }
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
        // Tüm bekleyen promise'ları reject et
        this.rejectAllPurchasePromises(new Error(`Purchase failed with code: ${responseCode}`));
      }
    });
  }

  /**
   * Purchase promise'ı resolve eder
   */
  static resolvePurchasePromise(productId, purchase) {
    const resolver = this.purchasePromiseResolvers.get(productId);
    if (resolver) {
      clearTimeout(resolver.timeout);
      this.purchasePromiseResolvers.delete(productId);
      resolver.resolve(purchase);
    }
  }

  /**
   * Purchase promise'ı reject eder
   */
  static rejectPurchasePromise(productId, error) {
    const resolver = this.purchasePromiseResolvers.get(productId);
    if (resolver) {
      clearTimeout(resolver.timeout);
      this.purchasePromiseResolvers.delete(productId);
      resolver.reject(error);
    }
  }

  /**
   * Tüm bekleyen purchase promise'larını reject eder
   */
  static rejectAllPurchasePromises(error) {
    for (const [productId, resolver] of this.purchasePromiseResolvers.entries()) {
      clearTimeout(resolver.timeout);
      resolver.reject(error);
    }
    this.purchasePromiseResolvers.clear();
  }

  /**
   * Başarılı satın almayı işler - Server-side validation ile
   */
  static async handleSuccessfulPurchase(purchase) {
    try {
      if (__DEV__) {
        console.log('✅ Processing successful purchase:', purchase);
      }
      
      const { productId, transactionId, transactionReceipt } = purchase;
      
      // Eğer server-side validation varsa kullan
      if (this.RECEIPT_VALIDATION_URL && transactionReceipt) {
        if (__DEV__) {
          console.log('🔍 Using server-side receipt validation');
        }
        await this.validatePurchaseWithServer(purchase);
      } else {
        // Fallback: Client-side processing
        if (__DEV__) {
          console.log('⚠️ No server validation available, using client-side fallback');
        }
        await this.processPurchaseClientSide(purchase);
      }
      
      // Promise resolve et
      this.resolvePurchasePromise(productId, purchase);
      
    } catch (error) {
      console.error('❌ Failed to process purchase:', error);
      
      // Promise reject et
      this.rejectPurchasePromise(productId, error);
      
      // Hata durumunda transaction'ı false ile acknowledge et (sadece gerçek IAP'da)
      if (InAppPurchases) {
        try {
          await InAppPurchases.finishTransactionAsync(purchase, false);
        } catch (ackError) {
          console.error('❌ Failed to acknowledge failed transaction:', ackError);
        }
      }
      
      Alert.alert(
        'İşlem Hatası',
        'Satın alma doğrulanamadı. Lütfen destek ile iletişime geçin.',
        [{ text: 'Tamam' }]
      );
    }
  }

  /**
   * Server-side receipt validation
   */
  static async validatePurchaseWithServer(purchase) {
    const { productId, transactionId, transactionReceipt } = purchase;
    const CLIENT_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;
    
    if (__DEV__) {
      console.log('🔍 Validating purchase with server...');
    }
    
    const response = await fetch(this.RECEIPT_VALIDATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CLIENT_TOKEN ? { 'x-client-token': CLIENT_TOKEN } : {})
      },
      body: JSON.stringify({
        receiptData: transactionReceipt,
        productId: productId,
        transactionId: transactionId
      })
    });

    if (!response.ok) {
      throw new Error(`Server validation failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      if (__DEV__) {
        console.log('✅ Server validation successful');
      }
      
      // Server doğruladı - kredileri ekle
      await CreditService.addCredits(result.credits, 'in_app_purchase');
      
      // Purchase log
      await CreditService.logPurchase({
        transactionId: result.transactionId,
        productId: result.productId,
        credits: result.credits,
        price: this.getProductPrice(productId),
        currency: 'USD',
        platform: Platform.OS,
        purchaseDate: result.purchaseDate,
        validated: true
      });

      // Transaction'ı acknowledge et (sadece gerçek IAP'da)
      if (InAppPurchases) {
        await InAppPurchases.finishTransactionAsync(purchase, true);
      }

      // Başarı mesajı - sadece development'ta göster
      // Production'da UI tarafında gösterilecek
      if (__DEV__) {
        Alert.alert(
          '🎉 Satın Alma Başarılı!',
          `${result.credits} kredi hesabınıza eklendi!\n\nArtık ${await CreditService.getCredits()} krediniz var.`,
          [{ text: 'Harika!' }]
        );
      }

      if (__DEV__) {
        console.log('✅ Purchase validated and processed successfully');
      }
    } else {
      throw new Error(result.error || 'Receipt validation failed');
    }
  }

  /**
   * Client-side fallback processing (eski sistem)
   */
  static async processPurchaseClientSide(purchase) {
    const { productId, transactionId, purchaseTime } = purchase;
    
    // Kredi paketini bul
    const packageInfo = this.CREDIT_PACKAGES[productId];
    if (!packageInfo) {
      console.error('❌ Unknown product purchased:', productId);
      return;
    }

    // Kredileri ekle
    await CreditService.addCredits(packageInfo.credits, 'in_app_purchase');
    
    // Satın almayı logla
    await CreditService.logPurchase({
      transactionId,
      productId,
      credits: packageInfo.credits,
      price: this.getProductPrice(productId),
      currency: 'USD',
      platform: Platform.OS,
      purchaseTime: new Date(purchaseTime).toISOString(),
      validated: false // Client-side validation
    });

    // Transaction'ı acknowledge et (sadece gerçek IAP'da)
    if (InAppPurchases) {
      await InAppPurchases.finishTransactionAsync(purchase, true);
    }

    // Başarı mesajı göster - sadece development'ta
    // Production'da UI tarafında gösterilecek
    if (__DEV__) {
      Alert.alert(
        '🎉 Satın Alma Başarılı!',
        `${packageInfo.credits} kredi hesabınıza eklendi!\n\nArtık ${await CreditService.getCredits()} krediniz var.`,
        [{ text: 'Harika!' }]
      );
    }

    if (__DEV__) {
      console.log('✅ Purchase processed with client-side fallback');
    }
  }

  /**
   * Ürün fiyatını getirir
   */
  static getProductPrice(productId) {
    const product = this.products.find(p => p.productId === productId);
    return product ? product.price : '0.00';
  }

  /**
   * Mevcut ürünleri getirir
   */
  static getProducts() {
    return this.products;
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
          'Mock Mode',
          'Bu mock modudur. Gerçek satın alma geri yüklemesi development build gerektirir.',
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

  /**
   * Servis durumu hakkında debug bilgisi
   */
  static async getDebugInfo() {
    return {
      mockMode: !InAppPurchases,
      isInitialized: this.isInitialized,
      productCount: this.products.length,
      products: this.products.map(p => ({
        id: p.productId,
        price: p.price,
        title: p.title
      })),
      platform: Platform.OS,
      productIds: this.PRODUCT_IDS
    };
  }

  /**
   * Servis bağlantısını kapatır
   */
  static async disconnect() {
    try {
      if (__DEV__) {
        console.log('🔌 Disconnecting IAP Service...');
      }

      // Listener'ı kaldır
      if (this.purchaseListener) {
        this.purchaseListener.remove();
        this.purchaseListener = null;
      }

      // Mock mode'da disconnect yapmayacağız
      if (!InAppPurchases) {
        this.isInitialized = false;
        this.products = [];
        return;
      }

      // Bağlantıyı kapat
      await InAppPurchases.disconnectAsync();
      
      this.isInitialized = false;
      this.products = [];
      
      if (__DEV__) {
        console.log('🔌 IAP Service disconnected');
      }
    } catch (error) {
      console.error('❌ Failed to disconnect IAP service:', error);
    }
  }
}

export default IAPService; 