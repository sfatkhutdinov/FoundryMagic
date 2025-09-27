# Adventure Import Module API Contract

## Module API Entry Point
- **Access**: `const adventuresApi = game.modules.get('foundrymagic')?.api?.adventures`
- **Permissions**: DM-only for importing; adventure listings require authenticated session.
- **Transport**: Promise-based actions plus Foundry socket streams prefixed with `foundrymagic.adventures`.

## Methods

### `list()`
**Description**: Fetch D&D Beyond adventures available to the authenticated account.

**Returns** (`Promise<AdventureList>`):
```json
{
  "adventures": [
    {
      "id": "string",
      "title": "Curse of Strahd",
      "description": "Gothic horror campaign set in Barovia",
      "publication": "Wizards of the Coast",
      "levelRange": "1-10",
      "hasScenes": true,
      "hasHandouts": true,
      "lastModified": "ISO8601 datetime"
    }
  ],
  "totalCount": 8
}
```

### `importAdventure({ adventureId, targetCompendiums, sceneOptions })`
**Description**: Import a full adventure package into Foundry, including scenes and handouts.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `adventureId` | `string` | ✅ | Identifier from D&D Beyond listing. |
| `targetCompendiums.journals` | `string` | ✅ | Foundry compendium for journals/handouts. |
| `targetCompendiums.scenes` | `string` | ✅ | Compendium for scenes. |
| `targetCompendiums.actors` | `string` | ❌ | Optional, defaults to `foundrymagic.monsters`. |
| `sceneOptions.includeLighting` | `boolean` | ❌ | Default `true`. |
| `sceneOptions.includeWalls` | `boolean` | ❌ | Default `true`. |
| `sceneOptions.includeTokens` | `boolean` | ❌ | Default `true`. |

**Returns** (`Promise<ImportHandle>`):
```json
{
  "importId": "uuid",
  "status": "started",
  "adventure": {
    "id": "string",
    "title": "Curse of Strahd",
    "foundryId": null
  }
}
```

### `trackImport(importId)`
**Description**: Observe progress for long-running adventure imports.

**Returns** (`AsyncIterator<AdventureImportProgress>`): yields progress payloads for each phase (`downloading`, `processing`, `scenes`, `journals`, `finalizing`).

## Socket Events
- `foundrymagic.adventures.progress`: Payload `AdventureImportProgress`.
- `foundrymagic.adventures.sceneCreated`: Payload `{ importId, sceneId, enhancementsApplied: { walls: true, lighting: true, tokens: 8 } }`.
- `foundrymagic.adventures.completed`: Payload `{ importId, sceneCount, journalCount, resultCompendiums }`.
- `foundrymagic.adventures.failed`: Payload `{ importId, errors }`.

## Data Contracts

### `AdventureList`
```json
{
  "adventures": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "publication": "string",
      "levelRange": "string",
      "hasScenes": true,
      "hasHandouts": true,
      "lastModified": "ISO8601 datetime"
    }
  ],
  "totalCount": 1
}
```

### `AdventureImportProgress`
```json
{
  "importId": "uuid",
  "status": "started|processing|completed|failed",
  "phase": "downloading|processing|scenes|journals|finalizing",
  "progress": {
    "total": 5,
    "completed": 2
  },
  "sceneEnhancements": {
    "walls": true,
    "lighting": true,
    "tokens": 8
  },
  "errors": ["string"],
  "result": {
    "sceneCount": 12,
    "journalCount": 24,
    "compendiums": {
      "scenes": "foundrymagic.scenes",
      "journals": "foundrymagic.journals"
    }
  }
}
```