const fs = require('fs');
let c = fs.readFileSync('MotocareMobile/app/(tabs)/workorders.tsx', 'utf8');

const replacements = {
  "'#243A5F'": "theme.text",
  "'#7088AA'": "theme.textSecondary",
  "'#6882A8'": "theme.textSecondary",
  "'#256ED9'": "theme.primary",
  "'#637EA4'": "theme.textSecondary",
  "'#9EABC3'": "theme.textSecondary",
  "'#9BA7BD'": "theme.textSecondary",
  "'#6F86A9'": "theme.textSecondary",
  "'#6E85A8'": "theme.textSecondary",
  "'#748CAE'": "theme.textSecondary",
  "'#60799E'": "theme.textSecondary",
  "'#CEDAEB'": "theme.border",
  "'#E0E8F3'": "theme.border",
  "'#0E315F'": "theme.primaryBg",
  "'#1A1E28'": "theme.surface",
  "'#2A3E62'": "theme.border",
  "backgroundColor: '#1E90FF'": "backgroundColor: theme.primary",
  "borderColor: '#56B2FF'": "borderColor: theme.primary",
  "color: '#75EDB3'": "color: theme.primary === '#3B82F6' ? '#34D399' : '#10B981'",
  "placeholderTextColor=\"#8290A8\"": "placeholderTextColor={theme.textSecondary}",
  "backgroundColor: 'rgba(64,153,102,0.18)'": "backgroundColor: theme.primary === '#3B82F6' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.1)'",
  "color: '#8290A8'": "color: theme.textSecondary"
};

for (const [oldVal, newVal] of Object.entries(replacements)) {
  c = c.split(oldVal).join(newVal);
}

// Complex replaces
let oldBadgeBg = "style={[styles.statusBadge, { backgroundColor: STATUS_BG[order.status] || '#EEF2F8' }]}";
let newBadgeBg = "style={[styles.statusBadge, { backgroundColor: theme.primary === '#3B82F6' ? (STATUS_BG[order.status] + '33') : (STATUS_BG[order.status] || '#EEF2F8') }]}";
c = c.split(oldBadgeBg).join(newBadgeBg);

let oldShadow = "shadowColor: '#000'";
let newShadow = "shadowColor: theme.primary === '#3B82F6' ? '#000' : theme.textSecondary";
c = c.split(oldShadow).join(newShadow);

fs.writeFileSync('MotocareMobile/app/(tabs)/workorders.tsx', c);
console.log('Styles injected fully');
