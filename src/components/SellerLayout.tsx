import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSeller } from '../hooks/useSeller';

import { generateSellerPDF, uploadSellerPDFToBucket } from '../utils/pdfGenerator'; // Import PDF generator and uploader

interface SellerLayoutProps {
    children: React.ReactNode;
    title: string;
}

const SellerLayout: React.FC<SellerLayoutProps> = ({ children, title }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { seller: sellerProfile, loading: sellerLoading, refreshSeller } = useSeller();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [updatingLocation, setUpdatingLocation] = useState(false);

    const handleDownloadPDF = async () => {
        if (!sellerProfile) return;

        // 1. Trigger Download
        generateSellerPDF(sellerProfile);

        // 2. Upload to Bucket in background
        try {
            await uploadSellerPDFToBucket(sellerProfile);
            console.log("PDF backup uploaded to bucket");
        } catch (err) {
            console.error("Background upload failed", err);
        }
    };

    const navItems = [
        { path: '/applications', icon: '📊', label: 'Dashboard' },
        { path: '/seller/batches', icon: '🍯', label: 'Honey Batches' },
        { path: '/sih/hive-monitoring', icon: '🤖', label: 'AI Hive Health' },
        { path: '/earnings', icon: '💰', label: 'Earnings' },
        { path: '/orders', icon: '🛒', label: 'Orders' },
        { path: '/analytics', icon: '📈', label: 'Analytics' },
        { path: '/products', icon: '📦', label: 'Products' },
        { path: '/settings', icon: '⚙️', label: 'Settings' },
    ];

    const handleUpdateLocation = async () => {
        if (updatingLocation) return;
        setUpdatingLocation(true);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://api.bigdatacloud.com/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                    const data = await response.json();
                    const newAddress = `${data.principalSubdivision || ''}, ${data.city || ''}`.trim().replace(/^, /, '');

                    const { supabase } = await import('../lib/supabase');
                    const { error } = await supabase
                        .from('sellers')
                        .update({
                            address: newAddress,
                            city: data.city,
                            state: data.principalSubdivision,
                            latitude,
                            longitude
                        })
                        .eq('user_id', sellerProfile?.user_id);

                    if (error) throw error;
                    await refreshSeller();
                    alert("Location updated successfully!");
                } catch (error) {
                    console.error("Error updating location:", error);
                    alert("Failed to update location.");
                } finally {
                    setUpdatingLocation(false);
                }
            }, (error) => {
                console.error("Location error:", error);
                alert("Location access denied.");
                setUpdatingLocation(false);
            });
        } else {
            alert("Geolocation not supported.");
            setUpdatingLocation(false);
        }
    };

    if (sellerLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-honeybee-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {/* <h1 className="font-bold text-honeybee-primary">HoneyBee</h1> */}
                </div>
                {sellerProfile?.address && (
                    <div className="flex items-center gap-1 text-[10px] bg-purple-50 text-honeybee-primary px-2 py-1 rounded-full border border-purple-100 max-w-[140px] truncate">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <span className="truncate">{sellerProfile.address.split(',')[0]}</span>
                    </div>
                )}
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
                    <div className="w-64 bg-white h-full shadow-lg flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center bg-honeybee-accent text-white">
                            <div>
                                <span className="font-bold block">Seller Menu</span>
                                {sellerProfile && (
                                    <span className="text-[10px] opacity-90 font-mono block mt-1">
                                        ID: {sellerProfile.seller_id}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-honeybee-primary rounded">✕</button>
                        </div>
                        <nav className="p-2 flex-1 overflow-y-auto flex flex-col">
                            {navItems.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                                    className={`flex items-center w-full px-4 py-3 rounded-lg mb-1 transition-all ${location.pathname === item.path ? 'bg-purple-100 text-honeybee-primary font-bold' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="mr-3">{item.icon}</span> {item.label}
                                </button>
                            ))}

                            {sellerProfile && (
                                <div className="mt-auto pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => { handleDownloadPDF(); setSidebarOpen(false); }}
                                        className="flex items-center w-full px-4 py-3 rounded-lg text-honeybee-primary bg-purple-50 font-bold border border-purple-100"
                                    >
                                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download Application
                                    </button>
                                </div>
                            )}
                        </nav>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex flex-col w-64 bg-white shadow-xl min-h-screen sticky top-0">
                <div className="p-6 border-b">
                    {/* <h2 className="text-2xl font-black text-honeybee-primary tracking-tight">HoneyBee</h2> */}
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Seller Studio</p>
                </div>

                <nav className="p-4 flex-1">
                    {navItems.map(item => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex items-center w-full px-4 py-3 rounded-xl mb-2 transition-all group ${location.pathname === item.path
                                ? 'bg-honeybee-accent text-white shadow-lg shadow-purple-200'
                                : 'text-gray-500 hover:bg-purple-50 hover:text-honeybee-accent'
                                }`}
                        >
                            <span className={`mr-3 text-lg transition-transform group-hover:scale-110`}>{item.icon}</span>
                            <span className="font-semibold">{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Persistent Location/ID Card */}
                {sellerProfile && (
                    <div className="p-4 border-t border-gray-100">
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-100 rounded-full -mr-8 -mt-8 opacity-20"></div>

                            <div className="relative z-10 space-y-4">
                                <div>
                                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-[0.2em] mb-1">Store ID</p>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-gray-700 truncate mr-2">{sellerProfile.seller_id}</span>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(sellerProfile.seller_id); alert('ID Copied!'); }}
                                            className="text-gray-300 hover:text-honeybee-primary"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-[0.2em]">Location</p>
                                        <button
                                            onClick={handleUpdateLocation}
                                            disabled={updatingLocation}
                                            className="text-[9px] font-bold text-honeybee-accent hover:underline uppercase"
                                        >
                                            {updatingLocation ? '...' : 'Update'}
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3 h-3 text-honeybee-accent" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                            </svg>
                                        </div>
                                        <span className="text-[11px] text-gray-600 font-medium leading-relaxed">
                                            {sellerProfile.address || 'Not Set'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}

            <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                <header className="mb-8 hidden lg:flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h1>
                        <p className="text-gray-500 font-medium mt-1">Manage your honey business and sales</p>
                    </div>
                    {sellerProfile && (
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 bg-white border border-gray-200 text-honeybee-primary px-4 py-2 rounded-lg font-bold hover:bg-purple-50 hover:border-purple-200 transition-all shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Application
                        </button>
                    )}
                </header>
                {children}
            </main>
        </div>
    );
};

export default SellerLayout;
