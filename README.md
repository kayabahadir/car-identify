# Car Identify App

AI-Powered Vehicle Recognition mobile app built with React Native and Expo.

## Features

- **Camera Integration**: Take photos of vehicles directly from the app
- **Gallery Upload**: Select vehicle images from your photo gallery
- **AI Recognition**: Powered by OpenAI's GPT-4 Vision API for accurate vehicle identification
- **Comprehensive Results**: Get detailed information about:
  - Make, Model, Year, and Generation
  - Technical Specifications (Engine, Power, Transmission)
  - Available Trims and Features
  - Target Audience and Use Cases
  - Common Issues and Maintenance Tips
  - Recall Information
- **Tabbed Interface**: Easy navigation through different information categories
- **Modern UI**: Clean, intuitive design with real-time confidence indicators

## Screenshots

The app features:
- **Home Screen**: Statistics, AI system status, and action buttons
- **Result Screen**: Vehicle identification with tabbed detailed information
- **Loading States**: Real-time processing indicators

## Setup Instructions

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device

### Installation

1. **Clone or download the project**
   ```bash
   cd car-identify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure OpenAI API Key**
   - Open `src/services/openaiService.js`
   - Replace 'YOUR-API-KEY-HERE' with your actual API key:
   ```javascript
   const OPENAI_API_KEY = __DEV__ ? 'YOUR-ACTUAL-API-KEY-HERE' : process.env.OPENAI_API_KEY;
   ```
   - **⚠️ SECURITY NOTE**: Never commit real API keys to Git!

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on your device**
   - Install Expo Go on your mobile device
   - Scan the QR code displayed in the terminal or browser
   - The app will open on your device

### OpenAI API Setup

1. **Get an OpenAI API Key**:
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Sign up or log in to your account
   - Navigate to API Keys section
   - Create a new API key

2. **Add the API Key**:
   - Open `src/services/openaiService.js`
   - Replace 'YOUR-API-KEY-HERE' with your actual API key:
   ```javascript
   const OPENAI_API_KEY = __DEV__ ? 'YOUR-ACTUAL-API-KEY-HERE' : process.env.OPENAI_API_KEY;
   ```
   - **⚠️ IMPORTANT**: Only add your real API key locally, never commit it to Git!

3. **API Usage**:
   - The app uses GPT-4 Vision Preview model
   - Costs approximately $0.01-0.03 per image analysis
   - Ensure you have sufficient credits in your OpenAI account

## How to Use

1. **Launch the app** and you'll see the main screen with app statistics
2. **Take a photo** or **upload from gallery** using the action buttons
3. **Wait for analysis** - the AI will process the vehicle image
4. **View results** - detailed information will be displayed in tabs:
   - **Overview**: Basic vehicle information
   - **Specs**: Technical specifications
   - **Trim**: Available trims and features
   - **Audience**: Target demographic and use cases
   - **Issues**: Common problems and maintenance tips

## Demo Mode

If no OpenAI API key is configured, the app will run in demo mode showing sample BMW 3 Series data. You'll see an alert explaining this when you first analyze an image.

## Project Structure

```
car-identify/
├── App.js                 # Main app component with navigation
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js   # Main screen with camera/gallery options
│   │   └── ResultScreen.js # Results display with tabs
│   └── services/
│       └── openaiService.js # OpenAI API integration
├── package.json           # Dependencies and scripts
├── app.json              # Expo configuration
└── babel.config.js       # Babel configuration
```

## Key Dependencies

- **React Navigation**: Navigation between screens
- **Expo Image Picker**: Camera and gallery access
- **Expo Vector Icons**: Icon library
- **OpenAI GPT-4 Vision**: AI-powered vehicle recognition

## Customization

### Adding More Vehicle Data

To extend the vehicle information displayed:

1. Update the OpenAI prompt in `src/services/openaiService.js`
2. Add new fields to the JSON structure
3. Create new UI components in `ResultScreen.js`

### Styling Changes

All styles are defined in StyleSheet objects within each component. Modify colors, fonts, and layouts by updating the respective style objects.

### Adding New Tabs

1. Add the tab name to the `tabs` array in `ResultScreen.js`
2. Add a new case in the `renderTabContent` switch statement
3. Create the corresponding UI for the new tab

## Troubleshooting

### Common Issues

1. **Camera/Gallery not working**:
   - Ensure permissions are granted
   - Check that you're running on a physical device (required for camera)

2. **OpenAI API errors**:
   - Verify your API key is correct
   - Check your OpenAI account has sufficient credits
   - Ensure you have access to GPT-4 Vision model

3. **App crashes on startup**:
   - Clear Expo cache: `expo start --clear`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

### Performance Tips

- Use smaller image sizes for faster processing
- Compress images before uploading for better API response times
- Consider implementing image caching for repeated analyses

## License

This project is for educational and demonstration purposes.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Verify OpenAI API key configuration
3. Ensure all dependencies are properly installed 