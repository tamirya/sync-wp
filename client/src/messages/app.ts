import type { Locale } from "@/i18n/config";

export type AppMessages = {
  brandName: string;
  brandTagline: string;
  navStores: string;
  navMapping: string;
  navSuppliers: string;
  navSettings: string;
  addStore: string;
  /** Compact CTA in sidebar (secondary) */
  addSupplierShort: string;
  userProfile: string;
  userRole: string;
  logout: string;
  topBarDocs: string;
  topBarSupport: string;
  searchPlaceholder: string;
  openMenu: string;
  closeMenu: string;
  storesBreadcrumb: string;
  storesTitle: string;
  storesSubtitle: string;
  /** When GET /stores fails (not 401) */
  storesLoadError: string;
  storeSynced: string;
  storeTotalProducts: string;
  storeTotalCategories: string;
  storeLastSynced: string;
  syncStoreProducts: string;
  syncStoreCategories: string;
  syncStore: string;
  addAnotherStore: string;
  addAnotherStoreHint: string;
  editStoreAria: string;
  deleteStoreAria: string;
  confirmDeleteStore: string;
  mappingTitle: string;
  mappingSubtitle: string;
  mappingBreadcrumb: string;
  mappingSelectStore: string;
  mappingSelectSupplier: string;
  mappingSelectBothHint: string;
  mappingPanelStore: string;
  mappingPanelSupplier: string;
  mappingCategoriesEmpty: string;
  mappingCatalogLoadError: string;
  mappingProductSku: string;
  mappingProductPrice: string;
  mappingProductStock: string;
  /** When only Woo `stock_status` is available */
  mappingStockInStock: string;
  mappingStockOutOfStock: string;
  mappingStockOnBackorder: string;
  /** Missing price/stock cell */
  mappingProductFieldEmpty: string;
  /** When GET /stores or /suppliers fails for the mapping toolbar */
  mappingListsLoadError: string;
  /** Shown while mapping trees are loading (loading.tsx) */
  mappingTreesLoading: string;
  mappingSearchPlaceholder: string;
  mappingSearchNoResults: string;
  /** Mapping rules section below the trees */
  mappingRulesTitle: string;
  /** Badge next to the rules title – replace {{count}} with total synced */
  mappingRulesSyncedBadge: string;
  mappingRulesEmpty: string;
  mappingRulesLoadError: string;
  mappingRuleDeleteAria: string;
  mappingRuleRemoveLabel: string;
  mappingRuleEditAria: string;
  mappingAddCategoryRule: string;
  mappingAddProductRule: string;
  mappingProductRulesTitle: string;
  mappingProductRulesEmpty: string;
  mappingProductRulesLoadError: string;
  mappingNewPageTitle: string;
  mappingNewPageSubtitle: string;
  mappingAddMappingButton: string;
  mappingNewSaveSuccess: string;
  mappingNewSaveFailed: string;
  mappingBackToList: string;
  mappingNewNoItemsSelected: string;
  mappingNewSaving: string;
  mappingDraftTitle: string;
  mappingDraftSources: string;
  mappingDraftTarget: string;
  mappingDraftSourcesEmpty: string;
  mappingDraftSelectTarget: string;
  mappingDraftSearchTarget: string;
  mappingDraftSaveRule: string;
  mappingDraftResetRule: string;
  mappingDraftNoTarget: string;
  mappingDraftAddAriaLabel: string;
  mappingDraftRemoveAriaLabel: string;
  mappingDraftTargetSearchNoResults: string;
  mappingSyncButton: string;
  mappingSyncing: string;
  mappingSyncSuccess: string;
  mappingSyncFailed: string;
  mappingSyncNoRules: string;
  suppliersBreadcrumb: string;
  suppliersTitle: string;
  suppliersSubtitle: string;
  /** When GET /suppliers fails (not 401) */
  suppliersLoadError: string;
  addAnotherSupplier: string;
  addAnotherSupplierHint: string;
  editSupplierAria: string;
  deleteSupplierAria: string;
  confirmDeleteSupplier: string;
  /** Shown when DELETE fails after confirm */
  deleteFailedAlert: string;
  /** Generic confirm dialog (e.g. replace native confirm) */
  confirmYes: string;
  confirmNo: string;
  /** Large title on delete confirmation modal */
  deleteConfirmTitle: string;
  /** Compact green status on supplier card (like “OK” in mockups) */
  supplierStatusOk: string;
  supplierTotalProducts: string;
  supplierTotalCategories: string;
  supplierLastSynced: string;
  syncSupplierProducts: string;
  syncSupplierCategories: string;
  syncSupplier: string;
  syncSuccessAlert: string;
  syncFailedAlert: string;
  clearWooProducts: string;
  confirmClearWooProducts: string;
  clearWooProductsConfirmTitle: string;
  clearWooProductsFailedAlert: string;
  clearWooCategories: string;
  confirmClearWooCategories: string;
  clearWooCategoriesConfirmTitle: string;
  clearWooCategoriesFailedAlert: string;
  settingsTitle: string;
  settingsSubtitle: string;
  storeCategoriesTitle: string;
  storeCategoriesSubtitle: string;
  storeCategoriesBack: string;
  storeCategoriesEmpty: string;
  storeCategoriesLoadError: string;
  storeCategoryProducts: string;
  storeCategoryRoot: string;
  storeCategoryParent: string;
  storeCategoryProductsBack: string;
  storeCategoryProductsEmpty: string;
  storeCategoryProductsLoadError: string;
  storeCategoryProductsTitle: string;
  storeProductSalePrice: string;
  storeProductOutOfStock: string;
  storeProductInStock: string;
  storeProductOnBackorder: string;
  editLabel: string;
  supplierCategoriesTitle: string;
  supplierCategoriesSubtitle: string;
  supplierCategoriesBack: string;
  /** Shown in loading.tsx while opening a supplier detail page */
  supplierPageLoading: string;
  supplierCategoriesEmpty: string;
  supplierCategoriesLoadError: string;
  supplierCategoryProductsViewLabel: string;
  storeCategorySubcategoriesTitle: string;
  selectLabel: string;
  selectedLabel: string;
  selectionTotal: string;
  selectionClear: string;
  selectionPanelTitle: string;
  selectionPanelCategoriesSection: string;
  selectionPanelProductsSection: string;
  selectionPanelEmpty: string;
  syncToStoreButton: string;
  syncModalTitle: string;
  syncModalSelectStore: string;
  syncModalSelectCategory: string;
  syncModalCreateRule: string;
  syncModalSuccess: string;
  syncModalError: string;
  syncModalLoadingStores: string;
  syncModalLoadingCategories: string;
  syncModalNoStores: string;
  syncModalNoCategories: string;
};

