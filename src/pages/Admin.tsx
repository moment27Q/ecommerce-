import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductsStore, type ProductFormData } from '@/store/productsStore';
import { useAuthStore } from '@/store/authStore';
import { fetchWithAuth, API } from '@/lib/api';
import { categories } from '@/data/products';
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

type AdminSection = 'dashboard' | 'orders' | 'products';

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
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

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

  const openAddProduct = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProductId(product.id);
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
    if (!productForm.name.trim() || productForm.price < 0 || productForm.stock < 0) return;
    setProductSaving(true);
    try {
      if (editingProductId) {
        const res = await fetchWithAuth(`${API}/products/${editingProductId}`, {
          method: 'PUT',
          body: JSON.stringify(productForm),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Error al actualizar');
      } else {
        const res = await fetchWithAuth(`${API}/products`, {
          method: 'POST',
          body: JSON.stringify(productForm),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Error al crear');
      }
      setProductDialogOpen(false);
      setProductForm(emptyProductForm);
      setEditingProductId(null);
      await loadProducts();
      fetchProducts();
    } catch (e) {
      console.error(e);
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/products/${productToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al eliminar');
      setProductToDelete(null);
      await loadProducts();
      fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] pt-[4.5rem]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[#1e5631] text-white min-h-screen fixed left-0 top-[4.5rem] hidden lg:block z-40">
          <div className="p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setSection('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  section === 'dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Panel
              </button>
              <button
                onClick={() => setSection('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  section === 'orders' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                Compras / Pedidos
              </button>
              <button
                onClick={() => setSection('products')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  section === 'products' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <Package className="w-5 h-5" />
                Productos
              </button>
              <div className="mt-8 pt-8 border-t border-white/20">
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-white/90"
                >
                  <LogOut className="w-5 h-5" />
                  Cerrar sesión
                </button>
              </div>
            </nav>
          </div>
        </aside>

        <main className="flex-1 lg:ml-64 p-6">
          {/* ========== DASHBOARD ========== */}
          {section === 'dashboard' && (
            <>
              <h1 className="text-2xl font-bold text-[#333] mb-6">Panel</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Total pedidos</p>
                  <p className="text-3xl font-bold text-[#333]">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Enviados</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.shipped}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Ventas totales</p>
                  <p className="text-3xl font-bold text-[#1e5631]">
                    S/ {stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-gray-600">
                  Selecciona <strong>Compras / Pedidos</strong> para ver quién compró y gestionar
                  pedidos. Selecciona <strong>Productos</strong> para añadir, editar o eliminar
                  productos.
                </p>
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
                              <div className="flex gap-2">
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
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProductId ? 'Editar producto' : 'Añadir producto'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="image">URL imagen</Label>
              <Input
                id="image"
                value={productForm.image}
                onChange={(e) => setProductForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/product-drill.jpg"
              />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={productSaving || !productForm.name.trim() || productForm.price < 0 || productForm.stock < 0}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {productSaving ? 'Guardando...' : editingProductId ? 'Guardar cambios' : 'Añadir producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar producto */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{productToDelete?.name}&quot;. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
