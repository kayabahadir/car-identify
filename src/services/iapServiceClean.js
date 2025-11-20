import CreditService from './creditService';
import { Alert } from 'react-native';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  const iapModule = require('expo-in-app-purchases');
  InAppPurchases = iapModule.default || iapModule;
  console.log('✅ InAppPurchases module loaded');
} catch (error) {
  console.error('❌ InAppPurchases module load error:', error);
}

/**
 * BASIT IAP SERVİSİ - Sadece temel flow
 * Flow: Buy Button → Apple Payment → Listener → Credits Added
 */
class CleanIAPService {
  static isInitialized = false;
  static products = [];
  static isMockMode = false;
  static processedTransactions = new Set(); // Duplicate prevention

  // Product ID'ler
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
   * Initialize - Sadece connect ve listener
   */
  static async initialize() {
    try {
      if (!InAppPurchases) {
        console.log('⚠️ IAP Mock mode');
        this.isInitialized = true;
        this.isMockMode = true;
        return true;
      }
      
      this.isMockMode = false;
      console.log('🔄 Initializing IAP...');

      // Connect
      await InAppPurchases.connectAsync();
      console.log('✅ Connected to IAP');
      
      // Listener - SADECE BU!
      InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
        console.log('🎧 LISTENER TRIGGERED:', { responseCode, results: results?.length || 0, errorCode });
        
        // ALERT: Listener tetiklendi
        setTimeout(() => {
          Alert.alert(
            '🎧 LISTENER',
            `responseCode: ${responseCode}\nresults: ${results?.length || 0}\nerrorCode: ${errorCode || 'none'}`,
            [{ text: 'OK' }]
          );
        }, 100);
        
        // Başarılı purchase
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
          console.log('✅ LISTENER - OK: Purchase sayısı:', results.length);
          
          setTimeout(() => {
            Alert.alert(
              '✅ LISTENER - OK',
              `Purchase sayısı: ${results.length}\nİşleniyor...`,
              [{ text: 'OK' }]
            );
          }, 500);
          
          for (const purchase of results) {
            await this.processPurchase(purchase);
          }
        } 
        // Cancel
        else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('❌ LISTENER - USER_CANCELED');
          
          setTimeout(() => {
            Alert.alert(
              '❌ CANCEL',
              'Kullanıcı satın almayı iptal etti',
              [{ text: 'OK' }]
            );
          }, 500);
        }
        // Diğer
        else {
          console.log('⚠️ LISTENER - OTHER:', { responseCode, errorCode });
          
          setTimeout(() => {
            Alert.alert(
              '⚠️ LISTENER - OTHER',
              `responseCode: ${responseCode}\nerrorCode: ${errorCode}`,
              [{ text: 'OK' }]
            );
          }, 500);
        }
      });

      this.isInitialized = true;
      console.log('✅ IAP initialized');
      return true;

    } catch (error) {
      console.error('❌ IAP init failed:', error);
      return false;
    }
  }

  /**
   * Purchase işle - TEK NOKTA
   */
  static async processPurchase(purchase) {
    try {
      console.log('🎯 PROCESS BAŞLADI:', purchase.productId);
      console.log('📋 Purchase object:', JSON.stringify(purchase, null, 2));
      
      // Duplicate check - transaction ID ile
      const txId = purchase.transactionIdentifier || purchase.orderId || `${purchase.productId}_${Date.now()}`;
      console.log('🆔 Transaction ID:', txId);
      console.log('✓ acknowledged:', purchase.acknowledged);
      
      // ALERT: Process başladı
      Alert.alert(
        '🎯 PROCESS',
        `Product: ${purchase.productId}\nTx ID: ${txId?.substring(0, 20)}...\nacknowledged: ${purchase.acknowledged}`,
        [{ text: 'OK' }]
      );
      
      if (this.processedTransactions.has(txId)) {
        console.log('⚠️ DUPLICATE: Bu transaction zaten işlendi!');
        Alert.alert('⚠️ DUPLICATE', 'Bu transaction zaten işlendi!', [{ text: 'OK' }]);
        return;
      }
      
      // Acknowledged check
      if (purchase.acknowledged === true) {
        console.log('⚠️ ACKNOWLEDGED: Purchase zaten acknowledged!');
        Alert.alert('⚠️ ACKNOWLEDGED', 'Purchase zaten acknowledged!', [{ text: 'OK' }]);
        return;
      }
      
      // Product check
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('❌ UNKNOWN PRODUCT:', purchase.productId);
        Alert.alert('❌ UNKNOWN PRODUCT', purchase.productId, [{ text: 'OK' }]);
        return;
      }

      // Kredi öncesi
      const creditsBefore = await CreditService.getCredits();
      console.log('💰 Kredi öncesi:', creditsBefore);

      // Kredi ekle
      await CreditService.addCredits(packageInfo.credits);
      console.log('➕ Kredi ekleniyor:', packageInfo.credits);
      
      const creditsAfter = await CreditService.getCredits();
      console.log('💰 Kredi sonrası:', creditsAfter);
      console.log('✅ KREDİ EKLENDİ! Eklenen:', creditsAfter - creditsBefore);
      
      // ALERT: Kredi eklendi
      Alert.alert(
        '✅ KREDİ EKLENDİ',
        `Önceki: ${creditsBefore}\nEklenen: ${packageInfo.credits}\nYeni: ${creditsAfter}`,
        [{ text: 'OK' }]
      );
      
      // Transaction finish
      await InAppPurchases.finishTransactionAsync(purchase, false);
      console.log('✅ TRANSACTION FİNİSHED');
      
      // ALERT: Transaction finished
      Alert.alert(
        '✅ TRANSACTION FİNİSHED',
        'Transaction başarıyla tamamlandı!',
        [{ text: 'OK' }]
      );
      
      // Duplicate prevention
      this.processedTransactions.add(txId);
      console.log('🔒 Transaction ID kaydedildi (duplicate prevention)');
      
      // Set cleanup (10 dakika sonra temizle)
      setTimeout(() => {
        this.processedTransactions.delete(txId);
        console.log('🗑️ Transaction ID temizlendi:', txId);
      }, 600000);
      
    } catch (error) {
      console.error('❌ PROCESS HATASI:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      Alert.alert(
        '❌ PROCESS HATASI',
        `Error: ${error.message}`,
        [{ text: 'OK' }]
      );
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
      
      console.log('📦 Products loaded:', this.products.length);
      return this.products;

    } catch (error) {
      console.error('❌ Load products failed:', error);
      return [];
    }
  }

  /**
   * Satın al - SADECE purchaseItemAsync çağır
   */
  static async purchaseProduct(productId) {
    try {
      console.log('🛒 Purchase:', productId);

      // DEBUG 1: Purchase başladı
      console.log('DEBUG 1: Purchase Başladı', productId, this.isInitialized);

      // Initialize (ilk kez)
      if (!this.isInitialized) {
        await this.initialize();
        console.log('DEBUG 2: Initialize completed', this.isInitialized, this.isMockMode);
      }

      // Product check
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (!packageInfo) {
        console.error('DEBUG: HATA - Unknown product:', productId);
        throw new Error('Unknown product: ' + productId);
      }

      // Mock mode
      if (!InAppPurchases || this.isMockMode) {
        console.log('🎭 Mock purchase');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await CreditService.addCredits(packageInfo.credits);
        const total = await CreditService.getCredits();
        return { success: true, mock: true, totalCredits: total };
      }

      // DEBUG 3: purchaseItemAsync çağrılacak
      let creditsBefore = 0;
      try {
        creditsBefore = await CreditService.getCredits();
        console.log('DEBUG 3: Mevcut kredi:', creditsBefore);
      } catch (e) {
        console.error('DEBUG 3: Kredi alınamadı:', e);
      }

      // ALERT: purchaseItemAsync çağrılacak
      Alert.alert(
        '💳 Purchase Başlatılıyor',
        `Product: ${productId}\nMevcut Kredi: ${creditsBefore}\n\nApple ödeme ekranı açılacak...`,
        [{ text: 'OK' }]
      );

      // GERÇEK PURCHASE - Sadece bu!
      console.log('💳 Calling purchaseItemAsync...');
      
      try {
        await InAppPurchases.purchaseItemAsync(productId);
        console.log('DEBUG 4: purchaseItemAsync tamamlandı');
        
        // ALERT: purchaseItemAsync tamamlandı
        Alert.alert(
          '✅ Apple Ekranı Kapatıldı',
          'Listener tetiklenecek...\n(3 saniye bekleniyor)',
          [{ text: 'OK' }]
        );
      } catch (purchaseError) {
        console.error('DEBUG: purchaseItemAsync hatası:', purchaseError);
        
        Alert.alert(
          '❌ purchaseItemAsync HATASI',
          `Error: ${purchaseError.message}\nCode: ${purchaseError.code}`,
          [{ text: 'OK' }]
        );
        
        throw purchaseError;
      }
      
      // Listener işleyecek, biz sadece bekleyelim
      console.log('⏳ Waiting for listener...');
      
      // 3 saniye bekle (listener işlesin diye)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Kredi kontrol
      let totalAfter = creditsBefore;
      try {
        totalAfter = await CreditService.getCredits();
        console.log('DEBUG 5: Şimdiki kredi:', totalAfter, 'Eklenen:', totalAfter - creditsBefore);
      } catch (e) {
        console.error('DEBUG 5: Kredi alınamadı:', e);
      }
      
      // ALERT: İşlem tamamlandı
      Alert.alert(
        '🎉 İŞLEM TAMAMLANDI',
        `Önceki Kredi: ${creditsBefore}\nŞimdiki Kredi: ${totalAfter}\nEklenen: ${totalAfter - creditsBefore}`,
        [{ text: 'Tamam' }]
      );
      
      return { success: true, totalCredits: totalAfter };

    } catch (error) {
      console.error('❌ Purchase failed:', error);
      console.error('DEBUG: HATA -', error.message, error.code);
      
      // Cancel
      if (error.code === 'USER_CANCELED' || error.message?.includes('cancel')) {
        throw new Error('Purchase canceled');
      }
      
      throw error;
    }
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
