import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Truck,
  CreditCard,
  Minus,
  Plus,
  Lock,
  Check,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Order } from '@/types';

type PaymentMethod = 'card' | 'yape' | 'plin' | 'other';

export function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart, addOrder, updateQuantity, removeFromCart } =
    useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });

  const subtotal = getTotalPrice();
  const shipping = subtotal > 500 ? 0 : 25;
  const taxEstimated = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + shipping + taxEstimated;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const orderId = `ORD-${Date.now()}`;
    const orderPayload = {
      id: orderId,
      customer: {
        name: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        notes: formData.email ? `Email: ${formData.email}` : undefined,
      },
      items: [...items],
      total,
      paymentMethod: paymentMethod === 'other' ? 'transfer' : paymentMethod,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      if (!res.ok) throw new Error('Error al registrar el pedido');
      addOrder({
        ...orderPayload,
        status: 'pending',
        createdAt: new Date(),
      } as Order);
      clearCart();
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setShowSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !showSuccess) {
    navigate('/catalogo');
    return null;
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] pt-[4.5rem] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#1e5631] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#333] mb-2">¡Pedido realizado!</h2>
          <p className="text-gray-600 mb-6">
            Gracias por tu compra. Hemos recibido tu pedido y te contactaremos pronto.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-[#1e5631] hover:bg-[#164a28] text-white font-bold"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const paymentTiles: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'card', label: 'CARD', icon: <CreditCard className="w-6 h-6" /> },
    { id: 'yape', label: 'YAPE', icon: <span className="w-8 h-8 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center text-sm">Y</span> },
    { id: 'plin', label: 'PLIN', icon: <span className="w-8 h-8 rounded-full bg-blue-400 text-white font-bold flex items-center justify-center text-sm">P</span> },
    { id: 'other', label: 'OTHER', icon: <CreditCard className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-white pt-[4.5rem] pb-12">
      <div className="max-w-[80rem] mx-auto px-[5%] py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Review Your Order + Delivery Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Review Your Order */}
            <section>
              <h2 className="text-xl font-bold text-[#333] mb-4 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-[#333]" />
                Revisa tu pedido
              </h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="bg-[#f8f8f8] rounded-lg border border-gray-200 p-4 flex gap-4"
                  >
                    <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-white">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#333]">{item.product.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        SKU: {item.product.id} • {item.product.category}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-[#333] hover:bg-gray-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-[#333]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-[#333] hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-600 text-sm font-medium mt-2 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#333]">
                        S/ {(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Delivery Information */}
            <section>
              <h2 className="text-xl font-bold text-[#333] mb-4 flex items-center gap-2">
                <Truck className="w-6 h-6 text-[#333]" />
                Datos de envío
              </h2>
              <div className="bg-[#f8f8f8] rounded-lg border border-gray-200 p-6 space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-[#333] font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-[#333] font-medium">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-[#333] font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="address" className="text-[#333] font-medium">
                    Dirección de envío
                  </Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="Calle, número, distrito, referencia"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right column: Order Summary + Payment (sticky panel) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 border border-gray-200 rounded-lg bg-[#fafafa] p-6">
              {/* Order Summary */}
              <h2 className="text-lg font-bold text-[#333] mb-4">Order Summary</h2>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="text-[#333]">S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Envío</span>
                  <span className="text-[#2d9d5f] font-medium">
                    {shipping === 0 ? 'Gratis' : `S/ ${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (Estimated)</span>
                  <span className="text-[#333]">S/ {taxEstimated.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 mb-6">
                <span className="font-bold text-[#333]">Total</span>
                <span className="text-xl font-bold text-[#1e5631]">
                  S/ {total.toFixed(2)}
                </span>
              </div>

              {/* Payment Method */}
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Método de pago
              </h3>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {paymentTiles.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => setPaymentMethod(tile.id)}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border-2 transition-colors ${
                      paymentMethod === tile.id
                        ? 'border-[#333] bg-gray-100 text-[#333]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {tile.icon}
                    <span className="text-xs font-bold">{tile.label}</span>
                  </button>
                ))}
              </div>

              {/* Card details (when CARD selected) */}
              {paymentMethod === 'card' && (
                <div className="space-y-3 mb-6">
                  <div>
                    <Label htmlFor="cardNumber" className="text-sm text-gray-600">
                      Número de tarjeta
                    </Label>
                    <Input
                      id="cardNumber"
                      placeholder="•••• •••• •••• ••••"
                      className="mt-1 bg-white border-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="expiry" className="text-sm text-gray-600">
                        MM / YY
                      </Label>
                      <Input
                        id="expiry"
                        placeholder="MM / YY"
                        className="mt-1 bg-white border-gray-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc" className="text-sm text-gray-600">
                        CVC
                      </Label>
                      <Input
                        id="cvc"
                        placeholder="CVC"
                        className="mt-1 bg-white border-gray-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1e5631] hover:bg-[#164a28] text-white font-bold h-12 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Confirmar compra
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
                By clicking &quot;Confirm Purchase&quot;, you agree to our Terms of
                Service and Privacy Policy. Secure encrypted payment.
              </p>
            </div>

            {/* Secure SSL footer */}
            <div className="flex items-center justify-center gap-2 mt-6 text-gray-500 text-sm">
              <Lock className="w-4 h-4" />
              <span>CONEXIÓN SEGURA SSL</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
