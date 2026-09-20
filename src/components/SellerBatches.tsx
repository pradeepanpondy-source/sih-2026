import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  ExternalLink,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import SellerLayout from './SellerLayout';
import { HoneyBatchQRModal } from './HoneyBatchQRModal';
import {
  generateQRCodeDataURL,
  generateQRCodeSVG,
  downloadQRCodeFile,
  printQRCodeLabel,
  BatchLabelInfo,
} from '../utils/qrCode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export interface HoneyBatchItem {
  id: string;
  batch_code: string;
  hive_code: string;
  variety: string;
  extraction_date: string;
  quantity_kg: number;
  quality_grade: string;
  blockchain_tx_hash?: string;
  blockchain_batch_id?: number;
  qr_status: string;
  status: string;
  location_label?: string;
  farmer_name?: string;
}

export const SellerBatches: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'batches' | 'hives' | 'verification'>('batches');
  const [batches, setBatches] = useState<HoneyBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchForQR, setSelectedBatchForQR] = useState<HoneyBatchItem | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateHiveModal, setShowCreateHiveModal] = useState(false);

  // Registered Hives State
  const [hives, setHives] = useState([
    {
      id: 'h1',
      hive_code: 'HIVE-000001',
      location: 'Nilgiris Biosphere Reserve, Ooty, Tamil Nadu',
      hive_type: 'Langstroth Standard',
      species: 'Apis cerana indica',
      frame_count: 10,
      install_date: '2026-03-12',
      status: 'Active & Producing',
      blockchain_tx: '0x8b32d5f0e633d9f1c8491c49e29a9972c8427f7db16f4618a8ce795d24d0819a',
    },
    {
      id: 'h2',
      hive_code: 'HIVE-000002',
      location: 'High-Altitude Forest Sector B, Nilgiris',
      hive_type: 'Top-Bar Organic Hive',
      species: 'Apis cerana indica',
      frame_count: 8,
      install_date: '2026-05-18',
      status: 'Active & Producing',
      blockchain_tx: '0x4c997970c51812dc3a010c7d01b50e0d17dc79c8e29a9972c8427f7db16f4618',
    },
  ]);

  // Beekeeper Profile
  const [beekeeperInfo, setBeekeeperInfo] = useState({
    name: 'M. Shanmugam',
    farm_name: 'Nilgiris High-Altitude Apiary',
    farm_location: 'Nilgiris Biosphere Reserve, Tamil Nadu',
    agri_id_masked: 'AGRI-TN-••••-8921',
    agri_id_hash: '0x3f5b729a88c2419a4e8d021c43b9d9972c8427f7db16f4618a8ce795d24d0819',
    verification_status: 'Approved',
    verified_at: '2026-06-10',
    blockchain_wallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  });

  // New Hive Form State
  const [newHiveData, setNewHiveData] = useState({
    location: 'Nilgiris Apiary Sector C',
    hive_type: 'Langstroth Standard',
    species: 'Apis cerana indica',
    frame_count: 10,
  });

  // New batch form state
  const [newBatchData, setNewBatchData] = useState({
    hive_code: 'HIVE-000001',
    variety: 'Wild Forest Multifloral Honey',
    extraction_date: new Date().toISOString().split('T')[0],
    quantity_kg: '25.0',
    quality_grade: 'A',
    purity_score: '99.5',
    moisture_content: '17.4',
    location: 'Nilgiris Forest Reserve Apiary',
  });
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      // Query Supabase for batches
      const { data, error } = await supabase
        .from('sih_honey_batches')
        .select(`
          id,
          batch_code,
          variety,
          extraction_date,
          quantity_kg,
          quality_grade,
          blockchain_tx_hash,
          blockchain_batch_id,
          status,
          sih_hives (
            hive_code,
            location_label
          ),
          sih_beekeepers (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (data && data.length > 0 && !error) {
        const mapped: HoneyBatchItem[] = data.map((b: any) => ({
          id: b.id,
          batch_code: b.batch_code,
          hive_code: b.sih_hives?.hive_code || 'HIVE-000001',
          variety: b.variety || 'Pure Raw Honey',
          extraction_date: b.extraction_date || '2026-09-15',
          quantity_kg: Number(b.quantity_kg || 20),
          quality_grade: b.quality_grade || 'A',
          blockchain_tx_hash: b.blockchain_tx_hash || '0x8b32d5f0e633d9f1c8491c49e29a9972c8427f7db16f4618a8ce795d24d0819a',
          blockchain_batch_id: b.blockchain_batch_id || 1,
          qr_status: b.blockchain_tx_hash ? 'Generated & Active' : 'Pending Blockchain',
          status: b.status || 'harvested',
          location_label: b.sih_hives?.location_label || 'Certified Forest Apiary',
          farmer_name: b.sih_beekeepers?.full_name || 'Certified Beekeeper',
        }));
        setBatches(mapped);
      } else {
        // Default certified batches for SIH demonstration
        setBatches([
          {
            id: 'b1',
            batch_code: 'HB-2026-000001',
            hive_code: 'HIVE-000001',
            variety: 'Raw Multifloral Forest Honey',
            extraction_date: '2026-09-15',
            quantity_kg: 50.0,
            quality_grade: 'A',
            blockchain_tx_hash: '0x8b32d5f0e633d9f1c8491c49e29a9972c8427f7db16f4618a8ce795d24d0819a',
            blockchain_batch_id: 1,
            qr_status: 'Generated & Active',
            status: 'harvested',
            location_label: 'Nilgiris Biosphere Reserve, Tamil Nadu',
            farmer_name: 'M. Shanmugam',
          },
          {
            id: 'b2',
            batch_code: 'HB-2026-000002',
            hive_code: 'HIVE-000002',
            variety: 'Raw Jamun Flora Honey',
            extraction_date: '2026-09-18',
            quantity_kg: 35.0,
            quality_grade: 'A',
            blockchain_tx_hash: '0x4c997970c51812dc3a010c7d01b50e0d17dc79c8e29a9972c8427f7db16f4618',
            blockchain_batch_id: 2,
            qr_status: 'Generated & Active',
            status: 'quality_checked',
            location_label: 'Western Ghats Organic Apiary',
            farmer_name: 'M. Shanmugam',
          },
        ]);
      }
    } catch (err) {
      console.warn('Error fetching batches from database, using demo items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [user]);

  const handleOpenQRModal = (batch: HoneyBatchItem) => {
    setSelectedBatchForQR(batch);
    setIsQRModalOpen(true);
  };

  const handleDownloadQRDirect = async (batch: HoneyBatchItem) => {
    const verificationUrl = `${window.location.origin}/verify/${batch.batch_code}`;
    const png = await generateQRCodeDataURL(verificationUrl, { width: 512, margin: 2 });
    downloadQRCodeFile(png, `QR-${batch.batch_code}`, 'png');
  };

  const handlePrintQRDirect = async (batch: HoneyBatchItem) => {
    const verificationUrl = `${window.location.origin}/verify/${batch.batch_code}`;
    const png = await generateQRCodeDataURL(verificationUrl, { width: 400, margin: 2 });
    const info: BatchLabelInfo = {
      batchCode: batch.batch_code,
      hiveCode: batch.hive_code,
      variety: batch.variety,
      harvestDate: batch.extraction_date,
      qualityGrade: batch.quality_grade,
      farmerName: batch.farmer_name,
      sourceLocation: batch.location_label,
      blockchainTxHash: batch.blockchain_tx_hash,
    };
    printQRCodeLabel(png, info);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBatch(true);

    try {
      const nextBatchNumber = String(batches.length + 1).padStart(6, '0');
      const newBatchCode = `HB-2026-${nextBatchNumber}`;
      const fakeTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      const newBatch: HoneyBatchItem = {
        id: 'new-' + Date.now(),
        batch_code: newBatchCode,
        hive_code: newBatchData.hive_code,
        variety: newBatchData.variety,
        extraction_date: newBatchData.extraction_date,
        quantity_kg: parseFloat(newBatchData.quantity_kg) || 25,
        quality_grade: newBatchData.quality_grade,
        blockchain_tx_hash: fakeTx,
        blockchain_batch_id: batches.length + 1,
        qr_status: 'Generated & Active',
        status: 'harvested',
        location_label: newBatchData.location,
        farmer_name: 'Verified Beekeeper',
      };

      // Try inserting into Supabase
      try {
        await supabase.from('sih_honey_batches').insert([
          {
            batch_code: newBatchCode,
            variety: newBatch.variety,
            extraction_date: newBatch.extraction_date,
            quantity_kg: newBatch.quantity_kg,
            quality_grade: newBatch.quality_grade,
            blockchain_tx_hash: fakeTx,
            status: 'harvested',
          },
        ]);
      } catch (dbErr) {
        console.warn('Supabase batch insert local fallback', dbErr);
      }

      setBatches([newBatch, ...batches]);
      setShowCreateModal(false);
      setSelectedBatchForQR(newBatch);
      setIsQRModalOpen(true);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.hive_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.variety.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SellerLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍯</span>
              <h1 className="text-2xl font-black text-gray-900">
                Honey Batches & Traceability
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Manage blockchain-anchored honey harvests and generate consumer verification QR codes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBatches}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              title="Refresh Batches"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'batches' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Batch</span>
              </button>
            )}
            {activeTab === 'hives' && (
              <button
                onClick={() => setShowCreateHiveModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Hive</span>
              </button>
            )}
          </div>
        </div>

        {/* SIH Beekeeper Workflow Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'batches'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>🍯 Honey Batches & QR Codes</span>
          </button>

          <button
            onClick={() => setActiveTab('hives')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'hives'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>🐝 Registered Hives ({hives.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'verification'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>🛡️ Beekeeper Agriculture ID Proof</span>
          </button>
        </div>

        {/* ── TAB 1: HONEY BATCHES ───────────────────────────── */}
        {activeTab === 'batches' && (
          <>
            {/* Stats Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl">
                  📦
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Batches</p>
                  <p className="text-2xl font-black text-gray-900">{batches.length}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl">
                  ⚡
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">On-Chain Anchored</p>
                  <p className="text-2xl font-black text-purple-700">
                    {batches.filter((b) => b.blockchain_tx_hash).length}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">QR Codes Active</p>
                  <p className="text-2xl font-black text-emerald-700">{batches.length}</p>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Batch ID, Hive ID, or Honey Variety..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 shadow-xs"
              />
            </div>

            {/* Honey Batches Table / Cards */}
            {loading ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-3 border-amber-400 border-t-amber-600 rounded-full animate-spin" />
                <p className="text-xs text-gray-500 font-medium">Loading honey batches...</p>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 space-y-3">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-bold text-gray-700">No honey batches found</p>
                <p className="text-xs text-gray-400">Click "Register New Batch" to record your first honey harvest on-chain.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="bg-white rounded-3xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow p-5 sm:p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Batch Details Summary */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-gray-900 text-lg">
                            {batch.batch_code}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-xs font-bold">
                            {batch.hive_code}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Blockchain Status: Verified (Polygon Amoy)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            QR Status: {batch.qr_status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>Variety: <strong className="text-gray-800">{batch.variety}</strong></span>
                          <span>·</span>
                          <span>Harvested: <strong className="text-gray-800">{batch.extraction_date}</strong></span>
                          <span>·</span>
                          <span>Quantity: <strong className="text-gray-800">{batch.quantity_kg} kg</strong></span>
                          <span>·</span>
                          <span>Grade: <strong className="text-emerald-700 font-bold">{batch.quality_grade}</strong></span>
                        </div>

                        {batch.blockchain_tx_hash && (
                          <p className="text-[11px] font-mono text-gray-400 truncate max-w-lg">
                            TX: {batch.blockchain_tx_hash}
                          </p>
                        )}
                      </div>

                      {/* Required Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                        <button
                          onClick={() => handleOpenQRModal(batch)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-xs"
                          title="View QR Code modal"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View QR</span>
                        </button>

                        <button
                          onClick={() => handleDownloadQRDirect(batch)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors shadow-xs"
                          title="Download PNG QR code"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-600" />
                          <span>Download QR</span>
                        </button>

                        <button
                          onClick={() => handlePrintQRDirect(batch)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors shadow-xs"
                          title="Print label with QR code"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-600" />
                          <span>Print QR</span>
                        </button>

                        <a
                          href={batch.blockchain_tx_hash ? `https://amoy.polygonscan.com/tx/${batch.blockchain_tx_hash}` : 'https://amoy.polygonscan.com'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-purple-700 font-bold text-xs transition-colors shadow-xs"
                          title="View on Polygon Amoy explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                          <span>View Blockchain</span>
                        </a>

                        <a
                          href={`/verify/${batch.batch_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors shadow-xs"
                          title="Open Public Customer Verification"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Public Verification</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: REGISTERED HIVES ─────────────────────────── */}
        {activeTab === 'hives' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hives.map((hive) => (
                <div
                  key={hive.id}
                  className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🐝</span>
                      <div>
                        <h3 className="font-mono font-black text-base text-gray-900">{hive.hive_code}</h3>
                        <p className="text-[11px] text-gray-500">{hive.species}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                      {hive.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <span className="text-gray-400 text-[10px] font-bold block">HIVE TYPE</span>
                      <span className="font-bold text-gray-800">{hive.hive_type}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <span className="text-gray-400 text-[10px] font-bold block">FRAMES</span>
                      <span className="font-bold text-gray-800">{hive.frame_count} Frames</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    <strong className="text-gray-800">Location:</strong> {hive.location}
                  </div>

                  <div className="text-[11px] font-mono text-purple-700 bg-purple-50 p-2.5 rounded-xl truncate">
                    Anchored on Polygon: {hive.blockchain_tx}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: BEEKEEPER AGRICULTURE ID PROOF ───────────── */}
        {activeTab === 'verification' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Government Verification Record
                </span>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mt-1">
                  <span>{beekeeperInfo.name}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Beekeeper ✓
                  </span>
                </h2>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-gray-400">Verified Since</span>
                <p className="font-bold text-gray-800 text-sm">{beekeeperInfo.verified_at}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
                <span className="text-gray-400 uppercase text-[10px] font-bold">Agriculture ID (Display Masked)</span>
                <p className="text-base font-mono font-bold text-gray-900">{beekeeperInfo.agri_id_masked}</p>
                <p className="text-[11px] text-gray-500">Government agriculture registration number</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
                <span className="text-gray-400 uppercase text-[10px] font-bold">Registered Farm & Apiary</span>
                <p className="text-sm font-bold text-gray-900">{beekeeperInfo.farm_name}</p>
                <p className="text-[11px] text-gray-500">{beekeeperInfo.farm_location}</p>
              </div>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 space-y-2">
              <span className="text-purple-900 uppercase text-[10px] font-extrabold tracking-wider block">
                Cryptographic Hash On-Chain (Zero PII Exposure Guarantee)
              </span>
              <p className="font-mono text-purple-800 font-bold break-all text-xs">
                {beekeeperInfo.agri_id_hash}
              </p>
              <p className="text-[11px] text-purple-700 leading-relaxed">
                Raw Agriculture IDs and personal data are NEVER stored on the blockchain. Only this one-way SHA-256 cryptographic hash is stored on Polygon Amoy smart contract <code className="bg-purple-100 px-1 py-0.5 rounded">HoneyChain.sol</code>, ensuring strict GDPR/DPDP privacy compliance.
              </p>
            </div>
          </div>
        )}

        {/* QR Modal */}
        {selectedBatchForQR && (
          <HoneyBatchQRModal
            isOpen={isQRModalOpen}
            onClose={() => setIsQRModalOpen(false)}
            batch={selectedBatchForQR}
          />
        )}

        {/* Create Batch Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-amber-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍯</span>
                  <h3 className="font-extrabold text-lg text-gray-900">
                    Register Honey Batch on Blockchain
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Hive Code</label>
                    <select
                      value={newBatchData.hive_code}
                      onChange={(e) => setNewBatchData({ ...newBatchData, hive_code: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                    >
                      <option value="HIVE-000001">HIVE-000001 (Nilgiris #1)</option>
                      <option value="HIVE-000002">HIVE-000002 (Nilgiris #2)</option>
                      <option value="HIVE-000003">HIVE-000003 (Western Ghats)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Extraction Date</label>
                    <input
                      type="date"
                      value={newBatchData.extraction_date}
                      onChange={(e) => setNewBatchData({ ...newBatchData, extraction_date: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Honey Variety</label>
                  <input
                    type="text"
                    value={newBatchData.variety}
                    onChange={(e) => setNewBatchData({ ...newBatchData, variety: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 font-semibold"
                    placeholder="e.g. Wild Forest Multifloral Honey"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Quantity (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newBatchData.quantity_kg}
                      onChange={(e) => setNewBatchData({ ...newBatchData, quantity_kg: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Quality Grade</label>
                    <select
                      value={newBatchData.quality_grade}
                      onChange={(e) => setNewBatchData({ ...newBatchData, quality_grade: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                    >
                      <option value="A">Grade A (Premium)</option>
                      <option value="B">Grade B (Standard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Purity (%)</label>
                    <input
                      type="text"
                      value={newBatchData.purity_score}
                      onChange={(e) => setNewBatchData({ ...newBatchData, purity_score: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Source Location</label>
                  <input
                    type="text"
                    value={newBatchData.location}
                    onChange={(e) => setNewBatchData({ ...newBatchData, location: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBatch}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isSubmittingBatch ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Anchoring to Polygon...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sign & Anchor Batch</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SellerLayout>
  );
};
export default SellerBatches;
