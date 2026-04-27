import type { Locale } from "@/i18n/config";

export type StoresFormMessages = {
  addTitle: string;
  addSubtitle: string;
  editTitle: string;
  editSubtitle: string;
  back: string;
  storeName: string;
  storeNamePlaceholder: string;
  storeUrl: string;
  storeUrlPlaceholder: string;
  storePort: string;
  storePortPlaceholder: string;
  apiKey: string;
  apiKeyPlaceholder: string;
  apiSecret: string;
  apiSecretPlaceholder: string;
  submitCreate: string;
  submitEdit: string;
  errorGeneric: string;
  errorFieldRequired: string;
  errorServerMisconfigured: string;
  errorInvalidServerResponse: string;
  errorMissingStoreId: string;
  errorMissingStoreContext: string;
  errorStoreCreatedKeysFailed: string;
  errorFromServer: string;
  tooltipName: string;
  tooltipUrl: string;
  tooltipPort: string;
  tooltipApiKey: string;
  tooltipApiSecret: string;
  removeStore: string;
  removeConfirmTitle: string;
  removeConfirmMessage: string;
  removeConfirmYes: string;
  removeConfirmNo: string;
  removeFailedAlert: string;
};

const he: StoresFormMessages = {
  addTitle: "הוספת חנות חדשה",
  addSubtitle: "מלא את הפרטים כדי להוסיף חנות",
  editTitle: "עריכת חנות",
  editSubtitle: "עדכן את פרטי החיבור לחנות",
  back: "חזרה לרשימה",
  storeName: "שם החנות",
  storeNamePlaceholder: "הקלד את שם החנות…",
  storeUrl: "כתובת החנות (URL)",
  storeUrlPlaceholder: "https://…",
  storePort: "פורט (אופציונלי)",
  storePortPlaceholder: "למשל 8080 — השאר ריק לברירת מחדל",
  apiKey: "מפתח צרכן",
  apiKeyPlaceholder: "WooCommerce REST API Consumer Key",
  apiSecret: "סיסמה סודית של צרכן",
  apiSecretPlaceholder: "WooCommerce REST API Consumer Secret",
  submitCreate: "חבר את החנות",
  submitEdit: "שמור שינויים",
  errorGeneric: "שמירה נכשלה. בדוק את השדות ונסה שוב.",
  errorFieldRequired: "שדה חובה",
  errorServerMisconfigured: "בעיית תצורה או חיבור לשרת.",
  errorInvalidServerResponse: "תשובה לא תקינה מהשרת.",
  errorMissingStoreId: "מזהה חנות חסר.",
  errorMissingStoreContext: "שגיאה: חנות לא נמצאה.",
  errorStoreCreatedKeysFailed: "החנות נוצרה, אך שמירת מפתחות ה-API נכשלה:",
  errorFromServer: "שגיאה מהשרת:",
  tooltipName: "שם פנימי לזיהוי החנות במערכת — ניתן לבחור כל שם.",
  tooltipUrl:
    "כתובת ה-URL הראשית של חנות ה-WooCommerce שלך, למשל: https://mystore.com",
  tooltipPort:
    "מספר הפורט של שרת החנות. ברוב המקרים השאר ריק. נדרש רק אם החנות מוגדרת עם פורט מיוחד (למשל 8080).",
  tooltipApiKey:
    'מפתח REST API של WooCommerce. יצירה: WooCommerce ← הגדרות ← מתקדם ← REST API ← הוסף מפתח. בחר הרשאות "קריאה/כתיבה".',
  tooltipApiSecret:
    "הסיסמה הסודית של ה-API — נוצרת יחד עם מפתח הצרכן. מוצגת פעם אחת בלבד — שמור אותה במקום בטוח.",
  removeStore: "הסרת חנות",
  removeConfirmTitle: "הסרת חנות",
  removeConfirmMessage:
    "פעולה זו תסיר את החנות מהמערכת. לא יימחק תוכן כלשהו מהחנות עצמה. האם להמשיך?",
  removeConfirmYes: "הסר",
  removeConfirmNo: "ביטול",
  removeFailedAlert: "ההסרה נכשלה:",
};

const en: StoresFormMessages = {
  addTitle: "Add New Store",
  addSubtitle: "Fill here to add a new store",
  editTitle: "Edit store",
  editSubtitle: "Update connection details",
  back: "Back to list",
  storeName: "Store name",
  storeNamePlaceholder: "Type the store name…",
  storeUrl: "Store URL",
  storeUrlPlaceholder: "https://…",
  storePort: "Port (optional)",
  storePortPlaceholder: "e.g. 8080 — leave blank for default",
  apiKey: "API Key",
  apiKeyPlaceholder: "WooCommerce REST consumer key",
  apiSecret: "API Secret",
  apiSecretPlaceholder: "WooCommerce REST consumer secret",
  submitCreate: "Connect the store",
  submitEdit: "Save changes",
  errorGeneric: "Save failed. Check the fields and try again.",
  errorFieldRequired: "This field is required",
  errorServerMisconfigured: "Server connection or configuration error.",
  errorInvalidServerResponse: "Invalid response from server.",
  errorMissingStoreId: "Missing store id.",
  errorMissingStoreContext: "Error: store not found.",
  errorStoreCreatedKeysFailed:
    "The store was created, but saving API keys failed:",
  errorFromServer: "Server error:",
  tooltipName:
    "Internal name to identify the store in the system — you can choose any name.",
  tooltipUrl:
    "The base URL of your WooCommerce store, e.g. https://mystore.com",
  tooltipPort:
    "Server port number. Leave blank in most cases. Only required if your store runs on a custom port (e.g. 8080).",
  tooltipApiKey:
    'WooCommerce REST API Consumer Key. Create it via: WooCommerce → Settings → Advanced → REST API → Add key. Select "Read/Write" permissions.',
  tooltipApiSecret:
    "The API Consumer Secret — generated together with the Consumer Key. Shown only once — keep it in a safe place.",
  removeStore: "Remove store",
  removeConfirmTitle: "Remove store",
  removeConfirmMessage:
    "This will remove the store from the system. No content will be deleted from the store itself. Continue?",
  removeConfirmYes: "Remove",
  removeConfirmNo: "Cancel",
  removeFailedAlert: "Removal failed:",
};

export function getStoresFormMessages(locale: Locale): StoresFormMessages {
  return locale === "en" ? en : he;
}
