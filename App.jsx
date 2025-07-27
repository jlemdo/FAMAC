import React, {useContext, useCallback, useMemo} from 'react';
import {View, StyleSheet, ActivityIndicator} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import CategoriesList from './src/home/CategoriesList';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SpecificCategoryProduct from './src/home/SpecificCategoryProduct';
import ProductDetails from './src/home/ProductDetails';
import {CartContext, CartProvider} from './src/context/CartContext';
import {OrderProvider} from './src/context/OrderContext';
import {NotificationProvider} from './src/context/NotificationContext';
import {StripeProvider} from '@stripe/stripe-react-native';
import {AuthContext} from './src/context/AuthContext';
import {AuthProvider} from './src/context/AuthContext';
import {AlertProvider} from './src/context/AlertContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import fonts from './src/theme/fonts';

import Cart from './src/cart/Cart';
import Route from './src/tracking/Route';
import Profile from './src/profile/Profile';
import Header from './src/header/Header';
import SplashScreen from './src/authentication/Splash';
import WelcomeVideo from './src/authentication/WelcomeVideo';
import Login from './src/authentication/Login';
import SignUp from './src/authentication/Signup';
import ForgotPassword from './src/authentication/ForgotPassword';
import Order from './src/order/Order';
import OrderDetails from './src/order/OrderDetail';
import SearchResults from './src/home/SearchResults';

import {OrderContext} from './src/context/OrderContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Helper function para parsear fechas (misma que en Profile.jsx)
const parseFlexibleDate = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    let parsedDate = null;
    
    if (typeof dateValue === 'string') {
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        parsedDate = new Date(dateValue);
      }
      else if (dateValue.match(/^[A-Za-z]+ \d{4}$/)) {
        const [monthName, year] = dateValue.split(' ');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex !== -1) {
          parsedDate = new Date(parseInt(year), monthIndex, 1);
        }
      }
      else {
        parsedDate = new Date(dateValue);
      }
    } else {
      parsedDate = new Date(dateValue);
    }
    
    if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900) {
      // Siempre normalizar al día 1 del mes
      return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
    }
  } catch (error) {
    console.warn('Error parsing date:', error);
  }
  
  return null;
};

const PUBLISHABLE_KEY =
  'pk_test_51RUatQIwltH9llH1Ihi6ZvEZ9O1ZqYgLEHdUBS3vQ3E890oQycuF0ITlgocwypo0igPl94uDE9t84fQ0R2VAQc1100XwsvKNjR';
// const PUBLISHABLE_KEY =
//   'pk_test_51OMmaHISCA0h3oYpdsnzpNlsLGm3WLtP7zb5mFyeEAKJqPZZXuP3J1ph7ShDzBUWiSJ64UHtfII8xmpbFkXbM4Bg00K0F4gAR9';

function LoginStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {/* <Stack.Screen name="Splash" component={SplashScreen} /> */}
      <Stack.Screen name="Splash" component={WelcomeVideo} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="ForgetPass" component={ForgotPassword} />
    </Stack.Navigator>
  );
}

function OrderStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Order" component={Order} />
      <Stack.Screen name="OrderDetails" component={OrderDetails} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="CategoriesList" component={CategoriesList} />
      <Stack.Screen
        name="CategoryProducts"
        component={SpecificCategoryProduct}
      />
      {/* ProductDetails moved to RootStack to preserve bottom tabs */}
      {/* <Stack.Screen name="SearchResults" component={SearchResults} /> */}
    </Stack.Navigator>
  );
}

