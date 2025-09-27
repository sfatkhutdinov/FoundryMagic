# DDB Importer

**Repository:** https://github.com/MrPrimate/ddb-importer

## Overview

The D&D Beyond Importer is a Foundry VTT module that allows importing characters, monsters, spells, items, and other content from D&D Beyond into Foundry Virtual Tabletop. It's a comprehensive bridge between D&D Beyond's digital tools and Foundry VTT's virtual tabletop environment.

## Key Features

### Character Import
- Full character sheet import from D&D Beyond
- Preserves character data, equipment, spells, and features
- Supports both player characters and NPCs
- Automatic compendium integration

### Content Munching
- **Monsters**: Import creatures with full stat blocks and abilities
- **Spells**: Complete spell descriptions and mechanics
- **Items**: Equipment, weapons, armor, and magic items
- **Classes & Subclasses**: Full class features and advancement
- **Races & Traits**: Species information and racial abilities
- **Feats**: Character feat options and descriptions

### Advanced Features
- **Compendium Management**: Organized content in compendium packs
- **Folder Structure**: Automatic organization of imported content
- **Effect Integration**: Active effects for spells and abilities
- **Adventure Support**: Works with DDB Adventure Muncher
- **Patreon Features**: Additional features for supporters

## Core Components

### Parser System
- Character data parsing and transformation
- Monster stat block conversion
- Spell and item data processing
- Advanced enrichment system for enhanced functionality

### Compendium Integration
- Automatic compendium creation and management
- Folder organization within compendiums
- Duplicate handling and updates
- Cross-referencing between content types

### API Integration
- D&D Beyond API connectivity
- Authentication handling via cobalt tokens
- Proxy support for enhanced access
- Campaign integration features

## Configuration Requirements
- **Cobalt Token**: Authentication with D&D Beyond account
- **Patreon Integration**: Optional for premium features
- **Proxy Settings**: For enhanced API access

## Architecture

### Data Models
- Comprehensive data schemas for all D&D content types
- Foundry VTT document compatibility
- Enhancement and enrichment pipelines
- Migration support for system updates

### User Interface
- Settings configuration panels
- Import/export interfaces
- Progress tracking and status reporting
- Help and documentation integration

## Integration Points
- **ddb-adventure-muncher**: Adventure import functionality
- **ddb-meta-data**: Enhanced scene and content data
- **Chris's Premades**: Automated spell and item effects
- **Foundry VTT Core**: Native document integration

## Usage Patterns
1. Configure authentication tokens
2. Select content types to import
3. Run munching operations
4. Content appears in organized compendiums
5. Use in character sheets and adventures

## License
MIT License - Copyright (c) 2019 Sebastian Will, Copyright (c) 2020 Jack Holloway