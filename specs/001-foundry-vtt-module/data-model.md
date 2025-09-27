# Data Model: FoundryMagic Unified Module

**Phase 1 Output** | **Date**: September 27, 2025

## Entity Overview
Core entities represent D&D Beyond content imported into Foundry VTT, with transformation and caching layers.

## Core Entities

### Character
**Purpose**: D&D Beyond character data with full progression and equipment
**Fields**:
- `id`: Unique identifier (D&D Beyond character ID)
- `name`: Character name
- `level`: Character level (1-20)
- `class`: Primary class with subclass
- `race`: Character race/species
- `stats`: Ability scores (STR, DEX, CON, INT, WIS, CHA)
- `hitPoints`: Current/max HP values
- `armorClass`: AC calculation and sources
- `equipment`: Array of equipped items with quantities
- `spells`: Known/prepared spells by level
- `features`: Class and racial features
- `background`: Character background and traits
**Relationships**: Has many Items, has many Spells, belongs to Campaign
**Validation**: Level 1-20, valid ability scores (3-20), class/race combinations per D&D rules
**State Transitions**: Draft → Validated → Imported → Synced

### Adventure
**Purpose**: Complete adventure modules with scenes and content
**Fields**:
- `id`: Unique identifier (D&D Beyond adventure ID)
- `title`: Adventure name
- `description`: Adventure summary
- `scenes`: Array of scene data with maps and tokens
- `journals`: Adventure text and handouts
- `encounters`: Pre-built combat encounters
- `handouts`: Player-visible content
- `metadata`: Publication info and source
**Relationships**: Has many Scenes, has many Encounters, contains Monsters
**Validation**: Required title and description, valid scene data structure
**State Transitions**: Discovered → Downloaded → Processed → Imported → Active

### Monster
**Purpose**: Creature stat blocks for encounters
**Fields**:
- `id`: Unique identifier (D&D Beyond monster ID)
- `name`: Monster name
- `type`: Creature type (beast, humanoid, etc.)
- `size`: Size category (tiny to gargantuan)
- `hitPoints`: HP values and dice formula
- `armorClass`: AC and calculation
- `speed`: Movement speeds by type
- `abilities`: Ability scores
- `skills`: Skill proficiencies and bonuses
- `actions`: Attack and special actions
- `traits`: Special abilities and features
- `challengeRating`: CR and XP value
**Relationships**: Belongs to Adventures, has many Tokens
**Validation**: Valid CR range, consistent stat calculations
**State Transitions**: Referenced → Downloaded → Processed → Available

### Spell
**Purpose**: Magic spell descriptions and mechanics
**Fields**:
- `id`: Unique identifier (D&D Beyond spell ID)
- `name`: Spell name
- `level`: Spell level (0-9)
- `school`: School of magic
- `castingTime`: Time required to cast
- `range`: Spell range and area
- `components`: Verbal, somatic, material components
- `duration`: Spell duration and concentration
- `description`: Full spell description
- `damage`: Damage dice and scaling
- `savingThrow`: Save type and effect
**Relationships**: Belongs to Characters, belongs to Classes
**Validation**: Valid spell level (0-9), required description
**State Transitions**: Discovered → Downloaded → Processed → Available

### Item
**Purpose**: Equipment, weapons, armor, and magic items
**Fields**:
- `id`: Unique identifier (D&D Beyond item ID)
- `name`: Item name
- `type`: Item category (weapon, armor, tool, etc.)
- `rarity`: Item rarity (common to legendary)
- `weight`: Weight in pounds
- `cost`: Gold piece value
- `properties`: Item properties (magical, martial, etc.)
- `damage`: Weapon damage dice (if applicable)
- `armorClass`: AC bonus (if armor)
- `description`: Item description and mechanics
- `attunement`: Attunement requirement
**Relationships**: Belongs to Characters, used in Adventures
**Validation**: Valid rarity levels, positive weight and cost
**State Transitions**: Discovered → Downloaded → Processed → Available

### Scene
**Purpose**: Battle maps and encounter locations  
**Fields**:
- `id`: Unique identifier
- `name`: Scene name
- `mapImage`: Background image URL/path
- `gridSize`: Grid dimensions and scaling
- `walls`: Wall placement data for lighting/movement
- `lighting`: Light source positions and properties
- `tokens`: Pre-placed token positions
- `notes`: Scene notes and pins
- `metadata`: Source adventure and page references
**Relationships**: Belongs to Adventure, contains Tokens
**Validation**: Valid grid dimensions, image accessibility
**State Transitions**: Extracted → Enhanced → Imported → Active

### Compendium
**Purpose**: Organized collections of imported content
**Fields**:
- `id`: Foundry compendium identifier  
- `name`: Display name
- `type`: Content type (characters, monsters, items, etc.)
- `folder`: Organization folder path
- `source`: D&D Beyond source identifier
- `lastSync`: Last synchronization timestamp
- `itemCount`: Number of contained items
**Relationships**: Contains multiple content entities
**Validation**: Valid Foundry compendium structure
**State Transitions**: Created → Populated → Synchronized → Active

## Data Relationships

```
Campaign 1:N Characters
Adventure 1:N Scenes
Adventure M:N Monsters (through encounters)  
Character M:N Items (through equipment)
Character M:N Spells (through known/prepared)
Scene M:N Tokens (positioned monsters/characters)
Compendium 1:N Content (any entity type)
```

## Storage Strategy

### Cache Layer (IndexedDB - 500MB limit)
- Temporary storage for download sessions
- Frequently accessed content for offline use
- Automatic cleanup when approaching limits

### Persistent Layer (Foundry Compendiums)
- Final destination for imported content
- Integrated with Foundry's native storage
- Organized by content type and source

## Validation Rules

### Cross-Entity Validation
- Character level matches spell slot availability
- Monster CR appropriate for adventure level recommendations
- Item attunement limits per character (3 max)
- Spell components must be available in character inventory

### Data Integrity
- All foreign key relationships must resolve
- Required fields cannot be null/empty
- Enum values must match D&D rules
- Calculated values must match source formulas

## Performance Considerations

### Indexing Strategy
- Primary keys for all entities
- Search indexes on name fields
- Composite indexes for frequently queried combinations

### Caching Strategy  
- Cache frequently accessed monsters and spells
- Lazy load large content (adventure scenes)
- Batch operations for bulk imports
- Progressive loading for large lists

## Migration Support

### Schema Versioning
- Track entity schema versions
- Provide upgrade paths for data structure changes
- Backwards compatibility for older cached content

### Data Transformation
- Convert between D&D Beyond and Foundry formats
- Handle missing or deprecated fields gracefully
- Preserve user customizations during updates