import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { Home } from '@/pages/Home';
import { Catalog } from '@/pages/Catalog';
import { Checkout } from '@/pages/Checkout';
import { Admin } from '@/pages/Admin';
import { Login } from '@/pages/Login';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Gallery } from '@/pages/Gallery';
import { Contact } from '@/pages/Contact';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <CartSidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
