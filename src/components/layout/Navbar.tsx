import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, LogIn, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleCart, getTotalItems } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const navLinks = [
    { path: '/', label: 'Inicio' },
    { path: '/catalogo', label: 'Tienda' },
    { path: '/contact', label: 'Contáctanos' },
  ];

  const handleLoginClick = () => {
    setIsMenuOpen(false);
    navigate(isAuthenticated ? '/admin' : '/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (query) {
      navigate(`/catalogo?q=${encodeURIComponent(query)}`);
      setSearchInput('');
      setIsMenuOpen(false);
    } else {
      navigate('/catalogo');
    }
  };

  const isShopActive = location.pathname === '/catalogo';

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="bg-white shadow-sm h-[6.25rem]">
      <div className="container-custom h-full flex items-center justify-between">
        {/* Logo JJ Construcción */}
        <Link
          to="/"
          className="flex items-center shrink-0 transition-opacity hover:opacity-90"
          aria-label="JJ Construcción - Inicio"
        >
          <img
            src="/logo.png"
            alt="JJ Construcción"
            className="h-[6rem] w-auto max-h-[6.25rem] object-contain object-left"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Search + Login icon + Cart */}
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar productos..."
                className="pl-8 w-48 h-9 bg-[#f8f8f8] border-gray-200 text-sm placeholder:text-gray-400"
                aria-label="Buscar productos"
              />
            </div>
            <Button type="submit" variant="ghost" size="sm" className="text-[#1e5631] ml-1">
              Buscar
            </Button>
          </form>
          <Link
            to="/catalogo"
            className="md:hidden p-2 text-[#333] hover:text-[#1e5631] transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5" />
          </Link>

          <button
            onClick={handleLoginClick}
            className="p-2 text-[#333] hover:text-[#1e5631] transition-colors"
            aria-label={isAuthenticated ? 'Admin' : 'Iniciar sesión'}
            title={isAuthenticated ? 'Ir al panel Admin' : 'Iniciar sesión'}
          >
            <LogIn className="w-5 h-5" />
          </button>

          <button
            onClick={toggleCart}
            className="relative p-2 text-[#333] hover:text-[#1e5631] transition-colors"
            aria-label="Carrito"
          >
            <ShoppingCart className="w-5 h-5" />
            {getTotalItems() > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 bg-[#e85d04] text-white text-xs font-bold rounded-full flex items-center justify-center">
                {getTotalItems()}
              </span>
            )}
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-[#333]" />
            ) : (
              <Menu className="w-6 h-6 text-[#333]" />
            )}
          </Button>
        </div>
      </div>
    </nav>

      {/* Barra de envío destacada */}
      <div className="bg-[#1e5631] text-white py-2 px-4 flex items-center justify-center gap-2 shadow-md">
        <Truck className="w-5 h-5 flex-shrink-0" />
        <span className="font-bold text-sm uppercase tracking-wide text-center">
          Envío de 3 a 5 días a todo nivel nacional
        </span>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-[calc(6.25rem+2.5rem)] left-0 right-0 bg-white shadow-lg border-t border-gray-200">
          <div className="flex flex-col p-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`py-3 px-4 text-[#333] text-sm transition-colors hover:bg-[#f8f8f8] ${
                  location.pathname === link.path ? 'font-semibold bg-[#f8f8f8]' : ''
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <form onSubmit={handleSearchSubmit} className="px-4 py-2 border-t border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar productos..."
                  className="pl-9 w-full h-10 bg-[#f8f8f8] border-gray-200"
                />
              </div>
              <Button type="submit" className="w-full mt-2 bg-[#1e5631] hover:bg-[#164a28] text-white text-sm">
                Buscar
              </Button>
            </form>
            <button
              onClick={handleLoginClick}
              className="flex items-center gap-3 py-3 px-4 text-[#333] text-sm transition-colors hover:bg-[#f8f8f8] text-left"
            >
              <LogIn className="w-5 h-5 text-gray-500" />
              {isAuthenticated ? 'Panel Admin' : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
