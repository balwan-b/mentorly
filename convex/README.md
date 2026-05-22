# Mentorly Convex Functions

This directory contains the Mentorly backend powered by Convex.

Phase 1 modules:

- `profiles.ts`: mentor and learner profile queries and mutations
- `sync.ts`: Clerk user sync mutations
- `http.ts`: Clerk webhook endpoint
- `lib/auth.ts`: shared identity helpers
- `lib/validators.ts`: shared Convex validators

The old starter demo based on `numbers` and `myFunctions` is no longer part of the app.

When your local Node toolchain is available, regenerate Convex types after schema or function changes:

```bash
npx convex codegen
```
