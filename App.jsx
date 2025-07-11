import React, {useContext} from 'react';
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
      <Stack.Screen name="ProductDetails" component={ProductDetails} />
      {/* <Stack.Screen name="SearchResults" component={SearchResults} /> */}
    </Stack.Navigator>
  );
}

function MainTabs() {
  const {user} = useContext(AuthContext);
  const {orderCount} = useContext(OrderContext);
  const {cart} = useContext(CartContext);

  console.log('ccc', cart);
  return (
    <View style={styles.container}>
      {/* <Header /> */}
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            let iconName;
            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Cart') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (
              route.name === 'Order' ||
              route.name === 'Order History'
            ) {
              iconName = focused ? 'clipboard' : 'clipboard-outline';
            } else if (route.name === 'Route') {
              iconName = focused ? 'navigate' : 'navigate-outline';
            } else if (route.name === 'You') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {backgroundColor: 'white', paddingBottom: 5},
          headerShown: false,
        })}>
        {user.usertype === 'driver' ? (
          <>
            {/* <Tab.Screen name="Home" component={HomeStack} /> */}
            <Tab.Screen
              name="Order History"
              component={OrderStack}
              options={{
                tabBarBadge: orderCount > 0 ? orderCount : null,
              }}
            />
          </>
        ) : (
          <>
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen
              name="Cart"
              component={Cart}
              options={{
                tabBarBadge: cart.length > 0 ? cart.length : null,
              }}
            />
            <Tab.Screen name="Order" component={OrderStack} />
            {/* <Tab.Screen name="Route" component={Route} /> */}
          </>
        )}
        <Tab.Screen name="You" component={Profile} />
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
        <Stack.Screen name="ProductDetails" component={ProductDetails} />
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
          merchantIdentifier="merchant.com.occr.productos">
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
