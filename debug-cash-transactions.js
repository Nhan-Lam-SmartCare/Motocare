// Debug: Log cash transactions count
console.log('[DEBUG] Cash transactions count:', cashTransactions?.length);
console.log('[DEBUG] Sample transactions:', cashTransactions?.slice(0, 3));
console.log('[DEBUG] Payment sources:', cashTransactions?.map(tx => tx.paymentSourceId || tx.paymentsource));
console.log('[DEBUG] Unique payment sources:', [...new Set(cashTransactions?.map(tx => tx.paymentSourceId || tx.paymentsource))]);

// Add this temporarily to CashBook.tsx after line 34 where cashTransactions is fetched
