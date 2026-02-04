import { Link } from 'react-router-dom';
import { Phone, Mail, Clock, Facebook, Instagram, Twitter } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#333] text-white">
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Logo & Description */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold text-[#1e5631]">JJ construccion</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Suministros de concreto y jardinería. Equipo y materiales de calidad para tus proyectos.
            </p>
          </div>

          {/* Column 2: Categorías Populares */}
          <div>
            <h4 className="text-lg font-medium mb-4 text-[#c8a48c]">Categorías Populares</h4>
            <ul className="space-y-2">
              {[
                'Herramientas Eléctricas',
                'Herramientas Manuales',
                'Materiales de Construcción',
                'Pinturas y Acabados',
                'Fontanería',
                'Electricidad',
              ].map((category) => (
                <li key={category}>
                  <Link
                    to="/catalogo"
                    className="text-gray-400 text-sm hover:text-[#1e5631] transition-colors"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Atención al Cliente */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-[#2d9d5f]">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#e85d04]" />
                <span className="text-gray-400 text-sm">+51 987 654 321</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#e85d04]" />
                <span className="text-gray-400 text-sm">ventas@construmarket.pe</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#e85d04] mt-0.5" />
                <div className="text-gray-400 text-sm">
                  <p>Lun - Vie: 8:00 - 18:00</p>
                  <p>Sáb: 8:00 - 13:00</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Redes Sociales */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-[#2d9d5f]">Síguenos</h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 bg-[#1e5631] rounded-full flex items-center justify-center transition-all hover:bg-[#164a28] hover:scale-110"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[#1e5631] rounded-full flex items-center justify-center transition-all hover:bg-[#164a28] hover:scale-110"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[#1e5631] rounded-full flex items-center justify-center transition-all hover:bg-[#164a28] hover:scale-110"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="container-custom py-4">
          <p className="text-center text-gray-500 text-sm">
            © {currentYear} JJ construccion. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
