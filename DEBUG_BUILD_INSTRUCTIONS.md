# 🔍 Debug Build - Demo Mode Sorunu

## 🚨 Durum

- ✅ EAS secret eklendi (EXPO_PUBLIC_API_BASE_URL)
- ✅ Secret'tan SONRA build alındı
- ❌ Yine demo mode geliyor

## 🔧 Debug Logları Eklendi

Version **1.0.14** için detaylı debug logları ekledim:

### App Açılışta (Otomatik)
```
🔧 OpenAI Service Configuration:
  API_BASE: https://car-identify-proxy.vercel.app (veya undefined)
  USE_PROXY: true/false
  OPENAI_API_URL: ...
  HAS_OPENAI_KEY: true/false
```

### Analiz Sırasında
```
🚀 identifyVehicle called with language: tr
🔍 Current config - USE_PROXY: true/false, API_BASE: ...
🔍 Will use URL: ...
✅ Starting analysis with proxy: true/false
📡 Sending request to: ...
📡 Using headers: Proxy mode / Direct mode
📥 Response status: 200
📥 Response preview: {...}
```

---

## 📦 Yeni Build Al

```bash
# Version 1.0.14 (debug logları ile)
eas build --platform ios --profile production
```

---

## 🧪 Test Senaryosu

### 1. App'i Aç
- TestFlight → Version **1.0.14**
- Hemen **Console** loglarına bak

**Beklenen:**
```
🔧 OpenAI Service Configuration:
  API_BASE: https://car-identify-proxy.vercel.app
  USE_PROXY: true
```

**Eğer böyle değilse:**
- Secret inject edilmemiş
- Build yeniden alınmalı

### 2. Fotoğraf Gönder
- Analiz yap
- **Console** loglarına bak

**Beklenen:**
```
🚀 identifyVehicle called...
🔍 Current config - USE_PROXY: true
📡 Sending request to: https://car-identify-proxy.vercel.app/api/identify
📥 Response status: 200
```

**Eğer hata varsa:**
- Response status'a bak (401, 403, 500, etc.)
- Response preview'a bak (hata mesajı)
- Vercel proxy sorunu olabilir

---

## 🔍 Olası Sorunlar ve Çözümler

### Sorun 1: API_BASE = undefined
**Neden:** Secret inject edilmemiş
**Çözüm:** Yeni build al

### Sorun 2: Response status 401/403
**Neden:** Vercel proxy authentication problemi
**Çözüm:** 
- Vercel dashboard kontrol et
- CLIENT_TOKEN gerekiyor mu?
- `eas secret:create --name EXPO_PUBLIC_API_TOKEN --value "..."`

### Sorun 3: Response status 500
**Neden:** Vercel'de OpenAI API key eksik/yanlış
**Çözüm:**
- Vercel dashboard → Environment Variables
- `OPENAI_API_KEY` kontrol et

### Sorun 4: Response status 429
**Neden:** OpenAI rate limit
**Çözüm:** Biraz bekle, tekrar dene

### Sorun 5: Network timeout
**Neden:** Vercel proxy down
**Çözüm:** Vercel deployments kontrol et

---

## 📊 Log Analiz Tablosu

| Log | Normal | Sorun |
|-----|--------|-------|
| `API_BASE` | Vercel URL | `undefined` |
| `USE_PROXY` | `true` | `false` |
| `Response status` | `200` | `401`, `403`, `500` |
| `Response preview` | `{"choices":[...` | `{"error":"..."` |

---

## ✅ Build Alındıktan Sonra

1. **TestFlight'ta 1.0.14 bekle** (~10-15 dakika)
2. **Yükle ve aç**
3. **Console loglarını kontrol et** (ilk 4 satır)
4. **Fotoğraf gönder**
5. **Analiz loglarını kontrol et**
6. **Sonuçları bana göster:**
   - API_BASE değeri nedir?
   - Response status nedir?
   - Hata mesajı var mı?

---

## 🎯 Beklenen Sonuç

Eğer **her şey doğruysa:**
```
✅ API_BASE = https://car-identify-proxy.vercel.app
✅ USE_PROXY = true
✅ Response status = 200
✅ Gerçek analiz geliyor!
```

Eğer **hala demo mode geliyorsa:**
- Logları paylaş
- Vercel proxy'yi kontrol edelim

---

**Version:** 1.0.14 (Debug Build)
**Purpose:** Demo mode sorununu tespit etmek
**Next Steps:** Logları analiz et, kök nedeni bul

