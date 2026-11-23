import React, { useState, useEffect } from 'react';
import { gasStoreApi } from '../gasApi';
import { Link } from 'react-router-dom';

const NOMINAL_LIST = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 1000, 2000, 3000, 4000, 5000];

const DEFAULT_PRICES = {
  10: 2000, 20: 3500, 30: 5000, 40: 6500, 50: 8000,
  60: 9500, 70: 11000, 80: 12500, 90: 14000, 100: 15500,
  200: 31000, 300: 46500, 400: 62000, 500: 77500, 1000: 155000,
  2000: 310000, 3000: 465000, 4000: 620000, 5000: 750000
};

export default function AdminDashboard() {
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(localStorage.getItem('admin_token_gas') || '');
  const [authError, setAuthError] = useState('');

  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [roundsData, setRoundsData] = useState([]);
  const [currentRound, setCurrentRound] = useState(2);
  const [roundCapital, setRoundCapital] = useState('615000');

  const [stock, setStock] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewProof, setPreviewProof] = useState(null);

  const [showNewRoundModal, setShowNewRoundModal] = useState(false);
  const [nextRoundCapital, setNextRoundCapital] = useState('615000');
  const [nextRoundStock, setNextRoundStock] = useState('5000');
  const [startingNewRound, setStartingNewRound] = useState(false);

  const [statusFilter, setStatusFilter] = useState('Semua');
  const [roundFilter, setRoundFilter] = useState('Semua');
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
      const res = await gasStoreApi.adminLogin(pin);
      if (res.error || !res.token) {
        setAuthError(res.error || 'PIN Admin tidak valid!');
        return;
      }
      setToken(res.token);
      localStorage.setItem('admin_token_gas', res.token);
    } catch (err) {
      setAuthError('Gagal terhubung ke server Google Apps Script!');
    }
  };

  const fetchAllAdminData = async () => {
    try {
      const [ordRes, shopRes, revRes, rndRes] = await Promise.allSettled([
        gasStoreApi.adminGetOrders(token),
        gasStoreApi.getStock(),
        gasStoreApi.getReviews(),
        gasStoreApi.adminGetRounds(token)
      ]);

      if (ordRes.status === 'fulfilled' && ordRes.value) {
        if (ordRes.value.error === 'Unauthorized') {
          setToken('');
          localStorage.removeItem('admin_token_gas');
          return;
        }
        const rawOrders = Array.isArray(ordRes.value)
          ? ordRes.value
          : (Array.isArray(ordRes.value.orders) ? ordRes.value.orders : []);
        setOrders(rawOrders);
      }

      if (revRes.status === 'fulfilled' && revRes.value) {
        const rawReviews = Array.isArray(revRes.value)
          ? revRes.value
          : (Array.isArray(revRes.value.reviews) ? revRes.value.reviews : []);
        setReviews(rawReviews);
      }

      if (rndRes.status === 'fulfilled' && rndRes.value && Array.isArray(rndRes.value.rounds)) {
        setRoundsData(rndRes.value.rounds);
      }

      if (shopRes.status === 'fulfilled' && shopRes.value) {
        const s = shopRes.value;
        const rawStock = s.total_stock;
        setStock(rawStock !== null && rawStock !== undefined && rawStock !== '' ? String(rawStock) : '');
        setIsOpen(s.closed !== undefined ? !s.closed : (s.is_open !== undefined ? s.is_open : true));
        if (s.current_round) setCurrentRound(Number(s.current_round));
        if (s.round_capital !== undefined) setRoundCapital(String(s.round_capital));

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
      const res = await gasStoreApi.adminUpdateConfig(token, {
        closed: !nextOpenState
      });
      if (res.error) throw new Error(res.error);
      setIsOpen(nextOpenState);
      alert(nextOpenState ? 'Status toko diubah menjadi BUKA!' : 'Status toko diubah menjadi TUTUP sementara!');
    } catch (err) {
      alert('Gagal mengubah status buka/tutup toko.');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const stockValue = stock === '' ? null : Number(stock);
      const formattedPrices = {};
      NOMINAL_LIST.forEach((nom) => {
        formattedPrices[String(nom)] = Number(prices[nom] || DEFAULT_PRICES[nom]);
      });

      const res = await gasStoreApi.adminUpdateConfig(token, {
        closed: !isOpen,
        totalStock: stockValue,
        roundCapital: Number(roundCapital || 0),
        prices: formattedPrices
      });
      if (res.error) throw new Error(res.error);

      alert('Perubahan stok, modal putaran & seluruh harga berhasil disimpan ke Google Sheets!');
      fetchAllAdminData();
    } catch (err) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStartNewRound = async (e) => {
    e.preventDefault();
    setStartingNewRound(true);
    try {
      const res = await gasStoreApi.adminStartNewRound(token, {
        newCapital: Number(nextRoundCapital || 0),
        newStock: nextRoundStock === '' ? 5000 : Number(nextRoundStock)
      });
      if (res.error) throw new Error(res.error);
      setShowNewRoundModal(false);
      alert(`Berhasil memulai Putaran ke-${res.new_round}!`);
      fetchAllAdminData();
    } catch (err) {
      alert(`Gagal memulai putaran baru: ${err.message}`);
    } finally {
      setStartingNewRound(false);
    }
  };

  const handleStatusChange = async (orderNumber, newStatus) => {
    try {
      const res = await gasStoreApi.adminUpdateStatus(token, orderNumber, newStatus);
      if (res.error) throw new Error(res.error);
      fetchAllAdminData();
    } catch (err) {
      alert('Gagal mengubah status pesanan.');
    }
  };

  const handleDeleteOrder = async (orderNumber) => {
    if (!window.confirm(`Hapus pesanan ${orderNumber} secara permanen?`)) return;
    try {
      const res = await gasStoreApi.adminDeleteOrder(token, orderNumber);
      if (res.error) throw new Error(res.error);
      fetchAllAdminData();
    } catch (err) {
      alert('Gagal menghapus pesanan.');
    }
  };

  const handleDeleteReview = async (rev) => {
    const revId = rev.review_id || rev.id || rev._id;
    if (!revId) {
      alert('ID ulasan tidak ditemukan.');
      return;
    }
    if (!window.confirm('Hapus ulasan ini?')) return;
    try {
      const res = await gasStoreApi.adminDeleteReview(token, revId);
      if (res.error) throw new Error(res.error);
      fetchAllAdminData();
    } catch (err) {
      alert(`Gagal menghapus ulasan: ${err.message}`);
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

  // Perhitungan Putaran Aktif
  const activeRoundOrders = orders.filter(o => Number(o.round || currentRound) === currentRound);
  const activeCompletedOrders = activeRoundOrders.filter(o => o.status === 'Selesai');
  const activeRoundRevenue = activeCompletedOrders.reduce((sum, o) => sum + (Number(o.total ?? o.total_price) || 0), 0);
  const activeRoundRobuxSold = activeCompletedOrders.reduce((sum, o) => sum + (Number(o.total_robux) || 0), 0);
  const capitalNum = Number(roundCapital || 0);
  const activeRoundProfit = activeRoundRevenue - capitalNum;

  // Perhitungan Akumulasi Seluruh Putaran (termasuk arsip Putaran 1 di Rekap_Putaran)
  const pastRounds = roundsData.filter(r => r.round < currentRound);
  const pastRevenue = pastRounds.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const pastProfit = pastRounds.reduce((sum, r) => sum + Number(r.profit || 0), 0);
  const allTimeRevenue = pastRevenue + activeRoundRevenue;
  const allTimeProfit = pastProfit + activeRoundProfit;

  const countByStatus = (st) => orders.filter(o => o.status === st).length;

  const availableRounds = Array.from(new Set([
    ...roundsData.map(r => r.round),
    ...orders.map(o => Number(o.round || currentRound)),
    currentRound
  ])).sort((a, b) => b - a);

  const filteredOrders = orders
    .filter(o => statusFilter === 'Semua' || o.status === statusFilter)
    .filter(o => roundFilter === 'Semua' || String(o.round || currentRound) === String(roundFilter))
    .sort((a, b) => sortOrder === 'newest' ? 0 : -1);

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
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">DenzJr Store / Admin</p>
              <span className="bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Putaran ke-{currentRound}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold">Dashboard & Siklus Restock</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="bg-[#121724] border border-gray-800 px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white">
              Lihat Toko
            </Link>
            <button onClick={fetchAllAdminData} className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-xl text-sm font-bold transition">
              ↻ Segarkan
            </button>
            <button onClick={() => { setToken(''); localStorage.removeItem('admin_token_gas'); }} className="bg-red-950/60 border border-red-500/40 text-red-400 px-3 py-2 rounded-xl text-sm">
              Keluar
            </button>
          </div>
        </header>

        {/* Kartu Ringkasan Keuangan Putaran Aktif & Total Akumulasi */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-cyan-400 font-bold uppercase mb-1">Omzet Putaran {currentRound}</p>
            <p className="text-2xl font-extrabold text-white">Rp {activeRoundRevenue.toLocaleString('id-ID')}</p>
            <p className="text-xs text-gray-400 mt-1">{activeRoundRobuxSold.toLocaleString('id-ID')} R$ terjual ({activeCompletedOrders.length} selesai)</p>
          </div>

          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Modal Putaran {currentRound}</p>
            <p className="text-2xl font-extrabold text-orange-400">Rp {capitalNum.toLocaleString('id-ID')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {activeRoundRevenue >= capitalNum
                ? '✅ Modal sudah balik (BEP)'
                : `Kurang Rp ${(capitalNum - activeRoundRevenue).toLocaleString('id-ID')} untuk BEP`}
            </p>
          </div>

          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Laba Bersih Putaran {currentRound}</p>
            <p className={`text-2xl font-extrabold ${activeRoundProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {activeRoundProfit >= 0 ? '+' : ''}Rp {activeRoundProfit.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-gray-400 mt-1">Omzet kotor dikurangi modal</p>
          </div>

          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-amber-400 font-bold uppercase mb-1">Total Semua Putaran</p>
            <p className="text-2xl font-extrabold text-emerald-400">Rp {allTimeRevenue.toLocaleString('id-ID')}</p>
            <p className="text-xs text-gray-300 mt-1">
              Total Laba: <span className={allTimeProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                Rp {allTimeProfit.toLocaleString('id-ID')}
              </span>
            </p>
          </div>
        </section>

        {/* Tabel Rekap Riwayat Per Putaran */}
        {roundsData.length > 0 && (
          <section className="bg-[#121724] border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Laporan Siklus</p>
                <h2 className="text-xl font-extrabold">Rekap Per Putaran Restock</h2>
              </div>
              <button
                onClick={() => {
                  setNextRoundCapital(roundCapital || '615000');
                  setNextRoundStock('5000');
                  setShowNewRoundModal(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition"
              >
                🔄 Mulai Putaran Baru (Restock)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase">
                    <th className="py-2.5 px-3">Putaran</th>
                    <th className="py-2.5 px-3">Modal Restock</th>
                    <th className="py-2.5 px-3">Robux Terjual</th>
                    <th className="py-2.5 px-3">Omzet Kotor</th>
                    <th className="py-2.5 px-3">Laba Bersih</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {roundsData.map((r) => (
                    <tr key={r.round} className="hover:bg-[#161d2e]">
                      <td className="py-3 px-3 font-bold text-orange-400">Putaran {r.round}</td>
                      <td className="py-3 px-3 text-gray-300">Rp {Number(r.modal).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-3 text-cyan-400 font-semibold">{Number(r.robux_sold).toLocaleString('id-ID')} R$</td>
                      <td className="py-3 px-3 font-bold text-white">Rp {Number(r.revenue).toLocaleString('id-ID')}</td>
                      <td className={`py-3 px-3 font-extrabold ${Number(r.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {Number(r.profit) >= 0 ? '+' : ''}Rp {Number(r.profit).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${r.status === 'Berjalan' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Pengaturan Stok, Modal Putaran & Harga */}
        <section className="bg-[#121724] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Stok & Modal Aktif</p>
              <h2 className="text-xl font-extrabold">Atur stok, modal putaran & toko</h2>
            </div>
            <button
              onClick={handleToggleShopStatus}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${isOpen ? 'bg-[#0e2923] border-emerald-500/40 text-emerald-400' : 'bg-red-950 border-red-500/40 text-red-400'}`}
            >
              {isOpen ? '🟢 Toko BUKA — tutup sementara' : '🔴 Toko TUTUP — buka kembali'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Total stok Robux aktif (Putaran {currentRound})</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                placeholder="Contoh: 5000"
                className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-white font-bold focus:border-orange-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1.5">Berkurang otomatis saat pesanan selesai.</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Modal restock Putaran {currentRound} (Rp)</label>
              <input
                type="number"
                value={roundCapital}
                onChange={e => setRoundCapital(e.target.value)}
                placeholder="Contoh: 615000"
                className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-orange-400 font-bold focus:border-orange-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1.5">Dipakai menghitung BEP & Laba Bersih putaran ini.</p>
            </div>
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
              {savingSettings ? 'Menyimpan...' : '💾 Simpan Perubahan Stok, Modal & Harga'}
            </button>
          </div>
        </section>

        {/* Daftar Pesanan Masuk */}
        <section className="space-y-4">
          <div className="bg-[#121724] border border-gray-800 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3">
            <p className="text-xs text-gray-400 uppercase font-bold">Ringkasan Status</p>
            <p className="text-xs text-gray-300">
              Menunggu konfirmasi ({countByStatus('Menunggu konfirmasi')}) • Menunggu pembayaran ({countByStatus('Menunggu pembayaran')}) • Pembayaran diterima ({countByStatus('Pembayaran diterima')}) • Selesai ({countByStatus('Selesai')})
            </p>
          </div>

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

            <div className="flex items-center gap-2">
              <select
                value={roundFilter}
                onChange={e => setRoundFilter(e.target.value)}
                className="bg-[#121724] border border-gray-800 rounded-xl px-3 py-2 text-xs text-cyan-400 font-bold outline-none"
              >
                <option value="Semua">Semua Putaran</option>
                {availableRounds.map(rNum => (
                  <option key={rNum} value={rNum}>Putaran {rNum}</option>
                ))}
              </select>

              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="bg-[#121724] border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none"
              >
                <option value="newest">Terbaru dulu</option>
                <option value="oldest">Terlama dulu</option>
              </select>
            </div>
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
              const rawPhone = ord.buyer_phone !== undefined && ord.buyer_phone !== null ? String(ord.buyer_phone).trim() : '';
              const bPhone = rawPhone && !rawPhone.startsWith('0') && !rawPhone.startsWith('62') ? `0${rawPhone}` : rawPhone;
              const orderTotal = Number(ord.total ?? ord.total_price ?? 0);
              const proofSrc = ord.proof_url || ord.payment_proof_url || '';
              const orderRound = ord.round || currentRound;

              const itemsList = Array.isArray(ord.items) && ord.items.length > 0
                ? ord.items.map(it => `${Number(it.robux || 0).toLocaleString('id-ID')} R$ • Rp ${Number(it.price || 0).toLocaleString('id-ID')}`)
                : [`${ord.robux_amount || 0} R$ • Rp ${orderTotal.toLocaleString('id-ID')}`];

              const statusHistory = Array.isArray(ord.status_history) && ord.status_history.length > 0
                ? ord.status_history
                : (Array.isArray(ord.history) && ord.history.length > 0
                  ? ord.history
                  : (ord.created_at ? [{ status: ord.status, timestamp: ord.created_at }] : []));

              const cleanPhone = String(bPhone).replace(/^0/, '62').replace(/[^0-9]/g, '');
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
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-orange-500">{orderCode}</h3>
                        <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-bold px-2 py-0.5 rounded-md">
                          Putaran {orderRound}
                        </span>
                      </div>
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

        {/* Moderasi Ulasan */}
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

      {/* Modal Mulai Putaran Baru (Restock) */}
      {showNewRoundModal && (
        <div
          onClick={() => setShowNewRoundModal(false)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121724] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div>
              <p className="text-xs text-cyan-400 font-bold uppercase">Siklus Restock Baru</p>
              <h3 className="text-xl font-extrabold">Mulai Putaran ke-{currentRound + 1}</h3>
              <p className="text-xs text-gray-400 mt-1">
                Putaran {currentRound} akan ditandai <strong>Selesai</strong> di rekap laporan, dan order berikutnya akan otomatis masuk ke Putaran {currentRound + 1}.
              </p>
            </div>

            <form onSubmit={handleStartNewRound} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Modal Restock Putaran {currentRound + 1} (Rp)</label>
                <input
                  type="number"
                  required
                  value={nextRoundCapital}
                  onChange={(e) => setNextRoundCapital(e.target.value)}
                  placeholder="Contoh: 615000"
                  className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-white font-bold focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">Stok Robux Baru (R$)</label>
                <input
                  type="number"
                  required
                  value={nextRoundStock}
                  onChange={(e) => setNextRoundStock(e.target.value)}
                  placeholder="Contoh: 5000"
                  className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-cyan-400 font-bold focus:border-orange-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRoundModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={startingNewRound}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition"
                >
                  {startingNewRound ? 'Memproses...' : `Mulai Putaran ${currentRound + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Bukti Transfer */}
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
            <div className="text-center">
              <a
                href={previewProof.src}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 underline hover:text-cyan-300"
              >
                Buka gambar ukuran penuh di Google Drive ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
