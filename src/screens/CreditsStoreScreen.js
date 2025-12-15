import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RevenueCatService from '../services/revenueCatService';
import CreditsManager from '../iap/creditsManager';

/**
 * CreditsStoreScreen - RevenueCat powered credits store
 * Displays available packages and handles purchases
 */
const CreditsStoreScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState([]);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [selectedPackageId, setSelectedPackageId] = useState(null);

  useEffect(() => {
    loadStoreData();
  }, []);

  // Reload credits when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentCredits();
    });
    return unsubscribe;
  }, [navigation]);

  /**
   * Load store data (offerings and current credits)
   */
  const loadStoreData = async () => {
    try {
      setLoading(true);

      // Load current credits
      await loadCurrentCredits();

      // Load available packages
      const availablePackages = await RevenueCatService.getPackages();
      
      if (availablePackages && availablePackages.length > 0) {
        setPackages(availablePackages);
        console.log('Loaded', availablePackages.length, 'packages');
      } else {
        console.warn('No packages available');
        Alert.alert(
          'No Packages Available',
          'Unable to load credit packages. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading store data:', error);
      setLoading(false);
      Alert.alert(
        'Error',
        'Failed to load store. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Load current credit balance
   */
  const loadCurrentCredits = async () => {
    try {
      const credits = await CreditsManager.getCredits();
      setCurrentCredits(credits);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  /**
   * Handle package purchase
   */
  const handlePurchase = async (rcPackage) => {
    if (purchasing) {
      console.log('Purchase already in progress');
      return;
    }

    try {
      setPurchasing(true);
      setSelectedPackageId(rcPackage.identifier);

      console.log('Purchasing package:', rcPackage.identifier);

      // Make the purchase
      const result = await RevenueCatService.purchasePackage(rcPackage);

      if (result.success) {
        // Reload credits
        await loadCurrentCredits();

        // Show success message
        Alert.alert(
          '🎉 Purchase Successful!',
          `${result.creditsAdded} credits have been added to your account.\n\nNew balance: ${result.newBalance} credits`,
          [
            {
              text: 'Great!',
              onPress: () => {
                // Navigate back to home
                navigation.goBack();
              },
            },
          ]
        );
      }

      setPurchasing(false);
      setSelectedPackageId(null);
    } catch (error) {
      setPurchasing(false);
      setSelectedPackageId(null);

      const errorMessage = error.message || 'An error occurred during purchase';

      // Don't show alert for user cancellation
      if (errorMessage.toLowerCase().includes('cancel')) {
        console.log('User cancelled purchase');
        return;
      }

      // Show error alert for other errors
      Alert.alert(
        'Purchase Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Render a package card
   */
  const renderPackage = (rcPackage) => {
    const packageId = rcPackage.identifier;
    const product = rcPackage.product;
    const credits = CreditsManager.getCreditsForPackage(packageId);
    
    // Determine if this is the popular package
    const isPopular = packageId === 'pack50';
    
    // Check if this package is currently being purchased
    const isBeingPurchased = purchasing && selectedPackageId === packageId;

    return (
      <TouchableOpacity
        key={packageId}
        style={[
          styles.packageCard,
          isPopular && styles.popularPackage,
          isBeingPurchased && styles.purchasingPackage,
        ]}
        onPress={() => handlePurchase(rcPackage)}
        disabled={purchasing}
      >
        {/* Popular badge */}
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}

        {/* Loading overlay */}
        {isBeingPurchased && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

        {/* Package content */}
        <View style={styles.packageHeader}>
          <View style={styles.creditsCircle}>
            <Text style={styles.creditsNumber}>{credits}</Text>
            <Text style={styles.creditsLabel}>credits</Text>
          </View>
        </View>

        <Text style={styles.packageTitle}>{product.title || `${credits} Credits Pack`}</Text>
        <Text style={styles.packageDescription}>
          {product.description || `Get ${credits} analysis credits`}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{product.priceString}</Text>
          <Text style={styles.pricePerCredit}>
            {(parseFloat(product.price) / credits).toFixed(2)} per credit
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.featureText}>Unlimited queries until your credits run out</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.featureText}>Detailed vehicle information</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.featureText}>Past analysis records</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.featureText}>Can be purchased again</Text>
          </View>
        </View>

        <View style={styles.buyButton}>
          <Text style={styles.buyButtonText}>
            {isBeingPurchased ? 'Processing...' : 'Buy Now'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Credits Store</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingMessage}>Loading store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render main content
   */
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credits Store</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current credits display */}
        <View style={styles.currentCreditsCard}>
          <Ionicons name="wallet" size={32} color="#4f46e5" />
          <View style={styles.creditsInfo}>
            <Text style={styles.currentCreditsLabel}>Your Credits</Text>
            <Text style={styles.currentCreditsValue}>{currentCredits}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#4f46e5" />
            <Text style={styles.infoTitle}>How Credits Work</Text>
          </View>
          <Text style={styles.infoText}>
            Each vehicle analysis uses 1 credit. Credits never expire and you can purchase the same package multiple times.
          </Text>
        </View>

        {/* Packages title */}
        <Text style={styles.sectionTitle}>Choose Your Package</Text>

        {/* Package list */}
        <View style={styles.packagesContainer}>
          {packages.length > 0 ? (
            packages
              .sort((a, b) => parseFloat(a.product.price) - parseFloat(b.product.price))
              .map(pkg => renderPackage(pkg))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cart-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No packages available</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadStoreData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            • All purchases are processed securely through Apple{'\n'}
            • Credits are added instantly to your account{'\n'}
            • All sales are final{'\n'}
            • Credits never expire
          </Text>
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
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMessage: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentCreditsCard: {
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
  currentCreditsLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  currentCreditsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
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
    marginBottom: 20,
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
  popularPackage: {
    borderColor: '#4f46e5',
    backgroundColor: '#faf5ff',
  },
  purchasingPackage: {
    opacity: 0.7,
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 12,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(79, 70, 229, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    zIndex: 10,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  packageHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
  },
  creditsLabel: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  pricePerCredit: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  features: {
    marginBottom: 16,
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
  },
  buyButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerInfo: {
    marginBottom: 40,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default CreditsStoreScreen;

