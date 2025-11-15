# 🔑 OpenAI API Key Kurulum Talimatları

## Mevcut Durum
EAS secrets kontrol edildi - **OpenAI API key eklenmemiş**.

## Çözüm: API Key Ekleme

### Adım 1: OpenAI API Key Alın
1. [OpenAI Platform](https://platform.openai.com/) → API Keys
2. "Create new secret key" butonuna tıklayın
3. İsim verin (örn: "Car Identify Production")
4. Key'i kopyalayın (sadece bir kez gösterilir!)

### Adım 2: EAS Secret Olarak Ekleyin

```bash
# PowerShell / Terminal'de çalıştırın
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-proj-BURAYA-GERCEK-KEY-YAPISTIRIN"
```

**ÖNEMLİ:** 
- Key `sk-proj-` ile başlamalı
- Tırnak işaretlerini unutmayın
- `EXPO_PUBLIC_` prefix'i şart (Expo convention)

### Adım 3: Secret'ı Doğrulayın

```bash
# Deprecated ama çalışıyor
eas secret:list

# Veya yeni komut (interactive)
eas env:list
```

Çıktıda şunu görmelisiniz:
```
Secrets for this account and project:
  EXPO_PUBLIC_OPENAI_API_KEY
```

### Adım 4: Yeni Build Alın

Secret eklendikten sonra **mutlaka yeni build alın**:

```bash
# Production build (buildNumber otomatik artacak)
eas build --platform ios --profile production
```

**NOT:** Build sırasında secret otomatik olarak inject edilir. Eski build'ler secret içermez!

---

## Alternatif: Backend Proxy (Önerilen Production İçin)

OpenAI API key'i client app'te saklamak güvenlik riski. Daha güvenli alternatif:

### Backend Proxy Nedir?
- Node.js/Express backend servisi
- Client app → Backend → OpenAI API
- API key sadece backend'de saklanır

### Kurulum:
```bash
# Backend URL ve auth token ekleyin
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://your-backend.com"
eas secret:create --scope project --name EXPO_PUBLIC_API_TOKEN --value "your-secure-random-token"
```

Backend kodu hazırsa bu yöntemi kullanın.

---

## Test Etme

### 1. Build Tamamlandıktan Sonra
```bash
# TestFlight'a submit
eas submit --platform ios --latest
```

### 2. TestFlight'tan İndirip Test
- Internal Testing group'a ekleyin
- TestFlight'tan yükleyin
- Fotoğraf çekin ve analiz edin
- **Sonuç demo mode değil, gerçek analiz olmalı**

### 3. Hata Varsa Loglara Bakın
```bash
# iOS device logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Car Identify"'
```

`"OpenAI API key not configured"` hatası artık gelmemeli!

---

## Sık Sorulan Sorular

**S: API key ne kadar ücretli?**
Cevap: OpenAI GPT-4 Vision Mini kullanıyorsunuz:
- ~$0.01-0.02 per image analysis
- 100 analiz ≈ $1-2
- Billing'i [OpenAI Dashboard](https://platform.openai.com/usage)'dan takip edin

**S: API key güvenli mi?**
Cevap: Client app'te API key tamamen güvenli değil. Ters mühendislik ile erişilebilir. Production için backend proxy önerilir.

**S: Secret ekledim ama hala demo mode geliyor?**
Cevap: Secret eklendikten SONRA yeni build almalısınız. Eski build'ler secret içermez.

**S: Test ederken API key'i nasıl değiştirebilirim?**
Cevap:
```bash
# Mevcut secret'ı sil
eas secret:delete --name EXPO_PUBLIC_OPENAI_API_KEY

# Yeni secret ekle
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "yeni-key"

# Yeni build al
eas build --platform ios --profile production
```

---

## Özet Checklist

- [ ] OpenAI API key aldım
- [ ] EAS secret olarak ekledim
- [ ] `eas secret:list` ile doğruladım
- [ ] Yeni production build aldım
- [ ] TestFlight'tan test ettim
- [ ] Analiz çalışıyor (demo mode değil)

✅ Tamamlandığında demo mode sorunu tamamen çözülecek!

