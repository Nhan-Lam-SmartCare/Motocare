import { useState, useMemo, useCallback, useEffect } from "react";
import type { Customer } from "../../../types";
import { showToast } from "../../../utils/toast";
import { supabase } from "../../../supabaseClient";
import { useDebounce } from "../../../hooks/useDebounce";

// Normalize Vietnamese text for search (remove diacritics)
function normalizeSearchText(text: string): string {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

const CUSTOMER_PAGE_SIZE = 20;

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
    isSearchingCustomer: boolean;
    hasMoreCustomers: boolean;

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
    handleLoadMoreCustomers: (e: React.MouseEvent) => void;

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

    // Server-side search states
    const [serverCustomers, setServerCustomers] = useState<Customer[]>([]);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
    const [customerPage, setCustomerPage] = useState(0);

    // Debounce customer search for server queries
    const debouncedCustomerSearch = useDebounce(customerSearch, 300);

    const extractPhoneNumbers = useCallback((value: string) => {
        const matches = value.match(/\d{8,12}/g);
        return matches ? matches.map((m) => m.trim()) : [];
    }, []);

    // Server-side search function
    const fetchCustomers = useCallback(async (page: number, searchTerm: string, isLoadMore = false) => {
        if (!searchTerm || !searchTerm.trim()) {
            if (!isLoadMore) setServerCustomers([]);
            return;
        }

        setIsSearchingCustomer(true);
        try {
            const from = page * CUSTOMER_PAGE_SIZE;
            const to = from + CUSTOMER_PAGE_SIZE - 1;

            // Extract digits for better phone search
            const searchDigits = searchTerm.replace(/\D/g, "");
            
            // Build OR query - search by name, phone, vehicle model, license plate
            const orConditions = [
                `name.ilike.%${searchTerm}%`,
                `vehiclemodel.ilike.%${searchTerm}%`,
                `licenseplate.ilike.%${searchTerm}%`
            ];
            // Include phone search if we have digits
            if (searchDigits.length > 0) {
                orConditions.push(`phone.ilike.%${searchDigits}%`);
            }

            const { data, error, count } = await supabase
                .from("customers")
                .select("*", { count: "exact", head: false })
                .or(orConditions.join(","))
                .range(from, to);

            if (!error && data) {
                if (isLoadMore) {
                    setServerCustomers((prev) => {
                        // Deduplicate
                        const newIds = new Set(data.map(c => c.id));
                        const filteredPrev = prev.filter(c => !newIds.has(c.id));
                        return [...filteredPrev, ...data as Customer[]];
                    });
                } else {
                    setServerCustomers(data as Customer[]);
                }

                // Check if we reached the end
                if (data.length < CUSTOMER_PAGE_SIZE || (count !== null && from + data.length >= count)) {
                    setHasMoreCustomers(false);
                } else {
                    setHasMoreCustomers(true);
                }
            }
        } catch (err) {
            console.error("Error searching customers:", err);
        } finally {
            setIsSearchingCustomer(false);
        }
    }, []);

    // Effect to trigger search when debounced term changes
    useEffect(() => {
        // Reset page when search term changes
        setCustomerPage(0);
        setHasMoreCustomers(true);

        // Only fetch if has search term
        if (debouncedCustomerSearch && debouncedCustomerSearch.trim()) {
            fetchCustomers(0, debouncedCustomerSearch.trim(), false);
        } else {
            setServerCustomers([]);
        }
    }, [debouncedCustomerSearch, fetchCustomers]);

    // Handler for Load More button
    const handleLoadMoreCustomers = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const nextPage = customerPage + 1;
        setCustomerPage(nextPage);
        fetchCustomers(nextPage, debouncedCustomerSearch.trim(), true);
    }, [customerPage, debouncedCustomerSearch, fetchCustomers]);

    // Filter customers based on search - combining local and server results
    const filteredCustomers = useMemo(() => {
        // Merge local customers and server customers, removing duplicates by ID
        const allCandidates = [...allCustomers, ...serverCustomers];
        const uniqueCandidates = Array.from(new Map(allCandidates.map(c => [c.id, c])).values());

        if (!customerSearch) return uniqueCandidates.slice(0, 20); // Show first 20 when no search
        
        const term = normalizeSearchText(customerSearch);
        const searchDigits = customerSearch.replace(/\D/g, "");

        return uniqueCandidates.filter((c) => {
            // Search by name (normalized - remove diacritics)
            const nameMatch = normalizeSearchText(c.name).includes(term);
            
            // Search by phone
            const phoneNumbers = extractPhoneNumbers(c.phone || "");
            const phoneMatch = searchDigits.length > 0
                ? phoneNumbers.some((num) => num.includes(searchDigits) || searchDigits.includes(num))
                : false;
            
            // Search by vehicle model
            const vehicleModelMatch = normalizeSearchText(c.vehicleModel || "").includes(term);
            
            // Search by license plate  
            const licensePlateMatch = normalizeSearchText(c.licensePlate || "").includes(term);
            
            // Search in vehicles array
            const vehicleMatch = c.vehicles?.some((v: any) =>
                normalizeSearchText(v.model || "").includes(term) ||
                normalizeSearchText(v.licensePlate || "").includes(term)
            );
            
            return Boolean(nameMatch || phoneMatch || vehicleModelMatch || licensePlateMatch || vehicleMatch);
        });
    }, [allCustomers, serverCustomers, customerSearch, extractPhoneNumbers]);

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
        isSearchingCustomer,
        hasMoreCustomers,

        // Actions
        setSelectedCustomer,
        setCustomerSearch,
        setShowCustomerDropdown,
        setShowAddCustomerModal,
        setNewCustomer,
        handleSaveNewCustomer,
        handleLoadMoreCustomers,

        // Computed
        filteredCustomers,
    };
}
