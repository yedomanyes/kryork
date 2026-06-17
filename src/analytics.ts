import { supabase } from './supabase';

// Generate or reuse a session ID per browser tab
const SESSION_ID = (() => {
  let id = sessionStorage.getItem('kryork_session');
  if (!id) {
    id = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('kryork_session', id);
  }
  return id;
})();

export const track = async (
  eventType: string,
  extra: { productId?: string; productName?: string; material?: string; page?: string } = {}
) => {
  await supabase.from('analytics_events').insert([{
    event_type: eventType,
    product_id: extra.productId ?? null,
    product_name: extra.productName ?? null,
    material: extra.material ?? null,
    page: extra.page ?? null,
    session_id: SESSION_ID,
  }]);
};

export const trackCheckout = async (items: { product: { id: string; name: string; price: string; material: string }; quantity: number }[]) => {
  const totalValue = items.reduce((acc, item) => {
    const num = parseFloat(item.product.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
    return acc + num * item.quantity;
  }, 0).toFixed(2);

  await supabase.from('checkout_events').insert([{
    session_id: SESSION_ID,
    items: items.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, material: i.product.material, quantity: i.quantity })),
    total_value: totalValue,
    item_count: items.reduce((a, i) => a + i.quantity, 0),
  }]);
};
