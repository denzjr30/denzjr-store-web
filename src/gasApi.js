// Ganti dengan Web App URL dari hasil Deploy Google Apps Script kamu
export const GAS_URL = process.env.REACT_APP_GAS_URL || "https://script.google.com/macros/s/AKfycbxnacDdKHpTnbB4FACoE0MdM21Fghg72kJRlsVYHm2NuSRluEsJDZd7iZJ0chslVfg/exec";

async function gasGet(params) {
  const url = new URL(GAS_URL);
  Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));
  const res = await fetch(url.toString());
  return res.json();
}

async function gasPost(payload) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });
}

export const gasStoreApi = {
  getStock: () => gasGet({ action: "getStock" }),
  getOrder: (orderNumber) => gasGet({ action: "getOrder", order_number: orderNumber }),
  getOrdersByPhone: (phone) => gasGet({ action: "getOrdersByPhone", phone }),
  getReviews: () => gasGet({ action: "getReviews" }),

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

  createReview: ({ name, rating, orderNumber, comment }) =>
    gasPost({
      action: "createReview",
      name,
      rating,
      order_number: orderNumber,
      comment,
    }),

  adminLogin: (pin) => gasPost({ action: "adminLogin", pin }),
  adminGetOrders: (token) => gasGet({ action: "adminOrders", token }),
  adminGetRounds: (token) => gasGet({ action: "adminRounds", token }),

  adminUpdateStatus: (token, orderNumber, status) =>
    gasPost({
      action: "updateOrderStatus",
      token,
      order_number: orderNumber,
      status,
    }),

  adminDeleteOrder: (token, orderNumber) =>
    gasPost({ action: "deleteOrder", token, order_number: orderNumber }),

  adminUpdateConfig: (token, { closed, totalStock, roundCapital, prices, promoPrices }) =>
    gasPost({
      action: "updateShopConfig",
      token,
      closed,
      total_stock: totalStock,
      round_capital: roundCapital,
      prices,
      promo_prices: promoPrices,
    }),

  adminStartNewRound: (token, { newCapital, newStock }) =>
    gasPost({
      action: "startNewRound",
      token,
      new_capital: newCapital,
      new_stock: newStock,
    }),

  adminDeleteReview: (token, reviewId) =>
    gasPost({ action: "deleteReview", token, review_id: reviewId }),
};
