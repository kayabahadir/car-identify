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

  // İndirimli fiyat gösterimi için original fiyatları hesapla
  const getOriginalPrice = (currentPrice, savingsPercent) => {
    try {
      if (!currentPrice || savingsPercent === 0 || savingsPercent >= 100) {
        return currentPrice;
      }
      
      // $ veya ₺ sembolünü çıkar ve sayıyı al
      const numericPrice = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
      if (isNaN(numericPrice) || numericPrice <= 0) {
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
      console.error('❌ Error in getOriginalPrice:', error);
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
            const numericPrice = parseFloat(iapProduct.price.replace(/[^0-9.]/g, ''));
            if (!isNaN(numericPrice) && numericPrice > 0 && basePackage.credits > 0) {
              pricePerCredit = (numericPrice / basePackage.credits).toFixed(3);
            }
          } catch (error) {
            console.error('❌ Error calculating price per credit:', error);
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
        console.error('❌ Error processing package:', basePackage.id, error);
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
        console.log('📦 Loading CONSUMABLE IAP products...');
      }

      const available = await IAPService.isAvailable();
      if (available) {
        // IAP service'i initialize et ve products yükle
        await IAPService.initialize();
        const products = await IAPService.getProducts();
        
        if (__DEV__) {
          console.log('📦 Loaded CONSUMABLE IAP products:', products);
          console.log('🔍 Products count:', products?.length || 0);
        }

        if (products && products.length > 0) {
          setIapProducts(products);
          if (__DEV__) {
            products.forEach(product => {
              console.log(`💰 CONSUMABLE ${product.productId}: ${product.price || 'No price'}`);
            });
          }
        } else {
          // Products yüklenemedi, fallback kullan
          if (__DEV__) {
            console.log('⚠️ No CONSUMABLE products loaded from IAP, using fallback');
          }
          setFallbackProducts();
        }
      } else {
        // Demo mode - fallback fiyatları
        if (__DEV__) {
          console.log('🔧 IAP not available, using fallback prices for CONSUMABLE demo mode');
        }
        setFallbackProducts();
      }
    } catch (error) {
      console.error('❌ Error loading CONSUMABLE IAP products:', error);
      setFallbackProducts();
    }
  };

  const setFallbackProducts = () => {
    // Apple Store fiyatları (App Store Connect'ten güncel)
    const fallbackProducts = [
      { productId: 'com.caridentify.credits.pack10', price: '₺99,99' },
      { productId: 'com.caridentify.credits.pack50', price: '₺289,99' },
      { productId: 'com.caridentify.credits.pack200', price: '₺829,99' }
    ];
    setIapProducts(fallbackProducts);
    if (__DEV__) {
      console.log('🔧 Using fallback CONSUMABLE products:', fallbackProducts);
    }
  };

  const handlePurchase = async (packageInfo) => {
    console.log('🛒 Starting CONSUMABLE purchase for:', packageInfo);
    setLoading(true);
    setSelectedPackage(packageInfo.id);

    try {
      console.log('🔍 Checking CONSUMABLE IAP availability...');
      const iapAvailable = await IAPService.isAvailable();
      console.log('🔍 CONSUMABLE IAP available:', iapAvailable);
      
      if (iapAvailable) {
        try {
          console.log('💳 Starting CONSUMABLE purchase process...');
          
          // Safer approach - check if IAP module exists
          if (!InAppPurchases) {
            console.log('🔧 Using mock CONSUMABLE purchase (no IAP module)');
            // Mock purchase for demo
            await new Promise(resolve => setTimeout(resolve, 2000));
            await FirstTimeService.markFreeAnalysisUsed();
            
            Alert.alert(
              `🎉 Demo Purchase Success`,
              `Mock CONSUMABLE purchase completed for ${packageInfo.credits} credits.`,
              [{ 
                text: 'OK', 
                onPress: () => navigation.navigate('Home', { forceRefresh: Date.now() })
              }]
            );
            return;
          }
          
          // Real IAP purchase
          console.log('💳 Calling IAPService.purchaseProduct for CONSUMABLE...');
          const purchaseResult = await IAPService.purchaseProduct(packageInfo.id);
          console.log('✅ CONSUMABLE Purchase completed successfully:', purchaseResult);
          
          // Mark free analysis as used
          await FirstTimeService.markFreeAnalysisUsed();
          
          // CONSUMABLE purchase - her zaman yeni satın alma
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
          console.error('❌ CONSUMABLE Purchase error details:', purchaseError);
          
          // Satın alma hatası (user cancel, payment fail vs.)
          if (purchaseError.message?.includes('iptal') || 
              purchaseError.message?.includes('cancel') ||
              purchaseError.message?.includes('cancelled')) {
            console.log('ℹ️ User cancelled CONSUMABLE purchase');
            return;
          }
          throw purchaseError; // Diğer hatalar için dışarıya fırlat
        }
      } else {
        console.log('⚠️ CONSUMABLE IAP not available');
        Alert.alert(
          t('unavailable') || 'Kullanılamıyor',
          t('iapUnavailable') || 'Satın almalar şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.'
        );
      }

    } catch (error) {
      console.error('❌ Critical CONSUMABLE purchase error:', error);
      console.error('❌ Error stack:', error.stack);
      
      Alert.alert(
        'Satın Alma Hatası',
        `Hata: ${error.message || 'Bilinmeyen hata'}\n\nLütfen tekrar deneyin veya uygulama geliştiricisi ile iletişime geçin.`,
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
      setSelectedPackage(null);
      
      // Kredi sayısını güncelle (biraz gecikme ile)  
      setTimeout(async () => {
        await loadCurrentCredits();
        console.log('🔄 Credits refreshed after CONSUMABLE purchase');
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
        <Text style={styles.headerTitle}>{t('buyCredits')}</Text>
        <View style={styles.placeholder} />
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

          {/* CONSUMABLE ürünlerde restore butonu yok */}
          
          {/* Footer Info */}
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