const he: AppMessages = {
  brandName: "Appiz",
  brandTagline: "מנהל מערכת",
  navStores: "חנויות",
  navMapping: "מיפוי מוצרים בין חנות לספק",
  navSuppliers: "ספקים",
  navSettings: "הגדרות",
  addStore: "הוסף חנות חדשה",
  addSupplierShort: "הוסף ספק",
  userProfile: "פרופיל משתמש",
  userRole: "גישת מנהל",
  logout: "התנתקות",
  topBarDocs: "תיעוד",
  topBarSupport: "תמיכה",
  searchPlaceholder: "חיפוש מוצרים…",
  openMenu: "פתח תפריט",
  closeMenu: "סגור תפריט",
  storesBreadcrumb: "חנויות",
  storesTitle: "החנויות שלי",
  storesSubtitle: "ניהול סנכרון החנויות הדיגיטליות שלך.",
  storesLoadError: "לא ניתן לטעון את רשימת החנויות. נסה לרענן או להתחבר מחדש.",
  storeSynced: "מסונכרן",
  storeTotalProducts: "סה״כ מוצרים",
  storeTotalCategories: "סה״כ קטגוריות",
  storeLastSynced: "סנכרון אחרון",
  syncStoreProducts: "סנכרן מוצרים",
  syncStoreCategories: "סנכרן קטגוריות",
  syncStore: "סנכרן עכשיו",
  addAnotherStore: "הוסף חנות נוספת",
  addAnotherStoreHint: "לחץ כדי להוסיף חנות חדשה",
  editStoreAria: "עריכת חנות",
  deleteStoreAria: "מחיקת חנות",
  confirmDeleteStore: "האם למחוק חנות זו?",
  mappingTitle: "מיפוי מוצרים",
  mappingSubtitle:
    "השוואת עצי קטגוריות ומוצרים בין חנות לספק — בחר חנות וספק למטה.",
  mappingBreadcrumb: "מיפוי",
  mappingSelectStore: "בחר חנות",
  mappingSelectSupplier: "בחר ספק",
  mappingSelectBothHint: "בחר חנות וספק כדי להציג את שני העצים זה לצד זה.",
  mappingPanelStore: "חנות",
  mappingPanelSupplier: "ספק",
  mappingCategoriesEmpty:
    "אין קטגוריות. סנכרן קטלוג מהמסכים הרלוונטיים אם הרשימה ריקה.",
  mappingCatalogLoadError:
    "לא ניתן לטעון קטגוריות או מוצרים. נסה לרענן, לסנכרן קטלוג, או להתחבר מחדש.",
  mappingProductSku: "מק״ט",
  mappingProductPrice: "מחיר",
  mappingProductStock: "מלאי",
  mappingStockInStock: "במלאי",
  mappingStockOutOfStock: "אזל מהמלאי",
  mappingStockOnBackorder: "בהזמנה מראש",
  mappingProductFieldEmpty: "—",
  mappingListsLoadError:
    "לא ניתן לטעון חנויות או ספקים. נסה לרענן או להתחבר מחדש.",
  mappingTreesLoading: "טוען עצי קטגוריות…",
  mappingSearchPlaceholder: "חיפוש קטגוריות ומוצרים…",
  mappingSearchNoResults: "לא נמצאו תוצאות",
  mappingRulesTitle: "כללי מיפוי קטגוריות",
  mappingRulesSyncedBadge: "({{count}} פריטים מסונכרנים)",
  mappingRulesEmpty: "אין כללי מיפוי עדיין.",
  mappingRulesLoadError: "לא ניתן לטעון כללי מיפוי. נסה לרענן.",
  mappingRuleDeleteAria: "מחק כלל",
  mappingRuleRemoveLabel: "הסר",
  mappingRuleEditAria: "ערוך כלל",
  mappingAddCategoryRule: "הוסף כלל קטגוריה",
  mappingAddProductRule: "הוסף כלל מוצר",
  mappingProductRulesTitle: "כללי מיפוי מוצרים",
  mappingProductRulesEmpty: "אין כללי מיפוי מוצרים עדיין.",
  mappingProductRulesLoadError: "לא ניתן לטעון כללי מיפוי מוצרים. נסה לרענן.",
  mappingNewPageTitle: "הוסף מיפוי מוצרים",
  mappingNewPageSubtitle: "בחר ספק וחנות, סמן פריטים מהעצים ולחץ הוסף מיפוי.",
  mappingAddMappingButton: "הוסף מיפוי",
  mappingNewSaveSuccess: "המיפוי נשמר בהצלחה",
  mappingNewSaveFailed: "שמירת המיפוי נכשלה",
  mappingBackToList: "חזרה לרשימה",
  mappingNewNoItemsSelected: "יש לבחור לפחות פריט אחד מכל אחד מהעצים",
  mappingNewSaving: "שומר…",
  mappingDraftTitle: "כלל חדש",
  mappingDraftSources: "מקורות (ספק)",
  mappingDraftTarget: "יעד (חנות)",
  mappingDraftSourcesEmpty: "הוסף קטגוריות מהעץ ←",
  mappingDraftSelectTarget: "בחר קטגוריית יעד",
  mappingDraftSearchTarget: "חיפוש קטגוריה…",
  mappingDraftSaveRule: "שמור כלל",
  mappingDraftResetRule: "איפוס",
  mappingDraftNoTarget: "יש לבחור קטגוריית יעד",
  mappingDraftAddAriaLabel: "הוסף לכלל",
  mappingDraftRemoveAriaLabel: "הסר מהכלל",
  mappingDraftTargetSearchNoResults: "לא נמצאו קטגוריות",
  mappingSyncButton: "סנכן מיפויים",
  mappingSyncing: "מסנכרן…",
  mappingSyncSuccess: "הסנכרון הושלם בהצלחה",
  mappingSyncFailed: "הסנכרון נכשל",
  mappingSyncNoRules: "אין כללי מיפוי לסנכרון",
  suppliersBreadcrumb: "ספקים",
  suppliersTitle: "הספקים שלי",
  suppliersSubtitle: "ניהול ספקי קטלוג וחיבור לקטלוג המוצרים.",
  suppliersLoadError:
    "לא ניתן לטעון את רשימת הספקים. נסה לרענן או להתחבר מחדש.",
  addAnotherSupplier: "הוסף ספק נוסף",
  addAnotherSupplierHint: "לחץ כדי להוסיף ספק חדש",
  editSupplierAria: "עריכת ספק",
  deleteSupplierAria: "מחיקת ספק",
  confirmDeleteSupplier: "האם למחוק ספק זה?",
  deleteFailedAlert: "המחיקה נכשלה:",
  confirmYes: "כן",
  confirmNo: "לא",
  deleteConfirmTitle: "מחיקה",
  supplierStatusOk: "מחובר",
  supplierTotalProducts: "סה״כ מוצרים בקטלוג",
  supplierTotalCategories: "סה״כ קטגוריות",
  supplierLastSynced: "סנכרון אחרון",
  syncSupplierProducts: "סנכרן מוצרים",
  syncSupplierCategories: "סנכרן קטגוריות",
  syncSupplier: "סנכרון",
  syncSuccessAlert: "הסנכרון הושלם בהצלחה",
  syncFailedAlert: "הסנכרון נכשל:",
  clearWooProducts: "מחיקת כל המוצרים מהחנות",
  confirmClearWooProducts:
    "פעולה זו תמחק לצמיתות את כל המוצרים מחנות זו. האם להמשיך?",
  clearWooProductsConfirmTitle: "מחיקת כל המוצרים",
  clearWooProductsFailedAlert: "מחיקת המוצרים נכשלה:",
  clearWooCategories: "מחיקת כל הקטגוריות מהחנות",
  confirmClearWooCategories:
    "פעולה זו תמחק לצמיתות את כל הקטגוריות מחנות זו. האם להמשיך?",
  clearWooCategoriesConfirmTitle: "מחיקת כל הקטגוריות",
  clearWooCategoriesFailedAlert: "מחיקת הקטגוריות נכשלה:",
  settingsTitle: "הגדרות",
  settingsSubtitle: "הגדרות חשבון ומערכת — יתווסף בקרוב.",
  storeCategoriesTitle: "קטגוריות החנות",
  storeCategoriesSubtitle: "כל קטגוריות המוצרים המסונכרנות מהחנות.",
  storeCategoriesBack: "חזרה לחנויות",
  storeCategoriesEmpty:
    "אין קטגוריות מסונכרנות עדיין. סנכרן קטגוריות מדף החנויות.",
  storeCategoriesLoadError: "לא ניתן לטעון קטגוריות. נסה לרענן.",
  storeCategoryProducts: "מוצרים",
  storeCategoryRoot: "קטגוריה ראשית",
  storeCategoryParent: "תת-קטגוריה",
  storeCategoryProductsBack: "חזרה לקטגוריות",
  storeCategoryProductsEmpty: "אין מוצרים בקטגוריה זו.",
  storeCategoryProductsLoadError: "לא ניתן לטעון מוצרים. נסה לרענן.",
  storeCategoryProductsTitle: "מוצרים",
  storeProductSalePrice: "מחיר מבצע",
  storeProductOutOfStock: "אזל מהמלאי",
  storeProductInStock: "במלאי",
  storeProductOnBackorder: "בהזמנה",
  editLabel: "עריכה",
  supplierCategoriesTitle: "קטגוריות הספק",
  supplierCategoriesSubtitle: "כל קטגוריות המוצרים המסונכרנות מהספק.",
  supplierCategoriesBack: "חזרה לספקים",
  supplierPageLoading: "טוען את דף הספק…",
  supplierCategoriesEmpty:
    "אין קטגוריות מסונכרנות עדיין. סנכרן קטגוריות מדף הספקים.",
  supplierCategoriesLoadError: "לא ניתן לטעון קטגוריות. נסה לרענן.",
  supplierCategoryProductsViewLabel: "צפה במוצר",
  storeCategorySubcategoriesTitle: "תת-קטגוריות",
  selectLabel: "בחר",
  selectedLabel: "נבחר ✓",
  selectionTotal: "סה״כ",
  selectionClear: "נקה הכל",
  selectionPanelTitle: "פריטים נבחרים",
  selectionPanelCategoriesSection: "קטגוריות",
  selectionPanelProductsSection: "מוצרים",
  selectionPanelEmpty: "בחר מוצרים או קטגוריות",
  syncToStoreButton: "סנכרן לחנות",
  syncModalTitle: "סנכרן לחנות",
  syncModalSelectStore: "בחר חנות",
  syncModalSelectCategory: "בחר קטגוריה יעד",
  syncModalCreateRule: "צור כלל",
  syncModalSuccess: "הכלל נוצר בהצלחה!",
  syncModalError: "שגיאה:",
  syncModalLoadingStores: "טוען חנויות...",
  syncModalLoadingCategories: "טוען קטגוריות...",
  syncModalNoStores: "אין חנויות",
  syncModalNoCategories: "אין קטגוריות",
};

