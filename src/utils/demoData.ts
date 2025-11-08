import {
  Customer,
  Part,
  Sale,
  Employee,
  PayrollRecord,
  Loan,
  LoanPayment,
  CashTransaction,
  Supplier,
  WorkOrder,
  CustomerDebt,
  SupplierDebt,
} from "../types";

// Hàm generate ID ngẫu nhiên
const generateId = () => Math.random().toString(36).substr(2, 9);

// Ngày hiện tại và các ngày trong quá khứ
const today = new Date();
const getDateDaysAgo = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

// Demo Customers
export const demoCustomers: Customer[] = [
  {
    id: generateId(),
    name: "Nguyễn Văn An",
    phone: "0901234567",
    email: "annv@gmail.com",
    vehicleModel: "Honda SH 2023",
    licensePlate: "30A-12345",
    status: "active",
    segment: "VIP",
    loyaltyPoints: 5800,
    totalSpent: 29000000,
    visitCount: 32,
    lastVisit: getDateDaysAgo(3),
    created_at: getDateDaysAgo(180),
  },
  {
    id: generateId(),
    name: "Trần Thị Bình",
    phone: "0912345678",
    email: "binhtt@gmail.com",
    vehicleModel: "Yamaha Exciter 150",
    licensePlate: "30B-67890",
    status: "active",
    segment: "Loyal",
    loyaltyPoints: 2500,
    totalSpent: 12500000,
    visitCount: 15,
    lastVisit: getDateDaysAgo(7),
    created_at: getDateDaysAgo(150),
  },
  {
    id: generateId(),
    name: "Lê Minh Cường",
    phone: "0923456789",
    email: "cuonglm@gmail.com",
    vehicleModel: "Honda Vision 2022",
    licensePlate: "30C-11111",
    status: "active",
    segment: "Potential",
    loyaltyPoints: 680,
    totalSpent: 3400000,
    visitCount: 5,
    lastVisit: getDateDaysAgo(15),
    created_at: getDateDaysAgo(90),
  },
  {
    id: generateId(),
    name: "Phạm Thu Hà",
    phone: "0934567890",
    email: "hapt@gmail.com",
    vehicleModel: "Suzuki Raider 150",
    licensePlate: "30D-22222",
    status: "active",
    segment: "New",
    loyaltyPoints: 150,
    totalSpent: 750000,
    visitCount: 2,
    lastVisit: getDateDaysAgo(5),
    created_at: getDateDaysAgo(30),
  },
  {
    id: generateId(),
    name: "Võ Thanh Tùng",
    phone: "0945678901",
    email: "tungvt@gmail.com",
    vehicleModel: "Honda Air Blade",
    licensePlate: "30E-33333",
    status: "active",
    segment: "VIP",
    loyaltyPoints: 4200,
    totalSpent: 21000000,
    visitCount: 28,
    lastVisit: getDateDaysAgo(2),
    created_at: getDateDaysAgo(200),
  },
];

