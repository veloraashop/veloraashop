(function(){
  const B = window.VeloraaBackend;
  const $ = id => document.getElementById(id);
  function note(message, ok=false){
    const n=$('auth-message');
    if(n){n.textContent=message;n.className='notice '+(ok?'ok':'bad');n.hidden=false;}
  }
  function clientReady(){
    if(!B?.client){
      note('اتصال Supabase فعال نیست. فایل assets/js/supabase-client.js را بررسی کن و مطمئن شو آدرس پروژه و کلید عمومی واقعی در آن قرار دارد؛ فایل تنظیمات را با نسخه نمونه جایگزین نکن.');
      return false;
    }
    return true;
  }
  async function refresh(){
    if(!B?.client){$('auth-forms').hidden=false;$('profile-panel').hidden=true;return;}
    const {data,error}=await B.client.auth.getSession();
    if(error) throw error;
    const session=data.session;
    $('auth-forms').hidden=!!session;
    $('profile-panel').hidden=!session;
    if(!session)return;
    const {data:p,error:profileError}=await B.client.from('profiles').select('full_name,phone,role').eq('id',session.user.id).maybeSingle();
    if(profileError) throw profileError;
    $('profile-email').textContent=session.user.email||'';
    $('profile-name').value=p?.full_name||'';
    $('profile-phone').value=p?.phone||'';
    $('profile-role').textContent=p?.role==='admin'?'مدیر سایت':'مشتری';
    $('admin-link').hidden=p?.role!=='admin';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const loginForm=$('login-form');
    if(loginForm) loginForm.addEventListener('submit',async e=>{
      e.preventDefault();
      if(!clientReady())return;
      const btn=loginForm.querySelector('[type="submit"]');
      if(btn){btn.disabled=true;btn.textContent='در حال ورود…';}
      try{
        const email=$('login-email').value.trim();
        const password=$('login-password').value;
        const {data,error}=await B.client.auth.signInWithPassword({email,password});
        if(error) throw error;
        note('ورود موفق بود؛ در حال بررسی دسترسی…',true);
        const {data:profile,error:profileError}=await B.client.from('profiles').select('role').eq('id',data.user.id).maybeSingle();
        if(profileError) throw profileError;
        if(profile?.role==='admin'){
          location.href='admin.html';
          return;
        }
        await refresh();
        note('وارد شدی، اما این حساب دسترسی مدیریت ندارد.',false);
      }catch(err){
        console.error('Veloraa login error:',err);
        note(err?.message||'ورود انجام نشد. اتصال اینترنت و تنظیمات Supabase را بررسی کن.');
      }finally{
        if(btn){btn.disabled=false;btn.textContent='ورود به حساب';}
      }
    });
    const signupForm=$('signup-form');
    if(signupForm) signupForm.addEventListener('submit',async e=>{
      e.preventDefault();if(!clientReady())return;
      const btn=signupForm.querySelector('[type="submit"]');if(btn){btn.disabled=true;btn.textContent='در حال ثبت‌نام…';}
      try{
        const email=$('signup-email').value.trim(),password=$('signup-password').value,name=$('signup-name').value.trim();
        if(password.length<10) throw new Error('رمز عبور باید حداقل ۱۰ نویسه داشته باشد.');
        const {data,error}=await B.client.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;
        if(data.user){const {error:upsertError}=await B.client.from('profiles').upsert({id:data.user.id,full_name:name});if(upsertError)console.warn('Profile setup:',upsertError.message);}
        note('ثبت‌نام انجام شد. اگر تأیید ایمیل فعال باشد، ایمیلت را تأیید کن و سپس وارد شو.',true);
        if(data.session) await refresh();
      }catch(err){console.error('Veloraa signup error:',err);note(err?.message||'ثبت‌نام انجام نشد.');}
      finally{if(btn){btn.disabled=false;btn.textContent='ساخت حساب کاربری';}}
    });
    const profileForm=$('profile-form');
    if(profileForm) profileForm.addEventListener('submit',async e=>{
      e.preventDefault();if(!clientReady())return;
      try{const {data:{user},error:userError}=await B.client.auth.getUser();if(userError)throw userError;if(!user)throw new Error('ابتدا وارد حساب شو.');const {error}=await B.client.from('profiles').upsert({id:user.id,full_name:$('profile-name').value.trim(),phone:$('profile-phone').value.trim()});if(error)throw error;note('اطلاعات پروفایل ذخیره شد.',true);}catch(err){note(err?.message||'ذخیره اطلاعات ناموفق بود.');}
    });
    $('logout')?.addEventListener('click',async()=>{try{if(B?.client)await B.client.auth.signOut();await refresh();note('از حساب خارج شدی.',true);}catch(err){note(err?.message||'خروج ناموفق بود.');}});
    $('reset-password')?.addEventListener('click',async()=>{if(!clientReady())return;const email=$('login-email').value.trim();if(!email)return note('ابتدا ایمیل خودت را در کادر ورود بنویس.');try{const {error}=await B.client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;note('اگر این ایمیل ثبت شده باشد، لینک بازیابی برای آن ارسال می‌شود.',true);}catch(err){note(err?.message||'ارسال لینک بازیابی انجام نشد.');}});
    if(B?.client) B.client.auth.onAuthStateChange(()=>setTimeout(()=>refresh().catch(err=>note(err.message)),0));
    refresh().catch(err=>{console.error(err);note(err?.message||'بارگذاری حساب انجام نشد.');});
  });
})();
