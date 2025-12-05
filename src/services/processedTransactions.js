import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ProcessedTransactions - İşlenmiş IAP transaction'ları takip eder
 * Duplicate (çift) işlem yapılmasını engeller
 */
class ProcessedTransactions {
  static KEY = '@processed_iap_transactions';

  /**
   * Transaction daha önce işlendi mi kontrol et
   * @param {string} txId - Transaction ID
   * @returns {Promise<boolean>}
   */
  static async has(txId) {
    if (!txId) return false;

    try {
      const raw = await AsyncStorage.getItem(this.KEY);
      if (!raw) return false;

      const set = JSON.parse(raw);
      return !!set[txId];
    } catch (error) {
      console.error('ProcessedTx.has error:', error);
      return false;
    }
  }

  /**
   * Transaction'ı işlenmiş olarak işaretle
   * @param {string} txId - Transaction ID
   */
  static async mark(txId) {
    if (!txId) return;

    try {
      const raw = await AsyncStorage.getItem(this.KEY);
      const set = raw ? JSON.parse(raw) : {};

      set[txId] = Date.now();

      await AsyncStorage.setItem(this.KEY, JSON.stringify(set));
      console.log('✅ Transaction marked as processed:', txId);
    } catch (error) {
      console.error('ProcessedTx.mark error:', error);
    }
  }

  /**
   * Eski transaction kayıtlarını temizle (30 gün öncesi)
   */
  static async cleanup() {
    try {
      const raw = await AsyncStorage.getItem(this.KEY);
      if (!raw) return;

      const set = JSON.parse(raw);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      let cleaned = 0;
      for (const [txId, timestamp] of Object.entries(set)) {
        if (timestamp < thirtyDaysAgo) {
          delete set[txId];
          cleaned++;
        }
      }

      if (cleaned > 0) {
        await AsyncStorage.setItem(this.KEY, JSON.stringify(set));
        console.log(`✅ Cleaned ${cleaned} old transaction records`);
      }
    } catch (error) {
      console.error('ProcessedTx.cleanup error:', error);
    }
  }

  /**
   * Tüm işlenmiş transaction'ları getir (debug için)
   */
  static async getAll() {
    try {
      const raw = await AsyncStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error('ProcessedTx.getAll error:', error);
      return {};
    }
  }
}

export default ProcessedTransactions;

