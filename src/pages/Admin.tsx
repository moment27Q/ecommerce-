import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  LayoutGrid,
  Layers,
  ShoppingBag,
  Package,
  Eye,
  CheckCircle,
  Truck,
  Home as HomeIcon,
  XCircle,
  Clock,
  Search,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  ExternalLink,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Calendar,
  MoreVertical,
  CreditCard,
  Info,
  Percent,
  Upload,
  Filter,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useProductsStore, type ProductFormData } from '@/store/productsStore';
import { useAuthStore } from '@/store/authStore';
import { fetchWithAuth, API } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Order, Product, ProductTag } from '@/types';

type AdminSection = 'dashboard' | 'orders' | 'products' | 'categories' | 'filterGroups' | 'carousel' | 'promoBanners' | 'offers';

export interface Offer {
  id: number;
  productId: string;
  discountPercent: number;
  validUntil?: string;
  product: Product;
}

function formatOrderDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return 'Hace menos de 1 hora';
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays === 1) return `Ayer, ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export interface CarouselSlide {
  id: number;
  src: string;
  alt: string;
  sortOrder: number;
}

export interface PromoBanner {
  id: number;
  image: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  filterKey: string | null;
}

export interface FilterGroup {
  id: string;
  name: string;
  key: string;
  sortOrder: number;
}

const PRODUCT_TAGS: ProductTag[] = ['IN STOCK', 'SALE', 'TOOLS', 'BULK PRICING'];

const emptyProductForm: ProductFormData = {
  name: '',
  price: 0,
  image: '',
  category: '',
  description: '',
  stock: 0,
  rating: undefined,
  originalPrice: undefined,
  tag: undefined,
};

export function Admin() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { fetchProducts } = useProductsStore();

  const [section, setSection] = useState<AdminSection>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(emptyProductForm);
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productDeleteInProgress, setProductDeleteInProgress] = useState(false);
  const [productDeleteError, setProductDeleteError] = useState<string | null>(null);

  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(false);
  const [slideDialogOpen, setSlideDialogOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [slideForm, setSlideForm] = useState({ image: '', alt: '' });
  const [slideSaving, setSlideSaving] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<CarouselSlide | null>(null);

  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [promoBannersLoading, setPromoBannersLoading] = useState(false);
  const [promoBannerDialogOpen, setPromoBannerDialogOpen] = useState(false);
  const [editingPromoBannerId, setEditingPromoBannerId] = useState<number | null>(null);
  const [promoBannerForm, setPromoBannerForm] = useState({ image: '', title: '', description: '' });
  const [promoBannerSaving, setPromoBannerSaving] = useState(false);
  const [promoBannerError, setPromoBannerError] = useState<string | null>(null);
  const [promoBannerToDelete, setPromoBannerToDelete] = useState<PromoBanner | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [offerForm, setOfferForm] = useState({ productId: '', discountPercent: 10, validUntil: '' });
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'Wrench', filterKey: '' });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);

  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [filterGroupsLoading, setFilterGroupsLoading] = useState(false);
  const [filterGroupDialogOpen, setFilterGroupDialogOpen] = useState(false);
  const [editingFilterGroupId, setEditingFilterGroupId] = useState<string | null>(null);
  const [filterGroupForm, setFilterGroupForm] = useState({ name: '', key: '' });
  const [filterGroupSaving, setFilterGroupSaving] = useState(false);
  const [filterGroupToDelete, setFilterGroupToDelete] = useState<FilterGroup | null>(null);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/orders`);
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al cargar pedidos');
      const data = await res.json();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [logout, navigate]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API}/products`);
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (section === 'dashboard' || section === 'orders') loadOrders();
  }, [section, loadOrders]);

  useEffect(() => {
    if (section === 'products') loadProducts();
  }, [section, loadProducts]);

  const loadCarousel = useCallback(async () => {
    setCarouselLoading(true);
    try {
      const res = await fetch(`${API}/carousel`);
      if (!res.ok) throw new Error('Error al cargar carrusel');
      const data = await res.json();
      setCarouselSlides(data);
    } catch {
      setCarouselSlides([]);
    } finally {
      setCarouselLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'carousel') loadCarousel();
  }, [section, loadCarousel]);

  const loadPromoBanners = useCallback(async () => {
    setPromoBannersLoading(true);
    try {
      const res = await fetch(`${API}/promo-banners`);
      if (!res.ok) throw new Error('Error al cargar banners');
      const data = await res.json();
      setPromoBanners(data);
    } catch {
      setPromoBanners([]);
    } finally {
      setPromoBannersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'promoBanners') loadPromoBanners();
  }, [section, loadPromoBanners]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch(`${API}/categories`);
      if (!res.ok) throw new Error('Error al cargar categorías');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadFilterGroups = useCallback(async () => {
    setFilterGroupsLoading(true);
    try {
      const res = await fetch(`${API}/filter-groups`);
      if (!res.ok) throw new Error('Error al cargar grupos');
      const data = await res.json();
      setFilterGroups(Array.isArray(data) ? data : []);
    } catch {
      setFilterGroups([]);
    } finally {
      setFilterGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'categories' || section === 'products') loadCategories();
  }, [section, loadCategories]);

  useEffect(() => {
    if (section === 'filterGroups' || section === 'categories') loadFilterGroups();
  }, [section, loadFilterGroups]);

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/offers/all`);
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al cargar ofertas');
      const data = await res.json();
      setOffers(data);
    } catch {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (section === 'offers') {
      loadOffers();
      loadProducts();
    }
  }, [section, loadOffers, loadProducts]);

  const filteredOrders = orders
    .filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesSearch =
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusBadge = (status: Order['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      paid: 'bg-blue-100 text-blue-800 border-blue-300',
      shipped: 'bg-purple-100 text-purple-800 border-purple-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    const labels = {
      pending: 'Pendiente',
      paid: 'Pagado',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    const icons = {
      pending: Clock,
      paid: CheckCircle,
      shipped: Truck,
      delivered: HomeIcon,
      cancelled: XCircle,
    };
    const Icon = icons[status];
    return (
      <Badge variant="outline" className={`${styles[status]} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {labels[status]}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: Order['paymentMethod']) => {
    const labels = { yape: 'Yape', plin: 'Plin', card: 'Tarjeta', transfer: 'Transferencia' };
    return labels[method];
  };

  const now = Date.now();
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const last30Start = now - ms30;
  const prev30Start = now - 2 * ms30;
  const inLast30 = (o: Order) => new Date(o.createdAt).getTime() >= last30Start;
  const inPrev30 = (o: Order) => {
    const t = new Date(o.createdAt).getTime();
    return t >= prev30Start && t < last30Start;
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    totalRevenue: orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0),
  };

  const last30 = {
    total: orders.filter(inLast30).length,
    pending: orders.filter((o) => inLast30(o) && o.status === 'pending').length,
    shippedDelivered: orders.filter((o) => inLast30(o) && (o.status === 'shipped' || o.status === 'delivered')).length,
    revenue: orders
      .filter((o) => inLast30(o) && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0),
  };
  const prev30 = {
    total: orders.filter(inPrev30).length,
    pending: orders.filter((o) => inPrev30(o) && o.status === 'pending').length,
    shippedDelivered: orders.filter((o) => inPrev30(o) && (o.status === 'shipped' || o.status === 'delivered')).length,
    revenue: orders
      .filter((o) => inPrev30(o) && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0),
  };

  const pct = (curr: number, prev: number) => {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return Math.round(((curr - prev) / prev) * 100);
  };
  const pctTotal = pct(last30.total, prev30.total);
  const pctPending = pct(last30.pending, prev30.pending);
  const pctShipped = pct(last30.shippedDelivered, prev30.shippedDelivered);
  const pctRevenue = pct(last30.revenue, prev30.revenue);

  const fmtPct = (n: number) => (n === 0 ? '0%' : n > 0 ? `+${n}%` : `${n}%`);

  const openAddProduct = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
    setProductError(null);
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductError(null);
    setProductForm({
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      description: product.description,
      stock: product.stock,
      rating: product.rating,
      originalPrice: product.originalPrice,
      tag: product.tag,
    });
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || productForm.price < 0 || productForm.stock < 0) {
      setProductError('Completa nombre, precio y stock.');
      return;
    }
    if (!productForm.category.trim()) {
      setProductError('Selecciona una categoría.');
      return;
    }
    setProductError(null);
    setProductSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (editingProductId) {
        const res = await fetchWithAuth(`${API}/products/${editingProductId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(productForm),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.includes('Cannot POST') || text.includes('Cannot PUT')) {
            throw new Error('El servidor no tiene la ruta. ¿Está corriendo el backend? (carpeta server → npm run start)');
          }
          let data: { error?: string } = {};
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(text || `Error ${res.status}`);
          }
          throw new Error((data as { error?: string }).error || 'Error al actualizar');
        }
      } else {
        const res = await fetchWithAuth(`${API}/products`, {
          method: 'POST',
          headers,
          body: JSON.stringify(productForm),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.includes('Cannot POST') || text.includes('Cannot PUT')) {
            throw new Error('El servidor no tiene la ruta. ¿Está corriendo el backend? (carpeta server → npm run start)');
          }
          let data: { error?: string } = {};
          try {
            data = JSON.parse(text);
          } catch {
            if (res.status === 413) throw new Error('La imagen es demasiado grande. Prueba con una imagen más pequeña.');
            throw new Error(text || `Error ${res.status}`);
          }
          const msg = (data as { error?: string }).error;
          if (res.status === 400 && !msg) throw new Error('Faltan campos requeridos: nombre, precio, categoría y stock.');
          throw new Error(msg || 'Error al crear el producto');
        }
      }
      setProductDialogOpen(false);
      setProductForm(emptyProductForm);
      setEditingProductId(null);
      await loadProducts();
      fetchProducts();
    } catch (e) {
      setProductError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductDeleteError(null);
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!productToDelete) return;
    setProductDeleteInProgress(true);
    setProductDeleteError(null);
    try {
      const res = await fetchWithAuth(`${API}/products/${productToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        let msg = 'Error al eliminar';
        try {
          const json = JSON.parse(text);
          if (json?.error) msg = json.error;
        } catch {
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      setProductToDelete(null);
      await loadProducts();
      fetchProducts();
    } catch (err) {
      console.error(err);
      setProductDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setProductDeleteInProgress(false);
    }
  };

  const openAddSlide = () => {
    setEditingSlideId(null);
    setSlideForm({ image: '', alt: '' });
    setSlideDialogOpen(true);
  };

  const openEditSlide = (slide: CarouselSlide) => {
    setEditingSlideId(slide.id);
    setSlideForm({ image: slide.src, alt: slide.alt });
    setSlideDialogOpen(true);
  };

  const handleSaveSlide = async () => {
    if (!slideForm.image.trim()) return;
    setSlideSaving(true);
    try {
      if (editingSlideId != null) {
        const res = await fetchWithAuth(`${API}/carousel/${editingSlideId}`, {
          method: 'PUT',
          body: JSON.stringify({ image: slideForm.image.trim(), alt: slideForm.alt.trim() }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Error al actualizar');
      } else {
        const res = await fetchWithAuth(`${API}/carousel`, {
          method: 'POST',
          body: JSON.stringify({ image: slideForm.image.trim(), alt: slideForm.alt.trim() }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Error al crear');
      }
      setSlideDialogOpen(false);
      setSlideForm({ image: '', alt: '' });
      setEditingSlideId(null);
      await loadCarousel();
    } catch (e) {
      console.error(e);
    } finally {
      setSlideSaving(false);
    }
  };

  const moveSlide = async (index: number, direction: 'up' | 'down') => {
    const newOrder = [...carouselSlides];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    const orderIds = newOrder.map((s) => s.id);
    try {
      const res = await fetchWithAuth(`${API}/carousel/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ order: orderIds }),
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al reordenar');
      const data = await res.json();
      setCarouselSlides(data);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeleteSlide = async () => {
    if (!slideToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/carousel/${slideToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al eliminar');
      setSlideToDelete(null);
      await loadCarousel();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddPromoBanner = () => {
    setEditingPromoBannerId(null);
    setPromoBannerForm({ image: '', title: '', description: '' });
    setPromoBannerError(null);
    setPromoBannerDialogOpen(true);
  };

  const openEditPromoBanner = (banner: PromoBanner) => {
    setEditingPromoBannerId(banner.id);
    setPromoBannerForm({ image: banner.image, title: banner.title, description: banner.description });
    setPromoBannerError(null);
    setPromoBannerDialogOpen(true);
  };

  const handleSavePromoBanner = async (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    if (!promoBannerForm.image.trim()) return;
    setPromoBannerSaving(true);
    setPromoBannerError(null);
    try {
      if (editingPromoBannerId != null) {
        const res = await fetchWithAuth(`${API}/promo-banners/${editingPromoBannerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: promoBannerForm.image.trim(),
            title: promoBannerForm.title.trim(),
            description: promoBannerForm.description.trim(),
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          let msg = `Error al actualizar (${res.status})`;
          try {
            const err = JSON.parse(text);
            if (err && typeof err.error === 'string') msg = err.error;
          } catch {
            if (text && text.length < 200) msg = text;
          }
          throw new Error(msg);
        }
      } else {
        const res = await fetchWithAuth(`${API}/promo-banners`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: promoBannerForm.image.trim(),
            title: promoBannerForm.title.trim(),
            description: promoBannerForm.description.trim(),
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.trimStart().startsWith('<!') || text.includes('Cannot POST') || text.includes('Cannot GET')) {
            throw new Error('El servidor no tiene la ruta de banners. Para el servidor (Ctrl+C) y vuelve a ejecutar en la carpeta server: npm start o node index.js');
          }
          let msg = `Error al crear (${res.status})`;
          try {
            const err = JSON.parse(text);
            if (err && typeof err.error === 'string') msg = err.error;
          } catch {
            if (text && text.length < 200) msg = text;
          }
          if (typeof msg === 'string' && (msg.includes('no such table') || msg.includes('promo_banners'))) {
            throw new Error('La base de datos no tiene la tabla de banners. Reinicia el servidor (carpeta server).');
          }
          throw new Error(msg);
        }
      }
      setPromoBannerDialogOpen(false);
      setPromoBannerForm({ image: '', title: '', description: '' });
      setEditingPromoBannerId(null);
      await loadPromoBanners();
    } catch (err) {
      console.error(err);
      setPromoBannerError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setPromoBannerSaving(false);
    }
  };

  const movePromoBanner = async (index: number, direction: 'up' | 'down') => {
    const newOrder = [...promoBanners];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    const orderIds = newOrder.map((b) => b.id);
    try {
      const res = await fetchWithAuth(`${API}/promo-banners/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderIds }),
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al reordenar');
      const data = await res.json();
      setPromoBanners(data);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeletePromoBanner = async () => {
    if (!promoBannerToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/promo-banners/${promoBannerToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al eliminar');
      setPromoBannerToDelete(null);
      await loadPromoBanners();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: '', icon: 'Wrench', filterKey: '' });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: AdminCategory) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({ name: cat.name, icon: cat.icon || 'Wrench', filterKey: cat.filterKey || '' });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    setCategorySaving(true);
    try {
      if (editingCategoryId != null) {
        const res = await fetchWithAuth(`${API}/categories/${editingCategoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryForm.name.trim(),
            icon: categoryForm.icon.trim() || 'Wrench',
            filterKey: categoryForm.filterKey.trim() || null,
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Error al actualizar');
        }
      } else {
        const res = await fetchWithAuth(`${API}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryForm.name.trim(),
            icon: categoryForm.icon.trim() || 'Wrench',
            filterKey: categoryForm.filterKey.trim() || null,
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Error al crear');
        }
      }
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', icon: 'Wrench', filterKey: '' });
      setEditingCategoryId(null);
      await loadCategories();
    } catch (e) {
      console.error(e);
    } finally {
      setCategorySaving(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/categories/${categoryToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al eliminar');
      setCategoryToDelete(null);
      await loadCategories();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddFilterGroup = () => {
    setEditingFilterGroupId(null);
    setFilterGroupForm({ name: '', key: '' });
    setFilterGroupDialogOpen(true);
  };

  const openEditFilterGroup = (fg: FilterGroup) => {
    setEditingFilterGroupId(fg.id);
    setFilterGroupForm({ name: fg.name, key: fg.key });
    setFilterGroupDialogOpen(true);
  };

  const handleSaveFilterGroup = async () => {
    if (!filterGroupForm.name.trim()) return;
    setFilterGroupSaving(true);
    try {
      const keyVal = filterGroupForm.key.trim()
        ? filterGroupForm.key.trim().toLowerCase().replace(/\s+/g, '-')
        : filterGroupForm.name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
      if (editingFilterGroupId != null) {
        const res = await fetchWithAuth(`${API}/filter-groups/${editingFilterGroupId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: filterGroupForm.name.trim(), key: keyVal }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Error al actualizar');
        }
      } else {
        const res = await fetchWithAuth(`${API}/filter-groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: filterGroupForm.name.trim(), key: keyVal }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Error al crear');
        }
      }
      setFilterGroupDialogOpen(false);
      setFilterGroupForm({ name: '', key: '' });
      setEditingFilterGroupId(null);
      await loadFilterGroups();
    } catch (e) {
      console.error(e);
    } finally {
      setFilterGroupSaving(false);
    }
  };

  const confirmDeleteFilterGroup = async () => {
    if (!filterGroupToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/filter-groups/${filterGroupToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al eliminar');
      setFilterGroupToDelete(null);
      await loadFilterGroups();
      await loadCategories();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddOffer = async () => {
    setEditingOfferId(null);
    setOfferForm({ productId: '', discountPercent: 10, validUntil: '' });
    setOfferError(null);
    if (products.length === 0) await loadProducts();
    setOfferDialogOpen(true);
  };

  const openEditOffer = (offer: Offer) => {
    setEditingOfferId(offer.id);
    setOfferForm({
      productId: offer.productId,
      discountPercent: offer.discountPercent,
      validUntil: offer.validUntil || '',
    });
    setOfferError(null);
    setOfferDialogOpen(true);
  };

  const handleSaveOffer = async () => {
    if (!offerForm.productId.trim() || offerForm.discountPercent < 0 || offerForm.discountPercent > 100) return;
    setOfferSaving(true);
    setOfferError(null);
    try {
      if (editingOfferId != null) {
        const res = await fetchWithAuth(`${API}/offers/${editingOfferId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discountPercent: offerForm.discountPercent, validUntil: offerForm.validUntil.trim() || null }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error al actualizar');
        }
      } else {
        const res = await fetchWithAuth(`${API}/offers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: offerForm.productId.trim(),
            discountPercent: Number(offerForm.discountPercent),
            validUntil: offerForm.validUntil.trim() ? offerForm.validUntil.trim() : null,
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.includes('Cannot POST') || text.includes('Cannot GET')) {
            throw new Error('La ruta /api/offers no existe en el servidor. Ejecuta el backend de este proyecto: en la carpeta "server" ejecuta "npm run start" (puerto 3001).');
          }
          let data: { error?: string } = {};
          try {
            data = JSON.parse(text);
          } catch {
            if (res.status >= 500 || res.status === 502) throw new Error('Servidor no disponible. ¿Está corriendo el backend? (carpeta server → npm run start)');
            throw new Error(text || `Error ${res.status}`);
          }
          throw new Error(typeof data.error === 'string' ? data.error : `Error ${res.status}`);
        }
      }
      setOfferDialogOpen(false);
      setOfferForm({ productId: '', discountPercent: 10, validUntil: '' });
      setEditingOfferId(null);
      setOfferError(null);
      await loadOffers();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al guardar';
      setOfferError(message);
    } finally {
      setOfferSaving(false);
    }
  };

  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/offers/${offerToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al eliminar');
      setOfferToDelete(null);
      await loadOffers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] pt-[8.75rem]">
      <div className="flex">
        {/* Sidebar - Menú principal */}
        <aside className="w-64 bg-[#1e5631] text-white min-h-screen fixed left-0 top-[8.75rem] hidden lg:block z-40">
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-4 px-3">Menú principal</p>
            <nav className="space-y-1">
              <button
                onClick={() => setSection('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  section === 'dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-sm shrink-0 ${section === 'dashboard' ? 'bg-[#e85d04]' : 'bg-transparent'}`} />
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Panel</span>
              </button>
              <button
                onClick={() => setSection('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  section === 'orders' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <ShoppingBag className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Compras / Pedidos</span>
              </button>
              <button
                onClick={() => setSection('products')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  section === 'products' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Package className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Productos</span>
              </button>
              <button
                onClick={() => setSection('categories')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  section === 'categories' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Layers className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Categorías</span>
              </button>
              <button
                onClick={() => setSection('filterGroups')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  section === 'filterGroups' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Filter className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Grupos de filtro</span>
              </button>
              <button
                onClick={() => setSection('carousel')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  section === 'carousel' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <ImageIcon className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Carrusel</span>
              </button>
              <button
                onClick={() => setSection('promoBanners')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  section === 'promoBanners' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <LayoutGrid className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Banners promocionales</span>
              </button>
              <button
                onClick={() => setSection('offers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  section === 'offers' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Percent className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Ofertas</span>
              </button>
            </nav>
            <div className="mt-8 pt-6 border-t border-white/20">
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-white/90 text-left"
              >
                <span className="w-2 h-2 shrink-0 bg-transparent" aria-hidden />
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 lg:ml-64 p-6">
          {/* ========== PANEL DE CONTROL ========== */}
          {section === 'dashboard' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-[#333]">Panel de Control</h1>
                  <p className="text-gray-500 text-sm mt-1">Bienvenido de nuevo, aquí tienes el resumen de hoy.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="border-gray-200 text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Últimos 30 días
                  </Button>
                  <Button
                    onClick={openAddProduct}
                    className="bg-[#e85d04] hover:bg-[#d35400] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Producto
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Total Pedidos</p>
                      <p className="text-2xl font-bold text-[#333]">{stats.total}</p>
                      <p className={`text-xs font-medium mt-2 ${pctTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmtPct(pctTotal)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Pendientes</p>
                      <p className="text-2xl font-bold text-[#333]">{stats.pending}</p>
                      <p className={`text-xs font-medium mt-2 ${pctPending >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(pctPending)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Enviados</p>
                      <p className="text-2xl font-bold text-[#333]">{stats.shipped + stats.delivered}</p>
                      <p className={`text-xs font-medium mt-2 ${pctShipped >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtPct(pctShipped)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Ventas Totales</p>
                      <p className="text-2xl font-bold text-[#333]">
                        S/ {stats.totalRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs font-medium mt-2 ${pctRevenue >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{fmtPct(pctRevenue)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#333]">Pedidos Recientes</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Listado de las últimas compras realizadas en la plataforma.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('orders')}
                    className="text-[#1e5631] font-medium hover:underline text-sm shrink-0"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f8f8f8]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                            No hay pedidos recientes.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.slice(0, 5).map((order) => {
                          const productLabel = order.items.length > 0
                            ? order.items.length === 1
                              ? `${order.items[0].product.name} (${order.items[0].quantity} und)`
                              : `${order.items[0].product.name} +${order.items.length - 1} más`
                            : '—';
                          const statusLabel = order.status === 'pending' ? 'PENDIENTE' : order.status === 'paid' ? 'EN PROCESO' : order.status === 'shipped' ? 'ENVIADO' : order.status === 'delivered' ? 'ENTREGADO' : order.status === 'cancelled' ? 'CANCELADO' : order.status;
                          const statusClass = order.status === 'pending' ? 'bg-amber-100 text-amber-800' : order.status === 'paid' ? 'bg-blue-100 text-blue-800' : order.status === 'shipped' || order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
                          return (
                            <tr key={order.id} className="hover:bg-gray-50/50">
                              <td className="px-6 py-4 text-sm font-medium text-[#333]">{order.customer.name}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{productLabel}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{formatOrderDate(order.createdAt)}</td>
                              <td className="px-6 py-4 text-sm font-medium text-[#333]">S/ {order.total.toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex text-xs font-semibold px-2 py-1 rounded ${statusClass}`}>{statusLabel}</span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-1.5 text-gray-400 hover:text-[#333] rounded"
                                  aria-label="Ver detalle"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#e85d04] text-white rounded-xl p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="text-sm leading-relaxed">
                  <p>
                    Selecciona <strong>Compras / Pedidos</strong> para ver quién compró y gestionar pedidos.
                    <strong> Productos</strong> para añadir, editar o eliminar stock.
                    <strong> Carrusel</strong> para gestionar las imágenes del banner de la portada principal.
                  </p>
                </div>
              </div>
            </>
          )}


          {/* ========== PEDIDOS / QUIENES COMPRARON ========== */}
          {section === 'orders' && (
            <>
              <h1 className="text-2xl font-bold text-[#333] mb-6">Compras / Quién compró</h1>
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-[#333]">Pedidos</h2>
                    <div className="flex gap-3">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Buscar por cliente o ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-64 pr-10 bg-[#f8f8f8] border-gray-200"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) =>
                          setStatusFilter(e.target.value as Order['status'] | 'all')
                        }
                        className="px-4 py-2 bg-[#f8f8f8] rounded-lg border border-gray-200 text-sm"
                      >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagado</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f8f8f8]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Pedido
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Cliente
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Productos
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Total
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Pago
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Fecha
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-12 text-center text-gray-500"
                          >
                            No hay pedidos
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-[#333]">
                              {order.id}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-[#333]">
                                  {order.customer.name}
                                </p>
                                <p className="text-xs text-gray-500">{order.customer.phone}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {order.items.length} producto(s)
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#1e5631]">
                              S/ {order.total.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {getPaymentMethodLabel(order.paymentMethod)}
                            </td>
                            <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString('es', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedOrder(order)}
                                  className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {order.status === 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateOrderStatusInApi(order.id, 'paid')}
                                    className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                {order.status === 'paid' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateOrderStatusInApi(order.id, 'shipped')}
                                    className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
                                  >
                                    <Truck className="w-4 h-4" />
                                  </Button>
                                )}
                                {order.status === 'shipped' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateOrderStatusInApi(order.id, 'delivered')}
                                    className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                                  >
                                    <HomeIcon className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ========== PRODUCTOS (CRUD) ========== */}
          {section === 'products' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Productos</h1>
                <Button
                  onClick={openAddProduct}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir producto
                </Button>
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f8f8f8]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Imagen
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Nombre
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Categoría
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Precio
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Stock
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Etiqueta
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            No hay productos. Añade uno con el botón superior.
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-md"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#333]">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {product.category}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#333]">
                              S/ {product.price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {product.stock}
                            </td>
                            <td className="px-6 py-4">
                              {product.tag && (
                                <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
                                  {product.tag}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2 items-center">
                                <Link
                                  to={`/producto/${product.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-[#1e5631] hover:underline"
                                  title="Ver en tienda (misma vista que el cliente)"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Ver en tienda
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditProduct(product)}
                                  className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product)}
                                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ========== CATEGORÍAS ========== */}
          {section === 'categories' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Categorías</h1>
                <Button
                  onClick={openAddCategory}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva categoría
                </Button>
              </div>
              <p className="text-gray-600 mb-6">
                Las categorías se muestran en la portada y en la tienda. Al crear una, podrás asignarla a productos y usarla en los filtros de la tienda (elige &quot;Grupo en tienda&quot; para que aparezca en el filtro lateral).
              </p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {categoriesLoading ? (
                  <div className="p-12 text-center text-gray-500">Cargando categorías...</div>
                ) : categories.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No hay categorías. Añade la primera con el botón superior.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {categories.map((cat) => (
                      <li key={cat.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#333]">{cat.name}</p>
                          <p className="text-xs text-gray-500">
                            Icono: {cat.icon} {cat.filterKey ? ` • Filtro: ${cat.filterKey}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditCategory(cat)}
                            className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCategoryToDelete(cat)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ========== GRUPOS DE FILTRO (sidebar tienda) ========== */}
          {section === 'filterGroups' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Grupos de filtro</h1>
                <Button
                  onClick={openAddFilterGroup}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo grupo
                </Button>
              </div>
              <p className="text-gray-600 mb-6">
                Son las opciones del filtro lateral en la tienda (Herramientas, Materias primas, Jardinería, Seguridad, etc.). Puedes añadir más. Luego, en Categorías, asigna cada categoría de producto a uno de estos grupos.
              </p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {filterGroupsLoading ? (
                  <div className="p-12 text-center text-gray-500">Cargando grupos...</div>
                ) : filterGroups.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No hay grupos. Añade el primero con el botón superior.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filterGroups.map((fg) => (
                      <li key={fg.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#333]">{fg.name}</p>
                          <p className="text-xs text-gray-500">Clave: {fg.key}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditFilterGroup(fg)}
                            className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFilterGroupToDelete(fg)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ========== CARRUSEL (Hero inicio) ========== */}
          {section === 'carousel' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Carrusel del inicio</h1>
                <Button
                  onClick={openAddSlide}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir imagen
                </Button>
              </div>
              <p className="text-gray-600 mb-6">
                Las imágenes del carrusel se muestran en la portada y rotan cada 5 segundos. Orden: de arriba a abajo.
              </p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {carouselLoading ? (
                  <div className="p-12 text-center text-gray-500">Cargando carrusel...</div>
                ) : carouselSlides.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No hay imágenes. Añade la primera con el botón superior.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {carouselSlides.map((slide, index) => (
                      <li key={slide.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveSlide(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-[#333] disabled:opacity-30"
                            aria-label="Subir"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSlide(index, 'down')}
                            disabled={index === carouselSlides.length - 1}
                            className="p-1 text-gray-400 hover:text-[#333] disabled:opacity-30"
                            aria-label="Bajar"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                        </div>
                        <img
                          src={slide.src}
                          alt={slide.alt}
                          className="w-24 h-16 object-cover rounded border border-gray-200 bg-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64"><rect fill="%23eee" width="96" height="64"/><text x="50%" y="50%" fill="%23999" text-anchor="middle" dy=".3em" font-size="10">Sin imagen</text></svg>'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#333] truncate" title={slide.src.startsWith('data:') ? undefined : slide.src}>
                            {slide.src.startsWith('data:') ? 'Imagen subida (base64)' : slide.src.length > 50 ? `${slide.src.slice(0, 50)}…` : slide.src}
                          </p>
                          {slide.alt && <p className="text-xs text-gray-500 truncate">{slide.alt}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSlide(slide)}
                            className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSlideToDelete(slide)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ========== BANNERS PROMOCIONALES (carrusel debajo del hero) ========== */}
          {section === 'promoBanners' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Banners promocionales</h1>
                <Button
                  onClick={openAddPromoBanner}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir banner
                </Button>
              </div>
              <p className="text-gray-600 mb-6">
                Estos banners se muestran en la portada debajo del carrusel principal y rotan cada 6 segundos. Cada uno tiene título y descripción (ej. &quot;Envío Gratis&quot; / &quot;En compras mayores a S/500&quot;).
              </p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {promoBannersLoading ? (
                  <div className="p-12 text-center text-gray-500">Cargando banners...</div>
                ) : promoBanners.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No hay banners. Añade el primero con el botón superior.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {promoBanners.map((banner, index) => (
                      <li key={banner.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => movePromoBanner(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-[#333] disabled:opacity-30"
                            aria-label="Subir"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => movePromoBanner(index, 'down')}
                            disabled={index === promoBanners.length - 1}
                            className="p-1 text-gray-400 hover:text-[#333] disabled:opacity-30"
                            aria-label="Bajar"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                        </div>
                        <img
                          src={banner.image}
                          alt={banner.title}
                          className="w-24 h-16 object-cover rounded border border-gray-200 bg-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64"><rect fill="%23eee" width="96" height="64"/><text x="50%" y="50%" fill="%23999" text-anchor="middle" dy=".3em" font-size="10">Sin imagen</text></svg>'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#333] truncate">{banner.title || 'Sin título'}</p>
                          <p className="text-xs text-gray-500 truncate">{banner.description || 'Sin descripción'}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPromoBanner(banner)}
                            className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPromoBannerToDelete(banner)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ========== OFERTAS ========== */}
          {section === 'offers' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Ofertas</h1>
                <Button
                  onClick={openAddOffer}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva oferta
                </Button>
              </div>
              <p className="text-gray-600 mb-6">
                Las ofertas se muestran en la tienda en la sección Ofertas. Cada producto solo puede tener una oferta activa.
              </p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {offersLoading ? (
                  <div className="p-12 text-center text-gray-500">Cargando ofertas...</div>
                ) : offers.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No hay ofertas. Añade una con el botón superior.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#f8f8f8]">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Producto</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Descuento</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Precio oferta</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Válida hasta</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {offers.map((offer) => {
                          const offerPrice = offer.product.price * (1 - offer.discountPercent / 100);
                          return (
                            <tr key={offer.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <img src={offer.product.image} alt="" className="w-12 h-12 object-cover rounded-md" />
                                  <span className="font-medium text-[#333]">{offer.product.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-[#e85d04]">-{offer.discountPercent}%</span>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className="text-gray-400 line-through">S/ {offer.product.price.toFixed(2)}</span>
                                <span className="ml-2 font-semibold text-[#1e5631]">S/ {offerPrice.toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString('es-PE') : 'Sin fecha'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => openEditOffer(offer)} className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setOfferToDelete(offer)} className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal detalle pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#333]">
                Pedido {selectedOrder.id}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Cliente</h4>
                <div className="bg-[#f8f8f8] rounded-lg p-4">
                  <p><span className="text-gray-500">Nombre:</span> {selectedOrder.customer.name}</p>
                  <p><span className="text-gray-500">Teléfono:</span> {selectedOrder.customer.phone}</p>
                  <p><span className="text-gray-500">Dirección:</span> {selectedOrder.customer.address}</p>
                  {selectedOrder.customer.notes && (
                    <p className="mt-2"><span className="text-gray-500">Notas:</span> {selectedOrder.customer.notes}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Productos</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-4 bg-[#f8f8f8] rounded-lg p-3"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[#333]">{item.product.name}</p>
                        <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-[#1e5631]">
                        S/ {(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="text-lg font-medium text-[#333]">Total</span>
                <span className="text-2xl font-bold text-[#1e5631]">
                  S/ {selectedOrder.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal añadir/editar producto */}
      <Dialog open={productDialogOpen} onOpenChange={(open) => { setProductDialogOpen(open); if (!open) setProductError(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProductId ? 'Editar producto' : 'Añadir producto'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {productError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{productError}</p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del producto"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Precio ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={productForm.price || ''}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={productForm.stock}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, stock: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoría *</Label>
              <select
                id="category"
                value={productForm.category}
                onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Seleccionar...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Imagen del producto</Label>
              <Input
                id="image"
                value={productForm.image}
                onChange={(e) => setProductForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/product-drill.jpg o sube una foto"
              />
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631]/10 text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  Subir desde PC o celular
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !file.type.startsWith('image/')) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = reader.result as string;
                        setProductForm((f) => ({ ...f, image: dataUrl }));
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {productForm.image && (
                  <div className="w-16 h-16 rounded border border-gray-200 overflow-hidden bg-[#f8f8f8] flex-shrink-0">
                    <img
                      src={productForm.image}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción del producto"
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rating">Valoración (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={productForm.rating ?? ''}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      rating: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="originalPrice">Precio original (S/) - opcional</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={productForm.originalPrice ?? ''}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      originalPrice: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tag">Etiqueta</Label>
              <select
                id="tag"
                value={productForm.tag ?? ''}
                onChange={(e) =>
                  setProductForm((f) => ({
                    ...f,
                    tag: (e.target.value as ProductTag) || undefined,
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Ninguna</option>
                {PRODUCT_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:gap-0">
            {editingProductId && (
              <Link
                to={`/producto/${editingProductId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#1e5631] hover:underline order-first w-full sm:w-auto"
              >
                <ExternalLink className="w-4 h-4" />
                Ver en tienda (cómo lo ve el cliente)
              </Link>
            )}
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={productSaving || !productForm.name.trim() || productForm.price < 0 || productForm.stock < 0 || !productForm.category.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {productSaving ? 'Guardando...' : editingProductId ? 'Guardar cambios' : 'Añadir producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal añadir/editar slide del carrusel */}
      <Dialog open={slideDialogOpen} onOpenChange={setSlideDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlideId ? 'Editar imagen del carrusel' : 'Añadir imagen al carrusel'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="slide-image">URL de la imagen *</Label>
              <Input
                id="slide-image"
                value={slideForm.image}
                onChange={(e) => setSlideForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/hero-banner.jpg o https://..."
              />
            </div>
            <div className="relative flex items-center gap-2">
              <span className="text-sm text-gray-500">o</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid gap-2">
              <Label>Subir desde tu equipo</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="slide-file-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !file.type.startsWith('image/')) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      if (typeof result === 'string') setSlideForm((f) => ({ ...f, image: result }));
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <Label
                  htmlFor="slide-file-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1e5631] bg-[#1e5631]/5 px-4 py-2 text-sm font-medium text-[#1e5631] hover:bg-[#1e5631]/10"
                >
                  <Upload className="w-4 h-4" />
                  Elegir archivo
                </Label>
                {slideForm.image && slideForm.image.startsWith('data:') && (
                  <span className="text-xs text-green-600">Imagen seleccionada</span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slide-alt">Texto alternativo (opcional)</Label>
              <Input
                id="slide-alt"
                value={slideForm.alt}
                onChange={(e) => setSlideForm((f) => ({ ...f, alt: e.target.value }))}
                placeholder="Descripción de la imagen"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlideDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSlide}
              disabled={slideSaving || !slideForm.image.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {slideSaving ? 'Guardando...' : editingSlideId ? 'Guardar cambios' : 'Añadir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal añadir/editar categoría */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Nombre *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Herramientas Eléctricas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-icon">Icono</Label>
              <select
                id="category-icon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="Zap">Zap (rayo)</option>
                <option value="Wrench">Wrench (llave)</option>
                <option value="Building2">Building2 (edificio)</option>
                <option value="Paintbrush">Paintbrush (pincel)</option>
                <option value="Droplets">Droplets (gotas)</option>
                <option value="Lightbulb">Lightbulb (bombilla)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-filter">Grupo en tienda (filtro lateral)</Label>
              <select
                id="category-filter"
                value={categoryForm.filterKey}
                onChange={(e) => setCategoryForm((f) => ({ ...f, filterKey: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Ninguno</option>
                {filterGroups.map((fg) => (
                  <option key={fg.id} value={fg.key}>{fg.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              onClick={handleSaveCategory}
              disabled={categorySaving || !categoryForm.name.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {categorySaving ? 'Guardando...' : editingCategoryId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar categoría */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Los productos que usen esta categoría seguirán mostrándola como texto. Solo se quita de la lista de categorías para nuevos productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal nuevo/editar grupo de filtro */}
      <Dialog open={filterGroupDialogOpen} onOpenChange={setFilterGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFilterGroupId ? 'Editar grupo de filtro' : 'Nuevo grupo de filtro'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fg-name">Nombre (ej. Herramientas, Materias primas)</Label>
              <Input
                id="fg-name"
                value={filterGroupForm.name}
                onChange={(e) => setFilterGroupForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Herramientas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fg-key">Clave (para filtros, ej. tools)</Label>
              <Input
                id="fg-key"
                value={filterGroupForm.key}
                onChange={(e) => setFilterGroupForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="tools"
              />
              <p className="text-xs text-gray-500">Si la dejas vacía se genera del nombre.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFilterGroupDialogOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              onClick={handleSaveFilterGroup}
              disabled={filterGroupSaving || !filterGroupForm.name.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {filterGroupSaving ? 'Guardando...' : editingFilterGroupId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar grupo de filtro */}
      <AlertDialog open={!!filterGroupToDelete} onOpenChange={() => setFilterGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este grupo de filtro?</AlertDialogTitle>
            <AlertDialogDescription>
              Las categorías que usen este grupo quedarán sin grupo asignado. El grupo dejará de aparecer en el filtro de la tienda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFilterGroup} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal añadir/editar banner promocional */}
      <Dialog open={promoBannerDialogOpen} onOpenChange={(open) => { setPromoBannerDialogOpen(open); if (!open) setPromoBannerError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPromoBannerId ? 'Editar banner promocional' : 'Añadir banner promocional'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {promoBannerError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{promoBannerError}</p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="promo-image">URL de la imagen *</Label>
              <Input
                id="promo-image"
                value={promoBannerForm.image}
                onChange={(e) => setPromoBannerForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/promo-tools.jpg o https://..."
              />
            </div>
            <div className="relative flex items-center gap-2">
              <span className="text-sm text-gray-500">o</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid gap-2">
              <Label>Subir desde tu equipo</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="promo-banner-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !file.type.startsWith('image/')) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      if (typeof result === 'string') setPromoBannerForm((f) => ({ ...f, image: result }));
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <Label
                  htmlFor="promo-banner-file"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1e5631] bg-[#1e5631]/5 px-4 py-2 text-sm font-medium text-[#1e5631] hover:bg-[#1e5631]/10"
                >
                  <Upload className="w-4 h-4" />
                  Elegir archivo
                </Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-title">Título *</Label>
              <Input
                id="promo-title"
                value={promoBannerForm.title}
                onChange={(e) => setPromoBannerForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej. Envío Gratis"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-desc">Descripción</Label>
              <Input
                id="promo-desc"
                value={promoBannerForm.description}
                onChange={(e) => setPromoBannerForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ej. En compras mayores a S/500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPromoBannerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSavePromoBanner(e)}
              disabled={promoBannerSaving || !promoBannerForm.image.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {promoBannerSaving ? 'Guardando...' : editingPromoBannerId ? 'Guardar cambios' : 'Añadir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar banner promocional */}
      <AlertDialog open={!!promoBannerToDelete} onOpenChange={() => setPromoBannerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar este banner del carrusel promocional?</AlertDialogTitle>
            <AlertDialogDescription>
              El banner se eliminará de la sección promocional de la portada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePromoBanner} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar slide */}
      <AlertDialog open={!!slideToDelete} onOpenChange={() => setSlideToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar esta imagen del carrusel?</AlertDialogTitle>
            <AlertDialogDescription>
              La imagen se eliminará del carrusel de la portada. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSlide} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal añadir/editar oferta */}
      <Dialog open={offerDialogOpen} onOpenChange={(open) => { setOfferDialogOpen(open); if (!open) setOfferError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOfferId ? 'Editar oferta' : 'Nueva oferta'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {offerError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{offerError}</p>
            )}
            <div className="grid gap-2">
              <Label>Producto</Label>
              <select
                value={offerForm.productId}
                onChange={(e) => setOfferForm((f) => ({ ...f, productId: e.target.value }))}
                disabled={!!editingOfferId}
                className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Seleccionar producto...</option>
                {(editingOfferId ? products : products.filter((p) => !offers.some((o) => o.productId === p.id))).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — S/ {p.price.toFixed(2)}</option>
                ))}
              </select>
              {editingOfferId && <p className="text-xs text-gray-500">No se puede cambiar el producto al editar.</p>}
            </div>
            <div className="grid gap-2">
              <Label>Descuento (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={offerForm.discountPercent}
                onChange={(e) => setOfferForm((f) => ({ ...f, discountPercent: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Válida hasta (opcional)</Label>
              <Input
                type="date"
                value={offerForm.validUntil}
                onChange={(e) => setOfferForm((f) => ({ ...f, validUntil: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveOffer}
              disabled={offerSaving || !offerForm.productId.trim() || offerForm.discountPercent < 0 || offerForm.discountPercent > 100}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {offerSaving ? 'Guardando...' : editingOfferId ? 'Guardar cambios' : 'Crear oferta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar oferta */}
      <AlertDialog open={!!offerToDelete} onOpenChange={() => setOfferToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta oferta?</AlertDialogTitle>
            <AlertDialogDescription>
              La oferta de &quot;{offerToDelete?.product.name}&quot; dejará de mostrarse en la tienda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOffer} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar producto */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => { if (!open) { setProductToDelete(null); setProductDeleteError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{productToDelete?.name}&quot;. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {productDeleteError && (
            <p className="text-sm text-red-600 px-6" role="alert">{productDeleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={productDeleteInProgress}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              onClick={(e) => confirmDeleteProduct(e)}
              disabled={productDeleteInProgress}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {productDeleteInProgress ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                  Eliminando...
                </span>
              ) : (
                'Eliminar'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
