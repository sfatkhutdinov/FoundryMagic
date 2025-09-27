# Authentication Module API Contract

## Module API Entry Point
- **Access**: `const authApi = game.modules.get('foundrymagic')?.api?.auth`
- **Permissions**: Only users with the DM role can invoke mutating methods; players may read session status.
- **Transport**: Methods return Promises and optionally emit Foundry socket events prefixed with `foundrymagic.auth`.

## Methods

### `authenticate({ cobaltToken, userId })`
**Description**: Validate a cobalt token and start a FoundryMagic session.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `cobaltToken` | `string` | ✅ | Raw D&D Beyond cobalt token supplied by the DM. |
| `userId` | `string` | ✅ | D&D Beyond account identifier for auditing. |

**Returns** (`Promise<AuthenticationResult>`):
```json
{
  "valid": true,
  "expiresAt": "ISO8601 datetime",
  "userId": "string",
  "permissions": ["characters", "adventures", "content"]
}
```

**Errors**:
- `InvalidTokenError`
- `NetworkFailureError`
- `PermissionDeniedError` (if invoked by non-DM user)

**Emitted Events**: `foundrymagic.auth.validated` with payload `{ userId, expiresAt }`.

### `refreshSession()`
**Description**: Refresh the active cobalt session using the persisted token.

**Returns** (`Promise<RefreshResult>`):
```json
{
  "refreshed": true,
  "expiresAt": "ISO8601 datetime"
}
```

**Errors**:
- `NoActiveSessionError`
- `RefreshFailedError`

**Emitted Events**: `foundrymagic.auth.refreshed` with payload `{ expiresAt }` on success.

### `getActiveSession()`
**Description**: Retrieve current session metadata for UI display.

**Returns** (`Promise<SessionInfo | null>`):
```json
{
  "userId": "string",
  "expiresAt": "ISO8601 datetime",
  "permissions": ["characters", "adventures", "content"],
  "createdAt": "ISO8601 datetime"
}
```

### `endSession()`
**Description**: Explicitly terminate the active session and clear stored token data.

**Returns**: `Promise<void>`

**Emitted Events**: `foundrymagic.auth.ended`

## Socket Messages
- `foundrymagic.auth.expired`: Broadcast automatically when the cobalt token expires. Payload `{ userId, expiresAt }`.
- `foundrymagic.auth.error`: Broadcast when authentication encounters a non-recoverable error. Payload `{ code, message }`.

## Data Contracts

### `AuthenticationResult`
```json
{
  "valid": true,
  "expiresAt": "ISO8601 datetime",
  "userId": "string",
  "permissions": ["characters", "adventures", "content"]
}
```

### `RefreshResult`
```json
{
  "refreshed": true,
  "expiresAt": "ISO8601 datetime"
}
```

### `SessionInfo`
```json
{
  "userId": "string",
  "expiresAt": "ISO8601 datetime",
  "permissions": ["characters", "adventures", "content"],
  "createdAt": "ISO8601 datetime"
}
```