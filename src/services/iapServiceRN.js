import { Alert } from 'react-native';
import CreditService from './creditService';

// React Native IAP modülünü conditionally import et
let RNIap = null;
try {
  RNIap = require('react-native-iap');
  console.log('✅ React Native IAP module loaded successfully');
} catch (error) {
  console.error('❌ React Native IAP module load error:', error);
  console.warn('⚠️ IAP will run in mock mode');
}

/**
 * React Native IAP Service - Consumable IAP sistemi
 */
class RNIAPService {
  static isInitialized = false;
  static products = [];
  static navigationCallback = null;

  // IAP ürün ID'leri - CONSUMABLE products
  static PRODUCT_IDS = [
    'com.caridentify.app.credits.consumable.pack10',
    'com.caridentify.app.credits.consumable.pack50', 
    'com.caridentify.app.credits.consumable.pack200'
  ];

  // Kredi paketleri mapping
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
      if (!RNIap) {
        console.log('⚠️ IAP Mock mode - initialized');
        this.isInitialized = true;
        return true;
      }

      console.log('🔄 Initializing React Native IAP...');

      // IAP'ı bağla
      await RNIap.initConnection();
      
      // Purchase listener kur
      const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
        async (purchase) => {
          console.log('🎧 Purchase updated:', purchase);
          await this.handlePurchaseSuccess(purchase);
        }
      );

      const purchaseErrorSubscription = RNIap.purchaseErrorListener(
        (error) => {
          console.log('❌ Purchase error:', error);
        }
      );

      this.purchaseUpdateSubscription = purchaseUpdateSubscription;
      this.purchaseErrorSubscription = purchaseErrorSubscription;
      this.isInitialized = true;
      
      console.log('✅ React Native IAP Service initialized');
      return true;

    } catch (error) {
      console.error('❌ IAP initialization failed:', error);
      return false;
    }
  }

  /**
   * Ürünleri yükle
   */
  static async getProducts() {
    try {
      if (!RNIap) {
        return [];
      }

      const products = await RNIap.getProducts({ skus: this.PRODUCT_IDS });
      console.log('✅ Products loaded:', products.length);
      this.products = products;
      return products;

    } catch (error) {
      console.error('❌ Failed to load products:', error);
      return [];
    }
  }

  /**
   * Ürün satın al
   */
  static async purchaseProduct(productId) {
    try {
      console.log('🛒 Starting purchase:', productId);

      // Initialize et
      await this.initialize();

      if (!RNIap) {
        // Mock purchase
        return await this.mockPurchase(productId);
      }

      // Gerçek purchase
      console.log('💳 Starting real purchase...');
      const result = await RNIap.requestPurchase({ sku: productId });
      
      console.log('✅ Purchase request sent:', result);
      return { success: true, result };

    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
      if (error.code === 'E_USER_CANCELLED') {
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
        
        // Success mesajı göster
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
      
      // Transaction'ı bitir
      if (purchase.transactionId) {
        await RNIap.finishTransaction({ purchase, isConsumable: true });
        console.log('✅ Transaction finished');
      }

      // Success mesajı göster
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
    console.log('🔗 Navigation callback set');
  }

  /**
   * Cleanup
   */
  static cleanup() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }
    if (RNIap) {
      RNIap.endConnection();
    }
  }
}

export default RNIAPService;
