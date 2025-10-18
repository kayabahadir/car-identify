/**
 * App Store Connect Configuration
 * Apple IAP için gerekli konfigürasyonlar
 */

const AppStoreConfig = {
  // App Store Connect'ten alınacak shared secret
  // https://appstoreconnect.apple.com/ > Users and Access > Keys > In-App Purchase
  SHARED_SECRET: 'ae3218edba3241f3a4b92c27ccd0f088', // Mevcut shared secret
  
  // Bundle identifier
  BUNDLE_ID: 'com.caridentify.app',
  
  // IAP Product IDs
  PRODUCT_IDS: {
    CREDITS_10: 'com.caridentify.app.credits.consumable.pack10',
    CREDITS_50: 'com.caridentify.app.credits.consumable.pack50',
    CREDITS_200: 'com.caridentify.app.credits.consumable.pack200'
  },
  
  // Environment settings
  ENVIRONMENT: {
    // Production'da true, development'da false
    IS_PRODUCTION: __DEV__ ? false : true,
    
    // Receipt validation'ı enable/disable et
    ENABLE_RECEIPT_VALIDATION: true,
    
    // Fallback mode (receipt validation başarısız olursa)
    ENABLE_FALLBACK_MODE: true
  },
  
  // Debug settings
  DEBUG: {
    LOG_RECEIPT_VALIDATION: __DEV__,
    LOG_PURCHASE_FLOW: __DEV__,
    MOCK_RECEIPT_VALIDATION: false // Development için mock mode
  }
};

export default AppStoreConfig;
