const fs = require('fs');
let c = fs.readFileSync('g:/Motocare/src/components/service/ServiceManager.tsx', 'utf8');
c = c.replace(/\\\$\\{getStatusBorderColor\\(order\\.status as WorkOrderStatus\\)\\}/g, '');
fs.writeFileSync('g:/Motocare/src/components/service/ServiceManager.tsx', c);
