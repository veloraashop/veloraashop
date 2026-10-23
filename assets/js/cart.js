/**
 * Veloraa Luxury Atelier - Shopping Cart & Telegram Order Engine
 * Pure Vanilla JavaScript - Ready for direct drag-and-drop on GitHub Pages
 */

const VeloraaCart = (function() {
  const STORAGE_KEY = 'veloraa_cart_items';
  const WISHLIST_KEY = 'veloraa_wishlist_items';
  const TELEGRAM_HANDLE = 'veloraa_support'; // Telegram username
  const FREE_SHIPPING_THRESHOLD = 1000000; // 1,000,000 Toman

  // Persian Number Formatter
  function toPersianDigits(num) {
    if (num === null || num === undefined) return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, d => persianDigits[d]);
  }

  function formatToman(amount) {
    const formatted = Math.round(amount).toLocaleString('en-US');
    return toPersianDigits(formatted);
  }

  // Initial Sample Cart if empty
  const defaultItems = [
    {
      id: 'ord-hyaluronic',
      title: 'سرم آبرسان عمیق هیالورونیک اسید ۲٪ + B5',
      brand: 'The Ordinary',
      volume: '۳۰ میلی‌لیتر',
      price: 650000,
      originalPrice: 820000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5MTzA__ukmNNh752bY0yqFl6LKySLkfP7mpc3lsG4bXNGQDTQJHc6CNIxRbiXnV9w-eYadDidLOSYhOKbGg8s3epGzXuF0gPnA7IGnCWP7EBbnLKE-YdNU-21lLg2EjqlJqXze290COjgEbFN_wJjQ5Yff6MwYhJVlIuu93rQi0diYih4AjJF6vuAemRmqwWmmj9wy42J0rWBEcvt4ZVDps8OUsueC_CZpa8gRpbXn5cLupfXPOS0',
      quantity: 1
    },
    {
      id: 'note-lipstick-08',
      title: 'رژ لب جامد مات و مخملی سری اولترا ریچ',
      brand: 'Note Cosmetics',
      volume: 'رز مخملی (شماره ۰۸)',
      price: 465000,
      originalPrice: 580000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_eZiEKiK-BbCQujLQIGBQp6H7qEVDyqXoOGqOcMzA98nSoE5EBM4lsb25u-o9t8YifByTII09NQh_rvi_3fctLMn33NTkN4AQ4topivWDK1nQ2EYo6OF1Q4l3BIDyP6zOum5nfPNnSP1HwslPOUwKfx9fHGI28yA1P4ImUUcduCXtyM1hQRK-5sx7VHiAo_AhlcUeuULM3pZNnEB13zOwODBPJSnmGTq7JM2nVJsG13-NPRltkRdR',
      quantity: 1
    }
  ];

  function getCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultItems));
        return defaultItems;
      }
      return JSON.parse(data) || [];
    } catch (e) {
      return defaultItems;
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      updateUI();
    } catch (e) {
      console.error(e);
    }
  }

  function addItem(item) {
    const cart = getCart();
    const existingIndex = cart.findIndex(i => i.id === item.id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += (item.quantity || 1);
    } else {
      cart.push({
        id: item.id,
        title: item.title,
        brand: item.brand || 'Veloraa',
        volume: item.volume || 'استاندارد',
        price: Number(item.price),
        originalPrice: Number(item.originalPrice || item.price),
        image: item.image,
        quantity: item.quantity || 1
      });
    }
    saveCart(cart);
    showToast(`«${item.title}» به سبد خرید افزوده شد ✨`, 'success');
    openDrawer();
  }

  function removeItem(id) {
    let cart = getCart();
    const found = cart.find(i => i.id === id);
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    if (found) {
      showToast(`«${found.title}» از سبد حذف شد`, 'info');
    }
  }

  function updateQty(id, newQty) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) {
      if (newQty <= 0) {
        removeItem(id);
      } else {
        item.quantity = newQty;
        saveCart(cart);
      }
    }
  }

  function clearCart() {
    saveCart([]);
    showToast('سبد خرید با موفقیت تخلیه شد', 'info');
  }

  function calculateTotals() {
    const cart = getCart();
    let subtotal = 0;
    let originalTotal = 0;
    let itemCount = 0;

    cart.forEach(item => {
      subtotal += item.price * item.quantity;
      originalTotal += item.originalPrice * item.quantity;
      itemCount += item.quantity;
    });

    const discount = Math.max(0, originalTotal - subtotal);
    const shipping = (subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0) ? 0 : 45000;
    const finalTotal = subtotal + shipping;

    return {
      subtotal,
      originalTotal,
      discount,
      shipping,
      finalTotal,
      itemCount,
      freeShippingEligible: subtotal >= FREE_SHIPPING_THRESHOLD
    };
  }

  // Toast Notification
  function showToast(message, type = 'info') {
    let toast = document.getElementById('veloraa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'veloraa-toast';
      toast.className = 'fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 z-50 max-w-md bg-[#30252B] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium border border-[#EADDE1]/20 transition-all duration-300 transform translate-y-16 opacity-0 pointer-events-none';
      document.body.appendChild(toast);
    }

    const iconMap = {
      success: 'check_circle',
      error: 'error',
      info: 'spa'
    };

    toast.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="material-symbols-outlined text-[#D88FA7] text-[20px]">${iconMap[type] || 'info'}</span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.classList.add('translate-y-16', 'opacity-0', 'pointer-events-none')" class="text-white/60 hover:text-white">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    `;

    toast.classList.remove('translate-y-16', 'opacity-0', 'pointer-events-none');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.add('translate-y-16', 'opacity-0', 'pointer-events-none');
    }, 3500);
  }

  // Update Drawer and Header Badges
  function updateUI() {
    const totals = calculateTotals();
    const cart = getCart();

    // Update Header Badge
    document.querySelectorAll('.cart-badge-count').forEach(el => {
      el.textContent = toPersianDigits(totals.itemCount);
      if (totals.itemCount > 0) {
        el.classList.remove('hidden');
      }
    });

    // Update Drawer Elements if open/rendered
    const container = document.getElementById('drawer-cart-items');
    const emptyState = document.getElementById('drawer-cart-empty');
    const footer = document.getElementById('drawer-cart-footer');

    if (container && emptyState && footer) {
      if (cart.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        footer.classList.add('hidden');
      } else {
        emptyState.classList.add('hidden');
        footer.classList.remove('hidden');

        container.innerHTML = cart.map(item => `
          <div class="flex items-center gap-3 p-3 rounded-2xl bg-[#FFFCF8] border border-[#EADDE1] hover:border-[#D88FA7] transition-all">
            <div class="w-16 h-20 rounded-xl overflow-hidden bg-white border border-[#EADDE1] flex-shrink-0 p-1">
              <img src="${item.image}" alt="${item.title}" class="w-full h-full object-contain" />
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-[10px] font-bold text-[#D88FA7] tracking-wider uppercase">${item.brand}</span>
              <h4 class="text-xs sm:text-sm font-bold text-[#30252B] truncate mt-0.5">${item.title}</h4>
              <span class="text-[11px] text-[#776B70] block">${item.volume}</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-xs sm:text-sm font-bold text-[#913B60]">${formatToman(item.price)}</span>
                <span class="text-[10px] text-[#776B70]">تومان</span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2 flex-shrink-0">
              <button onclick="VeloraaCart.removeItem('${item.id}')" class="text-[#776B70] hover:text-[#BA1A1A] transition-colors p-1" title="حذف کالا">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
              <div class="flex items-center bg-white border border-[#EADDE1] rounded-full p-0.5 shadow-xs">
                <button onclick="VeloraaCart.updateQty('${item.id}', ${item.quantity + 1})" class="w-6 h-6 rounded-full bg-[#F8E9EE] hover:bg-[#F0D3DC] text-[#512B3A] flex items-center justify-center transition-colors">
                  <span class="material-symbols-outlined text-[13px]">add</span>
                </button>
                <span class="w-7 text-center font-bold text-xs text-[#30252B]">${toPersianDigits(item.quantity)}</span>
                <button onclick="VeloraaCart.updateQty('${item.id}', ${item.quantity - 1})" class="w-6 h-6 rounded-full bg-[#F8E9EE] hover:bg-[#F0D3DC] text-[#512B3A] flex items-center justify-center transition-colors">
                  <span class="material-symbols-outlined text-[13px]">remove</span>
                </button>
              </div>
            </div>
          </div>
        `).join('');

        // Subtotal & Shipping summary in drawer
        const subtotalEl = document.getElementById('drawer-subtotal');
        const discountEl = document.getElementById('drawer-discount');
        const shippingEl = document.getElementById('drawer-shipping');
        const finalEl = document.getElementById('drawer-final-total');
        const thresholdMsg = document.getElementById('drawer-shipping-threshold');

        if (subtotalEl) subtotalEl.textContent = `${formatToman(totals.subtotal)} تومان`;
        if (discountEl) discountEl.textContent = `${formatToman(totals.discount)} تومان`;
        if (shippingEl) {
          shippingEl.textContent = totals.shipping === 0 ? 'رایگان' : `${formatToman(totals.shipping)} تومان`;
          shippingEl.className = totals.shipping === 0 ? 'text-[#913B60] font-bold' : 'text-[#30252B] font-bold';
        }
        if (finalEl) finalEl.textContent = formatToman(totals.finalTotal);

        if (thresholdMsg) {
          if (totals.freeShippingEligible) {
            thresholdMsg.innerHTML = `
              <span class="text-[#2E7D32] flex items-center gap-1 font-bold text-[11px]">
                <span class="material-symbols-outlined text-[16px]">verified</span>
                تبریک! ارسال رایگان شامل این سفارش شد.
              </span>
            `;
          } else {
            const diff = FREE_SHIPPING_THRESHOLD - totals.subtotal;
            thresholdMsg.innerHTML = `
              <span class="text-[#776B70] text-[11px]">
                فقط <strong class="text-[#913B60]">${formatToman(diff)} تومان</strong> دیگر تا دریافت ارسال رایگان ولورا
              </span>
            `;
          }
        }
      }
    }
  }

  // Slide-over Drawer Open/Close
  function openDrawer() {
    const drawer = document.getElementById('veloraa-cart-drawer');
    const backdrop = document.getElementById('veloraa-cart-backdrop');
    if (drawer && backdrop) {
      updateUI();
      backdrop.classList.remove('hidden');
      setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        drawer.classList.remove('translate-x-full');
      }, 10);
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById('veloraa-cart-drawer');
    const backdrop = document.getElementById('veloraa-cart-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('translate-x-full');
      backdrop.classList.add('opacity-0');
      setTimeout(() => {
        backdrop.classList.add('hidden');
        document.body.style.overflow = '';
      }, 300);
    }
  }

  // Direct Telegram Order Workflow
  function openTelegramOrderModal(singleProduct = null) {
    const modal = document.getElementById('veloraa-telegram-modal');
    if (!modal) return;

    let itemsToOrder = [];
    if (singleProduct) {
      itemsToOrder = [{
        title: singleProduct.title,
        brand: singleProduct.brand || 'Veloraa',
        price: singleProduct.price,
        volume: singleProduct.volume || 'استاندارد',
        quantity: 1
      }];
    } else {
      itemsToOrder = getCart();
    }

    if (itemsToOrder.length === 0) {
      showToast('سبد خرید شما خالی است! لطفاً ابتدا کالایی را انتخاب کنید.', 'error');
      return;
    }

    let subtotal = 0;
    itemsToOrder.forEach(i => subtotal += i.price * i.quantity);
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 45000;
    const finalTotal = subtotal + shipping;

    // Render items list inside modal
    const itemsPreview = document.getElementById('tg-modal-items-list');
    if (itemsPreview) {
      itemsPreview.innerHTML = itemsToOrder.map((item, idx) => `
        <div class="flex items-center justify-between text-xs py-1.5 border-b border-[#EADDE1]/60">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-4 h-4 rounded-full bg-[#F8E9EE] text-[#913B60] text-[10px] font-bold flex items-center justify-center">${toPersianDigits(idx + 1)}</span>
            <span class="truncate font-medium text-[#30252B]">${item.title}</span>
            <span class="text-[#776B70] text-[11px]">(${toPersianDigits(item.quantity)} عدد)</span>
          </div>
          <span class="font-bold text-[#913B60] whitespace-nowrap">${formatToman(item.price * item.quantity)} تومان</span>
        </div>
      `).join('');
    }

    const totalEl = document.getElementById('tg-modal-final-total');
    if (totalEl) totalEl.textContent = `${formatToman(finalTotal)} تومان`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    closeDrawer();
  }

  function closeTelegramOrderModal() {
    const modal = document.getElementById('veloraa-telegram-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function submitTelegramOrder() {
    const nameInput = document.getElementById('tg-customer-name');
    const phoneInput = document.getElementById('tg-customer-phone');
    const addressInput = document.getElementById('tg-customer-address');
    const noteInput = document.getElementById('tg-customer-note');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    const note = noteInput ? noteInput.value.trim() : '';

    if (!name || !phone) {
      showToast('لطفاً نام و شماره تماس خود را وارد نمایید.', 'error');
      if (!name && nameInput) nameInput.focus();
      else if (!phone && phoneInput) phoneInput.focus();
      return;
    }

    const cart = getCart();
    let subtotal = 0;
    let itemsText = '';

    cart.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      itemsText += `${index + 1}. ${item.title} (${item.volume}) - ${item.quantity} عدد (${formatToman(lineTotal)} تومان)\n`;
    });

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 'رایگان' : '۴۵,۰۰۰ تومان';
    const finalAmount = subtotal >= FREE_SHIPPING_THRESHOLD ? subtotal : subtotal + 45000;

    const message = 
