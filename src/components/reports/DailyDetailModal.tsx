import React, { useState } from 'react';
import { X, FileText, Wallet, ArrowUpRight, ArrowDownLeft, User, Clock } from 'lucide-react';
import { Sale, WorkOrder, CashTransaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import { formatCashTxCategory } from '../../lib/finance/cashTxCategories';

interface DailyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    sales: Sale[];
    workOrders: WorkOrder[];
    cashTransactions: CashTransaction[];
}

export const DailyDetailModal: React.FC<DailyDetailModalProps> = ({
    isOpen,
    onClose,
    date,
    sales,
    workOrders,
    cashTransactions,
}) => {
    const [activeTab, setActiveTab] = useState<'orders' | 'cash'>('orders');

    if (!isOpen) return null;

    // Combine sales and work orders for display
    const allOrders = [
        ...sales.map(s => ({
            id: s.id,
            type: 'sale' as const,
            code: s.sale_code || '---',
            customer: s.customer.name,
            total: s.total,
            status: 'completed', // Sales are usually completed
            time: new Date(s.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            items: s.items.length
        })),
        ...workOrders.map(wo => ({
            id: wo.id,
            type: 'service' as const,
            code: `WO-${wo.id}`,
            customer: wo.customerName,
            total: wo.total,
            status: wo.status,
            time: new Date(wo.creationDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            items: (wo.partsUsed?.length || 0) + (wo.additionalServices?.length || 0)
        }))
    ].sort((a, b) => b.time.localeCompare(a.time));

    const translateCategory = (category: string): string => {
        return formatCashTxCategory(category);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Chi tiết ngày {new Date(date).toLocaleDateString('vi-VN')}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {allOrders.length} đơn hàng • {cashTransactions.length} giao dịch thu chi
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Đơn hàng & Dịch vụ ({allOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('cash')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'cash'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        <Wallet className="w-4 h-4" />
                        Thu chi khác ({cashTransactions.length})
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50">
                    {activeTab === 'orders' ? (
                        <div className="space-y-4">
                            {allOrders.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                    Không có đơn hàng nào trong ngày này.
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">Thời gian</th>
                                                    <th className="px-4 py-3">Mã đơn</th>
                                                    <th className="px-4 py-3">Khách hàng</th>
                                                    <th className="px-4 py-3">Loại</th>
                                                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                                                    <th className="px-4 py-3 text-center">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {allOrders.map((order, idx) => (
                                                    <tr key={`${order.type}-${order.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                            <Clock className="w-3 h-3" />
                                                            {order.time}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                            {order.code}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-900 dark:text-white">
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-3 h-3 text-slate-400" />
                                                                {order.customer}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${order.type === 'sale'
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                                }`}>
                                                                {order.type === 'sale' ? 'Bán hàng' : 'Dịch vụ'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                                                            {formatCurrency(order.total)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${order.status === 'completed' || order.status === 'Đã sửa xong' || order.status === 'Trả máy'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                                }`}>
                                                                {order.status === 'completed' ? 'Hoàn thành' : order.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden space-y-3">
                                        {allOrders.map((order, idx) => (
                                            <div key={`${order.type}-${order.id}-${idx}`} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${order.type === 'sale'
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                                }`}>
                                                                {order.type === 'sale' ? 'Bán hàng' : 'Dịch vụ'}
                                                            </span>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {order.time}
                                                            </span>
                                                        </div>
                                                        <div className="font-bold text-slate-900 dark:text-white text-base">
                                                            {order.code}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-blue-600 dark:text-blue-400 text-base">
                                                            {formatCurrency(order.total)}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            {order.items} mục
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                        {order.customer}
                                                    </div>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${order.status === 'completed' || order.status === 'Đã sửa xong' || order.status === 'Trả máy'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}>
                                                        {order.status === 'completed' ? 'Hoàn thành' : order.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cashTransactions.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                    Không có giao dịch thu chi nào trong ngày này.
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">Thời gian</th>
                                                    <th className="px-4 py-3">Loại</th>
                                                    <th className="px-4 py-3">Danh mục</th>
                                                    <th className="px-4 py-3">Mô tả</th>
                                                    <th className="px-4 py-3 text-right">Số tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {cashTransactions.map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'income'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                                }`}>
                                                                {tx.type === 'income' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                                {tx.type === 'income' ? 'Thu' : 'Chi'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-900 dark:text-white">
                                                            {translateCategory(tx.category || '')}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                            <div className="flex flex-col">
                                                                <span className="whitespace-pre-wrap">
                                                                    {(tx as any).description || tx.notes || translateCategory(tx.category || '')}
                                                                </span>
                                                                {(tx as any).reference && (
                                                                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                                        ({(tx as any).reference})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                            }`}>
                                                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden space-y-3">
                                        {cashTransactions.map((tx) => (
                                            <div key={tx.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${tx.type === 'income'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                            }`}>
                                                            {tx.type === 'income' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                            {tx.type === 'income' ? 'Thu' : 'Chi'}
                                                        </span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={`font-bold text-base ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                                    </div>
                                                </div>

                                                <div className="mb-2">
                                                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {translateCategory(tx.category || '')}
                                                    </div>
                                                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                        {(tx as any).description || tx.notes || translateCategory(tx.category || '')}
                                                    </div>
                                                </div>

                                                {(tx as any).reference && (
                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
                                                        Ref: {(tx as any).reference}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
