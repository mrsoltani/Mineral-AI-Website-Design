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

  // forms: validation + honeypot (sending endpoint is wired at deploy time)
  [].forEach.call(d.querySelectorAll('form.form'),function(f){
    f.addEventListener('submit',function(ev){
      ev.preventDefault();
      var msg=f.querySelector('.form-msg');
      if(f.querySelector('.hp input').value){return;}
      var bad=[].filter.call(f.querySelectorAll('[required]'),function(i){return !i.value.trim();});
      var em=f.querySelector('input[type=email]');
      if(bad.length||(em&&em.value&&!/^\S+@\S+\.\S+$/.test(em.value))){msg.textContent=f.dataset.err;return;}
      var ep=f.dataset.endpoint;
      if(!ep){msg.textContent=f.dataset.ok;f.reset();return;}
      fetch(ep,{method:'POST',body:new FormData(f)}).then(function(r){if(!r.ok)throw 0;msg.textContent=f.dataset.ok;f.reset();}).catch(function(){msg.textContent=f.dataset.err;});
    });
  });

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
