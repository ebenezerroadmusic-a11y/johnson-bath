import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/RoomEnvironment.js';
import {Reflector} from 'three/addons/Reflector.js';
const F=0.3048,IN=0.0254,W=x=>x*F, CX=W(3),CZ=W(7.5);
const mobile=matchMedia('(pointer:coarse)').matches&&Math.min(innerWidth,innerHeight)<=820;
const dprCap=mobile?1.5:2;
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('gl'),antialias:!mobile,preserveDrawingBuffer:!mobile,powerPreference:mobile?'low-power':'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,dprCap));renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=mobile?THREE.PCFSoftShadowMap:THREE.VSMShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();const PAPER=new THREE.Color(0xf4f1ea),NIGHT=new THREE.Color(0x14161c);scene.background=PAPER;
const pmrem=new THREE.PMREMGenerator(renderer);const envTex=pmrem.fromScene(new RoomEnvironment(),0.04).texture;scene.environment=envTex;
const cam=new THREE.PerspectiveCamera(1,1,0.05,2000);
const cut=new THREE.Plane(new THREE.Vector3(0,-1,0),1.2),clip=[cut];
const hemi=new THREE.HemisphereLight(0xfff4e6,0xcfc4b2,1.2);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffdcb0,0);sun.position.set(CX-3,9,CZ+10);sun.target.position.set(CX,0,CZ-0.5);sun.castShadow=true;sun.shadow.mapSize.set(mobile?512:2048,mobile?512:2048);
Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:1,far:25});if(!mobile){sun.shadow.radius=6;sun.shadow.blurSamples=16;}else sun.shadow.radius=2;sun.shadow.bias=-0.0004;scene.add(sun,sun.target);
// ---------- textures ----------
const TL=new THREE.TextureLoader(),tc={};
function tex(name,rep){const k=name+rep;if(tc[k])return tc[k];const d=TL.load(`tex/${name}/diff.jpg`),n=TL.load(`tex/${name}/nor.jpg`);d.colorSpace=THREE.SRGBColorSpace;
 for(const t of[d,n]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);t.anisotropy=mobile?2:8;}return tc[k]={d,n};}
// procedural tile at true scale: tile tw x th inches (u x v), grout g inches, stagger 'u'|'v'|null; returns fn(surfaceW_m, surfaceH_m)->{map,bump}
// procedural honed marble (white, soft gray veining) used as the tile face source
const marbleImg=document.createElement('canvas');marbleImg.width=marbleImg.height=1024;
{const c=marbleImg.getContext('2d');c.fillStyle='#efede8';c.fillRect(0,0,1024,1024);let sd=3;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;
 for(let i=0;i<900;i++){c.fillStyle=`rgba(${200+r()*40|0},${198+r()*40|0},${192+r()*40|0},.05)`;c.beginPath();c.arc(r()*1024,r()*1024,20+r()*90,0,7);c.fill();}
 c.filter='blur(1.2px)';for(let v=0;v<26;v++){c.strokeStyle=`rgba(120,118,112,${.12+r()*.28})`;c.lineWidth=.6+r()*2.4;c.beginPath();let x=r()*1024,y=-20;c.moveTo(x,y);
  while(y<1044){x+=(r()-.5)*60+18;y+=20+r()*40;c.lineTo(x,y);}c.stroke();}c.filter='none';}
const imgReady=Promise.resolve();
function tileSet(tw,th,g,stagger,opt={}){const cols=opt.cols||Math.max(1,Math.round(48/tw)),rows=opt.rows||Math.max(1,Math.round(48/th));
 const ppi=opt.ppi||Math.min(24,2048/Math.max(cols*tw,rows*th));const Wp=Math.round(cols*tw*ppi),Hp=Math.round(rows*th*ppi);
 const cv=document.createElement('canvas');cv.width=Wp;cv.height=Hp;const bc=document.createElement('canvas');bc.width=Wp;bc.height=Hp;
 const map=new THREE.CanvasTexture(cv),bump=new THREE.CanvasTexture(bc);map.colorSpace=THREE.SRGBColorSpace;
 for(const t of[map,bump]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=mobile?2:8;}
 imgReady.then(()=>{const c=cv.getContext('2d'),b=bc.getContext('2d');c.fillStyle=opt.grout||'#cfcac2';c.fillRect(0,0,Wp,Hp);b.fillStyle='#000';b.fillRect(0,0,Wp,Hp);
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const gp=g*ppi;
  const cell=(x,y,w,h)=>{for(const dx of[-Wp,0,Wp])for(const dy of[-Hp,0,Hp]){const X=x+dx,Y=y+dy;if(X>Wp||Y>Hp||X+w<0||Y+h<0)continue;
   const s=opt.src||0.5;const sw=marbleImg.width*s*(w/Math.max(w,h)),sh=marbleImg.height*s*(h/Math.max(w,h));const sx=rnd()*(marbleImg.width-sw),sy=rnd()*(marbleImg.height-sh);
   c.save();c.beginPath();c.rect(X+gp/2,Y+gp/2,w-gp,h-gp);c.clip();c.drawImage(marbleImg,sx,sy,sw,sh,X+gp/2,Y+gp/2,w-gp,h-gp);
   if(opt.tint){c.globalCompositeOperation='multiply';c.fillStyle=opt.tint;c.fillRect(X,Y,w,h);c.globalCompositeOperation='source-over';}
   c.fillStyle=`rgba(255,255,255,${(rnd()-.5)*0.08+0.04})`;c.fillRect(X,Y,w,h);c.restore();b.fillStyle='#fff';b.fillRect(X+gp/2,Y+gp/2,w-gp,h-gp);}};
  const TW=tw*ppi,TH=th*ppi;
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){let x=i*TW,y=j*TH;if(stagger==='u'&&j%2)x+=TW/2;if(stagger==='v'&&i%2)y+=TH/2;cell(x,y,TW,TH);}
  map.needsUpdate=bump.needsUpdate=true;});
 const span=[cols*tw*IN,rows*th*IN];
 return (w,h)=>{const m=map.clone(),bm=bump.clone();m.repeat.set(w/span[0],h/span[1]);bm.repeat.copy(m.repeat);m.needsUpdate=bm.needsUpdate=true;
  imgReady.then(()=>setTimeout(()=>{m.needsUpdate=bm.needsUpdate=true;},0));return{map:m,bump:bm};};}
