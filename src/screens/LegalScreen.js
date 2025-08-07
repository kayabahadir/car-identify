import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

const LegalScreen = ({ navigation, route }) => {
  const { language, t } = useLanguage();
  const { document = 'privacy' } = route.params || {};
  const [activeDoc, setActiveDoc] = useState(document);

  const documents = {
    privacy: {
      title: t('privacyPolicy'),
      icon: 'shield-checkmark',
      content: getPrivacyContent(language)
    },
    terms: {
      title: t('termsOfService'),
      icon: 'document-text',
      content: getTermsContent(language)
    }
  };

  function getPrivacyContent(lang) {
    if (lang === 'tr') {
      return `
**Son güncelleme: Ocak 2025**

**Giriş**

Car Identify ("biz", "bizim" veya "uygulamımız") Car Identify mobil uygulamasını ("Hizmet") işletmektedir. Bu sayfa, Hizmetimizi kullandığınızda kişisel verilerin toplanması, kullanılması ve ifşa edilmesi ile ilgili politikalarımız hakkında sizi bilgilendirir.

**Topladığımız Bilgiler**

**Kamera ve Fotoğraf Kütüphanesi Erişimi**
• Amaç: AI analizi için araç görüntülerini çekmek veya seçmek
• Veri: Analiz etmeyi seçtiğiniz araç görüntüleri
• Depolama: Görüntüler OpenAI API aracılığıyla uzaktan işlenir ve sunucularımızda kalıcı olarak depolanmaz
• İzinler: Fotoğraf çekmek için kamera erişimi, mevcut resimleri seçmek için fotoğraf kütüphanesi erişimi

**Kullanım Verisi**
• Yerel Veri: Kredi bakiyesi, analiz geçmişi, satın alma kayıtları
• Depolama: Güvenli depolama kullanılarak cihazınızda yerel olarak saklanır
• Analitik: Uygulama kullanım istatistikleri (çökmeler, performans metrikleri)

**Üçüncü Taraf Hizmetleri**

**OpenAI API**
• Amaç: Araç tanımlama ve analizi
• Paylaşılan Veri: Araç görüntüleri ve kullanıcı sorguları
• Gizlilik Politikası: https://openai.com/privacy/

**Uygulama İçi Satın Alma (IAP)**
• Amaç: Genişletilmiş uygulama kullanımı için kredi satın alımları
• Veri: İşlem ID'leri, satın alma tutarları, ürün ID'leri
• Sağlayıcılar: Apple App Store, Google Play Store

**Bilgileri Nasıl Kullanıyoruz**

• Birincil Amaç: Araç tanımlama ve analizi
• Hizmet İyileştirme: Uygulamayı geliştirmek için kullanım kalıplarını anlama
• İşlem İşleme: Kredi satın alımları ve bakiyelerini yönetme
• İletişim: Talep edildiğinde müşteri desteği sağlama

**Veri Paylaşımı**

Kişisel bilgilerinizi üçüncü taraflara satmaz, takas etmez veya kiralamayız. Veriler yalnızca şunlarla paylaşılır:
• OpenAI: Araç analizi işleme için
• App Store Platformları: Satın alma işleme için
• Yasal Gereksinimler: Yasa veya yasal süreç gerektirdiğinde

**Veri Güvenliği**

• Yerel Depolama: Tüm kişisel veriler cihazınızda güvenli bir şekilde saklanır
• İletim: OpenAI'ye iletilen veriler aktarım sırasında şifrelenir
• Merkezi Veritabanı Yok: Merkezi bir kullanıcı veritabanı bulundurmuyoruz
• Görüntü İşleme: Görüntüler işlenir ve kalıcı olarak saklanmaz

**Haklarınız**

• Erişim: Uygulama ayarları aracılığıyla tüm verilerinize erişebilirsiniz
• Silme: Uygulamayı kaldırarak verilerinizi silebilirsiniz
• Çıkış: Hizmeti istediğiniz zaman kullanmayı durdurabilirsiniz
• Veri Taşınabilirliği: Analiz geçmişinizi uygulamadan dışa aktarabilirsiniz

**Çocukların Gizliliği**

Hizmetimiz, 13 yaşın altındaki çocuklardan bilerek kişisel olarak tanımlanabilir bilgiler toplamaz.

**İletişim**

Bu Gizlilik Politikası hakkında sorularınız varsa:
• E-posta: privacy@caridentify.app
• Web sitesi: https://caridentify.app/contact
      `;
    } else {
      return `
**Last updated: January 2025**

**Introduction**

Car Identify ("we", "our", or "us") operates the Car Identify mobile application (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.

**Information We Collect**

**Camera and Photo Library Access**
• Purpose: To capture or select vehicle images for AI analysis
• Data: Vehicle images you choose to analyze
• Storage: Images are processed remotely via OpenAI API and are not permanently stored on our servers
• Permissions: Camera access for taking photos, Photo library access for selecting existing images

**Usage Data**
• Local Data: Credit balance, analysis history, purchase records
• Storage: Stored locally on your device using secure storage
• Analytics: App usage statistics (crashes, performance metrics)

**Third-Party Services**

**OpenAI API**
• Purpose: Vehicle identification and analysis
• Data Shared: Vehicle images and user prompts
• Privacy Policy: https://openai.com/privacy/

**In-App Purchases (IAP)**
• Purpose: Credit purchases for extended app usage
• Data: Transaction IDs, purchase amounts, product IDs
• Providers: Apple App Store, Google Play Store

**How We Use Information**

• Primary Purpose: Vehicle identification and analysis
• Service Improvement: Understanding usage patterns to improve the app
• Transaction Processing: Managing credit purchases and balances
• Communication: Providing customer support when requested

**Data Sharing**

We do not sell, trade, or rent your personal information to third parties. Data is only shared with:
• OpenAI: For vehicle analysis processing
• App Store Platforms: For purchase processing
• Legal Requirements: When required by law or legal process

**Data Security**

• Local Storage: All personal data is stored securely on your device
• Transmission: Data transmitted to OpenAI is encrypted in transit
• No Central Database: We do not maintain a central user database
• Image Processing: Images are processed and not permanently stored

**Your Rights**

• Access: You can access all your data through the app settings
• Deletion: You can delete your data by removing the app
• Opt-out: You can stop using the service at any time
• Data Portability: You can export your analysis history from the app

**Children's Privacy**

Our Service does not knowingly collect personally identifiable information from children under 13.

**Contact Us**

If you have any questions about this Privacy Policy:
• Email: privacy@caridentify.app
• Website: https://caridentify.app/contact
      `;
    }
  }

  function getTermsContent(lang) {
    if (lang === 'tr') {
      return `
**Son güncelleme: Ocak 2025**

**1. Şartların Kabulü**

Car Identify mobil uygulamasını ("Uygulama", "Hizmet") indirerek, yükleyerek veya kullanarak, bu Kullanım Şartları ("Şartlar") ile bağlı olmayı kabul etmiş olursunuz.

**2. Hizmet Açıklaması**

Car Identify, OpenAI'nin GPT-4 Vision API'si ile desteklenen gelişmiş bilgisayar görme teknolojisini kullanarak fotoğraflardan araçları tanımlayan ve analiz eden AI destekli bir mobil uygulamadır.

**Ana Özellikler:**
• Fotoğraflardan araç tanımlama
• Detaylı teknik özellikler
• Çoklu motor varyant bilgileri
• Geçmiş ve bakım verileri
• Kredi tabanlı kullanım sistemi

**3. Kredi Sistemi**

**3.1 Ücretsiz Analiz**
• Yeni kullanıcılar bir (1) ücretsiz araç analizi alır
• Ücretsiz analiz geri yüklenemez veya transfer edilemez

**3.2 Kredi Satın Alma**
• Ek analizler kredi gerektirir
• Krediler uygulama içi satın alma (IAP) yoluyla satın alınır
• Mevcut paketler:
  - 10 Kredi: Başlangıç Paketi
  - 50 Kredi: Popüler Paket
  - 200 Kredi: Premium Paket

**3.3 Kredi Kullanımı**
• Her araç analizi bir (1) kredi tüketir
• Krediler iade edilemez ve transfer edilemez
• Kredilerin süresi dolmaz
• Krediler cihazınıza bağlıdır ve transfer edilemez

**3.4 İade Politikası**
• Tüm satışlar kesindir
• Krediler satın alındıktan sonra iade edilemez
• Analizi engelleyen teknik sorunlar durumunda desteğe başvurun

**4. Kullanıcı Sorumlulukları**

**4.1 Uygun Kullanım**
• Uygulamayı yalnızca araç tanımlama için kullanın
• Uygunsuz, saldırgan veya telif hakkı korumalı görseller göndermeyin
• Uygulamayı tersine mühendislik veya hackleme girişiminde bulunmayın

**4.2 Görsel İçerik**
• Gönderdiğiniz görsellerin sahibi olmalı veya kullanım izniniz olmalı
• Görseller doğru analiz için araçları açıkça göstermelidir
• Kişisel bilgi veya plaka içeren görseller göndermeyin

**4.3 Doğruluk Feragatnamesi**
• AI analiz sonuçları yalnızca bilgilendirme amaçlıdır
• Sonuçlar %100 doğru olmayabilir
• Satın alma kararları için yalnızca Uygulama sonuçlarına güvenmeyin

**5. Sorumluluk Sınırlaması**

**5.1 Hizmet Kullanılabilirliği**
• %99 çalışma süresi için çabalıyoruz ancak sürekli hizmeti garanti edemeyiz
• Bakım, güncellemeler veya teknik sorunlar geçici kesintilere neden olabilir

**5.2 Analiz Doğruluğu**
• AI analizi garanti olmaksızın "olduğu gibi" sağlanır
• Araç tanımlama doğruluğunu garanti etmeyiz

**5.3 Mali Sınırlar**
• Toplam sorumluluğumuz kredi için ödediğiniz miktarla sınırlıdır
• Dolaylı, sonuçsal veya cezai zararlardan sorumlu değiliz

**6. İletişim Bilgileri**

Bu Şartlar hakkında sorular için:
• E-posta: legal@caridentify.app
• Destek: support@caridentify.app
• Web sitesi: https://caridentify.app/contact
      `;
    } else {
      return `
**Last updated: January 2025**

**1. Acceptance of Terms**

By downloading, installing, or using the Car Identify mobile application ("App", "Service"), you agree to be bound by these Terms of Service ("Terms").

**2. Description of Service**

Car Identify is an AI-powered mobile application that identifies and analyzes vehicles from photographs using advanced computer vision technology powered by OpenAI's GPT-4 Vision API.

**Key Features:**
• Vehicle identification from photos
• Detailed technical specifications
• Multiple engine variant information
• Historical and maintenance data
• Credit-based usage system

**3. Credit System**

**3.1 Free Analysis**
• New users receive one (1) free vehicle analysis
• Free analysis cannot be restored or transferred

**3.2 Credit Purchases**
• Additional analyses require credits
• Credits are purchased through in-app purchases (IAP)
• Available packages:
  - 10 Credits: Starter Package
  - 50 Credits: Popular Package
  - 200 Credits: Premium Package

**3.3 Credit Usage**
• Each vehicle analysis consumes one (1) credit
• Credits are non-refundable and non-transferable
• Credits do not expire
• Credits are tied to your device and cannot be transferred

**3.4 Refund Policy**
• All sales are final
• Credits cannot be refunded once purchased
• In case of technical issues preventing analysis, contact support

**4. User Responsibilities**

**4.1 Appropriate Use**
• Use the App only for identifying vehicles
• Do not submit inappropriate, offensive, or copyrighted images
• Do not attempt to reverse engineer or hack the App

**4.2 Image Content**
• You must own or have permission to use submitted images
• Images should clearly show vehicles for accurate analysis
• Do not submit images containing personal information or license plates

**4.3 Accuracy Disclaimer**
• AI analysis results are for informational purposes only
• Results may not be 100% accurate
• Do not rely solely on App results for purchasing decisions

**5. Limitation of Liability**

**5.1 Service Availability**
• We strive for 99% uptime but cannot guarantee continuous service
• Maintenance, updates, or technical issues may cause temporary interruptions

**5.2 Analysis Accuracy**
• AI analysis is provided "as is" without warranties
• We do not guarantee accuracy of vehicle identification

**5.3 Financial Limits**
• Our total liability is limited to the amount you paid for credits
• We are not liable for indirect, consequential, or punitive damages

**6. Contact Information**

For questions about these Terms:
• Email: legal@caridentify.app
• Support: support@caridentify.app
• Website: https://caridentify.app/contact
      `;
    }
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
        <Text style={styles.headerTitle}>
          {t('legalDocuments')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Document Tabs */}
      <View style={styles.tabContainer}>
        {Object.keys(documents).map((docKey) => (
          <TouchableOpacity
            key={docKey}
            style={[
              styles.tab,
              activeDoc === docKey && styles.activeTab
            ]}
            onPress={() => setActiveDoc(docKey)}
          >
            <Ionicons 
              name={documents[docKey].icon} 
              size={20} 
              color={activeDoc === docKey ? '#4f46e5' : '#6b7280'} 
            />
            <Text style={[
              styles.tabText,
              activeDoc === docKey && styles.activeTabText
            ]}>
              {documents[docKey].title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Document Content */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.documentContent}>
          <Text style={styles.documentText}>
            {documents[activeDoc].content}
          </Text>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4f46e5',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#4f46e5',
  },
  contentContainer: {
    flex: 1,
  },
  documentContent: {
    padding: 20,
  },
  documentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
  },
});

export default LegalScreen; 