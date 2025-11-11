import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  fetchSales,
  fetchSalesPaged,
  createSale,
  createSaleAtomic,
  deleteSaleById,
  refundSale,
  returnSaleItem,
} from "../lib/repository/salesRepository";
import type { Sale } from "../types";
import { showToast } from "../utils/toast";
import { mapRepoErrorForUser } from "../utils/errorMapping";

export const useSalesRepo = () => {
  return useQuery({
    queryKey: ["salesRepo"],
    queryFn: async () => {
      const res = await fetchSales();
      if (!res.ok) throw res.error;
      return res.data;
    },
  });
};

export interface UseSalesPagedParams {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "completed" | "cancelled" | "refunded";
  paymentMethod?: "cash" | "bank";
  mode?: "offset" | "keyset"; // pagination strategy
  afterDate?: string; // keyset cursor (last row date)
  afterId?: string; // keyset tie-breaker cursor (last row id)
}

export const useSalesPagedRepo = (params: UseSalesPagedParams) => {
  return useQuery({
    queryKey: ["salesRepoPaged", params],
    queryFn: async () => {
      // normalize params to repository query shape (drop 'all')
      const { status, ...rest } = params || {};
      const normalized = {
        ...rest,
        status: status === "all" ? undefined : status,
      } as any;
      const res = await fetchSalesPaged(normalized);
      if (!res.ok) throw res.error;
      return { data: res.data, meta: res.meta };
    },
    placeholderData: (prev) => prev as any,
  });
};

export interface UseSalesKeysetParams {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  search?: string;
  status?: "all" | "completed" | "cancelled" | "refunded";
  paymentMethod?: "cash" | "bank";
}

export const useSalesKeysetRepo = (params: UseSalesKeysetParams) => {
  return useInfiniteQuery({
    queryKey: ["salesRepoKeyset", params],
    initialPageParam: {
      afterDate: undefined as string | undefined,
      afterId: undefined as string | undefined,
    },
    queryFn: async ({ pageParam }) => {
      const { status, ...rest } = params || {};
      const normalized: any = {
        ...rest,
        mode: "keyset",
        afterDate: pageParam?.afterDate,
        afterId: pageParam?.afterId,
        status: status === "all" ? undefined : status,
      };
      const res = await fetchSalesPaged(normalized);
      if (!res.ok) throw res.error;
      return { data: res.data, meta: res.meta };
    },
    getNextPageParam: (lastPage) => {
      const m: any = lastPage?.meta || {};
      if (!m?.hasMore) return undefined;
      return {
        afterDate: m.nextAfterDate as string | undefined,
        afterId: m.nextAfterId as string | undefined,
      };
    },
    placeholderData: (prev) => prev as any,
  });
};

// Deprecated: prefer useCreateSaleAtomicRepo for data integrity.
export const useCreateSaleRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    // Route legacy hook to atomic implementation for better integrity
    mutationFn: (input: Partial<Sale>) => createSaleAtomic(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesRepo"] });
      showToast.success("Đã tạo hóa đơn");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};

// Atomic creation hook (preferred for real data integrity)
export const useCreateSaleAtomicRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Sale>) => createSaleAtomic(input),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["salesRepo"] });
      showToast.success("Đã tạo hóa đơn (atomic)");
      if ((res as any)?.data?.inventoryTxCount) {
        showToast.info(`Xuất kho: ${(res as any).data.inventoryTxCount} dòng`);
      }
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};

export const useDeleteSaleRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteSaleById(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesRepo"] });
      showToast.success("Đã xóa hóa đơn");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};

export const useRefundSaleRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      refundSale(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesRepo"] });
      showToast.success("Đã hoàn tiền hóa đơn");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};

export const useReturnSaleItemRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      saleId,
      itemSku,
      quantity,
      reason,
    }: {
      saleId: string;
      itemSku: string;
      quantity: number;
      reason?: string;
    }) => returnSaleItem({ saleId, itemSku, quantity, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salesRepo"] });
      showToast.success("Đã trả hàng một phần");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};