`✨ درخواست سفارش جدید از وب‌سایت ولورا شاپ (Veloraa) ✨
━━━━━━━━━━━━━━━━━━━━
🛍️ اقلام انتخابی:
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💵 جمع اقلام: ${formatToman(subtotal)} تومان
🚚 هزینه ارسال: ${shipping}
💎 مبلغ نهایی قابل پرداخت: ${formatToman(finalAmount)} تومان
━━━━━━━━━━━━━━━━━━━━
👤 مشخصات تحویل‌گیرنده:
• نام و نام خانوادگی: ${name}
• شماره تماس: ${phone}
• نشانی پستی: ${address || 'جهت هماهنگی در چت ارسال می‌شود'}
${note ? `• توضیحات: ${note}\n` : ''}━━━━━━━━━━━━━━━━━━━━
با تشکر از تیم پشتیبانی ولورا؛ منتظر تایید سفارش هستم.`;

    const encodedText = encodeURIComponent(message);
    const tgUrl = `https://t.me/${TELEGRAM_HANDLE}?text=${encodedText}`;

    // Open Telegram in new window/tab
    window.open(tgUrl, '_blank');

    closeTelegramOrderModal();
    showToast('سفارش شما در تلگرام آماده شد. در حال انتقال به تلگرام...', 'success');

    // Show persistent success confirmation modal
    openSuccessModal(name, phone, finalAmount);
  }

  function openSuccessModal(name, phone, total) {
    const modal = document.getElementById('veloraa-success-modal');
    if (!modal) return;
    const refCode = 'VEL-' + Math.floor(10000 + Math.random() * 90000);
    const codeEl = document.getElementById('success-modal-code');
    const nameEl = document.getElementById('success-modal-name');
    const totalEl = document.getElementById('success-modal-total');

    if (codeEl) codeEl.textContent = refCode;
    if (nameEl) nameEl.textContent = name;
    if (totalEl) totalEl.textContent = `${formatToman(total)} تومان`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeSuccessModal() {
    const modal = document.getElementById('veloraa-success-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // Wishlist Handling
  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function toggleWishlist(item) {
    let wishlist = getWishlist();
    const idx = wishlist.findIndex(w => w.id === item.id);
    if (idx > -1) {
      wishlist.splice(idx, 1);
      showToast(`«${item.title}» از علاقه‌مندی‌ها حذف شد`, 'info');
    } else {
      wishlist.push(item);
      showToast(`«${item.title}» به علاقه‌مندی‌ها اضافه شد ❤️`, 'success');
    }
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    updateWishlistBadge();
  }

  function updateWishlistBadge() {
    const count = getWishlist().length;
    document.querySelectorAll('.wishlist-badge-count').forEach(el => {
      el.textContent = toPersianDigits(count);
    });
  }

  // Initialize drawer HTML if not already inserted
  function initDrawerMarkup() {
    if (document.getElementById('veloraa-cart-drawer')) return;

    const drawerHTML = `
      <!-- Cart Drawer Backdrop -->
      <div id="veloraa-cart-backdrop" onclick="VeloraaCart.closeDrawer()" class="fixed inset-0 z-50 drawer-backdrop opacity-0 hidden transition-opacity duration-300"></div>

      <!-- Cart Drawer Slide-over (RTL opens from right) -->
      <aside id="veloraa-cart-drawer" class="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[#FFFCF8] shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 ease-out border-l border-[#EADDE1]">
        <!-- Header -->
        <div class="p-5 border-b border-[#EADDE1] flex items-center justify-between bg-white">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-full bg-[#F8E9EE] text-[#913B60] flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">shopping_bag</span>
            </div>
            <div>
              <h3 class="text-base font-bold text-[#512B3A]">سبد خرید شما</h3>
              <span class="text-xs text-[#776B70]">انتخاب‌های لوکس و اصیل ولورا</span>
            </div>
          </div>
          <button onclick="VeloraaCart.closeDrawer()" class="p-2 rounded-full text-[#776B70] hover:text-[#30252B] hover:bg-[#F8E9EE] transition-colors" title="بستن">
            <span class="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <!-- Free shipping notice banner in drawer -->
        <div class="bg-[#F8E9EE] px-4 py-2.5 border-b border-[#EADDE1]" id="drawer-shipping-threshold">
          <!-- Filled dynamically -->
        </div>

        <!-- Items Container -->
        <div id="drawer-cart-items" class="flex-1 overflow-y-auto p-4 space-y-3">
          <!-- Rendered dynamically -->
        </div>

        <!-- Empty State -->
        <div id="drawer-cart-empty" class="hidden flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div class="w-16 h-16 rounded-full bg-[#F8E9EE] text-[#913B60] flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-[32px]">remove_shopping_cart</span>
          </div>
          <h4 class="text-base font-bold text-[#512B3A] mb-1">سبد خرید شما خالی است</h4>
          <p class="text-xs text-[#776B70] max-w-xs mb-5">از فروشگاه ولورا دیدن کنید و جدیدترین محصولات مراقبت پوست و عطر را به سبد اضافه کنید.</p>
          <a href="products.html" onclick="VeloraaCart.closeDrawer()" class="px-6 py-2.5 rounded-full bg-[#913B60] text-white text-xs font-bold hover:bg-[#782D4D] transition-colors shadow-sm">
            مشاهده محصولات فروشگاه
          </a>
        </div>

        <!-- Footer / Checkout Action -->
        <div id="drawer-cart-footer" class="p-5 border-t border-[#EADDE1] bg-white space-y-3">
          <div class="space-y-1.5 text-xs text-[#776B70]">
            <div class="flex justify-between items-center">
              <span>جمع اقلام:</span>
              <span id="drawer-subtotal" class="font-bold text-[#30252B]">۰ تومان</span>
            </div>
            <div class="flex justify-between items-center text-[#913B60]">
              <span>سود شما از تخفیف‌ها:</span>
              <span id="drawer-discount" class="font-bold">۰ تومان</span>
            </div>
            <div class="flex justify-between items-center">
              <span>هزینه ارسال:</span>
              <span id="drawer-shipping" class="font-bold text-[#913B60]">رایگان</span>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-[#EADDE1] text-sm text-[#30252B] font-bold">
              <span>مبلغ قابل پرداخت:</span>
              <div class="text-[#913B60]">
                <span id="drawer-final-total" class="text-lg font-extrabold">۰</span>
                <span class="text-xs font-normal mr-1">تومان</span>
              </div>
            </div>
          </div>

          <!-- Telegram Order Primary CTA -->
          <button onclick="VeloraaCart.openTelegramOrderModal()" class="w-full h-12 rounded-xl btn-telegram flex items-center justify-center gap-2 text-sm font-bold shadow-md">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 8.01-3.44 3.82-1.59 4.61-1.87 5.13-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.21-.04.38z"/></svg>
            <span>سفارش فوری از طریق تلگرام</span>
          </button>

          <!-- Standard Checkout Link -->
          <a href="contact.html#order" onclick="VeloraaCart.closeDrawer()" class="w-full h-11 rounded-xl bg-[#F8E9EE] hover:bg-[#F0D3DC] text-[#512B3A] border border-[#EADDE1] flex items-center justify-center gap-2 text-xs font-bold transition-colors">
            <span>تکمیل مشخصات و پرداخت اینترنتی</span>
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
          </a>
        </div>
      </aside>

      <!-- Telegram Direct Order Modal -->
      <div id="veloraa-telegram-modal" class="fixed inset-0 z-50 bg-[#30252B]/60 backdrop-blur-sm hidden items-center justify-center p-4">
        <div class="bg-white border border-[#EADDE1] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
          <button onclick="VeloraaCart.closeTelegramOrderModal()" class="absolute top-5 left-5 text-[#776B70] hover:text-[#30252B] p-1 rounded-full hover:bg-[#F8E9EE] transition-colors">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>

          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-2xl bg-[#229ED9]/10 text-[#229ED9] flex items-center justify-center">
              <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 8.01-3.44 3.82-1.59 4.61-1.87 5.13-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.21-.04.38z"/></svg>
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-bold text-[#512B3A]">ثبت مستقیم سفارش در تلگرام ولورا</h3>
              <p class="text-xs text-[#776B70]">پاسخگویی سریع توسط مشاوران ارشد فروشگاه</p>
            </div>
          </div>

          <!-- Items list summary -->
          <div class="bg-[#FFFCF8] border border-[#EADDE1] rounded-2xl p-3.5 mb-4 max-h-36 overflow-y-auto">
            <div id="tg-modal-items-list" class="space-y-1"></div>
            <div class="flex justify-between items-center pt-2 mt-2 border-t border-[#EADDE1] text-xs font-bold">
              <span>مبلغ نهایی سفارش:</span>
              <span id="tg-modal-final-total" class="text-[#913B60]">۰ تومان</span>
            </div>
          </div>

          <!-- Customer details input -->
          <div class="space-y-3 mb-5 text-right">
            <div>
              <label class="block text-xs font-semibold text-[#512B3A] mb-1">نام و نام خانوادگی <span class="text-[#BA1A1A]">*</span></label>
              <input id="tg-customer-name" type="text" placeholder="مثال: سارا محمدی" class="w-full h-11 px-3.5 rounded-xl bg-[#FFFCF8] border border-[#EADDE1] text-xs text-[#30252B] focus:border-[#913B60] outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#512B3A] mb-1">شماره تماس جهت هماهنگی <span class="text-[#BA1A1A]">*</span></label>
              <input id="tg-customer-phone" type="tel" dir="ltr" placeholder="۰۹۱۲۳۴۵۶۷۸۹" class="w-full h-11 px-3.5 rounded-xl bg-[#FFFCF8] border border-[#EADDE1] text-xs text-[#30252B] focus:border-[#913B60] outline-none text-right" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#512B3A] mb-1">نشانی یا شهر مقصد (اختیاری)</label>
              <input id="tg-customer-address" type="text" placeholder="مثال: تهران، زعفرانیه" class="w-full h-11 px-3.5 rounded-xl bg-[#FFFCF8] border border-[#EADDE1] text-xs text-[#30252B] focus:border-[#913B60] outline-none" />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button onclick="VeloraaCart.submitTelegramOrder()" class="flex-1 h-12 rounded-xl btn-telegram flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-md">
              <span class="material-symbols-outlined text-[18px]">send</span>
              <span>ارسال سفارش به تلگرام ولورا (@${TELEGRAM_HANDLE})</span>
            </button>
            <button onclick="VeloraaCart.closeTelegramOrderModal()" class="px-4 h-12 rounded-xl bg-[#F8E9EE] text-[#512B3A] text-xs font-bold hover:bg-[#F0D3DC] transition-colors">
              انصراف
            </button>
          </div>
        </div>
      </div>

      <!-- Order Success Notification Modal -->
      <div id="veloraa-success-modal" class="fixed inset-0 z-50 bg-[#30252B]/60 backdrop-blur-sm hidden items-center justify-center p-4">
        <div class="bg-white border border-[#EADDE1] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-center">
          <button onclick="VeloraaCart.closeSuccessModal()" class="absolute top-5 left-5 text-[#776B70] hover:text-[#30252B] p-1 rounded-full hover:bg-[#F8E9EE] transition-colors">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div class="w-16 h-16 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto mb-4 ring-8 ring-[#E8F5E9]/50">
            <span class="material-symbols-outlined text-[34px]">verified</span>
          </div>
          <span class="text-xs bg-[#F8E9EE] text-[#913B60] px-3 py-1 rounded-full font-bold">ثبت موفق درخواست</span>
          <h3 class="text-xl font-extrabold text-[#512B3A] mt-3 mb-1.5">سفارش شما در تلگرام ثبت گردید!</h3>
          <p class="text-xs text-[#776B70] leading-relaxed mb-5">
            کارشناس فروش ولورا پیام سفارش شما را بررسی کرده و هماهنگی‌های لازم برای بسته‌بندی لوکس و ارسال فوری را با شما انجام خواهد داد.
          </p>
          <div class="bg-[#FFFCF8] border border-[#EADDE1] rounded-2xl p-4 text-xs text-right space-y-2 mb-5">
            <div class="flex justify-between items-center text-[#776B70]">
              <span>کد پیگیری مرسوله:</span>
              <strong id="success-modal-code" class="text-[#913B60] font-sans font-bold">VEL-84920</strong>
            </div>
            <div class="flex justify-between items-center text-[#776B70]">
              <span>تحویل‌گیرنده:</span>
              <strong id="success-modal-name" class="text-[#30252B]">سارا محمدی</strong>
            </div>
            <div class="flex justify-between items-center text-[#776B70]">
              <span>مبلغ کل فاکتور:</span>
              <strong id="success-modal-total" class="text-[#913B60]">۰ تومان</strong>
            </div>
          </div>
          <button onclick="VeloraaCart.closeSuccessModal()" class="w-full py-3 bg-[#913B60] hover:bg-[#782D4D] text-white text-xs font-bold rounded-xl transition-all shadow-sm">
            متوجه شدم، بازگشت به سایت
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerHTML);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initDrawerMarkup();
      updateUI();
      updateWishlistBadge();
    });
  } else {
    initDrawerMarkup();
    updateUI();
    updateWishlistBadge();
  }

  return {
    getCart,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    calculateTotals,
    openDrawer,
    closeDrawer,
    openTelegramOrderModal,
    closeTelegramOrderModal,
    submitTelegramOrder,
    closeSuccessModal,
    toggleWishlist,
    showToast,
    formatToman,
    toPersianDigits
  };
})();

// Attach to window
window.VeloraaCart = VeloraaCart;
