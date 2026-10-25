/* Veloraa Shop: database-only product catalogue.
   The database is the single source of truth. Static HTML demo cards are replaced
   immediately and then populated only with active Supabase products. */
(function () {
  'use strict';

  const B = window.VeloraaBackend;
  const categoryMap = {
    skincare: 'skincare', makeup: 'makeup', haircare: 'haircare',
    fragrance: 'fragrance', hygiene: 'hygiene', tools: 'tools',
    nails: 'nails', bodycare: 'bodycare', other: 'other'
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const money = n => new Intl.NumberFormat('fa-IR').format(Number(n || 0)) + ' تومان';

  function getHomeGrid() {
    const section = document.querySelector('#featured-products');
    if (!section) return null;
    // The old selector expected the grid to be a direct child of the section's
    // first inner div; the actual page has a heading row before the product grid.
    return section.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3')
      || section.querySelector('.grid');
  }

  function renderHome(products) {
    const grid = getHomeGrid();
    if (!grid) return;
    grid.innerHTML = products.slice(0, 6).map(p => `
      <article class="product-card-hover group bg-white border border-[#EADDE1] rounded-3xl p-4 flex flex-col">
        <a href="product-details.html?id=${encodeURIComponent(p.id)}">
          <div class="aspect-[4/5] rounded-2xl overflow-hidden bg-[#F8E9EE] mb-4 p-4 flex items-center justify-center">
            ${p.image
              ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" class="w-full h-full object-contain">`
              : '<span class="text-sm text-[#776B70]">بدون تصویر</span>'}
          </div>
          <div class="text-xs text-[#D88FA7] font-bold mb-1">${esc(p.brand)}</div>
          <h3 class="font-bold text-sm text-[#30252B] mb-2">${esc(p.title)}</h3>
          <div class="flex gap-2 items-center">
            <strong class="text-[#913B60]">${money(p.price)}</strong>
            ${p.discount > 0 ? `<del class="text-xs text-gray-400">${money(p.originalPrice)}</del>` : ''}
          </div>
        </a>
      </article>`).join('')
      || '<div class="col-span-full py-12 text-center text-[#776B70]">هنوز محصول فعالی ثبت نشده است. محصولات را از پنل مدیریت اضافه کنید.</div>';
  }

  function mapProduct(p) {
    return {
      id: p.id,
      title: p.name,
      brand: p.brand || 'Veloraa',
      category: categoryMap[p.category] || p.category || 'other',
      skinType: p.skin_type || 'all',
      price: Number(p.sale_price ?? p.price),
      originalPrice: Number(p.price),
      discount: Number(p.discount_percent || 0),
      rating: Number(p.rating || 0),
      reviewsCount: Number(p.reviews_count || 0),
      inStock: Number(p.stock_quantity) > 0,
      stock: Number(p.stock_quantity),
      volume: p.variant || '',
      image: p.image_url || '',
      description: p.description || '',
      features: Array.isArray(p.features) ? p.features : [],
      remote: true
    };
  }

  async function load() {
    const catalog = window.VeloraaApp?.PRODUCTS_CATALOG;
    if (catalog) catalog.splice(0, catalog.length);

    // Remove old hard-coded product cards immediately, even while Supabase loads.
    renderHome([]);

    if (!B?.client) {
      window.dispatchEvent(new CustomEvent('veloraa:products-updated', {
        detail: { products: [] }
      }));
      return;
    }

    const { data, error } = await B.client
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Veloraa products unavailable:', error.message);
      window.dispatchEvent(new CustomEvent('veloraa:products-updated', {
        detail: { products: [] }
      }));
      renderHome([]);
      return;
    }

    const remote = (data || []).map(mapProduct);
    if (catalog) catalog.push(...remote);
    renderHome(remote);
    window.dispatchEvent(new CustomEvent('veloraa:products-updated', {
      detail: { products: remote }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