// Demo Parts
export const demoParts: Part[] = [
  {
    id: generateId(),
    name: "Nhớt Motul 7100 10W40",
    sku: "MOTUL-7100",
    retailPrice: { CN1: 180000 },
    wholesalePrice: { CN1: 150000 },
    stock: { CN1: 50 },
    category: "Nhớt động cơ",
    description: "Nhớt cao cấp cho xe côn tay",
    created_at: getDateDaysAgo(365),
  },
  {
    id: generateId(),
    name: "Lốp Michelin Pilot Street",
    sku: "MICH-PS",
    retailPrice: { CN1: 450000 },
    wholesalePrice: { CN1: 380000 },
    stock: { CN1: 30 },
    category: "Lốp xe",
    description: "Lốp chất lượng cao",
    created_at: getDateDaysAgo(300),
  },
  {
    id: generateId(),
    name: "Phanh ABS Honda SH",
    sku: "PHANH-SH",
    retailPrice: { CN1: 350000 },
    wholesalePrice: { CN1: 280000 },
    stock: { CN1: 8 },
    category: "Phụ tùng phanh",
    description: "Má phanh chính hãng",
    created_at: getDateDaysAgo(250),
  },
  {
    id: generateId(),
    name: "Ắc quy GS GTZ5S",
    sku: "ACQUY-GS",
    retailPrice: { CN1: 380000 },
    wholesalePrice: { CN1: 320000 },
    stock: { CN1: 25 },
    category: "Ắc quy",
    description: "Ắc quy khô, bảo hành 6 tháng",
    created_at: getDateDaysAgo(200),
  },
  {
    id: generateId(),
    name: "Nhớt Shell Advance AX7",
    sku: "SHELL-AX7",
    retailPrice: { CN1: 120000 },
    wholesalePrice: { CN1: 95000 },
    stock: { CN1: 80 },
    category: "Nhớt động cơ",
    description: "Nhớt bán tổng hợp",
    created_at: getDateDaysAgo(180),
  },
  {
    id: generateId(),
    name: "Lọc gió K&N",
    sku: "KN-FILTER",
    retailPrice: { CN1: 250000 },
    wholesalePrice: { CN1: 200000 },
    stock: { CN1: 15 },
    category: "Lọc",
    description: "Lọc gió cao cấp, có thể rửa",
    created_at: getDateDaysAgo(150),
  },
  {
    id: generateId(),
    name: "Xích MTKRACING 428",
    sku: "XICH-MTK",
    retailPrice: { CN1: 280000 },
    wholesalePrice: { CN1: 230000 },
    stock: { CN1: 5 },
    category: "Xích nhông",
    description: "Xích chất lượng cao",
    created_at: getDateDaysAgo(120),
  },
];

// Demo Employees
export const demoEmployees: Employee[] = [
  {
    id: generateId(),
    name: "Nguyễn Văn Đức",
    phone: "0987654321",
    email: "duc.nv@motocare.vn",
    position: "Kỹ thuật viên chính",
    department: "Kỹ thuật",
    baseSalary: 12000000,
    allowances: 500000,
    startDate: getDateDaysAgo(730),
    status: "active",
    branchId: "CN1",
    created_at: getDateDaysAgo(730),
  },
  {
    id: generateId(),
    name: "Trần Minh Hoàng",
    phone: "0976543210",
    email: "hoang.tm@motocare.vn",
    position: "Nhân viên bán hàng",
    department: "Kinh doanh",
    baseSalary: 8000000,
    allowances: 300000,
    startDate: getDateDaysAgo(365),
    status: "active",
    branchId: "CN1",
    created_at: getDateDaysAgo(365),
  },
  {
    id: generateId(),
    name: "Lê Thị Mai",
    phone: "0965432109",
    email: "mai.lt@motocare.vn",
    position: "Kế toán",
    department: "Tài chính",
    baseSalary: 10000000,
    allowances: 400000,
    startDate: getDateDaysAgo(500),
    status: "active",
    branchId: "CN1",
    created_at: getDateDaysAgo(500),
  },
  {
    id: generateId(),
    name: "Phạm Văn Sơn",
    phone: "0954321098",
    email: "son.pv@motocare.vn",
    position: "Kỹ thuật viên",
    department: "Kỹ thuật",
    baseSalary: 9000000,
    allowances: 300000,
    startDate: getDateDaysAgo(200),
    status: "active",
    branchId: "CN1",
    created_at: getDateDaysAgo(200),
  },
];

