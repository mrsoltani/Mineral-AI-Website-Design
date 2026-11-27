(function(){
  var d=document, root=d.documentElement;
  root.classList.remove('no-js');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // header
  var hd=d.querySelector('.site-header');
  function onScroll(){ if(hd) hd.classList.toggle('is-solid', window.scrollY>40); }
  onScroll(); window.addEventListener('scroll',onScroll,{passive:true});
  var tg=d.querySelector('.menu-toggle'), nav=d.querySelector('.nav');
  if(tg&&nav){ tg.addEventListener('click',function(){var o=nav.classList.toggle('is-open');tg.setAttribute('aria-expanded',o);}); }

  // scroll progress + pattern parallax + card spotlight
  var bar=d.querySelector('.progress'), pars=[].slice.call(d.querySelectorAll('.pattern')), secs=[].slice.call(d.querySelectorAll('main .section'));
  if(reduce) secs.forEach(function(sc){sc.classList.add('seam-in');});
  function onScroll2(){
    var h=root.scrollHeight-innerHeight; if(bar) bar.style.transform='scaleX('+(h>0?scrollY/h:0)+')';
    if(!reduce) secs.forEach(function(sc){var r=sc.getBoundingClientRect(); if(r.bottom<-200||r.top>innerHeight+200)return; sc.style.setProperty('--sp',((r.top+r.height/2-innerHeight/2)/innerHeight).toFixed(3)); if(r.top<innerHeight*.85) sc.classList.add('seam-in');});
    if(!reduce) pars.forEach(function(p){var r=p.parentElement.getBoundingClientRect(); p.style.transform=(p.classList.contains('pattern--start')?'scaleX(-1) ':'')+'translateY('+((r.top+r.height/2-innerHeight/2)*-0.06).toFixed(1)+'px)';});
  }
  onScroll2(); addEventListener('scroll',onScroll2,{passive:true});
  d.addEventListener('pointermove',function(ev){var c=ev.target.closest&&ev.target.closest('.card'); if(!c)return; var r=c.getBoundingClientRect(); c.style.setProperty('--mx',(ev.clientX-r.left)+'px'); c.style.setProperty('--my',(ev.clientY-r.top)+'px');},{passive:true});

  // reveal
  var els=[].slice.call(d.querySelectorAll('.reveal'));
  if('IntersectionObserver' in window && !reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);}});},{threshold:.12});
    els.forEach(function(e){io.observe(e);});
  } else els.forEach(function(e){e.classList.add('is-in');});

  // نمودار معماری: برجسته‌کردن گره متناظر با مؤلفه‌ای که در حال خواندن است
  var arch=d.querySelector('svg.arch'), items=[].slice.call(d.querySelectorAll('[data-hl]'));
  if(arch&&items.length){
    var cur=null;
    var set=function(n){
      if(n===cur) return; cur=n;
      [].forEach.call(arch.querySelectorAll('[data-n]'),function(g){g.classList.toggle('on',g.getAttribute('data-n')===n);});
      items.forEach(function(it){it.classList.toggle('is-active',it.getAttribute('data-hl')===n);});
    };
    var upd=function(){
      var mid=innerHeight*0.45, best=null, bd=1e9;
      items.forEach(function(it){var r=it.getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight) return; var dd=Math.abs(r.top+Math.min(r.height,160)/2-mid); if(dd<bd){bd=dd;best=it;}});
      set(best?best.getAttribute('data-hl'):null);
    };
    var tick=false;
    addEventListener('scroll',function(){ if(!tick){tick=true;requestAnimationFrame(function(){tick=false;upd();});} },{passive:true});
    items.forEach(function(it){ it.addEventListener('mouseenter',function(){set(it.getAttribute('data-hl'));}); });
    upd();
  }

  // منوی موبایل پس از انتخاب لینک بسته شود
  if(tg&&nav){ nav.addEventListener('click',function(ev){ if(ev.target.closest('a')){nav.classList.remove('is-open');tg.setAttribute('aria-expanded','false');} }); }

  // geology canvas: strata, probability cloud, boreholes
  [].forEach.call(d.querySelectorAll('canvas[data-geo]'),function(cv){
    var ctx=cv.getContext('2d'), W,H,dpr, pts=[], t0=performance.now(), vis=true, raf;
    var mini=cv.dataset.geo==='mini';
    function rnd(seed){var s=seed;return function(){s=(s*16807)%2147483647;return s/2147483647;};}
    function init(){
      dpr=Math.min(window.devicePixelRatio||1,2);
      var r=cv.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height);
      cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      var R=rnd(7); pts=[];
      var n=(W<700||mini)?260:520;
      for(var i=0;i<n;i++){ // gaussian-ish cloud around target
        var a=(R()+R()+R()+R()-2)/2, b=(R()+R()+R()+R()-2)/2;
        pts.push({x:a,y:b,z:R(),p:R()*6.28});
      }
    }
    function strata(t){
      var cols=['#13214A','#101B3E','#0E1936','#0C1634'];
      for(var k=0;k<5;k++){
        var y0=H*(0.34+k*0.13), amp=H*0.025;
        ctx.beginPath(); ctx.moveTo(0,H);
        for(var x=0;x<=W;x+=12){
          var y=y0+Math.sin(x*0.006+k*1.3+t*0.0002)*amp+Math.sin(x*0.013+k)*amp*0.5;
          ctx.lineTo(x,y);
        }
        ctx.lineTo(W,H); ctx.closePath();
        ctx.fillStyle=cols[k%4]; ctx.fill();
        ctx.strokeStyle=k%2?'rgba(135,72,39,.55)':'rgba(197,165,88,.35)'; ctx.lineWidth=1; ctx.stroke();
      }
    }
    function frame(now){
      var t=now-t0; ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#0B1533'; ctx.fillRect(0,0,W,H);
      strata(t);
      // contour rings
      var cx=W*(mini?0.5:(root.dir==='rtl'?0.3:0.7)), cy=H*0.62, sc=Math.min(W,H)*(mini?0.32:0.28);
      ctx.strokeStyle='rgba(212,189,132,.14)'; ctx.lineWidth=1;
      for(var r=1;r<=5;r++){ctx.beginPath();ctx.ellipse(cx,cy,sc*r*0.55,sc*r*0.22,0,0,6.283);ctx.stroke();}
      // boreholes
      var holes=[-0.9,-0.1,0.55,1.1];
      holes.forEach(function(h,i){
        var x=cx+h*sc*0.9, len=H*(0.5+0.1*i%0.3)*(0.6+0.4*Math.min(1,((t/1800)+i*0.4)%3));
        var top=cy-sc*0.55;
        ctx.strokeStyle='rgba(197,165,88,.8)'; ctx.lineWidth=1.5; ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(x,top); ctx.lineTo(x+h*6,Math.min(H,top+len*0.8)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle='#C5A558'; ctx.beginPath(); ctx.arc(x,top,3,0,6.283); ctx.fill();
      });
      // probability cloud
      for(var i=0;i<pts.length;i++){
        var p=pts[i], tw=0.5+0.5*Math.sin(t*0.0015+p.p);
        var x=cx+p.x*sc*1.9, y=cy+p.y*sc*0.9+p.z*sc*0.25;
        var dist=Math.sqrt(p.x*p.x+p.y*p.y*2);
        var a=Math.max(0,1-dist)*0.9*tw;
        ctx.fillStyle='rgba(212,189,132,'+a.toFixed(3)+')';
        ctx.beginPath(); ctx.arc(x,y,1+p.z*1.8,0,6.283); ctx.fill();
      }
      if(!reduce && vis) raf=requestAnimationFrame(frame);
    }
    cv._stop=function(){cv._dead=true;vis=false;cancelAnimationFrame(raf);};
    init(); frame(performance.now());
    window.addEventListener('resize',function(){init(); if(reduce||!vis)frame(performance.now());});
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){var v=es[0].isIntersecting; if(cv._dead){return;} if(v&&!vis&&!reduce){vis=true;raf=requestAnimationFrame(frame);} vis=v;}).observe(cv);
    }
  });
})();

