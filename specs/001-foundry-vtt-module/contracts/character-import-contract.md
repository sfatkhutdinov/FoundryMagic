# Character Import Module API Contract

## Module API Entry Point
- **Access**: `const charactersApi = game.modules.get('foundrymagic')?.api?.characters`
- **Permissions**: Listing allowed for all authenticated users; import requires DM role.
- **Transport**: Promise-based methods with progress events over `foundrymagic.characters.*` sockets.

## Methods

### `list({ filterSharedOnly = false } = {})`
**Description**: Retrieve D&D Beyond characters available to the authenticated session.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `filterSharedOnly` | `boolean` | ❌ | Defaults to `false`; when true, only shared characters are returned. |

**Returns** (`Promise<CharacterList>`):
```json
{
  "characters": [
    {
      "id": "string",
      "name": "string",
      "level": 5,
      "class": "Paladin",
      "race": "Aasimar",
      "lastModified": "ISO8601 datetime",
      "isShared": true
    }
  ],
  "totalCount": 12
}
```

### `importCharacter({ characterId, targetCompendium, options })`
**Description**: Import a single character into Foundry VTT compendium(s).

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `characterId` | `string` | ✅ | D&D Beyond character identifier. |
| `targetCompendium` | `string` | ✅ | Foundry compendium collection name. |
| `options.includeEquipment` | `boolean` | ❌ | Defaults to `true`. |
| `options.includeSpells` | `boolean` | ❌ | Defaults to `true`. |
| `options.includeFeatures` | `boolean` | ❌ | Defaults to `true`. |

**Returns** (`Promise<ImportHandle>`):
```json
{
  "importId": "uuid",
  "status": "started",
  "character": {
    "id": "string",
    "name": "string",
    "foundryId": null
  }
}
```

### `trackImport(importId)`
**Description**: Subscribe to progress updates for a pending character import.

**Returns** (`AsyncIterator<ImportProgress>`): yields progress payloads:
```json
{
  "importId": "uuid",
  "status": "processing",
  "progress": {
    "total": 3,
    "completed": 1,
    "phase": "downloading"
  },
  "errors": []
}
```

**Completion Payload**:
```json
{
  "importId": "uuid",
  "status": "completed",
  "result": {
    "foundryId": "Actor.xxxxx",
    "compendiumPath": "foundrymagic.characters"
  }
}
```

## Socket Events
- `foundrymagic.characters.progress`: broadcast progress updates; payload `ImportProgress`.
- `foundrymagic.characters.completed`: payload `{ importId, result }` emitted after success.
- `foundrymagic.characters.failed`: payload `{ importId, errors }`.

## Data Contracts

### `CharacterList`
```json
{
  "characters": [
    {
      "id": "string",
      "name": "string",
      "level": 1,
      "class": "Wizard",
      "race": "Elf",
      "lastModified": "ISO8601 datetime",
      "isShared": true
    }
  ],
  "totalCount": 1
}
```

### `ImportProgress`
```json
{
  "importId": "uuid",
  "status": "started|processing|completed|failed",
  "progress": {
    "total": 3,
    "completed": 1,
    "phase": "downloading|processing|importing"
  },
  "errors": ["string"],
  "result": {
    "foundryId": "Actor.xxxxx",
    "compendiumPath": "foundrymagic.characters"
  }
}
```