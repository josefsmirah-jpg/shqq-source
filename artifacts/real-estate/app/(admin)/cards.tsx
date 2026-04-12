import React from "react";
import { router } from "expo-router";
import CardViewerScreen from "@/components/CardViewerScreen";
import { getListingsForViewer } from "@/utils/listingsStore";

export default function AdminCardsScreen() {
  const { listings, startIndex, isAdmin, autoExport } = getListingsForViewer();

  if (!listings || listings.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(0, startIndex), listings.length - 1);

  return (
    <CardViewerScreen
      listings={listings}
      startIndex={safeIndex}
      onClose={() => router.back()}
      isAdmin={isAdmin}
      autoExport={autoExport}
    />
  );
}
