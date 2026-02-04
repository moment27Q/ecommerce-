import { create } from 'zustand';
import type { Product, ProductTag } from '@/types';
import { API } from '@/lib/api';

export interface ProductFormData {
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  stock: number;
  rating?: number;
  originalPrice?: number;
  tag?: ProductTag;
}

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/products`);
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();
      set({ products: data, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Error desconocido',
        products: [],
      });
    }
  },
}));
