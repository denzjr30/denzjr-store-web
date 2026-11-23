// Ganti dengan Web App URL dari hasil Deploy Google Apps Script kamu
export const GAS_URL = process.env.REACT_APP_GAS_URL || "https://script.google.com/macros/s/AKfycbxnacDdKHpTnbB4FACoE0MdM21Fghg72kJRlsVYHm2NuSRluEsJDZd7iZJ0chslVfg/exec";

// Helper untuk GET request ke GAS
async function gasGet(params) {
  const url = new URL(GAS_URL);
  Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));
  const res = await fetch(url.toString());
  return res.json();
}

// Helper untuk POST request ke GAS (pakai text/plain agar bebas CORS preflight)
async function gasPost(payload) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// Helper mengubah File gambar bukti TF menjadi string Base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });
}

// ==========================================
// FUNGSI API DENZJR STORE (VERSI GAS)
// ==========================================
export const gasStoreApi = {
  // 1. Ambil status toko, stok, dan daftar harga
  getStock: () => gasGet({ action: "getStock" }),

  // 2. Cek status 1 pesanan berdasarkan nomor invoice
  getOrder: (orderNumber) => gasGet({ action: "getOrder", order_number: orderNumber }),

  // 3. Cek riwayat pesanan berdasarkan nomor WhatsApp
  getOrdersByPhone: (phone) => gasGet({ action: "getOrdersByPhone", phone }),

  // 4. Ambil semua ulasan pembeli
  getReviews: () => gasGet({ action: "getReviews" }),

  // 5. Kirim pesanan baru + upload bukti transfer ke Google Drive
  createOrder: async ({ username, displayName, buyerPhone, items, total, proofFile }) => {
    const proofBase64 = proofFile ? await fileToBase64(proofFile) : "";
    return gasPost({
      action: "createOrder",
      username,
      display_name: displayName,
      buyer_phone: buyerPhone,
      items,
      total,
      proof_base64: proofBase64,
    });
  },

  // 6. Kirim ulasan pembeli
  createReview: ({ name, rating, orderNumber, comment }) =>
    gasPost({
      action: "createReview",
      name,
      rating,
      order_number: orderNumber,
      comment,
    }),

  // 7. Login Admin Dashboard
  adminLogin: (pin) => gasPost({ action: "adminLogin", pin }),

  // 8. Ambil semua daftar pesanan untuk Admin
  adminGetOrders: (token) => gasGet({ action: "adminOrders", token }),

  // 9. Update status pesanan (otomatis potong stok jika Selesai)
  adminUpdateStatus: (token, orderNumber, status) =>
    gasPost({
      action: "updateOrderStatus",
      token,
      order_number: orderNumber,
      status,
    }),

  // 10. Hapus pesanan
  adminDeleteOrder: (token, orderNumber) =>
    gasPost({ action: "deleteOrder", token, order_number: orderNumber }),

  // 11. Simpan pengaturan toko (Buka/Tutup, Stok, dan Harga)
  adminUpdateConfig: (token, { closed, totalStock, prices }) =>
    gasPost({
      action: "updateShopConfig",
      token,
      closed,
      total_stock: totalStock,
      prices,
    }),

  // 12. Hapus ulasan
  adminDeleteReview: (token, reviewId) =>
    gasPost({ action: "deleteReview", token, review_id: reviewId }),
};
