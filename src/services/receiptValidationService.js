import AppStoreConfig from '../config/appStoreConfig';

/**
 * Receipt Validation Service
 * Apple'ın receipt validation gereksinimlerini karşılar
 * Production ve Sandbox environment desteği
 */

class ReceiptValidationService {
  // Apple'ın receipt validation URL'leri
  static APPLE_URLS = {
    PRODUCTION: 'https://buy.itunes.apple.com/verifyReceipt',
    SANDBOX: 'https://sandbox.itunes.apple.com/verifyReceipt'
  };

  /**
   * Receipt'i Apple'a doğrular
   * @param {string} receiptData - Base64 encoded receipt data
   * @param {boolean} isProduction - Production environment mı?
   * @returns {Promise<Object>} Validation result
   */
  static async validateReceipt(receiptData, isProduction = true) {
    try {
      console.log('🔍 Starting receipt validation...', { isProduction });

      if (!receiptData) {
        console.error('❌ No receipt data provided');
        return {
          success: false,
          error: 'No receipt data',
          status: -1
        };
      }

      // ALWAYS start with production URL (Apple's requirement)
      let validationResult = await this.validateWithApple(
        receiptData, 
        this.APPLE_URLS.PRODUCTION, 
        true
      );

      // If we get status 21007 (sandbox receipt in production), retry with sandbox
      // This is the recommended approach by Apple
      if (validationResult.status === 21007) {
        console.log('🔄 Sandbox receipt detected (status 21007), retrying with sandbox URL...');
        validationResult = await this.validateWithApple(
          receiptData, 
          this.APPLE_URLS.SANDBOX, 
          false
        );
      }
      
      // If we get status 21008 (production receipt in sandbox), retry with production
      else if (validationResult.status === 21008) {
        console.log('🔄 Production receipt detected (status 21008), retrying with production URL...');
        validationResult = await this.validateWithApple(
          receiptData, 
          this.APPLE_URLS.PRODUCTION, 
          true
        );
      }

      return validationResult;

    } catch (error) {
      console.error('❌ Receipt validation failed:', error);
      return {
        success: false,
        error: error.message,
        status: -1
      };
    }
  }

  /**
   * Apple'a receipt validation isteği gönder
   * @param {string} receiptData - Base64 encoded receipt
   * @param {string} url - Apple validation URL
   * @param {boolean} isProduction - Production environment mı?
   * @returns {Promise<Object>} Apple response
   */
  static async validateWithApple(receiptData, url, isProduction) {
    try {
      const requestBody = {
        'receipt-data': receiptData,
        'password': AppStoreConfig.SHARED_SECRET,
        'exclude-old-transactions': true
      };

      const environmentName = isProduction ? 'PRODUCTION' : 'SANDBOX';
      console.log(`📤 Sending validation request to ${environmentName}:`, url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        console.error(`❌ HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`📥 Apple validation response from ${environmentName}:`, {
        status: result.status,
        statusDescription: this.getStatusDescription(result.status),
        environment: result.environment,
        receipt: result.receipt ? 'present' : 'missing'
      });

      // Status 0 = success
      // Status 21007 = sandbox receipt sent to production (need to retry with sandbox)
      // Status 21008 = production receipt sent to sandbox (need to retry with production)
      return {
        success: result.status === 0,
        status: result.status,
        environment: result.environment,
        receipt: result.receipt,
        latest_receipt_info: result.latest_receipt_info,
        pending_renewal_info: result.pending_renewal_info,
        is_retryable: result.status === 21007 || result.status === 21008
      };

    } catch (error) {
      console.error('❌ Apple validation request failed:', error);
      return {
        success: false,
        status: -1,
        error: error.message
      };
    }
  }

  /**
   * Receipt'ten IAP transaction'larını çıkar
   * @param {Object} validationResult - Apple validation result
   * @returns {Array} IAP transactions
   */
  static extractIAPTransactions(validationResult) {
    try {
      if (!validationResult.success || !validationResult.receipt) {
        return [];
      }

      const receipt = validationResult.receipt;
      const inAppPurchases = receipt.in_app || [];
      
      console.log('📦 Extracted IAP transactions:', inAppPurchases.length);

      return inAppPurchases.map(transaction => ({
        transactionId: transaction.transaction_id,
        productId: transaction.product_id,
        purchaseDate: transaction.purchase_date_ms,
        originalTransactionId: transaction.original_transaction_id,
        quantity: parseInt(transaction.quantity) || 1,
        webOrderLineItemId: transaction.web_order_line_item_id
      }));

    } catch (error) {
      console.error('❌ Error extracting IAP transactions:', error);
      return [];
    }
  }

  /**
   * Belirli bir product ID için transaction'ı bul
   * @param {Object} validationResult - Apple validation result
   * @param {string} productId - Aranacak product ID
   * @returns {Object|null} Transaction data
   */
  static findTransactionForProduct(validationResult, productId) {
    try {
      const transactions = this.extractIAPTransactions(validationResult);
      
      // En son transaction'ı bul (aynı product için birden fazla olabilir)
      const productTransactions = transactions.filter(t => t.productId === productId);
      
      if (productTransactions.length === 0) {
        console.log('❌ No transaction found for product:', productId);
        return null;
      }

      // En son transaction'ı döndür
      const latestTransaction = productTransactions.sort((a, b) => 
        parseInt(b.purchaseDate) - parseInt(a.purchaseDate)
      )[0];

      console.log('✅ Found transaction for product:', productId, latestTransaction);
      return latestTransaction;

    } catch (error) {
      console.error('❌ Error finding transaction for product:', error);
      return null;
    }
  }

  /**
   * Receipt validation'ı test et (development için)
   * @param {string} testReceiptData - Test receipt data
   * @returns {Promise<Object>} Test result
   */
  static async testValidation(testReceiptData) {
    try {
      console.log('🧪 Testing receipt validation...');
      
      const result = await this.validateReceipt(testReceiptData, false); // Sandbox test
      
      console.log('🧪 Test result:', result);
      
      return {
        success: result.success,
        environment: result.environment,
        status: result.status,
        transactions: this.extractIAPTransactions(result)
      };

    } catch (error) {
      console.error('❌ Receipt validation test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apple status kodlarını açıkla
   * @param {number} status - Apple status code
   * @returns {string} Status açıklaması
   */
  static getStatusDescription(status) {
    const statusCodes = {
      0: 'Valid receipt',
      21000: 'The App Store could not read the receipt data',
      21002: 'The receipt data property was malformed or missing',
      21003: 'The receipt could not be authenticated',
      21004: 'The shared secret you provided does not match the shared secret on file',
      21005: 'The receipt server is not currently available',
      21006: 'This receipt is valid but the subscription has expired',
      21007: 'This receipt is from the test environment, but it was sent to the production environment for verification',
      21008: 'This receipt is from the production environment, but it was sent to the test environment for verification',
      21010: 'This receipt could not be authorized'
    };

    return statusCodes[status] || `Unknown status code: ${status}`;
  }
}

export default ReceiptValidationService;
