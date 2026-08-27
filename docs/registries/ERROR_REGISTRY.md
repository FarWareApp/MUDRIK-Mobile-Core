# Error Registry

Primary error families:

- AppError
- StorageError
- DatabaseError
- PermissionError
- NetworkError
- FileError
- AudioError
- NavigationError
- ValidationError
- SecurityError
- UnknownError

Each actionable error must define:
- stable code
- severity
- user-safe message
- technical details
- recoverability
- retry strategy
- diagnostics metadata