// Demo Sales (30 ngày gần đây)
export const demoSales: Sale[] = [
  // Sales 1-5 ngày trước
  ...Array.from({ length: 5 }, (_, i) => {
    const items = [
      {
        partId: demoParts[0].id,
        partName: demoParts[0].name,
        sku: demoParts[0].sku,
        quantity: 2,
        sellingPrice: demoParts[0].retailPrice["CN1"],
        stockSnapshot: demoParts[0].stock["CN1"],
      },
      {
        partId: demoParts[1].id,
        partName: demoParts[1].name,
        sku: demoParts[1].sku,
        quantity: 1,
        sellingPrice: demoParts[1].retailPrice["CN1"],
        stockSnapshot: demoParts[1].stock["CN1"],
      },
    ];
    const subtotal = items.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );
    return {
      id: generateId(),
      date: getDateDaysAgo(i),
      customer: {
        id: demoCustomers[i % demoCustomers.length].id,
        name: demoCustomers[i % demoCustomers.length].name,
        phone: demoCustomers[i % demoCustomers.length].phone,
      },
      items,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod: "cash" as const,
      userId: "demo-user",
      userName: "Demo User",
      branchId: "CN1",
    };
  }),
  // Sales 6-15 ngày trước
  ...Array.from({ length: 10 }, (_, i) => {
    const part = demoParts[(i + 1) % demoParts.length];
    const items = [
      {
        partId: part.id,
        partName: part.name,
        sku: part.sku,
        quantity: 1,
        sellingPrice: part.retailPrice["CN1"],
        stockSnapshot: part.stock["CN1"],
      },
    ];
    const subtotal = items.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );
    return {
      id: generateId(),
      date: getDateDaysAgo(i + 6),
      customer: {
        id: demoCustomers[(i + 2) % demoCustomers.length].id,
        name: demoCustomers[(i + 2) % demoCustomers.length].name,
        phone: demoCustomers[(i + 2) % demoCustomers.length].phone,
      },
      items,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod:
        Math.random() > 0.5 ? ("cash" as const) : ("bank" as const),
      userId: "demo-user",
      userName: "Demo User",
      branchId: "CN1",
    };
  }),
  // Sales 16-30 ngày trước
  ...Array.from({ length: 15 }, (_, i) => {
    const part = demoParts[i % demoParts.length];
    const qty = Math.floor(Math.random() * 3) + 1;
    const items = [
      {
        partId: part.id,
        partName: part.name,
        sku: part.sku,
        quantity: qty,
        sellingPrice: part.retailPrice["CN1"],
        stockSnapshot: part.stock["CN1"],
      },
    ];
    const subtotal = items.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );
    return {
      id: generateId(),
      date: getDateDaysAgo(i + 16),
      customer: {
        id: demoCustomers[(i + 3) % demoCustomers.length].id,
        name: demoCustomers[(i + 3) % demoCustomers.length].name,
        phone: demoCustomers[(i + 3) % demoCustomers.length].phone,
      },
      items,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod:
        Math.random() > 0.5 ? ("cash" as const) : ("bank" as const),
      userId: "demo-user",
      userName: "Demo User",
      branchId: "CN1",
    };
  }),
];

// Demo Payroll Records
export const demoPayrollRecords: PayrollRecord[] = demoEmployees.flatMap(
  (emp) => [
    // Tháng hiện tại
    {
      id: generateId(),
      employeeId: emp.id,
      employeeName: emp.name,
      month: today.toISOString().slice(0, 7), // YYYY-MM
      baseSalary: emp.baseSalary,
      allowances: emp.allowances || 0,
      bonus: 1000000,
      deduction: 0,
      workDays: 26,
      standardWorkDays: 26,
      socialInsurance: 0,
      healthInsurance: 0,
      unemploymentInsurance: 0,
      personalIncomeTax: 0,
      netSalary: emp.baseSalary + (emp.allowances || 0) + 1000000,
      paymentStatus: "pending" as const,
      branchId: "CN1",
      created_at: today.toISOString(),
    },
    // Tháng trước
    {
      id: generateId(),
      employeeId: emp.id,
      employeeName: emp.name,
      month: new Date(today.getFullYear(), today.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 7),
      baseSalary: emp.baseSalary,
      allowances: emp.allowances || 0,
      bonus: 800000,
      deduction: 0,
      workDays: 26,
      standardWorkDays: 26,
      socialInsurance: 0,
      healthInsurance: 0,
      unemploymentInsurance: 0,
      personalIncomeTax: 0,
      netSalary: emp.baseSalary + (emp.allowances || 0) + 800000,
      paymentStatus: "paid" as const,
      paymentDate: getDateDaysAgo(5),
      paymentMethod: "bank" as const,
      branchId: "CN1",
      created_at: getDateDaysAgo(35),
    },
  ]
);

