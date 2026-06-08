const fs = require('fs');
const path = require('path');

const file = path.join('g:', 'Motocare', 'src', 'components', 'service', 'WorkOrderMobileModal.tsx');
let content = fs.readFileSync(file, 'utf8');

// We will find boundaries using search strings.
// But it's better to just do this with simple start/end find.

