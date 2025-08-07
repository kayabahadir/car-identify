# 📸 Screenshot Checklist - Car Identify

## 🚀 Başlamadan Önce

### Gerekli Hazırlıklar
- [ ] **Yüksek çözünürlüklü cihaz** (iPhone 14 Pro Max ideal)
- [ ] **Demo fotoğraflar** hazır (BMW, Mercedes, Tesla, VW, Toyota)
- [ ] **API anahtarı** lokal olarak ayarlanmış
- [ ] **Pil seviyesi** %100
- [ ] **Wifi bağlantısı** stable
- [ ] **Debug mode** kapalı

### App Durumu
- [ ] **Expo app** çalışır durumda
- [ ] **Demo data** yüklenmiş (`demo-setup.js` kullan)
- [ ] **Dil** Türkçe olarak ayarlanmış
- [ ] **Permissions** (kamera, galeri) aktif

---

## 📱 Screenshot 1: Ana Ekran (Hero)

### Setup
- [ ] Demo data yükle: `setupDemoData()`
- [ ] Credits: **5** olarak ayarla
- [ ] Dil: **Türkçe** 
- [ ] Temiz ana ekran (navigation'da Home seçili)

### Çekim
- [ ] **HomeScreen** açık
- [ ] **Status bar** temiz (pil dolu, saat güzel)
- [ ] **"Kamera ile Çek"** butonu belirgin
- [ ] **"Galeriden Seç"** butonu görünür
- [ ] **Mevcut kredi: 5** yazısı görünür
- [ ] **App logo** net görünür

### Text Overlay (Sonradan Ekle)
```
Ana Metin: "AI ile Araç Tanımlama"
Alt Metin: "2 saniyede sonuç!"
Pozisyon: Alt kısım, gradient overlay
```

### Dosya Adı
- `screenshot-1-home-6.7inch.png` (1290x2796)
- `screenshot-1-home-6.5inch.png` (1242x2688)
- `screenshot-1-home-5.5inch.png` (1242x2208)

---

## 📸 Screenshot 2: Kamera Ekranı

### Setup
- [ ] **Kamera permissions** aktif
- [ ] **BMW fotoğrafı** (beyaz BMW 3 Series) hazır
- [ ] **Lighting** optimal

### Çekim
- [ ] **Kamera açık**
- [ ] **BMW araç** çerçeve içinde (kısmen görünür)
- [ ] **Focus indicator** aktif
- [ ] **Shutter button** belirgin
- [ ] **"Aracı çerçeve içine alın"** text visible
- [ ] **Back button** görünür

### Text Overlay
```
Ana Metin: "Tek Dokunuşla Tanımlama"
Alt Metin: "Kameraya gösterin, biz halledelim"
```

### Dosya Adı
- `screenshot-2-camera-6.7inch.png`
- `screenshot-2-camera-6.5inch.png`
- `screenshot-2-camera-5.5inch.png`

---

## 📸 Screenshot 3: Sonuç Ekranı (BMW)

### Setup
- [ ] **BMW demo data** yükle
- [ ] **ResultScreen** aç
- [ ] **Success state** (loading değil)
- [ ] **Confidence: %95** göster

### Çekim Verileri
```json
{
  "brand": "BMW",
  "model": "3 Series", 
  "variant": "330i M Sport",
  "year": 2023,
  "engine": "2.0L TwinPower Turbo",
  "power": "255 HP",
  "confidence": 95,
  "marketInfo": "Luxury Sedan - Global Market"
}
```

### Çekim
- [ ] **BMW fotoğrafı** üstte görünür
- [ ] **Marka: BMW** net yazılmış
- [ ] **Model: 3 Series** görünür
- [ ] **Yıl: 2023** belirtilmiş
- [ ] **Motor özellikleri** listelenmiş
- [ ] **Güven oranı: %95** vurgulanmış
- [ ] **Pazar bilgisi** görünür
- [ ] **"Geçmişe Kaydet"** button

### Text Overlay
```
Ana Metin: "Detaylı Araç Bilgileri"
Alt Metin: "Marka, model, motor ve teknik özellikler"
```

### Dosya Adı
- `screenshot-3-result-6.7inch.png`
- `screenshot-3-result-6.5inch.png`
- `screenshot-3-result-5.5inch.png`

---

## 📸 Screenshot 4: Geçmiş Ekranı

### Setup
- [ ] **History data** yükle (5 farklı araç)
- [ ] **HistoryScreen** aç
- [ ] **Liste dolu** görünsün

### Çekim
- [ ] **5 farklı araç** analizi listede
- [ ] **BMW 3 Series - %95** (en üstte)
- [ ] **Mercedes C-Class - %92**
- [ ] **Tesla Model 3 - %97**
- [ ] **VW Golf GTI - %89**
- [ ] **Toyota Corolla - %94**
- [ ] **Tarihler** görünür (15 Aralık, 14 Aralık...)
- [ ] **Thumbnail images** (simulated)
- [ ] **"Tekrar Görüntüle"** buttons

### Text Overlay
```
Ana Metin: "Analiz Geçmişiniz"
Alt Metin: "Tüm aramalarınız kaydedilir"
```

### Dosya Adı
- `screenshot-4-history-6.7inch.png`
- `screenshot-4-history-6.5inch.png`
- `screenshot-4-history-5.5inch.png`

---

## 📸 Screenshot 5: Ayarlar & Krediler

### Setup
- [ ] **SettingsScreen** aç
- [ ] **Current credits: 12** ayarla
- [ ] **Total analyses: 47** göster
- [ ] **Kredi paketleri** görünür

### Çekim
- [ ] **Mevcut kredi: 12** belirgin
- [ ] **Toplam analiz: 47** görünür
- [ ] **Dil: Türkçe** seçili
- [ ] **4 kredi paketi** listelenmiş:
  - [ ] Starter Pack: 10 kredi - $2.99
  - [ ] **Standard Pack: 25 kredi - $4.99** (POPULAR)
  - [ ] Premium Pack: 50 kredi - $7.99
  - [ ] Pro Pack: 100 kredi - $12.99
- [ ] **"Kredi Satın Al"** button görünür
- [ ] **Gizlilik Politikası** link
- [ ] **Destek** seçeneği

### Text Overlay
```
Ana Metin: "Esnek Kredi Sistemi"
Alt Metin: "İhtiyacınız kadar analiz kredisi"
```

### Dosya Adı
- `screenshot-5-settings-6.7inch.png`
- `screenshot-5-settings-6.5inch.png` 
- `screenshot-5-settings-5.5inch.png`

---

## 🎨 Post-Processing (Overlay Ekleme)

### Her Screenshot İçin
- [ ] **Gradient overlay** alt kısımda
- [ ] **Text overlay** ekle (Helvetica Neue Bold)
- [ ] **App icon** sol üst köşe (küçük)
- [ ] **Safe area** respects
- [ ] **Compression** optimize et
- [ ] **3 farklı boyut** export et

### Design Consistency
- [ ] **Color scheme** tutarlı (#4f46e5 primary)
- [ ] **Typography** professional
- [ ] **Spacing** uniform
- [ ] **Brand elements** consistent

---

## ✅ Final Check

### Technical
- [ ] **Tüm boyutlar** doğru (1290x2796, 1242x2688, 1242x2208)
- [ ] **Portrait mode** 
- [ ] **PNG format** (high quality)
- [ ] **File size** reasonable (<5MB each)
- [ ] **File naming** convention tutarlı

### Content
- [ ] **5 screenshot** tamamlandı
- [ ] **Text overlays** eklendi
- [ ] **Turkish language** kullanılmış
- [ ] **Realistic data** gösterilmiş
- [ ] **No debug info** görünür
- [ ] **Professional look** achieved

### App Store Ready
- [ ] **Guidelines** compliance
- [ ] **No competitor logos** 
- [ ] **Clean UI** showcased
- [ ] **Key features** highlighted
- [ ] **User journey** clear

---

## 🚀 Upload Hazırlığı

### Folder Structure
```
screenshots/
  ├── 6.7-inch/
  │   ├── screenshot-1-home.png
  │   ├── screenshot-2-camera.png
  │   ├── screenshot-3-result.png
  │   ├── screenshot-4-history.png
  │   └── screenshot-5-settings.png
  ├── 6.5-inch/
  │   └── [same files]
  └── 5.5-inch/
      └── [same files]
```

### App Store Connect Upload
- [ ] **Primary category**: Utilities
- [ ] **Age rating**: 4+
- [ ] **Screenshots** uploaded
- [ ] **App description** ready
- [ ] **Keywords** optimized
- [ ] **Preview** video (optional)

---

## 📝 Demo Commands

### Setup Demo Data
```bash
# Expo console'da çalıştır
import { setupDemoData } from './demo-setup.js';
setupDemoData();
```

### Clear Demo Data  
```bash
import { clearDemoData } from './demo-setup.js';
clearDemoData();
```

### Reset App State
```bash
# Expo'yu yeniden başlat
npm start -- --clear
```

---

## 🎯 Success Metrics

Başarılı screenshots şunları içermelidir:
- ✅ **Professional görünüm**
- ✅ **Clear value proposition**
- ✅ **Easy-to-understand UI**
- ✅ **Compelling features**
- ✅ **Turkish localization**
- ✅ **Realistic usage scenario** 