// user tile spec
const floorTile=tileSet(12,24,1/8,'v',{cols:4,rows:2,src:.55,grout:'#aaa49b'});           // 12x24, long side along room length (v -> z), staggered along length
const showerWall=tileSet(12,24,1/16,'v',{cols:4,rows:2,src:.55,grout:'#a9a39a'});         // 12x24 vertical, staggered
const mosaic=tileSet(2,2,1/8,null,{cols:24,rows:24,src:.12,grout:'#9d978e'}); // 2x2 mosaic
const kneeTile=tileSet(12,24,1/16,'v',{cols:4,rows:2,src:.55,grout:'#a9a39a'});
let cur=null;const groups={};
function G(k){if(!groups[k]){groups[k]={g:new THREE.Group(),mats:[],lights:[]};scene.add(groups[k].g);}return cur=groups[k];}
function M(color,o={}){const{t,rep=[1,1],tile,size,...rest}=o;const p={color,roughness:.6,clippingPlanes:clip,transparent:true,opacity:0,...rest};
 if(t){const x=tex(t,rep);p.map=x.d;p.normalMap=x.n;}if(tile){const x=tile(size[0],size[1]);p.map=x.map;p.bumpMap=x.bump;p.bumpScale=1.2;}
 const m=new THREE.MeshStandardMaterial(p);cur.mats.push(m);return m;}
const ink=0x1b1b1b;
const wallFront=new THREE.MeshStandardMaterial({color:0xf1ede6,roughness:.92,clippingPlanes:clip,side:THREE.DoubleSide});
const wallBack=new THREE.MeshBasicMaterial({color:ink,clippingPlanes:clip,side:THREE.BackSide});
const lineMat=new THREE.LineBasicMaterial({color:ink,clippingPlanes:clip,transparent:true,opacity:.5});
const glassMat=new THREE.MeshPhysicalMaterial({color:0xeef6f6,transparent:true,opacity:.14,roughness:.02,clippingPlanes:clip,side:THREE.DoubleSide,depthWrite:false});
const trimMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.45,clippingPlanes:clip});
const H=8*F;
function box(x1,z1,x2,z2,y1,y2,mat=wallFront){const g=new THREE.BoxGeometry(Math.abs(x2-x1),y2-y1,Math.abs(z2-z1));const grp=new THREE.Group();grp.position.set((x1+x2)/2,(y1+y2)/2,(z1+z2)/2);
 const m=new THREE.Mesh(g,mat);m.castShadow=m.receiveShadow=true;grp.add(m,new THREE.Mesh(g,wallBack),new THREE.LineSegments(new THREE.EdgesGeometry(g),lineMat));scene.add(grp);return grp;}
const BOX=(x1,y1,x2,y2,h0,h1,m)=>box(W(x1),W(y1),W(x2),W(y2),h0,h1,m);
// ---------- walls (ft; interior faces from the SVG) ----------
BOX(0.625,-0.375,6.375,0,0.012,H);                 // north
BOX(0.625,0,1.0,7.92,0.012,H);                      // west upper
BOX(-0.375,7.92,1.0,8.42,0.012,H);                  // jog (switch wall)
BOX(-0.375,8.42,0,8.75,0.012,H);BOX(-0.375,11.08,0,15,0.012,H);BOX(-0.375,8.75,0,11.08,6.8*F,H); // west lower w/ 28" door
BOX(6,-0.375,6.375,15.54,0.012,H);                  // east
BOX(-0.375,15,1.5,15.54,0.012,H);BOX(4.5,15,6.375,15.54,0.012,H);BOX(1.5,15,4.5,15.54,0.012,3.5*F);BOX(1.5,15,4.5,15.54,6.67*F,H); // south ext 2x6 + window
BOX(5.0,0,5.375,2.5,0.012,H);BOX(5.375,2.125,6,2.5,0.012,H);BOX(5.375,0,6,2.125,0.012,H,new THREE.MeshBasicMaterial({color:0x8a8a8a,clippingPlanes:clip})); // chase
// door leaf (out-swing into hall) + arc, casing
{const leaf=new THREE.Mesh(new THREE.BoxGeometry(W(2.33),6.7*F,.035),new THREE.MeshStandardMaterial({color:0xf6f3ee,roughness:.5,clippingPlanes:clip}));leaf.position.set(W(-0.375-1.165),3.35*F,W(8.77));leaf.castShadow=true;scene.add(leaf);
 const ap=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI/2;ap.push(new THREE.Vector3(W(-0.375)-Math.cos(a)*W(2.33),.012,W(8.75)+Math.sin(a)*W(2.33)));}
 scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ap),new THREE.LineBasicMaterial({color:ink})));
 for(const y of[8.75,11.08]){const m=new THREE.Mesh(new THREE.BoxGeometry(W(.42),6.8*F,.07),trimMat);m.position.set(W(-.19),3.4*F,W(y));scene.add(m);}
 // window frame + glass
 const gl=new THREE.Mesh(new THREE.PlaneGeometry(W(3),W(3.17)),glassMat);gl.position.set(W(3),W(5.085),W(15.27));scene.add(gl);
 for(const [w,h,x,y] of[[3,.12,3,3.56],[3,.12,3,6.61],[.12,3.17,1.56,5.085],[.12,3.17,4.44,5.085],[3,.08,3,5.085]]){const m=new THREE.Mesh(new THREE.BoxGeometry(W(w),W(h),W(.35)),trimMat);m.position.set(W(x),W(y),W(15.2));scene.add(m);}
 const sill=new THREE.Mesh(new THREE.BoxGeometry(W(3.4),.03,W(.6)),new THREE.MeshStandardMaterial({color:0xf2efe9,roughness:.3,clippingPlanes:clip}));sill.position.set(W(3),W(3.5)+.015,W(15.05));scene.add(sill);}
