# 🔧 Vercel Proxy Yapılandırması - KRİTİK!

## ✅ Vercel Proxy Bulundu
`.env` dosyasında Vercel proxy URL'i var:
```
EXPO_PUBLIC_API_BASE_URL=https://car-identify-proxy.vercel.app
```

**ANCAK:** Bu sadece local development için çalışıyor. **Production build'de çalışmıyor!**

---

## 🚨 Problem: EAS Build .env Dosyasını Kullanmaz

### Neden Demo Mode Geliyor?

1. **Local development (.env):**
   ```
   EXPO_PUBLIC_API_BASE_URL=https://car-identify-proxy.vercel.app
   ✅ Çalışıyor - local'de API key'ler Vercel'de
   ```

2. **Production build (EAS):**
   ```
   EXPO_PUBLIC_API_BASE_URL=undefined (EAS secrets boş!)
   ❌ Çalışmıyor - kod direkt OpenAI'ye gitmeye çalışıyor
   ❌ OPENAI_API_KEY yok - demo mode'a düşüyor
   ```

### Kod Mantığı:
```javascript
// src/services/openaiService.js
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
const USE_PROXY = !!API_BASE;  // Production'da false çünkü API_BASE undefined!

if (!USE_PROXY && !OPENAI_API_KEY) {
  throw new Error('OpenAI API key not configured');
  // Bu hata production'da demo mode'a düşürüyor
}
```

---

## ✅ ÇÖZÜM: EAS Secrets Ekle

### Adım 1: Vercel Proxy URL'ini EAS Secret Yap

```bash
# Vercel proxy URL'ini ekle
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://car-identify-proxy.vercel.app"
```

### Adım 2: (Opsiyonel) Auth Token Ekle

Eğer Vercel proxy'nizde authentication varsa:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_TOKEN --value "YOUR-SECURE-TOKEN"
```

**NOT:** `.env` dosyasında `EXPO_PUBLIC_API_TOKEN` boş. Vercel proxy authentication kullanıyor mu kontrol edin.

### Adım 3: Doğrula

```bash
eas secret:list
```

Çıktı şöyle olmalı:
```
Secrets for this account and project:
  EXPO_PUBLIC_API_BASE_URL
  EXPO_PUBLIC_API_TOKEN (eğer kullanılıyorsa)
```

### Adım 4: Yeni Build Al

```bash
eas build --platform ios --profile production
```

Build sırasında EAS secrets otomatik inject edilir.

---

## 🔍 Vercel Proxy Kontrolü

### Proxy Çalışıyor mu?

Test edin:
```bash
curl -X POST https://car-identify-proxy.vercel.app/api/identify \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Beklenen:** Hata mesajı veya "missing image" gibi bir response (endpoint çalışıyor demektir)
**Kötü:** Connection refused, 404 (proxy down veya URL yanlış)

### Vercel Dashboard Kontrol

1. [Vercel Dashboard](https://vercel.com/dashboard)
2. `car-identify-proxy` projesini bulun
3. **Environment Variables** kontrol edin:
   - `OPENAI_API_KEY` var mı?
   - Production environment'a mı set edilmiş?

4. **Deployments** kontrol edin:
   - Son deployment başarılı mı?
   - Production'da mı çalışıyor?

---

## 🎯 Bu Çözümle Ne Değişecek?

### Şu Anda (Production Build)
```
User → Mobile App
         ↓
    EXPO_PUBLIC_API_BASE_URL = undefined
         ↓
    USE_PROXY = false
         ↓
    Try OpenAI direct
         ↓
    OPENAI_API_KEY = undefined
         ↓
    ❌ Demo Mode!
```

### EAS Secret Eklendikten Sonra
```
User → Mobile App
         ↓
    EXPO_PUBLIC_API_BASE_URL = "https://car-identify-proxy.vercel.app"
         ↓
    USE_PROXY = true
         ↓
    Call Vercel Proxy
         ↓
    Vercel → OpenAI (API key Vercel'de gömülü)
         ↓
    ✅ Gerçek Analiz!
```

---

## 📋 Komple Checklist

### Vercel Proxy Ayarları
- [ ] Vercel dashboard → `car-identify-proxy` → Environment Variables
- [ ] `OPENAI_API_KEY` Production'da set edilmiş
- [ ] Latest deployment başarılı
- [ ] Endpoint test edildi (curl komutu)

### EAS Secrets
- [ ] `EXPO_PUBLIC_API_BASE_URL` eklendi
- [ ] `EXPO_PUBLIC_API_TOKEN` eklendi (gerekirse)
- [ ] `eas secret:list` ile doğrulandı

### Build & Deploy
- [ ] `app.json` version 1.0.12 (✅ zaten yapıldı)
- [ ] `eas build --platform ios --profile production`
- [ ] Build tamamlandı (~20 dakika)
- [ ] `eas submit --platform ios --latest`
- [ ] TestFlight'ta test edildi

### Test Sonuçları
- [ ] Analiz çalışıyor (demo mode değil)
- [ ] Gerçek araç bilgisi geliyor
- [ ] IAP dialog kapatınca hata veriyor
- [ ] IAP tamamlanınca para çekiliyor

---

## 🆘 Sorun Giderme

### "API key not configured" Hatası
**Sebep:** EAS secrets eklenmemiş
**Çözüm:** Yukarıdaki Adım 1-3'ü tekrar yapın

### "Proxy response not JSON" Hatası
**Sebep:** Vercel proxy hata döndürüyor
**Çözüm:** 
1. Vercel logs kontrol edin
2. Vercel'de `OPENAI_API_KEY` doğru mu?
3. OpenAI API quota dolmuş mu?

### "Network connection issue" Hatası
**Sebep:** Vercel proxy'ye erişilemiyor
**Çözüm:**
1. Vercel deployment çalışıyor mu?
2. URL doğru mu? (`car-identify-proxy.vercel.app`)
3. İnternet bağlantısı var mı?

---

## ✅ Özet

**Problem:** `.env` dosyası local'de çalışıyor ama production build'de kullanılmıyor.

**Çözüm:** Vercel proxy URL'ini EAS secret olarak ekleyin.

**Komut:**
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://car-identify-proxy.vercel.app"
```

**Sonuç:** Production'da demo mode sorun çözülecek, gerçek analiz çalışacak! ✅

---

**Not:** Bu çözüm IAP para çekilmeme sorununu **etkilemez**. IAP sorunu için yapılan kod düzeltmeleri ayrı.

