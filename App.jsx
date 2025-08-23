import React, {useContext, useCallback, useMemo, useEffect} from 'react';
import {View, StyleSheet, ActivityIndicator, Platform, Dimensions} from 'react-native';
import {initializeGlobalNumericFont} from './src/config/globalNumericFont';
import NotificationService from './src/services/NotificationService';
import {NavigationContainer} from '@react-navigation/native';
import CategoriesList from './src/home/CategoriesList';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SpecificCategoryProduct from './src/home/SpecificCategoryProduct';
import ProductDetails from './src/home/ProductDetails';
import {CartContext, CartProvider} from './src/context/CartContext';
import {OrderProvider} from './src/context/OrderContext';
import {NotificationProvider, useNotification} from './src/context/NotificationContext';
import {StripeProvider} from '@stripe/stripe-react-native';
import {AuthContext} from './src/context/AuthContext';
import {AuthProvider} from './src/context/AuthContext';
import {AlertProvider} from './src/context/AlertContext';
import {ProfileProvider, useProfile} from './src/context/ProfileContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import fonts from './src/theme/fonts';
import NotificationService from './src/services/NotificationService';

import Cart from './src/cart/Cart';
import GuestCheckout from './src/cart/GuestCheckout';
// Removed unused Route import - component was dead code
import Profile from './src/profile/Profile';
import Suggestions from './src/suggestions/Suggestions';
import Header from './src/header/Header';
import SplashScreen from './src/authentication/Splash';
import WelcomeVideo from './src/authentication/WelcomeVideo';
import Login from './src/authentication/Login';
import SignUp from './src/authentication/Signup';
import ForgotPassword from './src/authentication/ForgotPassword';
import Order from './src/order/Order';
import OrderDetails from './src/order/OrderDetail';
import SearchResults from './src/home/SearchResults';
import AddressForm from './src/address/AddressForm';
import AddressFormUberStyle from './src/address/AddressFormUberStyle';
import AddressMap from './src/address/AddressMap';
import MapSelector from './src/address/MapSelector';

import {OrderContext} from './src/context/OrderContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// LIVE
const PUBLISHABLE_KEY =
  'pk_live_51RUatHIhBUbZl3CrIf9BW6LjracnlDnVMnpeRkhIk2Th6ULOdgZiSL3oGnEkGR8h42aLnzyrHy80gGIjv6pzmTp800PbiPa4Pe';
  // SANDBOX
