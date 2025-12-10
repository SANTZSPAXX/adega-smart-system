import { useState, useEffect, useCallback } from 'react';
import { CartItem, Customer, Product } from '@/types/database';

interface PendingSale {
  id: string;
  cart: CartItem[];
  customer: Customer | null;
  discount: number;
  paymentMethod: string;
  total: number;
  timestamp: number;
}

const STORAGE_KEYS = {
  PRODUCTS: 'techcontrol_products_cache',
  CUSTOMERS: 'techcontrol_customers_cache',
  PENDING_SALES: 'techcontrol_pending_sales',
  LAST_SYNC: 'techcontrol_last_sync',
};

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [cachedProducts, setCachedProducts] = useState<Product[]>([]);
  const [cachedCustomers, setCachedCustomers] = useState<Customer[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached data
    loadCachedData();
    loadPendingSales();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadCachedData = () => {
    try {
      const products = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const customers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

      if (products) setCachedProducts(JSON.parse(products));
      if (customers) setCachedCustomers(JSON.parse(customers));
      if (lastSyncStr) setLastSync(new Date(lastSyncStr));
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const loadPendingSales = () => {
    try {
      const pending = localStorage.getItem(STORAGE_KEYS.PENDING_SALES);
      if (pending) setPendingSales(JSON.parse(pending));
    } catch (error) {
      console.error('Error loading pending sales:', error);
    }
  };

  const cacheProducts = useCallback((products: Product[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      setCachedProducts(products);
    } catch (error) {
      console.error('Error caching products:', error);
    }
  }, []);

  const cacheCustomers = useCallback((customers: Customer[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      setCachedCustomers(customers);
    } catch (error) {
      console.error('Error caching customers:', error);
    }
  }, []);

  const updateLastSync = useCallback(() => {
    const now = new Date();
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
    setLastSync(now);
  }, []);

  const addPendingSale = useCallback((sale: Omit<PendingSale, 'id' | 'timestamp'>) => {
    const newSale: PendingSale = {
      ...sale,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const updatedSales = [...pendingSales, newSale];
    localStorage.setItem(STORAGE_KEYS.PENDING_SALES, JSON.stringify(updatedSales));
    setPendingSales(updatedSales);

    return newSale;
  }, [pendingSales]);

  const removePendingSale = useCallback((id: string) => {
    const updatedSales = pendingSales.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.PENDING_SALES, JSON.stringify(updatedSales));
    setPendingSales(updatedSales);
  }, [pendingSales]);

  const clearPendingSales = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.PENDING_SALES);
    setPendingSales([]);
  }, []);

  return {
    isOnline,
    pendingSales,
    cachedProducts,
    cachedCustomers,
    lastSync,
    cacheProducts,
    cacheCustomers,
    updateLastSync,
    addPendingSale,
    removePendingSale,
    clearPendingSales,
    pendingSalesCount: pendingSales.length,
  };
}
