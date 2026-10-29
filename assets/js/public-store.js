
/* Veloraa Shop - Appwrite product catalogue */
(function () {
  'use strict';

  const categoryMap = {
    skincare: 'skincare',
    makeup: 'makeup',
    haircare: 'haircare',
    fragrance: 'fragrance',
    hygiene: 'hygiene',
    tools: 'tools',
    nails: 'nails',
    bodycare: 'bodycare',
    other: 'other'
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  const money = n =>
    new Intl.NumberFormat('fa-IR').format(Number(n || 0)) + ' تومان';

  function getHomeGrid() {
    const section = document.querySelector('#featured-products');
    if (!section) return null;

    return section.querySelector(
      '.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3'
    ) || section.querySelector('.grid');
  }

  function renderHome(products) {
    const grid = getHomeGrid();
    if (!grid) return;

    grid.innerHTML = products.slice(0, 6).map(p => `
      <article class="product-card-hover group bg-white border border-[#EADDE1] rounded-3xl p-4 flex flex-col">
        <a href="${p.id ? `product-details.html?id=${encodeURIComponent(p.id)}` : 'products.html'}">
          <div class="aspect-[4/5] rounded-2xl overflow-hidden bg-[#F8E9EE] mb-4 p-4 flex items-center justify-center">
            ${p.image
              ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" class="w-full h-full object-contain">`
              : '<span class="text-sm text-[#776B70]">بدون تصویر</span>'}
          </div>
          <div class="text-xs text-[#D88FA7] font-bold mb-1">${esc(p.brand)}</div>
          <h3 class="font-bold text-sm text-[#30252B] mb-2">${esc(p.title)}</h3>
          <div class="flex gap-2 items-center">
            <strong class="text-[#913B60]">${money(p.price)}</strong>
            ${p.discount > 0
              ? `<del class="text-xs text-gray-400">${money(p.originalPrice)}</del>`
              : ''}
          </div>
        </a>
      </article>`).join('')
      || '<div class="col-span-full py-12 text-center text-[#776B70]">هنوز محصول فعالی ثبت نشده است.</div>';
  }

  
function mapProduct(p) {
  const price = Number(p.price || 0);

  const discount = Math.max(
    0,
    Math.min(
      100,
      Number(p.discount_percent ?? p.discount ?? 0)
    )
  );

  const stock = Number(
    p.stock_quantity ?? p.stock ?? 0
  );

  const originalPrice = Number(
    p.original_price ??
    p.originalPrice ??
    p.oldPrice ??
    price
  );

  const finalPrice = Number(
    p.sale_price ??
    Math.round(price * (1 - discount / 100))
  );

  return {
    id: p.$id || p.id || p.$rowId || "",
    title: p.name || p.title || "",
    name: p.name || p.title || "",
    brand: Array.isArray(p.brand)
      ? (p.brand[0] || "Veloraa")
      : (p.brand || "Veloraa"),
    category: categoryMap[p.category] || p.category || "other",
    skinType: "all",
    price: finalPrice,
    originalPrice,
    discount,
    rating: 0,
    reviewsCount: 0,
    inStock: stock > 0,
    stock,
    volume: p.variant || "",
    image: p.image_url || p.image || "",
    description: p.description || "",
    features: [],
    remote: true
  };
}


  async function load() {
    const catalog = window.VeloraaApp?.PRODUCTS_CATALOG;

    try {
      if (!window.VeloraaProducts?.load) {
        throw new Error('Appwrite products module is not loaded.');
      }

      const remote = (await window.VeloraaProducts.load()).map(mapProduct);

      if (catalog) {
        catalog.splice(0, catalog.length, ...remote);
      }

      renderHome(remote);

      window.dispatchEvent(new CustomEvent('veloraa:products-updated', {
        detail: { products: remote }
      }));
    } catch (error) {
      console.error('Veloraa Appwrite products error:', error);

      // Keep the current catalogue intact if Appwrite fails.
      window.dispatchEvent(new CustomEvent('veloraa:products-updated', {
        detail: {
          products:[],
          error: error.message
        }
      }));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
