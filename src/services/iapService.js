// import * as InAppPurchases from 'expo-in-app-purchases'; // Geçici olarak devre dışı
import { Alert, Platform } from 'react-native';
import CreditService from './creditService';

/**
 * In-App Purchase Service - Expo IAP ile entegrasyon
 */
class IAPService {
  static isInitialized = false;
  static products = [];

  // Ürün ID'leri - App Store Connect ve Google Play Console'da tanımlanacak
  static PRODUCT_IDS = {
    CREDITS_10: Platform.OS === 'ios' ? 'com.caridentify.credits10' : 'credits_10_199',
    CREDITS_50: Platform.OS === 'ios' ? 'com.caridentify.credits50' : 'credits_50_699', 
    CREDITS_200: Platform.OS === 'ios' ? 'com.caridentify.credits200' : 'credits_200_1999'
  };

  // Kredi paketleri mapping
  static CREDIT_PACKAGES = {
    [this.PRODUCT_IDS.CREDITS_10]: { credits: 10, packageInfo: 'Başlangıç Paketi' },
    [this.PRODUCT_IDS.CREDITS_50]: { credits: 50, packageInfo: 'Popüler Paket' },
    [this.PRODUCT_IDS.CREDITS_200]: { credits: 200, packageInfo: 'Premium Paket' }
  };

  /**
   * IAP servisini başlatır (DEMO MODE)
   */
  static async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      console.log('🎯 Demo mode: Simulating IAP initialization...');
      
      // Demo mode - gerçek IAP başlatmıyoruz
      this.isInitialized = false; // Demo mode'da false tutuyoruz
      console.log('⚠️ IAP running in demo mode');
      
      return false; // Demo mode'da false döndürüyoruz
    } catch (error) {
      console.error('❌ Failed to initialize In-App Purchases:', error);
      return false;
    }
  }

  /**
   * Mevcut ürünleri yükler (DEMO MODE)
   */
  static async loadProducts() {
    try {
      console.log('🎯 Demo mode: Simulating product loading...');
      
      // Demo mode - sabit ürünler döndürüyoruz
      this.products = [];
      console.log('⚠️ Demo mode: No real products loaded');
      
      return this.products;
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      return [];
    }
  }

  /**
   * Belirli bir ürünü satın alır (DEMO MODE)
   */
  static async purchaseProduct(productId) {
    try {
      console.log('🎯 Demo mode: Simulating purchase for:', productId);
      
      // Demo mode'da gerçek satın alma yapmıyoruz
      // Bu fonksiyon asla çağrılmamalı çünkü isAvailable() false döndürüyor
      throw new Error('Demo mode: Real purchase not available');
      
    } catch (error) {
      console.error('❌ Demo purchase failed:', error);
      throw error;
    }
  }

  /**
   * Satın alma listener'ını ayarlar (DEMO MODE)
   */
  static setPurchaseListener() {
    console.log('🎯 Demo mode: Purchase listener not set');
    // Demo mode'da listener ayarlamıyoruz
  }

  /**
   * Başarılı satın almayı işler
   */
  static async handleSuccessfulPurchase(purchase) {
    try {
      console.log('✅ Processing successful purchase:', purchase);
      
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
        purchaseTime: new Date(purchaseTime).toISOString()
      });

      // Başarı mesajı göster
      Alert.alert(
        '🎉 Satın Alma Başarılı!',
        `${packageInfo.credits} kredi hesabınıza eklendi!\n\nArtık ${await CreditService.getCredits()} krediniz var.`,
        [{ text: 'Harika!' }]
      );

      // Purchase'ı acknowledge et (Android için gerekli)
      // Not available in demo mode (InAppPurchases is not imported)
      // In production, ensure finishTransactionAsync is called.

      console.log('✅ Purchase processed successfully');
      
    } catch (error) {
      console.error('❌ Failed to process purchase:', error);
      
      Alert.alert(
        'İşlem Hatası',
        'Satın alma başarılı ancak krediler eklenirken hata oluştu. Lütfen destek ile iletişime geçin.',
        [{ text: 'Tamam' }]
      );
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
   * Satın almaları geri yükler (DEMO MODE)
   */
  static async restorePurchases() {
    try {
      console.log('🎯 Demo mode: Simulating restore purchases...');
      
      // Demo mode'da gerçek restore yapmıyoruz
      // Bu fonksiyon asla çağrılmamalı çünkü isAvailable() false döndürüyor
      throw new Error('Demo mode: Real restore not available');
      
    } catch (error) {
      console.error('❌ Demo restore failed:', error);
      throw error;
    }
  }

  /**
   * IAP'ın kullanılabilir olup olmadığını kontrol eder
   */
  static async isAvailable() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return this.isInitialized;
    } catch (error) {
      return false;
    }
  }

  /**
   * Servis durumu hakkında debug bilgisi
   */
  static async getDebugInfo() {
    return {
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
   * Servis bağlantısını kapatır (DEMO MODE)
   */
  static async disconnect() {
    try {
      console.log('🎯 Demo mode: Simulating disconnect...');
      this.isInitialized = false;
      this.products = [];
      console.log('🔌 Demo IAP Service disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect IAP service:', error);
    }
  }
}

export default IAPService; 