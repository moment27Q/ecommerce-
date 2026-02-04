import { ShoppingCart, Check, Star } from 'lucide-react';
import { useState } from 'react';
import type { Product, ProductTag } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';

const TAG_STYLES: Record<ProductTag, string> = {
  'IN STOCK': 'bg-[#2d9d5f] text-white',
  SALE: 'bg-[#e85d04] text-white',
  TOOLS: 'bg-[#3b82c6] text-white',
  'BULK PRICING': 'bg-[#2d9d5f] text-white',
};

const TAG_LABELS_ES: Record<ProductTag, string> = {
  'IN STOCK': 'EN STOCK',
  SALE: 'OFERTA',
  TOOLS: 'HERRAMIENTAS',
  'BULK PRICING': 'PRECIO POR MAYOR',
};

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, items } = useCartStore();
  const [showAddedMessage, setShowAddedMessage] = useState(false);

  const isInCart = items.some((item) => item.product.id === product.id);
  const showSaleBadge = product.tag === 'SALE' || product.originalPrice != null;
  const rating = product.rating ?? 4.5;

  const handleAddToCart = () => {
    addToCart(product);
    setShowAddedMessage(true);
    setTimeout(() => setShowAddedMessage(false), 2000);
  };

  return (
    <div className="card-product group h-full flex flex-col min-h-[380px]">
      {/* Product Image - tamaño fijo */}
      <div className="relative aspect-square w-full flex-shrink-0 bg-[#f8f8f8] rounded-md overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {showSaleBadge && (
          <span className="absolute top-2 left-2 bg-[#e85d04] text-white text-xs font-bold uppercase px-2 py-1 rounded">
            OFERTA
          </span>
        )}
      </div>

      {/* Product Info - ocupa el resto y empuja el botón abajo */}
      <div className="flex-1 flex flex-col pt-4 min-h-0">
        <h3 className="text-[#333] font-bold line-clamp-2 min-h-[2.75rem]">
          {product.name}
        </h3>
        <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
          <span>{rating}</span>
        </div>
        <p className="text-gray-500 text-sm line-clamp-2 mt-1 min-h-[2.5rem]">
          {product.description}
        </p>
        <div className="flex items-center gap-2 pt-2 flex-shrink-0">
          {product.originalPrice != null && (
            <span className="text-sm text-gray-400 line-through">
              S/ {product.originalPrice.toFixed(2)}
            </span>
          )}
          <span className="text-lg font-bold text-[#333]">
            S/ {product.price.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-end pt-2 flex-shrink-0">
          {product.tag && (
            <span
              className={`text-xs font-bold uppercase px-2 py-1 rounded ${TAG_STYLES[product.tag]}`}
            >
              {TAG_LABELS_ES[product.tag]}
            </span>
          )}
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={showAddedMessage}
          className={`w-full mt-auto pt-3 transition-all flex-shrink-0 ${
            showAddedMessage
              ? 'bg-[#2d9d5f] hover:bg-[#2d9d5f]'
              : 'bg-[#333] hover:bg-[#444] text-white font-bold uppercase text-sm'
          }`}
        >
          {showAddedMessage ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Añadido
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              {isInCart ? 'Añadir más' : 'Añadir al carrito'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
