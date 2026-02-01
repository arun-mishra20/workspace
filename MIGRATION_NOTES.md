# Migration from DDD to Anemic Design

## Summary

This document describes the migration of the NestJS backend from Domain-Driven Design (DDD) to Anemic Design Pattern.

## What Changed

### 1. **Removed Domain Layer**

**Before (DDD):**

```
modules/auth/
├── domain/                  # Rich domain entities with business logic
│   ├── aggregates/          # AuthIdentity aggregate root
│   ├── entities/            # AuthSession entity
│   └── value-objects/       # AuthProvider value object
├── application/             # Use cases layer
├── infrastructure/          # Repository implementations
└── presentation/            # Controllers
```

**After (Anemic Design):**

```
modules/auth/
├── application/
│   ├── constants/           # AuthProvider enum (moved here)
│   ├── dtos/                # AuthIdentityDto, AuthSessionDto (simple data holders)
│   ├── ports/               # Repository interfaces
│   └── services/            # All business logic moved here
├── infrastructure/          # Repository implementations
└── presentation/            # Controllers
```

### 2. **Key Changes**

#### DTOs Replace Domain Entities

- `AuthIdentity` aggregate → `AuthIdentityDto` (simple data container)
- `AuthSession` entity → `AuthSessionDto` (simple data container)
- DTOs contain only data and read-only helpers (getters for computed properties)

**Example - AuthSessionDto:**

```typescript
export class AuthSessionDto {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  // ... other fields

  // Only computed property helpers
  get isValid(): boolean {
    return this.expiresAt > new Date();
  }
}
```

#### Business Logic Moved to Services

All domain logic is now in `AuthService`:

- Password verification
- Token generation
- Session management
- Password updates

**Example:**

```typescript
async changePassword(userId: string, currentPassword: string, newPassword: string) {
  // All business logic in service
  const identity = await this.authIdentityRepo.findByUserIdAndProvider(userId, 'email')

  // Verify password
  const isValid = await this.passwordHasher.verify(currentPassword, identity.password)

  // Update password
  identity.password = newPasswordHash
  identity.updatedAt = new Date()
  await this.authIdentityRepo.save(identity)
}
```

#### Repositories Work with DTOs

- Old: `Repository<AuthIdentity>` (returns rich entities)
- New: `Repository<AuthIdentityDto>` (returns simple DTOs)

```typescript
// Before
const identity: AuthIdentity = await repo.findById(id);
identity.changePassword(newHash); // Domain method

// After
const identity: AuthIdentityDto = await repo.findById(id);
identity.password = newHash; // Simple property update
```

### 3. **Moved Constants**

`AuthProvider` value object moved from `domain/value-objects/` to `application/constants/`:

- Location: `apps/api/src/modules/auth/application/constants/auth-provider.ts`
- Reason: Not a true domain concept, just an enum for the auth system

## Benefits of Anemic Design

1. **Simpler mental model** - Data and logic are clearly separated
2. **Easier testing** - Services are simple to unit test
3. **Better for CRUD** - Straightforward for standard create-read-update-delete operations
4. **Flexible persistence** - DTOs make it easy to map between different database schemas
5. **Matches the domain** - Auth is relatively simple, DDD was over-engineering

## Module Structure Now

```
auth/
├── application/
│   ├── constants/
│   │   └── auth-provider.ts      # Auth provider enum
│   ├── dtos/
│   │   ├── auth-identity.dto.ts  # Simple data holder
│   │   └── auth-session.dto.ts   # Simple data holder
│   ├── ports/
│   │   ├── auth-identity.repository.port.ts
│   │   ├── auth-session.repository.port.ts
│   │   ├── password-hasher.port.ts
│   │   ├── user-role.repository.port.ts
│   │   └── verification-token.repository.port.ts
│   └── services/
│       └── auth.service.ts       # All business logic here
├── infrastructure/
│   ├── repositories/
│   │   ├── auth-identity.repository.ts
│   │   ├── auth-session.repository.ts
│   │   ├── user-role.repository.ts
│   │   └── verification-token.repository.ts
│   ├── services/
│   │   └── bcrypt-password-hasher.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── presentation/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── auth-v2.controller.ts
│   ├── dtos/
│   │   ├── login.dto.ts
│   │   ├── register.dto.ts
│   │   └── ...
│   └── guards/
│       └── ...
└── auth.module.ts
```

## Todo Module

The `todo` module was already using anemic design (no domain layer), so it serves as the reference pattern.

## Shared-Kernel Refactoring

The `shared-kernel` was also refactored to remove DDD remnants:

**Before:**

```
shared-kernel/
├── application/
│   └── ports/
├── domain/                     # REMOVED
│   ├── base-aggregate-root.ts  # REMOVED
│   ├── base-domain-event.ts    # REMOVED
│   ├── events/                 # REMOVED
│   └── value-objects/
│       ├── role.vo.ts          # MOVED
│       └── user-preferences.vo.ts # MOVED
└── infrastructure/
    └── events/
        └── domain-event-publisher.ts  # REPLACED
```

**After:**

```
shared-kernel/
├── application/
│   ├── constants/
│   │   └── role.ts             # Simple type + constants
│   ├── ports/
│   │   ├── profile.port.ts
│   │   └── user.repository.port.ts
│   └── types/
│       └── user-preferences.ts  # Simple interface
└── infrastructure/
    ├── db/                      # Database module (unchanged)
    ├── decorators/              # API decorators (unchanged)
    ├── dtos/                    # Response DTOs (unchanged)
    ├── events/
    │   ├── domain-events.module.ts  # Simplified
    │   └── event-publisher.ts       # Simple event publisher
    ├── guards/                  # Auth guards (unchanged)
    ├── repositories/            # Shared repositories (unchanged)
    ├── types/                   # Shared types (unchanged)
    └── utils/                   # Utilities (unchanged)
```

**Key Changes:**

- ❌ Removed `domain/` folder entirely
- ❌ Removed `BaseAggregateRoot` and `BaseDomainEvent` classes
- 🔄 Moved `role.vo.ts` → `application/constants/role.ts`
- 🔄 Moved `user-preferences.vo.ts` → `application/types/user-preferences.ts`
- 🔄 Replaced `DomainEventPublisher` with simple `EventPublisher`

## Testing

All existing tests should continue to pass. The service logic remains the same, just organized differently.

## Migration Notes

- ✅ No breaking API changes
- ✅ Same functionality
- ✅ Same test coverage
- ✅ Simpler code structure
- ✅ Easier to extend

## When to Use Each Pattern

**Use Anemic Design when:**

- CRUD operations with simple business logic
- Rapid prototyping
- Team familiar with procedural style
- Simple domain concepts

**Use DDD when:**

- Complex business logic with domain rules
- Need to enforce invariants and constraints
- Large team working on multiple modules
- Domain-heavy problem (e.g., payment processing, medical system)
