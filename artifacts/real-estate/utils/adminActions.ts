import { useRef, useState, useCallback } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useApproveListing, useRejectListing } from "@workspace/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export async function postDeleteListing(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/listings/${id}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export async function postHardDeleteListing(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/listings/${id}/hard-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Hard-delete failed: ${res.status}`);
}

function findListingInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number
): any | undefined {
  const entries = queryClient.getQueriesData<any[]>({ queryKey: ["/api/listings"], exact: false });
  for (const [, value] of entries) {
    if (Array.isArray(value)) {
      const found = value.find((l: any) => l.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

function removeListingFromCache(queryClient: ReturnType<typeof useQueryClient>, id: number) {
  queryClient.setQueriesData(
    { queryKey: ["/api/listings"], exact: false },
    (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return old.filter((l: any) => l.id !== id);
    }
  );
}

function updateListingStatusInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number,
  status: "approved" | "rejected" | "deleted",
  extra?: Record<string, any>
) {
  queryClient.setQueriesData(
    { queryKey: ["/api/listings"], exact: false },
    (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return old.map((l: any) => l.id === id ? { ...l, status, ...extra } : l);
    }
  );
}

function updateStatsAfterAction(
  queryClient: ReturnType<typeof useQueryClient>,
  listing: any,
  action: "approve" | "reject" | "delete"
) {
  if (!listing) return;
  const wasPending = listing.status === "pending";

  queryClient.setQueriesData(
    { queryKey: ["/api/stats"], exact: false },
    (old: any) => {
      if (!old) return old;
      const u: Record<string, number> = {};

      if (wasPending) {
        u.pendingListings = Math.max(0, (old.pendingListings ?? 0) - 1);
        const role = listing.createdByRole;
        if (role === "visitor") {
          u.pendingVisitor = Math.max(0, (old.pendingVisitor ?? 0) - 1);
        } else if (role === "employee") {
          u.pendingEmployee = Math.max(0, (old.pendingEmployee ?? 0) - 1);
        } else if (role === "company" && !listing.packageType) {
          u.pendingCompanyFree = Math.max(0, (old.pendingCompanyFree ?? 0) - 1);
        } else if (role === "company" && listing.packageType) {
          u.pendingCompanyPaid = Math.max(0, (old.pendingCompanyPaid ?? 0) - 1);
        }
      }

      if (action === "approve") u.approvedListings = (old.approvedListings ?? 0) + 1;
      if (action === "reject")  u.rejectedListings = (old.rejectedListings ?? 0) + 1;
      if (action === "delete")  u.deletedListings  = (old.deletedListings  ?? 0) + 1;

      return { ...old, ...u };
    }
  );
}

export function useAdminListingActions() {
  const queryClient = useQueryClient();
  const approveMutation = useApproveListing();
  const rejectMutation = useRejectListing();

  // قفل مستقل لكل بطاقة (بدلاً من قفل واحد يمنع كل العمليات)
  const lockedIds = useRef(new Set<number>());
  const [processingId, setProcessingId] = useState<number | null>(null);

  const lock = useCallback((id: number): boolean => {
    if (lockedIds.current.has(id)) return false;
    lockedIds.current.add(id);
    setProcessingId(id);
    return true;
  }, []);

  const unlock = useCallback((id: number) => {
    lockedIds.current.delete(id);
    setProcessingId(prev => (prev === id ? null : prev));
  }, []);

  const approve = useCallback((id: number, onSuccess?: () => void) => {
    if (!lock(id)) return;
    const listing = findListingInCache(queryClient, id);
    approveMutation.mutate({ id }, {
      onSuccess: (data: any) => {
        updateListingStatusInCache(queryClient, id, "approved", { isFeatured: data?.isFeatured ?? false });
        updateStatsAfterAction(queryClient, listing, "approve");
        onSuccess?.();
      },
      onError: () => {
        Alert.alert("خطأ", "تعذّر قبول الإعلان، تحقق من الاتصال وأعد المحاولة");
      },
      onSettled: () => unlock(id),
    });
  }, [lock, unlock, approveMutation, queryClient]);

  const reject = useCallback((id: number, onSuccess?: () => void) => {
    if (!lock(id)) return;
    const listing = findListingInCache(queryClient, id);
    rejectMutation.mutate({ id }, {
      onSuccess: () => {
        updateListingStatusInCache(queryClient, id, "rejected");
        updateStatsAfterAction(queryClient, listing, "reject");
        onSuccess?.();
      },
      onError: () => {
        Alert.alert("خطأ", "تعذّر رفض الإعلان، تحقق من الاتصال وأعد المحاولة");
      },
      onSettled: () => unlock(id),
    });
  }, [lock, unlock, rejectMutation, queryClient]);

  const deleteListing = useCallback(async (id: number) => {
    if (!lock(id)) return;
    const listing = findListingInCache(queryClient, id);
    try {
      await postDeleteListing(id);
      updateListingStatusInCache(queryClient, id, "deleted", { isFeatured: false });
      updateStatsAfterAction(queryClient, listing, "delete");
    } catch (e) {
      Alert.alert("خطأ", "تعذّر حذف الإعلان، تحقق من الاتصال وأعد المحاولة");
    } finally {
      unlock(id);
    }
  }, [lock, unlock, queryClient]);

  const hardDeleteListing = useCallback(async (id: number) => {
    if (!lock(id)) return;
    try {
      await postHardDeleteListing(id);
      removeListingFromCache(queryClient, id);
    } catch (e) {
      Alert.alert("خطأ", "تعذّر الحذف النهائي، تحقق من الاتصال وأعد المحاولة");
    } finally {
      unlock(id);
    }
  }, [lock, unlock, queryClient]);

  return { processingId, approve, reject, deleteListing, hardDeleteListing };
}
