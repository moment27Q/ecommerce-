export type ProductTag = 'IN STOCK' | 'SALE' | 'TOOLS' | 'BULK PRICING';

export interface Product {
  id: string;
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

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    notes?: string;
  };
  items: CartItem[];
  total: number;
  paymentMethod: 'yape' | 'plin' | 'card' | 'transfer';
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}
