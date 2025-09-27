# FoundryMagic Constitution
<!-- Foundry VTT module that combines all DDB- repositories capabilities into a single standalone module -->

## Core Principles

### Unified Integration
<!-- I. Unified Integration -->
Consolidate D&D Beyond import capabilities (adventures, characters, items, spells) into a single cohesive module rather than requiring multiple separate modules.
<!-- Single module eliminates dependency conflicts; Unified API surface for all DDB functionality; Consistent user experience across all import types -->

### Foundry Native Compatibility
<!-- II. Foundry Native Compatibility -->
Ensure full compatibility with both dnd5e system and foundryvtt-core, following Foundry's architecture patterns and API conventions.
<!-- Follow Foundry VTT module development best practices; Use official APIs and hooks; Maintain compatibility across Foundry versions -->

### Robust Data Handling
<!-- III. Robust Data Handling -->
Implement comprehensive error handling and data validation for all D&D Beyond imports, with graceful fallbacks and user feedback.
<!-- Validate all imported data structures; Provide clear error messages to users; Implement retry mechanisms for network failures -->

### Performance Optimization
<!-- IV. Performance Optimization -->
Minimize resource usage and API calls through intelligent caching, batching, and efficient data transformation processes.
<!-- Cache frequently accessed data; Batch API requests where possible; Optimize memory usage during large imports -->

### User Experience Focus
<!-- V. User Experience Focus -->
Provide intuitive interfaces and workflows that make D&D Beyond content seamlessly available within Foundry VTT.
<!-- Clear, consistent UI patterns; Minimal configuration required; Progress indicators for long operations -->

## Technical Standards
<!-- Architecture, Development Standards, Quality Requirements -->

All code must follow JavaScript/TypeScript best practices for Foundry VTT modules. Use modular architecture with clear separation of concerns between DDB integration services, data transformation layers, and Foundry-specific implementations. Implement comprehensive logging for debugging and monitoring. Follow semantic versioning for releases.
<!-- Modular service architecture required; TypeScript strongly preferred; ESLint and Prettier for code consistency; Comprehensive JSDoc documentation for all public APIs -->

## Development Workflow
<!-- Testing Strategy, Code Review Process, Release Management -->

Test-driven development mandatory for all DDB integration functions. Unit tests for data transformers, integration tests for Foundry API interactions, and end-to-end tests for complete import workflows. All changes require code review focusing on Foundry compatibility and data integrity.
<!-- TDD for all new features; 80% code coverage minimum; Manual testing in live Foundry environment required; Staged rollouts for major changes -->

## Governance
<!-- Constitution Management and Compliance -->

This constitution governs all development decisions and technical choices for FoundryMagic. Any conflicts between this document and other guidance must be resolved in favor of these principles. Changes to this constitution require documentation of impact and migration planning.
<!-- All PRs must demonstrate compliance with core principles; Architecture decisions must reference relevant principles; Use development guidance files for implementation details -->

**Version**: 1.0.0 | **Ratified**: 2025-01-11 | **Last Amended**: 2025-01-11
<!-- Initial version establishing governance for unified DDB module development -->