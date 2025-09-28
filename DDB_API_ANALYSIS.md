# D&D Beyond API Integration Analysis

## Overview from Real-World Implementations

Based on analysis of the actual `ddb-importer`, `ddb-proxy`, and related codebases, here's how D&D Beyond integration really works:

## Authentication Flow

### 1. Cobalt Session Token
- **Format**: JWT/JWE token (starts with `eyJ`, 5 parts separated by dots)
- **Usage**: Sent as `Cookie: CobaltSession=<token>`
- **Source**: Retrieved from D&D Beyond web interface (browser cookie)

### 2. Bearer Token Exchange
From `ddb-proxy/auth.js`:
```javascript
fetch("https://auth-service.dndbeyond.com/v1/cobalt-token", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: `CobaltSession=${cobalt}`,
  },
})
.then((response) => response.json())
.then((data) => {
  // data.token contains the Bearer token for API calls
});
```

**Key Insight**: The cobalt session cookie is exchanged for a Bearer token through the auth service!

## Real API Endpoints

### Character Service
- **Base**: `https://character-service.dndbeyond.com/character/v5`
- **Character Data**: `/character/{id}?includeCustomItems=true`
- **Spells**: `/game-data/spells?classId={id}&classLevel={level}&sharingSetting=2`
- **Items**: `/game-data/items?sharingSetting=2`
- **Class Options**: `/game-data/class-feature/collection`
- **Racial Traits**: `/game-data/racial-trait/collection`

### Monster Service  
- **Base**: `https://monster-service.dndbeyond.com/v1/Monster`
- **Search**: `?search={term}&skip={offset}&take={limit}`
- **By IDs**: `?ids={id1}&ids={id2}`

### Campaign Service
- **Campaigns**: `https://www.dndbeyond.com/api/campaign/stt/user-campaigns`
- **Config**: `https://www.dndbeyond.com/api/config/json`

## Request Pattern

### Authorization Headers
After token exchange:
```javascript
const headers = {
  "Authorization": `Bearer ${bearerToken}`,
  "Content-Type": "application/json",
  "Content-Length": body.length,
};
```

### Request Body Structure
Most API calls use POST with JSON body:
```javascript
{
  "campaignId": campaignId,  // optional
  "sharingSetting": 2,       // controls content access
  "ids": [array_of_ids]      // for specific content
}
```

## Data Flow Architecture

```
1. Browser → Get CobaltSession Cookie from D&D Beyond
2. Module → Exchange CobaltSession for Bearer Token
3. Module → Use Bearer Token for API Requests  
4. API → Return Structured Data
5. Module → Transform & Import to Foundry
```

## Key Components Analysis

### DDB-Importer Architecture
- **Proxy Layer**: `DDBProxy.mjs` - handles endpoint routing
- **Parser System**: Transforms D&D Beyond data to Foundry format
- **Muncher System**: Bulk import operations 
- **Factory Pattern**: `DDBMonsterFactory`, `DDBCharacterImporter`

### DDB-Proxy Architecture
- **Authentication**: `auth.js` - token exchange and caching
- **Resource Handlers**: `character.js`, `monsters.js`, `spells.js`, `items.js`
- **Caching Layer**: `cache.js` - performance optimization
- **Configuration**: `config.js` - all API endpoints and mappings

## Data Structure Examples

### Character Data Response
```javascript
{
  "success": true,
  "data": {
    "id": 12345,
    "name": "Character Name",
    "classes": [...],
    "race": {...},
    "stats": [...],
    "items": [...],
    "spells": [...]
  }
}
```

### Monster Data Response  
```javascript
{
  "data": [
    {
      "id": 123,
      "name": "Monster Name", 
      "type": "monstrosity",
      "challengeRatingValue": 5,
      "armorClass": 15,
      "hitPointsMax": 82,
      "stats": [...],
      "actions": [...]
    }
  ]
}
```

## Critical Implementation Insights

### 1. Two-Step Authentication
**Wrong**: Direct API calls with cobalt session
**Right**: Exchange cobalt session → Bearer token → API calls

### 2. Proper API Endpoints  
**Wrong**: Generic REST endpoints like `/api/user/me`
**Right**: Service-specific endpoints like `character-service.dndbeyond.com`

