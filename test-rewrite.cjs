const fs = require('fs');

let code = fs.readFileSync('src/components/inventory/modals/GoodsReceiptModal.tsx', 'utf8');

const modalStart = code.indexOf('<div className="fixed inset-0');
const leftPanelStartMarker = '{/* Left Panel - Product Browser (50%) */}';
const rightPanelStartMarker = '{/* Right Panel - Cart & Checkout (50%) */}';
const cartItemsStartMarker = '{/* Cart Items */}';
const paymentStartMarker = '{/* Payment Section - Compact */}';
const modalEnd = code.indexOf('{/* Camera Barcode Scanner Modal */}');

// Left panel contents
let productsHeader = code.slice(
  code.indexOf('{/* Modern Header */}'),
  code.indexOf('{/* Search Bar with Icon */}')
);
let productsSearch = code.slice(
  code.indexOf('{/* Search Bar with Icon */}'),
  code.indexOf('{/* Products Grid */}')
);
let productsList = code.slice(
  code.indexOf('{/* Products Grid */}'),
  code.indexOf(rightPanelStartMarker)
);

// Right panel contents
let supplierSection = code.slice(
  code.indexOf('{/* Supplier Selection - Modern */}'),
  code.indexOf(cartItemsStartMarker)
);
let cartSection = code.slice(
  code.indexOf(cartItemsStartMarker),
  code.indexOf(paymentStartMarker)
);
let paymentSection = code.slice(
  code.indexOf(paymentStartMarker),
  modalEnd
);

// Close open divs for payment section
let paymentActualEnd = paymentSection.lastIndexOf('</div>');
paymentSection = paymentSection.slice(0, paymentActualEnd);
let paymentActualEnd2 = paymentSection.lastIndexOf('</div>');
paymentSection = paymentSection.slice(0, paymentActualEnd2);
let paymentActualEnd3 = paymentSection.lastIndexOf('</div>');
paymentSection = paymentSection.slice(0, paymentActualEnd3); // Try to cut out the closing of the panels


let newModal = `
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
        <div className="bg-slate-900 w-full h-full sm:h-[95vh] sm:max-w-[98vw] sm:rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-800">
          
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all group"
              >
                <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Nhập kho mới
                </h1>
                <p className="text-xs text-slate-400">
                  Tạo phiếu nhập hàng từ nhà cung cấp
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-slate-800 rounded-full border border-slate-700 flex items-center gap-2">
                <span className="text-sm font-bold text-white">{receiptItems.length}</span>
                <span className="text-xs text-slate-400">SP</span>
              </div>
            </div>
          </div>

          {/* Main 3 Columns */}
          <div className="flex flex-1 overflow-hidden bg-slate-900">
            
            {/* Column 1: Products */}
            <div className="w-[30%] lg:w-[25%] flex flex-col border-r border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h2 className="text-sm font-bold text-slate-200">Danh mục sản phẩm</h2>
                </div>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all"
                >
                  <span>+ Thêm SP</span>
                </button>
              </div>
              
              ` + productsSearch + `
              ` + productsList + `
            </div>

            {/* Column 2: Cart */}
            <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-900 grid-pattern">
              <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/80">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h2 className="text-sm font-bold text-slate-200">Giỏ hàng nhập</h2>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-bold">
                  {receiptItems.length} SP
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col relative">
                ` + cartSection.replace(/bg-slate-50 dark:bg-slate-900\/50/g, 'bg-[#1e2330]') + `
                
                {/* Cart Total Summary */}
                <div className="mt-auto border-t border-slate-800 bg-slate-900/90 backdrop-blur p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Tổng tiền hàng:</span>
                    <span className="text-xl font-bold text-emerald-400">{formatCurrency(subtotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Payment */}
            <div className="w-[30%] lg:w-[25%] flex flex-col bg-slate-900">
              ` + supplierSection + `
              ` + paymentSection.replace(/bg-gradient-to-r from-slate-900 to-slate-800/g, 'bg-slate-800') + `
            </div>
          </div>
        </div>
      </div>

`;

const frontPart = code.slice(0, code.indexOf('return ('));
const backPart = code.slice(modalEnd);

fs.writeFileSync('src/components/inventory/modals/GoodsReceiptModal.tsx.new', frontPart + 'return (' + newModal + backPart);