// ---------- sky + grass outside ----------
const skyT=TL.load('sky/qwantani_late_afternoon_puresky.jpg');skyT.colorSpace=THREE.SRGBColorSpace;skyT.mapping=THREE.EquirectangularReflectionMapping;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0xf4f1ea,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(CX,-0.006,CZ);ground.receiveShadow=true;scene.add(ground);
const gtx=tex('withered_grass',[30,30]);const grass=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({map:gtx.d,normalMap:gtx.n,color:0x86a060,transparent:true,opacity:0}));grass.rotation.x=-Math.PI/2;grass.position.set(CX,-0.004,CZ);grass.receiveShadow=true;scene.add(grass);
// hall floor outside the door so the entry view isn't void
{const m=new THREE.MeshStandardMaterial({color:0xffffff,map:tex('oak_wood_planks',[2,3]).d,roughness:.6});const h=new THREE.Mesh(new THREE.PlaneGeometry(W(5),W(8)),m);h.rotation.x=-Math.PI/2;h.position.set(W(-2.9),.003,W(10));h.receiveShadow=true;const hg=new THREE.Group();hg.add(h);scene.add(hg);window.__hall=hg;
 const hm=new THREE.MeshStandardMaterial({color:0xe9e4da,roughness:.9,side:THREE.DoubleSide});const hw=(x,y,w,ry)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(W(w),H),hm);p.position.set(W(x),H/2,W(y));p.rotation.y=ry;p.receiveShadow=true;hg.add(p);};
 hw(-5.4,10,8,Math.PI/2);hw(-2.9,6,5,0);hw(-2.9,14,5,0);const hc=new THREE.Mesh(new THREE.PlaneGeometry(W(5),W(8)),new THREE.MeshStandardMaterial({color:0xfbfaf7,emissive:0x2a2826}));hc.rotation.x=Math.PI/2;hc.position.set(W(-2.9),H,W(10));hg.add(hc);
 const art=new THREE.Mesh(new THREE.BoxGeometry(.03,.7,.55),new THREE.MeshStandardMaterial({color:0x9bb0b4,roughness:1}));art.position.set(W(-5.35),1.5,W(9.9));hg.add(art);
 const hl=new THREE.PointLight(0xffe0b8,2.5,6,2);hl.position.set(W(-3),H-.3,W(10));hg.add(hl);}
// ---------- labels for the plan ----------
const labels=[];
function label(txt,sub,x,y,s=1.1,rot=0){const cv=document.createElement('canvas');cv.width=512;cv.height=160;const g=cv.getContext('2d');g.fillStyle='#1b1b1b';g.textAlign='center';g.font='600 46px Helvetica, Arial';
 const N=txt.toUpperCase(),tw=g.measureText(N).width;g.fillText(N,256,70);g.fillRect(256-tw/2,82,tw,3);g.font='34px Helvetica, Arial';g.fillText(sub,256,130);
 const lm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false});const l=new THREE.Mesh(new THREE.PlaneGeometry(s,s*160/512),lm);l.rotation.set(-Math.PI/2,0,rot);l.position.set(W(x),.025,W(y));scene.add(l);labels.push(lm);}
label('Shower','4\'-0" x 2\'-2"',3,1.3,.9);label('Bathroom','±82 SF',2.4,8.1,.9);label('Freestanding tub','±66" x 32"',3,13.1,1.0);label('Vanity','72" x 21"',5.1,8.4,.75,Math.PI/2);label('WC','',4.6,3.96,.45);
function dim(txt,x1,y1,x2,y2,o){const m=new THREE.LineBasicMaterial({color:ink,transparent:true});labels.push(m);const P=(x,y)=>new THREE.Vector3(W(x),.015,W(y));
 const L=(a,b)=>scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),m));L(P(x1,y1),P(x2,y2));for(const [x,y] of[[x1,y1],[x2,y2]])L(P(x-.15,y+.15),P(x+.15,y-.15));
 const cv=document.createElement('canvas');cv.width=512;cv.height=96;const g=cv.getContext('2d');g.fillStyle='#1b1b1b';g.font='44px Helvetica, Arial';g.textAlign='center';g.fillText(txt,256,62);
 const lm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false});labels.push(lm);const t=new THREE.Mesh(new THREE.PlaneGeometry(.9,.17),lm);
 t.rotation.set(-Math.PI/2,0,x1===x2?Math.PI/2:0);t.position.set(W((x1+x2)/2+(x1===x2?o:0)),.02,W((y1+y2)/2+(x1===x2?0:o)));scene.add(t);}
dim('5\'-0"',1,-1.2,6,-1.2,-.35);dim('6\'-0"',0,16.3,6,16.3,.35);dim('15\'-0"',7.3,0,7.3,15,.4);dim('8\'-5"',-1.3,0,-1.3,8.42,-.4);dim('3\'-0" ±',1.5,15.9,4.5,15.9,.35);
// ---------- kit ----------
const RB=(w,h,d,r=.02)=>new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2-.001,h/2-.001,d/2-.001));
function mesh(g,m,x,y,z,parent){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;(parent||cur.g).add(o);return o;}
const at=(x,y,h,g,m)=>mesh(g,m,W(x),h,W(y));
let brassM,chromeM;const brass=()=>brassM||(brassM=M(0xc9a46a,{metalness:1,roughness:.28}));const white=()=>M(0xfbfbf9,{roughness:.12});
// ===== FLOOR: 12x24 marble-look porcelain, staggered, long side along room (z) =====
G('floor');
{const fl=(x1,y1,x2,y2)=>{const w=W(x2-x1),d=W(y2-y1);const p=new THREE.Mesh(new THREE.PlaneGeometry(w,d),M(0xffffff,{tile:floorTile,size:[w,d],roughness:.35}));p.rotation.x=-Math.PI/2;p.position.set(W((x1+x2)/2),.004,W((y1+y2)/2));p.receiveShadow=true;cur.g.add(p);};
 fl(1,2.5,6,8.42);fl(0,8.42,6,15);fl(-0.375,8.75,0,11.08);
 // painted walls (warm white) as inner skins + base
 const paint=M(0xeeebe4,{roughness:.9});const skin=(x,y,w,h0,h1,ry,len)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(W(len),h1-h0),paint);p.position.set(W(x),(h0+h1)/2,W(y));p.rotation.y=ry;p.receiveShadow=true;cur.g.add(p);};
 const ceil=new THREE.MeshStandardMaterial({color:0xfbfaf7,emissive:0x34322e,clippingPlanes:clip});for(const [x1,y1,x2,y2] of[[1,0,6,8.42],[0,8.42,6,15]]){const c=new THREE.Mesh(new THREE.PlaneGeometry(W(x2-x1),W(y2-y1)),ceil);c.rotation.x=Math.PI/2;c.position.set(W((x1+x2)/2),H-.004,W((y1+y2)/2));scene.add(c);}}
