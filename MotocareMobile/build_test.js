const fs = require('fs');
const content = fs.readFileSync('app/(tabs)/more-feature.tsx', 'utf8');

const supabaseInject = `
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://uluxycppxlzdskyklgqt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdXh5Y3BweGx6ZHNreWtsZ3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDU5MzIsImV4cCI6MjA3ODA4MTkzMn0.pCmr1LEfsiPnvWKeTjGX4zGgUOYbwaLoKe1Qzy5jbdk');
const BRANCH_ID = 'CN1';
const FEATURE_CONFIG = {
  reports: { title: 'Báo cáo', color: '#007AFF', icon: 'bar-chart' },
  staff: { title: 'Nhân viên', color: '#34C759', icon: 'people' },
  debt: { title: 'Công nợ', color: '#FF3B30', icon: 'cash' },
  orders: { title: 'Đơn hàng', color: '#FF9500', icon: 'cart' },
};
`;

const helpersStart = content.indexOf('const buildRangeStart = ');
const helpersEnd = content.indexOf('const { data,', helpersStart);
const helpers = content.substring(helpersStart, helpersEnd).replace(/export /g, '');

const fnStart = content.indexOf('const rangeStart =', helpersEnd);
const fnEnd = content.indexOf('return {', fnStart);
const fnBody = content.substring(fnStart, fnEnd);

const script = `
${supabaseInject}
${helpers}

(async () => {
  const feature = 'reports';
  const range = 'today';
  try {
    ${fnBody}
    console.log('SUCCESS');
  } catch(e) {
    console.error('ERROR TRACED:', e);
  }
})();
`;

fs.writeFileSync('run_test.js', script);
