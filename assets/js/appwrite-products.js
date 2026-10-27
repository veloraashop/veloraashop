
/* Veloraa Shop - Appwrite Products */
(function () {
  "use strict";

  const PAGE_SIZE = 100;

  async function loadProducts() {
    const backend = window.VeloraaAppwrite;

    if (!backend || !backend.client) {
      throw new Error("Appwrite client is not ready.");
    }

    if (!window.Appwrite) {
      throw new Error("Appwrite SDK is not loaded.");
    }

    const { TablesDB, Query } = window.Appwrite;

    const tablesDB =
      backend.tablesDB ||
      new TablesDB(backend.client);

    const config = backend.config || {};

    const databaseId =
      config.databaseId || config.databaseID;

    const tableId =
      config.productsTableId || config.productsTableID;

    if (!databaseId || !tableId) {
      throw new Error("Appwrite database/table configuration is missing.");
    }

    const result = await tablesDB.listRows({
      databaseId,
      tableId,
      queries: [
        Query.limit(PAGE_SIZE)
      ]
    });

    return (result.rows || [])
      .filter(product => product.isActive === true)
      .map(product => ({
        id: product.$id,
        name: product.name || "",
        price: Number(product.price || 0),
        oldPrice: Number(
          product.oldPrice ??
          product.originalPrice ??
          0
        ),
        description: product.description || "",
        image: product.image || "",
        category: product.category || "",
        stock: Number(product.stock || 0),
        discount: Number(product.discount || 0)
      }));
  }

  window.VeloraaProducts = {
    load: loadProducts
  };
})();