// ===== SHOWER =====
G('shower');
{const sw=(x1,y1,x2,y2,ry)=>{const len=W(Math.hypot(x2-x1,y2-y1));const p=new THREE.Mesh(new THREE.PlaneGeometry(len,H),M(0xffffff,{tile:showerWall,size:[len,H],roughness:.2}));p.position.set(W((x1+x2)/2),H/2,W((y1+y2)/2));p.rotation.y=ry;p.receiveShadow=true;cur.g.add(p);};
 sw(1,0.005,5,0.005,0);sw(1.005,0,1.005,2.5,Math.PI/2);sw(4.995,0,4.995,2.5,-Math.PI/2);
 const sf=new THREE.Mesh(new THREE.PlaneGeometry(W(4),W(2.17)),M(0xffffff,{tile:mosaic,size:[W(4),W(2.17)],roughness:.4}));sf.rotation.x=-Math.PI/2;sf.position.set(W(3),.006,W(1.085));sf.receiveShadow=true;cur.g.add(sf);
 at(3,2.335,.05,new THREE.BoxGeometry(W(4),.1,W(.33)),M(0xf6f4f0,{roughness:.15}));       // curb (solid quartz)
 at(3,1.08,.008,new THREE.CylinderGeometry(.055,.055,.004,32),brass());                                                   // point drain (center, per plan)
 // frameless glass: 24" door at left (out-swing) + fixed panel to chase
 const gd=new THREE.Mesh(new THREE.BoxGeometry(W(2),2.0,.01),glassMat);gd.position.set(W(2),1.1,W(2.35));cur.g.add(gd);const gf=gd.clone();gf.scale.x=1;gf.position.x=W(4);cur.g.add(gf);
 for(const x of[1.05,1.08])at(x,2.35,1.6-(x-1.05)*10*.4,new THREE.BoxGeometry(.025,.06,.02),brass());at(2.9,2.38,1.1,new THREE.BoxGeometry(.02,.3,.02),brass());
 at(4.0,2.35,2.105,new THREE.BoxGeometry(W(2),.012,.02),brass());
 // valve + rain head + handheld on west wall
 at(1.04,1.08,1.1,new THREE.CylinderGeometry(.075,.075,.02,32),brass()).rotation.z=Math.PI/2;at(1.08,1.08,1.1,new THREE.BoxGeometry(.04,.02,.11),brass());
 at(1.2,1.08,2.05,new THREE.BoxGeometry(W(.45),.015,.015),brass());at(1.55,1.08,2.03,new THREE.CylinderGeometry(.13,.13,.015,40),brass());
 at(1.05,1.6,1.2,new THREE.CylinderGeometry(.012,.012,.5),brass());at(1.08,1.6,1.5,new THREE.CylinderGeometry(.03,.02,.2),brass());
 // recessed niche in north wall with bottles + soap
 at(3,0.02,1.3,new THREE.BoxGeometry(W(1.6),.36,.03),M(0x8f8a82,{roughness:.8}));at(3,0.12,1.12,new THREE.BoxGeometry(W(1.6),.02,.2),M(0xffffff,{t:'marble_01',rep:[.3,.1],roughness:.15}));
 [[2.55,0xf2efe8,.2],[2.75,0x2b2b2b,.22],[2.95,0xc9b9a0,.18]].forEach(([x,c,h])=>at(x,.12,1.13+h/2,new THREE.CylinderGeometry(.03,.03,h,20),M(c,{roughness:.3})));at(3.35,.15,1.15,RB(.09,.03,.06,.012),M(0xe8dcc7,{roughness:.6}));
}
// ===== WC (one-piece, tank on east wall, facing west) =====
G('wc');
{const g=new THREE.Group();g.position.set(W(5.62),0,W(3.96));g.rotation.y=Math.PI/2;cur.g.add(g);const p=white();
 mesh(RB(.5,.3,.18,.06),p,0,.62,-.03,g);mesh(RB(.48,.4,.16,.05),p,0,.27,0,g);
 const pr=[];for(let i=0;i<=10;i++){const t=i/10;pr.push(new THREE.Vector2(.14+.06*Math.sin(t*Math.PI*.9),t*.4));}const bw=mesh(new THREE.LatheGeometry(pr,40),p,0,0,.33,g);bw.scale.z=1.4;
 const seat=mesh(new THREE.CylinderGeometry(.19,.19,.03,40),p,0,.41,.36,g);seat.scale.z=1.35;mesh(new THREE.BoxGeometry(.07,.015,.02),brass(),-.18,.69,.07,g);}
