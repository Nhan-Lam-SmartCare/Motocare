const fs = require('fs');
let c = fs.readFileSync('g:/Motocare/src/components/service/ServiceManager.tsx', 'utf8');
c = c.replace(/ className=\{\group bg-white dark:bg-slate-800\/80[\s\S]*?WorkOrderStatus\)\}\\}/g, ' className={group bg-white dark:bg-slate-800/80 hover:bg-blue-50/60 dark:hover:bg-slate-700/60 cursor-pointer transition-all duration-150 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/30}');
fs.writeFileSync('g:/Motocare/src/components/service/ServiceManager.tsx', c);
