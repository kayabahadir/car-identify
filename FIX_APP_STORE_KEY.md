# App Store Connect API Key Hatası Çözümü

## ❌ Aldığınız Hata:
```
Invalid ASC API JSON key - check your key ID, issuer ID and private key
```

---

## ✅ Çözüm A: Expo Dashboard'da Credential Temizle (EN KOLAY)

### Adım 1: Expo Credentials Sayfasına Gidin
```
https://expo.dev/accounts/kyabahadr/projects/car-identify/credentials
```

### Adım 2: iOS Credentials Bulun
- "iOS" sekmesine tıklayın
- "App Store Connect API Key" bölümünü bulun

### Adım 3: Eski Key'i Silin
- "⋮" (3 nokta) → "Remove"
- Onaylayın

### Adım 4: Yeniden Submit Deneyin
```bash
eas submit --platform ios
```

EAS otomatik olarak yeni API key oluşturacak veya sizden isteyecek.

---

## ✅ Çözüm B: Apple'da Yeni API Key Oluştur (MANUEL)

### Adım 1: App Store Connect'e Gidin
```
https://appstoreconnect.apple.com/access/api
```

### Adım 2: Yeni Key Oluştur
1. "Keys" sekmesi → "+" butonu
2. Key Name: "Expo Submit 2024"
3. Access: **Admin** veya **App Manager**
4. "Generate" tıklayın

### Adım 3: Key Bilgilerini Kaydedin
- **Key ID** (örnek: 94VFZ97H7P)
- **Issuer ID** (üstte, UUID formatında)
- **AuthKey_XXXXXX.p8** dosyasını indirin ⚠️ Sadece 1 kez!

### Adım 4: Expo'ya Ekleyin
```bash
eas credentials
```

- Platform: iOS
- Action: "Set up App Store Connect API Key"
- Key ID, Issuer ID ve .p8 dosyasını verin

---

## ✅ Çözüm C: Manuel Submit (HIZLI ÇÖZÜM)

EAS credential sorununu atlamak için:

### Adım 1: Build'i İndirin
```
https://expo.dev/accounts/kyabahadr/projects/car-identify/builds/9b9d09f8-20b3-4a7e-b57e-6ae915e098bc
```
"Download" → `.ipa` dosyasını indirin

### Adım 2: Apple Transporter Kullanın

**Windows için:**
- Apple Transporter yoktur, Mac gerekir

**Alternatif - Web Üzerinden:**
1. https://appstoreconnect.apple.com/
2. "My Apps" → Car Identify
3. "TestFlight" sekmesi
4. "+" → "Upload Build"
5. `.ipa` dosyasını sürükle-bırak

⚠️ **Web upload desteklenmiyor, Mac gerekli!**

---

## 🎯 En Pratik Çözüm: Yeni Production Build

Development build'i submit etmek yerine:

### Adım 1: Yeni Production Build Alın
```
Expo Web → Create Build
- Platform: iOS
- Profile: production
- Submit: YES (otomatik TestFlight)
```

### Adım 2: API Key Sorununu Build Sırasında Çözün
Build alırken API key sorunu çıkarsa:
- EAS sihirbazı size adım adım gösterecek
- Yeni key oluşturma talimatları verecek

### Adım 3: Build Otomatik TestFlight'a Gidecek
API key düzgün çalışırsa otomatik yüklenecek.

---

## 🔑 API Key Gereksinimleri

Apple'da oluşturduğunuz API key:

✅ **Admin** veya **App Manager** yetkili olmalı
✅ Süresi dolmamış olmalı
✅ Doğru Issuer ID ile eşleşmeli
✅ `.p8` dosyası kaybolmamış olmalı

---

## 🆘 Hala Çalışmazsa

### Tüm Credential'ları Sıfırlayın:

1. App Store Connect'te eski API key'leri silin
2. Expo dashboard'da tüm iOS credentials silin
3. Yeni production build alın
4. EAS sihirbazı size rehberlik edecek

---

## 💡 Önerim

**YENİ PRODUCTION BUILD ALIN:**

```
Expo Web → Builds → Create Build
- iOS
- production profile
- auto-submit: YES
```

Build sırasında API key sorunu çözülecek ve direkt TestFlight'a girecek.

Development build'i submit etmeye uğraşmayın! 🎯

