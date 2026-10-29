/* Veloraa Shop - Appwrite Products */
(function () {
  "use strict";

  const PAGE_SIZE = 100;

  async function loadProducts() {
    const backend = window.VeloraaAppwrite;

    if (!backend || !backend.client || !backend.config) {
      throw new Error("Appwrite client is not ready.");
    }

    if (!window.Appwrite) {
      throw new Error("Appwrite SDK is not loaded.");
    }

    const { databaseId, productsTableId } = backend.config;
    const tablesDB = backend.tablesDB;

    if (!tablesDB || !databaseId || !productsTableId) {
      throw new Error("Appwrite database/table configuration is missing.");
    }

    const result = await tablesDB.listRows({
      databaseId,
      tableId: productsTableId,
      queries: [window.Appwrite.Query.limit(PAGE_SIZE)]
    });

    const rows = result.rows || [];

    console.log("[Veloraa] Appwrite rows:", rows.length);

    return rows
      .filter(product => {
        // پشتیبانی از نام قدیمی و نام واقعی ستون
        const active = product.is_active ?? product.isActive;

        // فقط محصولی را حذف کن که صریحاً غیرفعال است
        return active !== false && active !== 0;
      })
      .map(product => {
        const id =
          product.$id ||
          product.$rowId ||
          product.$sequence ||
          "";

        const price = Number(product.price || 0);
        const discount = Math.max(
          0,
          Math.min(
            100,
            Number(
              product.discount_percent ??
              product.discount ??
              0
            )
          )
        );

        const stock = Number(
          product.stock_quantity ??
          product.stock ??
          0
        );

        const originalPrice = Number(
          product.original_price ??
          product.originalPrice ??
          product.oldPrice ??
          price
        );

        const salePrice = Number(
          product.sale_price ??
          Math.round(price * (1 - discount / 100))
        );

        return {
          id,
          $id: id,
          name: product.name || "",
          title: product.name || "",
          brand: Array.isArray(product.brand)
            ? (product.brand[0] || "Veloraa")
            : (product.brand || "Veloraa"),
          category: product.category || "other",
          price: salePrice,
          sale_price: salePrice,
          originalPrice,
          oldPrice: originalPrice,
          discount,
          discount_percent: discount,
          stock,
          stock_quantity: stock,
          inStock: stock > 0,
          image: product.image_url || product.image || "",
          image_url: product.image_url || product.image || "",
          description: product.description || "",
          variant: product.variant || "",
          is_active: product.is_active ?? product.isActive ?? true,
          remote: true
        };
      });
  }

  window.VeloraaProducts = {
    load: loadProducts
  };
})();
