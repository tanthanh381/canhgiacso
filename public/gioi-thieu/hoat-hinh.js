const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const seg=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const back=x=>{const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const TOTAL=38;
// scene windows [in, out]
const S={s1:[0,6.2],s2:[6.0,11.4],s3:[11.2,18.4],s4:[18.2,23.6],s5:[23.4,30.4],s6:[30.2,34.4],s7:[34.2,38.5]};
function env(t,[a,b]){return eo(seg(t,a,a+.6))*(1-eio(seg(t,b-.5,b)))}
function show(el,o,dy=0,sc=1){el.style.opacity=o;el.style.transform=`translateY(${dy}px) scale(${sc})`}

// background: drifting network
const c=$('#bg'),g=c.getContext('2d');let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const N=[...Array(70)].map(()=>({x:rnd()*1920,y:rnd()*1080,vx:(rnd()-.5)*18,vy:(rnd()-.5)*18}));
function bg(t,alarm){
  const gr=g.createRadialGradient(960,540,100,960,540,1200);
  gr.addColorStop(0,`rgb(${20+40*alarm},${22},${38})`);gr.addColorStop(1,'#06080f');
  g.fillStyle=gr;g.fillRect(0,0,1920,1080);
  const P=N.map(n=>({x:(n.x+n.vx*t+1920*4)%1920,y:(n.y+n.vy*t+1080*4)%1080}));
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const dx=P[i].x-P[j].x,dy=P[i].y-P[j].y,d=Math.hypot(dx,dy);
    if(d<210){g.strokeStyle=`rgba(${alarm>0?255:120},${alarm>0?80:150},${alarm>0?100:220},${(1-d/210)*.16})`;g.lineWidth=1.2;g.beginPath();g.moveTo(P[i].x,P[i].y);g.lineTo(P[j].x,P[j].y);g.stroke();}}
  P.forEach(p=>{g.fillStyle='rgba(190,200,230,.35)';g.beginPath();g.arc(p.x,p.y,2.2,0,7);g.fill()});
}

