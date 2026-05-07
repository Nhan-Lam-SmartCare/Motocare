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

function normalizePlate(text: string): string {
    if (!text) return "";
    return text.toLowerCase().replace(/[^a-z0-9]/g, "");
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
    showEditCustomerModal: boolean;
    newCustomer: NewCustomerData;
    isSearchingCustomer: boolean;
    hasMoreCustomers: boolean;

    // Actions
    setSelectedCustomer: (customer: Customer | null) => void;
    setCustomerSearch: (search: string) => void;
    setShowCustomerDropdown: (show: boolean) => void;
    setShowAddCustomerModal: (show: boolean) => void;
    setShowEditCustomerModal: (show: boolean) => void;
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
) {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
        null
    );
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
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
    const debouncedCustomerSearch = useDebounce(customerSearch, 200);

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
            const normalizedTerm = normalizeSearchText(searchTerm);
            const plateTerm = normalizePlate(searchTerm);

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
            if (normalizedTerm && normalizedTerm !== searchTerm.toLowerCase()) {
                orConditions.push(
                    `name.ilike.%${normalizedTerm}%`,
                    `vehiclemodel.ilike.%${normalizedTerm}%`
                );
            }
            if (plateTerm && plateTerm !== searchTerm.toLowerCase()) {
                orConditions.push(`licenseplate.ilike.%${plateTerm}%`);
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
        const tokens = term.split(/\s+/).filter(Boolean);
        const searchDigits = customerSearch.replace(/\D/g, "");
        const searchPlate = normalizePlate(customerSearch);

        const searchIndex = new Map<string, {
            text: string;
            name: string;
            phoneDigits: string;
            plateCompacts: string[];
        }>();

        uniqueCandidates.forEach((c) => {
            const vehicles = (c.vehicles || []) as Array<{ licensePlate?: string; model?: string }>;
            const plates = [c.licensePlate || "", ...vehicles.map((v) => v.licensePlate || "")]
                .map((p) => p.trim())
                .filter(Boolean);
            const models = [c.vehicleModel || "", ...vehicles.map((v) => v.model || "")]
                .map((m) => m.trim())
                .filter(Boolean);

            const text = normalizeSearchText(
                [c.name || "", c.email || "", ...models, ...plates].join(" ")
            );
            const phoneDigits = (c.phone || "").replace(/\D/g, "");
            const plateCompacts = plates.map((p) => normalizePlate(p)).filter(Boolean);

            searchIndex.set(c.id, {
                text,
                name: normalizeSearchText(c.name || ""),
                phoneDigits,
                plateCompacts,
            });
        });

        const scored = uniqueCandidates
            .map((c) => {
                const index = searchIndex.get(c.id);
                if (!index) return null;

                let score = 0;

                if (searchDigits.length > 0 && index.phoneDigits) {
                    if (index.phoneDigits === searchDigits) score += 120;
                    else if (index.phoneDigits.startsWith(searchDigits)) score += 100;
                    else if (index.phoneDigits.includes(searchDigits)) score += 80;
                }

                if (searchPlate.length > 0 && index.plateCompacts.length > 0) {
                    for (const plate of index.plateCompacts) {
                        if (plate === searchPlate) score = Math.max(score, 110);
                        else if (plate.startsWith(searchPlate)) score = Math.max(score, 90);
                        else if (plate.includes(searchPlate)) score = Math.max(score, 70);
                    }
                }

                if (tokens.length > 0) {
                    const name = index.name;
                    if (name === term) score = Math.max(score, 60);
                    else if (name.startsWith(term)) score = Math.max(score, 50);

                    const tokenMatch = tokens.every((t) => index.text.includes(t));
                    if (tokenMatch) score = Math.max(score, 40 + tokens.length * 2);
                }

                return score > 0 ? { customer: c, score } : null;
            })
            .filter((item): item is { customer: Customer; score: number } => Boolean(item));

        scored.sort((a, b) => b.score - a.score || a.customer.name.localeCompare(b.customer.name));
        return scored.map((item) => item.customer);
    }, [allCustomers, serverCustomers, customerSearch, extractPhoneNumbers]);

    // Custom handler for showing the Add Customer Modal
    // This allows us to auto-fill the form with the user's search query
    const handleShowAddCustomerModal = useCallback((show: boolean) => {
        if (show && customerSearch.trim()) {
            const searchTerm = customerSearch.trim();
            // Try to extract phone numbers (sequences of 8-12 digits)
            const phoneNumbers = extractPhoneNumbers(searchTerm);

            let initialName = "";
            let initialPhone = "";

            if (phoneNumbers.length > 0) {
                initialPhone = phoneNumbers[0];
                // Remove the phone number from the search term to guess the name
                initialName = searchTerm.replace(initialPhone, "").trim();
                // Clean up any trailing/leading dashes or commas
                initialName = initialName.replace(/^[-,\s]+|[-,\s]+$/g, "");
            } else {
                // If no phone number resembles digits, assume it's entirely a name
                initialName = searchTerm;
            }

            setNewCustomer(prev => ({
                ...prev,
                name: initialName,
                phone: initialPhone
            }));
        } else if (!show) {
            // Reset form when closing
            setNewCustomer({
                name: "",
                phone: "",
                vehicleModel: "",
                licensePlate: "",
            });
        }

        setShowAddCustomerModal(show);
    }, [customerSearch, extractPhoneNumbers]);

    // Handle save new customer
    const handleSaveNewCustomer = useCallback(
        async (customers: Customer[], createCustomerMutation: any) => {
            const trimmedName = newCustomer.name.trim();
            const trimmedPhone = newCustomer.phone.trim();
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
                    ...savedCustomer,
                    vehicleModel: (savedCustomer as any).vehicleModel ?? (savedCustomer as any).vehiclemodel,
                    licensePlate: (savedCustomer as any).licensePlate ?? (savedCustomer as any).licenseplate,
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
        [extractPhoneNumbers, newCustomer]
    );

    return {
        // State
        selectedCustomer,
        customerSearch,
        showCustomerDropdown,
        showAddCustomerModal,
        showEditCustomerModal,
        newCustomer,
        isSearchingCustomer,
        hasMoreCustomers,

        // Actions
        setSelectedCustomer,
        setCustomerSearch,
        setShowCustomerDropdown,
        setShowAddCustomerModal: handleShowAddCustomerModal,
        setShowEditCustomerModal,
        setNewCustomer,
        handleSaveNewCustomer,
        handleLoadMoreCustomers,

        // Computed
        filteredCustomers,
    };
}
