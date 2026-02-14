import { useState, useEffect } from 'react';
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
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_51T0bG9B7JC0XRRBAnsPhW00XkgbpMyTzAUrAgClrrM0MPZFL3bz6AbLfSQy0ka9AYT0SUcuhArw4Yb80RzsfzKUT00tkCxWbK9');

type PaymentMethod = 'card' | 'yape' | 'plin' | 'other';

function PaymentForm({
  formData,
  total,
  items,
  onSuccess
}: {
  formData: any,
  total: number,
  items: any[],
  onSuccess: (orderId: string) => void
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/checkout?status=success', // Note: we handle success manually below without redirect if possible, but confirmPayment usually redirects
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Error desconocido');
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Registrar la orden en backend
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
        paymentMethod: 'card',
        stripePaymentId: paymentIntent.id
      };

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });
        if (!res.ok) throw new Error('Error al registrar el pedido');
        onSuccess(orderId);
      } catch (err: any) {
        setMessage(err.message || 'Error al guardar la orden');
        setIsLoading(false);
      }
    } else {
      setMessage('El pago no se pudo confirmar.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {message && <div className="text-red-500 text-sm mt-2">{message}</div>}
      <Button
        type="submit"
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-[#1e5631] hover:bg-[#164a28] text-white font-bold h-12 flex items-center justify-center gap-2 mt-4"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Procesando...
          </span>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pagar S/ {total.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

export function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart, addOrder, updateQuantity, removeFromCart } =
    useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [clientSecret, setClientSecret] = useState('');
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

  // Cargar PaymentIntent cuando se seleccione tarjeta y haya datos válidos
  useEffect(() => {
    if (items.length > 0 && paymentMethod === 'card') {
      // Reset clientSecret if items change to force re-initialization with correct amount
      setClientSecret('');
      
      fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, customer: { name: formData.fullName, email: formData.email } }),
      })
        .then((res) => {
            if (!res.ok) throw new Error('Error al iniciar pago');
            return res.json();
        })
        .then((data) => {
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
            } else {
                console.error('No clientSecret returned');
            }
        })
        .catch((err) => {
            console.error('Error fetching payment intent:', err);
            // Optional: Set an error state to display to user
        });
    }
  }, [items, paymentMethod]); // Re-run when items or method changes

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica para otros métodos de pago (Yape, Plin, Transferencia) - SIMULADO/MANUAL
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
      handleSuccess(orderId);
    } catch (err) {
      console.error(err);
      alert('Error registrando pedido manual');
    }
  };

  const handleSuccess = (orderId: string) => {
    // Add simplified order to store state for UI feedback if needed
    addOrder({
      id: orderId,
      customer: { name: formData.fullName, phone: formData.phone, address: formData.address },
      items: [...items],
      total,
      paymentMethod: paymentMethod === 'card' ? 'card' : (paymentMethod === 'other' ? 'transfer' : paymentMethod),
      status: 'pending', // or 'paid' if card
      createdAt: new Date(),
    } as Order);
    clearCart();
    setShowSuccess(true);
  };

  if (items.length === 0 && !showSuccess) {
    navigate('/catalogo');
    return null;
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] pt-[8.75rem] flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-white pt-[8.75rem] pb-12">
      <div className="max-w-[80rem] mx-auto px-[5%] py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Review Your Order + Delivery Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Envío destacado */}
            <div className="bg-[#1e5631] text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 font-semibold">
              <Truck className="w-5 h-5 shrink-0" />
              <span>Envío de 3 a 5 días a todo nivel nacional</span>
            </div>
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
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.discountPercent != null && (
                          <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-[#e85d04] text-white">
                            Oferta -{item.discountPercent}%
                          </span>
                        )}
                        <p className="text-sm text-gray-500">
                          SKU: {item.product.id} • {item.product.category}
                        </p>
                      </div>
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
                    Nombre completo
                  </Label>
                  <Input
                    id="fullName"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="Ingresa tu nombre completo"
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
                    Número de teléfono
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
                    placeholder="Ej: 999 123 456"
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
              <h2 className="text-lg font-bold text-[#333] mb-4">Resumen del pedido</h2>
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
                  <span>Impuesto (estimado)</span>
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
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border-2 transition-colors ${paymentMethod === tile.id
                        ? 'border-[#333] bg-gray-100 text-[#333]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    {tile.icon}
                    <span className="text-xs font-bold">{tile.label}</span>
                  </button>
                ))}
              </div>

              {/* Card details (Stripe) or Manual */}
              {paymentMethod === 'card' ? (
                clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentForm
                      formData={formData}
                      total={total}
                      items={items}
                      onSuccess={handleSuccess}
                    />
                  </Elements>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Cargando pasarela de pago...
                  </div>
                )
              ) : (
                <form onSubmit={handleManualSubmit}>
                  <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded mb-4">
                    Estás seleccionando pago manual ({paymentMethod}). Nos pondremos en contacto contigo.
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#1e5631] hover:bg-[#164a28] text-white font-bold h-12 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-5 h-5" />
                    Confirmar pedido
                  </Button>
                </form>
              )}

              <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
                Al hacer clic en "Pagar" o "Confirmar", aceptas nuestros Términos
                de servicio. Pago seguro cifrado.
              </p>
            </div>

            {/* Secure SSL footer */}
            <div className="flex items-center justify-center gap-2 mt-6 text-gray-500 text-sm">
              <Lock className="w-4 h-4" />
              <span>CONEXIÓN SEGURA SSL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
