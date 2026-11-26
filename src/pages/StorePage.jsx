import React, { useState, useEffect } from 'react';
import { gasStoreApi } from '../gasApi';
import { Link } from 'react-router-dom';

const ADMIN_WHATSAPP = "6281958085966";

const DEFAULT_PACKAGES = [
  { robux: 10, price: 2000, badge: 'KELIPATAN 10' },
  { robux: 20, price: 3500 },
  { robux: 30, price: 5000 },
  { robux: 40, price: 6500 },
  { robux: 50, price: 8000 },
  { robux: 60, price: 9500 },
  { robux: 70, price: 11000 },
  { robux: 80, price: 12500 },
  { robux: 90, price: 14000 },
  { robux: 100, price: 15500, badge: 'KELIPATAN 100' },
  { robux: 200, price: 31000 },
  { robux: 300, price: 46500 },
  { robux: 400, price: 62000 },
  { robux: 500, price: 77500 },
  { robux: 1000, price: 155000, badge: 'FAVORIT' },
  { robux: 2000, price: 310000 },
  { robux: 3000, price: 465000 },
  { robux: 4000, price: 620000 },
  { robux: 5000, price: 750000, badge: 'SULTAN' },
];

const generateOrderNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DJS-${y}${m}${d}-${rand}`;
};

export default function StorePage() {
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [totalStock, setTotalStock] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showQris, setShowQris] = useState(true);

  const [infoModal, setInfoModal] = useState(null);
  const [previewOrderNumber, setPreviewOrderNumber] = useState('');
  const [copiedOrder, setCopiedOrder] = useState(false);

  const [robloxUsername, setRobloxUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [reviewName, setReviewName] = useState('');
  const [reviewOrderId, setReviewOrderId] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [sendingReview, setSendingReview] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const fetchStoreData = async () => {
    try {
      const [shopRes, reviewsRes] = await Promise.allSettled([
        gasStoreApi.getStock(),
        gasStoreApi.getReviews()
      ]);

      if (shopRes.status === 'fulfilled' && shopRes.value) {
        const data = shopRes.value;

        if (data.total_stock !== null && data.total_stock !== undefined && !Number.isNaN(Number(data.total_stock))) {
          setTotalStock(Number(data.total_stock));
        } else {
          setTotalStock(null);
        }

        if (data.closed !== undefined) {
          setIsOpen(!data.closed);
        } else if (data.is_open !== undefined) {
          setIsOpen(data.is_open);
        }

        if (data.prices && typeof data.prices === 'object' && Object.keys(data.prices).length > 0) {
          const promoMap = data.promo_prices || {};
          const updated = DEFAULT_PACKAGES.map(pkg => {
            const normalPrice = data.prices[pkg.robux] ? Number(data.prices[pkg.robux]) : pkg.price;
            const rawPromo = promoMap[pkg.robux] ? Number(promoMap[pkg.robux]) : 0;
            const hasPromo = rawPromo > 0 && rawPromo < normalPrice;

            return {
              ...pkg,
              price: hasPromo ? rawPromo : normalPrice,
              originalPrice: hasPromo ? normalPrice : null,
              discountPercent: hasPromo ? Math.round(((normalPrice - rawPromo) / normalPrice) * 100) : 0,
              isPromo: hasPromo
            };
          });
          setPackages(updated);
        }
      }

      if (reviewsRes.status === 'fulfilled' && reviewsRes.value) {
        const list = Array.isArray(reviewsRes.value) ? reviewsRes.value : (reviewsRes.value.reviews || []);
        setReviews(list);
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan toko", err);
    }
  };

  useEffect(() => {
    fetchStoreData();

    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStoreData();
      }
    }, 3000);

    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('denzjr_store_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SHOP_STATUS_CHANGED') {
          setIsOpen(Boolean(event.data.isOpen));
          fetchStoreData();
        } else if (event.data?.type === 'STORE_DATA_UPDATED') {
          fetchStoreData();
        }
      };
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchStoreData();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(syncInterval);
      if (channel) channel.close();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  useEffect(() => {
    if (cart.length > 0 && !previewOrderNumber) {
      setPreviewOrderNumber(generateOrderNumber());
    } else if (cart.length === 0) {
      setPreviewOrderNumber('');
    }
  }, [cart.length, previewOrderNumber]);

  const addToCart = (pkg) => {
    if (!isOpen) return alert("Maaf, toko sedang tutup sementara.");
    const currentRobuxInCart = cart.reduce((sum, item) => sum + item.robux, 0);
    if (totalStock !== null && totalStock !== "" && currentRobuxInCart + pkg.robux > Number(totalStock)) {
      return alert(`Stok Robux tidak mencukupi (tersedia ${Number(totalStock).toLocaleString('id-ID')} R$).`);
    }
    setCart([...cart, { ...pkg, cartId: Date.now() + Math.random() }]);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const handleCopyOrderNumber = () => {
    if (!previewOrderNumber) return;
    navigator.clipboard.writeText(previewOrderNumber);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2000);
  };

  const totalRobux = cart.reduce((sum, item) => sum + item.robux, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  const fileToCompressedDataUrl = (file) =>
    new Promise((resolve) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 800;
          const scale = img.width > maxW ? maxW / img.width : 1;
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve('');
        img.src = event.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Keranjang masih kosong!");
    if (!robloxUsername.trim()) return alert("Masukkan username Roblox kamu terlebih dahulu!");
    if (!paymentProof) return alert("Pilih gambar bukti transfer terlebih dahulu!");

    const activeOrderNo = previewOrderNumber || generateOrderNumber();

    setSubmitting(true);
    try {
      const proofDataUrl = await fileToCompressedDataUrl(paymentProof);

      const orderItems = cart.map((item) => ({
        robux: Number(item.robux),
        qty: 1,
        price: Number(item.price),
        subtotal: Number(item.price)
      }));

      const res = await fetch(
        process.env.REACT_APP_GAS_URL || (await import('../gasApi')).GAS_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'createOrder',
            order_number: activeOrderNo,
            username: robloxUsername.trim(),
            display_name: (displayName || robloxUsername).trim(),
            buyer_phone: whatsapp.trim(),
            items: orderItems,
            total: Number(totalPrice),
            proof_base64: proofDataUrl
          })
        }
      );

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const finalOrderCode = data.order_number || activeOrderNo;
      const proofDriveLink = data.proof_url || '-';

      const detailItemsText = cart
        .map(item => `• ${item.robux.toLocaleString('id-ID')} Robux - Rp ${item.price.toLocaleString('id-ID')}${item.isPromo ? ' (PROMO)' : ''}`)
        .join('\n');

      const waMessage = 
        `Halo Admin DenzJr Store! 👋 Saya mau pesan & bayar Robux via QRIS dengan detail berikut:\n\n` +
        `📋 INFORMASI PESANAN\n` +
        `------------------------------------\n` +
        `• No. Order : ${finalOrderCode}\n` +
        `• Username : ${robloxUsername.trim()}\n` +
        `• Display Name : ${displayName.trim() || '-'}\n` +
        `• No. WhatsApp : ${whatsapp.trim()}\n\n` +
        `🛒 DETAIL ITEM\n` +
        `------------------------------------\n` +
        `${detailItemsText}\n\n` +
        `💎 TOTAL ROBUX : ${totalRobux.toLocaleString('id-ID')} R$\n` +
        `💰 TOTAL PEMBAYARAN : Rp ${totalPrice.toLocaleString('id-ID')}\n` +
        `🧾 Bukti TF : ${proofDriveLink}\n` +
        `------------------------------------\n\n` +
        `Mohon dicek bukti transfer yang saya lampirkan di chat ini dan segera diproses ya Admin, terima kasih! 🙏`;

      setCart([]);
      setIsCartOpen(false);
      setPaymentProof(null);
      setRobloxUsername('');
      setDisplayName('');
      setWhatsapp('');
      setPreviewOrderNumber('');
      fetchStoreData();

      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(waMessage)}`, '_blank');
    } catch (err) {
      alert(`Gagal mengirim pesanan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return alert("Tuliskan pengalaman top up kamu terlebih dahulu.");
    setSendingReview(true);
    try {
      const data = await gasStoreApi.createReview({
        rating,
        name: reviewName.trim() || "Pembeli Anonim",
        orderNumber: reviewOrderId.trim(),
        comment: reviewComment.trim()
      });
      if (data.error) throw new Error(data.error);

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
    <div className="min-h-screen text-white font-sans pb-28 relative overflow-x-hidden bg-[#060812]">
      {/* ANIMASI LIVE WALLPAPER CSS */}
      <style>{`
        @keyframes denzjrLiveBg {
          0%, 100% {
            transform: scale(1.03) translateY(0px);
            filter: brightness(0.95) saturate(1.1);
          }
          50% {
            transform: scale(1.09) translateY(-10px);
            filter: brightness(1.12) saturate(1.3);
          }
        }
        @keyframes neonOrbFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-28px) scale(1.15);
            opacity: 0.75;
          }
        }
        .live-wallpaper-layer {
          animation: denzjrLiveBg 12s ease-in-out infinite;
        }
        .neon-orb-cyan {
          animation: neonOrbFloat 7s ease-in-out infinite;
        }
        .neon-orb-purple {
          animation: neonOrbFloat 9s ease-in-out infinite reverse;
        }
      `}</style>

      {/* LAYER 1: GAMBAR LIVE BACKGROUND (bg-denzjr.jpeg) */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none z-0 live-wallpaper-layer"
        style={{ backgroundImage: "url('/bg-denzjr.jpeg')" }}
      />

      {/* LAYER 2: PARTIKEL CAHAYA NEON MELAYANG */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="neon-orb-cyan absolute top-24 left-8 w-44 h-44 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="neon-orb-purple absolute bottom-32 right-8 w-52 h-52 rounded-full bg-purple-600/25 blur-3xl" />
        <div className="neon-orb-cyan absolute top-1/2 left-1/3 w-36 h-36 rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      {/* LAYER 3: VIGNETTE GELAP TENGAH */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#060913]/65 via-[#070b17]/75 to-[#050811]/85 pointer-events-none z-0" />

      {/* KONTEN UTAMA */}
      <div className="relative z-10">
        {/* HEADER */}
        <header className="sticky top-0 z-30 bg-[#090d1a]/80 backdrop-blur-md border-b border-cyan-500/20 shadow-[0_4px_25px_rgba(6,182,212,0.08)]">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="/logo.jpeg" alt="DenzJr Store" className="w-11 h-11 rounded-xl object-cover border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.35)]" />
                <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#090d1a] ${isOpen ? 'bg-emerald-400' : 'bg-red-500'}`} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-wide">
                  DENZJR <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">STORE</span>
                </h1>
                <p className="text-[11px] tracking-widest text-cyan-300/80 uppercase">Roblox Top Up Center</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link to="/status" className="bg-[#131a2e]/85 hover:bg-[#1b2542] border border-cyan-500/30 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 shadow-sm">
                <span>📦</span> Cek Status
              </Link>
              <a 
                href={`https://wa.me/${ADMIN_WHATSAPP}`} 
                target="_blank" 
                rel="noreferrer"
                className="bg-[#102624]/85 hover:bg-[#153532] border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 text-emerald-400 shadow-sm"
              >
                <span>💬</span> Admin
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-6">
          {/* HERO BANNER */}
          <div className="bg-gradient-to-br from-[#0e1528]/85 via-[#11172b]/85 to-[#16122c]/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 md:p-9 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_35px_rgba(6,182,212,0.12)]">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/30 px-3 py-1 rounded-full mb-3">
                <span className="text-xs font-bold tracking-wider text-cyan-300 uppercase">✨ Top Up Robux Aman & Cepat</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
                Level up your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-cyan-400">Roblox world.</span>
              </h2>
              <p className="text-gray-300 text-sm mb-5 leading-relaxed">
                Isi username, pilih nominal Robux, bayar via QRIS, dan biarkan kami memproses sisanya secara cepat dan transparan.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 mb-5">
                <button
                  type="button"
                  onClick={() => setInfoModal('howto')}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition flex items-center gap-1.5"
                >
                  <span>📖</span> Cara Order
                </button>
                <button
                  type="button"
                  onClick={() => setInfoModal('terms')}
                  className="bg-[#161e35]/90 hover:bg-[#1f2a4a] border border-purple-400/40 text-purple-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
                >
                  <span>📜</span> Syarat & Ketentuan
                </button>
              </div>

              <div className="flex items-center gap-5 text-xs font-semibold text-gray-300">
                <span className="flex items-center gap-1.5 text-orange-400">⚡ <span className="text-gray-300">Proses cepat</span></span>
                <span className="flex items-center gap-1.5 text-emerald-400">🛡️ <span className="text-gray-300">100% aman</span></span>
                <span className="flex items-center gap-1.5 text-cyan-400">🔍 <span className="text-gray-300">Lacak real-time</span></span>
              </div>
            </div>

            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-2 border-cyan-400/40 bg-[#0b1122]/90 flex items-center justify-center relative shadow-[0_0_45px_rgba(6,182,212,0.28)] shrink-0">
              <div className="w-24 h-24 rounded-full border border-purple-400/50 flex items-center justify-center bg-gradient-to-tr from-cyan-500/10 to-purple-500/10">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-200 to-orange-400 -rotate-12">R$</span>
              </div>
            </div>
          </div>

          {/* 01 DATA AKUN ROBLOX & CATATAN PENTING */}
          <div className="bg-[#0e1425]/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 mb-5 shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-bold text-xs flex items-center justify-center">
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
                  className="w-full bg-[#080c17]/90 border border-gray-700/80 rounded-xl p-3 text-sm text-white focus:border-cyan-400 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Display Name <span className="text-gray-500">(opsional)</span></label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Contoh: DenzJr"
                  className="w-full bg-[#080c17]/90 border border-gray-700/80 rounded-xl p-3 text-sm text-white focus:border-cyan-400 outline-none transition"
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
                className="w-full md:w-1/2 bg-[#080c17]/90 border border-gray-700/80 rounded-xl p-3 text-sm text-white focus:border-cyan-400 outline-none transition"
              />
            </div>

            <div className="bg-[#1e1726]/90 border border-purple-500/30 rounded-xl p-4">
              <p className="text-cyan-300 font-bold text-xs mb-1">⚡ Catatan penting</p>
              <p className="text-gray-300 text-xs">Pastikan username sesuai huruf besar/kecil dan akun tidak dalam mode privat jika diperlukan.</p>
            </div>
          </div>

          {/* STATUS STOK & TOKO */}
          {!isOpen ? (
            <div className="bg-red-950/85 backdrop-blur-md border border-red-500/50 rounded-xl p-4 mb-8 text-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <span className="text-red-300 font-bold">🔴 Toko Sedang Tutup Sementara — Pemesanan akan dibuka kembali segera.</span>
            </div>
          ) : (
            <div className="bg-[#0b2526]/85 backdrop-blur-md border border-cyan-400/40 rounded-xl p-3.5 mb-8 text-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <span className="text-cyan-300 font-semibold text-sm">
                📦 Stok Robux tersedia: <strong className="text-white">{totalStock !== null && totalStock !== "" ? `${Number(totalStock).toLocaleString('id-ID')} R$` : 'Tersedia'}</strong>
              </span>
            </div>
          )}

          {/* JUDUL KATALOG */}
          <div className="flex flex-wrap justify-between items-end mb-5 gap-2">
            <div>
              <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-1">Pilih Sesuai Kebutuhanmu</p>
              <h2 className="text-3xl font-extrabold">Nominal <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Robux</span></h2>
            </div>
            <p className="text-xs text-gray-300">Harga transparan • Tanpa biaya tersembunyi</p>
          </div>

          {/* GRID NOMINAL ROBUX (DENGAN TAMPILAN PROMO OTOMATIS) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-14">
            {packages.map((pkg) => (
              <div 
                key={pkg.robux} 
                className={`bg-[#0e1425]/85 backdrop-blur-md border rounded-2xl p-4 transition duration-200 flex flex-col justify-between hover:-translate-y-0.5 ${
                  pkg.isPromo
                    ? 'border-pink-500/70 shadow-[0_0_24px_rgba(236,72,153,0.2)]'
                    : pkg.badge 
                      ? 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.12)]' 
                      : 'border-cyan-500/20 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3 gap-1">
                    <span className="inline-block bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold px-2 py-0.5 rounded-md">R$</span>
                    {pkg.isPromo ? (
                      <span className="bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider uppercase shadow-sm">
                        PROMO
                      </span>
                    ) : pkg.badge ? (
                      <span className="bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider uppercase shadow-sm">
                        {pkg.badge}
                      </span>
                    ) : null}
                  </div>

                  <div className="text-lg font-extrabold text-white">
                    {pkg.robux.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">Robux</span>
                  </div>

                  {pkg.isPromo && pkg.originalPrice ? (
                    <div className="mt-1 mb-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 line-through">
                          Rp {pkg.originalPrice.toLocaleString('id-ID')}
                        </span>
                        <span className="bg-pink-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                          -{pkg.discountPercent}%
                        </span>
                      </div>
                      <div className="text-base font-extrabold text-white mt-0.5">
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-base font-bold text-gray-100 mt-1 mb-4">
                      Rp {pkg.price.toLocaleString('id-ID')}
                    </div>
                  )}
                </div>

                <button
                  disabled={!isOpen || (totalStock !== null && totalStock !== "" && Number(totalStock) < pkg.robux)}
                  onClick={() => addToCart(pkg)}
                  className={`w-full font-semibold text-xs py-2.5 rounded-xl transition disabled:opacity-40 ${
                    pkg.isPromo
                      ? 'bg-pink-600/25 hover:bg-gradient-to-r hover:from-pink-600 hover:to-rose-600 text-pink-200 hover:text-white border border-pink-500/40'
                      : 'bg-[#16203a]/90 hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 hover:text-white disabled:hover:bg-[#16203a] text-cyan-100 border border-cyan-500/20 hover:border-transparent'
                  }`}
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

            <form onSubmit={handleSendReview} className="bg-[#0e1425]/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 mb-6">
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
                  className="bg-[#080c17]/90 border border-gray-700/80 rounded-xl p-3 text-sm text-white focus:border-cyan-400 outline-none"
                />
                <input
                  type="text"
                  value={reviewOrderId}
                  onChange={e => setReviewOrderId(e.target.value)}
                  placeholder="No. Order (opsional)"
                  className="bg-[#080c17]/90 border border-gray-700/80 rounded-xl p-3 text-sm text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <textarea
                rows="3"
                required
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Ceritakan pengalaman top up kamu..."
                className="w-full bg-[#080c17]/90 border border-gray-700/80 rounded-xl p-3 text-sm text-white mb-4 focus:border-cyan-400 outline-none"
              />

              <button
                type="submit"
                disabled={sendingReview}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3 rounded-xl transition shadow-md"
              >
                {sendingReview ? 'Mengirim Ulasan...' : 'Kirim Ulasan'}
              </button>
            </form>

            {reviews.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Menampilkan {showAllReviews ? reviews.length : Math.min(4, reviews.length)} dari {reviews.length} ulasan
                  </p>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showAllReviews ? 'max-h-[420px] overflow-y-auto pr-1' : ''}`}>
                  {(showAllReviews ? reviews : reviews.slice(0, 4)).map((rev, idx) => (
                    <div key={rev.id || rev._id || idx} className="bg-[#0e1425]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">{rev.name}</span>
                        <span className="text-amber-400 text-sm">{'★'.repeat(rev.rating || 5)}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{rev.comment}</p>
                    </div>
                  ))}
                </div>

                {reviews.length > 4 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="bg-[#131b30]/90 hover:bg-[#1b2744] border border-cyan-500/30 text-cyan-300 font-bold text-xs px-5 py-2.5 rounded-xl transition"
                    >
                      {showAllReviews
                        ? '▲ Sembunyikan Sebagian Ulasan'
                        : `▼ Lihat Semua Ulasan (${reviews.length})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <footer className="border-t border-cyan-500/20 pt-6 flex flex-wrap justify-between text-xs text-gray-400">
            <span>© 2026 DenzJr Store</span>
            <span>Top up mudah, main lebih seru.</span>
          </footer>
        </main>
      </div>

      {/* FLOATING CART BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#090d1a]/90 backdrop-blur-md border-t border-cyan-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.7)] z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400">Keranjang kamu</p>
            {cart.length === 0 ? (
              <p className="text-sm font-bold text-orange-400">Masih kosong</p>
            ) : (
              <p className="text-sm font-bold text-white">
                <span className="text-cyan-400">{totalRobux.toLocaleString('id-ID')} R$</span> • <span className="text-orange-400">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-[0_0_20px_rgba(249,115,22,0.35)]"
          >
            <span>🛒 Buka Keranjang</span>
            <span className="bg-black/30 px-2 py-0.5 rounded-full text-xs">{cart.length}</span>
          </button>
        </div>
      </div>

      {/* MODAL CARA ORDER & SYARAT KETENTUAN */}
      {infoModal && (
        <div
          onClick={() => setInfoModal(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0e1425] border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-[0_0_40px_rgba(6,182,212,0.2)]"
          >
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <h3 className="text-lg font-extrabold text-cyan-300">
                {infoModal === 'howto' ? '📖 Cara Order Robux' : '📜 Syarat & Ketentuan'}
              </h3>
              <button onClick={() => setInfoModal(null)} className="text-gray-400 hover:text-white text-xl font-bold">✕</button>
            </div>

            {infoModal === 'howto' ? (
              <ol className="space-y-2.5 text-sm text-gray-300 list-decimal list-inside leading-relaxed">
                <li>Isi <strong className="text-white">Username Roblox</strong> dan nomor WhatsApp aktif pada kolom Data Akun.</li>
                <li>Pilih paket <strong className="text-cyan-300">Nominal Robux</strong> yang diinginkan lalu klik <strong className="text-orange-400">+ Keranjang</strong>.</li>
                <li>Buka keranjang, cek total Robux & pembayaran, lalu scan <strong className="text-white">QRIS DenzJr Store</strong>.</li>
                <li>Cantumkan <strong className="text-cyan-300">No. Order</strong> di catatan transfer (opsional) dan upload bukti transfer.</li>
                <li>Klik <strong className="text-emerald-400">Kirim Order & Bukti TF ke WhatsApp</strong> dan pantau progresnya di menu <strong className="text-white">Cek Status</strong>.</li>
              </ol>
            ) : (
              <ul className="space-y-2.5 text-sm text-gray-300 list-disc list-inside leading-relaxed">
                <li>Pastikan <strong className="text-white">Username Roblox</strong> sudah benar (kesalahan penulisan username di luar tanggung jawab admin).</li>
                <li>Pesanan diproses sesuai antrean setelah pembayaran QRIS terverifikasi.</li>
                <li>Wajib melampirkan bukti transfer asli dan jelas saat checkout.</li>
                <li>Dana yang sudah masuk tidak dapat di-refund apabila pesanan sudah diproses.</li>
              </ul>
            )}

            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="mt-5 w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* MODAL KERANJANG & CHECKOUT QRIS */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1425] border border-cyan-500/30 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 relative shadow-[0_0_40px_rgba(6,182,212,0.18)]">
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
                    <div key={item.cartId} className="bg-[#151e36] border border-cyan-500/20 rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-orange-400">{item.robux.toLocaleString('id-ID')} Robux</p>
                          {item.isPromo && (
                            <span className="bg-pink-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                              PROMO -{item.discountPercent}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-200 font-semibold">Rp {item.price.toLocaleString('id-ID')}</span>
                          {item.isPromo && item.originalPrice && (
                            <span className="text-gray-500 line-through">Rp {item.originalPrice.toLocaleString('id-ID')}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 hover:text-red-300 text-sm px-2">🗑️</button>
                    </div>
                  ))}
                </div>

                {/* RINGKASAN TOTAL ROBUX & TOTAL PEMBAYARAN */}
                <div className="py-3 border-y border-gray-800 mb-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Total Robux:</span>
                    <span className="font-extrabold text-cyan-400">{totalRobux.toLocaleString('id-ID')} R$</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-300">Total pembayaran</span>
                    <span className="text-2xl font-extrabold text-orange-500">Rp {totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* NO. ORDER LANGSUNG MUNCUL SEBELUM UPLOAD BUKTI TF */}
                <div className="bg-[#131d36] border border-cyan-500/30 rounded-xl p-3 text-xs text-gray-300 mb-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-gray-400 block text-[11px]">No. Order kamu (simpan / cantumkan di catatan TF):</span>
                    <span className="text-cyan-400 font-extrabold text-sm tracking-wide">{previewOrderNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOrderNumber}
                    className="bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-cyan-300 font-bold px-3 py-1.5 rounded-lg text-[11px] transition shrink-0"
                  >
                    {copiedOrder ? '✓ Tersalin' : 'Salin'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQris(!showQris)}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2.5 rounded-xl mb-3 transition text-sm"
                >
                  {showQris ? 'Sembunyikan QRIS' : 'Tampilkan QRIS'}
                </button>

                {showQris && (
                  <div className="bg-[#080c17] border border-cyan-500/20 rounded-xl p-4 mb-4 text-center">
                    <p className="text-cyan-400 font-bold text-sm mb-3">Scan QRIS DenzJr Store</p>
                    <img src="/qris.jpeg" alt="QRIS DenzJr Store" className="w-56 mx-auto rounded-lg bg-white p-1.5 mb-3" />
                    <a
                      href="/qris.jpeg"
                      download="QRIS-DenzJr-Store.jpeg"
                      className="block w-full bg-[#16203a] hover:bg-[#1f2d52] text-gray-200 text-xs font-bold py-2.5 rounded-lg transition"
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
                    className="w-full bg-[#080c17] border border-gray-700/80 rounded-xl p-3 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Display Name (opsional)"
                      className="w-full bg-[#080c17] border border-gray-700/80 rounded-xl p-3 text-sm text-white focus:border-cyan-400 outline-none"
                    />
                    <input
                      type="text"
                      required
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      placeholder="No. WhatsApp (08xx)"
                      className="w-full bg-[#080c17] border border-gray-700/80 rounded-xl p-3 text-sm text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <label className="block border border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-xl p-3 text-center cursor-pointer transition bg-[#080c17]/60">
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