// ===== VANITY 72"x21" floating walnut, quartz, 2 undermount basins, reflective mirrors, sconces =====
G('vanity');
const mirrors=[];
{const x0=6-21/12,yc=8.42,len=W(6),D=W(21/12),wal=M(0xffffff,{t:'natural_walnut_veneer',rep:[2,1],roughness:.45});const g=new THREE.Group();g.position.set(W(6)-D/2,0,W(yc));cur.g.add(g);
 mesh(RB(D,.5,len,.008),wal,0,.58,0,g);mesh(new THREE.BoxGeometry(D*.9,.02,len-.06),M(0x1b1714),.02,.32,0,g);
 const dk=M(0x2a1f17);for(const zz of[-len/4*2,0,len/4*2])mesh(new THREE.BoxGeometry(.006,.48,.006),dk,-D/2-.001,.58,zz/2,g);mesh(new THREE.BoxGeometry(.006,.006,len-.02),dk,-D/2-.001,.6,0,g);
 for(const zz of[-len*3/8,-len/8,len/8,len*3/8])for(const yy of[.72,.47])mesh(new THREE.BoxGeometry(.02,.012,.14),brass(),-D/2-.012,yy,zz,g);
 const qz=M(0xf6f4f0,{roughness:.12});mesh(new THREE.BoxGeometry(D+.01,.032,len),qz,-.005,.85,0,g);
 mesh(new THREE.BoxGeometry(.02,.1,len),qz,D/2-.01,.92,0,g);                                                  // 4" backsplash
 for(const yb of[6.92,9.92]){const z=W(yb-yc);const s=mesh(new THREE.CylinderGeometry(.2,.17,.006,48),M(0xdde1e3,{roughness:.08}),-.03,.868,z,g);s.scale.set(.75,1,1);
  mesh(new THREE.CylinderGeometry(.03,.03,.006,24),M(0x6e6e6e,{metalness:.9,roughness:.3}),-.03,.871,z,g);
  // faucet (wall side, per plan) brass
  mesh(new THREE.CylinderGeometry(.02,.022,.24,20),brass(),D/2-.1,.98,z,g);const sp=mesh(new THREE.CylinderGeometry(.012,.012,.17,16),brass(),D/2-.18,1.09,z,g);sp.rotation.z=Math.PI/2;
  for(const s2 of[-1,1])mesh(new THREE.CylinderGeometry(.018,.018,.06,16),brass(),D/2-.1,.9,z+s2*.13,g);
  // mirror (real reflection) w/ brass frame, 24" x 36"
  const mw=W(2),mh=W(3),mc=1.62;const R=mobile?new THREE.Mesh(new THREE.PlaneGeometry(mw,mh),new THREE.MeshStandardMaterial({color:0xd8dcdc,metalness:1,roughness:.05,envMapIntensity:1,clippingPlanes:clip})):new Reflector(new THREE.PlaneGeometry(mw,mh),{textureWidth:768,textureHeight:1152,color:0xd8dcdc,clipBias:.003});
  R.position.set(W(6)-.018,mc,W(yb));R.rotation.y=-Math.PI/2;cur.g.add(R);mirrors.push(R);
  const fr=new THREE.Mesh(RB(.015,mh+.04,mw+.04,.01),brass());fr.position.set(W(6)-.012,mc,W(yb));cur.g.add(fr);
  // sconce "a" above mirror (per plan)
  const sc=new THREE.Group();sc.position.set(W(6),2.12,W(yb));cur.g.add(sc);mesh(new THREE.CylinderGeometry(.04,.04,.015,24),brass(),-.008,0,0,sc).rotation.z=Math.PI/2;
  mesh(new THREE.CylinderGeometry(.008,.008,.12),brass(),-.06,0,0,sc).rotation.z=Math.PI/2;const gl=mesh(new THREE.CylinderGeometry(.035,.035,.42,24),M(0xfffaf0,{emissive:0xffe2b0,emissiveIntensity:1.3,roughness:.2}),-.13,0,0,sc);gl.rotation.x=Math.PI/2;gl.castShadow=false;
  for(const q of[-1,1])mesh(new THREE.CylinderGeometry(.04,.04,.012,24),brass(),-.13,0,q*.215,sc).rotation.x=Math.PI/2;
  const L=new THREE.PointLight(0xffd7a8,1.4,4,2);L.position.set(-.3,-.05,0);sc.add(L);cur.lights.push(L);L.userData.tag='a';
  // accessories on top: soap dispensers
  mesh(new THREE.CylinderGeometry(.035,.035,.15,24),M(0x1d1d1d,{roughness:.3}),.02,.94,z+.2,g);mesh(new THREE.CylinderGeometry(.008,.008,.04),brass(),.02,1.03,z+.2,g);mesh(new THREE.BoxGeometry(.05,.008,.008),brass(),-.0,1.05,z+.2,g);}
 // tray w/ bottles + small plant + folded hand towels between basins
 mesh(RB(.16,.015,.3,.006),M(0x2a2a2a,{roughness:.4}),0,.875,0,g);mesh(new THREE.CylinderGeometry(.025,.025,.16,20),M(0xd7c6a8,{roughness:.2,transparent:true}),-.02,.96,-.07,g);
 mesh(new THREE.CylinderGeometry(.045,.035,.09,20),M(0xece6da),.0,.92,.08,g);const lf=M(0x4f6b3a,{roughness:.8});for(let i=0;i<7;i++){const b=mesh(new THREE.SphereGeometry(.04,10,8),lf,Math.cos(i)*.03,.99+(i%3)*.03,.08+Math.sin(i)*.03,g);b.scale.set(1,.5,1.7);b.rotation.y=i;}
 for(let i=0;i<3;i++)mesh(RB(.24,.035,.3,.012),M(0xf3efe6,{roughness:1}),-.02,.885+i*.036,len/2-.25,g);
 // GFCI receptacles on east wall (y 5.75, 8.42), 42" AFF above backsplash
 for(const y of[5.75,8.42]){const o=new THREE.Group();o.position.set(W(6)-.006,1.07,W(y));cur.g.add(o);mesh(RB(.012,.12,.075,.003),M(0xffffff,{roughness:.3}),0,0,0,o);
  for(const dy of[-.028,.028])mesh(new THREE.BoxGeometry(.006,.035,.045),M(0xf3f3f3),-.006,dy,0,o);mesh(new THREE.BoxGeometry(.006,.008,.016),M(0x333333),-.009,0,0,o);o.userData.tag='GFCI';cur.g.userData.gfci=(cur.g.userData.gfci||[]).concat(o);}}