function render(t){
  const stampP=seg(t,3.6,3.9);
  bg(t,stampP*(1-seg(t,5.6,6.2))*.6);
  for(const k in S){$('#'+k).style.opacity=env(t,S[k])}

  // S1
  ['#m1','#m2','#m3'].forEach((s,i)=>{const p=back(seg(t,.4+i*.7,.9+i*.7));show($(s),seg(t,.4+i*.7,.7+i*.7),(1-p)*-60,.9+.1*p)});
  const st=$('#stamp');const sp=seg(t,3.6,3.85);st.style.opacity=sp;st.style.transform=`translate(-50%,-50%) rotate(-14deg) scale(${1+1.6*(1-eo(sp))})`;
  const tx=$('.s1text');show(tx,seg(t,.8,1.6),(1-eo(seg(t,.8,1.6)))*30);
  const ph=$('.phone');ph.style.transform=`translateX(${Math.sin(t*40)*6*seg(t,3.6,3.7)*(1-seg(t,3.7,4.1))}px)`;

  // S2
  const lp=back(seg(t,6.3,7.2));$('#shield').style.transform=`scale(${.4+.6*lp}) rotate(${(1-lp)*-25}deg)`;
  $('#chk').style.strokeDashoffset=140*(1-eo(seg(t,7.0,7.7)));
  show($('.wm'),seg(t,6.6,7.3),0,1);$('.wm').style.transform=`translateX(${(1-eo(seg(t,6.6,7.4)))*60}px)`;
  const tg=$('.tag');tg.style.opacity=seg(t,7.6,8.3);tg.style.letterSpacing=(.7-.28*eo(seg(t,7.6,8.6)))+'em';
  show($('#s2 .sub'),seg(t,8.4,9.1),(1-eo(seg(t,8.4,9.2)))*24);

  // S3
  show($('#s3 h2'),seg(t,11.3,11.9),(1-eo(seg(t,11.3,12)))*30);
  $$('#s3 .card').forEach((el,i)=>{const a=12.0+i*1.1,p=eo(seg(t,a,a+.6));show(el,p,(1-p)*80,1);
    el.style.borderColor=t>a&&t<a+1.6?`rgba(255,59,82,${1-seg(t,a+.6,a+1.6)})`:'#252f47'});

  // S4
  show($('#s4 h2'),seg(t,18.4,19),(1-eo(seg(t,18.4,19.1)))*30);
  $$('#s4 .chip').forEach((el,i)=>{const a=19.0+i*.22,p=back(seg(t,a,a+.5));show(el,seg(t,a,a+.25),(1-p)*40,.7+.3*p)});

  // S5
  show($('#s5 h2'),seg(t,23.6,24.2),(1-eo(seg(t,23.6,24.3)))*30);
  show($('.search'),seg(t,24.0,24.5),(1-eo(seg(t,24.0,24.6)))*30);
  const url='https://xac-minh-tk.vip/login';const n=Math.floor(url.length*seg(t,24.6,26.4));$('#typed').textContent=url.slice(0,n);
  $('#cur').style.opacity=(Math.floor(t*2.5)%2||t<26.4)?1:0;
  const rp=back(seg(t,26.8,27.3));show($('#res'),seg(t,26.8,27.1),(1-rp)*-20,.94+.06*rp);
  $$('.tool').forEach((el,i)=>{const a=27.8+i*.25;show(el,seg(t,a,a+.4),(1-eo(seg(t,a,a+.5)))*24)});

  // S6
  show($('#s6 h2'),seg(t,30.4,31),(1-eo(seg(t,30.4,31.1)))*30);
  $$('.stat').forEach((el,i)=>{const a=30.8+i*.25,p=eo(seg(t,a,a+1.4));el.style.opacity=seg(t,a,a+.3);
    const sp=el.querySelector('span');sp.textContent=Math.round(+sp.dataset.to*p)});

  // S7
  $$('.steps span').forEach((el,i)=>{const a=34.5+i*.45,p=eo(seg(t,a,a+.4));el.style.opacity=p;el.style.display='inline-block';el.style.transform=`translateY(${(1-p)*30}px)`});
  const up=back(seg(t,36.0,36.6));show($('#url'),seg(t,36.0,36.3),0,.8+.2*up);
  show($('.cta'),seg(t,36.6,37.2),(1-eo(seg(t,36.6,37.3)))*20);
  $('#s7').style.opacity=eo(seg(t,34.2,34.8));
  const urlLive=t>=36.0;$('#url').style.pointerEvents=urlLive?'auto':'none';$('#url').tabIndex=urlLive?0:-1;

  $('#brandlogo').style.opacity=.92*cl(t/.6);
  $('#bar').style.width=(100*cl(t/TOTAL))+'%';
}

// Own clock so the embedding page can pause; loops after holding the final scene.
// Reduced motion: start on the final, static scene and draw nothing until the visitor presses play.
const LOOP=TOTAL+4, FINAL=37.5;
const reduceQuery=matchMedia('(prefers-reduced-motion: reduce)');
let clock=reduceQuery.matches?FINAL:0, last=null, playing=!reduceQuery.matches, raf=0;
// The frame loop only runs while playing, so a paused or reduced-motion animation costs no CPU.
function tick(ms){
  raf=0;
  if(!playing){last=null;return}
  if(last!==null)clock+=Math.min(ms-last,100)/1000;
  last=ms;
  if(clock>LOOP)clock=0;
  render(clock);
  raf=requestAnimationFrame(tick);
}
function startLoop(){if(!raf){last=null;raf=requestAnimationFrame(tick)}}
function announce(){if(parent!==window)parent.postMessage({type:'cgs-about-anim',playing},location.origin)}
function setPlaying(next){playing=next;if(playing){if(clock>=LOOP-.05)clock=0;startLoop()}announce()}
reduceQuery.addEventListener('change',e=>{if(e.matches){playing=false;clock=FINAL;render(clock);announce()}});
addEventListener('message',e=>{
  if(e.origin!==location.origin||e.data?.type!=='cgs-about-anim')return;
  if(e.data.action==='toggle')setPlaying(!playing);
  else if(e.data.action==='pause')setPlaying(false);
  else if(e.data.action==='play')setPlaying(true);
  else if(e.data.action==='status')announce();
});
function fit(){document.documentElement.style.setProperty('--fit',Math.min(innerWidth/1920,innerHeight/1080))}
addEventListener('resize',fit);fit();
render(clock);announce();
if(playing)startLoop();
