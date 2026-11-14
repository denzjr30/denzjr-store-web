import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';

const ADMIN_WHATSAPP = "6281958085966";

const STEPS = [
  "Menunggu konfirmasi",
  "Menunggu pembayaran",
  "Pembayaran diterima",
  "Selesai"
];

export default function StatusTracker() {
  const [tab, setTab] = useState('order'); // 'order' | 'history'
  const [orderInput, setOrderInput] = useState('');
  const [waInput, setWaInput] = useState('');
  const [singleOrder, setSingleOrder] = useState(null);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    const code = orderInput.trim();
    if (!code) return;
    setLoading(true);
    setError('');
    setSingleOrder(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/${encodeURIComponent(code)}`);
      setSingleOrder(res.data);
    } catch (err) {
      setError('Nomor order tidak ditemukan. Periksa kembali kode pesananmu.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackHistory = async (e) => {
    e.preventDefault();
    const phone = waInput.trim();
    if (!phone) return;
    setLoading(true);
    setError('');
    setHistoryOrders([]);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/by-phone/${encodeURIComponent(phone)}`);
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.orders) ? res.data.orders : []);
      if (list.length > 0) {
        setHistoryOrders(list);
      } else {
        setError('Belum ada riwayat pesanan dengan nomor WhatsApp tersebut.');
      }
    } catch (err) {
      setError('Gagal memuat riwayat pesanan.');
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status) => {
    const idx = STEPS.findIndex(s => s.toLowerCase() === (status || '').toLowerCase());
    return idx === -1 ? 0 : idx;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const renderOrderItems = (ord) => {
    if (Array.isArray(ord.items) && ord.items.length > 0) {
      return ord.items.map((it, idx) => (
        <span key={idx} className="bg-[#1a2234] text-xs px-2.5 py-1 rounded-md text-gray-300">
          {Number(it.robux || 0).toLocaleString('id-ID')} Robux • Rp {Number(it.price || 0).toLocaleString('id-ID')}
        </span>
      ));
    }
    const fallbackTotal = Number(ord.total ?? ord.total_price ?? 0);
    return (
      <span className="bg-[#1a2234] text-xs px-2.5 py-1 rounded-md text-gray-300">
        {ord.robux_amount || 0} Robux • Rp {fallbackTotal.toLocaleString('id-ID')}
      </span>
    );
  };

  return (
    <div 
      className="min-h-screen text-white font-sans bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/background.jpeg')" }}
    >
      <div className="min-h-screen bg-[#0b0f19]/92 backdrop-blur-[2px] px-4 py-10">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-6">
            <img src="/logo.jpeg" alt="DenzJr Store" className="w-16 h-16 rounded-2xl mx-auto mb-4 border border-orange-500/40 object-cover" />
            <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-1">DenzJr Store / Tracking</p>
            <h1 className="text-3xl font-extrabold mb-5">Cek status pesanan</h1>

            {/* TAB PILIHAN */}
            <div className="inline-flex bg-[#121724] p-1.5 rounded-xl border border-gray-800 gap-1">
              <button
                onClick={() => { setTab('order'); setError(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${tab === 'order' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                📦 Nomor Order
              </button>
              <button
                onClick={() => { setTab('history'); setError(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${tab === 'history' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                🕒 Riwayat Saya
              </button>
            </div>
          </div>

          {tab === 'order' ? (
            <>
              <p className="text-center text-sm text-gray-400 mb-4">Masukkan nomor order dari WhatsApp untuk melihat proses top up kamu.</p>
              <form onSubmit={handleTrackOrder} className="flex gap-2 mb-6">
                <input
                  type="text"
                  required
                  value={orderInput}
                  onChange={e => setOrderInput(e.target.value)}
                  placeholder="Contoh: DJS-20261114-6660"
                  className="flex-1 bg-[#121724] border border-gray-800 rounded-xl px-4 py-3 text-white font-mono focus:border-orange-500 outline-none"
                />
                <button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-xl font-bold transition">
                  {loading ? '...' : 'Cek Status'}
                </button>
              </form>

              {error && <p className="text-center text-red-400 text-sm mb-4">{error}</p>}

              {singleOrder && (() => {
                const orderCode = singleOrder.order_number || singleOrder.tracking_code;
                const uName = singleOrder.username || singleOrder.roblox_username || '-';
                const orderTotal = Number(singleOrder.total ?? singleOrder.total_price ?? 0);
                const historyList = Array.isArray(singleOrder.status_history) && singleOrder.status_history.length > 0
                  ? singleOrder.status_history
                  : (Array.isArray(singleOrder.history) ? singleOrder.history : []);

                return (
                  <div className="bg-[#121724] border border-gray-800 rounded-2xl p-5 space-y-5">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800">
                        <p className="text-[11px] text-gray-400">No. Order</p>
                        <p className="font-bold text-orange-400 text-sm truncate">{orderCode}</p>
                      </div>
                      <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800">
                        <p className="text-[11px] text-gray-400">Username</p>
                        <p className="font-bold text-white text-sm truncate">{uName}</p>
                      </div>
                      <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800">
                        <p className="text-[11px] text-gray-400">Total</p>
                        <p className="font-bold text-orange-400 text-sm">Rp {orderTotal.toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {renderOrderItems(singleOrder)}
                    </div>

                    {/* STEP PROGRESS 4 TAHAP */}
                    <div className="grid grid-cols-4 gap-2 text-center pt-2">
                      {STEPS.map((step, i) => {
                        const activeIdx = getStepIndex(singleOrder.status);
                        const isDone = i <= activeIdx;
                        return (
                          <div key={step} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${isDone ? 'bg-emerald-500 text-gray-950' : 'bg-gray-800 text-gray-500'}`}>
                              {isDone ? '✓' : i + 1}
                            </div>
                            <span className={`text-[10px] leading-tight ${isDone ? 'text-gray-200' : 'text-gray-500'}`}>{step}</span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-center text-sm text-gray-300">
                      Status saat ini: <strong className="text-emerald-400">{singleOrder.status}</strong>
                    </p>

                    {/* RIWAYAT WAKTU */}
                    {historyList.length > 0 && (
                      <div className="border-t border-gray-800 pt-4">
                        <p className="text-xs font-bold text-gray-400 mb-2">Riwayat pesanan</p>
                        <div className="space-y-2">
                          {historyList.map((h, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-emerald-400">● <span className="text-gray-200">{h.status}</span></span>
                              <span className="text-gray-500">{formatDate(h.timestamp || h.time || h.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <a
                      href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(`Halo admin, saya ingin menanyakan pesanan ${orderCode}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full text-center bg-[#0e2923] hover:bg-[#143a31] border border-emerald-500/40 text-emerald-400 font-bold py-3 rounded-xl text-sm transition"
                    >
                      💬 Tanya admin via WhatsApp
                    </a>
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              <p className="text-center text-sm text-gray-400 mb-4">Masukkan nomor WhatsApp yang kamu pakai saat checkout untuk melihat semua riwayat pesananmu.</p>
              <form onSubmit={handleTrackHistory} className="flex gap-2 mb-6">
                <input
                  type="text"
                  required
                  value={waInput}
                  onChange={e => setWaInput(e.target.value)}
                  placeholder="Contoh: 081958085966"
                  className="flex-1 bg-[#121724] border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                />
                <button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-xl font-bold transition">
                  {loading ? '...' : 'Lihat Riwayat'}
                </button>
              </form>

              {error && <p className="text-center text-red-400 text-sm mb-4">{error}</p>}

              <div className="space-y-3">
                {historyOrders.map((ord) => {
                  const orderCode = ord.order_number || ord.tracking_code || ord.id || ord._id;
                  const orderTotal = Number(ord.total ?? ord.total_price ?? 0);
                  return (
                    <div key={orderCode} className="bg-[#121724] border border-gray-800 rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-orange-400">{orderCode}</p>
                          <p className="text-xs text-gray-400">{formatDate(ord.created_at)}</p>
                        </div>
                        <span className="bg-[#0e2923] border border-emerald-500/40 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                          {ord.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {renderOrderItems(ord)}
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                        <span className="text-xs text-gray-400">Total</span>
                        <span className="font-bold text-orange-500">Rp {orderTotal.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="text-center mt-8">
            <Link to="/" className="text-cyan-400 text-sm hover:underline">← Kembali ke store</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