// const PUBLISHABLE_KEY =
//   'pk_test_51RUatQIwltH9llH1Ihi6ZvEZ9O1ZqYgLEHdUBS3vQ3E890oQycuF0ITlgocwypo0igPl94uDE9t84fQ0R2VAQc1100XwsvKNjR';
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
  const {hasIncompleteProfile} = useProfile(); // Usar el nuevo contexto
  
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

  // Función para obtener altura del bottom tab basada en el dispositivo
  const getTabBarHeight = () => {
    const { height } = Dimensions.get('window');
    
    if (Platform.OS === 'ios') {
      // iPhone X y modelos más nuevos (con home indicator)
      if (height >= 812) {
        return 85; // Altura base + safe area bottom
      }
      // Modelos más antiguos
      else {
        return 65;
      }
    }
    
    // Android
    return 65;
  };

  // Función para obtener padding bottom del tab bar
  const getTabBarPaddingBottom = () => {
    const { height } = Dimensions.get('window');
    
    if (Platform.OS === 'ios') {
      // iPhone X y modelos más nuevos
      if (height >= 812) {
        return 25; // Para el home indicator
      }
      // Modelos más antiguos
      else {
        return 8;
      }
    }
    
    // Android
    return 8;
  };

  // Optimized tab bar configuration
  const tabBarOptions = useMemo(() => ({
    tabBarActiveTintColor: '#D27F27', // Usar color del theme
    tabBarInactiveTintColor: '#8B5E3C',
    tabBarStyle: {
      backgroundColor: 'white',
      paddingBottom: getTabBarPaddingBottom(),
      paddingTop: Platform.OS === 'ios' ? 8 : 5,
      height: getTabBarHeight(),
      borderTopWidth: 1,
      borderTopColor: 'rgba(139, 94, 60, 0.1)',
      // Sombra más suave
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    tabBarLabelStyle: {
      fontSize: Platform.OS === 'ios' ? 11 : 10,
      fontFamily: fonts.bold,
      marginTop: Platform.OS === 'ios' ? 2 : 0,
      marginBottom: Platform.OS === 'ios' ? 2 : 0,
    },
    tabBarIconStyle: {
      marginBottom: Platform.OS === 'ios' ? 2 : 0,
    },
    headerShown: false,
    // Mantener tab bar siempre visible
    tabBarHideOnKeyboard: false,
  }), []);

  return (
    <View style={styles.container}>
      {/* <Header /> */}
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            let iconName;
            // Tamaño optimizado para iOS
            const iconSize = Platform.OS === 'ios' ? 26 : size;
            
            if (route.name === 'Inicio') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Carrito') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (
              route.name === 'Pedidos' ||
              route.name === 'Historial de Pedidos'
            ) {
              iconName = focused ? 'clipboard' : 'clipboard-outline';
            } else if (route.name === 'Ruta') {
              iconName = focused ? 'navigate' : 'navigate-outline';
            } else if (route.name === 'Sugerencias') {
              iconName = focused ? 'bulb' : 'bulb-outline';
            } else if (route.name === 'Perfil') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={iconSize} color={color} />;
          },
          ...tabBarOptions,
        })}>
        {user.usertype === 'driver' ? (
          <>
            {/* <Tab.Screen name="Home" component={HomeStack} /> */}
            <Tab.Screen
              name="Historial de Pedidos"
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
              name="Pedidos" 
              component={OrderStack}
              options={{
                tabBarBadge: ordersBadge,
              }}
            />
            <Tab.Screen 
              name="Sugerencias" 
              component={Suggestions}
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
      <View style={{zIndex: 1000}}>
        <Header />
      </View>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="SearchResults" component={SearchResults} />
        <Stack.Screen name="AddressForm" component={AddressForm} />
        <Stack.Screen name="AddressFormUberStyle" component={AddressFormUberStyle} />
        <Stack.Screen name="AddressMap" component={AddressMap} />
        <Stack.Screen name="MapSelector" component={MapSelector} />
        <Stack.Screen name="GuestCheckout" component={GuestCheckout} />
        {/* ProductDetails moved to MainTabs to preserve bottom navigation */}
      </Stack.Navigator>
    </View>
  );
}

function AuthFlow() {
  const {user} = useContext(AuthContext);
  const {addNotification} = useNotification();

  // Inicializar notificaciones cuando el usuario esté autenticado (EXACTO como commit 651d13b)
  useEffect(() => {
    if (user && user.id) {
      console.log('🔔 Inicializando notificaciones para usuario:', user.id);
      
      // ✅ CONECTAR Firebase con NotificationContext (igual que Android)
      NotificationService.setNotificationCallback(addNotification);
      
      NotificationService.initialize(user.id);
    }
  }, [user, addNotification]);

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
  // ✅ INICIALIZAR: Override global para fuentes numéricas
  React.useEffect(() => {
    initializeGlobalNumericFont();
  }, []);

  return (
    <AlertProvider>
      <NotificationProvider>
        <StripeProvider
          publishableKey={PUBLISHABLE_KEY}
          merchantIdentifier="merchant.com.occr.productos"
          urlScheme="occr-productos-app">
          <AuthProvider>
            <ProfileProvider>
              <CartProvider>
                <OrderProvider>
                  <AuthFlow />
                </OrderProvider>
              </CartProvider>
            </ProfileProvider>
          </AuthProvider>
        </StripeProvider>
      </NotificationProvider>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4', // Background consistente
  },
});
