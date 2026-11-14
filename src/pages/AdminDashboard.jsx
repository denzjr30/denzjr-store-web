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
  const [previewProof, setPreviewProof] = useState(null);

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
      const res = await axios.post(`${API_BASE_URL}/api/admin/login`, { pin });
      const jwt = typeof res.data === 'string' ? res.data : (res.data.token || res.data.access_token || pin);
      setToken(jwt);
      localStorage.setItem('admin_token', jwt);
    } catch (err) {
      setAuthError('PIN Admin tidak valid!');
    }
  };

  const getAuthHeaders = () => ({
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`
  });

  const fetchAllAdminData = async () => {
    try {
      const headers = getAuthHeaders();
      const [ordRes, shopRes, revRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/admin/orders`, { headers }),
        axios.get(`${API_BASE_URL}/api/shop/stock`),
        axios.get(`${API_BASE_URL}/api/reviews`)
      ]);

      if (ordRes.status === 'fulfilled') {
        const rawOrders = Array.isArray(ordRes.value.data)
          ? ordRes.value.data
          : (Array.isArray(ordRes.value.data?.orders) ? ordRes.value.data.orders : []);
        setOrders(rawOrders);
      } else if (ordRes.reason?.response?.status === 401 || ordRes.reason?.response?.status === 403) {
        setToken('');
        localStorage.removeItem('admin_token');
        return;
      }

      if (revRes.status === 'fulfilled') {
        const rawReviews = Array.isArray(revRes.value.data)
          ? revRes.value.data
          : (Array.isArray(revRes.value.data?.reviews) ? revRes.value.data.reviews : []);
        setReviews(rawReviews);
      }

      if (shopRes.status === 'fulfilled' && shopRes.value.data) {
        const s = shopRes.value.data;
        const rawStock = s.total_stock;
        setStock(rawStock !== null && rawStock !== undefined ? String(rawStock) : '');
        setIsOpen(s.closed !== undefined ? !s.closed : (s.is_open !== undefined ? s.is_open : true));

        if (s.prices && typeof s.prices === 'object') {
          setPrices({ ...DEFAULT_PRICES, ...s.prices });
        }
      }
    } catch (err) {
      console.error('Gagal memuat data admin:', err);
    }
  };

  const handleToggleShopStatus = async () => {
    const nextOpenState = !isOpen;
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API_BASE_URL}/api/admin/shop-status`,
        { closed: !nextOpenState },
        { headers }
      );
      setIsOpen(nextOpenState);
      alert(nextOpenState ? 'Status toko diubah menjadi BUKA!' : 'Status toko diubah menjadi TUTUP sementara!');
    } catch (err) {
      alert('Gagal mengubah status buka/tutup toko.');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const headers = getAuthHeaders();
      const stockValue = stock === '' ? null : Number(stock);

      await axios.put(
        `${API_BASE_URL}/api/admin/total-stock`,
        { robux: 0, stock: stockValue, total_stock: stockValue },
        { headers }
      );

      await Promise.all(
        NOMINAL_LIST.map((nom) =>
          axios.put(
            `${API_BASE_URL}/api/admin/price`,
            { robux: Number(nom), price: Number(prices[nom] || DEFAULT_PRICES[nom]) },
            { headers }
          )
        )
      );

      alert('Perubahan stok & seluruh harga berhasil disimpan!');
      fetchAllAdminData();
    } catch (err) {
      alert(`Gagal menyimpan: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStatusChange = async (orderNumber, newStatus) => {
    try {
      const headers = getAuthHeaders();
      await axios.patch(
        `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}`,
        { status: newStatus },
        { headers }
      );
      fetchAllAdminData();
    } catch (err) {
      alert('Gagal mengubah status pesanan.');
    }
  };

  const handleDeleteOrder = async (orderNumber) => {
    if (!window.confirm(`Hapus pesanan ${orderNumber} secara permanen?`)) return;
    try {
      const headers = getAuthHeaders();
      await axios.delete(
        `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}`,
        { headers }
      );
      fetchAllAdminData();
    } catch (err) {
      alert('Gagal menghapus pesanan.');
    }
  };

  const handleDeleteReview = async (rev) => {
    const revId = rev.review_id || rev.id || rev._id;
    if (!revId) {
      alert('ID ulasan tidak ditemukan dari server.');
      return;
    }
    if (!window.confirm('Hapus ulasan ini?')) return;
    try {
      const headers = getAuthHeaders();
      await axios.delete(
        `${API_BASE_URL}/api/admin/reviews/${encodeURIComponent(revId)}`,
        { headers }
      );
      fetchAllAdminData();
    } catch (err) {
      alert(`Gagal menghapus ulasan: ${err.response?.data?.detail || err.message}`);
    }
  };

  const formatHistoryDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (Number.isNaN(d.getTime())) return isoStr;
      const day = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
      return `${day}, ${time}`;
    } catch {
      return isoStr;
    }
  };

  const totalOrders = orders.length;
  const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.total ?? o.total_price) || 0), 0);
  const completedRevenue = orders
    .filter(o => o.status === 'Selesai')
    .reduce((sum, o) => sum + (Number(o.total ?? o.total_price) || 0), 0);

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

        <section className="bg-[#121724] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Stok Robux</p>
              <h2 className="text-xl font-extrabold">Atur stok & toko</h2>
            </div>
            <button
              onClick={handleToggleShopStatus}
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
                  <label className="block text-xs font-bold text-cyan-400 mb-1">{nom.toLocaleString('id-ID')} R$</label>
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
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
            >
              {savingSettings ? 'Menyimpan...' : '💾 Simpan Perubahan Stok & Harga'}
            </button>
          </div>
        </section>

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
              const orderCode = ord.order_number || ord.tracking_code || ord.id || ord._id;
              const uName = ord.username || ord.roblox_username || '-';
              const dName = ord.display_name || ord.buyer_name || '-';
              const bPhone = ord.buyer_phone || ord.whatsapp || '';
              const orderTotal = Number(ord.total ?? ord.total_price ?? 0);
              const rawProof = ord.proof_url || ord.payment_proof_url || '';
              const proofSrc = rawProof.startsWith('/') ? `${API_BASE_URL}${rawProof}` : rawProof;

              const itemsList = Array.isArray(ord.items) && ord.items.length > 0
                ? ord.items.map(it => `${Number(it.robux || 0).toLocaleString('id-ID')} R$ • Rp ${Number(it.price || 0).toLocaleString('id-ID')}`)
                : [`${ord.robux_amount || 0} R$ • Rp ${orderTotal.toLocaleString('id-ID')}`];

              const statusHistory = Array.isArray(ord.status_history) && ord.status_history.length > 0
                ? ord.status_history
                : (Array.isArray(ord.history) && ord.history.length > 0
                  ? ord.history
                  : (ord.created_at ? [{ status: ord.status, timestamp: ord.created_at }] : []));

              const cleanPhone = bPhone.replace(/^0/, '62').replace(/[^0-9]/g, '');
              const waUpdateMsg = encodeURIComponent(
                `Halo *${dName !== '-' ? dName : uName}*, update pesanan DenzJr Store kamu:\n` +
                `• No. Order: *${orderCode}*\n` +
                `• Username Roblox: *${uName}*\n` +
                `• Status Terbaru: *${ord.status}*\n\nTerima kasih sudah order!`
              );

              return (
                <div key={orderCode} className="bg-[#121724] border border-gray-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-orange-500">{orderCode}</h3>
                      <p className="text-xs text-gray-400">{uName} • {dName} ({bPhone || '-'})</p>
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        {itemsList.map((label, idx) => (
                          <span key={idx} className="bg-[#1a2234] text-xs px-2.5 py-1 rounded-lg text-gray-300">
                            {label}
                          </span>
                        ))}
                        {proofSrc && (
                          <button
                            type="button"
                            onClick={() => setPreviewProof({ src: proofSrc, orderCode, uName })}
                            className="text-xs text-cyan-400 underline hover:text-cyan-300"
                          >
                            Lihat Bukti TF ↗
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={ord.status}
                        onChange={e => handleStatusChange(orderCode, e.target.value)}
                        className="bg-[#0b0f19] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                      >
                        <option value="Menunggu konfirmasi">Menunggu konfirmasi</option>
                        <option value="Menunggu pembayaran">Menunggu pembayaran</option>
                        <option value="Pembayaran diterima">Pembayaran diterima</option>
                        <option value="Selesai">Selesai</option>
                      </select>

                      <button
                        onClick={() => handleDeleteOrder(orderCode)}
                        className="bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-400 p-2 rounded-xl"
                        title="Hapus Pesanan"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-y border-gray-800 py-3">
                    <span className="text-xs text-gray-400">Total</span>
                    <span className="text-xl font-extrabold text-orange-500">Rp {orderTotal.toLocaleString('id-ID')}</span>
                  </div>

                  {statusHistory.length > 0 && (
                    <div className="space-y-1.5">
                      {statusHistory.map((h, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-2 text-gray-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                            {h.status}
                          </span>
                          <span className="text-gray-500">{formatHistoryDate(h.timestamp || h.time || h.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}

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

        <section className="bg-[#121724] border border-gray-800 rounded-2xl p-6">
          <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Moderasi</p>
          <h2 className="text-xl font-extrabold mb-4">Ulasan pembeli</h2>

          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada ulasan masuk.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev, index) => {
                const revKey = rev.review_id || rev.id || rev._id || index;
                return (
                  <div key={revKey} className="bg-[#0b0f19] border border-gray-800 rounded-xl p-4 flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{rev.name}</span>
                        <span className="text-amber-400 text-xs">{'★'.repeat(rev.rating || 5)}</span>
                        {rev.order_number && <span className="text-xs text-gray-500">({rev.order_number})</span>}
                      </div>
                      <p className="text-sm text-gray-300">{rev.comment}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteReview(rev)}
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

      {previewProof && (
        <div
          onClick={() => setPreviewProof(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121724] border border-gray-800 rounded-2xl max-w-md w-full p-4 space-y-3"
          >
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <div>
                <p className="text-xs text-cyan-400 font-bold">{previewProof.orderCode}</p>
                <p className="text-xs text-gray-400">Bukti transfer • {previewProof.uName}</p>
              </div>
              <button
                onClick={() => setPreviewProof(null)}
                className="text-gray-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>
            <img
              src={previewProof.src}
              alt="Bukti Transfer"
              className="w-full max-h-[70vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
