# 🧪 Geliştirici Modu Kullanım Kılavuzu

Bu doküman, Car Identify uygulamasında geliştirici olarak test yapabilmeniz için geliştirici modunun nasıl kullanılacağını açıklar.

## 🚀 Geliştirici Modu Nedir?

Geliştirici modu, sadece geliştirme ortamında (`__DEV__` true olduğunda) aktif olan özel bir test modudur. Bu mod sayesinde:

- ✅ **Sınırsız analiz** yapabilirsiniz
- ✅ **Test kredileri** ekleyebilirsiniz  
- ✅ **Verileri sıfırlayabilirsiniz**
- ✅ **Gerçek kredi satın almadan** test yapabilirsiniz

## 🔧 Nasıl Aktif Edilir?

### 1. Uygulamayı Geliştirme Modunda Çalıştırın
```bash
# Expo ile
expo start

# React Native ile  
npx react-native run-android
npx react-native run-ios
```

### 2. Ana Ekranda Geliştirici Modu Bölümünü Bulun
Geliştirici modu sadece geliştirme ortamında görünür. Ana ekranın alt kısmında şu bölümü göreceksiniz:

```
🧪 Geliştirici Modu
Test için geliştirici modunu aktif edin

[Geliştirici Modu Aktif Et] [+100 Test Kredisi] [Test Verilerini Sıfırla]
```

### 3. Geliştirici Modunu Aktif Edin
**"Geliştirici Modu Aktif Et"** butonuna tıklayın. Başarılı olduğunda:

```
🧪 Geliştirici Modu
Sınırsız analiz aktif!

[Geliştirici Modu Kapat] [+100 Test Kredisi] [Test Verilerini Sıfırla]
```

## 🎯 Geliştirici Modu Özellikleri

### ✅ Sınırsız Analiz
- Geliştirici modu aktifken **sınırsız** araç analizi yapabilirsiniz
- Her analiz için kredi kullanılmaz
- Analiz geçmişi kaydedilir ama kredi düşülmez

### ✅ Test Kredileri Ekleme
- **"+100 Test Kredisi"** butonu ile 100 test kredisi ekleyebilirsiniz
- Bu krediler gerçek krediler gibi davranır
- Analiz yaparken tüketilir

### ✅ Test Verilerini Sıfırlama
- **"Test Verilerini Sıfırla"** butonu ile tüm verileri sıfırlayabilirsiniz
- Krediler, analiz geçmişi, ilk kullanım bilgileri temizlenir
- Yeni bir kurulum gibi başlayabilirsiniz

## 🔒 Güvenlik Önlemleri

### ⚠️ Sadece Geliştirme Ortamında
- Geliştirici modu **sadece** `__DEV__` true olduğunda çalışır
- Production build'de bu özellikler **görünmez** ve **çalışmaz**
- Kullanıcılar geliştirici moduna erişemez

### ⚠️ Console Uyarıları
- Geliştirici modu production'da aktif edilmeye çalışılırsa console'da uyarı verilir
- Tüm geliştirici işlemleri console'da loglanır

## 📱 Kullanım Senaryoları

### 1. Yeni Özellik Testi
```javascript
// Geliştirici modunu aktif et
await CreditService.enableDeveloperMode();

// Sınırsız analiz yap
const canAnalyze = await CreditService.canAnalyze();
// Result: { canUse: true, type: 'developer', creditsLeft: 999999 }
```

### 2. Kredi Sistemi Testi
```javascript
// Test kredileri ekle
await CreditService.addDeveloperCredits(50);

// Kredi kullan
const success = await CreditService.useAnalysis();
// Result: true (kredi tüketildi)
```

### 3. Veri Sıfırlama
```javascript
// Tüm verileri sıfırla
await CreditService.resetForTesting();

// Yeni kurulum gibi başla
const isFirst = await FirstTimeService.isFirstLaunch();
// Result: true
```

## 🐛 Hata Ayıklama

### Console Logları
Geliştirici modunda tüm işlemler console'da loglanır:

```
✅ Developer mode enabled
✅ Developer credits added: 100. Total: 100
✅ Developer mode analysis used
🔄 Credit service reset for testing
```

### Debug Bilgileri
```javascript
// Tüm durumları gör
const debugInfo = await CreditService.getDebugInfo();
console.log(debugInfo);

// Geliştirici modu durumu
const isDevMode = await CreditService.isDeveloperModeEnabled();
console.log('Developer mode:', isDevMode);
```

## 📋 Test Checklist

Geliştirici modunu test ederken şunları kontrol edin:

- [ ] Geliştirici modu sadece geliştirme ortamında görünür
- [ ] Geliştirici modu aktif edilebilir
- [ ] Sınırsız analiz yapılabilir
- [ ] Test kredileri eklenebilir
- [ ] Veriler sıfırlanabilir
- [ ] Production build'de görünmez
- [ ] Console'da uygun loglar verilir

## 🚨 Dikkat Edilecekler

1. **Geliştirici modunu production'a commit etmeyin**
2. **Test kredilerini gerçek kredilerle karıştırmayın**
3. **Geliştirici modu aktifken gerçek kullanıcı testi yapmayın**
4. **Veri sıfırlama işlemini dikkatli kullanın**

## 📞 Destek

Geliştirici modu ile ilgili sorunlar için:
- Console loglarını kontrol edin
- `CreditService.getDebugInfo()` ile durumu inceleyin
- Gerekirse `resetForTesting()` ile sıfırlayın

---

**Not:** Bu özellik sadece geliştirme ve test amaçlıdır. Production ortamında kullanılamaz.

