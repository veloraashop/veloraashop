
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

    const { Query } = window.Appwrite;
    const { databaseId, productsTableId } = backend.config;

    const tablesDB = backend.tablesDB;

    if (!tablesDB || !databaseId || !productsTableId) {
      throw new Error("Appwrite database/table configuration is missing.");
    }

    const result = await tablesDB.listRows({
      databaseId,
      tableId: productsTableId,
      queries: [Query.limit(PAGE_SIZE)]
    });

    return (result.rows || [])
      .filter(product => product.isActive === true)
      .map(product => {
        const id = product.$id || product.$rowId || "";

        if (!id) {
          console.error("Product has no Appwrite row ID:", product);
        }

        return {
          id,
          $id: id,
          name: product.name || "",
          title: product.name || "",
          brand: product.brand || "Veloraa",
          price: Number(product.price || 0),
          oldPrice: Number(
            product.oldPrice ??
            product.originalPrice ??
            product.price ??
            0
          ),
          originalPrice: Number(
            product.originalPrice ??
            product.oldPrice ??
            product.price ??
            0
          ),
          description: product.description || "",
          image: product.image || "",
          category: product.category || "other",
          stock: Number(product.stock || 0),
          discount: Number(product.discount || 0),
          inStock: Number(product.stock || 0) > 0,
          remote: true
        };
      });
  }

  window.VeloraaProducts = {
    load: loadProducts
  };
})();
