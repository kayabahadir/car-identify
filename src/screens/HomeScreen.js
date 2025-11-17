import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../contexts/LanguageContext';
import CreditService from '../services/creditService';
import FirstTimeService from '../services/firstTimeService';
import IAPService from '../services/iapService';

// Responsive design utilities
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768; // iPad threshold
const isLargeTablet = screenWidth >= 1024; // Large iPad threshold
const isSmallScreen = screenHeight < 700; // iPhone SE, Mini gibi küçük ekranlar
const isTallScreen = screenHeight > 850; // iPhone 15 Pro, 14 Pro Max gibi uzun ekranlar

// Responsive dimensions
const getResponsiveValue = (phoneValue, tabletValue, largeTabletValue = tabletValue) => {
  if (isLargeTablet) return largeTabletValue;
  if (isTablet) return tabletValue;
  return phoneValue;
};

// Responsive spacing
const getSpacing = (phone, tablet, largeTablet = tablet) => getResponsiveValue(phone, tablet, largeTablet);
const getFontSize = (phone, tablet, largeTablet = tablet) => getResponsiveValue(phone, tablet, largeTablet);
const getPadding = (phone, tablet, largeTablet = tablet) => getResponsiveValue(phone, tablet, largeTablet);
const getMargin = (phone, tablet, largeTablet = tablet) => getResponsiveValue(phone, tablet, largeTablet);
const getBorderRadius = (phone, tablet, largeTablet = tablet) => getResponsiveValue(phone, tablet, largeTablet);

