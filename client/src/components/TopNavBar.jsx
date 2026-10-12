import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const TopNavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isChecklistPage = location.pathname === '/checklist';
  const isAboutPage = location.pathname === '/about-us';
  const isWhyTrustPage = location.pathname === '/why-trust-zoltan-visas';
  const isContactPage = location.pathname === '/contact-us' || location.pathname === '/contact';

  const handleServicesClick = (e) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById('services');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById('services');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };
  
  return (
    <header className="fixed top-0 w-full z-50">
      {/* Top Utility Bar - Visa Hotline & Live Support */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-6 md:px-12 border-b border-slate-800/80">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          {/* Left: Live Status & Service Focus */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-white tracking-wide">
              Visa Support Desk
            </span>
            <span className="hidden lg:inline text-slate-400">
              | Fast-Track UK, Schengen & Global Visas
            </span>
          </div>

          {/* Right: Instagram, Email & Direct Phone Helpline */}
          <div className="flex items-center gap-3 sm:gap-6 font-medium">
            <a
              href="https://www.instagram.com/travelzoltan/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-pink-400 hover:text-pink-300 transition-colors"
              title="Follow Zoltan on Instagram"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="hidden sm:inline">Instagram</span>
            </a>

            <span className="text-slate-700">|</span>

            <a 
              href="mailto:gb@zoltanvisa.com" 
              className="hidden sm:flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">mail</span>
              <span>gb@zoltanvisa.com</span>
            </a>
            
            <span className="hidden sm:inline text-slate-700">|</span>

            <a 
              href="tel:+442030261633" 
              className="flex items-center gap-1.5 font-bold text-white hover:text-primary transition-colors"
              title="Call Zoltan Visa Helpline"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">call</span>
              <span className="tracking-tight">+44 20 3026 1633</span>
            </a>

            <span className="hidden xl:inline text-[11px] text-slate-400 font-normal">
              (Mon–Fri 9am–6pm GMT)
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-md shadow-xs transition-all">
        <div className="flex justify-between items-center max-w-screen-2xl mx-auto px-6 md:px-12 py-2">
          {/* Logo */}
          <Link to="/" className="flex items-center text-primary tracking-tighter font-headline">
            <img src={logo} alt="ZoltanVisa" className="h-12 md:h-15 object-contain" />
          </Link>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7 px-6 md:px-8 py-3.5">
            <Link 
              to="/" 
              className={`font-headline font-semibold tracking-tight transition-colors py-1 ${
                location.pathname === '/' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              Home
            </Link>
            <a 
              href="#services"
              onClick={handleServicesClick}
              className="font-headline font-semibold tracking-tight text-slate-600 hover:text-primary transition-colors cursor-pointer py-1"
            >
              Services & Comparison
            </a>
            <Link 
              to="/why-trust-zoltan-visas" 
              className={`font-headline font-semibold tracking-tight transition-colors py-1 flex items-center gap-1 ${
                isWhyTrustPage 
                  ? 'text-primary border-b-2 border-primary font-bold' 
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-primary">verified</span>
              Why Trust Us?
            </Link>
            <Link 
              to="/about-us" 
              className={`font-headline font-semibold tracking-tight transition-colors py-1 ${
                isAboutPage 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              About Us
            </Link>
            <Link 
              to="/contact-us" 
              className={`font-headline font-semibold tracking-tight transition-colors py-1 ${
                isContactPage 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              Contact Us
            </Link>
          </div>
          
          {/* Mobile Controls */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Call Shortcut */}
            <a
              href="tel:+442030261633"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
              aria-label="Call Zoltan Visa"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
            </a>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-primary focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-2xl">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3 shadow-lg animate-dialog-appear">
            <Link 
              to="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block font-headline font-semibold py-2 transition-colors ${
                location.pathname === '/' ? 'text-primary' : 'text-slate-700'
              }`}
            >
              Home
            </Link>
            <a 
              href="#services"
              onClick={handleServicesClick}
              className="block font-headline font-semibold py-2 text-slate-700 hover:text-primary transition-colors"
            >
              Services & Comparison
            </a>
            <Link 
              to="/why-trust-zoltan-visas" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block font-headline font-semibold py-2 transition-colors flex items-center gap-1.5 ${
                isWhyTrustPage ? 'text-primary font-bold' : 'text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-primary">verified</span>
              Why Trust Zoltan Visas?
            </Link>
            <Link 
              to="/about-us" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block font-headline font-semibold py-2 transition-colors ${
                isAboutPage ? 'text-primary' : 'text-slate-700'
              }`}
            >
              About Us
            </Link>
            <Link 
              to="/contact-us" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block font-headline font-semibold py-2 transition-colors ${
                isContactPage ? 'text-primary' : 'text-slate-700'
              }`}
            >
              Contact Us
            </Link>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <a
                href="https://www.instagram.com/travelzoltan/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-xs text-pink-600 py-1.5 font-semibold hover:opacity-80"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Follow @travelzoltan on Instagram</span>
              </a>
              <a
                href="mailto:gb@zoltanvisa.com"
                className="flex items-center justify-center gap-2 text-xs text-slate-600 py-2 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[15px] text-primary">mail</span>
                gb@zoltanvisa.com
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default TopNavBar;
