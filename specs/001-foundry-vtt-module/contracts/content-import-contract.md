# Content Management Module API Contract

## Module API Entry Point
- **Access**: `const contentApi = game.modules.get('foundrymagic')?.api?.content`
- **Permissions**: DM-only for mutations; players may read lists where appropriate.
- **Transport**: Promise-based functions with optional progress streams over `foundrymagic.content` sockets.

## Methods

### `list({ type, search, filters })`
**Description**: List available D&D Beyond content for a given type.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `type` | `'monsters' | 'spells' | 'items'` | ✅ | Content category to list. |
| `search` | `string` | ❌ | Free-text search. |
| `filters` | `object` | ❌ | Type-specific filters (see below). |

**Filter Keys**:
- For spells: `level` (`number`), `school` (`string`)
- For monsters: `challengeRating` (`string`), `environment` (`string`)
- For items: `rarity` (`string`), `category` (`string`)

**Returns** (`Promise<ContentList>`):
```json
{
  "content": [
    {
      "id": "ddb-uuid",
      "name": "Fireball",
      "type": "spells",
      "source": "PHB",
      "metadata": {
        "level": 3,
        "school": "Evocation",
        "rarity": null,
        "challengeRating": null
      },
      "lastModified": "ISO8601 datetime"
    }
  ],
  "totalCount": 325,
  "hasMore": true
}
```

### `batchImport({ items, options })`
**Description**: Import multiple content entries concurrently with built-in throttling and progress reporting.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `items[]` | `Array<ImportRequest>` | ✅ | Items to import (max 50 per batch).
| `options.overwriteExisting` | `boolean` | ❌ | Default `false`.
| `options.createFolders` | `boolean` | ❌ | Default `true`.

**Returns** (`Promise<BatchHandle>`):
```json
{
  "batchId": "uuid",
  "status": "queued",
  "progress": {
    "total": 10,
    "completed": 0,
    "failed": 0
  }
}
```

### `trackBatch(batchId)`
**Description**: Subscribe to progress updates for a batch import.

**Returns** (`AsyncIterator<BatchProgress>`): yields progress payloads until completion.

### `checkDuplicates({ items, compendiumId })`
**Description**: Resolve duplicate content before import and produce suggested actions.

**Returns** (`Promise<DuplicateSummary>`):
```json
{
  "duplicates": [
    {
      "ddbId": "string",
      "foundryId": "Compendium.foundrymagic.items.Item.xxxxx",
      "name": "Bag of Holding",
      "lastImported": "ISO8601 datetime",
      "suggestedAction": "overwrite"
    }
  ]
}
```

## Socket Events
- `foundrymagic.content.batch-progress`: Payload `BatchProgress`.
- `foundrymagic.content.batch-completed`: Payload `{ batchId, results }`.
- `foundrymagic.content.batch-failed`: Payload `{ batchId, errors }`.

## Data Contracts

### `ContentList`
```json
{
  "content": [
    {
      "id": "ddb-uuid",
      "name": "Example",
      "type": "monsters",
      "source": "MM",
      "metadata": {
        "challengeRating": "5",
        "rarity": null
      },
      "lastModified": "ISO8601 datetime"
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

### `ImportRequest`
```json
{
  "id": "ddb-uuid",
  "type": "monsters",
  "targetCompendium": "foundrymagic.monsters"
}
```

### `BatchProgress`
```json
{
  "batchId": "uuid",
  "status": "queued|in_progress|completed|failed",
  "progress": {
    "total": 10,
    "completed": 4,
    "failed": 1
  },
  "lastItem": {
    "id": "ddb-uuid",
    "name": "Example"
  },
  "errors": [
    {
      "itemId": "ddb-uuid",
      "error": "Network timeout",
      "code": "NETWORK_TIMEOUT"
    }
  ]
}
```

### `DuplicateSummary`
```json
{
  "duplicates": [
    {
      "ddbId": "string",
      "foundryId": "string",
      "name": "string",
      "lastImported": "ISO8601 datetime",
      "suggestedAction": "overwrite|skip|rename"
    }
  ]
}
```