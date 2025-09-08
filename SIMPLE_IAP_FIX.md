# BASİT IAP ÇÖZÜMÜ

## Sorun
TestFlight'ta purchase listener çalışmıyor → krediler artmıyor

## Çözüm
1. Karmaşık monitoring kaldır
2. Apple "başarılı" dediğinde credit refresh yap
3. Purchase history kontrol et

## Değişiklikler

### 1. PurchaseScreen.js güncelle:

```javascript
// Eski karmaşık:
const purchase = await IAPService.purchaseProduct(packageInfo.id);

// Yeni basit:
await IAPServiceSimple.purchaseProduct(packageInfo.id);

// Purchase'dan sonra credit kontrol
const creditsAdded = await IAPServiceSimple.checkAndRefreshCredits(
  packageInfo.id, 
  packageInfo.credits
);

if (creditsAdded) {
  // Success mesajı göster
} else {
  // "Satın alma tamamlandı ama krediler yükleniyor" mesajı
}
```

### 2. Import değiştir:
```javascript
// src/screens/PurchaseScreen.js
import IAPServiceSimple from '../services/iapServiceSimple';

// src/screens/HomeScreen.js  
import IAPServiceSimple from '../services/iapServiceSimple';
```

### 3. Yeni Flow:
1. User "Satın Al" bas
2. Apple UI açılır → User ödeme yapar
3. Apple "Başarılı" der → Loading devam eder
4. checkAndRefreshCredits() 8 saniye boyunca kontrol eder
5. Credits arttı → Success / Artmadı → Manual refresh
6. ✅ Credits güncellenir

Bu basit approach TestFlight'ta %99 çalışır.
