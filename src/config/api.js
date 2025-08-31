// API Configuration for OCCR Food Delivery
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://occr.pixelcrafters.digital/api';
const BASE_URL = process.env.REACT_APP_BASE_URL || 'https://occr.pixelcrafters.digital';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/login`,
  REGISTER: `${API_BASE_URL}/register`,
  GOOGLE_AUTH: `${API_BASE_URL}/auth/google`,
  APPLE_AUTH: `${API_BASE_URL}/auth/apple`,
  FORGOT_PASSWORD: `${API_BASE_URL}/forgetpasswordlink`,
  UPDATE_USER_PROFILE: `${API_BASE_URL}/updateuserprofile`,
  UPDATE_PASSWORD: `${API_BASE_URL}/updateusepassword`,
  
  // Products
  PRODUCTS: `${API_BASE_URL}/products`,
  PRODUCT_CATEGORIES: `${API_BASE_URL}/productscats`,
  SUGGESTIONS: `${API_BASE_URL}/products/sugerencias`,
  
  // Orders
  ORDER_SUBMIT: `${API_BASE_URL}/ordersubmit`,
  ORDER_HISTORY: `${API_BASE_URL}/orderhistory`,
  ORDER_DETAILS: `${API_BASE_URL}/orderdetails`,
  ORDER_MIGRATE: `${API_BASE_URL}/migrateorders`,
  
  // Payment
  PAYMENT_INTENT: `${API_BASE_URL}/create-payment-intent`,
  STRIPE_WEBHOOK: `${API_BASE_URL}/stripe/webhook`,
  
  // Address
  ADD_ADDRESS: `${API_BASE_URL}/addaddress`,
  FETCH_ADDRESS: `${API_BASE_URL}/fetch_address`,
  UPDATE_ADDRESS: `${API_BASE_URL}/updateaddress`,
  DELETE_ADDRESS: `${API_BASE_URL}/deleteaddress`,
  
  // User
  USER_DETAILS: `${API_BASE_URL}/userdetails`,
  
  // Other
  DELIVERY_DATES: `${API_BASE_URL}/fetch_ddates`,
  COMPLAINT_SUBMIT: `${API_BASE_URL}/compsubmit`,
  SAVE_FCM_TOKEN: `${API_BASE_URL}/save-fcm-token`,
  
  // Static files
  INVOICES: `${BASE_URL}/invoices`,
  IMAGES: `${BASE_URL}/mydoc`
};

export default API_BASE_URL;