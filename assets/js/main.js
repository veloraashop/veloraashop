/**
 * Veloraa Luxury Atelier - Main Interactive JavaScript
 * Powers navigation, mobile drawer, quick-view modal, search, filter interactions, and animations
 */

const VeloraaApp = (function() {
  // Comprehensive product directory for interactive quick-view and card interactions
  const PRODUCTS_CATALOG = [];
  // Initialize
  function init() {
    setupActiveNavigation();
    setupMobileMenu();
    setupQuickViewModal();
    setupSearchHandlers();
    setupFAQAccordions();
  }

  // Active navigation highlight based on current HTML file
  function setupActiveNavigation() {
    const currentPath = window.location.pathname;
    let pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
    if (pageName === '') pageName = 'index.html';

    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === pageName || (pageName === 'index.html' && (href === '/' || href === '#' || href === 'index.html'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Mobile Menu Drawer
  function setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('mobile-menu-close');
    const drawer = document.getElementById('mobile-menu-drawer');
    const backdrop = document.getElementById('mobile-menu-backdrop');

    if (!toggleBtn || !drawer || !backdrop) return;

    function openMobileMenu() {
      backdrop.classList.remove('hidden');
      setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        drawer.classList.remove('translate-x-full');
      }, 10);
      document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
      drawer.classList.add('translate-x-full');
      backdrop.classList.add('opacity-0');
      setTimeout(() => {
        backdrop.classList.add('hidden');
        document.body.style.overflow = '';
      }, 300);
    }

    toggleBtn.addEventListener('click', openMobileMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMobileMenu);
    backdrop.addEventListener('click', closeMobileMenu);
  }

  // Quick View Modal
  function setupQuickViewModal() {
    let modal = document.getElementById('veloraa-quickview-modal');
    if (!modal) {
      const modalHTML = `
        <div id="veloraa-quickview-modal" class="fixed inset-0 z-50 bg-[#30252B]/60 backdrop-blur-sm hidden items-center justify-center p-4">
          <div class="bg-white border border-[#EADDE1] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onclick="VeloraaApp.closeQuickView()" class="absolute top-5 left-5 text-[#776B70] hover:text-[#30252B] p-1.5 rounded-full hover:bg-[#F8E9EE] transition-colors">
              <span class="material-symbols-outlined text-[22px]">close</span>
            </button>
            <div id="quickview-content" class="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
              <!-- Content rendered dynamically -->
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
  }

  function openQuickView(productId) {
    const product = PRODUCTS_CATALOG.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('veloraa-quickview-modal');
    const content = document.getElementById('quickview-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="sm:col-span-5 aspect-[4/5] rounded-2xl bg-[#FFFCF8] border border-[#EADDE1] overflow-hidden flex items-center justify-center p-4 relative">
        <img src="${product.image}" alt="${product.title}" class="w-full h-full object-contain" />
        ${product.discount > 0 ? `
          <span class="absolute top-3 right-3 bg-[#913B60] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
            ${VeloraaCart.toPersianDigits(product.discount)}٪ تخفیف
          </span>
        ` : ''}
      </div>
      <div class="sm:col-span-7 flex flex-col justify-between text-right">
        <div>
          <span class="text-xs font-bold text-[#D88FA7] uppercase tracking-wider">${product.brand}</span>
          <h3 class="text-base sm:text-lg font-bold text-[#512B3A] mt-1 mb-2 leading-snug">${product.title}</h3>
          
          <div class="flex items-center gap-2 mb-3 text-xs">
            <div class="flex items-center text-amber-500 gap-0.5">
              <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">star</span>
              <span class="font-bold text-[#30252B]">${VeloraaCart.toPersianDigits(product.rating)}</span>
            </div>
            <span class="text-[#776B70]">(${VeloraaCart.toPersianDigits(product.reviewsCount)} دیدگاه تاییدشده)</span>
          </div>

          <p class="text-xs sm:text-sm text-[#776B70] leading-relaxed mb-4">${product.description}</p>

          <div class="flex flex-wrap gap-1.5 mb-4">
            ${(product.features || []).map(f => `
              <span class="text-[11px] bg-[#F8E9EE] text-[#512B3A] px-2.5 py-1 rounded-full font-medium">✓ ${f}</span>
            `).join('')}
          </div>

          <div class="p-3.5 rounded-xl bg-[#F8E9EE] flex items-baseline justify-between mb-5">
            <div>
              <span class="text-[11px] text-[#776B70] block">قیمت محصول:</span>
              <div class="flex items-baseline gap-1 text-[#913B60]">
                <span class="text-xl font-extrabold">${VeloraaCart.formatToman(product.price)}</span>
                <span class="text-xs font-normal text-[#776B70]">تومان</span>
              </div>
            </div>
            ${product.originalPrice > product.price ? `
              <div class="text-left">
                <span class="text-xs line-through text-[#776B70] block">${VeloraaCart.formatToman(product.originalPrice)}</span>
                <span class="text-[11px] text-[#2E7D32] font-bold">سود شما: ${VeloraaCart.formatToman(product.originalPrice - product.price)} تومان</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <button onclick="VeloraaCart.addItem({ id: '${product.id}', title: '${product.title}', brand: '${product.brand}', price: ${product.price}, originalPrice: ${product.originalPrice}, image: '${product.image}', volume: '${product.volume}' }); VeloraaApp.closeQuickView();" class="w-full h-12 rounded-xl bg-[#913B60] hover:bg-[#782D4D] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md">
            <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
            <span>افزودن به سبد خرید</span>
          </button>
          <button onclick="VeloraaCart.openTelegramOrderModal({ id: '${product.id}', title: '${product.title}', brand: '${product.brand}', price: ${product.price}, volume: '${product.volume}' }); VeloraaApp.closeQuickView();" class="w-full h-11 rounded-xl btn-telegram text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 8.01-3.44 3.82-1.59 4.61-1.87 5.13-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.21-.04.38z"/></svg>
            <span>سفارش مستقیم این کالا در تلگرام</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeQuickView() {
    const modal = document.getElementById('veloraa-quickview-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // Search Handlers
  function setupSearchHandlers() {
    document.querySelectorAll('.global-search-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        if (input && input.value.trim()) {
          window.location.href = `products.html?q=${encodeURIComponent(input.value.trim())}`;
        }
      });
    });
  }

  // FAQ Accordions
  function setupFAQAccordions() {
    document.querySelectorAll('.faq-accordion-header').forEach(header => {
      header.addEventListener('click', function() {
        const body = this.nextElementSibling;
        const icon = this.querySelector('.faq-icon');
        const isOpen = !body.classList.contains('hidden');

        // Close other accordions in the same group if desired
        const group = this.closest('.faq-group');
        if (group) {
          group.querySelectorAll('.faq-accordion-body').forEach(b => b.classList.add('hidden'));
          group.querySelectorAll('.faq-icon').forEach(i => i.classList.remove('rotate-180', 'text-[#913B60]'));
        }

        if (isOpen) {
          body.classList.add('hidden');
          if (icon) icon.classList.remove('rotate-180', 'text-[#913B60]');
        } else {
          body.classList.remove('hidden');
          if (icon) icon.classList.add('rotate-180', 'text-[#913B60]');
        }
      });
    });
  }

  // Routine Explorer Tabs switcher (on about.html)
  function switchRoutineTab(type) {
    const tabs = ['glow', 'hydrate', 'calm'];
    tabs.forEach(t => {
      const btn = document.getElementById('tab-' + t);
      const panel = document.getElementById('content-' + t);
      if (btn && panel) {
        if (t === type) {
          btn.className = 'routine-btn px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all bg-[#913B60] text-white shadow-sm';
          panel.classList.remove('hidden');
        } else {
          btn.className = 'routine-btn px-5 py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all bg-white text-[#776B70] hover:text-[#913B60] border border-[#EADDE1]';
          panel.classList.add('hidden');
        }
      }
    });
  }

  // Copy to clipboard helper
  function copyText(text, successMsg = 'کپی شد!') {
    navigator.clipboard.writeText(text).then(() => {
      VeloraaCart.showToast(successMsg, 'success');
    }).catch(() => {
      VeloraaCart.showToast(text, 'info');
    });
  }

  // Auto-init on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    PRODUCTS_CATALOG,
    openQuickView,
    closeQuickView,
    switchRoutineTab,
    copyText
  };
})();

window.VeloraaApp = VeloraaApp;
