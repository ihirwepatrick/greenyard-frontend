import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Product, CartItem, Currency } from '../types';
// products removed; cart will persist snapshots

interface AppState {
  cart: CartItem[];
  favorites: Product[];
  currency: Currency;
  searchQuery: string;
  selectedCategory: string;
  currentPage: string;
  cookieConsent: boolean;
}

type AppAction =
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_FAVORITE'; payload: Product }
  | { type: 'REMOVE_FAVORITE'; payload: string }
  | { type: 'SET_CURRENCY'; payload: Currency }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_CURRENT_PAGE'; payload: string }
  | { type: 'SET_COOKIE_CONSENT'; payload: boolean };

const currencies: Currency[] = [
  { code: 'RWF', symbol: 'RWF', rate: 1 }, // Prices from backend are already in RWF
  { code: 'USD', symbol: '$', rate: 1 }
];

const initialState: AppState = {
  cart: [],
  favorites: [],
  currency: currencies[0],
  searchQuery: '',
  selectedCategory: 'all',
  currentPage: 'home',
  cookieConsent: false
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_TO_CART':
      // Filter out any invalid cart items first
      const validCart = state.cart.filter(item => item?.product?.id);
      const existingItem = validCart.find(item => item.product.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          cart: validCart.map(item =>
            item.product.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      }
      return {
        ...state,
        cart: [...validCart, { product: action.payload, quantity: 1 }]
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item?.product?.id && item.product.id !== action.payload)
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        cart: state.cart
          .filter(item => item?.product?.id) // Remove invalid items
          .map(item =>
            item.product.id === action.payload.id
              ? { ...item, quantity: action.payload.quantity }
              : item
          )
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'TOGGLE_FAVORITE':
      const isFavorite = state.favorites.some(fav => fav.id === action.payload.id);
      if (isFavorite) {
        return {
          ...state,
          favorites: state.favorites.filter(fav => fav.id !== action.payload.id)
        };
      }
      return {
        ...state,
        favorites: [...state.favorites, action.payload]
      };

    case 'REMOVE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.filter(fav => fav.id !== action.payload)
      };

    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };

    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };

    case 'SET_COOKIE_CONSENT':
      return { ...state, cookieConsent: action.payload };

    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  currencies: Currency[];
  formatPrice: (price: number) => string;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  getFavoritesCount: () => number;
  isFavorite: (productId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Keys and helpers for cart persistence
  const CART_STORAGE_KEY = 'gy_cart_v1';
  const CART_COOKIE_NAME = 'gy_cart_enabled';
  const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days
  
  // Keys and helpers for favorites persistence
  const FAVORITES_STORAGE_KEY = 'gy_favorites_v1';
  const FAVORITES_COOKIE_NAME = 'gy_favorites_enabled';
  const FAVORITES_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 365 days

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };

  const setCookie = (name: string, value: string, maxAgeSeconds: number) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
  };

  const deleteCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  };

  type PersistedCartItem = { product: Product; quantity: number };

  const hydrateCartFromStorage = (): CartItem[] => {
    if (typeof window === 'undefined') return [];
    // Only restore if our cart cookie exists; if cookies were deleted, treat as a fresh session
    const hasCartCookie = !!getCookie(CART_COOKIE_NAME);
    if (!hasCartCookie) return [];

    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const persisted: PersistedCartItem[] = JSON.parse(raw);
      if (!Array.isArray(persisted)) return [];
      // Filter out invalid items and validate product structure
      return persisted
        .filter((entry) => {
          if (!entry?.product || !entry.product?.id) return false;
          // Allow price to be number or string that can be converted
          const price = typeof entry.product.price === 'number' 
            ? entry.product.price 
            : (typeof entry.product.price === 'string' ? parseFloat(entry.product.price) : NaN);
          return !isNaN(price) && price >= 0;
        })
        .map((entry) => {
          // Ensure price is a number
          const price = typeof entry.product.price === 'number' 
            ? entry.product.price 
            : (typeof entry.product.price === 'string' ? parseFloat(entry.product.price) : 0);
          return {
            product: {
              ...entry.product,
              price: price
            },
            quantity: Math.max(1, Math.floor(entry.quantity || 1))
          };
        });
    } catch {
      return [];
    }
  };

  const hydrateFavoritesFromStorage = (): Product[] => {
    if (typeof window === 'undefined') return [];
    // Only restore if our favorites cookie exists
    const hasFavoritesCookie = !!getCookie(FAVORITES_COOKIE_NAME);
    if (!hasFavoritesCookie) return [];

    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) return [];
      const persisted: Product[] = JSON.parse(raw);
      if (!Array.isArray(persisted)) return [];
      return persisted;
    } catch {
      return [];
    }
  };

  const [state, dispatch] = useReducer(appReducer, initialState, (base) => ({
    ...base,
    cart: hydrateCartFromStorage(),
    favorites: hydrateFavoritesFromStorage()
  }));

  const formatPrice = (price: number): string => {
    const convertedPrice = price * state.currency.rate;
    return `${state.currency.symbol}${convertedPrice.toLocaleString()}`;
  };

  const getCartTotal = (): number => {
    return state.cart.reduce((total, item) => {
      if (!item?.product?.id) return total;
      // Convert price to number if it's a string, or use 0 if invalid
      const price = typeof item.product.price === 'number' 
        ? item.product.price 
        : (typeof item.product.price === 'string' ? parseFloat(item.product.price) : 0);
      if (isNaN(price) || price < 0) return total;
      return total + (price * item.quantity);
    }, 0);
  };

  const getCartItemCount = (): number => {
    return state.cart.reduce((count, item) => count + item.quantity, 0);
  };

  const getFavoritesCount = (): number => {
    return state.favorites.length;
  };

  const isFavorite = (productId: string): boolean => {
    return state.favorites.some(fav => fav.id === productId);
  };

  // Persist cart changes to localStorage and a long-lived cookie
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (state.cart.length === 0) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        deleteCookie(CART_COOKIE_NAME);
        return;
      }
      // Only persist valid items
      const validItems = state.cart.filter(item => item?.product?.id);
      if (validItems.length === 0) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        deleteCookie(CART_COOKIE_NAME);
        return;
      }
      const compact: PersistedCartItem[] = validItems.map(ci => ({ product: ci.product, quantity: ci.quantity }));
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(compact));
      setCookie(CART_COOKIE_NAME, '1', CART_COOKIE_MAX_AGE_SECONDS);
    } catch {
      // Swallow storage errors to avoid breaking UX
    }
  }, [state.cart]);

  // Persist favorites changes to localStorage and a long-lived cookie
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (state.favorites.length === 0) {
        window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
        deleteCookie(FAVORITES_COOKIE_NAME);
        return;
      }
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favorites));
      setCookie(FAVORITES_COOKIE_NAME, '1', FAVORITES_COOKIE_MAX_AGE_SECONDS);
    } catch {
      // Swallow storage errors to avoid breaking UX
    }
  }, [state.favorites]);

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      currencies,
      formatPrice,
      getCartTotal,
      getCartItemCount,
      getFavoritesCount,
      isFavorite
    }}>
      {children}
    </AppContext.Provider>
  );
};