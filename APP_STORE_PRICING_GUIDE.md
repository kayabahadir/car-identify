# 💰 App Store Connect - Fiyat Değiştirme Rehberi

## 📍 Screenshot'taki Sayfada Fiyat Değiştirme

Gördüğünüz sayfa: **"10 Credits Pack - Consumable"** detay sayfası

---

## ✅ **Adım Adım Fiyat Değiştirme:**

### 1️⃣ **"Price Schedule" Bölümündeki "+" Butonuna Tıklayın**

Screenshot'ta görüyorsunuz:
```
Price Schedule [+]    <--- Bu "+" butonuna tıklayın
```

---

### 2️⃣ **"Add Pricing" Seçin**

Açılan menüden:
```
+ Add New Pricing
```

---

### 3️⃣ **Yeni Fiyatı Girin**

**Base Country or Region:** United States (USD)

**Price:** 
```
Current: $0.99
New: [İstediğiniz fiyatı girin, örn: $1.49]
```

---

### 4️⃣ **Diğer Ülke Fiyatlarını Belirleyin**

İki seçenek var:

#### **A) Otomatik (Önerilen):**
```
☑️ "Generate Prices Automatically"

Apple, tüm ülkeler için otomatik kur çevirimi yapar:
- $1.49 (USD)
- €1.49 (EUR)  
- ₺49.99 (TRY)
- vs...
```

#### **B) Manuel:**
```
☐ "Generate Prices Automatically" (kapalı)

Her ülke için manuel fiyat girersiniz:
- United States: $1.49
- Turkey: ₺59.99
- Germany: €1.49
- vs...
```

---

### 5️⃣ **"All Prices and Currencies" Linkine Tıklayın**

Screenshot'ta sağ üstte görebilirsiniz:
```
All Prices and Currencies →    <--- Tıklayın
```

Bu sayfada:
- ✅ 175 ülke/bölge için fiyatları görürsünüz
- ✅ İstediğiniz ülkenin fiyatını manuel değiştirebilirsiniz
- ✅ "May Adjust Automatically" → Apple otomatik günceller

---

### 6️⃣ **Başlangıç Tarihi Seçin**

```
Start Date:
○ Immediately (Hemen)    <--- Seçin
○ Scheduled Date (İleri tarih)
```

---

### 7️⃣ **"Save" Butonuna Tıklayın**

Sağ üstteki:
```
[Save]    <--- Tıklayın
```

---

### 8️⃣ **Onay İsterse "Submit for Review" YAPMAYIN**

Eğer sayfa "Submit for Review" butonu gösteriyorsa:

```
❌ TIKLAMAYIN! 

Sadece fiyat değişiklikleri için review gerekmez.
Sadece "Save" yeterli.
```

---

## ⏱️ **Ne Kadar Sürede Aktif Olur?**

```
Save'e bastıktan sonra:
├─ 5 dakika: Apple sunucularına yayılır
├─ 10 dakika: RevenueCat çeker
└─ Uygulama: Yeni fiyatları gösterir ✅
```

**Kod değişikliği yok, build gerekmez!** 🎉

---

## 🔍 **Fiyat Değişikliği Kontrolü**

### App Store Connect'te Kontrol:

```
In-App Purchases → 10 Credits Pack → Price Schedule

Current Price:
- $0.99 (eski)
- $1.49 (yeni) ✅
```

### RevenueCat Dashboard'da Kontrol:

```
https://app.revenuecat.com/
→ Products
→ 10 Credits Pack
→ Pricing
```

### Uygulamada Test:

```
1. Uygulamayı açın (mevcut build)
2. Credits Store'a gidin
3. pack10 fiyatını görün
   - $0.99 (eski) veya
   - $1.49 (yeni) ✅
```

**NOT:** İlk açılışta cache nedeniyle eski fiyat görünebilir. Uygulamayı kapatıp açın veya 10 dakika bekleyin.

---

## 📝 **Türkiye Fiyatı Özel Ayar**

Eğer Türkiye için özel fiyat vermek isterseniz:

### Adım 1: "All Prices and Currencies"

```
Price Schedule → All Prices and Currencies
```

### Adım 2: Türkiye'yi Bulun

```
Search: "Turkey"

Turkey (TRY)
Current: ₺32.99 (otomatik)
```

### Adım 3: "Edit" Tıklayın

