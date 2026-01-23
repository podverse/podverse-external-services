# Factory Function: createFirebaseContext

## Overview

The `createFirebaseContext` function is the factory function for creating a Firebase context. This function initializes Firebase Admin SDK for sending push notifications and provides helper functions for generating web URLs.

The Firebase Admin SDK is only initialized if `notifications_enabled` is `true` and a valid admin JSON key path is provided. If initialization fails, the context will still be returned but with `firebaseAdmin` set to `null` and `isFirebaseEnabled` set to `false`.

## Function Signature

```typescript
export function createFirebaseContext(config: ExternalServicesConfig): FirebaseContext
```

## Parameters

### `config: ExternalServicesConfig` (Required)

The external services configuration object with the following structure:

#### `firebase: FirebaseConfig` (Required)

Firebase configuration:

- **`notifications_enabled: boolean`** (Required) - Whether Firebase notifications are enabled
  - If `false`, Firebase Admin will not be initialized
  - If `true`, `admin_json_key_path` must be provided

- **`admin_json_key_path: string`** (Required)
  - Path to the Firebase Admin JSON key file
  - Required when `notifications_enabled` is `true`
  - The file should contain Firebase service account credentials
  - Example: `"/path/to/firebase-admin-key.json"`

#### `web: WebConfig` (Required)

Web configuration for helper functions:

- **`protocol: string`** (Required) - Web protocol (`http` or `https`)
- **`host: string`** (Required) - Web hostname (e.g., `localhost:3000` or `podverse.fm`)
- **`icon_image_url: string`** (Required) - Path to web icon image (e.g., `icon.png` or `/icon.png`)

## Return Type

### `FirebaseContext`

Returns an object with the following properties:

- **`firebaseAdmin: typeof admin | null`** - Firebase Admin SDK instance, or `null` if not initialized
- **`isFirebaseEnabled: boolean`** - Whether Firebase is enabled and successfully initialized
- **`getWebBaseUrl: () => string`** - Helper function that returns the base web URL (e.g., `https://podverse.fm`)
- **`getWebBaseUrlWithPath: (path: string) => string`** - Helper function that returns the base web URL with a path appended
- **`getWebIconImageUrl: () => string`** - Helper function that returns the full URL to the web icon image

## Important Notes

### Firebase Initialization

- Firebase Admin SDK is only initialized if `notifications_enabled` is `true`
- If `admin_json_key_path` is missing or empty when `notifications_enabled` is `true`, initialization will fail and an error will be logged
- If initialization fails (e.g., invalid JSON key file), the context will still be returned but with `firebaseAdmin` set to `null`
- The Firebase Admin SDK uses a singleton pattern - if it's already initialized, it won't be re-initialized

### Error Handling

The factory function handles errors gracefully:
- If Firebase is disabled, a warning is logged
- If Firebase is enabled but the JSON key path is missing, an error is logged and `isFirebaseEnabled` is set to `false`
- If Firebase initialization fails (e.g., invalid credentials), an error is logged and `isFirebaseEnabled` is set to `false`
- The function never throws - it always returns a valid `FirebaseContext` object

### Helper Functions

The helper functions are bound to the config and can be used to generate URLs:
- `getWebBaseUrl()` - Returns `${protocol}://${host}`
- `getWebBaseUrlWithPath(path)` - Returns `${protocol}://${host}${path}`
- `getWebIconImageUrl()` - Returns `${protocol}://${host}/${icon_image_url}`

## Dependencies

This factory function has no dependencies on other factory functions. It can be called independently.

## Example Usage

```typescript
import { createFirebaseContext } from 'podverse-external-services';

// Build configuration from environment variables
const externalServicesConfig = {
  firebase: {
    notifications_enabled: process.env.GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED === 'true',
    admin_json_key_path: process.env.GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH || '',
  },
  web: {
    protocol: process.env.WEB_PROTOCOL || 'https',
    host: process.env.WEB_DOMAIN || 'podverse.fm',
    icon_image_url: process.env.WEB_ICON_IMAGE_PATH || 'icon.png',
  }
};

// Create Firebase context
const firebaseContext = createFirebaseContext(externalServicesConfig);

// Check if Firebase is enabled
if (firebaseContext.isFirebaseEnabled) {
  // Use Firebase Admin SDK
  await firebaseContext.firebaseAdmin!.messaging().send(message);
} else {
  console.log('Firebase is not enabled or initialization failed');
}

// Use helper functions
const baseUrl = firebaseContext.getWebBaseUrl(); // "https://podverse.fm"
const profileUrl = firebaseContext.getWebBaseUrlWithPath('/profile'); // "https://podverse.fm/profile"
const iconUrl = firebaseContext.getWebIconImageUrl(); // "https://podverse.fm/icon.png"
```

## Related Files

- **Factory implementation**: `src/factory.ts`
- **Configuration types**: `src/config/types.ts`
