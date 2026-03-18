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

// 2. Wrap styles in a function
if (content.includes('const styles = StyleSheet.create({')) {
  content = content.replace('const styles = StyleSheet.create({', 'const getStyles = (theme: any) => StyleSheet.create({');

  // Replace colors in styles with theme variables
  content = content.replace(/'#F8FAFC'/g, 'theme.background');
  content = content.replace(/'#FFFFFF'/g, 'theme.surface');
  content = content.replace(/'#E2E8F0'/g, 'theme.border');
  content = content.replace(/'#0F172A'/g, 'theme.text');
  content = content.replace(/'#1E293B'/g, 'theme.text'); // Treating as text primary
  content = content.replace(/'#64748B'/g, 'theme.textSecondary');
  
  // Specific replacements
  content = content.replace(/backgroundColor: '#F2F6FD'/g, 'backgroundColor: theme.surface');
  content = content.replace(/backgroundColor: '#D9EBFF'/g, 'backgroundColor: theme.primaryBg');
  content = content.replace(/color: '#9FAECC'/g, 'color: theme.textSecondary');
  content = content.replace(/color: '#8290A8'/g, 'color: theme.textSecondary');
  content = content.replace(/color: '#8FA2C3'/g, 'color: theme.textSecondary');
  content = content.replace(/color: '#B8C3DA'/g, 'color: theme.textSecondary');
  content = content.replace(/color: '#266FDB'/g, 'color: theme.primary');
  content = content.replace(/color: '#2B83FF'/g, 'color: theme.primary');
  content = content.replace(/color: '#FF6A7B'/g, 'color: theme.danger');
}

// 3. Inject useAppTheme and styles initialization into the main component
if (!content.includes('const theme = useAppTheme();')) {
  content = content.replace(
    /export default function WorkOrdersScreen\(\) \{/,
    `export default function WorkOrdersScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);`
  );
}

// Ensure the sub-components that use styles get them or use Inline
// For simplicity, since styles is used in subcomponents, we can pass styles as a prop or define them inside the main component / pass theme.
// Actually, 'MetricCard', 'ActionBtn', 'StatCard', 'FinanceCard' are outside the main component. 
// We should change them to accept styles or theme.
// Let's just move these subcomponents inside WorkOrdersScreen or pass `styles` and `theme` to them.

fs.writeFileSync('refactor_theme.js', content);