// ===== حالت نمایش، زبان و تعامل‌های صفحه تیم =====
(function(){
  var d=document, root=d.documentElement, S=null; try{S=window.localStorage;}catch(e){}
  var mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
  var sw=d.querySelector('.theme-switch');

  // حالت نمایش: light | dark | system — ذخیره در localStorage، اعمال روی <html data-theme>
  function resolved(p){ return p==='dark'||(p==='system'&&mq&&mq.matches)?'dark':'light'; }
  function paint(p, animate){
    var r=resolved(p), prev=root.getAttribute('data-theme');
    if(animate&&prev!==r){ root.classList.add('theme-anim'); clearTimeout(paint._t); paint._t=setTimeout(function(){root.classList.remove('theme-anim');},650); }
    root.setAttribute('data-theme',r); root.setAttribute('data-theme-pref',p);
    if(sw){ [].forEach.call(sw.querySelectorAll('[data-theme-set]'),function(b,i){var on=b.getAttribute('data-theme-set')===p; b.setAttribute('aria-pressed',on); if(on) sw.style.setProperty('--ts',i);}); }
    if(prev!==r){ try{ d.dispatchEvent(new CustomEvent('sp:theme',{detail:{dark:r==='dark'}})); }catch(e){} }
  }
  var pref=root.getAttribute('data-theme-pref')||'system';
  paint(pref,false);
  if(sw) sw.addEventListener('click',function(ev){var b=ev.target.closest('[data-theme-set]'); if(!b) return; pref=b.getAttribute('data-theme-set'); try{S&&S.setItem('sp-theme',pref);}catch(e){} paint(pref,true);});
  if(mq){ var onSys=function(){ if(pref==='system') paint('system',true); }; mq.addEventListener?mq.addEventListener('change',onSys):mq.addListener(onSys); }

  // زبان: ذخیره انتخاب و حفظ موقعیت خواندن هنگام تغییر زبان
  var secs=function(){return [].slice.call(d.querySelectorAll('main > section'));};
  [].forEach.call(d.querySelectorAll('.lang-switch a'),function(a){
    a.addEventListener('click',function(ev){
      var lang=a.getAttribute('data-lang'); try{S&&S.setItem('sp-lang',lang);}catch(e){}
      if(a.getAttribute('aria-current')){ev.preventDefault();return;}
      var list=secs(), y=window.scrollY+80, idx=0, f=0;
      list.forEach(function(s,i){ if(s.offsetTop<=y){ idx=i; f=(y-s.offsetTop)/Math.max(1,s.offsetHeight); } });
      try{ sessionStorage.setItem('sp-pos',JSON.stringify({p:new URL(a.href,location.href).pathname,i:idx,f:Math.min(1,f)})); }catch(e){}
    });
  });
  try{
    var pos=JSON.parse(sessionStorage.getItem('sp-pos')||'null');
    if(pos&&pos.p===location.pathname&&!location.hash){
      sessionStorage.removeItem('sp-pos');
      var go=function(){ var s=secs()[pos.i]; if(!s) return; var sb=root.style.scrollBehavior; root.style.scrollBehavior='auto'; window.scrollTo(0,Math.max(0,s.offsetTop+pos.f*s.offsetHeight-80)); root.style.scrollBehavior=sb; };
      if('scrollRestoration' in history) history.scrollRestoration='manual';
      var run2=function(){ go(); setTimeout(go,350); };
      if(d.readyState==='complete') run2(); else window.addEventListener('load',run2);
    }
  }catch(e){}
  // اگر کاربر بدون کلیک روی انتخابگر وارد صفحه شد، زبان فعلی را ترجیح او نگیریم؛ فقط انتخاب صریح ذخیره می‌شود.

  // دیاگرام هم‌افزایی: برجسته‌سازی گره و یال‌های مرتبط با اشاره یا فوکوس (و فهرست راهنما)
  var syn=d.querySelector('svg.synergy'), leg=[].slice.call(d.querySelectorAll('.syn-legend li'));
  if(syn){
    var act=function(i){ if(i==null){syn.removeAttribute('data-active');} else syn.setAttribute('data-active',i); leg.forEach(function(li){li.classList.toggle('is-on',li.getAttribute('data-i')===String(i));}); };
    [].forEach.call(syn.querySelectorAll('.sy-node'),function(n){ var i=n.getAttribute('data-i'); ['mouseenter','focus'].forEach(function(ev){n.addEventListener(ev,function(){act(i);});}); ['mouseleave','blur'].forEach(function(ev){n.addEventListener(ev,function(){act(null);});}); });
    leg.forEach(function(li){ li.addEventListener('mouseenter',function(){act(li.getAttribute('data-i'));}); li.addEventListener('mouseleave',function(){act(null);}); });
  }
})();

// صفحه اصلی: ناوبری شناور شیشه‌ای روی صحنه‌های تیره؛ روی بخش‌های روشن، نوار تیره برای خوانایی
(function(){
  var d=document, root=d.documentElement; if(!d.body.classList.contains('is-home')) return;
  var hd=d.querySelector('.site-header'), secs=[].slice.call(d.querySelectorAll('[data-tone]'));
  function tone(){
    var y=44, cur=null;
    for(var i=0;i<secs.length;i++){ var r=secs[i].getBoundingClientRect(); if(r.top<=y&&r.bottom>y){ cur=secs[i]; } }
    var t=cur?cur.getAttribute('data-tone'):'auto';
    var light=t==='auto'&&root.getAttribute('data-theme')!=='dark';
    var past=window.scrollY>innerHeight*0.6;
    hd.classList.toggle('over-light',light); hd.classList.toggle('past-hero',past&&!light&&t!=='dark'?true:past&&!light);
  }
  var tk=false; addEventListener('scroll',function(){ if(!tk){tk=true;requestAnimationFrame(function(){tk=false;tone();});} },{passive:true});
  d.addEventListener('sp:theme',tone); addEventListener('resize',tone); tone();
})();
