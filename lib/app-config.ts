// *** Configurable variables for the app ***
// This file contains all the user-editable configuration values that can be updated when customizing the chatbot app.
// The app studio main backend will populate these values when the app is created.
// These values are merely placeholders and default values.

// App Configuration - UPDATE THESE VALUES BASED ON USER REQUIREMENTS
export const APP_CONFIG = {
  // UPDATE: Set to the welcome message for the chatbot
  WELCOME_MESSAGE: "Welcome to Dabia! Discover the best products with AI-powered recommendations.",

  // UPDATE: Set to the name of the chatbot app
  NAME: "Dabia",

  // UPDATE: Set to the description of the chatbot app
  DESCRIPTION: "A smart portal blending social media and intelligent shopping with an immersive 3D environment",
} as const;

// عنوان التطبيق العام — مصدر واحد للحقيقة. لتغيير الدومين مستقبلاً غيّر متغيّر
// البيئة NEXT_PUBLIC_APP_URL فقط (في Vercel) — لا حاجة لأي تعديل في الكود.
// الافتراضي هو دومين Pi Browser المجاني. على العميل نفضّل origin الحالي تلقائياً.
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://dabiaacdfb2093.pinet.com";

// أفضل عنوان متاح: origin الحالي في المتصفح (يتكيّف مع أي دومين تلقائياً)،
// وإلا APP_URL على الخادم. يجعل تغيير الدومين بلا مخاطر.
export function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return APP_URL;
}

// Colors Configuration - UPDATE THESE VALUES BASED ON USER DESIGN PREFERENCES
export const COLORS = {
  // UPDATE: Set to the background color (hex format)
  BACKGROUND: "#FAF8F5",

  // UPDATE: Set to the primary color for buttons, links, etc. (hex format)
  PRIMARY: "#1A1A1A",

  // UPDATE: Set to the accent color (hex format)
  ACCENT: "#4CAF50",
} as const;
