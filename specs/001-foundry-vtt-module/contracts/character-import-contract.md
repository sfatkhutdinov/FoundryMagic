# Character Import Contract

## GET /characters
**Description**: List available D&D Beyond characters for authenticated user
**Request Headers**:
```
Authorization: Bearer {cobaltToken}
```
**Response Success (200)**:
```json
{
  "characters": [
    {
      "id": "string",
      "name": "string", 
      "level": "number",
      "class": "string",
      "race": "string",
      "lastModified": "ISO8601 datetime",
      "isShared": "boolean"
    }
  ],
  "totalCount": "number"
}
```

## POST /characters/{id}/import
**Description**: Import specific character from D&D Beyond
**Request Headers**:
```
Authorization: Bearer {cobaltToken}
```
**Request Body**:
```json
{
  "compendiumId": "string",
  "options": {
    "includeEquipment": "boolean",
    "includeSpells": "boolean",
    "includeFeatures": "boolean"
  }
}
```
**Response Success (200)**:
```json
{
  "importId": "string",
  "status": "started",
  "character": {
    "id": "string",
    "name": "string",
    "foundryId": "string"
  },
  "progress": {
    "total": "number",
    "completed": "number",
    "phase": "downloading|processing|importing"
  }
}
```
**Response Error (404)**:
```json
{
  "error": "Character not found or not accessible",
  "code": "CHARACTER_NOT_FOUND"
}
```

## GET /characters/{id}/status
**Description**: Check character import progress
**Response Success (200)**:
```json
{
  "importId": "string",
  "status": "in_progress|completed|failed",
  "progress": {
    "total": "number",
    "completed": "number",
    "phase": "downloading|processing|importing"
  },
  "errors": ["string"],
  "result": {
    "foundryId": "string",
    "compendiumPath": "string"
  }
}
```