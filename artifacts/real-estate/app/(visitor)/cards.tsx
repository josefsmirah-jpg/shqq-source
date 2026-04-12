import React from "react";
import { router } from "expo-router";
import CardViewerScreen from "@/components/CardViewerScreen";
import { getListingsForViewer } from "@/utils/listingsStore";

export default function VisitorCardsScreen() {
  const { listings, startIndex, isAdmin } = getListingsForViewer();
  return (
    <CardViewerScreen
      listings={listings}
      startIndex={startIndex}
      onClose={() => router.back()}
      isAdmin={isAdmin}
      visitorShare
    />
  );
}