```
[Edit] butonu → Yeni fiyat girin:
₺32.99 → ₺49.99

[Save]
```

---

## 🎯 **Tüm Paketler İçin Tekrarlayın**

Aynı işlemi diğer paketler için yapın:

### pack10 (10 Credits Pack)
```
Product ID: com.caridentify.app.credits.consumable.pack10
Current: $0.99
New: $1.49 (örnek)
```

### pack50 (50 Credits Pack)
```
Product ID: com.caridentify.app.credits.consumable.pack50
Current: $2.99
New: $3.99 (örnek)
```

### pack200 (200 Credits Pack)
```
Product ID: com.caridentify.app.credits.consumable.pack200
Current: $8.99
New: $9.99 (örnek)
```

---

## ⚠️ **DİKKAT EDİLMESİ GEREKENLER**

### ❌ YAPMAYIN:

1. **"Submit for Review" butonuna tıklamayın**
   - Sadece fiyat değişikliği review gerektirmez

2. **Product ID'yi değiştirmeyin**
   - `com.caridentify.app.credits.consumable.pack10`
   - Bu değişirse her şey bozulur!

3. **Product Type'ı değiştirmeyin**
   - "Consumable" olmalı
   - "Non-Consumable"a değiştirirseniz satın almalar bozulur

4. **Apple ID'yi değiştirmeyin**
   - Screenshot'taki: `6753620644`
   - Bu Apple'ın otomatik ID'si

### ✅ DEĞİŞTİREBİLİRSİNİZ:

1. ✅ **Fiyat (Price)**
2. ✅ **Reference Name** (görünüm adı)
3. ✅ **Display Name** (Localizations)
4. ✅ **Description** (Localizations)
5. ✅ **Availability** (hangi ülkelerde satılacak)

---

## 🔄 **Fiyat Değişikliği Testi**

### Test Süreci:

```bash
# 1. App Store Connect'te fiyatı değiştir
   → Save

# 2. 10 dakika bekle

# 3. Uygulamayı test et:
   - Uygulamayı kapat
   - Tekrar aç
   - Credits Store'a git
   - Yeni fiyatı gör ✅

# 4. Sandbox ile satın alma yap
   - Yeni fiyat görünecek
   - Satın alma çalışacak ✅
```

---

## 💡 **Fiyatlandırma Önerileri**

### Psikolojik Fiyatlandırma:

```
❌ $1.00  →  ✅ $0.99  (daha cazip)
❌ $3.00  →  ✅ $2.99  (daha cazip)
❌ $10.00 →  ✅ $9.99  (daha cazip)
```

### Tier Fiyatlandırma:

```
pack10:  $0.99  (entry point)
pack50:  $2.99  (most popular - best value)
pack200: $8.99  (premium - max discount)
```

### İndirim Oranı:

```
pack10:  $0.099/credit (base)
pack50:  $0.059/credit (40% discount) ⭐
pack200: $0.044/credit (55% discount)
```

---

## 📊 **Güncel Fiyatlarınız**

Screenshot'tan görünen:

### 10 Credits Pack:
```
Current Price: 175 Countries or Regions
May Adjust Automatically: ✅

Base: United States (USD)
Status: Active
```

Fiyatı değiştirmek için:
```
1. "Price Schedule" → "+" butonu
2. Add New Pricing
3. Yeni fiyatı gir
4. Save
```

---

## 🎯 **Hızlı Özet:**

```
1. In-App Purchases → Ürün seç
2. Price Schedule → [+] butonu
3. Add New Pricing
4. Base price gir (örn: $1.49)
5. "Generate Prices" → Otomatik
6. Start Date → Immediately
7. Save
8. 10 dakika bekle
9. Test et ✅
```

**NOT:** Build gerekmez, kod değişikliği yok! 🚀

---

## 📞 **Sorun Yaşarsanız:**

### "Price Schedule" görünmüyorsa:
→ Ürün "Cleared for Sale" durumunda olmalı

### Fiyat değişmiyor:
→ 10-15 dakika bekleyin, cache temizlensin

### RevenueCat yanlış fiyat gösteriyor:
→ RevenueCat dashboard'da "Sync Products" tıklayın

---

*Bu rehber, screenshot'taki sayfadan fiyat değiştirme için hazırlanmıştır.*

✅ **Başarıyla fiyatlarınızı güncelleyebilirsiniz!** 🎉

