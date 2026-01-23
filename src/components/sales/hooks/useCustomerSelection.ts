import { useState, useMemo, useCallback } from "react";
import type { Customer } from "../../../types";
import { showToast } from "../../../utils/toast";
import { supabase } from "../../../supabaseClient";

export interface NewCustomerData {
    name: string;
    phone: string;
    vehicleModel: string;
    licensePlate: string;
}

export interface UseCustomerSelectionReturn {
    // State
    selectedCustomer: Customer | null;
    customerSearch: string;
    showCustomerDropdown: boolean;
    showAddCustomerModal: boolean;
    newCustomer: NewCustomerData;

    // Actions
    setSelectedCustomer: (customer: Customer | null) => void;
    setCustomerSearch: (search: string) => void;
    setShowCustomerDropdown: (show: boolean) => void;
    setShowAddCustomerModal: (show: boolean) => void;
    setNewCustomer: React.Dispatch<React.SetStateAction<NewCustomerData>>;
    handleSaveNewCustomer: (
        customers: Customer[],
        createCustomerMutation: any
    ) => void;

    // Computed
    filteredCustomers: Customer[];
}

/**
 * Custom hook for managing customer selection and creation
 */
export function useCustomerSelection(
    allCustomers: Customer[]
): UseCustomerSelectionReturn {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
        null
    );
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState<NewCustomerData>({
        name: "",
        phone: "",
        vehicleModel: "",
        licensePlate: "",
    });

    const extractPhoneNumbers = useCallback((value: string) => {
        const matches = value.match(/\d{8,12}/g);
        return matches ? matches.map((m) => m.trim()) : [];
    }, []);

    // Filter customers based on search
    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return allCustomers;
        const normalizePhone = (value: string) => value.replace(/\D/g, "");
        const searchText = customerSearch.toLowerCase().trim();
        const searchDigits = normalizePhone(customerSearch);

        return allCustomers.filter((c) => {
            const nameMatch = c.name?.toLowerCase().includes(searchText);
            const phoneNumbers = extractPhoneNumbers(c.phone || "");
            const phoneMatch = searchDigits
                ? phoneNumbers.some((num) => num.includes(searchDigits))
                : c.phone?.toLowerCase().includes(searchText);
            return Boolean(nameMatch || phoneMatch);
        });
    }, [allCustomers, customerSearch, extractPhoneNumbers]);

    // Handle save new customer
    const handleSaveNewCustomer = useCallback(
        async (customers: Customer[], createCustomerMutation: any) => {
            const normalizePhone = (value: string) => value.replace(/\D/g, "");
            const trimmedName = newCustomer.name.trim();
            const trimmedPhone = newCustomer.phone.trim();
            const normalizedPhone = normalizePhone(trimmedPhone);
            const phoneNumbers = extractPhoneNumbers(trimmedPhone);

            if (!trimmedName || !trimmedPhone) {
                alert("Vui lòng nhập tên và số điện thoại");
                return;
            }

            if (phoneNumbers.length === 0) {
                alert("Số điện thoại không hợp lệ");
                return;
            }

            // Check if customer already exists (normalized)
            const existingCustomer = customers.find((c) => {
                const existingNumbers = extractPhoneNumbers(c.phone || "");
                return existingNumbers.some((num) => phoneNumbers.includes(num));
            });
            if (existingCustomer) {
                setSelectedCustomer(existingCustomer);
                setCustomerSearch(existingCustomer.name || trimmedPhone);
                setShowAddCustomerModal(false);
                showToast.info("SĐT đã tồn tại. Đã chọn khách hàng cũ.");
                return;
            }

            // Create new customer
            const customer = {
                id: `CUST-${Date.now()}`,
                name: trimmedName,
                phone: phoneNumbers.join(", "),
                created_at: new Date().toISOString(),
                vehicleModel: newCustomer.vehicleModel?.trim() || "",
                licensePlate: newCustomer.licensePlate?.trim() || "",
            };

            try {
                const savedCustomer: Customer = await createCustomerMutation.mutateAsync(
                    customer
                );

                // Select the new customer
                setSelectedCustomer({
                    id: savedCustomer.id,
                    name: savedCustomer.name,
                    phone: savedCustomer.phone,
                    created_at: savedCustomer.created_at,
                });
                setCustomerSearch(savedCustomer.name);

                // Reset form and close modal
                setNewCustomer({
                    name: "",
                    phone: "",
                    vehicleModel: "",
                    licensePlate: "",
                });
                setShowAddCustomerModal(false);
                showToast.success("Đã thêm khách hàng mới!");
            } catch (error: any) {
                console.error("Error creating customer:", error);

                const errorCode = String(error?.code || error?.cause?.code || "");
                const errorMessage = String(error?.message || "");
                const isDuplicatePhone =
                    errorCode === "23505" ||
                    errorMessage.includes("customers_phone_unique") ||
                    errorMessage.includes("customers_phone_unique_idx") ||
                    errorMessage.toLowerCase().includes("duplicate key");

                if (isDuplicatePhone) {
                    const orFilters = phoneNumbers
                        .map((num) => `phone.ilike.%${num}%`)
                        .join(",");
                    const query = supabase
                        .from("customers")
                        .select("*")
                        .limit(1);

                    const { data: existingByPhone } = orFilters
                        ? await query.or(orFilters).maybeSingle()
                        : await query.ilike("phone", `%${trimmedPhone}%`).maybeSingle();

                    if (existingByPhone) {
                        setSelectedCustomer(existingByPhone as Customer);
                        setCustomerSearch(existingByPhone.name || trimmedPhone);
                        setShowAddCustomerModal(false);
                        showToast.info("SĐT đã tồn tại. Đã chọn khách hàng cũ.");
                        return;
                    }
                }

                showToast.error("Không thể thêm khách hàng. Vui lòng thử lại.");
            }
        },
        [newCustomer]
    );

    return {
        // State
        selectedCustomer,
        customerSearch,
        showCustomerDropdown,
        showAddCustomerModal,
        newCustomer,

        // Actions
        setSelectedCustomer,
        setCustomerSearch,
        setShowCustomerDropdown,
        setShowAddCustomerModal,
        setNewCustomer,
        handleSaveNewCustomer,

        // Computed
        filteredCustomers,
    };
}
