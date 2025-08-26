import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import CreditService from '../services/creditService';
import FirstTimeService from '../services/firstTimeService';

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

const SettingsScreen = ({ navigation }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [userStats, setUserStats] = useState(null);
  const [creditHistory, setCreditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditInfo, setCreditInfo] = useState({ canUse: false, type: 'none', creditsLeft: 0, message: '' });

  useEffect(() => {
    loadUserData();
  }, []);

  // Sayfa odaklandığında verileri yenile
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [stats, history, creditStatus] = await Promise.all([
        CreditService.getUserStats(),
        CreditService.getCreditHistory(),
        CreditService.canAnalyze()
      ]);
      
      setUserStats(stats);
      setCreditHistory(history);
      setCreditInfo(creditStatus);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = () => {
    navigation.navigate('Purchase');
  };

  // Test özelliği kaldırıldı - production için güvenli

  const handleContact = () => {
    Alert.alert(
      t('contact'),
      t('contactMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('email'), onPress: () => Linking.openURL('mailto:support@caridentify.com') },
        { text: t('website'), onPress: () => Linking.openURL('https://caridentify.com') }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('Legal', { document: 'privacy' });
  };

  const handleTermsOfService = () => {
    navigation.navigate('Legal', { document: 'terms' });
  };

  // Geliştirici modu fonksiyonları
  const enableDeveloperMode = async () => {
    try {
      const success = await CreditService.enableDeveloperMode();
      if (success) {
        Alert.alert('Geliştirici Modu', 'Geliştirici modu aktif edildi! Artık sınırsız analiz yapabilirsiniz.');
        loadUserData();
      } else {
        Alert.alert('Hata', 'Geliştirici modu aktif edilemedi.');
      }
    } catch (error) {
      console.error('Error enabling developer mode:', error);
      Alert.alert('Hata', 'Geliştirici modu aktif edilirken hata oluştu.');
    }
  };

  const disableDeveloperMode = async () => {
    try {
      const success = await CreditService.disableDeveloperMode();
      if (success) {
        Alert.alert('Geliştirici Modu', 'Geliştirici modu devre dışı bırakıldı.');
        loadUserData();
      } else {
        Alert.alert('Hata', 'Geliştirici modu devre dışı bırakılamadı.');
      }
    } catch (error) {
      console.error('Error disabling developer mode:', error);
      Alert.alert('Hata', 'Geliştirici modu devre dışı bırakılırken hata oluştu.');
    }
  };

  const addTestCredits = async () => {
    try {
      const newCredits = await CreditService.addDeveloperCredits(100);
      if (newCredits !== false) {
        Alert.alert('Test Kredileri', `100 test kredisi eklendi! Toplam: ${newCredits} kredi`);
        loadUserData();
      } else {
        Alert.alert('Hata', 'Test kredileri eklenemedi.');
      }
    } catch (error) {
      console.error('Error adding test credits:', error);
      Alert.alert('Hata', 'Test kredileri eklenirken hata oluştu.');
    }
  };

  const resetForTesting = async () => {
    try {
      await CreditService.resetForTesting();
      Alert.alert('Test Sıfırlama', 'Tüm veriler test için sıfırlandı!');
      loadUserData();
    } catch (error) {
      console.error('Error resetting for testing:', error);
      Alert.alert('Hata', 'Test sıfırlama sırasında hata oluştu.');
    }
  };



  const renderCreditHistoryItem = (item, index) => {
    const isCredit = item.amount > 0;
    const iconName = {
      'free_analysis_used': 'gift',
      'credit_used': 'camera',
      'credits_added': 'add-circle',
      'demo_purchase': 'card',
      'in_app_purchase': 'card',
      'restore_purchase': 'refresh'
    }[item.action] || 'help-circle';

    const actionText = {
      'free_analysis_used': 'Ücretsiz Analiz',
      'credit_used': 'Analiz Yapıldı',
      'credits_added': 'Kredi Eklendi',
      'demo_purchase': 'Demo Satın Alma',
      'in_app_purchase': 'Satın Alma',
      'restore_purchase': 'Geri Yükleme'
    }[item.action] || item.action;

    return (
      <View key={item.id || index} style={styles.historyItem}>
        <View style={styles.historyIcon}>
          <Ionicons 
            name={iconName} 
            size={16} 
            color={isCredit ? '#16a34a' : '#dc2626'} 
          />
        </View>
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle}>{actionText}</Text>
          <Text style={styles.historyDescription}>{item.description}</Text>
          <Text style={styles.historyDate}>
            {new Date(item.timestamp).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
        <View style={styles.historyAmount}>
          <Text style={[
            styles.historyAmountText,
            { color: isCredit ? '#16a34a' : '#dc2626' }
          ]}>
            {isCredit ? '+' : ''}{item.amount}
          </Text>
        </View>
      </View>
    );
  };

  const menuItems = [
    {
      icon: 'card',
      title: t('buyCreditsPlan'),
      subtitle: t('addNewCredits'),
      onPress: handleBuyCredits,
      showArrow: true
    },
    {
      icon: 'language',
      title: t('language'),
      subtitle: t('currentLanguage'),
      onPress: toggleLanguage,
      showArrow: false
    },
    // Geliştirici modu - sadece development ortamında görünür
    ...__DEV__ ? [{
      icon: 'flask',
      title: '🧪 Geliştirici Modu',
      subtitle: creditInfo.type === 'developer' ? 'Sınırsız analiz aktif' : 'Test için geliştirici modunu aktif edin',
      onPress: () => {
        // Geliştirici modu seçenekleri göster
        Alert.alert(
          '🧪 Geliştirici Modu',
          creditInfo.type === 'developer' 
            ? 'Geliştirici modu aktif. Ne yapmak istiyorsunuz?' 
            : 'Test için geliştirici modunu aktif edin',
          [
            { text: 'İptal', style: 'cancel' },
            ...(creditInfo.type !== 'developer' ? [
              { text: 'Geliştirici Modu Aktif Et', onPress: enableDeveloperMode }
            ] : [
              { text: 'Geliştirici Modu Kapat', onPress: disableDeveloperMode }
            ]),
            { text: '+100 Test Kredisi', onPress: addTestCredits },
            { text: 'Test Verilerini Sıfırla', onPress: resetForTesting, style: 'destructive' }
          ]
        );
      },
      showArrow: true,
      isDeveloper: true
    }] : [],
    {
      icon: 'shield-checkmark',
      title: t('privacyPolicy'),
      subtitle: t('dataCollectionUsage'),
      onPress: handlePrivacyPolicy,
      showArrow: true
    },
    {
      icon: 'document-text',
      title: t('termsOfService'),
      subtitle: t('serviceRulesConditions'),
      onPress: handleTermsOfService,
      showArrow: true
    },
    {
      icon: 'help-circle',
      title: t('helpSupport'),
      subtitle: t('contactUs'),
      onPress: handleContact,
      showArrow: true
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Credits Section */}
        <View style={styles.section}>
          <View style={styles.creditsSummary}>
            <View style={styles.creditsHeader}>
              <Ionicons name="wallet" size={28} color="#4f46e5" />
              <View style={styles.creditsInfo}>
                <Text style={styles.creditsNumber}>{userStats?.currentCredits || 0}</Text>
                <Text style={styles.creditsLabel}>{t('currentCreditsLabel')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.buyButton} onPress={handleBuyCredits}>
              <Text style={styles.buyButtonText}>{t('buyCreditsButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>



        {/* Credit History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('creditHistory')}</Text>
          <View style={styles.historyContainer}>
            {creditHistory.length > 0 ? (
              creditHistory.slice(0, 10).map((item, index) => renderCreditHistoryItem(item, index))
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="time-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyHistoryText}>{t('noTransactionHistory')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings')}</Text>
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem, 
                  item.danger && styles.dangerMenuItem,
                  item.isDeveloper && styles.developerMenuItem
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons 
                    name={item.icon} 
                    size={20} 
                    color={item.danger ? '#dc2626' : item.isDeveloper ? '#3b82f6' : '#4f46e5'} 
                  />
                  <View style={styles.menuItemText}>
                    <Text style={[
                      styles.menuItemTitle, 
                      item.danger && styles.dangerText,
                      item.isDeveloper && styles.developerText
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                {item.showArrow && (
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appInfo}>
            <Text style={styles.appInfoTitle}>{t('appInfoTitle')}</Text>
            <Text style={styles.appInfoVersion}>{t('appInfoVersion')}</Text>
            <Text style={styles.appInfoDescription}>
              {t('appInfoDescription')}
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
    backgroundColor: '#f8f9fa',
    // iPad Mini için ek optimizasyon
    ...(isTablet && !isLargeTablet && { 
      paddingBottom: getPadding(20, 30, 40)
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getPadding(20, 30, 40),
    paddingTop: getPadding(30, 40, 50),
    paddingBottom: getPadding(20, 25, 30),
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      paddingTop: getPadding(20, 30, 40),
      paddingBottom: getPadding(15, 20, 25)
    }),
  },
  backButton: {
    padding: getPadding(8, 12, 15),
  },
  headerTitle: {
    fontSize: getFontSize(18, 22, 26),
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      marginBottom: 16
    }),
  },
  sectionTitle: {
    fontSize: getFontSize(18, 22, 26),
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: getMargin(16, 20, 25),
    paddingHorizontal: getPadding(20, 30, 40),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      marginBottom: getMargin(8, 12, 16)
    }),
  },
  // Credits Summary
  creditsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    marginHorizontal: getMargin(20, 30, 40),
    padding: getPadding(20, 30, 40),
    borderRadius: getBorderRadius(16, 20, 24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: getSpacing(8, 12, 16),
    elevation: 5,
    marginTop: getMargin(10, 15, 20),
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      padding: getPadding(12, 20, 28),
      marginTop: getMargin(6, 10, 14)
    }),
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsInfo: {
    marginLeft: 12,
  },
  creditsNumber: {
    fontSize: getFontSize(28, 36, 44),
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  creditsLabel: {
    fontSize: getFontSize(14, 16, 18),
    color: '#6b7280',
  },
  buyButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: getPadding(16, 20, 25),
    paddingVertical: getPadding(8, 12, 15),
    borderRadius: getBorderRadius(12, 16, 20),
    // iPad'de daha büyük minimum boyut
    minHeight: getSpacing(40, 55, 70),
  },
  buyButtonText: {
    color: 'white',
    fontSize: getFontSize(14, 16, 18),
    fontWeight: '600',
  },

  // Credit History
  historyContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  historyDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyAmountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 40,
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      padding: 30
    }),
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  // Menu
  menuContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dangerMenuItem: {
    backgroundColor: '#fef2f2',
  },
  developerMenuItem: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderStyle: 'dashed',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dangerText: {
    color: '#dc2626',
  },
  developerText: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // App Info
  appInfo: {
    alignItems: 'center',
    padding: 70,
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      padding: getPadding(40, 50, 60)
    }),
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    // iPad Mini için daha küçük
    ...(isTablet && !isLargeTablet && { 
      fontSize: getFontSize(14, 16, 18)
    }),
  },
  appInfoVersion: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      marginTop: 2
    }),
  },
  appInfoDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    // iPad Mini için daha kompakt
    ...(isTablet && !isLargeTablet && { 
      marginTop: 4
    }),
  },
});

export default SettingsScreen; 