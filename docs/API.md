# FoundryMagic API Documentation

This document provides comprehensive API documentation for FoundryMagic's module interface, generated from the contract specifications.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication API](#authentication-api)
3. [Character API](#character-api)
4. [Adventure API](#adventure-api)
5. [Content API](#content-api)
6. [Batch Operations](#batch-operations)
7. [Events](#events)
8. [Error Handling](#error-handling)

## Getting Started

### Accessing the API

```javascript
// Access the FoundryMagic API
const foundryMagic = game.modules.get('foundrymagic')?.api;

if (!foundryMagic) {
    throw new Error('FoundryMagic module not found or not enabled');
}
```

### API Structure

The API is organized into functional modules:

- `foundryMagic.auth` - Authentication and session management
- `foundryMagic.characters` - Character import and management
- `foundryMagic.adventures` - Adventure import and management
- `foundryMagic.content` - Content browsing and batch operations

### Permissions

Most API methods require Game Master (GM) permissions. Players can only access read-only methods and their own imported content.

## Authentication API

### `authenticate(options)`

Validates a D&D Beyond cobalt token and starts a FoundryMagic session.

**Parameters:**
- `options.cobaltToken` (string, required): Raw D&D Beyond cobalt token
- `options.userId` (string, required): D&D Beyond account identifier

**Returns:** Promise<AuthenticationResult>

```javascript
const result = await foundryMagic.auth.authenticate({
    cobaltToken: 'cobalt_2_your_token_here',
    userId: 'your_ddb_user_id'
});

console.log(result);
// {
//   valid: true,
//   expiresAt: "2023-12-01T12:00:00.000Z",
//   userId: "12345",
//   permissions: ["characters", "adventures", "content"]
// }
```

**Errors:**
- `InvalidTokenError`: Token format is invalid or expired
- `NetworkFailureError`: Network connection failed
- `PermissionDeniedError`: Only GMs can authenticate

**Events Emitted:**
- `foundrymagic.auth.validated`: On successful authentication

### `refreshSession()`

Refreshes the active D&D Beyond session using the stored token.

**Returns:** Promise<RefreshResult>

```javascript
const result = await foundryMagic.auth.refreshSession();

console.log(result);
// {
//   refreshed: true,
//   expiresAt: "2023-12-01T12:00:00.000Z"
// }
```

**Errors:**
- `NoActiveSessionError`: No active session to refresh
- `RefreshFailedError`: Token refresh failed

**Events Emitted:**
- `foundrymagic.auth.refreshed`: On successful refresh

## Character API

### `list(options)`

Lists available D&D Beyond characters for the authenticated user.

**Parameters:**
- `options.filter` (object, optional): Filter criteria
- `options.sort` (string, optional): Sort order

**Returns:** Promise<CharacterList>

```javascript
const characters = await foundryMagic.characters.list({
    filter: { level: { min: 5, max: 10 } },
    sort: 'name'
});

console.log(characters);
// {
//   characters: [
//     {
//       id: "12345",
//       name: "Thorin Ironforge",
//       level: 8,
//       class: "Fighter",
//       race: "Dwarf"
//     }
//   ],
//   total: 1
// }
```

### `importCharacter(options)`

Imports a D&D Beyond character into Foundry VTT.

**Parameters:**
- `options.characterId` (string, required): D&D Beyond character ID
- `options.targetActor` (string, optional): Existing actor ID to update
- `options.includeEquipment` (boolean, optional): Import equipment (default: true)
- `options.includeSpells` (boolean, optional): Import spells (default: true)
- `options.includeFeatures` (boolean, optional): Import features (default: true)

**Returns:** Promise<ImportResult>

```javascript
const result = await foundryMagic.characters.importCharacter({
    characterId: '12345',
    includeEquipment: true,
    includeSpells: true
});

console.log(result);
// {
//   success: true,
//   actorId: "actor_abc123",
//   itemsImported: 25,
//   warnings: []
// }
```

**Events Emitted:**
- `foundrymagic.character.imported`: On successful import
- `foundrymagic.character.import.progress`: During import progress

## Adventure API

### `list(options)`

Lists available D&D Beyond adventures for the authenticated user.

**Parameters:**
- `options.filter` (object, optional): Filter criteria
- `options.owned` (boolean, optional): Only owned adventures

**Returns:** Promise<AdventureList>

```javascript
const adventures = await foundryMagic.adventures.list({
    filter: { owned: true }
});

console.log(adventures);
// {
//   adventures: [
//     {
//       id: "67890",
//       title: "Lost Mine of Phandelver",
//       description: "A D&D Starter Set adventure",
//       scenes: 12,
//       level: "1-5"
//     }
//   ],
//   total: 1
// }
```

### `importAdventure(options)`

Imports a D&D Beyond adventure into Foundry VTT.

**Parameters:**
- `options.adventureId` (string, required): D&D Beyond adventure ID
- `options.targetCompendium` (string, optional): Target compendium ID
- `options.includeScenes` (boolean, optional): Import scenes (default: true)
- `options.includeJournals` (boolean, optional): Import journals (default: true)
- `options.includeEncounters` (boolean, optional): Import encounters (default: true)

**Returns:** Promise<ImportResult>

```javascript
const result = await foundryMagic.adventures.importAdventure({
    adventureId: '67890',
    includeScenes: true,
    includeJournals: true
});

console.log(result);
// {
//   success: true,
//   compendiumId: "world.imported-adventure",
//   scenes: 12,
//   journals: 25,
//   encounters: 8
// }
```

**Events Emitted:**
- `foundrymagic.adventure.imported`: On successful import
- `foundrymagic.adventure.import.progress`: During import progress

## Content API

### `list(options)`

Lists available D&D Beyond content with filtering options.

**Parameters:**
- `options.type` (string, required): Content type ('monsters', 'spells', 'items')
- `options.filter` (object, optional): Type-specific filters
- `options.page` (number, optional): Page number for pagination
- `options.limit` (number, optional): Results per page

**Returns:** Promise<ContentList>

```javascript
// List monsters by challenge rating
const monsters = await foundryMagic.content.list({
    type: 'monsters',
    filter: { challengeRating: { min: 1, max: 5 } },
    page: 1,
    limit: 20
});

// List spells by school
const spells = await foundryMagic.content.list({
    type: 'spells',
    filter: { school: 'evocation', level: 3 }
});

// List magic items by rarity
const items = await foundryMagic.content.list({
    type: 'items',
    filter: { rarity: 'rare', type: 'weapon' }
});
```

### `batchImport(options)`

Performs batch import of multiple content items with progress tracking.

**Parameters:**
- `options.items` (array, required): Array of item objects to import
- `options.targetCompendium` (string, optional): Target compendium ID
- `options.chunkSize` (number, optional): Batch size (max 50)
- `options.onProgress` (function, optional): Progress callback

**Returns:** Promise<BatchImportResult>

```javascript
const items = [
    { type: 'monsters', id: '1', name: 'Goblin' },
    { type: 'monsters', id: '2', name: 'Orc' },
    { type: 'spells', id: '100', name: 'Fireball' }
];

const result = await foundryMagic.content.batchImport({
    items: items,
    chunkSize: 25,
    onProgress: (progress) => {
        console.log(`Progress: ${progress.completed}/${progress.total}`);
    }
});

console.log(result);
// {
//   success: true,
//   batchId: "batch_abc123",
//   total: 3,
//   completed: 3,
//   failed: 0,
//   items: [...]
// }
```

**Events Emitted:**
- `foundrymagic.batch.started`: When batch import begins
- `foundrymagic.batch.progress`: During batch processing
- `foundrymagic.batch.completed`: When batch import finishes

### `checkDuplicates(options)`

Checks for duplicate content before importing.

**Parameters:**
- `options.items` (array, required): Items to check for duplicates
- `options.compendium` (string, optional): Target compendium to check

**Returns:** Promise<DuplicateCheckResult>

```javascript
const duplicates = await foundryMagic.content.checkDuplicates({
    items: [
        { type: 'monsters', id: '1', name: 'Goblin' }
    ],
    compendium: 'world.monsters'
});

console.log(duplicates);
// {
//   duplicates: [
//     {
//       item: { type: 'monsters', id: '1', name: 'Goblin' },
//       existing: { _id: "existing_id", name: "Goblin" },
//       action: 'skip' // or 'update', 'rename'
//     }
//   ],
//   strategy: 'prompt' // or 'skip', 'update', 'rename'
// }
```

## Batch Operations

### Batch Import Workflow

```javascript
// 1. Start batch import
const batch = await foundryMagic.content.batchImport({
    items: largeItemList,
    chunkSize: 50
});

// 2. Monitor progress
const checkProgress = setInterval(async () => {
    const status = await foundryMagic.getBatchStatus(batch.batchId);
    
    if (status.status === 'completed') {
        clearInterval(checkProgress);
        console.log('Batch import completed!');
    } else if (status.status === 'failed') {
        clearInterval(checkProgress);
        console.error('Batch import failed:', status.error);
    }
}, 1000);

// 3. Handle completion
Hooks.once('foundrymagic.batch.completed', (result) => {
    ui.notifications.info(`Imported ${result.completed} items successfully`);
});
```

### Batch Status Management

```javascript
// Get active batches
const activeBatches = foundryMagic.getActiveBatches();

// Get batch status
const status = await foundryMagic.getBatchStatus(batchId);

// Cancel batch
await foundryMagic.cancelBatch(batchId);
```

## Events

FoundryMagic emits various events that you can listen to:

### Authentication Events

```javascript
// Authentication successful
Hooks.on('foundrymagic.auth.validated', (data) => {
    console.log('User authenticated:', data.userId);
});

// Session refreshed
Hooks.on('foundrymagic.auth.refreshed', (data) => {
    console.log('Session refreshed, expires:', data.expiresAt);
});
```

### Import Events

```javascript
// Character import progress
Hooks.on('foundrymagic.character.import.progress', (data) => {
    console.log(`Importing character: ${data.progress}%`);
});

// Character imported successfully
Hooks.on('foundrymagic.character.imported', (data) => {
    console.log('Character imported:', data.actorId);
});

// Adventure import progress
Hooks.on('foundrymagic.adventure.import.progress', (data) => {
    console.log(`Importing adventure: ${data.currentStep}`);
});

// Batch operation events
Hooks.on('foundrymagic.batch.progress', (data) => {
    console.log(`Batch progress: ${data.completed}/${data.total}`);
});
```

## Error Handling

### Error Types

FoundryMagic defines specific error types for different scenarios:

```javascript
try {
    await foundryMagic.auth.authenticate({
        cobaltToken: 'invalid_token',
        userId: 'test'
    });
} catch (error) {
    switch (error.name) {
        case 'InvalidTokenError':
            ui.notifications.error('Please check your D&D Beyond token');
            break;
        case 'NetworkFailureError':
            ui.notifications.warn('Network error, please try again');
            break;
        case 'PermissionDeniedError':
            ui.notifications.error('Only GMs can authenticate');
            break;
        default:
            ui.notifications.error('An unexpected error occurred');
    }
}
```

### Retry Strategies

For network-related errors, FoundryMagic includes built-in retry mechanisms:

```javascript
// Automatic retry with exponential backoff
const result = await foundryMagic.characters.importCharacter({
    characterId: '12345',
    retryOptions: {
        maxRetries: 3,
        strategy: 'exponential_backoff',
        baseDelay: 1000
    }
});
```

### Error Recovery

```javascript
// Listen for recoverable errors
Hooks.on('foundrymagic.error.recoverable', async (error) => {
    if (error.type === 'network_timeout') {
        // Offer to retry
        const retry = await Dialog.confirm({
            title: 'Network Timeout',
            content: 'The import operation timed out. Would you like to retry?'
        });
        
        if (retry) {
            error.retry();
        }
    }
});
```

## Utility Functions

### Content Validation

```javascript
// Validate character data before import
const isValid = foundryMagic.utils.validateCharacterData(characterData);

// Validate spell data
const spellValid = foundryMagic.utils.validateSpellData(spellData);
```

### Data Transformation

```javascript
// Transform D&D Beyond data to Foundry format
const foundryCharacter = foundryMagic.utils.transformCharacter(ddbCharacter);

// Transform monster data
const foundryMonster = foundryMagic.utils.transformMonster(ddbMonster);
```

### Cache Management

```javascript
// Check cache status
const cacheInfo = await foundryMagic.cache.getStatus();

// Clear cache
await foundryMagic.cache.clear('characters');

// Force cache refresh
await foundryMagic.cache.refresh(['monsters', 'spells']);
```

## Configuration

### Module Settings

Access module settings programmatically:

```javascript
// Get current settings
const settings = foundryMagic.getSettings();

// Update settings (GM only)
await foundryMagic.updateSettings({
    cacheSize: 1000, // 1GB
    batchSize: 25,
    autoUpdate: true
});
```

### Performance Tuning

```javascript
// Optimize for high-end systems
foundryMagic.updatePerformanceSettings({
    maxConcurrentImports: 10,
    chunkSize: 50,
    memoryThreshold: 500 * 1024 * 1024 // 500MB
});

// Optimize for slow connections
foundryMagic.updatePerformanceSettings({
    maxConcurrentImports: 2,
    chunkSize: 10,
    requestTimeout: 30000 // 30 seconds
});
```

## Examples

### Complete Character Import Example

```javascript
async function importMyCharacter() {
    try {
        // 1. Authenticate if needed
        const session = foundryMagic.auth.getSession();
        if (!session || session.expired) {
            await foundryMagic.auth.authenticate({
                cobaltToken: game.settings.get('foundrymagic', 'ddbToken'),
                userId: game.user.id
            });
        }
        
        // 2. Check for duplicates
        const duplicates = await foundryMagic.content.checkDuplicates({
            items: [{ type: 'character', id: '12345' }]
        });
        
        if (duplicates.duplicates.length > 0) {
            const proceed = await Dialog.confirm({
                title: 'Duplicate Found',
                content: 'This character already exists. Update it?'
            });
            
            if (!proceed) return;
        }
        
        // 3. Import character
        const result = await foundryMagic.characters.importCharacter({
            characterId: '12345',
            includeEquipment: true,
            includeSpells: true,
            includeFeatures: true
        });
        
        // 4. Handle success
        ui.notifications.info(`Character imported successfully: ${result.actorId}`);
        
    } catch (error) {
        console.error('Character import failed:', error);
        ui.notifications.error(`Import failed: ${error.message}`);
    }
}
```

### Batch Content Import Example

```javascript
async function batchImportMonsters() {
    try {
        // 1. Get list of monsters to import
        const monsters = await foundryMagic.content.list({
            type: 'monsters',
            filter: { challengeRating: { max: 5 } }
        });
        
        // 2. Start batch import with progress tracking
        const result = await foundryMagic.content.batchImport({
            items: monsters.items,
            chunkSize: 25,
            onProgress: (progress) => {
                const percent = Math.round((progress.completed / progress.total) * 100);
                ui.notifications.info(`Import progress: ${percent}%`);
            }
        });
        
        // 3. Handle completion
        console.log(`Imported ${result.completed} monsters successfully`);
        
    } catch (error) {
        console.error('Batch import failed:', error);
    }
}
```

---

**Note**: This API documentation is generated from the contract specifications. For the most up-to-date information, refer to the source code and contract files in the `contracts/` directory.