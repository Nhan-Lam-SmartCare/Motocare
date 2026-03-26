const fs = require('fs');
let c = fs.readFileSync('g:/Motocare/src/components/service/ServiceManager.tsx', 'utf8');
c = c.replace(/border-l-4 /g, '');
c = c.replace(/\\\$\\{getStatusBorderColor\\(order\\.status as\\s*WorkOrderStatus\\)\\}/g, '');
fs.writeFileSync('g:/Motocare/src/components/service/ServiceManager.tsx', c);
