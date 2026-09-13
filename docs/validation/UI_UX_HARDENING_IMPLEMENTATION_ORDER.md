# UI/UX Hardening Implementation Order

1. Inspect current composer implementation and theme tokens.
2. Add reusable action button primitive.
3. Extract text input presentation.
4. Extract attachment affordance and send/stop mapping.
5. Recompose MessageComposer without changing transport/picker behavior.
6. Add regression coverage.
7. Run CI/CodeQL.
8. Proceed to message bubbles and timestamps only after the composer batch is green.
