import React from 'react';
import { DeliveryOrdersView } from '../components/sales/DeliveryOrdersView';
import { useAppContext } from '../contexts/AppContext';
import { useSalesRepo } from '../hooks/useSalesRepository';
import { updateDeliveryStatus, completeDelivery, cancelDeliveredOrder } from '../lib/repository/salesRepository';
import { showToast } from '../utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployeesRepo } from '../hooks/useEmployeesRepository';

export const DeliveryTest = () => {
    const { currentBranchId } = useAppContext();
    const { data: sales = [], isLoading, refetch } = useSalesRepo();
    const { data: employees = [] } = useEmployeesRepo();
    const queryClient = useQueryClient();

    const handleUpdateStatus = async (saleId: string, status: string, shipperId?: string) => {
        const result = await updateDeliveryStatus(saleId, status as any, shipperId);
        if (result.ok) {
            showToast.success('Cập nhật trạng thái thành công!');
            await refetch();
            await queryClient.invalidateQueries({ queryKey: ['sales'] });
        } else {
            showToast.error(result.error.message);
        }
    };

    const handleComplete = async (saleId: string) => {
        const result = await completeDelivery(saleId, currentBranchId);
        if (result.ok) {
            showToast.success('Đã giao hàng thành công!');
            await refetch();
            await queryClient.invalidateQueries({ queryKey: ['sales'] });
            await queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
        } else {
            showToast.error(result.error.message);
        }
    };

    const handleRefund = async (saleId: string) => {
        const reason = prompt('Nhập lý do hoàn trả:');
        if (reason === null) return; // Cancelled

        const confirmMsg = `Xác nhận hoàn trả đơn hàng này?\n\nLý do: ${reason || 'Không có'}`;
        if (!confirm(confirmMsg)) return;

        const result = await cancelDeliveredOrder(saleId, currentBranchId, reason);
        if (result.ok) {
            showToast.success('Hoàn trả thành công! Đã tạo phiếu chi.');
            await refetch();
            await queryClient.invalidateQueries({ queryKey: ['sales'] });
            await queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
        } else {
            showToast.error(result.error.message);
        }
    };

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900">
            <DeliveryOrdersView
                sales={sales}
                employees={employees}
                onUpdateStatus={handleUpdateStatus}
                onCompleteDelivery={handleComplete}
                onRefund={handleRefund}
                isLoading={isLoading}
            />
        </div>
    );
};