// towel ring (east wall between WC and vanity), TP holder on vanity end panel
{const r=at(5.97,5.08,1.2,new THREE.TorusGeometry(.085,.007,10,40),brass());r.rotation.y=Math.PI/2;at(5.985,5.08,1.29,new THREE.CylinderGeometry(.02,.02,.02,20),brass()).rotation.z=Math.PI/2;
 const tw=at(5.95,5.08,1.08,RB(.04,.32,.17,.02),M(0xf3efe6,{roughness:1}));
 at(4.7,5.40,.62,new THREE.CylinderGeometry(.015,.015,.03,16),brass()).rotation.x=Math.PI/2;const rod=at(4.7,5.36,.62,new THREE.CylinderGeometry(.008,.008,.15,12),brass());rod.rotation.z=Math.PI/2;rod.position.x-=.07;
 at(4.62,5.33,.62,new THREE.CylinderGeometry(.055,.055,.1,24),M(0xffffff,{roughness:1})).rotation.z=Math.PI/2;}
// ===== TUB: freestanding oval ~66"x32", knee wall 3'-0" tiled w/ cap, wall-mount filler =====
G('tub');
{const p=[];const R0=W(16/12),Hh=.58;for(let i=0;i<=12;i++){const t=i/12;p.push(new THREE.Vector2(R0*(.82+.18*Math.sin(t*Math.PI/2)),t*Hh));}
 for(let i=0;i<=4;i++){const a=i/4*Math.PI;p.push(new THREE.Vector2(R0-.02+Math.cos(a)*.02,Hh+Math.sin(a)*.02));}
 for(let i=0;i<=12;i++){const t=1-i/12;p.push(new THREE.Vector2((R0-.045)*(.62+.38*Math.sin(t*Math.PI/2)),.06+t*(Hh-.06)));}p.push(new THREE.Vector2(0,.06));
 const tub=at(3,13.125,0,new THREE.LatheGeometry(p,64),M(0xfdfdfb,{roughness:.08,side:THREE.DoubleSide}));tub.scale.x=66/32;
 const water=at(3,13.125,.42,new THREE.CircleGeometry(R0*.9,48),new THREE.MeshPhysicalMaterial({color:0xcfe3e6,transparent:true,opacity:.0,roughness:.02,transmission:0,clippingPlanes:clip}));water.rotation.x=-Math.PI/2;water.scale.x=66/32;
 at(4.75,13.125,.065,new THREE.CylinderGeometry(.03,.03,.004,24),brass());
 // knee wall
 const kn=W(3);at(3,14.81,kn/2,new THREE.BoxGeometry(W(6),kn,W(.375)),M(0xffffff,{tile:kneeTile,size:[W(6),kn],roughness:.2}));at(3,14.81,kn+.015,new THREE.BoxGeometry(W(6),.03,W(.5)),M(0xffffff,{t:'marble_01',rep:[1,.1],roughness:.12}));
 // filler centered (x 3.0)
 at(3,14.6,.75,new THREE.CylinderGeometry(.03,.03,.04,24),brass()).rotation.x=Math.PI/2;const sp=at(3,14.42,.78,new THREE.CylinderGeometry(.013,.013,W(.5),16),brass());sp.rotation.x=Math.PI/2;
 for(const s of[-1,1])at(3+s*.45,14.61,.62,new THREE.CylinderGeometry(.03,.03,.05,20),brass()).rotation.x=Math.PI/2;
 // folded towels + plant + candle on knee-wall cap
 for(let i=0;i<3;i++)at(.75,14.81,kn+.05+i*.05,RB(.32,.048,.13,.02),M([0xf3efe6,0xe9e1d2,0xf3efe6][i],{roughness:1}));
 at(5.3,14.81,kn+.1,new THREE.CylinderGeometry(.07,.055,.14,20),M(0xece6da));const lf=M(0x46623a,{roughness:.8});for(let i=0;i<10;i++){const b=at(5.3+Math.cos(i)*.25,14.81+Math.sin(i)*.12,kn+.2+(i%3)*.05,new THREE.SphereGeometry(.05,10,8),lf);b.scale.set(1.6,.4,1);b.rotation.y=i;}
 at(4.6,14.81,kn+.06,new THREE.CylinderGeometry(.04,.04,.09,20),M(0x2a2a2a,{roughness:.4}));
 // bath caddy across tub w/ book + candle
 at(2.5,13.125,.6,RB(.14,.02,W(2.7),.006),M(0xffffff,{t:'natural_walnut_veneer',rep:[1,.2]}));at(2.5,12.9,.63,new THREE.CylinderGeometry(.03,.03,.05,20),M(0xf4ede0,{emissive:0xffb060,emissiveIntensity:.2}));
 // towel bar on west wall above tub w/ draped towel
 at(.03,13.1,1.2,new THREE.CylinderGeometry(.009,.009,W(2),12),brass()).rotation.x=Math.PI/2;for(const s of[-1,1])at(.025,13.1+s*1,1.2,new THREE.CylinderGeometry(.015,.015,.05,16),brass()).rotation.z=Math.PI/2;
 at(.06,13.1,1.0,RB(.03,.42,W(1.4),.015),M(0xe9e1d2,{roughness:1}));}
// ===== accessories near shower =====
G('acc');
{for(const y of[3.0,3.6]){at(1.02,y,1.7,new THREE.CylinderGeometry(.018,.018,.04,16),brass()).rotation.z=Math.PI/2;at(1.06,y,1.71,new THREE.SphereGeometry(.014,12,8),brass());}
 at(1.07,3.0,1.35,RB(.05,.65,.32,.03),M(0xf3efe6,{roughness:1})); // robe
 at(1.025,5.6,1.15,new THREE.CylinderGeometry(.009,.009,W(2),12),brass()).rotation.x=Math.PI/2;for(const s of[-1,1])at(1.02,5.6+s,1.15,new THREE.CylinderGeometry(.015,.015,.05,16),brass()).rotation.z=Math.PI/2;
 at(1.06,5.6,.95,RB(.03,.42,W(1.5),.015),M(0xf3efe6,{roughness:1}));
 at(2.1,3.5,.008,RB(W(1.8),.012,W(2.6),.01),M(0xe5ddcf,{t:'poly_wool_herringbone',rep:[1,1.5],roughness:1})); // bath mat at shower
 at(3.0,8.6,.008,RB(W(2),.012,W(5.4),.01),M(0xb9ab92,{t:'poly_wool_herringbone',rep:[1,3],roughness:1}));   // runner at vanity
 // floor plant by the door jog
 at(.55,7.6,.18,new THREE.CylinderGeometry(.11,.09,.36,24),M(0xd9d2c3,{roughness:.6}));const lf=M(0x3f5f35,{roughness:.8});for(let i=0;i<14;i++){const b=at(.55+Math.cos(i*1.3)*.08,7.6+Math.sin(i*1.3)*.08,.45+(i%5)*.09,new THREE.SphereGeometry(.07,10,8),lf);b.scale.set(.5,1.8,.3);b.rotation.set(Math.cos(i)*.5,i,Math.sin(i)*.5);}
 // art on west upper wall
 at(1.01,1.0+3.4,1.65,new THREE.BoxGeometry(.02,.5,.4),M(0x1d1d1d));}