// Demo Loans
export const demoLoans: Loan[] = [
  {
    id: generateId(),
    lenderName: "Ngân hàng Vietcombank",
    loanType: "bank" as const,
    principal: 100000000,
    interestRate: 12,
    term: 12,
    startDate: getDateDaysAgo(180),
    endDate: new Date(
      today.getFullYear() + 1,
      today.getMonth(),
      today.getDate()
    ).toISOString(),
    purpose: "Mở rộng cửa hàng",
    remainingAmount: 75000000,
    monthlyPayment: 10000000,
    status: "active" as const,
    branchId: "CN1",
    created_at: getDateDaysAgo(180),
  },
  {
    id: generateId(),
    lenderName: "Ngân hàng Techcombank",
    loanType: "bank" as const,
    principal: 50000000,
    interestRate: 10,
    term: 6,
    startDate: getDateDaysAgo(90),
    endDate: new Date(
      today.getFullYear(),
      today.getMonth() + 6,
      today.getDate()
    ).toISOString(),
    purpose: "Nhập hàng",
    remainingAmount: 40000000,
    monthlyPayment: 9000000,
    status: "active" as const,
    branchId: "CN1",
    created_at: getDateDaysAgo(90),
  },
];

// Demo Cash Transactions
export const demoCashTransactions: CashTransaction[] = [
  // Thu từ bán hàng
  ...demoSales.slice(0, 10).map((sale) => ({
    id: generateId(),
    type: "income" as const,
    category: "sale_income" as const,
    amount: sale.total,
    date: sale.date,
    notes: `Bán hàng cho ${sale.customer.name}`,
    paymentSourceId: sale.paymentMethod === "cash" ? "cash" : "bank",
    recipient: sale.customer.name,
    branchId: "CN1",
  })),
  // Chi trả lương
  {
    id: generateId(),
    type: "expense" as const,
    category: "salary" as const,
    amount: 12500000,
    date: getDateDaysAgo(5),
    notes: `Trả lương tháng trước - ${demoEmployees[0].name}`,
    paymentSourceId: "bank",
    recipient: demoEmployees[0].name,
    branchId: "CN1",
  },
  // Chi trả nợ vay
  {
    id: generateId(),
    type: "expense" as const,
    category: "loan_payment" as const,
    amount: 10000000,
    date: getDateDaysAgo(10),
    notes: "Trả nợ vay - Vietcombank (Gốc: 8000000, Lãi: 2000000)",
    paymentSourceId: "bank",
    recipient: "Ngân hàng Vietcombank",
    branchId: "CN1",
  },
  // Chi mua hàng
  {
    id: generateId(),
    type: "expense" as const,
    category: "inventory_purchase" as const,
    amount: 15000000,
    date: getDateDaysAgo(15),
    notes: "Nhập phụ tùng",
    paymentSourceId: "cash",
    branchId: "CN1",
  },
  // Chi khác
  {
    id: generateId(),
    type: "expense" as const,
    category: "other_expense" as const,
    amount: 3000000,
    date: getDateDaysAgo(7),
    notes: "Tiền điện, nước, internet tháng này",
    paymentSourceId: "cash",
    branchId: "CN1",
  },
];

