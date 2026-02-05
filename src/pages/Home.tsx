import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Wrench, Building2, Paintbrush, Droplets, Lightbulb } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { categories } from '@/data/products';
import { useProductsStore } from '@/store/productsStore';
import { Button } from '@/components/ui/button';

const HERO_SLIDES_FALLBACK = [
  { src: '/hero-banner.jpg', alt: 'Obra en construcción' },
  { src: '/promo-tools.jpg', alt: 'Herramientas' },
  { src: '/promo-materials.jpg', alt: 'Materiales' },
  { src: '/promo-shipping.jpg', alt: 'Envíos' },
];
const HERO_INTERVAL_MS = 5000;
const API = '/api';

interface CatalogOffer {
  validUntil: string | null;
  discountPercent: number;
}

export function Home() {
  const { products, fetchProducts } = useProductsStore();
  const featuredProducts = products.slice(0, 8);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroSlides, setHeroSlides] = useState<{ src: string; alt: string }[]>([]);
  const [offersByProductId, setOffersByProductId] = useState<Record<string, CatalogOffer>>({});

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/offers`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const map: Record<string, CatalogOffer> = {};
        data.forEach((o: { productId: string; validUntil?: string; discountPercent: number }) => {
          map[o.productId] = { validUntil: o.validUntil ?? null, discountPercent: o.discountPercent };
        });
        setOffersByProductId(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/carousel`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { src: string; alt: string }[]) => {
        if (cancelled) return;
        const slides = Array.isArray(data) && data.length > 0
          ? data.map((s) => ({ src: s.src || '', alt: s.alt || '' }))
          : HERO_SLIDES_FALLBACK;
        setHeroSlides(slides);
      })
      .catch(() => {
        if (!cancelled) setHeroSlides(HERO_SLIDES_FALLBACK);
      });
    return () => { cancelled = true; };
  }, []);

  const slides = heroSlides.length > 0 ? heroSlides : HERO_SLIDES_FALLBACK;

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % slides.length);
    }, HERO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-slideInBottom');
            entry.target.classList.remove('opacity-0');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => {
      el.classList.add('opacity-0');
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ElementType> = {
      Zap,
      Wrench,
      Building2,
      Paintbrush,
      Droplets,
      Lightbulb,
    };
    const Icon = icons[iconName] || Wrench;
    return <Icon className="w-8 h-8" />;
  };

  return (
    <div className="min-h-screen pt-[8.75rem]">
      {/* Hero Section - Carrusel (imágenes gestionadas en Admin) */}
      <section className="relative h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        {/* Carrusel de fondos */}
        {slides.map((slide, i) => (
          <div
            key={slide.src + i}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
            style={{
              backgroundImage: `url(${slide.src})`,
              opacity: i === heroIndex ? 1 : 0,
              zIndex: i === heroIndex ? 0 : -1,
            }}
            aria-hidden={i !== heroIndex}
          />
        ))}
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 z-[1]" />

        {/* Indicadores del carrusel */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setHeroIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === heroIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Ir a imagen ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white px-4 animate-fadeIn">
          <h1 className="text-4xl md:text-6xl font-medium mb-4 leading-tight">
            TODO LO QUE NECESITAS PARA TU
            <br />
            <span className="text-[#c8a48c]">CONSTRUCCIÓN</span>
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-200">
            Materiales de calidad, herramientas profesionales y los mejores precios
            para hacer realidad tus proyectos.
          </p>
          <Link to="/catalogo">
            <Button className="btn-primary text-lg px-8 py-4">
              VER PRODUCTOS
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Promotions Section */}
      <section className="py-12 px-[5%] bg-white">
        <div className="max-w-[80rem] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Promo 1 */}
            <div className="animate-on-scroll relative overflow-hidden rounded-lg group cursor-pointer">
              <img
                src="/promo-tools.jpg"
                alt="Nuevos productos"
                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                <span className="text-[#c8a48c] text-sm uppercase tracking-wide mb-1">
                  ¡Nuevos Productos!
                </span>
                <p className="text-white text-sm">
                  Descubre nuestra nueva línea de herramientas eléctricas
                </p>
              </div>
            </div>

            {/* Promo 2 */}
            <div className="animate-on-scroll relative overflow-hidden rounded-lg group cursor-pointer">
              <img
                src="/promo-materials.jpg"
                alt="Descuento"
                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                <span className="text-orange-400 text-sm uppercase tracking-wide mb-1">
                  20% de Descuento
                </span>
                <p className="text-white text-sm">
                  En cemento y materiales de albañilería
                </p>
              </div>
            </div>

            {/* Promo 3 */}
            <div className="animate-on-scroll relative overflow-hidden rounded-lg group cursor-pointer">
              <img
                src="/promo-shipping.jpg"
                alt="Envío gratis"
                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                <span className="text-green-400 text-sm uppercase tracking-wide mb-1">
                  Envío Gratis
                </span>
                <p className="text-white text-sm">
                  En compras mayores a S/500
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 px-[5%] bg-[#f8f0ed]">
        <div className="max-w-[80rem] mx-auto">
          <h2 className="text-3xl md:text-4xl text-center text-[#333] mb-12">
            Categorías Principales
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to="/catalogo"
                className="animate-on-scroll bg-white rounded-lg p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-[#f8f0ed] rounded-full flex items-center justify-center text-[#946545] transition-all group-hover:bg-[#946545] group-hover:text-white">
                  {getIcon(category.icon)}
                </div>
                <h3 className="text-sm font-medium text-[#333]">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-[80rem] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl text-[#333]">Productos Destacados</h2>
            <Link to="/catalogo">
              <Button variant="outline" className="btn-secondary">
                Ver Todo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {featuredProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-on-scroll"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ProductCard product={product} offer={offersByProductId[product.id]} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
