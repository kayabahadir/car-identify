import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../contexts/LanguageContext';
import CreditService from '../services/creditService';
import FirstTimeService from '../services/firstTimeService';
import IAPService from '../services/iapService';

const HomeScreen = ({ navigation, route }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [creditInfo, setCreditInfo] = useState({ canUse: false, type: 'none', creditsLeft: 0, message: '' });
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Sayfa yüklendiğinde kredi durumunu kontrol et
  useEffect(() => {
    checkCreditStatus();
    checkFirstTime();
    
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
                  // Gerçek IAP satın alma
                  await IAPService.purchaseProduct(packageInfo.id);
                  
                  // Ücretsiz analiz hakkını kullanılmış olarak işaretle (satın alma yaptığı için)
                  await FirstTimeService.markFreeAnalysisUsed();
                  
                  Alert.alert(
                    `🎉 ${t('purchaseSuccess')}`,
                    `${packageInfo.credits} ${t('purchaseSuccessMessage')}`,
                    [{ text: t('great'), onPress: () => checkCreditStatus() }]
                  );
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
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 24,
    paddingTop: 50,
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  titleContainer: {
    flex: 1,
    paddingLeft: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginRight: 10,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  settingsButton: {
    padding: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  statBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 0.48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  aiSystemContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 40,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  aiSystemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiSystemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  aiSystemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  aiSystemUpdate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 15,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginRight: 10,
  },
  confidenceFill: {
    width: '98%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
  },
  confidencePercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  takePhotoButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  takePhotoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  uploadButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  uploadText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  historyButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 16,
    alignSelf: 'center',
  },
  historyText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Kredi durumu stilleri
  creditContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  creditBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  creditBoxFree: {
    borderColor: '#4ade80',
    backgroundColor: '#f0fdf4',
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creditTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  creditTitleFree: {
    color: '#16a34a',
  },
  creditNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  creditNumberFree: {
    color: '#16a34a',
  },
  creditMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  buyCreditsButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buyCreditsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  purchaseLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
  },
});

export default HomeScreen; 