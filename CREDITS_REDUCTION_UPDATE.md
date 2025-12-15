# 💰 Kredi Sayıları Güncellendi

## 📊 Değişiklik Özeti

Tüm paketlerdeki kredi sayıları **yarıya indirildi**. Fiyatlar aynı kaldı.

---

## 🔄 Öncesi → Sonrası

| Paket | Fiyat | Eski Kredi | Yeni Kredi | Birim Fiyat (Eski) | Birim Fiyat (Yeni) |
|-------|-------|------------|------------|-------------------|-------------------|
| pack10 | $1.99 | 10 | **5** | $0.199 | **$0.398** |
| pack50 | $4.99 | 50 | **25** | $0.099 | **$0.199** |
| pack200 | $9.99 | 200 | **100** | $0.049 | **$0.099** |

---

## 📝 Yapılan Değişiklikler

### ✅ Güncellenen Dosya:

**`src/iap/creditsManager.js`**

#### 1. PACKAGE_CREDITS Mapping:
```javascript
// ÖNCESI:
'pack10': 10,
'pack50': 50,
'pack200': 200,

// SONRASI:
'pack10': 5,
'pack50': 25,
'pack200': 100,
```

#### 2. PRODUCT_CREDITS Mapping:
```javascript
// ÖNCESI:
'com.caridentify.app.credits.consumable.pack10': 10,
'com.caridentify.app.credits.consumable.pack50': 50,
'com.caridentify.app.credits.consumable.pack200': 200,

// SONRASI:
'com.caridentify.app.credits.consumable.pack10': 5,
'com.caridentify.app.credits.consumable.pack50': 25,
'com.caridentify.app.credits.consumable.pack200': 100,
```

#### 3. Fallback Logic:
```javascript
// ÖNCESI:
if (packageId.includes('pack10')) return 10;
if (packageId.includes('pack50')) return 50;
if (packageId.includes('pack200')) return 200;

// SONRASI:
if (packageId.includes('pack10')) return 5;
if (packageId.includes('pack50')) return 25;
if (packageId.includes('pack200')) return 100;
```

---

## ⚠️ ÖNEMLİ NOTLAR

### 📈 Birim Fiyat Artışı:

Kredi sayısı yarıya indi ama fiyat aynı kaldı. Bu demektir ki:

```
Birim fiyat 2 katına çıktı!

pack10:  $0.199/credit → $0.398/credit (+100%)
pack50:  $0.099/credit → $0.199/credit (+101%)
pack200: $0.049/credit → $0.099/credit (+102%)
```

### 📱 Kullanıcı Etkisi:

**Pozitif:**
- ✅ Daha premium hissi
- ✅ Düşük taahhüt (az kredi = daha düşük giriş bariyeri)
- ✅ Daha sık satın alma → daha fazla engagement

**Negatif:**
- ⚠️ Birim fiyat artışı fark edilebilir
- ⚠️ "Pahalı" algısı oluşabilir
- ⚠️ Conversion rate düşebilir

---

## 🎯 Öneri: Ürün İsimlerini de Güncelleyin

### App Store Connect'te:

Kredi sayıları değiştiği için ürün isimlerini de güncelleyin:

#### pack10 → "5 Credits Pack"
```
In-App Purchases → pack10

Reference Name: 
"10 Credits Pack" → "5 Credits Pack"

Display Name:
- English: "5 Credits Pack"
- Turkish: "5 Kredi Paketi"

Description:
- English: "Get 5 analysis credits"
- Turkish: "5 analiz kredisi alın"
```

#### pack50 → "25 Credits Pack"
```
Reference Name: "25 Credits Pack"
Display Name: "25 Credits Pack"
Description: "Get 25 analysis credits"
```

#### pack200 → "100 Credits Pack"
```
Reference Name: "100 Credits Pack"
Display Name: "100 Credits Pack"
Description: "Get 100 analysis credits"
```

**NOT:** Product ID değişmez! Sadece görünen isimler değişir.

---

## 🚀 Deployment Adımları

### 1️⃣ Git Commit & Push

```bash
git add src/iap/creditsManager.js
git commit -m "chore: Reduce credit amounts by 50%

- pack10: 10 → 5 credits
- pack50: 50 → 25 credits
- pack200: 200 → 100 credits

Price tiers remain the same. This increases unit price from $0.199 to $0.398 per credit for pack10."
git push origin main
```

### 2️⃣ Yeni Production Build

```
Expo Web → Create Build
- Platform: iOS
- Profile: production
- Version: 1.2.1 (bump patch)
- Submit: Yes
```

### 3️⃣ App Store Connect'te İsimleri Güncelle

```
In-App Purchases → Her bir ürün için:
- Reference Name güncelle
- Display Name güncelle (Localizations)
- Description güncelle
```

### 4️⃣ TestFlight'ta Test

Build tamamlanınca:

```
✅ Credits Store açılıyor
✅ Paketler görünüyor
✅ Sandbox ile satın al:
   - pack10 → 5 kredi eklenir ✅
   - pack50 → 25 kredi eklenir ✅
   - pack200 → 100 kredi eklenir ✅
```

---

## 📊 A/B Test Önerisi

Bu büyük bir değişiklik. Test edin:

### Metrikler:

```
Öncesi:
- Conversion Rate: %X
- Average Revenue per User: $Y
- Credits per Purchase: Z

Sonrası: (2 hafta sonra)
- Conversion Rate: %X' (düşebilir)
- Average Revenue per User: $Y' (artabilir)
- Credits per Purchase: Z' (azalır)
```

### Geri Alma:

Eğer conversion rate çok düşerse, geri alabilirsiniz:

```javascript
// Eski değerlere dön:
'pack10': 10,
'pack50': 50,
'pack200': 200,
```

---

## 💡 Alternatif Stratejiler

### Strateji 1: Fiyat + Kredi İndirimi (Daha Dengeli)
```
pack5:   $0.99 → 5 credits   ($0.198/credit - aynı)
pack25:  $2.49 → 25 credits  ($0.099/credit - aynı)
pack100: $4.99 → 100 credits ($0.049/credit - aynı)
```

### Strateji 2: Sadece pack10'u Düşür (Test)
```
pack10:  10 → 5 credits   (test için)
pack50:  50 → 50 credits  (aynı)
pack200: 200 → 200 credits (aynı)
```

### Strateji 3: Yeni Paket Ekle
```
pack5:   $0.99 → 5 credits   (yeni, giriş seviyesi)
pack10:  $1.99 → 10 credits  (mevcut)
pack50:  $4.99 → 50 credits  (mevcut)
pack200: $9.99 → 200 credits (mevcut)
```

---

## ✅ Durum

- ✅ **Kod güncellendi**
- ✅ **Linting temiz**
- ✅ **Build'e hazır**
- ⏳ **App Store isimleri bekliyor** (opsiyonel)
- ⏳ **Test bekliyor**

---

## 📞 Sonraki Adımlar

1. **Git commit yapın** (yukarıdaki komutu kullanın)
2. **Yeni build alın** (version 1.2.1)
3. **TestFlight'ta test edin**
4. **Conversion rate izleyin** (2 hafta)
5. **Gerekirse geri alın** veya optimize edin

---

*Güncelleme tarihi: ${new Date().toLocaleDateString('tr-TR')}*

🎯 **Kredi sayıları başarıyla güncellendi!**

