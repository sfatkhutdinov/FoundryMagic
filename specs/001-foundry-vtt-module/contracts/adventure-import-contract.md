# Adventure Import Contract

## GET /adventures
**Description**: List available D&D Beyond adventures
**Request Headers**:
```
Authorization: Bearer {cobaltToken}
```
**Response Success (200)**:
```json
{
  "adventures": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "publication": "string",
      "level": "string",
      "hasScenes": "boolean",
      "hasHandouts": "boolean",
      "lastModified": "ISO8601 datetime"
    }
  ],
  "totalCount": "number"
}
```

## POST /adventures/{id}/import
**Description**: Import adventure with all content
**Request Headers**:
```
Authorization: Bearer {cobaltToken}
```
**Request Body**:
```json
{
  "compendiumId": "string",
  "options": {
    "includeScenes": "boolean",
    "includeHandouts": "boolean",
    "includeTokens": "boolean",
    "includeLighting": "boolean",
    "includeWalls": "boolean"
  }
}
```
**Response Success (200)**:
```json
{
  "importId": "string",
  "status": "started",
  "adventure": {
    "id": "string",
    "title": "string",
    "foundryId": "string"
  },
  "progress": {
    "total": "number",
    "completed": "number",
    "phase": "downloading|processing|scenes|importing"
  }
}
```

## GET /adventures/{id}/status
**Description**: Check adventure import progress
**Response Success (200)**:
```json
{
  "importId": "string",
  "status": "in_progress|completed|failed",
  "progress": {
    "total": "number",
    "completed": "number", 
    "phase": "downloading|processing|scenes|importing"
  },
  "errors": ["string"],
  "result": {
    "foundryId": "string",
    "compendiumPath": "string",
    "sceneCount": "number",
    "handoutCount": "number"
  }
}
```