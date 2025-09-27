
# Implementation Plan: FoundryMagic Unified Module

**Branch**: `001-foundry-vtt-module` | **Date**: September 27, 2025 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-foundry-vtt-module/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
FoundryMagic is a unified Foundry VTT module that consolidates all D&D Beyond import capabilities (characters, adventures, monsters, spells, items) into a single standalone module. The module provides DM-only import functionality with player access to imported content, using cobalt token authentication and implementing reliable, user-friendly import workflows with comprehensive error handling and 500MB content caching.

## Technical Context
**Language/Version**: JavaScript/TypeScript (ES2022+) for Foundry VTT module development  
**Primary Dependencies**: Foundry VTT core APIs, dnd5e system APIs, D&D Beyond API integration  
**Storage**: Local browser storage for caching (500MB limit), Foundry compendium system for content persistence  
**Testing**: Jest for unit tests, Foundry Test Framework for integration tests, manual testing in live Foundry environment  
**Target Platform**: Foundry VTT v10+ with dnd5e system compatibility
**Project Type**: Single project (Foundry VTT module with unified architecture)  
**Performance Goals**: Reliability over speed, comprehensive error handling, progress indicators for imports  
**Constraints**: 500MB cache limit, DM-only import access, cobalt token authentication, cross-version compatibility  
**Scale/Scope**: Single unified module replacing multiple DDB modules, comprehensive D&D Beyond content import coverage

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Unified Integration**: Feature aligns with single-module approach, consolidating DDB capabilities rather than fragmenting them
- [x] PASS: Feature contributes to unified module architecture
- [ ] JUSTIFY: Feature requires separation (explain why)

**Foundry Native Compatibility**: Implementation follows Foundry VTT module patterns and APIs
- [x] PASS: Uses official Foundry APIs and follows module best practices
- [ ] JUSTIFY: Requires non-standard Foundry integration (explain why)

**Robust Data Handling**: Implementation includes comprehensive error handling and validation
- [x] PASS: Includes data validation, error handling, and user feedback mechanisms
- [ ] JUSTIFY: Simplified error handling acceptable (explain why)

**Performance Optimization**: Design considers caching, batching, and resource efficiency
- [x] PASS: Implements caching/batching strategies appropriate for scale
- [ ] JUSTIFY: Performance optimizations deferred (explain why)

**User Experience Focus**: Feature provides intuitive interfaces with minimal configuration
- [x] PASS: Follows established UX patterns with clear user workflows
- [ ] JUSTIFY: Complex configuration required (explain why)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->
```
# Foundry VTT Module Structure
src/
├── core/           # Core module initialization and configuration
├── auth/           # D&D Beyond authentication handling
├── importers/      # Content-specific import services
├── cache/          # Storage and caching management
├── ui/             # User interface components
└── utils/          # Shared utilities and helpers

tests/
├── unit/           # Unit tests for individual components
└── integration/    # Integration tests with Foundry APIs

docs/               # Documentation and guides
```

**Structure Decision**: Single project structure optimized for Foundry VTT module development with modular service architecture. This structure supports the constitutional requirement for unified integration while maintaining clear separation of concerns between authentication, import services, caching, and UI components.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate module API contracts** from functional requirements:
   - For each user action → describe Foundry module API surface (exported functions, socket channels, UI hooks)
   - Define payload schemas, events, and permission requirements
   - Output markdown contracts to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per documented API function or hook
   - Assert payload schemas and emitted events using Foundry test harnesses
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
