# System Architecture

The `system` folder contains our application's core business logic and technical foundations organized according to the "Four I's" architecture:

- **Imperatives**: Business rules and domain models
- **Interfaces**: Exposed boundaries for interaction
- **Integration**: Coordination between components
- **Infrastructure**: Technical implementations

This architecture separates concerns without imposing arbitrary hierarchies, allowing each component to evolve independently while maintaining clear responsibilities.

## Folder Structure

```
system/
├── imperatives/    # Core business rules and domain models
├── interfaces/     # Exposed interaction points
├── integration/    # Component coordination
├── infrastructure/ # Technical foundations
└── index.ts        # Main exports
```

## Usage

Import components from their respective folders according to their responsibility. For example:

```typescript
// Import domain models
import { Workspace } from 'system/imperatives/workspace';

// Import from exposed API layer 
import { createApiHandler } from 'system/interfaces/api';

// Import integration functions
import { getWorkspaceMembers } from 'system/integration/workspaces';

// Import technical utilities
import { uploadFile } from 'system/infrastructure/storage';
```

The architecture explicitly discourages circular dependencies between the Four I's - if you find yourself needing them, reconsider your component boundaries.
