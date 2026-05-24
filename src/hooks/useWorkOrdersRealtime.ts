import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export const useWorkOrdersRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Channel name must be unique
    const channel = supabase
      .channel("work-orders-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_orders",
        },
        (payload) => {
          console.warn("[Realtime] Work orders table changed, invalidating caches. Event:", payload.eventType);
          
          // Invalidate work orders queries to fetch fresh database state
          queryClient.invalidateQueries({ queryKey: ["workOrdersRepo"] });
          queryClient.invalidateQueries({ queryKey: ["workOrdersFiltered"] });
          
          // Refresh parts repositories because parts might be consumed or returned
          queryClient.invalidateQueries({ queryKey: ["partsRepo"] });
          queryClient.invalidateQueries({ queryKey: ["partsRepoPaged"] });
          
          // Refresh transactional repositories
          queryClient.invalidateQueries({ queryKey: ["inventoryTxRepo"] });
          queryClient.invalidateQueries({ queryKey: ["cashTransactions"] });
          queryClient.invalidateQueries({ queryKey: ["paymentSources"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
