# 🚀 Production Deployment Talimatları

## ❌ Tespit Edilen Kritik Sorunlar

### 1. ✅ IAP Satın Alma Dialog Kapatma Sorunu - **DÜZELTİLDİ**
**Sorun:** Satın alma ekranını çarpı ile kapatınca da "satın alma başarılı" mesajı geliyor ve kredi artıyor.

**Neden:** `src/services/iapServiceClean.js` dosyasında mantık hatası vardı. Apple payment dialog'u kapatıldığında `result` undefined veya boş dönüyor, ancak kod bunu "başarılı satın alma" olarak yorumlayıp kredi ekliyordu.

**Çözüm:** ✅ Düzeltildi. Artık cancel durumunda hata fırlatılıyor ve kredi eklenmiyor.

---

### 2. ⚠️ Demo Mode Sorunu - **API KEY EKLENMELİ**
**Sorun:** Analiz sonuçları production'da demo modda geliyor (BMW 3 Series mock data).

**Neden:** 
- ❌ OpenAI API key EAS secret olarak eklenmemiş (kontrol edildi, liste boş!)
- `ResultScreen.js`'de hata oluştuğunda otomatik olarak demo mode'a düşüyordu

**Çözüm:** 
- ✅ Production build'de artık demo mode'a düşmüyor (kod düzeltildi)
- ⚠️ **API key EAS secret olarak eklenmelidir** (detaylar: `SETUP_API_KEY.md`)

**API Key Ekleme:**
```bash
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-proj-YOUR-KEY"
```
Sonra yeni build alın!

---

### 3. ⚠️ IAP Para Çekilmeme Sorunu - **AYAR GEREKİYOR**
**Sorun:** Satın alma "Purchase Successful!" diyor, kredi artıyor ama banka hesabından para çekilmiyor.

**Neden:** App Store Connect'te IAP ürünleri henüz "Ready to Submit" veya "Approved" durumunda değil, ya da uygulama Sandbox environment kullanıyor.

**Çözüm Adımları:**

