"use client";

import { isLocale, type Locale } from "@/i18n/config";
import { getAppMessages } from "@/messages/app";
import { useParams } from "next/navigation";
import { MappingTreesLoadingIndicator } from "./mapping-loading-indicator";

export function MappingSegmentLoading() {
  const params = useParams();
  const raw = params?.locale;
  const locale: Locale =
    typeof raw === "string" && isLocale(raw) ? raw : "he";
  const m = getAppMessages(locale);

  return (
    <div className="mx-auto pb-12">
      <MappingTreesLoadingIndicator
        label={m.mappingTreesLoading}
        minHeightClass="min-h-[40vh]"
      />
    </div>
  );
}
