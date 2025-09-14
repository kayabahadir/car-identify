import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import CreditService from '../services/creditService';
import IAPService from '../services/iapService';
import FirstTimeService from '../services/firstTimeService';

// IAP modülünü conditionally import et
let InAppPurchases = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (error) {
  console.warn('⚠️ InAppPurchases module not available');
}

const PurchaseScreen = ({ navigation }) => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [iapProducts, setIapProducts] = useState([]); // Gerçek IAP ürünleri
  const [debugInfo, setDebugInfo] = useState(''); // Windows için debug info
  const [showDebug, setShowDebug] = useState(false);

  // DÜZELTME: Türkçe virgül notation için gelişmiş price parsing
  const parsePrice = (priceString) => {
    if (!priceString) return 0;
    
    // Türkçe format: 99,99₺ → 99.99
    // İngilizce format: $99.99 → 99.99
    
    // Para birimi sembollerini temizle
    let cleanPrice = priceString.replace(/[₺$€£¥]/g, '');
    
    // Türkçe virgül notation varsa nokta ile değiştir
    if (cleanPrice.includes(',') && !cleanPrice.includes('.')) {
      cleanPrice = cleanPrice.replace(',', '.');
    }
    // Eğer hem virgül hem nokta varsa (1.999,99 formatı)
    else if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
      // Son virgülü nokta olarak kabul et
      const lastComma = cleanPrice.lastIndexOf(',');
      const lastDot = cleanPrice.lastIndexOf('.');
      if (lastComma > lastDot) {
        // Virgül daha sonra geliyorsa ondalık ayırıcısıdır
        cleanPrice = cleanPrice.substring(0, lastComma).replace(/[.,]/g, '') + '.' + cleanPrice.substring(lastComma + 1);
      }
    }
    
    return parseFloat(cleanPrice) || 0;
  };

  const addDebugInfo = (info) => {
    setDebugInfo(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + info);
  };

  // İndirimli fiyat gösterimi için original fiyatları hesapla
  const getOriginalPrice = (currentPrice, savingsPercent) => {
    try {
      if (!currentPrice || savingsPercent === 0 || savingsPercent >= 100) {
        return currentPrice;
      }
      
      const numericPrice = parsePrice(currentPrice);
      if (numericPrice <= 0) {
        return currentPrice;
      }
      
      // İndirim yüzdesine göre orijinal fiyatı hesapla
      const discountMultiplier = 1 - savingsPercent / 100;
      if (discountMultiplier <= 0) {
        return currentPrice;
      }
      
      const originalPrice = numericPrice / discountMultiplier;
      
      // Para birimi sembolünü koru
      const currencySymbol = currentPrice.includes('₺') ? '₺' : '$';
      
      return `${currencySymbol}${originalPrice.toFixed(2)}`;
    } catch (error) {
      addDebugInfo('❌ Error in getOriginalPrice: ' + error.message);
      return currentPrice;
    }
  };

  // Base package bilgileri - YENİ CONSUMABLE IAP ID'leri
  const basePackages = React.useMemo(() => [
    {
      id: 'com.caridentify.credits.pack10',
      credits: 10,
      title: language === 'tr' ? 'Başlangıç' : 'Starter',
      subtitle: language === 'tr' ? 'Küçük projeler için' : 'For small projects',
      popular: false,
      savings: 0
    },
    {
      id: 'com.caridentify.credits.pack50',
      credits: 50,
      title: language === 'tr' ? 'Popüler' : 'Popular',
      subtitle: language === 'tr' ? 'En çok tercih edilen' : 'Most preferred',
      popular: true,
      savings: 30
    },
    {
      id: 'com.caridentify.credits.pack200',
      credits: 200,
      title: language === 'tr' ? 'Premium' : 'Premium',
      subtitle: language === 'tr' ? 'Büyük projeler için' : 'For large projects',
      popular: false,
      savings: 50
    }
  ], [language]);

  // Gerçek fiyatlarla birleştirilmiş paketler
  const packages = React.useMemo(() => {
    return basePackages.map(basePackage => {
      try {
        const iapProduct = iapProducts.find(product => product.productId === basePackage.id);
        const currentPrice = iapProduct?.price || (language === 'tr' ? 'Yükleniyor...' : 'Loading...');
        const originalPrice = getOriginalPrice(currentPrice, basePackage.savings);
        
        let pricePerCredit = '...';
        if (iapProduct?.price) {
          try {
            const numericPrice = parsePrice(iapProduct.price);
            if (numericPrice > 0 && basePackage.credits > 0) {
              pricePerCredit = (numericPrice / basePackage.credits).toFixed(3);
            }
          } catch (error) {
            addDebugInfo('❌ Error calculating price per credit: ' + error.message);
          }
        }
        
        return {
          ...basePackage,
          price: currentPrice, // Gerçek satış fiyatı
          priceOriginal: originalPrice, // İndirimli gösterim için orijinal fiyat
          priceLocal: currentPrice,
          pricePerCredit: pricePerCredit
        };
      } catch (error) {
        addDebugInfo('❌ Error processing package ' + basePackage.id + ': ' + error.message);
        return {
          ...basePackage,
          price: 'Error',
          priceOriginal: 'Error',
          priceLocal: 'Error',
          pricePerCredit: '...'
        };
      }
    });
  }, [basePackages, iapProducts, language, getOriginalPrice]);

  useEffect(() => {
    addDebugInfo('🚀 PurchaseScreen başlatılıyor...');
    loadCurrentCredits();
    initializeIAP();
    loadIAPProducts(); // Gerçek ürün fiyatlarını yükle
    
    // Custom back button handler
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const initializeIAP = async () => {
    try {
      addDebugInfo('🔍 IAP initialization başlıyor...');

      const available = await IAPService.isAvailable();
      addDebugInfo('🔍 IAP Service availability: ' + available);
      
      if (!available) {
        addDebugInfo('⚠️ IAP not available - sebepleri:');
        addDebugInfo('• Device IAP desteklemiyor');
        addDebugInfo('• Network bağlantı sorunu');
        addDebugInfo('• IAP settings\'te kapalı');
        addDebugInfo('• Product ID\'ler App Store Connect\'te yok');
        addDebugInfo('• TestFlight sandbox test user sorunu');
      }
    } catch (error) {
      addDebugInfo('❌ IAP initialization error: ' + error.message);
    }
  };

  const loadCurrentCredits = async () => {
    try {
      const credits = await CreditService.getCredits();
      setCurrentCredits(credits);
      addDebugInfo('✅ Mevcut kredi: ' + credits);
    } catch (error) {
      addDebugInfo('❌ Kredi yükleme hatası: ' + error.message);
    }
  };

  const loadIAPProducts = async () => {
    try {
      addDebugInfo('📦 IAP products yükleniyor...');

      const available = await IAPService.isAvailable();
      addDebugInfo('🔍 IAP available for products: ' + available);

      if (available) {
        await IAPService.initialize();
        const products = await IAPService.getProducts();
        
        addDebugInfo('📦 Yüklenen product sayısı: ' + (products?.length || 0));

        if (products && products.length > 0) {
          setIapProducts(products);
          addDebugInfo('✅ Products başarıyla yüklendi');
          products.forEach((product, index) => {
            addDebugInfo(`  ${index + 1}. ${product.productId}: ${product.price || 'NO PRICE'}`);
          });
        } else {
          addDebugInfo('⚠️ Hiç product yüklenmedi - fallback kullanılıyor');
          addDebugInfo('Sebep: Product ID\'ler App Store Connect\'te yok olabilir');
          setFallbackProducts();
        }
      } else {
        addDebugInfo('🔧 IAP available değil - fallback mode');
        setFallbackProducts();
      }
    } catch (error) {
      addDebugInfo('❌ IAP products yükleme hatası: ' + error.message);
      setFallbackProducts();
    }
  };

  const setFallbackProducts = () => {
    const fallbackProducts = [
      { productId: 'com.caridentify.credits.pack10', price: '₺99,99' },
      { productId: 'com.caridentify.credits.pack50', price: '₺289,99' },
      { productId: 'com.caridentify.credits.pack200', price: '₺829,99' }
    ];
    setIapProducts(fallbackProducts);
    addDebugInfo('🔧 Fallback products kullanılıyor');
  };

  const handlePurchase = async (packageInfo) => {
    addDebugInfo('🛒 Satın alma başlıyor: ' + packageInfo.id);
    setLoading(true);
    setSelectedPackage(packageInfo.id);

    try {
      const iapAvailable = await IAPService.isAvailable();
      addDebugInfo('💳 Purchase IAP available: ' + iapAvailable);
      
      if (iapAvailable) {
        try {
          if (!InAppPurchases) {
            addDebugInfo('🔧 Mock purchase (no IAP module)');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const packageInfo_credits = IAPService.CREDIT_PACKAGES[packageInfo.id];
            if (packageInfo_credits) {
              await CreditService.addCredits(packageInfo_credits.credits);
              addDebugInfo('✅ Mock purchase: +' + packageInfo_credits.credits + ' kredi eklendi');
            }
            
            await FirstTimeService.markFreeAnalysisUsed();
            
            Alert.alert(
              `🎉 Test Purchase Success`,
              `Mock purchase completed for ${packageInfo.credits} credits.`,
              [{ 
                text: 'OK', 
                onPress: () => navigation.navigate('Home', { forceRefresh: Date.now() })
              }]
            );
            return;
          }
          
          addDebugInfo('💳 Gerçek IAP satın alma başlıyor...');
          const purchaseResult = await IAPService.purchaseProduct(packageInfo.id);
          addDebugInfo('✅ Purchase completed: ' + JSON.stringify(purchaseResult));
          
          await FirstTimeService.markFreeAnalysisUsed();
          
          Alert.alert(
            `🎉 ${t('purchaseSuccess')}`,
            `${packageInfo.credits} ${t('purchaseSuccessMessage')}`,
            [{ 
              text: t('startAnalyzing'), 
              onPress: () => {
                navigation.navigate('Home', { forceRefresh: Date.now() });
              }
            }]
          );
          
        } catch (purchaseError) {
          addDebugInfo('❌ Purchase error: ' + purchaseError.message);
          
          if (purchaseError.message?.includes('iptal') || 
              purchaseError.message?.includes('cancel') ||
              purchaseError.message?.includes('cancelled')) {
            addDebugInfo('ℹ️ User cancelled purchase');
            return;
          }
          throw purchaseError;
        }
      } else {
        addDebugInfo('⚠️ IAP not available - mock mode');
        
        // Otomatik mock mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const packageInfo_credits = IAPService.CREDIT_PACKAGES[packageInfo.id];
        if (packageInfo_credits) {
          await CreditService.addCredits(packageInfo_credits.credits);
          addDebugInfo('✅ Auto mock purchase: +' + packageInfo_credits.credits + ' kredi eklendi');
        }
        
        await FirstTimeService.markFreeAnalysisUsed();
        
        Alert.alert(
          '🎉 Test Mode Purchase',
          `IAP çalışmadığı için mock purchase yapıldı.\n\n${packageInfo.credits} kredi eklendi.\n\nGerçek App Store'da normal çalışacak.`,
          [{ 
            text: 'Anladım', 
            onPress: () => navigation.navigate('Home', { forceRefresh: Date.now() })
          }]
        );
      }

    } catch (error) {
      addDebugInfo('❌ Critical purchase error: ' + error.message);
      
      Alert.alert(
        'Satın Alma Hatası',
        `Hata: ${error.message}\n\nDebug bilgileri için 'Debug Göster' butonuna basın.`,
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
      setSelectedPackage(null);
      
      setTimeout(async () => {
        await loadCurrentCredits();
        addDebugInfo('🔄 Krediler güncellendi');
      }, 2000);
    }
  };

  const renderPackage = (pkg) => (
    <TouchableOpacity
      key={pkg.id}
      style={[
        styles.packageCard,
        pkg.popular && styles.popularCard,
        selectedPackage === pkg.id && styles.selectedCard,
      ]}
      onPress={() => handlePurchase(pkg)}
      disabled={loading}
    >
      {loading && selectedPackage === pkg.id && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {pkg.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>{language === 'tr' ? 'EN POPÜLER' : 'MOST POPULAR'}</Text>
        </View>
      )}
      
      {pkg.savings > 0 && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsText}>%{pkg.savings} {language === 'tr' ? 'İNDİRİM' : 'DISCOUNT'}</Text>
        </View>
      )}

      <View style={styles.packageHeader}>
        <Text style={styles.packageTitle}>{pkg.title}</Text>
        <Text style={styles.packageSubtitle}>{pkg.subtitle}</Text>
      </View>

      <View style={styles.creditsSection}>
        <Text style={styles.creditsNumber}>{pkg.credits}</Text>
        <Text style={styles.creditsText}>{language === 'tr' ? 'Analiz Kredisi' : 'Analysis Credits'}</Text>
      </View>

      <View style={styles.priceSection}>
        <Text style={styles.price}>{pkg.price}</Text>
        {pkg.savings > 0 && (
          <Text style={styles.priceOriginal}>{pkg.priceOriginal}</Text>
        )}
        <Text style={styles.pricePerCredit}>
          {pkg.pricePerCredit !== '...' ? 
            `${pkg.pricePerCredit}${pkg.price.includes('₺') ? '₺' : '$'}/${language === 'tr' ? 'kredi' : 'credit'}` :
            '...'
          }
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
          <Text style={styles.featureText}>{t('unlimitedAnalysisRights')}</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
          <Text style={styles.featureText}>{t('detailedVehicleInformation')}</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
          <Text style={styles.featureText">{t('pastAnalysisRecords')}</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.featureText}>
            {language === 'tr' ? 'Tekrar satın alınabilir' : 'Can be purchased again'}
          </Text>
        </View>
      </View>

      <View style={styles.buyButton}>
        <Text style={styles.buyButtonText}>
          {loading && selectedPackage === pkg.id ? 
            (language === 'tr' ? 'Satın Alınıyor...' : 'Purchasing...') : 
            (language === 'tr' ? 'Satın Al' : 'Buy Now')
          }
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('buyCredits')}</Text>
        <TouchableOpacity 
          onPress={() => setShowDebug(!showDebug)} 
          style={styles.debugButton}
        >
          <Ionicons name="bug" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.currentCredits}>
          <Ionicons name="wallet" size={32} color="#6366f1" />
          <View style={styles.creditsInfo}>
            <Text style={styles.creditsLabel}>{t('currentCredits')}</Text>
            <Text style={styles.creditsCount}>{currentCredits}</Text>
          </View>
        </View>

        {showDebug && (
          <View style={styles.debugContainer}>
            <View style={styles.debugHeader}>
              <Ionicons name="bug" size={20} color="#dc2626" />
              <Text style={styles.debugTitle}>Debug Bilgileri (Windows için)</Text>
              <TouchableOpacity onPress={() => setDebugInfo('')}>
                <Text style={styles.clearDebug}>Temizle</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.debugScrollView} nestedScrollEnabled>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </ScrollView>
          </View>
        )}

        <View style={styles.howItWorksCard}>
          <View style={styles.howItWorksHeader}>
            <Ionicons name="information-circle" size={20} color="#6366f1" />
            <Text style={styles.howItWorksTitle}>{t('howItWorks')}</Text>
          </View>
          <Text style={styles.howItWorksText}>
            {language === 'tr'
              ? 'Her araç analizi 1 kredi kullanır. Krediniz bittiğinde aynı paketi tekrar satın alabilirsiniz. Kredileriniz hiçbir zaman sona ermez ve hesabınızda kalıcı olarak saklanır.'
              : 'Each vehicle analysis uses 1 credit. When your credits run out, you can purchase the same package again. Your credits never expire and are permanently stored in your account.'
            }
          </Text>
        </View>

        <View style={styles.packagesSection}>
          <Text style={styles.sectionTitle}>{language === 'tr' ? 'Kredi Paketleri' : 'Credit Packages'}</Text>
          <View style={styles.packagesContainer}>
            {packages.map(renderPackage)}
          </View>

          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>
              {language === 'tr'
                ? '• Tüm satışlar kesindir\n• Krediler asla sona ermez\n• Aynı paketi tekrar satın alabilirsiniz\n• Güvenli ödeme Apple/Google üzerinden'
                : '• All sales are final\n• Credits never expire\n• You can purchase the same package again\n• Secure payment via Apple/Google'
              }
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentCredits: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  creditsInfo: {
    marginLeft: 16,
    flex: 1,
  },
  creditsLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  creditsCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  debugContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    flex: 1,
    marginLeft: 8,
  },
  clearDebug: {
    fontSize: 12,
    color: '#dc2626',
    textDecorationLine: 'underline',
  },
  debugScrollView: {
    maxHeight: 200,
  },
  debugText: {
    fontSize: 11,
    color: '#7f1d1d',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  howItWorksCard: {
    backgroundColor: '#eff6ff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginLeft: 8,
  },
  howItWorksText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  packagesSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  packagesContainer: {
    gap: 16,
  },
  packageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
    overflow: 'hidden',
  },
  popularCard: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  selectedCard: {
    borderColor: '#6366f1',
    backgroundColor: '#faf5ff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: 20,
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  savingsBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  packageHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  packageSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  creditsSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#6366f1',
    lineHeight: 48,
  },
  creditsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  priceOriginal: {
    fontSize: 16,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  pricePerCredit: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  features: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  buyButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PurchaseScreen;