const en: AppMessages = {
  brandName: "Appiz",
  brandTagline: "PRO SYNC ACTIVE",
  navStores: "Stores",
  navMapping: "Store–supplier product mapping",
  navSuppliers: "Suppliers",
  navSettings: "Settings",
  addStore: "Add New Store",
  addSupplierShort: "Add supplier",
  userProfile: "User Profile",
  userRole: "Admin Access",
  logout: "Log out",
  topBarDocs: "Docs",
  topBarSupport: "Support",
  searchPlaceholder: "Search products…",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  storesBreadcrumb: "STORES",
  storesTitle: "My Stores",
  storesSubtitle: "Manage your digital store sync.",
  storesLoadError: "Could not load stores. Try refreshing or signing in again.",
  storeSynced: "SYNCED",
  storeTotalProducts: "TOTAL PRODUCTS",
  storeTotalCategories: "TOTAL CATEGORIES",
  storeLastSynced: "LAST SYNCED",
  syncStoreProducts: "Sync products",
  syncStoreCategories: "Sync categories",
  syncStore: "Sync now",
  addAnotherStore: "Add Another Store",
  addAnotherStoreHint: "Click here to add a new store",
  editStoreAria: "Edit store",
  deleteStoreAria: "Delete store",
  confirmDeleteStore: "Delete this store?",
  mappingTitle: "Product mapping",
  mappingSubtitle:
    "Compare store and supplier category and product trees — pick a store and supplier below.",
  mappingBreadcrumb: "MAPPING",
  mappingSelectStore: "Select store",
  mappingSelectSupplier: "Select supplier",
  mappingSelectBothHint:
    "Select both a store and a supplier to load the two trees side by side.",
  mappingPanelStore: "Store",
  mappingPanelSupplier: "Supplier",
  mappingCategoriesEmpty:
    "No categories. Sync catalog from the relevant screens if this list is empty.",
  mappingCatalogLoadError:
    "Could not load categories or products. Try refreshing, syncing catalog, or signing in again.",
  mappingProductSku: "SKU",
  mappingProductPrice: "Price",
  mappingProductStock: "Stock",
  mappingStockInStock: "In stock",
  mappingStockOutOfStock: "Out of stock",
  mappingStockOnBackorder: "On backorder",
  mappingProductFieldEmpty: "—",
  mappingListsLoadError:
    "Could not load stores or suppliers. Try refreshing or signing in again.",
  mappingTreesLoading: "Loading category trees…",
  mappingSearchPlaceholder: "Search categories and products…",
  mappingSearchNoResults: "No results found",
  mappingRulesTitle: "Category Mapping Rules",
  mappingRulesSyncedBadge: "({{count}} SYNCED ITEMS MAPPED)",
  mappingRulesEmpty: "No category mapping rules yet.",
  mappingRulesLoadError: "Could not load mapping rules. Try refreshing.",
  mappingRuleDeleteAria: "Delete rule",
  mappingRuleRemoveLabel: "Remove",
  mappingRuleEditAria: "Edit rule",
  mappingAddCategoryRule: "Add category rule",
  mappingAddProductRule: "Add product rule",
  mappingProductRulesTitle: "Product Mapping Rules",
  mappingProductRulesEmpty: "No product mapping rules yet.",
  mappingProductRulesLoadError:
    "Could not load product mapping rules. Try refreshing.",
  mappingNewPageTitle: "Add product mapping",
  mappingNewPageSubtitle:
    "Select a supplier and store, pick items from the trees, then click Add Mapping.",
  mappingAddMappingButton: "Add Mapping",
  mappingNewSaveSuccess: "Mapping saved successfully",
  mappingNewSaveFailed: "Failed to save mapping",
  mappingBackToList: "Back to list",
  mappingNewNoItemsSelected: "Please select at least one item from each tree",
  mappingNewSaving: "Saving…",
  mappingDraftTitle: "New rule",
  mappingDraftSources: "Sources (supplier)",
  mappingDraftTarget: "Target (store)",
  mappingDraftSourcesEmpty: "Add categories from the tree →",
  mappingDraftSelectTarget: "Select target category",
  mappingDraftSearchTarget: "Search category…",
  mappingDraftSaveRule: "Save rule",
  mappingDraftResetRule: "Reset",
  mappingDraftNoTarget: "Please select a target category",
  mappingDraftAddAriaLabel: "Add to rule",
  mappingDraftRemoveAriaLabel: "Remove from rule",
  mappingDraftTargetSearchNoResults: "No categories found",
  mappingSyncButton: "Sync Mappings",
  mappingSyncing: "Syncing…",
  mappingSyncSuccess: "Sync completed successfully",
  mappingSyncFailed: "Sync failed",
  mappingSyncNoRules: "No mapping rules to sync",
  suppliersBreadcrumb: "SUPPLIERS",
  suppliersTitle: "My suppliers",
  suppliersSubtitle: "Manage supplier catalogs and product feeds.",
  suppliersLoadError:
    "Could not load suppliers. Try refreshing or signing in again.",
  addAnotherSupplier: "Add another supplier",
  addAnotherSupplierHint: "Click to add a new supplier",
  editSupplierAria: "Edit supplier",
  deleteSupplierAria: "Delete supplier",
  confirmDeleteSupplier: "Delete this supplier?",
  deleteFailedAlert: "Delete failed:",
  confirmYes: "Yes",
  confirmNo: "No",
  deleteConfirmTitle: "Delete",
  supplierStatusOk: "OK",
  supplierTotalProducts: "Total products",
  supplierTotalCategories: "Total categories",
  supplierLastSynced: "Last synced",
  syncSupplierProducts: "Sync products",
  syncSupplierCategories: "Sync categories",
  syncSupplier: "Sync",
  syncSuccessAlert: "Sync completed successfully",
  syncFailedAlert: "Sync failed:",
  clearWooProducts: "Delete all products from store",
  confirmClearWooProducts:
    "This will permanently delete all products from this store. Continue?",
  clearWooProductsConfirmTitle: "Delete all products",
  clearWooProductsFailedAlert: "Failed to clear products:",
  clearWooCategories: "Delete all categories from store",
  confirmClearWooCategories:
    "This will permanently delete all categories from this store. Continue?",
  clearWooCategoriesConfirmTitle: "Delete all categories",
  clearWooCategoriesFailedAlert: "Failed to clear categories:",
  settingsTitle: "Settings",
  settingsSubtitle: "Account and system settings — coming soon.",
  storeCategoriesTitle: "Store categories",
  storeCategoriesSubtitle: "All synced product categories from this store.",
  storeCategoriesBack: "Back to stores",
  storeCategoriesEmpty:
    "No synced categories yet. Sync categories from the stores page.",
  storeCategoriesLoadError: "Could not load categories. Try refreshing.",
  storeCategoryProducts: "products",
  storeCategoryRoot: "Root category",
  storeCategoryParent: "Subcategory",
  storeCategoryProductsBack: "Back to categories",
  storeCategoryProductsEmpty: "No products in this category.",
  storeCategoryProductsLoadError: "Could not load products. Try refreshing.",
  storeCategoryProductsTitle: "Products",
  storeProductSalePrice: "Sale",
  storeProductOutOfStock: "Out of stock",
  storeProductInStock: "In stock",
  storeProductOnBackorder: "On backorder",
  editLabel: "Edit",
  supplierCategoriesTitle: "Supplier categories",
  supplierCategoriesSubtitle:
    "All synced product categories from this supplier.",
  supplierCategoriesBack: "Back to suppliers",
  supplierPageLoading: "Loading supplier…",
  supplierCategoriesEmpty:
    "No synced categories yet. Sync categories from the suppliers page.",
  supplierCategoriesLoadError: "Could not load categories. Try refreshing.",
  supplierCategoryProductsViewLabel: "View product",
  storeCategorySubcategoriesTitle: "Sub-categories",
  selectLabel: "Select",
  selectedLabel: "Selected ✓",
  selectionTotal: "Total",
  selectionClear: "Clear all",
  selectionPanelTitle: "Selected items",
  selectionPanelCategoriesSection: "Categories",
  selectionPanelProductsSection: "Products",
  selectionPanelEmpty: "Select products or categories",
  syncToStoreButton: "Sync to store",
  syncModalTitle: "Sync to store",
  syncModalSelectStore: "Select store",
  syncModalSelectCategory: "Select target category",
  syncModalCreateRule: "Create rule",
  syncModalSuccess: "Rule created successfully!",
  syncModalError: "Error:",
  syncModalLoadingStores: "Loading stores...",
  syncModalLoadingCategories: "Loading categories...",
  syncModalNoStores: "No stores found",
  syncModalNoCategories: "No categories found",
};

export function getAppMessages(locale: Locale): AppMessages {
  return locale === "en" ? en : he;
}
