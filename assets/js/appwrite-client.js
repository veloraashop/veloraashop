/**
 * Veloraa Shop — Appwrite Client
 * File: assets/js/appwrite-client.js
 *
 * IMPORTANT:
 * - Never put an Appwrite API key in this file.
 * - The user must be logged in before creating a JWT.
 */

(function () {
  "use strict";

  const CONFIG = Object.freeze({
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "6ae08864001fc9ef3c89",
    databaseId: "6ae0897600198d7df87d",
    productsTableId: "products",
    profilesTableId: "profiles"
  });

  const AppwriteSDK = window.Appwrite;

  if (!AppwriteSDK) {
    console.error(
      "[Veloraa] Appwrite SDK is missing. Load the Appwrite Web SDK first."
    );
    return;
  }

  const client = new AppwriteSDK.Client()
    .setEndpoint(CONFIG.endpoint)
    .setProject(CONFIG.projectId);

  const account = new AppwriteSDK.Account(client);

  const tablesDB = new AppwriteSDK.TablesDB(client);

  /**
   * Return the current authenticated user.
   */
  async function getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      if (error && error.code === 401) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Create a short-lived JWT for the current session.
   * The token is returned to the caller, not printed to the console.
   */
  async function createJWT() {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Please sign in to your account first.");
    }

    const result = await account.createJWT();

    if (!result || !result.jwt) {
      throw new Error("Appwrite did not return a JWT.");
    }

    return result.jwt;
  }

  /**
   * Make an authenticated request to the Veloraa Admin API.
   * The API endpoint must be configured separately.
   */
  async function adminRequest({
    url,
    method = "GET",
    body
  }) {
    if (!url || typeof url !== "string") {
      throw new Error("Admin API URL is not configured.");
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
        data.error || data.message || `Request failed (${response.status})`
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
