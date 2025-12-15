import AsyncStorage from '@react-native-async-storage/async-storage';
import CreditService from '../services/creditService';

/**
 * CreditsManager - Manages credit operations for RevenueCat IAP
 * Uses the existing CreditService as the underlying storage
 */
class CreditsManager {
  // Map RevenueCat package IDs to credit amounts
  static PACKAGE_CREDITS = {
    'pack10': 5,
    'pack50': 25,
    'pack200': 100,
  };

  // Also support Apple Product IDs for backward compatibility
  static PRODUCT_CREDITS = {
    'com.caridentify.app.credits.consumable.pack10': 5,
    'com.caridentify.app.credits.consumable.pack50': 25,
    'com.caridentify.app.credits.consumable.pack200': 100,
  };

  /**
   * Get the current credit balance
   * @returns {Promise<number>} Current credits
   */
  static async getCredits() {
    try {
      return await CreditService.getCredits();
    } catch (error) {
      console.error('CreditsManager: Error getting credits:', error);
      return 0;
    }
  }

  /**
   * Add credits to the user's balance
   * @param {number} amount - Number of credits to add
   * @param {string} source - Source of credits (e.g., 'RevenueCat Purchase')
   * @param {string} transactionId - Optional transaction ID for tracking
   * @returns {Promise<number>} New credit balance
   */
  static async addCredits(amount, source = 'purchase', transactionId = null) {
    try {
      if (amount <= 0) {
        console.warn('CreditsManager: Invalid credit amount:', amount);
        return await this.getCredits();
      }

      console.log(`CreditsManager: Adding ${amount} credits from ${source}`);
      
      const newBalance = await CreditService.addCredits(amount, source, transactionId);
      
      console.log(`CreditsManager: New balance: ${newBalance}`);
      
      return newBalance;
    } catch (error) {
      console.error('CreditsManager: Error adding credits:', error);
      throw error;
    }
  }

  /**
   * Get credit amount for a package identifier
   * @param {string} packageId - RevenueCat package identifier (e.g., 'pack10')
   * @returns {number} Credit amount, or 0 if not found
   */
  static getCreditsForPackage(packageId) {
    // Try package ID first
    if (this.PACKAGE_CREDITS[packageId]) {
      return this.PACKAGE_CREDITS[packageId];
    }
    
    // Try as product ID
    if (this.PRODUCT_CREDITS[packageId]) {
      return this.PRODUCT_CREDITS[packageId];
    }
    
    // Try extracting from product ID string
    if (packageId && typeof packageId === 'string') {
      if (packageId.includes('pack10')) return 5;
      if (packageId.includes('pack50')) return 25;
      if (packageId.includes('pack200')) return 100;
    }
    
    console.warn('CreditsManager: Unknown package ID:', packageId);
    return 0;
  }

  /**
   * Reset credits (for testing only)
   * @returns {Promise<void>}
   */
  static async resetCredits() {
    try {
      if (__DEV__) {
        await CreditService.resetForTesting();
        console.log('CreditsManager: Credits reset for testing');
      } else {
        console.warn('CreditsManager: Reset only available in development mode');
      }
    } catch (error) {
      console.error('CreditsManager: Error resetting credits:', error);
      throw error;
    }
  }

  /**
   * Get credit history
   * @returns {Promise<Array>} Credit transaction history
   */
  static async getCreditHistory() {
    try {
      return await CreditService.getCreditHistory();
    } catch (error) {
      console.error('CreditsManager: Error getting credit history:', error);
      return [];
    }
  }

  /**
   * Get purchase history
   * @returns {Promise<Array>} Purchase history
   */
  static async getPurchaseHistory() {
    try {
      return await CreditService.getPurchaseHistory();
    } catch (error) {
      console.error('CreditsManager: Error getting purchase history:', error);
      return [];
    }
  }

  /**
   * Log a purchase (for record keeping)
   * @param {Object} purchaseData - Purchase details
   * @returns {Promise<void>}
   */
  static async logPurchase(purchaseData) {
    try {
      await CreditService.logPurchase(purchaseData);
    } catch (error) {
      console.error('CreditsManager: Error logging purchase:', error);
    }
  }
}

export default CreditsManager;

