# Features Directory

This folder contains feature-based modules for the **OpsPilot AI** application. 

## Structure of a Feature
Each feature is self-contained under its own directory (e.g., `features/user-management/` or `features/ai-workforce/`):

```
features/[feature-name]/
├── components/       # Feature-specific React components
├── hooks/            # Feature-specific hooks
├── services/         # Feature-specific API clients/queries
├── types/            # Feature-specific Type definitions
├── utils/            # Feature-specific utilities
└── index.ts          # Public entry point for the feature (exports components, functions, hooks)
```

## Guidelines
- Code in a feature should only import from its own folders or from global modules (e.g. `@/components`, `@/lib`, `@/hooks`).
- Avoid cross-feature imports where possible. If feature A depends on feature B, import only from the public entry point of feature B (`features/B/index.ts`).
