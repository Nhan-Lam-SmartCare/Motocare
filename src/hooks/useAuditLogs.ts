import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "../lib/repository/auditLogsRepository";

export const useAuditLogs = (params?: {
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
  includeUser?: boolean;
}) => {
  return useQuery({
    queryKey: ["auditLogs", params],
    queryFn: async () => {
      const res = await fetchAuditLogs(params);
      if (!res.ok) throw res.error;
      return res;
    },
  });
};
