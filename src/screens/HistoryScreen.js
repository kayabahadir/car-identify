import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  getAnalysisHistory, 
  deleteAnalysisFromHistory, 
  clearAnalysisHistory,
  formatAnalysisDate 
} from '../services/historyService';

const HistoryScreen = ({ navigation }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const history = await getAnalysisHistory();
      setHistoryData(history);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteAnalysis = (analysisId) => {
    Alert.alert(
      t('deleteAnalysis'),
      t('confirmClearHistory'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAnalysisFromHistory(analysisId);
            if (success) {
              Alert.alert('', t('analysisDeleted'));
              loadHistory();
            }
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      t('clearHistory'),
      t('confirmClearHistory'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await clearAnalysisHistory();
            if (success) {
              Alert.alert('', t('historyCleared'));
              setHistoryData([]);
            }
          },
        },
      ]
    );
  };

  const handleViewAnalysis = (item) => {
    navigation.navigate('Result', { 
      imageUri: item.imageUri,
      historyData: item.vehicleData 
    });
  };

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.historyCard}
      onPress={() => handleViewAnalysis(item)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUri }} style={styles.historyImage} />
      </View>
      
      <View style={styles.historyContent}>
        <View style={styles.historyHeader}>
          <Text style={styles.carName}>
            {item.vehicleData?.make} {item.vehicleData?.model}
          </Text>
          <TouchableOpacity 
            onPress={() => handleDeleteAnalysis(item.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.carYear}>{item.vehicleData?.year}</Text>
        
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { width: `${parseInt(item.vehicleData?.confidence?.replace(/[^\d]/g, '') || '0')}%` }
              ]} 
            />
          </View>
          <Text style={styles.confidenceText}>
            {`${parseInt(item.vehicleData?.confidence?.replace(/[^\d]/g, '') || '0')}%`} {t('match')}
          </Text>
        </View>
        
        <Text style={styles.analysisDate}>
          {formatAnalysisDate(item.timestamp, language)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>{t('historyEmpty')}</Text>
      <Text style={styles.emptyDescription}>{t('historyEmptyDescription')}</Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.emptyButtonText}>{t('takePhoto')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('history')}</Text>
        <View style={styles.headerButtons}>
          {historyData.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClearHistory}
            >
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
            <Text style={styles.languageText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* History List */}
      {historyData.length === 0 && !isLoading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={historyData}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 8,
    marginRight: 10,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 15,
  },
  historyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  historyContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  carName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  carYear: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginRight: 8,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  analysisDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HistoryScreen; 