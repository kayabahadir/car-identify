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

const PurchaseScreen = ({ navigation }) => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [iapProducts, setIapProducts] = useState([]); // Gerçek IAP ürünleri

  // Base package bilgileri (fiyatlar IAP'den gelecek)
  const basePackages = [
    {
      id: 'com.caridentify.credits10.permanent',
      credits: 10,
      title: language === 'tr' ? 'Başlangıç' : 'Starter',
      subtitle: language === 'tr' ? 'Küçük projeler için' : 'For small projects',
      popular: false,
      savings: 0
    },
    {
      id: 'com.caridentify.credits50.permanent',
      credits: 50,
      title: language === 'tr' ? 'Popüler' : 'Popular',
      subtitle: language === 'tr' ? 'En çok tercih edilen' : 'Most preferred',
      popular: true,
      savings: 30
    },
    {
      id: 'com.caridentify.credits200.permanent',
      credits: 200,
      title: language === 'tr' ? 'Premium' : 'Premium',
      subtitle: language === 'tr' ? 'Büyük projeler için' : 'For large projects',
      popular: false,
      savings: 50
    }
  ];

  // Gerçek fiyatlarla birleştirilmiş paketler
  const packages = basePackages.map(basePackage => {
    const iapProduct = iapProducts.find(product => product.productId === basePackage.id);
    const currentPrice = iapProduct?.price || (language === 'tr' ? 'Yükleniyor...' : 'Loading...');
    const originalPrice = getOriginalPrice(currentPrice, basePackage.savings);
    
    return {
      ...basePackage,
      price: currentPrice, // Gerçek satış fiyatı
      priceOriginal: originalPrice, // İndirimli gösterim için orijinal fiyat
      priceLocal: currentPrice,
      pricePerCredit: iapProduct?.price ? 
        `${(parseFloat(iapProduct.price.replace(/[^0-9.]/g, '')) / basePackage.credits).toFixed(3)}` : 
        '...'
    };
  });

  useEffect(() => {
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
      const available = await IAPService.isAvailable();
      if (!available) {
        console.log('⚠️ IAP not available, using demo mode');
      }
    } catch (error) {
      console.error('Error initializing IAP:', error);
    }
  };

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
      if (__DEV__) {
        console.log('📦 Loading IAP products...');
      }

      const available = await IAPService.isAvailable();
      if (available) {
        // IAP service'i initialize et ve products yükle
        await IAPService.initialize();
        const products = await IAPService.getProducts();
        
        if (__DEV__) {
          console.log('📦 Loaded IAP products:', products);
          console.log('🔍 Products count:', products?.length || 0);
        }

        if (products && products.length > 0) {
          setIapProducts(products);
          if (__DEV__) {
            products.forEach(product => {
              console.log(`💰 ${product.productId}: ${product.price || 'No price'}`);
            });
          }
        } else {
          // Products yüklenemedi, fallback kullan
          if (__DEV__) {
            console.log('⚠️ No products loaded from IAP, using fallback');
          }
          setFallbackProducts();
        }
      } else {
        // Demo mode - fallback fiyatları
        if (__DEV__) {
          console.log('🔧 IAP not available, using fallback prices for demo mode');
        }
        setFallbackProducts();
      }
    } catch (error) {
      console.error('❌ Error loading IAP products:', error);
      setFallbackProducts();
    }
  };

  const setFallbackProducts = () => {
    const fallbackProducts = [
      { productId: 'com.caridentify.credits10.permanent', price: '$1.99' },
      { productId: 'com.caridentify.credits50.permanent', price: '$6.99' },
      { productId: 'com.caridentify.credits200.permanent', price: '$19.99' }
    ];
    setIapProducts(fallbackProducts);
    if (__DEV__) {
      console.log('🔧 Using fallback products:', fallbackProducts);
    }
  };

  // İndirimli fiyat gösterimi için original fiyatları hesapla
  const getOriginalPrice = (currentPrice, savingsPercent) => {
    if (!currentPrice || savingsPercent === 0) return currentPrice;
    
    // $ veya ₺ sembolünü çıkar ve sayıyı al
    const numericPrice = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(numericPrice)) return currentPrice;
    
    // İndirim yüzdesine göre orijinal fiyatı hesapla
    const originalPrice = numericPrice / (1 - savingsPercent / 100);
    
    // Para birimi sembolünü koru
    const currencySymbol = currentPrice.includes('₺') ? '₺' : '$';
    
    return `${currencySymbol}${originalPrice.toFixed(2)}`;
  };

  const handlePurchase = async (packageInfo) => {
    setLoading(true);
    setSelectedPackage(packageInfo.id);

    try {
      const iapAvailable = await IAPService.isAvailable();
      
      if (iapAvailable) {
        try {
          // Basit purchase
          await IAPService.purchaseProduct(packageInfo.id);
          
          // Apple UI kapandı, hemen success göster
          await FirstTimeService.markFreeAnalysisUsed();
          
          // Purchase successful, credits should be added automatically
          
          // Success mesajını göster
          Alert.alert(
            `🎉 ${t('purchaseSuccess')}`,
            `${packageInfo.credits} ${t('purchaseSuccessMessage')}`,
            [{ 
              text: t('startAnalyzing'), 
              onPress: () => {
                // Ana sayfaya git ve force refresh
                navigation.navigate('Home', { forceRefresh: Date.now() });
              }
            }]
          );
        } catch (purchaseError) {
          // Satın alma hatası (user cancel, payment fail vs.)
          if (purchaseError.message?.includes('iptal') || purchaseError.message?.includes('cancel')) {
            // User cancel - sessizce geç
            return;
          }
          throw purchaseError; // Diğer hatalar için dışarıya fırlat
        }
      } else {
        Alert.alert(
          t('unavailable') || 'Kullanılamıyor',
          t('iapUnavailable') || 'Satın almalar şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.'
        );
      }

      // Kredi sayısını güncelle
      setTimeout(loadCurrentCredits, 1000);

    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Satın Alma Hatası',
        error.message || 'Satın alma işlemi başarısız oldu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
      setSelectedPackage(null);
    }
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      const iapAvailable = await IAPService.isAvailable();
      
      if (iapAvailable) {
        // Gerçek IAP restore
        await IAPService.restorePurchases();
      } else {
        // Demo mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        Alert.alert(
          'Demo Mode',
          'Bu demo modudur. Gerçek satın alma geri yüklemesi App Store/Google Play üzerinden yapılır.',
          [{ text: 'Tamam' }]
        );
      }
      
      // Kredi sayısını güncelle
      setTimeout(loadCurrentCredits, 1000);
      
    } catch (error) {
      Alert.alert(
        'Geri Yükleme Hatası',
        error.message || 'Satın almalar geri yüklenemedi.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPackage = (pkg) => (
    <TouchableOpacity
      key={pkg.id}
      style={[
        styles.packageCard,
        pkg.popular && styles.popularPackage,
        selectedPackage === pkg.id && styles.selectedPackage
      ]}
      onPress={() => handlePurchase(pkg)}
      disabled={loading}
    >
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
      </View>

      {loading && selectedPackage === pkg.id ? (
        <View style={styles.loadingButton}>
          <ActivityIndicator color="white" size="small" />
                              <Text style={styles.loadingText}>{t('processing')}</Text>
        </View>
      ) : (
        <View style={styles.purchaseButton}>
                              <Text style={styles.purchaseButtonText}>{t('buy')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Always navigate to Home to avoid navigation stack issues
            navigation.navigate('Home');
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('purchaseTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Current Credits */}
      <View style={styles.currentCreditsContainer}>
        <View style={styles.currentCreditsBox}>
          <Ionicons name="wallet" size={24} color="#1a1a1a" />
          <View style={styles.currentCreditsInfo}>
            <Text style={styles.currentCreditsNumber}>{currentCredits}</Text>
            <Text style={styles.currentCreditsText}>{language === 'tr' ? 'Mevcut Kredi' : 'Current Credits'}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#6b7280" />
            <Text style={styles.infoTitle}>{t('howItWorks')}</Text>
          </View>
          <Text style={styles.infoText}>
            {t('howItWorksDescription')}
          </Text>
        </View>

        {/* Packages */}
        <View style={styles.packagesSection}>
          <Text style={styles.sectionTitle}>{t('creditPackages')}</Text>
          {packages.map(renderPackage)}
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color="#6b7280" />
          <Text style={styles.restoreText}>{t('restorePurchases')}</Text>
        </TouchableOpacity>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            • {t('infoPoint1')}{'\n'}
            • {t('infoPoint2')}{'\n'}
            • {t('infoPoint3')}{'\n'}
            • {t('infoPoint4')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  currentCreditsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentCreditsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  currentCreditsInfo: {
    marginLeft: 12,
  },
  currentCreditsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  currentCreditsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40, // ScrollView için ekstra bottom padding
  },
  infoSection: {
    margin: 20,
    padding: 16,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  packagesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  popularPackage: {
    borderColor: '#4ade80',
    transform: [{ scale: 1.02 }],
  },
  selectedPackage: {
    borderColor: '#1a1a1a',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#4ade80',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  savingsBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  packageHeader: {
    marginBottom: 16,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  packageSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  creditsSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  priceOriginal: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'line-through',
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
    color: '#6b7280',
    marginLeft: 8,
  },
  purchaseButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButton: {
    backgroundColor: '#6b7280',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
  },
  restoreText: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
  },
  footerInfo: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
});

export default PurchaseScreen; 