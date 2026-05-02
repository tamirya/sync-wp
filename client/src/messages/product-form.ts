import type { Locale } from "@/i18n/config";

export type ProductFormMessages = {
  editTitle: string;
  editSubtitle: string;
  back: string;
  sectionGeneral: string;
  sectionPricing: string;
  sectionPublish: string;
  sectionDescription: string;
  sectionImage: string;
  fieldImageUrl: string;
  fieldImageUrlPlaceholder: string;
  fieldImageUrlHint: string;
  fieldName: string;
  fieldNamePlaceholder: string;
  fieldSku: string;
  fieldSkuPlaceholder: string;
  fieldRegularPrice: string;
  fieldRegularPricePlaceholder: string;
  fieldSalePrice: string;
  fieldSalePricePlaceholder: string;
  fieldDescription: string;
  fieldDescriptionPlaceholder: string;
  fieldShortDescription: string;
  fieldShortDescriptionPlaceholder: string;
  fieldStatus: string;
  fieldStatusPublish: string;
  fieldStatusDraft: string;
  fieldStatusPrivate: string;
  fieldManageStock: string;
  fieldManageStockHint: string;
  fieldStockStatus: string;
  fieldStockStatusInStock: string;
  fieldStockStatusOutOfStock: string;
  fieldStockQuantity: string;
  fieldStockQuantityPlaceholder: string;
  submitEdit: string;
  errorFieldRequired: string;
  errorServerMisconfigured: string;
  errorInvalidServerResponse: string;
  errorFromServer: string;
  errorMissingProductContext: string;
  successMessage: string;
};

const he: ProductFormMessages = {
  editTitle: "עריכת מוצר",
  editSubtitle: "עדכן את פרטי המוצר בחנות",
  back: "חזרה לחנות",
  sectionGeneral: "פרטי מוצר",
  sectionPricing: "תמחור",
  sectionPublish: "פרסום ומלאי",
  sectionDescription: "תיאורים",
  sectionImage: "תמונת מוצר",
  fieldImageUrl: "כתובת תמונה (URL)",
  fieldImageUrlPlaceholder: "https://example.com/image.jpg",
  fieldImageUrlHint: "השאר ריק להסרת התמונה הקיימת",
  fieldName: "שם המוצר",
  fieldNamePlaceholder: "הקלד את שם המוצר…",
  fieldSku: "מק״ט (SKU)",
  fieldSkuPlaceholder: "מזהה מוצר ייחודי…",
  fieldRegularPrice: "מחיר רגיל",
  fieldRegularPricePlaceholder: "0.00",
  fieldSalePrice: "מחיר מבצע",
  fieldSalePricePlaceholder: "0.00 — השאר ריק אם אין מבצע",
  fieldDescription: "תיאור מלא",
  fieldDescriptionPlaceholder: "תיאור מפורט של המוצר…",
  fieldShortDescription: "תיאור קצר",
  fieldShortDescriptionPlaceholder: "תיאור קצר של המוצר…",
  fieldStatus: "סטטוס",
  fieldStatusPublish: "פורסם",
  fieldStatusDraft: "טיוטה",
  fieldStatusPrivate: "פרטי",
  fieldManageStock: "ניהול מלאי",
  fieldManageStockHint: "לעקוב אחרי הכמות של המוצר במלאי",
  fieldStockStatus: "מצב מלאי",
  fieldStockStatusInStock: "קיים במלאי",
  fieldStockStatusOutOfStock: "המלאי אזל",
  fieldStockQuantity: "כמות במלאי",
  fieldStockQuantityPlaceholder: "0",
  submitEdit: "שמור שינויים",
  errorFieldRequired: "שדה חובה",
  errorServerMisconfigured: "בעיית תצורה או חיבור לשרת.",
  errorInvalidServerResponse: "תשובה לא תקינה מהשרת.",
  errorFromServer: "שגיאה מהשרת:",
  errorMissingProductContext: "שגיאה: לא נמצא מזהה מוצר.",
  successMessage: "המוצר עודכן בהצלחה!",
};

const en: ProductFormMessages = {
  editTitle: "Edit product",
  editSubtitle: "Update product details in the store",
  back: "Back to store",
  sectionGeneral: "Product details",
  sectionPricing: "Pricing",
  sectionPublish: "Publish & stock",
  sectionDescription: "Descriptions",
  sectionImage: "Product image",
  fieldImageUrl: "Image URL",
  fieldImageUrlPlaceholder: "https://example.com/image.jpg",
  fieldImageUrlHint: "Leave empty to remove the existing image",
  fieldName: "Product name",
  fieldNamePlaceholder: "Enter product name…",
  fieldSku: "SKU",
  fieldSkuPlaceholder: "Unique product identifier…",
  fieldRegularPrice: "Regular price",
  fieldRegularPricePlaceholder: "0.00",
  fieldSalePrice: "Sale price",
  fieldSalePricePlaceholder: "0.00 — leave blank for no sale",
  fieldDescription: "Full description",
  fieldDescriptionPlaceholder: "Detailed product description…",
  fieldShortDescription: "Short description",
  fieldShortDescriptionPlaceholder: "Brief product description…",
  fieldStatus: "Status",
  fieldStatusPublish: "Published",
  fieldStatusDraft: "Draft",
  fieldStatusPrivate: "Private",
  fieldManageStock: "Manage stock",
  fieldManageStockHint: "Track the product quantity in inventory",
  fieldStockStatus: "Stock status",
  fieldStockStatusInStock: "In stock",
  fieldStockStatusOutOfStock: "Out of stock",
  fieldStockQuantity: "Stock quantity",
  fieldStockQuantityPlaceholder: "0",
  submitEdit: "Save changes",
  errorFieldRequired: "This field is required",
  errorServerMisconfigured: "Server connection or configuration error.",
  errorInvalidServerResponse: "Invalid response from server.",
  errorFromServer: "Server error:",
  errorMissingProductContext: "Error: product ID not found.",
  successMessage: "Product updated successfully!",
};

export function getProductFormMessages(locale: Locale): ProductFormMessages {
  return locale === "en" ? en : he;
}
