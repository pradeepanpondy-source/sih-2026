import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Order } from '../types/order';
import { Product } from '../types/product';
import { supabase } from '../lib/supabase';
import { useSeller } from '../hooks/useSeller';
import SellerLayout from './SellerLayout';

const Applications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { seller: sellerProfile, loading: sellerLoading } = useSeller();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeProducts, setActiveProducts] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [showKycPopup, setShowKycPopup] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  const [kycData, setKycData] = useState({
    idType: 'Adhaar',
    idNumber: '',
    address: '',
    pincode: '',
  });
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  // Product Form State
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    image_url: '',
  });
  const [productSubmitting, setProductSubmitting] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user || !sellerProfile) {
      if (!sellerLoading && !sellerProfile) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch KYC status
      const { data: kycDataResult, error: kycError } = await supabase
        .from('kyc')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (kycError && kycError.code !== 'PGRST116') {
        console.error('KYC fetch error:', kycError);
      }
      if (kycDataResult) {
        setKycStatus(kycDataResult.status as 'pending' | 'approved' | 'rejected');
      } else {
        setKycStatus('none');
      }

      // 2. Fetch products if seller exists
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerProfile.id);

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // 3. Fetch orders if seller exists
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          total,
          discounted_total,
          coupon,
          discount,
          status,
          created_at,
          customer_email,
          customer_name,
          order_items ( id, product_id, name, price, quantity )
        `)
        .eq('seller_id', sellerProfile.id);

      if (ordersError) throw ordersError;

      const transformedOrders: Order[] = (ordersData || []).map((order: any) => ({
        id: order.id,
        userId: order.user_id,
        items: order.order_items || [],
        total: order.total,
        discountedTotal: order.discounted_total,
        coupon: order.coupon,
        discount: order.discount,
        status: order.status,
        createdAt: new Date(order.created_at),
        customerEmail: order.customer_email,
        customerName: order.customer_name,
      }));

      let sales = 0;
      let orderCount = 0;
      transformedOrders.forEach((order: Order) => {
        sales += order.total || 0;
        orderCount += 1;
      });

      setOrders(transformedOrders);
      setTotalSales(sales);
      setTotalOrders(orderCount);
      setActiveProducts(productsData?.length || 0);

    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sellerProfile, sellerLoading]);

  useEffect(() => {
    if (!sellerLoading) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, sellerLoading]);



  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setKycSubmitting(true);
    try {
      const { error } = await supabase.from('kyc').insert({
        user_id: user.id,
        id_type: kycData.idType,
        id_number: kycData.idNumber.slice(-4), // Store only last 4 digits
        address: kycData.address,
        pincode: kycData.pincode,
        status: 'pending',
      });
      if (error) throw error;
      alert('KYC submitted successfully! It will be reviewed shortly.');
      setShowKycPopup(false);
      setKycData({ idType: 'Adhaar', idNumber: '', address: '', pincode: '' });
      fetchDashboardData();
    } catch (error: unknown) {
      console.error('KYC submission error:', error);
      alert(`KYC submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setKycSubmitting(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerProfile) {
      alert('You must be a registered seller to add products.');
      return;
    }
    setProductSubmitting(true);
    try {
      const { error } = await supabase.from('products').insert({
        seller_id: sellerProfile.id,
        name: productData.name,
        description: productData.description,
        price: parseFloat(productData.price),
        category: productData.category,
        stock: parseInt(productData.stock, 10),
        image_url: productData.image_url,
        is_active: true,
      });
      if (error) throw error;
      alert('Product added successfully!');
      setShowProductForm(false);
      setProductData({ name: '', description: '', price: '', category: '', stock: '', image_url: '' });
      fetchDashboardData();
    } catch (error: unknown) {
      console.error('Product submission error:', error);
      alert(`Product submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProductSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-honeybee-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <SellerLayout title="Seller Dashboard">
      <div className="max-w-7xl mx-auto">
        {kycStatus === 'pending' && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700 font-medium">
                  Your KYC verification is currently pending. Your dashboard will be fully unlocked once approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {kycStatus === 'none' && (
          <div className="bg-white border border-yellow-200 border-l-4 border-l-yellow-400 p-6 mb-8 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start">
                <div className="bg-yellow-100 p-2 rounded-lg mr-4">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">KYC Verification Required</h3>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    Complete your identity verification to start listing products and receiving payments.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKycPopup(true)}
                className="w-full sm:w-auto bg-honeybee-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-honeybee-primary transition shadow-lg shadow-purple-100"
              >
                Start Verification
              </button>
            </div>
          </div>
        )}

        {kycStatus === 'rejected' && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-bold">
                    KYC Rejected: Please review your document and resubmit.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKycPopup(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
              >
                Resubmit KYC
              </button>
            </div>
          </div>
        )}

        {/* ── SIH 2026 Quick Actions ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div 
            onClick={() => navigate('/seller/batches')}
            className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/60 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform">
                🍯
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Honey Batches & Blockchain QR</h4>
                <p className="text-xs text-gray-600">Register honey harvest, mint Polygon smart contract records & download labels</p>
              </div>
            </div>
            <span className="text-amber-700 font-bold text-sm group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
          </div>

          <div 
            onClick={() => navigate('/sih/hive-monitoring')}
            className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/60 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform">
                🤖
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">AI Hive Monitoring & Disease Vision</h4>
                <p className="text-xs text-gray-600">MobileNetV2 image screening for Varroa mites & real-time IoT sensor telemetry</p>
              </div>
            </div>
            <span className="text-purple-700 font-bold text-sm group-hover:translate-x-1 transition-transform">
              Open &rarr;
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Sales</p>
            <p className="text-3xl font-black text-gray-900 leading-none">₹{totalSales.toFixed(2)}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Orders</p>
            <p className="text-3xl font-black text-gray-900 leading-none">{totalOrders}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Products</p>
            <p className="text-3xl font-black text-gray-900 leading-none">{activeProducts}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Approval Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${sellerProfile?.is_approved ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <p className={`text-2xl font-black ${sellerProfile?.is_approved ? 'text-green-600' : 'text-yellow-600'}`}>
                {sellerProfile?.is_approved ? 'Approved' : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Recent Orders</h3>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-honeybee-accent hover:text-purple-800 uppercase tracking-widest"
            >
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product(s)</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {orders.length > 0 ? (
                  orders.map((order: Order) => (
                    <tr key={order.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 font-mono">#{order.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {order.items.map((itemValue: any) => `${itemValue.name} (x${itemValue.quantity})`).join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-black uppercase tracking-widest rounded-full ${order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' || order.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{order.total.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium italic">
                      No orders found yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* Products Management Snapshot */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/20">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Product Catalog</h3>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/products')}
                className="text-xs font-bold text-honeybee-accent hover:text-purple-800 uppercase tracking-widest"
              >
                Manage All →
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.length > 0 ? (
                  products.slice(0, 5).map((product: Product) => (
                    <tr key={product.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium uppercase text-[10px] tracking-widest">{product.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">₹{product.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        <span className={product.stock < 10 ? 'text-red-500' : 'text-gray-900'}>{product.stock}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-black uppercase tracking-widest rounded-full bg-green-100 text-green-700">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium italic">
                      No products listed yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* KYC Popup Modal */}
      {showKycPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
            <button
              onClick={() => setShowKycPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-honeybee-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900">Complete KYC Verification</h2>
              <p className="text-gray-500 font-medium mt-1">Identity verification is required for all sellers.</p>
            </div>

            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ID Type</label>
                <select
                  value={kycData.idType}
                  onChange={(e) => setKycData({ ...kycData, idType: e.target.value })}
                  className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                >
                  <option value="Adhaar">Adhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="VoterID">Voter ID</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ID Number</label>
                <input
                  type="text"
                  value={kycData.idNumber}
                  onChange={(e) => setKycData({ ...kycData, idNumber: e.target.value })}
                  required
                  placeholder="e.g. 1234-5678-9012"
                  className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Address</label>
                <textarea
                  value={kycData.address}
                  onChange={(e) => setKycData({ ...kycData, address: e.target.value })}
                  required
                  placeholder="Street, City, Zip..."
                  className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={kycSubmitting}
                className="w-full bg-honeybee-accent text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-honeybee-primary transition-all shadow-xl shadow-purple-100 disabled:opacity-50"
              >
                {kycSubmitting ? 'Verifying...' : 'Submit Verification'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product Form Popup Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowProductForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6">Add New Product</h2>

            <form onSubmit={handleProductSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Product Name</label>
                  <input
                    type="text"
                    value={productData.name}
                    onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                    required
                    placeholder="e.g. Pure Wild Forest Honey"
                    className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                  <select
                    value={productData.category}
                    onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                    required
                    className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                  >
                    <option value="">Select Category</option>
                    <option value="honey">Honey</option>
                    <option value="beehive">Beehive</option>
                    <option value="accessories">Accessories</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={productData.description}
                  onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                  required
                  placeholder="Describe your product's unique features..."
                  className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Price (₹)</label>
                  <input
                    type="number"
                    value={productData.price}
                    onChange={(e) => setProductData({ ...productData, price: e.target.value })}
                    required
                    placeholder="0.00"
                    className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Stock Inventory</label>
                  <input
                    type="number"
                    value={productData.stock}
                    onChange={(e) => setProductData({ ...productData, stock: e.target.value })}
                    required
                    placeholder="0"
                    className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Image URL</label>
                <input
                  type="url"
                  value={productData.image_url}
                  onChange={(e) => setProductData({ ...productData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border-gray-100 bg-gray-50/50 shadow-sm focus:border-honeybee-primary focus:ring-honeybee-primary p-3 font-medium transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={productSubmitting}
                className="w-full bg-honeybee-accent text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-honeybee-primary transition-all shadow-xl shadow-purple-100 disabled:opacity-50"
              >
                {productSubmitting ? 'Adding Product...' : 'Confirm Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </SellerLayout>
  );
};

export default Applications;
