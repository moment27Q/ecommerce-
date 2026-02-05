import { useState } from 'react';
import { Phone, Mail, Send, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ASUNTO_OPTIONS = [
  'Selecciona un motivo',
  'Consulta general',
  'Pedidos',
  'Soporte técnico',
  'Otro',
];

export function Contact() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = [
      'Hola, quiero más información.',
      '',
      form.fullName && `*Nombre:* ${form.fullName}`,
      form.email && `*Correo:* ${form.email}`,
      form.subject && `*Asunto:* ${form.subject}`,
      form.message && `*Mensaje:*\n${form.message}`,
    ].filter(Boolean);
    const text = lines.join('\n');
    const whatsappUrl = `https://wa.me/51941576393?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] pt-[8.75rem]">
      <div className="max-w-6xl mx-auto px-[5%] py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[520px] rounded-xl overflow-hidden shadow-lg">
          {/* Panel izquierdo - verde oscuro */}
          <div className="bg-[#1e5631] text-white p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl lg:text-4xl font-bold mb-4">Contáctanos</h1>
              <p className="text-white/95 text-base lg:text-lg leading-relaxed mb-10">
                Estamos aquí para ayudarte a construir tus sueños. Ponte en contacto con nuestro equipo de expertos.
              </p>
              <div className="space-y-6">
                <a
                  href="tel:941576393"
                  className="flex items-center gap-4 text-white hover:opacity-90 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-[#e85d04] flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/80">Teléfono</p>
                    <p className="text-lg font-semibold">941 576 393</p>
                  </div>
                </a>
                <a
                  href="mailto:josarzc@hotmail.com"
                  className="flex items-center gap-4 text-white hover:opacity-90 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-[#e85d04] flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/80">Correo electrónico</p>
                    <p className="text-lg font-semibold break-all">josarzc@hotmail.com</p>
                  </div>
                </a>
              </div>
            </div>
            <div className="flex gap-3 mt-8 relative z-10">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Panel derecho - formulario */}
          <div className="bg-white p-10 lg:p-12 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-[#333] mb-2">Envíanos un mensaje</h2>
            <p className="text-gray-500 text-sm mb-8">
              Nuestro equipo responderá en menos de 24 horas hábiles.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="fullName" className="text-[#333] font-medium">
                  Nombre completo
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="mt-1.5 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-[#333] font-medium">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1.5 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="subject" className="text-[#333] font-medium">
                  Asunto
                </Label>
                <select
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="mt-1.5 w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#1e5631] focus:border-[#1e5631]"
                >
                  {ASUNTO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt === 'Selecciona un motivo' ? '' : opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="message" className="text-[#333] font-medium">
                  Mensaje
                </Label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="Cuéntanos en qué podemos ayudarte..."
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#333] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e5631] focus:border-[#1e5631] resize-none"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#e85d04] hover:bg-[#d35400] text-white font-semibold py-3 text-base"
              >
                Enviar mensaje
                <Send className="w-5 h-5 ml-2" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
