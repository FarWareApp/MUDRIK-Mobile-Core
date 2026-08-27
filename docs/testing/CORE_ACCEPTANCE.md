# MUDRIK Mobile Core Acceptance

Core is eligible for freeze only if:

- project starts cleanly
- application opens on a real Android device
- no known blocking defect
- no known critical defect
- navigation is stable
- persistence survives restart
- drafts survive expected lifecycle transitions
- denied permissions do not crash the app
- RTL and LTR layouts are valid
- major screens have loading/empty/error behavior
- diagnostics expose actionable internal state
- AI/server are not required for application startup or navigation
- typecheck passes
- project diagnostics pass
- release build completes
