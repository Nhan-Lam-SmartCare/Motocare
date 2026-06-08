const fs = require('fs');
const path = require('path');

const srcFile = path.join('g:', 'Motocare', 'src', 'components', 'service', 'WorkOrderMobileModal.tsx');
let content = fs.readFileSync(srcFile, 'utf8');

function extractAndReplace(startStr, endStr, componentName, propString) {
  const startIdx = content.indexOf(startStr);
  if (startIdx === -1) {
    console.log('Could not find startStr for ' + componentName);
    return null;
  }
  const endIdx = content.indexOf(endStr, startIdx);
  if (endIdx === -1) {
    console.log('Could not find endStr for ' + componentName);
    return null;
  }
  
  const actualEndIdx = endIdx + endStr.length;
  const extractedBlock = content.substring(startIdx, actualEndIdx);
  
  const replacement = (propString ? '<' + componentName + ' ' + propString + ' />' : '<' + componentName + ' />');
  
  content = content.substring(0, startIdx) + replacement + content.substring(actualEndIdx);
  return extractedBlock;
}

const comps = [];

console.log('Done mapping, need to define the exact strings, but I will write it all manually in javascript to be precise');

