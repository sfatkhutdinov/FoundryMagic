# Authentication Contract

## POST /auth/validate
**Description**: Validate D&D Beyond cobalt token
**Request**:
```json
{
  "cobaltToken": "string",
  "userId": "string"
}
```
**Response Success (200)**:
```json
{
  "valid": true,
  "expiresAt": "ISO8601 datetime",
  "userId": "string",
  "permissions": ["characters", "adventures", "content"]
}
```
**Response Error (401)**:
```json
{
  "valid": false,
  "error": "Token expired or invalid",
  "code": "INVALID_TOKEN"
}
```

## POST /auth/refresh
**Description**: Refresh authentication session
**Request**:
```json
{
  "cobaltToken": "string"
}
```
**Response Success (200)**:
```json
{
  "refreshed": true,
  "expiresAt": "ISO8601 datetime"
}
```
**Response Error (401)**:
```json
{
  "refreshed": false,
  "error": "Unable to refresh session",
  "code": "REFRESH_FAILED"
}
```