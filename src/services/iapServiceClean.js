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
        console.log('🎧 Listener triggered:', { responseCode, results: results?.length || 0, errorCode });
        
        // DEBUG: Listener tetiklendi
        Alert.alert(
          'DEBUG: LISTENER Tetiklendi',
          `responseCode: ${responseCode}\nresults: ${results?.length || 0}\nerrorCode: ${errorCode || 'none'}`,
          [{ text: 'OK' }]
        );
        
        // Başarılı purchase
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
          Alert.alert(
            'DEBUG: LISTENER - OK',
            `Purchase sayısı: ${results.length}\nİşlenecek...`,
            [{ text: 'OK' }]
          );
          
          for (const purchase of results) {
            await this.processPurchase(purchase);
          }
        } 
        // Cancel
        else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('❌ User canceled');
          Alert.alert(
            'DEBUG: LISTENER - CANCEL',
            'User canceled the purchase',
            [{ text: 'OK' }]
          );
        }
        // Diğer
        else {
          console.log('⚠️ Other response:', responseCode, errorCode);
          Alert.alert(
            'DEBUG: LISTENER - OTHER',
            `responseCode: ${responseCode}\nerrorCode: ${errorCode}`,
            [{ text: 'OK' }]
          );
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
      console.log('🎯 Processing:', purchase.productId);
      console.log('📋 Purchase:', JSON.stringify(purchase, null, 2));
      
      // Duplicate check - transaction ID ile
      const txId = purchase.transactionIdentifier || purchase.orderId || `${purchase.productId}_${Date.now()}`;
      
      // DEBUG: Purchase info
      Alert.alert(
        'DEBUG: PROCESS Başladı',
        `Product: ${purchase.productId}\nTx ID: ${txId}\nacknowledged: ${purchase.acknowledged}`,
        [{ text: 'OK' }]
      );
      
      if (this.processedTransactions.has(txId)) {
        console.log('⚠️ Already processed:', txId);
        Alert.alert(
          'DEBUG: DUPLICATE',
          'Bu transaction zaten işlendi!',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Acknowledged check
      if (purchase.acknowledged === true) {
        console.log('⚠️ Already acknowledged:', txId);
        Alert.alert(
          'DEBUG: ACKNOWLEDGED',
          'Purchase zaten acknowledged!',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Product check
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('❌ Unknown product:', purchase.productId);
        Alert.alert(
          'DEBUG: UNKNOWN PRODUCT',
          `Product ID: ${purchase.productId}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Kredi öncesi
      const creditsBefore = await CreditService.getCredits();

      // Kredi ekle
      await CreditService.addCredits(packageInfo.credits);
      console.log('✅ Credits added:', packageInfo.credits);
      
      const creditsAfter = await CreditService.getCredits();
      
      // DEBUG: Kredi eklendi
      Alert.alert(
        'DEBUG: KREDİ EKLENDİ',
        `Önceki: ${creditsBefore}\nEklenen: ${packageInfo.credits}\nŞimdiki: ${creditsAfter}`,
        [{ text: 'OK' }]
      );
      
      // Transaction finish
      await InAppPurchases.finishTransactionAsync(purchase, false);
      console.log('✅ Transaction finished');
      
      // DEBUG: Transaction finish
      Alert.alert(
        'DEBUG: TRANSACTION FİNİSHED',
        'Transaction tamamlandı ve kapatıldı.',
        [{ text: 'OK' }]
      );
      
      // Duplicate prevention
      this.processedTransactions.add(txId);
      
      // Set cleanup (10 dakika sonra temizle)
      setTimeout(() => {
        this.processedTransactions.delete(txId);
      }, 600000);
      
    } catch (error) {
      console.error('❌ Process error:', error);
      Alert.alert(
        'DEBUG: PROCESS HATASI',
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
      Alert.alert(
        'DEBUG 1: Purchase Başladı',
        `Product: ${productId}\nInitialized: ${this.isInitialized}`,
        [{ text: 'OK' }]
      );

      // Initialize (ilk kez)
      if (!this.isInitialized) {
        await this.initialize();
        
        // DEBUG 2: Initialize tamamlandı
        Alert.alert(
          'DEBUG 2: Initialize',
          `Initialized: ${this.isInitialized}\nMock Mode: ${this.isMockMode}`,
          [{ text: 'OK' }]
        );
      }

      // Product check
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (!packageInfo) {
        Alert.alert('DEBUG: HATA', 'Unknown product: ' + productId, [{ text: 'OK' }]);
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
      const creditsBefore = await CreditService.getCredits();
      Alert.alert(
        'DEBUG 3: purchaseItemAsync Çağrılacak',
        `Product: ${productId}\nMevcut Kredi: ${creditsBefore}`,
        [{ text: 'OK' }]
      );

      // GERÇEK PURCHASE - Sadece bu!
      console.log('💳 Calling purchaseItemAsync...');
      await InAppPurchases.purchaseItemAsync(productId);
      
      // DEBUG 4: purchaseItemAsync tamamlandı
      Alert.alert(
        'DEBUG 4: purchaseItemAsync Tamamlandı',
        'Apple ödeme ekranı kapatıldı.\nListener tetiklenecek...',
        [{ text: 'OK' }]
      );
      
      // Listener işleyecek, biz sadece bekleyelim
      console.log('⏳ Waiting for listener...');
      
      // 3 saniye bekle (listener işlesin diye)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Kredi kontrol
      const totalAfter = await CreditService.getCredits();
      console.log('📊 Current credits:', totalAfter);
      
      // DEBUG 5: Sonuç
      Alert.alert(
        'DEBUG 5: İşlem Tamamlandı',
        `Önceki Kredi: ${creditsBefore}\nŞimdiki Kredi: ${totalAfter}\nEklenen: ${totalAfter - creditsBefore}`,
        [{ text: 'OK' }]
      );
      
      return { success: true, totalCredits: totalAfter };

    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
      // DEBUG: HATA
      Alert.alert(
        'DEBUG: HATA',
        `Error: ${error.message}\nCode: ${error.code}`,
        [{ text: 'OK' }]
      );
      
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
