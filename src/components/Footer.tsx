 import React from 'react';
import { Facebook, Twitter, Youtube, Instagram } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-700 pb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">About</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/contact" className="hover:text-white font-semibold">Contact Us</a></li>
            <li><a href="/about" className="hover:text-white font-semibold">About Us</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-yellow-400 uppercase mb-4">SIH 2026 Innovations</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/sih/hive-monitoring" className="hover:text-white font-semibold flex items-center gap-1.5"><span>🤖</span> AI Hive Health Monitoring</a></li>
            <li><a href="/verify/HB-2026-000001" className="hover:text-white font-semibold flex items-center gap-1.5"><span>🛡️</span> Blockchain Honey Verification</a></li>
            <li><a href="/seller/batches" className="hover:text-white font-semibold flex items-center gap-1.5"><span>🍯</span> Honey Batches & QR Codes</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Help & Info</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/contact" className="hover:text-white font-semibold">Payments</a></li>
            <li><a href="/contact" className="hover:text-white font-semibold">Shipping</a></li>
            <li><a href="/contact" className="hover:text-white font-semibold">Cancellation & Returns</a></li>
            <li><a href="/contact" className="hover:text-white font-semibold">FAQ</a></li>
          </ul>
        </div>

        <div className="border-l border-gray-700 pl-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Mail Us:</h3>
          <address className="not-italic text-sm space-y-1">
            <p>beebridgeshop@gmail.com</p>
          </address>
          <div className="mt-4">
            <p className="text-sm font-semibold">Social:</p>
            <div className="flex space-x-4 mt-2">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-white">
                <Youtube size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white">
                <Instagram size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between pt-6">
          <div className="flex space-x-8 text-yellow-400 text-sm font-semibold">
            <a href="/seller" className="flex items-center space-x-2 hover:underline">
              <span>Become a Seller</span>
            </a>
            <a href="/contact" className="flex items-center space-x-2 hover:underline">
              <span>Help Center</span>
            </a>
          </div>
          <div className="text-gray-400 text-sm mt-4 md:mt-0">
            © 2025 Bee Bridge.com
          </div>
      </div>
    </footer>
  );
};

export default Footer;
