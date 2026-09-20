import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Menu, X, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { cartItems } = useCart();
  const { logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Hide navigation on login and signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  // Check if on seller dashboard pages (where Seller link should be hidden)
  const isSellerDashboard = ['/applications', '/products', '/analytics', '/earnings', '/orders', '/settings'].includes(location.pathname);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled
      ? 'bg-honeybee-background/95 backdrop-blur-md shadow-lg py-2'
      : 'bg-transparent py-4'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo — non-clickable branding element */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center select-none" aria-label="Bee Bridge">
              <motion.div
                initial="initial"
                animate="animate"
                className="font-serif text-xl md:text-2xl font-black flex overflow-hidden"
              >
                {"Bee".split("").map((letter, i) => (
                  <motion.span
                    key={i}
                    variants={{
                      initial: { y: 20, opacity: 0 },
                      animate: { y: 0, opacity: 1 }
                    }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                    className="text-honeybee-secondary"
                  >
                    {letter}
                  </motion.span>
                ))}
                <motion.span
                  variants={{
                    initial: { scale: 0, opacity: 0 },
                    animate: { scale: 1, opacity: 1 }
                  }}
                  transition={{ duration: 0.8, delay: 0.5, type: "spring", stiffness: 200 }}
                  className="text-honeybee-primary ml-0.5"
                >
                  Bridge
                </motion.span>
              </motion.div>
            </div>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-7">
            {[
              { name: 'Home', path: '/home' },
              { name: 'Shop', path: '/shop' },
              { name: 'AI Monitoring', path: '/sih/hive-monitoring', isSpecial: true, badge: 'AI' },
              { name: 'Verify Honey', path: '/verify/HB-2026-000001', isSpecial: true, badge: 'Web3' },
              { name: 'About', path: '/about' },
              { name: 'Seller', path: '/seller', hidden: isSellerDashboard },
              { name: 'Contact', path: '/contact' },
              { name: 'Subscription', path: '/subscription' },
            ].map((link) => (
              !link.hidden && (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative font-bold text-xs lg:text-sm uppercase tracking-wider transition-colors duration-300 group flex items-center gap-1.5 ${location.pathname === link.path
                    ? 'text-honeybee-primary'
                    : 'text-honeybee-secondary hover:text-honeybee-primary'
                    }`}
                >
                  {link.name}
                  {link.badge && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      link.badge === 'AI' 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                    }`}>
                      {link.badge}
                    </span>
                  )}
                  <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-honeybee-primary transition-all duration-300 group-hover:w-full ${location.pathname === link.path ? 'w-full' : ''
                    }`}></span>
                </Link>
              )
            ))}
          </div>

          <div className="flex items-center space-x-3 md:space-x-5">
            <Link to="/cart" className="text-honeybee-secondary hover:text-honeybee-primary transition-all p-2 bg-white/50 rounded-full hover:bg-honeybee-primary/10 relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItems.reduce((acc, item) => acc + item.quantity, 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-honeybee-secondary text-honeybee-primary rounded-full text-[10px] font-black w-4 h-4 flex items-center justify-center animate-pulse">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </Link>
            <Link to="/profile" className="text-honeybee-secondary hover:text-honeybee-primary transition-all p-2 bg-white/50 rounded-full hover:bg-honeybee-primary/10">
              <User className="h-5 w-5" />
            </Link>
            <div
              className="relative hidden md:block group"
              onMouseEnter={() => setIsSettingsOpen(true)}
              onMouseLeave={() => setIsSettingsOpen(false)}
            >
              <button className="text-honeybee-secondary hover:text-honeybee-primary transition-all p-2 bg-white/50 rounded-full hover:bg-honeybee-primary/10 relative z-10">
                <Settings className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {isSettingsOpen && (
                  <>
                    {/* Hover Bridge - Invisible div to keep the menu open while moving mouse */}
                    <div className="absolute top-full left-0 w-full h-4 bg-transparent z-0" />

                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-honeybee-primary/5 overflow-hidden z-[100]"
                    >
                      <Link
                        to="/my-orders"
                        className="block w-full text-left px-6 py-4 text-sm font-black uppercase tracking-widest text-honeybee-secondary hover:bg-honeybee-primary hover:text-white transition-all duration-300 hover:pl-8 active:scale-95 border-b border-gray-100"
                        onClick={() => setIsSettingsOpen(false)}
                      >
                        My Orders
                      </Link>
                      <button
                        className="block w-full text-left px-6 py-4 text-sm font-black uppercase tracking-widest text-honeybee-secondary hover:bg-honeybee-primary hover:text-white transition-all duration-300 hover:pl-8 active:scale-95"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await logout();
                          window.location.href = '/login';
                        }}
                      >
                        <span className="flex items-center gap-2 pointer-events-none">
                          Logout <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>→</motion.span>
                        </span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-honeybee-secondary hover:text-honeybee-primary p-2 transition-transform active:scale-90"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.8, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="md:hidden bg-honeybee-background border-t border-honeybee-primary/10 shadow-2xl overflow-hidden"
          >
            <div className="px-4 pt-4 pb-8 space-y-2">
              {[
                { name: 'Home', path: '/home' },
                { name: 'Shop', path: '/shop' },
                { name: '🤖 AI Hive Health & Vision', path: '/sih/hive-monitoring' },
                { name: '🛡️ Verify Honey (Blockchain)', path: '/verify/HB-2026-000001' },
                { name: 'About', path: '/about' },
                { name: 'Seller', path: '/seller' },
                { name: 'Contact', path: '/contact' },
                { name: 'Subscription', path: '/subscription' },
                { name: 'My Orders', path: '/my-orders' },
                { name: 'Settings', path: '/settings' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-5 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${location.pathname === link.path
                    ? 'bg-honeybee-primary text-honeybee-secondary'
                    : 'text-honeybee-secondary hover:bg-honeybee-primary/10'
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <button
                onClick={async () => {
                  await logout();
                  window.location.href = '/login';
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-5 py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-honeybee-secondary hover:bg-honeybee-primary/10 transition-colors"
              >
                Logout account
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
