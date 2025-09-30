# TestFlight IAP Debug Guide

## 🎯 IAP Sorunu Çözümü

TestFlight'ta "Purchase successful!" görünüp Apple ödeme ekranı açılmaması sorunu için debug sistemi eklendi.

## 🔍 Debug Özellikleri

### 1. Debug Button
- **Konum**: Purchase screen sağ üst köşe (bug ikonu)
- **Fonksiyon**: IAP debug bilgilerini gösterir
- **Görünürlük**: Şu anda production'da da aktif

### 2. Otomatik Debug Alert'leri

Satın alma butonuna bastığınızda sırasıyla şu alert'leri göreceksiniz:

#### a) Environment Check
```
Platform: ios
Device: true
Simulator: false  
App Ownership: standalone
Expo Go: false
Module Loaded: true/false
```

#### b) IAP Availability Result
```
isAvailableAsync returned: true/false
```

#### c) Purchase Type Decision
```
Mock Purchase - Reason: [sebep]
VEYA
Real IAP - Starting real purchase for: [product_id]
```

## 🎯 TestFlight'ta Beklenen Değerler

### ✅ Doğru Değerler (Gerçek IAP için):
- `Device: true`
- `App Ownership: standalone` 
- `Module Loaded: true`
- `isAvailableAsync returned: true`

### ❌ Sorunlu Değerler:
- `Device: false` → Simulator'da çalışıyor
- `App Ownership: expo` → Expo Go'da çalışıyor
- `Module Loaded: false` → IAP modülü yüklenmemiş
- `isAvailableAsync returned: false` → IAP kullanılamıyor

## 🛠️ Sorun Çözme Adımları

### 1. Eğer `Module Loaded: false` görürseniz:
- Build sorunu var, modül yüklenememiş
- EAS build log'larını kontrol edin

### 2. Eğer `isAvailableAsync returned: false` görürseniz:
- **App Store Connect Kontrolü:**
  - Features → In-App Purchases
  - 3 ürün var mı? (`pack10`, `pack50`, `pack200`)
  - "Ready for Sale" durumunda mı?
  - Bundle ID doğru mu? (`com.caridentify.app`)

### 3. Eğer `App Ownership: expo` görürseniz:
- Expo Go kullanıyorsunuz, TestFlight build gerekli

### 4. Eğer `Device: false` görürseniz:
- Simulator'da test ediyorsunuz, gerçek cihaz gerekli

## 📱 Test Senaryoları

### Senaryo 1: Her şey Doğru (Gerçek IAP)
```
Environment Check: ✅ Tüm değerler doğru
IAP Result: ✅ isAvailableAsync returned: true
Purchase: ✅ Real IAP - Apple ödeme ekranı açılır
```

### Senaryo 2: App Store Connect Sorunu
```
Environment Check: ✅ Tüm değerler doğru
IAP Result: ❌ isAvailableAsync returned: false
Purchase: ❌ Mock mode çalışır
```

### Senaryo 3: Build Sorunu
```
Environment Check: ❌ Module Loaded: false
IAP Result: ❌ Mock mode
Purchase: ❌ Mock mode çalışır
```

## 🚀 Production'a Hazırlık

Test tamamlandığında debug sistem'i kapatmak için:

1. `src/services/debugService.js`:
```javascript
static isEnabled = false; // true → false
```

2. `src/screens/PurchaseScreen.js`:
```javascript
// Debug button'ı kaldır veya __DEV__ kontrolü ekle
```

## 📊 App Store Connect Kontrol Listesi

- [ ] **Bundle ID**: `com.caridentify.app` (tam eşleşme)
- [ ] **IAP Enabled**: In-App Purchase capability aktif
- [ ] **Product IDs**: 
  - `com.caridentify.app.credits.pack10`
  - `com.caridentify.app.credits.pack50` 
  - `com.caridentify.app.credits.pack200`
- [ ] **Product Status**: "Ready for Sale"
- [ ] **Product Type**: "Consumable"
- [ ] **Sandbox Test User**: TestFlight için gerekli

## 🔄 Debug Flow Özeti

1. **TestFlight'ta uygulamayı açın**
2. **Purchase screen'e gidin**
3. **Bug ikonuna tıklayın** → IAP debug info
4. **Satın alma butonuna basın** → Alert'leri takip edin
5. **Sonuçları analiz edin** → Yukarıdaki senaryolarla karşılaştırın

Bu debug sistemi ile IAP'ın neden çalışmadığını kesin olarak tespit edebilirsiniz.
