// Test Script - İlk açılış simülasyonu için verileri sıfırla
const { AsyncStorage } = require('@react-native-async-storage/async-storage');

async function resetFirstLaunchData() {
  try {
    console.log('🔄 Resetting first launch data for testing...');
    
    // FirstTimeService keys
    await AsyncStorage.removeItem('firstLaunch');
    await AsyncStorage.removeItem('freeAnalysisUsed');
    await AsyncStorage.removeItem('installationDate');
    await AsyncStorage.removeItem('freeAnalysisUsedDate');
    
    // CreditService keys  
    await AsyncStorage.removeItem('userCredits');
    await AsyncStorage.removeItem('creditHistory');
    await AsyncStorage.removeItem('purchaseHistory');
    
    console.log('✅ All data reset! App will show onboarding on next launch.');
  } catch (error) {
    console.error('❌ Error resetting data:', error);
  }
}

resetFirstLaunchData(); 