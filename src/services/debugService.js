import { Alert } from 'react-native';

/**
 * Debug Service - Console loglarını alert olarak gösterir
 * Windows development için console log'lara erişim olmadığında kullanılır
 */
class DebugService {
  static debugLogs = [];
  static isEnabled = true; // Production'da da aktif (geçici olarak)
  
  // Şimdilik her zaman aktif
  static get shouldShowAlerts() {
    return this.isEnabled;
  }

  /**
   * Debug log ekler ve alert olarak gösterir
   */
  static log(title, message, showAlert = true) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${title}: ${message}`;
    
    // Console'a da yaz
    console.log(logEntry);
    
    // Debug logs'a ekle
    this.debugLogs.push(logEntry);
    
    // Son 50 log'u tut
    if (this.debugLogs.length > 50) {
      this.debugLogs = this.debugLogs.slice(-50);
    }
    
    // Alert göster (eğer isteniyorsa)
    if (showAlert && this.shouldShowAlerts) {
      Alert.alert(
        `🔍 Debug: ${title}`,
        message,
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Error log ekler ve alert olarak gösterir
   */
  static error(title, error, showAlert = true) {
    const errorMessage = error?.message || String(error);
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ❌ ${title}: ${errorMessage}`;
    
    // Console'a da yaz
    console.error(logEntry, error);
    
    // Debug logs'a ekle
    this.debugLogs.push(logEntry);
    
    // Alert göster (eğer isteniyorsa)
    if (showAlert && this.shouldShowAlerts) {
      Alert.alert(
        `❌ Error: ${title}`,
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Tüm debug loglarını gösterir
   */
  static showAllLogs() {
    if (this.debugLogs.length === 0) {
      Alert.alert('Debug Logs', 'No logs available');
      return;
    }

    const logsText = this.debugLogs.slice(-20).join('\n\n');
    Alert.alert(
      'Debug Logs (Last 20)',
      logsText,
      [
        { text: 'Clear Logs', onPress: () => this.clearLogs() },
        { text: 'OK' }
      ]
    );
  }

  /**
   * Debug loglarını temizler
   */
  static clearLogs() {
    this.debugLogs = [];
    Alert.alert('Debug Logs', 'Logs cleared');
  }

  /**
   * IAP debug bilgilerini toplar ve gösterir
   */
  static async showIAPDebug() {
    try {
      // Lazy require to avoid circular dependency
      let IAPService;
      try {
        IAPService = require('./iapService').default;
      } catch (e) {
        Alert.alert('Debug Error', 'Could not load IAP Service');
        return;
      }
      
      const diagnostics = await IAPService.diagnose();
      
      const debugInfo = `
🔍 IAP Debug Information:

📱 Platform: ${diagnostics.platform}
🔧 Initialized: ${diagnostics.initialized}
📦 Module Loaded: ${diagnostics.moduleLoaded}
✅ Available: ${diagnostics.isAvailable}
🛍️ Products Count: ${diagnostics.productsCount}
📋 Bundle ID: ${diagnostics.bundleIdentifier}
🔗 Has Connect: ${diagnostics.hasConnectAsync}
📊 Has IsAvailable: ${diagnostics.hasIsAvailableAsync}
🛒 Has GetProducts: ${diagnostics.hasGetProductsAsync}

${diagnostics.lastError ? `❌ Last Error: ${diagnostics.lastError}` : '✅ No Errors'}
      `.trim();

      Alert.alert(
        'IAP Debug Info',
        debugInfo,
        [
          { text: 'Show All Logs', onPress: () => this.showAllLogs() },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      this.error('IAP Debug Failed', error);
    }
  }

  /**
   * Debug mode'u toggle eder
   */
  static toggleDebugMode() {
    this.isEnabled = !this.isEnabled;
    Alert.alert(
      'Debug Mode',
      `Debug alerts ${this.isEnabled ? 'enabled' : 'disabled'}`,
      [{ text: 'OK' }]
    );
  }
}

export default DebugService;
