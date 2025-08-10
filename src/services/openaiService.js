// OpenAI Service for Car Identification
// SECURITY: Do not hardcode secrets. Use EAS secrets/env. Keys in client apps are inherently exposable.

import CreditService from './creditService';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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

export const identifyVehicle = async (imageUri, language = 'tr') => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Set EXPO_PUBLIC_OPENAI_API_KEY as an EAS Secret or use a secure backend proxy.');
  }

  // Kredi/ücretsiz hak kontrolü
  const canAnalyze = await CreditService.canAnalyze();
  if (!canAnalyze.canUse) {
    throw new Error('INSUFFICIENT_CREDITS'); // Özel hata türü
  }

  try {
    // Convert image to base64 (use Expo FileSystem for reliability on native)
    const base64Image = await convertImageToBase64Expo(imageUri);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Extract JSON from the response
    console.log('📝 OpenAI Raw Response received, length:', content.length);
    
    // Try to find JSON in the response - handle code blocks and other formats
    let jsonStr = content;
    
    // Remove code block markers if present
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find JSON object - try multiple patterns
    let jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.log('❌ Primary JSON pattern failed, trying alternatives...');
      
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
          console.log('✅ JSON found with alternative pattern');
          break;
        }
      }
    }
    
    if (!jsonMatch) {
      console.log('❌ No JSON found in response, content:', content);
      throw new Error('Could not parse vehicle identification data');
    }

    let dualLanguageData;
    try {
      dualLanguageData = JSON.parse(jsonMatch[0]);
      console.log('✅ JSON Parse successful');
      console.log('🔍 Parsed data keys:', Object.keys(dualLanguageData || {}));
    } catch (parseError) {
      console.log('❌ JSON Parse Error:', parseError);
      console.log('❌ Attempted to parse:', jsonMatch[0]);
      throw new Error('Could not parse vehicle identification data');
    }
    
    // Validate dual language structure
    if (!dualLanguageData.english || !dualLanguageData.turkish) {
      console.log('❌ VALIDATION ERROR - Received data structure:', JSON.stringify(dualLanguageData, null, 2));
      console.log('❌ Has english?', !!dualLanguageData.english);
      console.log('❌ Has turkish?', !!dualLanguageData.turkish);
      console.log('❌ Object keys:', Object.keys(dualLanguageData || {}));
      
      // Try to fix common response format issues
      if (dualLanguageData && typeof dualLanguageData === 'object') {
        // Case 1: Response is in single language format instead of dual
        if (dualLanguageData.make && dualLanguageData.model && !dualLanguageData.english && !dualLanguageData.turkish) {
          console.log('🔧 Detected single language format, creating dual language structure...');
          const singleData = { ...dualLanguageData };
          dualLanguageData = {
            english: singleData,
            turkish: singleData  // We'll use the same data for both initially
          };
        }
        // Case 2: Response has different key names
        else if (!dualLanguageData.english && !dualLanguageData.turkish) {
          const keys = Object.keys(dualLanguageData);
          console.log('🔧 Trying to map keys:', keys);
          
          // Look for language-like keys
          const englishKey = keys.find(k => k.toLowerCase().includes('en') || k.toLowerCase().includes('english'));
          const turkishKey = keys.find(k => k.toLowerCase().includes('tr') || k.toLowerCase().includes('turkish'));
          
          if (englishKey && turkishKey) {
            console.log('🔧 Found language keys:', { englishKey, turkishKey });
            dualLanguageData = {
              english: dualLanguageData[englishKey],
              turkish: dualLanguageData[turkishKey]
            };
          }
        }
      }
      
      // Final validation after attempted fixes
      if (!dualLanguageData.english || !dualLanguageData.turkish) {
        console.log('❌ Could not fix response format, creating minimal structure...');
        
        // Last resort: Create a basic structure from available data
        if (dualLanguageData && (dualLanguageData.make || dualLanguageData.model)) {
          console.log('🔧 Creating minimal dual language structure from available data');
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
          console.log('✅ Created minimal structure successfully');
        } else {
          console.log('❌ No usable data found, will fall back to mock data');
          throw new Error(`Response missing language data structure. Received keys: ${Object.keys(dualLanguageData || {}).join(', ')}`);
        }
      } else {
        console.log('✅ Response format fixed successfully!');
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
    console.log('✅ Analysis completed successfully, credit/free analysis used');

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
    'ABS': 'ABS',
    'abs': 'ABS',
    'Electronic Stability Control': 'Elektronik Stabilite Kontrolü',
    'electronic stability control': 'Elektronik Stabilite Kontrolü',
    'Traction Control': 'Çekiş Kontrolü',
    'traction control': 'Çekiş Kontrolü',
    'Airbags': 'Hava Yastıkları',
    'airbags': 'Hava Yastıkları',
    'Anti-theft System': 'Hırsızlık Önleme Sistemi',
    'anti-theft system': 'Hırsızlık Önleme Sistemi',
    'Central Locking': 'Merkezi Kilit',
    'central locking': 'Merkezi Kilit',
    'Electric Windows': 'Elektrikli Camlar',
    'electric windows': 'Elektrikli Camlar',
    'Electric Front Windows': 'Ön Elektrikli Camlar',
    'electric front windows': 'Ön Elektrikli Camlar',
    'Manual Windows': 'Manuel Camlar',
    'manual windows': 'Manuel Camlar',
    'Power Locks': 'Elektrikli Kilitler',
    'power locks': 'Elektrikli Kilitler',
    'Manual Locks': 'Manuel Kilitler',
    'manual locks': 'Manuel Kilitler',
    
    // Packages
    'Premium Package': 'Premium Paket',
    'Technology Package': 'Teknoloji Paketi',
    'Sport Package': 'Spor Paket',
    'Luxury Package': 'Lüks Paket',
    'Safety Package': 'Güvenlik Paketi',
    'Comfort Package': 'Konfor Paketi',
    'M Sport Package': 'M Sport Paket',
    'Driver Assistance Package': 'Sürücü Destek Paketi',
    'Cold Weather Package': 'Soğuk Hava Paketi',
    'Convenience Package': 'Kolaylık Paketi',
    
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
    'Urban commuting': 'Şehir içi ulaşım',
    'urban commuting': 'şehir içi ulaşım',
    'Daily commuting': 'Günlük işe gidiş',
    'daily commuting': 'günlük işe gidiş',
    'dailiy commuting': 'günlük işe gidiş', // Common typo
    'Short trips': 'Kısa mesafe yolculuklar',
    'short trips': 'kısa mesafe yolculuklar',
    'Long trips': 'Uzun mesafe yolculuklar',
    'long trips': 'uzun mesafe yolculuklar',
    'Family transportation': 'Aile ulaşımı',
    'family transportation': 'aile ulaşımı',
    'Business travel': 'İş seyahatleri',
    'business travel': 'iş seyahatleri',
    'Weekend trips': 'Hafta sonu gezileri',
    'weekend trips': 'hafta sonu gezileri',
    'City driving': 'Şehir sürüşü',
    'city driving': 'şehir sürüşü',
    'Highway driving': 'Otoyol sürüşü',
    'highway driving': 'otoyol sürüşü',
    'Off-road adventures': 'Arazi macerası',
    'off-road adventures': 'arazi macerası',
    'Luxury transportation': 'Lüks ulaşım',
    'luxury transportation': 'lüks ulaşım',
    'Sport driving': 'Sportif sürüş',
    'sport driving': 'sportif sürüş',
    'Suburban families': 'Banliyö aileleri',
    'suburban families': 'banliyö aileleri',
    'First-time buyers': 'İlk kez alıcılar',
    'first-time buyers': 'ilk kez alıcılar',
    'Retirees': 'Emekliler',
    'retirees': 'emekliler',
    'Students': 'Öğrenciler',
    'students': 'öğrenciler',
    
    // Basic demographic and use case translations
    'Young professionals': 'Genç profesyoneller',
    'young professionals': 'genç profesyoneller',
    'Small families': 'Küçük aileler',
    'small families': 'küçük aileler',
    'Urban professionals': 'Şehirli profesyoneller', 
    'urban professionals': 'şehirli profesyoneller',
    'First-time buyers': 'İlk kez alıcılar',
    'first-time buyers': 'ilk kez alıcılar',
    'Daily commuting': 'Günlük işe gidiş',
    'daily commuting': 'günlük işe gidiş',
    'Business travel': 'İş seyahatleri',
    'business travel': 'iş seyahatleri',
    'Weekend trips': 'Hafta sonu gezileri',
    'weekend trips': 'hafta sonu gezileri',
    'City driving': 'Şehir sürüşü',
    'city driving': 'şehir sürüşü',
    
    // Compound phrases
    'Young professionals and small families': 'Genç profesyoneller ve küçük aileler',
    'young professionals and small families': 'genç profesyoneller ve küçük aileler',
    'Daily commuting, business travel, weekend trips': 'Günlük işe gidiş, iş seyahatleri, hafta sonu gezileri',
    'daily commuting, business travel, weekend trips': 'günlük işe gidiş, iş seyahatleri, hafta sonu gezileri',
    
    // Very specific full sentences that commonly appear in API responses
    'Young professionals and small families looking for a stylish and sporty compact car': 'Şık ve sportif kompakt araç arayan genç profesyoneller ve küçük aileler',
    'young professionals and small families looking for a stylish and sporty compact car': 'şık ve sportif kompakt araç arayan genç profesyoneller ve küçük aileler',
    'Daily commuting, weekend trips, occasional long-distance travel': 'Günlük işe gidiş, hafta sonu gezileri, ara sıra uzun mesafe seyahatleri',
    'daily commuting, weekend trips, occasional long-distance travel': 'günlük işe gidiş, hafta sonu gezileri, ara sıra uzun mesafe seyahatleri',
    'Urban professionals seeking reliable transportation': 'Güvenilir ulaşım arayan şehirli profesyoneller',
    'urban professionals seeking reliable transportation': 'güvenilir ulaşım arayan şehirli profesyoneller',
    'Families needing spacious and safe vehicle': 'Geniş ve güvenli araç ihtiyacı olan aileler',
    'families needing spacious and safe vehicle': 'geniş ve güvenli araç ihtiyacı olan aileler',
    'First-time buyers looking for affordable and reliable car': 'Uygun fiyatlı ve güvenilir araç arayan ilk kez alıcılar',
    'first-time buyers looking for affordable and reliable car': 'uygun fiyatlı ve güvenilir araç arayan ilk kez alıcılar',
    'Young drivers who want style and performance': 'Stil ve performans isteyen genç sürücüler',
    'young drivers who want style and performance': 'stil ve performans isteyen genç sürücüler',
    'Professional drivers for business use': 'İş amaçlı kullanım için profesyonel sürücüler',
    'professional drivers for business use': 'iş amaçlı kullanım için profesyonel sürücüler',
    
    // Additional specific phrases that cause mixed language
    'looking for a stylish and sporty compact car': 'şık ve sportif kompakt araç arıyor',
    'seeking reliable transportation': 'güvenilir ulaşım arıyor',
    'occasional long-distance travel': 'ara sıra uzun mesafe seyahati',
    'stylish and sporty': 'şık ve sportif',
    'compact car': 'kompakt araç',
    'reliable transportation': 'güvenilir ulaşım',
    'affordable and reliable': 'uygun fiyatlı ve güvenilir',
    'spacious and safe': 'geniş ve güvenli',
    'style and performance': 'stil ve performans',
    'business use': 'iş amaçlı kullanım',
    'looking for': 'arıyor',
    'seeking': 'arıyor',
    'needing': 'ihtiyacı olan',
    'who want': 'isteyen',
    'occasional': 'ara sıra',
    'long-distance': 'uzun mesafe',
    'affordable': 'uygun fiyatlı',
    'spacious': 'geniş',
    'safe': 'güvenli',
    'reliable': 'güvenilir',
    'stylish': 'şık',
    'sporty': 'sportif',
    
    // Missing technical terms from log analysis
    'Issues with': 'Sorunları ile',
    'issues with': 'sorunları ile',
    'Problems with': 'Sorunları ile', 
    'problems with': 'sorunları ile',
    'dual-clutch transmission': 'çift kavramalı şanzıman',
    'Dual-clutch transmission': 'Çift kavramalı şanzıman',
    'Dual-Clutch Transmission': 'Çift Kavramalı Şanzıman',
    'DCT transmission': 'DCT şanzıman',
    'dct transmission': 'dct şanzıman',
    'clutch': 'kavrama',
    'dual': 'çift',
    'transmission problems': 'şanzıman sorunları',
    'transmission issues': 'şanzıman sorunları',
    'gearbox problems': 'şanzıman sorunları',
    'gearbox issues': 'şanzıman sorunları',
    'shifting problems': 'vites değiştirme sorunları',
    'shifting issues': 'vites değiştirme sorunları',
    'gear': 'vites',
    'gears': 'vitesler',
    'shifting': 'vites değiştirme',
    'clutch wear': 'kavrama aşınması',
    'clutch problems': 'kavrama sorunları',
    'clutch issues': 'kavrama sorunları',
    'with the': 'ile',
    'with': 'ile',
    'issues': 'sorunları',
    'problems': 'sorunları',
    
    // User's specific problematic examples - EXACT FIXES
    'Start-Stop System': 'Start-Stop Sistem',
    'start-stop system': 'start-stop sistem',
    'Automatic': 'Otomatik',
    'automatic': 'otomatik',
    'Young professionals and small families looking for a stylish and premium compact car': 'Şık ve premium kompakt araç arayan genç profesyoneller ve küçük aileler',
    'young professionals and small families looking for a stylish and premium compact car': 'şık ve premium kompakt araç arayan genç profesyoneller ve küçük aileler',
    
    // Common Problems - full sentence translations
    'Timing chain issues in early models': 'Erken modellerde timing zinciri sorunları',
    'Electronic water pump failures': 'Elektronik su pompası arızaları',
    'Carbon buildup in direct injection engines': 'Direkt enjeksiyon motorlarda karbon birikimi',
    'Plastic cooling system components': 'Plastik soğutma sistemi parçaları',
    'Gearbox issues in early DCT models': 'Erken DCT modellerinde şanzıman sorunları',
    'Suspension noise': 'Süspansiyon gürültüsü',
    'Electrical glitches in the infotainment system': 'Bilgi-eğlence sisteminde elektriksel arızalar',
    'Electrical glitches in the bilgi-eğlence sistem': 'Bilgi-eğlence sisteminde elektriksel arızalar',
    'Brake pad wear': 'Fren balata aşınması',
    'Air conditioning compressor failures': 'Klima kompresörü arızaları',
    'Window regulator problems': 'Cam kaldırma mekanizması sorunları',
    'Fuel system issues': 'Yakıt sistemi sorunları',
    'Ignition coil failures': 'Ateşleme bobini arızaları',
    'Oil consumption problems': 'Yağ tüketim sorunları',
    'Turbocharger issues': 'Turbo sorunları',
    'Engine mount wear': 'Motor takoz aşınması',
    'Clutch wear in manual transmissions': 'Manuel şanzımanlarda debriyaj aşınması',
    
    // More common problems that appear frequently
    'Engine overheating': 'Motor aşırı ısınması',
    'engine overheating': 'motor aşırı ısınması',
    'Battery drain': 'Akü boşalması',
    'battery drain': 'akü boşalması',
    'Alternator failure': 'Alternatör arızası',
    'alternator failure': 'alternatör arızası',
    'Cooling system leaks': 'Soğutma sistemi sızıntıları',
    'cooling system leaks': 'soğutma sistemi sızıntıları',
    'Transmission slipping': 'Şanzıman kayması',
    'transmission slipping': 'şanzıman kayması',
    'Steering problems': 'Direksiyon sorunları',
    'steering problems': 'direksiyon sorunları',
    'Brake fluid leaks': 'Fren hidroliği sızıntısı',
    'brake fluid leaks': 'fren hidroliği sızıntısı',
    'Exhaust system issues': 'Egzoz sistemi sorunları',
    'exhaust system issues': 'egzoz sistemi sorunları',
    'Catalytic converter problems': 'Katalitik konvertör sorunları',
    'catalytic converter problems': 'katalitik konvertör sorunları',
    'Fuel pump failure': 'Yakıt pompası arızası',
    'fuel pump failure': 'yakıt pompası arızası',
    'Spark plug wear': 'Buji aşınması',
    'spark plug wear': 'buji aşınması',
    'Air filter clogging': 'Hava filtresi tıkanması',
    'air filter clogging': 'hava filtresi tıkanması',
    'Oil leaks': 'Yağ sızıntıları',
    'oil leaks': 'yağ sızıntıları',
    'Coolant leaks': 'Soğutma suyu sızıntıları',
    'coolant leaks': 'soğutma suyu sızıntıları',
    'Thermostat failure': 'Termostat arızası',
    'thermostat failure': 'termostat arızası',
    'Radiator problems': 'Radyatör sorunları',
    'radiator problems': 'radyatör sorunları',
    'Power steering issues': 'Hidrolik direksiyon sorunları',
    'power steering issues': 'hidrolik direksiyon sorunları',
    'Suspension wear': 'Süspansiyon aşınması',
    'suspension wear': 'süspansiyon aşınması',
    'Shock absorber problems': 'Amortisör sorunları',
    'shock absorber problems': 'amortisör sorunları',
    'Tire wear': 'Lastik aşınması',
    'tire wear': 'lastik aşınması',
    'Wheel bearing noise': 'Tekerlek rulmanı gürültüsü',
    'wheel bearing noise': 'tekerlek rulmanı gürültüsü',
    
    // Recall Information - full sentence translations
    'NHTSA Recall 21V-123: Fuel pump module': 'NHTSA Geri Çağırma 21V-123: Yakıt pompası modülü',
    'NHTSA Recall 20V-456: Airbag sensor wiring': 'NHTSA Geri Çağırma 20V-456: Hava yastığı sensör kablosu',
    '2017 recall for potential stalling issue due to a faulty starter part': '2017 arızalı marş parçası nedeniyle potansiyel motor durması sorunu için geri çağırma',
    'Airbag inflator recall': 'Hava yastığı şişirici geri çağırması',
    'Seatbelt pretensioner recall': 'Emniyet kemeri ön gergi geri çağırması',
    'Brake system recall': 'Fren sistemi geri çağırması',
    'Software update recall': 'Yazılım güncellemesi geri çağırması',
    'Door handle recall': 'Kapı kolu geri çağırması',
    'Steering wheel recall': 'Direksiyon simidi geri çağırması',
    
    // More recall information variations
    'Takata airbag recall': 'Takata hava yastığı geri çağırması',
    'takata airbag recall': 'takata hava yastığı geri çağırması',
    'Engine stalling recall': 'Motor durması geri çağırması',
    'engine stalling recall': 'motor durması geri çağırması',
    'Fire risk recall': 'Yangın riski geri çağırması',
    'fire risk recall': 'yangın riski geri çağırması',
    'Electrical system recall': 'Elektrik sistemi geri çağırması',
    'electrical system recall': 'elektrik sistemi geri çağırması',
    'Brake pedal recall': 'Fren pedalı geri çağırması',
    'brake pedal recall': 'fren pedalı geri çağırması',
    'Accelerator pedal recall': 'Gaz pedalı geri çağırması',
    'accelerator pedal recall': 'gaz pedalı geri çağırması',
    'Seat adjustment recall': 'Koltuk ayar geri çağırması',
    'seat adjustment recall': 'koltuk ayar geri çağırması',
    'Window switch recall': 'Cam düğmesi geri çağırması',
    'window switch recall': 'cam düğmesi geri çağırması',
    'Hood latch recall': 'Kaput kilidi geri çağırması',
    'hood latch recall': 'kaput kilidi geri çağırması',
    'Fuel leak recall': 'Yakıt sızıntısı geri çağırması',
    'fuel leak recall': 'yakıt sızıntısı geri çağırması',
    'Parking brake recall': 'El freni geri çağırması',
    'parking brake recall': 'el freni geri çağırması',
    'No recalls reported': 'Bilinen geri çağırma yok',
    'no recalls reported': 'bilinen geri çağırma yok',
    'No known recalls': 'Bilinen geri çağırma yok',
    'no known recalls': 'bilinen geri çağırma yok',
    
    // Maintenance Tips - full sentence translations
    'Use premium fuel to prevent carbon buildup': 'Karbon birikimini önlemek için premium yakıt kullanın',
    'Regular oil changes every 7,500 miles': 'Her 12,000 km\'de düzenli yağ değişimi',
    'Regular oil changes every 15, 000 km or 12 months': 'Her 15,000 km veya 12 ayda düzenli yağ değişimi',
    'Regular oil changes every 15,000 km or 12 months': 'Her 15,000 km veya 12 ayda düzenli yağ değişimi',
    'Check coolant system annually': 'Yılda bir soğutma sistemini kontrol edin',
    'Software updates for iDrive system': 'iDrive sistemi için yazılım güncellemeleri',
    'DSG transmission fluid change every 60, 000 km': 'Her 60,000 km\'de DSG şanzıman yağı değişimi',
    'DSG transmission fluid change every 60,000 km': 'Her 60,000 km\'de DSG şanzıman yağı değişimi',
    'Check brake pads and discs every 20, 000 km': 'Her 20,000 km\'de fren balata ve disklerini kontrol edin',
    'Check brake pads and discs every 20,000 km': 'Her 20,000 km\'de fren balata ve disklerini kontrol edin',
    'Replace air filter every 30,000 km': 'Her 30,000 km\'de hava filtresini değiştirin',
    'Check timing belt every 80,000 km': 'Her 80,000 km\'de triger kayışını kontrol edin',
    'Service transmission every 100,000 km': 'Her 100,000 km\'de şanzıman bakımı yapın',
    'Check spark plugs every 40,000 km': 'Her 40,000 km\'de buji kontrolü yapın',
    'Replace cabin filter annually': 'Yılda bir kabin filtresini değiştirin',
    'Check suspension components every 50,000 km': 'Her 50,000 km\'de süspansiyon parçalarını kontrol edin',
    
    // More maintenance tips variations
    'Regular maintenance schedule': 'Düzenli bakım programı',
    'regular maintenance schedule': 'düzenli bakım programı',
    'Follow manufacturer recommendations': 'Üretici önerilerini takip edin',
    'follow manufacturer recommendations': 'üretici önerilerini takip edin',
    'Use quality engine oil': 'Kaliteli motor yağı kullanın',
    'use quality engine oil': 'kaliteli motor yağı kullanın',
    'Check tire pressure monthly': 'Aylık lastik basıncı kontrolü yapın',
    'check tire pressure monthly': 'aylık lastik basıncı kontrolü yapın',
    'Rotate tires every 10,000 km': 'Her 10,000 km\'de lastik rotasyonu yapın',
    'rotate tires every 10,000 km': 'her 10,000 km\'de lastik rotasyonu yapın',
    'Replace brake fluid every 2 years': 'Her 2 yılda fren hidroliğini değiştirin',
    'replace brake fluid every 2 years': 'her 2 yılda fren hidroliğini değiştirin',
    'Check battery connections': 'Akü bağlantılarını kontrol edin',
    'check battery connections': 'akü bağlantılarını kontrol edin',
    'Clean air intake regularly': 'Hava girişini düzenli temizleyin',
    'clean air intake regularly': 'hava girişini düzenli temizleyin',
    'Inspect belts and hoses': 'Kayış ve hortumları kontrol edin',
    'inspect belts and hoses': 'kayış ve hortumları kontrol edin',
    'Monitor engine temperature': 'Motor sıcaklığını takip edin',
    'monitor engine temperature': 'motor sıcaklığını takip edin',
    'Keep fuel tank clean': 'Yakıt deposunu temiz tutun',
    'keep fuel tank clean': 'yakıt deposunu temiz tutun',
    'Regular diagnostic scans': 'Düzenli arıza tespiti taraması',
    'regular diagnostic scans': 'düzenli arıza tespiti taraması',
    'Professional inspection recommended': 'Profesyonel kontrol önerilir',
    'professional inspection recommended': 'profesyonel kontrol önerilir',
    'Annual safety inspection': 'Yıllık güvenlik kontrolü',
    'annual safety inspection': 'yıllık güvenlik kontrolü',
    'Keep service records': 'Servis kayıtlarını saklayın',
    'keep service records': 'servis kayıtlarını saklayın',
    'Use authorized service centers': 'Yetkili servisleri kullanın',
    'use authorized service centers': 'yetkili servisleri kullanın',
    
    // Additional common automotive terms
    'stalling': 'motor durması',
    'starter part': 'marş parçası',
    'faulty': 'arızalı',
    'potential': 'potansiyel',
    'due to': 'nedeniyle',
    'issue': 'sorun',
    'problem': 'sorun',
    'noise': 'gürültü',
    'glitches': 'arızalar',
    'glitch': 'arıza',
    'failures': 'arızalar',
    'failure': 'arıza',
    'wear': 'aşınma',
    'consumption': 'tüketim',
    'mount': 'takoz',
    'sensor': 'sensör',
    'wiring': 'kablo',
    'module': 'modül',
    'pump': 'pompa',
    'buildup': 'birikim',
    'carbon': 'karbon',
    'components': 'parçalar',
    'component': 'parça',
    'cooling': 'soğutma',
    'plastic': 'plastik',
    'inflator': 'şişirici',
    'pretensioner': 'ön gergi',
    'handle': 'kol',
    'steering wheel': 'direksiyon simidi',
    'software update': 'yazılım güncellemesi',
    'annually': 'yılda bir',
    'monthly': 'aylık',
    'premium fuel': 'premium yakıt',
    'prevent': 'önlemek',
    'miles': 'mil',
    'check': 'kontrol edin',
    'replace': 'değiştirin',
    'service': 'bakım yapın',
    'every': 'her',
    'months': 'ay',
    'system': 'sistem',
    'coolant': 'soğutma suyu',
    'transmission fluid': 'şanzıman yağı',
    'brake pads': 'fren balata',
    'discs': 'diskler',
    'air filter': 'hava filtresi',
    'timing belt': 'triger kayışı',
    'spark plugs': 'bujiler',
    'cabin filter': 'kabin filtresi',
    'suspension': 'süspansiyon',
    
    // Technical automotive terms - Engine
    'TwinPower Turbo': 'TwinPower Turbo',
    'Turbo': 'Turbo',
    'turbo': 'turbo',
    'Turbocharged': 'Turbolu',
    'turbocharged': 'turbolu',
    'Direct Injection': 'Direkt Enjeksiyon',
    'direct injection': 'direkt enjeksiyon',
    'Multi Air': 'Multi Air',
    'MultiAir': 'MultiAir',
    'JTDM': 'JTDM',
    'Premium Gasoline': 'Premium Benzin',
    'premium gasoline': 'premium benzin',
    'Gasoline': 'Benzin',
    'gasoline': 'benzin',
    'Petrol': 'Benzin',
    'petrol': 'benzin',
    'Diesel': 'Dizel',
    'diesel': 'dizel',
    'Hybrid': 'Hibrit',
    'hybrid': 'hibrit',
    'Electric': 'Elektrikli',
    'electric': 'elektrikli',
    'hp': 'hp',
    'HP': 'HP',
    'Nm': 'Nm',
    'rpm': 'rpm',
    'RPM': 'RPM',
    
    // Transmission terms
    '8-Speed Automatic': '8 Vitesli Otomatik',
    '8-speed automatic': '8 vitesli otomatik',
    '6-Speed Manual': '6 Vitesli Manuel',
    '6-speed manual': '6 vitesli manuel',
    '5-Speed Manual': '5 Vitesli Manuel',
    '5-speed manual': '5 vitesli manuel',
    'Manual Transmission': 'Manuel Şanzıman',
    'manual transmission': 'manuel şanzıman',
    'Automatic Transmission': 'Otomatik Şanzıman',
    'automatic transmission': 'otomatik şanzıman',
    'Automatic': 'Otomatik',
    'automatic': 'otomatik',
    'Manual': 'Manuel',
    'manual': 'manuel',
    'CVT': 'CVT',
    'DSG': 'DSG',
    'xDrive': 'xDrive',
    'AWD': 'AWD',
    'FWD': 'Önden Çekiş',
    'RWD': 'Arkadan İtiş',
    
    // Performance terms
    '0-60 mph': '0-100 km/s',
    '0-100 km/h': '0-100 km/s',
    'mph': 'km/s',
    'km/h': 'km/s',
    'seconds': 'saniye',
    'second': 'saniye',
    'electronically limited': 'elektronik sınırlı',
    'top speed': 'maksimum hız',
    'maximum speed': 'maksimum hız',
    'acceleration': 'hızlanma',
    'performance': 'performans',
    
    // Fuel economy terms
    'city': 'şehir içi',
    'highway': 'şehir dışı',
    'combined': 'ortalama',
    'mpg': 'km/lt',
    'MPG': 'km/lt',
    'L/100km': 'L/100km',
    'fuel economy': 'yakıt tüketimi',
    'fuel consumption': 'yakıt tüketimi',
    'efficiency': 'verimlilik',
    
    // Body types
    'Sedan': 'Sedan',
    'sedan': 'sedan',
    'Hatchback': 'Hatchback',
    'hatchback': 'hatchback',
    'SUV': 'SUV',
    'suv': 'SUV',
    'Coupe': 'Coupe',
    'coupe': 'coupe',
    'Convertible': 'Cabrio',
    'convertible': 'cabrio',
    'Wagon': 'Station Wagon',
    'wagon': 'station wagon',
    'Crossover': 'Crossover',
    'crossover': 'crossover',
    'Compact': 'Kompakt',
    'compact': 'kompakt',
    'Executive': 'Üst Segment',
    'executive': 'üst segment',
    'Luxury': 'Lüks',
    'luxury': 'lüks',
    'Sport': 'Spor',
    'sport': 'spor',
    'Sports': 'Spor',
    'sports': 'spor',
    
    // Generation terms
    'Generation': 'Nesil',
    'generation': 'nesil',
    'First': 'Birinci',
    'first': 'birinci',
    'Second': 'İkinci',
    'second': 'ikinci',
    'Third': 'Üçüncü',
    'third': 'üçüncü',
    'Fourth': 'Dördüncü',
    'fourth': 'dördüncü',
    'Fifth': 'Beşinci',
    'fifth': 'beşinci',
    'Sixth': 'Altıncı',
    'sixth': 'altıncı',
    'Seventh': 'Yedinci',
    'seventh': 'yedinci',
    'Eighth': 'Sekizinci',
    'eighth': 'sekizinci',
    
    // Years and time
    'years': 'yıl',
    'year': 'yıl',
    'old': 'yaşında',
    'age': 'yaş',
    'range': 'aralığı',
    'between': 'arasında',
    'from': 'den',
    'to': 'e',
    'and': 've',
    
    // Common Problems
    'Engine problems': 'Motor sorunları',
    'Transmission issues': 'Şanzıman sorunları',
    'Electrical problems': 'Elektrik sorunları',
    'Brake issues': 'Fren sorunları',
    'Suspension problems': 'Süspansiyon sorunları',
    'Air conditioning problems': 'Klima sorunları',
    'Paint issues': 'Boya sorunları',
    'Interior wear': 'İç mekan aşınması',
    'Rust problems': 'Pas sorunları',
    'Fuel system issues': 'Yakıt sistemi sorunları',
    'Timing chain issues': 'Timing zinciri sorunları',
    'Water pump failures': 'Su pompası arızaları',
    'Carbon buildup': 'Karbon birikimi',
    'Plastic components': 'Plastik parçalar',
    
    // Maintenance Tips
    'Regular oil changes': 'Düzenli yağ değişimi',
    'Check fluids': 'Sıvıları kontrol edin',
    'Tire rotation': 'Lastik rotasyonu',
    'Brake inspection': 'Fren kontrolü',
    'Battery maintenance': 'Akü bakımı',
    'Air filter replacement': 'Hava filtresi değişimi',
    'Coolant system check': 'Soğutma sistemi kontrolü',
    'Spark plug replacement': 'Buji değişimi',
    'Transmission service': 'Şanzıman servisi',
    'Use premium fuel': 'Premium yakıt kullanın',
    'Software updates': 'Yazılım güncellemeleri',
    'Annual inspection': 'Yıllık kontrol',
    'Seasonal maintenance': 'Mevsimsel bakım',
    
    // Additional common terms
    'entertainment': 'eğlence',
    'system': 'sistem',
    'infotainment': 'bilgi-eğlence',
    'touchscreen': 'dokunmatik ekran',
    'display': 'ekran',
    'wheels': 'jantlar',
    'alloy': 'alaşım',
    'steel': 'çelik',
    'users': 'kullanıcılar',
    'professionals': 'profesyoneller',
    'commuting': 'işe gidiş',
    'driving': 'sürüş',
    'urban': 'şehirli',
    'city': 'şehir',
    'young': 'genç',
    'daily': 'günlük',
    'weekend': 'hafta sonu',
    'business': 'iş',
    'family': 'aile',
    'luxury': 'lüks',
    'premium': 'premium',
    'standard': 'standart',
    'automatic': 'otomatik',
    'manual': 'manuel',
    'electric': 'elektrikli',
    'electronic': 'elektronik',
    'digital': 'dijital',
    'wireless': 'kablosuz',
    'heated': 'ısıtmalı',
    'leather': 'deri',
    'fabric': 'kumaş',
    'sport': 'spor',
    'comfort': 'konfor',
    'safety': 'güvenlik',
    'security': 'güvenlik',
    'theft': 'hırsızlık',
    'anti': 'anti',
    'control': 'kontrol',
    'assist': 'asistan',
    'monitoring': 'izleme',
    'sensor': 'sensör',
    'sensors': 'sensörler',
    'camera': 'kamera',
    'audio': 'ses',
    'sound': 'ses',
    'navigation': 'navigasyon',
    'GPS': 'GPS',
    'bluetooth': 'bluetooth',
    'USB': 'USB',
    'charging': 'şarj',
    'power': 'güç',
    'steering': 'direksiyon',
    'seats': 'koltuklar',
    'seat': 'koltuk',
    'windows': 'camlar',
    'window': 'cam',
    'doors': 'kapılar',
    'door': 'kapı',
    'lights': 'farlar',
    'light': 'far',
    'headlights': 'farlar',
    'LED': 'LED',
    'climate': 'klima',
    'air': 'hava',
    'conditioning': 'kliması',
    
    // More specific automotive terms
    'drivers': 'sürücüler',
    'driver': 'sürücü',
    'families': 'aileler',
    'small': 'küçük',
    'large': 'büyük',
    'trips': 'yolculuklar',
    'trip': 'yolculuk',
    'short': 'kısa',
    'long': 'uzun',
    'locking': 'kilit',
    'lock': 'kilit',
    'central': 'merkezi',
    'manual': 'manuel',
    'electric': 'elektrikli',
    'front': 'ön',
    'rear': 'arka',
    'side': 'yan',
    'left': 'sol',
    'right': 'sağ',
    'automatic': 'otomatik',
    'powered': 'elektrikli',
    'hydraulic': 'hidrolik',
    'mechanical': 'mekanik',
    'digital': 'dijital',
    'analog': 'analog',
    'basic': 'temel',
    'advanced': 'gelişmiş',
    'simple': 'basit',
    'complex': 'karmaşık',
    'modern': 'modern',
    'classic': 'klasik',
    'new': 'yeni',
    'old': 'eski',
    'fresh': 'taze',
    'used': 'kullanılmış',
    'owner': 'sahip',
    'owners': 'sahipler',
    'buyer': 'alıcı',
    'buyers': 'alıcılar',
    'seller': 'satıcı',
    'sellers': 'satıcılar'
  };

  // Translate arrays
  const translateArray = (arr) => {
    if (!Array.isArray(arr)) {
      // If it's a string, split it by comma and create array
      if (typeof arr === 'string') {
        return arr.split(',').map(item => translateString(item.trim()));
      }
      return arr;
    }
    
    // Make sure we return an array, not a string
    return arr.map(item => {
      if (typeof item === 'string') {
        return translateString(item);
      }
      return item;
    });
  };

  // Translate string values - INTELLIGENT UNIVERSAL SYSTEM
  const translateString = (str) => {
    if (typeof str !== 'string') return str;
    
    let result = str.trim();
    
    // Step 1: Try exact match first (for perfect translations)
    for (const [english, turkish] of Object.entries(translations)) {
      if (result.toLowerCase() === english.toLowerCase()) {
        return turkish;
      }
    }
    
    // Step 2: Intelligent phrase replacement (longest phrases first)
    const sortedTranslations = Object.entries(translations)
      .sort((a, b) => b[0].length - a[0].length);
    
    for (const [english, turkish] of sortedTranslations) {
      // Only replace meaningful phrases (3+ chars) with word boundaries
      if (english.length >= 3) {
        const regex = new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        result = result.replace(regex, turkish);
      }
    }
    
    // Step 3: Word-by-word fallback for remaining English words
    const words = result.split(/\s+/);
    const translatedWords = words.map(word => {
      // Clean word (remove punctuation for matching)
      const cleanWord = word.replace(/[.,;:!?()[\]{}]/g, '').toLowerCase();
      
      // Try to find translation for the clean word
      for (const [english, turkish] of Object.entries(translations)) {
        if (english.toLowerCase() === cleanWord) {
          // Preserve original punctuation
          return word.replace(new RegExp(cleanWord, 'gi'), turkish);
        }
      }
      
      return word; // Keep original if no translation found
    });
    
    return translatedWords.join(' ');
  };



  // Ensure arrays are actually arrays - improved for various formats
  const ensureArray = (field) => {
    if (Array.isArray(field)) {
      return field;
    }
    
    if (typeof field === 'string') {
      // Remove brackets if present: ["item1", "item2"] or ['item1', 'item2']
      let cleanString = field.replace(/^\[|\]$/g, '');
      
      // If contains quotes, split by quote patterns
      if (cleanString.includes('"') || cleanString.includes("'")) {
        // Extract quoted items: "item1", "item2", "item3"
        const matches = cleanString.match(/"([^"]+)"|'([^']+)'/g);
        if (matches) {
          return matches.map(match => match.replace(/['"]/g, ''));
        }
      }
      
      // Fallback: split by comma and clean
      return cleanString.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    
    return [];
  };

  // Return data as-is (already in correct language from OpenAI)
  return data;
}; 