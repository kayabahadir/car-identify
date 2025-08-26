/**
 * Geliştirici Modu Test Script'i
 * 
 * Bu script, geliştirici modunun tüm özelliklerini test etmek için kullanılır.
 * Console'da çalıştırılabilir.
 */

// Test fonksiyonları
const testDeveloperMode = {
  
  // Geliştirici modunu test et
  async testEnableDeveloperMode() {
    console.log('🧪 Geliştirici modu aktif ediliyor...');
    
    try {
      const success = await CreditService.enableDeveloperMode();
      if (success) {
        console.log('✅ Geliştirici modu aktif edildi!');
        
        // Durumu kontrol et
        const isEnabled = await CreditService.isDeveloperModeEnabled();
        console.log('🔍 Geliştirici modu durumu:', isEnabled);
        
        // Analiz yapabilme durumunu kontrol et
        const canAnalyze = await CreditService.canAnalyze();
        console.log('🔍 Analiz durumu:', canAnalyze);
        
        return true;
      } else {
        console.log('❌ Geliştirici modu aktif edilemedi');
        return false;
      }
    } catch (error) {
      console.error('❌ Hata:', error);
      return false;
    }
  },

  // Test kredileri eklemeyi test et
  async testAddDeveloperCredits() {
    console.log('🧪 Test kredileri ekleniyor...');
    
    try {
      const newCredits = await CreditService.addDeveloperCredits(50);
      if (newCredits !== false) {
        console.log(`✅ 50 test kredisi eklendi! Toplam: ${newCredits} kredi`);
        
        // Mevcut kredileri kontrol et
        const currentCredits = await CreditService.getCredits();
        console.log('🔍 Mevcut krediler:', currentCredits);
        
        return true;
      } else {
        console.log('❌ Test kredileri eklenemedi');
        return false;
      }
    } catch (error) {
      console.error('❌ Hata:', error);
      return false;
    }
  },

  // Analiz kullanımını test et
  async testUseAnalysis() {
    console.log('🧪 Analiz kullanımı test ediliyor...');
    
    try {
      // Önce analiz yapabilme durumunu kontrol et
      const canAnalyze = await CreditService.canAnalyze();
      console.log('🔍 Analiz yapabilme durumu:', canAnalyze);
      
      if (canAnalyze.canUse) {
        // Analiz kullan
        const success = await CreditService.useAnalysis();
        if (success) {
          console.log('✅ Analiz başarıyla kullanıldı!');
          
          // Kredi durumunu kontrol et
          const creditsAfter = await CreditService.getCredits();
          console.log('🔍 Kullanım sonrası krediler:', creditsAfter);
          
          return true;
        } else {
          console.log('❌ Analiz kullanılamadı');
          return false;
        }
      } else {
        console.log('❌ Analiz yapılamıyor:', canAnalyze.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Hata:', error);
      return false;
    }
  },

  // Geliştirici modunu kapatmayı test et
  async testDisableDeveloperMode() {
    console.log('🧪 Geliştirici modu kapatılıyor...');
    
    try {
      const success = await CreditService.disableDeveloperMode();
      if (success) {
        console.log('✅ Geliştirici modu kapatıldı!');
        
        // Durumu kontrol et
        const isEnabled = await CreditService.isDeveloperModeEnabled();
        console.log('🔍 Geliştirici modu durumu:', isEnabled);
        
        // Analiz yapabilme durumunu kontrol et
        const canAnalyze = await CreditService.canAnalyze();
        console.log('🔍 Analiz durumu:', canAnalyze);
        
        return true;
      } else {
        console.log('❌ Geliştirici modu kapatılamadı');
        return false;
      }
    } catch (error) {
      console.error('❌ Hata:', error);
      return false;
    }
  },

  // Test verilerini sıfırlamayı test et
  async testResetForTesting() {
    console.log('🧪 Test verileri sıfırlanıyor...');
    
    try {
      await CreditService.resetForTesting();
      console.log('✅ Test verileri sıfırlandı!');
      
      // Durumu kontrol et
      const credits = await CreditService.getCredits();
      const canAnalyze = await CreditService.isDeveloperModeEnabled();
      
      console.log('🔍 Sıfırlama sonrası krediler:', credits);
      console.log('🔍 Geliştirici modu durumu:', canAnalyze);
      
      return true;
    } catch (error) {
      console.error('❌ Hata:', error);
      return false;
    }
  },

  // Debug bilgilerini göster
  async showDebugInfo() {
    console.log('🧪 Debug bilgileri alınıyor...');
    
    try {
      const debugInfo = await CreditService.getDebugInfo();
      console.log('📊 Debug Bilgileri:', debugInfo);
      
      return true;
    } catch (error) {
      console.error('❌ Hata:', error);
      return false;
    }
  },

  // Tüm testleri çalıştır
  async runAllTests() {
    console.log('🚀 Tüm geliştirici modu testleri başlatılıyor...\n');
    
    const results = {
      enableMode: await this.testEnableDeveloperMode(),
      addCredits: await this.testAddDeveloperCredits(),
      useAnalysis: await this.testUseAnalysis(),
      disableMode: await this.testDisableDeveloperMode(),
      resetData: await this.testResetForTesting(),
      debugInfo: await this.showDebugInfo()
    };
    
    console.log('\n📋 Test Sonuçları:');
    console.log('✅ Geliştirici modu aktif etme:', results.enableMode);
    console.log('✅ Test kredileri ekleme:', results.addCredits);
    console.log('✅ Analiz kullanımı:', results.useAnalysis);
    console.log('✅ Geliştirici modu kapatma:', results.disableMode);
    console.log('✅ Veri sıfırlama:', results.resetData);
    console.log('✅ Debug bilgileri:', results.debugInfo);
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Başarı Oranı: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`);
    
    if (successCount === totalTests) {
      console.log('🎉 Tüm testler başarılı! Geliştirici modu düzgün çalışıyor.');
    } else {
      console.log('⚠️ Bazı testler başarısız. Lütfen hataları kontrol edin.');
    }
    
    return results;
  }
};

// Console'da kullanım için global olarak ekle
if (typeof global !== 'undefined') {
  global.testDeveloperMode = testDeveloperMode;
}

// Export (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testDeveloperMode;
}

console.log('🧪 Geliştirici Modu Test Script\'i yüklendi!');
console.log('Kullanım: testDeveloperMode.runAllTests()');
console.log('Veya tek tek test etmek için: testDeveloperMode.testEnableDeveloperMode()');

