// Chạy trong Browser Console để debug dữ liệu đang load

// 1. Kiểm tra TanStack Query cache
console.log('=== TanStack Query Cache ===');
const queryClient = window.__REACT_QUERY_DEVTOOLS_PANEL_?.queryClient;
if (queryClient) {
  const cache = queryClient.getQueryCache().getAll();
  console.log('Total cached queries:', cache.length);
  
  const cashTxQueries = cache.filter(q => q.queryKey[0] === 'cashTxRepo');
  console.log('cashTxRepo queries:', cashTxQueries.length);
  
  cashTxQueries.forEach((q, i) => {
    console.log(`Query ${i}:`, q.queryKey);
    console.log('State:', q.state.dataUpdateCount, 'updates');
    console.log('Data count:', q.state.data?.length, 'transactions');
  });
}

// 2. Clear TanStack Query cache và reload
console.log('\n=== Clearing Cache ===');
if (queryClient) {
  queryClient.clear();
  console.log('✅ Cleared TanStack Query cache');
}

// 3. Clear storage và reload
localStorage.clear();
sessionStorage.clear();
console.log('✅ Cleared storage');

console.log('\n🔄 Reloading in 1 second...');
setTimeout(() => location.reload(true), 1000);
