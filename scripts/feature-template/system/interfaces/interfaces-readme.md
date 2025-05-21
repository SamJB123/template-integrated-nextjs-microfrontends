# Interfaces

The `interfaces` folder contains all exposed boundaries where your system interacts with the outside world.

## Purpose

This folder defines the contracts and protocols through which external actors (users, other systems) can interact with your application. These are the intentionally exposed touchpoints, not the implementation details.

## Contents

- **API Endpoints**: REST, GraphQL, or RPC definitions 
- **Controllers**: Request handlers and response formatters
- **DTOs**: Data Transfer Objects that define the shape of data crossing boundaries
- **Webhooks**: Inbound webhook receivers
- **WebSocket Handlers**: Real-time communication endpoints
- **Auth Middleware**: Authentication/authorization boundary checks

## Principles

- Define clear contracts for each boundary
- Validate all incoming data before processing
- Transform between external representations and domain models
- Keep business logic thin here (delegate to Integration and Imperatives)
- Focus on communication protocols, not implementation details

## Example

```typescript
// interfaces/api/workspaces.ts
import { Router } from 'express';
import { createWorkspace, getWorkspaceById } from '../../integration/workspaces';
import { validateWorkspaceInput } from './validation';

const router = Router();

router.post('/workspaces', async (req, res) => {
  const validationResult = validateWorkspaceInput(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ errors: validationResult.errors });
  }
  
  try {
    const workspace = await createWorkspace({
      name: req.body.name,
      ownerId: req.user.id
    });
    
    return res.status(201).json(workspace);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/workspaces/:id', async (req, res) => {
  try {
    const workspace = await getWorkspaceById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    
    if (!workspace.canBeAccessedBy(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    return res.json(workspace);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
```

The interfaces space should be focused on communication protocols and data validation, delegating actual logic and business operations to the interpretation layer.