// Demo Suppliers
export const demoSuppliers: Supplier[] = [
  {
    id: generateId(),
    name: "Công ty TNHH Phụ tùng Minh Anh",
    phone: "0281234567",
    email: "minhanh@parts.vn",
    address: "123 Nguyễn Văn Linh, Q.7, TP.HCM",
    created_at: getDateDaysAgo(365),
  },
  {
    id: generateId(),
    name: "Nhà phân phối Honda chính hãng",
    phone: "0282345678",
    email: "honda@distributor.vn",
    address: "456 Xa lộ Hà Nội, Q.9, TP.HCM",
    created_at: getDateDaysAgo(300),
  },
  {
    id: generateId(),
    name: "Yamaha Parts Vietnam",
    phone: "0283456789",
    email: "yamaha@parts.vn",
    address: "789 Lê Văn Việt, Q.9, TP.HCM",
    created_at: getDateDaysAgo(250),
  },
];

// Demo Customer Debts (Công nợ khách hàng)
export const demoCustomerDebts = [
  {
    id: generateId(),
    customerId: demoCustomers[0].id,
    customerName: demoCustomers[0].name,
    phone: demoCustomers[0].phone,
    licensePlate: demoCustomers[0].licensePlate,
    description: "Thay nhớt + lọc gió + bugi (Đơn hàng #DH001)",
    totalAmount: 850000,
    paidAmount: 500000,
    remainingAmount: 350000,
    createdDate: getDateDaysAgo(10),
    branchId: "CN1",
  },
  {
    id: generateId(),
    customerId: demoCustomers[1].id,
    customerName: demoCustomers[1].name,
    phone: demoCustomers[1].phone,
    licensePlate: demoCustomers[1].licensePlate,
    description: "Thay lốp Michelin Pilot Street (Đơn hàng #DH002)",
    totalAmount: 1250000,
    paidAmount: 0,
    remainingAmount: 1250000,
    createdDate: getDateDaysAgo(7),
    branchId: "CN1",
  },
  {
    id: generateId(),
    customerId: demoCustomers[2].id,
    customerName: demoCustomers[2].name,
    phone: demoCustomers[2].phone,
    licensePlate: demoCustomers[2].licensePlate,
    description: "Thay má phanh trước/sau + dầu phanh (Đơn hàng #DH003)",
    totalAmount: 980000,
    paidAmount: 300000,
    remainingAmount: 680000,
    createdDate: getDateDaysAgo(5),
    branchId: "CN1",
  },
  {
    id: generateId(),
    customerId: demoCustomers[3].id,
    customerName: demoCustomers[3].name,
    phone: demoCustomers[3].phone,
    licensePlate: demoCustomers[3].licensePlate,
    description: "Thay ắc quy GS 12V-7Ah (Đơn hàng #DH004)",
    totalAmount: 550000,
    paidAmount: 0,
    remainingAmount: 550000,
    createdDate: getDateDaysAgo(3),
    branchId: "CN1",
  },
  {
    id: generateId(),
    customerId: demoCustomers[4].id,
    customerName: demoCustomers[4].name,
    phone: demoCustomers[4].phone,
    licensePlate: demoCustomers[4].licensePlate,
    description: "Bảo dưỡng định kỳ 5000km (Đơn hàng #DH005)",
    totalAmount: 1850000,
    paidAmount: 1000000,
    remainingAmount: 850000,
    createdDate: getDateDaysAgo(2),
    branchId: "CN1",
  },
];

