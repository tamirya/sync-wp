import type { Locale } from "@/i18n/config";

export type SuppliersFormMessages = {
  addTitle: string;
  addSubtitle: string;
  editTitle: string;
  editSubtitle: string;
  back: string;
  name: string;
  namePlaceholder: string;
  url: string;
  urlPlaceholder: string;
  submitCreate: string;
  submitEdit: string;
  errorFieldRequired: string;
  errorServerMisconfigured: string;
  errorFromServer: string;
};

const he: SuppliersFormMessages = {
  addTitle: "הוספת ספק",
  addSubtitle: "הזן שם וכתובת בסיס של קטלוג הספק (Store API).",
  editTitle: "עריכת ספק",
  editSubtitle: "עדכן את פרטי הספק.",
  back: "חזרה לרשימה",
  name: "שם הספק",
  namePlaceholder: "למשל: ספק ראשי",
  url: "כתובת בסיס (URL)",
  urlPlaceholder: "https://…",
  submitCreate: "שמור ספק",
  submitEdit: "שמור שינויים",
  errorFieldRequired: "שדה חובה",
  errorServerMisconfigured: "בעיית תצורה או חיבור לשרת.",
  errorFromServer: "שגיאה מהשרת:",
};

const en: SuppliersFormMessages = {
  addTitle: "Add supplier",
  addSubtitle: "Enter a name and the supplier catalog base URL (Store API).",
  editTitle: "Edit supplier",
  editSubtitle: "Update supplier details.",
  back: "Back to list",
  name: "Supplier name",
  namePlaceholder: "e.g. Main supplier",
  url: "Base URL",
  urlPlaceholder: "https://…",
  submitCreate: "Save supplier",
  submitEdit: "Save changes",
  errorFieldRequired: "This field is required",
  errorServerMisconfigured: "Server connection or configuration error.",
  errorFromServer: "Server error:",
};

export function getSuppliersFormMessages(locale: Locale): SuppliersFormMessages {
  return locale === "en" ? en : he;
}
