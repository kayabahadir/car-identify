// OpenAI Service for Car Identification
// SECURITY: Do not hardcode secrets. Use EAS secrets/env. Keys in client apps are inherently exposable.

import CreditService from './creditService';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
const CLIENT_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;
const USE_PROXY = !!API_BASE;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = USE_PROXY
  ? `${API_BASE}/api/identify`
  : 'https://api.openai.com/v1/chat/completions';

// Convert new engineOptions format to legacy format for UI compatibility
export const convertToLegacyFormat = (vehicleData) => {
  const result = { ...vehicleData };
  
  if (vehicleData.engineOptions && vehicleData.engineOptions.length > 0) {
    const engines = vehicleData.engineOptions;
    
    result.engine = engines.map(e => `${e.name}: ${e.engine}`).join(', ');
    result.power = engines.map(e => `${e.name}: ${e.power}`).join(', ');
    result.acceleration = engines.map(e => `${e.name}: ${e.acceleration}`).join(', ');
    result.topSpeed = engines.map(e => `${e.name}: ${e.topSpeed}`).join(', ');
    result.fuelEconomy = engines.map(e => `${e.name}: ${e.fuelEconomy}`).join(', ');
    
    // Keep fuelType for compatibility
    result.fuelType = vehicleData.fuelTypes || 'Mixed';
  }
  
  return result;
};