#### App Store Connect Kontrolleri:
1. [App Store Connect](https://appstoreconnect.apple.com/) → Apps → Car Identify → In-App Purchases
2. Her üç IAP ürününü kontrol edin:
   - `com.caridentify.app.credits.consumable.pack10`
   - `com.caridentify.app.credits.consumable.pack50`
   - `com.caridentify.app.credits.consumable.pack200`
3. Durum **"Ready to Submit"** veya **"Approved"** olmalı
4. Eğer "Missing Metadata" durumundaysa:
   - Her ürün için screenshot ekleyin
   - Descriptions'ları tamamlayın
   - "Submit for Review" butonuna basın

#### Sandbox Test Hesabı Kontrolü:
- Eğer cihazda Sandbox test hesabıyla login olduysa, para çekilmez (bu normal)
- Production'da gerçek kullanıcılar için düzgün çalışması için:
  1. Settings → App Store → Sign Out (Sandbox hesabı çıkış)
  2. Normal Apple ID ile login olun
  3. App'i test edin

---

## 🔐 OpenAI API Key Yapılandırması

### ✅ SİZİN DURUMUNUZ: Vercel Proxy Var! 

**Tespit:** `.env` dosyasında Vercel proxy tanımlı:
```
EXPO_PUBLIC_API_BASE_URL=https://car-identify-proxy.vercel.app
```

**Problem:** Bu sadece local'de çalışıyor. Production build (EAS) `.env` dosyasını kullanmaz!

**ÇÖZÜM - Vercel Proxy'yi EAS Secret Yap:**

```bash
# 1. Vercel proxy URL'ini ekle
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://car-identify-proxy.vercel.app"

# 2. (Opsiyonel) Auth token ekle - eğer Vercel'de kullanılıyorsa
eas secret:create --scope project --name EXPO_PUBLIC_API_TOKEN --value "YOUR-TOKEN-IF-NEEDED"
```

**Doğrula:**
```bash
eas secret:list
# Çıktıda EXPO_PUBLIC_API_BASE_URL görünmeli
```

**Detaylar:** `VERCEL_PROXY_FIX.md` dosyasına bakın.

---

### Alternatif: Direkt OpenAI API (Önerilmez)

Eğer Vercel proxy kullanmak istemezseniz:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-proj-YOUR-KEY"
```

**Not:** Bu güvenlik riski taşır. Vercel proxy önerilir.

---

## 📦 Yeni Build Oluşturma

### 1. Version Güncellemesi
```json
// app.json
{
  "expo": {
    "version": "1.0.12",  // Artırın
    "ios": {
      "buildNumber": "21"  // Otomatik artacak
    }
  }
}
```

### 2. Production Build
```bash
# iOS Production build
eas build --platform ios --profile production

# Build tamamlandığında otomatik olarak App Store Connect'e submit edin
eas submit --platform ios --latest
```

### 3. TestFlight'ta Test Etme
1. Build yüklendikten sonra App Store Connect → TestFlight
2. Internal veya External Testing group'a ekleyin
3. Gerçek cihazda test edin:
   - ✅ Analiz çalışıyor mu? (demo mode değil)
   - ✅ Satın alma çalışıyor mu?
   - ✅ Para çekiliyor mu? (gerçek hesap ile)

---

## 🔍 Debugging Production Issues

### Console Logs Kontrol Etme
Production build'de console.log'lar çalışmaz ama hataları görmek için:

```bash
# iOS device logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Car Identify"'

# Veya Xcode'da: Window → Devices and Simulators → Select Device → View Device Logs
```

### IAP Debug Modu (Geliştirme için)
```javascript
// src/config/appStoreConfig.js
DEBUG: {
  LOG_RECEIPT_VALIDATION: true,  // Geçici olarak true yapın
  LOG_PURCHASE_FLOW: true,       // Geçici olarak true yapın
  FORCE_MOCK_PURCHASE: false     // Production'da kesinlikle false!
}
```

---

## ✅ Deployment Checklist

### Kod Değişiklikleri
- [x] IAP cancel handling düzeltildi
- [x] Demo mode production'da devre dışı
- [x] appStoreConfig.js FORCE_MOCK_PURCHASE: false
- [ ] OpenAI API key EAS secret olarak eklendi
- [ ] app.json version ve buildNumber güncelllendi

### App Store Connect
- [ ] IAP ürünleri "Ready to Submit" veya "Approved"
- [ ] IAP screenshots eklendi
- [ ] IAP descriptions tamamlandı
- [ ] App binary yüklendi
- [ ] TestFlight'ta test edildi

### Test Edilen Özellikler
- [ ] Analiz çalışıyor (demo mode değil)
- [ ] Satın alma çalışıyor
- [ ] Satın alma cancel edince hata veriyor
- [ ] Gerçek hesapla para çekiliyor
- [ ] Krediler doğru şekilde artıyor

---

## 🆘 Sorun Yaşarsanız

### OpenAI API Key Hatası
```
Error: OpenAI API key not configured
```
**Çözüm:** EAS secret'ı ekleyin (yukarıdaki komut)

### IAP "Unknown productId" Hatası
```
Error: Unknown productId: com.caridentify.app.credits...
```
**Çözüm:** App Store Connect'te IAP ürünlerini "Ready to Submit" yapın

### Receipt Validation Hatası
```
Error: Receipt validation failed
```
**Çözüm:** Geçici olarak `appStoreConfig.js` → `ENABLE_FALLBACK_MODE: true` yapın

---

## 📞 İletişim

Sorularınız için:
- GitHub Issues: [Project Repository](#)
- Email: support@caridentify.com

---

**Son Güncelleme:** 15 Kasım 2025
**Düzeltilen Sorunlar:** IAP cancel handling, Demo mode production fix
**Bekleyen:** OpenAI API key configuration, IAP approval

