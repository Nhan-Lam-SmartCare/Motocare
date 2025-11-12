import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWorkOrders,
  createWorkOrderAtomic,
  updateWorkOrder,
  deleteWorkOrder,
} from "../lib/repository/workOrdersRepository";
import type { WorkOrder } from "../types";
import { showToast } from "../utils/toast";
import { mapRepoErrorForUser } from "../utils/errorMapping";

export const useWorkOrdersRepo = () => {
  return useQuery({
    queryKey: ["workOrdersRepo"],
    queryFn: async () => {
      const res = await fetchWorkOrders();
      if (!res.ok) throw res.error;
      return res.data;
    },
  });
};

export const useCreateWorkOrderAtomicRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<WorkOrder>) => createWorkOrderAtomic(input),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["workOrdersRepo"] });
      qc.invalidateQueries({ queryKey: ["partsRepo"] }); // Refresh parts for stock update
      showToast.success("Đã tạo phiếu sửa chữa (atomic)");
      if ((res as any)?.data?.inventoryTxCount) {
        showToast.info(
          `Xuất kho: ${(res as any).data.inventoryTxCount} phụ tùng`
        );
      }
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};

export const useUpdateWorkOrderRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<WorkOrder>;
    }) => updateWorkOrder(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workOrdersRepo"] });
      showToast.success("Đã cập nhật phiếu sửa chữa");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};

export const useDeleteWorkOrderRepo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteWorkOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workOrdersRepo"] });
      showToast.success("Đã xóa phiếu sửa chữa");
    },
    onError: (err: any) => showToast.error(mapRepoErrorForUser(err)),
  });
};
