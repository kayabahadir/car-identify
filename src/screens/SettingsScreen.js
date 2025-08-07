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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import CreditService from '../services/creditService';
import FirstTimeService from '../services/firstTimeService';

const SettingsScreen = ({ navigation }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [userStats, setUserStats] = useState(null);
  const [creditHistory, setCreditHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const [stats, history] = await Promise.all([
        CreditService.getUserStats(),
        CreditService.getCreditHistory()
      ]);
      
      setUserStats(stats);
      setCreditHistory(history);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = () => {
    navigation.navigate('Purchase');
  };

  const handleResetData = () => {
    Alert.alert(
      t('resetDataTitle'),
      t('resetDataMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('resetButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await CreditService.resetForTesting();
              Alert.alert(t('resetSuccess'), t('resetSuccessMessage'), [
                { text: t('ok'), onPress: () => navigation.navigate('Home') }
              ]);
            } catch (error) {
              Alert.alert(t('resetError'), t('resetErrorMessage'));
            }
          }
        }
      ]
    );
  };

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
    {
      icon: 'trash',
      title: t('resetData'),
      subtitle: t('clearAllDataTest'),
      onPress: handleResetData,
      showArrow: true,
      danger: true
    }
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
                style={[styles.menuItem, item.danger && styles.dangerMenuItem]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons 
                    name={item.icon} 
                    size={20} 
                    color={item.danger ? '#dc2626' : '#4f46e5'} 
                  />
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, item.danger && styles.dangerText]}>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  // Credits Summary
  creditsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsInfo: {
    marginLeft: 12,
  },
  creditsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  creditsLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  buyButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  buyButtonText: {
    color: 'white',
    fontSize: 14,
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
  menuItemSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // App Info
  appInfo: {
    alignItems: 'center',
    padding: 20,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  appInfoVersion: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  appInfoDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SettingsScreen; 