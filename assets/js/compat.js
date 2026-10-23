/* Veloraa Shop compatibility helpers for GitHub Pages */
(function () {
  'use strict';
  const base = (location.pathname.split('/').filter(Boolean)[0] || '');
  const routes = {
    cart: 'cart.html', basket: 'cart.html', checkout: 'checkout.html',
    account: 'account.html', profile: 'account.html', login: 'account.html',
    faq: 'faq.html', questions: 'faq.html', categories: 'categories.html',
    category: 'categories.html', support: 'support.html', help: 'support.html',
    shop: 'shop.html', products: 'products.html', product: 'product-details.html',
    about: 'about.html', contact: 'contact.html', home: 'index.html'
  };
  function routeFor(text) {
    const s = (text || '').trim().toLowerCase();
    if (/سبد خرید|تکمیل سفارش|مشاهده سبد/.test(s)) return routes.cart;
    if (/حساب کاربری|ورود|پروفایل|ثبت.?نام/.test(s)) return routes.account;
    if (/سوالات متداول|سؤالات متداول|پرسش.?های متداول|راهنما/.test(s)) return routes.faq;
    if (/دسته.?بندی/.test(s)) return routes.categories;
    if (/پشتیبانی|ارتباط با پشتیبانی/.test(s)) return routes.support;
    if (/فروشگاه|همه محصولات|مشاهده محصولات/.test(s)) return routes.shop;
    if (/درباره ما/.test(s)) return routes.about;
    if (/تماس با ما|تماس/.test(s)) return routes.contact;
    return null;
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href="#"], a[href=""], a[href^="javascript:"]').forEach(function(a) {
      const target = routeFor(a.textContent);
      if (target) a.setAttribute('href', target);
    });
    document.querySelectorAll('a[href*="public/assets/aistudio/"], a[href*="code_"]').forEach(function(a) {
      const target = routeFor(a.textContent);
      if (target) a.setAttribute('href', target);
    });
    document.querySelectorAll('button').forEach(function(btn) {
      if (btn.dataset.veloraaRepairBound) return;
      const label = btn.textContent || btn.getAttribute('aria-label') || '';
      if (!btn.getAttribute('onclick') && !btn.closest('form')) {
        const target = routeFor(label);
        if (target && !/افزودن به سبد|افزودن به علاقه|حذف/.test(label)) {
          btn.addEventListener('click', function(){ location.href = target; });
        }
      }
      btn.dataset.veloraaRepairBound = '1';
    });
  });
})();