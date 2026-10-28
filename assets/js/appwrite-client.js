/**
 * Veloraa Shop — Appwrite Client
 * File: assets/js/appwrite-client.js
 */

(function () {
  "use strict";

  const CONFIG = Object.freeze({
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "6ae08864001fc9ef3c89",
    databaseId: "6ae0897600198d7df87d",
    productsTableId: "products",
    profilesTableId: "profiles",
    adminApiUrl: "https://starter-function-bzit.fra.appwrite.run/"
  });

  const AppwriteSDK = window.Appwrite;

  if (!AppwriteSDK) {
    console.error("[Veloraa] Appwrite SDK is missing.");
    return;
  }

  const client = new AppwriteSDK.Client()
    .setEndpoint(CONFIG.endpoint)
    .setProject(CONFIG.projectId);

  const account = new AppwriteSDK.Account(client);
  const tablesDB = new AppwriteSDK.TablesDB(client);

  async function getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      if (error && error.code === 401) return null;
      throw error;
    }
  }

  async function createJWT() {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("ابتدا وارد حساب کاربری خود شوید.");
    }

    const result = await account.createJWT();

    if (!result || !result.jwt) {
      throw new Error("دریافت JWT از Appwrite ناموفق بود.");
    }

    return result.jwt;
  }

  async function adminRequest({
    url = CONFIG.adminApiUrl,
    method = "GET",
    body
  } = {}) {
    if (!url) {
      throw new Error("آدرس Admin API تنظیم نشده است.");
    }

    const jwt = await createJWT();

    const headers = {
      Authorization: "Bearer " + jwt,
      Accept: "application/json"
    };

    const options = {
      method: method.toUpperCase(),
      headers
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();

    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const error = new Error(
        data.error || data.message || `خطای درخواست: ${response.status}`
      );

      error.status = response.status;
      throw error;
    }

    return data;
  }

  window.VeloraaAppwrite = Object.freeze({
    client,
    account,
    tablesDB,
    config: CONFIG,
    getCurrentUser,
    createJWT,
    adminRequest
  });

  console.info("[Veloraa] Appwrite client initialized.");
})();
