import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BRAND_COLORS } from '../../constants';
import { useAppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

function TabIcon({
  color,
  focused,
  icon,
}: {
  color: string;
  focused: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}) {
  const theme = useAppTheme();

  return (
    <View
      style={{
        minWidth: 38,
        height: 28,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? theme.primaryBg : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? theme.border : 'transparent',
      }}
    >
      <MaterialCommunityIcons name={icon} size={21} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: BRAND_COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#69B5FF',
        tabBarInactiveTintColor: '#8F9CB0',
        tabBarStyle: {
          backgroundColor: '#151922',
          borderTopColor: 'rgba(66, 87, 124, 0.7)',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 68,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
        headerStyle: { backgroundColor: '#0A1226' },
        headerTintColor: '#EAF0FA',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tổng',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={focused ? 'view-dashboard' : 'view-dashboard-outline'}
            />
          ),
          headerTitle: 'Nhạn Lâm SmartCare',
        }}
      />

      <Tabs.Screen
        name="workorders"
        options={{
          title: 'Phiếu SC',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={focused ? 'wrench' : 'wrench-outline'}
            />
          ),
          headerTitle: 'Phiếu Sửa Chữa',
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="workorder-create"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="workorder-detail/[id]"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="workorder-edit/[id]"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="sales"
        options={{
          title: 'Bán',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={focused ? 'cart' : 'cart-outline'}
            />
          ),
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          title: 'Khách',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={focused ? 'account-group' : 'account-group-outline'}
            />
          ),
          headerTitle: 'Khách Hàng',
        }}
      />

      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Kho',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon="package-variant-closed"
            />
          ),
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: 'Thêm',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={focused ? 'cog' : 'cog-outline'}
            />
          ),
          headerTitle: 'Menu',
        }}
      />

      <Tabs.Screen
        name="more-feature"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