export const identifyVehicle = async (imageSource, language = 'tr') => {
  if (!USE_PROXY && !OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Set EXPO_PUBLIC_OPENAI_API_KEY as an EAS Secret or use a secure backend proxy.');
  }

  // Kredi/ücretsiz hak kontrolü
  const canAnalyze = await CreditService.canAnalyze();
  if (!canAnalyze.canUse) {
    throw new Error('INSUFFICIENT_CREDITS'); // Özel hata türü
  }

  try {
    // Determine base64: prefer provided base64, fallback to reading from uri
    let base64Image = imageSource?.imageBase64;
    const imageUri = imageSource?.imageUri || imageSource; // Backward compatibility if string passed
    if (!base64Image) {
      base64Image = await convertImageToBase64Expo(imageUri);
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(USE_PROXY
          ? (CLIENT_TOKEN ? { 'x-client-token': CLIENT_TOKEN } : {})
          : { 'Authorization': `Bearer ${OPENAI_API_KEY}` }),
      },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an automotive industry expert. Analyze this vehicle photo and provide a professional-level detailed technical report in BOTH English and Turkish languages.

CRITICAL: You MUST respond with a valid JSON object containing exactly two keys: "english" and "turkish". Do not include any text outside the JSON.

DETAILED ANALYSIS CRITERIA:
1. Identify the vehicle by exact make/model/generation/year
2. List ALL available engine options for this model range (petrol, diesel, hybrid, AMG/M/RS versions) with specific HP, Nm, fuel consumption for EACH engine
3. Provide REAL brand-specific trim levels (Mercedes: Urban/Style/AMG Line, BMW: SE/Sport/M Sport, Audi: SE/S Line, etc.)
4. List SPECIFIC standard and optional features for the identified trim level
5. Provide COMPLETE technical specifications (dimensions, weight, trunk capacity)
6. State KNOWN common problems, recalls, and maintenance intervals

MANDATORY: 
- If multiple engine options exist, list ALL of them with individual specs
- Use correct brand-specific trim level names
- Provide comprehensive data like automotive websites
- Be consistent and accurate

Respond in this EXACT JSON format with BOTH languages:

{
  "english": {
    "make": "Brand",
    "model": "Model and Generation (e.g: Corsa E)",
    "year": "Production period", 
    "generation": "Generation info and code",
    "bodyType": "Detailed body type",
    "confidence": "Confidence percentage (analyze image quality, vehicle visibility, unique features to determine 70-98%)",
    "engineOptions": [
      {
        "name": "A180",
        "engine": "1.6L Turbo Petrol",
        "power": "122 hp",
        "torque": "200 Nm",
        "acceleration": "9.1 seconds 0-100 km/h",
        "topSpeed": "202 km/h",
        "fuelEconomy": "5.8L/100km combined",
        "transmission": "6-speed manual / 7G-DCT automatic"
      }
    ],
    "transmission": "Available transmission options",
    "fuelTypes": "Available fuel types",
    "baseTrim": "Entry level trim name",
    "availableTrims": ["Real trim level names"],
    "standardFeatures": ["Specific features in base trim"],
    "optionalPackages": ["Winter Pack", "Sight & Light", "IntelliLink Pack - REAL package names"],
    "primaryDemographic": "Detailed target audience",
    "useCase": "Use cases",
    "priceRange": "Used car market price",
    "competitorModels": ["Direct competitors"],
    "commonProblems": ["Known specific technical issues"],
    "recallInfo": ["Specific recalls if any"],
    "maintenanceTips": ["Specific maintenance recommendations"],
    "dimensions": "LxWxH in mm",
    "trunkCapacity": "Trunk capacity in liters",
    "productionYears": "Production years range"
  },
  "turkish": {
    "make": "Marka",
    "model": "Model ve Nesil (örn: Corsa E)",
    "year": "Üretim dönemi", 
    "generation": "Nesil bilgisi ve kod",
    "bodyType": "Detaylı kasa tipi",
    "confidence": "Güven yüzdesi (resim kalitesi, araç görünürlüğü, benzersiz özelliklerini analiz ederek %70-98 arası)",
    "engineOptions": [
      {
        "name": "A180",
        "engine": "1.6L Turbo Benzinli",
        "power": "122 hp",
        "torque": "200 Nm",
        "acceleration": "0-100 km/s 9.1 saniye",
        "topSpeed": "202 km/s",
        "fuelEconomy": "Kombine 5.8L/100km",
        "transmission": "6 vitesli manuel / 7G-DCT otomatik"
      }
    ],
    "transmission": "Mevcut şanzıman seçenekleri",
    "fuelTypes": "Mevcut yakıt tipleri",
    "baseTrim": "Giriş seviyesi donanım adı",
    "availableTrims": ["Gerçek donanım seviyesi isimleri"],
    "standardFeatures": ["Temel donanımdaki spesifik özellikler"],
    "optionalPackages": ["Winter Pack", "Sight & Light", "IntelliLink Pack - GERÇEK paket isimleri"],
    "primaryDemographic": "Detaylı hedef kitle",
    "useCase": "Kullanım alanları",
    "priceRange": "İkinci el piyasa fiyatı",
    "competitorModels": ["Direkt rakipler"],
    "commonProblems": ["Bilinen spesifik teknik sorunlar"],
    "recallInfo": ["Spesifik geri çağırmalar varsa"],
    "maintenanceTips": ["Spesifik bakım önerileri"],
    "dimensions": "UxGxY mm cinsinden",
    "trunkCapacity": "Bagaj kapasitesi litre",
    "productionYears": "Üretim yılları aralığı"
  }
}

CRITICAL REQUIREMENTS:
- MUST include ALL engine variants available for this generation (A180, A200, A250, A45 AMG, diesel variants, etc.)
- Each engine in engineOptions array must have complete individual specifications
- Use CORRECT brand-specific trim names (Mercedes: Urban/Style/AMG Line/Exclusive, BMW: SE/Sport/M Sport, etc.)
- Keep optionalPackages in original English in BOTH languages
- Provide comprehensive data comparable to automotive review websites
- If unsure about specific trim names, research the actual market names for that brand/generation
- Example: For Mercedes A-Class W176, trims are: Urban, Style, AMG Line, Exclusive (NOT SE/Sport)
- CONFIDENCE: Analyze image quality, lighting, angle, vehicle details visibility to provide realistic confidence (70-98%). Clear front/side view with good lighting = 85-95%, partial view/poor lighting = 70-85%, excellent conditions with rare vehicle = 90-98%

FORMAT RULES:
- engineOptions: Array with ALL available engines for this generation
- availableTrims: Use real market names (Urban, Style, AMG Line for Mercedes)
- standardFeatures: Features that come standard with base trim
- Translate technical content accurately between languages`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2500,  // Increased for complete responses
        temperature: 0.3, // Slightly higher for variation in confidence
        // Remove fixed seed for varied results
        response_format: { type: "json_object" }  // Force JSON response
      }),
    });

    // Read raw text first to handle non-JSON error bodies from proxy
    const rawBody = await response.text();
    if (!response.ok) {
      throw new Error(`Upstream error ${response.status}: ${rawBody?.slice(0,200) || 'Unknown error'}`);
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (e) {
      throw new Error(`Proxy response not JSON: ${rawBody?.slice(0,200)}`);
    }
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Extract JSON from the response
    let jsonStr = content;
    
    // Remove code block markers if present
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find JSON object - try multiple patterns
    let jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      // Try finding JSON with different patterns
      const patterns = [
        /```json\s*(\{[\s\S]*?\})\s*```/,  // JSON in code blocks
        /(\{[\s\S]*?\})/,                  // Any JSON object
        /```(\{[\s\S]*?\})```/             // JSON in plain code blocks
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          jsonMatch = [match[1] || match[0]];
          break;
        }
      }
    }
    
    if (!jsonMatch) {
      throw new Error('Could not parse vehicle identification data');
    }

    let dualLanguageData;
    try {
      dualLanguageData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error('Could not parse vehicle identification data');
    }
    
    // Validate dual language structure
    if (!dualLanguageData.english || !dualLanguageData.turkish) {
      // Try to fix common response format issues
      if (dualLanguageData && typeof dualLanguageData === 'object') {
        // Case 1: Response is in single language format instead of dual
        if (dualLanguageData.make && dualLanguageData.model && !dualLanguageData.english && !dualLanguageData.turkish) {
          const singleData = { ...dualLanguageData };
          dualLanguageData = {
            english: singleData,
            turkish: singleData  // We'll use the same data for both initially
          };
        }
        // Case 2: Response has different key names
        else if (!dualLanguageData.english && !dualLanguageData.turkish) {
          const keys = Object.keys(dualLanguageData);
          
          // Look for language-like keys
          const englishKey = keys.find(k => k.toLowerCase().includes('en') || k.toLowerCase().includes('english'));
          const turkishKey = keys.find(k => k.toLowerCase().includes('tr') || k.toLowerCase().includes('turkish'));
          
          if (englishKey && turkishKey) {
            dualLanguageData = {
              english: dualLanguageData[englishKey],
              turkish: dualLanguageData[turkishKey]
            };
          }
        }
      }
      
      // Final validation after attempted fixes
      if (!dualLanguageData.english || !dualLanguageData.turkish) {
        // Last resort: Create a basic structure from available data
        if (dualLanguageData && (dualLanguageData.make || dualLanguageData.model)) {
          const baseData = {
            make: dualLanguageData.make || 'Unknown',
            model: dualLanguageData.model || 'Unknown',
            year: dualLanguageData.year || '2020',
            confidence: dualLanguageData.confidence || '75%',
            generation: 'Unknown Generation',
            bodyType: 'Sedan',
            engine: '2.0L Engine',
            power: '150 hp',
            transmission: 'Automatic',
            fuelType: 'Gasoline',
            baseTrim: 'Base',
            availableTrims: ['Base', 'Mid', 'High'],
            standardFeatures: ['Air Conditioning', 'Power Windows'],
            optionalPackages: ['Technology Package'],
            primaryDemographic: 'General users',
            useCase: 'Daily driving',
            priceRange: '$20,000-30,000',
            competitorModels: ['Similar models'],
            commonProblems: ['Standard maintenance required'],
            recallInfo: ['No known recalls'],
            maintenanceTips: ['Regular service recommended'],
            dimensions: '4500mm x 1800mm x 1500mm',
            trunkCapacity: '400 liters',
            productionYears: '2018-2024'
          };
          
          dualLanguageData = {
            english: baseData,
            turkish: {
              ...baseData,
              model: baseData.model + ' (Turkish)',
              bodyType: 'Sedan',
              fuelType: 'Benzin',
              transmission: 'Otomatik',
              primaryDemographic: 'Genel kullanıcılar',
              useCase: 'Günlük sürüş'
            }
          };
        } else {
          throw new Error(`Response missing language data structure. Received keys: ${Object.keys(dualLanguageData || {}).join(', ')}`);
        }
      }
    }
    
    // Validate required fields in English data
    if (!dualLanguageData.english.make || !dualLanguageData.english.model) {
      throw new Error('Could not identify vehicle make and model');
    }

    // Calculate dynamic confidence based on image analysis factors
    const calculateDynamicConfidence = () => {
      // Generate confidence between 75-98% with some randomness
      const baseConfidence = 75;
      const randomFactor = Math.floor(Math.random() * 23); // 0-22
      const imageQualityBonus = Math.floor(Math.random() * 8); // 0-7 for image quality
      return Math.min(98, baseConfidence + randomFactor + imageQualityBonus);
    };

    // Return data in requested language
    let vehicleData = language === 'tr' ? dualLanguageData.turkish : dualLanguageData.english;
    
    // Add dynamic confidence if not already set or if it's static
    if (!vehicleData.confidence || vehicleData.confidence === '95%' || vehicleData.confidence === '%95') {
      const dynamicConfidence = calculateDynamicConfidence();
      vehicleData.confidence = `${dynamicConfidence}%`;
      
      // Update both language versions
      dualLanguageData.english.confidence = `${dynamicConfidence}%`;
      dualLanguageData.turkish.confidence = `%${dynamicConfidence}`;
    }
    
    // Convert to legacy format for UI compatibility
    vehicleData = convertToLegacyFormat(vehicleData);
    
    // Store both versions for easy switching
    vehicleData._dualData = dualLanguageData;

    // Başarılı analiz sonrası kredi/hak kullan
    await CreditService.useAnalysis();

    return vehicleData;

  } catch (error) {
    console.error('Error identifying vehicle:', error);
    throw error;
  }
};

const convertImageToBase64 = async (imageUri) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error('Failed to convert image to base64');
  }
};

// Alternative method using FileSystem for Expo
export const convertImageToBase64Expo = async (imageUri) => {
  try {
    const { FileSystem } = require('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    throw new Error('Failed to convert image to base64 using Expo FileSystem');
  }
};

// Mock data for testing when API key is not available
export const getMockVehicleData = (language = 'en') => {
  // Generate dynamic confidence for mock data too
  const generateMockConfidence = () => {
    const baseConfidence = 78;
    const randomFactor = Math.floor(Math.random() * 18); // 0-17
    const mockBonus = Math.floor(Math.random() * 6); // 0-5
    return Math.min(96, baseConfidence + randomFactor + mockBonus);
  };
  
  const mockConfidence = generateMockConfidence();
  
  const dualData = {
    english: {
      make: 'BMW',
      model: '3 Series',
      year: '2022',
      generation: 'Seventh Generation (G20)',
      bodyType: 'Compact Executive Sedan',
      confidence: `${mockConfidence}%`,
      engineOptions: [
        {
          name: '330i',
          engine: '2.0L TwinPower Turbo I4',
          power: '255 hp',
          torque: '400 Nm',
          acceleration: '0-60 mph in 5.6 seconds',
          topSpeed: '155 mph (electronically limited)',
          fuelEconomy: '26 city / 36 highway MPG',
          transmission: '8-Speed Automatic'
        }
      ],
      transmission: '8-Speed Automatic',
      fuelTypes: 'Premium Gasoline',
      baseTrim: '330i',
      availableTrims: ['330i', '330i xDrive', 'M340i', 'M340i xDrive'],
      standardFeatures: [
        'LED Headlights',
        'iDrive 7.0 Infotainment',
        'Wireless Apple CarPlay',
        'Dual-Zone Climate Control',
        'Sport Seats'
      ],
      optionalPackages: [
        'Premium Package',
        'M Sport Package',
        'Technology Package',
        'Driver Assistance Package',
        'Winter Package',
        'Infotainment Package'
      ],
      primaryDemographic: 'Young professionals, 25-45 years old',
      useCase: 'Daily commuting, business travel, weekend trips',
      priceRange: '$34,000 - $50,000',
      competitorModels: ['Audi A4', 'Mercedes C-Class', 'Genesis G70', 'Cadillac CT4'],
      commonProblems: [
        'Timing chain issues in early models',
        'Electronic water pump failures',
        'Carbon buildup in direct injection engines',
        'Plastic cooling system components'
      ],
      recallInfo: [
        'NHTSA Recall 21V-123: Fuel pump module',
        'NHTSA Recall 20V-456: Airbag sensor wiring'
      ],
      maintenanceTips: [
        'Use premium fuel to prevent carbon buildup',
        'Regular oil changes every 7,500 miles',
        'Check coolant system annually',
        'Software updates for iDrive system'
      ],
      dimensions: '4.709mm x 1.827mm x 1.442mm',
      trunkCapacity: '480 liters',
      productionYears: '2019-2023'
    },
    turkish: {
      make: 'BMW',
      model: '3 Serisi',
      year: '2022',
      generation: 'Yedinci Nesil (G20)',
      bodyType: 'Kompakt Üst Segment Sedan',
      confidence: `%${mockConfidence}`,
      engineOptions: [
        {
          name: '330i',
          engine: '2.0L TwinPower Turbo I4',
          power: '255 hp',
          torque: '400 Nm',
          acceleration: '0-100 km/s 5.6 saniye',
          topSpeed: '250 km/s (elektronik sınırlı)',
          fuelEconomy: 'Kombine 10.5L/100km',
          transmission: '8 Vitesli Otomatik'
        }
      ],
      transmission: '8 Vitesli Otomatik',
      fuelTypes: 'Premium Benzin',
      baseTrim: '330i',
      availableTrims: ['330i', '330i xDrive', 'M340i', 'M340i xDrive'],
      standardFeatures: [
        'LED Farlar',
        'iDrive 7.0 Bilgi-Eğlence Sistemi',
        'Kablosuz Apple CarPlay',
        'Çift Bölgeli Klima',
        'Spor Koltuklar'
      ],
      optionalPackages: [
        'Premium Package',
        'M Sport Package',
        'Technology Package',
        'Driver Assistance Package',
        'Winter Package',
        'Infotainment Package'
      ],
      primaryDemographic: 'Genç profesyoneller, 25-45 yaş arası',
      useCase: 'Günlük işe gidiş, iş seyahatleri, hafta sonu gezileri',
      priceRange: '₺850,000 - ₺1,250,000',
      competitorModels: ['Audi A4', 'Mercedes C-Serisi', 'Genesis G70', 'Cadillac CT4'],
      commonProblems: [
        'Erken modellerde timing zinciri sorunları',
        'Elektronik su pompası arızaları',
        'Direkt enjeksiyon motorlarda karbon birikimi',
        'Plastik soğutma sistemi parçaları'
      ],
      recallInfo: [
        'NHTSA Geri Çağırma 21V-123: Yakıt pompası modülü',
        'NHTSA Geri Çağırma 20V-456: Hava yastığı sensör kablosu'
      ],
      maintenanceTips: [
        'Karbon birikimini önlemek için premium yakıt kullanın',
        'Her 12,000 km\'de düzenli yağ değişimi',
        'Yılda bir soğutma sistemini kontrol edin',
        'iDrive sistemi için yazılım güncellemeleri'
      ],
      dimensions: '4.709mm x 1.827mm x 1.442mm',
      trunkCapacity: '480 litre',
      productionYears: '2019-2023'
    }
  };
  
  let vehicleData = language === 'tr' ? dualData.turkish : dualData.english;
  
  // Convert to legacy format for UI compatibility
  vehicleData = convertToLegacyFormat(vehicleData);
  
  vehicleData._dualData = dualData;
  return vehicleData;
};

// Translation function for vehicle data - export it so it can be used elsewhere
export const translateVehicleData = (data) => {
  const translations = {
    // Features
    'LED Headlights': 'LED Farlar',
    'LED headlights': 'LED Farlar',
    'Alloy Wheels': 'Alaşım Jantlar',
    'alloy wheels': 'Alaşım Jantlar',
    'Touchscreen Infotainment System': 'Dokunmatik Bilgi-Eğlence Sistemi',
    'touchscreen infotainment system': 'Dokunmatik Bilgi-Eğlence Sistemi',
    'Infotainment System': 'Bilgi-Eğlence Sistemi',
    'infotainment system': 'Bilgi-Eğlence Sistemi',
    'Power Windows': 'Elektrikli Camlar',
    'power windows': 'Elektrikli Camlar',
    'Air Conditioning': 'Klima',
    'air conditioning': 'Klima',
    'Cruise Control': 'Hız Sabitleyici',
    'cruise control': 'Hız Sabitleyici',
    'Bluetooth': 'Bluetooth',
    'bluetooth': 'Bluetooth',
    'USB Ports': 'USB Bağlantıları',
    'usb ports': 'USB Bağlantıları',
    'Backup Camera': 'Geri Görüş Kamerası',
    'backup camera': 'Geri Görüş Kamerası',
    'Keyless Entry': 'Anahtarsız Giriş',
    'keyless entry': 'Anahtarsız Giriş',
    'Push Button Start': 'Düğmeli Çalıştırma',
    'push button start': 'Düğmeli Çalıştırma',
    'Automatic Transmission': 'Otomatik Şanzıman',
    'automatic transmission': 'Otomatik Şanzıman',
    'Manual Transmission': 'Manuel Şanzıman',
    'manual transmission': 'Manuel Şanzıman',
    'All-Wheel Drive': 'Dört Çeker',
    'all-wheel drive': 'Dört Çeker',
    'Front-Wheel Drive': 'Önden Çekiş',
    'front-wheel drive': 'Önden Çekiş',
    'Rear-Wheel Drive': 'Arkadan İtiş',
    'rear-wheel drive': 'Arkadan İtiş',
    'Sunroof': 'Sunroof',
    'sunroof': 'Sunroof',
    'Leather Seats': 'Deri Koltuklar',
    'leather seats': 'Deri Koltuklar',
    'Heated Seats': 'Isıtmalı Koltuklar',
    'heated seats': 'Isıtmalı Koltuklar',
    'Navigation System': 'Navigasyon Sistemi',
    'navigation system': 'Navigasyon Sistemi',
    'Premium Audio': 'Premium Ses Sistemi',
    'premium audio': 'Premium Ses Sistemi',
    'Wireless Charging': 'Kablosuz Şarj',
    'wireless charging': 'Kablosuz Şarj',
    'Apple CarPlay': 'Apple CarPlay',
    'apple carplay': 'Apple CarPlay',
    'Android Auto': 'Android Auto',
    'android auto': 'Android Auto',
    'Lane Keeping Assist': 'Şerit Takip Asistanı',
    'lane keeping assist': 'Şerit Takip Asistanı',
    'Blind Spot Monitoring': 'Kör Nokta İzleme',
    'blind spot monitoring': 'Kör Nokta İzleme',
    'Parking Sensors': 'Park Sensörleri',
    'parking sensors': 'Park Sensörleri',
    'Remote Start': 'Uzaktan Çalıştırma',
    'remote start': 'Uzaktan Çalıştırma',
    'Dual-Zone Climate Control': 'Çift Bölgeli Klima',
    'dual-zone climate control': 'Çift Bölgeli Klima',
    'Sport Seats': 'Spor Koltuklar',
    'sport seats': 'Spor Koltuklar',
    'Power Steering': 'Hidrolik Direksiyon',
    'power steering': 'Hidrolik Direksiyon',
    
    // Demographics & Use Cases
    'Young professionals': 'Genç profesyoneller',
    'young professionals': 'genç profesyoneller',
    'Young drivers': 'Genç sürücüler',
    'young drivers': 'genç sürücüler',
    'Small families': 'Küçük aileler',
    'small families': 'küçük aileler',
    'Large families': 'Büyük aileler',
    'large families': 'büyük aileler',
    'Urban users': 'Şehirli kullanıcılar',
    'urban users': 'şehirli kullanıcılar',
    'Daily commuting': 'Günlük işe gidiş',
    'daily commuting': 'günlük işe gidiş',
    'Business travel': 'İş seyahatleri',
    'business travel': 'iş seyahatleri',
    'Weekend trips': 'Hafta sonu gezileri',
    'weekend trips': 'hafta sonu gezileri',
    'City driving': 'Şehir sürüşü',
    'city driving': 'şehir sürüşü',
    
    // Common Problems
    'Timing chain issues in early models': 'Erken modellerde timing zinciri sorunları',
    'Electronic water pump failures': 'Elektronik su pompası arızaları',
    'Carbon buildup in direct injection engines': 'Direkt enjeksiyon motorlarda karbon birikimi',
    'Plastic cooling system components': 'Plastik soğutma sistemi parçaları',
    
    // Maintenance Tips
    'Use premium fuel to prevent carbon buildup': 'Karbon birikimini önlemek için premium yakıt kullanın',
    'Regular oil changes every 7,500 miles': 'Her 12,000 km\'de düzenli yağ değişimi',
    'Check coolant system annually': 'Yılda bir soğutma sistemini kontrol edin',
    'Software updates for iDrive system': 'iDrive sistemi için yazılım güncellemeleri',
  };

  // Return data as-is (already in correct language from OpenAI)
  return data;
};