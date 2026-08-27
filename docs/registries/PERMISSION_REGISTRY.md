# Permission Registry

Potential permissions:

- microphone
- camera
- photos/media
- notifications
- biometrics
- location (only if a future feature genuinely needs it)

Permission states:

- unknown
- granted
- denied
- blocked
- restricted
- unavailable

Rules:
- request only when needed
- explain why before sensitive requests where appropriate
- handle permanent denial
- provide route to system settings
- never crash because permission was denied
