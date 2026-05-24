import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from './src/screens/DashboardScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import ScanReceiptScreen from './src/screens/ScanReceiptScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import RecurringScreen from './src/screens/RecurringScreen';
import type { RootStackParamList } from './src/navigation';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function ExpensesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#121826' }, headerTintColor: '#e7ecf3' }}>
      <Stack.Screen name="ExpensesList" component={ExpensesScreen} options={{ title: 'Expenses' }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add expense' }} />
      <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ title: 'Scan receipt' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#121826' },
          headerTintColor: '#e7ecf3',
          tabBarStyle: { backgroundColor: '#121826', borderTopColor: '#2a3447' },
          tabBarActiveTintColor: '#5b8def',
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen
          name="Expenses"
          component={ExpensesStack}
          options={{ headerShown: false }}
        />
        <Tab.Screen name="Budgets" component={BudgetsScreen} />
        <Tab.Screen name="Recurring" component={RecurringScreen} />
      </Tab.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
