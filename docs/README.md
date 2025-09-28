# FoundryMagic - D&D Beyond Integration for Foundry VTT

A unified Foundry VTT module that provides seamless integration with D&D Beyond, allowing Game Masters to import characters, adventures, monsters, spells, and items directly into their Foundry VTT worlds.

## Features

### Character Import
- Import D&D Beyond characters with full progression data
- Automatic conversion of ability scores, skills, and saves
- Equipment and inventory management
- Spell lists and prepared spells
- Class features and racial traits

### Adventure Import
- Complete adventure modules with scenes and maps
- Pre-built encounters with monster placement
- Journal entries and handouts
- Scene enhancements with walls and lighting

### Content Library
- Monsters from the D&D Beyond bestiary
- Spells with automatic scaling and effects
- Equipment and magic items
- Organized compendium management

### Performance & Reliability
- 500MB content caching for offline access
- Batch import with progress tracking
- Automatic error recovery and retry logic
- Memory optimization and garbage collection
- Network request batching and caching

## Installation

1. Download the latest release from the [releases page](https://github.com/your-repo/foundrymagic/releases)
2. Extract the module to your Foundry VTT `Data/modules` directory
3. Restart Foundry VTT
4. Enable the "FoundryMagic" module in your world settings

## Configuration

### D&D Beyond Authentication

1. Obtain a D&D Beyond cobalt token:
   - Log into D&D Beyond in your browser
   - Open browser developer tools (F12)
   - Go to Application/Storage > Cookies
   - Copy the `cobalt_2_` token value

2. Configure FoundryMagic:
   - As a GM, go to Module Settings
   - Paste your cobalt token in the "D&D Beyond Token" field
   - Save settings

### Module Settings

- **Cache Size**: Maximum cache storage (default: 500MB)
- **Batch Size**: Items per import batch (default: 50)
- **Auto-Update**: Automatically check for content updates
- **Error Recovery**: Enable automatic retry on failures

## Usage

### Character Import

1. Create a new actor in Foundry VTT
2. Click the "Import from D&D Beyond" button
3. Enter the character URL or ID
4. Click "Import" to fetch and convert the character

### Adventure Import

1. Go to the Compendium tab
2. Click "FoundryMagic" > "Import Adventure"
3. Select your D&D Beyond adventure
4. Choose import options (scenes, journals, encounters)
5. Click "Start Import"

### Batch Content Import

1. Open the FoundryMagic interface
2. Select content type (monsters, spells, items)
3. Choose items to import
4. Configure target compendium
5. Monitor progress in the import dialog

## API Reference

FoundryMagic provides a comprehensive API for developers:

```javascript
// Access the module API
const foundryMagic = game.modules.get('foundrymagic')?.api;

// Authenticate with D&D Beyond
const result = await foundryMagic.auth.authenticate({
    cobaltToken: 'cobalt_2_your_token_here',
    userId: 'your_ddb_user_id'
});

// Import a character
const character = await foundryMagic.characters.importCharacter({
    characterId: '12345',
    options: { includeEquipment: true, includeSpells: true }
});

// List available adventures
const adventures = await foundryMagic.adventures.list({
    filter: { owned: true }
});
```

See [API.md](API.md) for complete API documentation.

## User Guide

For detailed usage instructions, see the [User Guide](USER_GUIDE.md).

## Performance

FoundryMagic is designed for reliability and performance:

- **Memory Usage**: Maintains <200MB peak memory during processing
- **Import Speed**: Adventure imports complete within 5 minutes
- **Network Optimization**: <3 second response times for content browsing
- **Cache Management**: Automatic cleanup and size management
- **Error Recovery**: Robust retry mechanisms for network issues

## Troubleshooting

### Common Issues

**Authentication Failed**
- Verify your cobalt token is correct and not expired
- Check that you have an active D&D Beyond subscription
- Ensure your account has access to the content you're trying to import

**Import Timeouts**
- Large adventures may take several minutes to import
- Check your network connection stability
- Try importing in smaller batches

**Memory Issues**
- Clear cache if imports are slow: Settings > Clear Cache
- Restart Foundry VTT if memory usage is high
- Reduce batch size in module settings

### Getting Help

- Check the [Issues page](https://github.com/your-repo/foundrymagic/issues) for known problems
- Join our [Discord server](https://discord.gg/foundrymagic) for community support
- Review the [Foundry VTT documentation](https://foundryvtt.com/article/modules/)

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-repo/foundrymagic.git
cd foundrymagic

# Install dependencies
npm install

# Run tests
npm test

# Build the module
npm run build
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

### Architecture

FoundryMagic follows a modular architecture:

- **Core**: Module initialization and service coordination
- **Auth**: D&D Beyond authentication and session management
- **Importers**: Content-specific import services
- **Cache**: Storage and synchronization management
- **UI**: User interface components and dialogs
- **Utils**: Shared utilities and helpers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

## Acknowledgments

- Foundry VTT for the excellent platform
- D&D Beyond for the content API
- The Foundry VTT community for feedback and testing

## Disclaimer

This module is not affiliated with or endorsed by Wizards of the Coast or D&D Beyond. D&D Beyond is a trademark of Wizards of the Coast LLC.

---

**Version**: 1.0.0  
**Foundry VTT Compatibility**: v10+  
**D&D System**: dnd5e system required