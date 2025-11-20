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
        console.log('LISTENER:', { responseCode, results: results?.length || 0, errorCode });
        
        // ALERT: Listener - setTimeout ile güvenli
        setTimeout(() => {
          try {
            Alert.alert(
              'LISTENER',
              `responseCode: ${responseCode}\nresults: ${results?.length || 0}\nerrorCode: ${errorCode || 'none'}`,
              [{ text: 'OK' }]
            );
          } catch (alertErr) {
            console.error('Alert error:', alertErr);
          }
        }, 100);
        
        // Başarılı purchase
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
          console.log('LISTENER: OK, processing', results.length, 'purchases');
          
          for (const purchase of results) {
            await this.processPurchase(purchase);
          }
        } 
        // Cancel
        else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('LISTENER: USER_CANCELED');
        }
        // Diğer
        else {
          console.log('LISTENER: OTHER', { responseCode, errorCode });
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
      console.log('PROCESS: Starting for', purchase.productId);
      
      // Duplicate check - transaction ID ile
      const txId = purchase.transactionIdentifier || purchase.orderId || `${purchase.productId}_${Date.now()}`;
      
      if (this.processedTransactions.has(txId)) {
        console.log('DUPLICATE: Already processed');
        setTimeout(() => {
          try {
            Alert.alert('DUPLICATE', 'Transaction zaten işlendi', [{ text: 'OK' }]);
          } catch (e) {}
        }, 100);
        return;
      }
      
      // Acknowledged check
      if (purchase.acknowledged === true) {
        console.log('ACKNOWLEDGED: Already acknowledged');
        setTimeout(() => {
          try {
            Alert.alert('ACKNOWLEDGED', 'Purchase zaten acknowledged', [{ text: 'OK' }]);
          } catch (e) {}
        }, 100);
        return;
      }
      
      // Product check
      const packageInfo = this.CREDIT_PACKAGES[purchase.productId];
      if (!packageInfo) {
        console.error('UNKNOWN PRODUCT:', purchase.productId);
        setTimeout(() => {
          try {
            Alert.alert('UNKNOWN PRODUCT', purchase.productId, [{ text: 'OK' }]);
          } catch (e) {}
        }, 100);
        return;
      }

      // Kredi öncesi
      const creditsBefore = await CreditService.getCredits();
      console.log('Credits before:', creditsBefore);

      // Kredi ekle
      await CreditService.addCredits(packageInfo.credits);
      console.log('Adding credits:', packageInfo.credits);
      
      const creditsAfter = await CreditService.getCredits();
      console.log('Credits after:', creditsAfter);
      
      // ALERT: Kredi eklendi - setTimeout ile güvenli
      setTimeout(() => {
        try {
          Alert.alert(
            'KREDİ EKLENDİ',
            `Önceki: ${creditsBefore}\nEklenen: ${packageInfo.credits}\nYeni: ${creditsAfter}`,
            [{ text: 'OK' }]
          );
        } catch (alertErr) {
          console.error('Alert error:', alertErr);
        }
      }, 200);
      
      // Transaction finish
      await InAppPurchases.finishTransactionAsync(purchase, false);
      console.log('TRANSACTION FINISHED');
      
      // Duplicate prevention
      this.processedTransactions.add(txId);
      
      // Set cleanup (10 dakika sonra temizle)
      setTimeout(() => {
        this.processedTransactions.delete(txId);
      }, 600000);
      
    } catch (error) {
      console.error('PROCESS ERROR:', error);
      setTimeout(() => {
        try {
          Alert.alert('PROCESS ERROR', error.message || 'Bilinmeyen hata', [{ text: 'OK' }]);
        } catch (alertErr) {
          console.error('Alert error:', alertErr);
        }
      }, 100);
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
    let creditsBefore = 0;
    
    try {
      console.log('🛒 Purchase started:', productId);

      // Initialize (ilk kez)
      if (!this.isInitialized) {
        console.log('Initializing IAP...');
        await this.initialize();
        console.log('IAP initialized');
      }

      // Product check
      const packageInfo = this.CREDIT_PACKAGES[productId];
      if (!packageInfo) {
        console.error('Unknown product:', productId);
        throw new Error('Unknown product: ' + productId);
      }

      // Mock mode
      if (!InAppPurchases || this.isMockMode) {
        console.log('Mock purchase');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await CreditService.addCredits(packageInfo.credits);
        const total = await CreditService.getCredits();
        return { success: true, mock: true, totalCredits: total };
      }

      // Kredi kontrol
      try {
        creditsBefore = await CreditService.getCredits();
        console.log('Credits before:', creditsBefore);
      } catch (e) {
        console.error('Could not get credits:', e);
      }

      // GERÇEK PURCHASE
      console.log('Calling purchaseItemAsync...');
      await InAppPurchases.purchaseItemAsync(productId);
      console.log('purchaseItemAsync completed, waiting for listener...');
      
      // Listener işleyecek
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Kredi kontrol
      let totalAfter = creditsBefore;
      try {
        totalAfter = await CreditService.getCredits();
        console.log('Credits after:', totalAfter, 'Added:', totalAfter - creditsBefore);
      } catch (e) {
        console.error('Could not get final credits:', e);
      }
      
      return { success: true, totalCredits: totalAfter };

    } catch (error) {
      console.error('Purchase error:', error);
      
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
