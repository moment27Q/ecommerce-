import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { useProductsStore } from '@/store/productsStore';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

const SIDEBAR_CATEGORIES = [
  { label: 'Herramientas', value: 'tools' },
  { label: 'Materias primas', value: 'raw' },
  { label: 'Jardinería', value: 'landscaping' },
  { label: 'Seguridad', value: 'safety' },
] as const;

const categoryToSidebar: Record<string, string> = {
  'Herramientas Eléctricas': 'tools',
  'Herramientas Manuales': 'tools',
  'Materiales de Construcción': 'raw',
  'Pinturas y Acabados': 'landscaping',
  'Fontanería': 'landscaping',
  'Electricidad': 'safety',
};

export function Catalog() {
  const { products, fetchProducts } = useProductsStore();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Sincronizar búsqueda con la URL (p. ej. al llegar desde el buscador del Navbar)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
  }, [searchParams]);
  const [selectedSidebarCats, setSelectedSidebarCats] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'name'>('newest');
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

  const filteredProducts = products
    .filter((product) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q);
      const sidebarCat = categoryToSidebar[product.category];
      const matchesCategory =
        selectedSidebarCats.length === 0 || (sidebarCat && selectedSidebarCats.includes(sidebarCat));
      const matchesPrice =
        product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const handleSidebarCatToggle = (value: string) => {
    setSelectedSidebarCats((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const totalProducts = products.length;
  const from = filteredProducts.length === 0 ? 0 : 1;
  const to = filteredProducts.length;
  const showingText = `Mostrando ${from}-${to} de ${totalProducts} productos`;

  return (
    <div className="min-h-screen bg-white pt-[8.75rem]">
      {/* Hero Banner - Dark green */}
      <div className="max-w-[80rem] mx-auto px-[5%] mt-6 mb-6">
        <div className="bg-[#1e5631] rounded-xl py-10 px-6 md:py-12 md:px-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-block bg-[#e85d04] text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-md mb-4">
              OFERTA LIMITADA
            </span>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
              Oferta de equipo pesado
            </h1>
            <p className="text-white text-sm md:text-base max-w-xl">
              Ahorra hasta 25% en mezcladoras de cemento y herramientas de pavimentación profesionales solo este fin de semana.
            </p>
            <p className="text-white/90 text-xs italic mt-2">*Válido mientras haya stock</p>
          </div>
          <div className="flex-shrink-0">
            <Button className="bg-[#333] hover:bg-[#444] text-white font-bold uppercase text-sm tracking-widest px-6 py-3 rounded-lg">
              VER EQUIPO
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - light gray background */}
      <div className="bg-[#f8f8f8] py-8">
        <div className="max-w-[80rem] mx-auto px-[5%] flex flex-col lg:flex-row gap-8">
          {/* Sidebar - SEARCH PRODUCTS, CATEGORIES, PRICE RANGE */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-[#f8f8f8] space-y-8">
              <div>
                <h3 className="font-bold text-[#333] text-sm uppercase tracking-wide mb-3">
                  SEARCH PRODUCTS
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cement, shovels..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value) setSearchParams({ q: e.target.value });
                      else setSearchParams({});
                    }}
                    className="pl-10 bg-[#f8f8f8] border border-gray-200 rounded-lg h-11 text-[#333] placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#333] text-sm uppercase tracking-wide mb-4">
                  CATEGORÍAS
                </h3>
                <div className="space-y-3">
                  {SIDEBAR_CATEGORIES.map((cat) => (
                    <label
                      key={cat.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSidebarCats.includes(cat.value)}
                        onCheckedChange={() => handleSidebarCatToggle(cat.value)}
                        className="border-[#333] data-[state=checked]:bg-[#1e5631] data-[state=checked]:border-[#1e5631]"
                      />
                      <span className="text-sm text-[#333]">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#333] text-sm uppercase tracking-wide mb-4">
                  RANGO DE PRECIO
                </h3>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  max={1000}
                  step={10}
                  className="mb-4"
                />
                <div className="flex justify-between text-sm text-[#333]">
                  <span>S/ 0</span>
                  <span>S/ {priceRange[1] === 1000 ? '1000+' : priceRange[1]}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Product grid area */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <p className="text-sm text-[#333]">{showingText}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-[#333]">ORDENAR POR</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-[#333] focus:outline-none focus:ring-2 focus:ring-[#1e5631]"
                >
                  <option value="newest">Más recientes</option>
                  <option value="price-asc">Precio: menor a mayor</option>
                  <option value="price-desc">Precio: mayor a menor</option>
                  <option value="name">Nombre</option>
                </select>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#333] mb-2">No se encontraron productos</h3>
                <p className="text-gray-500 mb-4">Prueba ajustando la búsqueda o los filtros.</p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSidebarCats([]);
                    setPriceRange([0, 1000]);
                    setSearchParams({});
                  }}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-on-scroll"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