// ===== ELECTRICAL (always lit when installed; layer adds symbols, wiring & tags) =====
G('elec');
const elecFx=[];
{const down=(x,y,tag)=>{const g=new THREE.Group();g.position.set(W(x),H-.004,W(y));cur.g.add(g);mesh(new THREE.TorusGeometry(.06,.008,8,32),M(0xffffff,{roughness:.3}),0,0,0,g).rotation.x=Math.PI/2;
  const lens=mesh(new THREE.CircleGeometry(.055,32),M(0xffffff,{emissive:0xfff2dc,emissiveIntensity:2}),0,-.002,0,g);lens.rotation.x=Math.PI/2;lens.castShadow=false;
  const s=new THREE.SpotLight(0xfff0dc,7,6,.75,.6,1.6);s.position.set(0,-.02,0);s.target.position.set(0,-2,0);g.add(s,s.target);s.castShadow=!mobile;if(!mobile)s.shadow.mapSize.set(512,512);cur.lights.push(s);elecFx.push([g,tag]);};
 down(3.0,1.08,'b · wet-rated LED');down(3.0,13.125,'c · wet-rated LED');
 const ef=new THREE.Group();ef.position.set(W(2.83),H-.005,W(3.96));cur.g.add(ef);mesh(new THREE.BoxGeometry(.26,.012,.26),M(0xffffff,{roughness:.4}),0,0,0,ef);for(let i=-3;i<=3;i++)mesh(new THREE.BoxGeometry(.2,.004,.008),M(0xbcbcbc),0,-.007,i*.028,ef);elecFx.push([ef,'EF · exhaust fan (timer)']);
 // 4-gang switch plate on jog wall, south face, 48" AFF to CL
 const sp=new THREE.Group();sp.position.set(W(.5),1.22,W(8.42)+.006);cur.g.add(sp);mesh(RB(.2,.12,.01,.003),M(0xffffff,{roughness:.3}),0,0,0,sp);
 for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.018,.045,.012),M(0xf2f2f2),-.069+i*.046,0,.006,sp);elecFx.push([sp,'Sa · Sb · Sc · ST']);}
cur=null;
// wiring (switch legs) on the ceiling, shown in electrical layer
const wireMat=new THREE.MeshBasicMaterial({color:0xffa53a,transparent:true,opacity:0,depthTest:false});const wires=new THREE.Group();scene.add(wires);
function leg(a,b,bend){const A=new THREE.Vector3(W(a[0]),H-.03,W(a[1])),B=new THREE.Vector3(W(b[0]),H-.03,W(b[1])),C=A.clone().lerp(B,.5).add(new THREE.Vector3(W(bend[0]),0,W(bend[1])));
 wires.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A,C,B),40,.008,6),wireMat));}
leg([.2,8.42],[5.75,6.92],[1,2]);leg([5.75,6.92],[5.75,9.92],[-1.2,0]);leg([.4,8.42],[3,1.08],[-1,0]);leg([.6,8.42],[3,13.125],[0,1]);leg([.8,8.42],[2.83,3.96],[.4,.4]);
for(const y of[5.75,8.42])wires.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(W(5.9),1.07,W(y)),new THREE.Vector3(W(5.9),H-.03,W(y))),4,.006,6),wireMat));
// HTML tags
const tagEls=[];function tag(text,obj,offY=0){const el=document.createElement('div');el.className='tag';el.textContent=text;document.body.appendChild(el);tagEls.push({el,obj,offY});}
elecFx.forEach(([g,t])=>tag(t,g,-.05));groups.vanity.lights.forEach(L=>tag('a · sconce',L.parent,.12));(groups.vanity.g.userData.gfci||[]).forEach(o=>tag('GFCI · 20A',o));
// ---------- camera path (x ft, y ft, h m) ----------
const eye=1.6;
const K=[[0,[3,7.5,620],[3,7.5,0],.75],[.06,[3,7.5,620],[3,7.5,0],.75],[.13,[3,7.5+1100,520],[3,7.5,.8],.82],[.22,[-300,7.5+1000,420],[3,7.5,.8],1.1],
 [.30,[0.5,15,10.5],[3,7.4,0],38],[.34,[-6,10,3],[1,9.6,1.3],50],
 [.38,[-1.4,9.95,eye],[6,9.6,1.15],60],[.50,[1.25,6.0,1.6],[5.9,9.0,1.15],64],[.56,[2.4,10.6,1.65],[3,4,1.4],62],
 [.62,[1.75,10.9,1.62],[2.6,0.6,1.15],58],[.68,[3.1,9.8,1.65],[3,13,1.0],62],[.74,[3.4,8.3,1.7],[2.8,15.2,.75],64],
 [.80,[-3,14,7.5],[3,7.5,0],42],[.86,[-2.6,16.5,8.6],[3,7.4,.6],40],[.93,[.8,12.5,1.7],[4.6,5,1.2],66],[1,[.6,12.2,1.62],[5,5.6,1.3],70]];
