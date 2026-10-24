/* Loads shared products from Supabase. Static catalogue remains available if not configured. */
(function(){
 const B=window.VeloraaBackend;
 const categoryMap={skincare:'skincare', makeup:'makeup', haircare:'haircare', fragrance:'fragrance', hygiene:'hygiene', tools:'tools', nails:'nails', bodycare:'bodycare', other:'other'};
 async function load(){
  if(!B?.client) return;
  const {data,error}=await B.client.from('products').select('*').eq('is_active',true).order('created_at',{ascending:false});
  if(error){console.warn('Veloraa products unavailable:',error.message);return;}
  const remote=(data||[]).map(p=>({id:p.id,title:p.name,brand:p.brand||'Veloraa',category:categoryMap[p.category]||p.category||'other',skinType:p.skin_type||'all',price:Number(p.sale_price??p.price),originalPrice:Number(p.price),discount:p.discount_percent||0,rating:Number(p.rating||5),reviewsCount:Number(p.reviews_count||0),inStock:Number(p.stock_quantity)>0,stock:Number(p.stock_quantity),volume:p.variant||'',image:p.image_url||'',description:p.description||'',features:Array.isArray(p.features)?p.features:[],remote:true}));
  if(window.VeloraaApp?.PRODUCTS_CATALOG){
   const catalog=window.VeloraaApp.PRODUCTS_CATALOG;
   const ids=new Set(remote.map(p=>String(p.id)));
   // Admin-managed items are authoritative and replace matching static IDs.
   for(let i=catalog.length-1;i>=0;i--) if(catalog[i].remote || ids.has(String(catalog[i].id))) catalog.splice(i,1);
   catalog.push(...remote);
   window.dispatchEvent(new CustomEvent('veloraa:products-updated',{detail:{products:remote}}));
  }
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load); else load();
})();
