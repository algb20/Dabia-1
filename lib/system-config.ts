// LOCKED FILE (v0 shouldn't edit this file)

// *** System Configuration - NON-EDITABLE VALUES ***
// This file contains configuration values that should not be modified during normal app customization.
// These values are set during app creation.
// PLACEHOLDER VALUES: This entire file will be replaced when the app is initialized.

// Pi Network Configuration
export const PI_NETWORK_CONFIG = {
  SDK_URL: "<PI_SDK_URL_PLACEHOLDER>",
  SANDBOX: false,
} as const;

// Backend Configuration
export const BACKEND_CONFIG = {
  BASE_URL: "<BACKEND_BASE_URL_PLACEHOLDER>",
} as const;

// Backend URLs - AUTO-GENERATED
export const BACKEND_URLS = {
  LOGIN: `${BACKEND_CONFIG.BASE_URL}/v1/login`,
  LOGIN_PREVIEW: `${BACKEND_CONFIG.BASE_URL}/v1/login/preview`,
  CHAT: `${BACKEND_CONFIG.BASE_URL}/v1/chat/default`,
} as const;
