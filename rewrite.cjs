const fs = require('fs');

let code = fs.readFileSync('src/components/inventory/modals/GoodsReceiptModal.tsx', 'utf8');

const s1 = code.indexOf('<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">');
if (s1 === -1) {
  console.log("Could not find s1");
  process.exit(1);
}
const headerEnd = code.indexOf('{/* Search Bar with Icon */}');
const productsStart = headerEnd;
const productsEnd = code.indexOf('{/* Right Panel - Cart & Checkout (50%) */}');
let productsList = code.slice(productsStart, productsEnd);

const supplierStart = code.indexOf('{/* Supplier Selection - Modern */}');
const supplierEnd = code.indexOf('{/* Cart Items */}');
let supplierCode = code.slice(supplierStart, supplierEnd);

const cartStart = supplierEnd;
const cartEnd = code.indexOf('{/* Payment Section - Compact */}');
let cartCode = code.slice(cartStart, cartEnd);

const paymentStart = cartEnd;
const endDivs = code.indexOf('{/* Camera Barcode Scanner Modal */}');
let paymentCodeRaw = code.slice(paymentStart, endDivs);

// Truncate payment closing tags safely.
const pEnd = paymentCodeRaw.lastIndexOf('</div>');
const pEnd2 = paymentCodeRaw.lastIndexOf('</div>', pEnd - 1);
const pEnd3 = paymentCodeRaw.lastIndexOf('</div>', pEnd2 - 1);
const pEnd4 = paymentCodeRaw.lastIndexOf('</div>', pEnd3 - 1);
let paymentCode = paymentCodeRaw.slice(0, pEnd4);

// Replace layouts
cartCode = cartCode.replace(/<div className="flex-1 overflow-y-auto p-3">/g, '<div className="flex-1 p-3 overflow-y-auto">');
supplierCode = supplierCode.replace(/p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50\\/30 to-teal-50\\/30 dark:from-slate-800\\/50 dark:to-slate-800\\/50/g, 'p-4 border-b border-slate-200 dark:border-slate-800');

const newLayout = \`
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-slate-50 dark:bg-[#0f172a] w-full max-w-[1400px] w-[98vw] h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b]">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl text-slate-500 dark:text-slate-400 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-xl">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Nhập kho mới</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tạo phiếu nhập hàng từ nhà cung cấp</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300">{receiptItems.length}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">SP</span>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Cột 1: Danh mục sản phẩm (28%) */}
            <div className="w-[28%] flex flex-col bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Danh mục sản phẩm</h2>
                </div>
                <button onClick={() => setShowAddProductModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-all">
                  <span>+ Thêm SP</span>
                </button>
              </div>
              \${productsList}
            </div>

            {/* Cột 2: Giỏ hàng nhập (42%) */}
            <div className="w-[44%] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a]">
              \${cartCode}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] flex items-center justify-between mt-auto">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng tiền hàng:</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            {/* Cột 3: Nhà cung cấp & Thanh toán (30%) */}
            <div className="w-[28%] flex flex-col bg-white dark:bg-[#1e293b]">
              <div className="flex-1 overflow-y-auto">
                \${supplierCode}
                \${paymentCode}
              </div>
            </div>
          </div>
        </div>
      </div>
\n      {/* Camera Barcode Scanner Modal */}\`;

let newFileContent = code.slice(0, s1) + newLayout + code.slice(endDivs + '{/* Camera Barcode Scanner Modal */}'.length);
fs.writeFileSync('src/components/inventory/modals/GoodsReceiptModal.tsx', newFileContent, 'utf8');
console.log('Success');
