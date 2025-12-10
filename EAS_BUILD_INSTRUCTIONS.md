# Windows'ta EAS Build Nasıl Yapılır

## Sorun
Windows'ta `EPERM` dosya izinleri hatası alıyorsunuz.

---

## ✅ Çözüm 1: Yönetici Yetkisiyle Çalıştırın

### Adım 1: VS Code'u Yönetici Olarak Aç
1. VS Code'u kapatın
2. VS Code ikonuna sağ tıklayın
3. "Yönetici olarak çalıştır" seçin

### Adım 2: Terminal'de Build Başlatın
```bash
eas build --profile development --platform ios
```

---

## ✅ Çözüm 2: Web Üzerinden Build

### Adım 1: EAS Web Sitesine Gidin
https://expo.dev/

### Adım 2: Projenizi Bulun
- Account: `kyabahadr`
- Project: `car-identify`

### Adım 3: "Builds" Sekmesine Gidin
Sol menüden "Builds" seçin

### Adım 4: "Create Build" Butonuna Tıklayın
- Platform: **iOS**
- Profile: **development**
- "Create Build" butonuna tıklayın

### Adım 5: Build Tamamlanmasını Bekleyin
- Yaklaşık 10-15 dakika sürer
- Build tamamlandığında QR kod göreceksiniz

---

## ✅ Çözüm 3: Git Bash Kullanın

### Adım 1: Git Bash'i Açın
Windows'ta Git Bash terminali açın

### Adım 2: Proje Dizinine Gidin
```bash
cd /c/dev/car-identify
```

### Adım 3: Build Başlatın
```bash
eas build --profile development --platform ios
```

---

## 📱 Build Tamamlandıktan Sonra

### iPhone'a Nasıl Yüklenir?

1. **EAS Build tamamlanır** (10-15 dakika)
2. **QR kodu göreceksiniz** terminal'de veya web'de
3. **iPhone'dan QR kodu okutun** (Camera uygulaması ile)
4. **"Aç" / "Open" butonuna tıklayın**
5. **Uygulama indirilip yüklenecek**

### Alternatif: TestFlight

EAS size `.ipa` dosyası verir, bunu TestFlight ile de yükleyebilirsiniz.

---

## 🎯 RevenueCat Test

Build tamamlanıp iPhone'a yüklendikten sonra:

1. ✅ Uygulamayı açın
2. ✅ "Open Credits Store" butonuna tıklayın
3. ✅ 3 paket görünecek (pack10, pack50, pack200)
4. ✅ Fiyatlar App Store'dan gelecek
5. ✅ Sandbox hesabıyla test satın alma yapın

---

## 🔍 Build Durumunu İzleyin

### Terminal'de:
```bash
eas build:list
```

### Web'de:
https://expo.dev/accounts/kyabahadr/projects/car-identify/builds

---

## ⚠️ Önemli Notlar

- **Sandbox hesap:** Test için Apple Sandbox test hesabı kullanın
- **Sertifika:** İlk build'de Apple sertifikası oluşturulacak
- **Süre:** İlk build 15-20 dakika sürebilir
- **Internet:** Build bulutta yapılır, hızlı internet şart

---

## 🆘 Sorun Yaşarsanız

1. **"No credentials found"** → EAS otomatik oluşturacak, "Yes" deyin
2. **"Build failed"** → Hata mesajını okuyun, genelde sertifika sorunudur
3. **"QR kod çalışmıyor"** → Web'den direkt `.ipa` indirin ve TestFlight kullanın

---

*Bu dosya Windows'ta EAS Build yapamadığınızda size yardımcı olmak için oluşturuldu.*

