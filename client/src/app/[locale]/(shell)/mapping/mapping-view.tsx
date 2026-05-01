"use client";

import type {
  MappingRule,
  ProductMappingRule,
  SupplierProductInfo,
} from "@/lib/mapping-api";
import type { Locale } from "@/i18n/config";
import type { AppMessages } from "@/messages/app";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  deleteCategoryRuleAction,
  deleteProductRuleAction,
  syncSingleMappingRuleAction,
  updateCategoryRuleEnabledAction,
  updateProductRuleEnabledAction,
} from "@/app/actions/mapping-rules";
import { MappingRulesList } from "./mapping-rules-list";

type NamedEntity = { id: string; name: string };

type Props = {
  locale: Locale;
  messages: AppMessages;
  stores: NamedEntity[];
  suppliers: NamedEntity[];
  mappingRules: MappingRule[];
  rulesLoadFailed: boolean;
  productMappingRules: ProductMappingRule[];
  productRulesLoadFailed: boolean;
  storeCategoryMap: Record<number, string>;
  supplierCategoryMap: Record<number, string>;
  supplierCategoryCountMap: Record<number, number>;
  supplierProductMap: Record<number, SupplierProductInfo>;
};

export function MappingView({
  locale,
  messages,
  stores,
  suppliers,
  mappingRules,
  rulesLoadFailed,
  productMappingRules,
  productRulesLoadFailed,
  storeCategoryMap,
  supplierCategoryMap,
  supplierCategoryCountMap,
  supplierProductMap,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleDeleteCategoryRule(id: number) {
    startTransition(async () => {
      await deleteCategoryRuleAction(locale, id);
      router.refresh();
    });
  }

  function handleDeleteProductRule(id: number) {
    startTransition(async () => {
      await deleteProductRuleAction(locale, id);
      router.refresh();
    });
  }

  async function handleSyncCategoryRule(id: number) {
    const rule = mappingRules.find((r) => r.id === id);
    if (!rule) return;
    const result = await syncSingleMappingRuleAction(
      locale,
      rule.storeId,
      id,
      "category",
    );
    if (!result.ok) throw new Error(result.error);
  }

  async function handleSyncProductRule(id: number) {
    const rule = productMappingRules.find((r) => r.id === id);
    if (!rule) return;
    const result = await syncSingleMappingRuleAction(
      locale,
      rule.storeId,
      id,
      "product",
    );
    if (!result.ok) throw new Error(result.error);
  }

  return (
    <div className="space-y-6">
      <MappingRulesList
        locale={locale}
        rules={mappingRules}
        loadFailed={rulesLoadFailed}
        productRules={productMappingRules}
        productRulesLoadFailed={productRulesLoadFailed}
        messages={messages}
        stores={stores}
        suppliers={suppliers}
        storeCategoryMap={storeCategoryMap}
        supplierCategoryMap={supplierCategoryMap}
        supplierCategoryCountMap={supplierCategoryCountMap}
        supplierProductMap={supplierProductMap}
        onDeleteCategoryRule={handleDeleteCategoryRule}
        onDeleteProductRule={handleDeleteProductRule}
        onToggleCategoryRule={(id, enabled) =>
          updateCategoryRuleEnabledAction(locale, id, enabled)
        }
        onToggleProductRule={(id, enabled) =>
          updateProductRuleEnabledAction(locale, id, enabled)
        }
        onSyncCategoryRule={handleSyncCategoryRule}
        onSyncProductRule={handleSyncProductRule}
        onAddCategoryRule={() =>
          router.push(`/${locale}/mapping/new?type=category`)
        }
        onAddProductRule={() =>
          router.push(`/${locale}/mapping/new?type=product`)
        }
      />
    </div>
  );
}
