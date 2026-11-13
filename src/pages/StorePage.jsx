import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';

const ADMIN_WHATSAPP = "6281958085966";

const DEFAULT_PACKAGES = [
  { robux: 10, price: 2000 },
  { robux: 20, price: 3500 },
  { robux: 30, price: 5000 },
  { robux: 40, price: 6500 },
  { robux: 50, price: 8000 },
  { robux: 60, price: 9500 },
  { robux: 70, price: 11000 },
  { robux: 80, price: 12000 },
  { robux: 90, price: 13500 },
  { robux: 100, price: 15000 },
  { robux: 200, price: 30000 },
  { robux: 500, price: 77500 },
];

export default function StorePage() {
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [totalStock, setTotalStock] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showQris, setShowQris] = useState(true);

  // Data Akun Roblox (Bagian 01 & Checkout)
  const [robloxUsername, setRobloxUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Ulasan
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [reviewName, setReviewName] = useState('');
  const [reviewOrderId, setReviewOrderId] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [sendingReview, setSendingReview] = useState(false);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const [settingsRes, reviewsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/settings`),
        axios.get(`${API_BASE_URL}/api/reviews`)
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        const data = settingsRes.value.data;
        if (data.stock !== undefined) setTotalStock(data.stock);
        if (data.is_open !== undefined) setIsOpen(data.is_open);
        if (data.prices && Object.keys(data.prices).length > 0) {
          const updated = DEFAULT_PACKAGES.map(pkg => ({
            robux: pkg.robux,
            price: data.prices[pkg.robux] ? Number(data.prices[pkg.robux]) : pkg.price
          }));
          setPackages(updated);
        }
      }

      if (reviewsRes.status === 'fulfilled' && Array.isArray(reviewsRes.value.data)) {
        setReviews(reviewsRes.value.data);
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan toko", err);
    }
  };

  const addToCart = (pkg) => {
    if (!isOpen) return alert("Maaf, toko sedang tutup sementara.");
    const currentRobuxInCart = cart.reduce((sum, item) => sum + item.robux, 0);
    if (totalStock !== null && totalStock !== "" && currentRobuxInCart + pkg.robux > Number(totalStock)) {
      return alert(`Stok Robux tidak mencukupi (tersedia ${totalStock} R$).`);
    }
    setCart([...cart, { ...pkg, cartId: Date.now() + Math.random() }]);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const totalRobux = cart.reduce((sum, item) => sum + item.robux, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Keranjang masih kosong!");
    if (!robloxUsername.trim()) return alert("Masukkan username Roblox kamu terlebih dahulu!");
    if (!paymentProof) return alert("Pilih gambar bukti transfer terlebih dahulu!");

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('roblox_username', robloxUsername);
      formData.append('display_name', displayName || robloxUsername);
      formData.append('buyer_name', displayName || robloxUsername);
      formData.append('whatsapp', whatsapp);
      formData.append('robux_amount', totalRobux);
      formData.append('total_price', totalPrice);
      formData.append('items', JSON.stringify(cart));
      formData.append('payment_proof', paymentProof);

      const res = await axios.post(`${API_BASE_URL}/api/orders`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const orderCode = res.data.order_number || res.data.tracking_code || `DJS-${Math.floor(1000000 + Math.random() * 9000000)}`;
      let proofUrl = res.data.payment_proof_url || "";
      if (proofUrl && proofUrl.startsWith('/')) {
        proofUrl = `${API_BASE_URL}${proofUrl}`;
      }

      const detailItemsText = cart
        .map(item => `• ${item.robux} Robux - Rp ${item.price.toLocaleString('id-ID')}`)
        .join('\n');

      const waMessage = 
        `Halo Admin DenzJr Store! 👋 Saya mau pesan & bayar Robux via QRIS dengan detail berikut:\n\n` +
        `📋 INFORMASI PESANAN\n` +
        `------------------------------------\n` +
        `• No. Order : ${orderCode}\n` +
        `• Username : ${robloxUsername}\n` +
        `• Display Name : ${displayName || '-'}\n\n` +
        `🛒 DETAIL ITEM\n` +
        `------------------------------------\n` +
        `${detailItemsText}\n\n` +
        `💰 TOTAL PEMBAYARAN : Rp ${totalPrice.toLocaleString('id-ID')}\n` +
        `------------------------------------\n\n` +
        (proofUrl ? `✅ Bukti transfer: ${proofUrl}\n\n` : '') +
        `Mohon diproses ya Admin, terima kasih! 🙏`;

      setCart([]);
      setIsCartOpen(false);
      setPaymentProof(null);
      fetchStoreData();

      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(waMessage)}`, '_blank');
    } catch (err) {
      alert("Terjadi kesalahan saat mengirim pesanan. Pastikan koneksi lancar dan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return alert("Tuliskan pengalaman top up kamu terlebih dahulu.");
    setSendingReview(true);
    try {
      await axios.post(`${API_BASE_URL}/api/reviews`, {
        rating,
        name: reviewName.trim() || "Pembeli Anonim",
        order_number: reviewOrderId.trim(),
        comment: reviewComment.trim()
      });
      setReviewName('');
      setReviewOrderId('');
      setReviewComment('');
      setRating(5);
      fetchStoreData();
      alert("Terima kasih! Ulasan kamu berhasil dikirim.");
    } catch (err) {
      alert("Gagal mengirim ulasan.");
    } finally {
      setSendingReview(false);
    }
  };

  return (
    <div 
      className="min-h-screen text-white font-sans bg-cover bg-center bg-fixed pb-28 relative"
      style={{ backgroundImage: "url('/background.jpeg')" }}
    >
      {/* Lapisan gelap tanpa backdrop-filter agar elemen fixed selalu melayang di layar */}
      <div className="min-h-screen bg-[#0b0f19]/90">
        {/* HEADER */}
        <header className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap justify-between items-center gap-4 border-b border-gray-800/80">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="DenzJr Store" className="w-11 h-11 rounded-xl object-cover border border-orange-500/50 shadow-md" />
            <div>
              <h1 className="text-xl font-extrabold tracking-wide">
                DENZJR <span className="text-orange-500">STORE</span>
              </h1>
              <p className="text-[11px] tracking-widest text-gray-400 uppercase">Roblox Top Up Center</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/status" className="bg-[#151b2b] hover:bg-[#1e263d] border border-gray-700/80 px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2">
              <span>📦</span> Cek Status
            </Link>
            <a 
              href={`https://wa.me/${ADMIN_WHATSAPP}`} 
              target="_blank" 
              rel="noreferrer"
              className="bg-[#151b2b] hover:bg-[#1e263d] border border-gray-700/80 px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 text-emerald-400"
            >
              <span>💬</span> Hubungi Admin
            </a>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 pt-6">
          {/* HERO BANNER */}
          <div className="bg-gradient-to-br from-[#121929]/95 via-[#0f1624]/95 to-[#0b1f29]/95 border border-gray-800 rounded-2xl p-6 md:p-10 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="max-w-lg">
              <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-2">✨ Top Up Robux Aman & Cepat</p>
              <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
                Level up your <span className="text-orange-500">Roblox world.</span>
              </h2>
              <p className="text-gray-300 text-sm mb-5 leading-relaxed">
                Isi username, pilih nominal Robux, dan biarkan kami mengurus sisanya. Simple, cepat, dan terpercaya.
              </p>
              <div className="flex items-center gap-5 text-xs font-semibold text-gray-300">
                <span className="flex items-center gap-1.5 text-orange-400">⚡ <span className="text-gray-300">Proses cepat</span></span>
                <span className="flex items-center gap-1.5 text-emerald-400">🛡️ <span className="text-gray-300">100% aman</span></span>
              </div>
            </div>

            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border border-cyan-500/30 bg-[#0d1422] flex items-center justify-center relative shadow-[0_0_40px_rgba(6,182,212,0.15)]">
              <div className="w-24 h-24 rounded-full border border-orange-500/30 flex items-center justify-center">
                <span className="text-3xl font-black text-white -rotate-12">R$</span>
              </div>
            </div>
          </div>

          {/* 01 DATA AKUN ROBLOX & CATATAN PENTING */}
          <div className="bg-[#121724]/95 border border-gray-800 rounded-2xl p-6 mb-5">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-500/40 text-orange-500 font-bold text-xs flex items-center justify-center">
                01
              </span>
              <div>
                <h3 className="font-extrabold text-lg">Data akun Roblox</h3>
                <p className="text-xs text-gray-400">Pastikan username kamu sudah benar ya.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Username Roblox *</label>
                <input
                  type="text"
                  value={robloxUsername}
                  onChange={e => setRobloxUsername(e.target.value)}
                  placeholder="Contoh: RobloxPlayer123"
                  className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Display Name <span className="text-gray-500">(opsional)</span></label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Contoh: DenzJr"
                  className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">No. WhatsApp kamu <span className="text-gray-500">(untuk update status)</span></label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full md:w-1/2 bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
              />
            </div>

            <div className="bg-[#231915] border border-orange-500/30 rounded-xl p-4">
              <p className="text-orange-400 font-bold text-xs mb-1">⚡ Catatan penting</p>
              <p className="text-gray-300 text-xs">Pastikan username sesuai huruf besar/kecil. Jangan logout saat proses top up berlangsung.</p>
            </div>
          </div>

          {/* STATUS STOK & TOKO */}
          {!isOpen ? (
            <div className="bg-red-950/90 border border-red-500/50 rounded-xl p-4 mb-8 text-center">
              <span className="text-red-400 font-bold">🔴 Toko Sedang Tutup Sementara — Pemesanan akan dibuka kembali segera.</span>
            </div>
          ) : (
            <div className="bg-[#0e2923]/90 border border-emerald-500/40 rounded-xl p-3.5 mb-8 text-center">
              <span className="text-emerald-400 font-semibold text-sm">
                📦 Stok Robux tersedia: <strong className="text-white">{totalStock !== null && totalStock !== "" ? `${totalStock} R$` : 'Tersedia'}</strong>
              </span>
            </div>
          )}

          {/* JUDUL KATALOG */}
          <div className="flex flex-wrap justify-between items-end mb-5 gap-2">
            <div>
              <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-1">Pilih Sesuai Kebutuhanmu</p>
              <h2 className="text-3xl font-extrabold">Nominal <span className="text-orange-500">Robux</span></h2>
            </div>
            <p className="text-xs text-gray-400">Harga transparan • Tanpa biaya tersembunyi</p>
          </div>

          {/* GRID NOMINAL ROBUX */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-14">
            {packages.map((pkg) => (
              <div key={pkg.robux} className="bg-[#121724]/95 border border-gray-800 hover:border-orange-500/50 rounded-2xl p-5 transition flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-[#1d2436] text-gray-300 text-xs font-bold px-2.5 py-1 rounded-md mb-3">R$</span>
                  <div className="text-xl font-extrabold text-white">
                    {pkg.robux} <span className="text-sm font-normal text-gray-400">Robux</span>
                  </div>
                  <div className="text-lg font-bold text-gray-200 mt-1 mb-4">
                    Rp {pkg.price.toLocaleString('id-ID')}
                  </div>
                </div>
                <button
                  disabled={!isOpen || (totalStock !== null && totalStock !== "" && Number(totalStock) < pkg.robux)}
                  onClick={() => addToCart(pkg)}
                  className="w-full bg-[#1a2234] hover:bg-orange-500 hover:text-white disabled:opacity-40 disabled:hover:bg-[#1a2234] text-gray-200 font-semibold text-sm py-2.5 rounded-xl transition"
                >
                  + Keranjang &gt;
                </button>
              </div>
            ))}
          </div>

          {/* ULASAN PEMBELI */}
          <section className="mb-10">
            <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-1">Kata Mereka</p>
            <h2 className="text-3xl font-extrabold mb-5">Ulasan <span className="text-orange-500">Pembeli</span></h2>

            <form onSubmit={handleSendReview} className="bg-[#121724]/95 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-lg mb-3">Beri ulasan</h3>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition ${star <= rating ? 'text-amber-400' : 'text-gray-600'}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={reviewName}
                  onChange={e => setReviewName(e.target.value)}
                  placeholder="Nama kamu (opsional)"
                  className="bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
                />
                <input
                  type="text"
                  value={reviewOrderId}
                  onChange={e => setReviewOrderId(e.target.value)}
                  placeholder="No. Order (opsional)"
                  className="bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>

              <textarea
                rows="3"
                required
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Ceritakan pengalaman top up kamu..."
                className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white mb-4 focus:border-orange-500 outline-none"
              />

              <button
                type="submit"
                disabled={sendingReview}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition"
              >
                {sendingReview ? 'Mengirim Ulasan...' : 'Kirim Ulasan'}
              </button>
            </form>

            {reviews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((rev) => (
                  <div key={rev.id || rev._id} className="bg-[#121724]/95 border border-gray-800 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-white">{rev.name}</span>
                      <span className="text-amber-400 text-sm">{'★'.repeat(rev.rating || 5)}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="border-t border-gray-800 pt-6 flex flex-wrap justify-between text-xs text-gray-500">
            <span>© 2026 DenzJr Store</span>
            <span>Top up mudah, main lebih seru.</span>
          </footer>
        </main>
      </div>

      {/* FLOATING CART BAR (SELALU MELAYANG DI LAYAR) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d121d]/95 border-t border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.6)] z-40">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400">Keranjang kamu</p>
            {cart.length === 0 ? (
              <p className="text-sm font-bold text-orange-500">Masih kosong</p>
            ) : (
              <p className="text-sm font-bold text-white">
                {totalRobux} Robux • <span className="text-orange-400">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-lg"
          >
            <span>🛒 Buka Keranjang</span>
            <span className="bg-black/30 px-2 py-0.5 rounded-full text-xs">{cart.length}</span>
          </button>
        </div>
      </div>

      {/* MODAL / DRAWER KERANJANG & CHECKOUT QRIS */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#121724] border border-gray-800 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 relative">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <h3 className="text-lg font-extrabold">Keranjang & Pembayaran</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white text-xl font-bold">✕</button>
            </div>

            {cart.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Belum ada paket Robux yang dipilih.</p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {cart.map((item) => (
                    <div key={item.cartId} className="bg-[#192032] border border-gray-800 rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-orange-400">{item.robux} Robux</p>
                        <p className="text-xs text-gray-300">Rp {item.price.toLocaleString('id-ID')}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 hover:text-red-300 text-sm px-2">🗑️</button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center py-3 border-y border-gray-800 mb-4">
                  <span className="font-bold text-gray-300">Total pembayaran</span>
                  <span className="text-2xl font-extrabold text-orange-500">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>

                <div className="bg-[#151e33] border border-blue-500/30 rounded-xl p-3 text-xs text-gray-300 mb-3">
                  No. Order kamu: <span className="text-cyan-400 font-bold">Dibuat otomatis saat kirim bukti</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQris(!showQris)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl mb-3 transition text-sm"
                >
                  {showQris ? 'Sembunyikan QRIS' : 'Tampilkan QRIS'}
                </button>

                {showQris && (
                  <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-4 mb-4 text-center">
                    <p className="text-cyan-400 font-bold text-sm mb-3">Scan QRIS DenzJr Store</p>
                    <img src="/qris.jpeg" alt="QRIS DenzJr Store" className="w-56 mx-auto rounded-lg bg-white p-1.5 mb-3" />
                    <a
                      href="/qris.jpeg"
                      download="QRIS-DenzJr-Store.jpeg"
                      className="block w-full bg-[#1a2234] hover:bg-[#242f47] text-gray-200 text-xs font-bold py-2.5 rounded-lg transition"
                    >
                      ⬇ Download QRIS
                    </a>
                  </div>
                )}

                <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={robloxUsername}
                    onChange={e => setRobloxUsername(e.target.value)}
                    placeholder="Username Roblox *"
                    className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Display Name (opsional)"
                      className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
                    />
                    <input
                      type="text"
                      required
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      placeholder="No. WhatsApp (08xx)"
                      className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
                    />
                  </div>

                  <label className="block border border-dashed border-gray-700 hover:border-orange-500 rounded-xl p-3 text-center cursor-pointer transition">
                    <span className="text-xs text-gray-300">
                      {paymentProof ? `✅ ${paymentProof.name}` : '☁️ Pilih bukti transfer (JPG, PNG, WEBP)'}
                    </span>
                    <input
                      type="file"
                      required
                      accept="image/*"
                      onChange={e => setPaymentProof(e.target.files[0])}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold py-3 rounded-xl transition text-sm"
                  >
                    {submitting ? 'Memproses Pesanan...' : '✓ Kirim Order & Bukti TF ke WhatsApp'}
                  </button>
                  <p className="text-[11px] text-center text-gray-500">
                    Satu pesan WhatsApp berisi detail pesanan + link bukti transfer akan dikirim ke admin.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
