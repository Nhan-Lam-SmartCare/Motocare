import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  Part,
  Customer,
  Supplier,
  Sale,
  CartItem,
  WorkOrder,
  PaymentSource,
  CashTransaction,
  InventoryTransaction,
  Employee,
  PayrollRecord,
  Loan,
  LoanPayment,
  CustomerDebt,
  SupplierDebt,
} from "../types";
import { createCashTransaction } from "../lib/repository/cashTransactionsRepository";
import { updatePaymentSourceBalance } from "../lib/repository/paymentSourcesRepository";
import { showToast } from "../utils/toast";
import { mapRepoErrorForUser } from "../utils/errorMapping";
import { safeAudit } from "../lib/repository/auditLogsRepository";
import { supabase } from "../supabaseClient";

interface AppContextType {
  parts: Part[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  workOrders: WorkOrder[];
  cartItems: CartItem[];
  paymentSources: PaymentSource[];
  cashTransactions: CashTransaction[];
  inventoryTransactions: InventoryTransaction[];
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  customerDebts: CustomerDebt[];
  supplierDebts: SupplierDebt[];
  currentBranchId: string;
  // setters / mutators
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  upsertPart: (part: Partial<Part> & { id?: string }) => void;
  deletePart: (partId: string) => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  upsertCustomer: (customer: Partial<Customer> & { id?: string }) => Promise<string>;
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  upsertSupplier: (supplier: Partial<Supplier> & { id?: string }) => void;
  setWorkOrders: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
  upsertWorkOrder: (order: WorkOrder) => void;
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  clearCart: () => void;
  deleteSale: (saleId: string) => void;
  finalizeSale: (data: {
    items: CartItem[];
    discount: number;
    paymentMethod: "cash" | "bank";
    customer: { id?: string; name: string; phone?: string };
    note?: string;
  }) => void;
  setPaymentSources: React.Dispatch<React.SetStateAction<PaymentSource[]>>;
  setCashTransactions: React.Dispatch<React.SetStateAction<CashTransaction[]>>;
  recordInventoryTransaction: (tx: Omit<InventoryTransaction, "id">) => void;
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  upsertEmployee: (employee: Partial<Employee> & { id?: string }) => void;
  setPayrollRecords: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
  upsertPayrollRecord: (record: PayrollRecord) => void;
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  upsertLoan: (loan: Partial<Loan> & { id?: string }) => void;
  setLoanPayments: React.Dispatch<React.SetStateAction<LoanPayment[]>>;
  upsertLoanPayment: (payment: LoanPayment) => void;
  setCustomerDebts: React.Dispatch<React.SetStateAction<CustomerDebt[]>>;
  setSupplierDebts: React.Dispatch<React.SetStateAction<SupplierDebt[]>>;
  payCustomerDebts: (
    customerIds: string[],
    paymentMethod: "cash" | "bank",
    timestamp: string
  ) => void;
  paySupplierDebts: (
    supplierIds: string[],
    paymentMethod: "cash" | "bank",
    timestamp: string
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // --- State ---
  const [currentBranchId] = useState("CN1");

  // Load from localStorage on init (once)
  const getInitialData = () => {
    try {
      const stored = localStorage.getItem("motocare-data");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
    return {};
  };

  const initialData = getInitialData();

  const [parts, setParts] = useState<Part[]>(() => initialData?.parts || []);
  const [customers, setCustomers] = useState<Customer[]>(
    () => initialData?.customers || []
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(
    () => initialData?.suppliers || []
  );
  const [sales, setSales] = useState<Sale[]>(() => initialData?.sales || []);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(
    () => initialData?.workOrders || []
  );
  const [cartItems, setCartItems] = useState<CartItem[]>(
    () => initialData?.cartItems || []
  );
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>(
    () =>
      initialData?.paymentSources || [
        { id: "cash", name: "Tiền mặt", balance: { CN1: 0 }, isDefault: true },
        { id: "bank", name: "Tài khoản ngân hàng", balance: { CN1: 0 } },
      ]
  );
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(
    () => initialData?.cashTransactions || []
  );
  const [inventoryTransactions, setInventoryTransactions] = useState<
    InventoryTransaction[]
  >(() => initialData?.inventoryTransactions || []);
  const [employees, setEmployees] = useState<Employee[]>(
    () => initialData?.employees || []
  );
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(
    () => initialData?.payrollRecords || []
  );
  const [loans, setLoans] = useState<Loan[]>(() => initialData?.loans || []);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>(
    () => initialData?.loanPayments || []
  );
  const [customerDebts, setCustomerDebts] = useState<CustomerDebt[]>(
    () => initialData?.customerDebts || []
  );
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebt[]>(
    () => initialData?.supplierDebts || []
  );

  // --- Fetch paymentSources from DB on mount to sync with Supabase ---
  useEffect(() => {
    const fetchPaymentSources = async () => {
      try {
        console.log('[AppContext] 🔄 Fetching payment_sources from DB...');
        const [paymentSourcesRes, payrollRes] = await Promise.all([
          supabase.from("payment_sources").select("*"),
          supabase.from("payroll_records").select("*"),
        ]);

        if (!paymentSourcesRes.error && Array.isArray(paymentSourcesRes.data)) {
          if (paymentSourcesRes.data.length > 0) {
            console.log('[AppContext] ✅ Loaded payment_sources:', paymentSourcesRes.data);
            setPaymentSources(paymentSourcesRes.data);
          } else {
            console.warn('[AppContext] ⚠️ payment_sources empty on first fetch, retrying once...');
            const retryRes = await supabase.from("payment_sources").select("*");
            if (!retryRes.error && Array.isArray(retryRes.data) && retryRes.data.length > 0) {
              console.log('[AppContext] ✅ Loaded payment_sources after retry:', retryRes.data);
              setPaymentSources(retryRes.data);
            } else {
              console.warn('[AppContext] ⚠️ Keep existing paymentSources, skip overwrite with empty data');
            }
          }
        } else if (paymentSourcesRes.error) {
          console.error('[AppContext] ❌ Failed to load payment_sources:', paymentSourcesRes.error);
        }

        if (!payrollRes.error && payrollRes.data) {
          // Map DB columns back to camelCase for application use
          const mappedPayroll = payrollRes.data.map((r) => ({
            id: r.id,
            employeeId: r.employee_id,
            employeeName: r.employee_name,
            month: r.month,
            baseSalary: r.base_salary,
            allowances: r.allowances,
            bonus: r.bonus,
            deduction: r.deduction,
            workDays: r.work_days,
            standardWorkDays: r.standard_work_days,
            socialInsurance: r.social_insurance,
            healthInsurance: r.health_insurance,
            unemploymentInsurance: r.unemployment_insurance,
            personalIncomeTax: r.personal_income_tax,
            netSalary: r.net_salary,
            paymentStatus: r.payment_status,
            paymentDate: r.payment_date,
            paymentMethod: r.payment_method,
            notes: r.notes,
            branchId: r.branch_id,
            created_at: r.created_at,
          }));
          setPayrollRecords(mappedPayroll);
        }
      } catch (err) {
        console.error("Failed to fetch initial data from Supabase:", err);
      }
    };
    fetchPaymentSources();
  }, []);

  // --- Persist to localStorage ---
  useEffect(() => {
    const data = {
      parts,
      customers,
      suppliers,
      sales,
      workOrders,
      cartItems,
      paymentSources,
      cashTransactions,
      inventoryTransactions,
      employees,
      payrollRecords,
      loans,
      loanPayments,
      customerDebts,
      supplierDebts,
    };
    localStorage.setItem("motocare-data", JSON.stringify(data));
  }, [
    parts,
    customers,
    suppliers,
    sales,
    workOrders,
    cartItems,
    paymentSources,
    cashTransactions,
    inventoryTransactions,
    employees,
    payrollRecords,
    loans,
    loanPayments,
    customerDebts,
    supplierDebts,
  ]);

  // --- Helpers ---
  const upsertPart = useCallback(
    (part: Partial<Part> & { id?: string }) => {
      setParts((prev) => {
        if (part.id) {
          return prev.map((p) =>
            p.id === part.id ? ({ ...p, ...part } as Part) : p
          );
        }
        const id = `PART-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newPart: Part = {
          id,
          name: part.name || "Tên phụ tùng",
          sku: part.sku || id,
          stock: part.stock || { [currentBranchId]: 0 },
          retailPrice: part.retailPrice || { [currentBranchId]: 0 },
          wholesalePrice: part.wholesalePrice || { [currentBranchId]: 0 },
          category: part.category,
          description: part.description,
          warrantyPeriod: part.warrantyPeriod,
          created_at: new Date().toISOString(),
        };
        return [newPart, ...prev];
      });
    },
    [currentBranchId]
  );

  const deletePart = useCallback((partId: string) => {
    setParts((prev) => prev.filter((p) => p.id !== partId));
  }, []);

  const upsertCustomer = useCallback(
    async (customer: Partial<Customer> & { id?: string }): Promise<string> => {
      // Prepare customer data for database
      const customerId =
        customer.id ||
        `CUS-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // Check if customer exists in local state
      let existingCustomer = customers.find((c) => c.id === customer.id);

      // Nếu không có trong local state nhưng có ID, kiểm tra trong database
      if (!existingCustomer && customer.id) {
        try {
          const { data: dbCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("id", customer.id)
            .maybeSingle(); // Use maybeSingle to avoid 406 error when not found
          if (dbCustomer) {
            existingCustomer = { id: dbCustomer.id } as Customer;
          }
        } catch {
          // Không tìm thấy trong DB, sẽ insert mới
        }
      }

      try {
        if (existingCustomer) {
          // Update existing customer in Supabase
          const { error } = await supabase
            .from("customers")
            .update({
              name: customer.name || existingCustomer.name,
              phone: customer.phone || existingCustomer.phone || null,
              vehiclemodel:
                customer.vehicleModel || existingCustomer.vehicleModel || null,
              licenseplate:
                customer.licensePlate || existingCustomer.licensePlate || null,
              vehicles: customer.vehicles || existingCustomer.vehicles || [],
              status: customer.status || existingCustomer.status || "active",
              segment: customer.segment || existingCustomer.segment || "New",
              loyaltypoints:
                customer.loyaltyPoints ?? existingCustomer.loyaltyPoints ?? 0,
              totalspent:
                customer.totalSpent ?? existingCustomer.totalSpent ?? 0,
              visitcount:
                customer.visitCount ?? existingCustomer.visitCount ?? 0,
              lastvisit:
                customer.lastVisit || existingCustomer.lastVisit || null,
            })
            .eq("id", customer.id);

          if (error) {
            console.error("Error updating customer in Supabase:", error);
            showToast.error("Lỗi cập nhật khách hàng");
          }
        } else {
          // Kiểm tra số điện thoại trùng lặp trước khi thêm mới
          // CHỈ kiểm tra nếu có SĐT VÀ không phải update khách hàng hiện tại
          if (customer.phone) {
            const { data: duplicates } = await supabase
              .from("customers")
              .select("id, name, vehiclemodel, licenseplate, vehicles")
              .eq("phone", customer.phone)
              .limit(1);

            // Nếu tìm thấy khách hàng với cùng SĐT - CẬP NHẬT thay vì báo lỗi
            if (duplicates && duplicates.length > 0) {
              const existingId = duplicates[0].id;
              console.log(
                "Khách hàng đã tồn tại với SĐT này, chuyển sang UPDATE:",
                customer.phone,
                "ID:",
                existingId
              );

              // Cập nhật thông tin khách hàng hiện có (merge vehicles nếu cần)
              const existingVehicles = duplicates[0].vehicles || [];
              let updatedVehicles = existingVehicles;

              // Nếu có xe mới, thêm vào danh sách
              if (customer.vehicles && customer.vehicles.length > 0) {
                const newVehicle = customer.vehicles[0];
                const vehicleExists = existingVehicles.some(
                  (v: any) =>
                    v.licensePlate === newVehicle.licensePlate ||
                    v.id === newVehicle.id
                );
                if (!vehicleExists && newVehicle.licensePlate) {
                  updatedVehicles = [...existingVehicles, newVehicle];
                }
              }

              const { error: updateError } = await supabase
                .from("customers")
                .update({
                  name: customer.name || duplicates[0].name || "Khách hàng",
                  vehiclemodel:
                    customer.vehicleModel || duplicates[0].vehiclemodel || null,
                  licenseplate:
                    customer.licensePlate || duplicates[0].licenseplate || null,
                  vehicles: updatedVehicles,
                  lastvisit: new Date().toISOString(),
                })
                .eq("id", existingId);

              if (updateError) {
                console.error("Lỗi cập nhật khách hàng:", updateError);
              } else {
                console.log("Đã cập nhật khách hàng:", existingId);
              }

              // Cập nhật local state với ID thực của khách hàng
              setCustomers((prev) => {
                const existingIndex = prev.findIndex(
                  (c) => c.id === existingId
                );
                if (existingIndex >= 0) {
                  // Khách hàng đã có trong local state, cập nhật
                  return prev.map((c) =>
                    c.id === existingId
                      ? ({
                        ...c,
                        name: customer.name || c.name,
                        vehicleModel: customer.vehicleModel || c.vehicleModel,
                        licensePlate: customer.licensePlate || c.licensePlate,
                        vehicles: updatedVehicles,
                      } as Customer)
                      : c
                  );
                }
                // Khách hàng chưa có trong local state (có thể do pagination), thêm vào
                const updatedCustomer: Customer = {
                  id: existingId,
                  name: customer.name || duplicates[0].name || "Khách hàng",
                  phone: customer.phone,
                  vehicleModel: customer.vehicleModel || duplicates[0].vehiclemodel || undefined,
                  licensePlate: customer.licensePlate || duplicates[0].licenseplate || undefined,
                  vehicles: updatedVehicles,
                  created_at: new Date().toISOString(),
                } as Customer;
                return [updatedCustomer, ...prev];
              });
              return existingId; // Trả về ID thực của khách hàng đã tồn tại
            }
          }

          // Thêm khách hàng mới vào Supabase
          const { error } = await supabase.from("customers").insert([
            {
              id: customerId,
              name: customer.name || "Khách hàng",
              phone: customer.phone || null,
              vehiclemodel: customer.vehicleModel || null,
              licenseplate: customer.licensePlate || null,
              vehicles: customer.vehicles || [],
              status: customer.status || "active",
              segment: customer.segment || "New",
              loyaltypoints: customer.loyaltyPoints ?? 0,
              totalspent: customer.totalSpent ?? 0,
              visitcount: customer.visitCount ?? 0, // Mặc định 0, sẽ tăng khi có phiếu sửa/bán hàng
              lastvisit: customer.lastVisit || null, // Null nếu chưa có giao dịch
            },
          ]);

          if (error) {
            console.error("Lỗi thêm khách hàng vào Supabase:", error);
            showToast.error("Lỗi lưu khách hàng mới");
            return customerId; // Vẫn trả về ID mới dù lỗi
          } else {
            showToast.success("Đã lưu khách hàng mới");
            return customerId; // Trả về ID mới
          }
        }
      } catch (err) {
        console.error("Error saving customer to database:", err);
      }

      // Update local state (keep all fields for UI)
      setCustomers((prev) => {
        if (customer.id) {
          // Update existing customer
          const existingIndex = prev.findIndex((c) => c.id === customer.id);
          if (existingIndex >= 0) {
            return prev.map((c) =>
              c.id === customer.id ? ({ ...c, ...customer } as Customer) : c
            );
          }
          // ID provided but not found, create new with that ID
          const newCustomer: Customer = {
            id: customer.id,
            name: customer.name || "Khách hàng",
            phone: customer.phone,
            created_at: new Date().toISOString(),
            ...customer, // Spread all other fields
          } as Customer;
          return [newCustomer, ...prev];
        }
        // No ID provided, generate new
        const newCustomer: Customer = {
          id: customerId,
          name: customer.name || "Khách hàng",
          phone: customer.phone,
          created_at: new Date().toISOString(),
          ...customer, // Spread all other fields
        } as Customer;
        return [newCustomer, ...prev];
      });
      
      return customerId; // Trả về ID cuối cùng
    },
    [customers]
  );

  const upsertSupplier = useCallback(
    (supplier: Partial<Supplier> & { id?: string }) => {
      setSuppliers((prev) => {
        if (supplier.id) {
          return prev.map((s) =>
            s.id === supplier.id ? ({ ...s, ...supplier } as Supplier) : s
          );
        }
        const id = `SUP-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newSupplier: Supplier = {
          id,
          name: supplier.name || "Nhà cung cấp",
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          created_at: new Date().toISOString(),
        };
        return [newSupplier, ...prev];
      });
    },
    []
  );

  const upsertWorkOrder = useCallback((order: WorkOrder) => {
    setWorkOrders((prev) => {
      const existing = prev.find((w) => w.id === order.id);
      if (existing) {
        return prev.map((w) => (w.id === order.id ? order : w));
      }
      return [order, ...prev];
    });
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const finalizeSale = useCallback(
    (data: {
      items: CartItem[];
      discount: number;
      paymentMethod: "cash" | "bank";
      customer: { id?: string; name: string; phone?: string };
      note?: string;
    }) => {
      if (!data.items.length) return;
      // Compute subtotal and per-line discounts if present
      const lineSubtotal = data.items.reduce(
        (sum, it) => sum + it.sellingPrice * it.quantity,
        0
      );
      const lineDiscounts = data.items.reduce(
        (sum, it) => sum + (it.discount || 0),
        0
      );
      const total = lineSubtotal - lineDiscounts - data.discount;
      const saleId = `SALE-${Date.now()}`;
      const newSale: Sale = {
        id: saleId,
        date: new Date().toISOString(),
        items: data.items,
        subtotal: lineSubtotal,
        discount: data.discount + lineDiscounts,
        total,
        customer: data.customer,
        paymentMethod: data.paymentMethod,
        userId: "local-user",
        userName: "Local User",
        branchId: currentBranchId,
        cashTransactionId: undefined,
      };
      setSales((prev) => [newSale, ...prev]);

      // Adjust part stock
      setParts((prev) =>
        prev.map((p) => {
          const soldQty = data.items
            .filter((i) => i.partId === p.id)
            .reduce((s, i) => s + i.quantity, 0);
          if (!soldQty) return p;
          return {
            ...p,
            stock: {
              ...p.stock,
              [currentBranchId]: (p.stock[currentBranchId] || 0) - soldQty,
            },
          };
        })
      );

      // Record cash transaction
      const ctId = `CT-${Date.now()}`;
      const cashTx: CashTransaction = {
        id: ctId,
        type: "income",
        date: new Date().toISOString(),
        amount: total,
        notes: data.note || "Thu tiền bán hàng",
        paymentSourceId: data.paymentMethod,
        branchId: currentBranchId,
        category: "sale_income",
        saleId,
      };
      setCashTransactions((prev) => [cashTx, ...prev]);

      // Update payment source balance
      setPaymentSources((prev) =>
        prev.map((ps) =>
          ps.id === data.paymentMethod
            ? {
              ...ps,
              balance: {
                ...ps.balance,
                [currentBranchId]: (ps.balance[currentBranchId] || 0) + total,
              },
            }
            : ps
        )
      );

      clearCart();
    },
    [clearCart, currentBranchId]
  );

  const deleteSale = useCallback(
    (saleId: string) => {
      // Find the sale
      const sale = sales.find((s) => s.id === saleId);
      if (!sale) return;

      // Remove sale
      setSales((prev) => prev.filter((s) => s.id !== saleId));

      // Restore part stock
      setParts((prev) =>
        prev.map((p) => {
          const soldQty = sale.items
            .filter((i) => i.partId === p.id)
            .reduce((s, i) => s + i.quantity, 0);
          if (!soldQty) return p;
          return {
            ...p,
            stock: {
              ...p.stock,
              [currentBranchId]: (p.stock[currentBranchId] || 0) + soldQty,
            },
          };
        })
      );

      // Remove related cash transaction
      setCashTransactions((prev) => prev.filter((ct) => ct.saleId !== saleId));

      // Restore payment source balance
      setPaymentSources((prev) =>
        prev.map((ps) =>
          ps.id === sale.paymentMethod
            ? {
              ...ps,
              balance: {
                ...ps.balance,
                [currentBranchId]:
                  (ps.balance[currentBranchId] || 0) - sale.total,
              },
            }
            : ps
        )
      );
    },
    [sales, currentBranchId]
  );

  const recordInventoryTransaction = useCallback(
    (tx: Omit<InventoryTransaction, "id">) => {
      const id = `INV-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const full: InventoryTransaction = { id, ...tx };
      setInventoryTransactions((prev) => [full, ...prev]);
    },
    []
  );

  const upsertEmployee = useCallback(
    (employee: Partial<Employee> & { id?: string }) => {
      setEmployees((prev) => {
        if (employee.id) {
          return prev.map((e) =>
            e.id === employee.id ? ({ ...e, ...employee } as Employee) : e
          );
        }
        const id = `EMP-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newEmployee: Employee = {
          id,
          name: employee.name || "Nhân viên",
          phone: employee.phone,
          position: employee.position || "",
          baseSalary: employee.baseSalary || 0,
          startDate: employee.startDate || new Date().toISOString(),
          status: employee.status || "active",
          created_at: new Date().toISOString(),
        };
        return [newEmployee, ...prev];
      });
    },
    []
  );

  const upsertPayrollRecord = useCallback(async (record: PayrollRecord) => {
    // 1. Prepare DB data
    const dbData = {
      id: record.id,
      employee_id: record.employeeId,
      employee_name: record.employeeName,
      month: record.month,
      base_salary: record.baseSalary,
      allowances: record.allowances,
      bonus: record.bonus,
      deduction: record.deduction,
      work_days: record.workDays,
      standard_work_days: record.standardWorkDays,
      social_insurance: record.socialInsurance,
      health_insurance: record.healthInsurance,
      unemployment_insurance: record.unemploymentInsurance,
      personal_income_tax: record.personalIncomeTax,
      net_salary: record.netSalary,
      payment_status: record.paymentStatus,
      payment_date: record.paymentDate,
      payment_method: record.paymentMethod,
      notes: record.notes,
      branch_id: record.branchId,
      created_at: record.created_at || new Date().toISOString(),
    };

    // 2. Call Supabase
    const { error } = await supabase.from("payroll_records").upsert(dbData);

    if (error) {
      console.error("Error upserting payroll record:", error);
      showToast.error("Lỗi lưu bảng lương");
      return;
    }

    // 3. Update local state
    setPayrollRecords((prev) => {
      const existing = prev.find((p) => p.id === record.id);
      if (existing) {
        return prev.map((p) => (p.id === record.id ? record : p));
      }
      return [record, ...prev];
    });
  }, []);

  const upsertLoan = useCallback(
    (loan: Partial<Loan> & { id?: string }) => {
      setLoans((prev) => {
        if (loan.id) {
          return prev.map((l) =>
            l.id === loan.id ? ({ ...l, ...loan } as Loan) : l
          );
        }
        const id = `LOAN-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newLoan: Loan = {
          id,
          lenderName: loan.lenderName || "",
          loanType: loan.loanType || "bank",
          principal: loan.principal || 0,
          interestRate: loan.interestRate || 0,
          term: loan.term || 0,
          startDate: loan.startDate || new Date().toISOString(),
          endDate: loan.endDate || new Date().toISOString(),
          monthlyPayment: loan.monthlyPayment || 0,
          remainingAmount: loan.remainingAmount || loan.principal || 0,
          status: loan.status || "active",
          purpose: loan.purpose,
          collateral: loan.collateral,
          branchId: currentBranchId,
          created_at: new Date().toISOString(),
        };
        return [newLoan, ...prev];
      });
    },
    [currentBranchId]
  );

  const upsertLoanPayment = useCallback((payment: LoanPayment) => {
    setLoanPayments((prev) => {
      const existing = prev.find((p) => p.id === payment.id);
      if (existing) {
        return prev.map((p) => (p.id === payment.id ? payment : p));
      }
      return [payment, ...prev];
    });
  }, []);

  // Pay customer debts (bulk)
  const payCustomerDebts = useCallback(
    (
      customerIds: string[],
      paymentMethod: "cash" | "bank",
      timestamp: string
    ) => {
      let totalPaid = 0;

      // Update customer debts
      setCustomerDebts(
        (prev) =>
          prev
            .map((debt) => {
              if (
                customerIds.includes(debt.customerId) &&
                debt.branchId === currentBranchId
              ) {
                const amountToPay = debt.remainingAmount;
                totalPaid += amountToPay;

                return {
                  ...debt,
                  paidAmount: debt.totalAmount,
                  remainingAmount: 0,
                  status: "paid" as const,
                };
              }
              return debt;
            })
            .filter((debt) => debt.remainingAmount > 0) // Remove fully paid debts
      );

      // Ghi sổ quỹ và cập nhật số dư nguồn tiền trên Supabase
      if (totalPaid > 0) {
        void (async () => {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData?.user?.id || null;
          const cashRes = await createCashTransaction({
            type: "income",
            amount: totalPaid,
            branchId: currentBranchId,
            paymentSourceId: paymentMethod,
            date: timestamp,
            category: "debt_collection",
            notes: `Thu hết nợ cho ${customerIds.length} khách hàng`,
            recipient: `Thu nợ ${customerIds.length} khách hàng`,
          });
          if (!cashRes.ok) {
            showToast.error(mapRepoErrorForUser(cashRes.error));
            return;
          }
          const balRes = await updatePaymentSourceBalance(
            paymentMethod,
            currentBranchId,
            totalPaid
          );
          if (!balRes.ok) {
            showToast.error(mapRepoErrorForUser(balRes.error));
          }
          // Audit: thu nợ khách hàng
          void safeAudit(userId, {
            action: "debt.customer_pay",
            tableName: "customer_debts",
            oldData: null,
            newData: { customerIds, totalPaid, paymentMethod, timestamp },
          });
        })();
      }
    },
    [currentBranchId]
  );

  // Pay supplier debts (bulk)
  const paySupplierDebts = useCallback(
    (
      supplierIds: string[],
      paymentMethod: "cash" | "bank",
      timestamp: string
    ) => {
      let totalPaid = 0;

      // Update supplier debts
      setSupplierDebts(
        (prev) =>
          prev
            .map((debt) => {
              if (
                supplierIds.includes(debt.supplierId) &&
                debt.branchId === currentBranchId
              ) {
                const amountToPay = debt.remainingAmount;
                totalPaid += amountToPay;

                return {
                  ...debt,
                  paidAmount: debt.totalAmount,
                  remainingAmount: 0,
                  status: "paid" as const,
                };
              }
              return debt;
            })
            .filter((debt) => debt.remainingAmount > 0) // Remove fully paid debts
      );

      // Ghi sổ quỹ và cập nhật số dư nguồn tiền trên Supabase
      if (totalPaid > 0) {
        void (async () => {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData?.user?.id || null;
          const cashRes = await createCashTransaction({
            type: "expense",
            amount: totalPaid,
            branchId: currentBranchId,
            paymentSourceId: paymentMethod,
            date: timestamp,
            category: "debt_payment",
            notes: `Trả hết nợ cho ${supplierIds.length} nhà cung cấp`,
            recipient: `Trả nợ ${supplierIds.length} nhà cung cấp`,
          });
          if (!cashRes.ok) {
            showToast.error(mapRepoErrorForUser(cashRes.error));
            return;
          }
          const balRes = await updatePaymentSourceBalance(
            paymentMethod,
            currentBranchId,
            -totalPaid
          );
          if (!balRes.ok) {
            showToast.error(mapRepoErrorForUser(balRes.error));
          }
          // Audit: trả nợ nhà cung cấp
          void safeAudit(userId, {
            action: "debt.supplier_pay",
            tableName: "supplier_debts",
            oldData: null,
            newData: { supplierIds, totalPaid, paymentMethod, timestamp },
          });
        })();
      }
    },
    [currentBranchId]
  );

  return (
    <AppContext.Provider
      value={{
        parts,
        customers,
        suppliers,
        sales,
        workOrders,
        cartItems,
        paymentSources,
        cashTransactions,
        inventoryTransactions,
        employees,
        payrollRecords,
        loans,
        loanPayments,
        customerDebts,
        supplierDebts,
        currentBranchId,
        setParts,
        upsertPart,
        deletePart,
        setCustomers,
        upsertCustomer,
        setSuppliers,
        upsertSupplier,
        setWorkOrders,
        upsertWorkOrder,
        setCartItems,
        clearCart,
        deleteSale,
        finalizeSale,
        setPaymentSources,
        setCashTransactions,
        recordInventoryTransaction,
        setEmployees,
        upsertEmployee,
        setPayrollRecords,
        upsertPayrollRecord,
        setLoans,
        upsertLoan,
        setLoanPayments,
        upsertLoanPayment,
        setCustomerDebts,
        setSupplierDebts,
        payCustomerDebts,
        paySupplierDebts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext phải dùng bên trong AppProvider");
  return ctx;
};
