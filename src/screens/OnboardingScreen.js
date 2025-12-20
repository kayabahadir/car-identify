import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import FirstTimeService from '../services/firstTimeService';

const { width, height } = Dimensions.get('window');

// Device detection helpers
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

const OnboardingScreen = ({ navigation }) => {
  const { language, t, toggleLanguage } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const scrollRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Dynamic onboarding data with translations
  const getOnboardingData = () => [
    {
      id: 1,
      icon: 'camera-outline',
      title: t('welcomeTitle'),
      subtitle: t('welcomeSubtitle'),
      description: t('welcomeDescription'),
      color: '#4f46e5',
      backgroundColor: '#f0f9ff'
    },
    {
      id: 2,
      icon: 'analytics-outline',
      title: t('detailedAnalysisTitle'),
      subtitle: t('detailedAnalysisSubtitle'),
      description: t('detailedAnalysisDescription'),
      color: '#059669',
      backgroundColor: '#ecfdf5'
    },
    {
      id: 3,
      icon: 'gift-outline',
      title: t('firstFreeTitle'),
      subtitle: t('firstFreeSubtitle'),
      description: t('firstFreeDescription'),
      color: '#dc2626',
      backgroundColor: '#fef2f2'
    },
    {
      id: 4,
      icon: 'wallet-outline',
      title: t('creditSystemTitle'),
      subtitle: t('creditSystemSubtitle'),
      description: t('creditSystemDescription'),
      color: '#7c3aed',
      backgroundColor: '#faf5ff'
    }
  ];

  const onboardingData = getOnboardingData();

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true
      });
      updateProgress(nextIndex);
    } else {
      handleGetStarted();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollRef.current?.scrollTo({
        x: prevIndex * width,
        animated: true
      });
      updateProgress(prevIndex);
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    try {
      // Onboarding'i tamamlandı olarak işaretle
      await FirstTimeService.markFirstLaunchComplete();
      
      // Eğer paket seçilmişse direkt satın alma işlemini başlat
      if (selectedPackage) {
        // Home'a git ve satın alma işlemini başlat
        navigation.replace('Home', { 
          purchasePackage: selectedPackage,
          fromOnboarding: true 
        });
      } else {
        navigation.replace('Home');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      navigation.replace('Home');
    }
  };

  const handlePackageSelect = (packageId) => {
    setSelectedPackage(packageId);
  };

  const updateProgress = (index) => {
    Animated.timing(progressAnim, {
      toValue: index,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    
    if (roundIndex !== currentIndex) {
      setCurrentIndex(roundIndex);
      updateProgress(roundIndex);
    }
  };

  const renderOnboardingItem = (item, index) => (
    <View key={item.id} style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={48} color="white" />
        </View>
        
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
        
        {/* Feature highlights */}
        {index === 1 && (
          <View style={styles.featureList}>
            <FeatureItem icon="checkmark-circle" text={t('enginePerformanceDetails')} />
            <FeatureItem icon="checkmark-circle" text={t('trimLevels')} />
            <FeatureItem icon="checkmark-circle" text={t('technicalSpecifications')} />
          </View>
        )}
        
        {index === 2 && (
          <View style={styles.giftBox}>
            <View style={styles.giftContent}>
              <Ionicons name="gift" size={32} color={item.color} />
              <Text style={styles.giftText}>{t('freeAnalysisCount')}</Text>
              <Text style={styles.giftSubtext}>{t('startUsingImmediately')}</Text>
            </View>
          </View>
        )}
        
        {index === 3 && (
          <View style={styles.pricingPreview}>
            <TouchableOpacity 
              style={[
                styles.pricingItem, 
                selectedPackage === 'pack10' && styles.selectedPricingItem
              ]}
              onPress={() => handlePackageSelect('pack10')}
            >
              <Text style={styles.pricingCredits}>5 {t('credits')}</Text>
              <Text style={styles.pricingPrice}>$1.99</Text>
              <Text style={styles.pricingSubtext}>{t('starterPackage')}</Text>
              {selectedPackage === 'pack10' && (
                <View style={styles.selectedCheckmark}>
                  <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.pricingItem, 
                styles.popularPricingItem,
                selectedPackage === 'pack50' && styles.selectedPricingItem
              ]}
              onPress={() => handlePackageSelect('pack50')}
            >
              <Text style={styles.pricingCredits}>25 {t('credits')}</Text>
              <Text style={styles.pricingPrice}>$4.99</Text>
              <Text style={styles.pricingSubtext}>{t('savings30')}</Text>
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>{t('popular')}</Text>
              </View>
              {selectedPackage === 'pack50' && (
                <View style={styles.selectedCheckmark}>
                  <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.pricingItem,
                selectedPackage === 'pack200' && styles.selectedPricingItem
              ]}
              onPress={() => handlePackageSelect('pack200')}
            >
              <Text style={styles.pricingCredits}>100 {t('credits')}</Text>
              <Text style={styles.pricingPrice}>$9.99</Text>
              <Text style={styles.pricingSubtext}>{t('savings50')}</Text>
              {selectedPackage === 'pack200' && (
                <View style={styles.selectedCheckmark}>
                  <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const FeatureItem = ({ icon, text }) => (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={16} color="#059669" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Progress Bar and Language Toggle */}
      <View style={styles.headerContainer}>
        {/* Top buttons row */}
        <View style={styles.topButtonsContainer}>
          {/* Language Toggle */}
          <TouchableOpacity style={styles.languageToggle} onPress={toggleLanguage}>
            <Text style={styles.languageText}>{language === 'tr' ? 'EN' : 'TR'}</Text>
          </TouchableOpacity>
          
          {/* Skip Button */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Progress Container */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, onboardingData.length - 1],
                    outputRange: ['25%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {onboardingData.map((item, index) => renderOnboardingItem(item, index))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentIndex > 0 ? (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Ionicons name="chevron-back" size={20} color="#6b7280" />
              <Text style={styles.previousText}>{t('previous')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              currentIndex === onboardingData.length - 1 && !selectedPackage && styles.getStartedButtonDisabled,
              currentIndex === onboardingData.length - 1 && selectedPackage && styles.getStartedButtonActive,
            ]}
            onPress={currentIndex === onboardingData.length - 1 ? (selectedPackage ? handleNext : null) : handleNext}
            disabled={currentIndex === onboardingData.length - 1 && !selectedPackage}
          >
            {currentIndex === onboardingData.length - 1 ? (
              selectedPackage ? (
                <>
                  <Text style={styles.getStartedTextActive}>{t('buyAndStart')}</Text>
                  <Ionicons name="card" size={20} color="white" />
                </>
              ) : (
                <>
                  <Text style={styles.getStartedTextDisabled}>{t('selectFromAbove')}</Text>
                  <Ionicons name="arrow-up" size={20} color="#9ca3af" />
                </>
              )
            ) : (
              <>
                <Text style={styles.nextText}>{t('next')}</Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Free Trial Option - Only on last page */}
        {currentIndex === onboardingData.length - 1 && (
          <View style={styles.freeTrialContainer}>
            <TouchableOpacity style={styles.freeTrialButton} onPress={handleGetStarted}>
                             <Text style={styles.freeTrialText}>{t('startWithFreeTrial')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    paddingHorizontal: isTablet ? 40 : 20,
    paddingTop: isTablet ? 40 : 60,
    paddingBottom: 20,
  },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 20 : 15,
    // iPad'de butonlar arası daha fazla boşluk
    paddingHorizontal: isTablet ? 10 : 0,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  languageToggle: {
    backgroundColor: '#4f46e5',
    borderRadius: isTablet ? 10 : 8,
    paddingVertical: isTablet ? 8 : 6,
    paddingHorizontal: isTablet ? 16 : 12,
    // iPad'de daha büyük dokunma alanı
    minWidth: isTablet ? 60 : 'auto',
    alignItems: 'center',
  },
  languageText: {
    color: 'white',
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
  },
  progressBar: {
    flex: 1,
    height: isTablet ? 6 : 4,
    backgroundColor: '#e5e7eb',
    borderRadius: isTablet ? 3 : 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: isTablet ? 3 : 2,
  },
  skipButton: {
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 8 : 6,
    // iPad'de daha büyük dokunma alanı
    minWidth: isTablet ? 80 : 'auto',
    alignItems: 'center',
    borderRadius: isTablet ? 8 : 0,
    backgroundColor: isTablet ? '#f8f9fa' : 'transparent',
  },
  skipText: {
    fontSize: isTablet ? 16 : 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: isTablet ? 400 : 300,
    // iPad'de daha geniş content alanı
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  giftBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  giftContent: {
    alignItems: 'center',
  },
  giftText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  giftSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  pricingPreview: {
    flexDirection: isTablet ? 'row' : 'row',
    gap: isTablet ? 16 : 12,
    marginBottom: 20,
    paddingHorizontal: isTablet ? 20 : 0,
    // iPad'de kartların daha iyi hizalanması için
    justifyContent: isTablet ? 'center' : 'space-between',
    alignItems: 'flex-start',
  },
  pricingItem: {
    backgroundColor: 'white',
    borderRadius: isTablet ? 16 : 12,
    padding: isTablet ? 16 : 14,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
    borderWidth: 2,
    borderColor: 'transparent',
    // Tüm platformlarda sabit boyut
    minHeight: isTablet ? 140 : 130,
    maxHeight: isTablet ? 140 : 130,
    justifyContent: 'space-between',
    // iPad'de maksimum genişlik sınırı
    maxWidth: isTablet ? 180 : 'auto',
    minWidth: isTablet ? 160 : 'auto',
    // Mobilde tik işareti için üst padding
    paddingTop: isTablet ? 16 : 20,
  },
  popularPricingItem: {
    borderColor: '#7c3aed',
    // Sadece border ile ayırt edilsin, boyut farkı olmasın
  },
  selectedPricingItem: {
    borderColor: '#4f46e5',
    borderWidth: 3,
    backgroundColor: '#f8fafc',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: isTablet ? 8 : 6,
    right: isTablet ? 8 : 6,
    backgroundColor: 'white',
    borderRadius: 10,
    // Mobilde yazıyla karışmaması için arka plan ve gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  pricingCredits: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    // Mobilde tutarlı hizalama için
    minHeight: isTablet ? 'auto' : 20,
  },
  pricingPrice: {
    fontSize: isTablet ? 18 : 16,
    color: '#7c3aed',
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
    // Mobilde fiyat hizalama problemi için sabit yükseklik
    minHeight: isTablet ? 'auto' : 22,
    lineHeight: isTablet ? 'auto' : 22,
  },
  pricingSubtext: {
    fontSize: isTablet ? 12 : 10,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
    // Text yüksekliği sabitlenmesi
    minHeight: isTablet ? 32 : 28,
    lineHeight: isTablet ? 16 : 14,
    // Mobilde 2 satır text için alan
    height: isTablet ? 32 : 28,
  },
  popularBadge: {
    position: 'absolute',
    top: isTablet ? -8 : -6,
    backgroundColor: '#7c3aed',
    paddingHorizontal: isTablet ? 6 : 4,
    paddingVertical: 2,
    borderRadius: 6,
    // Mobilde daha kompakt
    left: '50%',
    transform: [{ translateX: -25 }],
  },
  popularText: {
    fontSize: 8,
    color: 'white',
    fontWeight: 'bold',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#4f46e5',
    width: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previousText: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  nextText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginRight: 4,
  },
  getStartedButtonDisabled: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 24,
  },
  getStartedButtonActive: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
  },
  getStartedTextDisabled: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
    marginRight: 8,
  },
  getStartedTextActive: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
  placeholder: {
    width: 80,
  },
  // Free Trial
  freeTrialContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  freeTrialButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  freeTrialText: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
});

export default OnboardingScreen; 