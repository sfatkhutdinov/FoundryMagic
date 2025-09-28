# FoundryMagic

A unified D&D Beyond integration module for Foundry VTT that provides seamless importing of characters, monsters, spells, items, and adventures.

![FoundryMagic Banner](https://img.shields.io/badge/FoundryVTT-v10%2B-green) ![D&D5e](https://img.shields.io/badge/D%26D%205e-Compatible-red) ![License](https://img.shields.io/badge/License-MIT-blue)

## Features

### 🔐 **Real D&D Beyond Authentication**
- Two-step authentication flow using cobalt session tokens
- Automatic Bearer token exchange for API calls
- Session management with auto-refresh

### 📥 **Comprehensive Import System**
- **Characters**: Full character sheets with equipment, spells, and features
- **Monsters**: Complete stat blocks with actions and abilities  
- **Spells**: Detailed spell descriptions and mechanics
- **Items**: Equipment, weapons, armor, and magic items
- **Adventures**: Scenes, journals, and adventure content

### ⚡ **Performance Optimized**
- Intelligent caching system (500MB IndexedDB storage)
- Batch import with concurrent processing
- Memory management and garbage collection
- Network request optimization and retry logic

### 🎮 **Foundry VTT Integration**
- Native Foundry document creation
- Automatic compendium organization
- Scene enhancement with walls and lighting
- Role-based access control (GM only)

## Installation

### Method 1: Via Manifest URL (Recommended)

1. **Open Foundry VTT** and go to your D&D 5e world
2. **Click "Install Module"** in Module Management
3. **Paste this Manifest URL:**
   ```
   https://github.com/sfatkhutdinov/FoundryMagic/releases/latest/download/module.json
   ```
4. **Click "Install"** and enable the module

### Method 2: Manual Installation

1. Download the latest `foundrymagic.zip` from [Releases](https://github.com/sfatkhutdinov/FoundryMagic/releases)
2. Extract to your Foundry `Data/modules/` directory
3. Rename the folder to `foundrymagic`
4. Enable the module in Foundry

## Quick Start

### 1. Get Your D&D Beyond Token
1. Log into [D&D Beyond](https://dndbeyond.com) in your browser
2. Open Developer Tools (F12)
3. Go to **Application → Cookies → dndbeyond.com**
4. Copy the `CobaltSession` cookie value

### 2. Authenticate FoundryMagic
1. Open FoundryMagic in Foundry VTT
2. Enter your cobalt token in the authentication dialog
3. Click "Authenticate"
4. ✅ You should see "Authentication Successful!"

### 3. Start Importing
1. Browse your D&D Beyond content
2. Select characters, monsters, spells, or items to import
3. Click "Import Selected"
4. Watch as content appears in your Foundry compendiums!

## Usage Examples

### Import a Character
```javascript
// Via FoundryMagic API
const result = await foundryMagic.characters.importCharacter({
  characterId: '12345678',
  includeItems: true,
  includeSpells: true
});
```

### Batch Import Monsters
```javascript
// Import multiple monsters
const monsters = await foundryMagic.content.batchImport({
  type: 'monsters',
  search: 'dragon',
  limit: 10
});
```

### Check Authentication Status
```javascript
// Check if authenticated
const session = foundryMagic.auth.getSession();
if (session && session.valid) {
  console.log('Authenticated with D&D Beyond!');
}
```

## API Reference

See the complete [API Documentation](docs/API.md) for detailed method references.

## Compatibility

- **Foundry VTT**: v10.0+ (Verified up to v12)
- **Game System**: D&D 5e v2.0+
- **Browser**: Chrome, Firefox, Safari, Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Testing

Run the test suite:
```bash
npm test
```

Run real API integration tests:
```bash
node tests/test-real-ddb-api.js
```

## Support

- **Documentation**: [User Guide](docs/USER_GUIDE.md) | [API Docs](docs/API.md)
- **Issues**: [GitHub Issues](https://github.com/sfatkhutdinov/FoundryMagic/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sfatkhutdinov/FoundryMagic/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built using research from [ddb-importer](https://github.com/MrPrimate/ddb-importer) and [ddb-proxy](https://github.com/MrPrimate/ddb-proxy)
- D&D Beyond API integration patterns based on community best practices
- Foundry VTT module development guidelines

---

**⚠️ Disclaimer:** This module is not affiliated with or endorsed by D&D Beyond or Wizards of the Coast. Use of D&D Beyond content requires a valid D&D Beyond account and subscription.