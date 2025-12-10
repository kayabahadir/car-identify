import Purchases from 'react-native-purchases';
import { Platform, Alert } from 'react-native';
import CreditsManager from '../iap/creditsManager';

/**
 * ⚠️ IMPORTANT: Replace this with your actual RevenueCat API key
 * iOS: appl_XXXXXXXXXXXX
 * Android: goog_XXXXXXXXXXXX (if you add Android later)
 */
const REVENUECAT_API_KEY = 'appl_gOQiytBQrrDQOsbjIpXTGnhveGZ'; // TODO: Replace with your actual key

/**
 * RevenueCat Service - Handles all IAP operations using RevenueCat
 * Focus: Consumable purchases with credits system
 */
class RevenueCatService {
  static isInitialized = false;
  static currentOfferings = null;

  /**
   * Initialize RevenueCat SDK
   * Call this once at app startup
   */
  static async initialize() {
    if (this.isInitialized) {
      console.log('RevenueCat: Already initialized');
      return true;
    }

    try {
      console.log('RevenueCat: Initializing...');

      // Configure Purchases
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });

      // Set debug logs in development
      if (__DEV__) {
        await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        console.log('RevenueCat: Debug logging enabled');
      }

      this.isInitialized = true;
      console.log('RevenueCat: Initialized successfully!');

      // Pre-load offerings
      await this.loadOfferings();

      return true;
    } catch (error) {
      console.error('RevenueCat: Initialization error:', error);
      return false;
    }
  }

  /**
   * Load available offerings from RevenueCat
   * @returns {Promise<Object|null>} Current offering or null
   */
  static async loadOfferings() {
    try {
      console.log('RevenueCat: Loading offerings...');
      
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
        this.currentOfferings = offerings.current;
        console.log('RevenueCat: Loaded', offerings.current.availablePackages.length, 'packages');
        
        // Log package details in dev mode
        if (__DEV__) {
          offerings.current.availablePackages.forEach(pkg => {
            console.log('Package:', pkg.identifier, '→', pkg.product.identifier, '→', pkg.product.priceString);
          });
        }
        
        return this.currentOfferings;
      } else {
        console.warn('RevenueCat: No offerings found. Check your RevenueCat dashboard configuration.');
        return null;
      }
    } catch (error) {
      console.error('RevenueCat: Error loading offerings:', error);
      return null;
    }
  }

  /**
   * Get available packages from current offering
   * @returns {Promise<Array>} Array of available packages
   */
  static async getPackages() {
    try {
      // Load offerings if not already loaded
      if (!this.currentOfferings) {
        await this.loadOfferings();
      }

      if (!this.currentOfferings) {
        console.warn('RevenueCat: No offerings available');
        return [];
      }

      return this.currentOfferings.availablePackages;
    } catch (error) {
      console.error('RevenueCat: Error getting packages:', error);
      return [];
    }
  }

  /**
   * Purchase a package
   * @param {Object} rcPackage - RevenueCat package object
   * @returns {Promise<Object>} Purchase result with success status and credits added
   */
  static async purchasePackage(rcPackage) {
    try {
      console.log('RevenueCat: Purchasing package:', rcPackage.identifier);

      // Make the purchase
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(rcPackage);

      console.log('RevenueCat: Purchase successful!');
      console.log('Product ID:', productIdentifier);

      // Determine credits to add based on package identifier
      const packageId = rcPackage.identifier; // e.g., 'pack10', 'pack50', 'pack200'
      const productId = rcPackage.product.identifier; // e.g., 'com.caridentify.app.credits.consumable.pack10'
      
      // Try to get credits from package ID first, then product ID
      let creditsToAdd = CreditsManager.getCreditsForPackage(packageId);
      
      if (creditsToAdd === 0) {
        creditsToAdd = CreditsManager.getCreditsForPackage(productId);
      }

      if (creditsToAdd === 0) {
        console.error('RevenueCat: Unable to determine credits for package:', packageId, productId);
        throw new Error('Unable to determine credit amount for this package');
      }

      console.log('RevenueCat: Adding', creditsToAdd, 'credits');

      // Add credits to user account
      const newBalance = await CreditsManager.addCredits(
        creditsToAdd,
        'RevenueCat Purchase',
        customerInfo.originalAppUserId // Use RevenueCat's user ID as transaction reference
      );

      // Log the purchase
      await CreditsManager.logPurchase({
        transactionId: customerInfo.originalAppUserId,
        productId: productIdentifier,
        credits: creditsToAdd,
        price: rcPackage.product.priceString,
        currency: rcPackage.product.currencyCode,
        platform: Platform.OS,
      });

      console.log('RevenueCat: Purchase complete. New balance:', newBalance);

      return {
        success: true,
        creditsAdded: creditsToAdd,
        newBalance: newBalance,
        productIdentifier: productIdentifier,
      };

    } catch (error) {
      // Handle user cancellation
      if (error.userCancelled) {
        console.log('RevenueCat: User cancelled purchase');
        throw new Error('Purchase cancelled');
      }

      // Handle other errors
      console.error('RevenueCat: Purchase error:', error);
      throw error;
    }
  }

  /**
   * Get customer info
   * @returns {Promise<Object|null>} Customer info or null
   */
  static async getCustomerInfo() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      if (__DEV__) {
        console.log('RevenueCat: Customer Info:', {
          originalAppUserId: customerInfo.originalAppUserId,
          allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
        });
      }
      
      return customerInfo;
    } catch (error) {
      console.error('RevenueCat: Error getting customer info:', error);
      return null;
    }
  }

  /**
   * Restore purchases (useful for users switching devices)
   * @returns {Promise<Object>} Restore result
   */
  static async restorePurchases() {
    try {
      console.log('RevenueCat: Restoring purchases...');
      
      const customerInfo = await Purchases.restorePurchases();
      
      console.log('RevenueCat: Purchases restored');
      
      if (__DEV__) {
        console.log('Purchased products:', customerInfo.allPurchasedProductIdentifiers);
      }

      return {
        success: true,
        customerInfo: customerInfo,
      };
    } catch (error) {
      console.error('RevenueCat: Error restoring purchases:', error);
      throw error;
    }
  }

  /**
   * Check if SDK is configured and ready
   * @returns {boolean} True if initialized
   */
  static isReady() {
    return this.isInitialized;
  }
}

export default RevenueCatService;