// Demo Supplier Debts (Công nợ nhà cung cấp)
export const demoSupplierDebts = [
  {
    id: generateId(),
    supplierId: demoSuppliers[0].id,
    supplierName: demoSuppliers[0].name,
    description: "Nhập 50 chai dầu nhớt Shell 10W40 (Đơn nhập #PN001)",
    totalAmount: 6000000,
    paidAmount: 3000000,
    remainingAmount: 3000000,
    createdDate: getDateDaysAgo(15),
    branchId: "CN1",
  },
  {
    id: generateId(),
    supplierId: demoSuppliers[1].id,
    supplierName: demoSuppliers[1].name,
    description: "Nhập lô phụ tùng chính hãng Honda (Đơn nhập #PN002)",
    totalAmount: 25000000,
    paidAmount: 15000000,
    remainingAmount: 10000000,
    createdDate: getDateDaysAgo(12),
    branchId: "CN1",
  },
  {
    id: generateId(),
    supplierId: demoSuppliers[2].id,
    supplierName: demoSuppliers[2].name,
    description: "Nhập 20 bộ má phanh Yamaha Exciter (Đơn nhập #PN003)",
    totalAmount: 4500000,
    paidAmount: 0,
    remainingAmount: 4500000,
    createdDate: getDateDaysAgo(8),
    branchId: "CN1",
  },
  {
    id: generateId(),
    supplierId: demoSuppliers[0].id,
    supplierName: demoSuppliers[0].name,
    description: "Nhập 30 lốc lọc dầu + lọc gió (Đơn nhập #PN004)",
    totalAmount: 3200000,
    paidAmount: 3200000,
    remainingAmount: 0,
    createdDate: getDateDaysAgo(5),
    branchId: "CN1",
  },
];

