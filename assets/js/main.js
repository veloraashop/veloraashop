/**
 * Veloraa Luxury Atelier - Main Interactive JavaScript
 * Powers navigation, mobile drawer, quick-view modal, search, filter interactions, and animations
 */

const VeloraaApp = (function() {
  // Comprehensive product directory for interactive quick-view and card interactions
  const PRODUCTS_CATALOG = [
    {
      id: 'ord-niacinamide',
      title: 'سرم نیاسینامید ۱۰٪ + زینک ۱٪ اوردینری ضد جوش و لک',
      brand: 'The Ordinary',
      category: 'skincare',
      skinType: 'oily',
      price: 784000,
      originalPrice: 980000,
      discount: 20,
      rating: 4.8,
      reviewsCount: 142,
      inStock: true,
      volume: '۳۰ میلی‌لیتر',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDud6dr4UnRSHUZRFKu0pAWDoprkbsOC0PKJEUw9xFRUJ48ZHX0Cf3PAEIhlXHf_YvDbYSH1SzO0c3QX0nyvGTxjIy4bpzIIj-ND-WZNIg_-8pUF9AOTfnVNx7RHKi7m0w-BnJizVo6rI9wdwQZ5SgzokPEmFywmnHnklFw4zvP89fCiVYkOGx-yffXH1WH-z6VmlnfoaJ4CnhaQimqu2i8KXemLtcVrmTj9leDnY7Amw_Um7MM3w69',
      description: 'سرم فوق‌العاده مؤثر نیاسینامید (ویتامین B3) و زینک PCA جهت کنترل ترشح سبوم، بستن منافذ باز پوست و کاهش لکه‌ها و التهابات پوستی بدون اثر خشکی.',
      features: ['کنترل چربی و منافذ', 'فاقد الکل و چربی', 'تولید کانادا']
    },
    {
      id: 'cerave-cleanser',
      title: 'ژل شستشوی آبرسان صورت سراوی مخصوص پوست خشک و نرمال',
      brand: 'CeraVe',
      category: 'skincare',
      skinType: 'dry',
      price: 1150000,
      originalPrice: 1150000,
      discount: 0,
      rating: 4.9,
      reviewsCount: 280,
      inStock: true,
      volume: '۲۳۶ میلی‌لیتر',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAA_fFK9c4CSkNEHegFa6pun_nkf8ahTajPXEKCQL-E7AH6c0OMa43QLMZ8eEHibY7M4fhaMWVyTIWq_9EGSQQ5N06PxKdDYruHm9KxdsjgVxHUrD8qP3LHhhqZTCv-PRnITkRkw5ZEQO4-YXs_GoqFtDbq-fJRnrNH3PJUUM_C3rKC4B2fVsvrHI-UfMRuZlYHzjd4q4GoNhJkvVJB_TMJ7Y3xeDvV5Y42uMQIOMW7jWggaZmZTu8D',
      description: 'پاک‌کننده فاقد کف آسیب‌رسان توسعه‌یافته با درماتولوژیست‌ها، حاوی ۳ سرامید اساسی و هیالورونیک اسید برای حفظ رطوبت طبیعی پوست.',
      features: ['تکنولوژی MVE', 'فاقد اسانس', 'ضمانت اصالت فرانسه']
    },
    {
      id: 'note-lipstick-08',
      title: 'رژ لب جامد مات و مخملی سری اولترا ریچ نوت',
      brand: 'Note Cosmetics',
      category: 'makeup',
      skinType: 'all',
      price: 465000,
      originalPrice: 580000,
      discount: 20,
      rating: 4.9,
      reviewsCount: 92,
      inStock: true,
      volume: 'رز مخملی (شماره ۰۸)',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYxye9pO3ZHM8NFRXm0QKr1mAOvtrL5S0d_OJeeTUp9wc1PiGEanIYxhcDNsEnCBsjqzKXNtyUdyDdRkSFOZFSopb17HKR5Hc3SsiaVaOaXUkESM5HlRozkKf_z2_tF00g4Xl0S0P4holoj-rC8mHn5ISpBaoCzr92jy84x8XZzlL0ckizCQhoaFiLPI1caBbPI8-dwbP9R1bCVdUV2xwCxnG-KSNSFOMwDQHTo0TL0TcwoA5t1tnt',
      description: 'بافت مخملی غنی با پیگمنت فوق‌العاده بالا، بدون پوسته‌پوسته کردن لب حاوی روغن ماکادمیا و ویتامین E با ماندگاری ۱۲ ساعته.',
      features: ['ماندگاری ۱۲ ساعته', 'فاقد پارابن', 'غنی‌شده با روغن‌های گیاهی']
    },
    {
      id: 'cinere-sunscreen',
      title: 'کرم ضدآفتاب بدون رنگ SPF50 سینره فاقد چربی و سبک',
      brand: 'Cinere',
      category: 'skincare',
      skinType: 'oily',
      price: 442000,
      originalPrice: 520000,
      discount: 15,
      rating: 4.6,
      reviewsCount: 96,
      inStock: true,
      volume: '۵۰ میلی‌لیتر',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASqYmFmP_oAVLzm5CigPokfR3mVrXuvNdiF8gL88gBx1WgPJp8ty_cg3Ql6CtdPYat-rmgwHCdzkgiOS8G8BHYxXF7FnR4KKrqUPHTDtOpIYJipwD3ul0t1_6WaPiZZOPRMyqgiOXWGGT7aYJaqe19MUkom-D7osyTmhEvP843bSWk0ZhJhiYXbaYyr1GrE-ZSVQhJTaBfLklprVNi-vn0TQ4NksmuJeXy1Ct6JZgecz1blRyi4MIu',
      description: 'محافظت پیشرفته در برابر اشعه‌های UVA و UVB با بافت ژل کرم فلوییدی زودجذب بدون هیچ‌گونه رد سفیدی و برق چربی.',
      features: ['ضد پیری زودرس', 'مات‌کننده', 'مقاوم در برابر تعریق']
    },
    {
      id: 'maybelline-skyhigh',
      title: 'ریمل حجم‌دهنده و بلندکننده اسکای های میبلین کربنی',
      brand: 'Maybelline',
      category: 'makeup',
      skinType: 'all',
      price: 890000,
      originalPrice: 890000,
      discount: 0,
      rating: 4.9,
      reviewsCount: 310,
      inStock: true,
      volume: 'مشکی کربنی',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCttSxbjo4YCOixVKvo7ZpKlgP4D_C3x_wmSfwW9cUTVVnDGH1ndtlLvxtMVUNxxd-87QncPrqxGVFycWRJAKWfRT54E7C9ms3lTsQQAKK9YLjQDSMDK7SVHSYFW5xoba8DD2BJVQ71svNOC-obJcgNx0azqPsRqlvxBjxVuMXmM4smDViP5DnciNDUzC2XI_Ge_iNR8rKjA8iKR5yA_g4ZAYE_1suPVfnssMHzyuXJKMGM65DSZmTz',
      description: 'برس انعطاف‌پذیر با الیاف نانو برای بلند کردن تک‌تک مژه‌ها تا آسمان بدون ریزش زیر چشم یا ایجاد احساس سنگینی.',
      features: ['تست شده توسط چشم‌پزشکان', 'مناسب چشم‌های حساس', 'بدون ریزش']
    },
    {
      id: 'loreal-revitalift',
      title: 'سرم آبرسان عمقی و ضدچروک رویتالیفت هیالورونیک اسید لورال',
      brand: "L'Oréal",
      category: 'skincare',
      skinType: 'dry',
      price: 1305000,
      originalPrice: 1450000,
      discount: 10,
      rating: 4.7,
      reviewsCount: 167,
      inStock: true,
      volume: '۳۰ میلی‌لیتر',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABmf5ZEDnUH5Rbf7DGchga3gqgZeV6TWwWfSLqPPenrLAbmV47hrkox4HuwzOfAJCWKMYKEwSOAaKwVDLj2HRjV7FQ-3k2dirgOAsrTvECb1AOja4tmBf4qdA1yOtqvRur0EnoKtc1SnnJ4DELkiLJ2jbPpp4SwlcFR0tEZ9pO4mEtOIjjbjBSBqPeejWHOPWdlOXEjddZNU9jV751aX0iELSlMPMFZ8ax_y2LdtLigbraSiNmeF7-',
      description: 'غلظت ۱.۵٪ خالص هیالورونیک اسید برای کاهش ۴۷ درصدی چروک‌های سطحی ظرف مدت ۶ هفته مصرف منظم.',
      features: ['جذب فوری', 'پوست پر و شاداب', 'تاییدیه درماتولوژی']
    },
    {
      id: 'veloraa-parfum-rose',
      title: 'ادوپرفیوم نیش «رز مخملی و عود دمشقی» ولورا',
      brand: 'Veloraa Atelier',
      category: 'fragrance',
      skinType: 'all',
      price: 3450000,
      originalPrice: 3450000,
      discount: 0,
      rating: 5.0,
      reviewsCount: 41,
      inStock: true,
      volume: '۱۰۰ میلی‌لیتر (ادوپرفیوم)',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLnJDUN8L8HwAaKF51y1f08r45VoyQieqjx6R9V0a1HsmjamUd2m7ye5Y7_OVxBWhveRvOYffjXr3iBW1OJ-ojxRlw69LenIs0mcdR-9tPK0txRCTHrB9wHZGYK141HLfzG-xTg45Cy4_Y9k-qoMD70wnnvdQTLsBSCjOwR99d_WscN2Q6FiQcCt_ruqDlYDzgUs69KmtT-oFRwugbyTZenl3ALk4iTwrLQr8Vj5BUWi_TBFSj_61b',
      description: 'شاهکار اختصاصی عطرسازی نیش با نت‌های آغازین رز دمشقی، نکتار ترنج، قلب یاس سفید و پایه عود اصیل و کهربای گرم.',
      features: ['پخش بوی استثنایی', 'ماندگاری ۴۸ ساعته', 'بطری کریستال دست‌ساز']
    },
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
