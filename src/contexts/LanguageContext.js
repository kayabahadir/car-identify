import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  tr: {
    // Home Screen
    appTitle: 'Car Identify',
    appSubtitle: 'AI Destekli Araç Tanıma',
    carsAnalyzed: 'Analiz Edilen Araç',
    accuracyRate: 'Doğruluk Oranı',
    aiRecognitionSystem: 'AI Tanıma Sistemi',
    aiDescription: 'AI Destekli Tanıma • Binlerce Kişi Tarafından Güvenilir',
    aiUpdate: 'Gerçek Zamanlı Zeka ile Sürekli Gelişiyor • Az önce güncellendi',
    confidenceLevel: 'Güven Seviyesi:',
    online: 'Çevrimiçi',
    takePhoto: 'Fotoğraf Çek',
    uploadFromGallery: 'Galeriden Yükle',
    
    // Result Screen
    vehicleIdentified: 'Araç Tanımlandı',
    analyzing: 'Analiz ediliyor...',
    pleaseWait: 'Lütfen bekleyin...',
    match: 'eşleşme',
    
    // Tabs
    overview: 'Genel',
    specs: 'Özellikler',
    trim: 'Donanım',
    audience: 'Hedef Kitle',
    issues: 'Sorunlar',
    
    // Overview
    makeModel: 'Marka & Model',
    productionYears: 'Üretim Yılları',
    generation: 'Nesil',
    bodyType: 'Kasa Tipi',
    
    // Specs
    engine: 'Motor',
    power: 'Güç',
    transmission: 'Şanzıman',
    fuelType: 'Yakıt Tipi',
    acceleration: '0-100 km/s',
    topSpeed: 'Maksimum Hız',
    fuelEconomy: 'Yakıt Tüketimi',
    
    // Trim
    baseTrim: 'Temel Donanım',
    availableTrims: 'Mevcut Donanımlar',
    standardFeatures: 'Standart Özellikler',
    optionalPackages: 'Opsiyonel Paketler',
    
    // Audience
    primaryDemographic: 'Ana Hedef Kitle',
    useCase: 'Kullanım Amacı',
    priceRange: 'Fiyat Aralığı',
    competitorModels: 'Rakip Modeller',
    
    // Issues
    commonProblems: 'Yaygın Sorunlar',
    recallInfo: 'Geri Çağırma Bilgileri',
    maintenanceTips: 'Bakım Önerileri',
    dimensions: 'Boyutlar',
    trunkCapacity: 'Bagaj Kapasitesi',
    productionYears: 'Üretim Yılları',
    
    // Specs categories
    motorAndPower: 'Motor & Güç',
    performance: 'Performans',
    transmissionAndFuel: 'Şanzıman & Yakıt',
    
    // Permissions
    permissionRequired: 'İzin Gerekli',
    cameraPermission: 'Fotoğraf çekmek için kamera izni gereklidir.',
    galleryPermission: 'Fotoğraf seçmek için galeri izni gereklidir.',
    error: 'Hata',
    failedTakePhoto: 'Fotoğraf çekilemedi',
    failedSelectImage: 'Resim seçilemedi',
    analysisIssue: 'Analiz Sorunu',
    processingError: 'İşleme Hatası',
    connectionError: 'Bağlantı Hatası',
    demoMode: 'Demo Modu',
    
    // History
    history: 'Geçmiş Analizler',
    historyEmpty: 'Henüz analiz geçmişiniz yok',
    historyEmptyDescription: 'İlk analizi yapmak için fotoğraf çekin veya galeriden yükleyin',
    deleteAnalysis: 'Analizi Sil',
    clearHistory: 'Geçmişi Temizle',
    confirmClearHistory: 'Tüm analiz geçmişini silmek istediğinizden emin misiniz?',
    cancel: 'İptal',
    ok: 'Tamam',
    delete: 'Sil',
    analysisDeleted: 'Analiz silindi',
    historyCleared: 'Geçmiş temizlendi',
    
    // Credit & Purchase System
    credits: 'Krediler',
    freeAnalysis: 'Ücretsiz Analiz',
    firstAnalysisFree: 'İlk analiziniz ücretsiz!',
    analysisRightsRemaining: 'analiz hakkınız var',
    needCreditsToAnalyze: 'Analiz yapmak için kredi gerekiyor',
    buyCredits: 'Kredi Satın Al',
    insufficientCredits: 'Yetersiz Kredi',
    insufficientCreditsMessage: 'Analiz yapmak için yeterli krediniz yok. Kredi satın alın veya ücretsiz analizinizi kullanın.',
    
    // Purchase Screen
    purchaseTitle: 'Kredi Satın Al',
    currentCredits: 'Mevcut Krediler',
    currentCreditsDesc: 'Analiz yapmaya başlamak için kredi satın alın',
    restorePurchases: 'Satın Alımları Geri Yükle',
    
    // Credit Packages
    starterPackage: 'Başlangıç',
    starterPackageDesc: 'Küçük projeler için',
    popularPackage: 'Popüler',
    popularPackageDesc: 'En çok tercih edilen',
    premiumPackage: 'Premium',
    premiumPackageDesc: 'Büyük projeler için',
    
    // Package Features
    unlimitedAnalysisRights: 'Krediniz bitene kadar sınırsız sorgu',
    detailedVehicleInfo: 'Detaylı araç bilgileri',
    pastAnalysisRecords: 'Geçmiş analiz kayıtları',
    buy: 'Satın Al',
    processing: 'İşleniyor...',
    
    // Purchase Flow
    purchaseConfirmation: 'Satın Alma',
    purchaseSuccess: 'Satın Alma Başarılı!',
    purchaseSuccessMessage: 'kredi hesabınıza eklendi. Artık analiz yapmaya başlayabilirsiniz!',
    purchaseError: 'Satın alma işlemi başarısız oldu. Lütfen tekrar deneyin.',
    purchaseProcessing: 'Satın alma işlemi yapılıyor...',
    startAnalyzing: 'Analiz Yapmaya Başla',
    great: 'Harika!',
    purchaseConfirmationMessage: 'paketi (#CREDITS# kredi) için #PRICE# ödeyeceksiniz. Onaylıyor musunuz?',
    
    // Demo Purchase
    demoPurchaseSuccess: 'Demo Satın Alma Başarılı!',
    demoPurchaseNote: 'Bu demo modudur. Gerçek para çekilmedi.',
    
    // Onboarding
    selectFromAbove: 'Yukarıdan seçim yapın',
    buyAndStart: 'Satın Al & Başla',
    startWithFreeTrial: 'Ücretsiz deneme ile başla',
    
    // Onboarding Data
    welcomeTitle: 'Hoş Geldiniz!',
    welcomeSubtitle: 'AI Destekli Araç Tanımlama',
    welcomeDescription: 'Fotoğraf çekerek veya galeriden seçerek aracınızı tanımlayın. Yapay zeka teknolojisiyle saniyeler içinde detaylı bilgi alın.',
    
    detailedAnalysisTitle: 'Detaylı Analiz',
    detailedAnalysisSubtitle: 'Kapsamlı Araç Bilgileri', 
    detailedAnalysisDescription: 'Motor ve performans detayları, donanım seviyeleri, teknik özellikler. Profesyonel seviyede araç analizi.',
    
    firstFreeTitle: 'İlk Analiz Ücretsiz',
    firstFreeSubtitle: 'Hemen Deneyin!',
    firstFreeDescription: '1 ücretsiz analiz hemen kullanmaya başlayın. Uygulamayı test edin ve kaliteyi görün.',
    
    creditSystemTitle: 'Kredi Sistemi',
    creditSystemSubtitle: 'Esnek Ödeme',
    creditSystemDescription: 'İhtiyacınız kadar kredi satın alın. Krediler hesabınızda kalır, istediğiniz zaman kullanın.',
    
    // Purchase Info Section
    howItWorks: 'Nasıl Çalışır?',
    howItWorksDescription: 'Her araç analizi 1 kredi harcar. Kredileriniz bittiğinde yeni paket satın alabilirsiniz. Kredileriniz hiç bitmiyor ve hesabınızda kalıcı olarak saklanır.',
    
    // Purchase Info Points
    infoPoint1: 'Satın almalar App Store/Google Play üzerinden işlenir',
    infoPoint2: 'Krediler hesabınızda kalıcı olarak saklanır',
    infoPoint3: 'İptal etme veya otomatik yenileme yoktur',
    infoPoint4: 'Sorun yaşarsanız ayarlardan iletişime geçin',
    creditPackages: 'Kredi Paketleri',
    
    // Onboarding Feature Lists
    enginePerformanceDetails: 'Motor ve performans detayları',
    trimLevels: 'Donanım seviyeleri',
    technicalSpecifications: 'Teknik özellikler',
    
    // Free Analysis Gift Box
    freeAnalysisCount: '1 Ücretsiz Analiz',
    startUsingImmediately: 'Hemen kullanmaya başlayın!',
    
    // Settings
    settings: 'Ayarlar',
    buyCreditsPlan: 'Kredi Satın Al',
    addNewCredits: 'Yeni krediler ekle',
    language: 'Dil',
    currentLanguage: 'Türkçe',
    privacyPolicy: 'Gizlilik Politikası',
    dataCollectionUsage: 'Veri toplama ve kullanım',
    termsOfService: 'Kullanım Şartları',
    serviceRulesConditions: 'Hizmet kuralları ve koşulları',
    helpSupport: 'Yardım & Destek',
    contactUs: 'Bize ulaşın',
    resetData: 'Verileri Sıfırla',
    clearAllDataTest: 'Tüm verileri temizle (Test)',
    currentCreditsLabel: 'Mevcut Kredi',
    creditHistory: 'Kredi Geçmişi',
    noTransactionHistory: 'Henüz işlem geçmişiniz yok',
    appInfoTitle: 'Car Identify',
    appInfoDescription: 'AI destekli araç tanımlama uygulaması',
    contact: 'İletişim',
    contactMessage: 'Nasıl yardımcı olabiliriz?',
    email: 'E-posta',
    website: 'Web Sitesi',
    resetDataTitle: 'Verileri Sıfırla',
    resetDataMessage: 'Tüm verileriniz (krediler, geçmiş, ayarlar) silinecek. Bu işlem geri alınamaz. Emin misiniz?',
    resetButton: 'Sıfırla',
    resetSuccess: 'Başarılı',
    resetSuccessMessage: 'Tüm veriler sıfırlandı.',
    resetError: 'Hata',
    resetErrorMessage: 'Veriler sıfırlanırken hata oluştu.',
    buyCreditsButton: 'Kredi Al',
    legalDocuments: 'Yasal Belgeler'
  },
  en: {
    // Home Screen
    appTitle: 'Car Identify',
    appSubtitle: 'AI-Powered Vehicle Recognition',
    carsAnalyzed: 'Cars Analyzed',
    accuracyRate: 'Accuracy Rate',
    aiRecognitionSystem: 'AI Recognition System',
    aiDescription: 'AI-Powered Recognition • Trusted by Thousands',
    aiUpdate: 'Continuously Improving with Real-Time Intelligence • Updated just now',
    confidenceLevel: 'Confidence Level:',
    online: 'Online',
    takePhoto: 'Take Photo',
    uploadFromGallery: 'Upload from Gallery',
    
    // Result Screen
    vehicleIdentified: 'Vehicle Identified',
    analyzing: 'Analyzing...',
    pleaseWait: 'Please wait...',
    match: 'match',
    
    // Tabs
    overview: 'Overview',
    specs: 'Specs',
    trim: 'Trim',
    audience: 'Audience',
    issues: 'Issues',
    
    // Overview
    makeModel: 'Make & Model',
    productionYears: 'Production Years',
    generation: 'Generation',
    bodyType: 'Body Type',
    
    // Specs
    engine: 'Engine',
    power: 'Power',
    transmission: 'Transmission',
    fuelType: 'Fuel Type',
    acceleration: '0-60 mph',
    topSpeed: 'Top Speed',
    fuelEconomy: 'Fuel Economy',
    
    // Trim
    baseTrim: 'Base Trim',
    availableTrims: 'Available Trims',
    standardFeatures: 'Standard Features',
    optionalPackages: 'Optional Packages',
    
    // Audience
    primaryDemographic: 'Primary Demographic',
    useCase: 'Use Case',
    priceRange: 'Price Range',
    competitorModels: 'Competitor Models',
    
    // Issues
    commonProblems: 'Common Problems',
    recallInfo: 'Recall Information',
    maintenanceTips: 'Maintenance Tips',
    dimensions: 'Dimensions',
    trunkCapacity: 'Trunk Capacity',
    productionYears: 'Production Years',
    
    // Specs categories
    motorAndPower: 'Motor & Power',
    performance: 'Performance',
    transmissionAndFuel: 'Transmission & Fuel',
    
    // Permissions
    permissionRequired: 'Permission required',
    cameraPermission: 'Camera permission is needed to take photos.',
    galleryPermission: 'Gallery permission is needed to select photos.',
    error: 'Error',
    failedTakePhoto: 'Failed to take photo',
    failedSelectImage: 'Failed to select image',
    analysisIssue: 'Analysis Issue',
    processingError: 'Processing Error',
    connectionError: 'Connection Error',
    demoMode: 'Demo Mode',
    
    // History
    history: 'Analysis History',
    historyEmpty: 'No analysis history yet',
    historyEmptyDescription: 'Take a photo or upload from gallery to make your first analysis',
    deleteAnalysis: 'Delete Analysis',
    clearHistory: 'Clear History',
    confirmClearHistory: 'Are you sure you want to delete all analysis history?',
    cancel: 'Cancel',
    ok: 'OK',
    delete: 'Delete',
    analysisDeleted: 'Analysis deleted',
    historyCleared: 'History cleared',
    
    // Credit & Purchase System
    credits: 'Credits',
    freeAnalysis: 'Free Analysis',
    firstAnalysisFree: 'Your first analysis is free!',
    analysisRightsRemaining: 'analysis rights remaining',
    needCreditsToAnalyze: 'Credits needed to analyze',
    buyCredits: 'Buy Credits',
    insufficientCredits: 'Insufficient Credits',
    insufficientCreditsMessage: 'You don\'t have enough credits to perform analysis. Buy credits or use your free analysis.',
    
    // Purchase Screen
    purchaseTitle: 'Buy Credits',
    currentCredits: 'Current Credits',
    currentCreditsDesc: 'Purchase credits to start analyzing',
    restorePurchases: 'Restore Purchases',
    
    // Credit Packages
    starterPackage: 'Starter',
    starterPackageDesc: 'For small projects',
    popularPackage: 'Popular',
    popularPackageDesc: 'Most preferred',
    premiumPackage: 'Premium',
    premiumPackageDesc: 'For large projects',
    
    // Package Features
    unlimitedAnalysisRights: 'Unlimited queries until your credits run out',
    detailedVehicleInfo: 'Detailed vehicle information',
    pastAnalysisRecords: 'Past analysis records',
    buy: 'Buy',
    processing: 'Processing...',
    
    // Purchase Flow
    purchaseConfirmation: 'Purchase',
    purchaseSuccess: 'Purchase Successful!',
    purchaseSuccessMessage: 'credits added to your account. You can now start analyzing!',
    purchaseError: 'Purchase failed. Please try again.',
    purchaseProcessing: 'Processing purchase...',
    startAnalyzing: 'Start Analyzing',
    great: 'Great!',
    purchaseConfirmationMessage: 'package (#CREDITS# credits) for #PRICE#. Do you confirm?',
    
    // Demo Purchase
    demoPurchaseSuccess: 'Demo Purchase Successful!',
    demoPurchaseNote: 'This is demo mode. No real money was charged.',
    
    // Onboarding
    selectFromAbove: 'Select from above',
    buyAndStart: 'Buy & Start',
    startWithFreeTrial: 'Start with free trial',
    
    // Onboarding Data
    welcomeTitle: 'Welcome!',
    welcomeSubtitle: 'AI-Powered Vehicle Recognition',
    welcomeDescription: 'Identify your vehicle by taking a photo or selecting from gallery. Get detailed information in seconds with AI technology.',
    
    detailedAnalysisTitle: 'Detailed Analysis',
    detailedAnalysisSubtitle: 'Comprehensive Vehicle Information',
    detailedAnalysisDescription: 'Engine and performance details, trim levels, technical specifications. Professional-grade vehicle analysis.',
    
    firstFreeTitle: 'First Analysis Free',
    firstFreeSubtitle: 'Try Now!',
    firstFreeDescription: '1 free analysis, start using immediately. Test the app and see the quality.',
    
    creditSystemTitle: 'Credit System',
    creditSystemSubtitle: 'Flexible Payment',
    creditSystemDescription: 'Buy as many credits as you need. Credits remain in your account, use them whenever you want.',
    
    // Purchase Info Section
    howItWorks: 'How It Works?',
    howItWorksDescription: 'Each vehicle analysis uses 1 credit. When your credits run out, you can purchase a new package. Your credits never expire and are permanently stored in your account.',
    
    // Purchase Info Points
    infoPoint1: 'Purchases are processed through App Store/Google Play',
    infoPoint2: 'Credits are permanently stored in your account',
    infoPoint3: 'No cancellation or auto-renewal',
    infoPoint4: 'Contact us from settings if you experience problems',
    creditPackages: 'Credit Packages',
    
    // Onboarding Feature Lists
    enginePerformanceDetails: 'Engine and performance details',
    trimLevels: 'Trim levels',
    technicalSpecifications: 'Technical specifications',
    
    // Free Analysis Gift Box
    freeAnalysisCount: '1 Free Analysis',
    startUsingImmediately: 'Start using immediately!',
    
    // Settings
    settings: 'Settings',
    buyCreditsPlan: 'Buy Credits',
    addNewCredits: 'Add new credits',
    language: 'Language',
    currentLanguage: 'English',
    privacyPolicy: 'Privacy Policy',
    dataCollectionUsage: 'Data collection and usage',
    termsOfService: 'Terms of Service',
    serviceRulesConditions: 'Service rules and conditions',
    helpSupport: 'Help & Support',
    contactUs: 'Contact us',
    resetData: 'Reset Data',
    clearAllDataTest: 'Clear all data (Test)',
    currentCreditsLabel: 'Current Credits',
    creditHistory: 'Credit History',
    noTransactionHistory: 'No transaction history yet',
    appInfoTitle: 'Car Identify',
    appInfoDescription: 'AI-powered vehicle identification app',
    contact: 'Contact',
    contactMessage: 'How can we help you?',
    email: 'Email',
    website: 'Website',
    resetDataTitle: 'Reset Data',
    resetDataMessage: 'All your data (credits, history, settings) will be deleted. This action cannot be undone. Are you sure?',
    resetButton: 'Reset',
    resetSuccess: 'Success',
    resetSuccessMessage: 'All data has been reset.',
    resetError: 'Error',
    resetErrorMessage: 'An error occurred while resetting data.',
    buyCreditsButton: 'Buy Credits',
    legalDocuments: 'Legal Documents'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // Default to English

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'tr' ? 'en' : 'tr');
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 