// Demo Work Orders (Phiếu sửa chữa)
export const demoWorkOrders: WorkOrder[] = [
  // Phiếu đang sửa
  {
    id: generateId(),
    creationDate: getDateDaysAgo(1),
    customerName: demoCustomers[0].name,
    customerPhone: demoCustomers[0].phone,
    vehicleModel: demoCustomers[0].vehicleModel,
    licensePlate: demoCustomers[0].licensePlate,
    issueDescription: "Thay nhớt định kỳ, kiểm tra phanh",
    technicianName: demoEmployees[0].name,
    status: "Đang sửa",
    laborCost: 150000,
    partsUsed: [
      {
        partId: demoParts[0].id,
        partName: demoParts[0].name,
        sku: demoParts[0].sku,
        quantity: 1,
        price: demoParts[0].retailPrice["CN1"],
      },
    ],
    discount: 0,
    total: 150000 + demoParts[0].retailPrice["CN1"],
    branchId: "CN1",
    depositAmount: 200000,
    depositDate: getDateDaysAgo(1),
    paymentStatus: "partial",
    totalPaid: 200000,
    remainingAmount: 150000 + demoParts[0].retailPrice["CN1"] - 200000,
  },
  // Phiếu tiếp nhận
  {
    id: generateId(),
    creationDate: getDateDaysAgo(0),
    customerName: demoCustomers[1].name,
    customerPhone: demoCustomers[1].phone,
    vehicleModel: demoCustomers[1].vehicleModel,
    licensePlate: demoCustomers[1].licensePlate,
    issueDescription: "Xe khó nổ, kiểm tra hệ thống điện",
    technicianName: demoEmployees[3].name,
    status: "Tiếp nhận",
    laborCost: 300000,
    partsUsed: [],
    discount: 0,
    total: 300000,
    branchId: "CN1",
    paymentStatus: "unpaid",
  },
  // Phiếu đã sửa xong
  {
    id: generateId(),
    creationDate: getDateDaysAgo(3),
    customerName: demoCustomers[2].name,
    customerPhone: demoCustomers[2].phone,
    vehicleModel: demoCustomers[2].vehicleModel,
    licensePlate: demoCustomers[2].licensePlate,
    issueDescription: "Thay lốp trước, cân chỉnh bánh xe",
    technicianName: demoEmployees[0].name,
    status: "Đã sửa xong",
    laborCost: 100000,
    partsUsed: [
      {
        partId: demoParts[1].id,
        partName: demoParts[1].name,
        sku: demoParts[1].sku,
        quantity: 1,
        price: demoParts[1].retailPrice["CN1"],
      },
    ],
    discount: 20000,
    total: 100000 + demoParts[1].retailPrice["CN1"] - 20000,
    branchId: "CN1",
    paymentStatus: "unpaid",
  },
  // Phiếu đã trả máy
  {
    id: generateId(),
    creationDate: getDateDaysAgo(5),
    customerName: demoCustomers[3].name,
    customerPhone: demoCustomers[3].phone,
    vehicleModel: demoCustomers[3].vehicleModel,
    licensePlate: demoCustomers[3].licensePlate,
    issueDescription: "Thay ắc quy, kiểm tra hệ thống sạc",
    technicianName: demoEmployees[3].name,
    status: "Trả máy",
    laborCost: 50000,
    partsUsed: [
      {
        partId: demoParts[3].id,
        partName: demoParts[3].name,
        sku: demoParts[3].sku,
        quantity: 1,
        price: demoParts[3].retailPrice["CN1"],
      },
    ],
    discount: 0,
    total: 50000 + demoParts[3].retailPrice["CN1"],
    branchId: "CN1",
    depositAmount: 100000,
    depositDate: getDateDaysAgo(5),
    paymentStatus: "paid",
    paymentMethod: "cash",
    totalPaid: 50000 + demoParts[3].retailPrice["CN1"],
    remainingAmount: 0,
    paymentDate: getDateDaysAgo(5),
  },
  // Phiếu đang sửa 2
  {
    id: generateId(),
    creationDate: getDateDaysAgo(2),
    customerName: demoCustomers[4].name,
    customerPhone: demoCustomers[4].phone,
    vehicleModel: demoCustomers[4].vehicleModel,
    licensePlate: demoCustomers[4].licensePlate,
    issueDescription: "Thay dây xích, nhông, kiểm tra phanh sau",
    technicianName: demoEmployees[0].name,
    status: "Đang sửa",
    laborCost: 200000,
    partsUsed: [
      {
        partId: demoParts[6].id,
        partName: demoParts[6].name,
        sku: demoParts[6].sku,
        quantity: 1,
        price: demoParts[6].retailPrice["CN1"],
      },
      {
        partId: demoParts[2].id,
        partName: demoParts[2].name,
        sku: demoParts[2].sku,
        quantity: 2,
        price: demoParts[2].retailPrice["CN1"],
      },
    ],
    discount: 30000,
    total:
      200000 +
      demoParts[6].retailPrice["CN1"] +
      demoParts[2].retailPrice["CN1"] * 2 -
      30000,
    branchId: "CN1",
    depositAmount: 300000,
    depositDate: getDateDaysAgo(2),
    paymentStatus: "partial",
    totalPaid: 300000,
    remainingAmount:
      200000 +
      demoParts[6].retailPrice["CN1"] +
      demoParts[2].retailPrice["CN1"] * 2 -
      30000 -
      300000,
  },
  // Phiếu tiếp nhận 2
  {
    id: generateId(),
    creationDate: getDateDaysAgo(0),
    customerName: "Phạm Văn Đức",
    customerPhone: "0967890123",
    vehicleModel: "Honda Wave RSX",
    licensePlate: "30F-44444",
    issueDescription: "Bảo dưỡng định kỳ 5000km",
    technicianName: demoEmployees[3].name,
    status: "Tiếp nhận",
    laborCost: 100000,
    partsUsed: [],
    discount: 0,
    total: 100000,
    branchId: "CN1",
    paymentStatus: "unpaid",
  },
  // Phiếu đã sửa xong 2
  {
    id: generateId(),
    creationDate: getDateDaysAgo(4),
    customerName: "Lê Thị Hương",
    customerPhone: "0978901234",
    vehicleModel: "Yamaha Sirius",
    licensePlate: "30G-55555",
    issueDescription: "Thay lọc gió, kiểm tra bugi",
    technicianName: demoEmployees[0].name,
    status: "Đã sửa xong",
    laborCost: 80000,
    partsUsed: [
      {
        partId: demoParts[5].id,
        partName: demoParts[5].name,
        sku: demoParts[5].sku,
        quantity: 1,
        price: demoParts[5].retailPrice["CN1"],
      },
    ],
    discount: 10000,
    total: 80000 + demoParts[5].retailPrice["CN1"] - 10000,
    branchId: "CN1",
    paymentStatus: "unpaid",
  },
  // Phiếu trả máy 2
  {
    id: generateId(),
    creationDate: getDateDaysAgo(7),
    customerName: "Nguyễn Thanh Tùng",
    customerPhone: "0989012345",
    vehicleModel: "Honda Future",
    licensePlate: "30H-66666",
    issueDescription: "Sửa hệ thống phanh đĩa, thay dầu phanh",
    technicianName: demoEmployees[3].name,
    status: "Trả máy",
    laborCost: 150000,
    partsUsed: [
      {
        partId: demoParts[2].id,
        partName: demoParts[2].name,
        sku: demoParts[2].sku,
        quantity: 2,
        price: demoParts[2].retailPrice["CN1"],
      },
    ],
    discount: 0,
    total: 150000 + demoParts[2].retailPrice["CN1"] * 2,
    branchId: "CN1",
    paymentStatus: "paid",
    paymentMethod: "bank",
    totalPaid: 150000 + demoParts[2].retailPrice["CN1"] * 2,
    remainingAmount: 0,
    paymentDate: getDateDaysAgo(7),
  },
];

