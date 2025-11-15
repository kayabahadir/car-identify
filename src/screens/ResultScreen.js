import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { identifyVehicle, getMockVehicleData, convertToLegacyFormat } from '../services/openaiService';
import { useLanguage } from '../contexts/LanguageContext';
import { saveAnalysisToHistory } from '../services/historyService';
import SkeletonLoader from '../components/SkeletonLoader';

// Responsive design utilities
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768; // iPad threshold
const isLargeTablet = screenWidth >= 1024; // Large iPad threshold

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

const ResultScreen = ({ navigation, route }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleData, setVehicleData] = useState(null);
  const [originalData, setOriginalData] = useState(null); // Store original data for re-translation
  const { imageUri, imageBase64, historyData } = route.params;

  const tabs = [t('overview'), t('specs'), t('trim'), t('audience'), t('issues')];

  useEffect(() => {
    const analyzeVehicle = async () => {
      // If we have history data, use it directly (viewing from history)
      if (historyData) {
        setVehicleData(historyData);
        setOriginalData(historyData._dualData);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get dual language data from API (prefer base64 if available)
        const result = await identifyVehicle({ imageUri, imageBase64 }, language);
        
        // Add production years if not provided
        if (!result.productionYears && result.year) {
          const year = parseInt(result.year);
          result.productionYears = `${year-1}-${year+2}`;
        }
        
        setOriginalData(result._dualData); // Store dual language data
        setVehicleData(result);
        setIsLoading(false);

        // Save to history if this is a new analysis
        await saveAnalysisToHistory({
          imageUri,
          vehicleData: result
        });
      } catch (error) {
        console.log('OpenAI identification failed, using mock data:', error.message);
        
        // Show appropriate alert based on error type
        let alertTitle = t('demoMode');
        let alertMessage = language === 'tr' ? 'Analiz hatası.' : 'Analysis error.';
        let shouldShowDemo = __DEV__; // Only show demo in development mode
        
        if (error.message.includes('API key not configured')) {
          alertMessage = language === 'tr' 
            ? (__DEV__
              ? 'OpenAI API anahtarı yapılandırılmamış. Demo sonuçları gösteriliyor. Gerçek analiz için EXPO_PUBLIC_OPENAI_API_KEY ortam değişkenini EAS Secrets ile ayarlayın veya güvenli bir backend proxy kullanın.'
              : 'OpenAI API anahtarı yapılandırılmamış. Lütfen uygulamayı güncelleyin veya desteğe başvurun.')
            : (__DEV__
              ? 'OpenAI API key not configured. Showing demo results. For real analysis, set EXPO_PUBLIC_OPENAI_API_KEY via EAS Secrets or use a secure backend proxy.'
              : 'OpenAI API key not configured. Please update the app or contact support.');
        } else if (error.message.includes('Response missing language data structure')) {
          alertTitle = t('analysisIssue');
          alertMessage = language === 'tr'
            ? (__DEV__
              ? 'AI servisi eksik veri döndürdü. Bunun yerine demo sonuçları gösteriliyor. Lütfen daha net bir fotoğraf çekmeyi deneyin.'
              : 'AI servisi eksik veri döndürdü. Lütfen daha net bir fotoğraf çekmeyi deneyin.')
            : (__DEV__
              ? 'The AI service returned incomplete data. Showing demo results instead. Please try taking a clearer photo.'
              : 'The AI service returned incomplete data. Please try taking a clearer photo.');
        } else if (error.message.includes('Could not parse')) {
          alertTitle = t('processingError');
          alertMessage = language === 'tr'
            ? (__DEV__
              ? 'AI yanıtı işlenemiyor. Demo sonuçları gösteriliyor. Lütfen tekrar deneyin.'
              : 'AI yanıtı işlenemiyor. Lütfen tekrar deneyin.')
            : (__DEV__
              ? 'Unable to process the AI response. Showing demo results. Please try again.'
              : 'Unable to process the AI response. Please try again.');
        } else if (error.message.includes('INSUFFICIENT_CREDITS')) {
          alertTitle = t('insufficientCredits') || 'Yetersiz Kredi';
          alertMessage = t('insufficientCreditsMessage');
          
          Alert.alert(alertTitle, alertMessage, [
            { text: t('cancel') || 'İptal', style: 'cancel', onPress: () => navigation.goBack() },
            { 
              text: t('buyCredits') || 'Kredi Satın Al', 
              onPress: () => {
                navigation.navigate('Purchase');
              }
            }
          ]);
          setIsLoading(false);
          return; // Don't show demo data for credit issues
        } else if (error.message.includes('Network')) {
          alertTitle = t('connectionError');
          alertMessage = language === 'tr'
            ? (__DEV__
              ? 'Ağ bağlantı sorunu. Demo sonuçları gösteriliyor. Lütfen internet bağlantınızı kontrol edin.'
              : 'Ağ bağlantı sorunu. Lütfen internet bağlantınızı kontrol edin.')
            : (__DEV__
              ? 'Network connection issue. Showing demo results. Please check your internet connection.'
              : 'Network connection issue. Please check your internet connection.');
        }
        
        // Production'da demo mode'a düşme - direkt hata göster ve geri dön
        if (!shouldShowDemo) {
          Alert.alert(alertTitle, alertMessage, [
            { 
              text: 'OK', 
              onPress: () => navigation.goBack() 
            }
          ]);
          setIsLoading(false);
          return;
        }
        
        // Development mode: Fall back to mock data with current language
        Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
        
        setTimeout(async () => {
          const mockData = getMockVehicleData(language);
          setOriginalData(mockData._dualData); // Store dual language data
          setVehicleData(mockData);
          setIsLoading(false);

          // Save mock data to history if this is a new analysis
          await saveAnalysisToHistory({
            imageUri,
            vehicleData: mockData
          });
        }, 1500);
      }
    };

    analyzeVehicle();
  }, [imageUri, historyData]);

  // Switch language using dual data (no translation needed!)
  useEffect(() => {
    if (originalData && !isLoading) {
      let targetData = language === 'tr' ? originalData.turkish : originalData.english;
      
      // Convert to legacy format for UI compatibility  
      targetData = convertToLegacyFormat(targetData);
      
      // Add production years if not provided
      if (!targetData.productionYears && targetData.year) {
        const year = parseInt(targetData.year);
        targetData.productionYears = `${year-1}-${year+2}`;
      }
      
      // Keep dual data reference for future switches
      targetData._dualData = originalData;
      setVehicleData(targetData);
    }
  }, [language, originalData, isLoading]);

  const renderTabContent = () => {
    if (isLoading || !vehicleData) {
      return (
        <View style={styles.skeletonWrapper}>
          <Text style={styles.loadingResultsText}>{t('loadingResults')}</Text>
          <SkeletonLoader />
        </View>
      );
    }

    switch (activeTabIndex) {
      case 0:
        return (
          <View style={styles.tabContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('makeModel')}</Text>
              <Text style={styles.infoValue}>{vehicleData.make} {vehicleData.model} (G20)</Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('productionYears')}</Text>
              <Text style={styles.infoValue}>{vehicleData.productionYears || vehicleData.year}</Text>
            </View>
            {vehicleData.dimensions && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>{t('dimensions')}</Text>
                <Text style={styles.infoValue}>{vehicleData.dimensions}</Text>
              </View>
            )}
            {vehicleData.trunkCapacity && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>{t('trunkCapacity')}</Text>
                <Text style={styles.infoValue}>{vehicleData.trunkCapacity}</Text>
              </View>
            )}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('generation')}</Text>
              <Text style={styles.infoValue}>{vehicleData.generation}</Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('bodyType')}</Text>
              <Text style={styles.infoValue}>{vehicleData.bodyType}</Text>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.tabContent}>
            {/* Motor & Güç Kategorisi */}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Ionicons name="car-outline" size={20} color="#1a1a1a" />
                </View>
                <Text style={styles.categoryTitle}>{t('motorAndPower')}</Text>
              </View>
              <View style={styles.categoryContent}>
                <View style={styles.specCard}>
                  <Text style={styles.specLabel}>{t('engine')}</Text>
                  <Text style={styles.specValue}>{vehicleData.engine}</Text>
                </View>
                <View style={styles.specCard}>
                  <Text style={styles.specLabel}>{t('power')}</Text>
                  <Text style={styles.specValue}>{vehicleData.power}</Text>
                </View>
                <View style={[styles.specCard, styles.lastSpecCard]}>
                  <Text style={styles.specLabel}>{t('fuelType')}</Text>
                  <Text style={styles.specValue}>{vehicleData.fuelType}</Text>
                </View>
              </View>
            </View>

            {/* Performans Kategorisi */}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Ionicons name="speedometer-outline" size={20} color="#1a1a1a" />
                </View>
                <Text style={styles.categoryTitle}>{t('performance')}</Text>
              </View>
              <View style={styles.categoryContent}>
                <View style={styles.specCard}>
                  <Text style={styles.specLabel}>{t('acceleration')}</Text>
                  <Text style={styles.specValue}>{vehicleData.acceleration}</Text>
                </View>
                <View style={[styles.specCard, styles.lastSpecCard]}>
                  <Text style={styles.specLabel}>{t('topSpeed')}</Text>
                  <Text style={styles.specValue}>{vehicleData.topSpeed}</Text>
                </View>
              </View>
            </View>

            {/* Şanzıman & Yakıt Kategorisi */}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Ionicons name="settings-outline" size={20} color="#1a1a1a" />
                </View>
                <Text style={styles.categoryTitle}>{t('transmissionAndFuel')}</Text>
              </View>
              <View style={styles.categoryContent}>
                <View style={styles.specCard}>
                  <Text style={styles.specLabel}>{t('transmission')}</Text>
                  <Text style={styles.specValue}>{vehicleData.transmission}</Text>
                </View>
                <View style={[styles.specCard, styles.lastSpecCard]}>
                  <Text style={styles.specLabel}>{t('fuelEconomy')}</Text>
                  <Text style={styles.specValue}>{vehicleData.fuelEconomy}</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.tabContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('baseTrim')}</Text>
              <Text style={styles.infoValue}>{vehicleData.baseTrim}</Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('availableTrims')}</Text>
              <View style={styles.trimContainer}>
                {vehicleData.availableTrims.map((trim, index) => (
                  <View key={index} style={styles.trimBadge}>
                    <Text style={styles.trimText}>{trim}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('standardFeatures')}</Text>
              {vehicleData.standardFeatures.map((feature, index) => (
                <Text key={index} style={styles.featureItem}>• {feature}</Text>
              ))}
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('optionalPackages')}</Text>
              <View style={styles.packageContainer}>
                {vehicleData.optionalPackages && vehicleData.optionalPackages.map((pkg, index) => (
                  <View key={index} style={styles.packageBadge}>
                    <Text style={styles.packageText}>{pkg}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.tabContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('primaryDemographic')}</Text>
              <Text style={styles.infoValue}>{vehicleData.primaryDemographic}</Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('useCase')}</Text>
              <Text style={styles.infoValue}>{vehicleData.useCase}</Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('competitorModels')}</Text>
              <View style={styles.competitorContainer}>
                {vehicleData.competitorModels.map((model, index) => (
                  <View key={index} style={styles.competitorBadge}>
                    <Text style={styles.competitorText}>{model}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.tabContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('commonProblems')}</Text>
              {vehicleData.commonProblems.map((problem, index) => (
                <Text key={index} style={styles.problemItem}>• {problem}</Text>
              ))}
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('recallInfo')}</Text>
              {vehicleData.recallInfo.map((recall, index) => (
                <Text key={index} style={styles.recallItem}>• {recall}</Text>
              ))}
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('maintenanceTips')}</Text>
              {vehicleData.maintenanceTips.map((tip, index) => (
                <Text key={index} style={styles.tipItem}>• {tip}</Text>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('vehicleIdentified')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
            <Text style={styles.languageText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.themeButton}>
            <Ionicons name="moon-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle Result Card */}
      <View style={styles.resultCard}>
        <View style={styles.carImageContainer}>
          <Image source={{ uri: imageUri }} style={styles.carImage} />
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.carName}>
            {isLoading ? t('analyzing') : `${vehicleData?.make} ${vehicleData?.model}`}
          </Text>
          <Text style={styles.carYear}>
            {isLoading ? t('pleaseWait') : vehicleData?.year}
          </Text>
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { width: isLoading ? '0%' : `${parseInt(vehicleData?.confidence?.replace(/[^\d]/g, '') || '0')}%` }]} />
            </View>
            <Text style={styles.confidenceText}>
              {isLoading ? '0%' : `${parseInt(vehicleData?.confidence?.replace(/[^\d]/g, '') || '0')}%`} {t('match')}
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTabIndex === index && styles.activeTab]}
              onPress={() => setActiveTabIndex(index)}
            >
              <Text style={[styles.tabText, activeTabIndex === index && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.contentContainer}>
        {renderTabContent()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getPadding(20, 30, 40),
    paddingVertical: getPadding(15, 20, 25),
  },
  backButton: {
    padding: getPadding(5, 8, 10),
  },
  headerTitle: {
    fontSize: getFontSize(18, 22, 26),
    fontWeight: '600',
    color: '#1a1a1a',
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
  themeButton: {
    padding: getPadding(5, 8, 10),
  },
  resultCard: {
    backgroundColor: 'white',
    marginHorizontal: getMargin(20, 30, 40),
    marginBottom: getMargin(20, 25, 30),
    borderRadius: getBorderRadius(16, 20, 24),
    padding: getPadding(20, 30, 40),
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getSpacing(8, 12, 16),
    elevation: 5,
  },
  carImageContainer: {
    width: getSpacing(80, 120, 150),
    height: getSpacing(80, 120, 150),
    borderRadius: getBorderRadius(12, 16, 20),
    overflow: 'hidden',
    marginRight: getMargin(15, 20, 25),
  },
  carImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  carName: {
    fontSize: getFontSize(20, 24, 28),
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: getMargin(5, 8, 10),
  },
  carYear: {
    fontSize: getFontSize(16, 18, 20),
    color: '#666',
    marginBottom: getMargin(10, 15, 20),
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceBar: {
    flex: 1,
    height: getSpacing(6, 8, 10),
    backgroundColor: '#e5e7eb',
    borderRadius: getSpacing(3, 4, 5),
    marginRight: getMargin(10, 15, 20),
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  skeletonWrapper: {
    flex: 1,
  },
  loadingResultsText: {
    fontSize: getFontSize(18, 22, 26),
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: getMargin(20, 25, 30),
    marginTop: getMargin(10, 15, 20),
  },
  tabContent: {
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
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  trimContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  trimBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  trimText: {
    fontSize: 14,
    color: '#374151',
  },
  featureItem: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 5,
  },
  packageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  packageBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  packageText: {
    fontSize: 14,
    color: '#1d4ed8',
  },
  competitorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  competitorBadge: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  competitorText: {
    fontSize: 14,
    color: '#374151',
  },
  problemItem: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 5,
  },
  recallItem: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 5,
  },
  tipItem: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 5,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIcon: {
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryContent: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  specCard: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  lastSpecCard: {
    borderBottomWidth: 0,
  },
  specLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
    lineHeight: 22,
    flexShrink: 1,
  },
});

export default ResultScreen; 