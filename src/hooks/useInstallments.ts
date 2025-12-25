import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { showToast } from "../utils/toast";
import { useAppContext } from "../contexts/AppContext";

// Types
export interface SalesInstallment {
    id: string;
    sale_id: string;
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    total_amount: number;
    prepaid_amount: number;
    remaining_amount: number;
    interest_rate: number;
    total_with_interest: number;
    num_installments: number;
    installment_amount: number;
    current_installment: number;
    next_payment_date?: string;
    finance_company: string;
    status: "active" | "completed" | "overdue" | "cancelled";
    start_date: string;
    end_date?: string;
    notes?: string;
    branch_id: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface InstallmentPayment {
    id: string;
    installment_id: string;
    installment_number: number;
    payment_date: string;
    amount: number;
    payment_method: "cash" | "bank";
    notes?: string;
    cash_transaction_id?: string;
    created_by?: string;
    created_at: string;
}

export interface CreateInstallmentInput {
    sale_id: string;
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    total_amount: number;
    prepaid_amount: number;
    interest_rate?: number;
    num_installments: number;
    finance_company?: string;
    start_date?: string;
    notes?: string;
}

// Fetch all installments for current branch
export function useInstallments() {
    const { currentBranchId } = useAppContext();

    return useQuery({
        queryKey: ["sales_installments", currentBranchId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sales_installments")
                .select("*")
                .eq("branch_id", currentBranchId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching installments:", error);
                throw error;
            }
            return data as SalesInstallment[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Fetch payments for a specific installment
export function useInstallmentPayments(installmentId: string) {
    return useQuery({
        queryKey: ["installment_payments", installmentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("installment_payments")
                .select("*")
                .eq("installment_id", installmentId)
                .order("installment_number", { ascending: true });

            if (error) {
                console.error("Error fetching installment payments:", error);
                throw error;
            }
            return data as InstallmentPayment[];
        },
        enabled: !!installmentId,
    });
}

// Create a new installment
export function useCreateInstallment() {
    const queryClient = useQueryClient();
    const { currentBranchId } = useAppContext();

    return useMutation({
        mutationFn: async (input: CreateInstallmentInput) => {
            const interestRate = input.interest_rate || 0;
            const remainingAmount = input.total_amount - input.prepaid_amount;
            const totalWithInterest =
                remainingAmount * (1 + (interestRate / 100) * input.num_installments);
            const installmentAmount = totalWithInterest / input.num_installments;

            // Calculate next payment date (1 month from start)
            const startDate = input.start_date
                ? new Date(input.start_date)
                : new Date();
            const nextPaymentDate = new Date(startDate);
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

            // Calculate end date
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + input.num_installments);

            const { data, error } = await supabase
                .from("sales_installments")
                .insert({
                    sale_id: input.sale_id,
                    customer_id: input.customer_id,
                    customer_name: input.customer_name,
                    customer_phone: input.customer_phone,
                    total_amount: input.total_amount,
                    prepaid_amount: input.prepaid_amount,
                    remaining_amount: remainingAmount,
                    interest_rate: interestRate,
                    total_with_interest: totalWithInterest,
                    num_installments: input.num_installments,
                    installment_amount: installmentAmount,
                    current_installment: 0,
                    next_payment_date: nextPaymentDate.toISOString().split("T")[0],
                    finance_company: input.finance_company || "store",
                    status: "active",
                    start_date: startDate.toISOString().split("T")[0],
                    end_date: endDate.toISOString().split("T")[0],
                    notes: input.notes,
                    branch_id: currentBranchId,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sales_installments"] });
            showToast.success("Đã tạo kế hoạch trả góp");
        },
        onError: (error: Error) => {
            console.error("Error creating installment:", error);
            showToast.error("Lỗi khi tạo kế hoạch trả góp");
        },
    });
}

// Record an installment payment
export function useRecordInstallmentPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            installmentId,
            amount,
            paymentMethod,
            notes,
        }: {
            installmentId: string;
            amount: number;
            paymentMethod: "cash" | "bank";
            notes?: string;
        }) => {
            // First, get the current installment info
            const { data: installment, error: fetchError } = await supabase
                .from("sales_installments")
                .select("*")
                .eq("id", installmentId)
                .single();

            if (fetchError) throw fetchError;

            const nextInstallmentNumber = (installment.current_installment || 0) + 1;

            // Create the payment record
            const { error: paymentError } = await supabase
                .from("installment_payments")
                .insert({
                    installment_id: installmentId,
                    installment_number: nextInstallmentNumber,
                    amount,
                    payment_method: paymentMethod,
                    notes,
                });

            if (paymentError) throw paymentError;

            // Update the installment record
            const newRemainingAmount = Math.max(
                0,
                installment.remaining_amount - amount
            );
            const isCompleted = nextInstallmentNumber >= installment.num_installments;

            // Calculate next payment date
            let nextPaymentDate = null;
            if (!isCompleted) {
                const next = new Date(installment.next_payment_date);
                next.setMonth(next.getMonth() + 1);
                nextPaymentDate = next.toISOString().split("T")[0];
            }

            const { error: updateError } = await supabase
                .from("sales_installments")
                .update({
                    current_installment: nextInstallmentNumber,
                    remaining_amount: newRemainingAmount,
                    next_payment_date: nextPaymentDate,
                    status: isCompleted ? "completed" : "active",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", installmentId);

            if (updateError) throw updateError;

            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sales_installments"] });
            queryClient.invalidateQueries({ queryKey: ["installment_payments"] });
            showToast.success("Đã ghi nhận thanh toán kỳ trả góp");
        },
        onError: (error: Error) => {
            console.error("Error recording payment:", error);
            showToast.error("Lỗi khi ghi nhận thanh toán");
        },
    });
}

// Get installment statistics
export function useInstallmentStats() {
    const { currentBranchId } = useAppContext();

    return useQuery({
        queryKey: ["installment_stats", currentBranchId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sales_installments")
                .select("*")
                .eq("branch_id", currentBranchId)
                .eq("status", "active");

            if (error) throw error;

            const total = data?.reduce(
                (sum, item) => sum + (item.remaining_amount || 0),
                0
            );
            const count = data?.length || 0;

            return { totalRemaining: total, activeCount: count };
        },
        staleTime: 1000 * 60 * 2,
    });
}
