import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FirstTimeService - İlk kullanım ve ücretsiz analiz hakkını yönetir
 */
class FirstTimeService {
  static STORAGE_KEYS = {
    FREE_ANALYSIS_USED: 'freeAnalysisUsed',
    FIRST_LAUNCH: 'firstLaunch',
    INSTALLATION_DATE: 'installationDate'
  };

  /**
   * Uygulamanın ilk kez açılıp açılmadığını kontrol eder
   */
  static async isFirstLaunch() {
    try {
      const firstLaunch = await AsyncStorage.getItem(this.STORAGE_KEYS.FIRST_LAUNCH);
      return firstLaunch === null;
    } catch (error) {
      console.error('Error checking first launch:', error);
      return false;
    }
  }

  /**
   * İlk açılış işlemlerini tamamlar ve kurulum tarihini kaydeder
   */
  static async markFirstLaunchComplete() {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.FIRST_LAUNCH, 'completed'),
        AsyncStorage.setItem(this.STORAGE_KEYS.INSTALLATION_DATE, now)
      ]);
      console.log('✅ First launch marked as complete');
    } catch (error) {
      console.error('Error marking first launch complete:', error);
    }
  }

  /**
   * Ücretsiz analiz hakkının kullanılıp kullanılmadığını kontrol eder
   */
  static async hasUsedFreeAnalysis() {
    try {
      const used = await AsyncStorage.getItem(this.STORAGE_KEYS.FREE_ANALYSIS_USED);
      return used === 'true';
    } catch (error) {
      console.error('Error checking free analysis usage:', error);
      return false;
    }
  }

  /**
   * Ücretsiz analiz hakkının kullanıldığını işaretler
   */
  static async markFreeAnalysisUsed() {
    try {
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(this.STORAGE_KEYS.FREE_ANALYSIS_USED, 'true');
      await AsyncStorage.setItem('freeAnalysisUsedDate', timestamp);
      console.log('✅ Free analysis marked as used');
    } catch (error) {
      console.error('Error marking free analysis as used:', error);
    }
  }

  /**
   * Kullanıcının ücretsiz analiz hakkı kullanabilme durumunu kontrol eder
   */
  static async canUseFreeAnalysis() {
    try {
      const hasUsed = await this.hasUsedFreeAnalysis();
      return !hasUsed;
    } catch (error) {
      console.error('Error checking free analysis availability:', error);
      return false;
    }
  }

  /**
   * Kullanıcının kurulum tarihini getirir
   */
  static async getInstallationDate() {
    try {
      const date = await AsyncStorage.getItem(this.STORAGE_KEYS.INSTALLATION_DATE);
      return date ? new Date(date) : null;
    } catch (error) {
      console.error('Error getting installation date:', error);
      return null;
    }
  }

  /**
   * Ücretsiz analiz kullanım tarihini getirir
   */
  static async getFreeAnalysisUsedDate() {
    try {
      const date = await AsyncStorage.getItem('freeAnalysisUsedDate');
      return date ? new Date(date) : null;
    } catch (error) {
      console.error('Error getting free analysis used date:', error);
      return null;
    }
  }

  /**
   * Debugging için tüm durumları gösterir
   */
  static async getDebugInfo() {
    try {
      const [
        isFirst,
        canUseFree,
        hasUsedFree,
        installDate,
        usedDate
      ] = await Promise.all([
        this.isFirstLaunch(),
        this.canUseFreeAnalysis(),
        this.hasUsedFreeAnalysis(),
        this.getInstallationDate(),
        this.getFreeAnalysisUsedDate()
      ]);

      return {
        isFirstLaunch: isFirst,
        canUseFreeAnalysis: canUseFree,
        hasUsedFreeAnalysis: hasUsedFree,
        installationDate: installDate,
        freeAnalysisUsedDate: usedDate
      };
    } catch (error) {
      console.error('Error getting debug info:', error);
      return null;
    }
  }

  /**
   * Test ve geliştirme için tüm ayarları sıfırlar
   */
  static async resetForTesting() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEYS.FIRST_LAUNCH),
        AsyncStorage.removeItem(this.STORAGE_KEYS.FREE_ANALYSIS_USED),
        AsyncStorage.removeItem(this.STORAGE_KEYS.INSTALLATION_DATE),
        AsyncStorage.removeItem('freeAnalysisUsedDate')
      ]);
      console.log('🔄 First time service reset for testing');
    } catch (error) {
      console.error('Error resetting first time service:', error);
    }
  }
}

export default FirstTimeService; 