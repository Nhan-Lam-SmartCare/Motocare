const fs = require('fs');
let c = fs.readFileSync('g:/Motocare/src/components/service/ServiceManager.tsx', 'utf8');
c = c.replace(/hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500\/30 \\$\\{getStatusBorderColor[\s\S]*?\\}\\}/, 'hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/30');
fs.writeFileSync('g:/Motocare/src/components/service/ServiceManager.tsx', c);
