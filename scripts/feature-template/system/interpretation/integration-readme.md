# Interpretation

The `interpretation` folder contains code that coordinates between other components and orchestrates complex operations.

## Purpose

This folder houses the "connective tissue" of your application, bringing together domain models, interfaces, and infrastructure to accomplish specific use cases. It's where the various parts of your system come together to perform meaningful operations.

## Contents

- **Use Case Implementations**: Methods that implement specific business use cases
- **Service Orchestration**: Coordination between multiple services or domain objects
- **Domain-Infrastructure Adapters**: Code that connects domain models to infrastructure
- **Workflow Coordination**: Management of multi-step processes
- **Cross-Cutting Concerns**: Functionality that spans multiple boundaries

## Principles

- Focus on composition and coordination, not low-level details
- Translate between domain language and technical implementations
- Keep components loosely coupled
- Use dependency injection where appropriate
- Map between technical data structures and domain models

## Example

```typescript
// interpretation/workspaces.ts
import { Workspace } from '../imperatives/workspace';
import { getDirectusClient } from '../infrastructure/directus/client';
import { sendNotification } from '../infrastructure/notifications';
import { WorkspaceCreateInput } from '../interfaces/api/types';

export async function createWorkspace(input: WorkspaceCreateInput): Promise<Workspace> {
  // Get infrastructure dependencies
  const directus = await getDirectusClient();
  
  // Create in storage
  const result = await directus.items('workspaces').createOne({
    name: input.name,
    owner: input.ownerId,
    created_at: new Date().toISOString()
  });
  
  // Map to domain model
  const workspace = new Workspace(
    result.id,
    result.name,
    result.owner
  );
  
  // Handle side effects
  await sendNotification({
    userId: input.ownerId,
    type: 'workspace_created',
    data: { workspaceId: workspace.id, workspaceName: workspace.name }
  });
  
  return workspace;
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const directus = await getDirectusClient();
  
  try {
    const result = await directus.items('workspaces').readOne(id, {
      fields: ['id', 'name', 'owner', 'members.*']
    });
    
    if (!result) return null;
    
    // Transform from infrastructure format to domain model
    return new Workspace(
      result.id,
      result.name,
      result.owner,
      result.members.map(m => m.user)
    );
  } catch (error) {
    if (error.message.includes('Not Found')) {
      return null;
    }
    throw error;
  }
}
```

The interpretation space is where everything comes together, coordinating between domain models, interfaces, and infrastructure to implement complete business functionality.
