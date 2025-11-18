import CreditService from './creditService';
import ReceiptValidationService from './receiptValidationService';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  const iapModule = require('expo-in-app-purchases');
  InAppPurchases = iapModule.default || iapModule;
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
  static isMockMode = false;

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
      // Debug config üzerinden mock moda zorla (test amaçlı)
      let forcedMockMode = false;
      try {
        const config = require('../config/appStoreConfig').default;
        if (config?.DEBUG?.FORCE_MOCK_PURCHASE) {
          console.log('⚠️ FORCE_MOCK_PURCHASE enabled - running in mock mode');
          forcedMockMode = true;
        }
      } catch (e) {
        // config okunamazsa sessiz geç
      }

      if (!InAppPurchases || forcedMockMode) {
        console.log('⚠️ IAP Mock mode - initialized');
        this.isInitialized = true;
        this.isMockMode = true;
        return true;
      }
      
      this.isMockMode = false;

      // HER SEFERINDE yeniden initialize et (TestFlight için)
      console.log('🔄 Re-initializing IAP service...');

      // IAP'ı bağla
      await InAppPurchases.connectAsync();
      
      // STUCK TRANSACTION TEMİZLİĞİ - ChatGPT önerisi
      // Sadece ilk kez, consumable products için
      try {
        console.log('🧹 Checking for stuck transactions...');
        const history = await InAppPurchases.getPurchaseHistoryAsync();
        
        if (history && history.results && history.results.length > 0) {
          console.log('📜 Found transactions in history:', history.results.length);
          
          for (const purchase of history.results) {
            // Eğer acknowledged false ise (işlenmemiş), finish et
            if (purchase.acknowledged === false) {
              console.log('🔄 Finishing stuck transaction:', purchase.productId);
              try {
                await InAppPurchases.finishTransactionAsync(purchase, false);
                console.log('✅ Stuck transaction finished:', purchase.productId);
              } catch (finishErr) {
                console.log('⚠️ Could not finish stuck transaction:', finishErr.message);
              }
            } else {
              console.log('✓ Transaction already acknowledged:', purchase.productId);
            }
          }
        } else {
          console.log('✅ No stuck transactions found');
        }
      } catch (historyErr) {
        console.log('⚠️ Could not check purchase history:', historyErr.message);
      }
      
      // Purchase listener kur - HER SEFERINDE yeniden
      InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
        console.log('🎧 Purchase listener triggered:', { responseCode, results, errorCode });
        
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
          for (const purchase of results) {
            console.log('🎯 Processing purchase:', JSON.stringify(purchase, null, 2));
            
            // ChatGPT önerisi: acknowledged ve purchaseState kontrolü
            if (purchase.acknowledged === false) {
              console.log('✅ Purchase not yet acknowledged, processing...');
              await this.handlePurchaseSuccess(purchase);
            } else {
              console.log('⚠️ Purchase already acknowledged, skipping listener processing');
            }
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
      
      console.log('🔍 IAP Status:', {
        InAppPurchases: !!InAppPurchases,
        isMockMode: this.isMockMode,
        isInitialized: this.isInitialized
      });

      // Ürün ID doğrulaması - yanlış/uyumsuz ID'yi erken yakala
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (!packageInfo) {
        console.error('❌ Unknown productId for purchase:', productId, 'Known:', Object.keys(this.CREDIT_PACKAGES));
        Alert.alert(
          'Purchase Error',
          'Ürün yapılandırması bulunamadı. Lütfen uygulamayı güncelleyin veya desteğe başvurun.',
          [{ text: 'OK' }]
        );
        throw new Error('Unknown productId: ' + productId);
      }

      if (!InAppPurchases || this.isMockMode) {
        console.log('⚠️ Using mock purchase mode');
        // Mock purchase
        return await this.mockPurchase(productId);
      }
      
      console.log('✅ Using REAL IAP mode');

      // Gerçek purchase
      console.log('💳 Starting real purchase...');
      const result = await InAppPurchases.purchaseItemAsync(productId);
      
      console.log('✅ Purchase API result:', JSON.stringify(result, null, 2));
      
      // DEBUG: Result'ı göster (sadece development'da veya stuck transaction'da)
      if (__DEV__ || result?.responseCode === undefined) {
        const debugMsg = `responseCode: ${result?.responseCode}\nresults: ${result?.results?.length || 0}\nerrorCode: ${result?.errorCode || 'none'}\n\nAnalysis:\n${
          result?.responseCode === undefined ? '⚠️ UNDEFINED - Stuck transaction!' : 
          result?.responseCode === 0 ? '✅ OK' :
          result?.responseCode === 2 ? '❌ USER_CANCELED' :
          '⚠️ Unknown: ' + result?.responseCode
        }`;
        
        console.log('📊 Purchase Result Debug:', debugMsg);
        
        // Sadece stuck transaction durumunda alert göster (production'da)
        if (!__DEV__ && result?.responseCode === undefined) {
          Alert.alert('DEBUG: Purchase Result', debugMsg, [{ text: 'OK' }]);
        }
      }
      
      // ÖNCE: User cancel kontrolü
      if (result && result.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        console.log('❌ User canceled the purchase');
        throw new Error('USER_CANCELED');
      }
      
      // Eğer result.results varsa ve içinde purchase varsa, hemen işle
      if (result && result.results && result.results.length > 0) {
        console.log('🎯 Processing immediate results:', result.results);
        for (const purchase of result.results) {
          console.log('🔄 Processing purchase:', purchase.productId);
          await this.handlePurchaseSuccess(purchase);
        }
        
        // Kredileri kontrol et
        const totalAfter = await CreditService.getCredits();
        return { success: true, result, totalCredits: totalAfter };
      }
      
      // ÖNEMLİ: responseCode undefined ise - Bu büyük ihtimalle stuck transaction
      if (!result || result.responseCode === undefined) {
        console.log('⚠️ responseCode is undefined - stuck transaction detected!');
        
        // Stuck transaction'ları temizledik, kullanıcıya tekrar deneme önerisi
        Alert.alert(
          '⚠️ Satın Alma Sorunu',
          'Takılı kalmış transaction tespit edildi ve temizlendi.\n\n' +
          'ÇÖZÜM:\n' +
          '1. Uygulamayı tamamen kapatın\n' +
          '2. Tekrar açın ve satın almayı tekrar deneyin\n\n' +
          'Sorun devam ederse:\n' +
          '• iPhone Ayarlar → App Store → Oturumu Kapatın\n' +
          '• Telefonu yeniden başlatın\n' +
          '• Tekrar giriş yapın',
          [
            { 
              text: 'Tamam', 
              onPress: () => {
                // Uygulamayı yeniden başlatmayı önermek için
                console.log('User acknowledged stuck transaction cleanup');
              }
            }
          ]
        );
        
        console.log('❌ responseCode undefined - NOT processing to prevent duplicate credits');
        throw new Error('Purchase failed - responseCode undefined (stuck transaction)');
      }
      
      // Result boş veya results yok - Listener'dan gelecek
      // responseCode kontrolü - sadece başarılı durumda devam et
      if (result && result.responseCode !== InAppPurchases.IAPResponseCode.OK && result.responseCode !== 1) {
        console.log('❌ Purchase failed with responseCode:', result.responseCode);
        throw new Error('Purchase failed');
      }
      
      console.log('⏳ No immediate results - waiting for listener to process...');
      
      // Listener'ın çalışmasını bekle (max 5 saniye)
      const creditsBefore = await CreditService.getCredits();
      console.log('💰 Credits before listener:', creditsBefore);
      
      let listenerProcessed = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 saniye bekle
        const creditsNow = await CreditService.getCredits();
        
        if (creditsNow > creditsBefore) {
          console.log('✅ Listener processed! Credits increased from', creditsBefore, 'to', creditsNow);
          listenerProcessed = true;
          return { success: true, result, totalCredits: creditsNow };
        }
      }
      
      if (!listenerProcessed) {
        console.log('⚠️ Listener did not process after 5 seconds');
        // Yine de başarı dön, listener geç tetiklenebilir
        const totalAfter = await CreditService.getCredits();
        return { success: true, result, totalCredits: totalAfter };
      }

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
    console.log('🎭 Mock purchase started:', productId);
    
    // 2 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Kredileri ekle
    const packageInfo = this.CREDIT_PACKAGES[productId];
    
    if (!packageInfo) {
      console.error('❌ Package info not found for product:', productId);
      console.log('📋 Available packages:', Object.keys(this.CREDIT_PACKAGES));
      throw new Error('Package info not found');
    }
    
    try {
      await CreditService.addCredits(packageInfo.credits);
      
      // Kredileri kontrol et
      const totalAfter = await CreditService.getCredits();
      console.log('✅ Mock purchase - credits added. Total now:', totalAfter);
      
      return { success: true, mock: true, totalCredits: totalAfter };
      
    } catch (creditError) {
      console.error('❌ Error in mock purchase:', creditError);
      throw creditError;
    }
  }

  /**
   * Purchase başarılı olduğunda - Receipt validation ile
   */
  static async handlePurchaseSuccess(purchase) {
    try {
      console.log('🎉 Purchase success:', purchase.productId);
      console.log('📋 Purchase object:', JSON.stringify(purchase, null, 2));
      
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('❌ Unknown product:', purchase.productId);
        return;
      }
      
      // Ek güvenlik: acknowledged kontrolü (Expo'da)
      // Eğer purchase zaten acknowledged ise (işlenmiş), tekrar işleme
      if (purchase.acknowledged === true) {
        console.log('⚠️ Purchase already acknowledged, skipping...');
        return;
      }

      // Receipt validation yap (eğer enable ise)
      let validationResult = { success: true }; // Default success
      
      if (this.shouldValidateReceipt()) {
        console.log('🔍 Receipt validation enabled - validating purchase...');
        validationResult = await this.validatePurchaseReceipt(purchase);
        
        if (!validationResult.success) {
          console.error('❌ Receipt validation failed:', {
            error: validationResult.error,
            status: validationResult.status,
            productId: purchase.productId
          });
          
          // Fallback mode aktif ise devam et
          if (this.shouldUseFallbackMode()) {
            console.log('⚠️ Using fallback mode - proceeding without receipt validation');
            console.log('⚠️ Fallback reason:', validationResult.error);
          } else {
            console.error('❌ Fallback mode disabled - blocking purchase');
            Alert.alert(
              'Purchase Error',
              'Receipt validation failed. Please contact support if this issue persists.',
              [{ text: 'OK' }]
            );
            return;
          }
        } else {
          console.log('✅ Receipt validation successful for:', purchase.productId);
        }
      } else {
        console.log('⚠️ Receipt validation disabled - proceeding without validation');
      }

      // Kredileri ekle
      await CreditService.addCredits(packageInfo.credits);
      const totalAfter = await CreditService.getCredits();
      console.log('✅ Credits added successfully. Total now:', totalAfter);
      
      // Transaction'ı bitir
      // ChatGPT önerisi: Consumable için false kullan
      if (InAppPurchases && !this.isMockMode) {
        try {
          // İkinci parametre: consumeImmediately = false (consumable için)
          await InAppPurchases.finishTransactionAsync(purchase, false);
          console.log('✅ Transaction finished for:', purchase.productId);
        } catch (finishErr) {
          console.log('⚠️ finishTransactionAsync failed:', finishErr?.message || String(finishErr));
        }
      } else {
        console.log('⚠️ finishTransactionAsync skipped (mock mode or no IAP module)');
      }
      
      console.log('✅ handlePurchaseSuccess completed - credits added:', totalAfter);

    } catch (error) {
      console.error('❌ Error handling purchase success:', error);
      
      // Hata durumunda kullanıcıya bilgi ver
      Alert.alert(
        'Purchase Error',
        'An error occurred while processing your purchase. Please contact support.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Purchase receipt'ini validate et
   * @param {Object} purchase - Purchase object
   * @returns {Promise<Object>} Validation result
   */
  static async validatePurchaseReceipt(purchase) {
    try {
      console.log('🔍 Validating purchase receipt...', purchase.productId);

      // Receipt data'yı al
      const receiptData = await this.getReceiptData();
      
      if (!receiptData) {
        console.error('❌ No receipt data available');
        return { success: false, error: 'No receipt data', status: -1 };
      }

      // Production environment'da validate et (Apple'ın önerdiği şekilde)
      const validationResult = await ReceiptValidationService.validateReceipt(
        receiptData, 
        true // Always start with production
      );

      if (!validationResult.success) {
        console.error('❌ Receipt validation failed:', {
          status: validationResult.status,
          error: validationResult.error,
          environment: validationResult.environment
        });
        return { 
          success: false,
          status: validationResult.status,
          error: ReceiptValidationService.getStatusDescription(validationResult.status)
        };
      }

      console.log('✅ Receipt validation successful:', {
        environment: validationResult.environment,
        status: validationResult.status
      });

      // Transaction'ı bul (consumable için gerekli değil ama kontrol edelim)
      const transaction = ReceiptValidationService.findTransactionForProduct(
        validationResult, 
        purchase.productId
      );

      if (!transaction) {
        console.warn('⚠️ Transaction not found in receipt for product:', purchase.productId);
        console.log('⚠️ This may be normal for consumable products - proceeding anyway');
        // Consumable products için transaction bulunamayabilir, yine de devam et
        return { success: true, transaction: null };
      }

      console.log('✅ Receipt validation successful for product:', purchase.productId);
      return { success: true, transaction };

    } catch (error) {
      console.error('❌ Receipt validation error:', error);
      return { success: false, error: error.message, status: -1 };
    }
  }

  /**
   * Receipt data'yı al
   * @returns {Promise<string|null>} Base64 encoded receipt data
   */
  static async getReceiptData() {
    try {
      if (!InAppPurchases) {
        console.log('⚠️ IAP not available, skipping receipt validation');
        return null;
      }

      // Receipt'i al
      const receipt = await InAppPurchases.getReceiptAsync();
      
      if (!receipt) {
        console.error('❌ No receipt available');
        return null;
      }

      console.log('📄 Receipt data retrieved');
      return receipt;

    } catch (error) {
      console.error('❌ Error getting receipt data:', error);
      return null;
    }
  }

  /**
   * Receipt validation yapılmalı mı kontrol et
   * @returns {boolean}
   */
  static shouldValidateReceipt() {
    try {
      // Config'den kontrol et
      const config = require('../config/appStoreConfig').default;
      return config.ENVIRONMENT.ENABLE_RECEIPT_VALIDATION;
    } catch (error) {
      console.log('⚠️ Config not found, using default validation setting');
      return true; // Default olarak validation yap
    }
  }

  /**
   * Fallback mode kullanılmalı mı kontrol et
   * @returns {boolean}
   */
  static shouldUseFallbackMode() {
    try {
      const config = require('../config/appStoreConfig').default;
      return config.ENVIRONMENT.ENABLE_FALLBACK_MODE;
    } catch (error) {
      console.log('⚠️ Config not found, using default fallback setting');
      return false; // Default olarak fallback yok
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
