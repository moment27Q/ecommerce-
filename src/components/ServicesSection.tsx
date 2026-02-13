import { ArrowRight, Zap, Building2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Service {
    id: string;
    title: string;
    description: string;
    category: 'Residencial' | 'Comercial' | 'Maquinaria';
    image: string;
    icon: React.ElementType;
}

const services: Service[] = [
    {
        id: 'residential',
        title: 'Construcción Civil de Alto Impacto',
        description: 'Desarrollamos proyectos residenciales de lujo con acabados de primera y estructuras sismorresistentes que garantizan seguridad y confort.',
        category: 'Residencial',
        image: '/residential-service.jpg', // Placeholder, using what would have been generated
        icon: Building2,
    },
    {
        id: 'commercial',
        title: 'Infraestructura Corporativa',
        description: 'Soluciones integrales para edificios de oficinas, locales comerciales y naves industriales modernas con eficiencia energética.',
        category: 'Comercial',
        image: '/commercial-service.jpg',
        icon: Zap,
    },
    {
        id: 'machinery',
        title: 'Logística y Equipo Pesado',
        description: 'Renta de maquinaria pesada y servicios de excavación con tecnología de punta y operadores expertos certificados.',
        category: 'Maquinaria',
        image: '/machinery-service.jpg',
        icon: Wrench,
    },
];

export function ServicesSection() {
    const [activeFilter, setActiveFilter] = useState<string>('Todos');

    const filters = ['Todos', 'Residencial', 'Comercial', 'Maquinaria'];

    const filteredServices = activeFilter === 'Todos'
        ? services
        : services.filter(service => service.category === activeFilter);

    return (
        <section id="servicios" className="py-20 px-[5%] bg-white">
            <div className="max-w-[80rem] mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-[#333] mb-4">
                        Nuestros Servicios <span className="text-[#1e5631]">Especializados</span>
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto mb-8 text-lg">
                        En JJ CONSTRUCCIÓN combinamos experiencia técnica, materiales de alta calidad y un compromiso inquebrantable con la seguridad para transformar visiones en realidades estructurales duraderas.
                    </p>

                    {/* Separator */}
                    <div className="flex items-center justify-center gap-2 mb-12">
                        <div className="h-1 w-12 bg-[#1e5631] rounded-full"></div>
                        <div className="h-1 w-4 bg-[#e85d04] rounded-full"></div>
                        <div className="h-1 w-12 bg-[#1e5631] rounded-full"></div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap justify-center gap-4">
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 border ${activeFilter === filter
                                        ? 'bg-[#1e5631] text-white border-[#1e5631]'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e5631] hover:text-[#1e5631]'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                            {/* Image Container */}
                            <div className="relative h-64 overflow-hidden">
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="bg-[#1e5631]/90 text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-wider backdrop-blur-sm">
                                        {service.category}
                                    </span>
                                </div>
                                <img
                                    src={service.image}
                                    alt={service.title}
                                    onError={(e) => {
                                        // Fallback if image fails to load
                                        e.currentTarget.src = 'https://placehold.co/600x400/e2e8f0/1e5631?text=' + encodeURIComponent(service.category);
                                    }}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>

                            {/* Content */}
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-[#333] mb-3 group-hover:text-[#1e5631] transition-colors">
                                    {service.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                                    {service.description}
                                </p>

                                <Link
                                    to="/contact"
                                    className="inline-flex items-center text-[#1e5631] font-semibold text-sm group/link"
                                >
                                    Ver detalles
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover/link:translate-x-1" />
                                    <service.icon className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300 text-[#e85d04]" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