function MainTabs() {
  const {user} = useContext(AuthContext);
  const {orders} = useContext(OrderContext);
  const {cart} = useContext(CartContext);
  
  // Function to check if profile has missing data
  const hasIncompleteProfile = useMemo(() => {
    if (user?.usertype === 'Guest') return false;
    
    // Check if essential fields are missing
    const hasPhone = user?.phone || user?.contact_number;
    const hasAddress = user?.address;
    
    // Check birth date using helper function
    const dateValue = user?.birthDate || user?.birth_date || user?.dob;
    const hasBirthDate = !!parseFlexibleDate(dateValue);
    
    return !hasPhone || !hasAddress || !hasBirthDate;
  }, [user]);
  
  // Memoized cart badge calculation with real-time updates
  const cartBadge = useMemo(() => {
    if (!cart || cart.length === 0) return null;
    
    // Calculate total items (considering quantities)
    const totalItems = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    return totalItems > 99 ? '+99' : totalItems;
  }, [cart]);

  // Memoized orders badge calculation with real-time updates
  const ordersBadge = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    
    // Count only active orders (not delivered/completed)
    const completedStatuses = ['delivered', 'entregado', 'completed', 'finalizado', 'cancelled', 'cancelado'];
    const activeOrders = orders.filter(order => 
      order.status && !completedStatuses.includes(order.status.toLowerCase())
    );
    
    if (activeOrders.length === 0) return null;
    return activeOrders.length > 99 ? '+99' : activeOrders.length;
  }, [orders]);

  // Optimized tab bar configuration
  const tabBarOptions = useMemo(() => ({
    tabBarActiveTintColor: '#D27F27', // Usar color del theme
    tabBarInactiveTintColor: '#8B5E3C',
    tabBarStyle: {
      backgroundColor: 'white',
      paddingBottom: 5,
      paddingTop: 5,
      height: 60,
      borderTopWidth: 1,
      borderTopColor: 'rgba(139, 94, 60, 0.1)',
    },
    headerShown: false,
  }), []);

  return (
    <View style={styles.container}>
      {/* <Header /> */}
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            let iconName;
            if (route.name === 'Inicio') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Carrito') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (
              route.name === 'Ordenes' ||
              route.name === 'Historial de Ordenes'
            ) {
              iconName = focused ? 'clipboard' : 'clipboard-outline';
            } else if (route.name === 'Ruta') {
              iconName = focused ? 'navigate' : 'navigate-outline';
            } else if (route.name === 'Perfil') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          ...tabBarOptions,
        })}>
        {user.usertype === 'driver' ? (
          <>
            {/* <Tab.Screen name="Home" component={HomeStack} /> */}
            <Tab.Screen
              name="Historial de Ordenes"
              component={OrderStack}
              options={{
                tabBarBadge: ordersBadge,
              }}
            />
          </>
        ) : (
          <>
            <Tab.Screen 
              name="Inicio" 
              component={HomeStack}
              listeners={({navigation}) => ({
                tabPress: (e) => {
                  // Prevenir el comportamiento por defecto
                  e.preventDefault();
                  // Navegar siempre a la raíz del HomeStack
                  navigation.navigate('Inicio', {
                    screen: 'CategoriesList'
                  });
                },
              })}
            />
            <Tab.Screen
              name="Carrito"
              component={Cart}
              options={{
                tabBarBadge: cartBadge,
              }}
            />
            <Tab.Screen 
              name="Ordenes" 
              component={OrderStack}
              options={{
                tabBarBadge: ordersBadge,
              }}
            />
            {/* <Tab.Screen name="Route" component={Route} /> */}
          </>
        )}
        <Tab.Screen 
          name="Perfil" 
          component={Profile}
          options={{
            tabBarBadge: hasIncompleteProfile ? '!' : null,
            tabBarBadgeStyle: hasIncompleteProfile ? {
              backgroundColor: '#E63946',
              color: '#FFF',
              fontSize: 12,
              fontWeight: 'bold',
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              textAlign: 'center',
              paddingTop: 2,
            } : undefined,
          }}
        />
        {/* Hidden tabs - screens that need bottom navigation but no tab icon */}
        <Tab.Screen 
          name="ProductDetails" 
          component={ProductDetails}
          options={{
            tabBarButton: () => null, // Hide from tab bar completely
            tabBarStyle: { display: 'flex' }, // Keep tab bar visible
            tabBarItemStyle: { display: 'none' }, // Don't reserve space
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

function RootStack() {
  return (
    <View style={{flex: 1}}>
      <Header />
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="SearchResults" component={SearchResults} />
        {/* ProductDetails moved to MainTabs to preserve bottom navigation */}
      </Stack.Navigator>
    </View>
  );
}

function AuthFlow() {
  const {user} = useContext(AuthContext);

  if (user === undefined) {
    return <ActivityIndicator size="large" color="tomato" />;
  }

  return (
    <NavigationContainer>
      {user ? <RootStack /> : <LoginStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AlertProvider>
      <NotificationProvider>
        <StripeProvider
          publishableKey={PUBLISHABLE_KEY}
          merchantIdentifier="merchant.com.occr.productos"
          urlScheme="occr-productos-app">
          <AuthProvider>
            <CartProvider>
              <OrderProvider>
                <AuthFlow />
              </OrderProvider>
            </CartProvider>
          </AuthProvider>
        </StripeProvider>
      </NotificationProvider>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
