import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCashTransactions,
  createCashTransaction,
  updateCashTransaction,
  deleteCashTransaction,
  type CreateCashTxInput,
  type UpdateCashTxInput,
} from "../lib/repository/cashTransactionsRepository";
import { showToast } from "../utils/toast";
import { mapRepoErrorForUser } from "../utils/errorMapping";

export const useCashTxRepo = (params?: {
  branchId?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  type?: "income" | "expense";
}) => {
  return useQuery({
    queryKey: ["cashTxRepo", params],
    queryFn: async () => {
      console.log('[useCashTxRepo] 🔄 Fetching transactions from DB...');
      const res = await fetchCashTransactions(params);
      if (!res.ok) throw res.error;
      console.log('[useCashTxRepo] ✅ Loaded', res.data.length, 'transactions');
      return res.data;
    },
    staleTime: 0,
    gcTime: 0, // TanStack Query v5 uses gcTime instead of cacheTime
    refetchOnMount: 'always',
    refetchOnWindowFocus: false, // Prevent refetch on focus
  });
};

export const useCreateCashTxRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCashTxInput) => createCashTransaction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashTxRepo"] });
      showToast.success("Đã ghi thu/chi");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};

export const useUpdateCashTxRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCashTxInput) => updateCashTransaction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashTxRepo"] });
      showToast.success("Đã cập nhật giao dịch");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};

export const useDeleteCashTxRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCashTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashTxRepo"] });
      showToast.success("Đã xóa giao dịch");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};
