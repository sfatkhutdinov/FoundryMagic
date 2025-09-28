# FoundryMagic User Guide

This guide provides step-by-step instructions for using FoundryMagic to import D&D Beyond content into Foundry VTT.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Character Import](#character-import)
3. [Adventure Import](#adventure-import)
4. [Content Browsing](#content-browsing)
5. [Batch Operations](#batch-operations)
6. [Cache Management](#cache-management)
7. [Troubleshooting](#troubleshooting)

## Initial Setup

### Prerequisites

- Foundry VTT v10 or later
- dnd5e system installed and active
- D&D Beyond account with subscription (for premium content)
- Active internet connection

### Module Installation

1. **Download FoundryMagic**
   - Go to the Foundry VTT module browser
   - Search for "FoundryMagic"
   - Click "Install"

2. **Enable the Module**
   - Go to your world's module settings
   - Find "FoundryMagic" in the list
   - Check the box to enable it
   - Click "Save Module Settings"

3. **Restart Foundry VTT**
   - Close and reopen Foundry VTT
   - Launch your world

### D&D Beyond Authentication

**Important**: Only Game Masters can configure authentication.

1. **Get Your Cobalt Token**
   - Open D&D Beyond in a web browser
   - Log into your account
   - Press F12 to open developer tools
   - Go to the "Application" or "Storage" tab
   - Find "Cookies" → "https://www.dndbeyond.com"
   - Look for a cookie named starting with `cobalt_2_`
   - Copy the entire value (it's a long string)

2. **Configure FoundryMagic**
   - In Foundry VTT, go to Settings → Module Settings
   - Find "FoundryMagic" section
   - Paste your token in the "D&D Beyond Token" field
   - Click "Save Changes"

3. **Test Authentication**
   - The module will automatically test your token
   - Look for a green checkmark or success message
   - If authentication fails, double-check your token

## Character Import

### Import from Character Sheet

1. **Create New Actor**
   - Click "Create Actor" in the Actors tab
   - Choose "Character" type
   - Give it a temporary name

2. **Open Character Sheet**
   - Double-click the new actor to open its sheet
   - Look for the "Import from D&D Beyond" button (usually in the header)

3. **Import Character**
   - Click the import button
   - Enter the D&D Beyond character URL or ID
   - Choose import options:
     - ✅ Include Equipment
     - ✅ Include Spells
     - ✅ Include Features
   - Click "Import Character"

4. **Review Results**
   - The character sheet will update automatically
   - Check that all data imported correctly
   - Make any necessary manual adjustments

### Import Options Explained

- **Include Equipment**: Imports weapons, armor, and other gear
- **Include Spells**: Imports known and prepared spells
- **Include Features**: Imports class and racial features
- **Update Existing**: Overwrites current character data
- **Create Copy**: Creates a new actor instead of updating

### Finding Character URLs

**Method 1: From D&D Beyond**
- Go to your character on D&D Beyond
- Copy the URL from your browser (e.g., `https://www.dndbeyond.com/characters/12345`)

**Method 2: Character ID Only**
- Just enter the number from the URL (e.g., `12345`)

## Adventure Import

### Starting an Adventure Import

1. **Open Import Interface**
   - Go to the Compendium tab
   - Click "FoundryMagic" folder
   - Click "Import Adventure"

2. **Select Adventure**
   - Browse your owned D&D Beyond adventures
   - Click on the adventure you want to import
   - Review the adventure details

3. **Configure Import Settings**
   - **Scenes**: Import battle maps and locations
   - **Journals**: Import adventure text and handouts
   - **Encounters**: Import pre-built combat encounters
   - **Monsters**: Import creature stat blocks
   - **Handouts**: Import player-visible content

4. **Choose Target Compendium**
   - Select existing compendium or create new one
   - Name the compendium appropriately
   - Set appropriate permissions

### Adventure Import Process

1. **Start Import**
   - Click "Start Import" button
   - Import will begin in the background
   - Progress dialog shows current status

2. **Monitor Progress**
   - Watch the progress bar and status messages
   - Large adventures may take 5-10 minutes
   - Don't close Foundry VTT during import

3. **Review Imported Content**
   - Check the target compendium for imported items
   - Verify scenes were created correctly
   - Test encounters and monster stat blocks

### Scene Enhancement

FoundryMagic automatically enhances imported scenes:

- **Walls**: Automatically generated based on map features
- **Lighting**: Torch and lantern light sources placed
- **Tokens**: Monster tokens positioned for encounters
- **Notes**: Important locations marked with pins

## Content Browsing

### Content Browser Interface

1. **Open Content Browser**
   - Look for the FoundryMagic button in the UI
   - Or use the macro: `/foundrymagic browse`

2. **Browse Categories**
   - **Monsters**: Creatures by challenge rating
   - **Spells**: Spells by level and school
   - **Items**: Equipment by type and rarity
   - **Adventures**: Owned adventure modules

### Search and Filter

- **Search Box**: Type to search by name
- **Filters**: Use dropdowns to narrow results
  - Challenge Rating (monsters)
  - Spell Level (spells)
  - Item Type (equipment)
  - Rarity (magic items)

### Quick Import

1. **Select Items**
   - Check boxes next to desired content
   - Use "Select All" for entire category

2. **Choose Destination**
   - Select target compendium
   - Or create new compendium

3. **Import Selected**
   - Click "Import Selected" button
   - Monitor progress in status bar

## Batch Operations

### Batch Import Workflow

1. **Prepare Content List**
   - Create a list of content IDs to import
   - Or use the content browser to select items

2. **Configure Batch**
   - Set batch size (recommended: 25-50 items)
   - Choose error handling options
   - Select target compendiums

3. **Start Batch Import**
   - Click "Start Batch Import"
   - Process runs in background
   - Progress updates in real-time

### Batch Import Best Practices

- **Small Batches**: Use smaller batches for stability
- **Stable Connection**: Ensure good internet connection
- **Monitor Memory**: Watch for high memory usage
- **Error Handling**: Review failed items and retry

### Managing Import Progress

- **Pause/Resume**: Pause long-running imports if needed
- **Cancel**: Stop imports that are taking too long
- **Retry Failed**: Re-attempt failed items individually
- **Export Log**: Save import results for review

## Cache Management

### Understanding the Cache

FoundryMagic caches downloaded content to improve performance:

- **Size Limit**: 500MB maximum cache size
- **Auto-Cleanup**: Old content automatically removed
- **Offline Access**: Cached content available offline

### Cache Settings

1. **Open Cache Settings**
   - Go to Settings → Module Settings
   - Find "FoundryMagic Cache" section

2. **Configuration Options**
   - **Cache Size**: Adjust maximum cache size
   - **Auto-Update**: Enable automatic content updates
   - **Cleanup Frequency**: How often to clean old cache

### Manual Cache Management

1. **View Cache Status**
   - Check current cache size and usage
   - See what content is cached
   - Review cache hit/miss statistics

2. **Clear Cache**
   - **Clear All**: Remove all cached content
   - **Clear Type**: Remove specific content types
   - **Clear Old**: Remove content older than X days

3. **Force Refresh**
   - Bypass cache for fresh content
   - Useful when content has been updated
   - Use sparingly to avoid rate limits

## Troubleshooting

### Common Issues

#### Authentication Problems

**Symptom**: "Authentication failed" error
**Solutions**:
1. Verify your cobalt token is correct
2. Check that your D&D Beyond subscription is active
3. Log out and back into D&D Beyond, then get a new token
4. Make sure you have access to the content you're trying to import

#### Import Timeouts

**Symptom**: Import stops or takes very long
**Solutions**:
1. Check your internet connection stability
2. Try importing smaller batches
3. Clear cache and try again
4. Restart Foundry VTT and retry

#### Memory Issues

**Symptom**: Foundry VTT becomes slow or unresponsive
**Solutions**:
1. Clear the FoundryMagic cache
2. Reduce batch import sizes
3. Restart Foundry VTT
4. Close other browser tabs/applications

#### Missing Content

**Symptom**: Imported content is incomplete or missing
**Solutions**:
1. Check that you own the content on D&D Beyond
2. Verify your subscription level includes the content
3. Try importing individual items instead of batches
4. Check the import log for specific errors

### Error Messages

#### "Premium subscription required"
- The content requires a D&D Beyond subscription
- Upgrade your D&D Beyond account
- Or choose different content to import

#### "Character not found"
- The character URL or ID is incorrect
- Make sure the character is public or you own it
- Try copying the URL again from D&D Beyond

#### "Network error"
- Your internet connection was interrupted
- D&D Beyond servers may be temporarily unavailable
- Wait and try again later

#### "Cache full"
- Your cache has reached the size limit
- Clear some cached content
- Or increase the cache size limit

### Getting Help

1. **Check the Console**
   - Press F12 to open developer tools
   - Look for error messages in the Console tab
   - Copy any error messages for support

2. **Enable Debug Mode**
   - Go to Settings → Module Settings
   - Enable "Debug Logging" for FoundryMagic
   - Reproduce the problem
   - Check the console for detailed logs

3. **Community Support**
   - Join the FoundryMagic Discord server
   - Post in the Foundry VTT subreddit
   - Check existing GitHub issues

4. **Bug Reports**
   - Create a GitHub issue with details
   - Include your Foundry VTT version
   - Include browser and operating system
   - Provide steps to reproduce the problem

## Advanced Usage

### Custom Import Scripts

You can create macros to automate common import tasks:

```javascript
// Import a specific character
const foundryMagic = game.modules.get('foundrymagic')?.api;
await foundryMagic.characters.importCharacter({
    characterId: '12345',
    options: { includeEquipment: true }
});
```

### API Integration

For module developers, FoundryMagic provides hooks:

- `foundrymagic.character.imported`
- `foundrymagic.adventure.imported`
- `foundrymagic.batch.completed`

### Performance Tuning

Adjust settings for your specific use case:

- **High-End Systems**: Increase batch sizes and concurrent imports
- **Slow Connections**: Reduce batch sizes and enable aggressive caching
- **Limited Storage**: Reduce cache size and enable auto-cleanup

---

**Need more help?** Check out our [FAQ](FAQ.md) or join our community support channels.