const HomeScreen = ({ navigation, route }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [creditInfo, setCreditInfo] = useState({ canUse: false, type: 'none', creditsLeft: 0, message: '' });
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Sayfa yüklendiğinde kredi durumunu kontrol et
  useEffect(() => {
    checkCreditStatus();
    checkFirstTime();
    
    // Force refresh kontrolü (purchase'dan sonra)
    if (route?.params?.forceRefresh) {
      // Kısa gecikme ile force refresh
      setTimeout(() => {
        checkCreditStatus();
        navigation.setParams({ forceRefresh: null });
      }, 500);
    }
    
    // Onboarding'den gelen satın alma parametrelerini kontrol et
    if (route?.params?.purchasePackage && route?.params?.fromOnboarding) {
      handleOnboardingPurchase(route.params.purchasePackage);
      // Parametreleri temizle
      navigation.setParams({ purchasePackage: null, fromOnboarding: null });
    }
  }, [route?.params]);

  // Sayfa odaklandığında kredi durumunu yenile
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 HomeScreen focused - refreshing credit status');
      checkCreditStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const checkCreditStatus = async () => {
    try {
      const status = await CreditService.canAnalyze();
      setCreditInfo(status);
    } catch (error) {
      console.error('Error checking credit status:', error);
    }
  };

  const checkFirstTime = async () => {
    try {
      const isFirst = await FirstTimeService.isFirstLaunch();
      setIsFirstTime(isFirst);
      // Onboarding artık ilk açılışta gösteriliyor, burada mesaj göstermiyoruz
    } catch (error) {
      console.error('Error checking first time:', error);
    }
  };

  // Geliştirici modu fonksiyonları Settings'e taşındı

  // Onboarding'den gelen satın alma işlemini handle et
  const handleOnboardingPurchase = async (packageId) => {
    setPurchaseLoading(true);
    
    // Paket bilgilerini al
    const packages = {
      'credits_10_199': {
        id: 'credits_10_199',
        credits: 10,
        price: '$1.99',
        priceLocal: '₺59.99',
        title: 'Başlangıç',
      },
      'credits_50_699': {
        id: 'credits_50_699', 
        credits: 50,
        price: '$6.99',
        priceLocal: '₺199.99',
        title: 'Popüler',
      },
      'credits_200_1999': {
        id: 'credits_200_1999',
        credits: 200,
        price: '$19.99', 
        priceLocal: '₺599.99',
        title: 'Premium',
      }
    };

    const packageInfo = packages[packageId];
    
    try {
      Alert.alert(
        `🎉 ${t('purchaseConfirmation')}`,
        `${packageInfo.title} ${t('purchaseConfirmationMessage')
          .replace('#CREDITS#', packageInfo.credits)
          .replace('#PRICE#', packageInfo.priceLocal)}`,
        [
          {
            text: t('cancel'),
            style: 'cancel',
            onPress: () => setPurchaseLoading(false)
          },
          {
            text: t('buy'),
            onPress: async () => {
              try {
                const iapAvailable = await IAPService.isAvailable();
                
                if (iapAvailable) {
                  try {
                    // Basit purchase
                    await IAPService.purchaseProduct(packageInfo.id);
                    
                    // Apple UI kapandı, hemen success göster
                    await FirstTimeService.markFreeAnalysisUsed();
                    
                    Alert.alert(
                      `🎉 ${t('purchaseSuccess')}`,
                      `${packageInfo.credits} ${t('purchaseSuccessMessage')}`,
                      [{ text: t('great') }]
                    );
                    
                    // Background'da UI refresh
                    setTimeout(async () => {
                      await checkCreditStatus();
                    }, 1000);
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
              } catch (error) {
                console.error('Purchase error:', error);
                Alert.alert(t('error'), t('purchaseError'));
              } finally {
                setPurchaseLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error handling onboarding purchase:', error);
      setPurchaseLoading(false);
    }
  };

  const handleAnalysisAttempt = async (imagePickerFunction) => {
    try {
      // Kredi durumunu tekrar kontrol et
      const status = await CreditService.canAnalyze();
      
      if (!status.canUse) {
        Alert.alert(
          t('insufficientCredits') || 'Yetersiz Kredi',
          status.message,
          [
            { text: t('cancel') || 'İptal', style: 'cancel' },
            { 
              text: t('buyCredits') || 'Kredi Satın Al', 
              onPress: () => navigation.navigate('Purchase')
            }
          ]
        );
        return;
      }

      // Foto çekme/seçme işlemini başlat
      await imagePickerFunction();
      
    } catch (error) {
      console.error('Error in analysis attempt:', error);
      Alert.alert(t('error') || 'Hata', t('tryAgain') || 'Lütfen tekrar deneyin.');
    }
  };

  const actualTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionRequired'), t('cameraPermission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        // Navigate to result screen with resized/compressed image
        navigation.navigate('Result', { imageUri: manipulated.uri, imageBase64: manipulated.base64 });
        // Kredi durumunu yenile
        setTimeout(checkCreditStatus, 1000);
      }
    } catch (error) {
      Alert.alert(t('error'), t('failedTakePhoto'));
    }
  };

  const handleTakePhoto = () => handleAnalysisAttempt(actualTakePhoto);

  const actualUploadFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionRequired'), t('galleryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        // Navigate to result screen with resized/compressed image
        navigation.navigate('Result', { imageUri: manipulated.uri, imageBase64: manipulated.base64 });
        // Kredi durumunu yenile
        setTimeout(checkCreditStatus, 1000);
      }
    } catch (error) {
      Alert.alert(t('error'), t('failedSelectImage'));
    }
  };

  const handleUploadFromGallery = () => handleAnalysisAttempt(actualUploadFromGallery);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('appTitle')}</Text>
          <Text style={styles.subtitle}>{t('appSubtitle')}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
            <Text style={styles.languageText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >

      {/* Kredi Durumu */}
      <View style={styles.creditContainer}>
        <View style={[styles.creditBox, creditInfo.type === 'free' && styles.creditBoxFree]}>
          {purchaseLoading && (
            <View style={styles.purchaseLoadingOverlay}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={styles.purchaseLoadingText}>{t('purchaseProcessing')}</Text>
            </View>
          )}
          
          <View style={styles.creditHeader}>
            <Ionicons 
              name={creditInfo.type === 'free' ? 'gift' : 'wallet'} 
              size={20} 
              color={creditInfo.type === 'free' ? '#4ade80' : '#1a1a1a'} 
            />
            <Text style={[styles.creditTitle, creditInfo.type === 'free' && styles.creditTitleFree]}>
              {creditInfo.type === 'free' ? t('freeAnalysis') : t('credits')}
            </Text>
          </View>
          <Text style={[styles.creditNumber, creditInfo.type === 'free' && styles.creditNumberFree]}>
            {creditInfo.type === 'free' ? '1' : creditInfo.creditsLeft}
          </Text>
          <Text style={styles.creditMessage}>
            {creditInfo.type === 'free' ? t('firstAnalysisFree') : 
             creditInfo.creditsLeft > 0 ? `${creditInfo.creditsLeft} ${t('analysisRightsRemaining')}` : 
             t('needCreditsToAnalyze')}
          </Text>
          {!creditInfo.canUse && (
            <TouchableOpacity 
              style={styles.buyCreditsButton}
              onPress={() => navigation.navigate('Purchase')}
              disabled={purchaseLoading}
            >
              <Text style={styles.buyCreditsText}>{t('buyCredits')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>2,847,392</Text>
          <Text style={styles.statLabel}>{t('carsAnalyzed')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>97.8%</Text>
          <Text style={styles.statLabel}>{t('accuracyRate')}</Text>
        </View>
        {/* iPad'de ekstra stat box ekle */}
        {isTablet && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>{t('support') || 'Destek'}</Text>
          </View>
        )}
      </View>

      <View style={styles.aiSystemContainer}>
        <View style={styles.aiSystemHeader}>
          <Text style={styles.aiSystemTitle}>{t('aiRecognitionSystem')}</Text>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{t('online')}</Text>
          </View>
        </View>
        <Text style={styles.aiSystemDescription}>
          {t('aiDescription')}
        </Text>
        <Text style={styles.aiSystemUpdate}>
          {t('aiUpdate')}
        </Text>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>{t('confidenceLevel')}</Text>
          <View style={styles.confidenceBar}>
            <View style={styles.confidenceFill} />
          </View>
          <Text style={styles.confidencePercent}>98%</Text>
        </View>
      </View>



      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.takePhotoButton} 
          onPress={handleTakePhoto}
          disabled={purchaseLoading}
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.takePhotoText}>{t('takePhoto')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={handleUploadFromGallery}
          disabled={purchaseLoading}
        >
          <Ionicons name="cloud-upload-outline" size={24} color="#333" />
          <Text style={styles.uploadText}>{t('uploadFromGallery')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.historyButton} 
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="time-outline" size={18} color="#333" />
          <Text style={styles.historyText}>{t('history')}</Text>
        </TouchableOpacity>
      </View>

      {/* Geliştirici modu artık Settings'de */}
      {false && (
        <View style={styles.developerContainer}>
          <Text style={styles.developerTitle}>🧪 Geliştirici Modu</Text>
          <Text style={styles.developerSubtitle}>
            {creditInfo.type === 'developer' 
              ? 'Sınırsız analiz aktif!' 
              : 'Test için geliştirici modunu aktif edin'
            }
          </Text>
          
          <View style={styles.developerButtons}>
            {creditInfo.type !== 'developer' ? (
              <TouchableOpacity 
                style={styles.developerButton} 
                onPress={enableDeveloperMode}
              >
                <Ionicons name="rocket" size={16} color="white" />
                <Text style={styles.developerButtonText}>Geliştirici Modu Aktif Et</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.developerButton} 
                onPress={disableDeveloperMode}
              >
                <Ionicons name="close-circle" size={16} color="white" />
                <Text style={styles.developerButtonText}>Geliştirici Modu Kapat</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.developerButtonSecondary} 
              onPress={addTestCredits}
            >
              <Ionicons name="add-circle" size={16} color="#333" />
              <Text style={styles.developerButtonTextSecondary}>+100 Test Kredisi</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.developerButtonSecondary} 
              onPress={resetForTesting}
            >
              <Ionicons name="refresh" size={16} color="#333" />
              <Text style={styles.developerButtonTextSecondary}>Test Verilerini Sıfırla</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </ScrollView>
     </View>
   );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: getPadding(24, 40, 60),
    paddingTop: getPadding(20, 30, 40),
    paddingBottom: getPadding(100, 120, 150), // Ekstra bottom padding ScrollView için
    // iPad Mini için ek optimizasyon
    ...(isTablet && !isLargeTablet && { 
      paddingTop: getPadding(15, 25, 35),
      paddingBottom: getPadding(80, 100, 120)
    }),
    // Küçük ekranlar için daha az padding
    ...(isSmallScreen && {
      paddingTop: getPadding(10, 15, 25),
      paddingBottom: getPadding(60, 80, 100),
      paddingHorizontal: getPadding(16, 24, 40)
    }),
    // Uzun ekranlar için daha fazla spacing
    ...(isTallScreen && !isTablet && {
      paddingTop: getPadding(30, 40, 50),
      paddingBottom: getPadding(120, 140, 160)
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getPadding(24, 40, 60),
    paddingTop: getPadding(50, 60, 80),
    paddingBottom: getPadding(20, 25, 30),
    backgroundColor: '#f8f9fa',
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingTop: getPadding(30, 40, 50),
      paddingBottom: getPadding(15, 20, 25)
    }),
    // Küçük ekranlar için daha az padding
    ...(isSmallScreen && {
      paddingTop: getPadding(40, 50, 60),
      paddingBottom: getPadding(15, 20, 25),
      paddingHorizontal: getPadding(16, 24, 40)
    }),
    // Uzun ekranlar için daha fazla top padding
    ...(isTallScreen && !isTablet && {
      paddingTop: getPadding(60, 70, 90),
      paddingBottom: getPadding(25, 30, 35)
    }),
  },
  titleContainer: {
    flex: 1,
    paddingLeft: getPadding(10, 15, 20),
  },
  title: {
    fontSize: getFontSize(32, 40, 48),
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: getMargin(5, 8, 10),
    // iPad Mini için daha küçük
    ...(isTablet && !isLargeTablet && { 
      fontSize: getFontSize(24, 32, 40),
      marginBottom: getMargin(3, 6, 8)
    }),
  },
  subtitle: {
    fontSize: getFontSize(16, 18, 20),
    color: '#666',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageButton: {
    paddingHorizontal: getPadding(12, 16, 20),
    paddingVertical: getPadding(6, 8, 10),
    backgroundColor: '#f3f4f6',
    borderRadius: getBorderRadius(12, 16, 20),
    marginRight: getMargin(10, 15, 20),
  },
  languageText: {
    fontSize: getFontSize(12, 14, 16),
    fontWeight: '600',
    color: '#374151',
  },
  settingsButton: {
    padding: getPadding(10, 12, 15),
  },
  statsContainer: {
    flexDirection: isTablet ? 'row' : 'row',
    justifyContent: 'space-between',
    marginBottom: getMargin(40, 50, 60),
    paddingHorizontal: getPadding(4, 8, 12),
    // iPad'de daha geniş spacing
    gap: getSpacing(0, 20, 30),
    // iPad'de wrap yap
    flexWrap: isTablet ? 'wrap' : 'nowrap',
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { marginBottom: getMargin(20, 30, 40) }),
  },
  statBox: {
    backgroundColor: 'white',
    borderRadius: getBorderRadius(16, 20, 24),
    padding: getPadding(20, 30, 40),
    alignItems: 'center',
    flex: isTablet ? 0.31 : 0.48, // iPad'de 3 box için
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getSpacing(8, 12, 16),
    elevation: 5,
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(80, 120, 150),
    // iPad'de margin ekle
    marginBottom: isTablet ? getMargin(0, 10, 15) : 0,
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      padding: getPadding(16, 24, 32),
      minHeight: getSpacing(60, 100, 130)
    }),
  },
  statNumber: {
    fontSize: getFontSize(24, 32, 40),
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: getMargin(5, 8, 10),
  },
  statLabel: {
    fontSize: getFontSize(14, 16, 18),
    color: '#666',
  },
  aiSystemContainer: {
    backgroundColor: 'white',
    borderRadius: getBorderRadius(16, 20, 24),
    padding: getPadding(24, 32, 40),
    marginBottom: getMargin(40, 50, 60),
    marginHorizontal: getMargin(4, 8, 12),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getSpacing(8, 12, 16),
    elevation: 5,
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      padding: getPadding(16, 24, 32),
      marginBottom: getMargin(20, 30, 40) 
    }),
  },
  aiSystemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getMargin(10, 15, 20),
  },
  aiSystemTitle: {
    fontSize: getFontSize(18, 22, 26),
    fontWeight: '600',
    color: '#1a1a1a',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: getPadding(12, 16, 20),
    paddingVertical: getPadding(4, 6, 8),
    borderRadius: getBorderRadius(12, 16, 20),
  },
  onlineDot: {
    width: getSpacing(8, 10, 12),
    height: getSpacing(8, 10, 12),
    borderRadius: getSpacing(4, 5, 6),
    backgroundColor: '#4ade80',
    marginRight: getMargin(6, 8, 10),
  },
  onlineText: {
    fontSize: getFontSize(12, 14, 16),
    color: '#16a34a',
    fontWeight: '500',
  },
  aiSystemDescription: {
    fontSize: getFontSize(14, 16, 18),
    color: '#666',
    marginBottom: getMargin(5, 8, 10),
  },
  aiSystemUpdate: {
    fontSize: getFontSize(12, 14, 16),
    color: '#888',
    marginBottom: getMargin(15, 20, 25),
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: getFontSize(14, 16, 18),
    color: '#666',
    marginRight: getMargin(10, 15, 20),
  },
  confidenceBar: {
    flex: 1,
    height: getSpacing(6, 8, 10),
    backgroundColor: '#e5e7eb',
    borderRadius: getSpacing(3, 4, 5),
    marginRight: getMargin(10, 15, 20),
  },
  confidenceFill: {
    width: '98%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: getSpacing(3, 4, 5),
  },
  confidencePercent: {
    fontSize: getFontSize(14, 16, 18),
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionContainer: {
    justifyContent: 'center',
    paddingHorizontal: getPadding(4, 8, 12),
    paddingBottom: getPadding(20, 30, 40),
    // Web'de scroll için margin kaldırıldı
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingBottom: getPadding(15, 25, 35)
    }),
  },
  takePhotoButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: getBorderRadius(16, 20, 24),
    paddingVertical: getPadding(22, 28, 35),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getMargin(16, 20, 25),
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(60, 80, 100),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingVertical: getPadding(18, 24, 30),
      minHeight: getSpacing(50, 70, 90)
    }),
  },
  takePhotoText: {
    color: 'white',
    fontSize: getFontSize(18, 22, 26),
    fontWeight: '600',
    marginLeft: getMargin(10, 15, 20),
  },
  uploadButton: {
    backgroundColor: 'white',
    borderRadius: getBorderRadius(16, 20, 24),
    paddingVertical: getPadding(22, 28, 35),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(60, 80, 100),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingVertical: getPadding(18, 24, 30),
      minHeight: getSpacing(50, 70, 90)
    }),
  },
  uploadText: {
    color: '#333',
    fontSize: getFontSize(18, 22, 26),
    fontWeight: '600',
    marginLeft: getMargin(10, 15, 20),
  },
  historyButton: {
    backgroundColor: 'white',
    borderRadius: getBorderRadius(12, 16, 20),
    paddingVertical: getPadding(11, 15, 20),
    paddingHorizontal: getPadding(20, 28, 35),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: getMargin(16, 20, 25),
    alignSelf: 'center',
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(45, 60, 75),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingVertical: getPadding(9, 13, 18),
      paddingHorizontal: getPadding(16, 24, 30),
      minHeight: getSpacing(40, 55, 70)
    }),
  },
  historyText: {
    color: '#333',
    fontSize: getFontSize(14, 16, 18),
    fontWeight: '600',
    marginLeft: getMargin(8, 12, 15),
  },
  // Kredi durumu stilleri
  creditContainer: {
    marginBottom: getMargin(20, 25, 30),
    paddingHorizontal: getPadding(4, 8, 12),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { marginBottom: getMargin(10, 15, 20) }),
  },
  creditBox: {
    backgroundColor: 'white',
    borderRadius: getBorderRadius(16, 20, 24),
    padding: getPadding(20, 30, 40),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getSpacing(8, 12, 16),
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(100, 140, 180),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      padding: getPadding(12, 20, 28),
      minHeight: getSpacing(60, 100, 140)
    }),
  },
  creditBoxFree: {
    borderColor: '#4ade80',
    backgroundColor: '#f0fdf4',
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getMargin(8, 12, 15),
  },
  creditTitle: {
    fontSize: getFontSize(16, 18, 20),
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: getMargin(8, 12, 15),
  },
  creditTitleFree: {
    color: '#16a34a',
  },
  creditNumber: {
    fontSize: getFontSize(28, 36, 44),
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: getMargin(4, 6, 8),
  },
  creditNumberFree: {
    color: '#16a34a',
  },
  creditMessage: {
    fontSize: getFontSize(14, 16, 18),
    color: '#666',
    marginBottom: getMargin(12, 16, 20),
  },
  buyCreditsButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: getBorderRadius(12, 16, 20),
    paddingVertical: getPadding(12, 16, 20),
    paddingHorizontal: getPadding(20, 28, 35),
    alignItems: 'center',
    justifyContent: 'center',
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(45, 60, 75),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingVertical: getPadding(10, 14, 18),
      paddingHorizontal: getPadding(16, 24, 30),
      minHeight: getSpacing(40, 55, 70)
    }),
  },
  // Geliştirici modu stilleri
  developerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: getBorderRadius(16, 20, 24),
    padding: getPadding(20, 30, 40),
    marginTop: getMargin(20, 25, 30),
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      padding: getPadding(16, 24, 32),
      marginTop: getMargin(15, 20, 25)
    }),
  },
  developerTitle: {
    fontSize: getFontSize(18, 22, 26),
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: getMargin(8, 12, 15),
    textAlign: 'center',
  },
  developerSubtitle: {
    fontSize: getFontSize(14, 16, 18),
    color: '#666',
    marginBottom: getMargin(16, 20, 25),
    textAlign: 'center',
  },
  developerButtons: {
    flexDirection: 'column',
    gap: getSpacing(12, 16, 20),
  },
  developerButton: {
    backgroundColor: '#3b82f6',
    borderRadius: getBorderRadius(12, 16, 20),
    paddingVertical: getPadding(12, 16, 20),
    paddingHorizontal: getPadding(20, 28, 35),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(45, 60, 75),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingVertical: getPadding(10, 14, 18),
      paddingHorizontal: getPadding(16, 24, 30),
      minHeight: getSpacing(40, 55, 70)
    }),
  },
  developerButtonSecondary: {
    backgroundColor: 'white',
    borderRadius: getBorderRadius(12, 16, 20),
    paddingVertical: getPadding(12, 16, 20),
    paddingHorizontal: getPadding(20, 28, 35),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(45, 60, 75),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingVertical: getPadding(10, 14, 18),
      paddingHorizontal: getPadding(16, 24, 30),
      minHeight: getSpacing(40, 55, 70)
    }),
  },
  developerButtonText: {
    color: 'white',
    fontSize: getFontSize(14, 16, 18),
    fontWeight: '600',
    marginLeft: getMargin(8, 12, 15),
  },
  developerButtonTextSecondary: {
    color: '#333',
    fontSize: getFontSize(14, 16, 18),
    fontWeight: '600',
    marginLeft: getMargin(8, 12, 15),
  },
  buyCreditsText: {
    color: 'white',
    fontSize: getFontSize(14, 16, 18),
    fontWeight: '600',
  },
  purchaseLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: getBorderRadius(16, 20, 24),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  purchaseLoadingText: {
    marginTop: getMargin(10, 15, 20),
    fontSize: getFontSize(14, 16, 18),
    color: '#4f46e5',
    fontWeight: '600',
  },
});

export default HomeScreen; 