const fs = require('fs');

const workordersPath = 'app/(tabs)/workorders.tsx';
let content = fs.readFileSync(workordersPath, 'utf8');

// 1. Add import for useAppTheme
if (!content.includes('useAppTheme')) {
  content = content.replace(
    /import \{ BRAND_COLORS, formatCurrency, formatDate \} from '\.\.\/\.\.\/constants';/,
    `import { BRAND_COLORS, formatCurrency, formatDate } from '../../constants';
import { useAppTheme } from '../../constants/theme';`
  );
}

// Replace static styles with getStyles
if (content.includes('const styles = StyleSheet.create({')) {
  content = content.replace('const styles = StyleSheet.create({', 'const getStyles = (theme: any) => StyleSheet.create({');

  // Replace colors in styles with theme variables
  content = content.replace(/'#F8FAFC'/g, 'theme.background');
  content = content.replace(/'#FFFFFF'/g, 'theme.surface');
  content = content.replace(/'#EFF6FF'/g, 'theme.primaryBg');
  content = content.replace(/'#E2E8F0'/g, 'theme.border');
  content = content.replace(/'#0F172A'/g, 'theme.text');
  content = content.replace(/'#1E293B'/g, 'theme.text');
  content = content.replace(/'#64748B'/g, 'theme.textSecondary');
  content = content.replace(/'#BFDBFE'/g, 'theme.border'); 
  
  content = content.replace(/backgroundColor: '#F2F6FD'/g, 'backgroundColor: theme.surface');
  content = content.replace(/backgroundColor: '#D9EBFF'/g, 'backgroundColor: theme.primaryBg');
  
  content = content.replace(/color: '#9FAECC'/g, 'color: theme.textSecondary');
  content = content.replace(/color: '#8290A8'/g, 'color: theme.textSecondary');
  content = content.replace(/color: '#8FA2C3'/g, 'color: theme.textSecondary');
  content = content.replace(/color: '#B8C3DA'/g, 'color: theme.textSecondary');
  content = content.replace(/color: '#7B93B5'/g, 'color: theme.textSecondary');
  
  content = content.replace(/color: '#266FDB'/g, 'color: theme.primary');
  content = content.replace(/color: '#2B83FF'/g, 'color: theme.primary');
  content = content.replace(/color: '#FF6A7B'/g, 'color: theme.danger');
  content = content.replace(/color: '#34598C'/g, 'color: theme.primary');
  content = content.replace(/color: '#8CC8FF'/g, 'color: theme.primary');
}

// Inject theme and styles into every functional component
const components = ['WorkOrdersScreen', 'FinanceCard', 'StatCard', 'WorkOrderCard', 'ActionItem'];
components.forEach(comp => {
  const regex = new RegExp(`function ${comp}\\((.*?)\\) \\{`);
  content = content.replace(regex, `function ${comp}($1) {\n  const theme = useAppTheme();\n  const styles = useMemo(() => getStyles(theme), [theme]);`);
});

fs.writeFileSync(workordersPath, content);
