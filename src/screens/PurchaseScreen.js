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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useLanguage } from '../contexts/LanguageContext';
import CreditService from '../services/creditService';
import RevenueCatService from '../services/revenueCatService';
import FirstTimeService from '../services/firstTimeService';
import DebugService from '../services/debugService';

const PurchaseScreen = ({ navigation }) => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [rcPackages, setRcPackages] = useState([]); // RevenueCat paketleri

  // Türkçe virgül notation için gelişmiş price parsing
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
      console.error('Error in getOriginalPrice:', error);
      return currentPrice;
    }
  };

  // Base package bilgileri - YENİ CONSUMABLE IAP ID'leri
  const basePackages = React.useMemo(() => [
    {
      id: 'com.caridentify.app.credits.consumable.pack10',
      credits: 10,
      title: language === 'tr' ? 'Başlangıç' : 'Starter',
      subtitle: language === 'tr' ? 'Küçük projeler için' : 'For small projects',
      popular: false,
      savings: 0
    },
    {
      id: 'com.caridentify.app.credits.consumable.pack50',
      credits: 50,
      title: language === 'tr' ? 'Popüler' : 'Popular',
      subtitle: language === 'tr' ? 'En çok tercih edilen' : 'Most preferred',
      popular: true,
      savings: 30
    },
    {
      id: 'com.caridentify.app.credits.consumable.pack200',
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
        // RevenueCat paketlerinden eşleşeni bul
        const rcPackage = rcPackages.find(p => p.product.identifier === basePackage.id);
        const product = rcPackage?.product;
        
        const currentPrice = product?.priceString || (language === 'tr' ? 'Yükleniyor...' : 'Loading...');
        const originalPrice = getOriginalPrice(currentPrice, basePackage.savings);
        
        let pricePerCredit = '...';
        if (product?.price) {
          try {
            // RevenueCat price already number
            const numericPrice = product.price;
            if (numericPrice > 0 && basePackage.credits > 0) {
              pricePerCredit = (numericPrice / basePackage.credits).toFixed(3);
            }
          } catch (error) {
            console.error('Error calculating price per credit:', error);
          }
        }
        
        return {
          ...basePackage,
          price: currentPrice,
          priceOriginal: originalPrice,
          priceLocal: currentPrice,
          pricePerCredit: pricePerCredit
        };
      } catch (error) {
        console.error('Error processing package:', basePackage.id, error);
        return {
          ...basePackage,
          price: 'Error',
          priceOriginal: 'Error',
          priceLocal: 'Error',
          pricePerCredit: '...'
        };
      }
    });
  }, [basePackages, rcPackages, language, getOriginalPrice]);

  useEffect(() => {
    loadCurrentCredits();
    loadIAPProducts();
    
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);


  const loadCurrentCredits = async () => {
    try {
      const credits = await CreditService.getCredits();
      setCurrentCredits(credits);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const loadIAPProducts = async () => {
    try {
      console.log('Loading RevenueCat products...');
      
      // Initialize RevenueCat
      const initResult = await RevenueCatService.initialize();
      if (!initResult) {
        console.error('RevenueCat initialization failed');
        setFallbackProducts(); // Hata durumunda fallback göster
        return;
      }
      
      // Get packages
      const packages = await RevenueCatService.getPackages();
      console.log('RevenueCat packages loaded:', packages?.length || 0);

      if (packages && packages.length > 0) {
        setRcPackages(packages);
      } else {
        console.log('No packages found, using fallback');
        setFallbackProducts();
      }
      
    } catch (error) {
      console.error('Load IAP products error:', error);
      setFallbackProducts();
    }
  };

  const setFallbackProducts = () => {
    // Fallback için mock paketler oluştur
    // RevenueCat paket yapısını taklit et
    const fallbackPackages = [
      { 
        identifier: 'pack10', 
        product: { identifier: 'com.caridentify.app.credits.consumable.pack10', priceString: '₺99,99', currencyCode: 'TRY' } 
      },
      { 
        identifier: 'pack50', 
        product: { identifier: 'com.caridentify.app.credits.consumable.pack50', priceString: '₺289,99', currencyCode: 'TRY' } 
      },
      { 
        identifier: 'pack200', 
        product: { identifier: 'com.caridentify.app.credits.consumable.pack200', priceString: '₺829,99', currencyCode: 'TRY' } 
      }
    ];
    console.log('📦 Setting fallback packages');
    setRcPackages(fallbackPackages);
  };

  const handlePurchase = async (basePkg) => {
    // 1. İlgili RevenueCat paketini bul
    // Base package ID'si (com.caridentify...) ile eşleşen RC paketini bulmalıyız
    const rcPackage = rcPackages.find(p => p.product.identifier === basePkg.id);
    
    if (!rcPackage) {
      console.error('RevenueCat package not found for:', basePkg.id);
      Alert.alert(t('error'), t('productNotFound'));
      return;
    }
    
    // Prevent multiple clicks
    if (loading) return;
    
    console.log('=== handlePurchase START ===');
    console.log('Product:', basePkg.id);
    
    try {
      setLoading(true);
      setSelectedPackage(basePkg.id);
      
      // Call purchase via RevenueCat
      console.log('Calling RevenueCat purchase...');
      const result = await RevenueCatService.purchasePackage(rcPackage);
      
      console.log('Purchase result:', result);
      
      // Mark first time (non-blocking)
      try {
        FirstTimeService.markFreeAnalysisUsed().catch(() => {});
      } catch (e) {}
      
      // Close loading
      setLoading(false);
      setSelectedPackage(null);
      
      // Show success
      if (result.success) {
        Alert.alert(
          '🎉 ' + (language === 'tr' ? 'Satın Alma Başarılı!' : 'Purchase Successful!'),
          `${basePkg.credits} ${language === 'tr' ? 'kredi hesabınıza eklendi.' : 'credits added to your account.'}`,
          [{ 
            text: language === 'tr' ? 'Devam' : 'Continue',
            onPress: () => {
              navigation.navigate('Home', { forceRefresh: Date.now() });
            }
          }]
        );
      }

    } catch (error) {
      console.error('=== handlePurchase ERROR ===');
      console.error('Error:', error);
      
      setLoading(false);
      setSelectedPackage(null);
      
      // Show error (unless user cancelled)
      if (!error.userCancelled && error.message !== 'Purchase cancelled') {
        Alert.alert(
          language === 'tr' ? 'Satın Alma Hatası' : 'Purchase Error',
          error.message || t('purchaseFailed'),
          [{ text: language === 'tr' ? 'Tamam' : 'OK' }]
        );
      }
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
          <Text style={styles.featureText}>{t('detailedVehicleInfo')}</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
          <Text style={styles.featureText}>{t('pastAnalysisRecords')}</Text>
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
        <Text style={styles.headerTitle}>
          {t('buyCredits')}
        </Text>
        {__DEV__ && (
          <TouchableOpacity 
            onPress={() => DebugService.showIAPDebug()} 
            style={styles.debugButton}
          >
            <Ionicons name="bug" size={20} color="#6366f1" />
          </TouchableOpacity>
        )}
        {!__DEV__ && <View style={styles.placeholder} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.currentCredits}>
          <Ionicons name="wallet" size={32} color="#6366f1" />
          <View style={styles.creditsInfo}>
            <Text style={styles.creditsLabel}>{t('currentCredits')}</Text>
            <Text style={styles.creditsCount}>{currentCredits}</Text>
          </View>
        </View>

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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  debugButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
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