const fs = require('fs');

const code = fs.readFileSync('g:/Motocare/src/components/service/components/mobile/view_mode.txt', 'utf8');

// A very naive regex to find word identifiers that might be props.
const words = new Set([...code.matchAll(/[a-zA-Z_]\w*/g)].map(m => m[0]));

// Words that are javascript keywords / global or HTML tags
const ignore = new Set([
  'div', 'span', 'button', 'input', 'label', 'className', 'return', 'if', 'else', 'const', 'let', 'var', 'true', 'false', 'null', 'undefined', 'length', 'map', 'filter', 'reduce', 'forEach', 'find', 'includes', 'push', 'pop', 'Math', 'Date', 'String', 'Number', 'console', 'log', 'key', 'id', 'name', 'value', 'type', 'placeholder', 'disabled', 'onClick', 'onChange', 'onBlur', 'onFocus', 'onSubmit', 'required', 'style', 'text', 'bg', 'text', 'font', 'flex', 'items', 'justify', 'w', 'h', 'p', 'm', 'mt', 'mb', 'ml', 'mr', 'pt', 'pb', 'pl', 'pr', 'border', 'rounded', 'shadow', 'z', 'transition', 'cursor', 'hover', 'dark', 'hidden', 'md', 'lg', 'xl', 'gap', 'grid', 'col', 'row', 'span', 'auto', 'min', 'max', 'overflow', 'scroll', 'fixed', 'absolute', 'relative', 'inset', 'top', 'bottom', 'left', 'right', 'opacity', 'scale', 'duration', 'ease', 'in', 'out', 'focus', 'ring', 'outline', 'stroke', 'fill', 'currentColor', 'transparent', 'black', 'white', 'slate', 'gray', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'teal', 'cyan', 'rose', 'fuchsia', 'emerald', 'indigo', 'violet', 'sky', 'amber', 'lime', 'stone', 'neutral', 'zinc', 'from', 'to', 'via', 'group', 'peer', 'sr', 'only', 'not', 'print', 'screen', 'landscape', 'portrait', 'motion', 'reduce', 'safe', 'area', 'flex-1', 'flex-shrink-0', 'shrink-0', 'flex-col', 'items-center', 'justify-between', 'border-b', 'border-t', 'text-slate-500', 'active', 'transition-all', 'text-sm', 'font-bold'
]);

// Actually it's easier. I will just rely on my intelligence to generate the props.
