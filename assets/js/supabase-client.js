/* Configure with your Supabase Project URL and anon/public key. Never put service_role here. */
(function(){
  const CONFIG = {
    url: 'https://YOUR-PROJECT-REF.supabase.co',
    anonKey: 'sb_publishable_k2KyTS9aiQJY8JGxsi17eQ_ccYYXR-F'
  };
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.url) && !CONFIG.url.includes('YOUR-PROJECT') && CONFIG.anonKey && !CONFIG.anonKey.includes('YOUR_SUPABASE');
  window.VeloraaBackend = { config: CONFIG, configured, client: null };
  if (configured && window.supabase?.createClient) {
    window.VeloraaBackend.client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
})();
