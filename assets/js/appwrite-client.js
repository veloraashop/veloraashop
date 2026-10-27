/* Veloraa Shop - Appwrite Client */
(function () {
  "use strict";

  if (!window.Appwrite) {
    console.error("Appwrite SDK بارگذاری نشده است.");
    return;
  }

  const CONFIG = {
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "6ae08864001fc9ef3c89",
    databaseId: "veloraa-shop-db",
    productsTableId: "products",
    profilesTableId: "profiles"
  };

  if (
    CONFIG.endpoint.includes("YOUR_") ||
    CONFIG.projectId === "YOUR_PROJECT_ID"
  ) {
    console.error("اطلاعات اتصال Appwrite هنوز تنظیم نشده است.");
    return;
  }

  const client = new window.Appwrite.Client()
    .setEndpoint(CONFIG.endpoint)
    .setProject(CONFIG.projectId);

  const account = new window.Appwrite.Account(client);
  const tablesDB = new window.Appwrite.TablesDB(client);

  
window.VeloraaAppwrite = {
  client,
  account,
  tablesDB,
  config: Object.freeze({ ...CONFIG }),

  async testProductsConnection() {
    return await tablesDB.listRows({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.productsTableId,
      queries: []
    });
  }
};

console.log("Veloraa Appwrite client آماده است.");

})();

