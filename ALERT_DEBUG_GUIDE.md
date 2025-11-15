# 🔍 Alert Debug Rehberi - Version 1.0.15

## ✅ Debug Alert'ları Eklendi!

Windows kullandığınız için Xcode console erişiminiz yok. Bu yüzden **Alert popup'ları** ile debug bilgilerini gösteriyorum.

---

## 🎯 Debug Butonları

### 1. Ana Sayfada "🔍 DEBUG" Butonu (Kırmızı)
- **Konum:** Sağ üstte, TR/EN butonunun yanında
- **Ne Gösterir:**
  ```
  🔍 Config Debug
  
  Environment Variables:
  
  API_BASE:
  https://car-identify-proxy.vercel.app
  
  USE_PROXY: true
  HAS_OPENAI_KEY: false
  
  URL: https://car-identify-proxy.vercel.app/api/identify
  
  Mode: ✅ Proxy Mode
  ```

### 2. Fotoğraf Gönderince (3 Alert)

#### Alert 1: Analiz Başlangıcı
```
🔍 Analysis Debug

Starting Analysis:

API_BASE: https://car-identify-proxy.vercel.app
USE_PROXY: true
URL: https://car-identify-proxy.vercel.app/api/identify
Mode: Proxy
```

#### Alert 2A: Hata Varsa
```
🔍 API Error Debug

Response Error:

Status: 500
URL: https://car-identify-proxy.vercel.app/api/identify

Response:
{"error":"Internal server error..."}
```

#### Alert 2B: Başarılıysa
```
🔍 Response Debug

✅ Success!

Status: 200
Preview: {"choices":[{"message":{"content":"...
```

---

## 📊 Olası Senaryolar

### Senaryo 1: Secret İnject Edilmemiş ❌
```
🔍 Config Debug

API_BASE: undefined
USE_PROXY: false
Mode: ❌ Direct Mode

→ Demo mode'a düşer
```

**Çözüm:** Yeni build alın

---

### Senaryo 2: Secret İnject Edilmiş ama Vercel Hata Veriyor ❌
```
🔍 Config Debug

API_BASE: https://car-identify-proxy.vercel.app
USE_PROXY: true
Mode: ✅ Proxy Mode

→ Fotoğraf gönderince:

🔍 API Error Debug
Status: 500
Response: {"error":"..."}
```

**Çözüm:** 
- Vercel dashboard kontrol edin
- OpenAI API key Vercel'de set edilmiş mi?

---

### Senaryo 3: Her Şey Çalışıyor ✅
```
🔍 Config Debug

API_BASE: https://car-identify-proxy.vercel.app
USE_PROXY: true
Mode: ✅ Proxy Mode

→ Fotoğraf gönderince:

🔍 Response Debug
✅ Success!
Status: 200

→ Gerçek analiz geliyor!
```

---

## 🧪 Test Adımları

### 1. App'i Aç
- TestFlight → Version **1.0.15**

### 2. DEBUG Butonuna Bas
- Sağ üstte kırmızı "🔍 DEBUG"
- Alert'ı **screenshot** alın

### 3. Fotoğraf Gönder
- Araç fotoğrafı çek/seç
- **3 alert** açılacak:
  1. Analysis Debug
  2. Response Debug veya Error Debug
  3. (Error varsa) ResultScreen'den hata mesajı

### 4. Screenshot'ları Paylaş
- Tüm alert'ların screenshot'ını alın
- Bana gönderin
- Kök nedeni birlikte bulalım!

---

## 🔍 Hata Durumları

| Status | Anlam | Çözüm |
|--------|-------|-------|
| `undefined` | Secret inject edilmemiş | Yeni build |
| `401` | Unauthorized | Vercel auth token gerekli |
| `403` | Forbidden | Vercel API key yanlış |
| `500` | Server error | Vercel'de OpenAI key eksik |
| `429` | Rate limit | Biraz bekle |
| `200` | ✅ Success | Çalışıyor! |

---

## 📦 Build Alın

```bash
# Version 1.0.15 (Alert Debug)
eas build --platform ios --profile production
```

---

## ✅ Checklist

- [ ] Build aldım (1.0.15)
- [ ] TestFlight'tan yükledim
- [ ] DEBUG butonuna bastım → Screenshot aldım
- [ ] Fotoğraf gönderdim → Alert screenshot'ları aldım
- [ ] Screenshot'ları paylaştım

---

## 🎯 Beklenen Sonuç

**Eğer her şey doğruysa:**
```
DEBUG butonu:
✅ API_BASE = Vercel URL
✅ USE_PROXY = true
✅ Mode = Proxy Mode

Fotoğraf gönderince:
✅ Status = 200
✅ Gerçek analiz!
```

**Eğer sorun varsa:**
- Screenshot'ları paylaşın
- API_BASE değerini gösterin
- Response status'u gösterin
- Birlikte çözelim!

---

**Version:** 1.0.15 (Alert Debug)
**Platform:** iOS (Windows - Xcode yok)
**Debug Method:** Alert Popup'lar
**Next:** Screenshot'ları paylaş, analiz yapalım! 📸