### 3. Request Structure
**Wrong**: GET requests with simple parameters
**Right**: POST requests with JSON body containing sharingSetting and campaign context

### 4. Data Processing Pipeline
1. **Fetch**: Get raw D&D Beyond data
2. **Parse**: Transform to Foundry-compatible format
3. **Enrich**: Add metadata, images, effects
4. **Import**: Create Foundry documents
5. **Organize**: Sort into compendiums and folders

## Performance Optimizations

### Caching Strategy
- **Short-term**: Bearer tokens (cached for ~5 minutes)  
- **Medium-term**: Character/monster data (hours)
- **Long-term**: Static content like spells/items (days)

### Batch Operations
- **Chunking**: Process large datasets in batches
- **Concurrency**: Multiple parallel requests with rate limiting  
- **Error Handling**: Retry failed requests with exponential backoff

### Proxy Benefits
- **Rate Limiting**: Prevents API abuse
- **Data Transformation**: Pre-processes D&D Beyond data
- **Caching**: Reduces redundant API calls
- **Error Handling**: Standardized error responses

## Integration with Foundry VTT

### Document Creation
```javascript
// Create actor from D&D Beyond character data
const actorData = await DDBCharacterParser.parse(ddbCharacter);
const actor = await Actor.create(actorData);

// Create items from D&D Beyond item data  
const itemsData = await DDBItemParser.parse(ddbItems);
const items = await Item.createDocuments(itemsData);
```

### Compendium Management
```javascript
// Import to specific compendium
const pack = game.packs.get("world.ddb-monsters");
await pack.createDocument(monsterData);

// Organize with folders
const folder = await Folder.create({
  name: "D&D Beyond Imports",
  type: "Actor"
});
```

## Key Differences from Our Implementation

### What We Got Right
✅ JWT/JWE token validation
✅ Cookie-based authentication headers  
✅ Foundry VTT integration patterns
✅ Error handling and retry logic

### What We Need to Fix
❌ **Authentication Flow**: We're missing the Bearer token exchange step
❌ **API Endpoints**: We're using wrong/non-existent endpoints  
❌ **Request Structure**: We need POST with JSON body, not GET requests
❌ **Data Processing**: Need robust parsing pipeline for D&D Beyond data formats

## Recommended Updates

### 1. Fix Authentication Service
```javascript
// Add bearer token exchange
async authenticate({ cobaltToken, userId }) {
  // Step 1: Exchange cobalt for bearer token
  const bearerResponse = await fetch("https://auth-service.dndbeyond.com/v1/cobalt-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `CobaltSession=${cobaltToken}`,
    },
  });
  
  const { token: bearerToken } = await bearerResponse.json();
  
  // Step 2: Store bearer token for API calls
  this._bearerToken = bearerToken;
  // ... rest of implementation
}
```

### 2. Update API Endpoints
```javascript
export const DDB_ENDPOINTS = {
  AUTH_SERVICE: "https://auth-service.dndbeyond.com/v1/cobalt-token",
  CHARACTER_BASE: "https://character-service.dndbeyond.com/character/v5",
  MONSTER_BASE: "https://monster-service.dndbeyond.com/v1/Monster",
  CHARACTER: (id) => `${DDB_ENDPOINTS.CHARACTER_BASE}/character/${id}?includeCustomItems=true`,
  SPELLS: (classId, level, campaignId) => 
    `${DDB_ENDPOINTS.CHARACTER_BASE}/game-data/spells?classId=${classId}&classLevel=${level}&sharingSetting=2${campaignId ? `&campaignId=${campaignId}` : ''}`,
  MONSTERS: (skip = 0, take = 20, search = "") => 
    `${DDB_ENDPOINTS.MONSTER_BASE}?search=${search}&skip=${skip}&take=${take}`,
};
```

### 3. Implement Data Parsers
Create parser classes similar to ddb-importer's approach:
- `DDBCharacterParser` - transform character data
- `DDBMonsterParser` - transform monster data  
- `DDBSpellParser` - transform spell data
- `DDBItemParser` - transform item data

This analysis shows that our authentication is working correctly, but we need to implement the proper D&D Beyond API integration patterns used by successful tools in the ecosystem.