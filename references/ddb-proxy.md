# DDB Proxy

**Repository:** https://github.com/MrPrimate/ddb-proxy

## Overview

The DDB Proxy is a service component that provides enhanced API access to D&D Beyond's content. It serves as an intermediary between the DDB Importer module and D&D Beyond's servers, offering improved reliability and access to additional content types.

## Key Features

### API Enhancement
- Improved API response times and reliability
- Access to additional D&D Beyond content endpoints
- Enhanced error handling and retry mechanisms
- Load balancing and request optimization

### Content Access
- Monster stat blocks and creature data
- Spell descriptions and mechanics
- Item and equipment information
- Character build options and features

### Authentication Management
- Secure token handling
- Session management
- Rate limiting and throttling
- User authentication validation

## Technical Components

### Proxy Server
- RESTful API endpoints
- Request forwarding and response processing
- Caching mechanisms for performance
- Error handling and logging

### Integration Layer
- DDB Importer module integration
- Foundry VTT compatibility
- Configuration management
- Status monitoring and health checks

## Usage Context
The DDB Proxy is typically used by:
- DDB Importer for enhanced content access
- Adventure Muncher for adventure processing
- Community tools requiring D&D Beyond data

## Configuration
- Endpoint URLs for proxy services
- Authentication credentials
- Request timeout and retry settings
- Caching policies and expiration

## Deployment
- Can be self-hosted for private use
- Community proxy services available
- Docker container support
- Cloud platform compatibility

## Integration with Other Tools
- **ddb-importer**: Primary consumer of proxy services
- **ddb-adventure-muncher**: Uses for adventure content
- **Third-party tools**: API access for D&D Beyond data

## Security Considerations
- Secure credential storage
- HTTPS/TLS encryption
- Rate limiting to prevent abuse
- User data privacy protection

## License
Project follows open-source licensing for community use