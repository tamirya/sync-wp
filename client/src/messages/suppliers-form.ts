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
  deleteSupplier: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  deleteConfirmYes: string;
  deleteConfirmNo: string;
  deleteFailedAlert: string;
  termsConfirmTitle: string;
  termsConfirmPrefix: string;
  termsConfirmLink: string;
  termsConfirmSuffix: string;
  termsConfirmProceed: string;
  termsConfirmCancel: string;
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
  deleteSupplier: "מחיקת ספק",
  deleteConfirmTitle: "מחיקת ספק",
  deleteConfirmMessage:
    "האם אתה בטוח שברצונך למחוק את הספק? פעולה זו אינה ניתנת לביטול.",
  deleteConfirmYes: "מחק",
  deleteConfirmNo: "ביטול",
  deleteFailedAlert: "המחיקה נכשלה:",
  termsConfirmTitle: "אישור הוספת ספק",
  termsConfirmPrefix:
    "בלחיצה על המשך אני מאשר כי קיבלתי את רשות הספק להשתמש בתוכן האתר שלו בכפוף ל",
  termsConfirmLink: "תקנון",
  termsConfirmSuffix: ".",
  termsConfirmProceed: "המשך",
  termsConfirmCancel: "ביטול",
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
  deleteSupplier: "Delete supplier",
  deleteConfirmTitle: "Delete supplier",
  deleteConfirmMessage:
    "Are you sure you want to delete this supplier? This action cannot be undone.",
  deleteConfirmYes: "Delete",
  deleteConfirmNo: "Cancel",
  deleteFailedAlert: "Delete failed:",
  termsConfirmTitle: "Confirm adding supplier",
  termsConfirmPrefix:
    "By clicking Continue I confirm that I have received the supplier's permission to use their website content subject to the",
  termsConfirmLink: "terms of use",
  termsConfirmSuffix: ".",
  termsConfirmProceed: "Continue",
  termsConfirmCancel: "Cancel",
};

export function getSuppliersFormMessages(
  locale: Locale,
): SuppliersFormMessages {
  return locale === "en" ? en : he;
}