const T=[0,.13,.30,.38,.50,.62,.74,.86,1];
const reveal={floor:.27,vanity:.34,acc:.35,shower:.55,wc:.55,tub:.66,elec:.36};
const sm=t=>t*t*(3-2*t),cl=(x,a,b)=>Math.min(b,Math.max(a,x));
function camAt(p){let i=0;while(i<K.length-2&&p>K[i+1][0])i++;const a=K[i],b=K[i+1];const u=sm(cl((p-a[0])/(b[0]-a[0]),0,1));const P=q=>new THREE.Vector3(W(q[0]),q[2],W(q[1]));
 const pos=P(a[1]).lerp(P(b[1]),u);if(a[1][2]>100&&b[1][2]<100){pos.y=Math.exp(Math.log(a[1][2])+(Math.log(b[1][2])-Math.log(a[1][2]))*u);const pa=P(a[1]),pb=P(b[1]),w=1-Math.pow(1-u,3);pos.x=pa.x+(pb.x-pa.x)*w;pos.z=pa.z+(pb.z-pa.z)*w;}
 return{pos,tgt:P(a[2]).lerp(P(b[2]),u),fov:Math.exp(Math.log(a[3])+(Math.log(b[3])-Math.log(a[3]))*u)};}
const cards=[...document.querySelectorAll('.card')],btn=document.getElementById('elec');let forceE=false;btn.onclick=()=>{forceE=!forceE;btn.setAttribute('aria-pressed',forceE);};
const v3=new THREE.Vector3();
function apply(p){const c=camAt(p);cam.position.copy(c.pos);const top=c.pos.y>200&&Math.abs(c.pos.z-c.tgt.z)<1;cam.up.set(0,top?0:1,top?-1:0);cam.lookAt(c.tgt);
 cam.near=c.pos.y>60?c.pos.y*.5:.03;cam.far=c.pos.y*3+200;cam.fov=c.fov*(vw/vh<1.2?1.7:1);cam.updateProjectionMatrix();
 const r=cl((p-.06)/.16,0,1);wallBack.visible=r<.99;window.__hall.visible=p>.26;cut.constant=1.2+sm(r)*(H+.5-1.2);labels.forEach(m=>m.opacity=1-cl((p-.05)/.1,0,1));
 const day=sm(cl((p-.18)/.1,0,1));const E=forceE?1:sm(cl((p-.78)/.06,0,1));const night=E*(p>.76||forceE?1:0)*(forceE&&p<.76?.55:1);
 sun.intensity=3.0*day*(1-night);hemi.intensity=(1.25-.6*day)*(1-.85*night);scene.environmentIntensity=.6*(1-.75*night);grass.material.opacity=day*(1-night);
 const inside=p>.33;scene.background=inside?(night>.5?NIGHT:skyT):PAPER;renderer.toneMappingExposure=1.0+.15*night;
 for(const k in groups){const v=cl((p-reveal[k])/.05,0,1);const gp=groups[k];gp.mats.forEach(m=>{m.opacity=v;m.transparent=v<1;m.depthWrite=v>.5;});gp.g.visible=v>0;
  gp.lights.forEach(l=>{l.visible=v>.5;l.intensity=(l.isSpotLight?4:1.1)*(1+1.6*night);});}
 groups.elec.mats.forEach(m=>{if(m.emissive&&m.emissiveIntensity>1)m.emissiveIntensity=2+2*night;});
 wireMat.opacity=.9*E;const showTags=E>.5&&p>.33;
 for(const t of tagEls){t.obj.getWorldPosition(v3);v3.y+=t.offY;v3.project(cam);const vis=showTags&&v3.z<1&&Math.abs(v3.x)<1&&Math.abs(v3.y)<1;t.el.style.opacity=vis?1:0;
  t.el.style.left=((v3.x+1)/2*vw)+'px';t.el.style.top=((1-v3.y)/2*vh)+'px';}
 mirrors.forEach(m=>m.visible=groups.vanity.g.visible&&p>.35);
 let best=0;T.forEach((t,i)=>{if(Math.abs(p-t)<Math.abs(p-T[best]))best=i;});cards.forEach((el,i)=>el.classList.toggle('on',i===best));
 document.querySelector('.titleblock').style.opacity=p<.08?1:0;document.getElementById('hint').style.opacity=p<.03?1:0;}
let vw=innerWidth,vh=innerHeight,scrollReady=false,fitRaf=0;
function fitCanvas(){const vv=visualViewport;vw=Math.round(vv?vv.width:innerWidth);vh=Math.round(vv?vv.height:innerHeight);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,dprCap));renderer.setSize(vw,vh,false);const c=renderer.domElement;c.style.width=vw+'px';c.style.height=vh+'px';
 if(vv){c.style.left=(vv.offsetLeft||0)+'px';c.style.top=(vv.offsetTop||0)+'px';}
 cam.aspect=vw/Math.max(vh,1);cam.updateProjectionMatrix();}
function resize(){fitCanvas();if(window.__lenis)window.__lenis.resize();if(scrollReady)ScrollTrigger.refresh();}
function scheduleFit(){if(!fitRaf)fitRaf=requestAnimationFrame(()=>{fitRaf=0;fitCanvas();});}
addEventListener('resize',resize);addEventListener('orientationchange',resize);
if(visualViewport)visualViewport.addEventListener('resize',scheduleFit);resize();
gsap.registerPlugin(ScrollTrigger);const lenis=new Lenis({lerp:.09,syncTouch:true,syncTouchLerp:.075,touchMultiplier:1});window.__lenis=lenis;lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0);
if(mobile){const hint=document.getElementById('hint');hint.textContent='Swipe to build ↓';}
const state={p:0};let P0=0;ScrollTrigger.create({trigger:'#scroll',start:'top top',end:'bottom bottom',onUpdate:s=>{state.p=s.progress;}});scrollReady=true;
window.__mobile=mobile;window.__dprCap=dprCap;window.__shadow=sun.shadow.mapSize.x;window.__reflect=()=>mirrors.some(m=>m.isReflector);
window.__dbg=()=>{window.__hold=true;cam.position.set(W(5.4),1.6,W(8));cam.lookAt(0,1.6,W(8));cam.fov=70;cam.updateProjectionMatrix();renderer.render(scene,cam);};
window.__setP=p=>{state.p=p;P0=p;apply(p);renderer.render(scene,cam);};window.__elec=v=>{forceE=v;};
function loop(){if(window.__hold){requestAnimationFrame(loop);return;}P0+=(state.p-P0)*.12;apply(P0);renderer.render(scene,cam);requestAnimationFrame(loop);}loop();
