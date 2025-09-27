# Content Management Contract

## GET /content/{type}
**Description**: List available content by type (monsters, spells, items)
**Path Parameters**:
- `type`: monsters|spells|items
**Query Parameters**:
- `search`: string (optional)
- `level`: number (optional, for spells)  
- `cr`: string (optional, for monsters)
- `rarity`: string (optional, for items)
**Request Headers**:
```
Authorization: Bearer {cobaltToken}
```
**Response Success (200)**:
```json
{
  "content": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "source": "string",
      "level": "number|null",
      "cr": "string|null",
      "rarity": "string|null",
      "lastModified": "ISO8601 datetime"
    }
  ],
  "totalCount": "number",
  "hasMore": "boolean"
}
```

## POST /content/batch-import
**Description**: Import multiple content items simultaneously
**Request Headers**:
```
Authorization: Bearer {cobaltToken}
```
**Request Body**:
```json
{
  "items": [
    {
      "id": "string",
      "type": "monsters|spells|items",
      "compendiumId": "string"
    }
  ],
  "options": {
    "overwriteExisting": "boolean",
    "createFolders": "boolean"
  }
}
```
**Response Success (200)**:
```json
{
  "batchId": "string",
  "status": "started",
  "progress": {
    "total": "number",
    "completed": "number",
    "failed": "number"
  }
}
```

## GET /content/batch-status/{batchId}
**Description**: Check batch import progress
**Response Success (200)**:
```json
{
  "batchId": "string",
  "status": "in_progress|completed|failed",
  "progress": {
    "total": "number",
    "completed": "number",
    "failed": "number"
  },
  "errors": [
    {
      "itemId": "string",
      "error": "string",
      "code": "string"
    }
  ],
  "results": [
    {
      "itemId": "string",
      "foundryId": "string",
      "compendiumPath": "string"
    }
  ]
}
```

## POST /content/duplicate-check
**Description**: Check for duplicate content before import
**Request Body**:
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "type": "string"
    }
  ],
  "compendiumId": "string"
}
```
**Response Success (200)**:
```json
{
  "duplicates": [
    {
      "ddbId": "string", 
      "foundryId": "string",
      "name": "string",
      "lastImported": "ISO8601 datetime",
      "action": "overwrite|skip|rename"
    }
  ]
}
```