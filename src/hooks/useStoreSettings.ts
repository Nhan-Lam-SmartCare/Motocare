import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export interface StoreSettings {
    id: string;
    store_name: string;
    store_name_en?: string;
    slogan?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    tax_code?: string;
    logo_url?: string;
    bank_qr_url?: string;
    primary_color?: string;
    theme_preset?: string;
    business_hours?: string;
    // Pricing markup percentages
    retail_markup_percent?: number; // % lợi nhuận giá lẻ (VD: 40 = 40%)
    wholesale_markup_percent?: number; // % lợi nhuận giá sỉ (VD: 25 = 25%)
}

export const useStoreSettings = () => {
    return useQuery({
        queryKey: ["store_settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("store_settings")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (error) throw error;
            return data as StoreSettings;
        },
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    });
};
