import { Tabs, Redirect } from 'expo-router';
import { useAppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BRAND_COLORS } from '../../constants';

export default function TabsLayout() {
  const theme = useAppTheme();
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND_COLORS.background }}>
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
          borderTopColor: '#293D61',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 72,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
        tabBarItemStyle: {
          paddingHorizontal: 2,
        },
        headerStyle: { backgroundColor: '#0A1226' },
        headerTintColor: '#EAF0FA',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                minWidth: 40,
                height: 30,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? theme.primaryBg : 'transparent',
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? theme.border : 'transparent',
              }}
            >
              <MaterialCommunityIcons name={focused ? 'view-dashboard' : 'view-dashboard-outline'} size={22} color={color} />
            </View>
          ),
          headerTitle: 'Nhạn Lâm SmartCare',
        }}
      />
      <Tabs.Screen
        name="workorders"
        options={{
          title: 'Phiếu SC',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                minWidth: 40,
                height: 30,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? theme.primaryBg : 'transparent',
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? theme.border : 'transparent',
              }}
            >
              <MaterialCommunityIcons name={focused ? 'wrench' : 'wrench-outline'} size={22} color={color} />
            </View>
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
        }}
      />
      <Tabs.Screen
        name="workorder-detail/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="workorder-edit/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Bán hàng',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                minWidth: 40,
                height: 30,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? theme.primaryBg : 'transparent',
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? theme.border : 'transparent',
              }}
            >
              <MaterialCommunityIcons name={focused ? 'cart' : 'cart-outline'} size={22} color={color} />
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Khách hàng',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                minWidth: 40,
                height: 30,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? theme.primaryBg : 'transparent',
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? theme.border : 'transparent',
              }}
            >
              <MaterialCommunityIcons name={focused ? 'account-group' : 'account-group-outline'} size={22} color={color} />
            </View>
          ),
          headerTitle: 'Khách Hàng',
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Kho',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                minWidth: 40,
                height: 30,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? theme.primaryBg : 'transparent',
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? theme.border : 'transparent',
              }}
            >
              <MaterialCommunityIcons name={focused ? 'package-variant-closed' : 'package-variant-closed'} size={22} color={color} />
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Thêm',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                minWidth: 40,
                height: 30,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? theme.primaryBg : 'transparent',
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? theme.border : 'transparent',
              }}
            >
              <MaterialCommunityIcons name={focused ? 'cog' : 'cog-outline'} size={22} color={color} />
            </View>
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
