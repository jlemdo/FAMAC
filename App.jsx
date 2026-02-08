import React, {useContext, useCallback, useMemo, useEffect, useRef} from 'react';
import {View, StyleSheet, ActivityIndicator, Platform, Dimensions, AppState} from 'react-native';
import {initializeGlobalNumericFont} from './src/config/globalNumericFont';
import NotificationService from './src/services/NotificationService';
import AutoUpdateService from './src/services/AutoUpdateService';
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
import {useNotificationManager} from './src/hooks/useNotificationManager';
import Ionicons from 'react-native-vector-icons/Ionicons';
import fonts from './src/theme/fonts';

import Cart from './src/cart/Cart';
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
import AddressManager from './src/address/AddressManager';
import AddressMap from './src/address/AddressMap';
import MapSelector from './src/address/MapSelector';

import {OrderContext} from './src/context/OrderContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// LIVE - PRODUCTION MODE ACTIVE
const PUBLISHABLE_KEY =
  'pk_live_51RUatHIhBUbZl3CrIf9BW6LjracnlDnVMnpeRkhIk2Th6ULOdgZiSL3oGnEkGR8h42aLnzyrHy80gGIjv6pzmTp800PbiPa4Pe';

// SANDBOX - DISABLED FOR PRODUCTION
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
  const {orders, refreshOrders} = useContext(OrderContext);
  const {cart} = useContext(CartContext);
  // ✅ FIXED: Siempre llamar useProfile(), validar condicionalmente después
  const profileContext = useProfile();
  const hasIncompleteProfile = (user?.usertype !== 'driver' && user?.usertype !== 'Guest') ? profileContext.hasIncompleteProfile : false;
  
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
    
    let activeOrders;
    if (user?.usertype === 'driver') {
      // Para drivers: contar órdenes activas (estados del backend: open, on the way, arriving)
      const activeDriverStatuses = ['open', 'on the way', 'arriving'];
      activeOrders = orders.filter(order =>
        activeDriverStatuses.includes(order.status?.toLowerCase())
      );
    } else {
      // Para usuarios normales: contar órdenes no completadas
      const finishedStatuses = ['delivered', 'cancelled'];
      activeOrders = orders.filter(order =>
        order.status && !finishedStatuses.includes(order.status.toLowerCase())
      );
    }
    
    if (activeOrders.length === 0) return null;
    return activeOrders.length > 99 ? '+99' : activeOrders.length;
  }, [orders, user?.usertype]);

  // ✅ REFRESH AUTOMÁTICO: Actualizar badge cuando app regresa del background
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && user) {
        // console.log('📱 App regresó del background - refrescando pedidos');
        refreshOrders();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user, refreshOrders]);

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

  // Optimized tab bar configuration - Estilo profesional
  const tabBarOptions = useMemo(() => ({
    tabBarActiveTintColor: '#D27F27',
    tabBarInactiveTintColor: '#999',
    tabBarStyle: {
      backgroundColor: '#FFF',
      paddingBottom: getTabBarPaddingBottom(),
      paddingTop: 8,
      height: getTabBarHeight(),
      borderTopWidth: 0,
      // Sombra profesional
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 10,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontFamily: fonts.bold,
      marginTop: 2,
    },
    headerShown: false,
    tabBarHideOnKeyboard: false,
  }), []);

  return (
    <View style={styles.container}>
      {/* <Header /> */}
      <Tab.Navigator
        initialRouteName={
          user.usertype === 'driver' ? "Historial de Pedidos" :
          user.usertype === 'Guest' ? "Inicio" :
          "Inicio"
        }
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            let iconName;
            const iconSize = 22;

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
            } else if (route.name === 'Perfil') {
              iconName = focused ? 'person' : 'person-outline';
            }

            // Retornar ícono directamente (sin View contenedor para evitar problemas)
            return <Ionicons name={iconName} size={iconSize} color={focused ? '#D27F27' : '#999'} />;
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
            {/* TEMPORALMENTE OCULTO - Sugerencias para implementar más tarde */}
            {/* <Tab.Screen 
              name="Sugerencias" 
              component={Suggestions}
            /> */}
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
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
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
      <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="MainTabs">
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="SearchResults" component={SearchResults} />
        <Stack.Screen name="AddressForm" component={AddressForm} />
        <Stack.Screen name="AddressFormUberStyle" component={AddressFormUberStyle} />
        <Stack.Screen name="AddressManager" component={AddressManager} />
        <Stack.Screen name="AddressMap" component={AddressMap} />
        <Stack.Screen name="MapSelector" component={MapSelector} />
        <Stack.Screen name="OrderDetails" component={OrderDetails} />
        {/* ProductDetails moved to MainTabs to preserve bottom navigation */}
      </Stack.Navigator>
    </View>
  );
}

function AuthFlow() {
  const {user} = useContext(AuthContext);
  const {addNotification} = useNotification();
  const {forceRefreshOrders} = useContext(OrderContext);
  const navigationRef = useRef();

  // ✅ NUEVO: Usar hook para manejar notificaciones y prevenir contaminación cruzada
  const {isInitialized, reinitializeNotifications} = useNotificationManager(user);

  // Conectar Firebase con NotificationContext
  useEffect(() => {
    NotificationService.setNotificationCallback(addNotification);
  }, [addNotification]);

  // 🚚 DRIVER FIX: Conectar forceRefreshOrders para que las notificaciones actualicen la lista
  useEffect(() => {
    if (forceRefreshOrders) {
      NotificationService.setForceRefreshOrdersCallback(forceRefreshOrders);
    }
  }, [forceRefreshOrders]);

  // 🔧 CRÍTICO: Configurar navigationRef para que las notificaciones puedan navegar
  useEffect(() => {
    if (navigationRef.current) {
      NotificationService.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current]);

  // 🎯 GUEST FIX: Forzar navegación a Inicio para usuarios Guest
  useEffect(() => {
    if (user?.usertype === 'Guest' && navigationRef.current) {
      // Pequeño delay para asegurar que la navegación esté lista
      setTimeout(() => {
        navigationRef.current?.navigate('MainTabs', {
          screen: 'Inicio',
          params: { screen: 'CategoriesList' }
        });
      }, 100);
    }
  }, [user?.usertype]);

  if (user === undefined) {
    return <ActivityIndicator size="large" color="tomato" />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <RootStack /> : <LoginStack />}
    </NavigationContainer>
  );
}

export default function App() {
  // ✅ INICIALIZAR: Override global para fuentes numéricas y actualizaciones
  React.useEffect(() => {
    initializeGlobalNumericFont();

    // Inicializar sistema de actualizaciones automáticas
    AutoUpdateService.initialize();
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
