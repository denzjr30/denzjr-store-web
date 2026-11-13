import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';

const NOMINAL_LIST = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 1000, 2000, 3000, 4000, 5000];

const DEFAULT_PRICES = {
  10: 2000, 20: 3500, 30: 5000, 40: 6500, 50: 8000,
  60: 9500, 70: 11000, 80: 12500, 90: 13500, 100: 15500,
  200: 31000, 300: 46500, 400: 62000, 500: 77500, 1000: 155000,
  2000: 310000, 3000: 465000, 4000: 620000, 5000: 750000
};
export default function AdminDashboard() {
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [authError, setAuthError] = useState('');

  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stock, setStock] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filter & Sort Pesanan
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    if (token) {
      fetchAllAdminData();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin/login`, { admin_pin: pin });
      const jwt = res.data.token || res.data.access_token;
      setToken(jwt);
      localStorage.setItem('admin_token', jwt);
    } catch (err) {
      setAuthError('PIN Admin tidak valid!');
    }
  };

  const fetchAllAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ordRes, setRes, revRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/admin/orders`, { headers }),
        axios.get(`${API_BASE_URL}/api/settings`),
        axios.get(`${API_BASE_URL}/api/reviews`)
      ]);

      if (ordRes.status === 'fulfilled') setOrders(ordRes.value.data || []);
      if (revRes.status === 'fulfilled') setReviews(revRes.value.data || []);
      if (setRes.status === 'fulfilled' && setRes.value.data) {
        const s = setRes.value.data;
        setStock(s.stock !== null && s.stock !== undefined ? String(s.stock) : '');
        setIsOpen(s.is_open !== undefined ? s.is_open : true);
        if (s.prices) setPrices({ ...DEFAULT_PRICES, ...s.prices });
      }
    } catch (err) {
      setToken('');
      localStorage.removeItem('admin_token');
    }
  };

  const handleSaveSettings = async (customOpenState = isOpen) => {
    setSavingSettings(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_BASE_URL}/api/admin/settings`, {
        stock: stock === '' ? null : Number(stock),
        is_open: customOpenState,
        prices
      }, { headers });
      setIsOpen(customOpenState);
      alert('Pengaturan stok, status toko & harga berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan pengaturan toko.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_BASE_URL}/api/admin/orders/${orderId}`, { status: newStatus }, { headers });
      fetchAllAdminData();
    } catch (err) {
      alert('Gagal mengubah status pesanan.');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Hapus pesanan ini secara permanen?')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_BASE_URL}/api/admin/orders/${orderId}`, { headers });
      fetchAllAdminData();
    } catch (err) {
      alert('Gagal menghapus pesanan.');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Hapus ulasan ini?')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_BASE_URL}/api/admin/reviews/${reviewId}`, { headers });
      fetchAllAdminData();
    } catch (err) {
      alert('Gagal menghapus ulasan.');
    }
  };

  // Hitung Statistik
  const totalOrders = orders.length;
  const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const completedRevenue = orders
    .filter(o => o.status === 'Selesai')
    .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

  const countByStatus = (st) => orders.filter(o => o.status === st).length;

  const filteredOrders = orders
    .filter(o => statusFilter === 'Semua' || o.status === statusFilter)
    .sort((a, b) => sortOrder === 'newest' ? -1 : 1);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center p-4">
        <div className="bg-[#121724] border border-gray-800 p-7 rounded-2xl max-w-sm w-full shadow-xl text-center">
          <img src="/logo.jpeg" alt="Admin" className="w-14 h-14 rounded-xl mx-auto mb-3 object-cover" />
          <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">DenzJr Store / Admin</p>
          <h1 className="text-2xl font-extrabold mb-5">Masuk Dashboard</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Masukkan ADMIN_PIN"
              className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-center text-white tracking-widest focus:border-orange-500 outline-none"
            />
            {authError && <p className="text-red-400 text-xs">{authError}</p>}
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 font-bold py-3 rounded-xl transition">
              Buka Dashboard
            </button>
          </form>
          <div className="mt-5">
            <Link to="/" className="text-xs text-gray-400 hover:underline">← Kembali ke Store</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* TOP BAR */}
        <header className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">DenzJr Store / Admin</p>
            <h1 className="text-3xl font-extrabold">Pesanan masuk</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="bg-[#121724] border border-gray-800 px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white">
              Lihat Toko
            </Link>
            <button onClick={fetchAllAdminData} className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-xl text-sm font-bold transition">
              ↻ Segarkan
            </button>
            <button onClick={() => { setToken(''); localStorage.removeItem('admin_token'); }} className="bg-red-950/60 border border-red-500/40 text-red-400 px-3 py-2 rounded-xl text-sm">
              Keluar
            </button>
          </div>
        </header>

        {/* 4 KARTU STATISTIK */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase mb-1">Total Pesanan</p>
            <p className="text-3xl font-extrabold text-orange-500">{totalOrders}</p>
          </div>
          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase mb-1">Total Nilai Pesanan</p>
            <p className="text-3xl font-extrabold text-orange-500">Rp {totalOrderValue.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase mb-1">Pendapatan Selesai</p>
            <p className="text-3xl font-extrabold text-emerald-400">Rp {completedRevenue.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase mb-2">Per Status</p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Menunggu konfirmasi ({countByStatus('Menunggu konfirmasi')}) • Menunggu pembayaran ({countByStatus('Menunggu pembayaran')}) • Pembayaran diterima ({countByStatus('Pembayaran diterima')}) • Selesai ({countByStatus('Selesai')})
            </p>
          </div>
        </section>

        {/* ATUR STOK, TOKO & HARGA ROBUX */}
        <section className="bg-[#121724] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Stok Robux</p>
              <h2 className="text-xl font-extrabold">Atur stok & toko</h2>
            </div>
            <button
              onClick={() => handleSaveSettings(!isOpen)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${isOpen ? 'bg-[#0e2923] border-emerald-500/40 text-emerald-400' : 'bg-red-950 border-red-500/40 text-red-400'}`}
            >
              {isOpen ? '🟢 Toko BUKA — tutup sementara' : '🔴 Toko TUTUP — buka kembali'}
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Total stok Robux kamu</label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              placeholder="Contoh: 510"
              className="w-full max-w-xs bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-white font-bold focus:border-orange-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1.5">Kosongkan = stok tidak dibatasi. Angka ini tampil di website publik dan berkurang otomatis saat pesanan selesai.</p>
          </div>

          <div className="border-t border-gray-800 pt-5">
            <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Harga Robux</p>
            <h3 className="text-xl font-extrabold mb-4">Atur harga jual</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {NOMINAL_LIST.map((nom) => (
                <div key={nom}>
                  <label className="block text-xs font-bold text-cyan-400 mb-1">{nom} R$</label>
                  <input
                    type="number"
                    value={prices[nom] || ''}
                    onChange={e => setPrices({ ...prices, [nom]: Number(e.target.value) })}
                    className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-2.5 text-sm text-white focus:border-orange-500 outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSaveSettings(isOpen)}
              disabled={savingSettings}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
            >
              {savingSettings ? 'Menyimpan...' : '💾 Simpan Perubahan Stok & Harga'}
            </button>
          </div>
        </section>

        {/* FILTER STATUS & DAFTAR PESANAN */}
        <section className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {['Semua', 'Menunggu konfirmasi', 'Menunggu pembayaran', 'Pembayaran diterima', 'Selesai'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${statusFilter === st ? 'bg-orange-600 text-white' : 'bg-[#121724] border border-gray-800 text-gray-400 hover:text-white'}`}
                >
                  {st}
                </button>
              ))}
            </div>

            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="bg-[#121724] border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none"
            >
              <option value="newest">Terbaru dulu</option>
              <option value="oldest">Terlama dulu</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-[#121724] border border-gray-800 rounded-2xl p-8 text-center text-gray-400 text-sm">
              Belum ada pesanan pada kategori ini.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const id = ord.id || ord._id;
              const orderCode = ord.order_number || ord.tracking_code;
              const cleanPhone = (ord.whatsapp || '').replace(/^0/, '62').replace(/[^0-9]/g, '');
              const waUpdateMsg = encodeURIComponent(
                `Halo *${ord.buyer_name}*, update pesanan DenzJr Store kamu:\n` +
                `• No. Order: *${orderCode}*\n` +
                `• Username Roblox: *${ord.roblox_username}*\n` +
                `• Status Terbaru: *${ord.status}*\n\nTerima kasih sudah order!`
              );

              return (
                <div key={id} className="bg-[#121724] border border-gray-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-orange-500">{orderCode}</h3>
                      <p className="text-xs text-gray-400">{ord.roblox_username} • {ord.buyer_name} ({ord.whatsapp})</p>
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <span className="bg-[#1a2234] text-xs px-2.5 py-1 rounded-lg text-gray-300">
                          {ord.robux_amount} Robux • Rp {(ord.total_price || 0).toLocaleString('id-ID')}
                        </span>
                        {ord.payment_proof_url && (
                          <a href={ord.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 underline">
                            Lihat Bukti TF ↗
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={ord.status}
                        onChange={e => handleStatusChange(id, e.target.value)}
                        className="bg-[#0b0f19] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                      >
                        <option value="Menunggu konfirmasi">Menunggu konfirmasi</option>
                        <option value="Menunggu pembayaran">Menunggu pembayaran</option>
                        <option value="Pembayaran diterima">Pembayaran diterima</option>
                        <option value="Selesai">Selesai</option>
                      </select>

                      <button
                        onClick={() => handleDeleteOrder(id)}
                        className="bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 p-2 rounded-xl"
                        title="Hapus Pesanan"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-y border-gray-800 py-3">
                    <span className="text-xs text-gray-400">Total</span>
                    <span className="text-xl font-extrabold text-orange-500">Rp {(ord.total_price || 0).toLocaleString('id-ID')}</span>
                  </div>

                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${waUpdateMsg}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-[#0e2923] hover:bg-[#143a31] border border-emerald-500/40 text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                    >
                      Kirim Update ke Pembeli ↗
                    </a>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* MODERASI ULASAN PEMBELI */}
        <section className="bg-[#121724] border border-gray-800 rounded-2xl p-6">
          <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Moderasi</p>
          <h2 className="text-xl font-extrabold mb-4">Ulasan pembeli</h2>

          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada ulasan masuk.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map(rev => {
                const revId = rev.id || rev._id;
                return (
                  <div key={revId} className="bg-[#0b0f19] border border-gray-800 rounded-xl p-4 flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{rev.name}</span>
                        <span className="text-amber-400 text-xs">{'★'.repeat(rev.rating || 5)}</span>
                        {rev.order_number && <span className="text-xs text-gray-500">({rev.order_number})</span>}
                      </div>
                      <p className="text-sm text-gray-300">{rev.comment}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteReview(revId)}
                      className="text-red-400 hover:text-red-300 text-xs bg-red-950/60 border border-red-500/30 px-3 py-1.5 rounded-lg"
                    >
                      Hapus
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
