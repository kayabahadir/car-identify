import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'vehicle_analysis_history';

// Analiz geçmişini kaydet
export const saveAnalysisToHistory = async (analysisData) => {
  try {
    const existingHistory = await getAnalysisHistory();
    
    const newAnalysis = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...analysisData
    };
    
    // En yeni analizi başa ekle
    const updatedHistory = [newAnalysis, ...existingHistory];
    
    // Maksimum 50 analiz sakla
    const limitedHistory = updatedHistory.slice(0, 50);
    
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));
    return true;
  } catch (error) {
    console.error('Error saving analysis to history:', error);
    return false;
  }
};

// Analiz geçmişini getir
export const getAnalysisHistory = async () => {
  try {
    const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      return JSON.parse(historyJson);
    }
    return [];
  } catch (error) {
    console.error('Error getting analysis history:', error);
    return [];
  }
};

// Belirli bir analizi sil
export const deleteAnalysisFromHistory = async (analysisId) => {
  try {
    const existingHistory = await getAnalysisHistory();
    const updatedHistory = existingHistory.filter(item => item.id !== analysisId);
    
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return true;
  } catch (error) {
    console.error('Error deleting analysis from history:', error);
    return false;
  }
};

// Tüm geçmişi temizle
export const clearAnalysisHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing analysis history:', error);
    return false;
  }
};

// Tarihi formatla (çok dil desteği ile)
export const formatAnalysisDate = (timestamp, language = 'tr') => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (language === 'tr') {
      return diffInMinutes < 1 ? 'Şimdi' : `${diffInMinutes} dakika önce`;
    } else {
      return diffInMinutes < 1 ? 'Now' : `${diffInMinutes} minutes ago`;
    }
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    if (language === 'tr') {
      return `${hours} saat önce`;
    } else {
      return `${hours} hours ago`;
    }
  } else if (diffInHours < 48) {
    return language === 'tr' ? 'Dün' : 'Yesterday';
  } else {
    const locale = language === 'tr' ? 'tr-TR' : 'en-US';
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString(locale, options);
  }
}; 