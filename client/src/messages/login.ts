import type { Locale } from "@/i18n/config";

export type LoginMessages = {
  brand: string;
  tagline: string;
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  forgotPassword: string;
  /** Toggle control: reveal password (aria-label). */
  showPassword: string;
  /** Toggle control: mask password (aria-label). */
  hidePassword: string;
  submit: string;
  supportPrefix: string;
  supportLink: string;
  errorGeneric: string;
  /** API: `Password is not matching` */
  errorWrongPassword: string;
  /** API: `This email … was not found` — use `{{email}}` placeholder */
  errorEmailNotFoundTemplate: string;
  termsPrefix: string;
  termsLink: string;
};

const he: LoginMessages = {
  brand: "Appiz",
  tagline: "מערכת סנכרון וניהול מוצרים לחנויות דיגיטליות",
  title: "כניסת בעל חנות",
  subtitle: "ניהול וסנכרון קטלוג מוצרים",
  emailLabel: "אימייל",
  emailPlaceholder: "הקלד את כתובת האימייל",
  passwordLabel: "סיסמה",
  passwordPlaceholder: "••••••••",
  forgotPassword: "שכחת את הסיסמה?",
  showPassword: "הצג סיסמה",
  hidePassword: "הסתר סיסמה",
  submit: "כניסה",
  supportPrefix: "עדיין אין לך חשבון?",
  supportLink: "צור קשר עם התמיכה",
  errorGeneric: "ההתחברות נכשלה. נסה שוב.",
  errorWrongPassword: "הסיסמה שגויה.",
  errorEmailNotFoundTemplate: "לא נמצא משתמש עבור האימייל {{email}}.",
  termsPrefix: "בלחיצה על כפתור כניסה אני מאשר את",
  termsLink: "הסכם השימוש המצורף",
};

const en: LoginMessages = {
  brand: "Appiz",
  tagline: "Product sync and management for digital stores",
  title: "Store owner sign in",
  subtitle: "Manage and sync your product catalog",
  emailLabel: "Email",
  emailPlaceholder: "Enter your email",
  passwordLabel: "Password",
  passwordPlaceholder: "••••••••",
  forgotPassword: "Forgot password?",
  showPassword: "Show password",
  hidePassword: "Hide password",
  submit: "Sign in",
  supportPrefix: "No account yet?",
  supportLink: "Contact support",
  errorGeneric: "Sign in failed. Please try again.",
  errorWrongPassword: "The password is incorrect.",
  errorEmailNotFoundTemplate: "No account was found for {{email}}.",
  termsPrefix: "I agree to the",
  termsLink: "attached terms of use",
};

export function getLoginMessages(locale: Locale): LoginMessages {
  return locale === "en" ? en : he;
}

/** Maps known English API messages from the backend to the active UI locale. */
export function translateLoginApiError(
  apiMessage: string | undefined,
  locale: Locale,
  fallback: string,
): string {
  if (!apiMessage) {
    return fallback;
  }
  const m = getLoginMessages(locale);

  if (apiMessage === "Password is not matching") {
    return m.errorWrongPassword;
  }

  const emailNotFound = /^This email (.+) was not found$/;
  const matchFound = apiMessage.match(emailNotFound);
  if (matchFound) {
    return m.errorEmailNotFoundTemplate.replace("{{email}}", matchFound[1]);
  }

  return fallback;
}
