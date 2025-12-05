import AsyncStorage from '@react-native-async-storage/async-storage';
import FirstTimeService from './firstTimeService';

/**
 * CreditService - Kullanıcı kredilerini ve analiz haklarını yönetir
 */
class CreditService {
  static STORAGE_KEYS = {
    USER_CREDITS: 'userCredits',
    CREDIT_HISTORY: 'creditHistory',
    PURCHASE_HISTORY: 'purchaseHistory'
  };

  /**
   * Kullanıcının mevcut kredilerini getirir
   */
  static async getCredits() {
    try {
      const credits = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_CREDITS);
      return credits ? parseInt(credits, 10) : 0;
    } catch (error) {
      console.error('Error getting credits:', error);
      return 0;
    }
  }

  /**
   * Kullanıcının analiz yapabilme durumunu kontrol eder
   * @returns {Object} { canUse: boolean, type: 'free'|'credit'|'none', creditsLeft: number }
   */
  static async canAnalyze() {
    try {
      // Önce geliştirici modu kontrolü
      const isDevMode = await this.isDeveloperModeEnabled();
      if (isDevMode) {
        return { 
          canUse: true, 
          type: 'developer', 
          creditsLeft: 999999, // Sınırsız
          message: 'Geliştirici modu aktif - Sınırsız analiz!'
        };
      }

      // Önce ücretsiz hak kontrolü
      const canUseFree = await FirstTimeService.canUseFreeAnalysis();
      if (canUseFree) {
        return { 
          canUse: true, 
          type: 'free', 
          creditsLeft: await this.getCredits(),
          message: 'Ücretsiz analizinizi kullanabilirsiniz!'
        };
      }

      // Sonra kredi kontrolü
      const credits = await this.getCredits();
      if (credits > 0) {
        return { 
          canUse: true, 
          type: 'credit', 
          creditsLeft: credits,
          message: `${credits} kredi kullanılabilir`
        };
      }

      return { 
        canUse: false, 
        type: 'none', 
        creditsLeft: 0,
        message: 'Analiz yapmak için kredi satın almanız gerekiyor'
      };
    } catch (error) {
      console.error('Error checking analysis availability:', error);
      return { canUse: false, type: 'error', creditsLeft: 0, message: 'Hata oluştu' };
    }
  }

  /**
   * Bir analiz için kredi/hak kullanır
   * @returns {Promise<boolean>} Başarılı olup olmadığı
   */
  static async useAnalysis() {
    try {
      const canUse = await this.canAnalyze();
      
      if (canUse.type === 'developer') {
        // Geliştirici modunda kredi kullanılmaz
        await this.logCreditHistory('developer_analysis_used', 0, 'Geliştirici modunda analiz kullanıldı');
        if (__DEV__) {
          console.log('✅ Developer mode analysis used');
        }
        return true;
      } else if (canUse.type === 'free') {
        await FirstTimeService.markFreeAnalysisUsed();
        await this.logCreditHistory('free_analysis_used', 0, 'Ücretsiz analiz kullanıldı');
        if (__DEV__) {
          console.log('✅ Free analysis used');
        }
        return true;
      } else if (canUse.type === 'credit') {
        const success = await this.useCredit();
        if (success) {
          await this.logCreditHistory('credit_used', -1, 'Analiz için kredi kullanıldı');
          if (__DEV__) {
            console.log('✅ Credit used for analysis');
          }
        }
        return success;
      }

      if (__DEV__) {
        console.log('❌ Cannot use analysis - no credits or free analysis available');
      }
      return false;
    } catch (error) {
      console.error('Error using analysis:', error);
      return false;
    }
  }

  /**
   * Tek kredi kullanır
   * @returns {Promise<boolean>} Başarılı olup olmadığı
   */
  static async useCredit() {
    try {
      const credits = await this.getCredits();
      if (credits > 0) {
        const newCredits = credits - 1;
        await AsyncStorage.setItem(this.STORAGE_KEYS.USER_CREDITS, newCredits.toString());
        if (__DEV__) {
          console.log(`✅ Credit used. Remaining: ${newCredits}`);
        }
        return true;
      }
      if (__DEV__) {
        console.log('❌ No credits available');
      }
      return false;
    } catch (error) {
      console.error('Error using credit:', error);
      return false;
    }
  }

  /**
   * Kullanıcıya kredi ekler
   * @param {number} amount - Eklenecek kredi miktarı
   * @param {string} source - Kredinin kaynağı (purchase, bonus, vb.)
   */
  static async addCredits(amount, source = 'purchase', sourceTxId = null) {
    try {
      const currentCredits = await this.getCredits();
      const newCredits = currentCredits + amount;
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_CREDITS, newCredits.toString());
      
      const description = sourceTxId 
        ? `${source} ile ${amount} kredi eklendi (TxID: ${sourceTxId})`
        : `${source} ile ${amount} kredi eklendi`;
      
      await this.logCreditHistory('credits_added', amount, description);
      
      if (__DEV__) {
        console.log(`✅ ${amount} credits added successfully. Total: ${newCredits}`, sourceTxId ? `(TxID: ${sourceTxId})` : '');
      }
      return newCredits;
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Error adding credits:', error);
      }
      throw error;
    }
  }

  /**
   * Kredi geçmişine kayıt ekler
   * @param {string} action - İşlem türü
   * @param {number} amount - Miktar (+/-)
   * @param {string} description - Açıklama
   */
  static async logCreditHistory(action, amount, description) {
    try {
      const history = await this.getCreditHistory();
      const newEntry = {
        id: Date.now().toString(),
        action,
        amount,
        description,
        timestamp: new Date().toISOString(),
        creditsAfter: await this.getCredits()
      };

      history.unshift(newEntry);
      
      // Son 100 kayıtı tut
      const trimmedHistory = history.slice(0, 100);
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.CREDIT_HISTORY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Error logging credit history:', error);
    }
  }

  /**
   * Kredi geçmişini getirir
   * @returns {Promise<Array>} Kredi geçmişi
   */
  static async getCreditHistory() {
    try {
      const history = await AsyncStorage.getItem(this.STORAGE_KEYS.CREDIT_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting credit history:', error);
      return [];
    }
  }

  /**
   * Satın alma geçmişine kayıt ekler
   * @param {Object} purchaseData - Satın alma bilgileri
   */
  static async logPurchase(purchaseData) {
    try {
      const history = await this.getPurchaseHistory();
      const newPurchase = {
        id: purchaseData.transactionId || Date.now().toString(),
        productId: purchaseData.productId,
        credits: purchaseData.credits,
        price: purchaseData.price,
        currency: purchaseData.currency || 'USD',
        timestamp: new Date().toISOString(),
        platform: purchaseData.platform || 'unknown'
      };

      history.unshift(newPurchase);
      
      // Son 50 satın alma kaydını tut
      const trimmedHistory = history.slice(0, 50);
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.PURCHASE_HISTORY, JSON.stringify(trimmedHistory));
      
      console.log('✅ Purchase logged:', newPurchase);
    } catch (error) {
      console.error('Error logging purchase:', error);
    }
  }

  /**
   * Satın alma geçmişini getirir
   * @returns {Promise<Array>} Satın alma geçmişi
   */
  static async getPurchaseHistory() {
    try {
      const history = await AsyncStorage.getItem(this.STORAGE_KEYS.PURCHASE_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting purchase history:', error);
      return [];
    }
  }

  /**
   * Kullanıcı istatistiklerini getirir
   */
  static async getUserStats() {
    try {
      const [
        credits,
        history,
        purchases,
        firstTimeInfo
      ] = await Promise.all([
        this.getCredits(),
        this.getCreditHistory(),
        this.getPurchaseHistory(),
        FirstTimeService.getDebugInfo()
      ]);

      const totalAnalyses = history.filter(h => 
        h.action === 'credit_used' || h.action === 'free_analysis_used'
      ).length;

      const totalSpent = purchases.reduce((sum, p) => {
        const price = typeof p.price === 'string' ? 
          parseFloat(p.price.replace(/[^0-9.]/g, '')) : p.price;
        return sum + (price || 0);
      }, 0);

      const totalCreditsPurchased = purchases.reduce((sum, p) => sum + (p.credits || 0), 0);

      return {
        currentCredits: credits,
        totalAnalyses,
        totalPurchases: purchases.length,
        totalSpent: totalSpent.toFixed(2),
        totalCreditsPurchased,
        hasUsedFreeAnalysis: firstTimeInfo?.hasUsedFreeAnalysis || false,
        installationDate: firstTimeInfo?.installationDate,
        averageSpentPerAnalysis: totalAnalyses > 0 ? (totalSpent / totalAnalyses).toFixed(2) : '0.00'
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Test ve geliştirme için tüm verileri sıfırlar
   */
  static async resetForTesting() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEYS.USER_CREDITS),
        AsyncStorage.removeItem(this.STORAGE_KEYS.CREDIT_HISTORY),
        AsyncStorage.removeItem(this.STORAGE_KEYS.PURCHASE_HISTORY)
      ]);
      
      // FirstTimeService'i de sıfırla
      await FirstTimeService.resetForTesting();
      
      if (__DEV__) {
        console.log('🔄 Credit service reset for testing');
      }
    } catch (error) {
      console.error('Error resetting credit service:', error);
    }
  }

  /**
   * Debugging için tüm durumları gösterir
   */
  static async getDebugInfo() {
    try {
      const [stats, canAnalyze, firstTimeInfo] = await Promise.all([
        this.getUserStats(),
        this.canAnalyze(),
        FirstTimeService.getDebugInfo()
      ]);

      return {
        creditService: {
          currentCredits: await this.getCredits(),
          canAnalyze,
          userStats: stats
        },
        firstTimeService: firstTimeInfo
      };
    } catch (error) {
      console.error('Error getting debug info:', error);
      return null;
    }
  }

  /**
   * Geliştirici modu için test kredileri ekler
   * Sadece geliştirme ortamında kullanılmalıdır
   */
  static async addDeveloperCredits(amount = 100) {
    try {
      // Geliştirici modu kontrolü
      if (!__DEV__) {
        console.warn('⚠️ Developer credits can only be added in development mode');
        return false;
      }

      const currentCredits = await this.getCredits();
      const newCredits = currentCredits + amount;
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_CREDITS, newCredits.toString());
      await this.logCreditHistory('developer_credits_added', amount, `Geliştirici test kredileri: ${amount} kredi`);
      
      if (__DEV__) {
        console.log(`✅ Developer credits added: ${amount}. Total: ${newCredits}`);
      }
      return newCredits;
    } catch (error) {
      console.error('Error adding developer credits:', error);
      return false;
    }
  }

  /**
   * Geliştirici modu için sınırsız analiz hakkı verir
   * Sadece geliştirme ortamında kullanılmalıdır
   */
  static async enableDeveloperMode() {
    try {
      if (!__DEV__) {
        console.warn('⚠️ Developer mode can only be enabled in development mode');
        return false;
      }

      // Geliştirici modu için özel bir flag ekle
      await AsyncStorage.setItem('developerMode', 'true');
      await AsyncStorage.setItem('developerModeEnabledAt', new Date().toISOString());
      
      if (__DEV__) {
        console.log('✅ Developer mode enabled');
      }
      return true;
    } catch (error) {
      console.error('Error enabling developer mode:', error);
      return false;
    }
  }

  /**
   * Geliştirici modunun aktif olup olmadığını kontrol eder
   */
  static async isDeveloperModeEnabled() {
    try {
      if (!__DEV__) return false;
      
      const developerMode = await AsyncStorage.getItem('developerMode');
      return developerMode === 'true';
    } catch (error) {
      console.error('Error checking developer mode:', error);
      return false;
    }
  }

  /**
   * Geliştirici modunu devre dışı bırakır
   */
  static async disableDeveloperMode() {
    try {
      if (!__DEV__) {
        console.warn('⚠️ Developer mode can only be disabled in development mode');
        return false;
      }

      await AsyncStorage.removeItem('developerMode');
      await AsyncStorage.removeItem('developerModeEnabledAt');
      
      if (__DEV__) {
        console.log('✅ Developer mode disabled');
      }
      return true;
    } catch (error) {
      console.error('Error disabling developer mode:', error);
      return false;
    }
  }
}

export default CreditService; 