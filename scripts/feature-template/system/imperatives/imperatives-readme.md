# Imperatives

The `imperatives` folder contains your core business rules, domain models, and invariants - the "what must happen" in your system.

## Purpose

This folder houses code that represents your business domain in its purest form, without dependencies on specific technologies or external systems. The code here answers the question "what are the fundamental concepts and rules of our business?"

## Contents

- **Domain Entities**: Core business objects (e.g., User, Workspace, Document)
- **Value Objects**: Immutable objects with meaning beyond their attributes (e.g., Email, WorkspaceId)
- **Domain Events**: Significant occurrences in the domain (e.g., DocumentCreated, UserInvited)
- **Business Rules**: Invariants that must always be upheld
- **Domain Services**: Operations that don't naturally belong to a single entity

## Principles

- Code here should have minimal dependencies (ideally none) on external packages
- No infrastructure concerns (databases, APIs, etc.)
- Use domain-specific language and terms from your business
- Focus on business rules, not technical implementation
- Can define interfaces (TypeScript) that will be implemented elsewhere

## Example

```typescript
// imperatives/workspace.ts
export class Workspace {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly ownerId: string,
    private readonly _members: string[] = []
  ) {}

  get members(): readonly string[] {
    return this._members;
  }

  canBeAccessedBy(userId: string): boolean {
    return userId === this.ownerId || this._members.includes(userId);
  }

  addMember(userId: string): Workspace {
    if (this._members.includes(userId)) {
      return this;
    }
    
    return new Workspace(
      this.id,
      this.name,
      this.ownerId,
      [...this._members, userId]
    );
  }
}
```

Domain models should be rich with behaviour, not just data containers.