// Hàm load demo data vào localStorage
export const loadDemoData = () => {
  const currentData = localStorage.getItem("motocare-data");
  if (currentData) {
    const parsed = JSON.parse(currentData);

    // Merge với dữ liệu hiện có
    parsed.customers = [...(parsed.customers || []), ...demoCustomers];
    parsed.parts = [...(parsed.parts || []), ...demoParts];
    parsed.sales = [...(parsed.sales || []), ...demoSales];
    parsed.employees = [...(parsed.employees || []), ...demoEmployees];
    parsed.payrollRecords = [
      ...(parsed.payrollRecords || []),
      ...demoPayrollRecords,
    ];
    parsed.loans = [...(parsed.loans || []), ...demoLoans];
    parsed.cashTransactions = [
      ...(parsed.cashTransactions || []),
      ...demoCashTransactions,
    ];
    parsed.suppliers = [...(parsed.suppliers || []), ...demoSuppliers];
    parsed.workOrders = [...(parsed.workOrders || []), ...demoWorkOrders];
    parsed.customerDebts = [
      ...(parsed.customerDebts || []),
      ...demoCustomerDebts,
    ];
    parsed.supplierDebts = [
      ...(parsed.supplierDebts || []),
      ...demoSupplierDebts,
    ];

    localStorage.setItem("motocare-data", JSON.stringify(parsed));
  } else {
    // Tạo mới
    const newData = {
      customers: demoCustomers,
      parts: demoParts,
      sales: demoSales,
      employees: demoEmployees,
      payrollRecords: demoPayrollRecords,
      loans: demoLoans,
      cashTransactions: demoCashTransactions,
      suppliers: demoSuppliers,
      workOrders: demoWorkOrders,
      customerDebts: demoCustomerDebts,
      supplierDebts: demoSupplierDebts,
      cartItems: [],
      loanPayments: [],
      inventoryTransactions: [],
      paymentSources: [
        { id: "cash", name: "Tiền mặt", balance: { CN1: 50000000 } },
        { id: "bank", name: "Ngân hàng", balance: { CN1: 150000000 } },
      ],
    };
    localStorage.setItem("motocare-data", JSON.stringify(newData));
  }

  console.log("✅ Demo data loaded successfully!");
  return true;
};

// Hàm xóa tất cả demo data
export const clearDemoData = () => {
  localStorage.removeItem("motocare-data");
  console.log("🗑️ Demo data cleared!");
};
