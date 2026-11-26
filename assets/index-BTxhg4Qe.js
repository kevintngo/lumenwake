(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function t(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(o){if(o.ep)return;o.ep=!0;const a=t(o);fetch(o.href,a)}})();const ia=new URLSearchParams(location.search),ra={touch:ia.has("touch")?ia.get("touch")!=="0":matchMedia("(pointer: coarse)").matches};class Pr{handlers=new Map;on(e,t){let n=this.handlers.get(e);n||(n=[],this.handlers.set(e,n));const o=t;return n.push(o),()=>{const a=n.indexOf(o);a>=0&&n.splice(a,1)}}emit(e,...t){const n=this.handlers.get(e);if(!n)return;const o=t[0];for(let a=0;a<n.length;a++)try{n[a](o)}catch(i){console.error(`Listener for "${String(e)}" failed:`,i)}}onDynamic(e,t){return this.on(e,t)}emitDynamic(e,t){const n=this.handlers.get(e);if(n)for(let o=0;o<n.length;o++)try{n[o](t)}catch(a){console.error(`Listener for "${String(e)}" failed:`,a)}}}const la=10;class qr{keys=new Set;pressed=new Set;mouse={x:0,y:0,nx:0,ny:0,inside:!1,left:!1};clicks=[];wheel=0;dragX=0;dragY=0;down=null;stick={x:0,y:0};acting=!1;pinch=1;touches=new Map;constructor(e){const t=i=>i.target instanceof Element&&/INPUT|TEXTAREA|SELECT/.test(i.target.tagName),n=i=>i.code!=="Escape"&&(i.target instanceof Element&&!!i.target.closest('button, a, [role="dialog"]')||i.code==="Tab"&&!!document.querySelector("#panels .win, #pause:not([hidden]), body.titled"));addEventListener("keydown",i=>{t(i)||i.metaKey||i.ctrlKey||n(i)||(this.keys.has(i.code)||this.pressed.add(i.code),this.keys.add(i.code),/^(Space|Tab|Arrow|Digit|Key)/.test(i.code)&&i.preventDefault())}),addEventListener("keyup",i=>this.keys.delete(i.code)),addEventListener("blur",()=>{this.keys.clear(),this.touches.clear(),this.mouse.left=!1,this.stick.x=0,this.stick.y=0,this.acting=!1});const o=i=>{const r=e.getBoundingClientRect(),c=this.mouse;c.x=i.clientX-r.left,c.y=i.clientY-r.top,c.nx=c.x/r.width*2-1,c.ny=1-c.y/r.height*2};e.addEventListener("pointerdown",i=>{o(i);try{e.setPointerCapture(i.pointerId)}catch{}if(i.pointerType==="touch"){if(this.mouse.inside=!1,this.touches.set(i.pointerId,{x:i.clientX,y:i.clientY,moved:0,multi:!1}),this.touches.size>1)for(const r of this.touches.values())r.multi=!0;return}this.down={button:i.button,moved:0,lx:i.clientX,ly:i.clientY},i.button===0&&(this.mouse.left=!0)}),e.addEventListener("pointermove",i=>{if(i.pointerType==="touch"){const c=this.touches.get(i.pointerId);if(!c)return;if(this.touches.size===1)c.moved+=Math.abs(i.clientX-c.x)+Math.abs(i.clientY-c.y),c.moved>la&&(this.dragX+=i.clientX-c.x,this.dragY+=i.clientY-c.y);else if(this.touches.size===2){let d=null;for(const[h,u]of this.touches)h!==i.pointerId&&(d=u);if(d){const h=Math.hypot(c.x-d.x,c.y-d.y),u=Math.hypot(i.clientX-d.x,i.clientY-d.y);h>24&&u>24&&(this.pinch*=h/u)}}c.x=i.clientX,c.y=i.clientY;return}o(i),this.mouse.inside=!0;const r=this.down;r&&(r.moved+=Math.abs(i.clientX-r.lx)+Math.abs(i.clientY-r.ly),r.button!==0&&(this.dragX+=i.clientX-r.lx,this.dragY+=i.clientY-r.ly),r.lx=i.clientX,r.ly=i.clientY)});const a=i=>{if(i.pointerType==="touch"){const c=this.touches.get(i.pointerId);this.touches.delete(i.pointerId),c&&!c.multi&&c.moved<=la&&i.type==="pointerup"&&(o(i),this.clicks.push({nx:this.mouse.nx,ny:this.mouse.ny,button:0,touch:!0}));return}o(i);const r=this.down;r&&r.moved<7&&this.clicks.push({nx:this.mouse.nx,ny:this.mouse.ny,button:r.button}),this.down=null,this.mouse.left=!1};e.addEventListener("pointerup",a),e.addEventListener("pointercancel",a),e.addEventListener("pointerleave",()=>{this.mouse.inside=!1}),e.addEventListener("contextmenu",i=>i.preventDefault()),e.addEventListener("wheel",i=>{this.wheel+=Math.sign(i.deltaY),i.preventDefault()},{passive:!1})}held(e){return this.keys.has(e)}hit(e){return this.pressed.has(e)}steering(){return this.mouse.left&&this.down!==null&&this.down.button===0}endFrame(){this.pressed.clear(),this.clicks.length=0,this.wheel=0,this.dragX=0,this.dragY=0,this.pinch=1}}const ln=Math.PI*2,ue=(s,e,t)=>s<e?e:s>t?t:s,Lr=s=>s<0?0:s>1?1:s,fe=(s,e,t)=>s+(e-s)*t,Se=(s,e,t)=>{const n=Lr((t-s)/(e-s));return n*n*(3-2*n)},je=(s,e,t,n)=>fe(s,e,1-Math.exp(-t*n));function Ei(s,e){let t=(e-s)%ln;return t>Math.PI&&(t-=ln),t<-Math.PI&&(t+=ln),t}const Qt=(s,e,t,n)=>s+Ei(s,e)*(1-Math.exp(-t*n)),ca=(s,e,t)=>[fe(s[0],e[0],t),fe(s[1],e[1],t),fe(s[2],e[2],t)],et={sub:(s,e)=>[s[0]-e[0],s[1]-e[1],s[2]-e[2]],add:(s,e)=>[s[0]+e[0],s[1]+e[1],s[2]+e[2]],scale:(s,e)=>[s[0]*e,s[1]*e,s[2]*e],dot:(s,e)=>s[0]*e[0]+s[1]*e[1]+s[2]*e[2],cross:(s,e)=>[s[1]*e[2]-s[2]*e[1],s[2]*e[0]-s[0]*e[2],s[0]*e[1]-s[1]*e[0]],len:s=>Math.hypot(s[0],s[1],s[2]),norm:s=>{const e=Math.hypot(s[0],s[1],s[2])||1;return[s[0]/e,s[1]/e,s[2]/e]}},Js={perspective(s,e,t,n,o){const a=1/Math.tan(e/2),i=1/(n-o);return s.fill(0),s[0]=a/t,s[5]=a,s[10]=(o+n)*i,s[11]=-1,s[14]=2*o*n*i,s},view(s,e,t,n,o){return s[0]=t[0],s[4]=t[1],s[8]=t[2],s[12]=-et.dot(t,e),s[1]=n[0],s[5]=n[1],s[9]=n[2],s[13]=-et.dot(n,e),s[2]=-o[0],s[6]=-o[1],s[10]=-o[2],s[14]=et.dot(o,e),s[3]=0,s[7]=0,s[11]=0,s[15]=1,s},mul(s,e,t){for(let n=0;n<4;n++){const o=t[n*4],a=t[n*4+1],i=t[n*4+2],r=t[n*4+3];s[n*4]=e[0]*o+e[4]*a+e[8]*i+e[12]*r,s[n*4+1]=e[1]*o+e[5]*a+e[9]*i+e[13]*r,s[n*4+2]=e[2]*o+e[6]*a+e[10]*i+e[14]*r,s[n*4+3]=e[3]*o+e[7]*a+e[11]*i+e[15]*r}return s}},Bs=[1,2,3,5],ze={vanguard:{name:"Vanguard",family:"blade",blurb:"Up close with an arc blade.",attrs:{might:7,grace:5,vigor:7,mind:3},abilities:["cleave","step","slam","mend"],color:[214,70,52]},ranger:{name:"Ranger",family:"rifle",blurb:"At range with a pulse rifle.",attrs:{might:5,grace:8,vigor:5,mind:4},abilities:["volley","step","bolt","mend"],color:[232,164,48]},adept:{name:"Adept",family:"wand",blurb:"Techniques through a focus rod.",attrs:{might:3,grace:5,vigor:5,mind:9},abilities:["bolt","nova","mend","step"],color:[70,150,150]}},Ut={blade:{name:"Blade",kit:0,range:1.55,chain:[1,1.15,1.7],shot:null},rifle:{name:"Rifle",kit:1,range:10.5,chain:[1,1,1.6],shot:{speed:26,radius:.35,life:.6,color:[.55,.85,1],size:.34}},wand:{name:"Rod",kit:2,range:8.5,chain:[1,1.1,1.5],shot:{speed:15,radius:.5,life:.8,color:[.45,.95,.85],size:.5,splash:1.3}}},wt={human:{index:1,name:"Human",scale:1,blurb:"Most of the corps.",hair:[[122,62,44],[74,77,94],[226,188,130],[176,128,84],[188,84,60]]},unit:{index:0,name:"Scout unit",scale:1,blurb:"A machine of the corps.",hair:[[122,62,44]]},veiled:{index:2,name:"Veiled",scale:1.13,blurb:"Tall, quiet, always masked.",hair:[[74,77,94]]},karn:{index:3,name:"Karn",scale:1.1,blurb:"Broad, horned and tusked.",hair:[[150,178,120],[136,160,196],[209,163,150],[150,142,132]]},lynd:{index:4,name:"Lynd",scale:.92,blurb:"Slight and quick, with tall ears.",hair:[[226,176,110],[232,164,48],[150,142,132],[236,228,210],[122,62,44]]}},Cr=["unit","human","veiled","karn","lynd"],ot={wide:{name:"Wide Arc",skill:"cleave",max:2,desc:"Cleave reaches a fifth farther."},rend:{name:"Rending Cut",skill:"cleave",max:2,desc:"Cleave hits a quarter harder."},twin:{name:"Twin Embers",skill:"bolt",max:1,desc:"Ember Bolt throws two motes, a little apart."},tinder:{name:"Quick Tinder",skill:"bolt",max:2,desc:"Ember Bolt is ready a fifth sooner."},stride:{name:"Long Stride",skill:"step",max:2,desc:"Gale Step carries you a quarter farther."},gust:{name:"Parting Gust",skill:"step",max:1,desc:"Gale Step cuts whatever it passes through."},roots:{name:"Deep Roots",skill:"mend",max:2,desc:"Mend restores a third more."},hide:{name:"Thick Hide",max:3,desc:"Blows hurt 8% less."},keen:{name:"Keen Eye",max:3,desc:"Six more blows in a hundred are critical."},feet:{name:"Light Feet",max:2,desc:"You run 6% faster."},thrift:{name:"Thrift",max:2,desc:"Skills cost 12% less focus."},forage:{name:"Forager",max:2,desc:"Creatures drop a quarter more glint."},second:{name:"Second Wind",max:2,desc:"A killing blow gives back 5 focus."}},Er=(s,e,t,n={},o=0)=>Array.from({length:e},(a,i)=>{const r=o+i/e*Math.PI*2;return{id:s,x:Math.round(Math.sin(r)*t*10)/10,z:Math.round(Math.cos(r)*t*10)/10,...n}}),bo={id:"town",biome:"town",seed:4107,rooms:[[0,0,27,.05,15.5],[0,47,9,.03,9],[-46,-10,13,.04,13],[40,-24,10,.07,3.5]],links:[[0,1,5.2],[0,2,5.2],[0,3,4.4]],start:{x:0,z:16,yaw:Math.PI},paving:[{x:0,z:0,r:11.5},{x:0,z:-19,r:5.2},{x:-17.5,z:1,r:4.6},{x:0,z:47,r:6.2},{x:-46,z:-10,r:10.5},{x:40,z:-24,r:3.2},{ax:0,az:0,bx:0,bz:47,w:4.2},{ax:0,az:0,bx:-46,bz:-10,w:4.2},{ax:0,az:0,bx:40,bz:-24,w:3.4},{ax:0,az:0,bx:0,bz:-19,w:4.2},{ax:0,az:0,bx:-17.5,bz:1,w:3.6}],fixtures:[{id:"spire",x:0,z:0},{id:"hall",x:0,z:-22.3,rot:0},{id:"console",x:6.2,z:-14,rot:2.75},{id:"banner",x:-5.6,z:-17.4,pal:0},{id:"banner",x:6.4,z:-18.2,pal:0},{id:"kiosk",x:-19.4,z:-3.2,rot:1.25,pal:0},{id:"kiosk",x:-20.6,z:5.4,rot:1.75,pal:1},{id:"crate",x:-14.4,z:6.6,seed:.8},{id:"crate",x:-25.4,z:-1.2,seed:.2},{id:"banner",x:-13.4,z:-5.2,pal:2},{id:"hab",x:17.6,z:-9.4,rot:-1.2,pal:0},{id:"hab",x:20.2,z:2.6,rot:-1.6,pal:1},{id:"hab",x:15.4,z:13.4,rot:-2.2,pal:2},{id:"hab",x:-11.8,z:-18.6,rot:.5,pal:1},{id:"hab",x:12.4,z:-19.4,rot:-.5,pal:3},{id:"hab",x:-14.2,z:15.6,rot:2.3,pal:0},...Er("lamp",6,12.6,{},.52),{id:"bench",x:6.6,z:6.4,rot:.8},{id:"bench",x:-6.6,z:6.4,rot:-.8},{id:"bench",x:6.8,z:-6.2,rot:2.3},{id:"bench",x:-6.8,z:-6.2,rot:-2.3},{id:"planter",x:9.4,z:.6,pal:7},{id:"planter",x:-9.4,z:.6,pal:2},{id:"planter",x:2.6,z:9.6,pal:3},{id:"planter",x:-2.6,z:9.6,pal:11},{id:"pad",x:0,z:47,role:"deploy"},{id:"lamp",x:-5.4,z:43.4},{id:"lamp",x:5.4,z:43.4},{id:"banner",x:-6.2,z:50.4,pal:1},{id:"banner",x:6.2,z:50.4,pal:1},{id:"shuttle",x:-49.5,z:-14.5,rot:.9},{id:"shuttle",x:-44,z:-3.2,rot:2.4},{id:"crate",x:-38.6,z:-17.4,seed:.9},{id:"lamp",x:-37.4,z:-5.2},{id:"lamp",x:-54.6,z:-5.6},{id:"bench",x:43.2,z:-26.6,rot:-2.2},{id:"lamp",x:36.6,z:-28.6},{id:"crystal",x:44.6,z:-20.4,scale:1.2}],crew:[{role:"bounty",name:"Ilse",title:"Dispatcher",people:"veiled",x:3.6,z:-13.2,face:[0,0],color:[84,108,156],trim:[66,76,128],seed:.31},{role:"shop",name:"Bram",title:"Quartermaster",people:"karn",x:-16.6,z:-2.2,face:[0,0],color:[176,118,62],trim:[232,164,48],hair:[150,178,120],seed:.12},{role:"crew",name:"Oda",title:"Outfitter",people:"unit",x:-17.8,z:5.6,face:[0,0],color:[70,150,150],says:["Bram sells what I mend. Ask him.","That rim on the far side: do not lean on it."]},{role:"crew",name:"Tam",title:"Pilot",people:"human",color:[150,178,120],trim:[214,70,52],hair:[74,77,94],seed:.34,path:[[-40,-9],[-12,-3],[-3,6],[-12,-3]],says:["Fair winds down there.","She flies better than she looks."]},{role:"crew",name:"Wren",title:"Surveyor",people:"lynd",color:[224,112,128],trim:[84,108,156],hair:[236,228,210],seed:.52,path:[[5,8],[1,38],[5,8],[8,-8]],says:["The pad is quick. The walk back is not.","Glasswood is lovely this time of year. Mind the caps."]},{role:"crew",name:"Juno",title:"Fitter",people:"human",color:[136,180,216],trim:[226,176,52],hair:[188,84,60],seed:.83,path:[[10,3],[14,-2],[34,-21],[14,-2]],says:["You can see three countries from the overlook.","Lamps are mine. If one is out, I know."]},{role:"crew",name:"Pell",title:"Runner",people:"lynd",color:[226,176,52],trim:[70,150,150],hair:[232,164,48],seed:.07,path:[[-7,-9],[7,-9],[8,6],[-8,6]],says:["Ilse has the board. Hall end of the square.","Three contracts a day, never the same place twice."]},{role:"crew",name:"Dorn",title:"Loader",people:"karn",color:[84,108,156],trim:[150,142,132],hair:[136,160,196],seed:.66,path:[[-41,-14],[-36,-7],[-22,-5],[-36,-7]],says:["Crates do not carry themselves. Well. Oda says soon.","Mind the skids when one comes in."]},{role:"crew",name:"Sable",title:"Cartographer",people:"veiled",x:41.5,z:-22.5,face:[60,-40],color:[126,92,150],trim:[84,66,120],seed:.9,says:["Every island drifts a little. The maps are always a day old.","The ringed one rises again tonight."]},{role:"crew",name:"Mako",title:"Sentry",people:"unit",x:3.4,z:41.6,face:[0,30],color:[214,70,52],says:["Pad is clear.","One at a time on the pad, please."]}]},He={TEX:256,CHUNK:32,CELL:4,SEA:0,PROP_HMAX:9.5,VIEW:108},_e={FOV:34,SCALE_MIN:.45,SCALE_MAX:1.5,SCALE_START:.8,SCALE_LITE:.62,ENTITY_DPR_MAX:2,MAX_CASTERS:24,MAX_LIGHTS:8,MAX_BLIPS:32},yo={behind:[.36,10.5],above:[.8,15.5]},an={PLAYER_SPEED:6.6,JUMP_SPEED:7.6,GRAVITY:21,STEEP:.7},Ar=1.5;function jn(s){return s.tan}class Ps{target=[0,0,0];yaw=Math.PI*.25;pitch=.8;distance=15.5;goal;fov=_e.FOV*Math.PI/180;stage={lift:0,pull:1,wide:0};lift=0;pull=1;wide=0;rail=null;pos=[0,10,10];right=[1,0,0];up=[0,1,0];forward=[0,0,-1];tan=[1,1];view=new Float32Array(16);proj=new Float32Array(16);viewProj=new Float32Array(16);shake=0;shakeScale=1;still=!1;constructor(){this.goal={yaw:this.yaw,pitch:this.pitch,distance:this.distance}}rotate(e,t){this.goal.yaw+=e,this.goal.pitch=ue(this.goal.pitch+t,.2,1.35)}zoom(e){this.goal.distance=ue(this.goal.distance*e,7,42)}update(e,t,n,o){this.yaw=Qt(this.yaw,this.goal.yaw,12,e),this.pitch=je(this.pitch,this.goal.pitch,12,e),this.distance=je(this.distance,this.goal.distance,8,e);for(let m=0;m<3;m++)this.target[m]=je(this.target[m],t[m],9,e);this.lift=je(this.lift,this.stage.lift,1.8,e),this.pull=je(this.pull,this.stage.pull,1.8,e),this.wide=je(this.wide,this.stage.wide||0,1.8,e);const a=Math.cos(this.pitch),i=Math.sin(this.pitch),r=[Math.sin(this.yaw)*a,i,Math.cos(this.yaw)*a],c=this.distance*this.pull;let d=[this.target[0],this.target[1]+Ar*(1-Se(.24,.62,this.pitch))+this.lift,this.target[2]];this.pos=et.add(d,et.scale(r,c));let h=this.fov+this.wide,u=1.2;const f=this.rail;if(f){const m=f.mix??1;this.pos=ca(this.pos,f.pos,m),d=ca(d,f.look,m),h=fe(h,f.lens||this.fov,m),u=fe(u,.35,m)}if(o){const m=o(this.pos[0],this.pos[2])+u;this.pos[1]<m&&(this.pos[1]=m)}if(this.shake>0&&!this.still){const m=this.shake*this.shake*.35*(1+.04*et.len(et.sub(d,this.pos)))*(this.shakeScale??1);this.pos[0]+=(Math.random()-.5)*m,this.pos[1]+=(Math.random()-.5)*m,this.shake=Math.max(0,this.shake-e*2.5)}else this.still&&(this.shake=0);this.forward=et.norm(et.sub(d,this.pos)),this.right=et.norm(et.cross(this.forward,[0,1,0])),this.up=et.cross(this.right,this.forward);const p=Math.tan(h/2);this.tan=[p*n,p],Js.view(this.view,this.pos,this.right,this.up,this.forward),Js.perspective(this.proj,h,n,.2,600),Js.mul(this.viewProj,this.proj,this.view)}ray(e,t){const n=this.right,o=this.up,a=this.forward;return{origin:this.pos,dir:et.norm([a[0]+n[0]*e*this.tan[0]+o[0]*t*this.tan[1],a[1]+n[1]*e*this.tan[0]+o[1]*t*this.tan[1],a[2]+n[2]*e*this.tan[0]+o[2]*t*this.tan[1]])}}project(e,t,n){const o=this.viewProj,a=o[3]*e+o[7]*t+o[11]*n+o[15];return a<=.05?null:{x:(o[0]*e+o[4]*t+o[8]*n+o[12])/a*.5+.5,y:.5-(o[1]*e+o[5]*t+o[9]*n+o[13])/a*.5}}}const Rr=[[.455,.659,.353],[.91,.643,.188],[.91,.588,.588],[.33,.533,.463],[.588,.698,.471],[.878,.361,.275],[.957,.804,.376],[.376,.62,.502],[.7,.79,.47],[.53,.65,.51],[.8,.52,.56],[.6,.73,.74]],Ro=[{id:"town",name:"Meridian Landing",ground:[.42,.65,.47],ground2:[.588,.698,.471],rock:[.56,.52,.7],snow:0,grass:1,sand:0,flowers:1,leaf:[7,3,2,11],roll:.3,hour:10.4,cloud:.35,props:[["tree",.03,.55],["bush",.03,.14,7],["bigcap",.004,.05],["mushroom",.006,.03],["rock",.004,.02]],monsters:[],particles:"petals"},{id:"glasswood",name:"Glasswood Terraces",mission:!0,ground:[.376,.62,.502],ground2:[.588,.698,.471],rock:[.56,.52,.7],snow:0,grass:1,sand:0,flowers:.9,leaf:[7,3,2,11],roll:.5,hour:10.2,cloud:.4,props:[["tree",.04,.5],["bigcap",.01,.1],["bush",.04,.12,7],["crystal",.012,.05],["rock",.012,.03],["mushroom",.01,.04]],monsters:[["sproutling",5],["wisp",3],["hound",3],["bristlehog",3],["puffcap",2],["mite",2],["cragling",1]],variant:{prefix:"Glass",pencil:[116,196,178]},boss:"matron",particles:"petals",decor:[["flowers",.1,0],["tallgrass",.07,-1],["fern",.05,-1],["flowers",.04,4],["pebbles",.015,0]],landmarks:["grove","circle","crystals","ruins"],ground3:[.7,.74,.42]},{id:"ember",name:"Ember Shelf",mission:!0,ground:[.91,.7,.42],ground2:[.86,.76,.46],rock:[.56,.33,.27],snow:0,grass:.5,sand:.35,flowers:.2,leaf:[1,5,6,10],roll:.7,hour:18.3,cloud:.5,props:[["deadtree",.03,.2],["tree",.015,.2],["rock",.04,.08],["stone",.01,.05],["bush",.03,.08,1],["crystal",.008,.03],["cairn",.006,.02]],monsters:[["bristlehog",4],["delver",3],["cragling",3],["shellsnap",3],["hound",2],["strider",2],["sproutling",2]],variant:{prefix:"Ember",pencil:[226,132,84]},boss:"warden",particles:"embers",decor:[["tallgrass",.08,6],["pebbles",.05,0],["flowers",.035,3],["tallgrass",.03,8]],landmarks:["ruins","spires","circle"],ground3:[.86,.56,.36]},{id:"hush",name:"The Hush",mission:!0,ground:[.4,.47,.62],ground2:[.455,.612,.541],rock:[.3,.33,.52],snow:0,grass:.7,sand:0,flowers:.5,leaf:[11,10,7,3],roll:.5,hour:20.35,cloud:.3,props:[["bigcap",.03,.3],["crystal",.03,.1],["willow",.01,.12],["mushroom",.03,.08],["rock",.015,.03],["reeds",.01,.03]],monsters:[["wisp",4],["puffcap",4],["watcher",3],["mite",3],["shellsnap",3],["delver",1],["cragling",1]],variant:{prefix:"Hush",pencil:[150,142,210]},boss:"matron",particles:"fireflies",decor:[["fern",.08,-1],["flowers",.06,5],["tallgrass",.03,-1],["flowers",.025,1],["pebbles",.012,0]],landmarks:["bigcaps","lanterns","crystals"],ground3:[.47,.44,.7]},{id:"rime",name:"Rime Steps",mission:!0,ground:[.6,.73,.74],ground2:[.533,.706,.847],rock:[.5,.52,.6],snow:.85,grass:.2,sand:0,flowers:0,leaf:[11,3,7],roll:.9,hour:8.3,cloud:.45,props:[["pine",.05,.5,3],["rock",.03,.05],["crystal",.02,.05],["stump",.01,.03],["deadtree",.008,.03],["cairn",.008,.02]],monsters:[["hound",4],["cragling",3],["watcher",3],["wisp",3],["strider",2],["bristlehog",2],["shellsnap",2]],variant:{prefix:"Rime",pencil:[168,202,226]},boss:"sentinel",particles:"snow",decor:[["pebbles",.045,0],["tallgrass",.03,11],["flowers",.02,1]],landmarks:["pines","circle","crystals"],ground3:[.72,.83,.94]},{id:"vault",name:"The Underhalls",mission:!0,realm:1,walls:2.3,ground:[.8,.74,.64],ground2:[.7,.7,.74],rock:[.36,.34,.44],snow:0,grass:0,sand:0,flowers:0,leaf:[9],roll:0,hour:1,cloud:0,props:[["column",.05,.3],["brazier",.035,.16],["urn",.04,.2],["crystal",.012,.06],["rock",.012,.05],["cairn",.008,.03]],monsters:[["delver",4],["watcher",4],["shellsnap",3],["mite",3],["cragling",3],["hound",2],["strider",1]],variant:{prefix:"Hall",pencil:[170,150,196]},boss:"keeper",particles:"dust",decor:[["pebbles",.035,0]],landmarks:["ruins"]},{id:"shatter",name:"The Shatter",mission:!0,realm:2,gravity:.42,hop:2.3,ground:[.64,.62,.74],ground2:[.73,.69,.7],rock:[.43,.4,.56],snow:0,grass:0,sand:.12,flowers:0,leaf:[11],roll:1,hour:9.2,cloud:0,props:[["shard",.04,.22],["floater",.04,.14],["rock",.03,.08],["crystal",.02,.07],["wreck",.014,.05],["dish",.008,.03],["stone",.008,.03]],monsters:[["watcher",4],["wisp",4],["strider",3],["mite",3],["delver",2],["shellsnap",2],["cragling",2]],variant:{prefix:"Star",pencil:[150,170,220]},boss:"drifter",particles:"stardust",decor:[["pebbles",.045,0],["flowers",.02,5]],landmarks:["shards","crystals"],ground3:[.78,.7,.8]},{id:"bloomfall",name:"Bloomfall Gardens",mission:!0,ground:[.58,.72,.47],ground2:[.74,.79,.56],ground3:[.93,.79,.69],rock:[.7,.55,.64],snow:0,grass:1,sand:0,flowers:1,leaf:[2,10,2,6,8],roll:.45,hour:16.6,cloud:.32,props:[["tree",.04,.5],["willow",.01,.1,2],["bush",.035,.12,2],["rock",.008,.025],["mushroom",.005,.02],["crystal",.004,.015]],monsters:[["sproutling",5],["puffcap",3],["wisp",3],["bristlehog",3],["hound",2],["mite",2]],variant:{prefix:"Bloom",pencil:[232,150,178]},boss:"thornmother",particles:"petals",decor:[["flowers",.13,4],["flowers",.06,0],["tallgrass",.05,8],["fern",.03,-1],["flowers",.03,2]],landmarks:["grove","circle","ruins"]},{id:"saltglass",name:"Saltglass Flats",mission:!0,ground:[.8,.75,.66],ground2:[.64,.76,.79],ground3:[.36,.7,.7],rock:[.56,.6,.72],snow:0,grass:.45,sand:0,flowers:0,leaf:[11,3,9],roll:.25,hour:12.6,cloud:.2,props:[["crystal",.035,.14],["rock",.02,.08],["deadtree",.01,.06],["cairn",.01,.04],["stone",.01,.05],["reeds",.006,.03,11]],monsters:[["shellsnap",4],["strider",3],["cragling",3],["watcher",3],["delver",2],["mite",2]],variant:{prefix:"Salt",pencil:[206,228,226]},boss:"saltcolossus",particles:"dust",decor:[["pebbles",.05,0],["tallgrass",.04,11],["flowers",.03,5]],landmarks:["crystals","spires","shards"]},{id:"amberwood",name:"Amberwood Hollow",mission:!0,ground:[.6,.66,.4],ground2:[.74,.68,.42],ground3:[.86,.52,.33],rock:[.6,.43,.37],snow:0,grass:1,sand:0,flowers:.25,leaf:[1,5,6,1,0],roll:.6,hour:17.4,cloud:.4,props:[["tree",.045,.55],["pine",.006,.05,3],["bush",.03,.1,1],["stump",.01,.03],["mushroom",.012,.04],["bigcap",.004,.025],["rock",.008,.03]],monsters:[["hound",4],["bristlehog",4],["puffcap",3],["sproutling",2],["strider",2],["delver",2]],variant:{prefix:"Amber",pencil:[222,156,86]},boss:"ambersentinel",particles:"leaves",decor:[["fern",.07,-1],["tallgrass",.05,6],["tallgrass",.03,8],["flowers",.03,3],["pebbles",.012,0]],landmarks:["grove","ruins","bigcaps"]}],Ir=new Map(Ro.map(s=>[s.id,s])),Ft=s=>Ir.get(s),qs=Ro.filter(s=>s.mission).map(s=>s.id),Fr=`float bBob, bCharge, bNod;

void entPose() {
  float mv = ePose.w;
  bBob = abs(cos(ePose.x)) * 0.06 * mv + 0.01 * sin(uTime * 2.2 + eLook.x * 6.0);
  bCharge = 0.0;
  bNod = 0.06 * sin(uTime * 1.3 + eLook.x * 9.0) * (1.0 - mv) + 0.09 * sin(ePose.x * 2.0) * mv;
  if (ePose.y > 0.5 && ePose.y < 1.5) { float k = sin(saturate(ePose.z) * PI); bCharge = k * 0.3; bNod = -k * 0.25; }
  if (ePose.y > 2.5) bCharge = -0.1 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  float s = sin(ePose.x) * ePose.w;
  vec3 lp = p; lp.z -= bCharge * 0.4;
  float sx = sign(lp.x), sz = sign(lp.z);
  float ph = s * sx * sz;
  vec3 hipJ = vec3(0.15 * sx, 0.26 + bBob, 0.2 * sz);
  float lifted = max(cos(ePose.x) * sx * sz, 0.0) * ePose.w;
  vec3 foot = vec3(0.16 * sx, 0.05 + lifted * 0.13, 0.21 * sz + ph * 0.2);
  float legs = sdTaper(lp, hipJ, foot, 0.07, 0.055);
  p.z -= bCharge; p.y -= bBob;
  vec3 br = vec3(0.25, 0.225, 0.37);
  float body = sdEllipsoid(p - vec3(0.0, 0.38, -0.03), br);
  vec3 h = p - vec3(0.0, 0.36, 0.34);
  h.zy = rot2(bNod) * h.zy;
  float head = length(h) - 0.2;
  head = smin(head, sdTaper(h, vec3(0.0, -0.03, 0.1), vec3(0.0, -0.06, 0.3), 0.12, 0.085), 0.08);
  float ears = length(vec3(abs(h.x) - 0.14, h.y - 0.17, h.z + 0.02)) - 0.06;
  float d = smin(body, head, 0.08);
  d = min(d, ears);
  mat = 0.0;
  if (legs < d) { d = legs; mat = 0.0; }
  float tusk = sdTaper(vec3(abs(h.x), h.y, h.z), vec3(0.09, -0.1, 0.22), vec3(0.14, 0.0, 0.3), 0.03, 0.01);
  if (tusk < d) { d = tusk; mat = 2.0; }
  vec3 q = p - vec3(0.0, 0.57, -0.03);
  if (abs(q.z) < 0.34) {
    float qz = mod(q.z + 0.055, 0.11) - 0.055;
    float lift = 0.03 * (1.0 - abs(q.z) / 0.34) - q.z * q.z * 0.5;
    vec3 sp = vec3(q.x, q.y - lift + 0.03, qz);
    sp.zy = rot2(-0.5) * sp.zy;
    float spike = sdConeUp(sp, 0.05, 0.17) * 0.8;
    if (spike < d) { d = spike; mat = 1.0; }
  }
  float tail = sdCapsule(p, vec3(0.0, 0.42, -0.38), vec3(0.0, 0.52 + 0.03 * sin(uTime * 6.0), -0.47), 0.025);
  if (tail < d) { d = tail; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.9; return; }
  p.z -= bCharge; p.y -= bBob;
  float belly = smoothstep(0.34, 0.2, p.y);
  float stripe = smoothstep(0.1, 0.04, abs(p.x)) * smoothstep(0.4, 0.5, p.y);
  s.albedo = eColA;
  s.cover = mix(mix(0.82, 0.98, stripe), 0.12, belly);
  s.ink = step(0.72, vnoise(p.xz * 26.0 + p.y * 17.0)) * (1.0 - belly) * 0.5;
  s.wrap = 0.25;
  vec3 h = p - vec3(0.0, 0.36, 0.34);
  h.zy = rot2(bNod) * h.zy;
  if (h.z > 0.02) {
    float snout = smoothstep(0.1, 0.085, length(vec2(h.x, h.y + 0.06))) * step(0.26, h.z);
    if (snout > 0.5) { s.albedo = eColC; s.cover = 0.6; s.ink = 0.0; }
    float nostril = smoothstep(0.02, 0.012, length(vec2(abs(h.x) - 0.035, h.y + 0.055))) * step(0.3, h.z);
    vec2 e = vec2(abs(h.x) - 0.105, h.y - 0.055);
    float eye = smoothstep(0.034, 0.026, length(e));
    float glint = smoothstep(0.014, 0.008, length(vec2(h.x - sign(h.x) * 0.105 + 0.01, e.y - 0.012)));
    if (max(eye, nostril) > 0.5) { s.albedo = INK_BLACK; s.cover = 1.0 - glint * eye; s.solid = 1.0; s.ink = 0.0; }
    else s.ink = max(s.ink, penLine(e.y - 0.045 + e.x * 0.5) * step(abs(e.x), 0.055));
  }
}
`,Nr=`const vec3 CRAG_N[5] = vec3[5](
  vec3(0.83, 0.52, 0.21), vec3(-0.61, 0.61, 0.51), vec3(0.1, 0.7, -0.71),
  vec3(-0.5, 0.31, -0.81), vec3(0.3, -0.9, 0.31)
);

float lump(vec3 c, float r, float seed) {
  float d = length(c) - r;
  for (int i = 0; i < 5; i++) d = max(d, dot(c, CRAG_N[i]) - r * (0.66 + 0.22 * fract(seed * (5.0 + float(i) * 2.7))));
  return d - 0.03;
}

vec3 cFistL, cFistR;
float cBob, cStomp;

void entPose() {
  float s = sin(ePose.x) * ePose.w;
  cBob = abs(cos(ePose.x)) * 0.05 * ePose.w + 0.012 * sin(uTime * 1.6 + eLook.x * 6.0);
  cStomp = s;
  cFistL = vec3(-0.5, 0.4 + cBob, 0.08 - s * 0.2);
  cFistR = vec3(0.5, 0.4 + cBob, 0.08 + s * 0.2);
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float up = smoothstep(0.0, 0.4, ePose.z), down = smoothstep(0.4, 0.58, ePose.z), rec = smoothstep(0.7, 1.0, ePose.z);
    vec3 hi = vec3(0.3, 1.25, 0.1), lo = vec3(0.26, 0.2, 0.62);
    vec3 tgt = mix(mix(cFistR, hi, up), lo, down);
    tgt = mix(tgt, cFistR, rec);
    cFistR = tgt; cFistL = tgt * vec3(-1.0, 1.0, 1.0);
  }
  if (ePose.y > 2.5) cBob -= 0.06 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  float d = lump(p - vec3(0.0, 0.55 + cBob, 0.0), 0.44, eLook.x);
  d = min(d, lump(p - vec3(0.0, 1.02 + cBob, 0.06), 0.25, eLook.x + 0.31));
  vec3 fl = p - cFistL; fl.xz = fl.zx;
  d = min(d, lump(fl, 0.21, eLook.x + 0.53));
  d = min(d, lump(p - cFistR, 0.21, eLook.x + 0.71));
  vec3 lg = vec3(abs(p.x) - 0.17, p.y - 0.12 - max(cStomp * sign(p.x), 0.0) * 0.08, p.z - cStomp * sign(p.x) * 0.1);
  d = min(d, sdRoundBox(lg, vec3(0.11, 0.12, 0.13), 0.04));
  return d * 0.92;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec2 pv = pavers(p.xy * 3.4 + p.z * 2.3 + eLook.x * 20.0);
  s.albedo = eColA;
  s.cover = mix(0.5, 0.82, pv.y);
  s.ink = penLine(0.5 * pv.x / 3.4) * 0.8;
  float fist = step(min(length(p - cFistL), length(p - cFistR)), 0.3);
  if (fist > 0.5) { s.albedo = eColB; s.cover = mix(0.7, 0.92, pv.y); }
  float moss = smoothstep(0.75, 0.85, p.y - cBob) * step(p.y - cBob, 0.92) * step(0.45, vnoise(p.xz * 9.0));
  if (moss > 0.5 && fist < 0.5) { s.albedo = P_SAGE; s.cover = 0.8; s.ink *= 0.4; }
  vec3 f = p - vec3(0.0, 1.03 + cBob, 0.06);
  if (f.z > 0.1) {
    vec2 e = vec2(abs(f.x) - 0.09, f.y - 0.02);
    float socket = smoothstep(0.055, 0.045, length(e * vec2(1.0, 1.4)));
    float pupil = smoothstep(0.024, 0.016, length(e));
    if (socket > 0.5) { s.albedo = eColB; s.cover = 0.9; s.ink = 0.0; }
    if (pupil > 0.5) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; }
  }
}
`,Br=`float dSink, dLunge, dSway, dGape;

void entPose() {
  dSway = 0.14 * sin(uTime * 1.6 + eLook.x * 6.0) + 0.12 * sin(ePose.x) * ePose.w;
  dSink = 0.0;
  dLunge = 0.0;
  dGape = 0.25 + 0.1 * sin(uTime * 2.3 + eLook.x * 4.0);
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = sin(saturate(ePose.z) * PI);
    dLunge = k;
    dGape = mix(dGape, 1.0, smoothstep(0.0, 0.35, ePose.z) * (1.0 - smoothstep(0.5, 0.7, ePose.z)));
  }
  if (ePose.y > 2.5 && ePose.y < 3.5) dSink = 0.25 * (1.0 - ePose.z);
  if (ePose.y > 3.5) dSink = 1.75 * saturate(ePose.z);
}

vec3 dSeg(float k) {
  float lean = 0.55 * dLunge + 0.1;
  return vec3(dSway * k * 0.6, 0.28 + 1.18 * k - 0.35 * dLunge * k * k - dSink, lean * k * k * 1.3 + 0.05);
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  float d = max(sdTorusY(p - vec3(0.0, 0.02, 0.0), 0.5, 0.2), -p.y);
  mat = 2.0;
  float neck = 1e3;
  for (int i = 0; i < 5; i++) {
    float k = float(i) / 4.0;
    neck = smin(neck, length(p - dSeg(k)) - mix(0.4, 0.3, k), 0.1);
  }
  neck = max(neck, -p.y - 0.02);
  if (neck < d) { d = neck; mat = 0.0; }
  vec3 top = dSeg(1.0), up = normalize(dSeg(1.0) - dSeg(0.75));
  vec3 m = p - top - up * 0.2;
  float ang = atan(m.x, m.z), sec = TAU / 3.0;
  float a3 = mod(ang + sec * 0.5, sec) - sec * 0.5, rr = length(m.xz);
  vec3 j = vec3(sin(a3) * rr, m.y, cos(a3) * rr);
  float jaw = sdTaper(j, vec3(0.0, -0.05, 0.2), vec3(0.0, 0.3, 0.2 + 0.2 * dGape - 0.14), 0.08, 0.015);
  jaw = max(jaw, -p.y);
  if (jaw < d) { d = jaw; mat = 1.0; }
  return d * 0.85;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_BARK; s.cover = 0.7; s.ink = step(0.7, vnoise(p.xz * 9.0)) * 0.5; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.9; return; }
  float h = p.y + dSink;
  float front = smoothstep(0.0, 0.25, p.z - 0.05 - 0.4 * h * h * (0.55 * dLunge + 0.1));
  s.albedo = eColA; s.cover = mix(0.84, 0.3, front); s.wrap = 0.3;
  s.ink = penLine((fract(h * 3.4) - 0.5) / 3.4) * 0.7;
  vec3 top = dSeg(1.0);
  if (length(p - top) < 0.33 && p.y > top.y + 0.12) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
}
`,Hr=`float dRise, dFlap, dPitch, dRoll, dSpin, dWide, dCore, dBob, dDrop;

void entPose() {
  float act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float beat = sin(uTime * 0.9 + eLook.x * 6.0);
  dRise = 0.0; dRoll = 0.0; dDrop = 0.0;
  dPitch = 0.07 * mv;
  dBob = 0.35 * sin(uTime * 0.6 + eLook.x * 3.0);
  dFlap = 0.16 * beat + 0.08 * mv * sin(uTime * 2.2);
  dSpin = uTime * 0.45; dWide = 6.6; dCore = 0.62 + 0.15 * beat;
  if (act > 0.5 && act < 1.5) {
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    dPitch = (-0.5 * up + 1.25 * down) * (1.0 - rec);
    dFlap = mix(dFlap, 0.55, up * (1.0 - down));
    dRise = (1.6 * up - 4.2 * down) * (1.0 - rec);
    dCore = mix(dCore, 1.0, up * (1.0 - rec));
  } else if (act > 2.5 && act < 3.5) {
    dPitch = -0.15 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    dRise = -(1.0 - smoothstep(0.05, 0.85, at)) * 16.0;
    dFlap = mix(0.8, dFlap, smoothstep(0.55, 1.0, at));
    dWide = mix(2.4, 6.6, smoothstep(0.6, 1.0, at));
    dPitch = -0.5 * (1.0 - smoothstep(0.3, 0.9, at));
    dCore = smoothstep(0.5, 0.9, at);
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    dFlap = mix(dFlap, -0.1, hold);
    dWide = 6.6 + 2.8 * hold; dSpin += 5.0 * at;
    dPitch = -0.22 * hold; dRoll = 0.04 * sin(uTime * 33.0) * hold;
    dCore = mix(dCore, 1.0, hold);
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    dRoll = 0.5 * st + 0.3 * dn;
    dPitch = 0.4 * dn;
    dFlap = mix(dFlap, 0.5, dn);
    dRise = -3.2 * dn - 10.0 * go;
    dDrop = at;
    dCore *= 1.0 - dn;
  }
}

vec3 dLocal(vec3 p) {
  p.y -= 4.6 + dBob + dRise;
  p.xy = rot2(dRoll) * p.xy;
  p.zy = rot2(dPitch) * p.zy;
  return p;
}

float entMap(vec3 p, out float mat) {
  vec3 q = dLocal(p);
  mat = 0.0;
  float out_ = max(abs(q.x) - 1.6, 0.0);
  float d = sdEllipsoid(q - vec3(0.0, 0.0, 0.3), vec3(2.3, 1.15, 3.9));
  vec3 w = vec3(abs(q.x), q.y - out_ * dFlap, q.z + 0.3 * out_);
  d = smin(d, sdEllipsoid(w - vec3(4.8, 0.0, -0.4), vec3(4.9, 0.32, 2.5)), 0.7);
  d = smin(d, sdTaper(w, vec3(0.9, 0.0, 3.3), vec3(1.5, -0.35, 5.0), 0.5, 0.16), 0.4);
  float wave = 0.5 * sin(uTime * 1.1 + eLook.x * 5.0);
  vec3 t1 = vec3(0.0, -0.1, -3.4), t2 = vec3(wave * 0.6, -0.3, -6.6), t3 = vec3(-wave, -0.2 + 1.2 * dFlap, -9.8);
  d = smin(d, min(sdTaper(q, t1, t2, 0.55, 0.26), sdTaper(q, t2, t3, 0.26, 0.1)), 0.4);
  float lights = min(length(q - t3) - 0.42, length(q - vec3(0.0, 0.95, 0.6)) - 0.75);
  if (lights < d) { d = lights; mat = 3.0; }
  vec3 o = p - vec3(0.0, 4.6 + dBob + max(dRise, -2.5), 0.0);
  float sec = TAU / 5.0, ang = atan(o.x, o.z) - dSpin;
  float k = floor(ang / sec + 0.5), a = ang - k * sec, rr = length(o.xz);
  k = mod(k, 5.0);
  float fall = 7.0 * smoothstep(0.0, 0.35, dDrop - 0.07 * k) * step(0.001, dDrop);
  vec3 sq = vec3(sin(a) * rr, o.y - 0.7 * sin(k * 2.1 + uTime * 0.8) + fall, cos(a) * rr - dWide);
  float shard = (abs(sq.y) / 1.5 + (abs(sq.x) + abs(sq.z)) / 0.6 - 1.0) * 0.38;
  if (shard < d) { d = shard; mat = 2.0; }
  return d * 0.8;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = dLocal(p);
  if (mat > 2.5) { s.albedo = eColC; s.cover = mix(0.8, 0.1, dCore); s.glow = dCore; return; }
  if (mat > 1.5) { s.albedo = eColB; s.cover = 0.88; s.ink = step(0.8, vnoise(p.xy * 3.0 + p.z)) * 0.4; return; }
  float out_ = max(abs(q.x) - 1.6, 0.0);
  float under = smoothstep(0.1, -0.25, q.y - out_ * dFlap);
  float along = q.z * 0.55 + 0.16 * abs(q.x);
  vec2 v = voronoi(q.xz * 0.55 + eLook.x * 20.0);
  float spot = smoothstep(0.24, 0.17, v.x) * step(0.45, v.y) * (1.0 - under);
  s.albedo = mix(eColA, eColC, under); s.wrap = 0.3;
  s.cover = mix(mix(0.66, 0.9, hash12(vec2(floor(along), floor(abs(q.x) * 0.5)))), 0.22, under);
  s.cover = mix(s.cover, 0.06, spot);
  s.ink = max(penLine((abs(fract(along) - 0.5) - 0.5) / 0.55) * 0.6 * (1.0 - under), penLine((v.x - 0.2) / 0.55) * step(0.45, v.y) * (1.0 - under) * 0.5);
  if (length(vec3(abs(q.x) - 0.85, q.y - 0.3, q.z - 3.5)) < 0.3) { s.albedo = eColC; s.cover = 0.12; s.glow = 0.9; s.ink = 0.0; }
}
`,Dr=`float dBob;
mat2 dSpin;

void entPose() {
  dBob = 0.2 + 0.05 * sin(uTime * 2.6 + eLook.x * 6.28) + ePose.w;
  dSpin = rot2(uTime * 1.8 + eLook.x * 6.28);
}

float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(0.0, dBob, 0.0);
  q.xz = dSpin * q.xz;
  mat = 0.0;
  if (eExtra < 0.5) {
    float c1 = max(length(q.xy) - 0.14, abs(q.z) - 0.025);
    float c2 = max(length(q.xy - vec2(0.12, -0.06)) - 0.11, abs(q.z + 0.07) - 0.022);
    return min(c1, c2) - 0.008;
  }
  if (eExtra < 1.5) {
    float sack = length(q * vec3(1.0, 1.15, 1.0) + vec3(0.0, 0.02, 0.0)) - 0.15;
    float neck = sdCapsule(q, vec3(0.0, 0.1, 0.0), vec3(0.0, 0.19, 0.0), 0.05);
    float tie = sdTorusY(q - vec3(0.0, 0.13, 0.0), 0.055, 0.016);
    float d = smin(sack, neck, 0.05);
    if (tie < d) { d = tie; mat = 1.0; }
    return d;
  }
  if (eExtra < 2.5) {
    float flask = length(q + vec3(0.0, 0.03, 0.0)) - 0.13;
    float neck = sdCylinder(q - vec3(0.0, 0.06, 0.0), 0.045, 0.1);
    float cork = sdCylinder(q - vec3(0.0, 0.16, 0.0), 0.05, 0.04);
    float d = smin(flask, neck, 0.03);
    if (cork < d) { d = cork; mat = 1.0; }
    return d;
  }
  float hx = max(abs(q.x) * 0.866 + abs(q.z) * 0.5, abs(q.z));
  return max(hx - 0.12 + abs(q.y) * 0.7, abs(q.y) - 0.17) * 0.8;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(0.0, dBob, 0.0);
  q.xz = dSpin * q.xz;
  if (eExtra < 0.5) {
    s.albedo = P_SUN; s.cover = 0.85;
    s.ink = penLine(length(q.xy) - 0.095) * 0.6;
  } else if (eExtra < 1.5) {
    s.albedo = mat > 0.5 ? P_BRICK : P_TAN; s.cover = mat > 0.5 ? 0.9 : 0.7;
  } else if (eExtra < 2.5) {
    s.albedo = mat > 0.5 ? P_BARK : eColA;
    s.cover = mat > 0.5 ? 0.85 : mix(0.06, 0.88, step(q.y, 0.0));
    s.ink = mat > 0.5 ? 0.0 : penLine(q.y) * 0.7;
  } else {
    s.albedo = eColA; s.cover = mix(0.85, 0.15, step(0.0, q.x * 0.6 + q.y));
    s.glow = 0.25;
  }
}
`,Or=`#include <held>

const float STOUT = 1.8;
#define ENT_EDGE_GLOW
float gKitG = 0.0;
vec4 entEdgeGlow(float mat) { return mat > 0.5 && mat < 1.5 && gKitG < 0.5 ? vec4(SABER_COL, 0.9) : vec4(0.0); }
float gPiece, gKit, gLook;
vec3 gHand, gDir, gSide;

void entPose() {
  gPiece = floor(eExtra + 0.5);
  gKit = floor(gPiece * 0.5 + 0.01);
  gLook = gPiece - gKit * 2.0;
  gKitG = gPiece < 5.5 ? gKit : 9.0;
  gDir = normalize(vec3(0.62, 0.76, 0.12));
  gSide = normalize(vec3(-0.76, 0.62, 0.0));
  float mid = gKit < 0.5 ? (gLook < 0.5 ? 0.45 : 0.37) : (gKit < 1.5 ? 0.2 : (gLook < 0.5 ? 0.31 : 0.37));
  gHand = -gDir * mid;
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  if (gPiece < 5.5) {
    vec3 q = p - gHand;
    float along = dot(q, gDir);
    q = gHand + gDir * along + (q - gDir * along) / STOUT;
    float solid, lit;
    heldMap(q, gHand, gDir, gSide, gKit, gLook, solid, lit);
    mat = lit < solid ? 1.0 : 0.0;
    return min(solid, lit);
  }
  if (gPiece > 9.5) {
    float lit, solid = wornMap(p, gPiece - 10.0, lit);
    mat = lit < solid ? 9.0 : 8.0;
    return min(solid, lit);
  }
  if (gPiece < 7.5) {
    float body = sdTaper(p, vec3(0.0, -0.2, 0.0), vec3(0.0, 0.07, 0.0), 0.168, 0.15);
    body = min(body, sdTaper(vec3(abs(p.x), p.y, p.z), vec3(0.17, 0.08, 0.0), vec3(0.3, -0.06, 0.02), 0.07, 0.062));
    float collar = sdTorusY(p - vec3(0.0, 0.2, 0.0), 0.115, 0.045);
    float caps = eSpare < 0.5 ? length(vec3(abs(p.x) - 0.205, p.y - 0.115, p.z)) - 0.108 : 1e3;
    float worn = frameMap(p - vec3(0.0, 0.03, 0.0), 1.0, gPiece - 6.0);
    float d = body; mat = 2.0;
    if (collar < d) { d = collar; mat = 3.0; }
    if (caps < d) { d = caps; mat = 4.0; }
    if (worn < d) { d = worn; mat = 5.0; }
    return d;
  }
  float lit, pack = unitMap(vec3(p.x, p.y, -p.z), gPiece - 7.0, lit);
  mat = lit < pack ? 7.0 : 6.0;
  return min(pack, lit);
}

void entSurf(vec3 p, float mat, inout Surf s) {
  int m = int(mat + 0.5);
  if (m < 2) { heldSurf(gKit, gLook, m == 1, s, dot(p - gHand, gDir)); return; }
  if (m == 5) { frameSurf(p - vec3(0.0, 0.03, 0.0), 1.0, s); return; }
  if (m > 7) { wornSurf(p, gPiece - 10.0, m == 9, s); return; }
  if (m > 5) { unitSurf(vec3(p.x, p.y, -p.z), gPiece - 7.0, m == 7, s); return; }
  bool shell = eSpare < 0.5;
  if (m == 3) { s.albedo = eColB; s.cover = 0.86; return; }
  if (m == 4) { s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25; s.ink = penLine(abs(p.y - 0.115) - 0.06) * 0.6; return; }
  if (shell) {
    s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25;
    bool arm = abs(p.x) > 0.19;
    if (arm) { s.albedo = P_SLATE; s.cover = 0.84; }
    else {
      if (p.y < -0.1) { s.albedo = P_SLATE; s.cover = 0.84; }
      s.ink = penLine(p.y + 0.1) * 0.85;
      float lamp = length(p.xy - vec2(0.0, 0.085));
      if (p.z > 0.04 && lamp < 0.07) { s.albedo = P_SKY; s.cover = lamp < 0.048 ? 0.3 : 0.9; s.glow = lamp < 0.048 ? 0.7 : 0.0; s.ink = penLine(lamp - 0.07) * 0.8; }
      if (abs(p.y + 0.15) < 0.03) { s.albedo = eColA; s.cover = 0.86; s.ink = 0.0; }
    }
  } else {
    s.albedo = eColA; s.cover = 0.84;
    bool torso = abs(p.x) < 0.17;
    float belt = abs(p.y + 0.15) - 0.026;
    if (belt < 0.0 && torso) { s.albedo = P_UMBER; s.cover = 0.95; }
    s.ink = penLine(belt) * 0.9 * float(torso);
    if (torso && p.z > 0.0 && abs(p.x) < 0.022 && belt > 0.0) { s.albedo = P_CREAM; s.cover = 0.12; }
    if (torso && p.z > 0.0 && belt > 0.0) s.ink = max(s.ink, penLine(abs(p.x) - 0.022) * 0.6);
    if (!torso && p.y < -0.02) { s.albedo = P_CREAM; s.cover = 0.14; }
  }
}
`,$r=`float hBob, hLunge, hNod, hCrouch;

void entPose() {
  float mv = ePose.w;
  hBob = abs(sin(ePose.x)) * 0.07 * mv + 0.012 * sin(uTime * 2.4 + eLook.x * 6.0);
  hLunge = 0.0;
  hCrouch = 0.0;
  hNod = 0.05 * sin(uTime * 1.5 + eLook.x * 9.0) * (1.0 - mv);
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = sin(saturate(ePose.z) * PI);
    hLunge = k * 0.34;
    hNod = -k * 0.3;
    hCrouch = 0.1 * smoothstep(0.0, 0.2, ePose.z) * (1.0 - smoothstep(0.2, 0.5, ePose.z));
  }
  if (ePose.y > 2.5) hLunge = -0.1 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  float s = sin(ePose.x) * ePose.w;
  float sx = p.x < 0.0 ? -1.0 : 1.0, sz = p.z < 0.0 ? -1.0 : 1.0, ph = s * sx * sz;
  float lifted = max(cos(ePose.x) * sx * sz, 0.0) * ePose.w;
  vec3 hip = vec3(0.12 * sx, 0.44 + hBob - hCrouch, 0.27 * sz + hLunge * 0.5);
  vec3 foot = vec3(0.13 * sx, 0.04 + lifted * 0.16, 0.3 * sz + ph * 0.3 + hLunge * 0.3);
  vec3 knee = mix(hip, foot, 0.5) + vec3(0.0, 0.0, -0.09 * sz);
  float legs = min(sdTaper(p, hip, knee, 0.06, 0.04), sdTaper(p, knee, foot, 0.04, 0.03));
  float paws = length((p - foot - vec3(0.0, 0.0, 0.03)) * vec3(1.0, 1.4, 0.8)) - 0.05;
  vec3 q = p - vec3(0.0, hBob - hCrouch, hLunge);
  float body = sdEllipsoid(q - vec3(0.0, 0.5, -0.02), vec3(0.17, 0.17, 0.4));
  body = smin(body, sdEllipsoid(q - vec3(0.0, 0.53, 0.22), vec3(0.19, 0.2, 0.2)), 0.08);
  vec3 h = q - vec3(0.0, 0.62, 0.44);
  h.zy = rot2(hNod) * h.zy;
  float head = sdEllipsoid(h, vec3(0.13, 0.12, 0.15));
  head = smin(head, sdTaper(h, vec3(0.0, -0.03, 0.08), vec3(0.0, -0.06, 0.3), 0.085, 0.05), 0.06);
  vec3 e = vec3(abs(h.x) - 0.08, h.y - 0.08, h.z + 0.02);
  float ears = sdTaper(e, vec3(0.0), vec3(0.06, 0.2, -0.24), 0.05, 0.012);
  float tail = sdTaper(q, vec3(0.0, 0.56, -0.38), vec3(0.03 * sin(uTime * 5.0 + eLook.x), 0.74 - 0.2 * ePose.w, -0.72), 0.05, 0.02);
  float d = smin(body, head, 0.07);
  d = min(d, min(min(legs, ears), tail));
  float fang = sdTaper(vec3(abs(h.x) - 0.045, h.y, h.z), vec3(0.0, -0.09, 0.24), vec3(0.0, -0.17, 0.25), 0.02, 0.004);
  vec3 c = q - vec3(0.0, 0.68, -0.02);
  float cz = mod(c.z + 0.07, 0.14) - 0.07;
  vec3 sp = vec3(c.x, c.y, cz); sp.zy = rot2(-0.55) * sp.zy;
  float crest = abs(c.z) < 0.34 ? sdConeUp(sp, 0.04, 0.13) * 0.8 : 1e3;
  float hurt = min(min(fang, crest), paws);
  if (hurt < d) { d = hurt; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.9; return; }
  vec3 q = p - vec3(0.0, hBob - hCrouch, hLunge);
  float belly = smoothstep(0.46, 0.36, q.y) * step(0.3, q.y);
  s.albedo = eColA; s.cover = mix(0.84, 0.14, belly); s.wrap = 0.25;
  s.ink = step(0.74, vnoise(q.xz * 24.0 + q.y * 16.0)) * (1.0 - belly) * 0.45;
  vec3 h = q - vec3(0.0, 0.62, 0.44);
  h.zy = rot2(hNod) * h.zy;
  if (h.z > 0.0 && length(h) < 0.4) {
    vec2 e = vec2(abs(h.x) - 0.075, h.y - 0.03);
    float eye = smoothstep(0.03, 0.022, length(e * vec2(1.0, 1.3)));
    float nose = smoothstep(0.035, 0.025, length(vec3(h.x, h.y + 0.05, h.z - 0.3)));
    if (max(eye, nose) > 0.5) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
    else s.ink = max(s.ink, penLine(e.y - 0.04 + e.x * 0.6) * step(abs(e.x), 0.05));
  }
}
`,Ur=`#include <held>

vec3 hHip, hChest, hHead, hHandL, hHandR, hFootL, hFootR, hBlade, hSide;
float kind;
float hKit, hLook, hFrame, hUnit;
float hOff, hGrip, hBoot;

void entPose() {
  float w = ePose.x, act = ePose.y, at = ePose.z, mv = ePose.w;
  kind = floor(eExtra + 0.5);
  float kf = fract(eSpare + 0.01), wr = eExtra - kind;
  hKit = floor(eSpare + 0.01);
  hLook = step(0.5, kf);
  hFrame = floor(wr * 10.0 + 0.05);
  hUnit = floor((wr - hFrame * 0.1) * 100.0 + 0.5);
  float worn = floor(eLook.w / 4.0 + 0.01), rest = floor(worn / 4.0 + 0.01);
  hOff = worn - rest * 4.0;
  hBoot = floor(rest / 3.0 + 0.01);
  hGrip = rest - hBoot * 3.0;
  float s = sin(w), c = cos(w);
  float idle = sin(uTime * 2.0 + eLook.x * 6.28);
  float run = smoothstep(0.8, 1.0, mv);
  float apart = s * s;
  float bob = mix(abs(c) * 0.05, apart * 0.15 - 0.04, run) * mv + 0.01 * idle * (1.0 - mv);
  float lean = mv * mix(0.05, 0.14, run);
  hHip = vec3(0.0, 0.4 + bob, 0.0);
  hChest = hHip + vec3(0.0, 0.27 - 0.015 * run, lean);
  hHead = hChest + vec3(0.0, 0.43 - 0.01 * run, lean * 0.6 - 0.02 * run * apart);
  float reach = 0.4 * mv;
  float lift = mix(0.1, 0.25, run) * min(1.0, mv * 1.5);
  float air = run * mv * apart * 0.11;
  float early = 0.6 * run;
  hFootL = vec3(-0.12, 0.07 + max(cos(w - early), 0.0) * lift + air, s * reach - 0.05 * run);
  hFootR = vec3(0.12, 0.07 + max(-cos(w - early), 0.0) * lift + air, -s * reach - 0.05 * run);
  if (kind > 1.5 && kind < 2.5) {
    hFootL = vec3(hFootL.x, mix(0.07, hFootL.y, 0.12), hFootL.z * 0.3);
    hFootR = vec3(hFootR.x, mix(0.07, hFootR.y, 0.12), hFootR.z * 0.3);
  }
  float pump = mix(0.2, 0.32, run) * mv;
  float rise = 0.09 * run * mv;
  hHandL = hChest + vec3(-0.3 + 0.04 * run, -0.24 + 0.01 * idle + rise * max(-s, 0.0), -s * pump + 0.02);
  hHandR = hChest + vec3(0.3 - 0.03 * run, -0.24 + 0.01 * idle + rise * max(s, 0.0), s * pump * 0.7 + 0.02);
  hBlade = normalize(vec3(0.25, 0.85 - 0.2 * run, 0.45 - 0.5 * run));
  if (act > 0.5 && act < 1.5) {
    float wind = smoothstep(0.0, 0.22, at), cut = smoothstep(0.22, 0.5, at), rec = smoothstep(0.62, 1.0, at);
    float ang = mix(mix(0.4, 2.2, wind), -1.1, cut);
    float wLift = wind * (1.0 - cut);
    float link = floor((kf - 0.5 * hLook) * 10.0 + 0.2);
    if (link > 0.5 && link < 1.5) ang = 0.9 - ang;
    vec3 strike = hChest + vec3(sin(ang) * 0.46, 0.12 + 0.28 * wLift, cos(ang) * 0.46);
    vec3 edge = normalize(vec3(sin(ang), 0.25 + 0.6 * wLift, cos(ang)));
    if (link > 1.5) {
      strike = hChest + vec3(0.14, 0.1 + 0.42 * wLift - 0.16 * cut, 0.14 + 0.36 * cut);
      edge = normalize(mix(vec3(0.1, 1.0, -0.45), vec3(0.0, -0.05, 1.0), cut));
    }
    hBlade = normalize(mix(edge, hBlade, rec));
    hHandR = mix(strike, hHandR, rec);
    hChest.x += 0.04 * (cut - rec);
    hHead.z += 0.04 * cut * (1.0 - rec);
  } else if (act > 1.5 && act < 2.5) {
    float k = sin(saturate(at) * PI);
    hHandL = mix(hHandL, hChest + vec3(-0.16, 0.12, 0.38), k);
    hHandR = mix(hHandR, hChest + vec3(0.16, 0.12, 0.38), k);
    hBlade = normalize(mix(hBlade, vec3(0.0, 0.5, 0.86), k));
  } else if (act > 2.5 && act < 3.5) {
    float k = 1.0 - at;
    hChest.z -= 0.08 * k;
    hHead.z -= 0.14 * k;
    hHandL.y += 0.1 * k;
    hHandR.y += 0.1 * k;
  } else if (act > 3.5 && act < 4.5) {
    hHip = vec3(0.0, 0.33, 0.0);
    hChest = hHip + vec3(0.0, 0.24, 0.17);
    hHead = hChest + vec3(0.0, 0.4, 0.13);
    hFootL = vec3(-0.11, 0.09, 0.46);
    hFootR = vec3(0.11, 0.24, -0.5);
    hHandL = hChest + vec3(-0.27, -0.08, -0.34);
    hHandR = hChest + vec3(0.3, -0.14, -0.3);
    hBlade = normalize(vec3(0.2, 0.22, -0.95));
  } else if (act > 4.5 && act < 5.5) {
    float up = sin(saturate(at) * PI), down = smoothstep(0.55, 1.0, at);
    hFootL = vec3(-0.13, 0.07 + 0.15 * up * (1.0 - down), 0.1 * up);
    hFootR = vec3(0.13, 0.07 + 0.19 * up * (1.0 - down), -0.07 * up);
    hHandL = hChest + vec3(-0.33, -0.06 + 0.22 * up, 0.02);
    hHandR = hChest + vec3(0.33, -0.06 + 0.2 * up, 0.04);
    hChest.z += 0.04 * up;
    hHead.y += 0.02 * up;
  } else if (act > 6.5 && act < 7.5) {
    float br = sin(uTime * 1.9), sh = sin(uTime * 0.7 + 1.0);
    hHip += vec3(0.016 * sh, 0.004 * br, 0.0);
    hChest += vec3(0.024 * sh, 0.014 * br, 0.0);
    hHead += vec3(0.03 * sh, 0.017 * br, 0.0);
    hHandL += vec3(0.022 * sh - 0.012 * br, 0.012 * br, 0.0);
    hHandR += vec3(0.022 * sh + 0.012 * br, 0.012 * br, 0.0);
    float every = fract(uTime / 7.0);
    float show = smoothstep(0.0, 0.1, every) * smoothstep(0.34, 0.22, every);
    hHandR = mix(hHandR, hChest + vec3(0.27, 0.02, 0.2), show);
    hBlade = normalize(mix(hBlade, vec3(-0.12, 0.96, 0.25), show));
  }
  hSide = normalize(cross(hBlade, vec3(0.0, 1.0, 0.0)) + vec3(1e-3, 0.0, 0.0));
}

vec3 offLocal(vec3 p, float wide, out float k) {
  k = 1.0;
  if (hOff < 1.5) {
    vec3 n = normalize(vec3(-0.78, 0.08, 0.62)), r = normalize(cross(vec3(0.0, 1.0, 0.0), n)), u = cross(n, r);
    vec3 q = p - hHandL - vec3(-0.07, 0.07, 0.0);
    return vec3(dot(q, r), dot(q, u), dot(q, n));
  }
  if (hOff < 2.5) { k = 0.8; return (p - hHip - vec3(-0.2 * wide, 0.03, 0.05)) / k; }
  k = 0.75;
  return (p - hHandL - vec3(-0.02, 0.21 + 0.02 * sin(uTime * 2.2 + eLook.x * 6.0), 0.07)) / k;
}

#define ENT_EDGE_GLOW
vec4 entEdgeGlow(float mat) {
  if (mat > 7.5 && mat < 8.5) return hKit < 0.5 ? vec4(SABER_COL, 0.9) : hKit > 1.5 ? vec4(mix(P_SKY, P_TEAL, 0.5), 0.6) : vec4(0.0);
  return vec4(0.0);
}

float kWide() { return kind > 2.5 && kind < 3.5 ? 1.36 : (kind > 1.5 && kind < 2.5 ? 0.86 : (kind > 3.5 ? 0.9 : 1.0)); }

float entMap(vec3 p, out float mat) {
  vec3 hp = p - hHead;
  float wide = kWide();
  float d = 1e3;
  mat = 0.0;
  float hair = 1e3, accent = 1e3, wood = 1e3, metal = 1e3, glow = 1e3, plate = 1e3, bone = 1e3, fur = 1e3, skin = 1e3, dark = 1e3;
  vec3 neck = hChest + vec3(0.0, 0.15, 0.0);
  float sway = sin(uTime * 3.0 + eLook.x * 9.0);

  if (kind < 0.5) {
    d = length(hp * vec3(1.0, 1.05, 1.0)) - 0.345;
    mat = 10.0;
    accent = sdTorusY(p - neck, 0.13, 0.06);
    vec3 ta = neck + vec3(0.06, 0.0, -0.13);
    vec3 tb = ta + vec3(0.05 + 0.05 * sway, -0.14 + 0.1 * ePose.w, -0.26 - 0.14 * ePose.w);
    accent = smin(accent, sdTaper(p, ta, tb, 0.055, 0.035), 0.05);
    metal = length(vec3(abs(hp.x) - 0.34, hp.y + 0.02, hp.z + 0.02) * vec3(1.6, 1.0, 1.0)) - 0.1;
    metal = min(metal, sdCapsule(hp, vec3(0.36, 0.04, -0.02), vec3(0.45, 0.4, -0.12), 0.016));
    accent = min(accent, sdCapsule(hp, vec3(0.0, 0.325, 0.13), vec3(0.0, 0.3, -0.2), 0.045));
    accent = min(accent, length(hp - vec3(0.45, 0.42, -0.12)) - 0.032);
    plate = length(vec3(abs(p.x - hChest.x) - 0.205, p.y - hChest.y - 0.085, p.z - hChest.z)) - 0.108;
    vec3 bk = p - hChest - vec3(0.0, -0.02, -0.17);
    plate = min(plate, sdRoundBox(bk, vec3(0.115, 0.13, 0.06), 0.03));
    plate = min(plate, sdRoundBox(vec3(abs(bk.x) - 0.1, bk.y - 0.12, bk.z + 0.05), vec3(0.015, 0.09, 0.05), 0.01));
  } else if (kind < 1.5) {
    d = length(hp) - 0.31;
    float style = floor(fract(eLook.x * 7.31) * 4.0);
    hair = length(hp - vec3(0.0, 0.035, -0.035)) - 0.348;
    if (style > 0.5 && style < 1.5) hair = smin(hair, sdEllipsoid(hp - vec3(0.0, -0.13, -0.1), vec3(0.335, 0.2, 0.25)), 0.06);
    hair = max(hair, hp.z * 0.85 - hp.y * 0.55 - 0.16 - 0.025 * sin(hp.x * 24.0));
    if (style > 1.5 && style < 2.5) hair = smin(hair, sdTaper(hp, vec3(0.0, 0.16, -0.3), vec3(0.07 * sway, -0.22 + 0.1 * ePose.w, -0.44 - 0.12 * ePose.w), 0.1, 0.04), 0.07);
    if (style > 2.5) hair = smin(hair, length(hp - vec3(0.02, 0.34, -0.1)) - 0.1, 0.08);
    accent = sdTorusY(p - neck + vec3(0.0, 0.02, 0.0), 0.125, 0.05);
    if (fract(eLook.x * 3.71) > 0.5) {
      vec3 ta = neck + vec3(-0.07, -0.02, -0.12);
      accent = smin(accent, sdTaper(p, ta, ta + vec3(-0.04 - 0.05 * sway, -0.16 + 0.1 * ePose.w, -0.22 - 0.14 * ePose.w), 0.05, 0.03), 0.05);
    }
    plate = sdRoundBox(p - hHip - vec3(-0.2, 0.02, -0.06), vec3(0.05, 0.08, 0.09), 0.03);
  } else if (kind < 2.5) {
    dark = length(hp - vec3(0.0, 0.0, -0.02)) - 0.3;
    bone = sdEllipsoid(hp - vec3(0.0, -0.02, 0.2), vec3(0.17, 0.215, 0.11));
    float hood = length(hp - vec3(0.0, 0.03, -0.05)) - 0.39;
    hood = max(hood, hp.z * 0.9 - hp.y * 0.18 - 0.2);
    hood = smin(hood, sdTaper(hp, vec3(0.0, 0.27, -0.16), vec3(0.03 * sway, 0.3 - 0.06 * ePose.w, -0.5), 0.13, 0.03), 0.1);
    accent = smin(hood, sdEllipsoid(p - hChest - vec3(0.0, 0.07, -0.01), vec3(0.27, 0.13, 0.2)), 0.06);
  } else if (kind < 3.5) {
    skin = sdEllipsoid(hp, vec3(0.35, 0.3, 0.325));
    skin = smin(skin, length(hp - vec3(0.0, -0.13, 0.07)) - 0.245, 0.08);
    vec3 a = vec3(abs(hp.x), hp.y, hp.z);
    bone = min(sdTaper(a, vec3(0.25, 0.17, -0.02), vec3(0.43, 0.36, -0.02), 0.085, 0.055), sdTaper(a, vec3(0.43, 0.36, -0.02), vec3(0.39, 0.57, 0.05), 0.055, 0.012));
    bone = min(bone, sdTaper(a, vec3(0.13, -0.24, 0.24), vec3(0.155, -0.08, 0.31), 0.036, 0.01));
    skin = min(skin, length(a - vec3(0.36, 0.02, -0.03)) - 0.07);
    plate = length((p - hChest - vec3(-0.26, 0.12, 0.0)) * vec3(1.0, 1.15, 1.0)) - 0.16;
    accent = sdTorusY(p - hHip - vec3(0.0, 0.07, 0.0), 0.2, 0.04);
  } else {
    d = length(hp) - 0.3;
    hair = length(hp - vec3(0.0, 0.04, -0.04)) - 0.335;
    hair = max(hair, hp.z * 0.85 - hp.y * 0.6 - 0.15 - 0.03 * sin(hp.x * 20.0));
    vec3 a = vec3(abs(hp.x), hp.y, hp.z);
    float twitch = 0.04 * sin(uTime * 1.3 + eLook.x * 20.0) * step(0.8, fract(uTime * 0.23 + eLook.x));
    vec3 er = a - vec3(0.17, 0.2, -0.03);
    er.z *= 1.9;
    fur = sdTaper(er, vec3(0.0), vec3(0.15 + twitch, 0.46, -0.06), 0.13, 0.025) * 0.6;
    vec3 t0 = hHip + vec3(0.0, -0.02, -0.15), t1 = hHip + vec3(0.08 * sway, 0.0 + 0.06 * ePose.w, -0.42), t2 = hHip + vec3(0.16 * sway, 0.24 - 0.14 * ePose.w, -0.62);
    fur = min(fur, smin(sdTaper(p, t0, t1, 0.06, 0.11), sdTaper(p, t1, t2, 0.11, 0.05), 0.08));
    accent = sdTaper(p, hChest + vec3(0.0, 0.15, 0.0), hChest + vec3(0.0, -0.1, -0.02), 0.17, 0.3);
    accent = max(accent, -(p.y - hChest.y + 0.12));
  }

  heldMap(p, hHandR, hBlade, hSide, hKit, hLook, wood, glow);
  float offLit = 1e3, off = 1e3;
  if (hOff > 0.5) { float k; vec3 oq = offLocal(p, wide, k); off = wornMap(oq, hOff - 1.0, offLit) * k; offLit *= k; }
  float worn = frameMap(p - hChest, wide, hFrame);
  float packLit, pack = unitMap(p - hChest - vec3(0.0, 0.0, kind < 0.5 ? -0.275 : -0.2 * max(wide, 1.0)), hUnit, packLit);

  if (skin < d) { d = skin; mat = 0.0; }
  if (dark < d) { d = dark; mat = 13.0; }
  if (hair < d) { d = hair; mat = 1.0; }

  float karn = step(2.5, kind) * step(kind, 3.5), veiled = step(1.5, kind) * step(kind, 2.5), unit = step(kind, 0.5), lynd = step(3.5, kind);
  vec3 waist = hHip + vec3(0.0, 0.05, 0.0);
  float tunic = sdTaper(p, waist, hChest + vec3(0.0, 0.04, 0.0), 0.168 * wide - 0.035 * karn, 0.15 * wide + 0.06 * karn);
  if (veiled > 0.5) {
    vec3 hem = vec3(hHip.x, 0.1, mix(hHip.z, 0.5 * (hFootL.z + hFootR.z), 0.4));
    tunic = smin(tunic, max(sdTaper(p, hHip + vec3(0.0, 0.03, 0.0), hem, 0.175, 0.235), 0.07 - p.y), 0.05);
  } else if (karn > 0.5) {
    vec3 fl = p - hHip - vec3(0.0, -0.1, 0.0);
    accent = min(accent, sdRoundBox(vec3(fl.x, fl.y, abs(fl.z) - 0.155), vec3(0.125, 0.13, 0.018), 0.018));
  } else if (unit < 0.5) {
    tunic = min(tunic, max(sdTaper(p, waist, hHip + vec3(0.0, -0.11, 0.0), 0.172 * wide, 0.205 * wide), hHip.y - 0.07 - p.y));
  }
  float armR = 0.068 + 0.032 * karn, wrist = 0.055 + 0.032 * karn + 0.03 * veiled;
  float arms = min(sdTaper(p, hChest + vec3(-0.17 * wide, 0.05, 0.0), hHandL, armR, wrist), sdTaper(p, hChest + vec3(0.17 * wide, 0.05, 0.0), hHandR, armR, wrist));
  if (karn > 0.5) { if (arms < d) { d = arms; mat = 0.0; } } else tunic = min(tunic, arms);
  if (tunic < d) { d = tunic; mat = 2.0; }
  float hands = min(length(p - hHandL), length(p - hHandR)) - 0.072 - 0.024 * karn;
  if (hands < d) { d = hands; mat = 12.0; }
  float thigh = 0.084 + 0.03 * karn, ankle = 0.062 + 0.024 * karn - 0.008 * lynd;
  vec3 hipL = hHip + vec3(-0.092 * wide, -0.05, 0.0), hipR = hHip + vec3(0.092 * wide, -0.05, 0.0);
  float legs = min(sdTaper(p, hipL, hFootL + vec3(0.0, 0.09, -0.015), thigh, ankle), sdTaper(p, hipR, hFootR + vec3(0.0, 0.09, -0.015), thigh, ankle));
  legs = smin(legs, sdEllipsoid(p - hHip - vec3(0.0, -0.02, 0.0), vec3(0.158 * wide, 0.095, 0.125 + 0.02 * karn)), 0.05);
  if (legs < d) { d = legs; mat = 3.0; }
  vec3 bl = p - hFootL, br = p - hFootR;
  float toe = (min(length((bl - vec3(0.0, 0.0, 0.045)) * vec3(1.0, 1.25, 0.7)), length((br - vec3(0.0, 0.0, 0.045)) * vec3(1.0, 1.25, 0.7))) - 0.098 - 0.024 * karn) * 0.75;
  float shaft = min(sdCapsule(bl, vec3(0.0, 0.02, -0.015), vec3(0.0, 0.115, -0.015), 0.079 + 0.024 * karn), sdCapsule(br, vec3(0.0, 0.02, -0.015), vec3(0.0, 0.115, -0.015), 0.079 + 0.024 * karn));
  float boots = lynd > 0.5 ? toe : smin(toe, shaft, 0.03);
  if (boots < d) { d = boots; mat = 4.0; }
  if (accent < d) { d = accent; mat = 5.0; }
  if (metal < d) { d = metal; mat = 6.0; }
  if (wood < d) { d = wood; mat = 7.0; }
  if (glow < d) { d = glow; mat = 8.0; }
  if (plate < d) { d = plate; mat = 9.0; }
  if (bone < d) { d = bone; mat = 11.0; }
  if (fur < d) { d = fur; mat = 14.0; }
  if (worn < d) { d = worn; mat = 15.0; }
  if (pack < d) { d = pack; mat = 16.0; }
  if (packLit < d) { d = packLit; mat = 17.0; }
  if (off < d) { d = off; mat = 18.0; }
  if (offLit < d) { d = offLit; mat = 19.0; }
  return d;
}

void skinTone(inout Surf s) {
  float tone = fract(eLook.x * 5.17);
  s.albedo = P_PEACH; s.cover = 0.2; s.wrap = 0.5;
  if (tone > 0.45) { s.albedo = P_TAN; s.cover = 0.5; }
  if (tone > 0.7) { s.albedo = P_BARK; s.cover = 0.66; }
  if (tone > 0.88) { s.albedo = P_UMBER; s.cover = 0.6; }
}

void paintFace(inout Surf s, vec3 f, float spread, float blush) {
  float blink = step(0.965, fract(uTime * 0.27 + eLook.x));
  float side = f.x < 0.0 ? -1.0 : 1.0;
  vec2 e = vec2(f.x - side * spread, f.y + 0.015);
  vec2 sz = vec2(0.05, mix(0.085, 0.012, blink)) * (1.0 + 0.06 * side);
  float eye = smoothstep(1.0, 0.85, length(e / sz)) * step(e.y, 0.052);
  float glint = smoothstep(0.024, 0.014, length(e - vec2(-0.016, 0.03))) * (1.0 - blink);
  float lid = penLine(e.y - 0.058) * step(abs(e.x), 0.072);
  float mouth = penLine(f.y + 0.118 + f.x * f.x * 1.5) * step(abs(f.x), 0.034);
  s.ink = max(lid, mouth);
  vec2 c = vec2(abs(f.x) - spread - 0.08, f.y + 0.095);
  float ticks = smoothstep(0.3, 0.1, abs(fract((c.x * 0.9 + c.y * 0.45) * 46.0) - 0.5)) * step(length(c * vec2(1.0, 1.7)), 0.055) * blush;
  if (ticks > 0.1) { s.albedo = P_ROSE; s.cover = ticks * 0.85; }
  if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0 - glint; s.solid = 1.0; s.ink = 0.0; }
}

void entSurf(vec3 p, float mat, inout Surf s) {
  int m = int(mat + 0.5);
  bool unit = kind < 0.5, veiled = kind > 1.5 && kind < 2.5, karn = kind > 2.5 && kind < 3.5, lynd = kind > 3.5;
  vec3 f = p - hHead;
  if (m == 12) {
    if (hGrip > 1.5) { s.albedo = P_SLATE; s.cover = 0.82; s.ink = penLine(dot(p - (length(p - hHandL) < length(p - hHandR) ? hHandL : hHandR), vec3(0.0, 1.0, 0.0)) + 0.02) * 0.7; }
    else if (hGrip > 0.5 || unit || veiled) { s.albedo = P_CHARCOAL; s.cover = 0.85; }
    else if (karn) { s.albedo = eColC; s.cover = 0.74; }
    else skinTone(s);
  } else if (m == 0) {
    if (karn) {
      s.albedo = eColC; s.cover = 0.74; s.wrap = 0.3;
      if (length(f) < 0.5 && f.z > 0.05) {
        s.cover = mix(0.74, 0.4, smoothstep(-0.05, -0.2, f.y) * smoothstep(0.1, 0.25, f.z));
        float blink = step(0.965, fract(uTime * 0.27 + eLook.x));
        vec2 e = vec2(abs(f.x) - 0.135, f.y - 0.03);
        float eye = smoothstep(1.0, 0.8, length(e / vec2(0.036, mix(0.045, 0.008, blink))));
        float brow = penLine(e.y - 0.07 - e.x * 0.3) * step(abs(e.x), 0.085);
        float mouth = penLine(f.y + 0.2) * step(abs(f.x), 0.1);
        float nose = max(penLine(length(vec2(abs(f.x) - 0.035, f.y + 0.085)) - 0.012), 0.0);
        s.ink = max(max(brow, mouth), nose * 0.8);
        if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
      }
    } else {
      skinTone(s);
      if (f.z > 0.05 && length(f) < 0.36) {
        paintFace(s, f, lynd ? 0.115 : 0.125, 1.0);
        if (lynd && s.solid < 0.5) s.ink = max(s.ink, smoothstep(0.02, 0.012, length(vec2(f.x, f.y + 0.07))));
      }
    }
  } else if (m == 1) {
    float ang = atan(f.x, f.z + 0.04);
    float lock = vnoise(vec2(ang * 3.2 + eLook.x * 40.0, 0.0));
    s.albedo = eColC; s.cover = mix(0.8, 0.94, lock);
    float strand = penLine((fract(ang * 2.4 + lock * 0.9) - 0.5) / 2.4 * 0.5) * step(0.45, vnoise(vec2(ang * 7.0, eLook.x * 9.0)));
    s.ink = strand * smoothstep(0.3, 0.12, f.y) * 0.5;
  } else if (m == 2 && unit) {
    vec3 c = p - hChest;
    s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25;
    float belt = abs(p.y - hHip.y - 0.1) - 0.03;
    float dh = min(length(p - hHandL), length(p - hHandR));
    bool arm = abs(c.x) > 0.19;
    if (arm && dh > 0.21) { s.albedo = P_SLATE; s.cover = 0.84; }
    if (arm && dh < 0.21) s.ink = penLine(dh - 0.205) * 0.8;
    if (dh < 0.135) { s.albedo = eColA; s.cover = 0.86; s.ink = penLine(dh - 0.13) * 0.8; }
    if (!arm) {
      if (p.y < hHip.y + 0.15) { s.albedo = P_SLATE; s.cover = 0.84; }
      s.ink = max(penLine(p.y - hHip.y - 0.15), penLine(c.y + 0.045) * step(0.07, abs(c.x)) * 0.5) * 0.85;
      float lamp = length(c.xy - vec2(0.0, 0.05));
      if (c.z > 0.04 && lamp < 0.07) { s.albedo = P_SKY; s.cover = lamp < 0.048 ? 0.3 : 0.9; s.glow = lamp < 0.048 ? 0.7 : 0.0; s.ink = penLine(lamp - 0.07) * 0.8; }
      if (belt < 0.0) { s.albedo = eColA; s.cover = 0.86; s.ink = 0.0; }
    }
  } else if (m == 2 && veiled) {
    s.albedo = eColA; s.cover = 0.86;
    float hem = step(p.y, 0.15);
    s.cover = mix(s.cover, 0.14, hem);
    float folds = penLine((abs(fract(atan(p.x - hHip.x, p.z - hHip.z) * 1.6 + 0.25) - 0.5)) / 1.6 * 0.22) * smoothstep(hHip.y, hHip.y - 0.12, p.y) * (1.0 - hem);
    s.ink = max(max(penLine(p.y - 0.15), penLine(p.y - 0.185) * 0.6), folds * 0.5);
    if (abs(p.y - hHip.y - 0.1) < 0.02) { s.albedo = eColB; s.cover = 0.9; s.ink = 0.0; }
  } else if (m == 2) {
    vec3 c = p - hChest;
    s.albedo = eColA; s.cover = 0.84;
    float belt = abs(p.y - hHip.y - 0.075) - 0.026;
    bool torso = abs(c.x) < 0.17 * kWide();
    if (karn) {
      if (torso && c.z > 0.0 && abs(c.x) < 0.07 + (c.y + 0.1) * 0.25) { s.albedo = eColC; s.cover = 0.6; }
      if (torso && c.z > 0.0) s.ink = penLine(abs(c.x) - 0.07 - (c.y + 0.1) * 0.25) * 0.8;
    } else {
      if (belt < 0.0 && torso) { s.albedo = P_UMBER; s.cover = 0.95; }
      s.ink = penLine(belt) * 0.9 * float(torso);
      if (torso && c.z > 0.0 && abs(c.x) < 0.022 && belt > 0.0) { s.albedo = P_CREAM; s.cover = 0.12; }
      if (torso && c.z > 0.0 && belt > 0.0) s.ink = max(s.ink, penLine(abs(c.x) - 0.022) * 0.6);
      if (torso && c.z > 0.05) s.ink = max(s.ink, penLine(sdBox(vec3(c.x - 0.085, c.y + 0.02, 0.0), vec3(0.035, 0.028, 1.0))) * 0.6);
      s.ink = max(s.ink, penLine(p.y - hHip.y + 0.045) * 0.7 * float(torso));
    }
    float dh = min(length(p - hHandL), length(p - hHandR));
    if (!torso && dh < 0.14) { s.albedo = P_CREAM; s.cover = 0.14; s.ink = penLine(dh - 0.135) * 0.8; }
  } else if (m == 3) {
    float below = hHip.y - p.y;
    if (unit) {
      s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25;
      bool crotch = abs(p.x - hHip.x) < 0.04 && below > -0.02;
      bool joint = (below > 0.1 && below < 0.15) || crotch;
      if (joint) { s.albedo = P_SLATE; s.cover = 0.84; }
      s.ink = max(max(penLine(below - 0.1), penLine(below - 0.15)), penLine(abs(p.x - hHip.x) - 0.04) * step(-0.02, below) * step(below, 0.1)) * 0.8;
    } else if (lynd) {
      s.albedo = P_SLATE; s.cover = 0.8;
      if (below > 0.15) { s.albedo = eColC; s.cover = 0.86; s.wrap = 0.4; }
      s.ink = penLine(below - 0.15) * 0.8;
    } else {
      float pick = fract(eLook.x * 9.13);
      s.albedo = karn || pick < 0.4 ? P_CHARCOAL : (pick < 0.75 ? P_SLATE : P_TAN); s.cover = 0.8;
      if (karn && below > 0.17) { s.albedo = P_TAN; s.cover = 0.6; s.ink = penLine(fract(below * 22.0) - 0.5) * 0.5; }
    }
  } else if (m == 4) {
    if (hBoot > 0.5 && !lynd) {
      bool mag = hBoot > 1.5;
      s.albedo = mag ? P_SLATE : P_UMBER; s.cover = mag ? 0.82 : 0.86;
      if (p.y < 0.035) { s.albedo = mag ? P_CHARCOAL : P_CREAM; s.cover = mag ? 0.85 : 0.14; }
      if (mag && abs(p.y - 0.085) < 0.016) { s.albedo = eColB; s.cover = 0.86; }
      s.ink = max(penLine(p.y - 0.035), penLine(p.y - 0.13) * 0.7) * 0.8;
    } else if (unit) {
      s.albedo = P_SKY; s.cover = 0.12;
      if (p.y < 0.05) { s.albedo = eColA; s.cover = 0.86; }
      s.ink = max(penLine(p.y - 0.05), penLine(p.y - 0.14) * 0.7) * 0.8;
    } else if (lynd) {
      vec3 q = p - (abs(p.x - hFootL.x) < abs(p.x - hFootR.x) ? hFootL : hFootR);
      s.albedo = eColC; s.cover = mix(0.86, 0.14, smoothstep(0.03, 0.07, q.z)); s.wrap = 0.4;
      s.ink = penLine(abs(q.x) - 0.03) * step(0.07, q.z) * 0.6;
    } else {
      s.albedo = karn ? P_UMBER : P_CHARCOAL; s.cover = 0.86;
      if (p.y < 0.035) { s.albedo = P_TAN; s.cover = 0.5; }
      s.ink = max(penLine(p.y - 0.035) * 0.6, penLine(p.y - 0.15) * 0.7);
    }
  } else if (m == 5) {
    s.albedo = eColB; s.cover = 0.86;
    if (veiled) {
      float rim = f.z * 0.9 - f.y * 0.18 - 0.2;
      if (rim > -0.035 && length(f) < 0.45) { s.albedo = P_CREAM; s.cover = 0.14; }
      s.ink = penLine(rim + 0.035) * step(length(f), 0.45) * 0.7;
    }
    if (lynd) s.ink = penLine(p.y - hChest.y + 0.09) * 0.8;
    if (karn) {
      float below = hHip.y - p.y;
      if (below > 0.0) { s.albedo = P_BARK; s.cover = 0.82; s.ink = max(penLine(below - 0.19) * 0.7, penLine(abs(p.x - hHip.x) - 0.06) * 0.35); }
      else s.ink = penLine(length(vec2(p.x - hHip.x, p.y - hHip.y - 0.07)) - 0.03) * step(0.0, p.z - hHip.z) * 0.8;
    }
  } else if (m == 6) {
    s.albedo = P_STONE; s.cover = 0.6;
  } else if (m == 7) {
    heldSurf(hKit, hLook, false, s, dot(p - hHandR, hBlade));
  } else if (m == 9) {
    if (unit) { s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25; s.ink = penLine(abs(p.y - hChest.y - 0.085) - 0.06) * 0.6; }
    else if (karn) { s.albedo = eColB; s.cover = 0.86; s.ink = penLine(length(p - hChest - vec3(-0.26, 0.12, 0.0)) - 0.1) * 0.7; }
    else { s.albedo = P_BARK; s.cover = 0.8; s.ink = penLine(p.y - hHip.y - 0.06) * 0.7; }
  } else if (m == 10) {
    s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25;
    vec2 v = vec2(atan(f.x, f.z), f.y + 0.02);
    float vis = (length(max(vec2(abs(v.x) - 0.78, abs(v.y) - 0.035), 0.0)) - 0.1) * 0.34;
    s.ink = max(penLine(vis) * 0.9, penLine(f.y - 0.2) * 0.35 * step(abs(f.x), 0.3));
    if (vis < 0.0 && f.z > -0.02) {
      float blink = step(0.965, fract(uTime * 0.27 + eLook.x));
      float side = v.x < 0.0 ? -1.0 : 1.0;
      vec2 e = vec2(v.x - side * 0.37, v.y);
      float eye = length(e / vec2(0.105, mix(0.085, 0.012, blink)));
      s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0;
      if (abs(v.y - 0.075 + v.x * 0.05) < 0.012 && v.x > 0.5 && v.x < 0.8) { s.albedo = P_SKY; s.cover = 0.3; s.solid = 0.0; }
      if (eye < 1.0) { s.albedo = mix(P_SKY, P_TEAL, 0.3); s.cover = eye < 0.72 ? 0.12 : 0.8; s.solid = 0.0; s.glow = eye < 0.72 ? 0.9 : 0.0; }
    }
  } else if (m == 11) {
    s.albedo = P_CREAM; s.cover = 0.1; s.wrap = 0.3;
    if (veiled) {
      float blink = step(0.97, fract(uTime * 0.19 + eLook.x));
      vec2 e = vec2(abs(f.x) - 0.075, f.y - 0.01 - (abs(f.x) - 0.075) * 0.45);
      float eye = smoothstep(1.0, 0.8, length(e / vec2(0.05, mix(0.02, 0.004, blink))));
      float mark = length(vec2(f.x, f.y - 0.115) * vec2(1.0, 0.6));
      s.ink = penLine(f.x) * step(f.y, -0.09) * step(-0.19, f.y) * 0.5;
      if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
      if (mark < 0.022) { s.albedo = mix(P_SKY, P_TEAL, 0.4); s.cover = 0.3; s.glow = 0.9; }
    } else s.ink = step(0.62, vnoise(vec2(f.y * 30.0, f.x * 6.0))) * 0.35;
  } else if (m == 13) {
    s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0;
  } else if (m == 14) {
    s.albedo = eColC; s.cover = 0.86; s.wrap = 0.4;
    float tail = smoothstep(-0.5, -0.6, p.z - hHip.z) * step(p.y, hChest.y);
    float inner = step(-0.03, f.z) * step(0.24, f.y) * smoothstep(0.07, 0.045, abs(abs(f.x) - 0.17 - (f.y - 0.2) * 0.33)) * smoothstep(0.64, 0.56, f.y);
    s.cover = mix(s.cover, 0.12, max(tail, inner));
    s.ink = step(0.7, vnoise(vec2(p.y * 34.0, p.x * 18.0 + p.z * 18.0))) * 0.4 * (1.0 - inner);
  } else if (m == 18 || m == 19) {
    float k; wornSurf(offLocal(p, kWide(), k), hOff - 1.0, m == 19, s);
  } else if (m == 15) {
    frameSurf(p - hChest, kWide(), s);
  } else if (m == 16 || m == 17) {
    unitSurf(p - hChest - vec3(0.0, 0.0, unit ? -0.275 : -0.2 * max(kWide(), 1.0)), hUnit, m == 17, s);
  } else {
    heldSurf(hKit, hLook, true, s, dot(p - hHandR, hBlade));
  }
}
`,Kr=`vec3 kHandL, kHandR, kFoot, kTop, kCrook, kLamp;
float kSink, kLean, kSway, kBob, kLight;

void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float breath = sin(uTime * 1.0 + eLook.x * 6.0);
  kSink = 0.0; kLean = 0.02 * breath; kLight = 0.78 + 0.12 * sin(uTime * 2.3);
  kSway = sin(w) * 0.06 * mv;
  kBob = abs(cos(w)) * 0.25 * mv + 0.08 * breath;
  kHandL = vec3(-3.3, 5.2 + 0.2 * breath, 0.9 - sin(w) * 0.9 * mv);
  kHandR = vec3(3.5, 6.3 - 0.15 * breath, 1.3 + sin(w) * 0.5 * mv);
  vec3 idle = normalize(vec3(-0.08, 1.0, 0.1)), up = idle;
  float swing = 0.28 * sin(uTime * 1.3 + eLook.x * 9.0) + 0.45 * sin(w) * mv;
  if (act > 0.5 && act < 1.5) {
    float hi = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    vec3 t = mix(mix(kHandR, vec3(2.6, 9.6, 0.4), hi), vec3(1.4, 3.0, 3.4), down);
    kHandR = mix(t, kHandR, rec);
    up = normalize(mix(mix(mix(idle, vec3(0.0, 1.0, -0.25), hi), vec3(0.0, -0.05, 1.0), down), idle, rec));
    kLean = (-0.12 * hi + 0.4 * down) * (1.0 - rec);
    kLight = mix(kLight, 1.0, hi * (1.0 - rec));
    swing *= 1.0 - down * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    kLean = -0.1 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    kSink = (1.0 - smoothstep(0.05, 0.88, at)) * 13.5;
    kLight = smoothstep(0.7, 1.0, at);
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    kHandR = mix(kHandR, vec3(4.4, 8.4, 1.6), hold);
    kHandL = mix(kHandL, vec3(-5.6, 7.4, 0.6), hold);
    kLean = -0.14 * hold;
    kSway += 0.02 * sin(uTime * 36.0) * hold;
    kLight = mix(kLight, 1.0, hold);
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    kLight *= (1.0 - st * (0.5 + 0.5 * step(0.5, fract(uTime * 7.0)))) * (1.0 - dn);
    kLean = -0.1 * st + 0.9 * dn;
    kSway += 0.07 * sin(uTime * 8.0) * st * (1.0 - dn);
    kSink = go * 9.5;
    kHandL = mix(kHandL, vec3(-2.6, 1.6, 2.4), dn);
  }
  kFoot = kHandR - up * 5.7;
  kTop = kHandR + up * 5.0;
  kCrook = kTop + vec3(-0.1, 0.3, 1.5);
  kLamp = kCrook + vec3(sin(swing) * 1.9, -cos(swing) * 1.9, 0.0);
}

vec3 kLocal(vec3 p) {
  p.y += kSink;
  float h = smoothstep(0.3, 9.0, p.y);
  p.y -= kBob * h;
  p.xy = rot2(kSway * h) * p.xy;
  p.zy = rot2(kLean * h) * p.zy;
  return p;
}

float entMap(vec3 p, out float mat) {
  vec3 q = kLocal(p);
  mat = 0.0;
  float fold = 0.12 * cos(atan(q.x, q.z) * 9.0 + 1.5 * sin(q.y * 0.5)) * smoothstep(8.0, 1.0, q.y);
  float d = max(sdTaper(q, vec3(0.0, 0.3, 0.0), vec3(0.0, 8.0, 0.0), 3.1, 1.7) + fold, -q.y);
  d = smin(d, sdEllipsoid(q - vec3(0.0, 8.2, 0.0), vec3(3.2, 1.1, 1.9)), 0.6);
  float arms = min(sdTaper(q, vec3(-2.7, 8.3, 0.2), kHandL, 0.85, 0.75), sdTaper(q, vec3(2.7, 8.3, 0.2), kHandR, 0.85, 0.75));
  d = smin(d, arms, 0.35);
  vec3 hp = q - vec3(0.0, 9.9, 0.25);
  float hood = max(length(hp) - 1.55, -(length(hp - vec3(0.0, -0.1, 0.9)) - 1.12));
  hood = smin(hood, sdTaper(hp, vec3(0.0, 0.9, -0.7), vec3(0.0, 0.2, -2.2), 0.7, 0.15), 0.4);
  d = smin(d, hood, 0.3);
  float mask = sdEllipsoid(hp - vec3(0.0, -0.15, 0.5), vec3(0.8, 0.98, 0.55));
  if (mask < d) { d = mask; mat = 1.0; }
  float hands = min(length(q - kHandL), length(q - kHandR)) - 0.95;
  if (hands < d) { d = hands; mat = 2.0; }
  vec3 l = q - kLamp;
  float iron = min(sdCapsule(q, kFoot, kTop, 0.2), sdCapsule(q, kTop, kCrook, 0.17));
  iron = min(iron, sdCapsule(q, kCrook, kLamp + vec3(0.0, 0.95, 0.0), 0.06));
  iron = min(iron, min(sdRoundBox(l - vec3(0.0, 0.85, 0.0), vec3(0.62, 0.12, 0.62), 0.08), sdRoundBox(l + vec3(0.0, 0.85, 0.0), vec3(0.55, 0.1, 0.55), 0.08)));
  iron = min(iron, sdCapsule(vec3(abs(l.x) - 0.62, l.y, abs(l.z) - 0.62), vec3(0.0, -0.8, 0.0), vec3(0.0, 0.8, 0.0), 0.07));
  if (iron < d) { d = iron; mat = 3.0; }
  float ball = length(l) - 0.72;
  if (ball < d) { d = ball; mat = 4.0; }
  return d * 0.8;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = kLocal(p);
  vec3 hp = q - vec3(0.0, 9.9, 0.25);
  if (mat > 3.5) { s.albedo = eColB; s.cover = mix(0.9, 0.1, kLight); s.glow = kLight; return; }
  if (mat > 2.5) {
    s.albedo = P_CHARCOAL; s.cover = 0.88;
    s.ink = penLine((fract(q.y * 0.8) - 0.5) / 0.8) * 0.4;
    return;
  }
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.34; s.wrap = 0.3; s.ink = step(0.7, vnoise(q.xy * 3.0)) * 0.3; return; }
  if (mat > 0.5) {
    s.albedo = P_CREAM; s.cover = 0.1; s.wrap = 0.3;
    s.ink = penLine(hp.y - 0.42) * step(abs(hp.x), 0.5) * 0.6;
    if (abs(hp.x) < 0.085 && abs(hp.y + 0.2) < 0.5) { s.albedo = eColB; s.cover = mix(0.9, 0.15, kLight); s.glow = kLight; s.ink = 0.0; }
    return;
  }
  s.albedo = eColA; s.cover = 0.88;
  float ang = atan(q.x, q.z);
  s.ink = penLine((abs(fract(ang * 9.0 / TAU + 0.24 * sin(q.y * 0.5)) - 0.5) - 0.22) * 2.0) * 0.45 * smoothstep(8.0, 5.5, q.y);
  if (q.y < 1.25 && length(hp) > 2.0) {
    s.albedo = eColC; s.cover = 0.3;
    float key = step(0.5, fract(ang * 22.0 / TAU)) * step(0.45, q.y) * step(q.y, 0.9);
    if (key > 0.5) { s.albedo = eColA; s.cover = 0.86; }
    s.ink = max(penLine(q.y - 1.25), penLine(q.y - 0.32)) * 0.7;
  }
  if (hp.z > 0.25 && length(hp - vec3(0.0, -0.1, 0.9)) < 1.2) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
}
`,Gr=`float lBob, lGlow, lFlash;
mat2 lSpin;

void entPose() {
  lBob = 0.06 * sin(uTime * 2.2 + eLook.x * 6.28);
  lSpin = rot2(uTime * 1.5 + eLook.x * 6.28);
  lGlow = 0.35 + 0.65 * saturate(ePose.w);
  lFlash = (ePose.y > 1.5 && ePose.y < 2.5) ? 1.0 - saturate(ePose.z) : 0.0;
}

vec3 lThree(vec3 r) {
  float sec = TAU / 3.0, a = mod(atan(r.x, r.z) + sec * 0.5, sec) - sec * 0.5, len = length(r.xz);
  return vec3(sin(a) * len, r.y, cos(a) * len);
}

float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(0.0, lBob, 0.0);
  vec3 r = q; r.xz = lSpin * r.xz;
  float sh = floor(eExtra + 0.5);
  float core = length(q) - (0.085 + 0.06 * lFlash);
  float body = 1e3, trim = 1e3;
  if (sh < 0.5) {
    body = sdTorusY(r, 0.17, 0.022);
    trim = sdEllipsoid(vec3(abs(q.x) - 0.21, q.y - 0.02, q.z + 0.05), vec3(0.075, 0.02, 0.05));
  } else if (sh < 1.5) {
    body = max(sdEllipsoid(q - vec3(0.0, 0.07, 0.0), vec3(0.15, 0.25, 0.15)), 0.135 - length(q - vec3(0.0, 0.0, 0.1)));
    trim = sdEllipsoid(lThree(r) - vec3(0.0, -0.03, 0.28), vec3(0.03, 0.085, 0.03));
  } else if (sh < 2.5) {
    body = max(sdEllipsoid(q, vec3(0.22, 0.17, 0.2)), 0.048 - abs(q.y));
    trim = sdTorusY(q - vec3(0.0, 0.1, 0.0), 0.185, 0.02);
  } else if (sh < 3.5) {
    body = sdTorusY(q.xzy, 0.185, 0.028);
    float w = 0.05 * sin(uTime * 3.0 + eLook.x * 6.0);
    trim = min(sdTaper(q, vec3(-0.1, -0.15, -0.02), vec3(-0.15 + w, -0.42, -0.18), 0.03, 0.008), sdTaper(q, vec3(0.1, -0.15, -0.02), vec3(0.15 + w, -0.42, -0.18), 0.03, 0.008));
  } else if (sh < 4.5) {
    body = (abs(r.x) + abs(r.y) * 0.55 + abs(r.z)) * 0.6 - 0.105;
    trim = sdTorusY(r + vec3(0.0, 0.03, 0.0), 0.29, 0.016);
  } else if (sh < 5.5) {
    float hx = max(abs(q.x) * 0.866 + abs(q.y) * 0.5, abs(q.y));
    body = max(hx - 0.23, abs(q.z) - 0.03);
    trim = max(abs(hx - 0.27) - 0.02, abs(q.z + 0.03) - 0.016);
  } else if (sh < 6.5) {
    body = sdTorusY(r, 0.22, 0.024);
    vec3 r2 = q.yxz; r2.xz = lSpin * r2.xz;
    trim = sdTorusY(r2.xzy, 0.16, 0.02);
  } else {
    float tri = max(r.x * 0.5 + abs(r.z) * 0.866, -r.x) - 0.1;
    body = max(tri, abs(r.y) - 0.2 + 0.4 * max(tri + 0.1, 0.0));
    trim = length(lThree(q) - vec3(0.0, 0.02, 0.3)) - 0.036;
  }
  float d = core;
  mat = 1.0;
  if (body < d) { d = body; mat = 0.0; }
  if (trim < d) { d = trim; mat = 2.0; }
  return d * 0.85;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(0.0, lBob, 0.0);
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.86; s.glow = 0.5 * lFlash; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.45 * (1.0 - lGlow); s.glow = max(lGlow, lFlash); return; }
  s.albedo = eColA; s.cover = 0.84; s.wrap = 0.3;
  float through = smoothstep(0.24, 0.07, length(q)) * step(3.5, floor(eExtra + 0.5));
  s.cover = mix(s.cover, 0.2, through * lGlow);
  s.glow = max(lFlash * 0.7, through * 0.5 * lGlow);
  s.ink = penLine((fract(length(q.xy) * 7.0) - 0.5) / 7.0) * 0.3 * (1.0 - through);
}
`,Yr=`float mSink, mLean, mTilt, mOpen, mBob, mAnger;
vec3 mHandL, mHandR;

void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float breath = sin(uTime * 1.3 + eLook.x * 6.0);
  mSink = 0.0; mLean = 0.03 * breath; mOpen = 1.0; mAnger = 0.0;
  mTilt = sin(w) * 0.07 * mv;
  mBob = abs(cos(w)) * 0.3 * mv + 0.12 * breath;
  mHandL = vec3(-4.7, 3.0 + 0.25 * breath, 1.0 - sin(w) * 1.1 * mv);
  mHandR = vec3(4.7, 3.0 - 0.25 * breath, 1.0 + sin(w) * 1.1 * mv);
  if (act > 0.5 && act < 1.5) {
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    mLean = (-0.2 * up + 0.5 * down) * (1.0 - rec);
    vec3 t = mix(mix(mHandR, vec3(4.2, 9.2, 0.4), up), vec3(3.0, 1.4, 5.4), down);
    t = mix(t, mHandR, rec);
    mHandR = t; mHandL = t * vec3(-1.0, 1.0, 1.0);
    mAnger = up * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    mLean = -0.1 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    mSink = (1.0 - smoothstep(0.05, 0.85, at)) * 13.5;
    mOpen = mix(0.32, 1.0, smoothstep(0.5, 1.0, at));
    float down = smoothstep(0.6, 1.0, at);
    mHandL = mix(vec3(-1.9, 7.0, 0.8), mHandL, down);
    mHandR = mix(vec3(1.9, 7.0, 0.8), mHandR, down);
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    mLean = -0.26 * hold; mAnger = hold;
    mTilt += 0.03 * sin(uTime * 34.0) * hold;
    mHandL = mix(mHandL, vec3(-7.0, 7.6, -0.4), hold);
    mHandR = mix(mHandR, vec3(7.0, 7.6, -0.4), hold);
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    mTilt += 0.1 * sin(uTime * 9.0) * st * (1.0 - dn);
    mLean = -0.14 * st + 1.2 * dn;
    mOpen = 1.0 - 0.5 * dn;
    mSink = go * 8.5;
    mHandL = mix(mHandL, vec3(-3.6, 1.0, 2.6), dn);
    mHandR = mix(mHandR, vec3(3.6, 1.0, 2.6), dn);
  }
}

vec3 mLocal(vec3 p) {
  p.y += mSink;
  float h = smoothstep(0.4, 8.0, p.y);
  p.y -= mBob * h;
  p.xy = rot2(mTilt * h) * p.xy;
  p.zy = rot2(mLean * h) * p.zy;
  return p;
}

float entMap(vec3 p, out float mat) {
  vec3 q = mLocal(p);
  mat = 0.0;
  float d = sdTaper(q, vec3(0.0, 1.0, 0.0), vec3(0.0, 7.6, 0.0), 2.5, 1.5);
  d = smin(d, sdEllipsoid(q - vec3(0.0, 0.5, 0.0), vec3(3.5, 0.9, 3.5)), 0.8);
  float sec = TAU / 6.0, ang = mod(atan(q.x, q.z) + eLook.x * 6.0 + sec * 0.5, sec) - sec * 0.5, rr = length(q.xz);
  d = smin(d, sdTaper(vec3(sin(ang) * rr, q.y, cos(ang) * rr), vec3(0.0, 0.9, 2.4), vec3(0.0, 0.12, 5.0), 0.75, 0.2), 0.5);
  float arms = min(sdTaper(q, vec3(-1.5, 6.3, 0.3), mHandL, 0.62, 0.42), sdTaper(q, vec3(1.5, 6.3, 0.3), mHandR, 0.62, 0.42));
  d = smin(d, arms, 0.3);
  vec3 c = q - vec3(0.0, 8.1, 0.0);
  c.xz /= mOpen; c.y -= (1.0 - mOpen) * 1.4;
  float cap = max(sdEllipsoid(c, vec3(5.8, 3.0, 5.8)), -c.y - 0.3);
  cap = smin(cap, sdTorusY(c, 5.45, 0.55), 0.4);
  vec3 k1 = c - vec3(2.4, 2.75, -0.9), k2 = c - vec3(-2.9, 2.2, 0.8), k3 = c - vec3(-0.4, 3.1, -2.6);
  float small = min(min(max(sdEllipsoid(k1, vec3(1.2, 0.8, 1.2)), -k1.y), max(sdEllipsoid(k2, vec3(0.95, 0.65, 0.95)), -k2.y)), max(sdEllipsoid(k3, vec3(0.8, 0.55, 0.8)), -k3.y));
  small = min(small, min(sdCapsule(k1, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.3), min(sdCapsule(k2, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.25), sdCapsule(k3, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.22))));
  cap = min(cap, small) * min(mOpen, 0.85);
  if (cap < d) { d = cap; mat = 1.0; }
  float sec8 = TAU / 8.0, a8 = mod(atan(c.x, c.z) + sec8 * 0.5, sec8) - sec8 * 0.5, r8 = length(c.xz);
  vec3 sq = vec3(sin(a8) * r8, c.y, cos(a8) * r8);
  float swing = 0.25 * sin(uTime * 2.1 + floor((atan(c.x, c.z) + PI) / sec8) * 1.7) + mAnger * 0.25 * sin(uTime * 30.0);
  float sac = length(sq - vec3(swing, -1.75, 4.5)) - 0.62;
  sac = min(sac, sdCapsule(sq, vec3(0.0, -0.4, 4.7), vec3(swing, -1.3, 4.5), 0.07)) * min(mOpen, 0.85);
  float clubs = min(length(q - mHandL), length(q - mHandR)) - 1.2;
  float hurt = min(sac, clubs);
  if (hurt < d) { d = hurt; mat = 2.0; }
  return d * 0.8;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = mLocal(p);
  vec3 c = q - vec3(0.0, 8.1, 0.0);
  c.xz /= mOpen; c.y -= (1.0 - mOpen) * 1.4;
  if (mat > 1.5) {
    s.albedo = eColB; s.cover = 0.88;
    s.ink = step(0.84, vnoise(q.xz * 5.0 + q.y * 3.0)) * 0.6;
    return;
  }
  if (mat > 0.5) {
    if (c.y < -0.05 && length(c.xz) < 5.3) {
      s.albedo = P_TAN; s.cover = 0.45;
      s.ink = smoothstep(0.22, 0.0, abs(fract(atan(c.z, c.x) * 9.0) - 0.5)) * 0.5;
      return;
    }
    vec2 v = voronoi(c.xz * 0.5 + eLook.x * 20.0);
    float spot = smoothstep(0.3, 0.24, v.x) * step(0.35, v.y);
    float rim = step(c.y, 0.5) * step(5.0, length(c.xz));
    s.albedo = mix(eColA, eColB, rim);
    s.cover = mix(0.86, 0.04, spot * (1.0 - rim));
    s.ink = penLine((v.x - 0.27) / 0.5) * step(0.35, v.y) * (1.0 - rim) * 0.6;
    return;
  }
  s.albedo = mix(eColC, P_TAN, smoothstep(2.4, 0.4, q.y)); s.cover = mix(0.26, 0.62, smoothstep(2.4, 0.4, q.y)); s.wrap = 0.3;
  s.ink = step(0.62, vnoise(vec2(atan(q.x, q.z) * 9.0, q.y * 0.35))) * 0.3 * smoothstep(7.4, 6.0, q.y);
  vec3 f = q - vec3(0.0, 5.3, 0.0);
  if (f.z > 0.6 && abs(f.y) < 1.4 && abs(f.x) < 1.7) {
    float blink = step(0.97, fract(uTime * 0.17 + eLook.x));
    float side = f.x < 0.0 ? -1.0 : 1.0;
    vec2 e = vec2(f.x - side * 0.72, f.y - 0.1);
    vec2 sz = vec2(0.3, mix(0.44, 0.05, blink));
    float eye = smoothstep(1.0, 0.9, length(e / sz));
    eye *= step(e.y, 0.2 + (abs(f.x) - 0.72) * (0.5 + 0.5 * mAnger));
    float glint = smoothstep(0.1, 0.07, length(e - vec2(-0.1, 0.12))) * (1.0 - blink);
    float brow = penLine(e.y - 0.5 + (abs(f.x) - 0.72) * (0.5 + 0.5 * mAnger)) * step(abs(e.x), 0.5);
    float mouth = penLine(f.y + 0.75 - 0.12 * abs(sin(f.x * 6.0))) * step(abs(f.x), 0.62);
    s.ink = max(s.ink, max(brow, mouth));
    if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0 - glint; s.solid = 1.0; s.ink = 0.0; }
  }
}
`,Wr=`float mSwell, mBob;

void entPose() {
  mBob = abs(sin(ePose.x * 2.0)) * 0.03 * ePose.w + 0.01 * sin(uTime * 3.0 + eLook.x * 6.0);
  mSwell = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) mSwell = saturate(ePose.z) + 0.08 * sin(uTime * 40.0) * saturate(ePose.z);
  if (ePose.y > 2.5) mBob -= 0.04 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(0.0, mBob, 0.0);
  mat = 0.0;
  float shell = sdEllipsoid(q - vec3(0.0, 0.2, 0.08), vec3(0.2, 0.15, 0.22));
  float head = length(q - vec3(0.0, 0.17, 0.32)) - 0.1;
  float d = smin(shell, head, 0.05);
  vec3 a = vec3(abs(q.x), q.y, q.z);
  float sgn = q.x < 0.0 ? -1.0 : 1.0, legs = 1e3;
  for (int i = 0; i < 3; i++) {
    float z = -0.02 + 0.13 * float(i);
    float ph = sin(ePose.x * 2.0 + float(i) * 2.1 + sgn * 1.2) * ePose.w;
    legs = min(legs, sdTaper(a, vec3(0.16, 0.16, z), vec3(0.34, 0.0 + max(ph, 0.0) * 0.05 - mBob, z * 1.4 + ph * 0.05), 0.028, 0.012));
  }
  legs = min(legs, sdCapsule(a, vec3(0.05, 0.22, 0.38), vec3(0.12, 0.36, 0.5), 0.01));
  d = min(d, legs);
  float sac = length(q - vec3(0.0, 0.2 + 0.06 * mSwell, -0.2)) - (0.16 + 0.14 * mSwell);
  if (sac < d) { d = sac; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(0.0, mBob, 0.0);
  if (mat > 0.5) {
    s.albedo = eColB; s.cover = mix(0.86, 0.2, mSwell); s.glow = 0.25 + 0.7 * mSwell;
    s.ink = penLine(fract(atan(q.x, q.y - 0.2) * 1.3) - 0.5) * 0.3 * (1.0 - mSwell);
    return;
  }
  s.albedo = eColA; s.cover = 0.86; s.wrap = 0.2;
  s.ink = max(penLine(q.x) * step(q.z, 0.25), penLine(q.z - 0.25)) * 0.6;
  vec2 e = vec2(abs(q.x) - 0.05, q.y - 0.2);
  if (q.z > 0.36 && length(e) < 0.028) { s.albedo = eColB; s.cover = 0.3; s.glow = 0.8; s.ink = 0.0; }
}
`,Vr=`#include <eyes>

float pTilt, pLean, pBob;

vec3 puffLocal(vec3 p) {
  p.y -= pBob;
  p.xy = rot2(pTilt) * p.xy;
  p.zy = rot2(pLean) * p.zy;
  return p;
}

void entPose() {
  float mv = ePose.w;
  pTilt = sin(ePose.x) * 0.13 * mv;
  pBob = abs(cos(ePose.x)) * 0.04 * mv + 0.012 * sin(uTime * 2.0 + eLook.x * 6.0);
  pLean = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) pLean = sin(saturate(ePose.z) * PI) * 0.75;
  if (ePose.y > 2.5) pLean = -0.35 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  float s = sin(ePose.x) * ePose.w;
  float up = cos(ePose.x) * ePose.w;
  float feet = min(length(p - vec3(-0.12, 0.06 + max(up, 0.0) * 0.09, 0.04 + s * 0.12)),
                   length(p - vec3(0.12, 0.06 + max(-up, 0.0) * 0.09, 0.04 - s * 0.12))) - 0.085;
  vec3 q = puffLocal(p);
  float body = sdTaper(q, vec3(0.0, 0.14, 0.0), vec3(0.0, 0.42, 0.0), 0.2, 0.165);
  vec3 c = q - vec3(0.0, 0.5, 0.0);
  float cap = max(length(c * vec3(1.0, 1.4, 1.0)) - 0.46, -c.y - 0.03) * 0.68;
  cap = smin(cap, sdTorusY(c, 0.43, 0.05), 0.05);
  float arms = min(sdCapsule(q, vec3(-0.19, 0.33, 0.02), vec3(-0.3, 0.24 + 0.05 * s, 0.08), 0.04),
                   sdCapsule(q, vec3(0.19, 0.33, 0.02), vec3(0.3, 0.24 - 0.05 * s, 0.08), 0.04));
  float d = min(body, arms);
  mat = 0.0;
  if (cap < d) { d = cap; mat = 1.0; }
  if (feet < d) { d = feet; mat = 2.0; }
  return d;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_TAN; s.cover = 0.7; return; }
  vec3 q = puffLocal(p);
  if (mat > 0.5) {
    vec3 c = q - vec3(0.0, 0.5, 0.0);
    float under = step(c.y, 0.005);
    float rim = step(c.y, 0.07) * step(0.36, length(c.xz)) * (1.0 - under);
    vec2 v = voronoi(c.xz * 4.2 + eLook.x * 20.0);
    float spot = smoothstep(0.24, 0.18, v.x) * (1.0 - under) * (1.0 - rim);
    s.albedo = mix(eColA, eColB, rim);
    s.cover = mix(0.86, 0.0, spot);
    s.ink = penLine((v.x - 0.21) / 4.2) * (1.0 - under) * (1.0 - rim) * 0.6;
    if (under > 0.5) {
      s.albedo = P_TAN; s.cover = 0.4;
      s.ink = smoothstep(0.2, 0.0, abs(fract(atan(c.z, c.x) * 3.5) - 0.5)) * 0.5;
    }
    return;
  }
  s.albedo = eColC; s.cover = 0.22; s.wrap = 0.3;
  vec3 f = q - vec3(0.0, 0.31, 0.0);
  if (f.z > 0.0) {
    paintEyes(s, f, 0.085, vec2(0.034, 0.05), eLook.x);
    if (s.solid < 0.5) {
      float brow = penLine(f.y - 0.075 - 0.3 * (abs(f.x) - 0.085)) * step(abs(abs(f.x) - 0.085), 0.055);
      float mouth = penLine(f.y + 0.085 + f.x * f.x * 3.0) * step(abs(f.x), 0.04);
      s.ink = max(brow, mouth);
    }
  }
}
`,Xr=`float tSink, tDrop, tRear, tSnap, tTuck, tWide, tSway, tBob;

void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  tSink = 0.0; tDrop = 0.0; tRear = 0.0; tSnap = 0.0; tTuck = 0.0; tWide = 0.0;
  tSway = sin(w * 2.0) * 0.18 * mv;
  tBob = 0.1 * sin(uTime * 1.2 + eLook.x * 6.0) + abs(sin(w * 2.0)) * 0.15 * mv;
  if (act > 0.5 && act < 1.5) {
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    tRear = 0.22 * up * (1.0 - down);
    tWide = up * (1.0 - down);
    tSnap = down * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    tTuck = 1.0 - smoothstep(0.25, 1.0, at);
  } else if (act > 3.5 && act < 4.5) {
    tSink = (1.0 - smoothstep(0.05, 0.85, at)) * 11.0;
    tRear = 0.4 * sin(at * PI);
    tWide = sin(at * PI);
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    tRear = 0.42 * hold; tWide = hold;
    tSway += 0.06 * sin(uTime * 33.0) * hold;
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.25, at), dn = smoothstep(0.25, 0.7, at), go = smoothstep(0.66, 1.0, at);
    tSway += 0.2 * sin(uTime * 17.0) * st * (1.0 - dn);
    tDrop = 2.7 * dn; tRear = 0.2 * st * (1.0 - dn) - 0.12 * dn;
    tSink = go * 7.0;
  }
}

vec3 tBody(vec3 p) {
  p.y += tSink;
  vec3 q = p - vec3(tSway, tBob - tTuck * 2.1 - tDrop, 0.0);
  q.zy = rot2(-tRear) * (q.zy - vec2(-3.4, 3.2)) + vec2(-3.4, 3.2);
  return q;
}

float entMap(vec3 p, out float mat) {
  vec3 q = tBody(p);
  p.y += tSink;
  float low = tTuck * 2.1 + tDrop;
  mat = 0.0;
  vec3 sc = q - vec3(0.0, 4.4, -0.2);
  float shell = max(sdEllipsoid(sc, vec3(5.4, 3.3, 4.6)), -sc.y - 0.9);
  shell = smin(shell, sdTorusY(sc * vec3(1.0, 1.0, 1.17) + vec3(0.0, 0.85, 0.0), 5.0, 0.42), 0.3);
  float belly = sdEllipsoid(q - vec3(0.0, 3.4, 0.0), vec3(4.7, 1.3, 3.9));
  float d = min(shell, belly);
  mat = shell < belly ? 0.0 : 2.0;
  vec3 t1 = sc - vec3(-1.9, 2.3, -0.7), t2 = sc - vec3(1.6, 2.5, -1.5), t3 = sc - vec3(0.4, 2.7, 1.3);
  float tw = min(min(max(sdConeUp(t1, 1.35, 4.2), t1.y - 2.7), max(sdConeUp(t2, 1.05, 3.2), t2.y - 2.0)), max(sdConeUp(t3, 0.85, 2.4), t3.y - 1.45));
  if (tw < d) { d = tw; mat = 4.0; }
  vec3 a = vec3(abs(p.x), p.y, p.z);
  float sgn = p.x < 0.0 ? -1.0 : 1.0, legs = 1e3;
  for (int i = 0; i < 3; i++) {
    float z = -3.0 + 2.7 * float(i);
    float ph = sin(ePose.x * 2.0 + float(i) * 2.1 + sgn * 1.2) * ePose.w;
    vec3 root = vec3(4.0, 3.5 - low + tBob, z * 0.9);
    vec3 knee = vec3(6.7 - tTuck * 1.0 + tDrop * 0.5, 5.7 - low * 0.75 + max(ph, 0.0) * 0.5, z * 1.35);
    vec3 tip = vec3(8.1 - tTuck * 1.9 + tDrop * 0.9, 0.12 + max(ph, 0.0) * 0.95, z * 1.7 + ph * 0.8);
    legs = min(legs, min(sdTaper(a, root, knee, 0.64, 0.52), sdTaper(a, knee, tip, 0.52, 0.15)));
  }
  if (legs < d) { d = legs; mat = 2.0; }
  vec3 qa = vec3(abs(q.x), q.y, q.z);
  vec3 cl = vec3(4.9, 3.5, 5.6);
  cl = mix(cl, vec3(6.3, 8.2, 4.6), tWide);
  cl = mix(cl, vec3(2.6, 2.6, 7.6), tSnap);
  cl = mix(cl, vec3(2.9, 2.5, 4.4), tTuck);
  float gape = 0.25 + 0.75 * tWide - 0.2 * tSnap;
  vec3 cq = qa - cl;
  float claw = sdEllipsoid(cq, vec3(1.75, 1.5, 2.4));
  claw = max(claw, -sdBox(cq - vec3(0.0, 0.1, 1.7), vec3(2.6, 0.1 + 0.5 * gape, 1.7)));
  claw = min(claw, sdTaper(qa, vec3(3.3, 3.6, 3.0), cl - vec3(0.0, 0.0, 1.6), 0.72, 0.62));
  if (claw < d) { d = claw; mat = 1.0; }
  vec3 eyeAt = vec3(1.25, 7.5 - 1.9 * tTuck, 4.2);
  float stalk = sdCapsule(qa, vec3(1.0, 5.4, 3.5), eyeAt, 0.2);
  float eye = length(qa - eyeAt) - 0.62;
  if (stalk < d) { d = stalk; mat = 2.0; }
  if (eye < d) { d = eye; mat = 3.0; }
  return d * 0.82;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = tBody(p);
  if (mat > 3.5) {
    s.albedo = P_STONE; s.cover = 0.62;
    s.ink = penLine((fract(q.y * 1.3) - 0.5) / 1.3) * 0.5;
    return;
  }
  if (mat > 2.5) {
    s.albedo = P_CREAM; s.cover = 0.06;
    vec3 e = vec3(abs(q.x), q.y, q.z) - vec3(1.25, 7.5 - 1.9 * tTuck, 4.2);
    if (length(e.xy - vec2(0.0, 0.03)) < 0.34 && e.z > 0.0) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; }
    return;
  }
  if (mat > 1.5) {
    s.albedo = eColC; s.cover = 0.72;
    s.ink = penLine((fract(length(vec2(abs(p.x), p.y + tSink)) * 0.6) - 0.5) / 0.6) * 0.45;
    return;
  }
  if (mat > 0.5) {
    s.albedo = eColB; s.cover = 0.88;
    s.ink = step(0.8, vnoise(q.xy * 2.2 + q.z * 1.3)) * 0.5;
    return;
  }
  vec3 sc = q - vec3(0.0, 4.4, -0.2);
  float r = length(sc.xz / vec2(5.4, 4.6));
  vec2 v = voronoi(sc.xz * 0.7 + eLook.x * 20.0);
  float freckle = smoothstep(0.2, 0.14, v.x) * step(0.5, v.y);
  s.albedo = eColA;
  s.cover = mix(mix(0.78, 0.93, smoothstep(0.5, 1.0, r)), 0.04, freckle);
  s.ink = penLine((abs(fract(r * 3.5) - 0.5)) / 3.5 * 5.0) * 0.6;
  if (sc.y < -0.45) s.ink = max(s.ink, penLine((fract(atan(sc.x, sc.z) * 3.0) - 0.5) / 3.0 * 5.0) * 0.6);
}
`,jr=`float cSway, cSnap, cBob;

void entPose() {
  cSway = sin(ePose.x * 2.0) * 0.03 * ePose.w;
  cBob = 0.012 * sin(uTime * 2.6 + eLook.x * 6.0) + abs(sin(ePose.x * 2.0)) * 0.02 * ePose.w;
  cSnap = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) cSnap = sin(saturate(ePose.z) * PI);
  if (ePose.y > 2.5) cBob -= 0.05 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(cSway, cBob, 0.0);
  vec3 sr = vec3(0.37, 0.17, 0.29);
  float shell = sdEllipsoid(q - vec3(0.0, 0.24, 0.0), sr);
  shell = max(shell, 0.17 - q.y);
  float under = sdEllipsoid(q - vec3(0.0, 0.2, 0.0), vec3(0.33, 0.1, 0.25));
  float d = min(shell, under);
  mat = shell < under ? 0.0 : 2.0;
  vec3 a = vec3(abs(q.x), q.y, q.z);
  float sgn = sign(q.x);
  float legs = 1e3;
  for (int i = 0; i < 3; i++) {
    float z = -0.16 + 0.14 * float(i);
    float ph = sin(ePose.x * 2.0 + float(i) * 2.1 + sgn * 1.2) * ePose.w;
    vec3 knee = vec3(0.44, 0.24 + max(ph, 0.0) * 0.06, z * 1.3);
    vec3 tip = vec3(0.56, 0.0 + max(ph, 0.0) * 0.07 - cBob, z * 1.6 + ph * 0.05);
    legs = min(legs, min(sdCapsule(a, vec3(0.28, 0.2, z), knee, 0.035), sdTaper(a, knee, tip, 0.032, 0.015)));
  }
  if (legs < d) { d = legs; mat = 2.0; }
  vec3 cl = vec3(0.38 - 0.1 * cSnap, 0.24 + 0.14 * cSnap, 0.3 + 0.22 * cSnap);
  float arm = sdCapsule(a, vec3(0.26, 0.2, 0.18), cl, 0.045);
  vec3 cq = a - cl;
  float claw = length(cq * vec3(1.0, 1.15, 0.85)) - 0.13;
  claw = max(claw, -sdBox(cq - vec3(0.0, 0.0, 0.12), vec3(0.2, 0.02 + 0.03 * (1.0 - cSnap), 0.1)));
  claw = min(claw, arm);
  if (claw < d) { d = claw; mat = 1.0; }
  float stalk = sdCapsule(a, vec3(0.09, 0.3, 0.22), vec3(0.1, 0.46, 0.26), 0.022);
  float eye = length(a - vec3(0.1, 0.48, 0.26)) - 0.055;
  if (stalk < d) { d = stalk; mat = 2.0; }
  if (eye < d) { d = eye; mat = 3.0; }
  return d * 0.85;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(cSway, cBob, 0.0);
  if (mat > 2.5) {
    s.albedo = P_CREAM; s.cover = 0.06;
    vec3 e = vec3(abs(q.x), q.y, q.z) - vec3(0.1, 0.48, 0.26);
    if (length(e.xy - vec2(0.0, 0.005)) < 0.03 && e.z > 0.0) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; }
    return;
  }
  if (mat > 1.5) { s.albedo = eColC; s.cover = mix(0.7, 0.15, step(q.y, 0.2) * step(length(q.xz), 0.3)); return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.88; return; }
  float r = length(q.xz / vec2(0.37, 0.29));
  vec2 v = voronoi(q.xz * 9.0 + eLook.x * 20.0);
  float freckle = smoothstep(0.16, 0.1, v.x) * step(0.5, v.y);
  s.albedo = eColA;
  s.cover = mix(mix(0.78, 0.92, smoothstep(0.5, 1.0, r)), 0.0, freckle);
  s.ink = penLine((abs(fract(r * 2.5) - 0.5)) / 2.5 * 0.3) * 0.6;
}
`,Zr=`#include <eyes>

float sHop, sSq, sLunge, sAir;

void entPose() {
  float mv = ePose.w, at = ePose.z;
  float ht = fract(ePose.x / TAU);
  sAir = sin(ht * PI) * mv;
  sHop = sAir * 0.24;
  sSq = 1.0 - 0.15 * cos(ht * TAU) * mv + 0.03 * sin(uTime * 2.4 + eLook.x * 6.0);
  sLunge = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) { sLunge = sin(saturate(at) * PI) * 0.34; sSq += 0.2 * sin(saturate(at) * PI); }
  if (ePose.y > 2.5) sSq -= 0.25 * (1.0 - at);
}

float entMap(vec3 p, out float mat) {
  p.z -= sLunge; p.y -= sHop;
  vec3 r = vec3(0.33 * (1.0 + (1.0 - sSq) * 0.55), 0.3 * sSq, 0.33 * (1.0 + (1.0 - sSq) * 0.55));
  vec3 b = p - vec3(0.0, r.y + 0.03, 0.0);
  float d = sdEllipsoid(b, r);
  mat = 0.0;
  float feet = min(length(p - vec3(-0.14, 0.05 - sAir * 0.03, 0.06)), length(p - vec3(0.14, 0.05 - sAir * 0.03, 0.06))) - 0.085;
  if (feet < d) { d = feet; mat = 2.0; }
  vec3 top = vec3(0.0, r.y * 2.0 + 0.02, 0.0);
  float stem = sdCapsule(p, top, top + vec3(0.0, 0.15, 0.0), 0.028);
  vec3 l = p - top - vec3(0.0, 0.15, 0.0);
  l.x = abs(l.x);
  l.xy = rot2(0.55 - sAir * 0.5 + 0.08 * sin(uTime * 3.0 + eLook.x * 5.0)) * l.xy;
  vec3 lr = vec3(0.17, 0.035, 0.095);
  float leaf = sdEllipsoid(l - vec3(0.15, 0.0, 0.0), lr);
  leaf = min(leaf, stem);
  if (leaf < d) { d = leaf; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  p.z -= sLunge; p.y -= sHop;
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.88; return; }
  if (mat > 0.5) {
    s.albedo = eColB; s.cover = 0.84; s.wrap = 0.4;
    s.ink = penLine(p.z) * 0.7;
    return;
  }
  vec3 f = p - vec3(0.0, 0.33 * sSq + 0.03, 0.0);
  float belly = smoothstep(0.02, -0.16, f.y) * step(0.0, f.z);
  s.albedo = eColA; s.cover = mix(0.82, 0.12, belly); s.wrap = 0.35;
  if (f.z > 0.0) {
    paintEyes(s, f - vec3(0.0, 0.05, 0.0), 0.115, vec2(0.042, 0.06), eLook.x);
    if (s.solid < 0.5) {
      float lid = penLine(f.y - 0.115) * step(abs(abs(f.x) - 0.115), 0.06);
      float mouth = penLine(f.y + 0.03) * step(abs(f.x), 0.03);
      s.ink = max(lid, mouth);
    }
  }
}
`,Jr=`vec3 sPod, sFootL, sFootR;
float sAim, sGlow;

void entPose() {
  float w = ePose.x, mv = ePose.w, s = sin(w), c = cos(w);
  float breath = sin(uTime * 1.4 + eLook.x * 6.0);
  sPod = vec3(0.05 * s * mv, 2.2 + abs(c) * 0.1 * mv + 0.03 * breath, 0.0);
  sFootL = vec3(-0.5, 0.1 + max(c, 0.0) * 0.5 * mv, s * 0.7 * mv);
  sFootR = vec3(0.5, 0.1 + max(-c, 0.0) * 0.5 * mv, -s * 0.7 * mv);
  sAim = 0.0;
  sGlow = 0.3;
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = saturate(ePose.z), set = smoothstep(0.0, 0.3, k), rec = smoothstep(0.6, 1.0, k);
    sPod.y -= 0.35 * set * (1.0 - rec);
    sAim = 0.3 * set * (1.0 - rec);
    sGlow = mix(0.3, 1.0, smoothstep(0.05, 0.45, k) * (1.0 - rec));
    sPod.z -= 0.2 * smoothstep(0.45, 0.52, k) * (1.0 - rec);
  }
  if (ePose.y > 2.5) sPod.z -= 0.15 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  vec3 q = p - sPod;
  q.zy = rot2(sAim) * q.zy;
  float pod = sdRoundBox(q, vec3(0.46, 0.3, 0.56), 0.16);
  pod = smin(pod, sdEllipsoid(q - vec3(0.0, 0.24, -0.1), vec3(0.36, 0.2, 0.42)), 0.1);
  float d = pod;
  d = min(d, sdCapsule(q, vec3(-0.22, 0.4, -0.3), vec3(-0.28, 0.9, -0.42), 0.016));
  vec3 hipL = sPod + vec3(-0.5, -0.1, -0.05), hipR = sPod + vec3(0.5, -0.1, -0.05);
  vec3 kneeL = mix(hipL, sFootL, 0.45) + vec3(-0.08, 0.2, -0.55), kneeR = mix(hipR, sFootR, 0.45) + vec3(0.08, 0.2, -0.55);
  float legs = min(min(sdTaper(p, hipL, kneeL, 0.1, 0.075), sdTaper(p, kneeL, sFootL + vec3(0.0, 0.08, 0.0), 0.075, 0.055)),
                   min(sdTaper(p, hipR, kneeR, 0.1, 0.075), sdTaper(p, kneeR, sFootR + vec3(0.0, 0.08, 0.0), 0.075, 0.055)));
  legs = min(legs, min(length(p - kneeL), length(p - kneeR)) - 0.11);
  float feet = min(sdRoundBox(p - sFootL - vec3(0.0, -0.02, 0.08), vec3(0.16, 0.06, 0.26), 0.04), sdRoundBox(p - sFootR - vec3(0.0, -0.02, 0.08), vec3(0.16, 0.06, 0.26), 0.04));
  legs = min(legs, feet);
  if (legs < d) { d = legs; mat = 2.0; }
  float barrel = sdCapsule(q, vec3(0.0, -0.3, 0.2), vec3(0.0, -0.34, 0.95), 0.07);
  if (barrel < d) { d = barrel; mat = 2.0; }
  float mouth = length(q - vec3(0.0, -0.34, 1.0)) - 0.1;
  if (mouth < d) { d = mouth; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_CHARCOAL; s.cover = 0.84; s.ink = penLine(fract(p.y * 5.0) - 0.5) * 0.3; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = mix(0.9, 0.2, sGlow); s.glow = sGlow; return; }
  vec3 q = p - sPod;
  q.zy = rot2(sAim) * q.zy;
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (abs(q.y + 0.08) < 0.07) { s.albedo = eColA; s.cover = 0.84; }
  s.ink = max(penLine(abs(q.y + 0.08) - 0.07), penLine(q.x) * step(0.1, q.y)) * 0.6;
  if (q.z > 0.3 && abs(q.y - 0.12) < 0.06 && abs(q.x) < 0.34) {
    s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0;
    if (abs(q.x - 0.12 * sin(uTime * 0.9 + eLook.x * 6.0)) < 0.045) { s.albedo = eColB; s.cover = 0.3; s.solid = 0.0; s.glow = 0.9; }
  }
}
`,Qr=`#include <slab>

vec3 wHip, wChest, wHead, wShL, wShR, wFistL, wFistR, wFootL, wFootR;
float wSink, wEye;

void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float s = sin(w), c = cos(w);
  float breath = sin(uTime * 1.1 + eLook.x * 6.0);
  wSink = 0.0;
  wEye = 0.55 + 0.1 * breath;
  wHip = vec3(0.5 * s * mv, 5.3 + abs(c) * 0.35 * mv + 0.07 * breath, 0.0);
  wChest = wHip + vec3(0.0, 3.3, 0.5 + 0.35 * mv);
  wHead = wChest + vec3(0.0, 2.95, 1.3);
  wFootL = vec3(-2.0, 0.85 + max(c, 0.0) * 1.3 * mv, s * 1.9 * mv);
  wFootR = vec3(2.0, 0.85 + max(-c, 0.0) * 1.3 * mv, -s * 1.9 * mv);
  wFistL = vec3(-5.0, 2.7 + 0.2 * breath, 0.7 - s * 1.7 * mv);
  wFistR = vec3(5.0, 2.7 - 0.2 * breath, 0.7 + s * 1.7 * mv);
  if (act > 0.5 && act < 1.5) {
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    vec3 t = mix(mix(wFistR, vec3(2.6, 14.0, 1.0), up), vec3(2.4, 1.8, 5.8), down);
    t = mix(t, wFistR, rec);
    wFistR = t; wFistL = t * vec3(-1.0, 1.0, 1.0);
    wChest.z += (-0.8 * up + 2.2 * down) * (1.0 - rec);
    wChest.y -= 1.0 * down * (1.0 - rec);
    wHead = wChest + vec3(0.0, 2.95, 1.3 + 0.7 * down * (1.0 - rec));
    wEye = mix(wEye, 1.0, up * (1.0 - rec));
  } else if (act > 2.5 && act < 3.5) {
    wChest.z -= 0.4 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    wSink = (1.0 - smoothstep(0.05, 0.92, at)) * 15.5;
    float down = smoothstep(0.72, 1.0, at);
    wFistL = mix(vec3(-3.0, wChest.y + 6.2, 1.6), wFistL, down);
    wFistR = mix(vec3(3.0, wChest.y + 6.2, 1.6), wFistR, down);
    wChest.x += 0.1 * sin(uTime * 31.0) * (1.0 - down);
    wEye = mix(0.2, 1.0, smoothstep(0.5, 0.9, at));
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    wFistL = mix(wFistL, vec3(-7.4, 8.8, -1.4), hold);
    wFistR = mix(wFistR, vec3(7.4, 8.8, -1.4), hold);
    wChest += vec3(0.12 * sin(uTime * 37.0) * hold, 0.5 * hold, 0.9 * hold);
    wHead = wChest + vec3(0.0, 3.2, 1.5);
    wEye = mix(wEye, 1.0, hold);
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.25, at), dn = smoothstep(0.25, 0.75, at), go = smoothstep(0.68, 1.0, at);
    wHip.y -= 2.5 * dn;
    wChest = wHip + vec3(0.14 * sin(uTime * 23.0) * st * (1.0 - dn), 3.3 - 1.2 * dn, 0.5 - 1.3 * st + 4.2 * dn);
    wHead = wChest + vec3(0.0, 2.95 - 1.7 * dn, 1.3 + 1.8 * dn);
    wFistL = mix(wFistL, vec3(-6.0, 1.4, 3.0), dn);
    wFistR = mix(wFistR, vec3(6.0, 1.4, 3.0), dn);
    wSink = go * 10.5;
    wEye *= 1.0 - dn;
  }
  wShL = wChest + vec3(-3.9, 1.2, 0.0);
  wShR = wChest + vec3(3.9, 1.2, 0.0);
}

float entMap(vec3 p, out float mat) {
  p.y += wSink;
  float sd = eLook.x;
  mat = 0.0;
  float d = slab(p - wHip, 2.3, sd);
  vec3 hL = wHip + vec3(-1.6, -0.7, 0.0), hR = wHip + vec3(1.6, -0.7, 0.0);
  d = min(d, min(slab(p - mix(hL, wFootL, 0.28), 1.5, sd + 0.11), slab(p - mix(hR, wFootR, 0.28), 1.5, sd + 0.17)));
  d = min(d, min(slab(p - mix(hL, wFootL, 0.72), 1.35, sd + 0.23), slab(p - mix(hR, wFootR, 0.72), 1.35, sd + 0.29)));
  d = min(d, min(sdRoundBox(p - wFootL - vec3(0.0, -0.2, 0.5), vec3(1.5, 0.65, 2.0), 0.3), sdRoundBox(p - wFootR - vec3(0.0, -0.2, 0.5), vec3(1.5, 0.65, 2.0), 0.3)));
  d = min(d, slab(p - mix(wHip, wChest, 0.48), 2.5, sd + 0.37));
  d = min(d, slab(p - wChest, 3.5, sd + 0.31));
  d = min(d, min(slab(p - wShL, 2.0, sd + 0.41), slab(p - wShR, 2.0, sd + 0.47)));
  d = min(d, min(slab(p - mix(wShL, wFistL, 0.36) - vec3(-0.5, 0.0, 0.0), 1.3, sd + 0.61), slab(p - mix(wShR, wFistR, 0.36) - vec3(0.5, 0.0, 0.0), 1.3, sd + 0.67)));
  d = min(d, min(slab(p - mix(wShL, wFistL, 0.7), 1.45, sd + 0.71), slab(p - mix(wShR, wFistR, 0.7), 1.45, sd + 0.79)));
  float head = slab(p - wHead, 1.3, sd + 0.53);
  if (head < d) { d = head; mat = 3.0; }
  float fists = min(slab(p - wFistL, 1.95, sd + 0.83), slab(p - wFistR, 1.95, sd + 0.89));
  if (fists < d) { d = fists; mat = 1.0; }
  vec3 b = p - wChest - vec3(0.0, 1.6, -2.4);
  b.zy = rot2(-0.5) * b.zy;
  float cr = min(sdConeUp(b, 0.9, 4.6), min(sdConeUp(b - vec3(-1.6, -0.6, 0.2), 0.7, 3.2), sdConeUp(b - vec3(1.5, -0.9, 0.1), 0.65, 2.8)));
  if (cr < d) { d = cr; mat = 2.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  p.y += wSink;
  vec2 pv = pavers(p.xy * 0.6 + p.z * 0.41 + eLook.x * 20.0);
  s.albedo = eColA; s.cover = mix(0.52, 0.84, pv.y);
  s.ink = max(penLine(0.5 * pv.x / 0.6) * 0.8, penLine((fract(p.y * 0.5 + 0.35 * vnoise(p.xz * 0.5)) - 0.5) / 0.5) * 0.3);
  if (mat > 2.5) {
    vec3 f = p - wHead;
    if (f.z > 0.2 && abs(f.y - 0.1) < 0.17 && abs(f.x) < 0.85) { s.albedo = eColB; s.cover = 0.9 - 0.8 * wEye; s.glow = wEye; s.ink = 0.0; }
    else s.ink = max(s.ink, penLine(abs(f.y - 0.1) - 0.24) * step(0.2, f.z) * step(abs(f.x), 0.95) * 0.7);
  } else if (mat > 1.5) {
    float facet = vnoise(vec2(atan(p.x - wChest.x, p.z - wChest.z) * 3.0, p.y * 0.8));
    s.albedo = eColC; s.cover = mix(0.25, 0.86, step(0.5, facet)); s.glow = 0.25; s.ink = 0.0;
  } else if (mat > 0.5) {
    s.albedo = eColB; s.cover = mix(0.72, 0.94, pv.y);
  } else {
    float high = max(max(p.y - wShL.y, p.y - wShR.y) - 0.9, p.y - wChest.y - 2.6);
    if (high > 0.0 && vnoise(p.xz * 1.1 + eLook.x * 9.0) > 0.42) { s.albedo = P_SAGE; s.cover = 0.84; s.ink = step(0.7, vnoise(p.xz * 6.0)) * 0.5; }
  }
}
`,el=`vec3 wAt;
float wTilt, wEye, wSpin, wKick;

void entPose() {
  float t = uTime * 1.7 + eLook.x * 6.28;
  wAt = vec3(0.03 * sin(t * 0.8), 1.3 + 0.08 * sin(t), 0.0);
  wTilt = 0.2 * ePose.w;
  wSpin = uTime * 2.2 + eLook.x * 6.28;
  wEye = 0.45;
  wKick = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = saturate(ePose.z);
    wEye = mix(0.45, 1.0, smoothstep(0.0, 0.4, k));
    wKick = smoothstep(0.4, 0.5, k) * (1.0 - smoothstep(0.5, 1.0, k)) * 0.16;
  }
  if (ePose.y > 2.5) wAt.y -= 0.12 * (1.0 - ePose.z);
}

vec3 wLocal(vec3 p) {
  vec3 q = p - wAt;
  q.z += wKick;
  q.zy = rot2(wTilt) * q.zy;
  return q;
}

float entMap(vec3 p, out float mat) {
  vec3 q = wLocal(p);
  mat = 0.0;
  float dome = max(sdEllipsoid(q, vec3(0.36, 0.2, 0.36)), -q.y - 0.05);
  float skirt = sdCylinder(q + vec3(0.0, 0.1, 0.0), 0.3, 0.07);
  float d = smin(dome, skirt, 0.04);
  d = min(d, sdCapsule(q, vec3(0.1, 0.16, -0.1), vec3(0.14, 0.46, -0.16), 0.014));
  vec3 v = vec3(abs(q.x) - 0.42, q.y + 0.02, q.z + 0.06);
  d = min(d, sdRoundBox(v, vec3(0.1, 0.012, 0.13), 0.01));
  vec3 r = q + vec3(0.0, 0.16, 0.0);
  r.xz = rot2(wSpin) * r.xz;
  float ring = max(sdTorusY(r, 0.46, 0.022), -(abs(r.x) - 0.1));
  if (ring < d) { d = ring; mat = 2.0; }
  float lens = length(q - vec3(0.0, -0.17, 0.12)) - 0.13;
  if (lens < d) { d = lens; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = wLocal(p);
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.82; return; }
  if (mat > 0.5) {
    float r = length(q.xy - vec2(0.0, -0.17));
    s.albedo = eColB; s.cover = mix(0.9, 0.25, wEye) * step(0.05, r) + step(r, 0.05); s.glow = wEye * step(0.05, r);
    if (r < 0.05) { s.albedo = INK_BLACK; s.solid = 1.0; }
    return;
  }
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (q.y < 0.02 && q.y > -0.09) { s.albedo = eColA; s.cover = 0.84; }
  s.ink = max(penLine(q.y - 0.02), penLine((fract(atan(q.x, q.z) * 1.6) - 0.5) / 1.6 * 0.3) * step(0.02, q.y)) * 0.6;
}
`,tl=`#include <eyes>

vec3 wCore;
float wFlap, wPuff;

void entPose() {
  float t = uTime * 2.0 + eLook.x * 6.28;
  wCore = vec3(0.04 * sin(t * 0.7), 0.88 + 0.1 * sin(t), 0.0);
  wFlap = sin(t * 2.4) * 0.35;
  wPuff = 1.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) { float k = sin(saturate(ePose.z) * PI); wCore.z += k * 0.3; wPuff += k * 0.3; }
  if (ePose.y > 2.5) wPuff -= 0.25 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  vec3 c = p - wCore;
  float d = length(c) - 0.22 * wPuff;
  float t = uTime * 3.0 + eLook.x * 6.28;
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    vec3 b = vec3(0.07 * sin(t - fi * 0.9), -0.15 * fi, -0.06 * fi - 0.08 * ePose.w * fi);
    d = smin(d, length(c - b) - (0.17 - 0.036 * fi) * wPuff, 0.12);
  }
  mat = 0.0;
  vec3 f = c; f.x = abs(f.x);
  f.xy = rot2(-0.3 + wFlap) * (f.xy - vec2(0.18, 0.0));
  vec3 fr = vec3(0.17, 0.035, 0.085);
  float fin = sdEllipsoid(f - vec3(0.14, 0.0, 0.0), fr);
  if (fin < d) { d = fin; mat = 1.0; }
  float halo = sdTorusY(c - vec3(0.0, 0.34 + 0.02 * sin(t), 0.0), 0.15, 0.018);
  if (halo < d) { d = halo; mat = 2.0; }
  return d * 0.85;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 c = p - wCore;
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.9; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.72; s.wrap = 0.6; s.ink = penLine(c.z) * 0.5; return; }
  float fall = smoothstep(-0.6, 0.15, c.y);
  s.albedo = mix(eColB, eColA, fall);
  s.cover = mix(0.7, 0.06, fall);
  s.glow = fall * 0.6;
  s.wrap = 0.8;
  if (c.z > 0.0 && length(c) < 0.3) paintEyes(s, c - vec3(0.0, 0.02, 0.0), 0.085, vec2(0.032, 0.055), eLook.x);
}
`,nl=`#include <shuttle>

mat2 sRoll, sNose;
float sFly;

void entPose() {
  sRoll = rot2(ePose.x);
  sNose = rot2(ePose.z);
  sFly = saturate(ePose.w);
}

vec3 craftLocal(vec3 p) {
  vec3 b = p - vec3(0.0, 1.05, 0.0);
  b.xy = sRoll * b.xy;
  b.zy = sNose * b.zy;
  return b;
}

float entMap(vec3 p, out float mat) { return shuttleMap(craftLocal(p), sFly, mat); }

void entSurf(vec3 p, float mat, inout Surf s) { shuttleSurf(craftLocal(p), mat, sFly, eColB, s); }
`,sl=[{id:"humanoid",boundY:.8,boundR:1.08,steps:60,glsl:Ur},{id:"gear",boundY:0,boundR:.8,steps:56,glsl:Or},{id:"shuttle",boundY:1.1,boundR:4.9,steps:64,glsl:nl},{id:"lumen",boundY:0,boundR:.62,steps:40,glsl:Gr},{id:"sproutling",boundY:.42,boundR:.82,steps:44,glsl:Zr},{id:"puffcap",boundY:.48,boundR:.85,steps:44,glsl:Vr},{id:"bristlehog",boundY:.4,boundR:.95,steps:48,glsl:Fr},{id:"wisp",boundY:.85,boundR:.75,steps:40,glsl:tl},{id:"cragling",boundY:.65,boundR:1.05,steps:52,glsl:Nr},{id:"shellsnap",boundY:.25,boundR:.85,steps:48,glsl:jr},{id:"drop",boundY:.32,boundR:.42,steps:36,glsl:Dr},{id:"hound",boundY:.5,boundR:1,steps:48,glsl:$r},{id:"watcher",boundY:1.25,boundR:.85,steps:44,glsl:el},{id:"delver",boundY:.85,boundR:1.35,steps:48,glsl:Br},{id:"strider",boundY:1.55,boundR:1.95,steps:52,glsl:Jr},{id:"mite",boundY:.3,boundR:.66,steps:40,glsl:Wr},{id:"warden",boundY:7,boundR:9.8,steps:84,glsl:Qr},{id:"matron",boundY:6.6,boundR:9.6,steps:84,glsl:Yr},{id:"sentinel",boundY:4.6,boundR:10.2,steps:84,glsl:Xr},{id:"keeper",boundY:6.3,boundR:9.8,steps:84,glsl:Kr},{id:"drifter",boundY:5,boundR:11.2,steps:84,glsl:Hr}],Ai=new Map(sl.map(s=>[s.id,s])),ol=`#define PI 3.14159265
#define TAU 6.2831853
#define saturate(x) clamp(x, 0.0, 1.0)

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.9375;
}
vec2 voronoi(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float best = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = hash22(i + g);
    float d = length(g + o - f);
    if (d < best) { best = d; id = hash12(i + g + 7.7); }
  }
  return vec2(best, id);
}

vec2 pavers(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float f1 = 8.0, f2 = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    float d = length(g + hash22(i + g) * 0.8 + 0.1 - f);
    if (d < f1) { f2 = f1; f1 = d; id = hash12(i + g + 7.7); } else if (d < f2) f2 = d;
  }
  return vec2(f2 - f1, id);
}

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdEllipsoid(vec3 p, vec3 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-4); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdRoundBox(vec3 p, vec3 b, float r) { return sdBox(p, b - r) - r; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = saturate(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - r;
}
float sdTaper(vec3 p, vec3 a, vec3 b, float ra, float rb) {
  vec3 pa = p - a, ba = b - a;
  float h = saturate(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(ra, rb, h);
}
float sdCylinder(vec3 p, float r, float h) {
  vec2 d = vec2(length(p.xz) - r, abs(p.y - h * 0.5) - h * 0.5);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdConeUp(vec3 p, float r, float h) {
  vec2 w = vec2(length(p.xz), p.y);
  vec2 n = normalize(vec2(h, r));
  return max(dot(w - vec2(r, 0.0), n), -p.y);
}
float sdTorusY(vec3 p, float R, float r) { return length(vec2(length(p.xz) - R, p.y)) - r; }

vec2 octEncode(vec3 n) {
  n /= (abs(n.x) + abs(n.y) + abs(n.z));
  vec2 e = n.y >= 0.0 ? n.xz : (1.0 - abs(n.zx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.z >= 0.0 ? 1.0 : -1.0);
  return e;
}
vec3 octDecode(vec2 e) {
  vec3 n = vec3(e.x, 1.0 - abs(e.x) - abs(e.y), e.y);
  float t = max(-n.y, 0.0);
  n.x += n.x >= 0.0 ? -t : t;
  n.z += n.z >= 0.0 ? -t : t;
  return normalize(n);
}
`,al=`void paintEyes(inout Surf s, vec3 f, float spread, vec2 size, float seed) {
  float blink = step(0.96, fract(uTime * 0.21 + seed));
  float side = f.x < 0.0 ? -1.0 : 1.0;
  vec2 sz = size * (1.0 + 0.07 * side);
  vec2 e = vec2(f.x - side * spread, f.y);
  float eye = smoothstep(1.0, 0.85, length(e / vec2(sz.x, mix(sz.y, sz.y * 0.12, blink))));
  float glint = smoothstep(sz.x * 0.42, sz.x * 0.26, length(e - vec2(-sz.x * 0.33, sz.y * 0.36))) * (1.0 - blink);
  if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0 - glint; s.solid = 1.0; s.ink = 0.0; }
}
`,il=`uniform vec3 uCamPos, uCamRight, uCamUp, uCamFwd;
uniform vec2 uTanFov;
uniform vec3 uFocus;
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunDisk, uMoonDisk;
uniform float uNight;
uniform float uGold;
uniform float uCloud;
uniform vec2 uWind;
uniform float uRealm;
uniform vec2 uSky;
uniform vec3 uSkyTop;
`,rl=`uniform float uPave;
float gGrass = 0.0;
float gSolid = 0.0;

void groundSurf(vec3 p, float t, inout vec3 N, out Surf s, out float canopy) {
  s = newSurf();
  vec2 uv = (p.xz + 0.5) * INV_T;
  vec4 ct = textureLod(uColorTex, uv, 0.0);
  vec4 mt = textureLod(uMatTex, uv, 0.0);
  vec4 hs = textureLod(uHeightTex, uv, 0.0);
  canopy = hs.g;
  float grass = mt.r, sand = mt.g, snow = mt.b, rock = mt.a, path = ct.a;
  float lod = smoothstep(85.0, 24.0, t);
  vec3 col = ct.rgb;

  gSolid = 0.0;
  float swatch = fbm(p.xz * 0.07);
  float swatch2 = fbm(p.xz * 0.023 + 40.0);
  col = mix(col, mix(col, P_BUTTER, 0.42), smoothstep(0.5, 0.78, swatch2) * grass * 0.75);
  col = mix(col, mix(col, P_PINE, 0.5), smoothstep(0.45, 0.2, swatch2) * grass * 0.6);
  s.soft = 1.0;
  s.cover = mix(0.4, 0.68, swatch) * mix(0.75, 1.0, grass);
  gGrass = grass * lod;

  float fl = hs.b * grass * lod;
  if (fl > 0.02) {
    vec2 fv = voronoi(p.xz * 1.9 + 31.0);
    float bloom = smoothstep(0.14, 0.1, fv.x) * step(1.0 - fl * 0.3, fract(fv.y * 3.7));
    col = mix(col, fv.y < 0.66 ? P_ROSE : P_SUN, bloom);
    s.cover = mix(s.cover, fv.y < 0.33 ? 0.0 : 0.95, bloom);
    s.ink = max(s.ink, smoothstep(0.04, 0.02, fv.x) * step(fv.y, 0.33) * bloom * 0.7);
    gGrass *= 1.0 - bloom;
  }
  if (path > 0.03) {
    float cob = smoothstep(0.6, 0.85, path);
    float on = smoothstep(0.03, 0.3, path);
    float pf = mix(2.4, 1.2, cob);
    vec2 pv = pavers(p.xz * pf);
    float joint = penLine(0.5 * pv.x / pf);
    vec3 dirt = mix(P_TAN, P_BARK, 0.25 * pv.y);
    float dirtCover = mix(0.16, 0.34, swatch);
    float dirtInk = joint * step(0.82, pv.y) * 0.55;
    float tone = fract(pv.y * 7.31);
    vec3 stone = tone < 0.4 ? P_PEACH : (tone < 0.75 ? P_CLAY : mix(P_STONE, P_CREAM, 0.5));
    float stoneCover = mix(0.36, 0.8, fract(pv.y * 3.17));
    if (uPave > 0.5) {
      vec2 gc = p.xz / 1.8, gi = floor(gc), gf = fract(gc) - 0.5;
      float tone2 = hash12(gi + 3.7);
      stone = tone2 < 0.5 ? mix(P_STONE, P_CREAM, 0.72) : (tone2 < 0.965 ? mix(P_SKY, P_CREAM, 0.6) : mix(P_SLATE, P_SKY, 0.35));
      stoneCover = tone2 < 0.965 ? mix(0.14, 0.32, fract(tone2 * 7.0)) : 0.5;
      joint = penLine((0.5 - max(abs(gf.x), abs(gf.y))) * 1.8);
    }
    col = mix(col, mix(dirt, stone, cob), on);
    s.cover = mix(s.cover, mix(dirtCover, stoneCover, cob), on);
    s.ink = max(s.ink, mix(dirtInk, joint * 0.8, cob) * on * mix(0.4, 1.0, lod));
    gGrass *= 1.0 - smoothstep(0.08, 0.35, path);
  }
  if (sand > 0.04) {
    vec2 sv = voronoi(p.xz * 3.1);
    col = mix(col, mix(P_TAN, P_CREAM, 0.45), sand);
    s.cover = mix(s.cover, 0.14 + 0.3 * hs.a + 0.1 * swatch, sand);
    s.ink = max(s.ink, smoothstep(0.07, 0.035, sv.x) * step(0.8, sv.y) * 0.5 * sand * lod);
  }
  if (rock > 0.04) {
    float strata = vnoise(vec2(p.y * 3.2 + vnoise(p.xz * 0.5) * 3.0, dot(p.xz, vec2(0.4, 0.3))));
    col = mix(col, uRockCol, rock * 0.85);
    s.cover = mix(s.cover, mix(0.5, 0.78, strata), rock);
    s.ink = max(s.ink, smoothstep(0.05, 0.0, abs(fract(strata * 3.0) - 0.5)) * 0.6 * rock * lod);
    N = normalize(N + vec3(strata - 0.5, 0.0, 0.5 - strata) * 0.5 * rock);
  }
  if (snow > 0.04) {
    float drift = vnoise(vec2(dot(p.xz, vec2(0.8, 0.6)) * 0.22, dot(p.xz, vec2(-0.6, 0.8)) * 1.3));
    col = mix(col, mix(P_SKY, P_SLATE, 0.2), snow);
    s.cover = mix(s.cover, 0.015 + 0.13 * smoothstep(0.5, 0.15, drift * 0.6 + swatch * 0.6), snow);
  }
  if (uWall > 0.0 && (hs.a > 0.0 || hs.b < 0.5)) {
    if (N.y < 0.6) {
      float course = (p.y - hs.r) / 0.58, row = floor(course);
      float along = dot(p.xz, normalize(vec2(-N.z, N.x) + 1e-4)) / 1.15 + 0.5 * mod(row, 2.0);
      float block = hash12(vec2(row * 3.0 + 1.0, floor(along)));
      col = mix(P_STONE, mix(P_CREAM, P_PEACH, 0.35), 0.25 + 0.5 * block);
      s.cover = mix(0.42, 0.74, fract(block * 7.3));
      s.ink = max(penLine((abs(fract(course) - 0.5) - 0.5) * 0.58), penLine((abs(fract(along) - 0.5) - 0.5) * 1.15) * 0.8) * 0.85 * mix(0.5, 1.0, lod);
      s.soft = 0.0;
      gSolid = saturate((hs.r - p.y) / 1.5);
    } else if (hs.a > 0.12 && hs.b > 0.0) gSolid = 1.0;
  }
  if (uRealm > 1.5) {
    vec2 cv = voronoi(p.xz * 0.3 + 17.0);
    float crater = step(0.62, fract(cv.y * 5.3)), cr = cv.x / 0.3;
    float rim = crater * smoothstep(0.16, 0.0, abs(cr - 1.05 - 0.9 * fract(cv.y * 9.1)));
    float bowl = crater * smoothstep(1.05 + 0.9 * fract(cv.y * 9.1), 0.2, cr);
    s.cover = mix(s.cover, min(1.0, s.cover + 0.16), bowl * (1.0 - rock));
    s.ink = max(s.ink, rim * 0.5 * (1.0 - rock) * lod);
    s.ink = max(s.ink, step(0.93, vnoise(p.xz * 6.0)) * 0.35 * (1.0 - rock) * lod);
  }
  s.albedo = col;
}
`,ll=`const vec3 SABER_COL = vec3(0.32, 0.74, 1.0);

void heldMap(vec3 p, vec3 hand, vec3 dir, vec3 side, float kit, float look, out float solid, out float lit) {
  solid = 1e3; lit = 1e3;
  if (kit < 0.5) {
    if (look < 0.5) {
      lit = sdCapsule(p, hand + dir * 0.17, hand + dir * 1.04, 0.043);
      solid = min(sdCapsule(p, hand - dir * 0.12, hand + dir * 0.1, 0.031),
                  sdCapsule(p, hand + dir * 0.1, hand + dir * 0.15, 0.043));
      solid = min(solid, sdCapsule(p, hand - dir * 0.15, hand - dir * 0.12, 0.037));
    } else {
      solid = min(sdCapsule(p, hand - dir * 0.2, hand + dir * 0.15, 0.03),
                  sdCapsule(p, hand + dir * 0.16 - side * 0.11, hand + dir * 0.16 + side * 0.11, 0.034));
      solid = min(solid, min(sdCapsule(p, hand + dir * 0.15 - side * 0.105, hand + dir * 0.21 - side * 0.105, 0.04),
                             sdCapsule(p, hand + dir * 0.15 + side * 0.105, hand + dir * 0.21 + side * 0.105, 0.04)));
      lit = min(sdCapsule(p, hand + dir * 0.22 - side * 0.105, hand + dir * 1.0 - side * 0.105, 0.034),
                sdCapsule(p, hand + dir * 0.22 + side * 0.105, hand + dir * 1.0 + side * 0.105, 0.034));
    }
  } else if (kit < 1.5) {
    if (look < 0.5) {
      solid = min(sdCapsule(p, hand - dir * 0.22, hand + dir * 0.5, 0.05),
                  sdCapsule(p, hand + dir * 0.12, hand + dir * 0.12 - vec3(0.0, 0.13, 0.0), 0.032));
      lit = length(p - hand - dir * 0.58) - 0.05;
    } else {
      solid = min(sdCapsule(p, hand - dir * 0.1, hand + dir * 0.22, 0.046),
                  sdCapsule(p, hand + dir * 0.05, hand + dir * 0.05 - vec3(0.0, 0.12, 0.0), 0.03));
      solid = min(solid, sdTaper(p, hand - dir * 0.12, hand - dir * 0.3 - vec3(0.0, 0.05, 0.0), 0.034, 0.05));
      solid = min(solid, sdCapsule(p, hand + dir * 0.22, hand + dir * 0.66, 0.018));
      lit = length(p - hand - dir * 0.7) - 0.034;
    }
  } else if (kit < 2.5) {
    if (look < 0.5) {
      solid = sdCapsule(p, hand - dir * 0.32, hand + dir * 0.74, 0.022);
      lit = length(p - hand - dir * 0.86) - 0.09;
    } else {
      solid = min(sdCapsule(p, hand - dir * 0.36, hand + dir * 0.7, 0.022),
                  sdCapsule(p, hand + dir * 0.67, hand + dir * 0.71, 0.046));
      vec3 q = p - hand - dir * 0.9;
      float along = dot(q, dir);
      vec3 across = q - dir * along;
      lit = (abs(along) / 0.2 + (abs(dot(across, side)) + abs(dot(across, cross(dir, side)))) / 0.09 - 1.0) * 0.05;
    }
  }
}

void heldSurf(float kit, float look, bool light, inout Surf s, float along) {
  if (!light) {
    s.albedo = P_CHARCOAL; s.cover = 0.85;
    if (kit < 0.5 && look < 0.5) {
      s.albedo = P_STONE; s.cover = 0.5; s.wrap = 0.3;
      if (along > -0.12 && along < 0.08 && fract(along * 26.0) < 0.42) { s.albedo = P_CHARCOAL; s.cover = 0.9; }
      s.ink = max(penLine(along - 0.1), penLine(along + 0.12)) * 0.8;
    }
    return;
  }
  if (kit < 0.5) {
    float facing = abs(dot(gNormal, gRay)), core = smoothstep(0.32, 0.72, facing);
    s.albedo = SABER_COL; s.cover = mix(0.96, 0.0, core); s.solid = 1.0; s.glow = core; s.ink = 0.0;
    return;
  }
  s.albedo = mix(P_SKY, P_TEAL, 0.45); s.cover = 0.22; s.glow = 0.85; s.soft = 1.0;
  if (kit > 1.5 && look > 0.5) { s.cover = 0.42; s.glow = 0.6; }
}

float frameMap(vec3 c, float wide, float look) {
  if (look < 0.5) return 1e3;
  float d = sdEllipsoid(vec3(abs(c.x) - 0.215 * wide, c.y - 0.1, c.z), vec3(0.15, 0.1, 0.145));
  return min(d, sdRoundBox(vec3(c.x, c.y - 0.005, abs(c.z) - 0.13), vec3(0.12 * wide, 0.09, 0.03), 0.028));
}
void frameSurf(vec3 c, float wide, inout Surf s) {
  s.albedo = P_SLATE; s.cover = 0.8;
  bool chest = abs(c.x) < 0.14 * wide;
  s.ink = chest ? penLine(abs(c.y - 0.005) - 0.07) * 0.7 : penLine(c.y - 0.075) * 0.7;
  if (chest && abs(c.y - 0.005) < 0.022) { s.albedo = eColB; s.cover = 0.86; s.ink = 0.0; }
}

float unitMap(vec3 c, float look, out float lit) {
  lit = 1e3;
  if (look < 0.5) return 1e3;
  if (look < 1.5) {
    lit = max(length(c.xy) - 0.055, abs(c.z + 0.03) - 0.04);
    return max(length(c.xy) - 0.11, abs(c.z) - 0.05) - 0.012;
  }
  vec3 t = vec3(abs(c.x) - 0.068, c.y, c.z);
  lit = length(t - vec3(0.0, -0.135, 0.0)) - 0.036;
  return min(sdCapsule(t, vec3(0.0, -0.09, 0.0), vec3(0.0, 0.1, 0.0), 0.046), sdRoundBox(c, vec3(0.07, 0.03, 0.03), 0.015));
}

float wornMap(vec3 p, float piece, out float lit) {
  lit = 1e3;
  if (piece < 0.5) {
    float plate = max(length(p.xy) - 0.17, abs(p.z) - 0.018) - 0.008;
    float rim = length(vec2(length(p.xy) - 0.165, p.z - 0.008)) - 0.022;
    lit = length(p - vec3(0.0, 0.0, 0.03)) - 0.045;
    return min(plate, rim);
  }
  if (piece < 1.5) {
    lit = max(length(p.xz) - 0.064, abs(p.y) - 0.035);
    return min(sdCapsule(p, vec3(0.0, -0.11, 0.0), vec3(0.0, 0.11, 0.0), 0.058), max(length(p.xz) - 0.07, abs(abs(p.y) - 0.1) - 0.018));
  }
  if (piece < 2.5) {
    lit = length(p) - 0.055;
    float ring = length(vec2(length(p.xy) - 0.12, p.z)) - 0.018;
    return min(ring, sdCapsule(vec3(abs(p.x), p.y, p.z), vec3(0.06, 0.0, 0.0), vec3(0.105, 0.0, 0.0), 0.01));
  }
  if (piece < 3.5) {
    float band = max(abs(length(p.xz) - 0.2) - 0.022, abs(p.y) - 0.05);
    band = max(band, -(p.z + 0.02));
    lit = max(max(abs(length(p.xz) - 0.226) - 0.012, abs(p.y) - 0.026), 0.12 - p.z);
    return band - 0.006;
  }
  if (piece < 4.5) {
    float dome = max(length(p) - 0.19, -(p.y + 0.02));
    float lip = max(length(p.xz) - 0.205, abs(p.y + 0.01) - 0.02);
    float fin = sdRoundBox(p - vec3(0.0, 0.17, -0.01), vec3(0.016, 0.07, 0.13), 0.012);
    return min(min(dome, lip), fin);
  }
  if (piece < 6.5) {
    float g = piece - 5.0, k = 1.0 + 0.18 * g;
    float palm = sdRoundBox(p - vec3(0.0, 0.03, 0.0), vec3(0.075, 0.085, 0.04) * k, 0.03);
    float fingers = sdRoundBox(p - vec3(0.0, 0.14 * k, 0.012), vec3(0.07, 0.05, 0.034) * k, 0.03);
    float thumb = sdCapsule(p, vec3(0.07, 0.0, 0.0) * k, vec3(0.12, 0.07, 0.02) * k, 0.027 * k);
    float cuff = sdTaper(p, vec3(0.0, -0.06, 0.0), vec3(0.0, -0.15, 0.0), 0.075 * k, (0.075 + 0.03 * g) * k);
    return min(smin(min(palm, fingers), thumb, 0.03), cuff);
  }
  if (piece < 7.5) {
    float shin = sdTaper(p, vec3(0.0, -0.17, 0.0), vec3(0.0, 0.1, 0.0), 0.065, 0.085);
    shin = max(shin, -(p.z + 0.01));
    return min(shin, sdEllipsoid(p - vec3(0.0, 0.16, 0.02), vec3(0.075, 0.06, 0.06)));
  }
  if (piece < 9.5) {
    float m = piece - 8.0;
    float foot = sdEllipsoid(p - vec3(0.0, -0.1, 0.05), vec3(0.08, 0.062, 0.15) * (1.0 + 0.1 * m));
    float shaft = sdCapsule(p, vec3(0.0, -0.1, -0.02), vec3(0.0, 0.1, -0.02), 0.07 + 0.012 * m);
    float sole = sdRoundBox(p - vec3(0.0, -0.15, 0.04), vec3(0.08, 0.016, 0.16) * (1.0 + 0.1 * m), 0.012);
    if (m > 0.5) lit = length(p - vec3(0.0, -0.08, -0.1)) - 0.03;
    return min(smin(foot, shaft, 0.05), sole);
  }
  if (piece < 10.5) {
    lit = sdRoundBox(p - vec3(0.0, 0.0, 0.02), vec3(0.04, 0.04, 0.01), 0.008);
    float chip = sdRoundBox(p, vec3(0.11, 0.11, 0.018), 0.012);
    float pins = sdRoundBox(vec3(abs(p.x) - 0.13, mod(p.y + 0.0275, 0.055) - 0.0275, p.z), vec3(0.02, 0.008, 0.006), 0.003);
    return min(chip, max(pins, abs(p.y) - 0.1));
  }
  lit = length(p - vec3(0.0, 0.135, 0.0)) - 0.045;
  return min(length(vec2(length(p.xy) - 0.105, p.z)) - 0.028, sdRoundBox(p - vec3(0.0, 0.1, 0.0), vec3(0.035, 0.025, 0.035), 0.01));
}
void wornSurf(vec3 p, float piece, bool light, inout Surf s) {
  if (light) { s.albedo = mix(P_SKY, P_TEAL, 0.45); s.cover = 0.22; s.glow = 0.85; s.soft = 1.0; return; }
  s.albedo = P_SLATE; s.cover = 0.8;
  if (piece < 0.5) { s.ink = penLine(length(p.xy) - 0.11) * 0.7; if (abs(p.y) < 0.02 && length(p.xy) > 0.06) { s.albedo = eColB; s.cover = 0.86; } return; }
  if (piece < 1.5) { s.albedo = P_STONE; s.cover = 0.62; s.ink = penLine(abs(abs(p.y) - 0.065) - 0.0) * 0.6; return; }
  if (piece < 2.5) { s.albedo = P_STONE; s.cover = 0.6; return; }
  if (piece < 3.5) { s.albedo = P_CHARCOAL; s.cover = 0.85; return; }
  if (piece < 4.5) { if (abs(p.x) < 0.03 && p.y > 0.08) { s.albedo = eColB; s.cover = 0.86; } s.ink = penLine(p.y + 0.0) * 0.6; return; }
  if (piece < 5.5) { s.albedo = P_CHARCOAL; s.cover = 0.85; s.ink = penLine(p.y + 0.06) * 0.6; return; }
  if (piece < 6.5) { s.ink = max(penLine(p.y + 0.07) * 0.7, penLine(abs(p.y - 0.09) - 0.0) * 0.5); if (p.y < -0.07) { s.albedo = eColB; s.cover = 0.86; } return; }
  if (piece < 7.5) { s.ink = max(penLine(p.y - 0.1) * 0.7, penLine(abs(p.y + 0.05)) * 0.5); return; }
  if (piece < 8.5) { s.albedo = P_UMBER; s.cover = 0.86; s.ink = max(penLine(p.y + 0.13) * 0.8, penLine(p.y - 0.06) * 0.6); return; }
  if (piece < 9.5) { s.ink = max(penLine(p.y + 0.13) * 0.8, penLine(p.y - 0.04) * 0.6); if (abs(p.y + 0.02) < 0.02) { s.albedo = eColB; s.cover = 0.86; s.ink = 0.0; } return; }
  if (piece < 10.5) { s.albedo = P_CHARCOAL; s.cover = 0.85; s.ink = max(penLine(abs(p.x) - 0.07), penLine(abs(p.y) - 0.07)) * 0.5; return; }
  s.albedo = P_STONE; s.cover = 0.62;
}

void unitSurf(vec3 c, float look, bool light, inout Surf s) {
  if (light) { s.albedo = mix(P_SKY, P_TEAL, 0.45); s.cover = 0.22; s.glow = 0.85; s.soft = 1.0; return; }
  s.albedo = P_STONE; s.cover = 0.62;
  s.ink = look < 1.5 ? penLine(length(c.xy) - 0.085) * 0.7 : max(penLine(c.y - 0.06), penLine(c.y + 0.05)) * 0.6;
}
`,cl=`struct Surf { vec3 albedo; float cover; float ink; float soft; float solid; float glow; float wrap; float leafy; float moss; float occ; };
Surf newSurf() { return Surf(P_STONE, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0); }

uniform vec4 uLightPos[MAX_LIGHTS];
uniform vec3 uLightCol[MAX_LIGHTS];
uniform int uLightCount;

float gSun = 1.0;

float gPen = 0.02;
float penLine(float d) { return 1.0 - smoothstep(gPen * 0.55, gPen * 1.15, abs(d)); }

float lightPool(vec3 p, vec3 N) {
  float acc = 0.0;
  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= uLightCount) break;
    vec3 d = uLightPos[i].xyz - p;
    float r = uLightPos[i].w, d2 = dot(d, d);
    if (d2 < r * r) {
      float att = 1.0 - d2 / (r * r);
      float nl = dot(N, d * inversesqrt(d2 + 1e-4)) * 0.5 + 0.5;
      acc += uLightCol[i].r * att * att * mix(0.5, 1.0, nl);
    }
  }
  return saturate(acc);
}

float shadeAmount(Surf s, vec3 N, float shadow, float ao) {
  float ndl = dot(N, uSunDir);
  float i = saturate((ndl + s.wrap) / (1.0 + s.wrap)) * shadow;
  float lit = 0.45 * smoothstep(0.015, 0.075, i) + 0.55 * smoothstep(0.3, 0.38, i);
  float sh = max(1.0 - lit, (1.0 - ao) * 0.85);
  return max(sh, (1.0 - gSun) * 0.9);
}

float sphereShadow(vec3 ro, vec3 rd, vec4 sph, float k) {
  vec3 oc = ro - sph.xyz;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - sph.w * sph.w;
  float h = b * b - c;
  return (b > 0.0) ? step(-0.0001, c) : smoothstep(0.0, 1.0, h * k / b);
}
`,dl=`uniform sampler2D uHeightTex, uColorTex, uPropTexA;
uniform vec4 uMapRect;
uniform vec3 uMapPlayer;
uniform vec4 uBlips[MAX_BLIPS];
uniform int uBlipCount;

vec3 blipColor(float kind) {
  if (kind < 0.5) return P_MUSTARD;
  if (kind < 1.5) return P_SLATE;
  if (kind < 3.5) return PAPER;
  if (kind < 4.5) return P_VERMILION;
  return P_SUN;
}

vec3 drawMinimap(vec3 col, vec2 px, vec3 page) {
  if (uMapRect.z < 1.0) return col;
  vec2 d = px - uMapRect.xy;
  float r = length(d);
  if (r > uMapRect.z + 1.0) return col;
  float dpr = uPencil.w;
  vec2 mapR = normalize(uCamRight.xz), mapF = normalize(uCamFwd.xz + 1e-5);
  vec2 off = (mapR * d.x + mapF * d.y) * uMapRect.w;
  vec2 w = uMapPlayer.xy + off;
  vec2 uv = (w + 0.5) / WORLD_TEX;
  float h = textureLod(uHeightTex, uv, 0.0).r;
  vec4 ct = textureLod(uColorTex, uv, 0.0);
  float stroke = dot(px, vec2(-0.883, 0.469)) / (3.6 * dpr);
  float hatch = mix(0.72, 1.0, smoothstep(0.25, 0.6, 0.5 + 0.5 * sin(stroke * 6.2832))) * (0.75 + 0.25 * hash12(floor(px / (1.5 * dpr))));
  vec3 m = page;
  if (h < SEA) m = mix(m, mix(P_SKY, P_SLATE, saturate(-h / 4.0)), 0.75 * hatch + 0.12);
  else m = mix(m, ct.rgb, (0.6 * hatch + 0.08) * (1.0 - ct.a * 0.9));
  ivec2 cell = ivec2(floor(w / CELL));
  vec4 pa = texelFetch(uPropTexA, cell & (CELLS - 1), 0);
  if (pa.w > 0.5) {
    vec2 c = (vec2(cell) + 0.5) * CELL + pa.xy;
    m = mix(m, INK_SEPIA, smoothstep(1.7, 1.2, length(w - c)) * 0.55);
  }
  for (int i = 0; i < MAX_BLIPS; i++) {
    if (i >= uBlipCount) break;
    float bd = length((uBlips[i].xy - w) / uMapRect.w);
    float s = uBlips[i].w;
    m = mix(m, INK_DARK, smoothstep(s + 2.0 * dpr, s + 1.0 * dpr, bd));
    m = mix(m, blipColor(uBlips[i].z), smoothstep(s + 0.6 * dpr, s - 0.2 * dpr, bd));
  }
  vec2 north = vec2(dot(vec2(0.0, -1.0), mapR), dot(vec2(0.0, -1.0), mapF)) * (uMapRect.z - 9.0 * dpr);
  float nd = length(d - north);
  m = mix(m, PAPER, smoothstep(8.5 * dpr, 7.5 * dpr, nd));
  m = mix(m, INK_SEPIA, smoothstep(8.5 * dpr, 7.5 * dpr, nd) * smoothstep(6.0 * dpr, 7.0 * dpr, nd));
  vec2 nq = (d - north) / (3.4 * dpr);
  float nGlyph = (abs(nq.y) < 1.0 && abs(nq.x) < 1.0) ? min(abs(abs(nq.x) - 0.8), abs(nq.x + nq.y * 0.8)) : 1.0;
  m = mix(m, INK_SEPIA, smoothstep(0.34, 0.2, nGlyph));
  vec2 face = vec2(-sin(uMapPlayer.z), cos(uMapPlayer.z));
  vec2 a = vec2(dot(off, vec2(face.y, -face.x)), dot(off, face)) / (uMapRect.w * uMapRect.z * 0.085);
  float arrow = max(abs(a.x) * 1.5 + a.y * 0.8 - 0.75, -a.y - 0.75 + abs(a.x) * 0.9);
  m = mix(m, INK_DARK, smoothstep(0.42, 0.18, arrow));
  m = mix(m, P_VERMILION, smoothstep(0.08, -0.1, arrow));
  return mix(col, m, smoothstep(uMapRect.z, uMapRect.z - 1.5, r));
}
`,hl=`const vec3 PAPER = vec3(0.945, 0.933, 0.898);
const vec3 INK_SEPIA = vec3(0.220, 0.175, 0.200);
const vec3 INK_SOFT = vec3(0.440, 0.400, 0.430);
const vec3 INK_DARK = vec3(0.120, 0.100, 0.130);
const vec3 INK_BLACK = vec3(0.141, 0.137, 0.180);
const vec3 INK_LEAF = vec3(0.180, 0.478, 0.275);
const vec3 INK_WET = vec3(0.227, 0.502, 0.659);

const vec3 P_BUTTER = vec3(0.973, 0.816, 0.361), P_SUN = vec3(0.957, 0.745, 0.243), P_HONEY = vec3(0.910, 0.643, 0.188);
const vec3 P_APRICOT = vec3(0.941, 0.620, 0.290), P_POPPY = vec3(0.878, 0.361, 0.275), P_TAN = vec3(0.886, 0.737, 0.510);
const vec3 P_BARK = vec3(0.690, 0.502, 0.329), P_UMBER = vec3(0.478, 0.243, 0.173), P_CREAM = vec3(0.973, 0.910, 0.745);
const vec3 P_BRICK = vec3(0.737, 0.329, 0.235), P_LEAF = vec3(0.455, 0.659, 0.353), P_GREEN = vec3(0.376, 0.620, 0.329);
const vec3 P_SAGE = vec3(0.588, 0.698, 0.471), P_PINE = vec3(0.455, 0.612, 0.541), P_TEAL = vec3(0.275, 0.588, 0.588);
const vec3 P_SKY = vec3(0.533, 0.706, 0.847), P_SLATE = vec3(0.329, 0.424, 0.612), P_DUSK = vec3(0.259, 0.298, 0.612);
const vec3 P_INDIGO = vec3(0.157, 0.196, 0.502), P_STONE = vec3(0.588, 0.557, 0.518), P_WOOD = vec3(0.871, 0.698, 0.431);
const vec3 P_ROSE = vec3(0.878, 0.439, 0.502), P_PEACH = vec3(0.925, 0.780, 0.690), P_CLAY = vec3(0.820, 0.640, 0.590);
const vec3 P_MUSTARD = vec3(0.886, 0.690, 0.204), P_VERMILION = vec3(0.839, 0.275, 0.204), P_CHARCOAL = vec3(0.290, 0.300, 0.370);

uniform vec4 uPencil;
uniform vec3 uPaperAnchor;
uniform vec3 uPaperRight, uPaperUp, uPaperFwd;
uniform vec3 uPaperRightB, uPaperUpB, uPaperFwdB;
uniform float uPaperMix;

const float CEL = 0.68;
const float SLANT = 1.082;
const float PITCH0 = 1.0 / 64.0;

vec2 pencilLod(float viewDepth) {
  float l = max(log2(max(uPencil.x * uPencil.y * viewDepth, 1e-5) / PITCH0), 0.0);
  return vec2(floor(l), fract(l));
}
vec2 paperCoords(vec3 worldPos, vec3 right, vec3 up) {
  vec3 d = worldPos - uPaperAnchor;
  return vec2(dot(d, right), dot(d, up));
}

float pullPressure(float i, float along, vec2 lod, float seed) {
  float id = i * exp2(lod.x);
  float rh = hash11(id * 0.731 + seed * 57.0);
  float pa = vnoise(vec2(along * 0.06, id * 0.37 + seed));
  float pb = vnoise(vec2(along * 0.03, id * 0.37 + seed));
  float keep = 1.0 - mod(i, 2.0) * smoothstep(0.2, 0.95, lod.y);
  return mix(0.82, 1.06, rh) * mix(0.66, 1.12, mix(pa, pb, lod.y)) * keep;
}
float pullWeight(float i, vec2 lod, float seed) {
  return mix(0.84, 1.1, hash11(i * exp2(lod.x) * 0.731 + seed * 57.0));
}

float pencilHand(vec2 uv, vec2 lod, float cover, float soft, float ang, float seed) {
  if (cover < 0.015) return 0.0;
  float pitch = PITCH0 * exp2(lod.x);
  float w = lod.y, wide = mix(1.0, 2.0, w);
  float tooth = 0.6 * mix(vnoise(uv / (pitch * 0.45) + seed * 3.1), vnoise(uv / (pitch * 0.9) + seed * 3.1), w)
              + 0.4 * mix(vnoise(uv / (pitch * 0.19) + 7.7), vnoise(uv / (pitch * 0.38) + 7.7), w);
  vec2 wander = (vec2(vnoise(uv * 1.3 + seed), vnoise(uv * 1.3 + seed + 31.7)) - 0.5) * 0.022;
  vec2 dir = vec2(cos(ang), sin(ang));
  float along = dot(uv + wander, dir) / pitch;
  float across = (dot(uv + wander, vec2(-dir.y, dir.x)) + seed * 0.37) / pitch;

  if (soft > 0.5) {
    float i0 = floor(across), f = across - i0;
    float odd0 = mod(i0, 2.0);
    float iE = i0 + odd0, iO = i0 + 1.0 - odd0, iE2 = 2.0 * iO - iE;
    float pE = pullWeight(iE, lod, seed), pE2 = pullWeight(iE2, lod, seed);
    float pO = mix(pullWeight(iO, lod, seed), 0.5 * (pE + pE2), smoothstep(0.2, 0.95, w));
    float t = f * f * (3.0 - 2.0 * f);
    float streak = odd0 < 0.5 ? mix(pE, pO, t) : mix(pO, pE, t);
    float drift = mix(0.78, 1.12, vnoise(uv * vec2(0.9, 0.9) + dir * dot(uv, dir) * 0.6 + seed * 5.0));
    float p = mix(0.36, 1.0, cover) * streak * drift;
    return smoothstep(tooth - 0.42, tooth + 0.3, p * 0.86);
  }
  float i = floor(across + 0.5), fy = across - i;
  float rh = hash11(i * exp2(lod.x) * 0.317 + seed * 11.0);
  float halfW = 0.5 * mix(0.6, 1.5, cover) * wide * (1.0 - 0.45 * mod(i, 2.0) * w);
  float centre = (rh - 0.5) * 0.3 * wide;
  float shape = 1.0 - smoothstep(halfW - 0.3 * wide, halfW, abs(fy - centre));
  float p = mix(0.45, 1.0, cover) * pullPressure(i, along, lod, seed);
  return max(shape, 0.3 * step(0.6, cover)) * smoothstep(tooth - 0.34, tooth + 0.22, p * 0.88);
}

float pencilLay(vec2 uv, vec2 lod, float cover, float soft, float ang, float seed) {
  if (cover < 0.015) return 0.0;
  float hand = pencilHand(uv, lod, cover, soft, ang, seed);
  float steps = cover * 4.0;
  float tone = (floor(steps) + smoothstep(0.4, 0.6, fract(steps))) / 4.0;
  float pitch = PITCH0 * exp2(lod.x);
  float grain = mix(vnoise(uv / (pitch * 0.6) + seed), vnoise(uv / (pitch * 1.2) + seed), lod.y);
  return mix(hand, saturate(pow(tone, 0.62) * 1.1) * mix(0.94, 1.0, grain), CEL);
}
float celShade(float shade) {
  return mix(shade, 0.5 * smoothstep(0.2, 0.27, shade) + 0.5 * smoothstep(0.68, 0.75, shade), CEL);
}

vec3 shadowPencil(vec3 c) {
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float sat = (mx - mn) / max(mx, 1e-3);
  vec3 deep = mix(c, c * c * 1.15, 0.62);
  float warm = saturate((c.r - c.b) * 2.4 - max(c.g - c.r, 0.0) * 6.0);
  deep = mix(deep, P_BRICK * (0.62 + 0.45 * mx), warm * 0.5);
  float own = mix(smoothstep(0.12, 0.34, sat), smoothstep(0.3, 0.55, sat), warm);
  return mix(vec3(0.50, 0.55, 0.69), deep, own);
}

vec3 nightPencil(vec3 c) {
  return mix(P_INDIGO * 1.15, c * vec3(0.62, 0.72, 0.95), 0.42);
}

vec3 paperSheet(vec2 px) {
  float g = vnoise(px * 0.55) * 0.5 + vnoise(px * 0.13) * 0.3 + hash12(floor(px)) * 0.2;
  return PAPER * (1.0 + (g - 0.5) * mix(0.07, 0.02, CEL));
}

vec3 layOn(vec3 page, vec3 pigment, float density) { return mix(page, pigment * (page / PAPER), density); }
vec3 shadeOn(vec3 page, vec3 pigment, float density) { return page * mix(vec3(1.0), pigment, density); }
vec3 inkOn(vec3 page, vec3 ink, float amount) { return mix(page, ink, amount); }
`,fl=`float shuttleCylZ(vec3 p, float r, float h) {
  vec2 d = vec2(length(p.xy) - r, abs(p.z) - h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
const vec3 SHUTTLE_ENGINE = vec3(1.04, 0.0, -1.5);
float shuttleMap(vec3 b, float fly, out float mat) {
  vec3 w = vec3(abs(b.x), b.y, b.z);
  float hull = smin(sdRoundBox(b - vec3(0.0, 0.0, -0.5), vec3(0.8, 0.58, 1.7), 0.45), sdEllipsoid(b - vec3(0.0, -0.08, 1.2), vec3(0.72, 0.5, 1.7)), 0.45);
  hull = max(hull, -(b.y + 0.56));
  float glass = sdEllipsoid(b - vec3(0.0, 0.2, 1.45), vec3(0.5, 0.33, 0.85));
  vec3 wq = vec3(w.x - 1.6, w.y + 0.15, w.z + 0.9 + (w.x - 0.8) * 0.6);
  float wing = sdRoundBox(wq, vec3(0.95, 0.05, 0.64 - (w.x - 0.8) * 0.14), 0.035);
  wing = min(wing, sdRoundBox(vec3(w.x - 2.52, w.y - 0.08, w.z + 2.02 + (w.y - 0.08) * 0.5), vec3(0.035, 0.27, 0.3), 0.02));
  float fin = sdRoundBox(vec3(w.x - 0.4 - (b.y - 0.5) * 0.45, b.y - 0.92, b.z + 1.7 + (b.y - 0.5) * 0.95), vec3(0.035, 0.4, 0.42 - (b.y - 0.5) * 0.28), 0.02);
  vec3 e = w - SHUTTLE_ENGINE;
  float rad = length(e.xy);
  float nac = shuttleCylZ(e, 0.31, 0.72) - 0.05;
  nac = min(nac, sdRoundBox(w - vec3(0.8, 0.0, -1.45), vec3(0.2, 0.13, 0.5), 0.05));
  float white = min(min(hull, wing), min(fin, nac));
  float lip = max(abs(rad - 0.33) - 0.045, abs(e.z - 0.78) - 0.07);
  white = min(white, lip);
  float dark = max(rad - 0.3, abs(e.z - 0.76) - 0.04);
  float t = saturate((-e.z - 0.72) / 0.5);
  float bell = max(max(rad - mix(0.3, 0.43, t), -(rad - mix(0.22, 0.37, t))), abs(e.z + 0.97) - 0.25);
  dark = min(dark, bell);
  float core = max(rad - 0.29, abs(e.z + 0.84) - 0.05);
  vec3 k = vec3(w.x, b.y + 1.05 - 0.52 * fly, b.z);
  float skid = min(sdCapsule(k, vec3(0.5, 0.1, -1.3), vec3(0.5, 0.1, 1.4), 0.07),
               min(sdCapsule(k, vec3(0.5, 0.1, 0.9), vec3(0.42, 0.56, 0.8), 0.045), sdCapsule(k, vec3(0.5, 0.1, -0.9), vec3(0.42, 0.56, -0.8), 0.045)));
  dark = min(dark, skid);
  float d = min(min(white, glass), min(core, dark));
  mat = d == glass ? 1.0 : (d == core ? 2.0 : (d == dark ? 3.0 : 0.0));
  if (fly > 0.05) {
    float len = fly * (1.7 + 0.22 * sin(uTime * 41.0) + 0.1 * sin(uTime * 17.0));
    float flame = sdTaper(e, vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0 - len * 1.25), 0.2, 0.02);
    if (flame < d) { d = flame; mat = 4.0; }
  }
  return d * 0.85;
}
void shuttleSurf(vec3 b, float mat, float fly, vec3 trim, inout Surf s) {
  vec3 w = vec3(abs(b.x), b.y, b.z);
  vec3 e = w - SHUTTLE_ENGINE;
  float rad = length(e.xy);
  if (mat > 3.5) {
    float along = saturate((-e.z - 1.0) / (2.1 * max(fly, 0.05)));
    s.albedo = mix(P_SUN, P_APRICOT, along); s.cover = mix(0.05, 0.6, smoothstep(0.15, 0.95, along)); s.glow = 1.0 - 0.45 * along; s.soft = 1.0;
    return;
  }
  if (mat > 2.5) {
    s.albedo = P_CHARCOAL; s.cover = 0.86;
    if (e.z < -0.7 && rad < 0.5) s.ink = penLine((fract(e.z * 5.0) - 0.5) / 5.0) * 0.5;
    return;
  }
  if (mat > 1.5) { s.albedo = P_APRICOT; s.cover = 0.5 - 0.4 * fly; s.glow = 0.35 + 0.6 * fly; return; }
  if (mat > 0.5) {
    s.albedo = P_SLATE; s.cover = 0.86 * (1.0 - smoothstep(0.05, 0.02, abs(b.x * 0.6 + b.y - 0.42)));
    s.ink = max(penLine(b.x), penLine(b.z - 1.45)) * 0.7;
    return;
  }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0; s.wrap = 0.2;
  bool side = w.x > 0.55 && w.x < 0.95 && abs(b.y) < 0.6;
  s.ink = max(penLine((fract(b.z * 0.8 + 0.25) - 0.5) / 0.8) * step(w.x, 0.95), penLine(b.y + 0.2) * step(w.x, 0.95)) * 0.45;
  if (w.x < 0.95 && abs(b.y - 0.02) < 0.055 && b.z > -2.0) { s.albedo = trim; s.cover = 0.84; s.ink = 0.0; }
  if (w.x > 2.18) { s.albedo = trim; s.cover = 0.84; }
  if (b.y > 1.14 && b.z < -1.2) { s.albedo = trim; s.cover = 0.84; }
  if (rad < 0.42 && e.z > 0.3 && e.z < 0.48) { s.albedo = trim; s.cover = 0.84; s.ink = 0.0; }
  if (rad < 0.42 && abs(e.z) < 0.75) s.ink = max(s.ink, max(penLine(e.z - 0.3), penLine(e.z + 0.45)) * 0.5);
  if (side) {
    float ring = length(vec2(b.z + 0.75, b.y - 0.3));
    if (ring < 0.09) { s.albedo = trim; s.cover = 0.84; }
    s.ink = max(s.ink, penLine(ring - 0.16) * 0.8);
    s.ink = max(s.ink, penLine(sdBox(vec3(b.z - 0.25, b.y + 0.2, 0.0), vec3(0.28, 0.27, 1.0))) * step(b.y, 0.0) * 0.6);
  }
}
`,ul=`vec2 starFace(vec3 d, out float face) {
  vec3 a = abs(d);
  if (a.x > a.y && a.x > a.z) { face = d.x > 0.0 ? 0.0 : 1.0; return d.yz / a.x; }
  if (a.y > a.z) { face = d.y > 0.0 ? 2.0 : 3.0; return d.xz / a.y; }
  face = d.z > 0.0 ? 4.0 : 5.0; return d.xy / a.z;
}
float starField(vec3 d, float many, float size, float rare) {
  float face;
  vec2 uv = starFace(d, face) * many, cell = floor(uv);
  vec2 so = hash22(cell + face * 31.0 + 3.1) - 0.5;
  return smoothstep(size, size * 0.45, length(fract(uv) - 0.5 - so * 0.6)) * step(rare, hash12(cell + face * 17.0));
}
vec3 spaceLay(vec3 rd, out float cover, out float ink) {
  ink = 0.0;
  vec3 pig = mix(P_INDIGO, INK_BLACK, 0.5);
  cover = 0.95;
  float river = smoothstep(0.42, 0.0, abs(dot(rd, normalize(vec3(0.35, 0.86, -0.36)))));
  cover *= 1.0 - 0.3 * river * smoothstep(0.35, 0.7, fbm(rd.xz * 3.0 + rd.y * 2.0));
  cover *= 1.0 - max(starField(rd, 34.0, 0.075, 0.62 - 0.25 * river), starField(rd, 13.0, 0.06, 0.88));
  vec3 pd = normalize(vec3(-0.5, 0.02, -0.86));
  vec3 px_ = normalize(cross(pd, vec3(0.0, 1.0, 0.0))), py_ = cross(px_, pd);
  vec2 q = vec2(dot(rd, px_), dot(rd, py_)) / 0.34;
  float rr = length(q), front = step(0.0, dot(rd, pd));
  vec2 e = vec2(q.x * 0.94 + q.y * 0.34, (q.y * 0.94 - q.x * 0.34) / 0.3);
  float er = length(e);
  float ring = smoothstep(1.3, 1.34, er) * smoothstep(2.1, 2.05, er) * (0.5 + 0.5 * step(0.4, fract(er * 5.0))) * front;
  if (rr < 1.0 && front > 0.5) {
    float lit = smoothstep(-0.25, 0.35, dot(normalize(vec3(q, sqrt(1.0 - rr * rr))), normalize(vec3(0.5, 0.6, 0.62))));
    float band = vnoise(vec2(q.y * 6.0 + vnoise(q * 2.5) * 1.1, q.x * 0.6));
    vec3 world = mix(P_PEACH, P_ROSE, smoothstep(0.4, 0.62, band));
    pig = mix(pig, world, lit);
    cover = mix(0.95, mix(0.62, 0.3, smoothstep(0.3, 0.7, band)), lit);
    ink = smoothstep(0.02, 0.0, abs(rr - 0.985)) * 0.6;
  }
  bool behind = e.y > 0.0 && rr < 1.0;
  if (!behind && ring > 0.01) { pig = mix(pig, P_TAN, ring); cover = mix(cover, 0.5, ring); }
  float md = dot(rd, normalize(vec3(0.7, 0.32, 0.64)));
  if (md > 0.9985) { pig = P_SLATE; cover = 0.28; ink = max(ink, smoothstep(0.00016, 0.0, abs(md - 0.99858)) * 0.5); }
  float sd = dot(rd, uSunDisk);
  cover *= 1.0 - smoothstep(0.9982, 0.999, sd) - 0.35 * smoothstep(0.99, 0.9982, sd) * (1.0 - smoothstep(0.9982, 0.999, sd));
  return pig;
}

vec3 skyLay(vec3 rd, out float cover, out float ink) {
  float h = max(rd.y, 0.0);
  ink = 0.0;
  if (uRealm > 0.5 && uRealm < 1.5) { cover = 0.97; return mix(P_INDIGO, INK_BLACK, 0.66); }
  if (uRealm > 1.5) return spaceLay(rd, cover, ink);
  vec3 pig = P_SKY;
  cover = mix(0.1, 0.5, smoothstep(0.02, 0.5, h));
  float low = exp(-h * 6.0);
  pig = mix(pig, mix(P_APRICOT, P_ROSE, 0.3), uGold * low * 0.9);
  cover = mix(cover, 0.4, uGold * low);
  pig = mix(pig, mix(P_INDIGO, P_DUSK, 0.4), uNight);
  cover = mix(cover, mix(0.6, 0.86, smoothstep(0.0, 0.5, h)), uNight);

  vec3 pd = normalize(vec3(-0.55, 0.4, -0.73));
  float planet = 0.0;
  if (dot(rd, pd) > 0.0) {
    vec3 px_ = normalize(cross(pd, vec3(0.0, 1.0, 0.0))), py_ = cross(px_, pd);
    vec2 q = vec2(dot(rd, px_), dot(rd, py_)) / 0.2;
    float rr = length(q);
    vec2 e = vec2(q.x * 0.94 + q.y * 0.34, (q.y * 0.94 - q.x * 0.34) / 0.28);
    float er = length(e);
    float ring = smoothstep(1.36, 1.4, er) * smoothstep(2.25, 2.2, er) * (0.55 + 0.45 * step(0.45, fract(er * 4.2)));
    if (rr < 1.0) {
      float lit = smoothstep(-0.15, 0.3, dot(normalize(vec3(q, sqrt(1.0 - rr * rr))), normalize(vec3(0.55, 0.45, 0.7))));
      float band = vnoise(vec2(q.y * 5.0 + vnoise(q * 3.0) * 0.9, q.x * 0.7));
      vec3 world = mix(P_PEACH, P_ROSE, smoothstep(0.42, 0.6, band));
      pig = mix(world, nightPencil(world), uNight * 0.5);
      cover = mix(0.72, 0.4, lit);
      ink = max(ink, smoothstep(0.035, 0.0, abs(rr - 0.98)) * 0.55);
      planet = 1.0;
    }
    bool behind = e.y > 0.0 && rr < 1.0;
    if (!behind && ring > 0.01) { pig = mix(pig, mix(P_TAN, P_SLATE, uNight * 0.6), ring); cover = mix(cover, 0.55, ring); planet = max(planet, ring); }
  }
  float md2 = dot(rd, normalize(vec3(0.72, 0.2, 0.66)));
  if (md2 > 0.9992) { pig = P_SLATE; cover = 0.3 * smoothstep(0.9992, 0.9995, md2); ink = max(ink, smoothstep(0.00012, 0.0, abs(md2 - 0.99925)) * 0.4); }
  if (rd.y > 0.01) {
    vec2 uv = rd.xz / (rd.y + 0.16) * 1.1 + uWind * uTime * 0.012;
    float edge = 0.6 - uCloud * 0.28;
    float cloud = smoothstep(edge - 0.02, edge + 0.06, fbm(uv)) * smoothstep(0.01, 0.14, rd.y);
    cover *= 1.0 - cloud * mix(0.96, 0.5, uNight) * (1.0 - 0.72 * planet);
    if (uNight > 0.05) {
      vec2 sp = rd.xz / (rd.y + 0.35) * 42.0;
      vec2 cell = floor(sp);
      float star = hash12(cell);
      vec2 so = hash22(cell + 3.1) - 0.5;
      cover *= 1.0 - smoothstep(0.1, 0.04, length(fract(sp) - 0.5 - so * 0.6)) * step(0.8, star) * uNight;
    }
  }
  cover *= 1.0 - smoothstep(0.9984, 0.9990, dot(rd, uSunDisk)) * (1.0 - uNight) * step(0.0, rd.y);
  float md = dot(rd, uMoonDisk);
  float moon = smoothstep(0.9986, 0.9991, md) * (1.0 - 0.9 * smoothstep(0.9986, 0.9991, dot(rd, normalize(uMoonDisk + vec3(0.022, 0.013, 0.0)))));
  cover *= 1.0 - moon * uNight;

  // a bank of cloud along the horizon, billowing, in two layers
  float azA = atan(rd.x, rd.z);
  vec2 az = vec2(cos(azA), sin(azA));
  float puff1 = abs(sin(azA * 9.0 + 1.3)) * 0.5 + abs(sin(azA * 23.0 + 4.1)) * 0.25;
  float puff2 = abs(sin(azA * 14.0 + 2.2)) * 0.5 + abs(sin(azA * 31.0 + 0.7)) * 0.25;
  float r1 = 0.03 + 0.05 * fbm(az * 2.2 + 4.0) + 0.022 * puff1;
  float r2 = 0.012 + 0.03 * fbm(az * 3.6 + 11.0) + 0.016 * puff2;
  float m1 = smoothstep(r1 + 0.002, r1, rd.y), m2 = smoothstep(r2 + 0.002, r2, rd.y);
  vec3 far1 = mix(P_SKY, PAPER, 0.5), far2 = mix(P_SKY, P_SLATE, 0.12);
  far1 = mix(far1, mix(P_APRICOT, P_ROSE, 0.4), uGold * 0.35); far2 = mix(far2, mix(P_ROSE, P_DUSK, 0.5), uGold * 0.3);
  far1 = mix(far1, nightPencil(far1), uNight); far2 = mix(far2, nightPencil(far2), uNight);
  pig = mix(pig, far1, m1); cover = mix(cover, mix(0.16, 0.5, uNight), m1);
  pig = mix(pig, far2, m2); cover = mix(cover, mix(0.26, 0.62, uNight), m2);
  ink = max(smoothstep(0.003, 0.0, abs(rd.y - r1)), smoothstep(0.003, 0.0, abs(rd.y - r2))) * 0.22;
  float mist = smoothstep(-0.005, 0.03, rd.y);
  cover *= mist; ink *= mist;
  return pig;
}

// Distant islands floating over the cloud sea. They are drawn by direction alone, so they hold still while the
// camera turns. Drawn far to near: the far ones sit low and pale in the haze, the near ones higher, larger and
// clearer, some with a thread of water falling from them.
bool farIslands(vec3 rd, inout vec3 pig, inout float cover, inout float ink) {
  if (uSky.y < 0.5) return false;
  float flat_ = max(length(rd.xz), 1e-3);
  float el = rd.y / flat_;
  if (el > 0.16 || el < -0.3) return false;
  float az = atan(rd.x, rd.z);
  float px = max(fwidth(el), 2e-4);
  bool any_ = false;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float far = 1.0 - fi / 11.0;
    // every third sits high and far off, seen when the camera looks out rather than down
    bool high = mod(fi, 3.0) < 0.5;
    float a0 = TAU * fract(uSky.x + fi * 0.381966) - PI;
    float w = mix(0.085, 0.032, far) * (0.7 + 0.6 * fract(fi * 0.731 + uSky.x * 3.1));
    float da = az - a0;
    da -= TAU * floor((da + PI) / TAU);
    float u = da / w;
    if (abs(u) > 1.0) continue;
    float e0 = high ? mix(0.035, -0.01, far) + 0.03 * fract(fi * 0.37 + uSky.x * 5.0)
                    : mix(-0.075, -0.14, far) + 0.05 * (fract(fi * 0.53 + uSky.x * 7.0) - 0.5);
    if (high) w *= 0.8;
    float uu = 1.0 - u * u;
    float dome = w * 0.07 * sqrt(uu);
    // round tree crowns along the top, in clumps
    float k = u * 9.0 + fi * 3.0;
    float lx = (fract(k) - 0.5) * w / 9.0;
    float pick = hash12(vec2(floor(k), fi + uSky.x * 13.0));
    float R = w / 9.0 * (0.42 + 0.3 * pick);
    float grove = vnoise(vec2(u * 3.0 + fi * 19.0, fi * 3.7));
    float trees = sqrt(max(R * R - lx * lx, 0.0)) * 1.6 * step(0.3, pick) * step(0.4, grove) * smoothstep(0.88, 0.62, abs(u));
    float topY = e0 + dome + trees;
    // the underside: a rough inverted cone of rock and roots, coming to a point
    float jag = vnoise(vec2(u * 13.0 + fi * 7.0, 2.0));
    float under = w * mix(0.75, 1.15, jag) * pow(max(1.0 - abs(u), 0.0), 1.25) * (0.85 + 0.3 * fract(fi * 0.41));
    float botY = e0 - under;
    float haze = mix(0.34, 0.8, far);
    // a waterfall from some of them, a pale thread down into the haze
    float side = fract(fi * 0.77 + uSky.x * 5.0);
    if (side > 0.45) {
      float uf = (side - 0.72) * 1.4;
      float lip = e0 - w * 0.12;
      float strip = 1.0 - smoothstep(0.03, 0.055, abs(u - uf));
      float drop = smoothstep(lip + px, lip - w * 0.05, el) * (1.0 - smoothstep(lip - w * 1.2, lip - w * 3.2, el));
      float f = strip * drop;
      if (f > 0.01) {
        pig = mix(pig, mix(P_SKY, PAPER, 0.5), f);
        cover = mix(cover, mix(0.2, 0.05, haze), f);
        ink = max(ink, (1.0 - smoothstep(0.02, 0.035, abs(abs(u - uf) - 0.05))) * drop * 0.35 * (1.0 - haze));
        any_ = true;
      }
    }
    if (el < botY - px || el > topY + px) continue;
    float body = smoothstep(botY - px, botY + px, el) * (1.0 - smoothstep(topY - px, topY + px, el));
    float grassy = smoothstep(e0 - w * 0.05, e0 + w * 0.02, el);
    vec3 col = mix(mix(uRockCol, P_UMBER, 0.2), uSkyTop, grassy);
    col = mix(col, mix(INK_LEAF, uSkyTop, 0.55), step(e0 + dome + px * 2.0, el) * step(0.001, trees));
    float stripe = 0.5 + 0.5 * sin((el - e0) / w * 34.0 + u * 3.0);
    col = mix(col, uRockCol * 0.8, (1.0 - grassy) * 0.25 * stripe);
    col = mix(col, mix(P_SKY, PAPER, 0.35), haze * 0.75);
    col = mix(col, nightPencil(col), uNight);
    float c = mix(0.62, 0.16, haze) * mix(0.85, 1.0, grassy);
    pig = mix(pig, col, body);
    cover = mix(cover, mix(c, c * 1.15 + 0.06, uNight), body);
    float edgeLine = max(1.0 - smoothstep(px * 0.6, px * 1.6, abs(el - topY)), 1.0 - smoothstep(px * 0.6, px * 1.6, abs(el - botY)));
    ink = max(ink * (1.0 - body), edgeLine * mix(0.55, 0.12, haze));
    any_ = true;
  }
  return any_;
}
`,pl=`const vec3 SLAB_N[5] = vec3[5](vec3(0.83, 0.52, 0.21), vec3(-0.61, 0.61, 0.51), vec3(0.1, 0.7, -0.71), vec3(-0.5, 0.31, -0.81), vec3(0.3, -0.9, 0.31));
float slab(vec3 c, float r, float seed) {
  float d = length(c) - r;
  if (d > r * 0.6) return d;
  for (int i = 0; i < 5; i++) d = max(d, dot(c, SLAB_N[i]) - r * (0.68 + 0.2 * fract(seed * (5.0 + float(i) * 2.7))));
  return d - 0.06 * r;
}
`,ml=`uniform sampler2D uHeightTex;
uniform sampler2D uColorTex;
uniform sampler2D uMatTex;
uniform sampler2D uPropTexA;
uniform sampler2D uPropTexB;
uniform float uMaxY;
uniform float uWall;

const float INV_T = 1.0 / WORLD_TEX;
float hAt(vec2 xz) {
  vec4 h = textureLod(uHeightTex, (xz + 0.5) * INV_T, 0.0);
  return uWall > 0.0 ? h.r + uWall * smoothstep(0.0, 0.1, h.a) - 40.0 * step(h.b, 0.0) : h.r;
}
vec3 terrainNormal(vec2 xz) {
  const float e = 0.7;
  return normalize(vec3(hAt(xz - vec2(e, 0.0)) - hAt(xz + vec2(e, 0.0)), 2.0 * e,
                        hAt(xz - vec2(0.0, e)) - hAt(xz + vec2(0.0, e))));
}

bool cellProp(ivec2 cell, out Prop pr) {
  ivec2 tc = cell & (CELLS - 1);
  vec4 a = texelFetch(uPropTexA, tc, 0);
  pr.type = int(a.w + 0.5);
  if (pr.type == 0) return false;
  vec4 b = texelFetch(uPropTexB, tc, 0);
  vec2 c = (vec2(cell) + 0.5) * CELL + a.xy;
  pr.base = vec3(c.x, a.z, c.y);
  pr.rot = b.x * TAU; pr.scale = b.y * 2.0; pr.seed = b.z; pr.pal = b.w * 255.0;
  return true;
}
mat2 propRot(Prop pr) { return rot2(pr.rot); }
vec3 toProp(vec3 p, Prop pr, mat2 r) { vec3 q = p - pr.base; q.xz = r * q.xz; return q / pr.scale; }

float cellExit(vec2 xz, vec2 dir) {
  vec2 f = fract(xz / CELL);
  vec2 e = mix(f, 1.0 - f, step(0.0, dir)) * CELL / (abs(dir) + 1e-5);
  return min(e.x, e.y) + 0.02;
}

struct Hit { float t; int kind; float mat; Prop pr; ivec2 cell; };

bool gReveal = false;
float gRevealT = 0.0;

void marchScene(vec3 ro, vec3 rd, float tMin, float tMax, out Hit hit) {
  hit.kind = 0; hit.t = tMax; hit.mat = 0.0; hit.cell = ivec2(0);
  float t = tMin, tPrev = tMin;
  ivec2 last = ivec2(-99999);
  bool has = false;
  Prop pr; mat2 pm;
  for (int i = 0; i < MARCH_STEPS; i++) {
    vec3 p = ro + rd * t;
    float above = p.y - hAt(p.xz);
    float eps = 0.0016 * t + 0.003;
    if (above < eps) {
      float a = tPrev, b = t;
      for (int k = 0; k < 5; k++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - hAt(q.xz) < eps) b = m; else a = m;
      }
      hit.t = b; hit.kind = 1;
      return;
    }
    float d;
    if (above < PROP_HMAX) {
      d = above * 0.5;
      ivec2 cell = ivec2(floor(p.xz / CELL));
      if (cell != last) { last = cell; has = cellProp(cell, pr); if (has) pm = propRot(pr); }
      if (has) {
        float m;
        float dp = propSdf(toProp(p, pr, pm), pr, m) * pr.scale;
        if (dp < eps) {
          if (!(gReveal && t < gRevealT && propSeeThrough(pr.type, m))) {
            hit.t = t; hit.kind = 2; hit.mat = m; hit.pr = pr; hit.cell = cell;
            return;
          }
          dp = 0.3;
        }
        d = min(d, dp);
      }
      d = min(d, cellExit(p.xz, rd.xz));
    } else {
      d = (above - PROP_HMAX) * 0.5 + 0.35;
    }
    tPrev = t;
    t += max(d, 0.02);
    if (t > tMax) break;
  }
}

float shadowMarch(vec3 p, vec3 L) {
  float res = 1.0, t = 0.1;
  ivec2 last = ivec2(-99999);
  bool has = false;
  Prop pr; mat2 pm;
  for (int i = 0; i < SHADOW_STEPS; i++) {
    vec3 q = p + L * t;
    float above = q.y - hAt(q.xz);
    if (above < -0.03) return 0.0;
    float d = above * 0.6 + 0.06;
    if (t > 1.5) res = min(res, 16.0 * above / t);
    if (above < PROP_HMAX) {
      ivec2 cell = ivec2(floor(q.xz / CELL));
      // the small plants and pebbles (types 35 to 38) cast no shadow worth the cost
      if (cell != last) { last = cell; has = cellProp(cell, pr) && (pr.type < 35 || pr.type > 38); if (has) pm = propRot(pr); }
      if (has) {
        float m;
        float dp = propSdf(toProp(q, pr, pm), pr, m) * pr.scale;
        if (dp < 0.01) return 0.0;
        res = min(res, 11.0 * dp / t);
        d = min(d, dp);
      }
      d = min(d, cellExit(q.xz, L.xz));
    }
    t += clamp(d, 0.07, 5.0);
    if (res < 0.02 || q.y > uMaxY || t > 46.0) break;
  }
  return saturate(res);
}

float cloudShadow(vec2 xz) {
  float d = fbm(xz * 0.011 + uWind * uTime * 0.02);
  float edge = 0.66 - uCloud * 0.3;
  return 1.0 - 0.3 * smoothstep(edge - 0.08, edge + 0.08, d) * (1.0 - uNight * 0.6);
}
`,Ri=new Map([["common",()=>ol],["pencil",()=>hl],["frame",()=>il],["sky",()=>ul],["lighting",()=>cl],["terrain",()=>ml],["ground",()=>rl],["minimap",()=>dl],["held",()=>ll],["shuttle",()=>fl],["eyes",()=>al],["slab",()=>pl]]);function vl(s,e){Ri.set(s,typeof e=="function"?e:()=>e)}const gl=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;function bl(s){const e={WORLD_TEX:He.TEX.toFixed(1),CELL:He.CELL.toFixed(1),CELLS:He.TEX/He.CELL|0,SEA:He.SEA.toFixed(2),PROP_HMAX:He.PROP_HMAX.toFixed(2),VIEW_DIST:He.VIEW.toFixed(1),MAX_CASTERS:_e.MAX_CASTERS,MAX_LIGHTS:_e.MAX_LIGHTS,MAX_BLIPS:_e.MAX_BLIPS,...s};return Object.entries(e).map(([t,n])=>`#define ${t} ${n}`).join(`
`)+`
`}function da(s,e,t){const n=new Set,o=a=>a.replace(/^[ \t]*#include <([\w./-]+)>[ \t]*$/gm,(i,r)=>{if(n.has(r))return"";if(n.add(r),t&&Object.prototype.hasOwnProperty.call(t,r))return o(t[r]);const c=Ri.get(r);if(!c)throw new Error(`Unknown shader chunk <${r}>`);return o(c())});return gl+bl(e)+o(s)}const Ii=new WeakMap;function yl(s){const e=s.getContext("webgl2",{antialias:!1,alpha:!1,depth:!1,stencil:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1});if(!e)throw new Error("This game needs WebGL2, which this browser does not provide.");const t={floatTargets:!!e.getExtension("EXT_color_buffer_float"),halfFloatTargets:!!e.getExtension("EXT_color_buffer_half_float")};if(!t.floatTargets&&!t.halfFloatTargets)throw new Error("This GPU cannot render to float textures.");return e.pixelStorei(e.UNPACK_ALIGNMENT,1),Ii.set(e,t),e}function ha(s,e,t,n){const o=s.createShader(e);if(!o)throw new Error(`Unable to create shader "${n}".`);if(s.shaderSource(o,t),s.compileShader(o),!s.getShaderParameter(o,s.COMPILE_STATUS)){const a=s.getShaderInfoLog(o)||"",i=t.split(`
`),r=[...a.matchAll(/ERROR: \d+:(\d+)/g)].slice(0,4).map(c=>{const d=Number(c[1]);return i.slice(Math.max(0,d-3),d+1).map((h,u)=>`${Math.max(1,d-2)+u}: ${h}`).join(`
`)}).join(`
---
`);throw new Error(`Shader "${n}" failed to compile:
${a}
${r}`)}return o}const xl={5126:(s,e,t)=>typeof t=="number"?s.uniform1f(e,t):s.uniform1fv(e,t),35664:(s,e,t)=>s.uniform2fv(e,t),35665:(s,e,t)=>s.uniform3fv(e,t),35666:(s,e,t)=>s.uniform4fv(e,t),5124:(s,e,t)=>typeof t=="number"?s.uniform1i(e,t):s.uniform1iv(e,t),35676:(s,e,t)=>s.uniformMatrix4fv(e,!1,t),35675:(s,e,t)=>s.uniformMatrix3fv(e,!1,t)};class Mn{gl;handle;uniforms={};unit=0;constructor(e,t,n,o,a,i){this.gl=e;const r=e.createProgram();if(!r)throw new Error(`Unable to create program "${t}".`);this.handle=r;const c=ha(e,e.VERTEX_SHADER,da(n,a,i),`${t} (vertex)`),d=ha(e,e.FRAGMENT_SHADER,da(o,a,i),`${t} (fragment)`);if(e.attachShader(r,c),e.attachShader(r,d),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw new Error(`Program "${t}" failed to link: ${e.getProgramInfoLog(r)||""}`);e.deleteShader(c),e.deleteShader(d);const h=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let u=0;u<h;u++){const f=e.getActiveUniform(r,u);if(!f)continue;const p=e.getUniformLocation(r,f.name);if(!p)continue;const m=f.name.replace(/\[0\]$/,"");this.uniforms[m]={loc:p,type:f.type}}}use(){return this.gl.useProgram(this.handle),this.unit=0,this}set(e,t){const n=this.uniforms[e];if(n){const o=xl[n.type];o&&o(this.gl,n.loc,t)}return this}tex(e,t){const n=this.uniforms[e];if(!n)return this;const o=this.gl;return o.activeTexture(o.TEXTURE0+this.unit),o.bindTexture(o.TEXTURE_2D,t),o.uniform1i(n.loc,this.unit++),this}}function Io(s,e){const t=s.createTexture();if(!t)throw new Error("Unable to create WebGL texture.");const n=e.filter??s.NEAREST,o=e.wrap??s.CLAMP_TO_EDGE;return s.bindTexture(s.TEXTURE_2D,t),s.texImage2D(s.TEXTURE_2D,0,e.internal,e.width,e.height,0,e.format,e.type,e.data??null),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,n),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,n),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,o),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,o),t}class Ls{gl;spec;useDepth;width=0;height=0;textures=[];fbo=null;depth=null;constructor(e,t,n=!1){this.gl=e,this.spec=t,this.useDepth=n}resize(e,t){const n=this.gl,o=Math.max(1,e|0),a=Math.max(1,t|0);if(o===this.width&&a===this.height)return!1;this.dispose(),this.width=o,this.height=a;const i=n.createFramebuffer();if(!i)throw new Error("Unable to create framebuffer.");this.fbo=i,n.bindFramebuffer(n.FRAMEBUFFER,i);const r=Ii.get(n);if(this.textures=this.spec.map((d,h)=>{const u=!!(d.precise&&r?.floatTargets),f=Io(n,{width:o,height:a,internal:u?n.RGBA32F:n.RGBA16F,format:n.RGBA,type:u?n.FLOAT:n.HALF_FLOAT,filter:d.filter==="nearest"||u?n.NEAREST:n.LINEAR});return n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+h,n.TEXTURE_2D,f,0),f}),this.useDepth){const d=n.createRenderbuffer();if(!d)throw new Error("Unable to create depth renderbuffer.");this.depth=d,n.bindRenderbuffer(n.RENDERBUFFER,d),n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_COMPONENT24,o,a),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,d)}const c=n.checkFramebufferStatus(n.FRAMEBUFFER);if(c!==n.FRAMEBUFFER_COMPLETE)throw new Error("Render target incomplete: 0x"+c.toString(16));return n.bindFramebuffer(n.FRAMEBUFFER,null),!0}bind(e=this.textures.length){const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,this.fbo),t.viewport(0,0,this.width,this.height),t.drawBuffers(this.textures.map((n,o)=>o<e?t.COLOR_ATTACHMENT0+o:t.NONE))}dispose(){const e=this.gl;for(const t of this.textures)e.deleteTexture(t);this.depth&&e.deleteRenderbuffer(this.depth),this.fbo&&e.deleteFramebuffer(this.fbo),this.textures=[],this.depth=null,this.fbo=null}}function wl(s,e,t){s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,e,t)}function Hs(s){s.drawArrays(s.TRIANGLES,0,3)}const kl=`in vec3 vWorld;
flat in vec4 vPosScale, vPose, vLook, vColA, vColB, vColC;
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oAux;
uniform vec2 uBound;
uniform float uFar, uPixel;

#include <common>
#include <frame>
#include <pencil>
#include <lighting>

vec4 ePose, eLook;
vec3 eColA, eColB, eColC;
float eMove, eExtra, eSpare;
vec3 gNormal = vec3(0.0, 1.0, 0.0), gRay = vec3(0.0, 0.0, 1.0);
#include <archetype>

vec3 entNormal(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.006;
  float m;
  return normalize(e.xyy * entMap(p + e.xyy, m) + e.yyx * entMap(p + e.yyx, m) +
                   e.yxy * entMap(p + e.yxy, m) + e.xxx * entMap(p + e.xxx, m));
}

void main() {
  ePose = vec4(vPose.yzw, vColA.w); eLook = vLook;
  eColA = vColA.rgb; eColB = vColB.rgb; eColC = vColC.rgb;
  eMove = vColA.w; eExtra = vColB.w; eSpare = vColC.w;
  float scale = vPosScale.w;
  mat2 R = rot2(vPose.x);
  vec3 rdW = normalize(vWorld - uCamPos);
  vec3 lo = (uCamPos - vPosScale.xyz) / scale;
  lo.xz = R * lo.xz;
  vec3 ld = rdW;
  ld.xz = R * ld.xz;

  vec3 oc = lo - vec3(0.0, uBound.x, 0.0);
  float b = dot(oc, ld), h = b * b - (dot(oc, oc) - uBound.y * uBound.y * 1.21);
  if (h < 0.0) discard;
  h = sqrt(h);
  float t = max(-b - h, 0.0), tEnd = -b + h;

  entPose();
  float pix = uPixel / scale;
  float mat = 0.0, minD = 1e3, tEdge = t, inner = 0.0, matEdge = 0.0;
  bool hit = false;
  float w = max(OUTLINE_PX * pix * t, 0.03);
  for (int i = 0; i < ENT_STEPS; i++) {
    float d = entMap(lo + ld * t, mat);
    if (d < 0.5 * pix * t) { hit = true; break; }
    if (d < minD) { minD = d; tEdge = t; matEdge = mat; }
    else if (minD < w * 0.6 && d > minD + w * 0.5) inner = max(inner, smoothstep(w * 0.6, w * 0.25, minD));
    t += d * 0.92;
    if (t > tEnd) break;
  }
  vec3 pe = lo + ld * tEdge;
  float press = mix(mix(0.72, 1.0, vnoise(pe.xy * 5.0 + eLook.x * 31.0)), 1.0, CEL);
  float contour = hit ? 0.0 : smoothstep(w, w * 0.5, minD);
  float again = hit ? 0.0 : smoothstep(1.85 * w, 1.65 * w, minD) * smoothstep(1.2 * w, 1.35 * w, minD)
    * step(0.76, vnoise(pe.xy * 1.6 + eLook.x * 9.0)) * 0.3 * (1.0 - CEL);
  float edge = max(max(contour, inner) * press, again);
  vec4 glowEdge = vec4(0.0);
  float halo = 0.0;
#ifdef ENT_EDGE_GLOW
  if (!hit) { glowEdge = entEdgeGlow(matEdge); halo = glowEdge.a * pow(smoothstep(w * 3.6, w * 0.15, minD), 1.6); }
#endif
  if (!hit && edge < 0.02 && halo < 0.02) discard;

  float flags = eLook.w;
  bool hover = mod(flags, 4.0) >= 2.0;
  vec3 ink = hover ? P_VERMILION * 0.85 : INK_DARK;
  vec3 col = ink;
  float alpha = edge, tOut = tEdge, lineOut = edge;
  if (!hit && glowEdge.a > 0.0) { col = glowEdge.rgb; alpha = halo; lineOut = 0.0; edge = 0.0; }
  if (hit) {
    vec3 p = lo + ld * t;
    vec3 n = entNormal(p);
    Surf s = newSurf();
    gPen = max(pix * t * 1.5 * uPencil.w, 0.006);
    gNormal = n; gRay = ld;
    entSurf(p, mat, s);
    mat2 back = transpose(R);
    vec3 N = vec3(back * n.xz, n.y).xzy;
    vec3 wp = uCamPos + rdW * (t * scale);

    float shade = celShade(max(smoothstep(0.2, -0.45, N.y) * 0.85, (1.0 - eLook.z) * 0.75)) * s.occ;
    float pool = lightPool(wp, N);
    float lift = max(s.glow, eLook.y);
    vec3 pig = mix(s.albedo, nightPencil(s.albedo), uNight * (1.0 - max(pool, s.glow)) * 0.8);
    float cover = s.cover * (1.0 - 0.9 * lift);
    shade *= (1.0 - lift) * (1.0 - 0.5 * pool);

    float sheet = max(dot(vPosScale.xyz - uCamPos, uCamFwd), 0.5);
    vec3 rel = uCamPos + rdW * (sheet / dot(rdW, uCamFwd)) - vPosScale.xyz;
    vec2 boil = (hash22(vec2(uPencil.z, eLook.x * 91.0)) - 0.5) * 0.01 * (1.0 - CEL);
    vec2 uv = vec2(dot(rel, uCamRight), dot(rel, uCamUp)) + vec2(eLook.x * 7.3, eLook.x * 3.1) + boil;
    vec2 lod = pencilLod(sheet);
    vec3 page = paperSheet(gl_FragCoord.xy);
    float m1 = mix(pencilLay(uv, lod, cover, s.soft, SLANT, eLook.x), step(0.02, cover), s.solid);
    col = layOn(page, pig, m1);
    float m2 = mix(pencilLay(uv, lod, shade * 0.8, 0.0, SLANT - 0.105, eLook.x + 5.0), pencilLay(uv, lod, shade * 0.8, 1.0, SLANT - 0.105, eLook.x + 5.0), 0.5) * (1.0 - s.solid);
    col = shadeOn(col, shadowPencil(pig), m2);
    float marks = max(inner * press, smoothstep(0.25, 0.5, s.ink) * 0.85);
    col = inkOn(col, ink, marks);
    alpha = 1.0; tOut = t; lineOut = marks;
  }
  float tw = tOut * scale;
  oColor = vec4(col * alpha, alpha);
  oAux = vec4(tw, mod(flags, 2.0), hit ? lineOut * 0.5 : edge, 1.0);
  gl_FragDepth = clamp(tw / uFar, 0.0, 0.9999);
}
`,zl=`layout(location = 0) in vec4 iPosScale;
layout(location = 1) in vec4 iPose;
layout(location = 2) in vec4 iLook;
layout(location = 3) in vec4 iColA;
layout(location = 4) in vec4 iColB;
layout(location = 5) in vec4 iColC;
uniform mat4 uViewProj;
uniform vec3 uCamRight, uCamUp;
uniform vec2 uBound;
out vec3 vWorld;
flat out vec4 vPosScale, vPose, vLook, vColA, vColB, vColC;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  float s = iPosScale.w;
  vec3 c = iPosScale.xyz + vec3(0.0, uBound.x * s, 0.0);
  vec3 wp = c + (uCamRight * corner.x + uCamUp * corner.y) * (uBound.y * s * 1.22 + 0.12);
  vWorld = wp;
  vPosScale = iPosScale; vPose = iPose; vLook = iLook; vColA = iColA; vColB = iColB; vColC = iColC;
  gl_Position = uViewProj * vec4(wp, 1.0);
}
`,cn=24;class Ml{gl;programs=new Map;vao;vbo;capacity=0;constructor(e){this.gl=e;const t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw new Error("Unable to create entity vertex buffers.");this.vao=t,this.vbo=n,e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n);for(let o=0;o<6;o++)e.enableVertexAttribArray(o),e.vertexAttribPointer(o,4,e.FLOAT,!1,cn*4,o*16),e.vertexAttribDivisor(o,1);e.bindVertexArray(null)}program(e){let t=this.programs.get(e);if(!t){const n=Ai.get(e);if(!n)throw new Error(`Unknown archetype "${e}"`);t={program:new Mn(this.gl,`entity:${e}`,zl,kl,{OUTLINE_PX:"1.6",ENT_STEPS:n.steps},{archetype:n.glsl}),def:n},this.programs.set(e,t)}return t}render(e,t,n,o){const a=this.gl;e.bind(),a.clearColor(0,0,0,0),a.clearDepth(1),a.depthMask(!0),a.clear(a.COLOR_BUFFER_BIT|a.DEPTH_BUFFER_BIT),a.enable(a.DEPTH_TEST),a.depthFunc(a.LESS),a.enable(a.BLEND),a.blendFunc(a.ONE,a.ONE_MINUS_SRC_ALPHA),a.bindVertexArray(this.vao),a.bindBuffer(a.ARRAY_BUFFER,this.vbo);const i=jn(t.camera);for(const[r,c]of n){if(!c.count)continue;const{program:d,def:h}=this.program(r);d.use(),o(d),d.set("uTime",t.timeTwos),d.set("uViewProj",t.camera.viewProj).set("uBound",[h.boundY,h.boundR]),d.set("uFar",t.far).set("uPixel",2*i[1]/e.height);const u=c.count*cn*4;u>this.capacity&&(this.capacity=u*2,a.bufferData(a.ARRAY_BUFFER,this.capacity,a.DYNAMIC_DRAW)),a.bufferSubData(a.ARRAY_BUFFER,0,c.data,0,c.count*cn),a.drawArraysInstanced(a.TRIANGLE_STRIP,0,4,c.count)}a.bindVertexArray(null),a.disable(a.DEPTH_TEST),a.disable(a.BLEND)}}const _l=`in vec2 vUv;
out vec4 oColor;
uniform sampler2D uEnt;
#include <common>
#include <frame>
#include <pencil>
void main() {
  vec4 e = texture(uEnt, vec2(vUv.x, 1.0 - vUv.y));
  vec3 col = e.a > 0.002 ? e.rgb / e.a : vec3(0.0);
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.0 + 0.26 * CEL);
  oColor = vec4(saturate(col), saturate(e.a));
}
`,Ds=`out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;class Tl{gl;layer;fbo=null;tex=null;width=0;height=0;program=null;bytes=new Uint8Array(0);constructor(e){this.gl=e,this.layer=new Ls(e,[{},{filter:"nearest"}],!0)}size(e,t){const n=this.gl;if(this.layer.resize(e,t),e===this.width&&t===this.height)return;this.tex&&n.deleteTexture(this.tex),this.fbo&&n.deleteFramebuffer(this.fbo),this.width=e,this.height=t,this.tex=Io(n,{width:e,height:t,internal:n.RGBA8,format:n.RGBA,type:n.UNSIGNED_BYTE});const o=n.createFramebuffer();if(!o)throw new Error("Unable to create figure framebuffer.");this.fbo=o,n.bindFramebuffer(n.FRAMEBUFFER,o),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,this.tex,0),n.bindFramebuffer(n.FRAMEBUFFER,null),this.bytes=new Uint8Array(e*t*4)}render(e,t,n,o,a){const i=this.gl;return e.render(this.layer,t,n,o),this.program||(this.program=new Mn(i,"figure",Ds,_l)),i.bindFramebuffer(i.FRAMEBUFFER,this.fbo),i.viewport(0,0,this.width,this.height),i.drawBuffers([i.COLOR_ATTACHMENT0]),i.bindVertexArray(a),this.program.use().tex("uEnt",this.layer.textures[0]),Hs(i),i.readPixels(0,0,this.width,this.height,i.RGBA,i.UNSIGNED_BYTE,this.bytes),i.bindFramebuffer(i.FRAMEBUFFER,null),this.bytes}}const Sl=`vec4 fx_mote(vec2 uv, float life, float seed, vec4 col) {
  float show = step(0.08, life) * step(life, 0.92);
  return mark(col.rgb, body(length(uv) - 0.55) * show * min(col.a, 1.0) * 0.85);
}

vec4 fx_leaf(vec2 uv, float life, float seed, vec4 col) {
  float flip = cos(life * 22.0 + seed * 40.0);
  vec2 q = vec2(uv.x, uv.y / max(abs(flip), 0.25));
  float d = length(q * vec2(1.0, 1.9)) - 0.8;
  float show = step(0.05, life) * step(life, 0.95) * col.a;
  return over(mark(FX_INK, pen(d) * 0.7 * show), mark(mix(FX_PAPER, col.rgb, 0.85), body(d) * show));
}

vec4 fx_spark(vec2 uv, float life, float seed, vec4 col) {
  vec2 a = abs(uv) / mix(1.0, 0.35, life);
  float d = min(a.x * 4.5 + a.y, a.y * 4.5 + a.x) - 0.95;
  return over(mark(FX_INK, pen(d) * 0.9), mark(mix(FX_PAPER, col.rgb, 0.55 * hatch(uv, seed)), body(d)));
}

vec4 fx_burst(vec2 uv, float life, float seed, vec4 col) {
  float r = length(uv), ang = atan(uv.y, uv.x);
  float front = mix(0.4, 0.95, sqrt(life));
  float spike = abs(fract(ang * 1.4324 + seed) - 0.5) * 2.0;
  float d = r - front * mix(0.5, 1.0, spike);
  float rays = step(0.86, fract(ang * 2.2282 + seed * 3.0)) * step(front * 0.95, r) * step(r, front * 1.25 + 0.05);
  float show = step(life, 0.8);
  vec4 star = over(mark(FX_INK, pen(d)), mark(mix(FX_PAPER, col.rgb, 0.5 * hatch(uv, seed)), body(d)));
  return over(mark(FX_INK, rays * 0.9), star) * show;
}

vec4 fx_slash(vec2 uv, float life, float seed, vec4 col) {
  float r = length(uv), ang = atan(uv.x, uv.y);
  float head = mix(1.9, -1.5, smoothstep(0.0, 0.55, life));
  float along = ang - head;
  float sweep = step(0.0, along) * step(along, 1.9);
  float taper = saturate(1.0 - along / 1.9);
  float outer = r - 0.97, inner = (0.97 - 0.3 * taper) - r;
  float d = max(outer, inner);
  float show = step(life, 0.72) * sweep;
  float lines = (pen(r - 0.8) + pen(r - 0.66)) * step(1.0, along) * step(along, 2.6) * step(life, 0.6) * 0.7;
  vec4 blade = over(mark(FX_INK, pen(d) * show), mark(mix(FX_PAPER, col.rgb, 0.35 * hatch(uv, seed)), body(d) * show));
  return over(blade, mark(FX_INK, lines));
}

vec4 fx_ring(vec2 uv, float life, float seed, vec4 col) {
  float front = mix(0.25, 0.92, 1.0 - (1.0 - life) * (1.0 - life));
  float a = pen(wobbly(uv, seed) - front) + pen(wobbly(uv, seed + 0.37) - front * 0.94) * 0.6;
  return mark(col.rgb * 0.82, saturate(a) * step(life, 0.9) * min(col.a, 1.0));
}

vec4 fx_halo(vec2 uv, float life, float seed, vec4 col) {
  float r = wobbly(uv, seed);
  float ang = atan(uv.y, uv.x) + floor(uTime * 6.0) * (seed > 0.5 ? 0.21 : -0.21);
  float arc = step(0.2, abs(fract(ang / 6.2832 * 6.0 + seed) - 0.5) * 2.0);
  float show = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.6, life) * min(col.a, 1.0);
  float band = body(abs(r - 0.86) - 0.05) * arc;
  float lines = max(pen(r - 0.91), pen(r - 0.81)) * arc;
  return over(mark(col.rgb * 0.8, lines * show), mark(mix(FX_PAPER, col.rgb, 0.45), band * show * 0.9));
}

vec4 fx_orb(vec2 uv, float life, float seed, vec4 col) {
  float r = length(uv), ang = atan(uv.y, uv.x);
  float turn = floor(uTime * 12.0) * 0.7;
  float d = wobbly(uv, seed + turn * 0.1) - 0.55;
  float swirl = smoothstep(0.25, 0.1, abs(fract(r * 2.6 - ang / 6.2832 + turn * 0.3) - 0.5));
  float rays = step(0.8, fract(ang * 1.2732 + turn * 0.21)) * step(0.68, r) * step(r, 0.95);
  vec4 ball = over(mark(FX_INK, pen(d)), mark(mix(FX_PAPER, col.rgb, swirl * 0.9), body(d)));
  return over(ball, mark(col.rgb * 0.8, rays * 0.9));
}

vec4 fx_puff(vec2 uv, float life, float seed, vec4 col) {
  float d = length(uv - vec2(0.0, 0.05)) - 0.5;
  d = min(d, length(uv - vec2(0.38, -0.1)) - 0.36);
  d = min(d, length(uv - vec2(-0.4, -0.08)) - 0.38);
  d += 0.5 * smoothstep(0.3, 1.0, life);
  float show = step(life, 0.9) * min(col.a * 1.6, 1.0);
  return over(mark(FX_INK, pen(d) * 0.8 * show), mark(mix(FX_PAPER, col.rgb, 0.3), body(d) * show));
}

vec4 fx_heal(vec2 uv, float life, float seed, vec4 col) {
  vec2 a = abs(uv);
  float d = min(max(a.x - 0.22, a.y - 0.75), max(a.y - 0.22, a.x - 0.75));
  float show = step(0.08, life) * step(life, 0.85);
  return over(mark(FX_INK, pen(d) * show), mark(mix(FX_PAPER, col.rgb, 0.4 + 0.6 * hatch(uv, seed)), body(d) * show));
}

vec4 fx_mark(vec2 uv, float life, float seed, vec4 col) {
  float ang = atan(uv.y, uv.x) + floor(uTime * 6.0) * 0.26;
  float dash = step(0.3, abs(fract(ang / 6.2832 * 5.0) - 0.5) * 2.0);
  float a = pen(wobbly(uv, seed) - 0.84) * dash + pen(wobbly(uv, seed + 0.5) - 0.7) * 0.35;
  return mark(col.rgb * 0.85, saturate(a) * min(col.a, 1.0));
}

vec4 fx_click(vec2 uv, float life, float seed, vec4 col) {
  float front = mix(0.9, 0.3, life);
  vec2 a = abs(uv);
  float m = pen(wobbly(uv, seed) - front) + pen(min(a.x, a.y)) * step(max(a.x, a.y), 0.16);
  return mark(FX_INK, saturate(m) * step(life, 0.85));
}

vec4 fx_beam(vec2 uv, float life, float seed, vec4 col) {
  float wide = 0.42 * sin(saturate(life) * 3.1416);
  float d = abs(uv.x + 0.03 * sin(uv.y * 5.0 + seed * 9.0)) - wide;
  float within = step(-0.95, uv.y) * step(uv.y, 0.98);
  float rise = floor(uTime * 12.0) / 12.0;
  vec2 tk = vec2(uv.x * 3.0, uv.y * 2.2 - rise * 3.0);
  vec2 tc = floor(tk);
  float tick = step(0.6, hash12(tc + seed)) * pen((fract(tk.x) - 0.5) / 3.0) * step(abs(fract(tk.y) - 0.5), 0.3) * body(d);
  vec4 shaft = over(mark(FX_INK, pen(d) * 0.8 * within), mark(FX_PAPER, body(d) * within * 0.92));
  return over(mark(col.rgb * 0.85, tick * within), shaft);
}

vec4 fx_zone(vec2 uv, float life, float seed, vec4 col) {
  float r = wobbly(uv, seed);
  float rim = pen(r - 0.93) + pen(wobbly(uv, seed + 0.37) - 0.88) * 0.5;
  float fill = body(r - 0.9 * mix(0.12, 1.0, life)) * hatch(uv, seed) * 0.5;
  return mark(col.rgb * 0.82, saturate(max(rim, fill)) * min(col.a, 1.0));
}

vec4 fx_lane(vec2 uv, float life, float seed, vec4 col) {
  vec2 a = abs(uv);
  float sides = (1.0 - smoothstep(1.1 * gPx2.x, 2.1 * gPx2.x, abs(a.x - 0.9))) * step(a.y, 0.98)
              + (1.0 - smoothstep(1.1 * gPx2.y, 2.1 * gPx2.y, abs(a.y - 0.98))) * step(a.x, 0.9) * 0.6;
  float along = uv.y * 4.0 - 0.5;
  float v = fract(along) - 0.5;
  float arrows = pen(abs(uv.x) * 0.55 + v * 0.5 - 0.1) * step(a.x, 0.62) * 0.7;
  float fill = step(uv.y, mix(-1.0, 1.0, life)) * step(a.x, 0.9) * hatch(uv * vec2(1.0, 4.0), seed) * 0.42;
  return mark(col.rgb * 0.82, saturate(max(max(sides, arrows), fill)) * min(col.a, 1.0));
}

vec4 fx_cloud(vec2 uv, float life, float seed, vec4 col) {
  float ang = atan(uv.y, uv.x), r = length(uv);
  float turn = floor(uTime * 6.0) * 0.21;
  float edge = 0.86 + 0.07 * abs(sin(ang * 5.5 + seed * 9.0 + turn));
  float fade = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.82, 1.0, life));
  float rim = pen(r - edge);
  float fill = body(r - edge) * hatch(uv, seed + turn) * 0.34;
  vec2 g = uv * 5.0 + vec2(turn, -turn * 0.7);
  float specks = body(length(fract(g) - 0.5 - (hash22(floor(g) + seed) - 0.5) * 0.5) - 0.11) * body(r - edge) * step(0.55, hash12(floor(g) + seed * 3.0));
  return mark(col.rgb * 0.8, saturate(max(max(rim * 0.8, fill), specks * 0.8)) * fade * min(col.a, 1.0));
}

vec4 fx_ripple(vec2 uv, float life, float seed, vec4 col) {
  float front = mix(0.2, 0.9, life);
  return mark(vec3(0.227, 0.502, 0.659), pen(wobbly(uv, seed) - front) * step(life, 0.85) * min(col.a, 1.0));
}
`,Pl=`in vec2 vUv;
in float vT;
in vec3 vWorld;
flat in vec4 vParams, vColor, vMore, vPosSize;
layout(location = 0) out vec4 oColor;
uniform sampler2D uGbuf;
uniform vec2 uInvRes;
uniform vec3 uCamPos;
uniform float uTime, uDpr;
#include <common>
const vec3 FX_PAPER = vec3(0.910, 0.886, 0.831);
const vec3 FX_INK = vec3(0.384, 0.235, 0.118);
float gPx = 0.01;
vec2 gPx2 = vec2(0.01);
float pen(float d) { return 1.0 - smoothstep(1.1 * gPx, 2.1 * gPx, abs(d)); }
float body(float d) { return 1.0 - smoothstep(-gPx, gPx, d); }
vec4 mark(vec3 c, float a) { return vec4(c * a, a); }
vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }
float hatch(vec2 uv, float seed) {
  float s = dot(uv, vec2(-0.883, 0.469)) / (4.2 * gPx);
  return smoothstep(0.3, 0.5, 0.5 + 0.5 * sin(s * 6.2832)) * (0.75 + 0.25 * hash12(floor(uv / (2.0 * gPx)) + seed));
}
float wobbly(vec2 uv, float seed) {
  float a = atan(uv.y, uv.x);
  return length(uv) * (1.0 - 0.035 * sin(a * 3.0 + seed * 20.0) - 0.02 * sin(a * 7.0 + seed * 9.0));
}
#include <fx-effects>
void main() {
  float sceneT = texture(uGbuf, gl_FragCoord.xy * uInvRes).z;
  float soft = saturate((sceneT - vT) * 1.6 + 0.7);
  vec2 uv = vUv;
  if (vMore.x > 0.5 && vMore.x < 1.5) {
    vec3 at = uCamPos + normalize(vWorld - uCamPos) * sceneT;
    vec2 d = at.xz - vPosSize.xz;
    if (abs(at.y - vPosSize.y) > 0.9 + 0.6 * length(d)) discard;
    float c = cos(vParams.w), s = sin(vParams.w);
    uv = vec2(c * d.x - s * d.y, s * d.x + c * d.y) / (vPosSize.w * vec2(1.0, vMore.y));
    if (max(abs(uv.x), abs(uv.y)) > 1.0) discard;
    soft = 1.0;
  }
  if (soft <= 0.0) discard;
  gPx2 = min(fwidth(uv) * uDpr, vec2(0.12));
  gPx = min(length(gPx2) * 0.7, 0.09);
  float steps = max(vMore.z * 12.0, 2.0);
  float life = floor(vParams.y * steps) / steps;
  vec4 c = vec4(0.0);
  switch (int(vParams.x + 0.5)) {
    case 0: c = fx_mote(uv, life, vParams.z, vColor); break;
    case 1: c = fx_leaf(uv, life, vParams.z, vColor); break;
    case 2: c = fx_spark(uv, life, vParams.z, vColor); break;
    case 3: c = fx_burst(uv, life, vParams.z, vColor); break;
    case 4: c = fx_slash(uv, life, vParams.z, vColor); break;
    case 5: c = fx_ring(uv, life, vParams.z, vColor); break;
    case 6: c = fx_halo(uv, life, vParams.z, vColor); break;
    case 7: c = fx_orb(uv, life, vParams.z, vColor); break;
    case 8: c = fx_puff(uv, life, vParams.z, vColor); break;
    case 9: c = fx_heal(uv, life, vParams.z, vColor); break;
    case 10: c = fx_mark(uv, life, vParams.z, vColor); break;
    case 11: c = fx_click(uv, life, vParams.z, vColor); break;
    case 12: c = fx_beam(uv, life, vParams.z, vColor); break;
    case 13: c = fx_zone(uv, life, vParams.z, vColor); break;
    case 14: c = fx_lane(uv, life, vParams.z, vColor); break;
    case 15: c = fx_cloud(uv, life, vParams.z, vColor); break;
    case 16: c = fx_ripple(uv, life, vParams.z, vColor); break;
  }
  c *= step(0.5, soft);
  if (c.a < 0.01) discard;
  oColor = c;
}
`,ql=`layout(location = 0) in vec4 iPosSize;
layout(location = 1) in vec4 iParams;
layout(location = 2) in vec4 iColor;
layout(location = 3) in vec4 iMore;
uniform mat4 uViewProj;
uniform vec3 uCamPos, uCamRight, uCamUp;
uniform float uFar;
out vec2 vUv;
out float vT;
out vec3 vWorld;
flat out vec4 vParams, vColor, vMore, vPosSize;
#include <common>
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  vec2 c = rot2(iParams.w) * (corner * (iMore.x > 0.5 && iMore.x < 1.5 ? vec2(1.35, 1.35 * iMore.y) : vec2(1.0)));
  vec3 wp = iMore.x > 0.5
    ? iPosSize.xyz + vec3(c.x, 0.0, c.y) * iPosSize.w
    : iPosSize.xyz + (uCamRight * c.x + uCamUp * c.y * iMore.y) * iPosSize.w;
  vUv = corner; vParams = iParams; vColor = iColor; vMore = iMore; vPosSize = iPosSize; vWorld = wp;
  gl_Position = uViewProj * vec4(wp, 1.0);
  vT = length(wp - uCamPos);
  gl_Position.z = (clamp(vT / uFar, 0.0, 0.999) * 2.0 - 1.0) * gl_Position.w;
}
`,Zn=16,Ll=["mote","leaf","spark","burst","slash","ring","halo","orb","puff","heal","mark","click","beam","zone","lane","cloud","ripple"],Cl=new Map(Ll.map((s,e)=>[s,e]));function El(s){const e=Cl.get(s);if(e===void 0)throw new Error(`Unknown fx type "${s}"`);return e}class Al{gl;compiled=null;vao;vbo;capacity=0;constructor(e){this.gl=e;const t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw new Error("Unable to create fx vertex buffers.");this.vao=t,this.vbo=n,e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n);for(let o=0;o<4;o++)e.enableVertexAttribArray(o),e.vertexAttribPointer(o,4,e.FLOAT,!1,Zn*4,o*16),e.vertexAttribDivisor(o,1);e.bindVertexArray(null)}program(){return this.compiled||(this.compiled=new Mn(this.gl,"fx",ql,Pl,void 0,{"fx-effects":Sl})),this.compiled}render(e,t,n,o,a){if(!o)return;const i=this.gl,r=this.program().use();e.bind(1),i.enable(i.DEPTH_TEST),i.depthFunc(i.LEQUAL),i.depthMask(!1),i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA);const c=t.camera;r.set("uViewProj",c.viewProj).set("uCamPos",c.pos).set("uCamRight",c.right).set("uCamUp",c.up),r.set("uFar",t.far).set("uTime",t.time).set("uInvRes",[1/e.width,1/e.height]).set("uDpr",t.dpr),r.tex("uGbuf",a),i.bindVertexArray(this.vao),i.bindBuffer(i.ARRAY_BUFFER,this.vbo);const d=o*Zn*4;d>this.capacity&&(this.capacity=d*2,i.bufferData(i.ARRAY_BUFFER,this.capacity,i.DYNAMIC_DRAW)),i.bufferSubData(i.ARRAY_BUFFER,0,n,0,o*Zn),i.drawArraysInstanced(i.TRIANGLE_STRIP,0,4,o),i.bindVertexArray(null),i.depthMask(!0),i.disable(i.DEPTH_TEST),i.disable(i.BLEND)}}class Rl{worldTex;blips=new Float32Array(_e.MAX_BLIPS*4);scaled=new Float32Array(_e.MAX_BLIPS*4);count=0;rect=[0,0,0,.6];player=[0,0,0];constructor(e){this.worldTex=e}clear(){this.count=0}add(e,t,n,o=2.4){this.count>=_e.MAX_BLIPS||this.blips.set([e,t,n,o],this.count++*4)}bind(e,t,n,o){const a=t.dpr,[i,r,c,d]=this.rect;e.tex("uHeightTex",this.worldTex.height).tex("uColorTex",this.worldTex.color).tex("uPropTexA",this.worldTex.propsA),e.set("uMapRect",[i*a,o-r*a,c*a,d/a]).set("uMapPlayer",this.player);const h=this.scaled;h.set(this.blips);for(let u=0;u<this.count;u++)h[u*4+3]*=a;e.set("uBlips",h).set("uBlipCount",this.count)}}const Il=`in vec2 vUv;
out vec4 oColor;
uniform sampler2D uLay, uGbuf, uMark, uSheet, uEdge, uEnt, uEntAux;
uniform vec2 uRes;
uniform vec2 uInner;
uniform float uHurt, uFade;
#include <common>
#include <frame>
#include <pencil>
#include <minimap>

vec2 sheetAt(vec2 uv) {
  vec2 st = uv * uInner - 0.5;
  ivec2 i = ivec2(floor(st)), hi = ivec2(uInner) - 1;
  vec2 f = fract(st);
  vec2 a = texelFetch(uSheet, clamp(i, ivec2(0), hi), 0).rg, b = texelFetch(uSheet, clamp(i + ivec2(1, 0), ivec2(0), hi), 0).rg;
  vec2 c = texelFetch(uSheet, clamp(i + ivec2(0, 1), ivec2(0), hi), 0).rg, d = texelFetch(uSheet, clamp(i + ivec2(1, 1), ivec2(0), hi), 0).rg;
  vec2 near = f.x < 0.5 ? (f.y < 0.5 ? a : c) : (f.y < 0.5 ? b : d);
  float tol = near.x * 0.04;
  a = abs(a.x - near.x) > tol ? near : a; b = abs(b.x - near.x) > tol ? near : b;
  c = abs(c.x - near.x) > tol ? near : c; d = abs(d.x - near.x) > tol ? near : d;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float grassTufts(vec2 uv, float amount, float pen) {
  if (amount < 0.05) return 0.0;
  vec2 g = uv / 0.85;
  vec2 cell = floor(g);
  vec2 r = hash22(cell);
  if (r.x > amount * 0.24) return 0.0;
  vec2 q = (g - cell - vec2(0.2 + 0.6 * r.y, 0.12 + 0.3 * fract(r.x * 7.7))) * 0.85;
  float m = 0.0;
  for (int k = -1; k <= 1; k++) {
    float lean = float(k) * 0.55 + (r.y - 0.5) * 0.5;
    float h = 0.15 + 0.13 * fract(r.x * 13.0 + float(k) * 0.37);
    vec2 b = vec2(lean * h, h);
    float tt = clamp(dot(q, b) / dot(b, b), 0.0, 1.0);
    m = max(m, (1.0 - smoothstep(pen * 0.5, pen, length(q - b * tt))) * mix(1.0, 0.5, tt));
  }
  return m;
}

float waveLines(vec2 uv, float amount, float pen) {
  if (amount < 0.05) return 0.0;
  vec2 g = vec2((uv.x + uTime * 0.12) / 1.7, uv.y / 0.55);
  vec2 cell = floor(g);
  vec2 r = hash22(cell);
  if (r.x > 0.34 * amount) return 0.0;
  vec2 q = (g - cell - 0.5) * vec2(1.7, 0.55);
  float y = 0.03 * sin(q.x * 13.0 + r.y * 6.0);
  return (1.0 - smoothstep(pen * 0.5, pen, abs(q.y - y))) * step(abs(q.x), 0.28 + 0.3 * r.y);
}

vec3 drawLays(vec3 page, vec3 rd, float sheet, vec3 right, vec3 up, vec3 fwd, bool sky, float dpr) {
  vec2 uv;
  if (sky) {
    uv = vec2(atan(rd.x, rd.z), asin(clamp(rd.y, -1.0, 1.0))) * 8.0;
    sheet = 8.0;
  } else {
    uv = paperCoords(uCamPos + rd * (sheet / max(dot(rd, fwd), 0.2)), right, up);
  }
  vec2 lod = pencilLod(sheet);
  float pen = uPencil.x * sheet * 1.5 * dpr;

  float kind0 = texture(uMark, vUv).a;
  float row = floor((dot(uv, vec2(-sin(SLANT), cos(SLANT)))) / (PITCH0 * exp2(lod.x)) + 0.5);
  float ends = (hash11(row * exp2(lod.x) * 0.913 + 4.2) - 0.42) * mix(2.6, 6.5, saturate(kind0)) * dpr * (1.0 - 0.8 * CEL);
  vec2 at = vUv + vec2(cos(SLANT), sin(SLANT)) * ends / uRes;
  vec4 lay = texture(uLay, at);
  vec4 mark = texture(uMark, at);
  float soft = step(0.5, mark.a);

  vec3 col = page;
  float base = pencilLay(uv, lod, lay.a * uFade, soft, SLANT, 0.0);
  col = layOn(col, lay.rgb, base);
  float chroma = max(lay.r, max(lay.g, lay.b)) - min(lay.r, min(lay.g, lay.b));
  float shadeCover = celShade(mark.r) * mix(0.56, 0.82, smoothstep(0.12, 0.4, chroma)) * uFade;
  float shade = mix(pencilLay(uv, lod, shadeCover, 0.0, SLANT - 0.105, 5.0), pencilLay(uv, lod, shadeCover, 1.0, SLANT - 0.105, 5.0), 0.5);
  col = shadeOn(col, shadowPencil(lay.rgb), shade);

  vec3 inkLeaf = mix(INK_LEAF, INK_DARK, uNight * 0.6);
  col = inkOn(col, inkLeaf, grassTufts(uv, mark.b, pen) * 0.66 * uFade);
  col = inkOn(col, mix(INK_WET, INK_DARK, uNight * 0.5), waveLines(uv, saturate(mark.a - 1.0), pen) * 0.7 * uFade);
  return col;
}

void main() {
  vec2 px = vUv * uRes;
  float dpr = uPencil.w;
  vec3 page = paperSheet(px);

  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 rd = normalize(uCamFwd + uCamRight * (ndc.x * uTanFov.x) + uCamUp * (ndc.y * uTanFov.y));
  vec2 sheet = sheetAt(vUv);
  bool sky = texture(uGbuf, vUv).z > 5000.0;
  vec3 col = drawLays(page, rd, sheet.x, uPaperRight, uPaperUp, uPaperFwd, sky, dpr);
  if (uPaperMix > 0.004) col = mix(col, drawLays(page, rd, sheet.y, uPaperRightB, uPaperUpB, uPaperFwdB, sky, dpr), uPaperMix);

  vec2 wob = (vec2(vnoise(px * 0.045 / dpr), vnoise(px * 0.045 / dpr + 9.0)) - 0.5) * mix(2.4, 0.5, CEL) * dpr / uRes;
  vec2 h = 0.5 / uInner;
  vec4 ed = 0.25 * (texture(uEdge, vUv + wob + vec2(h.x, h.y)) + texture(uEdge, vUv + wob + vec2(-h.x, h.y)) +
                    texture(uEdge, vUv + wob + vec2(h.x, -h.y)) + texture(uEdge, vUv + wob + vec2(-h.x, -h.y)));
  float line = smoothstep(0.3, 0.5, ed.r);
  vec2 off = vec2(1.9, -1.4) * dpr / uRes;
  float again = smoothstep(0.3, 0.5, texture(uEdge, vUv + wob * 1.7 + off).r) * step(0.74, vnoise(px * 0.011 / dpr + 3.0)) * 0.4 * (1.0 - CEL);
  float pressure = mix(mix(0.55, 0.95, vnoise(px * 0.028 / dpr + ed.g * 40.0)), 0.96, CEL);
  float marks = smoothstep(0.28, 0.5, texture(uMark, vUv + wob).g);
  vec3 ink = mix(INK_SEPIA, INK_DARK, uNight * 0.7);
  col = inkOn(col, ink, marks * 0.6 * pressure * uFade);
  col = inkOn(col, ink, max(line, again) * pressure * ed.b * uFade);

  vec4 e = texture(uEnt, vUv);
  if (e.a > 0.003) {
    vec4 aux = texture(uEntAux, vUv);
    vec2 gt = 1.0 / uInner;
    float sd = texture(uGbuf, vUv).z;
    sd = max(sd, max(texture(uGbuf, vUv + vec2(gt.x, 0.0)).z, texture(uGbuf, vUv - vec2(gt.x, 0.0)).z));
    sd = max(sd, max(texture(uGbuf, vUv + vec2(0.0, gt.y)).z, texture(uGbuf, vUv - vec2(0.0, gt.y)).z));
    float hidden = step(sd + 0.05 + 0.006 * sd, aux.r);
    vec3 shown = mix(col * (1.0 - e.a) + e.rgb, mix(col, page, e.a), 1.0 - uFade);
    vec3 ghost = inkOn(col, INK_SOFT, aux.b * aux.g * 0.8);
    col = mix(shown, ghost, hidden);
  }

  vec2 q = vUv - 0.5;
  float hurt = uHurt * smoothstep(0.56, 0.86, length(q));
  if (hurt > 0.01) col = layOn(col, P_VERMILION, pencilLay(px / uRes.y * 6.0, vec2(1.0, 0.3), hurt * 0.4, 0.0, SLANT, 9.0));

  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.0 + 0.26 * CEL);

  col = drawMinimap(col, px, page);
  oColor = vec4(col, 1.0);
}
`,Fl=`in vec2 vUv;
out vec4 oEdge;
uniform sampler2D uGbuf;
uniform vec2 uTexel;
#include <common>
#include <frame>

float family(float id) { return id < 0.08 ? step(0.0, id) * 0.02 : id; }

void main() {
  vec4 gc = texture(uGbuf, vUv);
  vec4 n[4];
  n[0] = texture(uGbuf, vUv - vec2(uTexel.x, 0.0)); n[1] = texture(uGbuf, vUv + vec2(uTexel.x, 0.0));
  n[2] = texture(uGbuf, vUv - vec2(0.0, uTexel.y)); n[3] = texture(uGbuf, vUv + vec2(0.0, uTexel.y));
  float fc = family(gc.w);
  vec3 n0 = octDecode(gc.xy);
  float mean = 0.0, sil = 0.0, fold = 0.0, far = 0.0;
  for (int i = 0; i < 4; i++) {
    mean += n[i].z * 0.25;
    far = max(far, n[i].z);
    float fn = family(n[i].w);
    bool differ = abs(fn - fc) > 0.004;
    bool behind = n[i].z < gc.z * 0.985;
    bool level = abs(n[i].z - gc.z) <= gc.z * 0.015;
    if (differ && (behind || (level && fn > fc))) sil = 1.0;
    fold = max(fold, 1.0 - dot(n0, octDecode(n[i].xy)));
  }
  float crease = smoothstep(0.02, 0.06, abs(mean - gc.z) * 4.0 / max(gc.z, 1.0)) * step(mean, gc.z);
  fold = smoothstep(0.35, 0.8, fold) * step(0.08, gc.w);
  float line = max(max(crease, sil), fold * 0.85);
  if (gc.z > 5000.0 && far > 5000.0) line = 0.0;

  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 rd = normalize(uCamFwd + uCamRight * (ndc.x * uTanFov.x) + uCamUp * (ndc.y * uTanFov.y));
  float t = min(gc.z, far);
  vec3 p = uCamPos + rd * t;
  float fade = (1.0 - 0.55 * smoothstep(30.0, 100.0, t)) * (1.0 - smoothstep(VIEW_DIST * 0.7, VIEW_DIST * 0.95, length(p.xz - uFocus.xz)));
  oEdge = vec4(line, fract(gc.w * 37.0), fade, 1.0);
}
`;class Nl{gl;ink;final;constructor(e){this.gl=e,this.ink=new Mn(e,"ink",Ds,Fl),this.final=new Mn(e,"final",Ds,Il)}runInk(e,t){const n=this.gl,o=this.ink.use();e.edge.bind(),t(o),o.tex("uGbuf",e.scene.textures[1]),o.set("uTexel",[1/e.scene.width,1/e.scene.height]),Hs(n)}runFinal(e,t,n,o,a,i){const r=this.gl,c=this.final.use();wl(r,n,o),i(c),c.tex("uLay",e.scene.textures[0]).tex("uGbuf",e.scene.textures[1]).tex("uMark",e.scene.textures[2]).tex("uSheet",e.scene.textures[3]).tex("uEdge",e.edge.textures[0]).tex("uEnt",e.ent.textures[0]).tex("uEntAux",e.ent.textures[1]),c.set("uRes",[n,o]).set("uInner",[e.scene.width,e.scene.height]).set("uHurt",t.look.hurt).set("uFade",t.look.fade*(1-(t.look.veil||0))),a.bind(c,t,n,o),Hs(r)}}const Cs=[{id:"tree",type:1,seeThrough:!0,reach:1.5,height:4.5,collide:.34,scale:[.82,1.2]},{id:"pine",type:2,seeThrough:!0,reach:1.42,height:5.7,collide:.3,scale:[.8,1.25]},{id:"bush",type:3,seeThrough:!0,reach:1,height:1.1,collide:0,scale:[.7,1.25]},{id:"mushroom",type:4,reach:.75,height:1.3,collide:.2,scale:[.7,1.5]},{id:"rock",type:5,reach:1.25,height:1.5,collide:.8,scale:[.5,1.35]},{id:"crystal",type:6,reach:.9,height:2,collide:.55,scale:[.8,1.5],light:{color:[.35,.75,1],radius:5,y:1,always:!0}},{id:"stone",type:7,reach:.6,height:2.6,collide:.5,scale:[.9,1.2]},{id:"lamp",type:8,reach:.35,height:3,collide:.15,light:{color:[.6,.9,1],radius:9,y:2.4}},{id:"willow",type:9,seeThrough:!0,reach:1.72,height:3.9,collide:.3,scale:[.85,1.08]},{id:"deadtree",type:10,reach:1.12,height:3.5,collide:.22,scale:[.8,1.25]},{id:"reeds",type:11,reach:.62,height:1.75,collide:0,scale:[.8,1.3]},{id:"bigcap",type:12,seeThrough:!0,reach:1.66,height:3.8,collide:.36,scale:[.75,1.2]},{id:"stump",type:13,reach:.68,height:.5,collide:.4,scale:[.8,1.3]},{id:"cairn",type:14,reach:.72,height:1.45,collide:.6,scale:[.8,1.4]},{id:"pad",type:15,reach:2.6,height:.6,collide:0,light:{color:[.6,.9,1],radius:7,y:.8,always:!0}},{id:"gate",type:16,reach:2.75,height:2.9,collide:0},{id:"pod",type:17,reach:.8,height:1.3,collide:.55},{id:"console",type:18,reach:1.05,height:2.3,collide:.75,light:{color:[.6,.9,1],radius:5.5,y:1.7,always:!0}},{id:"crate",type:19,reach:.72,height:1.45,collide:.62},{id:"shuttle",type:20,reach:3.4,height:2.7,collide:2.3},{id:"hall",type:21,reach:4,height:5.4,collide:3.5,light:{color:[.6,.9,1],radius:9,y:4.6,always:!0}},{id:"hab",type:22,reach:2.25,height:2.7,collide:1.95},{id:"kiosk",type:23,reach:1.85,height:2.8,collide:1.35},{id:"spire",type:24,reach:1.45,height:9.1,collide:1.25,light:{color:[.6,.9,1],radius:14,y:8.2,always:!0}},{id:"bench",type:25,reach:.95,height:.6,collide:.55},{id:"planter",type:26,reach:.85,height:1.5,collide:.62},{id:"banner",type:27,reach:.75,height:3.4,collide:.12},{id:"column",type:28,reach:.62,height:3.6,collide:.45,scale:[.95,1.15]},{id:"brazier",type:29,reach:.6,height:2,collide:.42,light:{color:[1,.75,.4],radius:10.5,y:1.5,always:!0}},{id:"urn",type:30,reach:.55,height:1.2,collide:.36,scale:[.8,1.3]},{id:"shard",type:31,reach:1.5,height:5.4,collide:.6,scale:[.75,1.15]},{id:"floater",type:32,reach:1.1,height:3.9,collide:0,scale:[.7,1.3]},{id:"wreck",type:33,reach:1.8,height:1.9,collide:1,scale:[.9,1.2]},{id:"dish",type:34,reach:1.15,height:3.3,collide:.4,light:{color:[.6,.9,1],radius:5,y:2.7,always:!0}},{id:"flowers",type:35,seeThrough:!0,reach:1.15,height:.9,collide:0,scale:[.8,1.15]},{id:"fern",type:36,seeThrough:!0,reach:.75,height:1,collide:0,scale:[.85,1.3]},{id:"tallgrass",type:37,seeThrough:!0,reach:.6,height:1.1,collide:0,scale:[.85,1.4]},{id:"pebbles",type:38,reach:.7,height:.3,collide:0,scale:[.8,1.5]},{id:"ruin",type:39,reach:2,height:2.8,collide:.5,scale:[.9,1.15]}],Bl=new Map(Cs.map(s=>[s.id,s])),Fo=s=>Bl.get(s),Hl=`// Small things that fill an island between the trees: flower clumps, ferns, tall grass, pebbles, and ruins.
// Each starts with a cheap bound, since the ground is full of them.

// the blossom colors of a clump, by scheme (the prop's palette slot) and flower
vec3 bloomColor(float scheme, float k) {
  int sc = int(scheme + 0.5);
  if (sc == 1) return k < 0.4 ? vec3(0.66, 0.6, 0.9) : k < 0.75 ? P_SKY : P_CREAM;
  if (sc == 2) return k < 0.5 ? P_CREAM : P_BUTTER;
  if (sc == 3) return k < 0.4 ? P_APRICOT : k < 0.75 ? P_POPPY : P_HONEY;
  if (sc == 4) return k < 0.5 ? P_ROSE : k < 0.8 ? P_PEACH : P_CREAM;
  if (sc == 5) return k < 0.5 ? vec3(0.55, 0.85, 0.85) : vec3(0.8, 0.95, 1.0);
  return k < 0.3 ? P_POPPY : k < 0.55 ? P_BUTTER : k < 0.8 ? P_ROSE : P_CREAM;
}

float sdf_flowers(vec3 q, Prop pr, out float mat) {
  q.xz += 0.05 * sin(uTime * 1.7 + pr.seed * 30.0) * q.y;
  float bound = max(length(q.xz) - 1.15, abs(q.y - 0.4) - 0.45);
  mat = 0.0;
  if (bound > 0.2) return bound;
  float stem = 1e3, head = 1e3, which = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float a = fi * 2.399 + pr.seed * 6.0;
    float r = 0.08 + 0.78 * sqrt(fract(fi * 0.618 + pr.seed));
    float h = 0.3 + 0.32 * fract(fi * 0.37 + pr.seed * 3.0);
    vec3 b = vec3(cos(a) * r, 0.0, sin(a) * r);
    vec3 t = b * 1.12 + vec3(0.0, h, 0.0);
    stem = min(stem, sdCapsule(q, b, t, 0.016));
    // a tulip-like cup, open at the top
    vec3 hq = q - t - vec3(0.0, 0.06, 0.0);
    float hd = max(sdEllipsoid(hq, vec3(0.075, 0.1, 0.075)), -(length(hq - vec3(0.0, 0.11, 0.0)) - 0.055));
    if (hd < head) { head = hd; which = fi; }
  }
  mat = head < stem ? 1.0 + 0.05 * which : 0.0;
  return min(stem, head) * 0.9;
}
void mat_flowers(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = mix(INK_LEAF, P_LEAF, 0.5); s.cover = 0.7; s.soft = 1.0; s.wrap = 0.5; return; }
  float fi = floor((mat - 1.0) * 20.0 + 0.5);
  float k = fract(fi * 0.618 + pr.seed * 3.7);
  vec3 c = bloomColor(pr.pal, k);
  // petals round a darker heart, found from the flower's own middle
  float a = fi * 2.399 + pr.seed * 6.0;
  float r = 0.08 + 0.78 * sqrt(fract(fi * 0.618 + pr.seed));
  float h = 0.3 + 0.32 * fract(fi * 0.37 + pr.seed * 3.0);
  vec2 mid = vec2(cos(a), sin(a)) * r * 1.12;
  vec2 lp = q.xz - mid;
  float petal = abs(fract(atan(lp.y, lp.x) / TAU * 3.0 + k) - 0.5);
  float up = smoothstep(h, h + 0.15, q.y);
  s.albedo = mix(c, mix(c, PAPER, 0.35), up);
  s.cover = dot(c, vec3(0.33)) > 0.85 ? 0.14 : mix(0.86, 0.6, up);
  s.soft = 1.0; s.wrap = 0.6;
  s.ink = max(penLine(petal * 0.08) * 0.45 * up, 0.1);
  s.glow = uNight * 0.25 * step(4.5, pr.pal);
}

float sdf_fern(vec3 q, Prop pr, out float mat) {
  mat = 1.0;
  q.xz += 0.03 * sin(uTime * 1.3 + pr.seed * 30.0) * q.y;
  float bound = max(length(q.xz) - 0.8, abs(q.y - 0.45) - 0.55);
  if (bound > 0.2) return bound;
  float d = 1e3;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float a = fi * 0.7854 + pr.seed * 6.0;
    vec2 dir = vec2(cos(a), sin(a));
    float L = 0.5 + 0.16 * fract(fi * 0.7 + pr.seed * 5.0);
    // the frond's own frame: along it, across it, and up from its arch
    float lx = dot(q.xz, dir);
    float lz = dot(q.xz, vec2(-dir.y, dir.x));
    float k = clamp(lx / L, 0.0, 1.0);
    // fronds rise steeply from the middle and droop at the tips, a vase rather than a star
    float arch = 0.95 * sin(k * 1.85) * (1.0 - 0.15 * k);
    float wide = 0.13 * sin(k * 3.1) * (0.72 + 0.28 * abs(sin(lx * 38.0)));
    float f = sdEllipsoid(vec3(lx - L * 0.5, q.y - arch, lz * 0.13 / max(wide, 0.02)), vec3(L * 0.5, 0.025, 0.13));
    d = min(d, f);
  }
  return d * 0.6;
}
void mat_fern(vec3 q, float mat, Prop pr, inout Surf s) {
  vec3 leaf = mix(mix(P_LEAF, P_SAGE, 0.3), uLeafPal[int(pr.pal + 0.5)], 0.15);
  float r = length(q.xz);
  float comb = abs(fract(r * 19.0) - 0.5);
  s.albedo = mix(mix(leaf, INK_LEAF, 0.35), mix(leaf, P_BUTTER, 0.25), smoothstep(0.1, 0.45, q.y));
  s.cover = 0.78;
  s.soft = 1.0; s.wrap = 0.55; s.leafy = 1.0;
  s.ink = penLine(comb / 19.0) * 0.28;
  s.occ = mix(0.6, 1.0, smoothstep(0.0, 0.35, q.y));
}

float sdf_tallgrass(vec3 q, Prop pr, out float mat) {
  mat = 1.0;
  float bound = max(length(q.xz) - 0.85, abs(q.y - 0.5) - 0.55);
  if (bound > 0.2) return bound;
  float sway = sin(uTime * 1.9 + pr.seed * 30.0);
  float d = 1e3;
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    float a = fi * 2.399 + pr.seed * 6.0;
    float r = 0.03 + 0.14 * fract(fi * 0.618 + pr.seed);
    vec2 dir = vec2(cos(a), sin(a));
    float h = 0.55 + 0.45 * fract(fi * 0.41 + pr.seed * 2.0);
    // each blade bows outward and with the wind, more toward its tip
    float k = clamp(q.y / h, 0.0, 1.0);
    vec2 c = dir * (r + 0.55 * k * k) + vec2(0.07, 0.035) * sway * k * k;
    float bl = length(q.xz - c) - mix(0.04, 0.002, k);
    d = min(d, max(bl, max(-q.y, q.y - h * (1.0 - 0.25 * k * k))));
  }
  return d * 0.6;
}
void mat_tallgrass(vec3 q, float mat, Prop pr, inout Surf s) {
  // its own colors: green with a gold tip; slot 6 is dry and golden, slot 11 frosted
  int sc = int(pr.pal + 0.5);
  vec3 lo = mix(P_LEAF, INK_LEAF, 0.3), hi = mix(P_SAGE, P_BUTTER, 0.4);
  if (sc == 6) { lo = mix(P_SAGE, P_HONEY, 0.55); hi = mix(P_BUTTER, P_CREAM, 0.55); }
  if (sc == 11) { lo = mix(P_PINE, P_SLATE, 0.3); hi = mix(P_SKY, PAPER, 0.5); }
  s.albedo = mix(lo, hi, smoothstep(0.1, 0.85, q.y));
  s.cover = 0.72;
  s.soft = 1.0; s.wrap = 0.6; s.leafy = 1.0;
  s.ink = 0.15 * smoothstep(0.3, 0.9, q.y);
}

float sdf_pebbles(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float bound = max(length(q.xz) - 0.7, q.y - 0.35);
  if (bound > 0.2) return bound;
  float d = sdEllipsoid(q - vec3(0.0, 0.06, 0.0), vec3(0.26, 0.13, 0.2));
  d = min(d, sdEllipsoid(q - vec3(0.36, 0.04, 0.18), vec3(0.15, 0.08, 0.12)));
  d = min(d, sdEllipsoid(q - vec3(-0.28, 0.03, 0.3), vec3(0.11, 0.06, 0.13)));
  d = min(d, sdEllipsoid(q - vec3(-0.1, 0.03, -0.38), vec3(0.17, 0.07, 0.13)));
  return d;
}
void mat_pebbles(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mix(uRockCol, P_STONE, 0.4 + 0.3 * vnoise(q.xz * 6.0 + pr.seed * 9.0));
  s.cover = 0.55;
  s.ink = 0.15;
  s.moss = 0.5;
}

// a fallen ruin: a broken column still standing, its top lying beside it, and a block from the capital
float sdf_ruin(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float bound = max(length(q.xz) - 2.0, q.y - 3.0);
  if (bound > 0.4) return bound;
  float h = 1.8 + 0.8 * pr.seed;
  float shaft = sdCylinder(q, 0.34 + 0.02 * cos(atan(q.z, q.x) * 12.0), h);
  shaft = max(shaft, dot(q - vec3(0.0, h - 0.15, 0.0), normalize(vec3(0.45, 0.85, 0.3))));
  float base = sdBox(q - vec3(0.0, 0.16, 0.0), vec3(0.52, 0.16, 0.52));
  vec3 f = q - vec3(1.15, 0.3, 0.55);
  f.xz = rot2(0.6) * f.xz;
  float fallen = sdCylinder(f.yxz + vec3(0.0, 0.85, 0.0), 0.3, 1.7) ;
  vec3 c = q - vec3(-0.95, 0.22, 0.75);
  c.xz = rot2(0.4) * c.xz; c.xy = rot2(0.18) * c.xy;
  float cap = sdBox(c, vec3(0.5, 0.2, 0.5));
  return min(min(shaft, base), min(fallen, cap)) * 0.9;
}
void mat_ruin(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mix(P_STONE, P_CREAM, 0.3 + 0.3 * vnoise(q.xy * 3.0 + pr.seed * 9.0));
  s.cover = 0.52;
  s.moss = 0.8;
  s.ink = penLine((abs(fract(atan(q.z, q.x) * 1.9) - 0.5)) / 1.9 * 0.3) * 0.4 * step(0.35, q.y) * step(length(q.xz), 0.4);
}
`,Dl=`void leafSurf(vec3 q, Prop pr, inout Surf s, float lo, float hi) {
  vec3 leaf = uLeafPal[int(pr.pal + 0.5)];
  float clump = vnoise3(q * 2.3 + pr.seed * 10.0);
  float lift = smoothstep(lo, hi, q.y);
  s.albedo = mix(leaf, mix(leaf, P_BUTTER, 0.45), smoothstep(0.56, 0.66, clump) * mix(0.35, 0.9, lift));
  s.cover = mix(0.62, 0.9, clump);
  s.soft = 1.0;
  s.ink = penLine((clump - 0.44) / 1.9) * 0.42;
  s.wrap = 0.5; s.leafy = 1.0;
  s.occ = mix(0.55, 1.0, lift) * mix(0.72, 1.0, smoothstep(0.22, 0.42, clump));
}
void barkSurf(vec3 q, Prop pr, inout Surf s) {
  float a = atan(q.z, q.x);
  float streak = vnoise(vec2(a * 3.0, q.y * 1.6 + pr.seed * 10.0));
  s.albedo = mix(P_BARK, P_UMBER, streak * 0.55);
  s.cover = 0.78;
  s.ink = penLine((abs(fract(a * 1.3 + vnoise(vec2(q.y * 2.0, pr.seed * 7.0)) * 0.8) - 0.5)) / 1.3 * 0.18) * step(0.55, streak) * 0.5;
}
const vec3 ROCK_N[5] = vec3[5](vec3(0.83, 0.52, 0.21), vec3(-0.61, 0.61, 0.51), vec3(0.1, 0.7, -0.71),
                              vec3(-0.5, 0.31, -0.81), vec3(0.3, 0.9, 0.31));
float rockBody(vec3 c, float r, float seed) {
  float d = length(c * vec3(1.0, 1.2, 1.0)) - r;
  for (int i = 0; i < 5; i++) d = max(d, dot(c, ROCK_N[i]) - r * (0.62 + 0.25 * fract(seed * (7.0 + float(i) * 3.3))));
  return d - 0.04;
}
float crystalShard(vec3 q, float r, float h) {
  float hx = max(abs(q.x) * 0.866 + abs(q.z) * 0.5, abs(q.z));
  float d = max(hx - r, -q.y);
  return max(d, (q.y - h) * 0.55 + hx * 0.85) * 0.8;
}
float urnOne(vec3 q, float sc) {
  q /= sc;
  float body = sdEllipsoid(q - vec3(0.0, 0.42, 0.0), vec3(0.3, 0.42, 0.3));
  float neck = sdCylinder(q - vec3(0.0, 0.74, 0.0), 0.13, 0.2);
  float lip = sdTorusY(q - vec3(0.0, 0.95, 0.0), 0.14, 0.035);
  return min(smin(body, neck, 0.08), lip) * sc;
}
`,Ol=`float sdf_rock(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = rockBody(q - vec3(0.0, 0.3, 0.0), 0.95, pr.seed);
  vec3 c2 = q - vec3(0.75, 0.1, 0.35);
  c2.xz = c2.zx;
  return min(d, rockBody(c2, 0.45, pr.seed + 0.37)) * 0.9;
}
void mat_rock(vec3 q, float mat, Prop pr, inout Surf s) {
  float strata = vnoise(vec2(q.y * 6.0 + vnoise(q.xz * 2.0) * 2.0, pr.seed * 9.0));
  s.albedo = uRockCol;
  s.cover = mix(0.5, 0.8, strata);
  s.ink = smoothstep(0.04, 0.0, abs(fract(strata * 2.0 + 0.25) - 0.5)) * 0.65;
  s.moss = 1.0;
}

float sdf_crystal(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = crystalShard(q, 0.26, 1.9);
  vec3 a = q; a.xy = rot2(0.5) * a.xy;
  d = min(d, crystalShard(a - vec3(0.12, 0.0, 0.1), 0.18, 1.3));
  vec3 b = q; b.zy = rot2(-0.6) * b.zy; b.xy = rot2(-0.35) * b.xy;
  d = min(d, crystalShard(b - vec3(-0.1, 0.0, -0.05), 0.16, 1.15));
  return d;
}
void mat_crystal(vec3 q, float mat, Prop pr, inout Surf s) {
  float band = 0.5 + 0.5 * sin(q.y * 5.0 + q.x * 3.0 + uTime * 1.5);
  s.albedo = mix(P_TEAL, P_SKY, band);
  s.cover = mix(0.75, 0.1, smoothstep(0.55, 0.9, band));
  s.glow = 0.25 + 0.3 * band;
}

float sdf_stone(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  q.xy = rot2(0.06 * (pr.seed - 0.5) * 4.0) * q.xy;
  float w = 0.42 - 0.06 * q.y;
  return sdRoundBox(q - vec3(0.0, 1.2, 0.0), vec3(w, 1.25, 0.22), 0.1) * 0.9;
}
void mat_stone(vec3 q, float mat, Prop pr, inout Surf s) {
  float n = vnoise(q.xy * 5.0 + pr.seed * 9.0);
  s.albedo = uRockCol;
  s.cover = mix(0.5, 0.75, n);
  vec2 r = vec2(q.x, q.y - 1.5);
  float sp = abs(fract(length(r) * 3.2 - atan(r.y, r.x) / TAU) - 0.5);
  float rune = smoothstep(0.1, 0.03, sp) * step(length(r), 0.3) * step(0.15, abs(q.z));
  s.albedo = mix(s.albedo, P_TEAL, rune);
  s.cover = mix(s.cover, 0.9, rune);
  s.glow = rune * uNight * 0.7;
  s.ink = smoothstep(0.03, 0.0, abs(fract(n * 2.0) - 0.5)) * 0.4;
  s.moss = 0.6;
}

float sdf_cairn(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = rockBody(q - vec3(0.0, 0.28, 0.0), 0.55, pr.seed);
  vec3 b = q - vec3(0.05, 0.75, 0.0);
  b.xz = b.zx;
  d = min(d, rockBody(b, 0.38, pr.seed + 0.3));
  d = min(d, rockBody(q - vec3(-0.03, 1.12, 0.04), 0.24, pr.seed + 0.6));
  return d * 0.9;
}
void mat_cairn(vec3 q, float mat, Prop pr, inout Surf s) { mat_rock(q, mat, pr, s); s.moss = 0.4; }

float sdf_shard(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  vec3 a = q; a.xy = rot2(0.16 + 0.2 * (pr.seed - 0.5)) * a.xy;
  float d = crystalShard(a, 0.42, 3.4 + 1.6 * pr.seed);
  vec3 b = q - vec3(0.5, 0.0, 0.2); b.zy = rot2(-0.45) * b.zy; b.xy = rot2(-0.3) * b.xy;
  return min(d, crystalShard(b, 0.26, 1.7));
}
void mat_shard(vec3 q, float mat, Prop pr, inout Surf s) {
  float face = vnoise(vec2(atan(q.x, q.z) * 2.0, q.y * 0.7 + pr.seed * 9.0));
  s.albedo = uRockCol; s.cover = mix(0.28, 0.74, step(0.5, face));
  s.ink = penLine((fract(q.y * 0.45 + 0.3 * vnoise(q.xz * 2.0)) - 0.5) / 0.45) * 0.35;
  float seam = abs(q.x + 0.1 * sin(q.y * 3.0) - 0.05) - 0.035;
  if (seam < 0.0 && q.z > 0.0) { s.albedo = mix(P_TEAL, P_SKY, 0.5); s.cover = 0.3; s.glow = 0.5; s.ink = 0.0; }
}

float sdf_floater(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float bob = 0.18 * sin(uTime * 0.7 + pr.seed * 20.0);
  vec3 c = q - vec3(0.0, 2.0 + 0.7 * pr.seed + bob, 0.0);
  c.xz = rot2(uTime * 0.25 + pr.seed * 6.0) * c.xz;
  float d = length(c * vec3(1.0, 1.25, 0.9)) - 0.62;
  d = max(d, dot(c, vec3(0.6, 0.7, 0.38)) - 0.4);
  d = max(d, dot(c, vec3(-0.7, 0.3, -0.64)) - 0.42);
  d = max(d, dot(c, vec3(0.1, -0.9, 0.42)) - 0.38);
  vec3 p1 = q - vec3(0.75, 1.3 + 0.5 * pr.seed - bob * 0.6, 0.3), p2 = q - vec3(-0.6, 3.0 + bob * 0.8, -0.45);
  return min(d, min(length(p1) - 0.2, length(p2) - 0.15)) * 0.8;
}
void mat_floater(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = uRockCol; s.cover = mix(0.3, 0.7, step(0.5, vnoise(q.xy * 2.3 + pr.seed * 9.0)));
  s.ink = step(0.8, vnoise(q.xz * 7.0 + q.y * 3.0)) * 0.35;
}
`,$l=`float sdf_pad(vec3 q, Prop pr, out float mat) {
  float dais = min(sdCylinder(q, 2.45, 0.14), sdCylinder(q - vec3(0.0, 0.1, 0.0), 1.95, 0.1));
  vec3 e = q; float a = atan(e.x, e.z), k = TAU / 3.0;
  a = mod(a + k * 0.5, k) - k * 0.5;
  e.xz = length(q.xz) * vec2(sin(a), cos(a));
  float post = min(sdTaper(e, vec3(0.0, 0.0, 2.2), vec3(0.0, 0.5, 2.2), 0.17, 0.11), sdSphere(e - vec3(0.0, 0.62, 2.2), 0.12));
  mat = post < dais ? (e.y > 0.5 ? 2.0 : 1.0) : 0.0;
  return min(dais, post);
}
void mat_pad(vec3 q, float mat, Prop pr, inout Surf s) {
  vec3 lightCol = pr.pal > 0.5 ? P_APRICOT : P_SKY;
  if (mat > 1.5) { s.albedo = lightCol; s.cover = 0.35; s.glow = 1.0; return; }
  if (mat > 0.5) { s.albedo = P_SLATE; s.cover = 0.7; return; }
  float r = length(q.xz);
  s.albedo = mix(P_STONE, P_CREAM, 0.55); s.cover = 0.34; s.soft = 1.0;
  s.ink = max(penLine(r - 1.95), max(penLine(r - 1.3), penLine(r - 0.55))) * 0.8;
  float lit = smoothstep(0.12, 0.06, abs(r - 1.62)) + smoothstep(0.1, 0.05, abs(r - 0.92));
  float turn = step(0.5, fract(atan(q.x, q.z) / TAU * 12.0 + uTime * 0.12));
  s.albedo = mix(s.albedo, lightCol, saturate(lit));
  s.cover = mix(s.cover, 0.75 * mix(0.55, 1.0, turn), saturate(lit));
}

float sdf_gate(vec3 q, Prop pr, out float mat) {
  vec3 e = vec3(abs(q.x) - 2.42, q.y, q.z);
  float post = min(sdTaper(e, vec3(0.0), vec3(0.0, 2.3, 0.0), 0.22, 0.15), sdRoundBox(e - vec3(0.0, 2.45, 0.0), vec3(0.22, 0.16, 0.22), 0.05));
  float foot = sdRoundBox(e - vec3(0.0, 0.12, 0.0), vec3(0.3, 0.12, 0.3), 0.04);
  float lamp = sdSphere(e - vec3(0.0, 2.72, 0.0), 0.13);
  float d = min(min(post, foot), lamp);
  mat = lamp < min(post, foot) ? 2.0 : 0.0;
  if (pr.pal < 0.5) {
    float field = sdBox(q - vec3(0.0, 1.22, 0.0), vec3(2.25, 1.05, 0.03));
    if (field < d) { d = field; mat = 1.0; }
  }
  return d;
}
void mat_gate(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) { s.albedo = pr.pal < 0.5 ? P_VERMILION : P_LEAF; s.cover = 0.75; s.glow = 0.4; return; }
  if (mat > 0.5) {
    vec2 g = vec2(q.x + q.y, q.x - q.y) * 2.2 + vec2(uTime * 0.5, -uTime * 0.5);
    float lat = max(penLine((fract(g.x) - 0.5) * 0.45), penLine((fract(g.y) - 0.5) * 0.45));
    s.albedo = P_SKY; s.cover = 0.3 + 0.25 * lat; s.soft = 1.0; s.ink = lat * 0.55;
    return;
  }
  s.albedo = mix(P_STONE, P_CREAM, 0.5); s.cover = 0.5;
  s.ink = max(penLine(q.y - 0.55), penLine(q.y - 2.0)) * 0.7;
  if (q.y > 0.7 && q.y < 1.85 && abs(abs(q.x) - 2.42) < 0.07) { s.albedo = P_SLATE; s.cover = 0.75; }
}

float sdf_pod(vec3 q, Prop pr, out float mat) {
  vec3 e = q; float a = atan(e.x, e.z), k = TAU / 3.0;
  a = mod(a + k * 0.5, k) - k * 0.5;
  e.xz = length(q.xz) * vec2(sin(a), cos(a));
  float feet = sdTaper(e, vec3(0.0, 0.0, 0.52), vec3(0.0, 0.34, 0.3), 0.07, 0.06);
  float low = max(sdEllipsoid(q - vec3(0.0, 0.66, 0.0), vec3(0.46, 0.5, 0.46)), q.y - 0.72);
  vec3 c = q - vec3(0.0, 0.72, 0.0);
  if (pr.pal > 0.5) { c -= vec3(0.34, 0.22, 0.0); c.xy = rot2(-0.75) * c.xy; }
  float cap = max(sdEllipsoid(c - vec3(0.0, -0.06, 0.0), vec3(0.46, 0.5, 0.46)), -c.y);
  float band = sdCylinder(q - vec3(0.0, 0.6, 0.0), 0.485, 0.1);
  float hollow = pr.pal > 0.5 ? sdCylinder(q - vec3(0.0, 0.5, 0.0), 0.36, 0.3) : 1e3;
  low = max(low, -hollow);
  float d = min(min(feet, low), min(cap, band));
  mat = d == band ? 2.0 : (d == cap ? 1.0 : (d == feet ? 3.0 : 0.0));
  return d * 0.9;
}
void mat_pod(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 2.5) { s.albedo = P_SLATE; s.cover = 0.75; return; }
  if (mat > 1.5) { s.albedo = pr.pal > 0.5 ? P_STONE : P_APRICOT; s.cover = pr.pal > 0.5 ? 0.4 : 0.85; s.ink = penLine(fract(atan(q.x, q.z) / TAU * 8.0) - 0.5) * 0.5; return; }
  s.albedo = mix(P_CREAM, P_STONE, 0.25 + 0.2 * mat); s.cover = 0.4; s.soft = 1.0;
  if (pr.pal > 0.5 && mat < 0.5 && q.y > 0.6 && length(q.xz) < 0.38) { s.albedo = P_CHARCOAL; s.cover = 0.85; }
  s.ink = penLine(abs(q.x) - 0.2) * 0.35 * step(0.8, q.y) * (1.0 - step(0.5, pr.pal));
}

float sdf_console(vec3 q, Prop pr, out float mat) {
  float desk = sdRoundBox(q - vec3(0.0, 0.42, 0.0), vec3(0.62, 0.42, 0.32), 0.05);
  vec3 k = q - vec3(0.0, 0.9, 0.08); k.yz = rot2(0.5) * k.yz;
  float keys = sdRoundBox(k, vec3(0.56, 0.035, 0.24), 0.02);
  vec3 sc = q - vec3(0.0, 1.62, -0.12); sc.yz = rot2(-0.16) * sc.yz;
  float sheet = sdBox(sc, vec3(0.98, 0.56, 0.02));
  float arms = min(sdCapsule(vec3(abs(q.x), q.yz), vec3(0.9, 0.86, -0.2), vec3(0.98, 1.1, -0.14), 0.035), 1e3);
  float d = min(min(desk, keys), min(sheet, arms));
  mat = d == sheet ? 2.0 : (d == keys ? 1.0 : 0.0);
  return d;
}
void mat_console(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) {
    vec3 sc = q - vec3(0.0, 1.62, -0.12);
    float rows = penLine((fract(sc.y * 5.5 + uTime * 0.04) - 0.5) * 0.18) * step(sc.x, 0.15) * step(-0.85, sc.x) * step(0.3, fract(sc.x * 2.3 + floor(sc.y * 5.5) * 0.37));
    float chart = penLine(max(abs(sc.x - 0.55) - 0.3, abs(sc.y) - 0.36));
    s.albedo = P_SKY; s.cover = 0.22 + 0.5 * max(rows, chart); s.soft = 1.0; s.glow = 0.55; s.ink = max(rows, chart) * 0.35;
    return;
  }
  if (mat > 0.5) { s.albedo = P_SLATE; s.cover = 0.8; s.ink = penLine((fract(q.x * 7.0) - 0.5) * 0.14) * 0.5; return; }
  s.albedo = mix(P_STONE, P_CREAM, 0.55); s.cover = 0.38; s.soft = 1.0;
  s.ink = max(penLine(q.y - 0.7), penLine(abs(q.x) - 0.42)) * 0.7;
  if (q.y > 0.2 && q.y < 0.32) { s.albedo = P_VERMILION; s.cover = 0.8; }
}

float sdf_crate(vec3 q, Prop pr, out float mat) {
  float a = sdRoundBox(q - vec3(0.0, 0.42, 0.0), vec3(0.5, 0.42, 0.5), 0.04);
  vec3 t = q - vec3(0.08, 1.1, -0.06); t.xz = rot2(0.5) * t.xz;
  float b = pr.seed > 0.45 ? sdRoundBox(t, vec3(0.33, 0.26, 0.33), 0.03) : 1e3;
  mat = b < a ? 1.0 : 0.0;
  return min(a, b);
}
void mat_crate(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mat > 0.5 ? P_APRICOT : mix(P_STONE, P_CREAM, 0.45); s.cover = mat > 0.5 ? 0.6 : 0.4; s.soft = 1.0;
  float e = mat > 0.5 ? 0.0 : max(penLine(max(abs(q.x), abs(q.z)) - 0.4), penLine(abs(q.y - 0.42) - 0.3));
  s.ink = max(e * 0.6, penLine(abs(q.x) - 0.12) * 0.5 * (1.0 - mat));
  if (mat < 0.5 && abs(q.x) < 0.12) { s.albedo = P_SLATE; s.cover = 0.7; }
}

float sdf_brazier(vec3 q, Prop pr, out float mat) {
  vec3 e = q; float a = atan(e.x, e.z), k = TAU / 3.0;
  a = mod(a + k * 0.5, k) - k * 0.5;
  e.xz = length(q.xz) * vec2(sin(a), cos(a));
  float legs = sdCapsule(e, vec3(0.0, 0.0, 0.42), vec3(0.0, 1.0, 0.16), 0.035);
  float bowl = max(sdEllipsoid(q - vec3(0.0, 1.18, 0.0), vec3(0.44, 0.27, 0.44)), q.y - 1.22);
  bowl = max(bowl, -(length(q - vec3(0.0, 1.3, 0.0)) - 0.36));
  float tk = floor(uTime * 12.0);
  float fl = 0.62 + 0.14 * sin(tk * 2.1 + pr.seed * 9.0);
  vec3 f = q - vec3(0.035 * sin(tk * 1.7 + pr.seed * 5.0), 1.16, 0.0);
  float flame = sdEllipsoid(f - vec3(0.0, fl * 0.5, 0.0), vec3(0.21, fl * 0.55, 0.21));
  mat = 0.0;
  float d = min(legs, bowl);
  if (flame < d) { d = flame; mat = 1.0; }
  return d * 0.85;
}
void mat_brazier(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_CHARCOAL; s.cover = 0.86; s.ink = penLine(q.y - 1.2) * 0.6; return; }
  float rim = smoothstep(0.04, 0.17, length(q.xz));
  s.albedo = mix(P_SUN, P_POPPY, smoothstep(1.3, 1.8, q.y));
  s.cover = mix(0.06, 0.85, rim);
  s.glow = 0.3 + 0.6 * (1.0 - rim);
  s.soft = 1.0;
}

float sdf_urn(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = urnOne(q, 1.0);
  if (pr.seed > 0.45) d = min(d, urnOne(q - vec3(0.36, 0.0, 0.16), 0.62));
  return d * 0.9;
}
void mat_urn(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = pr.seed < 0.5 ? P_CLAY : mix(P_TAN, P_PEACH, 0.5); s.cover = 0.62;
  float band = abs(q.y - 0.62) - 0.035;
  if (band < 0.0 && length(q.xz) < 0.34) { s.albedo = P_TEAL; s.cover = 0.85; }
  s.ink = penLine(band) * 0.7;
}

float sdf_wreck(vec3 q, Prop pr, out float mat) {
  vec3 a = q - vec3(0.0, 0.0, -0.5), b = q - vec3(0.0, 0.0, 0.6);
  float rib = max(abs(length(a.xy - vec2(0.0, 0.2)) - 1.5) - 0.07, abs(a.z) - 0.07);
  rib = min(rib, max(abs(length(b.xy - vec2(0.15, 0.1)) - 1.25) - 0.07, abs(b.z) - 0.07));
  rib = max(rib, -q.y);
  vec3 c = q - vec3(-0.5, 0.75, 0.05); c.xy = rot2(0.5) * c.xy;
  float skin = sdBox(c, vec3(0.03, 0.7, 0.55)) - 0.02;
  mat = skin < rib ? 1.0 : 0.0;
  return min(rib, skin) * 0.85;
}
void mat_wreck(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_SLATE; s.cover = 0.72; s.ink = step(0.75, fract(atan(q.y, q.x) * 5.0)) * 0.3; return; }
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (abs(q.y - 1.05) < 0.07) { s.albedo = P_VERMILION; s.cover = 0.8; }
  s.ink = max(penLine(q.y - 0.55) * 0.6, smoothstep(0.045, 0.025, length(vec2(fract(q.z * 4.0) - 0.5, (q.y - 0.4) * 4.0))) * 0.6);
}

float sdf_dish(vec3 q, Prop pr, out float mat) {
  float mast = min(sdTaper(q, vec3(0.0), vec3(0.0, 1.9, 0.0), 0.1, 0.06), sdCylinder(q, 0.3, 0.1));
  vec3 c = q - vec3(0.0, 2.1, 0.0); c.zy = rot2(-0.75) * c.zy;
  float bowl = max(abs(length(c - vec3(0.0, 0.9, 0.0)) - 1.1) - 0.03, c.y - 0.35);
  float arm = sdCapsule(c, vec3(0.0, -0.18, 0.0), vec3(0.0, 0.75, 0.0), 0.025);
  float feed = length(c - vec3(0.0, 0.8, 0.0)) - 0.09;
  float d = min(min(mast, bowl), arm);
  mat = 0.0;
  if (feed < d) { d = feed; mat = 1.0; }
  return d * 0.85;
}
void mat_dish(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_SKY; s.cover = 0.1; s.glow = 0.8; return; }
  s.albedo = mix(P_STONE, P_CREAM, 0.6); s.cover = 0.3; s.soft = 1.0;
  s.ink = penLine(q.y - 0.45) * 0.6;
  if (q.y > 0.55 && q.y < 0.72 && length(q.xz) < 0.2) { s.albedo = P_VERMILION; s.cover = 0.8; }
}
`,Ul=`#include <shuttle>

float sdf_lamp(vec3 q, Prop pr, out float mat) {
  float post = min(sdTaper(q, vec3(0.0), vec3(0.0, 2.5, 0.0), 0.1, 0.05), sdCylinder(q, 0.2, 0.1));
  float cap = sdRoundBox(q - vec3(0.0, 2.72, 0.0), vec3(0.19, 0.04, 0.19), 0.03);
  float ring = sdTorusY(q - vec3(0.0, 2.4, 0.0), 0.15, 0.055);
  float mast = min(post, cap);
  mat = ring < mast ? 1.0 : 0.0;
  return min(mast, ring);
}
void mat_lamp(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) {
    s.albedo = mix(P_STONE, P_CREAM, 0.55); s.cover = 0.36; s.soft = 1.0;
    s.ink = max(penLine(q.y - 0.45), penLine(q.y - 1.9)) * 0.7;
    if (q.y > 0.55 && q.y < 0.75) { s.albedo = P_VERMILION; s.cover = 0.8; }
    return;
  }
  s.albedo = P_SKY;
  s.cover = mix(0.6, 0.0, uNight);
  s.glow = max(uNight, 0.3);
}

float sdf_shuttle(vec3 q, Prop pr, out float mat) { return shuttleMap(q - vec3(0.0, 1.05, 0.0), 0.0, mat); }
void mat_shuttle(vec3 q, float mat, Prop pr, inout Surf s) { shuttleSurf(q - vec3(0.0, 1.05, 0.0), mat, 0.0, P_VERMILION, s); }

float sdf_hall(vec3 q, Prop pr, out float mat) {
  float drum = sdCylinder(q, 3.3, 2.6);
  float dome = max(sdEllipsoid(q - vec3(0.0, 2.55, 0.0), vec3(3.45, 1.7, 3.45)), 2.5 - q.y);
  float lantern = min(sdCylinder(q - vec3(0.0, 4.05, 0.0), 0.55, 0.5), sdSphere(q - vec3(0.0, 4.85, 0.0), 0.33));
  float porch = sdRoundBox(q - vec3(0.0, 1.2, 3.25), vec3(1.25, 1.2, 0.55), 0.08);
  float foot = sdCylinder(q, 3.75, 0.16);
  float d = min(min(drum, dome), min(lantern, min(porch, foot)));
  mat = d == dome ? 1.0 : (d == lantern ? 2.0 : (d == porch ? 3.0 : (d == foot ? 4.0 : 0.0)));
  return d;
}
void mat_hall(vec3 q, float mat, Prop pr, inout Surf s) {
  float ang = atan(q.x, q.z);
  if (mat > 3.5) { s.albedo = P_STONE; s.cover = 0.5; s.ink = penLine(length(q.xz) - 3.5) * 0.6; return; }
  if (mat > 2.5) {
    s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0;
    if (abs(q.x) < 0.72 && q.y < 2.0 && q.z > 3.6) { s.albedo = P_SLATE; s.cover = 0.85; if (abs(q.x) < 0.035) { s.albedo = P_SKY; s.cover = 0.2; s.glow = 0.7; } }
    s.ink = max(penLine(max(abs(q.x) - 0.72, q.y - 2.0)), penLine(q.y - 2.2)) * 0.8;
    if (q.y > 2.2) { s.albedo = P_VERMILION; s.cover = 0.82; }
    return;
  }
  if (mat > 1.5) { s.albedo = P_SKY; s.cover = 0.25; s.glow = 0.8; return; }
  if (mat > 0.5) {
    s.albedo = mix(P_SLATE, P_TEAL, 0.35); s.cover = 0.66; s.soft = 1.0;
    s.ink = max(penLine((fract(ang / TAU * 12.0) - 0.5) * length(q.xz) * 0.5), penLine(q.y - 3.4)) * 0.6;
    return;
  }
  s.albedo = P_SKY; s.cover = 0.09; s.soft = 1.0; s.wrap = 0.2;
  float cell = fract(ang / TAU * 12.0) - 0.5;
  float win = max(abs(cell) * 3.3 * 1.7 - 0.32, abs(q.y - 1.3) - 0.55);
  if (win < 0.0) { s.albedo = P_SLATE; s.cover = 0.8 * (1.0 - smoothstep(0.05, 0.0, abs(cell * 5.0 + q.y - 1.5))); }
  s.ink = max(penLine(win), penLine(q.y - 0.4) * 0.6) * 0.8;
  if (q.y > 2.12 && q.y < 2.42) { s.albedo = P_VERMILION; s.cover = 0.82; s.ink = 0.0; }
}

float sdf_hab(vec3 q, Prop pr, out float mat) {
  float wall = sdCylinder(q, 1.9, 1.05);
  float dome = max(sdEllipsoid(q - vec3(0.0, 1.0, 0.0), vec3(1.97, 1.3, 1.97)), 0.98 - q.y);
  float door = sdRoundBox(q - vec3(0.0, 0.72, 1.82), vec3(0.5, 0.72, 0.18), 0.06);
  float vent = min(sdCylinder(q - vec3(0.7, 1.7, -0.5), 0.16, 0.7), sdCylinder(q - vec3(0.7, 2.36, -0.5), 0.24, 0.08));
  float d = min(min(wall, dome), min(door, vent));
  mat = d == dome ? 1.0 : (d == door ? 2.0 : (d == vent ? 3.0 : 0.0));
  return d;
}
void mat_hab(vec3 q, float mat, Prop pr, inout Surf s) {
  float ang = atan(q.x, q.z);
  if (mat > 2.5) { s.albedo = P_STONE; s.cover = 0.6; return; }
  if (mat > 1.5) { s.albedo = P_SLATE; s.cover = 0.84; s.ink = penLine(max(abs(q.x) - 0.42, q.y - 1.3)) * 0.6; if (abs(q.y - 1.05) < 0.1 && abs(q.x) < 0.2) { s.albedo = P_SKY; s.cover = 0.2; s.glow = 0.6; } return; }
  if (mat > 0.5) {
    s.albedo = pr.pal < 0.5 ? P_BRICK : (pr.pal < 1.5 ? mix(P_TEAL, P_PINE, 0.4) : (pr.pal < 2.5 ? P_HONEY : P_SLATE));
    s.cover = 0.74; s.soft = 1.0;
    s.ink = max(penLine((fract(ang / TAU * 8.0 + 0.06) - 0.5) * length(q.xz) * 0.7), penLine(q.y - 1.75)) * 0.55;
    return;
  }
  s.albedo = P_SKY; s.cover = 0.09; s.soft = 1.0; s.wrap = 0.2;
  float side = abs(ang) - 1.15;
  float port = length(vec2(side * 1.9, q.y - 0.62)) - 0.26;
  if (port < 0.0) { s.albedo = P_SLATE; s.cover = 0.8 * (1.0 - smoothstep(0.04, 0.0, abs(side * 1.9 + q.y - 0.7))); }
  s.ink = max(penLine(port), penLine(q.y - 0.16) * 0.6) * 0.8;
  if (q.y < 0.16) { s.albedo = P_STONE; s.cover = 0.55; }
}

float sdf_kiosk(vec3 q, Prop pr, out float mat) {
  float counter = sdRoundBox(q - vec3(0.0, 0.5, 0.45), vec3(1.25, 0.5, 0.33), 0.05);
  float back = sdRoundBox(q - vec3(0.0, 1.15, -0.6), vec3(1.3, 1.15, 0.12), 0.04);
  float posts = sdCapsule(vec3(abs(q.x), q.yz), vec3(1.28, 0.0, 0.78), vec3(1.28, 2.15, 0.78), 0.05);
  vec3 a = q - vec3(0.0, 2.3, 0.2); a.yz = rot2(-0.2) * a.yz;
  float awning = sdRoundBox(a, vec3(1.5, 0.045, 0.95), 0.03);
  float goods = min(sdRoundBox(q - vec3(-0.65, 1.14, 0.45), vec3(0.2, 0.14, 0.18), 0.03), min(sdSphere(q - vec3(0.1, 1.13, 0.42), 0.15), sdCylinder(q - vec3(0.72, 1.0, 0.45), 0.12, 0.34)));
  float d = min(min(counter, back), min(min(posts, awning), goods));
  mat = d == awning ? 1.0 : (d == goods ? 2.0 : (d == back ? 3.0 : (d == posts ? 4.0 : 0.0)));
  return d;
}
void mat_kiosk(vec3 q, float mat, Prop pr, inout Surf s) {
  vec3 tint = pr.pal < 0.5 ? P_VERMILION : (pr.pal < 1.5 ? P_TEAL : P_HONEY);
  if (mat > 3.5) { s.albedo = P_STONE; s.cover = 0.6; return; }
  if (mat > 2.5) { s.albedo = P_SLATE; s.cover = 0.8; s.ink = max(penLine(fract(q.y * 1.6) - 0.5), penLine(abs(q.x) - 0.6) * 0.5) * 0.5; return; }
  if (mat > 1.5) { s.albedo = q.x < -0.3 ? P_APRICOT : (q.x < 0.4 ? P_SKY : P_LEAF); s.cover = 0.75; return; }
  if (mat > 0.5) { float stripe = step(0.5, fract(q.x * 1.4 + 0.25)); s.albedo = mix(P_SKY, tint, stripe); s.cover = mix(0.1, 0.84, stripe); s.soft = 1.0; s.ink = penLine((fract(q.x * 1.4 + 0.25) - 0.5) / 1.4) * 0.5; return; }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0;
  s.ink = max(penLine(q.y - 0.86), penLine(abs(q.x) - 0.62) * 0.5) * 0.75;
  if (q.y > 0.86) { s.albedo = tint; s.cover = 0.84; }
}

float sdf_spire(vec3 q, Prop pr, out float mat) {
  float foot = min(sdCylinder(q, 1.35, 0.3), sdCylinder(q - vec3(0.0, 0.3, 0.0), 1.0, 0.3));
  float base = sdTaper(q, vec3(0.0, 0.6, 0.0), vec3(0.0, 1.9, 0.0), 0.7, 0.38);
  float mast = sdTaper(q, vec3(0.0, 1.9, 0.0), vec3(0.0, 8.1, 0.0), 0.36, 0.12);
  float hoops = min(sdTorusY(q - vec3(0.0, 3.1, 0.0), 0.72, 0.06), min(sdTorusY(q - vec3(0.0, 5.0, 0.0), 0.58, 0.055), sdTorusY(q - vec3(0.0, 6.7, 0.0), 0.44, 0.05)));
  float lamp = sdSphere(q - vec3(0.0, 8.5, 0.0), 0.3);
  float d = min(min(foot, base), min(mast, min(hoops, lamp)));
  mat = (d == hoops || d == lamp) ? 1.0 : (d == foot ? 2.0 : 0.0);
  return d * 0.9;
}
void mat_spire(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_STONE; s.cover = 0.5; s.ink = max(penLine(length(q.xz) - 1.0), penLine(q.y - 0.3)) * 0.6; return; }
  if (mat > 0.5) { s.albedo = P_SKY; s.cover = 0.4 * (0.6 + 0.4 * sin(uTime * 1.6 - q.y * 1.3)); s.glow = 0.75; return; }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0; s.wrap = 0.2;
  s.ink = max(penLine(q.y - 1.9), penLine(fract(q.y * 0.6) - 0.5) * 0.4) * 0.7;
  if (q.y > 1.5 && q.y < 1.9) { s.albedo = P_VERMILION; s.cover = 0.82; }
  if (q.y > 7.7) { s.albedo = P_SLATE; s.cover = 0.7; }
}

float sdf_bench(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float seat = sdRoundBox(q - vec3(0.0, 0.42, 0.0), vec3(0.85, 0.05, 0.26), 0.03);
  float legs = sdRoundBox(vec3(abs(q.x) - 0.62, q.y - 0.2, q.z), vec3(0.06, 0.2, 0.22), 0.02);
  if (legs < seat) mat = 1.0;
  return min(seat, legs);
}
void mat_bench(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_SLATE; s.cover = 0.75; return; }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0; s.ink = penLine(abs(q.z) - 0.09) * 0.5;
}

float sdf_planter(vec3 q, Prop pr, out float mat) {
  float tub = max(sdCylinder(q, 0.62, 0.5), -sdCylinder(q - vec3(0.0, 0.4, 0.0), 0.5, 0.3));
  float shrub = sdEllipsoid(q - vec3(0.0, 0.9, 0.0), vec3(0.55, 0.5, 0.55)) + 0.04 * sin(q.x * 9.0 + pr.seed * 20.0) * sin(q.z * 8.0) * sin(q.y * 7.0);
  mat = shrub < tub ? 1.0 : 0.0;
  return min(tub, shrub) * 0.9;
}
void mat_planter(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = uLeafPal[int(pr.pal + 0.5)]; s.cover = 0.78; s.soft = 1.0; s.leafy = 1.0; return; }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0;
  s.ink = max(penLine(q.y - 0.4), penLine(q.y - 0.1)) * 0.6;
  if (q.y > 0.36) { s.albedo = P_STONE; s.cover = 0.5; }
}

float sdf_banner(vec3 q, Prop pr, out float mat) {
  float pole = min(sdCylinder(q, 0.045, 3.3), sdCylinder(q, 0.14, 0.12));
  vec3 f = q - vec3(0.0, 2.4, 0.0);
  f.z += 0.06 * sin(uTime * 2.2 + f.x * 5.0 + pr.seed * 9.0) * f.x * 1.6;
  float flag = sdBox(f - vec3(0.32, 0.0, 0.0), vec3(0.3, 0.72 - f.x * 0.5, 0.012));
  mat = flag < pole ? 1.0 : 0.0;
  return min(pole, flag) * 0.8;
}
void mat_banner(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_STONE; s.cover = 0.6; return; }
  s.albedo = pr.pal < 0.5 ? P_VERMILION : (pr.pal < 1.5 ? P_TEAL : P_HONEY); s.cover = 0.84; s.soft = 1.0;
  float ring = abs(length(vec2(q.x - 0.3, q.y - 2.55)) - 0.13) - 0.03;
  if (ring < 0.0) s.cover = 0.08;
}

float sdf_column(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  bool whole = pr.seed < 0.75;
  float h = whole ? 3.2 : 1.3 + 1.2 * fract(pr.seed * 7.0);
  float shaft = sdCylinder(q, 0.27 + 0.016 * cos(atan(q.z, q.x) * 12.0), h);
  if (!whole) shaft = max(shaft, dot(q - vec3(0.0, h - 0.12, 0.0), vec3(0.43, 0.86, 0.26)));
  float ends = sdBox(q - vec3(0.0, 0.14, 0.0), vec3(0.42, 0.14, 0.42));
  if (whole) ends = min(ends, sdBox(q - vec3(0.0, 3.3, 0.0), vec3(0.44, 0.13, 0.44)));
  return min(shaft, ends) * 0.9;
}
void mat_column(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mix(P_STONE, P_CREAM, 0.35 + 0.25 * vnoise(q.xy * 3.0 + pr.seed * 9.0));
  s.cover = 0.5;
  s.ink = max(penLine((abs(fract(atan(q.z, q.x) * 1.9) - 0.5)) / 1.9 * 0.27) * 0.5 * step(0.3, q.y) * step(q.y, 3.15),
              max(penLine(q.y - 0.28), penLine(q.y - 3.17)) * 0.8);
  if (q.y > 2.85 && q.y < 3.0) { s.albedo = P_HONEY; s.cover = 0.8; }
}
`,Kl=`float sdf_tree(vec3 q, Prop pr, out float mat) {
  q.xz += 0.035 * sin(uTime * 1.2 + pr.seed * 30.0) * max(q.y - 1.2, 0.0) * vec2(0.8, 0.5);
  float trunk = sdTaper(q, vec3(0.0), vec3(0.06, 2.3, 0.02), 0.2, 0.1);
  float bound = length(q - vec3(0.0, 3.0, 0.0)) - 1.75;
  if (bound > 0.7) { mat = trunk < bound ? 0.0 : 1.0; return min(trunk, bound); }
  vec3 w = vec3(pr.seed - 0.5, 0.0, fract(pr.seed * 7.3) - 0.5) * 0.3;
  float can = length(q - vec3(0.0, 3.0, 0.0)) - 1.05;
  can = smin(can, length(q - vec3(0.66, 2.5, 0.3) - w) - 0.78, 0.16);
  can = smin(can, length(q - vec3(-0.6, 2.6, -0.4) + w) - 0.76, 0.16);
  can = smin(can, length(q - vec3(-0.15, 2.45, 0.74) - w.zyx) - 0.68, 0.16);
  can = smin(can, length(q - vec3(0.2, 3.75, -0.2) + w.zyx) - 0.66, 0.16);
  can += 0.06 * sin(q.x * 4.7 + pr.seed * 17.0) * sin(q.y * 5.1) * sin(q.z * 4.9 + 1.3);
  can += 0.022 * sin(q.x * 10.3 + 2.0) * sin(q.y * 9.1 + pr.seed * 9.0) * sin(q.z * 9.7);
  mat = trunk < can ? 0.0 : 1.0;
  return min(trunk, can) * 0.7;
}
void mat_tree(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  leafSurf(q, pr, s, 2.1, 4.2);
  if (fract(pr.seed * 7.13) < 0.3 && pr.pal < 0.5) {
    vec2 v = voronoi(q.xy * 2.6 + q.z * 1.9 + pr.seed * 20.0);
    float fruit = smoothstep(0.13, 0.09, v.x) * step(0.72, v.y);
    s.albedo = mix(s.albedo, P_POPPY, fruit);
    s.cover = mix(s.cover, 0.95, fruit);
  }
}

float sdf_pine(vec3 q, Prop pr, out float mat) {
  q.xz += 0.02 * sin(uTime * 1.1 + pr.seed * 30.0) * max(q.y - 1.0, 0.0) * vec2(0.7, 0.4);
  float trunk = sdCylinder(q, 0.15, 1.6);
  float fr = 0.07 * sin(q.x * 5.0 + pr.seed * 20.0) * sin(q.z * 5.0 + q.y * 2.0);
  float c1 = sdConeUp(q - vec3(0.0, 0.9, 0.0), 1.3 + fr, 2.3);
  float c2 = sdConeUp(q - vec3(0.0, 2.3, 0.0), 1.05 + fr, 2.1);
  float c3 = sdConeUp(q - vec3(0.0, 3.6, 0.0), 0.75 + fr, 2.0);
  float can = min(c1, min(c2, c3)) - 0.05;
  mat = trunk < can ? 0.0 : 1.0;
  return min(trunk, can) * 0.82;
}
void mat_pine(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  leafSurf(q, pr, s, 1.0, 5.4);
  float tier = fract((q.y - 0.9) / 1.35);
  s.occ *= mix(0.6, 1.0, smoothstep(0.0, 0.6, tier));
  s.ink = max(s.ink * 0.6, penLine(tier * 1.35) * 0.75);
  s.cover = mix(s.cover, 0.12, gSnow * smoothstep(0.55, 0.95, tier));
}

float sdf_bush(vec3 q, Prop pr, out float mat) {
  mat = 1.0;
  q.xz += 0.02 * sin(uTime * 1.6 + pr.seed * 30.0) * q.y;
  float d = length(q - vec3(0.0, 0.42, 0.0)) - 0.6;
  d = smin(d, length(q - vec3(0.48, 0.33, 0.15)) - 0.44, 0.2);
  d = smin(d, length(q - vec3(-0.4, 0.36, -0.25)) - 0.48, 0.2);
  d += 0.04 * sin(q.x * 7.0 + pr.seed * 9.0) * sin(q.y * 7.5) * sin(q.z * 6.5);
  return d * 0.82;
}
void mat_bush(vec3 q, float mat, Prop pr, inout Surf s) {
  leafSurf(q, pr, s, 0.1, 0.9);
  vec2 v = voronoi(q.xz * 5.0 + q.y * 3.0 + pr.seed * 20.0);
  float berry = smoothstep(0.16, 0.1, v.x) * step(0.6, v.y) * step(0.35, q.y);
  bool bloom = pr.pal > 1.5 && pr.pal < 2.5;
  s.albedo = mix(s.albedo, bloom ? PAPER : P_POPPY, berry);
  s.cover = mix(s.cover, bloom ? 0.0 : 0.95, berry);
}

float sdf_mushroom(vec3 q, Prop pr, out float mat) {
  float stem = sdTaper(q, vec3(0.0), vec3(0.04, 0.72, 0.0), 0.14, 0.09);
  vec3 c = q - vec3(0.04, 0.7, 0.0);
  float cap = max(length(c * vec3(1.0, 1.55, 1.0)) - 0.6, -c.y - 0.03) * 0.65;
  vec3 c2 = q - vec3(-0.42, 0.3, 0.3);
  float small = min(sdCapsule(q, vec3(-0.4, 0.0, 0.28), vec3(-0.42, 0.3, 0.3), 0.06),
                    max(length(c2 * vec3(1.0, 1.5, 1.0)) - 0.26, -c2.y - 0.02) * 0.65);
  float caps = min(cap, small);
  mat = stem < caps ? 0.0 : 1.0;
  return min(stem, caps);
}
void mat_mushroom(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_CREAM; s.cover = 0.3; return; }
  vec2 v = voronoi(q.xz * 4.5 + pr.seed * 20.0);
  float under = step(q.y, q.x < -0.2 ? 0.3 : 0.69);
  float spot = smoothstep(0.22, 0.16, v.x) * (1.0 - under);
  s.albedo = mix(pr.seed > 0.5 ? P_POPPY : P_SLATE, P_TAN, under);
  s.cover = mix(mix(0.86, 0.35, under), 0.0, spot);
  s.ink = max(penLine((v.x - 0.19) / 4.5) * (1.0 - under) * 0.6,
              under * smoothstep(0.2, 0.0, abs(fract(atan(q.z, q.x - 0.04) * 3.0) - 0.5)) * 0.5);
  s.glow = spot * uNight * 0.8;
}

float sdf_willow(vec3 q, Prop pr, out float mat) {
  float trunk = sdTaper(q, vec3(0.0), vec3(0.1, 2.0, 0.05), 0.24, 0.14);
  vec3 c = q - vec3(0.0, 2.3, 0.0);
  c.xz += 0.04 * sin(uTime * 1.1 + pr.seed * 30.0 + q.y * 1.5) * max(2.3 - q.y, 0.0);
  float dome = length(c * vec3(1.0, 0.82, 1.0)) - 1.55;
  float hollow = length((c + vec3(0.0, 0.5, 0.0)) * vec3(1.0, 0.7, 1.0)) - 1.25;
  float can = max(max(dome, -hollow), 0.55 - q.y);
  can += 0.07 * sin(atan(c.z, c.x) * 9.0 + pr.seed * 20.0) * smoothstep(1.6, 0.6, q.y);
  mat = trunk < can ? 0.0 : 1.0;
  return min(trunk, can) * 0.7;
}
void mat_willow(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  leafSurf(q, pr, s, 1.0, 3.6);
  float strand = abs(fract(atan(q.z, q.x) * 4.5 + pr.seed * 3.0) - 0.5) / 4.5 * 1.2;
  s.ink = max(s.ink * 0.4, penLine(strand) * smoothstep(2.6, 1.2, q.y) * 0.45);
}

float sdf_deadtree(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = sdTaper(q, vec3(0.0), vec3(0.1, 2.4, 0.0), 0.2, 0.09);
  d = min(d, sdTaper(q, vec3(0.06, 1.5, 0.0), vec3(0.9, 2.6, 0.2), 0.08, 0.03));
  d = min(d, sdTaper(q, vec3(0.05, 1.9, 0.0), vec3(-0.75, 2.9, -0.25), 0.07, 0.03));
  d = min(d, sdTaper(q, vec3(0.1, 2.4, 0.0), vec3(0.25, 3.4, 0.45), 0.06, 0.02));
  d = min(d, sdTaper(q, vec3(0.6, 2.25, 0.13), vec3(1.05, 2.3, -0.3), 0.04, 0.02));
  return d;
}
void mat_deadtree(vec3 q, float mat, Prop pr, inout Surf s) {
  barkSurf(q, pr, s);
  s.albedo = mix(s.albedo, P_STONE, 0.5);
  s.cover = 0.66;
}

float sdf_reeds(vec3 q, Prop pr, out float mat) {
  float sec = TAU / 5.0;
  float k = floor(atan(q.z, q.x) / sec + 0.5);
  float ca = k * sec;
  float h = 1.1 + 0.5 * fract(sin(k * 12.9898 + pr.seed * 78.233) * 43758.5453);
  vec3 root = vec3(cos(ca) * 0.26, 0.0, sin(ca) * 0.26);
  vec3 top = vec3(root.x * 1.7 + 0.05 * sin(uTime * 1.8 + pr.seed * 30.0 + k), h, root.z * 1.7);
  float stem = sdCapsule(q, root, top, 0.026);
  float head = sdCapsule(q, mix(root, top, 0.72), mix(root, top, 0.94), 0.058);
  mat = head < stem ? 1.0 : 0.0;
  return min(stem, head) * 0.8;
}
void mat_reeds(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_UMBER; s.cover = 0.95; }
  else { s.albedo = P_GREEN; s.cover = 0.9; }
}

float sdf_bigcap(vec3 q, Prop pr, out float mat) {
  float lean = 0.24 * (pr.seed - 0.5);
  float stem = sdTaper(q, vec3(0.0), vec3(lean, 2.7, 0.0), 0.3, 0.2);
  vec3 c = q - vec3(lean, 2.7, 0.0);
  float bound = length(c) - 1.72;
  if (bound > 0.6) { mat = stem < bound ? 0.0 : 1.0; return min(stem, bound); }
  float cap = max(length(c * vec3(1.0, 1.7, 1.0)) - 1.6, -c.y - 0.05) * 0.58;
  mat = stem < cap ? 0.0 : 1.0;
  return min(stem, cap);
}
void mat_bigcap(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_CREAM; s.cover = 0.26; s.ink = penLine((abs(fract(atan(q.z, q.x) * 1.6) - 0.5)) / 1.6 * 0.25) * 0.4; return; }
  vec3 c = q - vec3(0.24 * (pr.seed - 0.5), 2.7, 0.0);
  float under = step(c.y, 0.0);
  vec2 v = voronoi(c.xz * 1.7 + pr.seed * 20.0);
  float spot = smoothstep(0.26, 0.2, v.x) * (1.0 - under);
  float pick = fract(pr.seed * 5.3);
  s.albedo = mix(pick < 0.3 ? P_POPPY : (pick < 0.6 ? P_SLATE : (pick < 0.8 ? P_TEAL : P_HONEY)), P_TAN, under);
  s.cover = mix(mix(0.86, 0.4, under), 0.0, spot);
  s.ink = max(penLine((v.x - 0.23) / 1.7) * (1.0 - under) * 0.6,
              under * penLine((abs(fract(atan(c.z, c.x) * 5.0) - 0.5)) / 5.0 * length(c.xz)) * 0.5);
  s.soft = 1.0;
  s.glow = spot * uNight * 0.8;
}

float sdf_stump(vec3 q, Prop pr, out float mat) {
  float d = sdCylinder(q, 0.34 + 0.04 * sin(atan(q.z, q.x) * 5.0 + pr.seed * 9.0), 0.42);
  float root = sdTaper(vec3(abs(q.x), q.y, abs(q.z)), vec3(0.24, 0.14, 0.24), vec3(0.5, 0.0, 0.5), 0.09, 0.04);
  mat = (q.y > 0.4 && d < root) ? 1.0 : 0.0;
  return min(d, root) * 0.85;
}
void mat_stump(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  s.albedo = P_WOOD; s.cover = 0.5;
  s.ink = penLine((abs(fract(length(q.xz) * 9.0 + 0.3) - 0.5)) / 9.0) * 0.6;
}
`,Gl="struct Prop { int type; vec3 base; float rot; float scale; float seed; float pal; };";function Yl(){const s=Cs.map(n=>`    case ${n.type}: return sdf_${n.id}(q, pr, m);`).join(`
`),e=Cs.map(n=>`    case ${n.type}: mat_${n.id}(q, m, pr, s); break;`).join(`
`),t=Cs.filter(n=>n.seeThrough).map(n=>`type == ${n.type}`).join(" || ");return[Gl,Dl,Kl,Ol,Ul,$l,Hl,`float propSdf(vec3 q, Prop pr, out float m) {
  m = 0.0;
  switch (pr.type) {
${s}
  }
  return 1e3;
}`,`bool propSeeThrough(int type, float mat) {
  if (mat < 0.5 || mat > 1.5) return false;
  return ${t||"false"};
}`,`void propMat(vec3 q, float m, Prop pr, inout Surf s) {
  switch (pr.type) {
${e}
  }
}`].join(`
`)}function Wl(){vl("props",Yl)}Wl();const Vl=`in vec2 vUv;
layout(location = 0) out vec4 oLay;
layout(location = 1) out vec4 oGbuf;
layout(location = 2) out vec4 oMark;
layout(location = 3) out vec4 oSheet;

uniform vec3 uRockCol;
uniform vec3 uLeafPal[12];
uniform vec4 uCasters[MAX_CASTERS];
uniform int uCasterCount;
uniform vec4 uReveal;
uniform float uPen;
float gSnow = 0.0;

#include <common>
#include <frame>
#include <pencil>
#include <lighting>
#include <props>
#include <terrain>
#include <ground>
#include <sky>

float casterShadow(vec3 p) {
  float s = 1.0;
  for (int i = 0; i < MAX_CASTERS; i++) {
    if (i >= uCasterCount) break;
    s = min(s, sphereShadow(p, uSunDir, uCasters[i], 4.0));
  }
  return s;
}
float casterContact(vec3 p) {
  float o = 0.0;
  for (int i = 0; i < MAX_CASTERS; i++) {
    if (i >= uCasterCount) break;
    vec4 c = uCasters[i];
    float flat_ = 1.0 - smoothstep(0.35 * c.w, 1.15 * c.w, length(p.xz - c.xz));
    o = max(o, flat_ * (1.0 - smoothstep(0.0, 1.3 * c.w, abs(p.y - (c.y - c.w)))));
  }
  return o;
}

vec3 propNormal(vec3 q, Prop pr) {
  const vec2 e = vec2(1.0, -1.0) * 0.012;
  float m;
  return normalize(e.xyy * propSdf(q + e.xyy, pr, m) + e.yyx * propSdf(q + e.yyx, pr, m) +
                   e.yxy * propSdf(q + e.yxy, pr, m) + e.xxx * propSdf(q + e.xxx, pr, m));
}

void lightSurf(inout Surf s, vec3 p, vec3 N, float shadow, float ao, out float shade) {
  shade = shadeAmount(s, N, shadow, ao * s.occ);
  float facing = smoothstep(0.55, 0.95, dot(N, uSunDir)) * (1.0 - shade);
  s.cover *= 1.0 - 0.28 * facing;
  float pool = lightPool(p, N);
  s.cover *= (1.0 - 0.88 * max(pool, s.glow));
  shade *= (1.0 - max(pool, s.glow));
  s.albedo = mix(s.albedo, nightPencil(s.albedo), uNight * (1.0 - pool));
  s.cover = mix(s.cover, min(1.0, s.cover * 1.22 + 0.08 * step(0.02, s.cover)), uNight * (1.0 - pool) * (1.0 - s.glow));
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCamFwd + uCamRight * (ndc.x * uTanFov.x) + uCamUp * (ndc.y * uTanFov.y));

  vec2 oc = ro.xz - uFocus.xz;
  float qa = dot(rd.xz, rd.xz), qb = dot(oc, rd.xz), qc = dot(oc, oc) - VIEW_DIST * VIEW_DIST;
  float disc = qb * qb - qa * qc;
  float tMax = (qa > 1e-6 && disc > 0.0) ? min((-qb + sqrt(disc)) / qa, 420.0) : 420.0;
  float tMin = 0.05;
  if (ro.y > uMaxY) tMin = rd.y < 0.0 ? (uMaxY - ro.y) / rd.y : tMax;

  vec2 fromHero = (ndc - uReveal.xy) * vec2(uTanFov.x / uTanFov.y, 1.0);
  gReveal = length(fromHero) < uReveal.z * (0.86 + 0.28 * vnoise(vUv * 26.0));
  gRevealT = uReveal.w - 0.7;

  Hit hit;
  hit.kind = 0; hit.t = tMax; hit.mat = 0.0; hit.cell = ivec2(0);
  if (tMin < tMax) marchScene(ro, rd, tMin, tMax, hit);
  float tw = (rd.y < -1e-4 && ro.y > SEA) ? (SEA - ro.y) / rd.y : 1e9;
  bool wet = tw < hit.t && uRealm < 0.5;
  bool open = hit.kind == 0 && !wet;
  if (!open && hit.kind == 1 && uRealm > 0.5) {
    vec3 ph = ro + rd * hit.t;
    float under = uRealm > 1.5 ? SEA + 1.0 + 3.4 * vnoise(ph.xz * 0.21) + 1.3 * vnoise(ph.xz * 0.9) : SEA + 0.5;
    if (ph.y < under) open = true;
  }

  Surf s = newSurf();
  vec3 N = vec3(0.0, 1.0, 0.0);
  float depth = hit.t, id = 0.0, shade = 0.0, grass = 0.0, kind = 0.0;
  vec2 sheet = vec2(8.0);

  if (open) {
    float skyInk;
    s.albedo = skyLay(rd, s.cover, skyInk);
    s.ink = skyInk;
    kind = 1.0;
    depth = 9000.0;
    id = -1.0;
  } else {
    vec3 p = ro + rd * hit.t;
    gPen = max(hit.t * uPen, 0.004);
    if (hit.kind == 1) {
      N = terrainNormal(p.xz);
      vec3 Nd = N;
      float canopy;
      groundSurf(p, hit.t, Nd, s, canopy);
      float sh = wet ? 1.0 : shadowMarch(p + N * 0.05, uSunDir);
      gSun = cloudShadow(p.xz);
      sh = min(sh, casterShadow(p + N * 0.03));
      float ao = (1.0 - 0.3 * canopy) * (1.0 - 0.55 * casterContact(p));
      lightSurf(s, p, Nd, sh, ao, shade);
      if (gSolid > 0.01) {
        float skyC, skyI;
        vec3 dark = skyLay(vec3(0.0, 1.0, 0.0), skyC, skyI);
        s.albedo = mix(s.albedo, dark, gSolid); s.cover = mix(s.cover, skyC, gSolid); s.ink *= 1.0 - gSolid; shade *= 1.0 - gSolid;
      }
      grass = gGrass;
      kind = s.soft;
      id = 0.02;
      sheet = vec2(dot(rd, uPaperFwd), dot(rd, uPaperFwdB)) * hit.t;
    } else if (hit.kind == 2) {
      mat2 pm = propRot(hit.pr);
      vec3 q = toProp(p, hit.pr, pm);
      vec3 n = propNormal(q, hit.pr);
      vec2 buv = (hit.pr.base.xz + 0.5) * INV_T;
      vec4 bm = textureLod(uMatTex, buv, 0.0);
      gSnow = bm.b;
      propMat(q, hit.mat, hit.pr, s);
      vec3 ng = n;
      if (s.leafy > 0.5) {
        vec3 j = vec3(vnoise3(q * 2.6 + 1.7), vnoise3(q * 2.6 + 5.3), vnoise3(q * 2.6 + 9.1)) - 0.5;
        n = normalize(n + j * 1.1 + vec3(0.0, 0.22, 0.0));
      }
      if (s.moss > 0.0) {
        float mossy = smoothstep(0.55, 0.8, n.y) * s.moss * max(bm.r, bm.b);
        s.albedo = mix(s.albedo, mix(textureLod(uColorTex, buv, 0.0).rgb, P_SAGE, 0.3), mossy);
      }
      mat2 back = transpose(pm);
      N = vec3(back * n.xz, n.y).xzy;
      vec3 Ng = vec3(back * ng.xz, ng.y).xzy;
      gSun = cloudShadow(p.xz);
      float sh = shadowMarch(p + Ng * 0.08, uSunDir);
      float openProp = saturate(propSdf(q + ng * 0.4, hit.pr, hit.mat) / 0.4);
      float ao = (0.6 + 0.4 * saturate(q.y * 0.5)) * mix(0.5, 1.0, openProp);
      lightSurf(s, p, N, sh, ao, shade);
      kind = s.soft;
      id = 0.1 + 0.9 * hash12(floor(hit.pr.base.xz * 2.0 + 0.5));
      vec3 stand = hit.pr.base + vec3(0.0, 1.5 * hit.pr.scale, 0.0) - ro;
      sheet = max(vec2(dot(stand, uPaperFwd), dot(stand, uPaperFwdB)), 1.0);
    } else {
      s.albedo = P_SLATE; s.cover = 0.7;
    }
    if (wet) {
      vec3 wp = ro + rd * tw;
      float depthV = max(SEA - hAt(wp.xz), 0.0);
      float billow = fbm(wp.xz * 0.045 + uWind * uTime * 0.012);
      float fine = fbm(wp.xz * 0.17 - uWind * uTime * 0.02);
      float hollow = smoothstep(0.5, 0.6, billow + (fine - 0.5) * 0.3);
      float lip = 1.0 - smoothstep(0.3, 2.2, depthV);
      vec3 tintc = mix(mix(P_SKY, P_SLATE, 0.3), mix(P_APRICOT, P_ROSE, 0.4), uGold * 0.7);
      s = newSurf();
      s.albedo = mix(tintc, nightPencil(tintc), uNight);
      s.cover = (0.05 + hollow * 0.34) * (1.0 - lip) * mix(1.0, 1.6, uNight);
      s.soft = 1.0;
      shade = hollow * smoothstep(0.62, 0.8, billow) * 0.22 * (1.0 - lip);
      N = vec3(0.0, 1.0, 0.0);
      depth = tw; p = wp; id = 0.05; grass = 0.0;
      sheet = vec2(dot(rd, uPaperFwd), dot(rd, uPaperFwdB)) * tw;
      kind = 1.0;
    }
    float thin = 1.0 - 0.42 * smoothstep(26.0, 100.0, depth);
    float edge = 1.0 - smoothstep(VIEW_DIST * 0.66, VIEW_DIST * 0.97, length(p.xz - uFocus.xz));
    if (uRealm > 0.5) {
      float farCover, farInk;
      vec3 farPig = skyLay(normalize(vec3(rd.x, min(rd.y, -0.05), rd.z)), farCover, farInk);
      s.albedo = mix(farPig, s.albedo, edge);
      s.cover = mix(farCover, s.cover * thin, edge);
    } else s.cover *= thin * edge;
    shade *= thin * edge;
    s.ink *= mix(1.0, 0.55, smoothstep(26.0, 100.0, depth)) * edge;
    grass *= edge;
    id = edge < 0.03 ? -1.0 : id;
  }
  if (open || wet) {
    if (farIslands(rd, s.albedo, s.cover, s.ink)) { shade = 0.0; grass = 0.0; kind = 1.0; }
  }
  oLay = vec4(s.albedo, s.cover);
  oGbuf = vec4(octEncode(N), depth, id);
  oMark = vec4(shade, s.ink, grass, kind);
  oSheet = vec4(sheet, 0.0, 1.0);
}
`,Xl={high:{MARCH_STEPS:120,SHADOW_STEPS:28},low:{MARCH_STEPS:84,SHADOW_STEPS:12}};class jl{gl;programs={};constructor(e){this.gl=e}program(e){let t=this.programs[e];return t||(t=new Mn(this.gl,`world:${e}`,Ds,Vl,Xl[e]),this.programs[e]=t),t}render(e,t,n,o,a){const i=this.gl,r=this.program(a).use();e.bind(),i.disable(i.DEPTH_TEST),i.disable(i.BLEND),o(r),n.bind(r),r.set("uCasters",t.casters).set("uCasterCount",t.casterCount),r.set("uPen",2*jn(t.camera)[1]/e.height*1.3),Hs(i)}}const Jn=He.TEX,Ot=He.CHUNK,Pe=Jn/Ot,fa=Jn/He.CELL,ua=Ot/He.CELL;class Zl{gl;world;height;color;mat;propsA;propsB;slots;maxY=40;pending=[];constructor(e,t){this.gl=e,this.world=t;const n=(o,a,i,r)=>Io(e,{width:o,height:o,internal:a,format:e.RGBA,type:i,filter:r,wrap:e.REPEAT});this.height=n(Jn,e.RGBA16F,e.FLOAT,e.LINEAR),this.color=n(Jn,e.RGBA8,e.UNSIGNED_BYTE,e.LINEAR),this.mat=n(Jn,e.RGBA8,e.UNSIGNED_BYTE,e.LINEAR),this.propsA=n(fa,e.RGBA16F,e.FLOAT,e.NEAREST),this.propsB=n(fa,e.RGBA8,e.UNSIGNED_BYTE,e.NEAREST),this.slots=new Array(Pe*Pe).fill(null)}update(e,t,n=2){const o=Math.floor(e/Ot+.5),a=Math.floor(t/Ot+.5),i=this.pending;i.length=0;let r=-1e9;for(let d=a-Pe/2;d<a+Pe/2;d++)for(let h=o-Pe/2;h<o+Pe/2;h++){const u=(d%Pe+Pe)%Pe*Pe+(h%Pe+Pe)%Pe,f=this.slots[u];if(f&&f.cx===h&&f.cz===d){f.maxH>r&&(r=f.maxH);continue}i.push({cx:h,cz:d,si:u,d:Math.hypot(h+.5-e/Ot,d+.5-t/Ot)})}i.sort((d,h)=>d.d-h.d);const c=Math.min(n,i.length);for(let d=0;d<c;d++){const h=i[d],u=this.world.chunk(h.cx,h.cz);this.upload(u,h.si),u.maxH>r&&(r=u.maxH)}return this.maxY=r+.5,i.length-c}setWorld(e){this.world=e,this.slots.fill(null)}refresh(e,t){const n=(t%Pe+Pe)%Pe*Pe+(e%Pe+Pe)%Pe,o=this.slots[n];o&&o.cx===e&&o.cz===t&&this.upload(this.world.chunk(e,t),n)}upload(e,t){const n=this.gl,o=t%Pe,a=t/Pe|0,i=(r,c,d,h)=>{n.bindTexture(n.TEXTURE_2D,r),n.texSubImage2D(n.TEXTURE_2D,0,o*c,a*c,c,c,n.RGBA,d,h)};i(this.height,Ot,n.FLOAT,e.height),i(this.color,Ot,n.UNSIGNED_BYTE,e.color),i(this.mat,Ot,n.UNSIGNED_BYTE,e.mat),i(this.propsA,ua,n.FLOAT,e.propsA),i(this.propsB,ua,n.UNSIGNED_BYTE,e.propsB),this.slots[t]={cx:e.cx,cz:e.cz,maxH:e.maxH}}bind(e){e.tex("uHeightTex",this.height).tex("uColorTex",this.color).tex("uMatTex",this.mat).tex("uPropTexA",this.propsA).tex("uPropTexB",this.propsB).set("uMaxY",this.maxY)}}const pa=.3;class Jl{canvas;gl;worldTex;minimap;worldPass;entityPass;fxPass;post;targets;vao;leafPal;gpuTimer;frameFn;perf={ema:16.7,gpu:0,timer:0,calm:0,futile:0,lastDown:0,hold:0};toWarm=null;pencil=new Float32Array(4);paperAnchor=new Float32Array(3);query=null;timing=!1;lastTime=null;frame=null;figurePass=null;noLights=null;quality;scale;autoAdapt=!0;paper={a:null,b:null,mix:0,fade:0,still:0,last:null};size={cssW:1,cssH:1,dpr:1,width:1,height:1};constructor(e,t,n={}){this.canvas=e;const o=yl(e);this.gl=o,this.worldTex=new Zl(o,t),this.minimap=new Rl(this.worldTex),this.worldPass=new jl(o),this.quality=n.lite?"low":"high",this.worldPass.program(this.quality),this.entityPass=new Ml(o),this.fxPass=new Al(o),this.post=new Nl(o),this.targets={scene:new Ls(o,[{},{filter:"nearest",precise:!0},{},{filter:"nearest",precise:!0}]),edge:new Ls(o,[{}]),ent:new Ls(o,[{},{filter:"nearest"}],!0)};const a=o.createVertexArray();if(!a)throw new Error("Unable to create fullscreen vertex array.");this.vao=a,this.leafPal=new Float32Array(Rr.flat()),this.scale=n.lite?_e.SCALE_LITE:_e.SCALE_START,this.gpuTimer=o.getExtension("EXT_disjoint_timer_query_webgl2"),this.frameFn=i=>this.applyFrame(i)}resize(e,t,n){const o=this.size;o.cssW=e,o.cssH=t,o.dpr=n,o.width=Math.round(e*n),o.height=Math.round(t*n),(this.canvas.width!==o.width||this.canvas.height!==o.height)&&(this.canvas.width=o.width,this.canvas.height=o.height);const a=Math.round(e*this.scale),i=Math.round(t*this.scale);this.targets.scene.resize(a,i),this.targets.edge.resize(a,i);const r=Math.min(n,_e.ENTITY_DPR_MAX);this.targets.ent.resize(Math.round(e*r),Math.round(t*r))}setWorld(e){this.worldTex.setWorld(e)}adapt(e){if(!this.autoAdapt)return;const t=this.perf;if(e>100||(t.ema+=(e-t.ema)*.08,t.timer+=e,t.timer<700))return;t.timer=0;let n=this.scale;this.gpuTimer?(t.gpu>19&&this.scale<=_e.SCALE_MIN+.001&&(this.quality="low"),t.gpu>13?n-=t.gpu>20?.12:.05:t.gpu>0&&t.gpu<8.5&&(n+=.05)):t.ema>21.5?(t.ema>30&&this.scale<=_e.SCALE_MIN+.001&&(this.quality="low"),t.lastDown&&t.lastDown-t.ema<1?++t.futile>=2&&(n=_e.SCALE_START,t.hold=30):(t.futile=0,n-=.06),t.lastDown=t.ema):t.ema<17.6&&++t.calm>=5&&(n+=.05,t.calm=0,t.lastDown=0),t.hold>0&&(t.hold--,n=this.scale),n=ue(n,_e.SCALE_MIN,_e.SCALE_MAX),Math.abs(n-this.scale)>.001&&(this.scale=n,this.resize(this.size.cssW,this.size.cssH,this.size.dpr))}warm(){this.toWarm||(this.toWarm=[...Ai.keys()]);const e=this.toWarm.pop();return e?this.entityPass.program(e):this.fxPass.program(),!this.toWarm.length&&!e}beginTiming(){const e=this.gl,t=this.gpuTimer;if(t){if(this.query){if(!e.getQueryParameter(this.query,e.QUERY_RESULT_AVAILABLE))return;if(!e.getParameter(t.GPU_DISJOINT_EXT)){const n=e.getQueryParameter(this.query,e.QUERY_RESULT)/1e6;this.perf.gpu+=(n-this.perf.gpu)*(this.perf.gpu?.15:1)}e.deleteQuery(this.query),this.query=null}this.query=e.createQuery(),this.query&&(e.beginQuery(t.TIME_ELAPSED_EXT,this.query),this.timing=!0)}}endTiming(){!this.timing||!this.gpuTimer||(this.gl.endQuery(this.gpuTimer.TIME_ELAPSED_EXT),this.timing=!1)}applyFrame(e){const t=this.frame,n=this.paper.a;if(!t||!n)return;const o=t.camera,a=t.env,i=this.paper.b||n;e.set("uCamPos",o.pos).set("uCamRight",o.right).set("uCamUp",o.up).set("uCamFwd",o.forward).set("uTanFov",jn(o)),e.set("uFocus",t.focus).set("uTime",t.time).set("uReveal",t.reveal),e.set("uSunDir",a.keyDir).set("uSunDisk",a.sunDir).set("uMoonDisk",a.moonDir),e.set("uNight",a.night).set("uGold",a.gold).set("uCloud",a.cloud).set("uWind",a.wind).set("uRealm",a.realm||0).set("uWall",a.wall||0).set("uSky",a.sky||[0,0]).set("uSkyTop",a.skyTop||[.59,.7,.47]),e.set("uRockCol",a.rockCol).set("uLeafPal",this.leafPal).set("uPave",a.pave||0),e.set("uLightPos",t.lightPos).set("uLightCol",t.lightCol).set("uLightCount",t.lightCount),e.set("uPencil",this.pencil).set("uPaperAnchor",this.paperAnchor),e.set("uPaperRight",n.right).set("uPaperUp",n.up).set("uPaperFwd",n.forward),e.set("uPaperRightB",i.right).set("uPaperUpB",i.up).set("uPaperFwdB",i.forward).set("uPaperMix",this.paper.mix)}holdPaper(e,t){const n=this.paper,o=d=>({right:[d.right[0],d.right[1],d.right[2]],up:[d.up[0],d.up[1],d.up[2]],forward:[d.forward[0],d.forward[1],d.forward[2]]});if(!n.a||!n.last){n.a=o(e),n.last=[e.forward[0],e.forward[1],e.forward[2]];return}const a=(d,h)=>d[0]*h[0]+d[1]*h[1]+d[2]*h[2],i=(d,h)=>Math.acos(Math.min(1,Math.max(-1,a(d,h)))),r=i(e.forward,n.last)/Math.max(t,1e-4);if(n.last=[e.forward[0],e.forward[1],e.forward[2]],n.still=r<.03?n.still+t:0,n.b){n.mix+=t/n.fade,n.mix>=1&&(n.a=n.b,n.b=null,n.mix=0);return}const c=Math.max(i(e.forward,n.a.forward),i(e.right,n.a.right));if(c>pa){const d=Math.min(pa*.6,r*.3),h=c>1e-4?d/c:0,u={right:[0,0,0],up:[0,0,0],forward:[0,0,0]};for(const g of["right","forward"]){let x=0;for(let b=0;b<3;b++)u[g][b]=e[g][b]+(e[g][b]-n.a[g][b])*h,x+=u[g][b]**2;x=Math.sqrt(x);for(let b=0;b<3;b++)u[g][b]/=x}const f=u.right,p=u.forward,m=a(f,p);let v=0;for(let g=0;g<3;g++)f[g]-=p[g]*m,v+=f[g]**2;v=Math.sqrt(v);for(let g=0;g<3;g++)f[g]/=v;u.up=[f[1]*p[2]-f[2]*p[1],f[2]*p[0]-f[0]*p[2],f[0]*p[1]-f[1]*p[0]],n.b=u,n.mix=0,n.fade=.2}else c>.012&&n.still>.3&&(n.b=o(e),n.mix=0,n.fade=.45)}figure(e){(!this.figurePass||!this.noLights)&&(this.figurePass=new Tl(this.gl),this.noLights={pos:new Float32Array(_e.MAX_LIGHTS*4),col:new Float32Array(_e.MAX_LIGHTS*3)});const t=this.figurePass,n=e.camera,o=jn(n),a=this.frame,i=this.pencil,r=this.paperAnchor,c=this.paper;t.size(e.width,e.height),this.frame={camera:n,env:e.env,focus:[0,0,0],time:e.time,timeTwos:Math.floor(e.time*12)/12,far:600,reveal:[0,0,0,0],lightPos:this.noLights.pos,lightCol:this.noLights.col,lightCount:0},this.pencil=new Float32Array([2*o[1]/e.height,4.6*e.dpr,Math.floor(e.time*6),e.dpr]),this.paperAnchor=new Float32Array(3),this.paper={a:{right:n.right,up:n.up,forward:n.forward},b:null,mix:0,fade:0,still:0,last:null};try{return t.render(this.entityPass,this.frame,e.batches,this.frameFn,this.vao)}finally{this.frame=a,this.pencil=i,this.paperAnchor=r,this.paper=c}}render(e){const t=this.gl,n=this.targets,o=this.size;this.holdPaper(e.camera,Math.max(0,e.time-(this.lastTime??e.time))),this.lastTime=e.time,this.frame=e,e.dpr=o.dpr;const a=jn(e.camera);this.pencil[0]=2*a[1]/o.height,this.pencil[1]=4.6*o.dpr,this.pencil[2]=Math.floor(e.time*6),this.pencil[3]=o.dpr,this.paperAnchor[0]=Math.floor(e.focus[0]/64)*64,this.paperAnchor[2]=Math.floor(e.focus[2]/64)*64,this.beginTiming(),t.bindVertexArray(this.vao),this.worldPass.render(n.scene,e,this.worldTex,this.frameFn,this.quality),this.post.runInk(n,this.frameFn),this.entityPass.render(n.ent,e,e.batches,this.frameFn),this.fxPass.render(n.ent,e,e.fx.data,e.fx.count,n.scene.textures[1]),t.bindVertexArray(this.vao),this.post.runFinal(n,e,o.width,o.height,this.minimap,this.frameFn),this.endTiming()}}const _n=[["weapon","Weapon"],["offhand","Off-hand"],["unit","Unit"],["mod1","Mod"],["mod2","Mod"],["visor","Visor"],["frame","Frame"],["grips","Grips"],["greaves","Greaves"],["boots","Boots"]],Fi={weapon:"Weapon",offhand:"Off-hand",unit:"Unit",mod:"Mod",visor:"Visor",frame:"Frame",grips:"Grips",greaves:"Greaves",boots:"Boots"},Ni=s=>s==="mod"?["mod1","mod2"]:[s],Ql={weapon:3,offhand:1.4,unit:1.4,mod:2,visor:1.5,frame:1.6,grips:1.5,greaves:1.3,boots:1.5},e0={weapon:1,frame:1,unit:1,offhand:.45,visor:.35,grips:.3,greaves:.3,boots:.3,mod:.3},dn=[{name:"Standard",color:"#e9eef8",affixes:[0,0],weight:58,worth:1},{name:"Tuned",color:"#a6dbff",affixes:[1,2],weight:29,worth:2},{name:"Rare",color:"#ffd84f",affixes:[3,4],weight:11,worth:4},{name:"Prime",color:"#ff9a4a",affixes:[4,4],weight:2,worth:9,power:!0},{name:"Relic",color:"#e3b0ff",affixes:[4,4],weight:0,worth:14}],Te={saber:{id:"saber",look:0,name:"Arc Saber",slot:"weapon",family:"blade",implicit:[{stat:"attack",op:"flat",value:6,grow:1.5}]},glaive:{id:"glaive",look:1,name:"Split Glaive",slot:"weapon",family:"blade",implicit:[{stat:"attack",op:"flat",value:8,grow:1.9},{stat:"attackSpeed",op:"inc",value:-.1}]},rifle:{id:"rifle",look:0,name:"Pulse Rifle",slot:"weapon",family:"rifle",implicit:[{stat:"attack",op:"flat",value:5,grow:1.3}]},carbine:{id:"carbine",look:1,name:"Needle Carbine",slot:"weapon",family:"rifle",implicit:[{stat:"attack",op:"flat",value:4,grow:1.1},{stat:"attackSpeed",op:"inc",value:.12}]},rod:{id:"rod",look:0,name:"Focus Rod",slot:"weapon",family:"wand",implicit:[{stat:"attack",op:"flat",value:4,grow:1},{stat:"power",op:"inc",value:.08,grow:.006}]},prism:{id:"prism",look:1,name:"Prism Staff",slot:"weapon",family:"wand",implicit:[{stat:"attack",op:"flat",value:3,grow:.8},{stat:"power",op:"inc",value:.14,grow:.008}]},scout:{id:"scout",look:0,name:"Scout Frame",slot:"frame",implicit:[{stat:"defense",op:"flat",value:2,grow:.6},{stat:"speed",op:"inc",value:.04}]},bulwark:{id:"bulwark",look:1,name:"Bulwark Frame",slot:"frame",implicit:[{stat:"defense",op:"flat",value:4,grow:1},{stat:"maxHp",op:"inc",value:.05}]},core:{id:"core",look:1,name:"Core Unit",slot:"unit",implicit:[{stat:"maxFocus",op:"flat",value:8,grow:1.4}]},drive:{id:"drive",look:2,name:"Drive Unit",slot:"unit",implicit:[{stat:"hpRegen",op:"flat",value:.5,grow:.12}]},ward:{id:"ward",look:0,name:"Arc Ward",slot:"offhand",family:"blade",implicit:[{stat:"defense",op:"flat",value:1.2,grow:.3},{stat:"maxHp",op:"inc",value:.03}]},cell:{id:"cell",look:1,name:"Charge Cell",slot:"offhand",family:"rifle",implicit:[{stat:"attackSpeed",op:"inc",value:.04},{stat:"crit",op:"flat",value:.01}]},lens:{id:"lens",look:2,name:"Focus Lens",slot:"offhand",family:"wand",implicit:[{stat:"power",op:"inc",value:.035,grow:.002},{stat:"focusRegen",op:"flat",value:.2,grow:.03}]},visor:{id:"visor",look:0,name:"Scout Visor",slot:"visor",implicit:[{stat:"crit",op:"flat",value:.01},{stat:"defense",op:"flat",value:.3,grow:.1}]},crest:{id:"crest",look:1,name:"Crest Helm",slot:"visor",implicit:[{stat:"defense",op:"flat",value:.9,grow:.22}]},grip:{id:"grip",look:0,name:"Grip Gloves",slot:"grips",implicit:[{stat:"attackSpeed",op:"inc",value:.025}]},gauntlet:{id:"gauntlet",look:1,name:"Power Gauntlets",slot:"grips",implicit:[{stat:"attack",op:"flat",value:.8,grow:.18},{stat:"defense",op:"flat",value:.3,grow:.1}]},greave:{id:"greave",look:0,name:"Shin Plates",slot:"greaves",implicit:[{stat:"defense",op:"flat",value:.9,grow:.22}]},trail:{id:"trail",look:0,name:"Trail Boots",slot:"boots",implicit:[{stat:"speed",op:"inc",value:.03}]},mag:{id:"mag",look:1,name:"Mag Boots",slot:"boots",implicit:[{stat:"defense",op:"flat",value:.6,grow:.15},{stat:"speed",op:"inc",value:.015}]},chip:{id:"chip",look:0,name:"Signal Chip",slot:"mod",implicit:[{stat:"crit",op:"flat",value:.008}]},coil:{id:"coil",look:1,name:"Coil Ring",slot:"mod",implicit:[{stat:"maxFocus",op:"flat",value:3,grow:.4}]}},No=[{id:"might",word:"Heavy",of:"Might",stat:"might",op:"flat",min:1,max:3,grow:.12},{id:"grace",word:"Deft",of:"Grace",stat:"grace",op:"flat",min:1,max:3,grow:.12},{id:"vigor",word:"Stout",of:"Vigor",stat:"vigor",op:"flat",min:1,max:3,grow:.12},{id:"mind",word:"Lucid",of:"Mind",stat:"mind",op:"flat",min:1,max:3,grow:.12},{id:"attack",word:"Honed",of:"Ruin",stat:"attack",op:"inc",min:.05,max:.12,grow:.01,slots:["weapon","unit","grips","mod"]},{id:"haste",word:"Swift",of:"Haste",stat:"attackSpeed",op:"inc",min:.04,max:.1,grow:.004,slots:["weapon","unit","grips","offhand","mod"]},{id:"crit",word:"Keen",of:"the Mark",stat:"crit",op:"flat",min:.02,max:.05,grow:.002},{id:"critdmg",word:"Cruel",of:"Severing",stat:"critDamage",op:"flat",min:.1,max:.25,grow:.01,slots:["weapon","unit","grips","visor","mod"]},{id:"power",word:"Bright",of:"Radiance",stat:"power",op:"inc",min:.05,max:.12,grow:.008,slots:["weapon","unit","offhand","visor","mod"]},{id:"health",word:"Hale",of:"the Bulwark",stat:"maxHp",op:"inc",min:.04,max:.1,grow:.004,slots:["frame","unit","offhand","visor","greaves"]},{id:"armor",word:"Plated",of:"Warding",stat:"defense",op:"flat",min:1,max:3,grow:.5,slots:["frame","unit","offhand","visor","grips","greaves","boots"]},{id:"focus",word:"Deep",of:"Reserve",stat:"maxFocus",op:"flat",min:5,max:12,grow:1,slots:["frame","unit","offhand","visor","mod"]},{id:"regen",word:"Mending",of:"Renewal",stat:"hpRegen",op:"flat",min:.3,max:.8,grow:.08,slots:["frame","unit","greaves","mod"]},{id:"flow",word:"Flowing",of:"Currents",stat:"focusRegen",op:"flat",min:.3,max:.8,grow:.06},{id:"speed",word:"Fleet",of:"the Wind",stat:"speed",op:"inc",min:.03,max:.06,grow:0,slots:["frame","boots","greaves"]},{id:"dodge",word:"Slippery",of:"Evasion",stat:"dodge",op:"flat",min:.02,max:.04,grow:.001,slots:["frame","unit","boots","greaves"]},{id:"find",word:"Lucky",of:"Fortune",stat:"find",op:"inc",min:.08,max:.2,grow:.005,slots:["unit","frame","visor","mod"]},{id:"leech",word:"Thirsting",of:"the Leech",stat:"lifeOnKill",op:"flat",min:2,max:5,grow:.5,slots:["weapon","grips","mod"]}],t0={might:["Might"],grace:["Grace"],vigor:["Vigor"],mind:["Mind"],attack:["Attack"],attackSpeed:["Attack speed","%"],crit:["Critical chance","%"],critDamage:["Critical damage","%"],power:["Technique power","%"],maxHp:["Health","%"],maxFocus:["Focus"],defense:["Armor"],hpRegen:["Health a second"],focusRegen:["Focus a second"],speed:["Movement speed","%"],dodge:["Dodge","%"],find:["Glint found","%"],lifeOnKill:["Health on a kill"]},he={quake:{id:"quake",name:"Warden’s Weight",slot:"weapon",from:"warden",mult:.7,radius:3,text:"The third blow of your chain shakes the ground: 70% of your attack to everything within 3 m of it."},thorn:{id:"thorn",name:"Stoneback",slot:"frame",from:"warden",mult:.8,reach:5,every:1.2,shove:6,text:"A creature that strikes you from close by is struck back for 80% of your attack and thrown off."},rot:{id:"rot",name:"Mother’s Bite",slot:"weapon",from:"matron",each:.18,stacks:3,seconds:4,text:"Your blows leave rot: 18% of your attack a second for 4 seconds, up to three deep."},spore:{id:"spore",name:"Sporecase",slot:"unit",from:"matron",mult:.9,radius:2.6,text:"A creature you fell bursts: 90% of your attack to the others within 2.6 m."},chill:{id:"chill",name:"Brinebite",slot:"weapon",from:"sentinel",slow:.65,seconds:2.5,more:.2,text:"Your blows slow what they strike by a third, and a slowed creature takes 20% more from you."},tide:{id:"tide",name:"Tidestep",slot:"greaves",from:"sentinel",cooldown:.5,text:"Gale Step costs no focus and is ready in half the time."},vigil:{id:"vigil",name:"Last Light",slot:"frame",from:"keeper",health:.3,seconds:3,text:"Once a contract, a blow that would fell you leaves you standing at 30% health, untouchable for 3 seconds."},wick:{id:"wick",name:"Wick",slot:"mod",from:"keeper",pace:.5,leaps:2,reach:6,text:"Your lumen strikes twice as often, and each of its bolts leaps to two more creatures."},meteor:{id:"meteor",name:"Meteor Heel",slot:"boots",from:"drifter",mult:1.6,radius:3.2,every:4,text:"Landing from a jump strikes the ground: 160% of your attack within 3.2 m. Ready every 4 seconds."},rush:{id:"rush",name:"Slipstream",slot:"unit",from:"drifter",speed:.2,seconds:3,text:"Felling a creature makes you a fifth faster, on your feet and with your weapon, for 3 seconds."}},Es=4,ts={mark:{name:"Survey mark",prop:"cairn",scale:1.35,reach:2.3,color:[226,176,52]},beacon:{name:"Survey beacon",prop:"console",scale:1,reach:2.6,color:[136,180,216]},crystal:{name:"Lit crystal",prop:"crystal",scale:1.9,reach:2.6,color:[70,150,150]},cargo:{name:"Lost cargo",prop:"crate",scale:1.5,reach:2.4,color:[224,112,128],guard:!0}},en={kindled:{name:"Kindled",desc:"You hit a fifth harder.",mods:[{stat:"attack",op:"more",value:.2}]},fleet:{name:"Fleet",desc:"You run a sixth faster.",mods:[{stat:"speed",op:"inc",value:.16}]},hale:{name:"Hale",desc:"A quarter more health.",mods:[{stat:"maxHp",op:"more",value:.25}]},keen:{name:"Keen",desc:"Critical hits come a tenth more often.",mods:[{stat:"crit",op:"flat",value:.1}]}},Os={cleave:{name:"Cleave",icon:"cleave",cooldown:4,focus:8,effect:"arc",reach:2.9,mult:1.7,scales:"attack",color:[.96,.75,.24],desc:"A wide cut through everything in front of you."},slam:{name:"Ground Slam",icon:"slam",cooldown:9,focus:14,effect:"ring",radius:3.6,mult:2,scales:"attack",shove:5,color:[.96,.75,.24],desc:"Strikes everything round you and throws it back."},bolt:{name:"Ember Bolt",icon:"bolt",cooldown:2.6,focus:10,effect:"bolt",speed:17,life:.85,radius:.5,mult:.9,flat:8,scales:"power",splash:1.6,splashMult:.5,color:[.94,.48,.2],desc:"A mote of fire that bursts on what it hits."},volley:{name:"Volley",icon:"volley",cooldown:5,focus:12,effect:"volley",shots:4,gap:.09,speed:28,life:.55,radius:.35,mult:.75,scales:"attack",color:[.55,.85,1],desc:"Four quick shots at the nearest creatures."},nova:{name:"Frost Ring",icon:"nova",cooldown:8,focus:16,effect:"ring",radius:4.4,mult:1.1,flat:6,scales:"power",slow:{factor:.45,seconds:3.5},color:[.55,.8,1],desc:"A ring of cold that hurts and slows everything close."},mend:{name:"Mend",icon:"mend",cooldown:14,focus:16,effect:"heal",portion:.34,seconds:3,desc:"Restores a third of your health over a few moments."},step:{name:"Gale Step",icon:"step",cooldown:6,focus:8,effect:"dash",speed:26,seconds:.22,invuln:.35,desc:"A short dash. Nothing can hurt you while you move."}};function Wn(s,e,t){let n=Math.imul(s|0,668265261)^Math.imul(e|0,374761393)^Math.imul(t|0,2654435761)|0;return n=Math.imul(n^n>>>15,2246822507),n=Math.imul(n^n>>>13,3266489909),(n^n>>>16)>>>0}const Lt=(s,e,t)=>Wn(s,e,t)/4294967296,ms=[1,-1,1,-1,1.4142,-1.4142,0,0],vs=[1,1,-1,-1,0,0,1.4142,-1.4142];function Vn(s,e,t=0){const n=Math.floor(s),o=Math.floor(e),a=s-n,i=e-o,r=a*a*a*(a*(a*6-15)+10),c=i*i*i*(i*(i*6-15)+10),d=Wn(n,o,t)&7,h=Wn(n+1,o,t)&7,u=Wn(n,o+1,t)&7,f=Wn(n+1,o+1,t)&7,p=ms[d]*a+vs[d]*i,m=ms[h]*(a-1)+vs[h]*i,v=ms[u]*a+vs[u]*(i-1),g=ms[f]*(a-1)+vs[f]*(i-1),x=p+(m-p)*r,b=v+(g-v)*r;return x+(b-x)*c}function gs(s,e,t,n=0,o=2.03,a=.5){let i=1,r=0,c=0;for(let d=0;d<t;d++)r+=i*Vn(s,e,n+d*131),c+=i,s*=o,e*=o,i*=a;return r/c}function kt(s){let e=s>>>0;return()=>{e=e+1831565813>>>0;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}let rs=kt(1);const ma=s=>{rs=kt(s>>>0)},se=()=>rs(),va=(s,e)=>s+rs()*(e-s),n0=s=>s[Math.floor(rs()*s.length)];function ga(s){let e=rs()*s.reduce((t,n)=>t+n[1],0);for(const t of s)if(e-=t[1],e<=0)return t[0];return s[s.length-1][0]}const s0=Object.keys(ot),Bo=(s,e)=>s.talents&&s.talents[e]||0,rt=(s,e)=>Bo(s,e)+(s.bonus&&s.bonus[e]||0);function Bi(s){const e=ze[s.cls].abilities,t=s0.filter(n=>{const o=ot[n];if(Bo(s,n)>=o.max)return!1;if(!o.skill)return!0;const a=e.indexOf(o.skill);return a>=0&&s.level>=Bs[a]});for(let n=t.length-1;n>0;n--){const o=Math.floor(se()*(n+1));[t[n],t[o]]=[t[o],t[n]]}return t.length?t.slice(0,3):null}function o0(s,e){return!s.picks||!s.offer||!s.offer.includes(e)?!1:(s.talents=s.talents||{},s.talents[e]=Bo(s,e)+1,s.picks--,s.offer=s.picks>0?Bi(s):null,s.offer||(s.picks=0),!0)}const Ze=(s,e)=>Math.atan2(-s,e),Ho=s=>[-Math.sin(s),Math.cos(s)];function Gt(s,e,t){const n={id:0,kind:s,archetype:e,x:0,y:0,z:0,yaw:0,scale:1,grow:1,radius:.4,height:1.4,move:0,walk:0,action:0,actionT:0,actionDur:.4,flash:0,shade:1,seed:Math.random(),colors:[[1,1,1],[1,1,1],[1,1,1]],extra:0,lift:0,ghost:!1,hover:!1,dead:!1,gone:!1,name:"",level:1,hp:1,maxHp:1};return Object.assign(n,t)}const lt=s=>s.map(e=>[e[0]/255,e[1]/255,e[2]/255]);class a0{list=[];byId=new Map;nextId=1;add(e){return e.id=this.nextId++,this.list.push(e),this.byId.set(e.id,e),e}sweep(){const e=this.list;let t=0;for(let n=0;n<e.length;n++){const o=e[n];o.gone?this.byId.delete(o.id):e[t++]=o}e.length=t}nearest(e,t,n,o,a){let i=null,r=o;for(const c of this.list){if(c.kind!==e||c.dead)continue;const d=c;if(a&&!a(d))continue;const h=Math.hypot(c.x-t,c.z-n);h<r&&(r=h,i=d)}return i}}const ba=new WeakMap;function ls(s){let e=ba.get(s);return e||(e={pushX:0,pushZ:0,provoked:!1,stun:0,roar:0,going:!1,spState:null},ba.set(s,e)),e}function Do(s,e,t){const n=ls(s);n.pushX=e,n.pushZ=t}function $s(s){ls(s).provoked=!0}function i0(s,e){const t=ls(s);t.stun=Math.max(t.stun,e)}const Yt=s=>s.elite?1.25:1,Pt=s=>(s.elite?.85:1)/Math.sqrt(s.quick||1),we={dx:0,dz:0,done:!1},ct={dx:0,dz:0,done:!0},Ie=(s,e)=>{s.action=1,s.actionDur=1e3,s.actionT=e},yt=s=>{s.action=0},En=(s,e,t)=>{s.yaw=Ze(e-s.x,t-s.z)},Wt=(s,e,t,n,o)=>{s.bus.emit("telegraph",{x:e,y:s.world.surface(e,t),z:t,r:n,t:o,fill:!0})},ya={summon:{begin(s,e,t){const n=t.windup*Pt(e);return Wt(s,e.x,e.z,2.2*e.scale,n),{t:0,wind:n}},update(s,e,t,n,o){const a=n.wind??t.windup;return n.t+=o,Ie(e,.3*Math.min(1,n.t/a)),n.t<a?we:(t.adds&&s.missions.reinforce(e,t.adds,t.count??2),yt(e),ct)}},barrage:{begin(s,e,t){const n=t.windup*Pt(e);return Wt(s,e.x,e.z,e.radius+1.2,n),{t:0,wind:n,sent:0,next:0}},update(s,e,t,n,o){const a=s.player,i=n.wind??t.windup,r=t.count??5,c=t.drop??1.2,d=t.gap??.4,h=t.r??2.5,u=t.mult??1.1;if(n.t+=o,n.t<i)return Ie(e,.38*(n.t/i)),we;const f=n.sent??0;if(Ie(e,.38+.1*Math.min(1,f/r)),f<r){if(n.next=(n.next??0)-o,n.next<=0){n.next=d,n.sent=f+1;const p=p0(a),m=.35*c*Math.min(1,n.sent/2);s.hazards.fall(e,a.x+p.vx*m,a.z+p.vz*m,h,c,u)}return we}return n.rest=(n.rest??0)+o,n.rest<.7?(Ie(e,.5+.5*n.rest/.7),we):(yt(e),ct)}},burrow:{begin(s,e,t){const n=t.windup*Pt(e);return s.bus.emit("charge:dust",{x:e.x,y:e.y,z:e.z}),{phase:0,t:0,wind:n,r:(t.r??2.4)*Yt(e),tx:e.x,tz:e.z}},update(s,e,t,n,o){const a=s.player,i=n.wind??t.windup,r=t.under??.95,c=n.r??2.4,d=t.speed??10,h=t.mult??1.6,u=t.recover??.9;if(n.t+=o,n.phase===0)return e.action=4,e.actionDur=1e3,e.actionT=Math.min(1,n.t/i),n.t>=i&&(n.phase=1,n.t=0,e.guard=!0,n.tx=a.x,n.tz=a.z,Wt(s,n.tx,n.tz,c,r+.3)),we;if(n.phase===1){e.action=4,e.actionT=1;const f=n.tx??e.x,p=n.tz??e.z,m=f-e.x,v=p-e.z,g=Math.hypot(m,v);return n.dust=(n.dust??0)-o,n.dust<=0&&(n.dust=.09,s.bus.emit("charge:dust",{x:e.x,y:e.y,z:e.z})),n.t>=r?(n.phase=2,n.t=0,e.x=f,e.z=p,we):g>.2?{dx:m/g*d,dz:v/g*d,done:!1}:we}if(n.phase===2){if(e.action=4,e.actionT=Math.max(0,1-n.t/.3),n.t>=.3){n.phase=3,n.t=0,e.guard=!1,s.bus.emit("slam",{x:e.x,y:e.y,z:e.z,r:c,heavy:!0});const f=Math.hypot(a.x-e.x,a.z-e.z);!a.dead&&f<c?s.combat.hurt(e,h,!1,!0):!a.dead&&f<c+3&&s.bus.emit("miss",{target:a,text:"Dodged"})}return we}return yt(e),n.t<u?we:ct}},lance:{begin(s,e,t){const n=s.player,o=Math.hypot(n.x-e.x,n.z-e.z)||1,a=(n.x-e.x)/o,i=(n.z-e.z)/o,r=(t.len??16)*Yt(e),c=t.w??1.5,d=t.windup*Pt(e);return En(e,n.x,n.z),s.bus.emit("telegraph",{lane:!0,x:e.x+a*r/2,y:e.y,z:e.z+i*r/2,dirx:a,dirz:i,len:r,w:c,t:d}),{t:0,wind:d,dirx:a,dirz:i,len:r,fired:!1}},update(s,e,t,n,o){const a=s.player,i=n.wind??t.windup,r=n.dirx??0,c=n.dirz??1,d=n.len??t.len??16,h=t.w??1.5,u=t.mult??1.9,f=t.recover??.7;if(n.t+=o,!n.fired){if(Ie(e,.45*Math.min(1,n.t/i)),n.t>=i){n.fired=!0,n.t=0;const p=(a.x-e.x)*r+(a.z-e.z)*c,m=Math.abs((a.x-e.x)*c-(a.z-e.z)*r);s.bus.emit("lance:fire",{x:e.x,y:e.y,z:e.z,dirx:r,dirz:c,len:d,w:h}),!a.dead&&p>0&&p<d&&m<h/2+a.radius?s.combat.hurt(e,u):!a.dead&&p>0&&p<d&&m<h/2+2.5&&s.bus.emit("miss",{target:a,text:"Dodged"})}return we}return Ie(e,.5+.5*Math.min(1,n.t/f)),n.t<f?we:(yt(e),ct)}},fuse:{begin(s,e,t){const n=t.windup*Pt(e),o=(t.r??2.5)*Yt(e);return Wt(s,e.x,e.z,o,n),{t:0,wind:n,r:o}},update(s,e,t,n,o){const a=s.player,i=n.wind??t.windup,r=n.r??2.5,c=t.mult??1.7;if(n.t+=o,Ie(e,Math.min(1,n.t/i)),n.t<i)return we;s.bus.emit("slam",{x:e.x,y:e.y,z:e.z,r,heavy:!0});const d=Math.hypot(a.x-e.x,a.z-e.z);return!a.dead&&d<r?s.combat.hurt(e,c):!a.dead&&d<r+2.5&&s.bus.emit("miss",{target:a,text:"Dodged"}),e.dead=!0,e.deathT=0,a.target===e&&(a.target=null),s.bus.emit("monster:died",e),ct}},leap:{begin(s,e,t){const n=s.player,o=(t.r??1.3)*Yt(e),a=t.windup*Pt(e),i=t.air??.42;return En(e,n.x,n.z),Wt(s,n.x,n.z,o,a+i),{phase:0,t:0,wind:a,r:o,tx:n.x,tz:n.z,vx:(n.x-e.x)/i,vz:(n.z-e.z)/i}},update(s,e,t,n,o){const a=n.wind??t.windup,i=t.air??.42,r=n.r??1.3,c=t.mult??1.3;if(n.t+=o,n.phase===0)return Ie(e,.18*Math.min(1,n.t/a)),n.t>=a&&(n.phase=1,n.t=0),we;if(n.phase===1){const d=Math.min(1,n.t/i);return e.lift=Math.sin(d*Math.PI)*1.5,Ie(e,.3+.2*d),d<1?{dx:n.vx??0,dz:n.vz??0,done:!1}:(e.lift=0,s.bus.emit("slam",{x:e.x,y:e.y,z:e.z,r}),Math.hypot(s.player.x-e.x,s.player.z-e.z)<r+.2?s.combat.hurt(e,c):s.bus.emit("miss",{target:s.player,text:"Dodged"}),n.phase=2,n.t=0,we)}return Ie(e,.5+.5*Math.min(1,n.t/.35)),n.t<.35?we:(yt(e),ct)}},charge:{begin(s,e,t){const n=s.player,o=Math.hypot(n.x-e.x,n.z-e.z)||1,a=(n.x-e.x)/o,i=(n.z-e.z)/o,r=(t.dist??11)*Yt(e),c=e.radius*2+.7,d=t.windup*Pt(e);return En(e,n.x,n.z),s.bus.emit("telegraph",{lane:!0,x:e.x+a*r/2,y:e.y,z:e.z+i*r/2,dirx:a,dirz:i,len:r,w:c,t:d}),{phase:0,t:0,wind:d,dirx:a,dirz:i,left:r,lx:e.x,lz:e.z,stuck:0}},update(s,e,t,n,o){const a=s.player,i=n.wind??t.windup,r=t.speed??13,c=n.dirx??0,d=n.dirz??1,h=t.mult??1.9,u=t.winded??1.4;if(n.t+=o,n.phase===0)return Ie(e,.16*Math.min(1,n.t/i)),n.t>=i&&(n.phase=1,n.t=0,n.lx=e.x,n.lz=e.z),we;if(n.phase===1){Ie(e,.5);const f=Math.hypot(e.x-(n.lx??e.x),e.z-(n.lz??e.z));return n.t>o*1.5&&f<r*o*.35?n.stuck=(n.stuck??0)+o:n.stuck=0,n.lx=e.x,n.lz=e.z,n.left=(n.left??0)-r*o,!a.dead&&Math.hypot(a.x-e.x,a.z-e.z)<e.radius+a.radius+.3?(s.combat.hurt(e,h),n.phase=2,n.t=0,we):n.left<=0||n.stuck>.08?(s.bus.emit("miss",{target:e,text:"Winded"}),i0(e,u),yt(e),ct):(n.dust=(n.dust??0)-o,n.dust<=0&&(n.dust=.07,s.bus.emit("charge:dust",{x:e.x,y:e.y,z:e.z})),{dx:c*r,dz:d*r,done:!1})}return Ie(e,.5+.5*Math.min(1,n.t/.4)),n.t<.4?we:(yt(e),ct)}},cloud:{begin(s,e,t){const n=(t.r??2.5)*Yt(e),o=t.windup*Pt(e);return Wt(s,e.x,e.z,n,o),{t:0,wind:o,r:n,out:!1}},update(s,e,t,n,o){const a=n.wind??t.windup,i=n.r??2.5;return n.t+=o,n.out?(Ie(e,.5+.5*Math.min(1,n.t/.4)),n.t<.4?we:(yt(e),ct)):(Ie(e,.45*Math.min(1,n.t/a)),n.t>=a&&(n.out=!0,n.t=0,s.hazards.cloud(e,i,t.life??4.2,t.mult??.45,t.tick??.55)),we)}},shot:{begin(s,e,t){const n=t.windup*Pt(e);return En(e,s.player.x,s.player.z),s.bus.emit("telegraph",{x:e.x,y:e.y+.05,z:e.z,r:.9,t:n}),{t:0,wind:n,fired:!1}},update(s,e,t,n,o){const a=s.player,i=n.wind??t.windup;if(n.t+=o,!n.fired){if(En(e,a.x,a.z),Ie(e,.4*Math.min(1,n.t/i)),n.t>=i){n.fired=!0,n.t=0;const r=Math.hypot(a.x-e.x,a.z-e.z)||1;s.hazards.shot(e,(a.x-e.x)/r,(a.z-e.z)/r,t)}return we}return Ie(e,.5+.5*Math.min(1,n.t/.3)),n.t<.3?we:(yt(e),ct)}},slam:{begin(s,e,t){const n=(t.r??3.3)*Yt(e),o=t.windup*Pt(e);return Wt(s,e.x,e.z,n,o),{t:0,wind:o,r:n,down:!1}},update(s,e,t,n,o){const a=s.player,i=n.wind??t.windup,r=n.r??3.3,c=t.mult??1.7,d=t.recover??1;if(n.t+=o,!n.down){if(Ie(e,.4*Math.min(1,n.t/i)),n.t>=i){n.down=!0,n.t=0,s.bus.emit("slam",{x:e.x,y:e.y,z:e.z,r,heavy:!0});const h=Math.hypot(a.x-e.x,a.z-e.z);!a.dead&&h<r?s.combat.hurt(e,c,!1,!0):!a.dead&&h<r+3&&s.bus.emit("miss",{target:a,text:"Dodged"})}return we}return Ie(e,Math.min(1,.45+.55*n.t/d)),n.t<d?we:(yt(e),ct)}},guard:{begin(s,e,t){const n=t.hold??1.5;return e.guard=!0,s.bus.emit("miss",{target:e,text:"Guarding"}),s.bus.emit("guard",{entity:e,t:n}),{t:0,warned:!1,r:(t.r??2.3)*Yt(e),snapped:!1}},update(s,e,t,n,o){const a=s.player,i=t.hold??1.5,r=n.r??2.3,c=t.mult??1.4;return n.t+=o,n.snapped?(Ie(e,.5+.5*Math.min(1,n.t/.45)),n.t<.45?we:(yt(e),ct)):(e.action=3,e.actionDur=1e3,e.actionT=.2,!n.warned&&n.t>=i-t.windup&&(n.warned=!0,Wt(s,e.x,e.z,r,t.windup)),n.t>=i&&(n.snapped=!0,n.t=0,e.guard=!1,s.bus.emit("slam",{x:e.x,y:e.y,z:e.z,r}),!a.dead&&Math.hypot(a.x-e.x,a.z-e.z)<r&&s.combat.hurt(e,c,!1,!0)),we)}}},Hi=new WeakMap,r0=[.42,.8,1];function Di(s,e,t){const n=e;t&&Hi.set(n,t),s.launch(n)}const xo=(s,e)=>e.scales==="power"?s.power:1,l0={arc(s,e,t,n,o){e.yaw=Ze(n.dirX,n.dirZ),e.action=1,e.actionT=0,e.actionDur=.46,e.attackCd=.5,e.chain=0,e.pending=null;const a=(t.reach??2.9)*(1+.2*rt(e.sheet,"wide")),i=(t.mult??1.7)*(1+.25*rt(e.sheet,"rend"));o.later(.46*.45,()=>{s.bus.emit("swing",{entity:e,radius:a*1.03,color:e.family==="blade"?r0:t.color,heavy:!0}),s.bus.emit("feel",{shake:.35});for(const r of s.monsters){if(r.dead)continue;const c=r.x-e.x,d=r.z-e.z,h=Math.hypot(c,d);h>a+r.radius||h>.6&&(c*n.dirX+d*n.dirZ)/h<-.25||s.combat.strike(r,i*xo(e,t))}})},ring(s,e,t){e.action=2,e.actionT=0,e.actionDur=.5;const n=t.radius??3.6,o=xo(e,t);s.bus.emit("slam",{x:e.x,y:e.y,z:e.z,r:n,heavy:!0}),s.bus.emit("feel",{shake:.4});for(const a of s.monsters){if(a.dead)continue;const i=a.x-e.x,r=a.z-e.z,c=Math.hypot(i,r)||1;c>n+a.radius||(s.combat.strike(a,(t.mult??1)*o,(t.flat||0)*o),t.shove&&!a.dead&&Do(a,i/c*t.shove,r/c*t.shove),t.slow&&!a.dead&&(a.slow=t.slow.factor,a.slowT=t.slow.seconds))}},bolt(s,e,t,n,o){e.yaw=Ze(n.dirX,n.dirZ),e.action=2,e.actionT=0,e.actionDur=.36;const a=t===Os.bolt&&rt(e.sheet,"twin")?[-.13,.13]:[0];for(const i of a){const r=n.dirX*Math.cos(i)-n.dirZ*Math.sin(i),c=n.dirZ*Math.cos(i)+n.dirX*Math.sin(i);o.fire(e,r,c,t)}},volley(s,e,t,n,o){const a=t.shots??4,i=t.gap??.09;e.yaw=Ze(n.dirX,n.dirZ),e.action=2,e.actionT=0,e.actionDur=a*i+.2;for(let r=0;r<a;r++)o.later(r*i,()=>{const c=s.entities.nearest("monster",e.x,e.z,13,u=>!u.dead);let d=n.dirX,h=n.dirZ;if(c){const u=Math.hypot(c.x-e.x,c.z-e.z)||1;d=(c.x-e.x)/u,h=(c.z-e.z)/u,e.yaw=Ze(d,h)}o.fire(e,d,h,t,!0)})},heal(s,e,t){const n=t.seconds??3,o=t.portion??.34,a=e.maxHp*o*e.power*(1+.33*rt(e.sheet,"roots"));e.action=2,e.actionT=0,e.actionDur=.5,e.mend={t:n,rate:a/n},s.bus.emit("heal",{entity:e,amount:Math.round(a)})},dash(s,e,t,n){const o=t.speed??26,a=t.seconds??.22,i=t.invuln??.35;e.yaw=Ze(n.dirX,n.dirZ);const r=1+.25*rt(e.sheet,"stride"),c=rt(e.sheet,"gust")>0;if(e.dash={dirx:n.dirX,dirz:n.dirZ,speed:o,t:a*r,hit:new Set},e.action=4,e.actionT=0,e.actionDur=(a+.02)*r,c){const d=o*a*r;for(const h of s.monsters){if(h.dead)continue;const u=h.x-e.x,f=h.z-e.z,p=u*n.dirX+f*n.dirZ;p>-.5&&p<d+.8&&Math.abs(u*n.dirZ-f*n.dirX)<1.3+h.radius&&(e.dash.hit.add(h.id),s.combat.strike(h,1.2))}}e.invuln=Math.max(e.invuln,i),e.moveTo=null,s.bus.emit("dash",{x:e.x,y:e.y,z:e.z})}};class c0{game;cooldowns=[0,0,0,0];shots=[];queue=[];cls="";bar=[];constructor(e){this.game=e,e.bus.on("zone",()=>{for(const t of this.shots)t.gone=!0;this.shots.length=0,this.queue.length=0})}list(){const e=this.game.player.sheet.cls;return e!==this.cls&&(this.cls=e,this.bar=ze[e].abilities.map((t,n)=>{const o=Os[t];return{id:t,name:o.name,icon:o.icon,cooldown:o.cooldown,focus:o.focus,desc:o.desc,effect:o.effect,key:String(n+1),unlock:Bs[n]}})),this.bar}unlocked(e){return this.game.player.sheet.level>=Bs[e]}cast(e){const t=this.game,n=t.player,o=this.list()[e];if(!o||n.dead||n.dash)return!1;if(!this.unlocked(e))return t.bus.emit("log",{text:`${o.name} opens at level ${o.unlock}.`}),!1;if(this.cooldowns[e]>0)return!1;const a=o.id==="step"&&t.relics.has("tide"),i=Math.max(.4,1-.12*rt(n.sheet,"thrift")),r=a?0:o.focus*i;if(n.focus<r)return t.bus.emit("log",{text:"Not enough focus."}),t.bus.emit("deny",{}),!1;const c=this.aim();return n.focus-=r,this.cooldowns[e]=o.cooldown*(o.id==="bolt"?1-.2*rt(n.sheet,"tinder"):1)*(a?he.tide.cooldown??.5:1),n.calm=Math.min(n.calm,2),l0[o.effect](t,n,Os[o.id],c,this),t.bus.emit("skill",{id:o.id,index:e}),!0}aim(){const e=this.game,t=e.player;let n,o;const a=t.target&&t.target.kind==="monster"&&!t.target.dead?t.target:null;if(a)n=a.x,o=a.z;else if(t.intent.aim)n=t.intent.aim.x,o=t.intent.aim.z;else{const d=e.entities.nearest("monster",t.x,t.z,11);d&&(n=d.x,o=d.z)}let i=(n??t.x)-t.x,r=(o??t.z)-t.z,c=Math.hypot(i,r);return c<.2&&([i,r]=Ho(t.yaw),c=1),{dirX:i/c,dirZ:r/c}}later(e,t){this.queue.push({t:e,fn:t})}fire(e,t,n,o,a=!1){const i=xo(e,o),r=o.speed??17,c=(o.mult??1)*i,d=(o.flat||0)*i;this.launch({x:e.x+t*.6,y:e.y+.95,z:e.z+n*.6,vx:t*r,vy:0,vz:n*r,life:o.life??.85,radius:o.radius??.4,color:o.color??[1,1,1],size:.55,mult:c,flat:d,splash:o.splash||0,splashMult:(o.splashMult||0)*i,quiet:a})}launch(e){const t=e;t.gone=!1,this.shots.push(t),this.game.bus.emit("shot:launch",t)}update(e){const t=this.game,n=t.player;for(let a=0;a<this.cooldowns.length;a++)this.cooldowns[a]=Math.max(0,this.cooldowns[a]-e);if(n.potionCd=Math.max(0,n.potionCd-e),n.mend&&(n.hp=Math.min(n.maxHp,n.hp+n.mend.rate*e),n.mend.t-=e,n.mend.t<=0&&(n.mend=null)),this.queue.length){const a=[];if(this.queue=this.queue.filter(i=>(i.t-=e,i.t>0?!0:(a.push(i),!1))),!n.dead)for(const i of a)i.fn()}let o=0;for(const a of this.shots){a.x+=a.vx*e,a.y+=a.vy*e,a.z+=a.vz*e,a.life-=e;const i=t.world.surface(a.x,a.z);let r=null,c=a.life<=0||i>a.y-.1;for(const d of t.monsters)if(!d.dead&&Math.hypot(d.x-a.x,d.z-a.z)<d.radius+a.radius){r=d;break}if(!r&&!c&&t.world.forEachProp(a.x,a.z,1,d=>{d.def.collide>0&&Math.hypot(d.x-a.x,d.z-a.z)<d.def.collide*d.scale+.2&&a.y<d.y+d.def.height*d.scale&&(c=!0)}),r){const d=Hi.get(a);if(d?d(r):t.combat.strike(r,a.mult,a.flat),a.splash)for(const h of t.monsters)h!==r&&!h.dead&&Math.hypot(h.x-a.x,h.z-a.z)<a.splash+h.radius&&t.combat.strike(h,a.splashMult,0,!1);c=!0}if(c){a.gone=!0,t.bus.emit(a.quiet?"shot:hit":"bolt:hit",{x:a.x,y:a.y,z:a.z});continue}this.shots[o++]=a}this.shots.length=o}}const d0=.42,h0=.45,f0=[.42,.8,1],u0=10.4,Qs={x:0,z:0},wo=new WeakMap;function p0(s){return wo.get(s)??{vx:0,vz:0}}class m0{game;stuck=0;safeT=0;hasSafe=!1;constructor(e){this.game=e,e.bus.on("zone",()=>{const t=e.player;t.aloft=!1,t.air=0,t.vy=0,t.lift=0,t.safeX=e.world.spec.start.x,t.safeZ=e.world.spec.start.z,this.hasSafe=!1,this.safeT=0})}update(e){const t=this.game,n=t.player,o=t.world,a=n.intent;if(n.flash=Math.max(0,n.flash-e*5),n.invuln=Math.max(0,n.invuln-e),n.dead){this.updateDead(e);return}if(n.action){const M=n.actionT;if(n.actionT+=e/n.actionDur,n.pending&&M<n.pending.t&&n.actionT>=n.pending.t){const R=n.pending;n.pending=null,this.resolveSwing(R)}n.actionT>=1&&(n.action=0,n.pending=null)}n.attackCd-=e,n.chainT=(n.chainT||0)-e;const i=Ut[n.family]||Ut.blade,r=i.range,c=n.sheet.equip,d=M=>{const R=c[M];return R&&Te[R.base]&&Te[R.base].look||0};n.kit=i.kit+.1*(n.action===1&&n.chain||0)+.5*d("weapon"),n.extra=(n.build??Math.round(n.extra))+.1*d("frame")+.01*d("unit");const h=M=>{const R=c[M];return R&&Te[R.base]?1+(Te[R.base].look||0):0};n.wears=h("offhand")+4*(h("grips")+3*h("boots"));const u=n.rush>0?1+(he.rush.speed??.2):1,f=an.PLAYER_SPEED*(n.speedMul||1)*u;let p=0,m=0,v=0;const g=n.target&&!n.target.gone&&!n.target.dead?n.target:n.target=null;if(n.dash)n.dash.t-=e,p=n.dash.dirx*n.dash.speed,m=n.dash.dirz*n.dash.speed,v=1,n.dash.t<=0&&(n.dash=null);else if(a.moveX||a.moveZ)p=a.moveX*f,m=a.moveZ*f,v=1,n.moveTo=null,n.pursue=!1;else if(g&&n.pursue){const M=Math.hypot(g.x-n.x,g.z-n.z),R=g.kind==="site"?ts[g.site].reach:.7,E=g.kind==="monster"?r+g.radius-.25:g.kind==="npc"?2.3:g.kind==="site"?R-.5:.7;M>E&&(p=(g.x-n.x)/M*f,m=(g.z-n.z)/M*f,v=1)}else if(n.moveTo){const M=Math.hypot(n.moveTo.x-n.x,n.moveTo.z-n.z);if(M<.25)n.moveTo=null;else{const R=Math.min(f,M/e);p=(n.moveTo.x-n.x)/M*R,m=(n.moveTo.z-n.z)/M*R,v=1}}n.action===1&&n.actionT<.55&&!n.dash&&(p*=.25,m*=.25),a.jump&&(a.jump=!1,!n.aloft&&!n.dash&&(n.aloft=!0,n.air=0,n.vy=an.JUMP_SPEED,n.action||(n.action=5,n.actionT=0,n.actionDur=2*an.JUMP_SPEED/(an.GRAVITY*(o.biome().gravity||1))),t.bus.emit("jump",{entity:n,x:n.x,y:n.y,z:n.z})));const x=!!n.aloft,b=n.x,_=n.z;if(v){o.moveCircle(n.x,n.z,p*e,m*e,n.radius,Qs,x?n.y+n.air:void 0),n.x=Qs.x,n.z=Qs.z;const M=Math.hypot(n.x-b,n.z-_);if(M<Math.hypot(p,m)*e*.25?(this.stuck+=e,this.stuck>.6&&(n.moveTo=null,this.stuck=0)):this.stuck=0,M>1e-4&&!(n.action===1&&g)&&(n.yaw=Qt(n.yaw,Ze(n.x-b,n.z-_),16,e)),!n.dash&&!x){const R=M/Math.max(e,1e-4),E=n.walk;n.walk+=M*Math.min(4.5,Math.max(1.9,u0/Math.max(R,.1))),Math.floor(E/Math.PI)!==Math.floor(n.walk/Math.PI)&&t.bus.emit("step",{entity:n})}}const z=1/Math.max(e,1e-4),C=wo.get(n),k=(n.x-b)*z,P=(n.z-_)*z;C?(C.vx=k,C.vz=P):wo.set(n,{vx:k,vz:P});const w=Math.hypot(n.x-b,n.z-_)*z;if(n.move=je(n.move,Math.min(1,w/(an.PLAYER_SPEED*.8)),14,e),n.aloft){n.vy-=an.GRAVITY*(o.biome().gravity||1)*e,n.air+=n.vy*e;const M=n.y+n.air,R=o.nav.inside(n.x,n.z,.05)?o.surface(n.x,n.z):-1e3;n.vy<=0&&M<=R?(n.y=R,n.aloft=!1,n.air=0,n.vy=0,n.lift=0,n.action===5&&(n.action=0),t.bus.emit("landed",{entity:n,x:n.x,y:n.y,z:n.z})):n.air<-5||M<.8?this.fell():n.lift=n.air}else{const M=o.surface(n.x,n.z);M<n.y-.7?(n.aloft=!0,n.air=n.y-M,n.y=M,n.vy=0,n.lift=n.air):n.y=je(n.y,M,22,e),(this.safeT-=e)<=0&&o.nav.inside(n.x,n.z,1)&&(this.safeT=.25,n.safeX=n.x,n.safeZ=n.z,this.hasSafe=!0)}if(g){const M=Math.hypot(g.x-n.x,g.z-n.z);g.kind==="monster"?M<=r+g.radius+.15&&(n.pursue||!v)&&(n.yaw=Qt(n.yaw,Ze(g.x-n.x,g.z-n.z),18,e),n.attackCd<=0&&!n.action&&this.swing(g)):g.kind==="npc"&&M<=2.6?(n.yaw=Ze(g.x-n.x,g.z-n.z),g.yaw=Ze(n.x-g.x,n.z-g.z),n.target=null,n.pursue=!1,t.bus.emit("npc:talk",g)):(g.kind==="drop"&&M<=1||g.kind==="site"&&M<=ts[g.site].reach)&&(n.target=null,n.pursue=!1)}n.calm+=e;const y=n.calm>5?4:1;n.hp=Math.min(n.maxHp,n.hp+n.hpRegen*y*e),n.focus=Math.min(n.maxFocus,n.focus+n.focusRegen*(n.calm>5?1.6:1)*e),n.safe=!t.missions.active}fell(){const e=this.game,t=e.player,n=e.world,o=this.hasSafe?t.safeX:n.spec.start.x,a=this.hasSafe?t.safeZ:n.spec.start.z,i=Math.round(t.maxHp*.12);t.x=o,t.z=a,t.aloft=!1,t.air=0,t.vy=0,t.lift=0,t.action=0,t.dash=null,t.moveTo=null,t.pursue=!1,t.y=n.surface(t.x,t.z),t.hp=Math.max(1,t.hp-i),t.invuln=Math.max(t.invuln,1.2),e.bus.emit("fell",{entity:t}),e.bus.emit("feel",{hurt:.8}),e.bus.emit("log",{text:`You slip into the cloud and are hauled back: ${i} health.`})}swing(e){const t=this.game.player,n=Ut[t.family]||Ut.blade;t.chain=t.chainT>0?((t.chain||0)+1)%3:0;const o=t.chain===2,a=t.rush>0?1+(he.rush.speed??.2):1;t.attackCd=1/(t.attackSpeed*a)*(o?1.25:1),t.chainT=t.attackCd+.55,t.calm=0,n.shot?(t.action=2,t.actionT=0,t.actionDur=.3):(t.action=1,t.actionT=0,t.actionDur=d0*(o?1.2:1)),t.pending={t:h0,target:e,chain:t.chain}}resolveSwing(e){const t=this.game,n=t.player,o=Ut[n.family]||Ut.blade,a=o.chain[e.chain]??1,i=e.chain===2,r=e.target;if(!o.shot){t.bus.emit("swing",{entity:n,radius:i?2.35:1.75,heavy:i,color:n.family==="blade"?f0:void 0});const f=o.range+(i?.45:0);if(i){const[p,m]=Ho(n.yaw);for(const g of t.monsters){if(g.dead)continue;const x=g.x-n.x,b=g.z-n.z,_=Math.hypot(x,b);_<=f+g.radius+.7&&(_<.6||(x*p+b*m)/_>.15)&&t.combat.strike(g,a)}const v=!!r&&Math.hypot(r.x-n.x,r.z-n.z)<=f+r.radius+.7;t.relics.quake(v&&r?r.x:n.x+p*1.4,n.y,v&&r?r.z:n.z+m*1.4)}else r&&!r.dead&&Math.hypot(r.x-n.x,r.z-n.z)<=f+r.radius+.7&&t.combat.strike(r,a);return}if(!r||r.dead)return;const c=r.x-n.x,d=r.z-n.z,h=Math.hypot(c,d)||1,u=o.shot;t.bus.emit("shoot",{entity:n,family:n.family,heavy:i}),Di(t.skills,{x:n.x+c/h*.6,y:n.y+.95,z:n.z+d/h*.6,vx:c/h*u.speed,vy:0,vz:d/h*u.speed,life:u.life,radius:u.radius,color:u.color,size:u.size*(i?1.35:1),mult:a,flat:0,splash:u.splash&&i?u.splash:0,splashMult:.6,quiet:!0},f=>{t.combat.strike(f,a),i&&t.relics.quake(f.x,f.y,f.z)})}updateDead(e){const t=this.game,n=t.player;n.grow=Math.max(0,n.grow-e*3),n.move=0,n.respawnT-=e,t.bus.emit("fade",n.respawnT<1.2?0:1),n.respawnT<=0&&(n.hp=n.maxHp,n.focus=n.maxFocus*.5,n.dead=!1,n.grow=1,n.invuln=2,n.calm=10,t.bus.emit("fade",1),t.bus.emit("player:respawn"))}}const ko=[{id:"ember",name:"Ember",gives:"attack",cls:"c-vanguard"},{id:"shell",name:"Shell",gives:"armor and health",cls:"c-ranger"},{id:"tide",name:"Tide",gives:"technique and focus",cls:"c-adept"}],cs={wisp_ember:{ember:3},hog_bristle:{ember:2,shell:1},snap_claw:{ember:1,shell:2},crag_shard:{shell:3},sprout_leaf:{tide:2,shell:1},puff_spore:{tide:3},tonic:{shell:1},draught:{tide:1}},zo=[1,5,12],ns=20,Tn=8,zt={mote:{name:"Mote",stage:0,temper:"any",shape:0,colors:[[136,180,216],[248,232,190],[84,108,156]],blurb:"Newly lit. Feed it and it grows.",burst:{kind:"ring",name:"Spark",r:3.4,mult:1.6,text:"A ring of light hits everything close."}},kindle:{name:"Kindle",stage:1,temper:"ember",shape:1,colors:[[224,92,70],[248,214,150],[226,176,52]],blurb:"A flame in a shell.",burst:{kind:"volley",name:"Shardfall",count:4,mult:1.3,text:"Four shards, each at a creature near you."}},carapace:{name:"Carapace",stage:1,temper:"shell",shape:2,colors:[[226,176,52],[248,232,190],[150,142,132]],blurb:"Two half shells round a light.",burst:{kind:"ward",name:"Shut tight",seconds:3,text:"Nothing can hurt you for three seconds."}},ripple:{name:"Ripple",stage:1,temper:"tide",shape:3,colors:[[70,150,150],[214,240,236],[136,180,216]],blurb:"A ring trailing two ribbons.",burst:{kind:"mend",name:"Wash",heal:.4,focus:.5,text:"Mends two fifths of your health and half your focus."}},pyre:{name:"Pyre",stage:2,temper:"ember",shape:4,colors:[[214,70,52],[255,226,160],[240,158,74]],blurb:"A crystal that burns from inside.",burst:{kind:"ring",name:"Pyre",r:6.5,mult:3.2,text:"A wide ring of fire hits everything hard."}},bastion:{name:"Bastion",stage:2,temper:"shell",shape:5,colors:[[232,164,48],[255,240,200],[122,62,44]],blurb:"A plate that turns to face what comes.",burst:{kind:"ward",name:"Hold the line",seconds:5,heal:.2,text:"Five seconds unhurt, and a fifth of your health."}},current:{name:"Current",stage:2,temper:"tide",shape:6,colors:[[70,150,150],[220,250,245],[84,108,156]],blurb:"Two rings, one inside the other.",burst:{kind:"mend",name:"Spring tide",heal:.7,focus:1,text:"Mends most of your health and all your focus."}},prism:{name:"Prism",stage:2,temper:"even",shape:7,colors:[[168,150,220],[255,255,255],[224,112,128]],blurb:"A three-sided crystal: no temper leads.",burst:{kind:"all",name:"Spectrum",count:3,mult:1.2,seconds:2,heal:.25,focus:.3,text:"Three shards, two seconds unhurt, a quarter of your health."}}},v0=["ember","shell","tide"],g0=Object.keys(zt),b0=()=>({kind:"mote",ember:0,shell:0,tide:0,charge:0}),ds=s=>s.ember+s.shell+s.tide,Sn=s=>Math.min(ns,1+Math.floor(ds(s)/Tn)),Oi=s=>{const e=Sn(s);return e>=zo[2]?2:e>=zo[1]?1:0},y0=s=>ds(s)>=(ns-1)*Tn,x0=s=>Sn(s)>=ns?0:Tn-ds(s)%Tn;function w0(s){const e=Oi(s),t=ds(s);if(!e)return"mote";const n=v0.reduce((a,i)=>s[i]>s[a]?i:a),o=e===2&&s[n]<t*.45?"even":n;return g0.find(a=>zt[a].stage===e&&zt[a].temper===o)??"mote"}function $i(s){return[{stat:"attack",op:"inc",value:.0016*s.ember},{stat:"defense",op:"flat",value:.1*s.shell},{stat:"maxHp",op:"inc",value:.0012*s.shell},{stat:"power",op:"inc",value:.0016*s.tide},{stat:"focusRegen",op:"inc",value:.002*s.tide}]}let ss=1;const Ui=Object.keys(Te),k0=Object.keys(ot),z0=Object.entries(Ql),Us=Object.fromEntries(No.map(s=>[s.id,s])),M0=[1,2,5,12,30],_0=[1,1.2,1.6,2.2,3],T0=2,kn=s=>Te[s.base];function S0(s){const e=[...s.gear,...Object.values(s.equip)];for(const t of e)t&&t.uid>=ss&&(ss=t.uid+1)}const Ki=s=>dn[s.rarity],Gi=s=>Ni(Te[s.base].slot);function Yi(s,e){const t=Gi(e);if(t.length===1)return t[0];const n=t.find(a=>!s.equip[a]);if(n)return n;const o=a=>a?a.rarity*100+a.ilvl:-1;return t.reduce((a,i)=>o(s.equip[i])<o(s.equip[a])?i:a)}const P0=(s,e)=>s.op==="inc"||s.max<1?Math.round(e*1e3)/1e3:Math.round(e*10)/10>=3?Math.round(e):Math.round(e*10)/10;function Zt(s={}){let e=s;e.relic&&he[e.relic]&&(e={...e,slot:he[e.relic].slot,family:e.family||(e.cls?ze[e.cls].family:null),rarity:Es});const t=Math.max(1,Math.round(e.ilvl||1)),n=e.luck||0,o=e.family||(e.cls&&se()<.75?ze[e.cls].family:null),a=Ui.filter(b=>{const _=Te[b];return(!e.slot||_.slot===e.slot)&&(!o||!_.family||_.family===o)}),i=e.slot||ga(z0),r=a.filter(b=>Te[b].slot===i),c=r[Math.floor(se()*r.length)]||a[0];let d=ga(dn.map((b,_)=>[_,b.weight*(_?1+n*_*1.4:1)]));e.rarity!==void 0&&(d=Math.max(d,e.rarity));const h=dn[d],u=e0[Te[c].slot]??1,f=u<1,p=Math.max(d?1:0,h.affixes[0]+Math.floor(se()*(h.affixes[1]-h.affixes[0]+1))-(f?1:0)),m=No.filter(b=>!b.slots||b.slots.includes(Te[c].slot)),v=[];for(;v.length<p&&m.length;){const b=m.splice(Math.floor(se()*m.length),1)[0];v.push({id:b.id,value:P0(b,(va(b.min,b.max)+b.grow*(t-1)*va(.7,1))*u)})}let g=null;if(h.power){const b=k0.filter(z=>{const C=ot[z];return!C.skill||!e.cls||ze[e.cls].abilities.includes(C.skill)}),_=b[Math.floor(se()*b.length)];g={id:_,ranks:ot[_].max>1&&se()<.4?2:1}}const x={uid:ss++,base:c,rarity:d,ilvl:t,affixes:v,power:g};return e.relic&&he[e.relic]&&(x.relic=e.relic),x}function Wi(s){const e=[];for(const t of Te[s.base].implicit)e.push({stat:t.stat,op:t.op,value:t.value+(t.grow||0)*(s.ilvl-1)});for(const t of s.affixes){const n=Us[t.id];e.push({stat:n.stat,op:n.op,value:t.value})}return e}function As(s){const e=Te[s.base],t=s.affixes;return s.relic&&he[s.relic]?he[s.relic].name:t.length?`${Us[t[0].id].word} ${e.name}${t.length>2?` of ${Us[t[1].id].of}`:""}`:e.name}function q0(s){const e=t0[s.stat]?.[1],n=s.op==="inc"||e==="%"&&Math.abs(s.value)<3?`${Math.round(Math.abs(s.value)*100)}%`:`${Math.round(Math.abs(s.value)*10)/10}`;return{v:`${s.value<0?"−":"+"}${n}`,bad:s.value<0}}function L0(s){const e=[];for(const t of Wi(s)){const n=e.find(o=>o.stat===t.stat&&o.op===t.op);n?n.value+=t.value:e.push({stat:t.stat,op:t.op,value:t.value})}return e.map(t=>({stat:t.stat,...q0(t)}))}function ft(s){const e=Te[s.base],t=dn[s.rarity];return{name:As(s),color:t.color,rarity:t.name,slot:e.slot,family:e.family||"",ilvl:s.ilvl,relic:s.relic&&he[s.relic]?he[s.relic].text:"",base:e.name,rows:L0(s),lends:s.power?{name:ot[s.power.id].name,ranks:s.power.ranks,desc:ot[s.power.id].desc}:null,value:Oo(s)}}const Oo=s=>Math.round((6+s.ilvl*3)*dn[s.rarity].worth),Vi=s=>Oo(s)*4,Ks=s=>M0[s.rarity]+Math.floor(s.ilvl/3),$o=s=>({parts:Math.round(3+(s.ilvl+1)*_0[s.rarity]),glint:8*(s.ilvl+1)});function Xi(s,e){const t=$o(e);return e.ilvl>=s.level+T0?`Honed as far as a level ${s.level} surveyor can take it.`:(s.parts||0)<t.parts?`Level ${e.ilvl+1} takes ${t.parts} parts. You have ${s.parts||0}.`:s.glint<t.glint?`Level ${e.ilvl+1} takes ${t.glint} glint.`:""}function C0(s){s.ilvl++;for(const e of s.affixes)e.value=Math.round((e.value+Us[e.id].grow*.85)*1e3)/1e3;return s}const Pn=(s,e)=>!Te[e.base].family||Te[e.base].family===ze[s].family;function Mo(s){const e=ze[s.cls].family,t=Ui.find(n=>Te[n].family===e)??"saber";s.equip.weapon={uid:ss++,base:t,rarity:0,ilvl:1,affixes:[],power:null},s.equip.frame={uid:ss++,base:"scout",rarity:0,ilvl:1,affixes:[],power:null}}const E0=[{id:"might",name:"Might",hint:"Hits harder."},{id:"grace",name:"Grace",hint:"Faster attacks, more critical hits and dodges."},{id:"vigor",name:"Vigor",hint:"More health, quicker recovery, thicker plating."},{id:"mind",name:"Mind",hint:"More focus and stronger techniques."}],Gs=s=>Math.round(36*Math.pow(s,1.55)),A0=3,Mt=24;function _o(s="vanguard"){const e=Object.fromEntries(_n.map(([t])=>[t,null]));return{cls:s,people:"unit",level:1,xp:0,points:0,glint:20,parts:0,base:{...ze[s].attrs},talents:{},bonus:{},picks:0,offer:null,gear:[],equip:e,bag:[{id:"tonic",n:3},{id:"draught",n:1},{id:"wisp_ember",n:2},{id:"crag_shard",n:2},{id:"puff_spore",n:2}],lumen:b0(),board:0,missions:0,first:!1,threat:{},relics:{},relicDry:0,deepest:0,guided:!1,boon:null}}function R0(s,e){const t=[],n={};for(const[i]of _n){const r=s.equip[i];if(r){for(const c of Wi(r))t.push(c);r.power&&(n[r.power.id]=(n[r.power.id]||0)+r.power.ranks)}}const o=e?(s.bonus=n,s):{...s,bonus:n};s.lumen&&t.push(...$i(s.lumen)),s.boon&&en[s.boon]&&t.push(...en[s.boon].mods);const a=i=>rt(o,i);return a("keen")&&t.push({stat:"crit",op:"flat",value:.06*a("keen")}),a("hide")&&t.push({stat:"ward",op:"flat",value:-.08*a("hide")}),a("feet")&&t.push({stat:"speed",op:"inc",value:.06*a("feet")}),a("thrift")&&t.push({stat:"thrift",op:"flat",value:-.12*a("thrift")}),a("forage")&&t.push({stat:"find",op:"inc",value:.25*a("forage")}),t}function To(s,e){const t=s.level,n=R0(s,e),o=(c,d)=>{let h=0,u=0,f=1;for(const p of n)p.stat===c&&(p.op==="flat"?h+=p.value:p.op==="inc"?u+=p.value:f*=1+p.value);return(d+h)*(1+u)*f},a={might:Math.round(o("might",s.base.might)),grace:Math.round(o("grace",s.base.grace)),vigor:Math.round(o("vigor",s.base.vigor)),mind:Math.round(o("mind",s.base.mind))},i={might:a.might,grace:a.grace,vigor:a.vigor,mind:a.mind,maxHp:Math.round(o("maxHp",70+a.vigor*11+t*9)),maxFocus:Math.round(o("maxFocus",30+a.mind*6+t*2)),attack:o("attack",7+a.might*1.7+t*1.3),attackSpeed:Math.min(2.6,o("attackSpeed",1.2+a.grace*.022)),crit:Math.min(.6,o("crit",.04+a.grace*.006)),critDamage:o("critDamage",1.65),dodge:Math.min(.35,o("dodge",a.grace*.005)),defense:o("defense",a.vigor*.5+t*.4),power:o("power",1+a.mind*.045),hpRegen:o("hpRegen",.5+a.vigor*.09),focusRegen:o("focusRegen",1.6+a.mind*.13),speed:o("speed",1),find:o("find",1),lifeOnKill:o("lifeOnKill",0)},r=Math.max(.3,o("ward",1));return{attr:a,stats:i,ward:r}}function dt(s){const e=s.sheet,{attr:t,stats:n,ward:o}=To(e,!0);s.attr=t;const a={};for(const[i]of _n){const r=e.equip[i];r&&r.relic&&(a[r.relic]=!0)}s.relic=a,s.level=e.level,s.maxHp=n.maxHp,s.maxFocus=n.maxFocus,s.attack=n.attack,s.attackSpeed=n.attackSpeed,s.crit=n.crit,s.critDamage=n.critDamage,s.dodge=n.dodge,s.defense=n.defense,s.power=n.power,s.hpRegen=n.hpRegen,s.focusRegen=n.focusRegen,s.speedMul=n.speed,s.ward=o,s.find=n.find,s.lifeOnKill=n.lifeOnKill,s.family=e.equip.weapon?kn(e.equip.weapon).family??ze[e.cls].family:ze[e.cls].family,s.hp=Math.min(s.hp??n.maxHp,n.maxHp),s.focus=Math.min(s.focus??n.maxFocus,n.maxFocus)}const I0=[["attack",1,.1],["attackSpeed",1,.01],["crit",100,.5],["critDamage",100,.5],["power",100,.5],["maxHp",1,1],["defense",1,.1],["maxFocus",1,1],["hpRegen",1,.05],["focusRegen",1,.05],["speed",100,.5],["dodge",100,.5],["find",100,.5],["lifeOnKill",1,.1]];function Uo(s,e){const t=Yi(s,e),n=s.equip[t],o=To(s,!1),a=To({...s,equip:{...s.equip,[t]:e}},!1),i=[];for(const[p,m,v]of I0){const g=(a.stats[p]-o.stats[p])*m;Math.abs(g)>=v&&i.push({stat:p,by:g,pct:m===100,up:g>0})}const r=s.cls==="adept",c=p=>p.attack*p.attackSpeed*(1+p.crit*(p.critDamage-1))*(r?p.power:Math.pow(p.power,.35)),d=(p,m)=>p.maxHp*(1+p.defense/30)/m/(1-p.dodge),h=c(a.stats)/c(o.stats),u=d(a.stats,a.ward)/d(o.stats,o.ward),f=h>=.995&&u>=.995&&(h>1.01||u>1.01)?1:h<=1.005&&u<=1.005&&(h<.99||u<.99)?-1:0;return{worn:n,lines:i,verdict:f}}function F0(s,e,t=!1){const n=e-1;return{maxHp:Math.round(s.hp*(1+.3*n)*(t?3:1)),atk:s.atk*(1+.2*n)*(t?1.5:1),xp:Math.round(s.xp*(1+.38*n)*(t?4:1))}}const N0=(s,e)=>Math.max(.1,Math.min(1.2,1-(s-e-2)*.2)),An={hit:.03,crit:.06,kill:.07,elder:.13,taken:.05};class B0{game;constructor(e){this.game=e}strike(e,t=1,n=0,o=!0,a=!1){const i=this.game,r=i.player;if(!e||e.dead)return 0;const c=o&&se()<r.crit,d=e.kind==="monster"?i.relics.more(e):1,h=(r.attack*t+n)*(.9+se()*.2)*(c?r.critDamage||1.65:1)*d,u=this.damage(e,Math.max(1,Math.round(h)),r,c,!1,a);return!a&&e.kind==="monster"&&i.relics.landedOn(e),u}maul(e){const t=this.game,n=t.player;if(!(n.dead||n.invuln>0)){if(Math.hypot(n.x-e.x,n.z-e.z)>e.def.range+e.radius+.55){t.bus.emit("miss",{target:n,text:"Dodged"});return}this.hurt(e,1)}}hurt(e,t=1,n=!1,o=!1){const a=this.game,i=a.player;if(i.dead)return;if(o&&(i.air||0)>.45){a.bus.emit("miss",{target:i,text:"Jumped"});return}if(i.invuln>0||se()<i.dodge){n||a.bus.emit("miss",{target:i,text:"Dodged"});return}const r=e.atk*t*(.85+se()*.3)*(i.ward??1);this.damage(i,Math.max(1,Math.round(r*30/(30+i.defense))),e,!1)}damage(e,t,n,o,a=!1,i=!1){const r=this.game;if(e.dead)return 0;let c=t;if(e.kind==="monster"&&e.guard&&(c=Math.max(1,Math.round(c*.2))),e.kind==="player"&&c>=e.hp&&r.relics.vigil())return 0;e.hp=Math.max(0,e.hp-c),e.flash=a?Math.max(e.flash||0,.4):1;const d=e.kind==="monster"&&e.ai.state==="special";if(!a&&e.action!==1&&e.action!==5&&!d&&(e.action=3,e.actionT=0,e.actionDur=.22),r.bus.emit("damage",{target:e,amount:c,crit:o,source:n,soft:a,indirect:i}),e.kind==="monster"){const h=e;$s(h);const u=h.hp<=0,f=h.elite||h.boss;if(!a&&n){const p=h.x-n.x,m=h.z-n.z,v=Math.hypot(p,m)||1,g=h.guard||h.ai.state==="special"||h.def.giant?0:o?3.2:1.8;Do(h,p/v*g,m/v*g)}(!a||u)&&r.bus.emit("feel",{hold:h.guard?0:u?f?An.elder:An.kill:o?An.crit:An.hit,shake:u&&f?.7:o?.32:0}),u&&this.slay(h)}else if(e.kind==="player"){const h=e;h.calm=0;const u=c>=h.maxHp*.08;r.bus.emit("feel",{hold:u?An.taken:0,shake:u?.5:.25,hurt:1}),h.hp<=0?this.fall(h):n&&n.kind==="monster"&&r.relics.struck(n)}return c}slay(e){const t=this.game,n=t.player;e.dead=!0,e.deathT=0,n.target===e&&(n.target=null);const o=Math.max(1,Math.round(e.xp*N0(n.level,e.level)));if(t.bus.emit("monster:died",e),n.focus=Math.min(n.maxFocus,n.focus+5*rt(n.sheet,"second")),n.lifeOnKill&&(n.hp=Math.min(n.maxHp,n.hp+n.lifeOnKill)),e.def.fall){n.invuln=Math.max(n.invuln,e.def.fall+1.5),e.ai.state="idle",e.ai.sp=null,ls(e).spState=null,e.guard=!1,e.lift=0;for(const a of t.monsters)a!==e&&!a.dead&&(a.called||e.boss&&a.room===e.room)&&(a.dead=!0,a.deathT=0,t.bus.emit("monster:died",a));t.hazards.clear(),t.bus.emit("boss:fell",e)}else t.loot.dropFrom(e),e.burst&&t.hazards.burst(e,e.burst[0],e.burst[1],e.burst[2]);t.relics.felled(e),this.grantXp(o),t.missions.onKill()}grantXp(e){const t=this.game,n=t.player.sheet;for(n.xp+=e,t.bus.emit("xp",{amount:e});n.xp>=Gs(n.level);)n.xp-=Gs(n.level),n.level++,n.points+=A0,n.picks=(n.picks||0)+1,n.offer||(n.offer=Bi(n)),n.offer||(n.picks=0),dt(t.player),t.player.hp=t.player.maxHp,t.player.focus=t.player.maxFocus,t.bus.emit("levelup",{level:n.level})}fall(e){e.dead=!0,e.respawnT=3.2,e.target=null,e.moveTo=null,this.game.bus.emit("player:died")}}class H0{game;list=[];constructor(e){this.game=e}cloud(e,t,n,o,a){const i=this.game,r=i.world.surface(e.x,e.z);i.bus.emit("hazard:cloud",{x:e.x,y:r,z:e.z,r:t,life:n}),this.list.push({kind:"cloud",src:e,x:e.x,z:e.z,r:t,left:n,mult:o,tick:a,next:a*.5})}shot(e,t,n,o){const a=this.game,i=e.y+.9,r=o.speed??8.5,c=o.r??.4,d=o.life??1.7,h=o.mult??1,u=e.colors[2],f={kind:"shot",src:e,x:e.x+t*.5,y:i,z:e.z+n*.5,vx:t*r,vz:n*r,r:c,left:d,mult:h,color:[u[0],u[1],u[2]],size:.5,gone:!1};this.list.push(f),a.bus.emit("shot:launch",f),a.bus.emit("monster:shot",e)}fall(e,t,n,o,a,i){const r=this.game,c=r.world.surface(t,n),d=e.colors[1];r.bus.emit("telegraph",{x:t,y:c,z:n,r:o,t:a,fill:!0});const h={kind:"fall",src:e,x:t,y:c+16,z:n,ground:c,r:o,left:a,drop:16/a,mult:i,color:[d[0],d[1],d[2]],size:.8,gone:!1};this.list.push(h),r.bus.emit("shot:launch",h)}burst(e,t,n,o){const a=this.game,i=a.world.surface(e.x,e.z),r=e.colors[1];a.bus.emit("telegraph",{x:e.x,y:i,z:e.z,r:t,t:n,fill:!0}),this.list.push({kind:"fall",src:e,x:e.x,y:i,z:e.z,ground:i,r:t,left:n,drop:0,mult:o,color:[r[0],r[1],r[2]],size:0,gone:!1})}clear(){for(const e of this.list)e.kind!=="cloud"&&(e.gone=!0);this.list.length=0}update(e){const t=this.game,n=t.player;let o=0;for(const a of this.list){a.left-=e;let i=a.left<=0;if(a.kind==="fall"?(a.y=Math.max(a.ground,a.y-a.drop*e),i&&(t.bus.emit("slam",{x:a.x,y:a.ground,z:a.z,r:a.r}),!n.dead&&Math.hypot(n.x-a.x,n.z-a.z)<a.r&&t.combat.hurt(a.src,a.mult))):a.kind==="cloud"?(a.next-=e,a.next<=0&&(a.next=a.tick,!n.dead&&Math.hypot(n.x-a.x,n.z-a.z)<a.r&&t.combat.hurt(a.src,a.mult,!0))):(a.x+=a.vx*e,a.z+=a.vz*e,t.world.surface(a.x,a.z)>a.y-.1&&(i=!0),i||t.world.forEachProp(a.x,a.z,1,r=>{r.def.collide>0&&Math.hypot(r.x-a.x,r.z-a.z)<r.def.collide*r.scale+.15&&a.y<r.y+r.def.height*r.scale&&(i=!0)}),!i&&!n.dead&&Math.hypot(n.x-a.x,n.z-a.z)<a.r+n.radius&&(t.combat.hurt(a.src,a.mult),i=!0),i&&t.bus.emit("shot:hit",{x:a.x,y:a.y,z:a.z})),i){a.kind!=="cloud"&&(a.gone=!0);continue}this.list[o++]=a}this.list.length=o}}function ht(s,e){if(s.box){const a=Math.abs(Math.cos(e)),i=Math.abs(Math.sin(e));return s.r*.9*Math.pow(a**6+i**6,-1/6)}const[t,n,o]=s.w;return s.r*(1+s.rag*(.5*Math.sin(3*e+t)+.32*Math.sin(5*e+n)+.18*Math.sin(9*e+o)))}function xn(s,e,t,n,o,a,i,r){return{i:s,x:e,z:t,r:n,h:o,kind:a,main:!1,rag:i,w:[r()*ln,r()*ln,r()*ln],waves:[],pods:0,sites:[]}}const D0=s=>s.filter(e=>e.main||e.kind==="start");function xa(s,e,t,n,o,a){const i=o-t,r=a-n,c=i*i+r*r||1,d=Math.min(1,Math.max(0,((s-t)*i+(e-n)*r)/c));return Math.hypot(s-t-i*d,e-n-r*d)}function O0(s,e,t,n,o,a,i,r){const c=(d,h,u,f,p,m)=>Math.sign((u-d)*(m-h)-(f-h)*(p-d));return c(s,e,t,n,o,a)!==c(s,e,t,n,i,r)&&c(o,a,i,r,s,e)!==c(o,a,i,r,t,n)}function wa(s,e,t,n,o,a){for(const i of s)if(Math.hypot(i.x-n,i.z-o)<i.r+a+6||i!==t&&xa(i.x,i.z,t.x,t.z,n,o)<i.r+4.5)return!1;for(const i of e){const r=s[i.a],c=s[i.b];if(xa(n,o,r.x,r.z,c.x,c.z)<a+4.5||r!==t&&c!==t&&O0(t.x,t.z,n,o,r.x,r.z,c.x,c.z))return!1}return!0}function $0(s){const e=kt(s.seed>>>0),t=[],n=[],o=Ft(s.biome),a=!!(o&&o.walls),i=o&&o.hop||1;let r=10+Math.floor(e()*3);t.push(xn(0,0,0,8.5,r,"start",.05,e));let c=e()*ln;const d=s.rooms,h=(m,v,g,x)=>{for(let b=0;b<12;b++){const _=v+(e()-.5)*.5,z=8.4+e()*2.4,C=m.r+z+(7+e()*5)*(g?i:1),k=m.x+Math.sin(_)*C,P=m.z+Math.cos(_)*C;if(!wa(t,n,m,k,P,z))continue;const w=xn(t.length,k,P,z,Math.min(18,Math.max(6,m.h+(e()-.5)*(g?1.6:3.4))),"cache",.1,e);if(t.push(w),!g)return n.push({a:m.i,b:w.i,w:3.6,gate:!1,gap:x?2.6*i:0}),w;const y=ht(m,_),R=C-ht(w,_+Math.PI)-y,E=Math.max(1,Math.round(R/(3.9*i))-1);for(let U=1;U<=E;U++){const Q=y+R*U/(E+1);t.push(xn(t.length,m.x+Math.sin(_)*Q,m.z+Math.cos(_)*Q,1.15,m.h+(w.h-m.h)*U/(E+1),"stone",0,e))}return w}return null};for(let m=1;m<=d+1;m++){const g=m===d+1?s.goal==="hunt"?"boss":"exit":"fight",x=g==="boss"?27:g==="exit"?9:11+e()*4.5,b=D0(t),_=b[b.length-1];let z=null;for(let w=0;w<40&&!z;w++){const y=c+(e()-.5)*(w<20?1.7:3.4),M=9+e()*8,R=_.r+x+M,E=_.x+Math.sin(y)*R,U=_.z+Math.cos(y)*R;wa(t,n,_,E,U,x)&&(z={x:E,z:U,d2:y})}if(!z)break;c=z.d2;const C=e()<.55?0:(e()<.5?1:-1)*(1.5+e()*1.5);r=Math.min(18,Math.max(6,r+C));const k=xn(t.length,z.x,z.z,x,r,g,g==="exit"||g==="boss"?.05:.09,e);k.main=!0,t.push(k),n.push({a:_.i,b:k.i,w:4.6,gate:!0});let P=0;if(g==="fight"&&e()<.72){P=e()<.5?1:-1;const w=P*(1.2+e()*.7),y=h(k,c+w,!1,e()<(a?.7:.45));y&&e()<.5&&h(y,c+w*(.6+e()*.5),!a,a)}if(g==="fight"&&x>=12&&e()<.65){const w=c-(P||(e()<.5?1:-1))*(1.45+e()*.4),y=k.r*.52;k.terrace={x:k.x+Math.sin(w)*y,z:k.z+Math.cos(w)*y,r:3,h:i>1.5?2.5:1.2}}}if(t[0].main=!0,a)for(const m of t)m.box=!0,m.rag=0;const u=t.filter(m=>m.kind==="fight"),f=t.filter(m=>m.kind==="cache");for(const m of t)m.sites=[];const p=[...f,...u.slice().reverse()];for(let m=0;m<3&&p.length;m++)p[m%p.length].sites.push("mark");u.length&&u[0].sites.push("beacon");for(const m of f)m.sites.push(e()<.5?"crystal":"cargo");return u.length>2&&e()<.5&&u[Math.floor(u.length/2)].sites.push("crystal"),{id:"m"+s.seed,biome:s.biome,seed:s.seed,rooms:t,links:n,start:{x:0,z:0,yaw:t[1]?Math.atan2(t[1].x,t[1].z):0}}}function U0(s){const e=kt(s.seed>>>0),t=(a,i,r,c,d,h,u,f)=>Object.assign(xn(a,i,r,c,d,h,u,e),{main:!0,sites:[]},f),n=[t(0,0,0,8.5,10,"start",.05,{}),t(1,2,31,12.5,10,"fight",.07,{waves:[["sproutling","sproutling","sproutling"]],pods:1}),t(2,24,62,13.5,11,"fight",.07,{waves:[["puffcap","hound","hound"],["mite","mite","sproutling"]],pods:1,sites:["mark"]}),t(3,44,115,27,11,"boss",.05,{waves:[["@matron"]]})],o=[{a:0,b:1,w:4.6,gate:!0},{a:1,b:2,w:4.6,gate:!0,gap:2.2},{a:2,b:3,w:4.6,gate:!0}];return{id:"first",biome:s.biome,seed:s.seed,rooms:n,links:o,start:{x:0,z:0,yaw:Math.atan2(n[1].x,n[1].z)},laid:!0}}function ji(s){const e=kt(s.seed),t=s.rooms.map(([o,a,i,r,c],d)=>({...xn(d,o,a,i,10,"town",r,e),clear:c})),n=s.links.map(([o,a,i])=>({a:o,b:a,w:i}));return{id:s.id,biome:s.biome,seed:s.seed,rooms:t,links:n,start:{x:s.start.x,z:s.start.z,yaw:s.start.yaw},hub:!0,fixtures:s.fixtures,paving:s.paving}}const K0=24,ka=.5,mn={x:0,z:0};class G0{game;constructor(e){this.game=e}update(e){const t=this.game,n=t.player,o=t.monsters;for(let a=0;a<o.length;a++){const i=o[a],r=ls(i);if(i.flash=Math.max(0,i.flash-e*5),i.dead){if(i.deathT+=e,i.def.fall){i.action=6,i.actionDur=1e3,i.actionT=Math.min(1,i.deathT/i.def.fall),!i.spilled&&i.deathT>i.def.fall*.72&&(i.spilled=!0,t.loot.dropFrom(i),t.bus.emit("boss:down",i)),i.deathT>=i.def.fall&&(i.gone=!0);continue}i.grow=Math.max(0,1-i.deathT*3.2),i.deathT>.4&&(i.gone=!0);continue}i.grow=Math.min(1,i.grow+e*3),i.action&&(i.actionT+=e/i.actionDur,i.actionT>=1&&(i.action=0));const c=i.ai,d=i.def,h=d.specials,u=i.quick||1,f=(i.speed||d.speed)*u,p=i.aggro??d.aggro*(i.elite?1.3:1);c.cd-=e,(!c.specCd||c.specCd.length!==h.length)&&(c.specCd=h.map((w,y)=>1+se()*2.5+y*2));for(let w=0;w<c.specCd.length;w++)c.specCd[w]-=e;i.boss&&!i.enraged&&i.hp<i.maxHp*(i.rageAt||.5)&&c.state!=="special"&&(i.enraged=!0,r.roar=1.5,r.stun=Math.max(r.stun,1.5),t.bus.emit("boss:enrage",i),t.bus.emit("boss:roar",{entity:i,x:i.x,y:i.y,z:i.z})),r.roar>0&&(r.roar-=e,i.action=5,i.actionDur=1e3,i.actionT=1-Math.max(0,r.roar)/1.5,r.roar<=0&&(i.action=0));let m=0,v=0;const g=Math.hypot(n.x-i.x,n.z-i.z),x=Math.hypot(i.x-c.homeX,i.z-c.homeZ),b=!n.dead&&!n.safe;if(r.stun>0)r.stun-=e;else if(c.state==="idle"){if(c.timer-=e,c.timer<=0&&(c.timer=2+se()*5,se()<.7)){const w=se()*6.283,y=1.5+se()*5;c.wanderX=c.homeX+Math.cos(w)*y,c.wanderZ=c.homeZ+Math.sin(w)*y,r.going=!0}if(r.going){const w=Math.hypot(c.wanderX-i.x,c.wanderZ-i.z);w<.3?r.going=!1:(m=(c.wanderX-i.x)/w*f*.4,v=(c.wanderZ-i.z)/w*f*.4)}b&&(p>0&&g<p||r.provoked)&&(c.state="chase",t.bus.emit("monster:alert",i))}else if(c.state==="chase"){const w=d.range+i.radius*.5;if(!b||x>K0&&!d.giant)c.state="home",r.provoked=!1;else if(d.keep&&g<d.keep[1]){const M=g<d.keep[0]?-.75:0,R=(i.id%2?1:-1)*.35,E=1/(g||1);m=((n.x-i.x)*M-(n.z-i.z)*R)*E*f,v=((n.z-i.z)*M+(n.x-i.x)*R)*E*f}else if(g>w*.9){const M=1/(g||1);m=(n.x-i.x)*M*f,v=(n.z-i.z)*M*f}const y=c.state==="chase"?h.findIndex((M,R)=>c.specCd[R]<=0&&g>=M.min&&g<=M.max&&(!M.below||i.hp<i.maxHp*M.below)):-1;if(y>=0){const M=h[y];c.sp=M,c.spIdx=y,c.state="special",r.spState=ya[M.kind].begin(t,i,M),t.bus.emit("monster:special",i)}else g<=w&&c.cd<=0&&c.state==="chase"&&(c.state="attack",c.hitDone=!1,i.action=1,i.actionT=0,i.actionDur=d.attackTime,t.bus.emit("telegraph",{x:i.x,y:i.y,z:i.z,r:d.range+i.radius+.4,t:d.attackTime*ka}));i.yaw=Qt(i.yaw,Ze(n.x-i.x,n.z-i.z),d.turn||9,e)}else if(c.state==="attack")!c.hitDone&&i.actionT>=ka&&(c.hitDone=!0,t.combat.maul(i),t.bus.emit("monster:strike",i)),i.action!==1&&(c.state="chase",c.cd=d.cooldown/u*(.8+se()*.4));else if(c.state==="special"){const w=c.sp;if(!w||!r.spState)c.state="chase",c.sp=null,r.spState=null;else{const y=ya[w.kind].update(t,i,w,r.spState,e);m=y.dx,v=y.dz,y.done&&(c.state="chase",r.spState=null,c.specCd[c.spIdx]=w.every*(i.elite?.6:1)*(i.enraged?.6:1)*(.85+se()*.3),c.sp=null,c.cd=Math.max(c.cd,.6))}}else c.state==="home"&&(i.hp=Math.min(i.maxHp,i.hp+i.maxHp*.25*e),x<1.2?(c.state="idle",c.timer=1):(m=(c.homeX-i.x)/x*f,v=(c.homeZ-i.z)/x*f));if(r.pushX||r.pushZ){m+=r.pushX,v+=r.pushZ;const w=Math.exp(-9*e);r.pushX*=w,r.pushZ*=w,Math.abs(r.pushX)+Math.abs(r.pushZ)<.05&&(r.pushX=0,r.pushZ=0)}for(let w=0;w<o.length;w++){const y=o[w];if(y===i||y.dead)continue;const M=i.x-y.x,R=i.z-y.z,E=Math.hypot(M,R),U=i.radius+y.radius;E<U&&E>.001&&(m+=M/E*(U-E)*4,v+=R/E*(U-E)*4)}const _=i.radius+n.radius;if(d.giant){const w=i.radius*.86+n.radius;g<w&&g>.001&&!n.dead&&(t.world.moveCircle(n.x,n.z,(n.x-i.x)/g*(w-g),(n.z-i.z)/g*(w-g),n.radius,mn),n.x=mn.x,n.z=mn.z)}else g<_&&g>.001&&!n.dead&&(m+=(i.x-n.x)/g*(_-g)*6,v+=(i.z-n.z)/g*(_-g)*6);const z=i.x,C=i.z;if(i.slowT>0&&(i.slowT-=e,i.slowT<=0&&(i.slowT=0,i.slow=1)),(m||v)&&(i.slowT>0&&(m*=i.slow,v*=i.slow),t.world.moveCircle(i.x,i.z,m*e,v*e,i.radius,mn),i.x=mn.x,i.z=mn.z),d.giant&&i.room>=0){const w=t.world.rooms[i.room];if(w){const y=i.x-w.x,M=i.z-w.z,R=Math.hypot(y,M),E=ht(w,Math.atan2(y,M))-i.radius*.9;R>E&&R>.001&&(i.x=w.x+y/R*E,i.z=w.z+M/R*E)}}const k=Math.hypot(i.x-z,i.z-C);c.state!=="chase"&&c.state!=="attack"&&c.state!=="special"&&k>1e-4&&!r.pushX&&(i.yaw=Qt(i.yaw,Ze(i.x-z,i.z-C),8,e));const P=i.walk;i.walk+=k*d.stride,d.giant&&Math.floor(P/Math.PI)!==Math.floor(i.walk/Math.PI)&&t.bus.emit("boss:step",{entity:i,x:i.x,y:i.y,z:i.z}),i.move=je(i.move,Math.min(1,k/Math.max(e,1e-4)/(d.speed*.5)),10,e),i.y=je(i.y,t.world.surface(i.x,i.z),18,e)}}}const _t={sproutling:{cost:1,name:"Sproutling",archetype:"sproutling",scale:1,radius:.36,height:.95,hp:26,atk:5,speed:2.5,range:1.15,attackTime:.8,cooldown:1.7,aggro:0,xp:9,stride:2,specials:[{kind:"leap",every:5.5,min:2.2,max:6.5,windup:.6,air:.42,r:1.3,mult:1.3}],colors:[[150,178,120],[116,168,90],[226,176,52]],loot:[["glint",1,[1,4]],["sprout_leaf",.55,[1,2]],["tonic",.07,[1,1]]]},puffcap:{cost:1.5,name:"Puffcap",archetype:"puffcap",scale:1.05,radius:.4,height:1.05,hp:40,atk:7,speed:2,range:1.2,attackTime:.9,cooldown:1.9,aggro:5.5,xp:14,stride:5.5,specials:[{kind:"cloud",every:9,min:0,max:3.2,windup:.75,r:2.5,life:4.2,mult:.45,tick:.55}],colors:[[224,92,70],[226,176,52],[248,232,190]],loot:[["glint",1,[2,6]],["puff_spore",.5,[1,2]],["tonic",.08,[1,1]]]},bristlehog:{cost:2.2,name:"Bristlehog",archetype:"bristlehog",scale:1.1,radius:.48,height:1,hp:68,atk:10,speed:3.5,range:1.35,attackTime:.7,cooldown:1.8,aggro:7.5,xp:23,stride:3.1,specials:[{kind:"charge",every:7,min:3.5,max:10,windup:.8,speed:13,dist:11,mult:1.9,winded:1.4}],colors:[[74,77,94],[226,176,52],[226,188,130]],loot:[["glint",1,[4,9]],["hog_bristle",.5,[1,2]],["tonic",.1,[1,1]]]},wisp:{cost:1.6,name:"Glimmerwisp",archetype:"wisp",scale:1,radius:.36,height:1.45,hp:32,atk:9,speed:3,range:1.5,attackTime:.7,cooldown:1.6,aggro:7,xp:18,stride:1,glow:!0,keep:[4.2,7],specials:[{kind:"shot",every:2.6,min:2.5,max:10.5,windup:.6,speed:8.5,r:.4,life:1.7,mult:1}],colors:[[136,180,216],[70,150,150],[226,176,52]],loot:[["glint",1,[3,8]],["wisp_ember",.5,[1,1]],["draught",.1,[1,1]]]},cragling:{cost:3.2,name:"Cragling",archetype:"cragling",scale:1,radius:.55,height:1.5,hp:125,atk:15,speed:1.9,range:1.5,attackTime:1.15,cooldown:2.4,aggro:6,xp:40,stride:5,specials:[{kind:"slam",every:6.5,min:0,max:3.2,windup:1.1,r:3.3,mult:1.7,recover:1}],colors:[[150,142,132],[226,176,52],[84,108,156]],loot:[["glint",1,[8,16]],["crag_shard",.55,[1,2]],["tonic",.14,[1,1]]]},shellsnap:{cost:1.8,name:"Shellsnap",archetype:"shellsnap",scale:1.05,radius:.48,height:.75,hp:50,atk:8,speed:2.9,range:1.25,attackTime:.6,cooldown:1.5,aggro:5,xp:17,stride:2.2,specials:[{kind:"guard",every:8,min:0,max:2.4,below:.8,hold:1.5,windup:.55,r:2.3,mult:1.4}],colors:[[188,84,60],[226,176,52],[226,188,130]],loot:[["glint",1,[3,7]],["snap_claw",.5,[1,1]],["tonic",.08,[1,1]]]},hound:{cost:1.3,name:"Fanghound",archetype:"hound",scale:1,radius:.42,height:1,hp:30,atk:7,speed:4.7,range:1.2,attackTime:.55,cooldown:1.3,aggro:9,xp:14,stride:2.4,specials:[{kind:"leap",every:4.2,min:2.6,max:7.5,windup:.45,air:.36,r:1.25,mult:1.3}],colors:[[122,120,150],[226,176,52],[236,228,210]],loot:[["glint",1,[2,6]],["hog_bristle",.4,[1,1]],["tonic",.07,[1,1]]]},watcher:{cost:2,name:"Watcher",archetype:"watcher",scale:1,radius:.42,height:1.7,hp:36,atk:8,speed:3.2,range:1.4,attackTime:.7,cooldown:1.8,aggro:10,xp:20,stride:1,glow:!0,keep:[5,8.5],specials:[{kind:"shot",every:1.9,min:3,max:12,windup:.5,speed:10.5,r:.4,life:1.5,mult:.9}],colors:[[136,160,196],[226,176,52],[84,108,156]],loot:[["glint",1,[4,9]],["wisp_ember",.45,[1,1]],["draught",.1,[1,1]]]},delver:{cost:2.6,name:"Delver",archetype:"delver",scale:1,radius:.52,height:1.6,hp:78,atk:11,speed:1.5,range:1.6,attackTime:.8,cooldown:1.9,aggro:8,xp:28,stride:2,specials:[{kind:"burrow",every:6,min:2.5,max:14,windup:.45,under:.95,speed:10,r:2.4,mult:1.6,recover:.9}],colors:[[176,128,104],[226,176,52],[236,208,170]],loot:[["glint",1,[6,12]],["crag_shard",.45,[1,2]],["tonic",.12,[1,1]]]},strider:{cost:3.6,name:"Strider",archetype:"strider",scale:1,radius:.7,height:2.9,hp:120,atk:14,speed:2.3,range:1.7,attackTime:.95,cooldown:2.2,aggro:12,xp:42,stride:1.5,keep:[4.5,7.5],specials:[{kind:"lance",every:5,min:3.5,max:16,windup:1,len:16,w:1.5,mult:1.9,recover:.7}],colors:[[136,160,196],[226,176,52],[84,108,156]],loot:[["glint",1,[9,18]],["crag_shard",.5,[1,2]],["draught",.14,[1,1]]]},mite:{cost:.8,name:"Sparkmite",archetype:"mite",scale:1,radius:.3,height:.6,hp:14,atk:9,speed:4.3,range:.9,attackTime:.5,cooldown:1.2,aggro:9,xp:7,stride:3.5,specials:[{kind:"fuse",every:1,min:0,max:2,windup:1,r:2.5,mult:1.7}],colors:[[110,110,140],[226,176,52],[60,60,80]],loot:[["glint",1,[1,3]]]},warden:{cost:0,boss:!0,giant:!0,epithet:"Keeper of the Ember Shelf",sit:[5,17,7.5],name:"The Stone Warden",archetype:"warden",scale:1,radius:3.5,height:13,hitY:2.6,turn:2,fall:4.2,hp:1500,atk:19,speed:2.7,range:3.2,attackTime:1.5,cooldown:2.6,aggro:80,xp:420,stride:.52,specials:[{kind:"slam",every:8,min:0,max:11,windup:1.5,r:9.5,mult:1.9,recover:1.5},{kind:"barrage",every:11,min:7,max:60,windup:1.1,count:6,r:2.7,gap:.42,drop:1.25,mult:1.2},{kind:"charge",every:14,min:10,max:34,windup:1.3,speed:15,dist:26,mult:2.1,winded:2.4},{kind:"summon",every:19,min:0,max:60,below:.75,windup:1.4,adds:"cragling",count:2}],colors:[[150,142,132],[226,176,52],[84,108,156]],loot:[["glint",1,[90,130]],["crag_shard",1,[3,5]],["tonic",1,[2,3]]]},matron:{cost:0,boss:!0,giant:!0,epithet:"Mother of the Glasswood",sit:[5,17,7.5],name:"The Spore Matron",archetype:"matron",scale:1,radius:3.6,height:12,hitY:2.6,turn:2.4,fall:4.2,hp:1350,atk:16,speed:2.4,range:3.4,attackTime:1.4,cooldown:2.4,aggro:80,xp:400,stride:.6,specials:[{kind:"cloud",every:7,min:0,max:9,windup:1.1,r:8.5,life:5.5,mult:.5,tick:.55},{kind:"barrage",every:9,min:5,max:60,windup:.9,count:8,r:2.4,gap:.3,drop:1.2,mult:1.1},{kind:"slam",every:12,min:0,max:10,windup:1.4,r:8.5,mult:1.7,recover:1.4},{kind:"summon",every:17,min:0,max:60,below:.8,windup:1.3,adds:"puffcap",count:3}],colors:[[224,92,70],[226,176,52],[248,232,190]],loot:[["glint",1,[90,130]],["puff_spore",1,[3,5]],["draught",1,[2,3]]]},sentinel:{cost:0,boss:!0,giant:!0,epithet:"Warden of the Rime Steps",sit:[0,15,4.5],name:"The Tide Sentinel",archetype:"sentinel",scale:1,radius:5,height:8.5,hitY:2.4,turn:2.2,fall:4,hp:1420,atk:17,speed:3.2,range:3.2,attackTime:1.3,cooldown:2.2,aggro:80,xp:410,stride:.45,specials:[{kind:"guard",every:11,min:0,max:9,below:.9,hold:2.2,windup:1,r:10,mult:1.7},{kind:"charge",every:10,min:9,max:34,windup:1.2,speed:17,dist:26,mult:1.9,winded:2.2},{kind:"barrage",every:12,min:6,max:60,windup:1,count:5,r:3,gap:.5,drop:1.2,mult:1.3},{kind:"summon",every:18,min:0,max:60,below:.7,windup:1.3,adds:"wisp",count:3}],colors:[[188,84,60],[226,176,52],[226,188,130]],loot:[["glint",1,[90,130]],["snap_claw",1,[3,5]],["tonic",1,[2,3]]]},keeper:{cost:0,boss:!0,giant:!0,epithet:"Warden of the Underhalls",lamp:[5.5,21],sit:[5,16.5,6.6],name:"The Lantern Keeper",archetype:"keeper",scale:1,radius:3.4,height:11.5,hitY:2.6,turn:2.2,fall:4.2,hp:1450,atk:17,speed:2.5,range:3.4,attackTime:1.5,cooldown:2.5,aggro:80,xp:430,stride:.5,specials:[{kind:"lance",every:9,min:6,max:40,windup:1.3,len:30,w:3,mult:1.8,recover:1},{kind:"slam",every:10,min:0,max:10,windup:1.5,r:9,mult:1.8,recover:1.4},{kind:"barrage",every:12,min:6,max:60,windup:1,count:6,r:2.6,gap:.45,drop:1.25,mult:1.2},{kind:"summon",every:19,min:0,max:60,below:.75,windup:1.3,adds:"watcher",count:2}],colors:[[104,98,132],[226,176,52],[226,214,190]],loot:[["glint",1,[95,135]],["crag_shard",1,[3,5]],["draught",1,[2,3]]]},drifter:{cost:0,boss:!0,giant:!0,epithet:"Tide of the Shatter",sit:[5,17.5,5.2],name:"The Star Drifter",archetype:"drifter",scale:1,radius:4.6,height:8,hitY:3.2,turn:2.6,fall:4.4,hp:1400,atk:16,speed:3.6,range:3.6,attackTime:1.4,cooldown:2.3,aggro:80,xp:430,stride:0,specials:[{kind:"barrage",every:8,min:5,max:60,windup:.9,count:9,r:2.3,gap:.28,drop:1.3,mult:1.1},{kind:"charge",every:11,min:9,max:36,windup:1.2,speed:18,dist:28,mult:1.9,winded:2.2},{kind:"slam",every:12,min:0,max:10,windup:1.4,r:9.5,mult:1.7,recover:1.3},{kind:"summon",every:18,min:0,max:60,below:.75,windup:1.3,adds:"wisp",count:3}],colors:[[112,128,176],[226,176,52],[170,226,220]],loot:[["glint",1,[95,135]],["wisp_ember",1,[3,5]],["draught",1,[2,3]]]},thornmother:{cost:0,boss:!0,giant:!0,epithet:"Mother of the Bloomfall",sit:[5,17,7.5],name:"The Thorn Mother",archetype:"matron",scale:1,radius:3.6,height:12,hitY:2.6,turn:2.4,fall:4.2,hp:1350,atk:16,speed:2.4,range:3.4,attackTime:1.4,cooldown:2.4,aggro:80,xp:400,stride:.6,specials:[{kind:"cloud",every:7,min:0,max:9,windup:1.1,r:8.5,life:5.5,mult:.5,tick:.55},{kind:"barrage",every:9,min:5,max:60,windup:.9,count:9,r:2.3,gap:.28,drop:1.2,mult:1.1},{kind:"slam",every:12,min:0,max:10,windup:1.4,r:8.5,mult:1.7,recover:1.4},{kind:"summon",every:17,min:0,max:60,below:.8,windup:1.3,adds:"sproutling",count:3}],colors:[[226,138,166],[250,226,168],[132,184,116]],loot:[["glint",1,[90,130]],["puff_spore",1,[3,5]],["draught",1,[2,3]]]},saltcolossus:{cost:0,boss:!0,giant:!0,epithet:"Keeper of the Saltglass Flats",sit:[5,17,7.5],name:"The Salt Colossus",archetype:"warden",scale:1,radius:3.5,height:13,hitY:2.6,turn:2,fall:4.2,hp:1500,atk:19,speed:2.7,range:3.2,attackTime:1.5,cooldown:2.6,aggro:80,xp:420,stride:.52,specials:[{kind:"slam",every:8,min:0,max:11,windup:1.5,r:9.5,mult:1.9,recover:1.5},{kind:"barrage",every:11,min:7,max:60,windup:1.1,count:6,r:2.7,gap:.42,drop:1.25,mult:1.2},{kind:"charge",every:14,min:10,max:34,windup:1.3,speed:15,dist:26,mult:2.1,winded:2.4},{kind:"summon",every:19,min:0,max:60,below:.75,windup:1.4,adds:"shellsnap",count:2}],colors:[[228,226,212],[92,190,180],[84,108,156]],loot:[["glint",1,[90,130]],["crag_shard",1,[3,5]],["tonic",1,[2,3]]]},ambersentinel:{cost:0,boss:!0,giant:!0,epithet:"Watcher of Amberwood",sit:[0,15,4.5],name:"The Amber Sentinel",archetype:"sentinel",scale:1,radius:5,height:8.5,hitY:2.4,turn:2.2,fall:4,hp:1420,atk:17,speed:3.2,range:3.2,attackTime:1.3,cooldown:2.2,aggro:80,xp:410,stride:.45,specials:[{kind:"guard",every:11,min:0,max:9,below:.9,hold:2.2,windup:1,r:10,mult:1.7},{kind:"charge",every:10,min:9,max:34,windup:1.2,speed:17,dist:26,mult:1.9,winded:2.2},{kind:"barrage",every:12,min:6,max:60,windup:1,count:5,r:3,gap:.5,drop:1.2,mult:1.3},{kind:"summon",every:18,min:0,max:60,below:.7,windup:1.3,adds:"hound",count:2}],colors:[[198,136,72],[250,212,108],[122,70,52]],loot:[["glint",1,[90,130]],["snap_claw",1,[3,5]],["tonic",1,[2,3]]]}},Ko=s=>{const e=Object.values(he).filter(n=>n.from===s),t=_t[s]?.archetype;return e.length||!t?e:Object.values(he).filter(n=>n.from===t)},Zi=(s=0,e=0)=>Math.min(1,.18+.14*s+.15*e);class Y0{game;thornCd=0;meteorCd=0;tick=0;jumped=!1;constructor(e){this.game=e;const t=e.bus;t.on("mission:begin",()=>{e.player.vigilUsed=!1}),t.on("zone",()=>{this.thornCd=0,this.meteorCd=0,this.jumped=!1,e.player.rush=0}),t.on("jump",n=>{n.entity===e.player&&(this.jumped=!0)}),t.on("landed",()=>this.landed())}has(e){const t=this.game.player.relic;return!!(t&&t[e])}area(e,t,n,o,a=null){const i=this.game;for(const r of i.monsters)!r.dead&&r!==a&&Math.hypot(r.x-e,r.z-t)<=n+r.radius&&i.combat.strike(r,o,0,!1,!0)}ring(e,t,n,o,a,i=!1){this.game.bus.emit("relic:ring",{id:e,x:t,y:n,z:o,r:a,heavy:i})}update(e){const t=this.game,n=t.player;this.thornCd-=e,this.meteorCd-=e,n.rush>0&&(n.rush-=e);const o=he.rot.each??.18;this.tick-=e;const a=this.tick<=0;a&&(this.tick+=.5);for(const i of t.monsters)if(!(!i.rot||i.rotT<=0)){if(i.rotT-=e,i.dead||i.rotT<=0){i.rot=0,i.rotT=0;continue}if(a&&!n.dead){const r=Math.max(1,Math.round(n.attack*o*i.rot*.5*this.more(i)));t.combat.damage(i,r,n,!1,!0,!0)}}}more(e){return this.has("chill")&&e.slowT>0?1+(he.chill.more??.2):1}landedOn(e){if(!e.dead){if(this.has("rot")){const t=he.rot.stacks??3,n=he.rot.seconds??4;e.rot=Math.min(t,(e.rotT>0?e.rot:0)+1),e.rotT=n}if(this.has("chill")){const t=he.chill.slow??.65,n=he.chill.seconds??2.5,o=e.slowT>0;e.slow=o?Math.min(e.slow,t):t,e.slowT=Math.max(o?e.slowT:0,n)}}}quake(e,t,n){if(!this.has("quake"))return;const o=he.quake.radius??3,a=he.quake.mult??.7;this.ring("quake",e,t,n,o),this.area(e,n,o,a)}felled(e){const t=this.game,n=t.player;if(this.has("rush")&&(n.rush=he.rush.seconds??3),this.has("spore")&&!e.boss){const o=he.spore.radius??2.6,a=he.spore.mult??.9,i=e.x,r=e.y,c=e.z;t.skills.later(.14,()=>{this.ring("spore",i,r,c,o),this.area(i,c,o,a,e)})}}struck(e){const t=this.game,n=t.player,o=he.thorn.reach??5,a=he.thorn.every??1.2,i=he.thorn.mult??.8,r=he.thorn.shove??6;if(!this.has("thorn")||this.thornCd>0||!e||e.kind!=="monster"||e.dead)return;const c=e.x-n.x,d=e.z-n.z,h=Math.hypot(c,d)||1;h>o+e.radius||(this.thornCd=a,this.ring("thorn",n.x,n.y,n.z,2.2),t.combat.strike(e,i,0,!1,!0),!e.dead&&!e.def.giant&&!e.guard&&e.ai.state!=="special"&&Do(e,c/h*r,d/h*r))}vigil(){const e=this.game,t=e.player,n=he.vigil.health??.3,o=he.vigil.seconds??3;if(!this.has("vigil")||t.vigilUsed||!e.missions.active)return!1;t.vigilUsed=!0;const a=Math.max(t.hp,Math.round(t.maxHp*n)),i=Math.max(0,Math.round(a-t.hp));return t.hp=a,t.invuln=Math.max(t.invuln,o),this.ring("vigil",t.x,t.y,t.z,4.5,!0),e.bus.emit("heal",{entity:t,amount:i}),e.bus.emit("miss",{target:t,text:"Last Light"}),e.bus.emit("log",{text:'<b class="c-relic">Last Light</b> held. It will not hold again on this contract.'}),!0}landed(){const t=this.game.player,n=this.jumped;if(this.jumped=!1,!n||!this.has("meteor")||this.meteorCd>0||t.dead)return;const o=he.meteor.every??4,a=he.meteor.radius??3.2,i=he.meteor.mult??1.6;this.meteorCd=o,this.ring("meteor",t.x,t.y,t.z,a,!0),this.area(t.x,t.z,a,i)}leap(e,t){if(!this.has("wick"))return;const n=this.game,o=he.wick.reach??6,a=he.wick.leaps??2,i=n.monsters.filter(r=>r!==e&&!r.dead&&Math.hypot(r.x-e.x,r.z-e.z)<=o+r.radius).sort((r,c)=>Math.hypot(r.x-e.x,r.z-e.z)-Math.hypot(c.x-e.x,c.z-e.z)).slice(0,a);for(const r of i)n.bus.emit("relic:leap",{x:r.x,y:r.y+r.height*.5,z:r.z}),n.combat.strike(r,t,0,!1,!0)}drop(e){const t=this.game,n=t.player.sheet,o=t.missions.active,a=Ko(e.defId);if(!a.length||!o||o.offer.first)return;const i=(t.missions.threat?.rank??o.offer.threat??0)+Math.max(0,(o.offer.depth||1)-1);if(se()>=Zi(i,n.relicDry||0)){n.relicDry=(n.relicDry||0)+1;return}n.relicDry=0;const r=n.relics||{},c=a.filter(u=>!r[u.id]),d=c.length&&(c.length===a.length||se()<.75)?c:a,h=Zt({relic:d[Math.floor(se()*d.length)].id,ilvl:e.level,cls:n.cls});t.loot.dropGear(e.x,e.y,e.z,h)}}const eo=2.6,Rn=100,W0=["ember","shell","tide"];class V0{game;e=null;cd=eo;constructor(e){this.game=e,e.bus.on("zone",()=>this.arrive()),e.bus.on("class",()=>this.dress()),e.bus.on("damage",t=>this.fill(t))}get lumen(){return this.game.player.sheet.lumen}get def(){return zt[this.kind()]}kind(){const e=this.lumen.kind;return e in zt?e:"mote"}arrive(){const e=this.game,t=e.player,n=this.def;this.e=e.entities.add(Gt("pet","lumen",{x:t.x-.7,z:t.z+.5,y:t.y+1.45,radius:.3,height:.5,extra:n.shape,colors:lt(n.colors),name:n.name,far:!0})),this.cd=eo}dress(){const e=this.e,t=this.def;e&&(e.extra=t.shape,e.colors=lt(t.colors),e.name=t.name)}update(e){const t=this.game,n=t.player,o=this.e,a=this.lumen;if(!o||o.gone)return;o.grow=n.grow>.5&&!n.hidden&&!n.dead?Math.min(1,o.grow+e*4):0;const[i,r]=Ho(n.yaw),c=n.x-i*.5+r*.72,d=n.z-r*.5-i*.72,h=n.y+(n.lift||0)+1.5;Math.hypot(c-o.x,d-o.z)>14&&(o.x=c,o.z=d,o.y=h),o.x=je(o.x,c,5.5,e),o.z=je(o.z,d,5.5,e),o.y=je(o.y,h,7,e),o.yaw=Qt(o.yaw,n.yaw,6,e),o.move=a.charge/Rn,o.action&&(o.actionT+=e/o.actionDur,o.actionT>=1&&(o.action=0)),this.cd-=e;const u=n.target;this.cd<=0&&u&&u.kind==="monster"&&!u.dead&&!n.dead&&Math.hypot(u.x-n.x,u.z-n.z)<13&&(this.cd=eo*(t.relics.has("wick")?he.wick.pace??.5:1),this.bolt(u,.22+.006*a.ember,.3),t.bus.emit("lumen:bolt",{x:o.x,y:o.y,z:o.z}))}bolt(e,t,n=.3){const o=this.game,a=this.e;if(!a)return;const i=e.x-a.x,r=e.z-a.z,c=Math.hypot(i,r)||1,d=a.colors[1],h=[d[0],d[1],d[2]];Di(o.skills,{x:a.x,y:a.y-.3,z:a.z,vx:i/c*17,vy:0,vz:r/c*17,life:1,radius:.4,size:n,mult:t,flat:0,splash:0,splashMult:0,quiet:!0,color:h},u=>{o.combat.strike(u,t,0,!1,!0),o.relics.leap(u,t)})}fill(e){const t=this.game,n=t.player,o=this.lumen;if(!(!o||o.charge>=Rn)&&!e.soft){if(e.target===n)o.charge+=6;else if(e.source===n&&e.target.kind==="monster")o.charge+=e.crit?3.4:2.2;else return;o.charge>=Rn&&(o.charge=Rn,t.bus.emit("lumen:ready"))}}burst(){const e=this.game,t=e.player,n=this.lumen,o=this.e,a=this.def.burst;if(!o||t.dead||n.charge<Rn)return o&&!t.dead&&e.bus.emit("deny",{}),!1;n.charge=0;const i=e.monsters.filter(h=>!h.dead).map(h=>({m:h,d:Math.hypot(h.x-t.x,h.z-t.z)})).sort((h,u)=>h.d-u.d);if(a.kind==="ring"){const h=a.r??3.4,u=a.mult??1.6;for(const{m:f,d:p}of i)p<h+f.radius&&e.combat.strike(f,u,0,!0,!0)}if(a.kind==="volley"||a.kind==="all"){const h=i.filter(p=>p.d<16),u=a.count??3,f=a.mult??1.2;for(let p=0;p<u&&h.length;p++)this.bolt(h[p%h.length].m,f,.5)}a.seconds&&(t.invuln=Math.max(t.invuln,a.seconds));let r=0;if(a.heal){const h=Math.min(t.maxHp,t.hp+t.maxHp*a.heal);r=Math.round(h-t.hp),t.hp=h}a.focus&&(t.focus=Math.min(t.maxFocus,t.focus+t.maxFocus*a.focus)),o.action=2,o.actionT=0,o.actionDur=.6;const c=o.colors[1],d=[c[0],c[1],c[2]];return e.bus.emit("lumen:burst",{burst:a,x:t.x,y:t.y,z:t.z,color:d}),a.heal&&e.bus.emit("heal",{entity:t,amount:r}),!0}feed(e){const t=this.game,n=t.player,o=this.lumen,a=cs[e];if(!a||t.loot.count(e)<1)return!1;if(y0(o))return t.bus.emit("log",{text:"Your lumen is full grown: it will not eat any more."}),!1;t.loot.remove(e,1);const i=Sn(o);for(const c of W0){const d=a[c];d&&(o[c]+=d)}const r=Sn(o);if(t.bus.emit("lumen:fed",{id:e}),r!==i){const c=w0(o);if(c!==o.kind){o.kind=c,this.dress();const d=this.e,h=d?d.colors[1]:[1,1,1],u=[h[0],h[1],h[2]];t.bus.emit("lumen:changed",{kind:c,name:zt[c].name,x:d?d.x:n.x,y:d?d.y:n.y,z:d?d.z:n.z,color:u})}else t.bus.emit("lumen:level",{level:r})}return dt(n),t.bus.emit("bag:changed"),!0}}const Ce={glint:{name:"Glint",kind:"coin",drop:0,color:[244,190,62]},tonic:{name:"Red Tonic",kind:"use",effect:"heal",power:.45,value:12,price:26,drop:2,color:[198,62,58],desc:"Restores 45% of your health."},draught:{name:"Blue Draught",kind:"use",effect:"focus",power:.6,value:14,price:32,drop:2,color:[84,108,156],desc:"Restores 60% of your focus."},sprout_leaf:{name:"Sprout Leaf",kind:"mat",value:4,drop:1,color:[116,168,90],desc:"Still a little wriggly."},puff_spore:{name:"Puff Spore",kind:"mat",value:6,drop:1,color:[224,92,70],desc:"Do not sneeze near it."},hog_bristle:{name:"Hog Bristle",kind:"mat",value:9,drop:1,color:[176,128,84],desc:"Stiff as a nail."},wisp_ember:{name:"Wisp Ember",kind:"mat",value:12,drop:3,color:[136,180,216],desc:"Cool to the touch."},crag_shard:{name:"Crag Shard",kind:"mat",value:18,drop:3,color:[150,142,132],desc:"Hums when struck."},snap_claw:{name:"Snap Claw",kind:"mat",value:8,drop:1,color:[226,176,52],desc:"Mind your fingers."},core:{name:"Survey Core",kind:"mat",value:30,drop:3,color:[136,180,216],desc:"What the survey came for. The ship pays for it."}},X0=["tonic","draught"],Ji=[{id:"tonic",needs:{sprout_leaf:3},glint:4},{id:"draught",needs:{wisp_ember:2},glint:6}],za=24;class j0{game;meta=new WeakMap;drops=[];constructor(e){this.game=e}dropFrom(e){const t=this.game;for(const[o,a,i]of e.def.loot){if(se()>a*(e.elite?2.5:1))continue;let r=i[0]+Math.floor(se()*(i[1]-i[0]+1));o==="glint"&&(r=Math.round(r*(1+(e.level-1)*.3)*(e.elite?4:1)*(t.player.find??1)*(e.glintMul||1)));const c=se()*6.283,d=.4+se()*.9,h=Ce[o],u=Gt("drop","drop",{x:e.x,z:e.z,y:e.y,radius:.4,height:.7,extra:h.drop,colors:lt([h.color,h.color,h.color]),name:r>1?`${h.name} ×${r}`:h.name,item:o,gear:null,n:r,age:0,grow:0});this.meta.set(u,{tx:e.x+Math.cos(c)*d,tz:e.z+Math.sin(c)*d,rare:!1,warned:!1}),t.entities.add(u),this.drops.push(u)}const n=e.boss?2:se()<(e.elite?.55:.07)?1:0;for(let o=0;o<n;o++)this.dropGear(e.x,e.y,e.z,Zt({ilvl:e.level,cls:t.player.sheet.cls,luck:(e.boss?1.3:e.elite?.6:0)+(e.luck||0),rarity:e.boss?1:void 0}));e.boss&&t.relics.drop(e)}dropGear(e,t,n,o){const a=this.game,i=dn[o.rarity],r=[parseInt(i.color.slice(1,3),16),parseInt(i.color.slice(3,5),16),parseInt(i.color.slice(5,7),16)],c=se()*6.283,d=.8+se()*.9,h=Gt("drop","drop",{x:e,z:n,y:t,radius:.4,height:.7,extra:3,colors:lt([r,r,r]),name:As(o),gear:o,item:null,n:1,age:0,grow:0});return this.meta.set(h,{tx:e+Math.cos(c)*d,tz:n+Math.sin(c)*d,rare:o.rarity>=2,warned:!1}),a.entities.add(h),this.drops.push(h),o.rarity>=2&&a.bus.emit("drop:rare",{x:e,y:t,z:n,rarity:o.rarity}),h}drop(e,t,n,o,a=1){const i=this.game,r=Ce[o],c=se()*6.283,d=.7+se()*.9,h=Gt("drop","drop",{x:e,z:n,y:t,radius:.4,height:.7,extra:r.drop,colors:lt([r.color,r.color,r.color]),name:a>1?`${r.name} ×${a}`:r.name,item:o,gear:null,n:a,age:0,grow:0});return this.meta.set(h,{tx:e+Math.cos(c)*d,tz:n+Math.sin(c)*d,rare:o==="core",warned:!1}),i.entities.add(h),this.drops.push(h),h}spill(e,t,n,o,a=!1){this.drop(e,t,n,"glint",Math.round((6+se()*8)*(1+.25*(o-1)))),se()<.6&&this.drop(e,t,n,se()<.6?"tonic":"draught",1),se()<.3&&this.dropGear(e,t,n,Zt({ilvl:o,cls:this.game.player.sheet.cls,luck:.2})),a&&this.drop(e,t,n,"core",1)}update(e){const t=this.game,n=t.player;let o=0;for(const a of this.drops){const i=this.meta.get(a),r=i?i.tx:a.x,c=i?i.tz:a.z;a.age+=e,a.grow=Math.min(1,a.grow+e*5);const d=Math.min(1,a.age/.4);a.x+=(r-a.x)*Math.min(1,e*8),a.z+=(c-a.z)*Math.min(1,e*8),a.lift=Math.sin(d*Math.PI)*.6,a.y=t.world.surface(a.x,a.z);const h=Math.hypot(a.x-n.x,a.z-n.z);if(a.age>.45&&!n.dead&&h<2.6&&(i&&(i.tx=n.x,i.tz=n.z),h<.75&&this.take(a))){a.gone=!0;continue}if(a.age>120){a.gone=!0;continue}this.drops[o++]=a}this.drops.length=o}gather(){for(const e of this.drops)!e.gone&&this.take(e)&&(e.gone=!0);this.drops=this.drops.filter(e=>!e.gone)}take(e){const t=this.game,n=t.player.sheet,o=this.meta.get(e),a=o?o.rare:!1;if(e.gear){const r=e.gear.relic;return n.gear.length>=Mt&&!r?(o&&!o.warned&&(o.warned=!0,t.bus.emit("log",{text:"Your pack holds no more gear. Salvage some from the Gear tab."})),!1):(r&&(e.gear.lock=!0,n.relics=n.relics||{},n.relics[r]=(n.relics[r]||0)+1,t.bus.emit("relic:found",{id:r,item:e.gear})),n.gear.push(e.gear),t.bus.emit("pickup",{x:e.x,y:e.y,z:e.z,gear:e.gear,rare:a}),t.bus.emit("bag:changed"),!0)}if(!e.item)return!1;if(Ce[e.item].kind==="coin")n.glint+=e.n;else if(!this.add(e.item,e.n))return o&&!o.warned&&(o.warned=!0,t.bus.emit("log",{text:"Your bag is full."})),!1;return t.bus.emit("pickup",{x:e.x,y:e.y,z:e.z,item:e.item,n:e.n,rare:a}),!0}add(e,t){const n=this.game.player.sheet.bag,o=n.find(a=>a.id===e);if(o)o.n+=t;else{if(n.length>=za)return!1;n.push({id:e,n:t})}return this.game.bus.emit("bag:changed"),!0}count(e){return this.game.player.sheet.bag.find(t=>t.id===e)?.n||0}remove(e,t=1){const n=this.game.player.sheet.bag,o=n.findIndex(a=>a.id===e);return o<0||n[o].n<t?!1:(n[o].n-=t,n[o].n<=0&&n.splice(o,1),this.game.bus.emit("bag:changed"),!0)}use(e){const t=this.game,n=t.player,o=Ce[e];if(n.dead||!o||o.kind!=="use"||n.potionCd>0||(o.effect==="heal"?n.hp>=n.maxHp:n.focus>=n.maxFocus)||!this.remove(e))return!1;const i=o.power??0;let r=0;if(o.effect==="heal"){const c=Math.min(n.maxHp,n.hp+n.maxHp*i);r=Math.round(c-n.hp),n.hp=c}else{const c=Math.min(n.maxFocus,n.focus+n.maxFocus*i);r=Math.round(c-n.focus),n.focus=c}return n.potionCd=1.2,t.bus.emit("heal",{entity:n,amount:r,focus:o.effect!=="heal"}),t.bus.emit("drink",{id:e}),!0}equip(e,t=null){const n=this.game,o=n.player,a=o.sheet,i=a.gear.findIndex(h=>h.uid===e);if(i<0)return!1;const r=a.gear[i];if(!Pn(a.cls,r))return n.bus.emit("log",{text:"Your class cannot wield that."}),n.bus.emit("deny",{}),!1;const c=t&&Gi(r).includes(t)?t:Yi(a,r),d=a.equip[c];return a.gear.splice(i,1),d&&a.gear.push(d),a.equip[c]=r,dt(o),n.bus.emit("equip",{item:r,slot:c}),n.bus.emit("bag:changed"),!0}unequip(e){const t=this.game,n=t.player,o=n.sheet,a=o.equip[e];return!a||e==="weapon"?!1:o.gear.length>=Mt?(t.bus.emit("log",{text:"Your pack holds no more gear."}),t.bus.emit("deny",{}),!1):(o.equip[e]=null,o.gear.push(a),dt(n),t.bus.emit("equip",{item:null,slot:e}),t.bus.emit("bag:changed"),!0)}salvage(e){const t=this.game,n=t.player.sheet,o=n.gear.findIndex(i=>i.uid===e);if(o<0||n.gear[o].lock)return t.bus.emit("deny",{}),!1;const a=Ks(n.gear[o]);return n.parts=(n.parts||0)+a,n.gear.splice(o,1),t.bus.emit("salvage",{parts:a,count:1}),t.bus.emit("bag:changed"),!0}spare(){const e=this.game.player.sheet;return e.gear.filter(t=>t.rarity<=1&&!t.lock&&!(Pn(e.cls,t)&&Uo(e,t).verdict>0))}salvageSpare(){const e=this.game,t=e.player.sheet,n=this.spare();if(!n.length)return 0;let o=0;for(const a of n)o+=Ks(a);return t.gear=t.gear.filter(a=>!n.includes(a)),t.parts=(t.parts||0)+o,e.bus.emit("salvage",{parts:o,count:n.length}),e.bus.emit("log",{text:`Salvaged <b class="c-num">${n.length}</b> ${n.length===1?"piece":"pieces"}: <b class="c-parts">+${o} parts</b>.`}),e.bus.emit("bag:changed"),o}lock(e){const t=this.game,n=t.player.sheet.gear.find(o=>o.uid===e);return n?(n.lock?delete n.lock:n.lock=!0,t.bus.emit("ui:click"),t.bus.emit("bag:changed"),!0):!1}hone(e){const t=this.game,n=t.player,o=n.sheet,[a,i]=String(e).split(":"),r=a==="worn"?o.equip[i]:o.gear.find(h=>String(h.uid)===i)??null;if(!r)return!1;const c=Xi(o,r);if(c)return t.bus.emit("log",{text:c}),t.bus.emit("deny",{}),!1;const d=$o(r);return o.parts-=d.parts,o.glint-=d.glint,C0(r),dt(n),t.bus.emit("hone",{item:r}),t.bus.emit("bag:changed"),!0}sellGear(e){const t=this.game,n=t.player.sheet,o=n.gear.findIndex(r=>r.uid===e);if(o<0||n.gear[o].lock)return!1;const a=n.gear[o],i=Oo(a);return n.glint+=i,n.gear.splice(o,1),t.bus.emit("trade",{kind:"sell",name:As(a),glint:i}),t.bus.emit("bag:changed"),!0}buyGear(e){const t=this.game,n=t.player.sheet,o=t.missions.stock,a=o[e];if(!a)return!1;const i=Vi(a);return n.glint<i?(t.bus.emit("deny",{}),t.bus.emit("log",{text:"Not enough glint."}),!1):n.gear.length>=Mt?(t.bus.emit("log",{text:"Your pack holds no more gear."}),!1):(n.glint-=i,n.gear.push(a),o.splice(e,1),t.bus.emit("trade",{kind:"buy",name:As(a),glint:i}),t.bus.emit("bag:changed"),!0)}sell(e,t=1){const n=Ce[e];if(!n.value||!this.remove(e,t))return!1;const o=n.value*t;return this.game.player.sheet.glint+=o,this.game.bus.emit("trade",{kind:"sell",name:n.name,glint:o}),!0}sellMaterials(){const e=this.game.player.sheet;let t=0;for(const n of[...e.bag]){const o=Ce[n.id];o.kind==="mat"&&o.value&&(t+=o.value*n.n,this.remove(n.id,n.n))}return e.glint+=t,t&&this.game.bus.emit("trade",{kind:"sell",glint:t}),t}craft(e){const t=this.game,n=t.player.sheet,o=Ji[e];if(!o)return!1;const a=Object.keys(o.needs);for(const r of a){const c=o.needs[r]??0;if(this.count(r)<c)return t.bus.emit("log",{text:"You do not carry enough for that."}),t.bus.emit("deny",{}),!1}if(n.glint<o.glint)return t.bus.emit("log",{text:"Not enough glint."}),t.bus.emit("deny",{}),!1;const i=a.some(r=>this.count(r)===(o.needs[r]??0));if(!this.count(o.id)&&n.bag.length>=za&&!i)return t.bus.emit("log",{text:"Your bag is full."}),!1;for(const r of a){const c=o.needs[r]??0;c>0&&this.remove(r,c)}return n.glint-=o.glint,this.add(o.id,1),t.bus.emit("trade",{kind:"craft",name:Ce[o.id].name,glint:o.glint}),t.bus.emit("log",{text:`Made: <em>${Ce[o.id].name}</em>.`}),!0}buy(e){const t=this.game.player.sheet,n=Ce[e];return n.price?t.glint<n.price?(this.game.bus.emit("log",{text:"Not enough glint."}),!1):this.add(e,1)?(t.glint-=n.price,this.game.bus.emit("trade",{kind:"buy",name:n.name,glint:n.price}),!0):(this.game.bus.emit("log",{text:"Your bag is full."}),!1):!1}}const Z0=1.5,In={x:0,z:0};class J0{game;constructor(e){this.game=e}update(e){const t=this.game,n=t.player;for(const o of t.entities.list){if(o.kind!=="npc")continue;const a=o;if(!a.path||!a.path.length)continue;const[i,r]=a.path[a.pathIdx],c=i-a.x,d=r-a.z,h=Math.hypot(c,d),u=Math.hypot(n.x-a.x,n.z-a.z)<2.4;let f=0;if(u)a.yaw=Qt(a.yaw,Ze(n.x-a.x,n.z-a.z),8,e);else if(h<.4)(a.pauseT-=e)<=0&&(a.pathIdx=(a.pathIdx+1)%a.path.length,a.pauseT=2+a.id*7%5);else{const p=Math.min(Z0*e,h);t.world.moveCircle(a.x,a.z,c/h*p,d/h*p,a.radius,In);const m=Math.hypot(In.x-a.x,In.z-a.z);m<p*.2&&(a.pathIdx=(a.pathIdx+1)%a.path.length),a.x=In.x,a.z=In.z,a.y=t.world.surface(a.x,a.z),a.walk+=m*4.4,a.yaw=Qt(a.yaw,Ze(c,d),9,e),f=.55}a.move=je(a.move,f,10,e)}}}const At=5,zn=["Quiet","Stirred","Roused","Wild","Dire","Unbound"].map((s,e)=>({rank:e,name:s,level:Math.floor(e/2),hp:1+.14*e,atk:1+.07*e,purse:1+.1*e,pay:1+.25*e,luck:.18*e,conditions:[0,1,1,2,2,3][e]})),Go={swift:{name:"Swift",text:"Creatures move and strike a fifth faster.",quick:1.2},thick:{name:"Thick-hided",text:"Creatures have a third more health.",hp:1.35},packs:{name:"In numbers",text:"More creatures on every island.",purse:1.35},leaders:{name:"Pack leaders",text:"An elder creature leads every pack.",leader:!0},volatile:{name:"Volatile",text:"Creatures burst a moment after they fall. Step away.",burst:[2.3,.9,.8]},strays:{name:"Strays",text:"Creatures from another place have wandered in.",strays:3},dark:{name:"After dark",text:"It is night there. Creatures notice you from farther off, and carry a third more glint.",hour:23.2,aggro:1.4,glint:1.33,only:(s,e)=>!e.realm&&e.hour>7&&e.hour<19.5},angry:{name:"Woken angry",text:"The elder is enraged from three quarters of its health, not half.",rageAt:.75,only:s=>s.goal==="hunt"}},Q0=Object.keys(Go);function Ma(s,e,t){const n=Ft(e.biome),o=zn[Math.min(At,Math.max(0,s|0))].conditions,a=Q0.filter(r=>{const c=Go[r];return!c.only||n!==void 0&&c.only(e,n)}),i=[];for(;i.length<o&&a.length;)i.push(a.splice(Math.floor(t()*a.length),1)[0]);return i}function rn(s){const e=Math.min(At,Math.max(0,(s?.threat??0)|0)),n={...zn[e],quick:1,aggro:1,glint:1,leader:!1,burst:null,strays:0,hour:null,rageAt:.5,list:[]};for(const o of s?.conditions??[]){const a=Go[o];a&&(n.list.push({id:o,name:a.name,text:a.text}),a.hp&&(n.hp*=a.hp),a.atk&&(n.atk*=a.atk),a.purse&&(n.purse*=a.purse),a.quick&&(n.quick*=a.quick),a.aggro&&(n.aggro*=a.aggro),a.glint&&(n.glint*=a.glint),a.leader&&(n.leader=!0),a.burst&&(n.burst=a.burst),a.strays&&(n.strays=a.strays),a.hour&&(n.hour=a.hour),a.rageAt&&(n.rageAt=a.rageAt))}return n}function ec(s,e,t,n){const o=rn(t);let a=e.monsters;if(o.strays){const u=Ro.filter(m=>m.mission&&m.id!==e.id&&m.monsters.length>0),f=u[Math.floor(n()*u.length)],p=new Set(a.map(m=>m[0]));a=[...a,...f.monsters.filter(m=>!p.has(m[0])).slice(0,o.strays).map(m=>[m[0],3])]}const i=u=>{const f=a.filter(m=>_t[m[0]].cost<=u);if(!f.length)return null;let p=n()*f.reduce((m,v)=>m+v[1],0);for(const m of f)if(p-=m[1],p<=0)return m[0];return f[0][0]},r=u=>{const f=[],p=i(u);for(let m=p;m&&f.length<6;m=n()<.6&&_t[p].cost<=u?p:i(u))f.push(m),u-=_t[m].cost;return f},c=s.rooms,d=c.filter(u=>u.kind==="fight");for(const u of c)if(u.waves=[],u.pods=0,u.kind==="fight"){const f=d.indexOf(u)/Math.max(1,d.length-1),p=(2.6+t.tier*.45)*(.8+.7*f)*o.purse,m=1+(n()<.3+.35*f?1:0);for(let v=0;v<m;v++)u.waves.push(r(p*(v?.8:1)));u.pods=n()<.45?1:0}else u.kind==="cache"?(u.pods=1,n()<.6&&u.waves.push(r((2.4+t.tier*.3)*o.purse))):u.kind==="boss"&&e.boss&&u.waves.push(["@"+e.boss]);let h=0;if(t.goal==="recover"){h=Math.min(3,d.length);for(let u=0;u<h;u++){const f=d[Math.floor((u+.5)*d.length/h)];f.pods=Math.max(1,f.pods)}}return h}const hs={sweep:{name:"Clear the way",brief:"Clear every island on the way to the far pad."},recover:{name:"Recover the cores",brief:"Survey cores went down in supply pods. Find them and bring them out."},hunt:{name:"Bring down the elder",brief:"Something old holds the last island. Put it down."}},tc={seed:4099,biome:"glasswood",goal:"hunt",tier:1,rooms:2,name:"First Light",xp:90,glint:60,first:!0},_a=["Quiet","Long","Broken","High","Pale","Far","Hollow","Bright","Last","Low","Wide","Thin"],Ta=["Stair","Reach","Chain","Crossing","Ledge","Span","Garden","Shelf","Rise","Hollow","Walk","Crown"],nc=["sweep","recover","hunt"],sc=["weapon","offhand",void 0,void 0,void 0],to=["Risen","Wrathful","Ancient","Dread","Undying"],oc=["","II","III","IV","V","VI","VII","VIII","IX","X"],Sa=[[.86,.3,.32],[.62,.38,.9],[.95,.84,.5],[.3,.78,.74],[.98,.96,.92]];function ac(s,e){const t=s-1;if(t<1)return e;const n=e.replace(/^The /,""),o=to[Math.min(to.length,t)-1],a=t-to.length;return`${o} ${n}${a>0?" "+(oc[Math.min(a,9)]||String(a+1)):""}`}const ic=s=>1+.2*Math.max(0,s-1);function rc(s){const e=qs.filter(n=>n!==s.biome),t=kt((s.seed^1831565813)>>>0);for(let n=e.length-1;n>0;n--){const o=Math.floor(t()*(n+1));[e[n],e[o]]=[e[o],e[n]]}return[s.biome,...e]}function lc(s){return{base:s,depth:s.depth||1,cleared:0,haul:{glint:0,payGlint:0,payXp:0,items:[],relics:[]},kills:0,time:0,marks:0,markNeed:0,prizes:[]}}class cc{game;offers=[];pending=null;active=null;report=null;threat=null;stock=[];run=null;padT=0;constructor(e){this.game=e,e.bus.on("relic:found",t=>{this.active&&(this.active.relic=t.item),this.run&&this.run.haul.relics.push(t.item)}),e.bus.on("pickup",t=>{const n=this.run;!n||!this.active||(t.item==="glint"&&(n.haul.glint+=t.n||0),t.gear&&!t.gear.relic&&n.haul.items.push(t.gear.uid))}),e.bus.on("player:respawn",()=>{this.active&&this.home(!1)})}arrive(){const e=this.game;for(const t of bo.crew)e.spawner.spawnNpc(t);for(const t of e.world.gates)t.shut=!1;this.refresh()}refresh(){const e=this.game.player.sheet,t=kt((e.board||0)*7919+1013>>>0);ma(((e.board||0)+1)*2654435761),this.stock=[0,1,2,3,4].map(o=>Zt({ilvl:Math.max(1,e.level),cls:e.cls,family:o<2?ze[e.cls].family:void 0,rarity:o===4?2:1,slot:sc[o]}));const n=Math.floor(t()*qs.length);this.offers=[0,1,2].map(o=>{const a=qs[(n+o)%qs.length],i=nc[(o+(e.board||0))%3],r=Math.max(1,e.level+o-1+(i==="hunt"?1:0)),c=Math.min(6,3+Math.floor(t()*2)+Math.floor(r/4)),d=Math.floor(t()*2**31),h=Math.min(At,(e.threat[a]??0)|0),u=zn[h].pay;return{seed:d,biome:a,goal:i,tier:r,rooms:c,threat:h,conditions:Ma(h,{biome:a,goal:i},kt((d^1374496523)>>>0)),name:`${_a[Math.floor(t()*_a.length)]} ${Ta[Math.floor(t()*Ta.length)]}`,xp:Math.round((30+c*14)*(1+.3*(r-1))*(i==="hunt"?1.3:1)*u),glint:Math.round((22+c*9)*(1+.25*(r-1))*u)}}),e.first&&(this.offers=[{...tc}])}accept(e){!this.offers[e]||this.active||(this.pending=this.offers[e],this.game.bus.emit("mission:taken",this.pending))}drop(){this.pending=null,this.game.bus.emit("mission:taken",null)}deeperOffer(){const e=this.run;if(!e||e.base.first)return null;const t=e.base,n=e.depth+1,o=n-1,a=rc(t),i=a[o%a.length],r=Math.floor(Lt(t.seed&65535,n,t.seed>>>16)*2**31),c=t.threat??0,d=Math.min(At,c+o),h=t.tier+o-(Math.floor(d/2)-Math.floor(c/2)),u=Math.min(6,3+Math.floor(n/2)),f=zn[d].pay*ic(n);return{seed:r,biome:i,goal:"hunt",tier:h,rooms:u,threat:d,conditions:Ma(d,{biome:i,goal:"hunt"},kt((r^1374496523)>>>0)),name:t.name,xp:Math.round((30+u*14)*(1+.3*(h+o-1))*1.3*f),glint:Math.round((22+u*9)*(1+.25*(h+o-1))*f),depth:n}}overRank(){const e=this.active,t=this.run;return!e||!t?0:Math.max(0,(t.base.threat??0)+(e.offer.depth||1)-1-At)}upgradeElder(e,t){const n=t-1;if(n<1)return;e.maxHp=e.hp=Math.round(e.maxHp*(1+.15*n)),e.atk*=1+.05*n,e.quick=Math.min(1.5,(e.quick||1)*(1+.07*n)),e.rageAt=Math.min(.8,(e.rageAt||.5)+.06*n),e.luck=(e.luck||0)+.25*n,e.scale*=Math.min(1.22,1+.045*n);const o=e.def;e.def={...o,epithet:`Depth ${t}. ${o.epithet||""}`.trim(),specials:o.specials.map(r=>({...r,every:r.every/(1+.08*n),...r.kind==="barrage"&&r.count?{count:r.count+Math.min(6,n)}:{},...r.kind==="summon"&&r.count?{count:r.count+Math.floor(n/2)}:{},...(r.kind==="slam"||r.kind==="cloud")&&r.r?{r:r.r*(1+.04*Math.min(5,n))}:{}}))},e.name=ac(t,o.name);const a=Sa[Math.min(Sa.length,n)-1],i=Math.min(.32,.08*n);e.colors[0]=e.colors[0].map(r=>r*(1-i)),e.colors[1]=e.colors[1].map((r,c)=>r*.35+a[c]*.65)}deploy(){const e=this.game,t=this.pending;if(!t)return;const n=t.first?U0(t):$0(t),o=kt((t.seed^625341585)>>>0),a=Ft(t.biome);let i=n.laid||!a?0:ec(n,a,t,o);ma(t.seed),e.enter(n);const r=n.rooms,c=e.world.structures.filter(h=>h.role==="pod");if(t.goal==="recover"){const h=c.filter(u=>r[u.room].kind==="fight"&&!u.terrace);if(h.length&&i>0)for(let u=0;u<i;u++)h[Math.floor((u+.5)*h.length/i)].core=!0;i=h.filter(u=>u.core).length}this.active={offer:t,need:i,cores:0,done:!1,over:0,kills:0,time:0,marks:0,markNeed:e.world.structures.filter(h=>h.site==="mark").length,revealed:!1,rooms:r.map(h=>({state:h.waves.length?"asleep":"clear",wave:-1,alive:[]}))},this.pending=null,(!this.run||(t.depth||1)<=1)&&(this.run=lc(t)),this.run.depth=t.depth||1,this.openGates(0);const d=this.threat=rn(t);d.hour!=null&&(e.hour=d.hour),e.bus.emit("mission:begin",{offer:t,biome:e.biome,goal:hs[t.goal],threat:d}),d.rank&&e.bus.emit("log",{text:`Threat: ${d.name}.${d.list.map(h=>` ${h.name}: ${h.text}`).join("")}`}),e.player.sheet.missions||e.bus.emit("log",{text:"A jump clears a gap, gets you onto a terrace, and takes you over a blow that runs along the ground."})}openGates(e){const t=this.game;for(const n of t.world.gates){const o=t.world.nav.links[n.link];!o||o.a!==e||!n.shut||(n.shut=!1,n.st&&t.bus.emit("world:changed",t.world.setState(n.st,1)))}}update(e){const t=this.game,n=t.player,o=t.world;if(t.paused||n.dead)return;const a=this.active;if(!a){const d=o.structures.find(u=>u.role==="deploy"),h=!!(d&&Math.hypot(n.x-d.x,n.z-d.z)<1.9);h&&this.pending?(this.padT+=e,t.bus.emit("fade",this.padT>.5?0:1),this.padT>1.15&&(this.padT=0,this.deploy())):(h&&!this.pending&&this.padT===0&&(this.padT=-1,t.bus.emit("log",{text:"The pad is cold. Take a contract from Ilse, at the hall, first."})),h||(this.padT=0),t.bus.emit("fade",1));return}if(a.time+=e,a.over>0){a.over-=e,t.bus.emit("fade",a.over<.7?0:1),a.over<=0&&this.home(!0);return}const i=o.rooms,r=o.roomAt(n.x,n.z,1.8);r>=0&&a.rooms[r].state==="asleep"&&(i[r].kind!=="boss"||o.roomAt(n.x,n.z,6)===r)&&(a.rooms[r].state="awake",i[r].kind==="boss"&&this.seal(r,!0),this.nextWave(r));for(let d=0;d<a.rooms.length;d++){const h=a.rooms[d];h.state==="awake"&&(h.alive=h.alive.filter(u=>!u.gone&&(!u.dead||!!u.def.fall)),!h.alive.length&&(h.wave+1<i[d].waves.length?(h.wait=(h.wait??.9)-e,h.wait<=0&&(h.wait=void 0,this.nextWave(d))):(h.state="clear",this.openGates(d),a.offer.first&&d===1&&t.loot.dropGear(i[d].x,o.surface(i[d].x,i[d].z),i[d].z,Zt({ilvl:2,cls:n.sheet.cls,family:ze[n.sheet.cls].family,slot:"weapon",rarity:1})),t.bus.emit("room:clear",{room:d,kind:i[d].kind}),i[d].kind==="boss"&&(this.seal(d,!1),this.finish()))))}for(const d of o.structures)d.role!=="pod"||d.pal||Math.hypot(n.x-d.x,n.z-d.z)>1.75||a.rooms[d.room]&&a.rooms[d.room].state==="awake"||(t.bus.emit("world:changed",o.setState(d,1)),t.loot.spill(d.x,o.surface(d.x,d.z),d.z,a.offer.tier,!!d.core),t.bus.emit("pod:open",{x:d.x,y:o.surface(d.x,d.z),z:d.z,core:!!d.core}),d.core&&(a.cores++,t.bus.emit("mission:progress",{cores:a.cores,need:a.need,marks:a.marks,markNeed:a.markNeed})));const c=o.structures.find(d=>d.role==="leave");c&&Math.hypot(n.x-c.x,n.z-c.z)<1.9?this.met()?(this.padT+=e,this.padT>.6&&(this.padT=0,this.finish())):this.padT===0&&(this.padT=-1,t.bus.emit("log",{text:a.offer.goal==="recover"?`Not yet: ${a.need-a.cores} of the cores are still out there.`:"Not yet: an island on the way is not clear."})):this.padT=0}seal(e,t){const n=this.game;for(const o of n.world.gates){const a=n.world.nav.links[o.link];!a||a.b!==e||o.shut===t||(o.shut=t,o.st&&n.bus.emit("world:changed",n.world.setState(o.st,t?0:1)),t&&n.bus.emit("gate:shut",{x:o.x,y:n.world.surface(o.x,o.z),z:o.z}))}}nextWave(e){const t=this.game,n=t.world,o=this.active;if(!o)return;const a=n.rooms[e],i=o.rooms[e],r=t.player,c=a.waves[++i.wave],d=this.threat||rn(o.offer),h=o.offer.tier+d.level;let u=!d.leader||a.kind!=="fight";c.forEach((f,p)=>{const m=f[0]==="@",v=m?f.slice(1):f;let g=a.x,x=a.z;for(let z=0;z<24;z++){const C=Math.atan2(a.x-r.x,a.z-r.z),k=m?C:C+(p-(c.length-1)/2)*.75+(se()-.5)*.5+z*.9,P=(m?.2:.35+se()*.3)*ht(a,k);if(g=a.x+Math.sin(k)*P,x=a.z+Math.cos(k)*P,Math.hypot(g-r.x,x-r.z)>4.5&&n.walkable(g,x))break}const b=!m&&!u;b&&(u=!0);const _=t.spawner.spawnMonster(v,g,x,h+(m?1:0),b);this.temper(_),m&&this.upgradeElder(_,o.offer.depth||1),_.room=e,m&&(_.yaw=Math.atan2(-(r.x-g),r.z-x)),m&&o.offer.first&&(_.maxHp=_.hp=Math.round(_.maxHp*.4),_.atk*=.7),$s(_),i.alive.push(_),m&&t.bus.emit("boss:arrive",_)}),t.bus.emit("room:wave",{room:e,wave:i.wave})}temper(e){const t=this.threat,n=this.overRank();if(n&&(e.maxHp=e.hp=Math.round(e.maxHp*(1+.1*n)),e.atk*=1+.05*n),!t||!this.active||!t.rank&&!t.list.length)return e;if(e.maxHp=e.hp=Math.round(e.maxHp*t.hp),e.atk*=t.atk,e.quick=t.quick,e.aggro*=t.aggro,e.glintMul=t.glint,e.luck=t.luck,e.boss)e.rageAt=t.rageAt;else{t.burst&&(e.burst=t.burst),e.scale*=1+.02*t.rank;const o=[.29,.3,.37];e.colors[0]=e.colors[0].map((a,i)=>a*(1-.07*t.rank)+o[i]*.07*t.rank)}return e}onKill(){this.active&&this.active.kills++}reinforce(e,t,n){const o=this.game,a=o.world,i=this.active;if(!i||!_t[t])return;const r=i.rooms[e.room];if(!(!r||r.alive.filter(c=>!c.dead&&!c.boss).length>=5))for(let c=0;c<n;c++){const d=se()*6.283,h=2.5+se()*2.5;let u=e.x+Math.sin(d)*h,f=e.z+Math.cos(d)*h;a.walkable(u,f)||(u=e.x,f=e.z);const p=o.spawner.spawnMonster(t,u,f,Math.max(1,e.level-1));this.temper(p),p.room=e.room,$s(p),p.called=!0,r.alive.push(p)}}met(){const e=this.active,t=this.game.world;return e?e.offer.goal==="recover"?e.cores>=e.need:e.offer.goal==="hunt"?e.rooms.some((n,o)=>t.rooms[o].kind==="boss"&&n.state==="clear"):e.rooms.every((n,o)=>!t.rooms[o].main||n.state==="clear"):!1}track(){const e=this.active,t=this.game.world;if(!e)return this.pending?`${this.pending.name}: step onto the pad`:"";const n=(e.offer.depth||1)>1?`Depth ${e.offer.depth} · `:"";if(e.choosing)return`${n}Done: lift out, or go deeper`;if(e.done)return e.over>3?`Done: lifting out in ${Math.ceil(e.over)}`:"Done: lifting out";const o=e.markNeed&&e.marks<e.markNeed?` · Survey marks ${e.marks} of ${e.markNeed}`:"";return n+this.goalLine(e,t)+o}goalLine(e,t){if(e.offer.goal==="recover")return e.cores>=e.need?"Cores recovered: reach the far pad":`Survey cores: ${e.cores} of ${e.need}`;if(e.offer.goal==="hunt")return"Find the elder on the last island";const o=e.rooms.filter((a,i)=>t.rooms[i].kind==="fight").filter(a=>a.state!=="clear").length;return o?`Islands to clear: ${o}`:"All clear: reach the far pad"}finish(){const e=this.active;if(!e||e.done)return;e.done=!0;const t=this.run;if(e.offer.first||!t){e.over=e.offer.goal==="hunt"?10:2.6,this.game.bus.emit("mission:done",{offer:e.offer,choose:!1});return}this.payDepth(e,t),e.choosing=!0,this.game.bus.emit("mission:done",{offer:e.offer,choose:!0})}payDepth(e,t){const n=this.game,o=n.player.sheet,a=e.offer.depth||1,i=1+.15*e.marks,r=e.markNeed>0&&e.marks>=e.markNeed;t.cleared=Math.max(t.cleared,a),t.haul.payGlint+=Math.round(e.offer.glint*i),t.haul.payXp+=Math.round(e.offer.xp*i);const c=this.threat||rn(e.offer),d=Zt({ilvl:e.offer.tier+Math.max(0,a-1),cls:o.cls,family:ze[o.cls].family,rarity:Math.min(3,(e.offer.goal==="hunt"?2:1)+(r?1:0)+(a>=3?1:0)),luck:.4+c.luck+.2*(a-1)});o.gear.length<Mt&&(o.gear.push(d),t.prizes.push(d),t.haul.items.push(d.uid),n.bus.emit("bag:changed"))}choose(e){const t=this.active;!t||!t.choosing||(t.choosing=!1,e&&this.deeperOffer()?this.descend():(t.over=2.6,this.game.bus.emit("mission:done",{offer:t.offer,choose:!1})))}foldActive(){const e=this.active,t=this.run;!e||!t||(t.kills+=e.kills,t.time+=e.time,t.marks+=e.marks,t.markNeed+=e.markNeed,e.kills=e.time=e.marks=e.markNeed=0)}descend(){const e=this.game,t=e.player,n=this.deeperOffer(),o=this.run;!n||!o||(e.loot.gather(),this.foldActive(),this.active=null,this.pending=n,e.bus.emit("run:deeper",{depth:n.depth||2}),this.deploy(),t.hp=t.maxHp,t.focus=t.maxFocus)}home(e){const t=this.game,n=t.player,o=this.active;if(!o)return;const a=n.sheet,i=o.offer.first?null:this.run;i&&this.foldActive();const r=i?i.kills:o.kills,c=i?i.time:o.time,d=i?i.marks:o.marks,h=i?i.markNeed:o.markNeed,u=i?i.cleared>0:e,f=!!(i&&!e&&i.depth>1&&!o.choosing);let p=0,m=0;const v={glint:0,xp:0,items:[]};if(i&&u){if(p=i.haul.payXp,m=i.haul.payGlint,f){v.xp=Math.ceil(p/2),v.glint=Math.ceil(m/2),p-=v.xp,m-=v.glint;const z=Math.min(a.glint,Math.ceil(i.haul.glint/2));a.glint-=z,v.glint+=z;const C=new Set(Object.values(a.equip).filter(P=>!!P).map(P=>P.uid)),k=a.gear.filter(P=>i.haul.items.includes(P.uid)&&!C.has(P.uid)&&!P.relic);for(let P=Math.ceil(k.length/2);P>0;P--)v.items.push(k.splice(Math.floor(se()*k.length),1)[0]);a.gear=a.gear.filter(P=>!v.items.includes(P)),t.bus.emit("bag:changed")}}else if(!i&&e){const z=1+.15*d;p=Math.round(o.offer.xp*z),m=Math.round(o.offer.glint*z)}const g=i?i.prizes.filter(z=>!v.items.includes(z)).sort((z,C)=>C.rarity-z.rarity)[0]:void 0,x=!!(i&&i.cleared>1&&i.cleared>(a.deepest||0));i&&(a.deepest=Math.max(a.deepest||0,i.cleared)),this.report={won:u,offer:i?i.base:o.offer,relic:i?i.haul.relics[0]||null:o.relic||null,kills:r,time:c,xp:p,glint:m,marks:d,markNeed:h,...i?{depth:i.depth,cleared:i.cleared,record:x,found:i.haul.items.length,...f?{lost:v}:{},...g?{prize:g}:{}}:{}};const b=i?i.base:o.offer,_=this.threat||rn(o.offer);if(this.threat=null,!b.first){a.threat=a.threat||{};const z=(a.threat[b.biome]??0)|0,C=Math.max(0,Math.min(At,z+(u?1:-1)));a.threat[b.biome]=C,C!==z&&(this.report.threat={was:z,now:C,name:zn[C].name})}if(a.boon=null,e&&t.loot.gather(),this.active=null,this.run=null,t.enter(ji(bo)),this.arrive(),u){if(a.board=(a.board||0)+1,a.missions=(a.missions||0)+1,o.offer.first&&(a.first=!1,t.loot.add("wisp_ember",6)),a.glint+=m,!i){const z=h>0&&d>=h,C=Zt({ilvl:o.offer.tier,cls:a.cls,family:ze[a.cls].family,rarity:Math.min(3,(o.offer.goal==="hunt"?2:1)+(z?1:0)),luck:.4+_.luck});a.gear.length<20&&(a.gear.push(C),this.report.prize=C)}this.refresh(),t.combat.grantXp(p)}dt(n),n.hp=n.maxHp,n.focus=n.maxFocus,t.save(),t.bus.emit("mission:report",this.report)}}const dc=Object.keys(en);class hc{game;list=[];constructor(e){this.game=e,e.bus.on("zone",()=>this.arrive())}arrive(){const e=this.game,t=e.world;this.list=[];for(const n of t.structures){if(n.role!=="site"||!n.site)continue;const o=n.site,a=ts[o],i=Fo(n.id),r=t.surface(n.x,n.z)+(i?i.height:1)*n.scale+.25,c=e.entities.add(Gt("site","drop",{x:n.x,z:n.z,y:r,radius:.55,height:.8,extra:3,scale:1.5,colors:lt([a.color,a.color,a.color]),name:a.name,site:o}));this.list.push({st:n,site:o,S:a,e:c,room:n.room,used:!1,guard:null})}}update(e){const t=this.game,n=t.player,o=t.missions.active;if(!(!o||n.dead||o.done))for(const a of this.list){if(a.used)continue;const i=Math.hypot(n.x-a.st.x,n.z-a.st.z),r=!o.rooms[a.room]||o.rooms[a.room].state!=="awake";a.S.guard&&!a.guard&&r&&i<8.5&&this.wake(a),!(i>a.S.reach||!r||a.guard&&!a.guard.dead)&&this.use(a)}}wake(e){const t=this.game,n=t.missions.active;if(!n)return;const o=t.world.biome().monsters,a=o[Math.floor(se()*Math.min(3,o.length))][0],i=se()*6.283;let r=e.st.x+Math.sin(i)*2.6,c=e.st.z+Math.cos(i)*2.6;t.world.walkable(r,c)||(r=t.world.rooms[e.room].x,c=t.world.rooms[e.room].z);const d=t.missions.temper(t.spawner.spawnMonster(a,r,c,n.offer.tier,!0));d.room=e.room,$s(d),e.guard=d;const h={site:e.site,name:e.S.name,guard:d};t.bus.emit("site:guard",h)}use(e){const t=this.game,n=t.player,o=t.missions.active;if(!o)return;const a=n.sheet,i=o.offer.tier,r=e.st.x,c=e.st.z,d=t.world.surface(r,c);let h="";if(e.site==="mark")o.marks++,t.loot.drop(r,d,c,"glint",Math.round(8*(1+.25*(i-1)))),h=o.marks>=o.markNeed?"Every survey mark logged: the contract pays its best.":`Survey mark logged: ${o.marks} of ${o.markNeed}.`;else if(e.site==="beacon")o.revealed=!0,t.combat.grantXp(Math.round(14*(1+.3*(i-1)))),h="Beacon lit: everything left to find is on the map.";else if(e.site==="crystal"){const m=n0(dc.filter(v=>v!==a.boon));a.boon=m,dt(n),n.hp=Math.min(n.maxHp,n.hp+n.maxHp*.35),h=`${en[m].name}: ${en[m].desc} It lasts until you are lifted out.`,t.bus.emit("boon",{entity:n,id:m})}else e.site==="cargo"&&(t.loot.dropGear(r,d,c,Zt({ilvl:i,cls:a.cls,rarity:2,luck:.8})),t.loot.drop(r,d,c,"glint",Math.round(20*(1+.25*(i-1)))),t.loot.drop(r,d,c,se()<.5?"tonic":"draught",1),h="The cargo is yours.");e.used=!0,e.e.gone=!0;const u=e.e.colors[0],f=[u[0],u[1],u[2]],p={site:e.site,name:e.S.name,text:h,x:r,y:d,z:c,color:f};t.bus.emit("site:used",p),t.bus.emit("mission:progress",{cores:o.cores,need:o.need,marks:o.marks,markNeed:o.markNeed})}}const Pa={shop:[[150,178,120],[222,178,110],[122,62,44]],bounty:[[84,108,156],[116,156,138],[150,142,132]]};class fc{game;constructor(e){this.game=e}update(e){const t=this.game;t.monsters.some(n=>n.gone)&&(t.monsters=t.monsters.filter(n=>!n.gone))}spawnMonster(e,t,n,o,a=!1){const i=this.game,r=_t[e],c=F0(r,o,a),d=r.boss?null:i.world.biome(t,n).variant,h=d?d.pencil:r.colors[0],u=d?`${d.prefix} ${r.name}`:r.name,f=se()*6.283,p=r.scale*(a?1.45:1)*(r.giant?1:.94+se()*.12),m=a?[h[0]*.55+74*.45,h[1]*.55+77*.45,h[2]*.55+94*.45]:h,v=se()*3,g=Gt("monster",r.archetype,{x:t,z:n,y:i.world.surface(t,n),yaw:f,scale:p,grow:0,hitY:r.hitY,radius:r.radius*(a?1.4:1),height:r.height*(a?1.45:1),colors:lt([m,r.colors[1],r.colors[2]]),name:(a?"Elder ":"")+u,level:o,hp:c.maxHp,maxHp:c.maxHp,atk:c.atk,xp:c.xp,speed:r.speed,aggro:r.aggro*(a?1.3:1),def:r,defId:e,elite:a,boss:!!r.boss,enraged:!1,guard:!1,slow:1,slowT:0,rot:0,rotT:0,deathT:0,spilled:!1,room:-1,quick:1,glintMul:1,luck:0,rageAt:.5,burst:null,ai:{state:"idle",timer:v,cd:0,specCd:[],homeX:t,homeZ:n,wanderX:t,wanderZ:n,hitDone:!1,sp:null,spIdx:-1}});return i.entities.add(g),i.monsters.push(g),g}spawnNpc(e){const t=this.game,n=e.role==="bounty"?Pa.bounty:Pa.shop,o=e.path?e.path[0][0]:e.x??0,a=e.path?e.path[0][1]:e.z??0,i=e.path?e.path[1]:e.face??[o,a+1],r=Math.atan2(o-i[0],-(a-i[1])),c=wt[e.people]??wt.unit,d=e.color??n[0];return t.entities.add(Gt("npc","humanoid",{x:o,z:a,y:t.world.surface(o,a),yaw:r,radius:.45,height:1.6*c.scale,scale:c.scale,extra:c.index,kit:3,seed:e.seed??Math.random(),colors:lt([d,e.trim??d,e.hair??c.hair[0]]),name:e.name,role:e.role,title:e.title||"",people:e.people,says:e.says??[],sayIdx:-1,path:e.path??null,pathIdx:0,pauseT:1+Math.random()*3}))}}class uc{rooms;links;gates;constructor(e){this.rooms=e.rooms;const t=e.links.map(n=>{const o=e.rooms[n.a],a=e.rooms[n.b],i=a.x-o.x,r=a.z-o.z,c=Math.hypot(i,r),d=i/c,h=r/c,u=Math.atan2(d,h),f=ht(o,u)-1,p=c-(ht(a,u+Math.PI)-1);return{a:n.a,b:n.b,ax:o.x,az:o.z,ux:d,uz:h,len:c,w:n.w,t0:f,t1:p,ha:o.h,hb:a.h,ang:u,tmin:0,tmax:c,gate:!!n.gate,gap:n.gap??0,part:1}});for(const n of[...t]){if(!n.gap)continue;const o=(n.t0+n.t1)/2;t.push({...n,tmin:o+n.gap/2,part:2}),n.tmax=o-n.gap/2}this.links=t,this.gates=[]}roomAt(e,t,n=0){for(const o of this.rooms){const a=e-o.x,i=t-o.z,r=Math.hypot(a,i);if(r<o.r*1.2&&r<ht(o,Math.atan2(a,i))-n)return o.i}return-1}linkAt(e,t,n=0){for(const o of this.links){const a=e-o.ax,i=t-o.az,r=a*o.ux+i*o.uz;if(!(r<o.tmin+(o.tmin>0?n:0)||r>o.tmax-(o.tmax<o.len?n:0))&&Math.abs(a*o.uz-i*o.ux)<o.w/2-n)return o}return null}inside(e,t,n=.3){return this.roomAt(e,t,n)>=0||this.linkAt(e,t,n)!==null}shut(e,t,n,o){for(const a of this.gates){if(!a.shut)continue;const i=(e-a.x)*a.ux+(t-a.z)*a.uz,r=(n-a.x)*a.ux+(o-a.z)*a.uz;if(i>0==r>0&&Math.abs(r)>.45)continue;const c=(n-a.x)*-a.uz+(o-a.z)*a.ux;if(Math.abs(c)<a.w/2+.6&&Math.abs(r)<.6+Math.abs(i-r))return!0}return!1}}const pc={circle:[["stone",3.3,0,1],["stone",1.65,2.86,1.12],["stone",-1.65,2.86,.95],["stone",-3.3,0,1.15],["stone",-1.65,-2.86,1],["stone",1.65,-2.86,.9],["flowers",0,0,1.2]],grove:[["tree",0,0,1.85],["bush",2.9,.9,1.15],["bush",-2.5,1.7,1],["flowers",1.3,-2.8,1.2],["fern",-1.6,-2.6,1.2]],crystals:[["crystal",0,0,1.9],["crystal",1.9,1,1.3],["crystal",-1.6,1.5,1.5],["crystal",.5,-2,1.1],["pebbles",-2.2,-1.4,1.3]],ruins:[["ruin",0,0,1],["column",3,-1.6,1],["pebbles",-2.6,-2,1.3],["tallgrass",1.8,2.6,1.2]],bigcaps:[["bigcap",0,0,1.25],["bigcap",2.7,1.2,.9],["bigcap",-1.9,2.2,1.05],["mushroom",1.2,-2.2,1.3],["fern",-2.2,-1.5,1.1]],pines:[["pine",0,0,1.4],["pine",2.7,1.1,1.15],["pine",-2.4,1.7,1.25],["stump",1.4,-2.2,1.2],["cairn",-1.6,-2.3,1.2]],shards:[["shard",0,0,1.1],["shard",2.6,1.3,.85],["floater",-2.2,1.5,1.15],["crystal",1.1,-2.2,1.2]],spires:[["stone",0,0,1.25],["cairn",2.4,1.2,1.3],["stone",-2,1.6,.95],["pebbles",.8,-2.3,1.4]],corals:[["crystal",0,0,1.6],["bush",2.4,1.1,1.2],["flowers",-2.1,1.5,1.3],["pebbles",1,-2.2,1.3]],lanterns:[["willow",0,0,1.15],["reeds",2.5,1,1.2],["flowers",-2.2,1.6,1.2],["reeds",1,-2.3,1.1]]},Fe=He.CHUNK,We=He.CELL,at=Fe/We,mc=-6;function Fn(s){const e=Fo(s);if(!e)throw new Error(`Unknown prop: ${s}`);return e}function vc(s,e){const t=s.seed|0,n=Ft(s.biome);if(!n)throw new Error(`Unknown biome: ${s.biome}`);const o=n,a=s.rooms,i=e.links,r=o.walls||0;let c=0,d=null,h=null;function u(L,F){let O=1e9;d=null,h=null;for(let S=0;S<a.length;S++){const D=a[S],G=L-D.x,Y=F-D.z,j=Math.hypot(G,Y);if(j-D.r*1.25>O)continue;const ne=j-ht(D,Math.atan2(G,Y));ne<O&&(O=ne,c=D.h,h=D)}for(const S of i){const D=L-S.ax,G=F-S.az,Y=D*S.ux+G*S.uz,j=ue(Y,S.tmin,S.tmax);let ne=Math.hypot(D-S.ux*j,G-S.uz*j)-S.w/2;const V=Math.max(S.tmin>0?S.tmin-Y:-1,S.tmax<S.len?Y-S.tmax:-1);if(V>0&&(ne=Math.hypot(V,Math.max(Math.abs(D*S.uz-G*S.ux)-S.w/2,0))),ne<O){O=ne,h=null,d=S;const ge=ue((j-S.t0)/Math.max(.01,S.t1-S.t0),0,1);c=S.ha+(S.hb-S.ha)*(ge*ge*(3-2*ge))}}return O}let f=0;function p(L,F){let O=4;if(r)for(const S of i){if(!S.gap||S.part===2)continue;const D=L-S.ax,G=F-S.az,Y=D*S.ux+G*S.uz,j=Math.abs(D*S.uz-G*S.ux)-S.w/2,ne=Math.max(S.tmax-Y,Y-S.tmax-S.gap,j);ne<O&&(O=ne,f=j)}return O}const m=(L,F)=>p(L,F)<0;function v(L,F){const O=u(L,F),S=c;if(r&&O>0)return S;if(O<=0){if(!h)return S;const Y=h.terrace;if(Y&&Math.hypot(L-Y.x,F-Y.z)<Y.r)return S+Y.h;const j=h.kind==="boss"?.25:h.kind==="start"||h.kind==="exit"?Se(3.5,6.5,Math.hypot(L-h.x,F-h.z)):1;return S+gs(L*.07,F*.07,2,t+7)*o.roll*Se(0,-3,O)*j*.6}const D=Math.min(O,.6)*.8,G=Math.max(0,O-.6)*8+(O>.6?1.6*Vn(L*.35,F*.35,t+9)*Math.min(1,O-.6):0);return Math.max(S-D-G,mc)}const g=[],x=kt((t^1540483477)>>>0),b=[],_=new Set,z=(L,F,O)=>{const S=[];for(let D=Math.floor((F-O)/We);D<=Math.floor((F+O)/We);D++)for(let G=Math.floor((L-O)/We);G<=Math.floor((L+O)/We);G++)Math.hypot(ue(L,G*We,(G+1)*We)-L,ue(F,D*We,(D+1)*We)-F)<O&&S.push(`${G},${D}`);return S},C=(L,F,O,S=1)=>z(F,O,Fn(L).reach*S).every(D=>!_.has(D)),k=(L,F,O,S={})=>{const D=Fn(L),G={id:L,def:D,type:D.type,x:F,z:O,y:0,scale:1,rot:0,seed:x(),pal:0,room:-1,...S};G.y=v(F,O)-.04,g.push(G);for(const Y of z(F,O,D.reach*G.scale))_.add(Y);return b.push({x:F,z:O,r:D.reach*G.scale+.6}),G};function P(L,F,O){for(const S of i){const D=L-S.ax,G=F-S.az,Y=D*S.ux+G*S.uz;if(Y>S.tmin-1&&Y<S.tmax+1&&Math.abs(D*S.uz-G*S.ux)<S.w/2+O)return!0}return!1}function w(L,F,O){for(const S of i){const D=L-S.ax,G=F-S.az,Y=D*S.ux+G*S.uz;if(Y>S.t0-2.5&&Y<S.t1+2.5&&Math.abs(D*S.uz-G*S.ux)<S.w/2+O)return!0}return!1}for(const L of a)L.kind==="start"&&k("pad",L.x,L.z,{room:L.i,role:"arrive"}),L.kind==="exit"&&k("pad",L.x,L.z,{room:L.i,role:"leave",pal:1}),L.terrace&&b.push({x:L.terrace.x,z:L.terrace.z,r:L.terrace.r+1.4,soft:!0}),b.push({x:L.x,z:L.z,r:L.clear??(L.kind==="boss"?L.r*.8:L.kind==="cache"?2.5:L.r*.3),soft:!s.hub&&(L.kind==="fight"||L.kind==="boss")});for(let L=0;L<i.length;L++){const F=i[L];if(F.gate&&F.part!==2){const Y=F.t0+1.2;k("gate",F.ax+F.ux*Y,F.az+F.uz*Y,{rot:-F.ang,linkIndex:L,role:"gate",scale:F.w/4.6})}const O=F.t1+.4,S=(F.a+F.b)%2?1:-1,D=F.ax+F.ux*O+F.uz*S*(F.w/2+1.1),G=F.az+F.uz*O-F.ux*S*(F.w/2+1.1);!s.hub&&F.part!==2&&C("lamp",D,G)&&k("lamp",D,G)}if(r)for(const L of a){if(L.kind==="start"||L.kind==="stone")continue;const F=L.kind==="boss"?4:2,O=Math.PI/4+L.i%2*Math.PI/2;for(let S=0;S<F;S++){const D=O+S*(F===4?Math.PI/2:Math.PI),G=ht(L,D)-2.4,Y=L.x+Math.sin(D)*G,j=L.z+Math.cos(D)*G;!P(Y,j,2.6)&&C("brazier",Y,j)&&k("brazier",Y,j,{room:L.i})}}for(const L of s.fixtures||[])k(L.id,L.x,L.z,L);for(const L of a)L.terrace&&k("pod",L.terrace.x,L.terrace.z,{room:L.i,role:"pod",terrace:!0,rot:x()*6.283});for(const L of a)for(let F=0;F<(L.pods||0);F++)for(let O=0;O<30;O++){const S=x()*6.283,D=(L.kind==="cache"?.15+x()*.4:.5+x()*.3)*ht(L,S),G=L.x+Math.sin(S)*D,Y=L.z+Math.cos(S)*D;if(!(b.some(j=>Math.hypot(j.x-G,j.z-Y)<j.r+1.6)&&L.kind!=="cache")&&!g.some(j=>Math.hypot(j.x-G,j.z-Y)<4.6+j.def.reach*j.scale+1)&&!P(G,Y,2.2)){k("pod",G,Y,{room:L.i,role:"pod",rot:x()*6.283});break}}for(const L of a)for(const F of L.sites||[]){const O=ts[F],S=Fn(O.prop).reach*(O.scale||1);for(let D=0;D<90;D++){const G=x()*6.283,Y=(L.kind==="cache"?.08+x()*.62:.42+x()*.4)*ht(L,G),j=L.x+Math.sin(G)*Y,ne=L.z+Math.cos(G)*Y;if(!g.some(V=>Math.hypot(V.x-j,V.z-ne)<(D<60?5.2:4.3)+V.def.reach*V.scale+S)&&!P(j,ne,2.6)){k(O.prop,j,ne,{room:L.i,role:"site",site:F,scale:O.scale||1,rot:x()*6.283});break}}}const y=L=>o.leaf[Math.floor(L*o.leaf.length)%o.leaf.length],M=new Set(["tree","pine","bush","willow","bigcap","fern","tallgrass","reeds"]);function R(L,F,O,S){const D=pc[F];for(let G=0;G<40;G++){const Y=x()*6.283,j=(O+x()*(S-O))*ht(L,Y),ne=L.x+Math.sin(Y)*j,V=L.z+Math.cos(Y)*j;if(P(ne,V,4.5)||u(ne,V)>-4.2||g.some(T=>Math.hypot(T.x-ne,T.z-V)<4.2+T.def.reach*T.scale))continue;const ge=x()*6.283,I=Math.cos(ge),H=Math.sin(ge);let B=0;for(const[T,N,$,K]of D){const W=ne+N*I-$*H,J=V+N*H+$*I,ce=Fn(T);!C(T,W,J,K)||P(W,J,1.4)||u(W,J)>-ce.reach*K*.7-.3||(k(T,W,J,{room:L.i,scale:K,rot:x()*6.283,pal:T==="flowers"?Math.floor(x()*6):M.has(T)?y(x()):0}),B++)}return B&&b.push({x:ne,z:V,r:3.6,soft:!0}),B>0}return!1}if(o.landmarks&&o.landmarks.length&&!s.hub)for(const L of a){if(L.kind!=="fight"&&L.kind!=="boss")continue;const F=o.landmarks,O=Math.floor(x()*F.length);L.kind==="boss"?(R(L,F[O],.83,.9),R(L,F[(O+1)%F.length],.83,.9)):x()<.85&&R(L,F[O],.55,.72)}function E(L,F){if(!o.props.length)return null;const O=(L+.5)*We,S=(F+.5)*We,D=u(O,S);if(D>-1.4||!h)return null;const G=h,Y=Se(o.decor?-4:-5.5,-1.6,D);let j=Lt(L,F,t+22),ne=null;for(let B=0;B<o.props.length;B++)if(j-=fe(o.props[B][1],o.props[B][2],Y)*(G.kind==="cache"?.6:1),j<=0){ne=o.props[B];break}let V=null,ge=0;if(o.decor&&!s.hub){ge=Se(-.2,.3,gs(L*.21,F*.21,2,t+40));let B=Lt(L,F,t+41);for(const T of o.decor)if(B-=T[1]*(.6+2.4*ge)*(G.kind==="cache"?.7:1),B<=0){V=T[2]>=0?[T[0],0,0,T[2]]:[T[0],0,0];break}}const I=()=>ne?U(ne,!1,L,F,O,S,G):null,H=()=>V?U(V,!0,L,F,O,S,G):null;return ge>.55&&Y<.5?H()||I():I()||H()}function U(L,F,O,S,D,G,Y){const j=Fn(L[0]),ne=j.scale??[1,1],V=fe(ne[0],ne[1],Lt(O,S,t+23)),ge=Math.max(0,We/2-j.reach*V-.04),I=D+(Lt(O,S,t+24)*2-1)*ge,H=G+(Lt(O,S,t+25)*2-1)*ge;if(F?w(I,H,.8):P(I,H,1.6))return null;for(const T of b)if(!(F&&T.soft)&&Math.hypot(T.x-I,T.z-H)<T.r+j.reach*V*.5+(j.collide?.8:0))return null;if(u(I,H)>-j.reach*V*.6-.5)return null;let B=L[3];if(B===void 0){const T=Lt(O,S,t+30);B=o.leaf[Math.floor((T<.25?Lt(O,S,t+31):ue(Y.i*.37%1,0,.999))*o.leaf.length)]}return{def:j,x:I,y:v(I,H)-.06,z:H,scale:V,rot:Lt(O,S,t+26)*6.2832,seed:Lt(O,S,t+28),pal:B}}function Q(L,F){const O=L*Fe,S=F*Fe,D=Fe+2,G=new Float32Array(D*D),Y=new Float32Array(D*D),j=new Uint8Array(D*D);let ne=-1e9;for(let T=0;T<D;T++)for(let N=0;N<D;N++){const $=v(O+N-1,S+T-1);G[T*D+N]=$,Y[T*D+N]=u(O+N-1,S+T-1),j[T*D+N]=d?2:h?h.kind==="start"||h.kind==="exit"?3:1:0,$>ne&&(ne=$)}const V={cx:L,cz:F,maxH:ne,height:new Float32Array(Fe*Fe*4),color:new Uint8Array(Fe*Fe*4),mat:new Uint8Array(Fe*Fe*4),propsA:new Float32Array(at*at*4),propsB:new Uint8Array(at*at*4),props:[]};for(let T=0;T<Fe;T++)for(let N=0;N<Fe;N++){const $=O+N,K=S+T,W=(T*Fe+N)*4,J=(T+1)*D+N+1,ce=G[J],re=Y[J],ve=j[J],ee=Math.hypot((G[J+1]-G[J-1])/2,(G[J+D]-G[J-D])/2),Oe=.5+.5*gs($*.045,K*.045,2,t+30);let be=fe(o.ground[0],o.ground2[0],Oe),$e=fe(o.ground[1],o.ground2[1],Oe),Je=fe(o.ground[2],o.ground2[2],Oe);if(o.ground3){const de=Se(.08,.42,gs($*.026,K*.026,2,t+50))*.8;be=fe(be,o.ground3[0],de),$e=fe($e,o.ground3[1],de),Je=fe(Je,o.ground3[2],de)}const pt=re>0?Se(.1,.7,re):Se(.75,1.1,ee);be=fe(be,o.rock[0],pt),$e=fe($e,o.rock[1],pt),Je=fe(Je,o.rock[2],pt);const mt=Vn($*.05,K*.05,t+31),Tt=(o.snow||0)*Se(-.75,.1,mt+.4)*(1-pt);be=fe(be,.93,Tt),$e=fe($e,.95,Tt),Je=fe(Je,1,Tt);let Le=0,Re=r&&re<.3?1:0;if(!r){if(ve===2)Re=1-Se(-.9,-.5,re);else if(ve&&re<0)for(const de of i){const Ve=$-de.ax,Nt=K-de.az,vt=Ve*de.ux+Nt*de.uz;if(vt<-3||vt>de.len+3)continue;const te=Math.abs(Ve*de.uz-Nt*de.ux),ie=Math.min(Se(de.t0-5.5,de.t0-1,vt),1-Se(de.t1+1,de.t1+5.5,vt));Le=Math.max(Le,(1-Se(.9,2,te+.5*Vn($*.4,K*.4,t+32)))*ie)}if(ve===3){const de=a.find(Ve=>Math.hypot($-Ve.x,K-Ve.z)<6);de&&(Re=1-Se(3.6,4.3,Math.hypot($-de.x,K-de.z)))}}if(s.paving&&re<-.4)for(const de of s.paving){let Ve;if("r"in de)Ve=Math.hypot($-de.x,K-de.z)-de.r;else{const Nt=de.bx-de.ax,vt=de.bz-de.az,te=Nt*Nt+vt*vt,ie=ue((($-de.ax)*Nt+(K-de.az)*vt)/te,0,1);Ve=Math.hypot($-de.ax-Nt*ie,K-de.az-vt*ie)-de.w/2}Ve<.6&&(Re=Math.max(Re,1-Se(-.5,.5,Ve+.35*Vn($*.5,K*.5,t+33))))}Le>0&&(be=fe(be,.886,Le*.9),$e=fe($e,.737,Le*.9),Je=fe(Je,.51,Le*.9)),Re>0&&(be=fe(be,.9,Re),$e=fe($e,.89,Re),Je=fe(Je,.86,Re)),Le=Math.max(Le*.5,Re);const qn=Math.max(pt,Tt,Math.max(Le*2,Re)),Ln=o.grass*(1-Math.min(1,qn)),fn=o.sand*Se(.45,.7,Oe)*(1-pt)*(1-Math.min(1,Le*2));V.height[W]=ce;const St=r?p($,K):4;V.height[W+2]=r?ue(St,-4,4):o.flowers*Ln,V.height[W+3]=r?ue(St<0?f:re,-4,4):0,V.color[W]=be*255,V.color[W+1]=$e*255,V.color[W+2]=Je*255,V.color[W+3]=Le*255,V.mat[W]=Ln*255,V.mat[W+1]=fn*255,V.mat[W+2]=Tt*255,V.mat[W+3]=pt*255}const ge=L*at,I=F*at,H=T=>{const N=T.def.reach*T.scale*1.35,$=Math.min(.85,.3+T.def.height*.12),K=Math.max(0,Math.floor(T.x-N-O)),W=Math.min(Fe-1,Math.ceil(T.x+N-O)),J=Math.max(0,Math.floor(T.z-N-S)),ce=Math.min(Fe-1,Math.ceil(T.z+N-S));for(let re=J;re<=ce;re++)for(let ve=K;ve<=W;ve++){const ee=$*(1-Se(.35*N,N,Math.hypot(O+ve-T.x,S+re-T.z))),Oe=(re*Fe+ve)*4+1;ee>V.height[Oe]&&(V.height[Oe]=ee)}},B=(T,N,$)=>{const K=($*at+N)*4;return V.propsA[K+3]!==0?!1:(V.propsA[K]=T.x-(O+(N+.5)*We),V.propsA[K+1]=T.z-(S+($+.5)*We),V.propsA[K+2]=T.y,V.propsA[K+3]=T.def.type,V.propsB[K]=(T.rot/6.2832%1+1)%1*255,V.propsB[K+1]=ue(T.scale/2,0,1)*255,V.propsB[K+2]=T.seed*255,V.propsB[K+3]=T.pal,!0)};for(const T of g){const N=T.def.reach*T.scale;if(!(T.x+N<O-2||T.x-N>O+Fe+2||T.z+N<S-2||T.z-N>S+Fe+2)){T.def.height>1.2&&H(T),T.x>=O&&T.x<O+Fe&&T.z>=S&&T.z<S+Fe&&V.props.push(T);for(let $=0;$<at;$++)for(let K=0;K<at;K++){const W=ue(T.x,O+K*We,O+(K+1)*We),J=ue(T.z,S+$*We,S+($+1)*We);Math.hypot(W-T.x,J-T.z)<N&&!B(T,K,$)&&console.warn(`${s.id}: ${T.id} overlaps another fixture in one cell`)}}}for(let T=-1;T<=at;T++)for(let N=-1;N<=at;N++){const $=E(ge+N,I+T);$&&(H($),!(N<0||T<0||N>=at||T>=at)&&B($,N,T)&&V.props.push($))}V.maxH+=r;for(const T of V.props)T.y+T.def.height*T.scale>V.maxH&&(V.maxH=T.y+T.def.height*T.scale);return V}return{biome:o,inPit:m,generateChunk:Q,structures:g}}const it=He.CHUNK,qa=(s,e)=>(s+32768)*65536+(e+32768);class La{spec;nav;wall;rooms;structures;gates;gen;chunks=new Map;last=null;constructor(e){this.spec=e,this.nav=new uc(e),this.gen=vc(e,this.nav),this.wall=this.gen.biome.walls||0,this.rooms=e.rooms,this.structures=this.gen.structures,this.gates=this.gen.structures.filter(t=>t.role==="gate"&&t.linkIndex!==void 0).map(t=>{const n=t.linkIndex,o=this.nav.links[n],a={link:n,x:t.x,z:t.z,ux:o.ux,uz:o.uz,w:o.w,shut:!0,st:t};return this.nav.gates.push(a),a})}chunk(e,t){const n=this.last;if(n&&n.cx===e&&n.cz===t)return n;const o=qa(e,t);let a=this.chunks.get(o);return a||(a=this.gen.generateChunk(e,t),this.chunks.set(o,a)),this.last=a,a}setState(e,t){e.pal=t;const n=Fo(e.id),o=(n?n.reach:0)*e.scale+1,a=[];for(let i=Math.floor((e.z-o)/it);i<=Math.floor((e.z+o)/it);i++)for(let r=Math.floor((e.x-o)/it);r<=Math.floor((e.x+o)/it);r++)this.chunks.delete(qa(r,i)),a.push([r,i]);return this.last=null,a}texel(e,t){const n=Math.floor(e/it),o=Math.floor(t/it),a=this.chunk(n,o).height,i=((t-o*it)*it+(e-n*it))*4;return a[i]+(this.wall&&a[i+3]>.05?this.wall:0)}height(e,t){const n=Math.floor(e),o=Math.floor(t),a=e-n,i=t-o,r=this.texel(n,o),c=this.texel(n+1,o),d=this.texel(n,o+1),h=this.texel(n+1,o+1);return r+(c-r)*a+(d+(h-d)*a-(r+(c-r)*a))*i}surface(e,t){return Math.max(this.height(e,t),He.SEA)}biome(e,t){return this.gen.biome}roomAt(e,t,n=0){return this.nav.roomAt(e,t,n)}walkable(e,t){return this.nav.inside(e,t,.35)}forEachProp(e,t,n,o){const a=n+4,i=Math.floor((e-a)/it),r=Math.floor((e+a)/it),c=Math.floor((t-a)/it),d=Math.floor((t+a)/it);for(let h=c;h<=d;h++)for(let u=i;u<=r;u++){const f=this.chunk(u,h).props;for(let p=0;p<f.length;p++){const m=f[p],v=m.x-e,g=m.z-t;v*v+g*g<=a*a&&o(m)}}}moveCircle(e,t,n,o,a,i={x:0,z:0},r){const c=this.nav,d=.35,h=r!=null,u=h?0:this.surface(e,t),f=(x,b)=>h?!!(this.wall||c.inside(x,b,0))&&this.surface(x,b)-r>.3:this.surface(x,b)-u>an.STEEP*Math.max(Math.hypot(x-e,b-t),.03),p=(x,b)=>!this.wall||c.inside(x,b,.05)||this.gen.inPit(x,b),m=(x,b)=>(h?p(x,b):c.inside(x,b,d))&&!c.shut(e,t,x,b)&&!f(x,b);let v=e+n,g=t+o;return m(v,g)||(m(v,t)?g=t:m(e,g)?v=e:(v=e,g=t)),this.forEachProp(v,g,a,x=>{const b=x.def.collide*x.scale;if(b<=0||"role"in x&&x.role==="gate")return;const _=v-x.x,z=g-x.z,C=Math.hypot(_,z),k=b+a;if(C<k&&C>1e-4){const P=x.x+_/C*k,w=x.z+z/C*k;(h?p(P,w):c.inside(P,w,d))&&(v=P,g=w)}}),i.x=v,i.z=g,i}raycast(e,t,n=220){let o=0;for(let a=0;a<260&&o<n;a++){const i=e[0]+t[0]*o,r=e[1]+t[1]*o,c=e[2]+t[2]*o,d=r-this.surface(i,c);if(d<.02)return{x:i,z:c};o+=Math.max(.05,d*.45)}return null}}const gc={emerge:4,roar:5,fall:6,strike:1},no={arrival:{world:1,out:1.3,exit:{behind:"hero"},cast:[{as:"shuttle",archetype:"shuttle",radius:2.4,height:2.6,colors:[[232,236,244],[214,70,52],[84,108,156]]}],shots:[{for:5.6,dip:.35,cam:{on:[0,4],look:[-9,0],from:{yaw:.5,pitch:.07,dist:78,up:3,aim:16,lens:42},to:{yaw:.66,pitch:.09,dist:62,up:3,aim:13.5,lens:42},ease:"out"},act:[{who:"hero",hide:!0},{who:"shuttle",hide:!0}],card:{kind:"place",title:"Meridian Landing",sub:"Survey station above the cloud line",at:.9,for:4.2},cues:[{at:0,emit:"cine:open"}]},{for:5,dip:.3,cam:{on:[-51.5,-4.5],from:{yaw:.25,pitch:.02,dist:13.5,up:1.1,aim:8.5,lens:46},to:{yaw:.6,pitch:.04,dist:11.5,up:1.1,aim:1.6,lens:46},ease:"inOut"},act:[{who:"shuttle",show:!0},{who:"shuttle",fly:[[-112,38,42],[-86,26,24],[-67,17,8],[-56,12.4,-1.5],[-51.5,10.5,-4.5],[-51.5,10,-4.5]],land:!0,for:4.4}],cues:[{at:.1,emit:"craft:pass",on:"shuttle"},{at:4.3,emit:"craft:land",on:"shuttle",shake:.3}]},{for:5.4,cam:{on:"hero",axis:"facing",from:{yaw:-.55,pitch:.02,dist:5.2,up:.9,aim:1.15,lens:38},to:{yaw:-2.75,pitch:.2,dist:8.6,up:1,aim:1.7,lens:36},ease:"inOut"},act:[{who:"hero",show:!0},{who:"hero",walk:{from:[0,24.5],to:[0,16]},for:4.6},{who:"shuttle",at:.4,fly:[[-51.5,10,-4.5],[-51.5,15,-4.5],[-60,26,-18],[-84,44,-44]],for:5}],caption:"Contracts are posted at the hall. The pad at the south gate takes you down."}]},descent:{world:0,out:1,exit:{facing:"room:1"},shots:[{for:4.4,cam:{on:"hero",look:"hero",axis:"room:1",from:{yaw:3.5,pitch:.95,dist:54,up:1,aim:1,lens:46},to:{yaw:3.14,pitch:.36,dist:13,up:1,aim:2.4,lens:36},ease:"inOut"},act:[{who:"hero",face:"room:1"}],card:{kind:"contract",title:"{offer.name}",sub:"{biome.name}  ·  {goal.name}",at:.5,for:3.5},cues:[{at:.05,emit:"arrive:beam",on:"hero"}]}]},elder:{world:0,out:1.1,exit:{facing:"boss"},again:"elderAgain",shots:[{for:1.7,cam:{on:"hero",axis:"boss",from:{yaw:.5,pitch:.03,dist:4.4,up:1,aim:1.25,lens:32},to:{yaw:.38,pitch:.03,dist:3.7,up:1,aim:1.3,lens:32},ease:"out"},act:[{who:"hero",face:"boss"},{who:"boss",hide:!0}],cues:[{at:.25,emit:"cine:rumble",on:"boss",power:.5,shake:.4},{at:1.05,emit:"cine:rumble",on:"boss",power:.8,shake:.55}]},{for:3.9,cam:{on:"hero",look:"boss",axis:"boss",by:"boss",from:{yaw:3.42,pitch:.02,dist:.5,up:.085,aim:.1,lens:54},to:{yaw:3.3,pitch:0,dist:.62,up:.08,aim:.7,lens:54},ease:"inOut"},act:[{who:"boss",show:!0},{who:"boss",clip:"emerge",for:3.5}],cues:[{at:0,emit:"boss:rise",on:"boss",shake:.7},{at:.7,emit:"cine:rumble",on:"boss",power:.7,shake:.5},{at:1.4,emit:"cine:rumble",on:"boss",power:.8,shake:.55},{at:2.1,emit:"cine:rumble",on:"boss",power:.9,shake:.6},{at:3.4,emit:"boss:stand",on:"boss",shake:.9}]},{for:3.1,cam:{on:"boss",axis:"hero",by:"boss",from:{yaw:.62,pitch:0,dist:1.2,up:.2,aim:.62,lens:52},to:{yaw:.36,pitch:0,dist:1.42,up:.24,aim:.66,lens:52},ease:"out"},act:[{who:"boss",at:.25,clip:"roar",for:2.3}],cues:[{at:.75,emit:"boss:roar",on:"boss",shake:1}],card:{kind:"elder",title:"{boss.name}",sub:"{boss.def.epithet}",at:.9,for:2.2}}]},elderAgain:{world:0,out:.9,exit:{facing:"boss"},shots:[{for:3.6,cam:{on:"hero",look:"boss",axis:"boss",by:"boss",from:{yaw:3.4,pitch:.02,dist:.55,up:.085,aim:.15,lens:54},to:{yaw:3.3,pitch:0,dist:.65,up:.08,aim:.68,lens:54},ease:"inOut"},act:[{who:"hero",face:"boss"},{who:"boss",show:!0},{who:"boss",clip:"emerge",for:2.2},{who:"boss",at:2.2,clip:"roar",for:1.4}],cues:[{at:0,emit:"boss:rise",on:"boss",shake:.7},{at:1.1,emit:"cine:rumble",on:"boss",power:.8,shake:.5},{at:2.5,emit:"boss:roar",on:"boss",shake:.9}],card:{kind:"elder",title:"{boss.name}",sub:"{boss.def.epithet}",at:1.6,for:1.9}}]},felled:{world:1,out:1.2,exit:{facing:"boss"},shots:[{for:1.5,world:.14,cam:{on:"hero",look:"boss",axis:"boss",by:"boss",from:{yaw:3.75,pitch:.04,dist:.5,up:.1,aim:.42,lens:40},to:{yaw:3.65,pitch:.04,dist:.46,up:.1,aim:.46,lens:40},ease:"out"}},{for:4.3,cam:{on:"boss",axis:"hero",by:"boss",from:{yaw:1.05,pitch:.1,dist:1.75,up:.16,aim:.5,lens:46},to:{yaw:.5,pitch:.14,dist:2.05,up:.16,aim:.22,lens:46},ease:"out"},card:{kind:"elder",title:"{boss.name}",sub:"Brought down",at:2.3,for:1.9}}]},enraged:{bars:!1,block:!1,skip:!1,out:0,shots:[{for:.9,world:.3}]}},bc=[{on:"begin",play:"arrival",when:(s,e)=>!e.cinema.quiet},{on:"mission:begin",play:"descent",cast:s=>{const e=s,t=e.offer.depth||1;return{offer:t>1?{...e.offer,name:`Depth ${t}`}:e.offer,biome:e.biome,goal:e.goal}}},{on:"boss:arrive",play:"elder",cast:s=>({boss:s}),key:s=>s.defId},{on:"boss:fell",play:"felled",cast:s=>({boss:s})},{on:"boss:enrage",play:"enraged",cast:s=>({boss:s})}],Ca=Math.PI/180,bs={linear:s=>s,in:s=>s*s,out:s=>1-(1-s)*(1-s),inOut:s=>s*s*(3-2*s)},yc=["Escape","Enter","Space"],xc=.5,Ea=.22;class wc{game;now=null;queue=[];seen={};pace=1;blocking=!1;quiet=/[?&]nocine\b/.test(location.search);focus=null;asked=!1;constructor(e){this.game=e;for(const t of bc)e.bus.onDynamic(t.on,n=>{this.quiet||t.when&&!t.when(n,e)||this.play(t.play,t.cast?t.cast(n,e):{},t.key?t.key(n):"")})}get active(){return!!this.now&&!this.now.leaving}play(e,t={},n=""){let o=e;const a=o+":"+n;if(this.seen[a]&&no[o].again&&(o=no[o].again),this.seen[a]=!0,this.now&&!this.now.leaving){this.queue.push([o,t]);return}const i=this.game,r=no[o],c={id:o,seq:r,ctx:{hero:i.player,...t},t:0,end:0,shot:-1,shots:[],clips:[],cues:[],cards:[],own:[],caption:"",card:null,skipping:-1,leaving:!1,out:0,outFor:0};this.now=c;for(const d of r.cast||[]){const h=i.entities.add(Gt("set",d.archetype,{radius:d.radius,height:d.height,colors:lt(d.colors),far:!0,grow:0}));c.ctx[d.as]=h,c.own.push(h)}for(const d of r.shots){const h={...d,t0:c.end,t1:c.end+d.for};c.shots.push(h);for(const u of d.act||[]){const f=h.t0+(u.at||0),p=!!(u.hide||u.show||u.face);c.clips.push({...u,t0:f,t1:p?f:f+(u.for??d.for-(u.at||0)),begun:!1,over:!1})}for(const u of d.cues||[])c.cues.push({...u,t:h.t0+u.at,fired:!1});if(d.card){const u=h.t0+(d.card.at||0);c.cards.push({...d.card,t0:u,t1:u+(d.card.for??d.for)})}c.end=h.t1}if(this.blocking=r.block!==!1,this.pace=r.world??0,this.asked=!1,this.blocking){const d=i.player;d.intent.moveX=0,d.intent.moveZ=0,d.moveTo=null,d.pursue=!1,i.bus.emit("ui:close")}i.bus.emit("cine:begin",{id:o,bars:r.bars!==!1,skip:r.skip!==!1&&this.blocking,blocking:this.blocking}),this.advance(0)}askSkip(){this.asked=!0}update(e){const t=this.game,n=t.look,o=this.now;if(this.frameStage(),!o){n.veil=Math.max(0,(n.veil||0)-e*3.5);return}if(o.leaving){o.out-=e,n.veil=Math.max(0,(n.veil||0)-e*3.5),o.out<=0?(t.camera.rail=null,this.now=null,this.next()):t.camera.rail&&(t.camera.rail.mix=bs.inOut(o.out/o.outFor));return}if(o.skipping>=0){o.skipping+=e,n.veil=Math.min(1,o.skipping/Ea),o.skipping>=Ea&&this.finish(!0);return}if(o.seq.skip!==!1&&this.blocking&&o.t>xc&&(this.asked||yc.some(i=>t.input.hit(i)))){o.skipping=0,this.asked=!1;return}(o.seq.skip===!1||!this.blocking)&&(this.asked=!1),this.advance(e),o.t>=o.end&&this.finish(!1)}advance(e){const t=this.game,n=this.now,o=t.camera;n.t+=e;const a=n.t;let i=n.shot<0?0:n.shot;for(;i<n.shots.length-1&&a>=n.shots[i].t1;)i++;const r=n.shots[i],c=i!==n.shot;n.shot=i,this.pace=r.world??n.seq.world??0;for(const p of n.clips){if(p.over||a<p.t0)continue;const m=this.who(p.who);if(!m){p.over=!0;continue}p.begun||(p.begun=!0,this.begin(p,m));const v=p.t1>p.t0?ue((a-p.t0)/(p.t1-p.t0),0,1):1;this.pose(p,m,v,e),a>=p.t1&&(p.over=!0,this.settle(p,m))}for(const p of n.cues)if(!(p.fired||a<p.t)&&(p.fired=!0,p.shake&&(o.shake=Math.min(1,o.shake+p.shake)),p.emit)){const m=p.on?this.anchor(p.on):null;t.bus.emitDynamic(p.emit,{...p,...m?{x:m.x,y:m.y,z:m.z,entity:m.entity}:null})}const d=n.cards.find(p=>a>=p.t0&&a<p.t1)||null;d!==n.card&&(n.card=d,t.bus.emit("cine:card",d?{kind:d.kind,title:this.words(d.title),sub:this.words(d.sub||"")}:null));const h=r.caption||"";if(h!==n.caption&&(n.caption=h,t.bus.emit("cine:caption",this.words(h))),r.cam){const p=t.reducedMotion?1:(bs[r.cam.ease||"inOut"]||bs.inOut)(ue((a-r.t0)/r.for,0,1));o.rail=this.rail(r.cam,p),c&&this.cut(o.rail)}else c&&(o.rail=null);let u=n.shot===0&&n.seq.fadeIn?1-ue(a/n.seq.fadeIn,0,1):0;r.dip&&(u=Math.max(u,Se(r.t1-r.dip,r.t1,a)));const f=n.shots[i-1];f&&f.dip&&(u=Math.max(u,1-Se(r.t0,r.t0+f.dip,a))),t.look.veil=u}cut(e){const t=this.game,n=t.renderer;n.paper&&(n.paper.a=null,n.paper.b=null,n.paper.mix=0);const o=t.player,a=ue(e.look[0],o.x-70,o.x+70),i=ue(e.look[2],o.z-70,o.z+70);for(this.focus=[a,i];n.worldTex.update(a,i,16)>0;);}who(e){return e==="hero"?this.game.player:this.now?.ctx[e]}begin(e,t){const n=this.game;if(e.hide&&(t.hidden=!0,t.grow=0),e.show&&(t.hidden=!1,t.grow=1),e.face){const o=this.anchor(e.face);t.yaw=Ze(o.x-t.x,o.z-t.z)}e.walk&&(t.x=e.walk.from[0],t.z=e.walk.from[1],t.y=n.world.surface(t.x,t.z),t.yaw=Ze(e.walk.to[0]-t.x,e.walk.to[1]-t.z)),e.fly&&(e.last=e.fly[0],t.move=1)}pose(e,t,n,o){const a=this.game;if(e.clip&&(t.action=gc[e.clip],t.actionT=n,t.actionDur=1e3),e.walk){const{from:i,to:r}=e.walk,c=Math.hypot(r[0]-i[0],r[1]-i[1]),d=e.t1-e.t0,h=n*d,u=Math.min(.5,d/3),f=(h<u?h*h/(2*u):h>d-u?d-u-(d-h)*(d-h)/(2*u):h-u/2)/(d-u),p=fe(i[0],r[0],f),m=fe(i[1],r[1],f),v=Math.hypot(p-t.x,m-t.z),g=v/Math.max(o,1e-4);t.x=p,t.z=m,t.y=a.world.surface(p,m),t.walk+=v*ue(10.4/Math.max(g,.1),1.9,4.5),t.move=Math.min(1,c/(d-u)/4.3)*Math.min(1,g/.6+.2)}if(e.fly&&e.last){const i=kc(e.fly,bs.inOut(n)),r=i[0]-e.last[0],c=i[1]-e.last[1],d=i[2]-e.last[2],h=Math.hypot(r,d);if(h>.001){const u=Ze(r,d),f=Ei(t.yaw,u);t.yaw+=f*Math.min(1,o*6+(o===0?1:0)),t.walk=fe(t.walk||0,ue(-f*2.2,-.6,.6),Math.min(1,o*4)),t.actionT=fe(t.actionT||0,ue(Math.atan2(c,h)*.4,-.2,.2),Math.min(1,o*4))}else t.walk=fe(t.walk||0,0,Math.min(1,o*5)),t.actionT=fe(t.actionT||0,0,Math.min(1,o*5));t.x=i[0],t.y=i[1],t.z=i[2],t.move=e.land?1-Se(.8,1,n):Se(0,.12,n),e.last=i}}settle(e,t){const n=this.game;if(e.clip&&(t.action=0),e.walk&&(t.x=e.walk.to[0],t.z=e.walk.to[1],t.y=n.world.surface(t.x,t.z),t.move=0),e.fly){const o=e.fly[e.fly.length-1];t.x=o[0],t.y=o[1],t.z=o[2],t.walk=0,t.actionT=0,e.land&&(t.move=0)}}anchor(e){const t=this.game,n=t.world;if(Array.isArray(e))return{x:e[0],y:e.length>2?e[1]:n.surface(e[0],e[1]),z:e[e.length-1],height:1};if(typeof e=="string"&&e.startsWith("room:")){const a=e.slice(5),r=(/^\d+$/.test(a)?n.rooms[+a]:n.rooms.find(c=>c.kind===a))||n.rooms[n.rooms.length-1];return{x:r.x,y:n.surface(r.x,r.z),z:r.z,height:1}}const o=this.who(e);return o?{x:o.x,y:o.y,z:o.z,height:o.height*(o.scale||1),entity:o}:{x:t.player.x,y:t.player.y,z:t.player.z,height:1}}rail(e,t){const n=this.anchor(e.on),o=e.look?this.anchor(e.look):n;let a=0;if(e.axis==="facing")a=n.entity?-n.entity.yaw:0;else if(e.axis){const v=this.anchor(e.axis);a=Math.atan2(v.x-n.x,v.z-n.z)}const i=e.by?this.anchor(e.by).height:1,r=e.from,c=e.to||e.from,d=a+fe(r.yaw,c.yaw,t),h=fe(r.pitch,c.pitch,t),u=fe(r.dist,c.dist,t)*i,f=fe(r.up||0,c.up||0,t)*i,p=fe(r.aim??r.up??0,c.aim??c.up??0,t)*i,m=Math.cos(h);return{pos:[n.x+Math.sin(d)*m*u,n.y+f+Math.sin(h)*u,n.z+Math.cos(d)*m*u],look:[o.x,o.y+p,o.z],lens:fe(r.lens||34,c.lens||r.lens||34,t)*Ca,mix:1}}words(e){const t=this.now.ctx;return String(e).replace(/\{([\w.]+)\}/g,(n,o)=>{let a=t;for(const i of o.split("."))a=a==null?a:a[i];return a==null?"":String(a)})}finish(e){const t=this.game,n=this.now,o=t.camera,a=n.seq,i=t.player;for(const c of n.clips){const d=this.who(c.who);!d||c.over||(c.begun||this.begin(c,d),this.settle(c,d),c.over=!0)}for(const c of n.own)c.gone=!0;for(const c of t.entities.list)c.hidden&&(c.hidden=!1,c.grow=1);if(a.exit){let c=null;if(a.exit.behind){const d=this.who(a.exit.behind);d&&(c=Math.PI-d.yaw)}else if(a.exit.facing){const d=this.anchor(a.exit.facing);Math.hypot(d.x-i.x,d.z-i.z)>.5&&(c=Math.atan2(i.x-d.x,i.z-d.z))}c!==null&&(o.goal.yaw=c,o.yaw=c,i.yaw=Math.PI-c),a.exit.pitch&&(o.goal.pitch=a.exit.pitch,o.pitch=a.exit.pitch)}o.target=[i.x,i.y+1,i.z],this.frameStage(!0),this.blocking=!1,this.pace=1,this.focus=null,n.card&&t.bus.emit("cine:card",null),n.caption&&t.bus.emit("cine:caption",""),t.bus.emit("cine:end",{id:n.id,skipped:e});const r=e||t.reducedMotion||this.queue.length?0:a.out??.9;r>0&&o.rail?(n.leaving=!0,n.out=r,n.outFor=r):(o.rail=null,this.now=null,this.next())}next(){const e=this.queue.shift();e&&this.play(e[0],e[1])}frameStage(e=!1){const t=this.game,n=t.camera,o=t.player;let a=0,i=1,r=0;for(const c of t.monsters)!c.def.giant||c.dead||Math.hypot(c.x-o.x,c.z-o.z)>60||(a=1.1,i=2.3,r=10*Ca);n.stage.lift=a,n.stage.pull=i,n.stage.wide=r,e&&(n.lift=a,n.pull=i,n.wide=r)}}function kc(s,e){const t=s.length-1,n=ue(e,0,1)*t,o=Math.min(t-1,Math.floor(n)),a=n-o,i=s[Math.max(0,o-1)],r=s[o],c=s[o+1],d=s[Math.min(t,o+2)],h=[0,0,0];for(let u=0;u<3;u++)h[u]=.5*(2*r[u]+(c[u]-i[u])*a+(2*i[u]-5*r[u]+4*c[u]-d[u])*a*a+(3*r[u]-i[u]-3*c[u]+d[u])*a*a*a);return h}class zc{game;hover=null;ground=null;steerTime=0;constructor(e){this.game=e}release(){const e=this.game,t=e.player.intent;this.hover&&(this.hover.hover=!1,this.hover=null),t.moveX=0,t.moveZ=0,t.aim=null,t.jump=!1,this.steerTime=0,e.canvas.style.cursor="default"}update(e){const t=this.game,n=t.input,o=t.camera,a=t.player;(n.dragX||n.dragY)&&o.rotate(-n.dragX*.006,n.dragY*.005),n.wheel&&o.zoom(n.wheel>0?1.12:.89),n.pinch!==1&&o.zoom(n.pinch),n.held("KeyQ")&&o.rotate(1.9*e,0),n.held("KeyE")&&o.rotate(-1.9*e,0);const i=o.ray(n.mouse.nx,n.mouse.ny);this.hover&&(this.hover.hover=!1),this.hover=n.mouse.inside&&!t.paused?this.pick(i):null,this.hover&&(this.hover.hover=!0),this.ground=n.mouse.inside?t.world.raycast(i.origin,i.dir):null,t.player.intent.aim=this.ground,t.canvas.style.cursor=this.hover?"pointer":"default";const r=a.intent;if(r.moveX=0,r.moveZ=0,t.paused)return;let c=n.stick.y,d=n.stick.x;if((n.held("KeyW")||n.held("ArrowUp"))&&(c+=1),(n.held("KeyS")||n.held("ArrowDown"))&&(c-=1),(n.held("KeyD")||n.held("ArrowRight"))&&(d+=1),(n.held("KeyA")||n.held("ArrowLeft"))&&(d-=1),c||d){const h=-Math.sin(o.yaw),u=-Math.cos(o.yaw),f=h*c-u*d,p=u*c+h*d,m=Math.hypot(f,p),v=Math.min(1,m)/m;r.moveX=f*v,r.moveZ=p*v}for(const h of n.clicks){if(h.button!==0)continue;const u=this.pick(o.ray(h.nx,h.ny),h.touch?1.8:1);if(u)this.setTarget(u,!0);else{const f=t.world.raycast(o.pos,o.ray(h.nx,h.ny).dir);f&&(a.moveTo={x:f.x,z:f.z},a.pursue=!1,t.bus.emit("moveclick",{x:f.x,y:t.world.surface(f.x,f.z),z:f.z}))}}n.steering()&&!this.hover?(this.steerTime+=e,this.steerTime>.22&&this.ground&&(a.moveTo={x:this.ground.x,z:this.ground.z},a.pursue=!1)):this.steerTime=0;for(let h=0;h<4;h++)n.hit("Digit"+(h+1))&&t.skills.cast(h);if(n.hit("KeyR")&&t.loot.use("tonic"),n.hit("KeyT")&&t.loot.use("draught"),n.hit("Tab")&&this.cycleTarget(),n.hit("Space")&&this.jump(),n.hit("KeyF")&&this.act(),t.missions.active?.choosing&&(n.hit("KeyO")&&t.missions.choose(!1),n.hit("KeyN")&&t.missions.choose(!0)),n.acting){const h=a.target;if(h&&h.kind==="monster"&&!h.dead)a.pursue=!0;else if(!h){const u=t.entities.nearest("monster",a.x,a.z,9);u&&this.setTarget(u,!0)}}n.hit("Escape")&&t.bus.emit("ui:escape"),n.hit("KeyJ")&&t.bus.emit("ui:toggle","contract"),n.hit("KeyG")&&t.companion.burst(),n.hit("KeyL")&&t.bus.emit("ui:toggle","lumen"),n.hit("KeyC")&&t.bus.emit("ui:toggle","character"),(n.hit("KeyB")||n.hit("KeyI"))&&t.bus.emit("ui:toggle","bag"),n.hit("KeyV")&&t.bus.emit("ui:toggle","view"),n.hit("KeyM")&&t.bus.emit("ui:toggle","sound")}jump(){this.game.player.intent.jump=!0}clearTarget(){const e=this.game.player,t=!!e.target;return e.target=null,e.pursue=!1,t}actTarget(){const e=this.game,t=e.player,n=t.target;return n&&n.kind==="monster"&&!n.dead?n:e.entities.nearest("monster",t.x,t.z,9)||e.entities.nearest("npc",t.x,t.z,7)}act(){const e=this.actTarget();return e&&this.setTarget(e,!0),e}setTarget(e,t){const n=this.game.player;n.target=e,n.pursue=t,n.moveTo=null}cycleTarget(){const e=this.game,t=e.player,n=e.monsters.filter(a=>!a.dead&&Math.hypot(a.x-t.x,a.z-t.z)<18).sort((a,i)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(i.x-t.x,i.z-t.z));if(!n.length)return;const o=n.findIndex(a=>a===t.target);this.setTarget(n[(o+1)%n.length],!1)}pick(e,t=1){const n=e.origin,o=e.dir;let a=null,i=1e9;for(const r of this.game.entities.list){if(r.kind==="player"||r.kind==="pet"||r.kind==="set"||r.dead||r.gone)continue;const c=Math.max(r.radius*1.35,r.height*.5)*(r.kind==="drop"?1.3:1)*t,d=r.x-n[0],h=r.y+r.height*.5+r.lift-n[1],u=r.z-n[2],f=d*o[0]+h*o[1]+u*o[2];if(f<0)continue;const p=d*d+h*h+u*u-f*f,m=t>1?p/(c*c):f;p<c*c&&m<i&&(i=m,a=r)}return a}}function Mc(){return{night:0,gold:0,cloud:.36,wind:[.8,.45],keyDir:[.4,.8,.3],sunDir:[.4,.8,.3],moonDir:[-.4,.6,-.3],rockCol:[.59,.56,.52]}}function _c(s,e,t){const n=(e-5.5)/15,o=n*Math.PI,a=n>=0&&n<=1;s.sunDir=et.norm([Math.cos(o)*.9,a?Math.sin(o)*1.05:-.3,a?.42*Math.cos(o*.5)+.2:.4]);const i=a?s.sunDir[1]:-.3,r=(e+24-20.5)%24/9;s.moonDir=et.norm([-Math.cos(r*Math.PI)*.8,Math.max(.08,Math.sin(r*Math.PI))*.9+.2,-.45]),s.night=1-Se(-.08,.12,i),s.gold=(1-Se(.1,.5,i))*(1-s.night);const c=s.night>.5?s.moonDir:s.sunDir;return s.keyDir=et.norm([c[0],Math.max(c[1],.34),c[2]]),s.rockCol=t,s}const ys=700,ut=(s,e,t)=>[s/255,e/255,t/255],nn=ut(244,190,62),qe=ut(232,226,212),Nn=ut(226,188,130),Vt=ut(136,180,216),Aa=ut(116,168,90),Ra=ut(214,70,52),xs=ut(240,158,74),vn=ut(226,176,52),ws=ut(196,150,240),Tc=["mote","leaf","spark","burst","slash","ring","halo","orb","puff","heal","mark","click","beam","ripple","zone","lane","cloud"],Bn=s=>[s[0],s[1],s[2]];class Sc{game;data=new Float32Array(ys*Zn);count=0;pool=[];live=[];lights=[];ambientTimer=0;emitters=[];T;constructor(e){this.game=e,this.T=Object.fromEntries(Tc.map(t=>[t,El(t)])),this.wire(e.bus)}spawn(e,t,n,o,a={}){if(this.live.length>=ys)return null;const i=this.pool.pop()??{};return i.type=this.T[e],i.x=t,i.y=n,i.z=o,i.vx=a.vx||0,i.vy=a.vy||0,i.vz=a.vz||0,i.size=a.size??.3,i.grow=a.grow||0,i.life=0,i.max=a.life??.5,i.color=a.color||qe,i.alpha=a.alpha??1,i.gravity=a.gravity||0,i.drag=a.drag||0,i.rot=a.rot||0,i.spin=a.spin||0,i.ground=a.flat?2:a.ground?1:0,i.aspect=a.aspect||1,i.follow=a.follow||null,i.dy=a.dy||0,i.hold=a.hold||!1,i.trail=!!a.trail,i.seed=Math.random(),i.sway=a.sway||0,this.live.push(i),i}clear(){for(const e of this.live)this.pool.push(e);this.live.length=0,this.lights.length=0,this.emitters.length=0}emit(e,t,n){this.emitters.push({left:e,every:t,next:0,fn:n})}shakeNear(e,t,n,o=45){const a=this.game,i=a.player,r=Math.max(0,1-Math.hypot(i.x-e,i.z-t)/o);a.camera.shake=Math.min(1,a.camera.shake+n*r)}heave(e,t,n,o,a=10,i=Nn){for(let r=0;r<a;r++){const c=Math.random()*6.283,d=o*(.55+Math.random()*.55),h=.6+Math.random()*1.6;this.spawn("puff",e+Math.cos(c)*d,t+.2+Math.random()*.6,n+Math.sin(c)*d,{size:.5+Math.random()*.7,grow:1.3,life:.9+Math.random()*.6,color:i,alpha:.7,vx:Math.cos(c)*h,vy:.8+Math.random()*1.8,vz:Math.sin(c)*h,drag:1.6})}}light(e,t,n,o,a=.25){this.lights.push({x:e,y:t,z:n,r:o,life:a,max:a})}update(e){const t=this.live;let n=0;for(let a=0;a<t.length;a++){const i=t[a];if(i.hold||(i.life+=e/i.max),i.life>=1||i.follow&&i.follow.gone){this.pool.push(i);continue}if(i.follow)i.x=i.follow.x,i.y=i.follow.y+i.dy,i.z=i.follow.z,i.trail&&(Math.random()<.7&&this.spawn("spark",i.x,i.y,i.z,{size:.16,life:.25,color:i.color,vy:.8}),this.light(i.x,i.y,i.z,5,.05));else{if(i.vy-=i.gravity*e,i.drag){const r=Math.exp(-i.drag*e);i.vx*=r,i.vy*=r,i.vz*=r}i.x+=(i.vx+Math.sin(i.life*9+i.seed*30)*i.sway)*e,i.y+=i.vy*e,i.z+=i.vz*e}i.size+=i.grow*e,i.rot+=i.spin*e,t[n++]=i}if(t.length=n,this.emitters.length){for(const a of this.emitters)a.left-=e,a.next-=e,a.next<=0&&(a.next=a.every,a.fn());this.emitters=this.emitters.filter(a=>a.left>0)}let o=0;for(const a of this.lights)a.life-=e,a.life>0&&(this.lights[o++]=a);this.lights.length=o,this.ambient(e),this.pads(e)}write(){const e=this.data,t=this.live;for(let n=0;n<t.length;n++){const o=t[n],a=n*Zn;e[a]=o.x,e[a+1]=o.y,e[a+2]=o.z,e[a+3]=o.size,e[a+4]=o.type,e[a+5]=o.life,e[a+6]=o.seed,e[a+7]=o.rot,e[a+8]=o.color[0],e[a+9]=o.color[1],e[a+10]=o.color[2],e[a+11]=o.alpha,e[a+12]=o.ground,e[a+13]=o.aspect,e[a+14]=o.hold?0:o.max,e[a+15]=0}this.count=t.length}hit(e,t,n,o=qe,a=!1){this.spawn("burst",e,t,n,{size:a?1.1:.7,life:.22,color:o,rot:Math.random()*6});const i=a?9:5;for(let r=0;r<i;r++){const c=Math.random()*6.283,d=2.5+Math.random()*3.5;this.spawn("spark",e,t,n,{size:.16+Math.random()*.14,life:.25+Math.random()*.2,color:o,vx:Math.cos(c)*d,vy:1+Math.random()*3,vz:Math.sin(c)*d,gravity:9,drag:2,rot:c})}this.light(e,t,n,a?5:3.5,.14)}slash(e,t,n=qe){this.spawn("slash",e.x,e.y+.8*e.scale,e.z,{size:t,life:.3,color:n,ground:!0,rot:-e.yaw,follow:null})}dust(e,t,n,o=2,a=Nn){for(let i=0;i<o;i++)this.spawn("puff",e+(Math.random()-.5)*.3,t+.1,n+(Math.random()-.5)*.3,{size:.14+Math.random()*.1,grow:.5,life:.45,color:a,alpha:.55,vx:(Math.random()-.5)*.6,vy:.5+Math.random()*.4,vz:(Math.random()-.5)*.6,drag:2})}poof(e,t=qe){for(let n=0;n<9;n++){const o=Math.random()*6.283,a=1+Math.random()*1.6;this.spawn("puff",e.x,e.y+e.height*.4,e.z,{size:.3+Math.random()*.25,grow:.8,life:.55,color:t,alpha:.85,vx:Math.cos(o)*a,vy:.6+Math.random()*1.6,vz:Math.sin(o)*a,drag:2.5})}this.spawn("ring",e.x,e.y+.08,e.z,{size:1.5,life:.4,color:t,ground:!0})}levelUp(e){this.spawn("beam",e.x,e.y+2.4,e.z,{size:.42,aspect:5.5,life:1,color:nn,alpha:1.3,follow:e,dy:2.4});for(let t=0;t<3;t++)setTimeout(()=>this.spawn("ring",e.x,e.y+.08,e.z,{size:2.6,life:.7,color:nn,ground:!0}),t*160);for(let t=0;t<26;t++){const n=Math.random()*6.283,o=.3+Math.random()*.8;this.spawn("spark",e.x+Math.cos(n)*o,e.y+Math.random()*.5,e.z+Math.sin(n)*o,{size:.2,life:.8+Math.random()*.7,color:nn,vy:1.5+Math.random()*2.5,drag:.6})}this.light(e.x,e.y+1.5,e.z,9,.9)}heal(e,t=Aa){for(let n=0;n<7;n++)this.spawn("heal",e.x+(Math.random()-.5)*.9,e.y+.3+Math.random()*.8,e.z+(Math.random()-.5)*.9,{size:.16,life:.8+Math.random()*.4,color:t,vy:.9+Math.random()*.6});this.spawn("ring",e.x,e.y+.08,e.z,{size:1.6,life:.5,color:t,ground:!0})}sparkle(e,t,n,o=nn,a=6){for(let i=0;i<a;i++){const r=Math.random()*6.283;this.spawn("spark",e,t,n,{size:.14+Math.random()*.1,life:.4+Math.random()*.3,color:o,vx:Math.cos(r)*1.4,vy:1.5+Math.random()*1.5,vz:Math.sin(r)*1.4,gravity:3,drag:1.5})}}click(e,t,n){this.spawn("click",e,t+.1,n,{size:.75,life:.5,color:qe,ground:!0})}ambient(e){const t=this.game,n=t.player;if(this.ambientTimer-=e,this.ambientTimer>0||this.live.length>ys-80)return;this.ambientTimer=.09;const o=!t.biome.realm&&t.env.night>.6?"fireflies":t.biome.particles,a=Math.random()*6.283,i=3+Math.random()*22,r=n.x+Math.cos(a)*i,c=n.z+Math.sin(a)*i,d=t.world.surface(r,c),h=t.env.wind[0],u=t.env.wind[1];if(o==="fireflies")this.spawn("mote",r,d+.4+Math.random()*1.6,c,{size:.09,life:3+Math.random()*2,color:qe,alpha:1,vx:(Math.random()-.5)*.5,vz:(Math.random()-.5)*.5,sway:.5});else if(o==="petals"||o==="leaves"){const f=o==="petals"?ut(232,150,150):Math.random()<.5?ut(232,164,48):ut(224,92,70);this.spawn("leaf",r,d+3+Math.random()*3,c,{size:.09,life:5,color:f,vx:h*.9,vy:-.75,vz:u*.9,sway:.7,rot:Math.random()*6,spin:1.5})}else o==="stardust"?this.spawn("mote",r,d+.2+Math.random()*3.2,c,{size:.05,life:6,color:qe,alpha:.9,vx:(Math.random()-.5)*.2,vy:(Math.random()-.3)*.25,vz:(Math.random()-.5)*.2,sway:.15}):o==="snow"?this.spawn("mote",r,d+2+Math.random()*5,c,{size:.06,life:5,color:qe,alpha:1,vx:h*.6,vy:-.9,vz:u*.6,sway:.4}):Math.random()<.6&&this.spawn("mote",r,d+.3+Math.random()*2.2,c,{size:.045,life:4,color:Nn,alpha:.7,vx:h*.35,vy:.08,vz:u*.35,sway:.3})}pads(e){const t=this.game,n=t.player,o=t.missions;if(!(e<=0||this.live.length>ys-60))for(const a of t.world.structures){if(a.role!=="deploy"&&a.role!=="leave"||Math.hypot(a.x-n.x,a.z-n.z)>75||(a.fxT=(a.fxT||0)-e,a.fxT>0))continue;const i=a.role==="deploy"?!!o.pending:!!(o.active&&o.met()),r=a.role==="leave"?xs:Vt,c=t.world.surface(a.x,a.z)+.3;if(a.fxT=i?.5:1.4,a.fxN=(a.fxN||0)+1,this.spawn("halo",a.x,c,a.z,{size:1.9,grow:i?-.2:-.12,life:i?2:2.6,color:r,alpha:i?1:.6,vy:i?1.3:.6,flat:!0}),!!i){a.fxN%2===0&&this.spawn("halo",a.x,c-.05,a.z,{size:3.4,grow:-1.2,life:1.2,color:r,ground:!0});for(let d=0;d<2;d++){const h=Math.random()*6.283,u=.4+Math.random()*1.3;this.spawn("spark",a.x+Math.cos(h)*u,c+.1,a.z+Math.sin(h)*u,{size:.15,life:.9+Math.random()*.5,color:r,vy:1.6+Math.random()*1.2,drag:.4})}}}}wire(e){e.on("damage",t=>{if(t.soft)return;const n=t.target,o=n.kind==="player"?Ra:t.crit?nn:qe;if(n.hitY&&t.source){const a=t.source.x-n.x,i=t.source.z-n.z,r=Math.hypot(a,i)||1;this.hit(n.x+a/r*n.radius*.85,n.y+n.hitY*(.55+Math.random()*.5),n.z+i/r*n.radius*.85,o,!0)}else this.hit(n.x,n.y+n.height*.5,n.z,o,!!t.crit)}),e.on("swing",t=>this.slash(t.entity,t.radius,t.color||qe)),e.on("monster:died",t=>{t.def.fall||this.poof(t,Bn(t.colors[0]))}),e.on("boss:step",t=>{const n=t.entity,o=Math.sin(n.walk)>0?1:-1,a=Math.cos(n.yaw),i=Math.sin(n.yaw),r=n.x+a*o*n.radius*.55,c=n.z+i*o*n.radius*.55;this.spawn("ring",r,n.y+.08,c,{size:n.radius*.9,grow:5,life:.45,color:qe,ground:!0}),this.heave(r,n.y,c,n.radius*.5,5),this.shakeNear(n.x,n.z,.3,40)}),e.on("cine:rumble",t=>{this.heave(t.x,t.y,t.z,3+4*(t.power||.5),Math.round(8+10*(t.power||.5))),this.spawn("ring",t.x,t.y+.08,t.z,{size:3,grow:9,life:.6,color:Nn,ground:!0})}),e.on("boss:rise",t=>{const n=t.entity,o=n?n.radius:3.5;this.spawn("ring",t.x,t.y+.08,t.z,{size:o,grow:12,life:.8,color:qe,ground:!0}),this.emit(3.3,.09,()=>this.heave(t.x,t.y,t.z,o*1.1,3)),this.light(t.x,t.y+2,t.z,16,.6)}),e.on("boss:stand",t=>{this.spawn("ring",t.x,t.y+.08,t.z,{size:5,grow:20,life:.7,color:qe,ground:!0}),this.heave(t.x,t.y,t.z,5.5,22)}),e.on("boss:roar",t=>{const n=t.entity,o=n?n.height*.75:8;for(let a=0;a<3;a++)setTimeout(()=>this.spawn("ring",t.x,t.y+.1,t.z,{size:4,grow:26,life:.85,color:a===1?vn:qe,ground:!0}),a*170);this.heave(t.x,t.y,t.z,6,14),this.light(t.x,t.y+o,t.z,22,.8),this.shakeNear(t.x,t.z,.8,60)}),e.on("boss:fell",t=>{const n=t.def.fall||4;this.emit(n*.75,.07,()=>{const o=Math.random()*6.283,a=Math.random()*t.radius,i=t.y+Math.random()*t.height*.7*(1-t.actionT*.8);this.spawn("puff",t.x+Math.cos(o)*a,i,t.z+Math.sin(o)*a,{size:.6+Math.random()*.8,grow:1.4,life:1.1,color:Nn,alpha:.7,vx:Math.cos(o)*1.5,vy:.4,vz:Math.sin(o)*1.5,drag:1.5}),Math.random()<.5&&this.spawn("spark",t.x+Math.cos(o)*a,i,t.z+Math.sin(o)*a,{size:.3,life:.7,color:Bn(t.colors[1]),vx:Math.cos(o)*4,vy:2+Math.random()*3,vz:Math.sin(o)*4,gravity:9,drag:1})}),this.shakeNear(t.x,t.z,.6,60)}),e.on("boss:down",t=>{this.spawn("ring",t.x,t.y+.1,t.z,{size:5,grow:30,life:.9,color:qe,ground:!0}),this.spawn("ring",t.x,t.y+.1,t.z,{size:3,grow:18,life:1.1,color:Bn(t.colors[1]),ground:!0}),this.heave(t.x,t.y,t.z,t.radius*1.6,36),this.light(t.x,t.y+3,t.z,26,1),this.shakeNear(t.x,t.z,1,70)}),e.on("gate:shut",t=>{this.spawn("ring",t.x,t.y+.08,t.z,{size:2.6,life:.5,color:qe,ground:!0}),this.dust(t.x,t.y,t.z,6)}),e.on("craft:land",t=>{const n=t.x??0,o=t.y??0,a=t.z??0;this.spawn("ring",n,o+.08,a,{size:2.5,grow:9,life:.7,color:qe,ground:!0}),this.heave(n,o,a,3.2,16,qe)}),e.on("arrive:beam",t=>{this.spawn("beam",t.x,t.y+3.2,t.z,{size:.5,aspect:7,life:1.3,color:Vt,alpha:1.2});for(let n=0;n<2;n++)setTimeout(()=>this.spawn("ring",t.x,t.y+.08,t.z,{size:2.4,grow:3,life:.7,color:Vt,ground:!0}),n*200);this.sparkle(t.x,t.y+1,t.z,Vt,12),this.light(t.x,t.y+1.5,t.z,10,.9)}),e.on("lance:fire",t=>{this.spawn("lane",t.x+t.dirx*t.len/2,t.y+.14,t.z+t.dirz*t.len/2,{size:t.w/2.6,aspect:t.len/(t.w/1.3),rot:Math.atan2(t.dirx,t.dirz),life:.22,color:qe,ground:!0});for(let n=0;n<9;n++){const o=(n+Math.random())/9*t.len;this.spawn("spark",t.x+t.dirx*o,t.y+.8+Math.random()*.6,t.z+t.dirz*o,{size:.2,life:.3+Math.random()*.2,color:vn,vy:1.5+Math.random()*2,drag:1.5})}this.light(t.x+t.dirx*3,t.y+1.6,t.z+t.dirz*3,9,.2),this.shakeNear(t.x,t.z,.3,20)}),e.on("lumen:ready",()=>{const t=this.game.companion.e;t&&this.sparkle(t.x,t.y,t.z,Bn(t.colors[1]),10)}),e.on("lumen:fed",()=>{const t=this.game.companion.e;t&&this.sparkle(t.x,t.y,t.z,Bn(t.colors[1]),5)}),e.on("lumen:burst",t=>{const n=t.burst,o=n.r||3;this.spawn("ring",t.x,t.y+.1,t.z,{size:1,grow:o*2.4,life:.5,color:t.color,ground:!0}),n.seconds&&this.spawn("mark",t.x,t.y+.1,t.z,{size:1.5,life:n.seconds,color:t.color,ground:!0,follow:this.game.player,dy:.1}),this.sparkle(t.x,t.y+1.2,t.z,t.color,16),this.light(t.x,t.y+1.5,t.z,10+o,.5)}),e.on("lumen:changed",t=>{this.spawn("beam",t.x,t.y+1.6,t.z,{size:.4,aspect:6,life:1.4,color:t.color,alpha:1.2}),this.sparkle(t.x,t.y,t.z,t.color,18),this.light(t.x,t.y,t.z,9,.9)}),e.on("site:used",t=>{this.spawn("beam",t.x,t.y+3,t.z,{size:.45,aspect:7,life:1.4,color:t.color,alpha:1.2});for(let n=0;n<2;n++)setTimeout(()=>this.spawn("ring",t.x,t.y+.08,t.z,{size:1.6,grow:5,life:.7,color:t.color,ground:!0}),n*180);this.sparkle(t.x,t.y+1.2,t.z,t.color,14),this.light(t.x,t.y+1.5,t.z,9,.8)}),e.on("site:guard",t=>this.spawn("ring",t.guard.x,t.guard.y+.08,t.guard.z,{size:2.4,grow:6,life:.6,color:Ra,ground:!0})),e.on("drop:rare",t=>{const n=t.rarity>=4?ws:t.rarity>=3?xs:nn;this.spawn("beam",t.x,t.y+2.6,t.z,{size:.34,aspect:7.5,life:1.6,color:n,alpha:1.2}),this.spawn("ring",t.x,t.y+.08,t.z,{size:1.6,life:.7,color:n,ground:!0}),this.sparkle(t.x,t.y+.6,t.z,n,10)}),e.on("levelup",()=>this.levelUp(this.game.player)),e.on("heal",t=>this.heal(t.entity,t.focus?Vt:void 0)),e.on("pickup",t=>this.sparkle(t.x,t.y+.4,t.z,t.rare?Vt:nn,t.rare?12:5)),e.on("step",t=>{t.entity.kind==="player"&&this.dust(t.entity.x,t.entity.y,t.entity.z,1)}),e.on("moveclick",t=>this.click(t.x,t.y,t.z)),e.on("jump",t=>this.dust(t.x,t.y,t.z,3)),e.on("landed",t=>{this.dust(t.x,t.y,t.z,5),this.spawn("ring",t.x,t.y+.08,t.z,{size:.5,grow:2.2,life:.3,color:qe,ground:!0})}),e.on("dash",t=>{this.dust(t.x,t.y,t.z,5,Aa),this.spawn("ring",t.x,t.y+.08,t.z,{size:1.4,life:.35,color:qe,ground:!0})}),e.on("bolt:hit",t=>{this.hit(t.x,t.y,t.z,xs,!0),this.spawn("ring",t.x,t.y,t.z,{size:1.6,life:.35,color:xs})}),e.on("telegraph",t=>{if(t.lane){const n=t.w??1,o=t.len??1;this.spawn("lane",t.x,t.y+.1,t.z,{size:n/2,aspect:o/n,rot:Math.atan2(t.dirx??0,t.dirz??1),life:t.t,color:vn,ground:!0})}else this.spawn(t.fill?"zone":"ring",t.x,t.y+.08,t.z,{size:t.r??1,life:t.t,color:vn,alpha:1,ground:!0})}),e.on("hazard:cloud",t=>this.spawn("cloud",t.x,t.y+.12,t.z,{size:t.r,life:t.life,color:vn,ground:!0})),e.on("slam",t=>{this.spawn("ring",t.x,t.y+.08,t.z,{size:t.r,life:.4,color:qe,ground:!0}),this.dust(t.x,t.y,t.z,t.heavy?9:4),t.heavy&&(this.game.camera.shake=Math.min(1,this.game.camera.shake+.45))}),e.on("shot:hit",t=>this.hit(t.x,t.y,t.z,vn,!1)),e.on("relic:ring",t=>{this.spawn("ring",t.x,t.y+.08,t.z,{size:t.r,life:t.heavy?.55:.4,color:ws,ground:!0}),this.dust(t.x,t.y,t.z,t.heavy?8:3),t.heavy&&(this.game.camera.shake=Math.min(1,this.game.camera.shake+.35))}),e.on("relic:leap",t=>this.hit(t.x,t.y,t.z,ws,!1)),e.on("relic:found",()=>this.heal(this.game.player,ws)),e.on("boon",t=>this.heal(t.entity,Vt)),e.on("charge:dust",t=>this.dust(t.x,t.y,t.z,2)),e.on("shot:launch",t=>this.spawn("orb",t.x,t.y,t.z,{size:t.size||.55,color:t.color,hold:!0,follow:t,trail:!0})),e.on("guard",t=>this.spawn("mark",t.entity.x,t.entity.y+.1,t.entity.z,{size:t.entity.radius*2.8,life:t.t,color:Vt,ground:!0,follow:t.entity,dy:.1}))}}const Ct=Math.PI/180,so=15.5*Ct,Ia=.012,Pc=13*Ct,qc=8*Ct;function oo(s){const e=new Float32Array(cn),t=s.colors;return e[1]=s.y||0,e[3]=s.scale||1,e[4]=s.yaw||0,e[6]=s.action||0,e[7]=s.actionT||0,e[8]=s.seed||0,e[10]=1,e.set(t[0],12),e[15]=s.move||0,e.set(t[1],16),e[19]=s.extra||0,e.set(t[2],20),e[23]=s.kit||0,e[11]=s.flags||0,e}function ao(s,e,t,n,o,a,i){const c=Math.max(t/2,n/2/e)/Math.tan(a/2)*1.03;return s.rail={pos:[0,o+Math.sin(i)*c,Math.cos(i)*c],look:[0,o,0],lens:a,mix:1},s.update(0,[0,o,0],e,null),2*c*Math.tan(a/2)*e}const Lc={offhand:10,visor:13,grips:15,greaves:17,boots:18,mod:20},Cc=s=>s.slot==="weapon"&&s.family?Ut[s.family].kit*2+(s.look||0):s.slot==="frame"?6+(s.look||0):s.slot==="unit"?7+(s.look||1):(Lc[s.slot]??0)+(s.look||0),Ec={saber:1,glaive:1.06,rifle:.84,carbine:.96,rod:1.14,prism:1.3,scout:.8,bulwark:.9,core:.36,drive:.42,ward:.46,cell:.36,lens:.36,visor:.5,crest:.5,grip:.4,gauntlet:.46,greave:.46,trail:.42,mag:.46,chip:.36,coil:.38};class Ac{game;due=!0;gearDue=!1;eldersDue=!1;elderDelay=24;last=0;stages={};elderCam=null;gearCam=null;gearSheet=null;bust="";gear={};elders={};constructor(e){this.game=e;for(const t of["people","class","equip"])e.bus.on(t,()=>{this.due=!0});for(const t of["begin","people","class"])e.bus.on(t,()=>{this.gearDue=!0});e.bus.on("begin",()=>{this.eldersDue=!0})}update(){if(document.hidden)return;const e=this.game;if(this.due){this.due=!1;try{this.take()}catch(o){console.warn("Portrait not taken:",o)}}if(this.gearDue&&e.started){this.gearDue=!1;try{this.drawGear()}catch(o){console.warn("Gear not drawn:",o)}}if(this.eldersDue&&e.started)if(this.elderDelay>0)this.elderDelay--;else{this.eldersDue=!1;try{this.drawElders()}catch(o){console.warn("Elders not drawn:",o)}}const t=performance.now()/1e3,n=Math.min(.1,t-(this.last||t));this.last=t;for(const o in this.stages){const a=this.stages[o];if(!a.canvas||!a.canvas.isConnected){a.canvas=null;continue}!a.drag&&Math.abs(a.spin)>.05&&(a.yaw+=a.spin*n,a.spin*=Math.exp(-5*n),a.dirty=!0);const i=e.reducedMotion?0:Math.floor(t*12);if(!(!a.dirty&&i===a.tick)){a.tick=i;try{this.show(a,e.reducedMotion?0:t)}catch(r){console.warn("Stage not drawn:",r),a.canvas=null}}}}subject(e){const t=this.game,n=t.player;if(e.startsWith("elder:")){const i=_t[e.slice(6)];if(!i)return null;const[,r,c]=i.sit||[0,i.height*1.4,i.height*.5];return{archetype:i.archetype,scale:1,seed:.37,colors:lt(i.colors),extra:0,kit:0,tall:r,wide:r*1.25,mid:c,floor:0,ring:i.radius*1.7,lens:24*Ct,pitch:-6*Ct,heavy:!0}}if(e==="lumen"){const i=t.companion&&t.companion.e,r=n.sheet.lumen;return i?{archetype:"lumen",scale:1,seed:i.seed,colors:i.colors,extra:i.extra,kit:0,move:(r.charge||0)/100,tall:.84,wide:.92,mid:.02,floor:-.36,ring:.3}:null}const o=n.kit||0,a=Math.floor(o+.01)+((o+.01)%1>=.5?.5:0);return{archetype:n.archetype,scale:n.scale,seed:n.seed,colors:n.colors,extra:n.extra,kit:a,flags:4*(n.wears||0),action:7,tall:2.06*n.scale,wide:1.6*n.scale,mid:.93*n.scale,floor:0,ring:.62*n.scale}}mount(e,t){const n=this.stages[t]||(this.stages[t]={what:t,yaw:t==="lumen"?.3:t==="hero"?-.5:-.45,spin:0,drag:null,tick:-1,cam:new Ps});if(n.box!==e){n.box=e,n.canvas=e.querySelector("canvas"),n.drag=null,n.dirty=!0,e.addEventListener("pointerdown",o=>{o.button||(n.drag={x:o.clientX,t:performance.now()},n.spin=0,e.setPointerCapture(o.pointerId),e.classList.add("held"))}),e.addEventListener("pointermove",o=>{if(!n.drag)return;const a=o.clientX-n.drag.x,i=performance.now(),r=Math.max(8,i-n.drag.t)/1e3;n.drag.x=o.clientX,n.drag.t=i,n.yaw-=a*Ia,n.spin=-a*Ia/r*.6,n.dirty=!0});for(const o of["pointerup","pointercancel","lostpointercapture"])e.addEventListener(o,()=>{n.drag=null,e.classList.remove("held")});try{this.show(n,this.game.reducedMotion?0:performance.now()/1e3)}catch(o){console.warn("Stage not drawn:",o)}}}turn(e,t){for(const n in this.stages)this.stages[n].box===e&&(this.stages[n].yaw-=t,this.stages[n].spin=0,this.stages[n].dirty=!0)}show(e,t){const n=this.game,o=e.canvas,a=this.subject(e.what);if(!o||!a)return;const i=o.getBoundingClientRect();if(i.width<8||i.height<8)return;const r=Math.min(window.devicePixelRatio||1,n.renderer.quality==="low"?a.heavy?1:1.5:a.heavy?1.5:2),c=Math.round(i.width*r),d=Math.round(i.height*r);(o.width!==c||o.height!==d)&&(o.width=c,o.height=d);const h=ao(e.cam,c/d,a.tall,a.wide,a.mid,a.lens||Pc,a.pitch??qc),u=n.renderer.figure({width:c,height:d,dpr:r,camera:e.cam,env:this.daylight(),time:t,batches:new Map([[a.archetype,{data:oo({...a,yaw:e.yaw}),count:1}]])}),f=o.getContext("2d");if(f){const v=new Uint8ClampedArray(c*d*4);v.set(u.subarray(0,c*d*4)),f.putImageData(new ImageData(v,c,d),0,0)}e.dirty=!1;const p=e.cam.project(0,a.floor,0),m=e.box?.getBoundingClientRect().width||i.width;p&&e.box&&(e.box.style.setProperty("--feet",(p.y*100).toFixed(1)+"%"),e.box.style.setProperty("--floor",(a.ring*2/h*(i.width/m)*100).toFixed(1)+"%"))}daylight(){return{...this.game.env,night:0,gold:0,realm:0}}drawElders(){const e=this.game,t=520,n=400,o=this.elderCam||(this.elderCam=new Ps),a=Object.assign(document.createElement("canvas"),{width:t,height:n}),i=a.getContext("2d");if(!i)return;const r=this.daylight();for(const c of Object.keys(_t)){const d=_t[c];if(!d.boss||!d.giant)continue;const[h,u,f]=d.sit||[0,d.height*1.4,d.height*.5];ao(o,t/n,u,u*t/n,f,24*Ct,-9*Ct);const p={scale:1,seed:.37,colors:lt(d.colors),yaw:-.5,action:h,actionT:.5},m=e.renderer.figure({width:t,height:n,dpr:1.4,camera:o,env:r,time:.4,batches:new Map([[d.archetype,{data:oo(p),count:1}]])}),v=new Uint8ClampedArray(t*n*4);v.set(m.subarray(0,t*n*4)),i.putImageData(new ImageData(v,t,n),0,0),this.elders[c]=a.toDataURL("image/png")}e.bus.emit("portrait",{bust:this.bust,elders:this.elders})}drawGear(){const e=this.game,t=e.player,n=144,o=this.gearCam||(this.gearCam=new Ps),a=this.gearSheet||(this.gearSheet=Object.assign(document.createElement("canvas"),{width:n,height:n})),i=a.getContext("2d");if(!i)return;const r=this.daylight(),c=t.build??Math.round(t.extra);for(const d of Object.keys(Te)){const h=Te[d],u=Ec[d]||1;ao(o,1,u,u,0,12*Ct,0);const f={scale:1,seed:.37,colors:t.colors,extra:Cc(h),kit:c,yaw:h.slot==="weapon"?0:h.slot==="frame"?.5:h.slot==="boots"?1.1:h.slot==="visor"?.55:.45},p=e.renderer.figure({width:n,height:n,dpr:1.2,camera:o,env:r,time:0,batches:new Map([["gear",{data:oo(f),count:1}]])}),m=new Uint8ClampedArray(n*n*4);m.set(p.subarray(0,n*n*4)),i.putImageData(new ImageData(m,n,n),0,0),this.gear[d]=a.toDataURL("image/png")}e.bus.emit("portrait",{bust:this.bust,gear:this.gear})}take(){const e=this.game,t=e.renderer,n=e.camera,o=e.player,a=e.view,i={...t.size},r=t.scale,c={...t.paper},d=[...t.minimap.rect],h={y:o.y,yaw:o.yaw,lift:o.lift,action:o.action,actionT:o.actionT,move:o.move,walk:o.walk,grow:o.grow,pose:o.pose,flash:o.flash,shade:o.shade},u={rail:n.rail,shake:n.shake,cloud:e.env.cloud,fade:e.look.fade,veil:e.look.veil,hurt:e.look.hurt};Object.assign(o,{y:o.y+70,yaw:Math.PI,lift:0,action:0,actionT:0,move:0,walk:0,grow:1,pose:void 0,flash:0,shade:1}),a.only=o,e.env.cloud=1.7,e.look.fade=1,e.look.veil=0,e.look.hurt=0,n.shake=0,t.scale=1.4,t.minimap.rect=[0,0,0,0];const f=o.height*1.02/1.6*1.95,p=(m,v,g,x,b,_)=>{const z=g/2/Math.tan(b*Ct/2)*1.04,C=_+Math.PI,k=o.y+f*x;return t.resize(m,v,2),t.paper.a=null,t.paper.b=null,t.paper.mix=0,n.rail={pos:[o.x+Math.sin(C)*Math.cos(so)*z,k-Math.sin(so)*z,o.z+Math.cos(C)*Math.cos(so)*z],look:[o.x,k,o.z],lens:b*Ct,mix:1},n.update(0,[o.x,o.y+1,o.z],m/v,null),t.render(a.build(e.time)),e.canvas.toDataURL("image/webp",.9)};this.bust=p(176,176,f*.5,.62,9,.4),Object.assign(o,h),a.only=null,n.rail=u.rail,n.shake=u.shake,e.env.cloud=u.cloud,e.look.fade=u.fade,e.look.veil=u.veil,e.look.hurt=u.hurt,t.scale=r,Object.assign(t.paper,c),t.minimap.rect=d,t.resize(i.cssW,i.cssH,i.dpr),e.bus.emit("portrait",{bust:this.bust})}}const Rc=()=>{try{return localStorage.getItem("lumenwake.firststeps")==="done"}catch{return!1}},bn=1,Fa="lumenwake.v1.account",sn=s=>`lumenwake.v1.hero.${s}`,Me=(s,e,t,n=e)=>Number.isFinite(Number(s))?Math.min(t,Math.max(e,Math.round(Number(s)))):n,ks=(s,e,t,n=e)=>Number.isFinite(Number(s))?Math.min(t,Math.max(e,Number(s))):n,Ic=new Set(No.map(s=>s.id));function Fc(s){if(!s||typeof s!="object")return null;const e=s,t=e.base;if(!t||!Te[t])return null;const o=(Array.isArray(e.affixes)?e.affixes:[]).filter(c=>{if(!c||typeof c!="object")return!1;const d=c;return typeof d.id=="string"&&Ic.has(d.id)&&Number.isFinite(Number(d.value))}).map(c=>({id:c.id,value:Number(c.value)})),a=e.power,i=a&&typeof a.id=="string"?a.id:null,r=a&&i&&ot[i]?{id:i,ranks:Me(a.ranks,1,9,1)}:null;return{uid:Me(e.uid,1,2**31,1),base:t,rarity:Me(e.rarity,0,dn.length-1),ilvl:Me(e.ilvl,1,999,1),affixes:o,power:r}}function Na(s){const e=Fc(s);if(!e)return null;const t=s,n=typeof t.relic=="string"?t.relic:null,o=n&&he[n]&&he[n].slot===Te[e.base].slot?n:null;return o?(e.relic=o,e.rarity=Es,e.power=null):e.rarity>=Es&&(e.rarity=Es-1),t.lock&&(e.lock=!0),e}const Qi=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);function Ba(s){if(!s||typeof s!="object")return null;const e=s;if(!e.sheet||typeof e.sheet!="object")return null;const t=e.sheet,n=typeof t.cls=="string"&&t.cls in ze?t.cls:"vanguard",o=ze[n].family,a=_o(n);Mo(a),a.people=typeof t.people=="string"&&t.people in wt?t.people:"unit",a.level=Me(t.level,1,99,1),a.xp=Me(t.xp,0,1e9,0),a.points=Me(t.points,0,999,0),a.glint=Me(t.glint,0,1e9,0),a.picks=Me(t.picks,0,99,0),a.offer=Array.isArray(t.offer)&&t.offer.every(x=>typeof x=="string"&&x in ot)&&t.offer.length?t.offer.slice(0,3):null,a.offer||(a.picks=0),a.talents={};const i=t.talents&&typeof t.talents=="object"?t.talents:{};for(const x of Object.keys(i)){const b=x;ot[b]&&(a.talents[b]=Me(i[x],0,ot[b].max||1,0))}const r=t.base&&typeof t.base=="object"?t.base:{};for(const x of Object.keys(a.base))a.base[x]=Me(r[x],0,999,a.base[x]);a.gear=(Array.isArray(t.gear)?t.gear:[]).map(Na).filter(x=>x!==null).slice(0,Mt+10);const c=t.equip&&typeof t.equip=="object"?t.equip:{};for(const x of Object.keys(a.equip)){const b=Na(c[x]);b&&Ni(Te[b.base].slot).includes(x)&&(!Te[b.base].family||Te[b.base].family===o)?a.equip[x]=b:c[x]===null&&x!=="weapon"&&(a.equip[x]=null)}a.bag=(Array.isArray(t.bag)?t.bag:[]).filter(x=>{if(!x||typeof x!="object")return!1;const b=x;return typeof b.id=="string"&&b.id in Ce&&Number(b.n)>0}).map(x=>({id:x.id,n:Me(x.n,1,9999,1)}));const d=t.lumen&&typeof t.lumen=="object"?t.lumen:{};a.lumen={kind:typeof d.kind=="string"&&d.kind in zt?d.kind:"mote",ember:Me(d.ember,0,9999,0),shell:Me(d.shell,0,9999,0),tide:Me(d.tide,0,9999,0),charge:ks(d.charge,0,100,0)},a.board=Me(t.board,0,1e9,0),a.missions=Me(t.missions,0,1e9,0),a.first=!!t.first&&!a.missions;const h=t.threat&&typeof t.threat=="object"?t.threat:{};for(const x of Object.keys(h)){const b=Ft(x);b&&b.mission&&(a.threat[x]=Me(h[x],0,At,0))}a.parts=Me(t.parts,0,1e9,0),a.relicDry=Me(t.relicDry,0,99,0),a.deepest=Me(t.deepest,0,9999,0),a.guided=typeof t.guided=="boolean"?t.guided:a.missions>0||Rc();const u=t.relics&&typeof t.relics=="object"?t.relics:{};for(const x of Object.keys(u)){const b=x;he[b]&&(a.relics[b]=Me(u[x],0,1e6,0))}const f=typeof e.id=="string"&&/^[a-z0-9]{4,24}$/.test(e.id)?e.id:Qi(),p=e.view,m=Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)?[ks(p[0],.2,1.35,.36),ks(p[1],7,42,10.5)]:null,v=e.pending,g=v&&typeof v=="object"&&Number.isFinite(Number(v.seed))?{seed:Number(v.seed),biome:String(v.biome||"")}:null;return{id:f,version:bn,name:typeof e.name=="string"&&e.name.trim()?e.name.trim().slice(0,24):"Surveyor",created:Me(e.created,0,1e15,Date.now()),saved:Me(e.saved,0,1e15,Date.now()),played:ks(e.played,0,1e9,0),view:m,pending:g,sheet:a}}function Nc(){try{return globalThis.localStorage??null}catch{return null}}class Bc{kv;failed;constructor(e=Nc()){this.kv=e,this.failed=!e}read(e){try{const t=this.kv&&this.kv.getItem(e);return t?JSON.parse(t):null}catch{return null}}write(e,t){try{return this.kv?(this.kv.setItem(e,JSON.stringify(t)),!0):!1}catch{return this.failed=!0,!1}}loadAccount(){const e=this.read(Fa),t=(e&&Array.isArray(e.heroes)?e.heroes:[]).filter(n=>typeof n=="string"&&!!this.read(sn(n)));return{version:bn,created:e&&e.created?e.created:Date.now(),heroes:t}}saveAccount(e){this.write(Fa,e)}newHero(e,t="Surveyor"){return{id:Qi(),version:bn,name:t,created:Date.now(),saved:Date.now(),played:0,view:null,pending:null,sheet:e}}loadHero(e){return Ba(this.read(sn(e)))}saveHero(e,t){this.write(sn(e.id),e),t&&t.heroes[0]!==e.id&&(t.heroes=[e.id,...t.heroes.filter(n=>n!==e.id)],this.saveAccount(t))}deleteHero(e,t){try{this.kv&&this.kv.removeItem(sn(e))}catch{}t.heroes=t.heroes.filter(n=>n!==e),this.saveAccount(t)}summaries(e){return e.heroes.map(t=>this.loadHero(t)).filter(t=>t!==null).map(t=>({id:t.id,cls:t.sheet.cls,people:t.sheet.people,level:t.sheet.level,missions:t.sheet.missions,played:t.played}))}exportAll(e){return JSON.stringify({lumenwake:bn,exported:new Date().toISOString(),account:e,heroes:e.heroes.map(t=>this.read(sn(t))).filter(Boolean)},null,1)}importAll(e){let t;try{t=JSON.parse(e)}catch{return!1}if(!t||typeof t!="object")return!1;const n=t;if(n.lumenwake!==bn||!Array.isArray(n.heroes))return!1;const o=n.heroes.map(Ba).filter(r=>r!==null);if(!o.length)return!1;for(const r of this.loadAccount().heroes)try{this.kv&&this.kv.removeItem(sn(r))}catch{}for(const r of o)this.write(sn(r.id),r);const a=n.account,i=(a&&Array.isArray(a.heroes)?a.heroes:[]).filter(r=>o.some(c=>c.id===r));return this.saveAccount({version:bn,created:Date.now(),heroes:[...i,...o.map(r=>r.id).filter(r=>!i.includes(r))]}),!this.failed}}const Ha={town:"Meridian Landing",way:"First Light",elder:"The elder",home:"Home"},Da=s=>s.world.roomAt(s.player.x,s.player.z),gn=(s,e)=>{const t=s.missions.active;return!t||!t.rooms[e]||t.rooms[e].state==="clear"},Hc=s=>s.bus.emit("ui:close"),xt=[{id:"walk",chapter:"town",keys:["W","A","S","D"],text:"Walk to Ilse, the dispatcher. Clicking the ground works too.",touch:"Push the stick to walk to Ilse, the dispatcher.",point:"npc:bounty",when:(s,e)=>e.near(7)},{id:"look",chapter:"town",keys:["Right drag"],text:"Hold the right mouse button and drag to look around. The wheel zooms.",touch:"Drag the picture to look around. Pinch to zoom.",when:(s,e)=>e.turned(),auto:14},{id:"talk",chapter:"town",keys:["F"],text:"Talk to Ilse: click her, or press F beside her.",touch:"Tap Ilse to talk to her.",point:"npc:bounty",on:"npc:talk",if:s=>s?.role==="bounty"},{id:"take",chapter:"town",text:"Take your first contract: First Light.",spot:'[data-act="accept"]',on:"mission:taken",if:s=>!!s,skip:s=>!!s.missions.pending},{id:"pad",chapter:"town",text:"Go to the pad at the south gate. It sends you down.",point:"pad",on:"mission:begin",enter:Hc},{id:"path",chapter:"way",text:"Follow the path onto the first island.",point:"room:1",when:s=>Da(s)===1},{id:"attack",chapter:"way",keys:["Click"],text:"Click a creature to attack it. Three hits in a row: the third is the heavy one.",touch:"Tap the sword to attack. Three hits in a row: the third is the heavy one.",point:"foe",touchSpot:".slot.act",on:"monster:died",skip:s=>gn(s,1)},{id:"ability",chapter:"way",keys:["1"],text:"Press 1 for your first ability. It spends focus, the blue bar.",touch:"Tap the first round button: your first ability. It spends focus, the blue bar.",point:"foe",spot:".slot.s0",on:"skill"},{id:"dodge",chapter:"way",text:"Mustard on the ground means a blow is coming there. Step out of it.",point:"foe",when:s=>gn(s,1),skip:s=>gn(s,1)},{id:"loot",chapter:"way",text:"Walk over what they drop to pick it up.",point:"drop",when:(s,e)=>e.time>1&&!s.loot.drops.length,auto:20},{id:"equip",chapter:"way",keys:["B"],text:"A better weapon. Open your pack and equip it.",touch:"A better weapon. Open the menu and equip it.",spot:['.detail [data-act="equip"]:not(:disabled)','.tab-gear .tile[data-key^="gear:"]',"#tab-gear",'#menu [data-open="bag"]'],on:"equip",skip:s=>!s.player.sheet.gear.length},{id:"pod",chapter:"way",text:"Supply pods open when you walk up to them.",point:"pod",on:"pod:open",skip:(s,e)=>!e.target("pod")},{id:"jump",chapter:"way",keys:["Space"],text:"The gate is down. Jump the gap in the bridge.",touch:"The gate is down. Tap Jump to cross the gap in the bridge.",point:"gap",touchSpot:".slot.jump",when:s=>Da(s)===2},{id:"burst",chapter:"way",keys:["G"],text:"Your lumen fills as you fight. It is full now: let its burst go.",touch:"Your lumen fills as you fight. It is full now: tap it.",spot:"#lumen",on:"lumen:burst",enter:s=>{s.player.sheet.lumen.charge=100},skip:s=>gn(s,2)},{id:"pack",chapter:"way",text:"Clear the island. A second pack is on its way.",point:"foe",when:s=>gn(s,2),skip:s=>gn(s,2)},{id:"mark",chapter:"way",text:"A survey mark. Walk up to it: every mark logged raises the pay.",point:"site:mark",on:"site:used",skip:(s,e)=>!e.target("site:mark")},{id:"elder",chapter:"elder",text:"The elder holds the last island. Cross to it.",point:"room:boss",on:"boss:arrive"},{id:"slam",chapter:"elder",keys:["Space"],text:"When the ground under you is marked, get clear, or jump as the blow lands.",touch:"When the ground under you is marked, get clear, or jump as the blow lands.",when:(s,e)=>{const t=e.target("boss");return e.time>18||!t||t.hp<t.maxHp*.6}},{id:"down",chapter:"elder",text:"Bring it down. Keep moving: what it throws lands where you stand.",point:"boss",on:"boss:fell",skip:(s,e)=>!e.target("boss")},{id:"spoils",chapter:"elder",text:"Pick up what it dropped. You are lifted out when the count ends.",point:"drop",on:"mission:report"},{id:"paid",chapter:"home",text:"Paid, and a Rare piece on top. Press Continue.",spot:"#report-ok",on:"report:closed",auto:30},{id:"points",chapter:"home",keys:["C"],text:"You gained levels. Spend your points and choose a talent.",touch:"You gained levels. Open the menu, spend your points and choose a talent.",spot:[".char-offer",".attr-grid:has(.plus:not(:disabled))","#tab-character",'#menu [data-open="character"]'],when:s=>!s.player.sheet.points&&!s.player.sheet.picks,skip:s=>!s.player.sheet.points&&!s.player.sheet.picks},{id:"feed",chapter:"home",keys:["L"],text:"Feed your lumen what you brought back. At level 5 it changes shape.",touch:"Open the menu and feed your lumen what you brought back. At level 5 it changes shape.",spot:['.lumen-feed [data-act="feedall"]','.lumen-feed [data-act="feed"]',"#tab-lumen",'#menu [data-open="lumen"]'],on:"lumen:changed",skip:s=>s.player.sheet.lumen.kind!=="mote"},{id:"next",chapter:"home",text:"That is all of it. Ilse has three new contracts, each in a different place.",point:"npc:bounty",on:"npc:talk",auto:12}],io=[{id:"tonic",keys:["R"],text:"Low on health: drink a Red Tonic.",touch:"Low on health: tap the red flask.",spot:".slot.d0",seconds:10,when:s=>!s.player.dead&&s.player.hp<s.player.maxHp*.45&&s.loot.count("tonic")>0,until:"drink"},{id:"fell",keys:["Space"],text:"A missed jump costs a little health. Run at the gap and jump near its edge.",touch:"A missed jump costs a little health. Run at the gap and jump near its edge.",seconds:8,on:"fell"}],Dc=3;class Oc{game;i=-1;time=0;goal=null;count={};hidden=!1;tip=null;tipped={};from=null;pulse=0;look=0;constructor(e){this.game=e;const t=e.bus;t.on("begin",()=>this.begin()),t.on("guide:skip",o=>this.finish(!0,!!(o&&o.quiet))),t.on("guide:restart",()=>this.restart());const n=new Set;for(const o of xt)o.on&&n.add(o.on);for(const o of io)o.on&&n.add(o.on),o.until&&n.add(o.until);for(const o of n)t.onDynamic(o,a=>this.heard(o,a));t.on("mission:report",o=>{this.running&&!o.won&&this.go(xt.findIndex(a=>a.id==="talk"))}),t.on("mission:begin",o=>{this.running&&!o.offer.first&&this.finish(!0)})}get running(){return this.i>=0}get step(){return this.i>=0?xt[this.i]:null}begin(){const e=this.game.player.sheet;!/[?&]firststeps\b/.test(location.search)&&(e.guided||e.missions>0)||this.start()}remember(){this.game.player.sheet.guided=!0,this.game.save()}start(){const e=this.game,t=e.missions;e.player.sheet.first=!0,t.active||(t.pending&&!t.pending.first&&t.drop(),t.pending||t.refresh()),this.go(0)}restart(){this.game.missions.active||(this.tipped={},this.start())}go(e){const t=this.game;for(;e<xt.length&&xt[e].skip&&xt[e].skip(t,this);)e++;if(e>=xt.length){this.finish(!1);return}const n=this.step;this.i=e,this.time=0,this.count={},this.goal=null,this.pulse=0,this.from={...t.camera.goal};const o=xt[e];(!n||n.chapter!==o.chapter)&&t.bus.emit("guide:chapter",{id:o.chapter,title:Ha[o.chapter]}),o.enter&&o.enter(t,this),this.announce()}next(){this.step&&this.game.bus.emit("guide:step",{id:this.step.id}),this.go(this.i+1)}finish(e,t=!1){const n=this.game,o=this.running;this.i=-1,this.goal=null,e&&n.player.sheet.first&&!n.missions.active&&!(n.missions.pending&&n.missions.pending.first)&&(n.player.sheet.first=!1,n.missions.refresh()),t||this.remember(),n.bus.emit("guide",null),n.bus.emit("guide:goal",null),(o||e)&&n.bus.emit("guide:done",{skipped:e,quiet:t})}announce(){const e=this.game,t=this.step;if(!t||this.hidden)return;const n=xt.filter(o=>o.chapter===t.chapter);e.bus.emit("guide",{title:Ha[t.chapter],index:n.indexOf(t),total:n.length,text:t.text,touch:t.touch,keys:t.keys,spot:t.spot,touchSpot:t.touchSpot}),this.aim(!0)}target(e){const t=this.game,n=t.player,o=t.world;if(!e)return null;const a=i=>i.reduce((r,c)=>!r||Math.hypot(c.x-n.x,c.z-n.z)<Math.hypot(r.x-n.x,r.z-n.z)?c:r,null);if(e==="npc:bounty")return t.entities.list.find(i=>i.kind==="npc"&&i.role==="bounty")||null;if(e==="pad"){const i=o.structures.find(r=>r.role==="deploy");return i?{x:i.x,y:o.surface(i.x,i.z),z:i.z}:null}if(e==="foe")return a(t.monsters.filter(i=>!i.dead&&!i.boss));if(e==="boss")return t.monsters.find(i=>i.boss&&!i.dead)||null;if(e==="drop")return a(t.loot.drops.filter(i=>!i.gone));if(e==="pod"){const i=t.missions.active,r=a(o.structures.filter(c=>c.role==="pod"&&!c.pal&&!c.terrace&&(!i||i.rooms[c.room].state==="clear")));return r?{x:r.x,y:o.surface(r.x,r.z),z:r.z}:null}if(e==="gap"){const i=o.nav.links.find(h=>h.gap&&h.part!==2);if(!i)return null;const r=(n.x-i.ax)*i.ux+(n.z-i.az)*i.uz,c=i.tmax-.7,d=o.rooms[i.b];return r>i.tmax+.4?{x:d.x,y:o.surface(d.x,d.z),z:d.z}:{x:i.ax+i.ux*c,y:o.surface(i.ax+i.ux*c,i.az+i.uz*c),z:i.az+i.uz*c}}if(e.startsWith("site:")){const i=e.slice(5);return t.entities.list.find(r=>r.kind==="site"&&r.site===i&&!r.gone)||null}if(e.startsWith("room:")){const i=e.slice(5),r=/^\d+$/.test(i)?o.rooms[+i]:o.rooms.find(c=>c.kind===i);return r?{x:r.x,y:o.surface(r.x,r.z),z:r.z}:null}return null}aim(e=!1){const t=this.step,n=t&&t.point?this.target(t.point):null;(n===this.goal||n!==null&&this.goal!==null&&!("kind"in n)&&!("kind"in this.goal)&&n.x===this.goal.x&&n.z===this.goal.z)&&!e||(this.goal=n,this.game.bus.emit("guide:goal",n))}near(e){const t=this.game.player,n=this.goal;return!!n&&Math.hypot(n.x-t.x,n.z-t.z)<e}turned(){const e=this.game.camera.goal,t=this.from;return!!t&&(Math.abs(e.yaw-t.yaw)>.45||Math.abs(e.pitch-t.pitch)>.18||Math.abs(e.distance/t.distance-1)>.14)}heard(e,t){const n=this.game;this.tip&&this.tip.def.until===e&&this.endTip();for(const a of io)a.on===e&&!this.tipped[a.id]&&this.showTip(a);if(!this.running)return;this.count[e]=(this.count[e]||0)+1;const o=this.step;for(let a=this.i;a<=Math.min(this.i+Dc,xt.length-1);a++){const i=xt[a];if(!(i.on!==e||i.if&&!i.if(t,n,this))){if(a!==this.i&&o&&i.chapter!==o.chapter)break;this.i=a,this.next();return}}}showTip(e){this.tipped[e.id]=!0,this.tip={def:e,left:e.seconds},this.game.bus.emit("guide:tip",{text:e.text,touch:e.touch,keys:e.keys,spot:e.spot,touchSpot:e.touchSpot})}endTip(){this.tip=null,this.game.bus.emit("guide:tip",null)}update(e){const t=this.game;if(t.paused)return;const n=t.cinema.blocking;if(n!==this.hidden&&(this.hidden=n,n?(t.bus.emit("guide",null),t.bus.emit("guide:goal",null)):this.announce()),this.tip)this.tip.left-=e,(this.tip.left<=0||this.tip.def.when&&!this.tip.def.when(t,this))&&this.endTip();else if(!n){for(const i of io)if(i.when&&!this.tipped[i.id]&&i.when(t,this)){this.showTip(i);break}}const o=this.step;if(!o||n)return;this.time+=e,(this.look-=e)<=0&&(this.look=.3,this.aim());const a=this.goal;a&&(!("kind"in a)||a.kind==="drop")&&(this.pulse-=e)<=0&&(this.pulse=.9,t.fx.click(a.x,a.y??t.world.surface(a.x,a.z),a.z)),(o.when&&o.when(t,this)||o.auto&&this.time>o.auto)&&this.next()}}const $c=78;class Uc{game;batches=new Map;frame;lights=[];mark=null;tick=-1;only=null;constructor(e){this.game=e,this.frame={camera:e.camera,env:e.env,focus:[0,0,0],time:0,timeTwos:0,far:600,dpr:1,look:e.look,casters:new Float32Array(_e.MAX_CASTERS*4),casterCount:0,lightPos:new Float32Array(_e.MAX_LIGHTS*4),lightCol:new Float32Array(_e.MAX_LIGHTS*3),lightCount:0,batches:this.batches,fx:e.fx,reveal:[0,0,0,0]}}batch(e){let t=this.batches.get(e);return t||(t={data:new Float32Array(cn*16),count:0},this.batches.set(e,t)),t}build(e){const t=this.game,n=t.player,o=this.frame,a=t.camera;a.shakeScale=t.settings&&t.settings.shake!==void 0?t.settings.shake:1;for(const m of this.batches.values())m.count=0;const i=t.entities.list,r=[],c=Math.floor(e*12),d=c!==this.tick;this.tick=c,o.timeTwos=c/12;for(let m=0;m<i.length;m++){const v=i[m],g=Math.hypot(v.x-n.x,v.z-n.z);if(g>$c&&!v.far||v.grow<=.01||this.only&&v!==this.only)continue;const x=t.world.chunk(Math.floor(v.x/He.CHUNK),Math.floor(v.z/He.CHUNK)).height[((Math.floor(v.z)&He.CHUNK-1)*He.CHUNK+(Math.floor(v.x)&He.CHUNK-1))*4+1];v.shade+=(1-x*.75-v.shade)*.12;const b=this.batch(v.archetype);if((b.count+1)*cn>b.data.length){const P=new Float32Array(b.data.length*2);P.set(b.data),b.data=P}const _=b.data,z=b.count++*cn,C=v.colors,k=v.scale*v.grow;_[z]=v.x,_[z+1]=v.y+v.lift,_[z+2]=v.z,_[z+3]=k,(d||v.pose===void 0)&&(v.pose=[v.yaw,v.walk,v.action,v.actionT]),_[z+4]=v.pose[0],_[z+5]=v.pose[1],_[z+6]=v.pose[2],_[z+7]=v.pose[3],_[z+8]=v.seed,_[z+9]=v.flash,_[z+10]=v.shade,_[z+11]=(v.ghost?1:0)+((v.hover||v===n.target)&&!v.hitY?2:0)+4*(v.wears||0),_[z+12]=C[0][0],_[z+13]=C[0][1],_[z+14]=C[0][2],_[z+15]=v.kind==="drop"?0:v.move,_[z+16]=C[1][0],_[z+17]=C[1][1],_[z+18]=C[1][2],_[z+19]=v.extra,_[z+20]=C[2][0],_[z+21]=C[2][1],_[z+22]=C[2][2],_[z+23]=v.kit||0,v.kind!=="drop"&&g<45&&r.push({e:v,dist:g})}r.sort((m,v)=>m.dist-v.dist),o.casterCount=Math.min(r.length,_e.MAX_CASTERS);for(let m=0;m<o.casterCount;m++){const v=r[m].e,g=Math.max(v.radius,v.height*.33)*v.scale*v.grow;o.casters.set([v.x,v.y+g*1.05+v.lift+(v.archetype==="wisp"?.6:0),v.z,g],m*4)}this.collectLights(),this.markTarget();const h=a.project(n.x,n.y+.8,n.z);h&&!t.paused&&!n.dead&&!t.cinema.active?(o.reveal[0]=h.x*2-1,o.reveal[1]=1-h.y*2,o.reveal[2]=.3,o.reveal[3]=Math.hypot(a.pos[0]-n.x,a.pos[1]-n.y-.8,a.pos[2]-n.z)):o.reveal[2]=0,o.time=e,o.focus=a.target,t.fx.write();const u=t.renderer.minimap;u.clear(),u.player=[n.x,n.z,n.yaw];const f=Math.max(8,u.rect[2]*u.rect[3]-7),p=(m,v,g,x)=>{const b=m-n.x,_=v-n.z,z=Math.hypot(b,_),C=z>f?f/z:1;u.add(n.x+b*C,n.z+_*C,g,x)};for(const m of t.world.structures)m.role==="leave"||m.role==="deploy"?p(m.x,m.z,5,3.2):m.role==="pod"&&!m.pal&&(Math.hypot(m.x-n.x,m.z-n.z)<f?u.add(m.x,m.z,3,2.2):t.missions.active&&t.missions.active.revealed&&p(m.x,m.z,3,1.8));for(const m of i)if(m.kind==="npc")u.add(m.x,m.z,1,2.6);else if(m.kind==="monster"&&!m.dead){const v=m;u.add(v.x,v.z,v.boss?4:0,v.elite?3:2)}else if(m.kind==="drop")u.add(m.x,m.z,3,1.4);else if(m.kind==="site"){const v=t.missions.active;Math.hypot(m.x-n.x,m.z-n.z)<26?u.add(m.x,m.z,5,2.4):v&&v.revealed&&p(m.x,m.z,5,2.2)}return o}collectLights(){const e=this.game,t=e.player,n=this.frame,o=e.env.night,a=this.lights;a.length=0,e.world.forEachProp(t.x,t.z,44,r=>{const c=r.def.light;if(!c)return;const d=c.always?.3+.7*o:o;if(d<.05)return;const h=-Math.sin(r.rot),u=Math.cos(r.rot),f=c.forward||0;a.push({x:r.x+h*f,y:r.y+c.y*r.scale,z:r.z+u*f,r:c.radius,k:d*(c.always?.55:1),d:0})});for(const r of e.monsters)r.def.glow&&!r.dead&&o>.05&&a.push({x:r.x,y:r.y+1,z:r.z,r:4.5,k:o*.7,d:0});const i=e.companion&&e.companion.e;e.biome.realm===1&&i&&!i.gone&&i.grow>.5&&a.push({x:i.x,y:i.y,z:i.z,r:9,k:1,d:0});for(const r of e.monsters)r.def.lamp&&!r.dead&&o>.05&&a.push({x:r.x,y:r.y+r.def.lamp[0],z:r.z,r:r.def.lamp[1],k:o,d:0});for(const r of e.fx.lights)a.push({x:r.x,y:r.y,z:r.z,r:r.r,k:r.life/r.max*(.25+.75*o),d:0});for(const r of a)r.d=Math.hypot(r.x-t.x,r.z-t.z);a.sort((r,c)=>r.d-c.d),n.lightCount=Math.min(a.length,_e.MAX_LIGHTS);for(let r=0;r<n.lightCount;r++){const c=a[r];n.lightPos.set([c.x,c.y,c.z,c.r],r*4),n.lightCol.set([c.k,0,0],r*3)}}markTarget(){const e=this.game,t=e.player.target;if(this.mark&&(!t||this.mark.follow!==t)&&(this.mark.hold=!1,this.mark.life=1,this.mark=null),t&&!this.mark&&t.kind!=="drop"){const n=t.kind==="monster"?[.84,.28,.2]:[.33,.42,.61];this.mark=e.fx.spawn("mark",t.x,t.y,t.z,{size:t.radius*2.1+.25,color:n,ground:!0,hold:!0,follow:t,dy:.1,alpha:1.2})}}}const Kc=.14,Gc=.06,Oa=.3;class Yc{canvas;touch;bus;input;store;account;hero=null;fresh;started=!1;paused=!0;halt=!1;reducedMotion=!1;low=!1;time=0;hour;biome;world;renderer;camera;env;look={hurt:0,fade:0,fadeGoal:1,veil:0};savedView=null;settings=null;entities;player;monsters=[];fx;view;controls;cinema;portraits;tutorial;combat;relics;skills;loot;spawner;missions;hazards;companion;sim;stop=0;saveTimer=8;playedAt=0;warmed=!1;constructor(e){if(this.canvas=e,this.touch=ra.touch,this.bus=new Pr,this.input=new qr(e),this.store=new Bc,this.account=this.store.loadAccount(),this.fresh=new URLSearchParams(location.search).has("new"),this.fresh){const a=new URLSearchParams(location.search);a.delete("new");const i=a.toString();history.replaceState(null,"",location.pathname+(i?"?"+i:"")+location.hash)}this.world=new La(ji(bo)),this.renderer=new Jl(e,this.world,{lite:ra.touch}),this.camera=new Ps,this.env=Mc(),this.hour=this.world.biome().hour,this.entities=new a0;const t=_o("vanguard");Mo(t);const n=this.world.spec.start.x,o=this.world.spec.start.z;for(this.player=this.entities.add(Gt("player","humanoid",{x:n,z:o,y:this.world.surface(n,o),yaw:2.6,radius:.36,height:1.6,ghost:!0,colors:lt([[214,70,52],[214,70,52],[122,62,44]]),name:"Surveyor",sheet:t,intent:{moveX:0,moveZ:0,aim:null},target:null,pursue:!1,moveTo:null,attackCd:0,calm:10,invuln:0,potionCd:0,pending:null,dash:null,mend:null,safe:!0,aloft:!1,air:0,vy:0,safeX:n,safeZ:o,chain:0,chainT:0,respawnT:0,rush:0,vigilUsed:!1,ward:0})),dt(this.player),this.player.hp=this.player.maxHp,this.player.focus=this.player.maxFocus,this.choosePeople("unit"),this.biome=this.world.biome(n,o),this.fx=new Sc(this),this.relics=new Y0(this),this.combat=new B0(this),this.loot=new j0(this),this.skills=new c0(this),this.missions=new cc(this),this.controls=new zc(this),this.spawner=new fc(this),this.view=new Uc(this),this.tutorial=new Oc(this),this.hazards=new H0(this),this.companion=new V0(this),this.sim=[new m0(this),new G0(this),this.hazards,this.skills,this.loot,this.spawner,this.missions,new J0(this),new hc(this),this.companion,this.relics],this.cinema=new wc(this),this.portraits=new Ac(this),this.missions.arrive(),this.companion.arrive(),this.bus.on("feel",a=>{a.hold&&this.hold(a.hold),a.shake&&(this.camera.shake=Math.min(1,this.camera.shake+a.shake)),a.hurt&&(this.look.hurt=a.hurt)}),this.bus.on("fade",a=>{this.look.fadeGoal=a}),this.bus.on("world:changed",a=>{for(const[i,r]of a)this.renderer.worldTex.refresh(i,r)}),this.camera.target=[n,this.player.y+1,o],this.resize(),addEventListener("resize",()=>this.resize()),addEventListener("beforeunload",()=>this.save()),addEventListener("pagehide",()=>this.save()),document.addEventListener("visibilitychange",()=>{document.hidden&&this.save()});this.renderer.worldTex.update(n,o,16)>0;);}resize(){const e=this.canvas.getBoundingClientRect();this.renderer.resize(Math.max(1,Math.round(e.width)),Math.max(1,Math.round(e.height)),Math.min(devicePixelRatio||1,2))}start(){let e=performance.now();const t=n=>{requestAnimationFrame(t);const o=n-e;e=n,this.frame(Math.min(o/1e3,.05),o)};requestAnimationFrame(t)}hold(e){this.reducedMotion||(this.stop=Math.max(this.stop,Math.min(e,Kc)))}frame(e,t){const n=this.player;let o=e;this.stop>0&&(this.stop-=e,o=e*Gc);const a=!!this.halt;a&&(o=0),this.time+=o;const i=this.cinema;i.blocking||a?this.controls.release():this.controls.update(o);const r=a?0:i.pace;if(r>0)for(const f of this.sim)f.update(o*r);this.tutorial.update(o),this.fx.update(r>0?o*r:o),a||i.update(e);const c=this.world;this.entities.sweep(),this.bus.emit("frame",e),this.biome=c.biome(n.x,n.z),_c(this.env,this.hour,this.biome.rock),this.env.pave=this.biome.realm===1?0:1,this.env.realm=this.biome.realm||0,this.env.wall=this.biome.walls||0,this.env.sky=[(c.spec.seed>>>0)%997/997,this.biome.realm?0:1],this.env.skyTop=this.biome.ground2,this.env.cloud=this.biome.cloud+.16*Math.sin(this.time/83+n.x*.002)*Math.cos(this.time/131+n.z*.0017);const d=!n.dead&&n.hp<n.maxHp*(this.low?Oa+.08:Oa);d!==this.low&&(this.low=d,d&&!this.paused&&this.bus.emit("lowhealth",{}));const h=d?.56+(this.reducedMotion?0:.14*Math.sin(this.time*3.2)):0;this.look.hurt=Math.max(h,this.look.hurt-e*2.2),this.look.fade=je(this.look.fade,this.look.fadeGoal,3,e);const u=i.focus;this.renderer.worldTex.update(u?u[0]:n.x,u?u[1]:n.z,2),this.portraits.update(),this.camera.still=this.reducedMotion,this.camera.update(e,[n.x,n.y+1,n.z],this.renderer.size.cssW/this.renderer.size.cssH,(f,p)=>c.surface(f,p)),this.warmed||(this.warmed=this.renderer.warm()),this.renderer.autoAdapt&&this.renderer.adapt(t),this.renderer.render(this.view.build(this.time)),this.input.endFrame(),this.saveTimer-=e,this.saveTimer<=0&&(this.saveTimer=8,this.save())}save(){const e=this.hero;if(!e||!this.started)return;const t=performance.now();e.played+=Math.min(60,Math.max(0,(t-(this.playedAt||t))/1e3)),this.playedAt=t,e.sheet=this.player.sheet,e.saved=Date.now(),e.view=[this.camera.goal.pitch,this.camera.goal.distance];const n=this.missions.pending||this.missions.active&&this.missions.active.offer;e.pending=n&&!n.first?{seed:n.seed,biome:n.biome}:null,this.store.saveHero(e,this.account)}load(e){const t=this.player;this.hero=e,t.sheet=e.sheet,S0(e.sheet),this.choosePeople(e.sheet.people||"unit"),dt(t),t.hp=t.maxHp,t.focus=t.maxFocus,this.missions.refresh();const n=e.pending&&this.missions.offers.find(o=>o.seed===e.pending.seed&&o.biome===e.pending.biome);this.missions.pending=n||null,this.savedView=e.view,this.bus.emit("class",{id:e.sheet.cls,cls:ze[e.sheet.cls]}),this.bus.emit("mission:taken",this.missions.pending)}enter(e){const t=this.player;for(const n of this.entities.list)n!==t&&(n.gone=!0);for(this.entities.sweep(),this.monsters=[],this.loot.drops.length=0,this.hazards.clear(),this.fx.clear(),this.world=new La(e),this.renderer.setWorld(this.world),this.hour=this.world.biome().hour,this.biome=this.world.biome(),Object.assign(t,{x:e.start.x,z:e.start.z,yaw:e.start.yaw,target:null,pursue:!1,moveTo:null,dash:null,action:0,pending:null,mend:null,dead:!1,grow:1,invuln:1.2,calm:10}),t.y=this.world.surface(t.x,t.z),this.camera.target=[t.x,t.y+1,t.z],this.camera.goal.yaw=Math.PI-e.start.yaw,this.camera.yaw=Math.PI-e.start.yaw;this.renderer.worldTex.update(t.x,t.z,16)>0;);this.look.fade=0,this.look.fadeGoal=1,this.bus.emit("zone",{spec:e,biome:this.biome})}choosePeople(e){const t=this.player,n=wt[e]||wt.human,o=ze[t.sheet.cls];t.sheet.people=e,t.build=n.index,t.extra=n.index,t.scale=n.scale,t.height=1.6*n.scale,t.seed=n.look??.62,t.colors=lt([o.color,n.index===0?o.color:[236,228,210],n.hair[0]]),this.bus.emit("people",{id:e,people:n})}chooseClass(e){const t=this.player,n=ze[e],o=t.sheet.people;t.sheet=_o(e),Mo(t.sheet),this.choosePeople(o||"unit"),dt(t),t.hp=t.maxHp,t.focus=t.maxFocus,this.missions.refresh(),this.bus.emit("class",{id:e,cls:n})}spendAttribute(e){const t=this.player.sheet;return t.points<=0?!1:(t.base[e]++,t.points--,dt(this.player),this.bus.emit("ui:click"),!0)}chooseTalent(e){const t=this.player.sheet;return o0(t,e)?(dt(this.player),this.bus.emit("talent",{id:e,name:ot[e].name}),this.bus.emit("ui:click"),!0):!1}begin(){this.started||(this.hero||(this.hero=this.store.newHero(this.player.sheet)),this.playedAt=performance.now(),this.started=!0,this.paused=!1,this.bus.emit("begin"),this.save())}}const Hn={sfx:1,music:.5,ambience:.55},jt={master:1,sfx:1,music:.5,ambience:.55},zs={sfx:24,chime:16,music:48,ambience:16},$a=30,Wc=4,ro=4e-4,So=[0,2,4,7,9],Ua=[0,3,5,7,10],Z=(s=0,e=1)=>s+Math.random()*(e-s),Ms=(s,e)=>Math.floor(Z(s,e+1)),Yo=s=>s[Math.floor(Math.random()*s.length)],Ne=s=>440*2**((s-69)/12),lo=s=>(s%12+12)%12,$t=(s,e)=>s+12*Math.ceil((e-s)/12),tt=(s,e,t)=>e!=null&&Object.hasOwn(s,e)?s[e]:t;function Vc(s,e){const t=s.createBuffer(1,Math.floor(s.sampleRate*e),s.sampleRate),n=t.getChannelData(0);for(let o=0;o<n.length;o++)n[o]=Math.random()*2-1;return t}function Xc(s,e){const t=s.sampleRate,n=Math.floor(t*e),o=Math.floor(t*.018),a=s.createBuffer(2,n,t);for(let i=0;i<2;i++){const r=a.getChannelData(i);let c=0;for(let d=o;d<n;d++){const h=(d-o)/(n-o);c+=(Math.random()*2-1-c)*(.5-.42*h),r[d]=c*(1-h)**2.6}}return a}function jc(s){const e=s.createWaveShaper(),t=2048,n=new Float32Array(t),o=.6;for(let a=0;a<t;a++){const i=a/(t-1)*2-1,r=Math.abs(i);n[a]=r<o?i:Math.sign(i)*(o+(1-o)*Math.tanh((r-o)/(1-o)))}return e.curve=n,e}function Zc(s,e,t){const n=s.createGain();n.gain.value=0,n.connect(jc(s)).connect(s.destination);const o=s.createConvolver();o.buffer=Xc(s,2.8),o.connect(n);const a={sfx:{n:0,max:zs.sfx},chime:{n:0,max:zs.chime},music:{n:0,max:zs.music},ambience:{n:0,max:zs.ambience}},i=(k,P,w)=>{const y=s.createGain();if(y.gain.value=k,y.connect(n),P>0){const M=s.createGain();M.gain.value=P,y.connect(M).connect(o)}return{node:y,pool:w}},r={sfx:i(jt.sfx,.1,a.sfx),chime:i(jt.sfx,.45,a.chime),music:i(jt.music,.55,a.music),amb:i(jt.ambience,0,a.ambience),air:i(jt.ambience,.4,a.ambience)},c=s.createBiquadFilter();c.frequency.value=t?.pad??800,c.Q.value=.3,c.connect(r.music.node);const d=Vc(s,5),h=s.createPeriodicWave(new Float32Array(7),new Float32Array([0,1,.45,.2,.1,.05,.025])),u=(...k)=>s.createPeriodicWave(new Float32Array(k.length+1),new Float32Array([0,...k])),f={organ:u(1,.5,.12,.25,0,.06,0,.08),flute:u(1,.3,.09,.03)},p=k=>k.when??s.currentTime+C.delay+(k.at??0);function m(k,P,w,y){const M=Math.max(.002,y.attack??.005),R=Math.max(0,y.hold??0),E=Math.max(.01,y.decay??.2),U=P+M,Q=U+R,L=Q+E;return k.value=0,k.setValueAtTime(0,P),k.linearRampToValueAtTime(w,U),R>0&&k.setValueAtTime(w,Q),k.exponentialRampToValueAtTime(w*.001,L),k.linearRampToValueAtTime(0,L+.02),L+.03}function v(k,P,w,y,M,R=[]){for(let E=0;E<P.length-1;E++)P[E].connect(P[E+1]);P[P.length-1].connect(w.node),w.pool.n++,w.live&&w.live.set(k,{t0:y,end:M}),k.onended=()=>{w.pool.n--,w.live&&w.live.delete(k);for(const E of P)E.disconnect();for(const E of R)E.disconnect()},k.stop(M)}function g(k){const P=(k.bus?r[k.bus]:void 0)||r.sfx,w=(k.gain??.1)*C.level;if(P.pool.n>=P.pool.max||!(w>ro)||!(k.freq>0))return;const y=p(k),M=s.createOscillator();k.wave?M.setPeriodicWave(k.wave):M.type=k.type||"sine",M.frequency.setValueAtTime(k.freq,y),k.detune&&(M.detune.value=k.detune);const R=s.createGain(),E=m(R.gain,y,w,k),U=y+(k.glide??(E-y)*.6);k.to!==void 0&&k.to>0&&M.frequency.exponentialRampToValueAtTime(k.to,U);const Q=[M],L=[];if(k.cutoff!==void 0&&k.cutoff>0){const F=s.createBiquadFilter();F.Q.value=.5,F.frequency.setValueAtTime(k.cutoff,y),k.cutoffTo!==void 0&&k.cutoffTo>0&&F.frequency.exponentialRampToValueAtTime(k.cutoffTo,U),Q.push(F)}if(k.formant){const F=s.createBiquadFilter();F.type="peaking",F.frequency.value=k.formant[0],F.gain.value=k.formant[1],F.Q.value=k.formant[2]??1.5,Q.push(F)}if(Q.push(R),k.pan&&typeof s.createStereoPanner=="function"){const F=s.createStereoPanner();F.pan.value=k.pan,Q.push(F)}if(k.vibrato){const F=s.createOscillator(),O=s.createGain(),S=y+(k.vibrato.delay??0);F.frequency.value=k.vibrato.rate,O.gain.value=0,O.gain.setValueAtTime(0,S),O.gain.linearRampToValueAtTime(k.vibrato.depth,S+.5),F.connect(O).connect(M.detune),F.start(y),F.stop(E),L.push(F,O)}M.start(y),v(M,Q,P,y,E,L)}function x(k){const P=(k.bus?r[k.bus]:void 0)||r.sfx,w=k.filter||"bandpass",y=k.q??.8,M=k.freq??1e3,R=k.to!==void 0&&k.to>0?Math.sqrt(M*k.to):M,E=s.sampleRate/2,U=w==="lowpass"?R:w==="highpass"?E-R:R/y,Q=(k.gain??.1)*C.level/Math.sqrt(ue(U/E,.01,1));if(P.pool.n>=P.pool.max||!(Q>ro))return;const L=p(k),F=s.createBufferSource();F.buffer=d,F.loop=!0;const O=s.createBiquadFilter();O.type=w,O.Q.value=y,O.frequency.setValueAtTime(M,L);const S=s.createGain(),D=m(S.gain,L,Q,k);k.to!==void 0&&k.to>0&&O.frequency.exponentialRampToValueAtTime(k.to,L+(k.glide??(D-L)*.7)),F.start(L,Math.random()*(d.duration-1)),v(F,[F,O,S],P,L,D)}function b(k,P={}){const w=P.strings===1?[0]:[-2.5,2.5],y=ue(6*(220/k)**.35,2.5,7.5)*(P.ring??1);for(const M of w)g({bus:P.bus,at:P.at,when:P.when,wave:h,freq:k,detune:M,attack:.01,decay:y,gain:(P.gain??.15)/w.length,cutoff:Math.min(3200,k*5),cutoffTo:Math.max(240,k*1.4),glide:.8})}function _(k){const P=C.samples.get(k.name),w=(k.bus?r[k.bus]:void 0)||r.sfx,y=(k.gain??.3)*C.level;if(!P)return!1;if(w.pool.n>=w.pool.max||!(y>ro))return!0;const M=p(k),R=k.rate??1,E=s.createBufferSource();E.buffer=P,E.playbackRate.value=R;const U=s.createGain();U.gain.value=y;const Q=[E,U];if(k.pan&&typeof s.createStereoPanner=="function"){const L=s.createStereoPanner();L.pan.value=k.pan,Q.push(L)}return E.start(M),v(E,Q,w,M,M+P.duration/R+.02),!0}function z(k,P={}){const w=P.gain??.07,y=P.decay??.6,M={bus:P.bus,at:P.at,attack:.004};g({...M,freq:k,decay:y,gain:w}),k*2.76<4200&&g({...M,freq:k*2.76,decay:y*.4,gain:w*.2})}const C={ctx:s,master:n,buses:r,padFilter:c,noiseBuffer:d,waves:f,tone:g,noise:x,piano:b,bell:z,sample:_,samples:new Map,level:1,delay:0,root:t?.root??50,scale:t?.scale??So,key(k,P=60){const w=Math.floor(k/5);return Ne($t(C.root,P)+12*w+C.scale[k-5*w])},nearness(k){const P=e.player;if(!k||!P||typeof k.x!="number"||typeof k.z!="number"||!Number.isFinite(k.x)||!Number.isFinite(k.z))return 1;const w=ue(($a-Math.hypot(k.x-P.x,k.z-P.z))/($a-Wc),0,1);return w*w}};return C}const Jc=.86,Qc=36,ed=1,td=2.5,nd=.12,sd=4.5,od=.8,ad=.7,id=.5,rd={all:.7,lead:.3,comp:.3,fight:.3,pad:.5},yn={I:{bass:0,pad:[0,7,16]},Isus:{bass:0,pad:[0,7,14]},II:{bass:2,pad:[-3,6,14]},"II/I":{bass:0,pad:[2,9,18]},ii:{bass:2,pad:[-7,2,9]},iii:{bass:4,pad:[-1,7,16]},IV:{bass:5,pad:[-3,5,12]},Vsus:{bass:7,pad:[-5,2,12]},vi:{bass:9,pad:[-3,4,12]},i:{bass:0,pad:[0,7,15]},III:{bass:3,pad:[-2,7,15]},iv:{bass:5,pad:[-4,5,12]},v:{bass:7,pad:[-5,2,10]},VI:{bass:8,pad:[-4,3,12]},VII:{bass:10,pad:[-2,5,14]},vii:{bass:10,pad:[-2,5,13]},V:{bass:7,pad:[-5,2,11]},bII:{bass:1,pad:[1,8,17]}},ld={clear:{steps:[3,5],floor:60,gain:.11},done:{steps:[2,3,5],floor:57,gain:.12,roll:!0},home:{steps:[8,7,6,5],floor:50,gain:.12,roll:!0}},_s={major:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11],dorian:[0,2,3,5,7,9,10],minor:[0,2,3,5,7,8,10],harmonic:[0,2,3,5,7,8,11],phrygian:[0,1,3,5,7,8,10]},cd={3:[0],4:[0,2],5:[0,3],6:[0,3],7:[0,4],9:[0,3,6]};function Dn(s,e,t){const n=Ne(e.midi),o=t.vibrato?ue((400/n)**.25,.8,1.3):1,a=t.one?[[0,.8]]:[[0,.67],[t.spread??6,.33]];for(const[i,r]of a)s.tone({bus:e.bus,type:"sawtooth",freq:n,detune:i,when:e.when,gain:t.gain*r*o*e.gain,attack:t.attack,hold:Math.max(.1,e.len-(t.vibrato?.4:.3)),decay:t.decay??1.5,cutoff:Math.min(t.top,n*t.bright),vibrato:t.vibrato?{rate:t.vibrato[0],depth:t.vibrato[1],delay:.45}:void 0})}const Bt={piano:{low:40,play(s,e){s.piano(Ne(e.midi),{bus:e.bus,when:e.when+Z(0,.02),gain:.14*e.gain,strings:e.light?1:2,ring:e.light?.7:1})}},violin:{low:55,play(s,e){Dn(s,e,{gain:.08,attack:.5,bright:3,top:2200,vibrato:[5.2,12]})}},cello:{low:36,play(s,e){Dn(s,e,{gain:.085,attack:.55,bright:2.6,top:1400,vibrato:[4.7,10]})}},strings:{low:48,also:-12,play(s,e){Dn(s,e,{gain:.05,attack:.45,bright:2.2,top:1400,vibrato:[5.2,10],one:!0}),Dn(s,{...e,midi:e.midi-12},{gain:.055,attack:.5,bright:2.4,top:1e3,vibrato:[4.7,8],one:!0})}},lowstring:{low:28,play(s,e){Dn(s,e,{gain:.04,attack:.14,decay:.7,bright:4,top:700,spread:8,one:e.light})}},glass:{low:55,play(s,e){const t=Ne(e.midi),n=.06*e.gain*Math.min(1,Math.sqrt(660/t)),o=Z(-.3,.3),a=ue(e.len*1.7,1.8,3.6);s.tone({bus:e.bus,freq:t,when:e.when,pan:o,attack:.05,decay:a,gain:n}),t*3<4200&&s.tone({bus:e.bus,freq:t*3.01,when:e.when,pan:o,attack:.08,decay:a*.4,gain:n*.12})}},celesta:{low:60,play(s,e){const t=Ne(e.midi),n=.065*e.gain*Math.min(1,Math.sqrt(784/t)),o={bus:e.bus,when:e.when+Z(0,.015),attack:.007,pan:Z(-.25,.25)};s.tone({...o,freq:t,decay:1.8,gain:n}),s.tone({...o,freq:t*2,decay:.7,gain:n*.25}),t*4.2<4200&&s.tone({...o,freq:t*4.2,decay:.22,gain:n*.06})}},musicbox:{low:67,play(s,e){const t=Ne(e.midi),n=.06*e.gain*Math.min(1,Math.sqrt(1e3/t)),o={bus:e.bus,when:e.when+Z(0,.02),attack:.003};s.tone({...o,type:"triangle",freq:t,detune:Z(-8,8),decay:1.3,gain:n}),t*4<4200&&s.tone({...o,freq:t*4,decay:.3,gain:n*.12})}},flute:{low:60,play(s,e){const t=Ne(e.midi),n=.07*e.gain*Math.min(1,Math.sqrt(700/t)),o=Math.max(.1,e.len-.25);s.tone({bus:e.bus,wave:s.waves.flute,freq:t,when:e.when,gain:n,attack:.09,hold:o,decay:.5,vibrato:{rate:4.6,depth:8,delay:.35}}),s.noise({bus:e.bus,freq:t*1.5,q:3,when:e.when,attack:.07,hold:o*.5,decay:.5,gain:n*.04})}},organ:{low:43,play(s,e){const t=Ne(e.midi),n=.05*e.gain*Math.min(1,Math.sqrt(520/t));s.tone({bus:e.bus,wave:s.waves.organ,freq:t,when:e.when,gain:n,attack:.08,hold:Math.max(.1,e.len-.1),decay:.6,cutoff:Math.min(2400,t*4)})}},horn:{low:36,play(s,e){const t=Ne(e.midi),n=.07*e.gain*ue((200/t)**.25,.8,1.25),o={bus:e.bus,freq:t,when:e.when,attack:.14,hold:Math.max(.1,e.len-.3),decay:.6};s.tone({...o,type:"sawtooth",gain:n*.55,cutoff:t*1.5,cutoffTo:Math.min(1100,t*3.2),glide:.35}),s.tone({...o,type:"triangle",gain:n*.6})}},hum:{low:48,play(s,e){const t=Ne(e.midi),n=.07*e.gain,o={bus:e.bus,freq:t,when:e.when,attack:.3,hold:Math.max(.1,e.len-.35),decay:.7,vibrato:{rate:5,depth:16,delay:.3}};s.tone({...o,type:"sawtooth",gain:n*.45,cutoff:Math.min(1e3,t*3),formant:[480,8,2]}),s.tone({...o,gain:n*.7})}},choir:{low:55,play(s,e){const t=Ne(e.midi),n=.05*e.gain*Math.min(1,Math.sqrt(520/t));for(const o of[-9,0,8])s.tone({bus:e.bus,type:"sawtooth",freq:t,detune:o,pan:o/20,when:e.when,gain:n*.4,attack:.8,hold:Math.max(.2,e.len-.6),decay:1.8,cutoff:Math.min(2600,t*4),formant:[950,7,1.4]})}},bell:{low:45,play(s,e){const t=Ne(e.midi),n=.1*e.gain,o={bus:e.bus,when:e.when,attack:.012};s.tone({...o,freq:t,decay:4.2,gain:n}),s.tone({...o,freq:t*2.76,decay:1.6,gain:n*.18}),s.tone({...o,freq:t/2,decay:5,gain:n*.3})}},metal:{low:47,play(s,e){const t=Ne(e.midi),n=.05*e.gain*Math.min(1,Math.sqrt(440/t)),o=Z(-.4,.4),a=(i,r,c=0)=>{t*i<4200&&s.tone({bus:e.bus,freq:t*i,detune:c,when:e.when,pan:o,gain:n*r,attack:1.2,hold:Math.max(.2,e.len-1),decay:3.2})};a(1,1),a(1,.6,7),a(2.76,.16),a(5.4,.04)}}};function Ht(s,e,t,n){e.sounding.push(t),s.tone({bus:"pad",freq:Ne(t),when:e.t0,attack:e.swell,hold:e.span-e.swell+.5,decay:e.tail,...n})}const Ka={strings(s,e){for(const t of e.chord.pad)for(const n of e.thin?[0]:[-7,7])Ht(s,e,e.root+t,{type:"sawtooth",detune:n,gain:.028})},high(s,e){e.chord.pad.forEach((t,n)=>{e.thin&&n===0||Ht(s,e,e.root+t+12,{type:"sawtooth",detune:4*n-4,gain:.032})})},drone(s,e){for(const t of e.thin?[0,7]:[0,7,12])for(const n of e.thin?[0]:[-5,5])Ht(s,e,e.bass+t,{type:"sawtooth",detune:n,gain:.026})},choir(s,e){for(const t of e.chord.pad)for(const n of e.thin?[0]:[-6,6])Ht(s,e,e.root+t,{type:"sawtooth",detune:n,gain:.023,formant:[560,7,1.4]})},organ(s,e){const t={...e,swell:Math.min(e.swell,.4),tail:Math.min(e.tail,1.6)};Ht(s,t,e.bass,{wave:s.waves.organ,gain:.025}),e.chord.pad.forEach((n,o)=>{e.thin&&o===0||Ht(s,t,e.root+n,{wave:s.waves.organ,gain:.017})})},glass(s,e){for(const t of e.chord.pad)for(const n of e.thin?[0]:[-4,4])Ht(s,e,e.root+t+12,{detune:n,gain:.021})},void(s,e){for(const t of[0,7])for(const n of e.thin?[0]:[-4,4])Ht(s,e,e.bass+t,{type:"triangle",detune:n,gain:.027});for(const t of e.chord.pad.slice(e.thin?2:1))Ht(s,e,$t(e.root+t,79),{detune:5,gain:.008})}},dd={still:null,bass:{voice:"piano",on:"chord",bars:[[[0,"bass",4,.85]]]},root:{voice:"piano",on:"phrase",bars:[[[0,"bass",4,.85]]]},star:{voice:"celesta",on:"phrase",bars:[[[5,"top+24",2,.7]]]},tread:{voice:"lowstring",on:"bar",bars:[[[0,"bass",3],[3,"bass",2,.8]]]},cradle:{voice:"lowstring",on:"bar",light:!0,bars:[[[0,"bass",3],[3,"bass+7",3,.85]]]},pedal:{voice:"lowstring",on:"bar",bars:[[[0,"bass",4]]]},surge:{voice:"lowstring",on:"bar",light:!0,bars:[[[0,"low",3,.8],[3,"mid",3,.9],[6,"top",3,1]],[[0,"top",3,1],[3,"mid",3,.9],[6,"low",3,.8]]]},orbit:{voice:"glass",on:"bar",bars:[[[0,"low+12",1,.6],[1,"mid+12",1,.6],[2,"top+12",1,.6]],[[0,"mid+24",1,.6],[1,"top+12",1,.6],[2,"mid+12",1,.6]]]}};function hd(s,e){return String(s??"").split("|").map(t=>{const n=[];let o=0;for(const a of t.trim().split(/\s+/)){const i=/^([b#]?)(\d+|-)(,*)(?::(\d*\.?\d+))?$/.exec(a);if(!i)continue;const r=i[4]?Number(i[4]):1;i[2]!=="-"&&o<e&&n.push({at:o,len:r,degree:Number(i[2])-1-7*i[3].length,sharp:i[1]==="#"?1:i[1]==="b"?-1:0}),o+=r}return n})}function co(s){return s?Array.isArray(s)?{voice:s[0],at:s[1]}:s:null}function nt(s){const e=tt(_s,s.mode,_s.major),t=e.includes(4)?So:Ua,n=s.meter>0?Math.round(s.meter):4,o=tt(cd,String(n),[0]),a=co(s.lead)||{voice:"piano",at:60},i=co(s.second),r=co(s.double),c=(s.theme||[]).map(([v,g,x])=>{const b=[],_=[];let z=0;return String(v).trim().split(/\s+/).forEach((C,k)=>{const P=C==="."&&k>0;b.push(P?b[k-1]:Object.hasOwn(yn,C)?C:"Isus"),_.push(P?0:1),P?_[z]++:z=k}),{chords:b,spans:_,bars:hd(g,n),who:x}}),d=c.length?c[0].chords[0]:"Isus",h=s.tense&&s.tense.length?s.tense:[d];let u=null;if(s.elder){const v=tt(_s,s.elder.mode,_s.minor);u={chords:s.elder.chords,notes:v,five:v.includes(4)?So:Ua}}const f=Math.min((n%3===0&&n>3?3:1)*s.beat/2,id),p=c.reduce((v,g)=>v+g.chords.length,0)/Math.max(1,c.length)*n*s.beat,m=s.rage?nt({...s,...s.rage,rage:null}):null;return{root:s.root,notes:e,five:t,meter:n,strong:o,beat:s.beat,lead:a,second:i,double:r,bed:s.bed,pad:s.pad??800,figure:s.figure,bassFloor:s.bassFloor??36,phrases:c,home:d,tense:h,elder:u,drum:s.drum,deep:s.deep,wash:s.wash,echo:s.echo,step:f,breath:p,fury:m,wind:s.wind??0,birds:s.birds??0,crickets:s.crickets??0}}const qt={town:{root:50,mode:"major",meter:4,beat:1.08,lead:["piano",62],second:["violin",62],bed:"strings",pad:800,figure:"bass",bassFloor:40,theme:[["I . IV .","5 10 9:2 | 8:2 5:2 | 6:4"],["I . Vsus .","5 10 9:2 | 8:2 10:2 | 9:4"],["vi . IV .","10:3 9 | 8:2 6:2 | 8:4",2],["I Vsus I .","5 10 9:2 | 8:2 9:2 | 8:4"]],tense:["vi","ii","Vsus"],wind:.5,birds:1.1,crickets:0},glasswood:{root:53,mode:"lydian",meter:6,beat:.32,lead:["celesta",77],bed:"glass",pad:1400,figure:"still",bassFloor:41,theme:[["I . . . II/I . . .","1:2 2 3:3 | 5:6 | 4:2 3 2:3"],["I . . . vi . . .","1:2 2 3:3 | 6:6 | 5:2 4 3:3"],["II/I . . . I . . .","2:2 3 4:3 | 6:6 | 4:2 3 2:3"],["vi . . . I . . .","6,:2 1 3:3 | 5:6 | 3:2 2 1:3"]],tense:["vi","iii","II"],elder:{mode:"minor",chords:["i","VI","iv","VII"]},wind:.6,birds:1.5,crickets:0},ember:{root:46,mode:"dorian",meter:3,beat:1.3,lead:["cello",58],bed:"drone",pad:620,figure:"bass",bassFloor:36,theme:[["i . IV . . .","1 5:2 | 4 3:2 | 2:3"],["i . VII . . .","1 5:2 | 6 5:2 | 4:3"],["IV . i . . .","6, 4:2 | 2 1:2 | 5,:3"],["v . i . . .","5, 2:2 | 7, 5,:2 | 1:3"]],tense:["i","v","VII"],elder:{mode:"minor",chords:["i","vii","iv","VI"]},wind:1,birds:.2,crickets:.6},hush:{root:51,mode:"minor",meter:5,beat:1.42,lead:["glass",75],bed:"choir",pad:680,figure:"root",bassFloor:39,theme:[["i . VI .","5:3 3:2 | 4:3 2:2 | 1:5"],["iv . i .","6:3 4:2 | 5:3 3:2 | 2:5"],["VI . VII .","3:3 1:2 | 2:3 7,:2 | 2:5"],["Isus . i .","5,:3 2:2 | 1:3 7,:2 | 1:5"]],tense:["i","iv","VI"],elder:{mode:"minor",chords:["i","iv","vii","VI"]},wind:.35,birds:0,crickets:1.2},rime:{root:52,mode:"major",meter:3,beat:1.05,lead:["flute",76],bed:"high",pad:980,figure:"still",bassFloor:40,theme:[["I . . . vi . . .","5,:2 1 | 3:3 | 2:2 7, | 5,:3"],["IV . . . I . . .","6,:2 1 | 4:3 | 3:2 1 | 2:3"],["vi . . . Vsus . . .","8:2 7 | 5:3 | 6:2 5 | 3:3"],["Isus . . . I . . .","5,:2 1 | 2:3 | 5:2 3 | 1:3"]],tense:["vi","iii","ii"],elder:{mode:"minor",chords:["i","III","VI","v"]},wind:1.15,birds:.2,crickets:0},vault:{root:48,mode:"minor",meter:4,beat:1.5,lead:["organ",72],bed:"organ",pad:700,figure:"still",bassFloor:36,theme:[["i iv VII III VI iv v i","1:2 3:2 | 4:2 3:2 | 2:2 4:2 | 3:4 | - | - | 2:4 | 1:4"],["i VI III VII iv i v i","5:2 3:2 | 6:2 5:2 | 5:2 3:2 | 4:4 | - | - | 2:4 | 1:4"]],tense:["i","iv","vii"],elder:{mode:"phrygian",chords:["i","vii","iv","VI"]},wind:.25,birds:0,crickets:0},shatter:{root:47,mode:"lydian",meter:7,beat:1.5,lead:["metal",59],bed:"void",pad:1500,figure:"star",bassFloor:35,theme:[["Isus .","1:4 5:3 | 9:7"],["II/I .","11:4 9:3 | 6:7"],["VI .","8:4 5:3 | 2:7"],["I .","5,:4 3:3 | 8:7"]],tense:["Isus","VI","III"],elder:{mode:"minor",chords:["i","VI","iv","VII"]},wind:.12,birds:0,crickets:0},bloomfall:{root:55,mode:"major",meter:3,beat:1,lead:["piano",66],second:["violin",64],bed:"strings",pad:900,figure:"still",bassFloor:41,theme:[["I . . . IV . . .","3:2 5 | 8:3 | 6:2 5 | 3:3"],["vi . . . Vsus . . .","3:2 5 | 6:3 | 5:2 3 | 2:3"],["IV . . . I . . .","4:2 6 | 8:3 | 7:2 5 | 6:3"],["ii . . . I . . .","2:2 4 | 6:3 | 5:2 2 | 1:3"]],tense:["vi","ii","IV"],elder:{mode:"minor",chords:["i","VI","III","VII"]},wind:.5,birds:1.4,crickets:0},saltglass:{root:50,mode:"dorian",meter:4,beat:1.2,lead:["piano",62],bed:"glass",pad:1200,figure:"still",bassFloor:38,theme:[["i . IV .","1 5 4:2 | 3:2 1:2 | 2:4"],["i . VII .","1 5 6:2 | 5:2 4:2 | 5:4"],["IV . i .","6 4 3:2 | 2:2 1:2 | 5,:4"],["v . i .","5, 2 4:2 | 3:2 2:2 | 1:4"]],tense:["i","v","VII"],elder:{mode:"minor",chords:["i","iv","VI","v"]},wind:1,birds:.15,crickets:0},amberwood:{root:52,mode:"major",meter:3,beat:1.15,lead:["violin",62],second:["piano",62],bed:"strings",pad:760,figure:"bass",bassFloor:38,theme:[["I . vi . . .","5 3:2 | 2 1:2 | 2:3"],["IV . I . . .","6 5:2 | 4 3:2 | 5:3"],["vi . IV . . .","3 6:2 | 5 4:2 | 3:3"],["ii . Vsus . . .","4 2:2 | 7, 2:2 | 1:3"]],tense:["vi","ii","iii"],elder:{mode:"minor",chords:["i","iv","VII","III"]},wind:.7,birds:.8,crickets:.4}},On={warden:{root:37,mode:"phrygian",meter:5,beat:1.1,lead:["horn",49],bed:"drone",pad:520,figure:"tread",bassFloor:30,drum:[.06,0,0,.035,0],deep:!0,theme:[["i . bII i . .","1:3 5,:2 | 1:3 3:2 | 4:3 2:2 | 1:5"],["i . vii i . .","5:3 3:2 | 4:3 1:2 | 7,:3 2:2 | 1:5"]],rage:{beat:.95,drum:[.065,0,0,.04,.03],double:["cello",61]}},matron:{root:45,mode:"harmonic",meter:6,beat:.48,lead:["hum",57],second:["musicbox",69],bed:"strings",pad:560,figure:"cradle",bassFloor:40,theme:[["i . iv i . .","5:2 3 5:3 | 8:4 7:2 | 6:2 4 6:3 | 5:6"],["i . V i . .","5:2 3 5:3 | 8:4 9:2 | 9:2 7 9:3 | 8:6",2]],rage:{beat:.41,drum:[.045,0,0,0,0,0],double:["musicbox",69]}},sentinel:{root:48,mode:"dorian",meter:9,beat:.4,lead:["strings",60],bed:"strings",pad:700,figure:"surge",bassFloor:36,drum:[.05,0,0,0,0,0,0,0,0],deep:!0,wash:.035,theme:[["i . VII . . .","1:3 3:3 5:3 | 8:9 | 7:6 6:3 | 4:9"],["i . IV i . .","1:3 3:3 5:3 | 8:6 10:3 | 8:6 6:3 | 5:9"]],rage:{beat:.34,drum:[.06,0,0,0,0,0,.035,0,0],double:["horn",48]}},keeper:{root:38,mode:"minor",meter:4,beat:1.4,lead:["bell",62],echo:[.45,.3],bed:"choir",pad:620,figure:"pedal",bassFloor:31,drum:[.06,0,.035,0],deep:!0,theme:[["i . VI VII","1:4 | 3:2 2:2 | 3:4 | 5:4"],["iv . i .","5:2 4:2 | 3:4 | 2:2 1:2"]],rage:{beat:1.15,drum:[.065,0,.035,.03],double:["organ",62]}},drifter:{root:54,mode:"lydian",meter:3,beat:1.35,lead:["choir",66],bed:"void",pad:1500,figure:"orbit",bassFloor:35,theme:[["I . II/I .","5,:3 | 5:3 | 4:3 | 3:3"],["vi . VI I","3:3 | 6:3 | 5:6"],["I . II/I .","8:3 | 5:3 | 6:3 | 9:3"],["vi . VI I","8:3 | 10:3 | 8:6"]],rage:{beat:1.12,drum:[.05,0,.025],deep:!0,double:["horn",54]}}},Jt={town:nt(qt.town),glasswood:nt(qt.glasswood),ember:nt(qt.ember),hush:nt(qt.hush),rime:nt(qt.rime),vault:nt(qt.vault),shatter:nt(qt.shatter),bloomfall:nt(qt.bloomfall),saltglass:nt(qt.saltglass),amberwood:nt(qt.amberwood)},Ga={warden:nt(On.warden),matron:nt(On.matron),sentinel:nt(On.sentinel),keeper:nt(On.keeper),drifter:nt(On.drifter)},er=s=>tt(Jt,s.biome&&s.biome.id,Jt.town),Ya={calm:{pace:1,written:!0},tense:{pace:.92,bars:1,drop:4,space:1.15,left:.15,drum:[.05,0]},elder:{pace:1.06,bars:2,drop:7,space:1.3,left:.16,octave:!0,drum:[.055,.03],deep:!0,drone:!0,toll:.05},rage:{pace:.86,bars:1,drop:7,space:1.3,left:.16,octave:!0,drum:[.055,.03],deep:!0,drone:!0,toll:.05}};function fd(s,e,t){const n=s.ctx;function o(u,f,p){const m=n.createBufferSource(),v=n.createBiquadFilter(),g=n.createBiquadFilter(),x=n.createGain();return m.buffer=s.noiseBuffer,m.loop=!0,m.playbackRate.value=u,v.type="highpass",v.frequency.value=f,g.frequency.value=p,x.gain.value=0,m.connect(v).connect(g).connect(x).connect(s.buses.amb.node),m.start(),{level:x.gain,tone:g.frequency}}const a=o(.8,90,450);let i=0,r=Z(2,5),c=Z(1,4);function d(){const u=Z(1900,3e3),f={bus:"air",pan:Z(-.8,.8),gain:Z(.018,.032),attack:.012},p=Ms(0,2);if(p===0)for(let m=0,v=Ms(2,3);m<v;m++)s.tone({...f,freq:u,to:u*1.3,glide:.07,at:m*.17,decay:.12});else if(p===1)for(let m=0,v=Ms(3,6);m<v;m++)s.tone({...f,freq:u*(1.2-m*.035),to:u*(1.05-m*.035),glide:.04,at:m*.08,decay:.07});else s.tone({...f,freq:u*.85,hold:.14,decay:.2}),s.tone({...f,freq:u*.67,at:.34,hold:.2,decay:.3})}function h(){const u={bus:"air",pan:Z(-.9,.9),gain:Z(.012,.02),freq:Z(3300,3800),attack:.008,decay:.045};for(let f=0,p=Ms(2,4);f<p;f++)for(let m=0;m<3;m++)s.tone({...u,at:f*.36+m*.05})}return{update(u,f){const p=er(e);if(i-=f,i<=0){i=.3;const m=.5+.3*Math.sin(u*.13)+.2*Math.sin(u*.31+1.7);a.level.setTargetAtTime(p.wind*(.32+.5*m),u,.9),a.tone.setTargetAtTime(330+330*m,u,.9)}r-=f*p.birds*(1-t.unrest()),r<=0&&(d(),r=Z(5,14)),c-=f*p.crickets,c<=0&&(h(),c=Z(4,11))}}}const ud=.5,Wa=["lead","comp","call","fight","pad"],pd=["all","lead","comp","fight","pad"],md={low:0,mid:1,top:2};function vd(s,e){const t=s.ctx,n=s.buses.music,o={at:-1/0,bar:0,beat:0,len:1,area:null,theme:null,piece:Jt.town,elder:!1,fury:!1,stance:"calm",heat:0,thin:0,low:!1,held:!1,blocks:!0,chordName:"",chord:yn.I,chordIn:0,fit:()=>!1,clear:()=>!0,phrase:0,pbar:0,skip:!1,wait:0,rest:1,wide:1,mid:-1,fought:!1,busy:0,felled:-1/0,mix:{all:-1}};let a=null;const i=[],r=()=>({lead:o.held?0:1,comp:o.held?0:1,fight:o.held?0:o.elder?1:ue((o.heat-.15)/.6,0,1),pad:o.held?od:1});function c(I,H=1){const B=t.createGain();B.gain.value=H,B.connect(I==="pad"?s.padFilter:n.node);const T={node:B,pool:n.pool,live:new Map};return s.buses[I]=T,a&&(a[I]=T),T}function d(I,H,B){const T=H+B*8;if(I.node.gain.setTargetAtTime(0,H,B),I.live){for(const[N,$]of I.live)if(!($.t0>=H||$.end<=T))try{N.stop(T)}catch{}}i.push({node:I.node,until:T+.5})}function h(I){if(a)for(const T of Wa)d(a[T],I,nd);const H=r(),B={};a=B;for(const T of Wa)B[T]=c(T,T==="call"?1:H[T]);Object.assign(o.mix,H)}function u(I){a&&(d(a.pad,I,ad),c("pad",o.mix.pad??1))}function f(I){if(!a)return;const H=e.player,T={...r(),all:jt.music*(e.paused?.7:H&&H.dead?.5:1)};for(const N of pd){const $=o.mix[N];if($!==void 0&&Math.abs(T[N]-$)<.02)continue;o.mix[N]=T[N],(N==="all"?n:a[N]).node.gain.setTargetAtTime(T[N],I,rd[N])}}const p=()=>o.elder&&!o.theme,m=()=>p()&&o.area&&o.area.elder||o.piece,v=()=>{const I=o.area||Jt.town;return p()&&I.elder?I.elder.chords:I.tense},g=()=>o.theme?o.fury&&o.theme.fury||o.theme:o.area||Jt.town,x=()=>o.theme?"calm":o.elder?o.fury?"rage":"elder":o.heat>(o.stance==="tense"?.25:.5)?"tense":"calm",b=()=>Ya[o.elder?o.fury?"rage":"elder":"tense"],_=I=>Math.max(1,Math.round(I/(o.piece.meter*o.len)));function z(I){const H=er(e),B=(e.monsters||[]).find(W=>W&&W.boss&&!W.dead),T=!!B,N=B?tt(Ga,B.defId,null)||tt(Ga,B.def.archetype,null):null;if(H===o.area&&T===o.elder&&N===o.theme)return;const $=H!==o.area,K=o.elder&&!T;o.area=H,o.elder=T,o.theme=N,o.piece=N||H,o.stance="calm",o.heat=0,s.root=o.piece.root,s.scale=m().five,h(I),o.at=I+(K?sd:$?.6:.3),o.bar=0,o.beat=0,o.chordName="",o.chordIn=0,o.phrase=0,o.pbar=0,o.wait=0,o.rest=1,o.skip=!1}function C(I,H){z(I);let B=0,T=!1;for(const J of e.monsters||[]){if(!J||J.dead)continue;J.boss&&J.enraged&&(T=!0);const ce=J.ai&&J.ai.state;(ce==="chase"||ce==="attack"||ce==="special")&&B++}o.fury=T;const N=e.player,$=!N||N.dead,K=$||!B?0:Math.min(1,.6+.2*B);o.heat+=(K-o.heat)*(1-Math.exp(-H/(K>o.heat?ed:td))),o.low=!$&&N.maxHp>0&&N.hp<N.maxHp*(o.low?.38:.3),o.thin+=((o.low?1:0)-o.thin)*(1-Math.exp(-H/1.5));const W=!!(e.cinema&&e.cinema.active)&&o.blocks;o.held&&!W&&(I-o.felled<15?(o.pbar=0,o.wait=_(8)):(u(I+.4),o.at=I+.4,o.beat=0,o.bar=0,o.chordName="",o.chordIn=0,o.phrase=0,o.pbar=0,o.wait=0,o.rest=0)),o.held=W}function k(I,H=I.pad.map(B=>s.root+B)){const B=s.root,T=m().notes,N=new Set(H),$=new Set([I.bass,...I.pad,...H.map(W=>W-B)].map(lo)),K=W=>!$.has(lo(W-B-1))&&!N.has(W+1);return{clear:K,fit:W=>T.includes(lo(W-B))&&K(W)}}const P=(I,H)=>[0,1,-1,2,-2,3,-3].map(B=>I+B).find(H)??I;function w(I,H,B=0){const T=m().notes,N=Math.floor(H/7);return I+12*N+T[H-7*N]+B}function y(I,H,B){const T=o.piece,N=tt(yn,I,yn.Isus),$=B*T.meter*o.len;o.chordIn>0&&u(H);const K={root:s.root,chord:N,bass:$t(s.root+N.bass,T.bassFloor),t0:H,span:$,sounding:[],swell:Math.min(3,$*.4),tail:Math.min(5,$*.58),thin:o.thin>.5};tt(Ka,T.bed,Ka.strings)(s,K);const W=k(N,K.sounding);o.chordName=I,o.chord=N,o.chordIn=B,o.clear=W.clear,o.fit=W.fit,s.padFilter.frequency.setTargetAtTime((T.pad||800)*(p()?.75:1),H,2)}function M(I,H,B,T,N,$){tt(Bt,I,Bt.piano).play(s,{bus:"lead",midi:H,when:B,len:T,gain:N*Z(.92,1.08),...$})}function R(I,H,B){const T=o.piece,N=H.who===2&&T.second||T.lead,$=T.double,K=tt(Bt,N.voice,Bt.piano).also??0,W=$?$.at-N.at:0;for(const J of H.bars[B]||[]){let ce=w(N.at,J.degree,J.sharp);o.clear(ce)&&o.clear(ce+K)||(ce=P(ce,Oe=>o.fit(Oe)&&o.clear(Oe+K)));const re=I+J.at*o.len,ve=J.len*o.len,ee=T.strong.includes(J.at)?1:.88;M(N.voice,ce,re,ve,ee),T.echo&&M(N.voice,ce,re+T.echo[0],ve,ee*T.echo[1]),$&&$.voice!==N.voice&&o.thin<.5&&o.clear(ce+W)&&M($.voice,ce+W,re+.012,ve,ee*.6)}}function E(I,H){const B=o.piece,T=B.phrases;if(!T.length)return;const N=T[o.phrase%T.length],$=B.lead,K=H.drop;o.phrase=(o.phrase+1)%T.length;const W=(N.bars[0]||[]).slice(0,3),J=W.map(re=>w($.at,re.degree-K,re.sharp));if(!J.length)return;const ce=12*Math.max(0,Math.ceil((tt(Bt,$.voice,Bt.piano).low-Math.min(...J))/12));W.forEach((re,ve)=>M($.voice,P(J[ve]+ce,o.fit),I+re.at*o.len,re.len*o.len,.9,{light:!0}))}function U(I){const[H,B="0"]=String(I).split("+"),T=o.chord;return(H==="bass"?$t(s.root+T.bass,o.piece.bassFloor):s.root+T.pad[md[H]??0])+Number(B)}function Q(I,H,B){const T=o.piece.figure?Array.isArray(o.piece.figure)?o.piece.figure:[o.piece.figure]:[];for(const N of T){const $=tt(dd,N,null);if(!$||$.on==="chord"&&!H||$.on==="phrase"&&!B)continue;const K=tt(Bt,$.voice,Bt.piano);$.bars[$.on==="bar"?o.bar%$.bars.length:0].forEach(([W,J,ce=1,re=1],ve)=>{W<o.piece.meter&&K.play(s,{bus:"comp",midi:U(J),when:I+W*o.len+.004*ve,len:ce*o.len,gain:re,light:$.light})})}}function L(I,H){const B=$t(s.root+o.chord.bass,o.piece.bassFloor),T=I+Z(0,.03);s.piano(Ne(B),{bus:"comp",when:T,gain:H.left,ring:.6}),H.octave&&o.thin<.5&&s.piano(Ne(B+12),{bus:"comp",strings:1,ring:.6,when:T+.03,gain:H.left*.5})}function F(I,H,B){const T=B?60:76;s.tone({bus:"fight",freq:T,to:T*.6,glide:.2,when:I,attack:.008,decay:B?.75:.45,gain:H}),s.tone({bus:"fight",type:"triangle",cutoff:260,freq:T*1.9,to:T*1.1,glide:.1,when:I,attack:.006,decay:.18,gain:H*.35})}function O(I,H,B,T){Bt.lowstring.play(s,{bus:"fight",midi:I,when:H,len:B,gain:T/.04})}function S(I,H){const B=Ne($t(s.root,55));s.tone({bus:"fight",freq:B,when:I,attack:.012,decay:5.5,gain:H}),s.tone({bus:"fight",freq:B*2.76,when:I,attack:.012,decay:2.2,gain:H*.18})}function D(I,H,B){s.noise({bus:"fight",filter:"lowpass",freq:240,to:700,glide:H*.45,when:I,attack:H*.45,hold:.2,decay:H*.5,gain:B})}function G(I){const H=!o.held&&(o.elder||o.heat>(o.fought?.2:.3)),B=H&&!o.fought,T=o.thin>.5,N=o.piece;if(o.fought=H,!H)return;if(o.theme){const ee=N.drum&&N.drum[o.beat];ee&&F(I,ee*(T?.8:1),N.deep),!T&&N.wash&&o.beat===0&&o.bar%2===0&&D(I,2*N.meter*o.len,N.wash);return}const $=b(),K=o.wide*N.meter,W=o.bar%o.wide*N.meter+o.beat,J=B?0:W,ce=J===0?$.drum[0]:J===o.mid?$.drum[1]:0;if(ce&&F(I,ce*(T?.8:1),$.deep),T)return;const re=$t(s.root+o.chord.bass,Qc),ve=Math.min(1.4,K*o.len/2);$.drone?J===0&&O(re,I,(K-W)*o.len,.04):J===0?O(re,I,ve,.034):J===o.mid&&O(re+7,I,ve,.034),$.toll&&J===0&&(B||Math.floor(o.bar/o.wide)%2===0)&&S(I,$.toll)}function Y(I){if(o.held||!o.area)return;const H=ld[I],B=o.piece,T=B.step,N=Math.max(t.currentTime+.12,o.busy);o.heat=Math.min(o.heat,.2);const $=p()&&o.area.elder?o.area.elder.chords[0]:B.home,K=tt(yn,$,yn.Isus);o.chordName===$&&o.stance==="calm"||(u(N),o.stance="calm",o.at=N,o.beat=0,o.bar=0,o.chordName="",o.chordIn=0);const W=k(K).fit,J=$t(s.root,H.floor),ce=H.steps.length-1;if(H.steps.forEach((re,ve)=>{const ee=Math.floor(re/5),Oe=P(J+12*ee+s.scale[re-5*ee],W);s.piano(Ne(Oe),{bus:"call",when:N+ve*T,gain:H.gain*(ve===ce?1.1:1)})}),H.roll){const re=N+(ce+1)*T;s.piano(Ne($t(s.root+K.bass,B.bassFloor)),{bus:"call",when:re,gain:H.gain}),K.pad.forEach((ve,ee)=>s.piano(Ne(s.root+ve+12),{bus:"call",strings:1,when:re+.05+ee*.07,gain:H.gain*.6}))}o.pbar=0,o.wait=Math.max(o.wait,_(8)),o.rest=Math.max(o.rest,2),o.busy=N+(ce+3)*T}function j(I){const H=o.piece,B=H.phrases;if(o.held||o.wait>0||!B.length){(o.chordIn<=0||o.chordName!==H.home)&&y(H.home,I,_(9)),o.wait>0&&!o.held&&o.wait--,o.pbar=0;return}const T=B[o.phrase%B.length],N=o.pbar===0,$=o.thin>.5;N&&(o.skip=(o.phrase>0||$)&&Z()>Jc*($?.5:1));const K=T.spans[o.pbar]>0;K?y(T.chords[o.pbar],I,T.spans[o.pbar]):o.chordIn<=0&&y(T.chords[o.pbar]||H.home,I,1),$||Q(I,K,N),o.skip||R(I,T,o.pbar),++o.pbar>=T.chords.length&&(o.pbar=0,o.phrase=(o.phrase+1)%B.length)}function ne(I,H){const B=o.thin>.5;if(!(o.bar%o.wide)){if(o.chordIn<=0){const T=v(),N=T[0],$=o.chordName,K=T.filter(J=>J!==$),W=!$||!T.includes($)||$!==N&&Z()<.4?N:K.length?Yo(K):N;y(W,I,H.bars*o.wide)}if(!o.held){if(L(I,H),o.rest>0){o.rest--;return}E(I,H),o.rest=Math.max(1,Math.round(H.space*(B?2:1)*ue(o.piece.breath,10,24)/(o.wide*o.piece.meter*o.len))-1)}}}function V(I){const H=x(),B=g();(H!==o.stance||B!==o.piece)&&(o.chordIn>0&&u(I),o.stance=H,o.phrase=B===o.piece?o.phrase:0,o.piece=B,o.chordIn=0,o.chordName="",o.pbar=0,o.bar=0,o.rest=1);const T=Ya[H],N=B.meter;o.len=B.beat*T.pace,o.wide=T.written?1:Math.max(1,Math.round(4/(N*o.len)));const $=[],K=o.wide*N/2;for(let W=0;W<o.wide;W++)for(const J of B.strong)W*N+J>0&&$.push(W*N+J);o.mid=$.length?$.reduce((W,J)=>Math.abs(J-K)<Math.abs(W-K)?J:W):-1,T.written?j(I):ne(I,T),o.chordIn--}function ge(){const I=o.at;o.beat===0&&V(I),G(I),o.at=I+o.len,++o.beat>=o.piece.meter&&(o.beat=0,o.bar++)}return z(t.currentTime),{update(I,H){for(C(I,H),o.at<I-1&&(u(I+.4),o.at=I+.4,o.beat=0,o.bar=0,o.chordIn=0,o.pbar=0);o.at<I+ud;)ge();f(I);for(let B=i.length-1;B>=0;B--)i[B].until<I&&i.splice(B,1)[0].node.disconnect()},unrest:()=>o.elder?1:o.heat,hears:{zone(){z(t.currentTime)},"boss:arrive"(){z(t.currentTime)},"boss:fell"(){o.felled=t.currentTime,z(t.currentTime)},"cine:begin"({blocking:I}){o.blocks=I!==!1},levelup(){o.busy=Math.max(o.busy,t.currentTime+1.8)},"boss:down"(){o.busy=Math.max(o.busy,t.currentTime+2.8)},"room:clear"({kind:I}){I!=="boss"&&Y("clear")},"mission:done"(){t.currentTime-o.felled>20&&Y("done")},"mission:report"({won:I}){I&&Y("home")}}}}const gd=["step-grass-1","step-grass-2","step-grass-3","step-grass-4","step-stone-1","step-stone-2","step-stone-3","step-stone-4","step-snow-1","step-snow-2","step-snow-3","land","jump-1","jump-2","swing-1","swing-2","swing-3","swing-heavy","swing-4","saber-hum","saber-ignite","saber-hit-1","saber-hit-2","saber-hit-3","rifle-1","rifle-2","rifle-3","rifle-heavy","rod-1","rod-2","hit-1","hit-2","hit-3","hit-4","crit-1","crit-2","hurt-1","hurt-2","shot-hit-1","shot-hit-2","burst","burst-2","slam","slam-2","volley","bolt","nova","mend","dash","die-1","die-2","die-3","claw-1","claw-2","zap","spores","guard","elder-step-1","elder-step-2","elder-roar","elder-fall","rumble","shuttle-pass","shuttle-land","teleport","gate","lumen-zap","lumen-burst","drink","coins-1","coins-2","pickup","equip","hone","salvage","click","deny"],bd={grass:["step-grass-1","step-grass-2","step-grass-3","step-grass-4"],stone:["step-stone-1","step-stone-2","step-stone-3","step-stone-4"],snow:["step-snow-1","step-snow-2","step-snow-3"]},Qe=(...s)=>s[Math.floor(Math.random()*s.length)],yd=s=>{const e=s.biome&&s.biome.id;return e==="rime"?"snow":e==="town"||e==="vault"||e==="shatter"||e==="saltglass"?"stone":"grass"},Va=s=>!!s&&s.kind==="monster",Xa=s=>!!s&&s.kind==="player",xd={cleave:{name:"swing-heavy",gain:.5,rate:.88},volley:{name:"volley",gain:.22},bolt:{name:"bolt",gain:.42},nova:{name:"nova",gain:.5},mend:{name:"mend",gain:.36},step:{name:"dash",gain:.42}},ja={step({entity:s},e){if(s&&s.kind!=="player")return null;const t=yd(e);return{name:Yo(bd[t]),gain:t==="stone"?.24:.3,rate:Z(.92,1.08)}},swing:({heavy:s})=>({name:s?"swing-heavy":Qe("swing-1","swing-2","swing-3","swing-4"),gain:s?.46:.38,rate:Z(.94,1.08)}),shoot:({family:s,heavy:e})=>s==="rifle"?{name:e?"rifle-heavy":Qe("rifle-1","rifle-2","rifle-3"),gain:e?.36:.3,rate:Z(.95,1.06)}:{name:Qe("rod-1","rod-2"),gain:e?.4:.32,rate:Z(.94,1.08)},damage({target:s,crit:e,soft:t,source:n,indirect:o}){if(t)return[];if(Xa(s))return{name:Qe("hurt-1","hurt-2"),gain:.4,rate:Z(.9,1.05)};if(Va(s)&&s.guard)return{name:"guard",gain:.26,rate:Z(1.15,1.3),where:s};const a=!!(e||s&&s.hp<=0),i=Va(s)&&s.def&&s.def.giant,r={name:a?Qe("crit-1","crit-2"):Qe("hit-1","hit-2","hit-3","hit-4"),gain:a?.36:.28,rate:Z(.92,1.08)*(i?.8:1),where:s};return Xa(n)&&n.family==="blade"&&!o?[r,{name:Qe("saber-hit-1","saber-hit-2","saber-hit-3"),gain:a?.3:.24,rate:Z(.94,1.08),where:s}]:r},"monster:died":s=>s.def&&s.def.fall?null:{name:Qe("die-1","die-2","die-3"),gain:.24,rate:Z(.9,1.15)*(s.elite?.8:1),at:.03,where:s},"monster:strike":s=>s.def&&s.def.giant?null:{name:Qe("claw-1","claw-2"),gain:.22,rate:Z(.9,1.12),where:s},slam:s=>({name:s.heavy?"slam":"slam-2",gain:s.heavy?.42:.3,rate:Z(.94,1.04),where:s}),"monster:shot":s=>({name:"zap",gain:.16,rate:Z(.9,1.1),where:s}),"shot:hit":s=>({name:Qe("shot-hit-1","shot-hit-2"),gain:.2,rate:Z(.9,1.1),where:s}),"bolt:hit":s=>({name:Qe("burst","burst-2"),gain:.28,rate:Z(.95,1.08),where:s}),"hazard:cloud":s=>({name:"spores",gain:.2,rate:Z(.9,1.05),where:s}),guard:s=>({name:"guard",gain:.24,where:s.entity}),"charge:dust":s=>({name:Qe("step-stone-1","step-stone-2"),gain:.3,rate:.6,where:s}),"boss:step":s=>({name:Qe("elder-step-1","elder-step-2"),gain:.5,rate:Z(.92,1.05),where:s.entity||s}),"boss:rise":()=>({name:"rumble",gain:.45}),"cine:rumble":({power:s=.5})=>({name:"rumble",gain:.2+.3*s,rate:Z(.9,1.05)}),"boss:roar":({entity:s})=>({name:"elder-roar",gain:.55,where:s}),"boss:down":()=>({name:"elder-fall",gain:.6}),"gate:shut":s=>({name:"gate",gain:.28,where:s}),"craft:pass":()=>({name:"shuttle-pass",gain:.5}),"craft:land":()=>({name:"shuttle-land",gain:.5}),"arrive:beam":()=>({name:"teleport",gain:.34,keep:!0}),"run:deeper":()=>({name:"shuttle-pass",gain:.36,rate:.8,keep:!0}),"player:respawn":()=>({name:"teleport",gain:.32,keep:!0}),"player:died":()=>({name:"hurt-2",gain:.5,rate:.7,keep:!0}),equip:()=>({name:"equip",gain:.34}),"lumen:bolt":()=>({name:"lumen-zap",gain:.22,rate:Z(.95,1.1)}),"lumen:burst":()=>({name:"lumen-burst",gain:.42}),drink:()=>({name:"drink",gain:.4}),skill:({id:s})=>{const e=xd[s];return e?{...e,rate:(e.rate||1)*Z(.96,1.04)}:null},"relic:ring":s=>s.heavy?{name:"slam-2",gain:.28,where:s}:{name:"burst-2",gain:.16,rate:1.2,where:s},pickup:s=>s.rare?null:s.item==="glint"?{name:Qe("coins-1","coins-2"),gain:.18,rate:Z(.95,1.1)}:{name:"pickup",gain:.24,rate:Z(.95,1.1)},trade:()=>({name:Qe("coins-1","coins-2"),gain:.3}),salvage:()=>({name:"salvage",gain:.28}),hone:()=>({name:"hone",gain:.38,keep:!0}),"ui:click":()=>({name:"click",gain:.32}),deny:()=>({name:"deny",gain:.3}),jump:({entity:s})=>s&&s.kind!=="player"?null:{name:Qe("jump-1","jump-2"),gain:.28,rate:Z(1,1.2)},landed:s=>({name:"land",gain:.4,rate:.82,where:s}),"mission:begin":(s,e)=>e.player&&e.player.family==="blade"?{name:"saber-ignite",gain:.4,at:.5}:[]},wd={sproutling:{freq:820,type:"triangle",bend:1.3},puffcap:{freq:470,type:"sine",bend:.72},bristlehog:{freq:250,type:"sawtooth",bend:1.22},wisp:{freq:1180,type:"sine",bend:1.45},cragling:{freq:165,type:"square",bend:.8},shellsnap:{freq:610,type:"triangle",bend:1.12},hound:{freq:340,type:"sawtooth",bend:1.35},watcher:{freq:980,type:"square",bend:1},delver:{freq:120,type:"sawtooth",bend:.7},strider:{freq:210,type:"square",bend:1.5},mite:{freq:1400,type:"triangle",bend:1.6},warden:{freq:190,type:"square",bend:.8},matron:{freq:330,type:"sine",bend:.72},sentinel:{freq:420,type:"triangle",bend:1.1},keeper:{freq:150,type:"triangle",bend:.75},drifter:{freq:520,type:"sine",bend:1.3},thornmother:{freq:360,type:"sine",bend:.78},saltcolossus:{freq:175,type:"square",bend:.82},ambersentinel:{freq:400,type:"triangle",bend:1.05}},kd={freq:600,type:"triangle",bend:1.2},on=s=>tt(wd,s.defId,kd),Za=s=>!!s&&s.kind==="monster",zd={mark:[0,4,7],beacon:[0,7,12],crystal:[4,7,11],cargo:[0,2,7]};function Ge(s,e=t=>t){return(t,n)=>{const o=t.nearness(e(n));o<=.02||(t.level=o,s(t,n))}}const Ja={bolt(s){s.noise({freq:420,to:1700,glide:.22,q:.9,attack:.05,hold:.05,decay:.4,gain:.13}),s.tone({type:"triangle",freq:210,to:95,attack:.02,decay:.4,gain:.08})},mend(s){for(const e of[0,3,5])s.tone({bus:"chime",freq:s.key(e,62),attack:.3,hold:.15,decay:1.4,gain:.045});s.bell(s.key(7,62),{bus:"chime",at:.3,decay:1.2,gain:.04})},step(s){s.noise({freq:2100,to:650,glide:.2,q:.7,attack:.03,decay:.3,gain:.1})}},Qa={step(s,{entity:e}){if(e&&e.kind!=="player")return;const t=Z(.88,1.14);s.noise({filter:"lowpass",freq:620*t,to:260*t,decay:.13,gain:.045}),s.tone({freq:92*t,to:58*t,decay:.12,gain:.05})},swing(s,{heavy:e}){const t=Z(.92,1.1);e?(s.noise({freq:320*t,to:1500*t,glide:.2,q:1.2,attack:.09,hold:.04,decay:.36,gain:.14}),s.tone({freq:130*t,to:70,attack:.05,decay:.4,gain:.08})):s.noise({freq:600*t,to:2300*t,glide:.12,q:1.4,attack:.05,decay:.2,gain:.1})},damage:Ge((s,{target:e,crit:t,soft:n})=>{if(n)return;const o=Z(.92,1.1);if(e&&e.kind==="player"){s.tone({freq:125*o,to:52,decay:.32,gain:.24}),s.noise({filter:"lowpass",freq:380,to:160,decay:.2,gain:.12});return}if(Za(e)&&e.guard){s.tone({type:"triangle",freq:1180*o,to:900*o,glide:.04,attack:.002,decay:.1,gain:.08}),s.noise({freq:3e3,q:2,attack:.002,decay:.05,gain:.06});return}if(s.noise({freq:(t?1700:1150)*o,q:1.1,attack:.003,decay:.12,gain:t?.17:.14}),s.tone({type:"triangle",freq:230*o,to:120*o,attack:.003,decay:.16,gain:.15}),t&&s.bell(s.key(3,74),{decay:.5,gain:.05}),e&&e.hp<=0){const a=Za(e)&&e.elite;s.tone({freq:104*o,to:46,attack:.004,decay:a?.55:.3,gain:a?.2:.13})}},s=>s.target),"monster:special":Ge((s,e)=>{const t=on(e),n=t.freq*(e.elite?.82:1);s.tone({type:t.type,cutoff:Math.min(2400,n*3.5),freq:n*.62,to:n*1.25,glide:.32,attack:.06,hold:.16,decay:.22,gain:.085}),s.noise({freq:500,to:1900,glide:.34,q:1.6,attack:.2,hold:.06,decay:.16,gain:.05})}),slam:Ge((s,{heavy:e})=>{const t=Z(.92,1.08);s.tone({freq:(e?88:112)*t,to:40,decay:e?.5:.32,gain:e?.26:.17}),s.noise({filter:"lowpass",freq:e?700:900,to:140,attack:.004,decay:e?.45:.28,gain:e?.16:.11})}),"monster:shot":Ge((s,e)=>{const t=on(e).freq*Z(.95,1.06);s.tone({type:"triangle",freq:t*1.1,to:t*.55,glide:.14,attack:.004,decay:.2,gain:.07}),s.noise({freq:2400,to:900,q:1.2,attack:.004,decay:.12,gain:.05})}),"shot:hit":Ge(s=>{s.noise({filter:"lowpass",freq:1100,to:300,attack:.004,decay:.2,gain:.09}),s.tone({freq:190,to:95,decay:.14,gain:.07})}),"hazard:cloud":Ge((s,{life:e})=>{s.tone({freq:240,to:150,glide:.2,attack:.02,decay:.24,gain:.05}),s.noise({freq:2600,to:1100,glide:.8,q:.7,attack:.18,hold:.25,decay:Math.min(1.6,(e||2)*.5),gain:.05})}),"charge:dust":Ge(s=>{const e=Z(.9,1.12);s.tone({freq:84*e,to:52*e,decay:.11,gain:.075}),s.noise({filter:"lowpass",freq:520*e,to:220,decay:.1,gain:.04})}),guard:Ge(s=>{s.tone({type:"triangle",freq:540,to:410,glide:.04,attack:.002,decay:.09,gain:.09}),s.noise({freq:2800,q:2,attack:.002,decay:.05,gain:.05})},s=>s.entity),miss(s,{target:e,text:t}){!e||e.kind!=="player"||t!=="Dodged"||s.noise({freq:1500,to:3e3,glide:.1,q:1.6,attack:.03,decay:.14,gain:.05})},lowhealth(s){for(const e of[0,.26])s.tone({freq:74,to:52,at:e,attack:.008,decay:.26,gain:e?.13:.17})},"monster:alert":Ge((s,e)=>{const t=on(e),n=t.freq*Z(.94,1.08)*(e.elite?.82:1),o={type:t.type,cutoff:Math.min(2600,n*4),attack:.008,glide:.08};s.tone({...o,freq:n,to:n*t.bend,decay:.14,gain:.08}),s.tone({...o,freq:n*1.19,to:n*1.19*t.bend,at:.12,decay:.2,gain:.07})}),"monster:strike":Ge((s,e)=>{const t=on(e),n=t.freq*Z(.9,1.1);s.noise({freq:900,to:420,q:1,decay:.15,gain:.12}),s.tone({type:t.type,cutoff:1400,freq:n*.6,to:n*.38,decay:.18,gain:.1})}),"monster:died":Ge((s,e)=>{const t=ue(on(e).freq/600,.75,1.35)*Z(.94,1.06);s.tone({freq:430*t,to:150*t,glide:.1,decay:.22,gain:.13}),s.noise({filter:"lowpass",freq:1300*t,to:280,attack:.02,decay:.5,gain:.09})}),pickup(s,{rare:e}){e?(s.bell(s.key(3,74),{bus:"chime",decay:1.1,gain:.07}),s.bell(s.key(5,74),{bus:"chime",at:.13,decay:1.5,gain:.07})):s.bell(s.key(Yo([0,2,3]),79),{decay:.45,gain:.07})},"boss:step":Ge(s=>{const e=Z(.92,1.08);s.tone({freq:62*e,to:34,decay:.5,gain:.3}),s.noise({filter:"lowpass",freq:420,to:110,attack:.006,decay:.42,gain:.14})},s=>s.x!==void 0?s:s.entity),"cine:rumble"(s,{power:e=.5}){s.noise({filter:"lowpass",freq:240,to:90,attack:.12,hold:.25,decay:.7,gain:.1+.1*e}),s.tone({freq:48,to:38,attack:.08,hold:.2,decay:.6,gain:.16+.1*e})},"boss:rise"(s){s.noise({filter:"lowpass",freq:160,to:520,glide:2.6,attack:.5,hold:2,decay:1.2,gain:.16}),s.tone({freq:41,to:55,glide:3,attack:.6,hold:2.2,decay:1,gain:.2});for(const[e,t]of[[0,.2],[7,1.1],[10,2]])s.tone({bus:"chime",type:"triangle",cutoff:900,freq:s.key(e,38),at:t,attack:.9,hold:.6,decay:1.6,gain:.05})},"boss:stand"(s){s.tone({freq:70,to:30,decay:.9,gain:.34}),s.noise({filter:"lowpass",freq:600,to:120,attack:.005,decay:.8,gain:.2})},"boss:roar":Ge((s,{entity:e})=>{const t=(e?on(e).freq:300)*.22;s.tone({type:"sawtooth",cutoff:520,freq:t*1.25,to:t*.7,glide:1.3,attack:.12,hold:.7,decay:.9,gain:.2}),s.tone({type:"sawtooth",cutoff:380,freq:t*.63,to:t*.36,glide:1.4,attack:.16,hold:.7,decay:.9,gain:.16}),s.noise({freq:700,to:320,glide:1.2,q:.8,attack:.15,hold:.6,decay:.8,gain:.1})},()=>null),"boss:fell"(s){s.piano(s.key(0,33),{bus:"chime",strings:2,ring:1.6,gain:.3}),s.noise({filter:"lowpass",freq:520,to:140,glide:2.6,attack:.3,hold:1.8,decay:1.4,gain:.12})},"boss:down"(s){s.tone({freq:58,to:26,decay:1.4,gain:.36}),s.noise({filter:"lowpass",freq:800,to:100,attack:.005,decay:1.2,gain:.22}),[0,7,12].forEach((e,t)=>s.piano(s.key(e,45),{bus:"chime",strings:1,ring:1.4,at:.9+t*.32,gain:.16}))},"boss:enrage"(s){s.tone({freq:52,to:44,attack:.05,hold:.3,decay:.7,gain:.2})},"gate:shut":Ge(s=>{s.tone({type:"triangle",freq:150,to:70,decay:.3,gain:.16}),s.noise({filter:"lowpass",freq:900,to:200,attack:.004,decay:.3,gain:.12})}),"cine:open"(s){s.tone({bus:"chime",type:"triangle",cutoff:1100,freq:s.key(0,50),attack:1.4,hold:2.2,decay:2.6,gain:.05}),[0,4,7].forEach((e,t)=>s.piano(s.key(e,62),{bus:"chime",strings:1,ring:1.4,at:.5+t*.7,gain:.15}))},"craft:pass"(s){s.noise({freq:320,to:900,glide:3.6,q:.7,attack:1.6,hold:1.6,decay:1.4,gain:.11}),s.tone({type:"triangle",cutoff:700,freq:82,to:118,glide:3.4,attack:1.2,hold:2,decay:1.2,gain:.07})},"craft:land"(s){s.tone({freq:96,to:48,decay:.5,gain:.2}),s.noise({freq:1400,to:260,glide:.9,q:.7,attack:.02,decay:1,gain:.1})},"arrive:beam"(s){s.noise({freq:600,to:2400,glide:.5,q:1.2,attack:.25,hold:.1,decay:.6,gain:.07}),[0,7,12].forEach((e,t)=>s.bell(s.key(e,62),{bus:"chime",at:.25+t*.12,decay:1.3,gain:.05}))},shoot(s,{family:e,heavy:t}){const n=Z(.94,1.06);e==="rifle"?(s.tone({type:"triangle",freq:780*n,to:240*n,glide:.09,attack:.002,decay:.12,gain:t?.13:.1}),s.noise({freq:2600,to:1100,q:1.3,attack:.002,decay:.07,gain:.06})):(s.tone({freq:420*n,to:640*n,glide:.12,attack:.01,decay:.22,gain:t?.1:.075}),s.bell(s.key(t?7:3,74),{decay:.4,gain:.03}))},equip(s){s.tone({type:"triangle",freq:320,to:470,glide:.06,attack:.004,decay:.12,gain:.09}),s.noise({freq:2400,q:1.5,attack:.002,at:.07,decay:.05,gain:.05})},"drop:rare"(s,{rarity:e}){e>=4||[0,7,12].concat(e>=3?[16]:[]).forEach((t,n)=>s.bell(s.key(t,67),{bus:"chime",at:n*.1,decay:1.5,gain:.06}))},"site:used"(s,{site:e}){tt(zd,e,[0,4,7]).forEach((n,o)=>s.bell(s.key(n,67),{bus:"chime",at:o*.11,decay:1.2,gain:.05})),s.noise({freq:900,to:2600,glide:.4,q:1.2,attack:.2,decay:.5,gain:.04})},"site:guard":Ge((s,{guard:e})=>{const t=on(e).freq*.7;s.tone({type:"sawtooth",cutoff:900,freq:t,to:t*1.4,glide:.25,attack:.03,hold:.1,decay:.3,gain:.1})},s=>s.guard),"lumen:bolt"(s){s.tone({type:"sine",freq:1250*Z(.96,1.05),to:760,glide:.1,attack:.004,decay:.12,gain:.03})},"lumen:ready"(s){[0,7].forEach((e,t)=>s.bell(s.key(e,74),{bus:"chime",at:t*.13,decay:.9,gain:.045}))},"lumen:burst"(s,{burst:e}){const t=e?e.kind:"ring";if(t==="mend"){[0,4,7,12].forEach((n,o)=>s.tone({bus:"chime",freq:s.key(n,67),at:o*.08,attack:.03,decay:.9,gain:.045}));return}if(t==="ward"){s.tone({type:"triangle",freq:180,to:300,glide:.3,attack:.03,hold:.1,decay:.6,gain:.1}),s.bell(s.key(0,62),{bus:"chime",decay:1.4,gain:.05});return}s.noise({freq:500,to:2200,glide:.25,q:.9,attack:.03,decay:.45,gain:.11}),s.tone({freq:150,to:70,attack:.01,decay:.45,gain:.12}),s.bell(s.key(7,67),{bus:"chime",at:.05,decay:.9,gain:.04})},"lumen:fed"(s){s.tone({type:"sine",freq:520,to:780,glide:.08,attack:.005,decay:.14,gain:.05})},"lumen:changed"(s){[0,4,7,11,14].forEach((e,t)=>s.bell(s.key(e,62),{bus:"chime",at:t*.14,decay:1.5,gain:.05}))},"lance:fire":Ge(s=>{s.tone({type:"sawtooth",cutoff:1800,freq:620,to:140,glide:.18,attack:.003,decay:.3,gain:.13}),s.noise({freq:2800,to:700,glide:.2,q:1,attack:.003,decay:.25,gain:.08})}),talk(s){s.tone({type:"triangle",cutoff:1400,freq:s.key(0,69),attack:.01,decay:.16,gain:.04}),s.tone({type:"triangle",cutoff:1400,freq:s.key(4,69),at:.1,attack:.01,decay:.2,gain:.04})},levelup(s){[0,2,3,5,7,8].forEach((e,t)=>{s.piano(s.key(e,57),{bus:"chime",strings:1,ring:.6,at:t*.19,gain:.2+t*.012})}),s.bell(s.key(10,57),{bus:"chime",at:1.14,decay:1.6,gain:.04})},heal(s,{focus:e}){const t=e?[0,3,5]:[2,3,5,7],n=e?67:72;t.forEach((o,a)=>s.tone({bus:"chime",freq:s.key(o,n),at:a*.07,attack:.02,decay:.7,gain:.04}))},drink(s){s.tone({freq:270,to:170,glide:.07,attack:.006,decay:.12,gain:.12}),s.tone({freq:330,to:540,glide:.05,at:.1,decay:.1,gain:.1})},skill(s,{id:e}){const t=Object.hasOwn(Ja,e)?Ja[e]:void 0;t&&t(s)},"bolt:hit":Ge(s=>{s.noise({filter:"lowpass",freq:1500,to:320,attack:.008,decay:.45,gain:.13}),s.tone({freq:150,to:62,decay:.3,gain:.14})}),"player:died"(s){const e=s.key(0,55);s.tone({freq:e,to:e/3,glide:1.4,attack:.03,hold:.3,decay:1.8,gain:.2}),s.tone({bus:"chime",type:"triangle",cutoff:700,freq:e*1.19,to:e*.4,glide:1.4,attack:.05,hold:.3,decay:1.5,gain:.06})},"player:respawn"(s){const e=s.key(0,62);s.tone({bus:"chime",freq:e*.667,to:e,glide:.8,attack:.25,hold:.45,decay:1.2,gain:.1}),s.bell(e*2,{bus:"chime",at:.75,decay:1.6,gain:.05})},"ui:click"(s){s.tone({type:"triangle",freq:620,to:480,glide:.03,attack:.002,decay:.07,gain:.06})},"relic:ring"(s,{heavy:e}){s.tone({freq:e?120:160,to:70,attack:.005,decay:e?.4:.22,gain:e?.11:.07}),s.bell(s.key(e?7:4,62),{bus:"chime",decay:.7,gain:.03})},"relic:found"(s){[0,4,7,11,14].forEach((e,t)=>s.bell(s.key(e,62),{bus:"chime",at:t*.13,decay:2,gain:.055}))},salvage(s){s.noise({freq:1800,to:700,q:1.6,attack:.002,decay:.09,gain:.05}),s.bell(s.key(0,74),{at:.05,decay:.3,gain:.04})},hone(s){s.tone({type:"triangle",freq:300,to:520,glide:.18,attack:.01,decay:.2,gain:.07}),[7,12].forEach((e,t)=>s.bell(s.key(e,67),{bus:"chime",at:.12+t*.1,decay:.9,gain:.045}))},trade(s){s.bell(s.key(3,74),{decay:.3,gain:.05}),s.bell(s.key(5,74),{at:.06,decay:.45,gain:.05})},deny(s){s.tone({type:"triangle",cutoff:500,freq:150,to:118,glide:.08,decay:.18,gain:.13})},boon(s){for(const e of[0,2,3])s.tone({bus:"chime",freq:s.key(e,57),attack:.4,hold:.3,decay:1.8,gain:.04});s.bell(s.key(5,69),{bus:"chime",at:.45,decay:2,gain:.05})},talent(s){const e={bus:"chime",strings:1,ring:.6};s.piano(s.key(3,57),{...e,gain:.16}),s.piano(s.key(5,57),{...e,at:.14,gain:.17}),s.bell(s.key(8,57),{bus:"chime",at:.3,decay:1.4,gain:.04})},"guide:step"(s){s.bell(s.key(3,74),{bus:"chime",decay:.7,gain:.05}),s.bell(s.key(5,74),{bus:"chime",at:.1,decay:1,gain:.05})},jump(s,{entity:e}){if(e&&e.kind!=="player")return;const t=Z(.94,1.08);s.noise({freq:520*t,to:1500*t,glide:.14,q:.8,attack:.03,decay:.16,gain:.05})},landed:Ge(s=>{const e=Z(.92,1.08);s.tone({freq:96*e,to:54,attack:.004,decay:.16,gain:.07}),s.noise({filter:"lowpass",freq:520*e,to:220,attack:.004,decay:.12,gain:.04})}),fell(s){s.tone({type:"triangle",cutoff:1400,freq:520,to:150,glide:.5,attack:.02,hold:.1,decay:.45,gain:.07}),s.noise({freq:1300,to:380,glide:.5,q:.7,attack:.06,decay:.45,gain:.035})}},Md=.035,_d={step:.13,"charge:dust":.1},Td=.12,Sd=.1,Pd="/lumenwake/sfx/",qd=["master","music","sfx","ambience"],Ld=s=>Array.isArray(s);function Cd(s){return Promise.all(gd.map(e=>fetch(Pd+e+".wav").then(t=>t.ok?t.arrayBuffer():Promise.reject(new Error(String(t.status)))).then(t=>s.ctx.decodeAudioData(t)).then(t=>{s.samples.set(e,t)}).catch(()=>{}))).then(()=>{})}function Ed(s){let e=null,t=null,n=null,o=!0,a=1,i=0,r=!1;const c={master:1,music:1,sfx:1,ambience:1},d=(w,y)=>{const M=Number(w);return Number.isFinite(M)?ue(M,0,1):y};function h(w){if(!(!w||typeof w!="object")){for(const y of qd)c[y]=d(w[y],c[y]);a=c.master,"mute"in w&&(o=!w.mute)}}h(s.settings);function u(w=.12){if(!e)return;const y=typeof document<"u"&&document.hidden,M=o&&!y?a*jt.master:0;e.master.gain.setTargetAtTime(M,e.ctx.currentTime,w/3)}function f(w=.12){if(jt.music=Hn.music*c.music,!e)return;const y=e.ctx.currentTime,M=(R,E)=>{R.node.gain.setTargetAtTime(E,y,w/3)};M(e.buses.sfx,Hn.sfx*c.sfx),M(e.buses.chime,Hn.sfx*c.sfx),M(e.buses.amb,Hn.ambience*c.ambience),M(e.buses.air,Hn.ambience*c.ambience),u(w)}const p=new Map;function m(w){try{w()}catch(y){r||console.warn("[audio]",y),r=!0}}function v(){const w=e&&e.ctx;w&&w.state!=="running"&&w.state!=="closed"&&w.resume()?.catch?.(()=>{})}function g(){if(!e){const w=globalThis.AudioContext||globalThis.webkitAudioContext;if(!w)return;const y=Zc(new w,s,{pad:Jt.town.pad,root:Jt.town.root,scale:Jt.town.five});t=vd(y,s),n=fd(y,s,t),e=y,Cd(y);for(const M of Object.keys(t.hears)){const R=t.hears[M];R&&k.onDynamic(M,E=>m(()=>R(E??{})))}f(.4)}v()}let x=null;function b(w,y){if((!e||e.ctx.state!=="running")&&w==="cine:open"&&(x={type:w,payload:y,at:Date.now()}),!e||!o||e.ctx.state!=="running")return;const M=e,R=M.ctx.currentTime,E=Math.max(0,(p.get(w)||0)-R);E>Td||(p.set(w,R+E+(_d[w]??Md)),M.delay=E,m(()=>{const U=ja[w],Q=U&&M.samples.size?U(y??{},s):null,L=Q?Ld(Q)?Q:[Q]:[];let F=!1,O=!Q;for(const D of L){const G=D.where?M.nearness(D.where):1;if(G<=.02){F=!0;continue}M.level=G,F=M.sample({...D,at:D.at||0})||F,D.keep&&(O=!0)}M.level=1,Q&&!F&&L.length&&(O=!0);const S=Qa[w];O&&S&&S(M,y??{})}),M.delay=0,M.level=1)}let _=null;function z(w){if(!e)return;const y=s.player,M=e.samples.get("saber-hum"),R=!!(M&&y&&!y.dead&&y.family==="blade"&&s.missions&&s.missions.active);if(R&&!_&&M){const E=e.ctx.createBufferSource(),U=e.ctx.createGain();E.buffer=M,E.loop=!0,U.gain.value=0,E.connect(U).connect(e.buses.sfx.node),E.start(w),_={src:E,amp:U}}else if(!R&&_){const E=_;_=null,E.amp.gain.setTargetAtTime(0,w,.15),E.src.stop(w+1),E.src.onended=()=>{E.src.disconnect(),E.amp.disconnect()}}if(_&&y){const E=ue(y.move||0,0,1),U=y.action===1?1:0;_.amp.gain.setTargetAtTime(.06+.05*E+.09*U,w,U?.04:.15),_.src.playbackRate.setTargetAtTime(1+.05*E+.14*U,w,U?.05:.2)}}function C(){if(!e||!t||!n||e.ctx.state!=="running")return;if(x){const M=x;x=null,Date.now()-M.at<2500&&b(M.type,M.payload)}const w=e.ctx.currentTime;if(w-i<Sd)return;const y=Math.min(w-i,.5);i=w,t.update(w,y),n.update(w,y),z(w)}const k=s.bus;k.on("begin",()=>m(g)),k.on("sound",w=>{o=!!w,m(u)}),k.on("volume",w=>{h(w),m(f)}),k.on("frame",()=>m(C));const P=new Set([...Object.keys(Qa),...Object.keys(ja)]);for(const w of P)k.onDynamic(w,y=>b(w,y));if(typeof addEventListener=="function")for(const w of["pointerdown","pointerup","touchend","click","keydown"])addEventListener(w,v,{passive:!0});typeof document<"u"&&document.addEventListener("visibilitychange",()=>m(()=>u(.3)))}var Xs,xe,tr,Xt,ei,nr,sr,ho,Rs,Qn,or,Wo,Po,qo,Ys={},Ws=[],Ad=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,js=Array.isArray;function Kt(s,e){for(var t in e)s[t]=e[t];return s}function Vo(s){s&&s.parentNode&&s.parentNode.removeChild(s)}function st(s,e,t){var n,o,a,i={};for(a in e)a=="key"?n=e[a]:a=="ref"?o=e[a]:i[a]=e[a];if(arguments.length>2&&(i.children=arguments.length>3?Xs.call(arguments,2):t),typeof s=="function"&&s.defaultProps!=null)for(a in s.defaultProps)i[a]===void 0&&(i[a]=s.defaultProps[a]);return Is(s,i,n,o,null)}function Is(s,e,t,n,o){var a={type:s,props:e,key:t,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:o??++tr,__i:-1,__u:0};return o==null&&xe.vnode!=null&&xe.vnode(a),a}function oe(s){return s.children}function Fs(s,e){this.props=s,this.context=e}function hn(s,e){if(e==null)return s.__?hn(s.__,s.__i+1):null;for(var t;e<s.__k.length;e++)if((t=s.__k[e])!=null&&t.__e!=null)return t.__e;return typeof s.type=="function"?hn(s):null}function Rd(s){if(s.__P&&s.__d){var e=s.__v,t=e.__e,n=[],o=[],a=Kt({},e);a.__v=e.__v+1,xe.vnode&&xe.vnode(a),Xo(s.__P,a,e,s.__n,s.__P.namespaceURI,32&e.__u?[t]:null,n,t??hn(e),!!(32&e.__u),o),a.__v=e.__v,a.__.__k[a.__i]=a,cr(n,a,o),e.__e=e.__=null,a.__e!=t&&ar(a)}}function ar(s){if((s=s.__)!=null&&s.__c!=null)return s.__e=s.__c.base=null,s.__k.some(function(e){if(e!=null&&e.__e!=null)return s.__e=s.__c.base=e.__e}),ar(s)}function ti(s){(!s.__d&&(s.__d=!0)&&Xt.push(s)&&!Vs.__r++||ei!=xe.debounceRendering)&&((ei=xe.debounceRendering)||nr)(Vs)}function Vs(){try{for(var s,e=1;Xt.length;)Xt.length>e&&Xt.sort(sr),s=Xt.shift(),e=Xt.length,Rd(s)}finally{Xt.length=Vs.__r=0}}function ir(s,e,t,n,o,a,i,r,c,d,h){var u,f,p,m,v,g,x=n&&n.__k||Ws,b=e.length;for(c=Id(t,e,x,c,b),u=0;u<b;u++)(p=t.__k[u])!=null&&(f=p.__i!=-1&&x[p.__i]||Ys,p.__i=u,g=Xo(s,p,f,o,a,i,r,c,d,h),m=p.__e,p.ref&&f.ref!=p.ref&&(f.ref&&jo(f.ref,null,p),h.push(p.ref,p.__c||m,p)),v==null&&m!=null&&(v=m),4&p.__u?(c=rr(p,c,s),f.__e&&(f.__e=null)):typeof p.type=="function"&&g!==void 0?c=g:m&&(c=m.nextSibling),p.__u&=-7);return t.__e=v,c}function Id(s,e,t,n,o){var a,i,r,c,d,h=t.length,u=h,f=0;for(s.__k=new Array(o),a=0;a<o;a++)(i=e[a])!=null&&typeof i!="boolean"&&typeof i!="function"?(typeof i=="string"||typeof i=="number"||typeof i=="bigint"||i.constructor==String?i=s.__k[a]=Is(null,i,null,null,null):js(i)?i=s.__k[a]=Is(oe,{children:i},null,null,null):i.constructor===void 0&&i.__b>0?i=s.__k[a]=Is(i.type,i.props,i.key,i.ref?i.ref:null,i.__v):s.__k[a]=i,c=a+f,i.__=s,i.__b=s.__b+1,r=null,(d=i.__i=Fd(i,t,c,u))!=-1&&(u--,(r=t[d])&&(r.__u|=2)),r==null||r.__v==null?(d==-1&&(o>h?f--:o<h&&f++),typeof i.type!="function"&&(i.__u|=4)):d!=c&&(d==c-1?f--:d==c+1?f++:(d>c?f--:f++,i.__u|=4))):s.__k[a]=null;if(u)for(a=0;a<h;a++)(r=t[a])!=null&&(2&r.__u)==0&&(r.__e==n&&(n=hn(r)),hr(r,r));return n}function rr(s,e,t){var n,o;if(typeof s.type=="function"){for(n=s.__k,o=0;n&&o<n.length;o++)n[o]&&(n[o].__=s,e=rr(n[o],e,t));return e}s.__e!=e&&(e&&s.type&&!e.parentNode&&(e=hn(s)),e=t.insertBefore(s.__e,e||null));do e=e&&e.nextSibling;while(e!=null&&e.nodeType==8);return e}function Fd(s,e,t,n){var o,a,i,r=s.key,c=s.type,d=e[t],h=d!=null&&(2&d.__u)==0;if(d===null&&r==null||h&&r==d.key&&c==d.type)return t;if(n>(h?1:0)){for(o=t-1,a=t+1;o>=0||a<e.length;)if((d=e[i=o>=0?o--:a++])!=null&&(2&d.__u)==0&&r==d.key&&c==d.type)return i}return-1}function ni(s,e,t){e[0]=="-"?s.setProperty(e,t??""):s[e]=t==null?"":typeof t!="number"||Ad.test(e)?t:t+"px"}function Ts(s,e,t,n,o){var a,i;e:if(e=="style")if(typeof t=="string")s.style.cssText=t;else{if(typeof n=="string"&&(s.style.cssText=n=""),n)for(e in n)t&&e in t||ni(s.style,e,"");if(t)for(e in t)n&&t[e]==n[e]||ni(s.style,e,t[e])}else if(e[0]=="o"&&e[1]=="n")a=e!=(e=e.replace(or,"$1")),i=e.toLowerCase(),e=i in s||e=="onFocusOut"||e=="onFocusIn"?i.slice(2):e.slice(2),s.l||(s.l={}),s.l[e+a]=t,t?n?t[Qn]=n[Qn]:(t[Qn]=Wo,s.addEventListener(e,a?qo:Po,a)):s.removeEventListener(e,a?qo:Po,a);else{if(o=="http://www.w3.org/2000/svg")e=e.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(e!="width"&&e!="height"&&e!="href"&&e!="list"&&e!="form"&&e!="tabIndex"&&e!="download"&&e!="rowSpan"&&e!="colSpan"&&e!="role"&&e!="popover"&&e in s)try{s[e]=t??"";break e}catch{}typeof t=="function"||(t==null||t===!1&&e[4]!="-"?s.removeAttribute(e):s.setAttribute(e,e=="popover"&&t==1?"":t))}}function si(s){return function(e){if(this.l){var t=this.l[e.type+s];if(e[Rs]==null)e[Rs]=Wo++;else if(e[Rs]<t[Qn])return;return t(xe.event?xe.event(e):e)}}}function Xo(s,e,t,n,o,a,i,r,c,d){var h,u,f,p,m,v,g,x,b,_,z,C,k,P,w,y,M=e.type;if(e.constructor!==void 0)return null;128&t.__u&&(c=!!(32&t.__u),a=[r=e.__e=t.__e]),(h=xe.__b)&&h(e);e:if(typeof M=="function"){u=i.length;try{if(b=e.props,_=M.prototype&&M.prototype.render,z=(h=M.contextType)&&n[h.__c],C=h?z?z.props.value:h.__:n,t.__c?x=(f=e.__c=t.__c).__=f.__E:(_?e.__c=f=new M(b,C):(e.__c=f=new Fs(b,C),f.constructor=M,f.render=Bd),z&&z.sub(f),f.state||(f.state={}),f.__n=n,p=f.__d=!0,f.__h=[],f._sb=[]),_&&f.__s==null&&(f.__s=f.state),_&&M.getDerivedStateFromProps!=null&&(f.__s==f.state&&(f.__s=Kt({},f.__s)),Kt(f.__s,M.getDerivedStateFromProps(b,f.__s))),m=f.props,v=f.state,f.__v=e,p)_&&M.getDerivedStateFromProps==null&&f.componentWillMount!=null&&f.componentWillMount(),_&&f.componentDidMount!=null&&f.__h.push(f.componentDidMount);else{if(_&&M.getDerivedStateFromProps==null&&b!==m&&f.componentWillReceiveProps!=null&&f.componentWillReceiveProps(b,C),e.__v==t.__v||!f.__e&&f.shouldComponentUpdate!=null&&f.shouldComponentUpdate(b,f.__s,C)===!1){e.__v!=t.__v&&(f.props=b,f.state=f.__s,f.__d=!1),e.__e=t.__e,e.__k=t.__k,e.__k.some(function(R){R&&(R.__=e)}),Ws.push.apply(f.__h,f._sb),f._sb=[],f.__h.length&&i.push(f),r=hn(t);break e}f.componentWillUpdate!=null&&f.componentWillUpdate(b,f.__s,C),_&&f.componentDidUpdate!=null&&f.__h.push(function(){f.componentDidUpdate(m,v,g)})}if(f.context=C,f.props=b,f.__P=s,f.__e=!1,k=xe.__r,P=0,_)f.state=f.__s,f.__d=!1,k&&k(e),h=f.render(f.props,f.state,f.context),Ws.push.apply(f.__h,f._sb),f._sb=[];else do f.__d=!1,k&&k(e),h=f.render(f.props,f.state,f.context),f.state=f.__s;while(f.__d&&++P<25);f.state=f.__s,f.getChildContext!=null&&(n=Kt(Kt({},n),f.getChildContext())),_&&!p&&f.getSnapshotBeforeUpdate!=null&&(g=f.getSnapshotBeforeUpdate(m,v)),w=h!=null&&h.type===oe&&h.key==null?dr(h.props.children):h,r=ir(s,js(w)?w:[w],e,t,n,o,a,i,r,c,d),f.base=e.__e,e.__u&=-161,f.__h.length&&i.push(f),x&&(f.__E=f.__=null)}catch(R){if(i.length=u,e.__v=null,c||a!=null){if(R.then){for(e.__u|=c?160:128;r&&r.nodeType==8&&r.nextSibling;)r=r.nextSibling;a!=null&&(a[a.indexOf(r)]=null),e.__e=r}else if(a!=null)for(y=a.length;y--;)Vo(a[y])}else e.__e=t.__e;e.__k==null&&(e.__k=t.__k||[]),R.then||lr(e),xe.__e(R,e,t)}}else a==null&&e.__v==t.__v?(e.__k=t.__k,e.__e=t.__e):r=e.__e=Nd(t.__e,e,t,n,o,a,i,c,d);return(h=xe.diffed)&&h(e),128&e.__u?void 0:r}function lr(s){s&&(s.__c&&(s.__c.__e=!0),s.__k&&s.__k.some(lr))}function cr(s,e,t){for(var n=0;n<t.length;n++)jo(t[n],t[++n],t[++n]);xe.__c&&xe.__c(e,s),s.some(function(o){try{s=o.__h,o.__h=[],s.some(function(a){a.call(o)})}catch(a){xe.__e(a,o.__v)}})}function dr(s){return typeof s!="object"||s==null||s.__b>0?s:js(s)?s.map(dr):s.constructor!==void 0?null:Kt({},s)}function Nd(s,e,t,n,o,a,i,r,c){var d,h,u,f,p,m,v,g=t.props||Ys,x=e.props,b=e.type;if(b=="svg"?o="http://www.w3.org/2000/svg":b=="math"?o="http://www.w3.org/1998/Math/MathML":o||(o="http://www.w3.org/1999/xhtml"),a!=null){for(d=0;d<a.length;d++)if((p=a[d])&&"setAttribute"in p==!!b&&(b?p.localName==b:p.nodeType==3)){s=p,a[d]=null;break}}if(s==null){if(b==null)return document.createTextNode(x);s=document.createElementNS(o,b,x.is&&x),r&&(xe.__m&&xe.__m(e,a),r=!1),a=null}if(b==null)g===x||r&&s.data==x||(s.data=x);else{if(a=b=="textarea"&&x.defaultValue!=null?null:a&&Xs.call(s.childNodes),!r&&a!=null)for(g={},d=0;d<s.attributes.length;d++)g[(p=s.attributes[d]).name]=p.value;for(d in g)p=g[d],d=="dangerouslySetInnerHTML"?u=p:d=="children"||d in x||d=="value"&&"defaultValue"in x||d=="checked"&&"defaultChecked"in x||Ts(s,d,null,p,o);for(d in x)p=x[d],d=="children"?f=p:d=="dangerouslySetInnerHTML"?h=p:d=="value"?m=p:d=="checked"?v=p:r&&typeof p!="function"||g[d]===p||Ts(s,d,p,g[d],o);if(h)r||u&&(h.__html==u.__html||h.__html==s.innerHTML)||(s.innerHTML=h.__html),e.__k=[];else if(u&&(s.innerHTML=""),ir(e.type=="template"?s.content:s,js(f)?f:[f],e,t,n,b=="foreignObject"?"http://www.w3.org/1999/xhtml":o,a,i,a?a[0]:t.__k&&hn(t,0),r,c),a!=null)for(d=a.length;d--;)Vo(a[d]);r&&b!="textarea"||(d="value",b=="progress"&&m==null?s.removeAttribute("value"):m!=null&&(m!==s[d]||b=="progress"&&!m||b=="option"&&m!=g[d])&&Ts(s,d,m,g[d],o),d="checked",v!=null&&v!=s[d]&&Ts(s,d,v,g[d],o))}return s}function jo(s,e,t){try{if(typeof s=="function"){var n=typeof s.__u=="function";n&&s.__u(),n&&e==null||(s.__u=s(e))}else s.current=e}catch(o){xe.__e(o,t)}}function hr(s,e,t){var n,o;if(xe.unmount&&xe.unmount(s),(n=s.ref)&&(n.current&&n.current!=s.__e||jo(n,null,e)),(n=s.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(a){xe.__e(a,e)}n.base=n.__P=n.__n=null}if(n=s.__k)for(o=0;o<n.length;o++)n[o]&&hr(n[o],e,t||typeof s.type!="function");t||Vo(s.__e),s.__c=s.__=s.__e=void 0}function Bd(s,e,t){return this.constructor(s,t)}function oi(s,e,t){var n,o,a,i;e==document&&(e=document.documentElement),xe.__&&xe.__(s,e),o=(n=!1)?null:e.__k,a=[],i=[],Xo(e,s=e.__k=st(oe,null,[s]),o||Ys,Ys,e.namespaceURI,o?null:e.firstChild?Xs.call(e.childNodes):null,a,o?o.__e:e.firstChild,n,i),cr(a,s,i),s.props.children=null}Xs=Ws.slice,xe={__e:function(s,e,t,n){for(var o,a,i;e=e.__;)if((o=e.__c)&&!o.__)try{if((a=o.constructor)&&a.getDerivedStateFromError!=null&&(o.setState(a.getDerivedStateFromError(s)),i=o.__d),o.componentDidCatch!=null&&(o.componentDidCatch(s,n||{}),i=o.__d),i)return o.__E=o}catch(r){s=r}throw s}},tr=0,Fs.prototype.setState=function(s,e){var t;t=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=Kt({},this.state),typeof s=="function"&&(s=s(Kt({},t),this.props)),s&&Kt(t,s),s!=null&&this.__v&&(e&&this._sb.push(e),ti(this))},Fs.prototype.forceUpdate=function(s){this.__v&&(this.__e=!0,s&&this.__h.push(s),ti(this))},Fs.prototype.render=oe,Xt=[],nr=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,sr=function(s,e){return s.__v.__b-e.__v.__b},Vs.__r=0,ho=Math.random().toString(8),Rs="__d"+ho,Qn="__a"+ho,or=/(PointerCapture)$|Capture$/i,Wo=0,Po=si(!1),qo=si(!0);var Hd=0;function l(s,e,t,n,o,a){e||(e={});var i,r,c=e;if("ref"in c)for(r in c={},e)r=="ref"?i=e[r]:c[r]=e[r];var d={type:s,props:c,key:t,ref:i,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--Hd,__i:-1,__u:0,__source:o,__self:a};if(typeof s=="function"&&(i=s.defaultProps))for(r in i)c[r]===void 0&&(c[r]=i[r]);return xe.vnode&&xe.vnode(d),d}var os,Ee,fo,ai,as=0,fr=[],Be=xe,ii=Be.__b,ri=Be.__r,li=Be.diffed,ci=Be.__c,di=Be.unmount,hi=Be.__;function Zo(s,e){Be.__h&&Be.__h(Ee,s,as||e),as=0;var t=Ee.__H||(Ee.__H={__:[],__h:[]});return s>=t.__.length&&t.__.push({}),t.__[s]}function le(s){return as=1,Dd(pr,s)}function Dd(s,e,t){var n=Zo(os++,2);if(n.t=s,!n.__c&&(n.__=[pr(void 0,e),function(r){var c=n.__N?n.__N[0]:n.__[0],d=n.t(c,r);c!==d&&(n.__N=[d,n.__[1]],n.__c.setState({}))}],n.__c=Ee,!Ee.__f)){var o=function(r,c,d){if(!n.__c.__H)return!0;var h=!1,u=n.__c.props!==r;if(n.__c.__H.__.some(function(p){if(p.__N){h=!0;var m=p.__[0];p.__=p.__N,p.__N=void 0,m!==p.__[0]&&(u=!0)}}),a){var f=a.call(this,r,c,d);return h?f||u:f}return!h||u};Ee.__f=!0;var a=Ee.shouldComponentUpdate,i=Ee.componentWillUpdate;Ee.componentWillUpdate=function(r,c,d){if(this.__e){var h=a;a=void 0,o(r,c,d),a=h}i&&i.call(this,r,c,d)},Ee.shouldComponentUpdate=o}return n.__N||n.__}function De(s,e){var t=Zo(os++,3);!Be.__s&&ur(t.__H,e)&&(t.__=s,t.u=e,Ee.__H.__h.push(t))}function me(s){return as=5,Jo(function(){return{current:s}},[])}function Jo(s,e){var t=Zo(os++,7);return ur(t.__H,e)&&(t.__=s(),t.__H=e,t.__h=s),t.__}function Ye(s,e){return as=8,Jo(function(){return s},e)}function Od(){for(var s;s=fr.shift();){var e=s.__H;if(s.__P&&e)try{e.__h.some(Ns),e.__h.some(Lo),e.__h=[]}catch(t){e.__h=[],Be.__e(t,s.__v)}}}Be.__b=function(s){Ee=null,ii&&ii(s)},Be.__=function(s,e){s&&e.__k&&e.__k.__m&&(s.__m=e.__k.__m),hi&&hi(s,e)},Be.__r=function(s){ri&&ri(s),os=0;var e=(Ee=s.__c).__H;e&&(fo===Ee?(e.__h=[],Ee.__h=[],e.__.some(function(t){t.__N&&(t.__=t.__N),t.u=t.__N=void 0})):(e.__h.some(Ns),e.__h.some(Lo),e.__h=[],os=0)),fo=Ee},Be.diffed=function(s){li&&li(s);var e=s.__c;e&&e.__H&&(e.__H.__h.length&&(fr.push(e)!==1&&ai===Be.requestAnimationFrame||((ai=Be.requestAnimationFrame)||$d)(Od)),e.__H.__.some(function(t){t.u&&(t.__H=t.u,t.u=void 0)})),fo=Ee=null},Be.__c=function(s,e){e.some(function(t){try{t.__h.some(Ns),t.__h=t.__h.filter(function(n){return!n.__||Lo(n)})}catch(n){e.some(function(o){o.__h&&(o.__h=[])}),e=[],Be.__e(n,t.__v)}}),ci&&ci(s,e)},Be.unmount=function(s){di&&di(s);var e,t=s.__c;t&&t.__H&&(t.__H.__.some(function(n){try{Ns(n)}catch(o){e=o}}),t.__H=void 0,e&&Be.__e(e,t.__v))};var fi=typeof requestAnimationFrame=="function";function $d(s){var e,t=function(){clearTimeout(n),fi&&cancelAnimationFrame(e),setTimeout(s)},n=setTimeout(t,35);fi&&(e=requestAnimationFrame(t))}function Ns(s){var e=Ee,t=s.__c;typeof t=="function"&&(s.__c=void 0,t()),Ee=e}function Lo(s){var e=Ee;s.__c=s.__(),Ee=e}function ur(s,e){return!s||s.length!==e.length||e.some(function(t,n){return t!==s[n]})}function pr(s,e){return typeof e=="function"?e(s):e}const Ud=s=>`rgb(${s.join(",")})`,ae=(s,e)=>st("svg",{class:e?.cls,viewBox:e?.viewBox||"0 0 40 40","aria-hidden":"true",fill:"none",stroke:"#dff0ff","stroke-width":e?.strokeWidth??2,"stroke-linecap":"round","stroke-linejoin":"round"},s),ke=s=>ae(s,{cls:"ico",strokeWidth:3}),A=(s,e)=>st("path",{d:s,...e}),Ae=(s,e,t,n)=>st("circle",{cx:s,cy:e,r:t,...n}),Rt=(s,e,t,n,o)=>st("rect",{x:s,y:e,width:t,height:n,...o}),mr=(s,e,t,n,o)=>st("ellipse",{cx:s,cy:e,rx:t,ry:n,...o}),uo="M20 34C9 26 5 20 5 13.5a7.5 7.5 0 0 1 15-2.5 7.5 7.5 0 0 1 15 2.5C35 20 31 26 20 34z",ui="M20 5c7 9 10.5 14 10.5 19.5a10.5 10.5 0 0 1-21 0C9.5 19 13 14 20 5z",vr={slam:()=>ae([A("M20 5v17",{"stroke-width":3.4}),A("M13 16l7 7 7-7",{"stroke-width":2.6}),mr(20,30,14,4.5,{stroke:"#ffc94a"}),A("M6 24l-2-3M34 24l2-3M12 22l-1-4M28 22l1-4",{stroke:"#d64634"})]),volley:()=>ae([A("M6 13h17M6 20h23M6 27h17",{"stroke-width":2.6}),A("M23 9l8 4-8 4zM29 16l8 4-8 4zM23 23l8 4-8 4z",{fill:"#8fd8ff","stroke-width":1.4})]),nova:()=>ae([Ae(20,20,13,{stroke:"#8fd8ff","stroke-width":2.6}),Ae(20,20,6,{fill:"#8fd8ff","stroke-width":1.4}),A("M20 3v6M20 31v6M3 20h6M31 20h6M8 8l4 4M28 28l4 4M32 8l-4 4M12 28l-4 4",{"stroke-width":1.6})]),cleave:()=>ae([A("M6 31C9 15 21 6 35 7 25 12 17 21 15 34z",{fill:"#f1ebdc"}),A("M9 25c4-8 10-13 18-15M11 29c3-7 8-11 14-13",{"stroke-width":1.4}),A("M27 30l6 4M30 26l5 2",{stroke:"#d64634"})]),bolt:()=>ae([Ae(24,16,9.5,{fill:"#f09e4a"}),A("M24 11c3 1 4 4 3 6s-4 3-6 1 0-5 3-3",{"stroke-width":1.5}),A("M5 35l9-9M9 27l5-2M13 35l3-6",{stroke:"#d64634"})]),mend:()=>ae([A("M20 34C8 25 6 18 9 13c3-5 9-4 11 0 2-4 8-5 11 0 3 5 1 12-11 21z",{fill:"#86c06a"}),A("M20 15v10M15 20h10",{stroke:"#f1ebdc","stroke-width":3.2})]),step:()=>ae([A("M8 10l11 10L8 30M20 10l11 10-11 10",{stroke:"#546c9c","stroke-width":4.2}),A("M4 16h6M3 24h6",{"stroke-width":1.5})])},Kd=s=>ae([A("M12.5 24h15l3.5 6a3 3 0 0 1-3 5H12a3 3 0 0 1-3-5z",{fill:s,stroke:"none"}),A("M16 8v7L9 27a5 5 0 0 0 4 8h14a5 5 0 0 0 4-8l-7-12V8"),Rt(15,4,10,4,{rx:1.5,fill:"#b08054"}),A("M13 24h14",{"stroke-width":1.4})]),Gd=s=>ae([A("M12 14c-6 6-8 20 8 20s14-14 8-20z",{fill:s}),A("M13 14c2-3 1-6-1-8h16c-2 2-3 5-1 8z",{fill:"#f1ebdc"}),A("M12 14h16",{stroke:"#d64634","stroke-width":2.4})]),Yd=s=>ae([A("M20 4l12 10-12 22L8 14z",{fill:s}),A("M8 14h24M20 36V14M20 4l-5 10M20 4l5 10",{"stroke-width":1.4})]);function is(s){const e=Ud(s.color);return s.kind==="use"?Kd(e):s.drop===3?Yd(e):Gd(e)}const es={blade:()=>ae([A("M15 24L30 6h5v5L18 27z",{fill:"#f1ebdc"}),A("M18.5 23.5L31 10",{"stroke-width":1.4}),A("M11 20l10 10",{"stroke-width":3}),A("M14.5 27.5L9 33",{stroke:"#ff8a70","stroke-width":4}),Ae(7.5,34.5,2,{fill:"#ffc45e"})]),rifle:()=>ae([A("M4 15h22l3 2v5H17l-1 3h-5l-1-3H4z",{fill:"#88b4d8"}),A("M29 19h8",{"stroke-width":3}),A("M11 15v-4h10v4",{"stroke-width":1.6}),A("M19 25l2 8h-5l-1-8",{fill:"#b08054"}),A("M8 18.5h14",{stroke:"#ffc45e","stroke-width":1.6})]),wand:()=>ae([A("M9 35L24 17",{"stroke-width":3.2}),A("M28 3l7 9-7 9-7-9z",{fill:"#86e6dc"}),A("M28 3v18M21 12h14",{"stroke-width":1.3}),A("M12 31.5l3 2.6",{stroke:"#ffc45e","stroke-width":2.6}),A("M15 6l1 3M35 24l2 2M12 14l3 1",{"stroke-width":1.5})]),frame:()=>ae([A("M12 5l8 3 8-3 6 7-5 5v14l-9 4-9-4V17l-5-5z",{fill:"#e2bc82"}),A("M20 8v27",{"stroke-width":1.4}),A("M11 22h18",{stroke:"#ff8a70","stroke-width":2.4}),A("M14 27h4M22 27h4",{"stroke-width":1.4})]),unit:()=>ae([A("M20 4l13 7.5v17L20 36 7 28.5v-17z",{fill:"#1c3a80"}),Ae(20,20,6.5,{fill:"#fff3c4"}),A("M20 4v6M20 30v6M7 11.5l5.5 3M27.5 25.5l5.5 3M33 11.5l-5.5 3M12.5 25.5l-5.5 3",{"stroke-width":1.5})]),offhand:()=>ae([Ae(20,20,14,{fill:"#88b4d8"}),Ae(20,20,9,{"stroke-width":1.4}),Ae(20,20,3.5,{fill:"#fff3c4"})]),visor:()=>ae([A("M6 22c2-9 26-9 28 0v5c-6-3-22-3-28 0z",{fill:"#88b4d8"}),A("M10 21c5-3 15-3 20 0",{stroke:"#86e6dc","stroke-width":2.6})]),grips:()=>ae([A("M12 34V22l-3-6 3-1 3 5V8a2.5 2.5 0 0 1 5 0v9-11a2.5 2.5 0 0 1 5 0v12-9a2.5 2.5 0 0 1 5 0v15c0 5-3 10-8 10z",{fill:"#e2bc82"}),A("M12 30h16",{"stroke-width":1.6})]),greaves:()=>ae([A("M14 6h12l-1 24-5 5-5-5z",{fill:"#88b4d8"}),A("M15 14h10M15 22h10",{"stroke-width":1.4})]),boots:()=>ae([A("M12 5h11v18l9 5v6H9V28l3-4z",{fill:"#e2bc82"}),A("M9 30h23M12 12h11",{"stroke-width":1.5})]),mod:()=>ae([Rt(10,10,20,20,{rx:2,fill:"#1c3a80"}),Rt(16,16,8,8,{fill:"#86e6dc"}),A("M14 6v4M20 6v4M26 6v4M14 30v4M20 30v4M26 30v4",{"stroke-width":1.6})])},gr={},br={};function pi(s){Object.assign(gr,s)}const yr=s=>gr[s]||"";function mi(s){Object.assign(br,s)}function Qo(s){const e=br[s.id];return e?st("img",{class:"gear-art",src:e,alt:"",draggable:!1}):(s.family&&es[s.family]||es[s.slot]||es.unit)()}const Wd={attack:()=>ke([A("M30 6l4 4-17 17-4-4z",{fill:"#ffab98"}),A("M9 21l10 10M12 28l-6 6")]),attackSpeed:()=>ke([A("M8 9l11 11L8 31M21 9l11 11-11 11",{stroke:"#ffcc74"})]),crit:()=>ke([Ae(20,20,11),Ae(20,20,3.5,{fill:"#ffcc74",stroke:"none"}),A("M20 4v7M20 29v7M4 20h7M29 20h7")]),critDamage:()=>ke([A("M20 4l4 11 12 5-12 5-4 11-4-11L4 20l12-5z",{fill:"#ff8a70"})]),power:()=>ke([A("M22 4L9 22h9l-2 14 13-18h-9z",{fill:"#86e6dc"})]),maxHp:()=>ke([A(uo,{fill:"#ff7a66"})]),hpRegen:()=>ke([A(uo,{fill:"#ff7a66"}),A("M20 14v10M15 19h10",{stroke:"#fff3ec"})]),lifeOnKill:()=>ke([A(uo),A("M14 17l12 8M26 17l-12 8",{stroke:"#ff7a66"})]),maxFocus:()=>ke([A(ui,{fill:"#5cc8ff"})]),focusRegen:()=>ke([A(ui,{fill:"#5cc8ff"}),A("M20 19v9M15.5 23.5h9",{stroke:"#eef8ff"})]),defense:()=>ke([A("M20 4l13 4.5v9.5c0 9-5.5 14.5-13 18-7.5-3.5-13-9-13-18V8.5z",{fill:"#a6dbff"})]),speed:()=>ke([A("M4 13h13M4 20h9M4 27h13",{stroke:"#9ceab4"}),A("M22 9l12 11-12 11z",{fill:"#9ceab4"})]),dodge:()=>ke([A("M9 31C9 16 17 8 32 8",{"stroke-dasharray":"1 7"}),A("M24 4l9 4-5 8",{stroke:"#cdeeff"})]),find:()=>ke([A("M20 4l13 16-13 16L7 20z",{fill:"#ffdc6b"})])},Xe={lock:()=>ke([Rt(8,18,24,17,{rx:2,fill:"#dff0ff"}),A("M13 18v-5a7 7 0 0 1 14 0v5")]),open:()=>ke([Rt(8,18,24,17,{rx:2}),A("M13 18v-5a7 7 0 0 1 13.5-2.5")]),parts:()=>ke([Ae(20,20,6),A("M20 4v6M20 30v6M4 20h6M30 20h6M8.5 8.5l4.5 4.5M27 27l4.5 4.5M31.5 8.5L27 13M13 27l-4.5 4.5",{stroke:"#b9f0ff"})]),hone:()=>ke([A("M8 24l12-12 12 12M8 34l12-12 12 12",{stroke:"#ffd772"})]),relic:()=>ke([A("M20 3l11 9-4 21H13L9 12z",{fill:"#e3b0ff"}),A("M9 12h22M20 3v30",{stroke:"#5a2f86","stroke-width":2})]),swap:()=>ke([A("M6 14h24l-6-6M34 26H10l6 6")]),warn:()=>ke([A("M20 5l16 29H4z",{stroke:"#ffb3a3"}),A("M20 16v8M20 29v.5",{stroke:"#ffb3a3"})]),lend:()=>ke([A("M20 4l4.5 10L35 15.5l-7.5 7.5 2 11L20 28.5 10.5 34l2-11L5 15.5 15.5 14z",{fill:"#ffc45e"})]),lift:()=>ke([A("M20 33V9M10 18l10-10 10 10",{stroke:"#10214f"}),A("M8 34h24",{stroke:"#10214f"})]),deeper:()=>ke([A("M20 5v24M10 20l10 10 10-10",{stroke:"#ffc45e"}),A("M6 35h28",{stroke:"#ffc45e","stroke-dasharray":"3 4"})]),coin:()=>ke([Ae(20,20,13,{stroke:"#ffdc6b"}),A("M20 12l6 8-6 8-6-8z",{fill:"#ffdc6b",stroke:"#ffdc6b"})]),pack:()=>ke([Rt(9,13,22,21,{rx:3}),A("M15 13v-3a5 5 0 0 1 10 0v3M9 21h22")])},xr={might:s=>ae([A("M10 20h20",{"stroke-width":3.4}),Rt(9,11,5,18,{rx:1.5,fill:"#ffab98"}),Rt(26,11,5,18,{rx:1.5,fill:"#ffab98"}),A("M5 15v10M35 15v10",{"stroke-width":3})],{cls:s}),grace:s=>ae([A("M32 5C17 7 9 17 8 33c13-2 22-10 24-28z",{fill:"#ffcc74"}),A("M8 33L27 11",{"stroke-width":1.6}),A("M14 26l-1-7M19 21l-1-7M24 15.5l-1-5M14.5 26.5l7 1M19.5 21.5l6 1",{"stroke-width":1.4})],{cls:s}),vigor:s=>ae([A("M20 4l13 4.5v9.5c0 9-5.5 14.5-13 18-7.5-3.5-13-9-13-18V8.5z",{fill:"#86c06a"}),A("M20 13v12M14 19h12",{stroke:"#f1ebdc","stroke-width":3.4})],{cls:s}),mind:s=>ae([A("M20 3l4.5 12.5L37 20l-12.5 4.5L20 37l-4.5-12.5L3 20l12.5-4.5z",{fill:"#86e6dc"}),Ae(20,20,3,{fill:"#f1ebdc","stroke-width":1.4})],{cls:s})};function Vd(s){const e=Wd[s];return e?e():s==="might"||s==="grace"||s==="vigor"||s==="mind"?xr[s]("ico"):null}const Xd={ember:()=>ae([A("M21 3c1 7 9 10 9 19a10 10 0 0 1-20 0c0-4 2-7 4-9 0 4 2 6 4 6-1-6 0-11 3-16z",{fill:"#ff8a70"}),A("M20 34a4.5 4.5 0 0 1-4.5-4.5c0-3 2.5-4 4.5-7.5 2 3.5 4.5 4.5 4.5 7.5A4.5 4.5 0 0 1 20 34z",{fill:"#ffd772","stroke-width":1.2})]),shell:()=>ae([A("M4 28a16 16 0 0 1 32 0z",{fill:"#ffcc74"}),A("M20 12v16M11.5 15l4 13M28.5 15l-4 13",{"stroke-width":1.5}),A("M3 32h34",{"stroke-width":2.6})]),tide:()=>ae([A("M3 15c4-5 8-5 11.5 0s7.5 5 11 0 7-4.5 11.5-1",{stroke:"#86e6dc","stroke-width":2.8}),A("M3 24c4-5 8-5 11.5 0s7.5 5 11 0 7-4.5 11.5-1",{"stroke-width":2.2}),A("M3 33c4-5 8-5 11.5 0s7.5 5 11 0 7-4.5 11.5-1",{stroke:"#86e6dc","stroke-width":1.8})])},jd={display:()=>ae([Rt(4,7,32,21,{fill:"#1c3a80"}),A("M14 34h12M20 28v6"),A("M9 22l6-7 5 5 4-3 7 6",{stroke:"#ffc45e","stroke-width":1.6})]),sound:()=>ae([A("M6 16h6l8-7v22l-8-7H6z",{fill:"#88b4d8"}),A("M25 14a8 8 0 0 1 0 12M29 10a13 13 0 0 1 0 20")]),controls:()=>ae([A("M15 5h10v10h10v10H25v10H15V25H5V15h10z",{fill:"#1c3a80"}),Ae(20,20,3,{fill:"#ffc45e","stroke-width":1.2})]),access:()=>ae([Ae(20,20,16),Ae(20,11,2.6,{fill:"#dff0ff","stroke-width":1}),A("M11 16.5h18M20 16.5v8M20 24.5l-5 8M20 24.5l5 8",{"stroke-width":2.4})]),saves:()=>ae([A("M7 6h21l6 6v22H7z",{fill:"#1c3a80"}),A("M12 6v9h13V6",{"stroke-width":1.6}),Rt(12,21,16,13,{fill:"#f1ebdc","stroke-width":1.4}),A("M15 26h10M15 30h6",{stroke:"#14295f","stroke-width":1.6})])},Xn={gear:es.frame,contract:()=>ae([A("M9 4h15l7 7v25H9z",{fill:"#f1ebdc"}),A("M24 4v7h7",{"stroke-width":1.6}),A("M14 17h12M14 22h12M14 27h6",{stroke:"#14295f","stroke-width":1.8}),Ae(26,29,4,{fill:"#ff8a70",stroke:"#14295f","stroke-width":1.4})]),guide:()=>ae([A("M20 9c-4-3-9-3-14-2v24c5-1 10-1 14 2 4-3 9-3 14-2V7c-5-1-10-1-14 2z",{fill:"#1c3a80"}),A("M20 9v24",{"stroke-width":1.6}),A("M10 14h6M10 19h6M24 14h6M24 19h6",{stroke:"#ffc45e","stroke-width":1.6})]),menu:()=>ae([A("M7 11h26M7 20h26M7 29h26",{"stroke-width":3.2})]),character:()=>ae([Ae(20,13,7,{fill:"#f1ebdc"}),A("M7 35c0-9 6-13 13-13s13 4 13 13z",{fill:"#d64634"})]),lumen:()=>ae([Ae(20,20,5.5,{fill:"#fff3c4"}),mr(20,20,14,5,{fill:"none",transform:"rotate(-24 20 20)"}),A("M20 6v4M20 30v4M8 12l3 2.5M29 25.5l3 2.5")])},Ss={attack:()=>ae([A("M14 23L29 6h5v5L17 26z",{fill:"#f1ebdc"}),A("M17.5 22.5L30 10",{"stroke-width":1.4}),A("M10 19l11 11",{"stroke-width":3}),A("M13.5 26.5L8 32",{stroke:"#d64634","stroke-width":4}),Ae(6.5,33.5,2,{fill:"#e2b034"})],{cls:"i-attack"}),talk:()=>ae([A("M6 8h28v18H20l-8 7v-7H6z",{fill:"#f1ebdc"}),A("M12 14.5h16M12 20h10",{"stroke-width":1.6})],{cls:"i-talk"}),jump:()=>ae([A("M20 29V8",{"stroke-width":3.6}),A("M11 17l9-9 9 9",{"stroke-width":3.6}),A("M9 35h22",{stroke:"#ffc45e","stroke-width":2.8})]),next:()=>ae([Ae(20,20,4.5,{fill:"#d64634"}),A("M8 17a12.5 12.5 0 0 1 22-6M32 23a12.5 12.5 0 0 1-22 6"),A("M31 4v8h-8M9 36v-8h8")])},Zd=()=>st("svg",{viewBox:"0 0 16 16","aria-hidden":"true"},st("path",{d:"M8 14C3 10 1.5 7.4 2.6 5c1-2.2 4-2.1 5.4.2 1.4-2.3 4.4-2.4 5.4-.2 1.1 2.4-.4 5-5.4 9z",fill:"#d8584a",stroke:"#623c1e","stroke-width":1.3,"stroke-linejoin":"round"})),Jd=()=>st("svg",{viewBox:"0 0 16 16","aria-hidden":"true"},st("path",{d:"M8 1.6c2.4 3.2 4.6 5.6 4.6 8.2a4.6 4.6 0 0 1-9.2 0c0-2.6 2.2-5 4.6-8.2z",fill:"#4f86b4",stroke:"#623c1e","stroke-width":1.3,"stroke-linejoin":"round"})),Qd=()=>st("svg",{class:"floor",viewBox:"0 0 200 200",preserveAspectRatio:"none","aria-hidden":"true"},[st("ellipse",{class:"disc",cx:100,cy:100,rx:64,ry:64}),st("ellipse",{class:"ring-a",cx:100,cy:100,rx:98,ry:98}),st("ellipse",{class:"ring-b",cx:100,cy:100,rx:80,ry:80})]),wr="lumenwake.settings.v1",eh=[1,1.15,1.3],th=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return!1}},vi=()=>({quality:"auto",shake:1,numbers:!0,master:1,music:1,sfx:1,ambience:1,mute:!1,calm:th(),text:1,skip:!1,contrast:!1});function $n(s){return typeof s=="number"&&Number.isFinite(s)?Math.min(1,Math.max(0,s)):void 0}function Un(s){return typeof s=="boolean"?s:void 0}const Co={quality:s=>s==="auto"||s==="high"||s==="low"?s:void 0,shake:$n,master:$n,music:$n,sfx:$n,ambience:$n,numbers:Un,mute:Un,calm:Un,skip:Un,contrast:Un,text:s=>{const e=Number(s);return eh.includes(e)?e:void 0}};function nh(){try{const s=JSON.parse(localStorage.getItem(wr)||"{}"),e={};for(const t of Object.keys(Co))if(s&&t in s){const n=Co[t](s[t]);n!==void 0&&sh(e,t,n)}return e}catch{return{}}}function sh(s,e,t){s[e]=t}function gi(s){try{localStorage.setItem(wr,JSON.stringify(s))}catch{}}function oh(s){let e=nh();const t={...vi(),...e};s.settings=t;const n=document.documentElement,o=document.body,a=s.renderer,i=a.quality,r=s.cinema.quiet,c=()=>{s.bus.emit("volume",{master:t.master,music:t.music,sfx:t.sfx,ambience:t.ambience})},d={quality(f){if(f==="auto"){a.autoAdapt=!0,a.quality=i;return}a.autoAdapt=!1,a.quality=f,a.scale=f==="high"?Math.max(1,_e.SCALE_START):_e.SCALE_LITE,a.resize(a.size.cssW,a.size.cssH,a.size.dpr)},shake(){},numbers(f){o.classList.toggle("no-numbers",!f)},master:c,music:c,sfx:c,ambience:c,mute(f){s.bus.emit("sound",!f)},calm(f){s.reducedMotion=f,o.classList.toggle("calm",f)},text(f){n.style.setProperty("--ui-scale",String(f)),n.style.setProperty("--hud-scale",String(Math.round((1+(f-1)/2)*1e3)/1e3))},skip(f){s.cinema.quiet=f||r},contrast(f){o.classList.toggle("contrast",f)}},h=f=>{d[f](t[f])},u={values:t,set(f,p){const m=Co[f](p);m===void 0||t[f]===m||(t[f]=m,e[f]=m,gi(e),d[f](m),s.bus.emit("settings",{key:f,value:m}))},reset(){e={},gi(e),Object.assign(t,vi());for(const f of Object.keys(d))h(f);s.bus.emit("settings",{key:null})}};for(const f of Object.keys(d))h(f);return u}let po=null;function ah(){if(po===null){const s=document.createElement("div");s.style.cssText="position:fixed;left:0;top:0;width:10px;height:10px;zoom:2;visibility:hidden;pointer-events:none",document.body.appendChild(s),po=s.getBoundingClientRect().width>15,s.remove()}return po}function ea(s){const e=s.getBoundingClientRect();if(ah())return e;let t=1;for(let n=s;n&&n.nodeType===1;n=n.parentElement){const o=getComputedStyle(n);t*=parseFloat(o.zoom||"1")||1}return t===1?e:{left:e.left*t,top:e.top*t,right:e.right*t,bottom:e.bottom*t,width:e.width*t,height:e.height*t}}const Dt=4,ih=44,bi={"":[27,22],hurt:[27,22],crit:[38,30],heal:[22,18],xp:[20,18],miss:[20,18],rot:[19,16]};function rh(s){return s.gear?s.gear.rarity>=2:s.item==="core"}class lh{game;root;floatRoot;nodes=new Map;floaters=[];pool=[];hud=[];hudAge=99;hudSig=-1;unsubs=[];constructor(e,t,n){this.game=e,this.root=t,this.floatRoot=n;const o=e.bus;this.unsubs.push(o.on("damage",a=>this.float(a.target,String(a.amount),a.target.kind==="player"?"hurt":a.soft?"rot":a.crit?"crit":"")),o.on("miss",a=>this.float(a.target,a.text,"miss")),o.on("xp",a=>{const i=e.player;this.floatAt(i.x,i.y+2.5,i.z,`+${a.amount} xp`,"xp")}),o.on("heal",a=>{a.focus||this.floatAt(a.entity.x,a.entity.y+2.1,a.entity.z,"Mended","heal")}))}float(e,t,n){let o=0;for(const i of this.floaters)i.e===e&&i.t<.5&&o++;const a=o?(o%2?1:-1)*Math.ceil(o/2)*36:0;this.push(e,0,0,0,t,n,a)}floatAt(e,t,n,o,a){this.push(null,e,t,n,o,a,0)}push(e,t,n,o,a,i,r){const c=this.pool.pop()||this.floatRoot.appendChild(document.createElement("div"));c.className=i?`fl ${i}`:"fl",c.textContent=a,c.style.display="";const d=(bi[i]||bi[""])[this.game.touch?1:0];this.floaters.push({e,x:t,y:n,z:o,dx:r,ph:0,el:c,t:0,life:i==="crit"?1.1:.9,w:a.length*d*.58+8,h:d+2,up:0})}readHud(){const e=this.hud;e.length=0;const t=document.querySelectorAll("#ui > section:not(#log), #hero > section, #hero > nav, #log p, #toast.show, #place, body.touch #hotbar .slot");for(const n of t){if(n.hidden)continue;const o=ea(n);o.width>2&&o.height>2&&e.push({l:o.left,t:o.top,r:o.right,b:o.bottom,hud:!0})}}update(e){const t=this.game,n=t.camera,o=t.player,a=t.renderer.size.cssW,i=t.renderer.size.cssH,r=document.getElementById("toast"),c=document.getElementById("log"),d=document.getElementById("target"),h=document.getElementById("tracker"),u=(r&&r.classList.contains("show")?1+(r.textContent?.length||0)*64:0)+(d&&!d.hidden?2:0)+(h&&!h.hidden?4:0)+(c?c.childElementCount*8:0);(u!==this.hudSig||(this.hudAge+=e)>.5)&&(this.hudSig=u,this.hudAge=0,this.readHud());const f=[],p=(b,_,z,C,k)=>{const P=C-z,w=P-k;for(const y of this.hud)if(b<y.r+Dt&&_>y.l-Dt&&w<y.b+Dt&&P>y.t-Dt)return y;for(const y of f)if(b<y.r+Dt&&_>y.l-Dt&&w<y.b+Dt&&P>y.t-Dt)return y;return null},m=t.tutorial.goal,v=[];for(const b of t.entities.list){if(b.kind==="player"||b.dead||b.grow<.6)continue;const _=Math.hypot(b.x-o.x,b.z-o.z),z=m===b;let C=!1;if(b.kind==="npc")C=_<30;else if(b.kind==="monster"){const y=b;C=!y.boss&&_<40&&(z||y.hover||y===o.target||y.hp<y.maxHp||y.elite||y.ai.state==="chase"||y.ai.state==="attack")}else if(b.kind==="drop"){const y=b;C=_<9&&y.age>.4}else b.kind==="site"&&(C=_<16);if(!C)continue;const k=n.project(b.x,b.y+b.height+.25+b.lift,b.z);if(!k||k.x<-.1||k.x>1.1||k.y<-.1||k.y>1.1)continue;const P=b.kind==="monster"&&b.elite,w=b===o.target?0:z?.5:b.hover?1:b.kind==="npc"?2+_*.01:b.kind==="drop"?200+_:(P?5:10)+_;v.push({e:b,x:k.x*a,y:k.y*i,rank:w,marked:z})}v.sort((b,_)=>b.rank-_.rank);const g=new Set;for(const b of v){const _=b.e;g.add(_.id);let z=this.nodes.get(_.id);if(!z){const M=this.root.appendChild(document.createElement("div"));let R="np";_.kind==="npc"?R+=" npc":_.kind==="drop"?R+=rh(_)?" loot rare":" loot":_.kind==="site"?R+=" site":_.kind==="monster"&&_.elite&&(R+=" elite"),M.className=R;let E=null;if(_.kind==="monster"){M.appendChild(document.createTextNode(_.name));const U=document.createElement("small");U.textContent=`Lv ${_.level}`,M.appendChild(U);const Q=document.createElement("span");Q.className="mini",E=document.createElement("i"),Q.appendChild(E),M.appendChild(Q)}else if(_.kind==="npc"){M.appendChild(document.createTextNode(_.name));const U=document.createElement("small");U.textContent=_.title||"",M.appendChild(U)}else M.textContent=_.name;z={el:M,fill:E,hp:-1,w:M.offsetWidth,h:M.offsetHeight,lift:0,shown:!0,goal:!1},this.nodes.set(_.id,z)}z.goal!==b.marked&&(z.goal=b.marked,z.el.classList.toggle("goal",z.goal));const C=b.x-z.w/2,k=b.x+z.w/2;let P=0,w=!1;for(let M=0;M<6&&!w;M++){const R=p(C,k,P,b.y,z.h);if(!R)w=!0;else{if(R.hud||P>90)break;P=b.y-R.t+Dt}}if(w!==z.shown&&(z.shown=w,z.el.style.visibility=w?"":"hidden",w||(z.lift=0)),!w)continue;let y=P;z.lift>P&&(y=Math.max(P,z.lift-120*e),p(C,k,y,b.y,z.h)&&(y=P)),z.lift=y,f.push({l:C,r:k,t:b.y-y-z.h,b:b.y-y}),z.el.style.transform=`translate(${b.x.toFixed(1)}px, ${(b.y-z.lift).toFixed(1)}px) translate(-50%, -100%)`,z.fill&&z.hp!==_.hp&&(z.hp=_.hp,z.fill.style.transform=`scaleX(${Math.max(0,_.hp/_.maxHp).toFixed(3)})`)}for(const[b,_]of this.nodes)g.has(b)||(_.el.remove(),this.nodes.delete(b));let x=0;for(const b of this.floaters){b.t+=e;const _=b.t/b.life;if(_>=1){b.el.style.display="none",this.pool.push(b.el);continue}let z=0,C=0,k=null;if(b.e){const P=b.e,w=this.nodes.get(P.id);w&&(b.ph=w.shown?w.h+w.lift:0);const y=P.hitY?P.hitY+1.2:P.height+.25+(P.lift||0);k=P.hitY?n.project(P.x+(o.x-P.x)*.5,P.y+y,P.z+(o.z-P.z)*.5):n.project(P.x,P.y+y,P.z),k&&(z=k.x*a+b.dx,C=k.y*i-b.ph-3-_*ih)}else k=n.project(b.x,b.y+_*1.1,b.z),k&&(z=k.x*a,C=k.y*i+b.h/2);if(k){const P=z-b.w/2,w=z+b.w/2;for(let y=0;y<6;y++){const M=C-b.up,R=M-b.h;let E=null;for(const U of f)if(P<U.r+2&&w>U.l-2&&R<U.b+2&&M>U.t-2){E=U;break}if(!E)break;b.up=C-E.t+3}f.push({l:P,r:w,t:C-b.up-b.h,b:C-b.up}),b.el.style.transform=`translate(${z.toFixed(1)}px, ${(C-b.up).toFixed(1)}px) translate(-50%, -100%)`,b.el.style.opacity=_<.6?"1":(1-(_-.6)/.4).toFixed(2)}else b.el.style.opacity="0";this.floaters[x++]=b}this.floaters.length=x}destroy(){for(const e of this.unsubs)e();this.unsubs.length=0;for(const e of this.nodes.values())e.el.remove();this.nodes.clear();for(const e of this.floaters)e.el.remove();this.floaters.length=0;for(const e of this.pool)e.remove();this.pool.length=0}}const mo=.16;function ch(s,e){const t=()=>{s.touch=!0,document.body.classList.add("touch"),e()};let n=null;s.touch?t():(n=a=>{a.pointerType==="touch"&&(n&&removeEventListener("pointerdown",n,!0),n=null,t())},addEventListener("pointerdown",n,!0));const o=()=>{};return addEventListener("touchstart",o,{passive:!0}),()=>{n&&removeEventListener("pointerdown",n,!0),removeEventListener("touchstart",o)}}function dh(s,e){const t=e.querySelector(".base"),n=e.querySelector(".nub");if(!t||!n)return()=>{};const o=s.input.stick;let a=null,i=0,r=0,c=40;const d=p=>{if(p.pointerId!==a)return;const m=p.clientX-i,v=p.clientY-r,g=Math.hypot(m,v),x=g>c?c/g:1;n.style.transform=`translate(${(m*x).toFixed(1)}px, ${(v*x).toFixed(1)}px)`;const b=Math.min(1,g/c),_=b<mo?0:.42+.58*(b-mo)/(1-mo);o.x=g?m/g*_:0,o.y=g?-v/g*_:0},h=p=>{p&&p.pointerId!==a||(a=null,o.x=0,o.y=0,t.style.left="",t.style.top="",t.style.right="",t.style.bottom="",n.style.transform="",e.classList.remove("held"))},u=p=>{if(a!==null)return;a=p.pointerId;try{e.setPointerCapture(a)}catch{}const m=e.getBoundingClientRect(),v=t.offsetWidth/2;c=v*.62,i=ue(p.clientX,m.left+v,Math.max(m.left+v,m.right-v)),r=ue(p.clientY,m.top+v,Math.max(m.top+v,m.bottom-v)),t.style.left=`${i-m.left-v}px`,t.style.top=`${r-m.top-v}px`,t.style.right="auto",t.style.bottom="auto",e.classList.add("held"),d(p),p.preventDefault()},f=()=>h();return e.addEventListener("pointerdown",u),e.addEventListener("pointermove",d),e.addEventListener("pointerup",h),e.addEventListener("pointercancel",h),e.addEventListener("lostpointercapture",h),addEventListener("blur",f),()=>{h(),e.removeEventListener("pointerdown",u),e.removeEventListener("pointermove",d),e.removeEventListener("pointerup",h),e.removeEventListener("pointercancel",h),e.removeEventListener("lostpointercapture",h),removeEventListener("blur",f)}}const vo="http://www.w3.org/2000/svg";function yi(){const s=document.createElementNS(vo,"svg");s.setAttribute("viewBox","0 0 44 30");const e=document.createElementNS(vo,"path");e.setAttribute("d","M8 7l14 16 14-16"),e.setAttribute("fill","none"),e.setAttribute("stroke","#070d1f"),e.setAttribute("stroke-width","10"),e.setAttribute("stroke-linecap","round"),e.setAttribute("stroke-linejoin","round");const t=document.createElementNS(vo,"path");return t.setAttribute("d","M8 7l14 16 14-16"),t.setAttribute("fill","none"),t.setAttribute("stroke","#ffc45e"),t.setAttribute("stroke-width","5"),t.setAttribute("stroke-linecap","round"),t.setAttribute("stroke-linejoin","round"),s.append(e,t),s}function hh(s){return"kind"in s&&s.kind!==void 0}function fh(s,e,t){e.replaceChildren(),t.replaceChildren();const n=yi(),o=document.createElement("b");e.append(n,o),t.append(yi()),e.hidden=!0,t.hidden=!0;let a=null,i=null,r=null,c=[],d=0,h=!1;const u=g=>g instanceof HTMLElement&&g.getClientRects().length>0,f=()=>{const g=document.querySelector("#panels .win");g||(h=!1);let x=null;for(const _ of c){const z=document.querySelector(_);if(u(z)){if(!g||g.contains(z))return z;x=x||z}}if(!g)return x;if(!h)return null;const b=g.querySelector(".x");return u(b)?b:null},p=(g,x)=>{r&&(delete r.dataset.hint,r=null);const b=s.touch&&x!==void 0?x:g;c=b?typeof b=="string"?[b]:b:[],d=0},m=s.bus,v=[m.on("guide",g=>{if(a=g,!g){p(null),h=!1,e.hidden=!0,t.hidden=!0;return}h=!!document.querySelector("#panels .win"),p(g.spot,g.touchSpot)}),m.on("guide:goal",g=>{i=g,g||(e.hidden=!0)}),m.on("guide:tip",g=>{g&&g.spot&&!a?p(g.spot,g.touchSpot):!g&&!a&&p(null)}),m.on("frame",g=>{if((c.length||h||r)&&(d-=g)<=0){d=.2;const E=f();E!==r&&(r&&delete r.dataset.hint,r=E,E&&(E.dataset.hint="1",E.closest("#panels .win-body")&&E.scrollIntoView&&E.scrollIntoView({block:"nearest",behavior:s.reducedMotion?"auto":"smooth"})))}if(r&&r.isConnected&&r.matches("button, .slot, #lumen")){const E=ea(r),U=E.top+E.height/2<innerHeight*.3;t.hidden=!1,t.className=U?"under":"",t.style.transform=`translate(${(E.left+E.width/2).toFixed(1)}px, ${(U?E.bottom+10:E.top-10).toFixed(1)}px) translate(-50%, ${U?"0":"-100%"})`}else t.hidden||(t.hidden=!0);if(!i||!a){e.hidden||(e.hidden=!0);return}const x=s.camera,b=s.renderer.size.cssW,_=s.renderer.size.cssH,z=s.player,C=hh(i)?i.hitY?i.hitY+1.5:(i.height||1)*(i.kind==="npc"?1:i.scale||1)+.3:1.1,k=x.project(i.x,(i.y??z.y)+C,i.z),P=k&&k.x>.06&&k.x<.94&&k.y>.14&&k.y<.86;if(e.hidden=!1,P){e.className="over",n.style.transform="",o.textContent="",e.style.transform=`translate(${(k.x*b).toFixed(1)}px, ${(k.y*_).toFixed(1)}px) translate(-50%, -100%)`;return}let w,y;if(k)w=(k.x-.5)*b,y=(k.y-.5)*_;else{const E=i.x-z.x,U=i.z-z.z,Q=x.forward,L=Math.hypot(Q[0],Q[2])||1;w=E*x.right[0]+U*x.right[2],y=-(E*Q[0]+U*Q[2])/L}const M=Math.hypot(w,y)||1,R=Math.min((b/2-60)/Math.abs(w/M||1e-6),(_/2-110)/Math.abs(y/M||1e-6));e.className="edge",e.style.transform=`translate(${(b/2+w/M*R).toFixed(1)}px, ${(_/2+y/M*R).toFixed(1)}px) translate(-50%, -50%)`,n.style.transform=`rotate(${(Math.atan2(y,w)-Math.PI/2).toFixed(3)}rad)`,o.textContent=`${Math.round(Math.hypot(i.x-z.x,i.z-z.z))} m`})];return()=>{for(const g of v)g();r&&(delete r.dataset.hint,r=null),e.hidden=!0,t.hidden=!0}}const xi=["","I","II","III","IV","V"],uh={might:"Might",grace:"Grace",vigor:"Vigor",mind:"Mind",attack:"Attack",attackSpeed:"Attack speed",crit:"Crit chance",critDamage:"Crit damage",power:"Technique",maxHp:"Health",maxFocus:"Focus",defense:"Armor",hpRegen:"Health regen",focusRegen:"Focus regen",speed:"Move speed",dodge:"Dodge",find:"Glint found",lifeOnKill:"Life on kill"},It=s=>`/lumenwake/art/${s}.webp`,Kn=s=>`${Math.round(s*100)}%`,kr=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`,ph=s=>{const e=Math.round(s/60);return e<60?`${Math.max(1,e)} min`:`${Math.floor(e/60)} h ${e%60} min`},wi=/<(b|span|em)(?:\s+(class|style)="([^"]*)")?\s*>([\s\S]*?)<\/\1>/gi,mh=/^[a-z0-9\- ]+$/i,vh=/^color:\s*(#[0-9a-f]{3,8}|rgb\([0-9,\s]+\)|var\(--[a-z0-9-]+\))$/i;function gh(s){const e=[];let t=0;wi.lastIndex=0;let n;for(;(n=wi.exec(s))!==null;){n.index>t&&e.push({text:s.slice(t,n.index)});const o=n[1].toLowerCase(),a=n[2]?.toLowerCase(),i=n[3]||"",c={text:n[4],bold:o==="b"};if(o==="em")c.className="c-name";else if(a==="class"&&mh.test(i))c.className=i;else if(a==="style"){const d=vh.exec(i.trim());d&&(c.color=d[1])}e.push(c),t=n.index+n[0].length}return t<s.length&&e.push({text:s.slice(t)}),e}function zr(s){const e=[],t=/(\d+)/g;let n=0,o;for(;(o=t.exec(s))!==null;)o.index>n&&e.push({text:s.slice(n,o.index)}),e.push({text:o[1],className:"c-num",bold:!0}),n=o.index+o[0].length;return n<s.length&&e.push({text:s.slice(n)}),e}function wn(s){return s.skills.list().map((e,t)=>({...e,key:e.key??String(t+1),unlock:e.unlock??Bs[t]??1}))}function bh(s,e){for(const[t]of _n)if(s.equip[t]?.uid===e)return t;return null}function yh({game:s,onLayout:e}){const[t,n]=le(!1),[o,a]=le(null),[i,r]=le(!1),[c,d]=le(""),[h,u]=le(!1),f=me(null);De(()=>{const m=s.bus,v=[m.on("cine:begin",g=>{document.body.classList.toggle("cine",g.blocking),document.body.classList.toggle("cine-bars",g.bars),n(g.skip),e()}),m.on("cine:end",()=>{document.body.classList.remove("cine","cine-bars"),n(!1),r(!1),u(!1),e()}),m.on("cine:card",g=>{if(!g){r(!1);return}r(!1),a({kind:g.kind,title:g.title,sub:g.sub})}),m.on("cine:caption",g=>{g&&d(g),u(!!g)})];return()=>{for(const g of v)g();document.body.classList.remove("cine","cine-bars")}},[s,e]),De(()=>{if(!o)return;const m=f.current;m&&m.offsetWidth,r(!0)},[o]);const p=o?`cine-card ${o.kind}${i?" show":""}`:"cine-card";return l("div",{id:"cine",children:[l("div",{class:"bar top"}),l("div",{class:"bar bottom"}),l("div",{ref:f,id:"cine-card",class:p,role:"status","aria-live":"polite",children:[l("strong",{id:"cine-title",children:o?.title||""}),l("span",{id:"cine-sub",children:o?.sub||""})]}),l("p",{id:"cine-caption",class:h?"show":void 0,role:"status","aria-live":"polite",children:c}),l("button",{type:"button",id:"cine-skip",hidden:!t,"aria-label":"Skip this scene, key Escape",onClick:m=>{s.cinema.askSkip(),m.detail&&m.currentTarget.blur()},children:["Skip",l("kbd",{children:"Esc"})]})]})}function Zs({game:s,what:e,label:t}){const n=me(null);De(()=>{const a=n.current;a&&s.portraits.mount(a,e)},[s,e]);const o=e.split(":")[0];return l("div",{ref:n,class:`figure live stage-${o}`,"data-stage":e,tabIndex:0,role:"img","aria-label":`${t} Drag it, or press the left and right arrow keys, to turn it.`,children:[Qd(),l("canvas",{class:"stage","aria-hidden":"true"}),l("span",{class:"turn-hint","aria-hidden":"true",children:"Drag to turn"})]})}function Mr({offer:s,bare:e=!1}){const t=rn(s);return t.rank?l("div",{class:"threat","data-tip":`Threat ${t.rank} of ${At}. A place you have surveyed is more dangerous next time, and pays more.`,children:[l("span",{class:"threat-pips",role:"img","aria-label":`Threat ${t.rank} of ${At}`,children:Array.from({length:At},(n,o)=>l("i",{class:o<t.rank?"on":void 0},o))}),l("b",{children:t.name}),!e&&t.list.map(n=>l("span",{class:"chip","data-tip":`${n.name}: ${n.text}`,title:n.text,children:n.name},n.id))]}):null}function _r({game:s,offer:e}){const t=Ft(e.biome),n=s.player.sheet;if(e.goal!=="hunt"||!t?.boss||!Ko(t.boss).length||e.first)return l("div",{children:[l("span",{children:"Also"}),l("b",{children:"Gear"})]});const o=Math.round(Zi(e.threat||0,n.relicDry||0)*100);return l("div",{"data-tip":"The chance its elder leaves a relic. It rises with the place’s threat, and after every elder that leaves none.",children:[l("span",{children:"Relic chance"}),l("b",{class:"c-relic",children:[o,"%"]})]})}function xh({game:s,onMutate:e}){const t=s.missions,n=t.active,o=n?n.offer:t.pending,a=s.player.sheet,i=s.world;if(!o)return l("div",{class:"contract-none",children:[l("img",{src:It("place-town"),alt:""}),l("div",{children:[l("h3",{children:"No contract"}),l("p",{children:"Ilse, the dispatcher, has three. She stands before the hall."}),l("p",{class:"quiet",children:["Contracts run: ",l("b",{class:"c-num",children:a.missions||0})]})]})]});const r=Ft(o.biome),c=hs[o.goal],d=o.goal==="hunt"&&r?.boss?r.boss:null,h=d?_t[d]:null,u=rn(o),f=a.boon&&en[a.boon]?en[a.boon]:null,p=n?.offer.depth||1,m=t.run,v=n?n.choosing?"Done: lift out, or go deeper":n.done?"Done: lifting out":p>1?`Depth ${p}`:"On contract":"Contract taken",g=d&&!o.first?Ko(d):[],x=n?n.rooms.filter((z,C)=>i.rooms[C]?.kind==="fight"):[],b=x.filter(z=>z.state==="clear").length,_=(z,C,k)=>l("div",{class:`prog${C>=k?" done":""}`,children:[l("span",{children:z}),l("b",{class:"c-num",children:[C," of ",k]}),l("div",{class:"bar",children:l("i",{style:{transform:`scaleX(${(k?Math.min(1,C/k):0).toFixed(3)})`}})})]},z);return l("div",{class:`contractview${h?" has-elder":""}`,children:[l("header",{class:"contract-banner",children:[l("img",{src:It(`place-${o.biome}`),alt:""}),l("div",{class:"banner-words",children:[l("span",{class:`chip${n&&!n.done?" hot":""}`,children:v}),l("h3",{children:o.name}),l("p",{children:[l("b",{class:"c-place",children:r?.name||o.biome})," ·"," ",l("b",{class:`c-goal-${o.goal}`,children:c.name})," · Level ",l("b",{class:"c-num",children:o.tier})]})]})]}),l("section",{class:"contract-progress",children:[n?l(oe,{children:[l("h3",{class:"label",children:"Progress"}),l("div",{class:"progs",children:[x.length>0&&_("Islands cleared",b,x.length),o.goal==="recover"&&_("Survey cores",n.cores,n.need),o.goal==="hunt"&&l("div",{class:`prog${n.done?" done":""}`,children:[l("span",{children:h?h.name:"The elder"}),l("b",{class:n.done?"c-good":"c-foe",children:n.done?"Down":"On the last island"})]}),n.markNeed>0&&_("Survey marks",n.marks,n.markNeed),m&&p>1&&l("div",{class:"prog",children:[l("span",{children:"Haul so far"}),l("b",{children:[l("span",{class:"c-coin",children:[m.haul.payGlint+m.haul.glint," glint"]})," ·"," ",l("span",{class:"c-num",children:[m.haul.items.length," pieces"]})]})]}),l("div",{class:"prog",children:[l("span",{children:"Beacon"}),l("b",{class:n.revealed?"c-good":"quiet",children:n.revealed?"Found: the rest is on your map":"Not found"})]})]})]}):l(oe,{children:[l("h3",{class:"label",children:"The job"}),l("p",{children:c.brief}),l("p",{class:"quiet",children:"Step onto the pad at the south gate to go down. Once it is done you can lift out, or go deeper for more."})]}),u.rank>0&&l(oe,{children:[l("div",{class:"threat-head",children:[l("h3",{class:"label",children:"This time"}),l(Mr,{offer:o,bare:!0})]}),u.list.length>0&&l("ul",{class:"conds",children:u.list.map(z=>l("li",{children:[l("b",{children:z.name}),z.text]},z.id))})]}),f&&l("div",{class:"card boon-card",children:[l("div",{class:"label",children:"Boon"}),l("p",{children:[l("strong",{class:"c-good",children:f.name})," ",f.desc]})]}),l("div",{class:"contract-pay",children:[l("h3",{class:"label",children:"Pays"}),l("div",{class:"stats pay",children:[l("div",{children:[l("span",{children:"Experience"}),l("b",{class:"c-xp",children:o.xp})]}),l("div",{children:[l("span",{children:"Glint"}),l("b",{class:"c-coin",children:o.glint})]}),n?l(oe,{children:[l("div",{children:[l("span",{children:"Time"}),l("b",{children:kr(n.time)})]}),l("div",{children:[l("span",{children:"Felled"}),l("b",{class:"c-foe",children:n.kills})]})]}):l(_r,{game:s,offer:o})]}),!n&&l("button",{type:"button",class:"btn","data-act":"abandon",onClick:()=>{s.missions.drop(),e()},children:"Hand it back"})]})]}),h&&d&&l("aside",{class:"contract-elder","aria-label":"The elder",children:[l(Zs,{game:s,what:`elder:${d}`,label:`${h.name}.`}),l("div",{class:"who-card",children:[l("strong",{class:"c-foe",children:h.name}),l("small",{children:h.epithet||"An elder"}),l("div",{class:"who-level",children:[l("span",{class:"quiet",children:n?"Holds the last island":"Waits on the last island"}),l("span",{class:n&&n.done?"c-good":"c-foe",children:n&&n.done?"Down":"Standing"})]}),g.length>0&&l("div",{class:"relic-row",children:[l("span",{class:"label",children:"Carries"}),g.map(z=>{const C=!!(a.relics&&a.relics[z.id]);return l("button",{type:"button",class:`chip relic-chip${C?" found":""}`,"data-act":"note","data-tip":`${z.name} (${Fi[z.slot].toLowerCase()})${C?", found":""}: ${z.text}`,title:z.text,children:z.name},z.id)})]})]})]})]})}function wh({game:s,onMutate:e}){const t=s.missions,n=t.pending;return l("div",{class:"boardview",children:[t.offers.map((o,a)=>{const i=Ft(o.biome),r=o.goal==="hunt"&&i?.boss?i.boss:null,c=r?_t[r]:null,d=r?yr(r):"",h=n===o;return l("div",{class:`contract${h?" taken":""}`,children:[l("div",{class:"contract-art",children:[l("img",{src:It(`place-${o.biome}`),alt:""}),l("span",{class:"tier",children:["Level ",l("b",{class:"c-num",children:o.tier})]})]}),l("div",{class:"contract-words",children:[l("strong",{children:o.name}),l("small",{children:l("b",{class:"c-place",children:i?.name||o.biome})}),l("small",{children:[l("b",{class:`c-goal-${o.goal}`,children:hs[o.goal].name}),c&&l(oe,{children:[": ",l("b",{class:"c-foe",children:c.name})]})]}),c&&d&&l("img",{class:"elder-chip",src:d,alt:""})]}),l(Mr,{offer:o}),l("div",{class:"stats pay",children:[l("div",{children:[l("span",{children:"Experience"}),l("b",{class:"c-xp",children:o.xp})]}),l("div",{children:[l("span",{children:"Glint"}),l("b",{class:"c-coin",children:o.glint})]}),l("div",{children:[l("span",{children:"Islands"}),l("b",{children:o.rooms})]}),l(_r,{game:s,offer:o})]}),h?l("button",{type:"button",class:"btn","data-act":"abandon",onClick:()=>{s.missions.drop(),e()},children:"Hand it back"}):l("button",{type:"button",class:`btn${n?"":" primary"}`,"data-act":"accept","data-arg":String(a),"aria-label":`Take ${o.name}`,onClick:()=>{s.missions.accept(a),e()},children:"Take it"})]},`${o.seed}-${a}`)}),l("p",{class:"board-note",hidden:s.player.sheet.first,children:["After the last island you can lift out with the haul, or go deeper: another place below, harder each time, with a stronger elder and more pay. Fall down there and half the haul is lost.",(s.player.sheet.deepest||0)>1&&l(oe,{children:[" ","Your deepest: depth ",l("b",{class:"c-num",children:s.player.sheet.deepest}),"."]})]})]})}function kh({game:s,touch:e,onMutate:t}){const n=s.player,o=n.sheet,a=Gs(o.level),i=o.picks>0&&!!(o.offer&&o.offer.length>0),r=wn(s),c=[["Health",n.maxHp,"Health"],["Focus",n.maxFocus,"Focus: what abilities cost"],["Attack",n.attack.toFixed(0),"Attack: what a blow does"],["Haste",n.attackSpeed.toFixed(2),"Haste: attacks a second"],["Armor",n.defense.toFixed(0),"Armor: taken off every blow"],["Critical",Kn(n.crit),"The chance a blow is critical"],["Crit hit",Kn(n.critDamage),"What a critical blow does, beside a plain one"],["Dodge",Kn(n.dodge),"The chance a blow misses you"],["Power",Kn(n.power),"Technique power: how hard abilities hit"],["Speed",Kn(n.speedMul),"How fast you run"]],d=Array.from(new Set([...Object.keys(o.talents||{}),...Object.keys(o.bonus||{})])).filter(h=>rt(o,h)>0);return l("div",{class:`char${i?" has-offer":""}`,children:[l("section",{class:"char-figure","aria-label":"Who you are",children:[l(Zs,{game:s,what:"hero",label:"Your surveyor."}),l("div",{class:"who-card",children:[l("strong",{class:`c-${o.cls}`,children:n.name||"Surveyor"}),l("small",{children:[wt[o.people||"unit"].name," · ",ze[o.cls].name]}),l("div",{class:"who-level",children:[l("span",{children:["Level ",l("b",{class:"c-num",children:o.level})]}),l("span",{class:"c-xp",children:[o.xp," / ",a]})]}),l("div",{class:"bar xp",role:"img","aria-label":`Experience: ${o.xp} of ${a}`,children:l("i",{style:{transform:`scaleX(${Math.min(1,o.xp/a).toFixed(3)})`}})})]})]}),i&&o.offer&&l("section",{class:"char-offer","aria-label":"A talent to choose",children:[l("h3",{class:"label",children:["Choose a talent",o.picks>1&&l("span",{class:"chip hot",children:[o.picks," to choose"]})]}),l("div",{class:"offer-row",children:o.offer.map(h=>{const u=ot[h],f=rt(o,h);return l("div",{class:"pickcard",children:[l("div",{children:[l("strong",{class:"c-key",children:[u.name,u.max>1?` ${xi[f+1]}`:""]}),l("small",{children:u.desc})]}),l("button",{type:"button",class:"btn primary","data-act":"talent","data-arg":h,"aria-label":`Choose ${u.name}: ${u.desc}`,onClick:()=>{s.chooseTalent(h)&&t()},children:"Choose"})]},h)})})]}),l("div",{class:"char-main",children:[l("section",{children:[l("h3",{class:"label",children:["Attributes"," ",o.points>0&&l("span",{class:"chip hot",children:[o.points," ",o.points===1?"point":"points"," to spend"]})]}),l("div",{class:"attr-grid",children:E0.map(h=>{const u=n.attr[h.id]-o.base[h.id];return l("div",{class:"attr-tile","data-tip":`${h.name}: ${h.hint}`,title:h.hint,children:[xr[h.id](),l("span",{class:"attr-name",children:h.name}),l("span",{class:"attr-val",children:[o.base[h.id],u!==0&&l("u",{children:["+",u]})]}),l("button",{type:"button",class:"plus","data-act":"attr","data-arg":h.id,disabled:!o.points,"aria-label":`Raise ${h.name}: ${h.hint}`,"data-tip":`${h.name}: ${h.hint}`,onClick:()=>{s.spendAttribute(h.id)&&t()},children:"+"})]},h.id)})})]}),l("section",{children:[l("h3",{class:"label",children:"Numbers"}),l("div",{class:"stats",children:c.map(([h,u,f])=>l("div",{"data-tip":f,title:f,children:[l("span",{children:h}),l("b",{children:u})]},h))})]})]}),l("section",{class:"char-side",children:[l("h3",{class:"label",children:"Abilities"}),l("div",{class:"abilities",children:r.map(h=>{const u=o.level>=h.unlock,f=`${h.focus} focus · ready every ${h.cooldown} s`,p=vr[h.icon];return l("div",{class:`ability${u?"":" locked"}`,"data-tip":`${h.name}: ${f}`,title:f,children:[p?p():null,l("div",{children:[l("strong",{children:h.name}),l("small",{children:h.desc})]}),u?e?null:l("kbd",{children:h.key}):l("span",{class:"chip",children:["Level ",h.unlock]})]},h.id)})})]}),l("section",{class:"char-talents",children:[l("h3",{class:"label",children:"Talents"}),l("div",{class:"chips",children:d.length>0?d.map(h=>{const u=ot[h],f=rt(o,h);return l("button",{type:"button",class:"chip","data-act":"note","data-tip":`${u.name}: ${u.desc}`,title:u.desc,children:[u.name,(u.max>1||f>1)&&l(oe,{children:[" ",l("b",{children:xi[f]||f})]})]},h)}):l("span",{class:"quiet",children:"Each level brings a choice of three."})})]})]})}function Tr(s,e,t,n){return l("li",{children:[Vd(s),l("b",{class:t?"c-bad":"c-good",children:e}),l("span",{children:uh[s]||s})]},`${s}-${n}`)}function Eo({game:s,item:e,versus:t}){const n=s.player.sheet,o=ft(e),a=Ki(e),i=kn(e),r=Pn(n.cls,e);return l(oe,{children:[l("div",{class:"detail-head",children:[l("span",{class:`tile${e.relic?" relic":""}`,style:{"--rc":a.color},children:Qo(i)}),l("div",{children:[l("strong",{class:"name",style:{color:o.color},children:o.name}),l("small",{children:[l("span",{style:{color:o.color},children:o.rarity})," ",Fi[o.slot].toLowerCase(),o.family?` · ${Ut[o.family].name}`:"",e.relic?` · ${o.base}`:""]})]}),l("span",{class:"lv-badge","aria-label":`Level ${o.ilvl}`,children:[l("small",{children:"Level"}),l("b",{children:o.ilvl})]})]}),o.relic&&l("section",{class:"item-sec relic-power",children:[l("h4",{class:"sec-label",children:[Xe.relic(),"Relic power"]}),l("p",{children:o.relic})]}),l("section",{class:"item-sec",children:[l("h4",{class:"sec-label",children:"Gives"}),l("ul",{class:"stat-rows",children:o.rows.map((c,d)=>Tr(c.stat,c.v,c.bad,d))})]}),o.lends&&l("section",{class:"item-sec lends",children:[l("h4",{class:"sec-label",children:[Xe.lend(),"Lends a talent"]}),l("p",{children:[l("b",{class:"c-key",children:[o.lends.name,o.lends.ranks>1?` +${o.lends.ranks}`:""]})," ",o.lends.desc]})]}),!r&&l("p",{class:"item-note c-bad",children:[Xe.warn(),"Not for your class."]}),t]})}function Ao({game:s,item:e,ctx:t,itemKey:n,selected:o,onPick:a}){const i=s.player.sheet,r=ft(e),c=Ki(e),d=!Pn(i.cls,e),h=(n.startsWith("gear:")||n.startsWith("stock:"))&&!d?Uo(i,e).verdict:0,u=h>0?"up":h<0&&e.rarity<3?"down":"",f=`${r.name} · ${c.name} ${r.slot} · level ${r.ilvl}${u==="up"?" · better than what you wear":u==="down"?" · no better than what you wear":""}${e.lock?" · locked":""}`;return l("button",{type:"button",class:`tile${d?" cannot":""}${e.relic?" relic":""}`,style:{"--rc":c.color},"data-act":"pick","data-ctx":t,"data-key":n,"aria-pressed":o?"true":"false","aria-label":`${f.replace(/ · /g,", ")}${d?", not for your class":""}`,"data-tip":f,onClick:()=>{a(t,n),s.bus.emit("ui:click")},children:[Qo(kn(e)),u&&l("i",{class:`mark ${u}`,"aria-hidden":"true"}),e.lock&&l("i",{class:"mark lock","aria-hidden":"true"}),l("span",{class:"lv",children:r.ilvl})]})}function ta({game:s,stack:e,ctx:t,itemKey:n,selected:o,onPick:a}){const i=Ce[e.id];return l("button",{type:"button",class:"tile","data-act":"pick","data-ctx":t,"data-key":n,"aria-pressed":o?"true":"false","aria-label":`${i.name}, ${e.n}`,"data-tip":`${i.name}${i.desc?` · ${i.desc}`:""}`,onClick:()=>{a(t,n),s.bus.emit("ui:click")},children:[is(i),l("span",{class:"count",children:e.n})]})}function ki(s){return s in cs}function na({game:s,ctx:e,selectedKey:t,onPick:n,onMutate:o}){const a=s.player,i=a.sheet,[r,c=""]=t.split(":");let d=null,h=null;if(r==="worn")d=i.equip[c]||null;else if(r==="gear")d=i.gear.find(x=>String(x.uid)===c)||null;else if(r==="stock")d=s.missions.stock[Number(c)]||null;else if(r==="bag"||r==="food"){const x=i.bag.find(b=>b.id===c)||null;x&&(e!=="food"||ki(x.id))&&(h=x)}const u=e==="food"?"Selected food":"Selected";if(!d&&!h)return l("aside",{class:"detail","data-for":e,"aria-label":u,"aria-live":"polite",children:l("p",{class:"quiet",children:e==="food"?"Nothing to feed it. It eats what creatures drop.":e==="shop"?"Select a piece to see it.":"Nothing carried yet. Creatures, pods and contracts pay in gear."})});if(d){const x=d,b=r==="worn";let _=null;if(!b&&Pn(i.cls,x)){const k=Uo(i,x),P=k.worn,w=k.lines.length>6?k.lines.slice(0,5):k.lines,y=k.lines.length-w.length,M=P&&P.relic?`You lose ${ft(P).name}’s power.`:P&&P.power?"You lose the talent it lends.":"",R=P?ft(P):null,E=U=>`${U.up?"+":"−"}${Math.abs(U.by)>=10||U.pct?Math.round(Math.abs(U.by)):Math.round(Math.abs(U.by)*10)/10}${U.pct?"%":""}`;_=l("section",{class:"item-sec versus",children:[l("h4",{class:"sec-label",children:[Xe.swap(),"If worn",R&&l(oe,{children:[" ",l("span",{class:"quiet",children:["in place of ",l("b",{style:{color:R.color},children:R.name})]})]})]}),w.length>0?l("ul",{class:"stat-rows",children:[w.map((U,Q)=>Tr(U.stat,E(U),!U.up,Q)),y>0&&l("li",{class:"more quiet",children:["and ",y," more"]})]}):l("p",{class:"quiet",children:"No change to your numbers."}),M&&l("p",{class:"item-note c-bad",children:[Xe.warn(),M]})]})}const z=k=>{const P=$o(x),w=Xi(i,x),y=l("div",{class:"hone-row",children:[l("span",{class:"hone-to",children:w?l("span",{class:"quiet",children:w}):l(oe,{children:["Hone to ",l("b",{class:"c-num",children:x.ilvl+1}),l("span",{class:"cost",children:[Xe.parts(),l("b",{class:"c-parts",children:P.parts})]}),l("span",{class:"cost coin",children:l("b",{class:"c-coin",children:P.glint})})]})}),l("button",{type:"button",class:"btn small","data-act":"hone","data-arg":k,disabled:!!w,"aria-label":`Hone to level ${x.ilvl+1} for ${P.parts} parts and ${P.glint} glint`,"data-tip":w||`Raises it to level ${x.ilvl+1}, as if it had dropped a level higher: ${P.parts} parts and ${P.glint} glint.`,onClick:()=>{s.loot.hone(k),o()},children:[Xe.hone(),"Hone"]})]});if(b){const E=k.slice(5),U=i.gear.length>=Mt;return l("div",{class:"gear-tools",children:[y,l("div",{class:"tool-row worn-row",children:[l("span",{class:"tag",children:"Worn"}),E!=="weapon"&&l("button",{type:"button",class:"btn small","data-act":"unequip","data-arg":E,disabled:U,"data-tip":U?"Your pack is full.":"Takes it off, into your pack.",onClick:()=>{if(s.loot.unequip(E)){const Q=i.gear[i.gear.length-1];Q&&n("gear",`gear:${Q.uid}`)}o()},children:[Xe.swap(),"Take off"]})]})]})}const M=Ks(x),R=Pn(i.cls,x);return l("div",{class:"gear-tools",children:[y,l("div",{class:"tool-row",children:[l("button",{type:"button",class:"btn small","data-act":"lock","data-arg":String(x.uid),"aria-pressed":x.lock?"true":"false","aria-label":x.lock?"Locked. Unlock it":"Lock it","data-tip":x.lock?"Locked: it cannot be salvaged or sold. Press to let it go.":"Lock it, so it is never salvaged or sold by mistake.",onClick:()=>{s.loot.lock(x.uid),o()},children:[x.lock?Xe.lock():Xe.open(),x.lock?"Locked":"Lock"]}),l("button",{type:"button",class:"btn small","data-act":"salvage","data-arg":String(x.uid),disabled:!!x.lock,"aria-label":`Salvage for ${M} parts`,"data-tip":x.lock?"Locked. Unlock it first.":`Takes it apart for ${M} parts. Parts hone the pieces you keep.`,onClick:()=>{s.loot.salvage(x.uid),o()},children:[Xe.parts(),"Salvage ",l("b",{class:"c-parts",children:["+",M]})]}),l("button",{type:"button",class:"btn primary","data-act":"equip","data-arg":String(x.uid),disabled:!R,onClick:()=>{if(s.loot.equip(x.uid)){const E=bh(i,x.uid);E&&n("gear",`worn:${E}`)}o()},children:"Equip"})]})]})};let C;if(b)C=e==="gear"?z(t):l("span",{class:"tag",children:"Worn"});else if(r==="gear"){const k=ft(x).value;C=e==="shop"?l(oe,{children:[l("span",{class:"quiet",children:x.lock?"Locked: unlock it in the Gear tab":"Yours"}),l("button",{type:"button",class:"btn primary","data-act":"sellgear","data-arg":String(x.uid),disabled:!!x.lock,onClick:()=>{s.loot.sellGear(x.uid),o()},children:["Sell · ",k]})]}):z(t)}else{const k=Vi(x),P=i.gear.length>=Mt,w=Number(c);C=l(oe,{children:[l("span",{class:"quiet",children:P?"Your pack is full":"For sale"}),l("button",{type:"button",class:"btn primary","data-act":"buygear","data-arg":c,disabled:i.glint<k||P,onClick:()=>{s.loot.buyGear(w),o()},children:["Buy · ",k]})]})}return l("aside",{class:"detail","data-for":e,"aria-label":u,"aria-live":"polite",children:[l("div",{class:"detail-body item-card",children:l(Eo,{game:s,item:x,versus:_})}),l("div",{class:"detail-foot",children:C})]})}const f=h,p=Ce[f.id],m=ki(f.id)?cs[f.id]:null,v=m?ko.filter(x=>!!m[x.id]):[];let g;if(e==="shop")g=p.value?l(oe,{children:[l("button",{type:"button",class:"btn","data-act":"sellall","data-arg":f.id,onClick:()=>{s.loot.sell(f.id,s.loot.count(f.id)),o()},children:["Sell all · ",p.value*f.n]}),l("button",{type:"button",class:"btn primary","data-act":"sell","data-arg":f.id,onClick:()=>{s.loot.sell(f.id,1),o()},children:["Sell one · ",p.value]})]}):l("span",{class:"quiet",children:"Bram has no use for it."});else if(e==="food")g=l(oe,{children:[f.n>1?l("button",{type:"button",class:"btn","data-act":"feedall","data-arg":f.id,onClick:()=>{for(let x=s.loot.count(f.id);x>0&&s.companion.feed(f.id);x--);o()},children:["Feed all ",f.n]}):l("span",{}),l("button",{type:"button",class:"btn primary","data-act":"feed","data-arg":f.id,"aria-label":`Feed it one ${p.name}`,onClick:()=>{s.companion.feed(f.id),o()},children:"Feed"})]});else{const x=p.kind==="use"&&(p.effect==="heal"?a.hp>=a.maxHp:a.focus>=a.maxFocus);g=l(oe,{children:[v.length>0?l("button",{type:"button",class:"btn","data-act":"feed","data-arg":f.id,"aria-label":`Feed one ${p.name} to your lumen`,onClick:()=>{s.companion.feed(f.id),o()},children:"Feed lumen"}):l("span",{}),p.kind==="use"&&l("button",{type:"button",class:"btn primary","data-act":"use","data-arg":f.id,disabled:x,title:x?"Nothing to restore":void 0,onClick:()=>{s.loot.use(f.id),o()},children:"Drink"})]})}return l("aside",{class:"detail","data-for":e,"aria-label":u,"aria-live":"polite",children:[l("div",{class:"detail-head",children:[l("span",{class:"tile",children:is(p)}),l("div",{children:[l("strong",{class:"name c-item",children:p.name}),l("small",{children:[p.kind==="use"?"Flask":"Material"," · ",l("b",{class:"c-num",children:["×",f.n]})]})]})]}),p.desc&&l("p",{children:p.desc}),l("ul",{class:"lines",children:[v.length>0&&l("li",{children:["Lumen:"," ",v.map((x,b)=>l("span",{children:[b>0?" · ":"",l("b",{class:x.cls,children:["+",m[x.id]," ",x.name]})]},x.id))]}),p.value&&l("li",{children:l("span",{class:"coin",children:["Sells for ",p.value]})})]}),l("div",{class:"detail-foot",children:g})]})}const zi={weapon:0,offhand:1,unit:2,mod:3,visor:4,frame:5,grips:6,greaves:7,boots:8};function zh({game:s,pickedKey:e,onPick:t,onMutate:n}){const o=s.player.sheet,a=[...o.gear].sort((f,p)=>zi[kn(f).slot]-zi[kn(p).slot]||p.rarity-f.rarity||p.ilvl-f.ilvl||f.uid-p.uid),i=s.loot.spare(),r=i.reduce((f,p)=>f+Ks(p),0),c=[];for(const[f]of _n)o.equip[f]&&c.push(`worn:${f}`);for(const f of a)c.push(`gear:${f.uid}`);for(const f of o.bag)c.push(`bag:${f.id}`);const d=c.includes(e)?e:c[0]||"",h=Math.max(0,Mt-o.gear.length),u=Math.max(0,10-o.bag.length);return l("div",{class:"gearview",children:[l("section",{class:"gear-worn doll","aria-label":"Worn",children:[l("h3",{class:"label",children:"Worn"}),l(Zs,{game:s,what:"hero",label:"Your surveyor."}),_n.map(([f,p],m)=>{const v=o.equip[f],g=f.replace(/\d$/,""),x={gridColumn:m<5?1:3,gridRow:m%5+2};if(!v){const z=g==="weapon"||g==="offhand"?ze[o.cls].family:g,C=es[z];return l("div",{class:"worn-tile empty",style:x,"data-tip":`${p}: empty`,"aria-label":`${p}: empty`,children:[l("span",{class:"worn-icon",children:C?C():null}),l("small",{children:p})]},f)}const b=ft(v),_=`worn:${f}`;return l("button",{type:"button",class:`worn-tile${v.relic?" relic":""}`,style:{"--rc":b.color,...x},"data-act":"pick","data-ctx":"gear","data-key":_,"aria-pressed":d===_?"true":"false","aria-label":`${p}: ${b.name}, ${b.rarity}, level ${b.ilvl}`,"data-tip":`${p} · ${b.name} · level ${b.ilvl}`,onClick:()=>{t("gear",_),s.bus.emit("ui:click")},children:[l("span",{class:"worn-icon",children:Qo(kn(v))}),l("span",{class:"lv",children:b.ilvl})]},f)})]}),l("div",{class:"gear-grids",children:[l("section",{children:[l("div",{class:"carried-head",children:[l("h3",{class:"label",children:["Carried"," ",l("span",{class:"quiet",children:[o.gear.length," of ",Mt]})]}),l("span",{class:"parts","data-tip":"Parts: what salvaged gear comes apart into. Honing a piece spends them.",children:["Parts ",l("b",{class:"c-parts",children:o.parts||0})]}),l("button",{type:"button",class:"btn small","data-act":"salvagespare",disabled:i.length===0,"data-tip":i.length?`Takes apart the ${i.length} standard and tuned ${i.length===1?"piece":"pieces"} that are not plainly better than what you wear, for ${r} parts. Locked pieces are left alone.`:"Nothing spare: every standard or tuned piece is locked, or better than what you wear.",onClick:()=>{s.loot.salvageSpare(),n()},children:["Salvage spare",i.length>0&&l(oe,{children:[" ",l("b",{class:"c-num",children:i.length})]})]})]}),l("div",{class:"tiles",children:[a.map(f=>{const p=`gear:${f.uid}`;return l(Ao,{game:s,item:f,ctx:"gear",itemKey:p,selected:d===p,onPick:t},f.uid)}),Array.from({length:h},(f,p)=>l("div",{class:"tile empty"},`eg-${p}`))]})]}),l("section",{children:[l("h3",{class:"label",children:"Supplies and materials"}),l("div",{class:"tiles",children:[o.bag.map(f=>{const p=`bag:${f.id}`;return l(ta,{game:s,stack:f,ctx:"gear",itemKey:p,selected:d===p,onPick:t},f.id)}),Array.from({length:u},(f,p)=>l("div",{class:"tile empty"},`eb-${p}`))]})]})]}),l(na,{game:s,ctx:"gear",selectedKey:d,onPick:t,onMutate:n})]})}const Mh=[["Move and look",[["Stick","Walk"],["Tap","Move, attack or talk"],["Arrow","Jump"],["Drag","Turn the view"],["Pinch","Zoom"]]],["Fight",[["Sword","Attack. Hold to keep going"],["Round","Abilities"],["Arrows","Next target"],["Flasks","Tonic, Draught"],["Lumen","Its burst, when full"]]],["Menus",[["Figure","Character"],["Frame","Gear"],["Light","Lumen"],["Lines","Pause and settings"]]]],_h=[["Move and look",[["W A S D","Walk"],["Click","Move, attack or talk"],["Space","Jump"],["Right-drag","Turn the view"],["Wheel","Zoom"]]],["Fight",[["F","Attack, or talk"],["Tab","Next target"],["1 2 3 4","Abilities"],["R T","Tonic, Draught"],["G","Lumen’s burst"]]],["Menus",[["C","Character"],["B","Gear"],["L","Lumen"],["J","Contract"],["H","This guide"],["M","Sound on or off"],["Esc","Close, or pause"]]]],Th=[["Loot","Walk over it. Pods open once their island is quiet."],["Relics and parts","Elders carry relics, likelier at higher threat. Salvage spare gear for parts and hone what you keep."],["Threat","A place is harder each time you go back, and pays more. Lose there and it eases."],["Side islands","Marks pay extra. A beacon maps the rest. A crystal lends a boon."],["Your lumen","Feed it what creatures drop. What it eats decides its shape."]];function Sh({touch:s}){return l("div",{class:"guideview",children:[l("div",{class:"guide-cols",children:(s?Mh:_h).map(([t,n])=>l("section",{children:[l("h3",{class:"label",children:t}),l("div",{class:"keys-list",children:n.map(([o,a])=>l(oe,{children:[l("span",{class:"keys",children:o.split(" ").map(i=>l("kbd",{children:i},i))},`${o}-k`),l("span",{children:a},`${o}-d`)]}))})]},t))}),l("div",{class:"guide-notes",children:Th.map(([t,n])=>l("div",{class:"card",children:[l("strong",{children:t}),l("small",{children:n})]},t))})]})}function Mi(s){return s in cs}function Ph({game:s,touch:e,pickedKey:t,onPick:n,onMutate:o}){const a=s.player.sheet,i=a.lumen,r=zt[i.kind],c=Sn(i),d=Oi(i),h=Math.max(8,i.ember,i.shell,i.tide),u=c<ns?ds(i)%Tn/Tn:1,f=Object.fromEntries($i(i).map(z=>[z.stat,z.value])),p=z=>`+${Math.round(z*1e3)/10}%`,m=[["Attack",p(f.attack||0)],["Armor",`+${(f.defense||0).toFixed(1)}`],["Health",p(f.maxHp||0)],["Technique",p(f.power||0)],["Focus recovery",p(f.focusRegen||0)]],v=z=>{if(!Mi(z.id))return 0;const C=cs[z.id];return ko.reduce((k,P)=>k+(C[P.id]||0),0)*z.n},g=a.bag.filter(z=>Mi(z.id)&&z.n>0).sort((z,C)=>+(Ce[z.id].kind==="use")-+(Ce[C.id].kind==="use")||v(C)-v(z)),x=g.map(z=>`food:${z.id}`),b=x.includes(t)?t:x[0]||"",_=Math.max(0,8-g.length);return l("div",{class:"lumenview",children:[l("section",{class:"lumen-figure","aria-label":"Your lumen",children:[l(Zs,{game:s,what:"lumen",label:"Your lumen."}),l("div",{class:"who-card",children:[l("strong",{class:"c-key",children:r.name}),l("small",{children:r.blurb}),l("div",{class:"who-level",children:[l("span",{children:["Level ",l("b",{class:"c-num",children:c})]}),l("span",{class:"quiet",children:c<ns?`${x0(i)} to the next`:"Full grown"})]}),l("div",{class:"bar lu",role:"img","aria-label":"Toward its next level",children:l("i",{style:{transform:`scaleX(${u.toFixed(3)})`}})})]})]}),l("div",{class:"lumen-main",children:[l("section",{class:`card burst${i.charge>=100?" full":""}`,children:[l("h3",{class:"label",children:["Burst",!e&&l(oe,{children:[" ",l("kbd",{children:"G"})]})]}),l("p",{children:[l("strong",{class:"c-key",children:r.burst.name}),r.burst.text]}),l("div",{class:"charge",children:[l("div",{class:"bar lu",role:"img","aria-label":`Charge: ${Math.round(i.charge)} of 100`,children:l("i",{style:{transform:`scaleX(${(i.charge/100).toFixed(3)})`}})}),l("b",{class:"c-num",children:[Math.round(i.charge),"%"]})]})]}),l("section",{children:[l("h3",{class:"label",children:"Tempers"}),l("div",{class:"tempers",children:ko.map(z=>l("div",{class:"temper","data-tip":`${z.name}: lends ${z.gives}`,children:[Xd[z.id](),l("span",{class:z.cls,children:z.name}),l("span",{class:"bar",children:l("i",{class:z.cls,style:{transform:`scaleX(${(i[z.id]/h).toFixed(3)})`}})}),l("b",{class:"c-num",children:i[z.id]}),l("small",{children:z.gives})]},z.id))})]}),l("section",{children:[l("h3",{class:"label",children:"Lends you"}),l("div",{class:"stats lends",children:m.map(([z,C])=>l("div",{children:[l("span",{children:z}),l("b",{class:"c-good",children:C})]},z))})]}),l("p",{class:"quiet",children:d<2?l(oe,{children:["New shape at level ",l("b",{class:"c-num",children:zo[d+1]}),", by its strongest temper."]}):"It has taken its last shape."})]}),l("section",{class:"lumen-feed",children:[l("h3",{class:"label",children:"Feed it"}),l("div",{class:"tiles",children:[g.map(z=>{const C=`food:${z.id}`;return l(ta,{game:s,stack:z,ctx:"food",itemKey:C,selected:b===C,onPick:n},z.id)}),Array.from({length:_},(z,C)=>l("div",{class:"tile empty"},`ef-${C}`))]}),l(na,{game:s,ctx:"food",selectedKey:b,onPick:n,onMutate:o})]})]})}function qh({game:s,pickedKey:e,onPick:t,onMutate:n}){const o=s.player.sheet,a=s.missions.stock,i=o.bag.filter(f=>Ce[f.id].kind==="mat").reduce((f,p)=>f+(Ce[p.id].value||0)*p.n,0),r=[];for(let f=0;f<a.length;f++)r.push(`stock:${f}`);for(const f of o.gear)r.push(`gear:${f.uid}`);for(const f of o.bag)r.push(`bag:${f.id}`);const c=r.includes(e)?e:r[0]||"",d=Math.max(0,8-a.length),h=Math.max(0,Mt-o.gear.length),u=Math.max(0,10-o.bag.length);return l("div",{class:"shopview",children:[l("div",{class:"shop-buy",children:[l("section",{children:[l("h3",{class:"label",children:"Supplies"}),X0.map(f=>{const p=Ce[f],m=p.price||0;return l("div",{class:"buyrow","data-tip":`${p.name} · ${p.desc||""}`,children:[is(p),l("div",{children:[l("strong",{children:p.name}),l("small",{children:p.desc})]}),l("button",{type:"button",class:"btn","data-act":"buy","data-arg":f,disabled:o.glint<m,"aria-label":`Buy ${p.name} for ${m} glint`,onClick:()=>{s.loot.buy(f),n()},children:["Buy · ",m]})]},f)})]}),l("section",{children:[l("h3",{class:"label",children:"Made from materials"}),Ji.map((f,p)=>{const m=Object.keys(f.needs),v=o.glint>=f.glint&&m.every(x=>s.loot.count(x)>=(f.needs[x]||0)),g=Ce[f.id];return l("div",{class:"buyrow",children:[is(g),l("div",{children:[l("strong",{children:g.name}),l("small",{children:m.map((x,b)=>{const _=f.needs[x]||0,z=s.loot.count(x);return l("span",{children:[b>0?", ":"",Ce[x].name," ",l("b",{class:z>=_?"c-good":"c-bad",children:[Math.min(z,_),"/",_]})]},x)})})]}),l("button",{type:"button",class:"btn","data-act":"craft","data-arg":String(p),disabled:!v,"aria-label":`Make ${g.name} for ${f.glint} glint`,onClick:()=>{s.loot.craft(p),n()},children:["Make · ",f.glint]})]},f.id)})]})]}),l("div",{class:"shop-grids",children:[l("section",{children:[l("h3",{class:"label",children:"For sale"}),l("div",{class:"tiles",children:[a.map((f,p)=>{const m=`stock:${p}`;return l(Ao,{game:s,item:f,ctx:"shop",itemKey:m,selected:c===m,onPick:t},f.uid)}),Array.from({length:d},(f,p)=>l("div",{class:"tile empty"},`es-${p}`))]})]}),l("section",{children:[l("h3",{class:"label",children:["Your gear"," ",l("span",{class:"quiet",children:[o.gear.length," of ",Mt]})]}),l("div",{class:"tiles",children:[o.gear.map(f=>{const p=`gear:${f.uid}`;return l(Ao,{game:s,item:f,ctx:"shop",itemKey:p,selected:c===p,onPick:t},f.uid)}),Array.from({length:h},(f,p)=>l("div",{class:"tile empty"},`eg-${p}`))]})]}),l("section",{children:[l("h3",{class:"label",children:["Your bag"," ",l("button",{type:"button",class:"btn small","data-act":"sellmats",disabled:i===0,onClick:()=>{s.loot.sellMaterials(),n()},children:["Sell all materials · ",i]})]}),l("div",{class:"tiles",children:[o.bag.map(f=>{const p=`bag:${f.id}`;return l(ta,{game:s,stack:f,ctx:"shop",itemKey:p,selected:c===p,onPick:t},f.id)}),Array.from({length:u},(f,p)=>l("div",{class:"tile empty"},`eb-${p}`))]})]})]}),l(na,{game:s,ctx:"shop",selectedKey:c,onPick:t,onMutate:n})]})}const Et=[{id:"character",name:"Character",key:"C",icon:"character"},{id:"gear",name:"Gear",key:"B",icon:"gear"},{id:"lumen",name:"Lumen",key:"L",icon:"lumen"},{id:"contract",name:"Contract",key:"J",icon:"contract"},{id:"guide",name:"Guide",key:"H",icon:"guide"}],_i={character:"character",bag:"gear",gear:"gear",lumen:"lumen",contract:"contract",help:"guide",guide:"guide"},Lh={KeyC:"character",KeyB:"gear",KeyI:"gear",KeyL:"lumen",KeyJ:"contract",KeyH:"guide"},Ti={menu:"Menu",shop:"Trade",bounty:"Contracts"},Si={character:"Point at anything to see what it does.",gear:"Select a piece to see it. Double-click to put it on.",lumen:"What it eats decides what it becomes.",contract:"",guide:"",shop:"Select a piece to see it. Double-click to buy or sell.",bounty:"Take one, then step onto the pad at the south gate."};function Ch(s,e,t,n,o,a){if(!t||!e)return!1;const i=s.code,r=s.target instanceof Element?s.target:null;if(i==="Escape")return a.onClose(),!0;if(s.metaKey||s.ctrlKey||s.altKey||r&&/INPUT|TEXTAREA|SELECT/.test(r.tagName))return!1;if(t==="menu"){const h=Lh[i];if(h)return a.onToggleTab(h),!0;if(i==="KeyQ"||i==="KeyE")return a.onStepTab(i==="KeyE"?1:-1),!0}const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[i];if(r instanceof HTMLElement&&d&&d[0]&&r.matches(".figure.live"))return o.portraits.turn(r,d[0]*.35),!0;if(!r||!d&&i!=="Home"&&i!=="End")return!1;if(r.matches('[role="tab"]')){if(d&&d[1])return!1;const h=Et.findIndex(f=>f.id===n),u=i==="Home"?0:i==="End"?Et.length-1:(h+(d?d[0]:0)+Et.length)%Et.length;return a.onSelectTab(Et[u].id),!0}if(d&&r.matches(".tile, .worn-tile")){const h=r.getBoundingClientRect(),u=h.left+h.width/2,f=h.top+h.height/2;let p=null,m=1e9;for(const v of e.querySelectorAll("button.tile, button.worn-tile")){if(v===r)continue;const g=v.getBoundingClientRect(),x=g.left+g.width/2-u,b=g.top+g.height/2-f,_=x*d[0]+b*d[1],z=Math.abs(x*d[1])+Math.abs(b*d[0]);_<4||z>_*1.5+24||_+z*2<m&&(m=_+z*2,p=v)}return p&&p.focus(),!0}return!1}function Eh({game:s,kind:e,tab:t,trader:n,touch:o,tutorialStep:a,openSeq:i,rev:r,picked:c,onPick:d,onSelectTab:h,onClose:u,onMutate:f,winRef:p}){const m=e==="menu"?Si[t]:e?Si[e]:"",[v,g]=le(m),x=me(0);if(De(()=>{g(m)},[m,i]),De(()=>{const w=p.current;if(!e||!w||x.current===i)return;x.current=i,(w.querySelector('[role="tab"][aria-selected="true"]')||w.querySelector(".btn.primary:not(:disabled)")||w).focus({preventScroll:!0})},[e,t,i,p]),!e)return l("div",{id:"panels"});const b=s.player.sheet,_=b.picks>0||b.points>0,z=s.missions.pending,C=e==="shop"?"Flasks, and whatever came up on the last lift.":z?"The pad is warm. South gate.":b.first?"Your first job: First Light. Take it.":"Three places want a surveyor. Pick one.",k=w=>{const y=w instanceof Element?w.closest("[data-tip]"):null;y&&y.dataset.tip!==void 0&&g(y.dataset.tip)},P=(w,y)=>{if(d(w,y),document.body.classList.contains("compact")&&p.current){const M=p.current.querySelector(`.detail[data-for="${w}"]`);M&&M.scrollIntoView&&M.scrollIntoView({block:"nearest"})}};return l("div",{id:"panels","data-rev":r,children:[l("div",{class:"scrim","data-act":"close",onClick:u}),l("section",{ref:p,class:`win plate win-${e}`,role:"dialog","aria-modal":"true","aria-label":Ti[e],tabIndex:-1,onDblClick:w=>{if(!(w.target instanceof Element?w.target:null)?.closest(".tile[data-key], .worn-tile[data-key]")||!p.current)return;const R=p.current.querySelector(".detail .btn.primary:not(:disabled)");R&&R.click()},onPointerOver:w=>k(w.target),onFocusIn:w=>{k(w.target);const M=(w.target instanceof Element?w.target:null)?.closest(".tile[data-key], .worn-tile[data-key]");if(M&&M.getAttribute("aria-pressed")!=="true"){const R=M.dataset.ctx,E=M.dataset.key;R&&E&&P(R,E)}},children:[l("header",{class:"win-head",children:[e==="menu"?l("div",{class:"tabs",role:"tablist","aria-label":"Menu",children:Et.map(w=>{const y=w.id===t;return l("button",{type:"button",role:"tab",class:"tab",id:`tab-${w.id}`,"data-act":"tab","data-arg":w.id,"aria-selected":y?"true":"false","aria-controls":"win-pane",tabIndex:y?0:-1,title:`${w.name}${o?"":` (${w.key})`}`,onClick:()=>h(w.id),children:[Xn[w.icon](),l("span",{children:w.name}),!o&&l("kbd",{"aria-hidden":"true",children:w.key}),w.id==="character"&&_&&l("i",{class:"pip","aria-label":"Something to choose"})]},w.id)})}):l("div",{class:"speaker",children:[n&&l("img",{src:It(`crew-${n.name.toLowerCase()}`),alt:""}),l("div",{children:[l("strong",{class:"c-name",children:n?n.name:Ti[e]}),l("small",{children:n&&n.title||""}),l("p",{children:["“",C,"”"]})]})]}),l("span",{class:"coin purse",title:"Glint",children:b.glint}),l("button",{type:"button",class:"x","data-act":"close","aria-label":"Close",title:"Close (Esc)",onClick:u,children:"×"})]}),l("div",{class:e==="menu"?`win-body tab-${t}`:`win-body win-${e}-body`,id:e==="menu"?"win-pane":void 0,role:e==="menu"?"tabpanel":void 0,"aria-labelledby":e==="menu"?`tab-${t}`:void 0,children:[e==="menu"&&t==="character"&&l(kh,{game:s,touch:o,onMutate:f}),e==="menu"&&t==="gear"&&l(zh,{game:s,pickedKey:c.gear,onPick:P,onMutate:f}),e==="menu"&&t==="lumen"&&l(Ph,{game:s,touch:o,pickedKey:c.food,onPick:P,onMutate:f}),e==="menu"&&t==="contract"&&l(xh,{game:s,onMutate:f}),e==="menu"&&t==="guide"&&l(Sh,{touch:o}),e==="shop"&&l(qh,{game:s,pickedKey:c.shop,onPick:P,onMutate:f}),e==="bounty"&&l(wh,{game:s,onMutate:f})]}),l("footer",{class:"win-foot",children:[a?l("span",{class:"win-step",children:[l("b",{children:"First steps"}),l("span",{children:o&&a.touch?a.touch:a.text})]}):l("span",{class:"win-keys",children:!o&&(e==="menu"?l(oe,{children:[l("kbd",{children:"Q"}),l("kbd",{children:"E"})," Switch tab ",l("i",{})," ",l("kbd",{children:"Esc"})," Close"]}):l(oe,{children:[l("kbd",{children:"Esc"})," Close"]}))}),l("span",{class:"win-tip","aria-live":"polite",children:v})]})]})]})}function Ah(s){const e=s.missions,t=e.active,n=e.run;return!t||!t.choosing||!n?null:{depth:t.offer.depth||1,hunt:t.offer.goal==="hunt",picked:n.haul.glint,payGlint:n.haul.payGlint,payXp:n.haul.payXp,pieces:n.haul.items.length,relics:n.haul.relics.length,next:e.deeperOffer()}}function Rh({game:s,choice:e,touch:t}){const n=me(null);De(()=>{e&&n.current&&!t&&n.current.focus({preventScroll:!0})},[e,t]);const o=e?.next||null,a=o?Ft(o.biome):null,i=o?zn[o.threat??0]:null,r=e?e.depth>1:!1;return l("section",{id:"depth-choice",class:"plate",role:"dialog","aria-labelledby":"dc-title",hidden:!e,children:e&&l(oe,{children:[l("header",{class:"dc-head",children:[l("small",{class:"c-place",children:e.depth>1?`Depth ${e.depth} cleared`:"Contract done"}),l("h2",{id:"dc-title",children:e.hunt?"The elder is down":"The way is clear"})]}),l("div",{class:"dc-haul","aria-label":"Your haul so far",children:[l("div",{children:[Xe.coin(),l("span",{children:[l("small",{children:"Pay waiting"}),l("b",{class:"c-coin",children:e.payGlint})," ",l("b",{class:"c-xp",children:["+",e.payXp," xp"]})]})]}),l("div",{children:[Xe.coin(),l("span",{children:[l("small",{children:"Picked up"}),l("b",{class:"c-coin",children:e.picked})]})]}),l("div",{children:[Xe.pack(),l("span",{children:[l("small",{children:"Pieces found"}),l("b",{class:"c-num",children:e.pieces}),e.relics>0&&l("b",{class:"c-relic",children:[" +",e.relics," relic"]})]})]})]}),l("div",{class:"dc-options",children:[l("button",{ref:n,type:"button",class:"btn primary dc-out",onClick:c=>{c.detail&&c.currentTarget.blur(),s.missions.choose(!1)},children:[Xe.lift(),l("span",{class:"dc-words",children:[l("strong",{children:["Lift out",!t&&l("kbd",{children:"O"})]}),l("span",{children:"Bring the whole haul home."})]})]}),o&&l("button",{type:"button",class:"btn dc-deep",onClick:c=>{c.detail&&c.currentTarget.blur(),s.missions.choose(!0)},children:[Xe.deeper(),l("span",{class:"dc-words",children:[l("strong",{children:["Go deeper",!t&&l("kbd",{children:"N"})]}),l("span",{children:["Depth ",o.depth,": ",l("b",{class:"c-place",children:a?.name}),", threat"," ",l("b",{class:"c-foe",children:i?.name}),", a stronger elder."]}),l("span",{children:["Pays ",l("b",{class:"c-coin",children:["+",o.glint]})," ",l("b",{class:"c-xp",children:["+",o.xp," xp"]})," and a prize."," ",l("b",{class:"c-bad",children:[r?"Fall":"Fall down there"," and you lose half the haul."]})]})]})]})]})]})})}const Pi=[["tonic","R"],["draught","T"]];function Gn({className:s,keyLabel:e,title:t,ariaLabel:n,coolPct:o=0,count:a,onTrigger:i,onActDown:r,onActUp:c,children:d}){const h=me(-1e9);return l("button",{type:"button",class:s,title:t,"aria-label":n,onPointerDown:u=>{r&&r(u),u.pointerType==="touch"&&(h.current=performance.now(),i())},onPointerUp:c,onPointerCancel:c,onLostPointerCapture:c,onClick:u=>{performance.now()-h.current<800||(i(),u.detail&&u.currentTarget.blur())},onContextMenu:u=>u.preventDefault(),children:[d,l("span",{class:"cool",style:o>0?{"--left":`${o}%`}:{"--left":"0%"}}),l("span",{class:"key",children:e}),a!==void 0&&l("span",{class:"count",children:a})]})}function Ih({game:s,hud:e}){const[t,n]=le(()=>wn(s)),[o,a]=le({}),i=me({});De(()=>{n(wn(s))},[s,e.cls]),De(()=>{const d=u=>{a(f=>({...f,[u]:!0})),clearTimeout(i.current[u]),i.current[u]=window.setTimeout(()=>{a(f=>{if(!f[u])return f;const p={...f};return delete p[u],p})},130)},h=[s.bus.on("class",()=>n(wn(s))),s.bus.on("skill",u=>{const p=wn(s).findIndex(m=>m.id===u.id);p>=0&&d(`s${p}`)}),s.bus.on("drink",u=>{const f=Pi.findIndex(([p])=>p===u.id);f>=0&&d(`d${f}`)})];return()=>{for(const u of h)u();for(const u in i.current)clearTimeout(i.current[u])}},[s]);const r=e.actMode==="talk",c=`slot act touch-only${r?" talk":e.actMode==="idle"?" idle":""}`;return l("section",{id:"hotbar","aria-label":"Skills and potions",children:[t.map((d,h)=>{const u=e.skillLocked[h],f=!u&&e.skillDry[h],p=`slot s${h}${u?" locked":f?" dry":""}${o[`s${h}`]?" fired":""}`,m=vr[d.icon];return l(Gn,{className:p,keyLabel:d.key,title:`${d.name} (${d.key})`,ariaLabel:`${d.name}, key ${d.key}`,coolPct:e.skillCdPct[h],onTrigger:()=>s.skills.cast(h),children:m?m():null},h)}),l("div",{class:"sep"}),Pi.map(([d,h],u)=>{const f=u===0?e.tonicCount:e.draughtCount,p=Ce[d],m=`slot d${u}${f?"":" empty"}${o[`d${u}`]?" fired":""}`;return l(Gn,{className:m,keyLabel:h,title:`${p.name} (${h})`,ariaLabel:`${p.name}, key ${h}`,count:f,onTrigger:()=>s.loot.use(d),children:is(p)},d)}),l(Gn,{className:c,keyLabel:"F",title:r?"Talk":"Attack",ariaLabel:r?"Talk":"Attack the nearest creature",onTrigger:()=>s.controls.act(),onActDown:d=>{s.input.acting=!0;try{d.currentTarget.setPointerCapture(d.pointerId)}catch{}},onActUp:()=>{s.input.acting=!1},children:[Ss.attack(),Ss.talk()]}),l(Gn,{className:"slot jump touch-only",keyLabel:"Space",title:"Jump (Space)",ariaLabel:"Jump, key Space",onTrigger:()=>s.controls.jump(),children:Ss.jump()}),l(Gn,{className:"slot next touch-only",keyLabel:"Tab",title:"Next target (Tab)",ariaLabel:"Next target, key Tab",onTrigger:()=>s.controls.cycleTarget(),children:Ss.next()})]})}const go=[{id:"display",name:"Display",rows:[{key:"quality",name:"Picture quality",kind:"choice",options:[["auto","Auto"],["high","High"],["low","Low"]]},{key:"shake",name:"Screen shake",kind:"range"},{key:"fullscreen",name:"Full screen",kind:"switch"},{key:"numbers",name:"Damage numbers",kind:"switch"}]},{id:"sound",name:"Sound",rows:[{key:"master",name:"Master volume",kind:"range"},{key:"music",name:"Music",kind:"range"},{key:"sfx",name:"Effects",kind:"range"},{key:"ambience",name:"Ambience",kind:"range"},{key:"mute",name:"Mute",kind:"switch"}]},{id:"controls",name:"Controls"},{id:"access",name:"Accessibility",short:"Access",rows:[{key:"calm",name:"Reduce motion",hint:"No screen shake, hit pauses or moving cameras",kind:"switch"},{key:"text",name:"Text size",kind:"choice",options:[[1,"100%"],[1.15,"115%"],[1.3,"130%"]]},{key:"skip",name:"Skip cinematics",kind:"switch"},{key:"contrast",name:"High contrast",hint:"White lettering, heavier lines, solid plates",kind:"switch"}]},{id:"saves",name:"Saves"}],Fh=[["behind","Behind"],["above","Above"],["left","Turn left"],["right","Turn right"],["high","Higher"],["low","Lower"],["near","Closer"],["far","Farther"]],Nh=[["W A S D","Walk"],["Space","Jump"],["F","Attack or talk"],["Tab","Next target"],["1 2 3 4","Abilities"],["R T","Flasks"],["G","Lumen’s burst"],["Q E","Turn the view"],["C B L J","Menu tabs"],["M","Sound on or off"]],Bh=[["Stick","Walk"],["Tap","Walk there, attack or talk"],["Drag","Turn the view"],["Pinch","Zoom"]],qi=()=>{const s=document;return!!(s.fullscreenElement||s.webkitFullscreenElement)},Hh=()=>{const s=document;return!!(s.fullscreenEnabled||s.webkitFullscreenEnabled)};function Dh({game:s,store:e,section:t,direct:n,touch:o,onSelectSection:a,onBack:i}){const[,r]=le(0),[c,d]=le(()=>qi()),[h,u]=le(null),[f,p]=le(""),[m,v]=le(!1),g=Hh();De(()=>{const y=()=>d(qi()),M=s.bus.on("settings",()=>r(R=>R+1));return document.addEventListener("fullscreenchange",y),document.addEventListener("webkitfullscreenchange",y),()=>{M(),document.removeEventListener("fullscreenchange",y),document.removeEventListener("webkitfullscreenchange",y)}},[s]);const x=y=>{const M=document.documentElement,R=document;try{const E=y?M.requestFullscreen||M.webkitRequestFullscreen:R.exitFullscreen||R.webkitExitFullscreen;if(!E)return;const U=E.call(y?M:R);U&&typeof U.catch=="function"&&U.catch(()=>{})}catch{}},b=y=>{const M=s.camera;if(y==="left")M.rotate(.5,0);else if(y==="right")M.rotate(-.5,0);else if(y==="high")M.rotate(0,.16);else if(y==="low")M.rotate(0,-.16);else if(y==="near")M.zoom(.84);else if(y==="far")M.zoom(1.19);else if(y==="behind"||y==="above"){const R=yo[y];M.goal.pitch=R[0],M.goal.distance=R[1]*(s.touch?.9:1)}s.bus.emit("ui:click")},_=()=>{s.save();const y=document.createElement("a");y.href=URL.createObjectURL(new Blob([s.store.exportAll(s.account)],{type:"application/json"})),y.download=`lumenwake-save-${new Date().toISOString().slice(0,10)}.json`,y.click(),window.setTimeout(()=>URL.revokeObjectURL(y.href),2e3),p("A copy is in your downloads."),v(!1),s.bus.emit("ui:click")},z=y=>{y&&y.text().then(M=>{u(M),p(""),v(!1)})},C=()=>{if(!h)return;const y=h;u(null);const M=s.hero;s.hero=null,s.store.importAll(y)?(p("Loaded. Starting again…"),v(!1),window.setTimeout(()=>location.reload(),900)):(s.hero=M,p("That file is not a Lumenwake save."),v(!0)),s.bus.emit("ui:click")},k=()=>{e.reset(),r(y=>y+1),s.bus.emit("ui:click")},P=go.find(y=>y.id===t)||go[0],w=y=>{const M=`set-${y.key}`;if(y.kind==="range"){const E=y.key,U=Math.round(e.values[E]*100);return l("div",{class:"set-row",children:[l("label",{for:M,children:y.name}),l("div",{class:"set-ctl range",children:[l("input",{type:"range",id:M,"data-set":y.key,min:0,max:100,step:5,value:U,style:{"--fill":`${U}%`},onInput:Q=>{const L=Number(Q.currentTarget.value);e.set(E,L/100),r(F=>F+1)}}),l("output",{for:M,children:[U,"%"]})]})]},y.key)}if(y.kind==="switch"){const E=y.key==="fullscreen"&&!g,U=y.key==="fullscreen"?c:!!e.values[y.key];return l("div",{class:"set-row",children:[l("label",{for:M,children:[y.name,y.hint&&l("small",{children:y.hint})]}),l("div",{class:"set-ctl switch",children:[l("output",{for:M,children:E?"Not available here":U?"On":"Off"}),l("input",{type:"checkbox",role:"switch",id:M,"data-set":y.key,checked:U,disabled:E,onChange:Q=>{const L=Q.currentTarget.checked;y.key==="fullscreen"?x(L):(e.set(y.key,L),r(F=>F+1)),s.bus.emit("ui:click")}})]})]},y.key)}const R=e.values[y.key];return l("div",{class:"set-row",role:"radiogroup","aria-labelledby":M,children:[l("span",{class:"set-name",id:M,children:y.name}),l("div",{class:"set-ctl seg",children:y.options?.map(([E,U])=>l("label",{children:[l("input",{type:"radio",name:M,"data-set":y.key,value:String(E),checked:String(R)===String(E),onChange:()=>{y.key==="text"?e.set("text",Number(E)):e.set("quality",E),r(Q=>Q+1),s.bus.emit("ui:click")}}),l("span",{children:U})]},String(E)))})]},y.key)};return l("section",{class:"settings plate","aria-labelledby":"pause-title",children:[l("header",{children:[l("h2",{id:"pause-title",children:"Settings"}),l("button",{type:"button",class:"x","data-p":"back","aria-label":"Back",title:"Back (Esc)",onClick:()=>{s.bus.emit("ui:click"),i()},children:"×"})]}),l("div",{class:"set-rail",role:"tablist","aria-orientation":"vertical","aria-label":"Settings sections",children:go.map(y=>l("button",{type:"button",role:"tab",class:"set-tab",id:`settab-${y.id}`,"data-sec":y.id,"aria-selected":y.id===P.id?"true":"false","aria-controls":"set-pane",tabIndex:y.id===P.id?0:-1,"aria-label":y.name,onClick:()=>{s.bus.emit("ui:click"),a(y.id)},children:[jd[y.id](),l("span",{class:"long",children:y.name}),l("span",{class:"short","aria-hidden":"true",children:y.short||y.name})]},y.id))}),l("div",{class:"set-pane",id:"set-pane",role:"tabpanel","aria-labelledby":`settab-${P.id}`,children:P.rows?P.rows.map(w):P.id==="saves"?l(oe,{children:[l("p",{class:"set-note",children:"Your surveyors are kept in this browser: every few seconds, when a contract ends, and whenever you leave. A copy in a file can be kept, or taken to another browser or device."}),l("div",{class:"save-pair",children:[l("button",{type:"button",class:"btn","data-p":"export",onClick:_,children:"Save a copy to a file"}),l("label",{class:"btn file",children:["Load from a file",l("input",{type:"file",accept:"application/json,.json","data-import":"",onChange:y=>{z(y.currentTarget.files?.[0]),y.currentTarget.value=""}})]})]}),h&&l("div",{class:"pause-ask",role:"group","aria-label":"Replace your surveyors?",children:[l("p",{children:"Replace every surveyor here with the ones in the file?"}),l("div",{children:[l("button",{type:"button",class:"btn","data-p":"import-no",onClick:()=>{u(null),p(""),s.bus.emit("ui:click")},children:"Keep mine"}),l("button",{type:"button",class:"btn primary","data-p":"import-yes",onClick:C,children:"Replace"})]})]}),f&&l("p",{class:`set-note ${m?"c-bad":"c-good"}`,role:"status",children:f}),s.store.failed&&l("p",{class:"set-note c-bad",children:"This browser is refusing to keep anything (a private window, or its storage is full). Keep a copy in a file."})]}):l(oe,{children:[l("h4",{class:"label",children:"Camera"}),l("div",{class:"cam-grid",children:Fh.map(([y,M])=>l("button",{type:"button",class:"btn","data-cam":y,onClick:()=>b(y),children:M},y))}),l("h4",{class:"label",children:o?"Touch":"Keys"}),l("div",{class:"keys-list two",children:(o?Bh:Nh).map(([y,M])=>l(oe,{children:[l("span",{class:"keys",children:y.split(" ").map(R=>l("kbd",{children:R},R))},`${y}-k`),l("span",{children:M},`${y}-d`)]}))})]})}),l("footer",{children:[P.id==="saves"?l("span",{}):l("button",{type:"button",class:"btn","data-p":"reset",onClick:k,children:"Reset to defaults"}),l("button",{type:"button",class:"btn primary","data-p":"back",onClick:()=>{s.bus.emit("ui:click"),i()},children:n?"Done":"Back"})]})]})}function Oh({game:s,store:e,state:t,touch:n,onResume:o,onBack:a,onOpenSettings:i,onSelectSection:r,onOpenGuide:c,onRestartSteps:d,onAskQuit:h,containerRef:u}){const f=me("");De(()=>{const v=u.current;if(!t.open||!v){f.current="";return}const g=`${t.view}:${t.section}:${t.asking}`;if(g===f.current)return;f.current=g;const x=t.view==="settings"?'[role="tab"][aria-selected="true"]':t.asking?'[data-p="stay"]':'[data-p="resume"]';(v.querySelector(x)||v).focus({preventScroll:!0})},[t.open,t.view,t.section,t.asking,u]);const p=s.missions.active,m=p?`${s.biome.name} · ${p.offer.name}`:s.biome.name;return l("div",{ref:u,id:"pause",role:"dialog","aria-modal":"true","aria-labelledby":"pause-title",tabIndex:-1,hidden:!t.open,onClick:v=>{v.target===v.currentTarget&&a()},children:t.open&&(t.view==="settings"?l(Dh,{game:s,store:e,section:t.section,direct:t.direct,touch:n,onSelectSection:r,onBack:a}):l("div",{class:"pause-col plate",role:"document",children:[l("h2",{id:"pause-title",children:"Paused"}),l("p",{class:"pause-where",children:m}),l("nav",{class:"pause-list","aria-label":"Pause menu",children:[!t.asking&&l(oe,{children:[l("button",{type:"button",class:"pause-item","data-p":"resume",onClick:()=>{s.bus.emit("ui:click"),o()},children:"Resume"}),l("button",{type:"button",class:"pause-item","data-p":"settings",onClick:()=>{s.bus.emit("ui:click"),i()},children:"Settings"}),l("button",{type:"button",class:"pause-item","data-p":"guide",onClick:()=>{s.bus.emit("ui:click"),c()},children:"How to play"}),!p&&l("button",{type:"button",class:"pause-item","data-p":"steps",onClick:()=>{s.bus.emit("ui:click"),d()},children:"Start the first steps again"})]}),t.asking?l("div",{class:"pause-ask",role:"group","aria-label":"Leave for the select screen?",children:[l("p",{children:p?"Leave? Your surveyor is kept, with what they have picked up. This contract starts over.":"Leave for the select screen? Your surveyor is kept."}),l("div",{children:[l("button",{type:"button",class:"btn","data-p":"stay",onClick:()=>{s.bus.emit("ui:click"),h(!1)},children:"Stay"}),l("button",{type:"button",class:"btn primary","data-p":"leave",onClick:()=>{s.bus.emit("ui:click"),s.save(),location.reload()},children:"Leave"})]})]}):l("button",{type:"button",class:"pause-item","data-p":"quit",onClick:()=>{s.bus.emit("ui:click"),h(!0)},children:"Save and leave"})]}),!n&&l("p",{class:"pause-keys",children:[l("kbd",{children:"Esc"})," Resume"]})]}))})}function $h({game:s,report:e,onClose:t}){const n=me(null),o=me(null);De(()=>{e&&o.current&&o.current.focus({preventScroll:!0})},[e]);const a=()=>{e&&(n.current&&document.activeElement instanceof HTMLElement&&n.current.contains(document.activeElement)&&document.activeElement.blur(),t())},i=e?Ft(e.offer.biome):null;return l("section",{ref:n,id:"report",class:e&&(!e.won||e.lost)?"plate lost":"plate",role:"dialog","aria-labelledby":"report-name",hidden:!e,children:[l("button",{type:"button",class:"x",id:"report-x","aria-label":"Close",title:"Close (Esc)",onClick:a,children:"×"}),l("div",{class:"report-art",children:[l("img",{id:"report-art",src:e?It(`place-${e.offer.biome}`):void 0,alt:""}),l("div",{class:"stamp",id:"report-kind",children:e?e.lost?"Fell":e.won?"Paid":"Lifted out":""})]}),l("div",{class:"report-body",children:[l("h2",{id:"report-name",children:e?.offer.name||""}),l("p",{id:"report-line",children:e&&l(oe,{children:[l("b",{class:"c-place",children:i?.name||e.offer.biome})," ·"," ",l("b",{class:`c-goal-${e.offer.goal}`,children:hs[e.offer.goal].name}),!e.won&&l(oe,{children:[" ","· ",l("span",{class:"c-bad",children:"Not paid: it is still on the board"})]}),(e.cleared||0)>1&&l(oe,{children:[" ","· Down to depth ",l("b",{class:"c-num",children:e.cleared}),e.record&&l("b",{class:"c-good",children:" (your deepest yet)"})]}),e.won&&e.markNeed>0&&l(oe,{children:[" ","· Marks ",l("b",{class:"c-num",children:e.marks})," of ",l("b",{class:"c-num",children:e.markNeed})]}),e.threat&&l(oe,{children:[l("br",{}),e.threat.now>e.threat.was?l(oe,{children:["It will be more dangerous next time: ",l("b",{class:"c-foe",children:e.threat.name}),"."]}):l(oe,{children:["It has settled a little: ",l("b",{class:"c-foe",children:e.threat.name}),"."]})]})]})}),l("div",{class:"report-stats",id:"report-stats",children:e&&l(oe,{children:[l("div",{children:[l("small",{children:"Time"}),l("b",{class:"c-ink",children:kr(e.time)})]}),l("div",{children:[l("small",{children:"Felled"}),l("b",{class:"c-foe",children:e.kills})]}),l("div",{children:[l("small",{children:"Experience"}),l("b",{class:"c-xp",children:["+",e.xp]})]}),l("div",{children:[l("small",{children:"Glint"}),l("b",{class:"c-coin",children:["+",e.glint]})]})]})}),e?.lost&&l("p",{class:"report-lost",children:[Xe.warn(),l("span",{children:["You fell at depth ",l("b",{class:"c-num",children:e.depth})," and lost half the haul:"," ",l("b",{class:"c-coin",children:[e.lost.glint," glint"]}),", ",l("b",{class:"c-xp",children:[e.lost.xp," xp"]}),e.lost.items.length>0&&l(oe,{children:[" ","and ",e.lost.items.length===1?"a piece":`${e.lost.items.length} pieces`," (",e.lost.items.map((r,c)=>l(oe,{children:[c>0&&", ",l("b",{style:{color:ft(r).color},children:ft(r).name})]})),")"]}),". What you wore came home with you."]})]}),l("div",{id:"report-prize",children:[e?.relic&&l(oe,{children:[l("div",{class:"label c-relic",children:"Relic found"}),l("div",{class:"gear item-card",children:l(Eo,{game:s,item:e.relic})})]}),e?.prize&&l(oe,{children:[l("div",{class:"label",children:(e.cleared||0)>1?"Best piece paid on the way":"Also paid"}),l("div",{class:"gear item-card",children:l(Eo,{game:s,item:e.prize})})]})]}),l("div",{class:"report-foot",children:l("button",{ref:o,type:"button",class:"btn primary",id:"report-ok",onClick:a,children:"Continue"})})]})]})}function Uh({hud:s,bust:e,onLumenClick:t,onMenuOpen:n}){const o=s.boon?en[s.boon]:null,a=zt[s.lumenKind],i=s.tracker?zr(s.tracker):[];return l("div",{id:"hero",children:[l("section",{id:"status",class:"plate","aria-label":"Your character",children:[l("div",{class:"face",children:[l("img",{id:"hero-face",src:e||void 0,alt:""}),l("div",{class:"badge",id:"lvl",title:"Level",children:s.level})]}),l("div",{class:"bars",children:[l("div",{class:"who",children:[l("span",{class:"names",children:[l("span",{id:"pname",class:`c-${s.cls}`,children:s.name}),l("small",{id:"pkind",children:[wt[s.people].name," ",ze[s.cls].name]})]}),l("span",{id:"boon",class:"boon",hidden:!o,title:o?.desc,children:o?.name||""}),l("span",{id:"glint",class:"coin",title:"Glint",children:s.glint})]}),l("div",{class:"meter",children:[Zd(),l("div",{class:s.low?"bar hp low":"bar hp",id:"hp-bar",role:"meter","aria-label":"Health","aria-valuemin":0,"aria-valuenow":s.hp,"aria-valuemax":s.maxHp,children:l("i",{id:"hp-fill",style:{transform:`scaleX(${s.hpRatio.toFixed(3)})`}})}),l("b",{id:"hp-text",children:[s.hp," / ",s.maxHp]})]}),l("div",{class:"meter",children:[Jd(),l("div",{class:"bar fo",id:"fo-bar",role:"meter","aria-label":"Focus","aria-valuemin":0,"aria-valuenow":s.focus,"aria-valuemax":s.maxFocus,children:l("i",{id:"fo-fill",style:{transform:`scaleX(${s.focusRatio.toFixed(3)})`}})}),l("b",{id:"fo-text",children:[s.focus," / ",s.maxFocus]})]}),l("div",{class:"bar xp",id:"xp-bar",role:"meter","aria-label":"Experience toward the next level","aria-valuemin":0,"aria-valuenow":s.xpPct,"aria-valuemax":100,children:l("i",{id:"xp-fill",style:{transform:`scaleX(${s.xpRatio.toFixed(3)})`}})})]})]}),l("section",{id:"lumen",class:s.lumenFull?"plate full":"plate","aria-label":"Your lumen",children:l("button",{type:"button",id:"lumen-btn","aria-label":"Your lumen: let its burst go, key G",onClick:r=>{t(),r.detail&&r.currentTarget.blur()},children:[l("span",{class:"face",children:l("img",{id:"lumen-face",src:It(`lumen-${s.lumenKind}`),alt:""})}),l("span",{class:"lumen-words",children:[l("strong",{id:"lumen-name",children:a.name}),l("small",{id:"lumen-sub",children:s.lumenFull?`${a.burst.name} is ready`:`Level ${s.lumenLevel}`}),l("span",{class:"bar lu",role:"meter","aria-label":"How full it is","aria-valuemin":0,"aria-valuenow":s.lumenCharge,"aria-valuemax":100,id:"lumen-bar",children:l("i",{id:"lumen-fill",style:{transform:`scaleX(${(s.lumenCharge/100).toFixed(3)})`}})})]}),l("kbd",{children:"G"})]})}),l("nav",{id:"menu","aria-label":"Menus",children:[l("button",{type:"button",class:s.due?"alert":void 0,"data-open":"character",title:"Character (C)","aria-label":"Character, key C",onClick:r=>{n("character"),r.detail&&r.currentTarget.blur()},children:Xn.character()}),l("button",{type:"button","data-open":"bag",title:"Gear (B)","aria-label":"Gear, key B",onClick:r=>{n("bag"),r.detail&&r.currentTarget.blur()},children:Xn.gear()}),l("button",{type:"button","data-open":"lumen",title:"Lumen (L)","aria-label":"Your lumen, key L",onClick:r=>{n("lumen"),r.detail&&r.currentTarget.blur()},children:Xn.lumen()}),l("button",{type:"button","data-open":"menu",title:"Menu (Esc)","aria-label":"Pause menu and settings, key Escape",onClick:r=>{n("menu"),r.detail&&r.currentTarget.blur()},children:Xn.menu()})]}),l("section",{id:"tracker",class:"plate small","aria-label":"Contract",hidden:!s.tracker,children:[l("div",{class:"label",children:"Contract"}),l("div",{id:"tracker-text",children:i.map((r,c)=>r.bold?l("b",{class:r.className,children:r.text},c):r.text)})]})]})}function Kh({game:s,touch:e}){const[t,n]=le(null),[o,a]=le(null),i=me(null);return De(()=>{const r=s.bus,c=[r.on("guide",d=>{n(d),document.body.classList.toggle("guiding",!!d),d&&requestAnimationFrame(()=>{const h=i.current;h&&(h.classList.remove("fresh"),h.offsetWidth,h.classList.add("fresh"))})}),r.on("guide:step",()=>{const d=i.current;d&&(d.classList.remove("tick"),d.offsetWidth,d.classList.add("tick"))}),r.on("guide:tip",d=>{a(d)})];return()=>{for(const d of c)d();document.body.classList.remove("guiding")}},[s]),l("div",{id:"tutor-stack",children:[l("section",{id:"tutor-tip",class:"plate small",role:"status",hidden:!o,children:[o&&!e&&o.keys?.map(r=>l("kbd",{children:r},r)),o&&l("span",{children:e&&o.touch?o.touch:o.text})]}),l("section",{ref:i,id:"tutor",class:"plate","aria-label":"First steps",hidden:!t,children:[l("div",{class:"tutor-head",children:[l("span",{class:"tutor-title",children:t?.title||""}),l("span",{class:"tutor-pips","aria-label":t?`Step ${t.index+1} of ${t.total}`:void 0,children:t&&Array.from({length:t.total},(r,c)=>l("i",{class:c<t.index?"done":c===t.index?"now":void 0},c))})]}),l("p",{class:"tutor-line",role:"status","aria-live":"polite",children:[t&&!e&&t.keys?.map(r=>l("kbd",{children:r},r)),t&&l("span",{children:e&&t.touch?t.touch:t.text})]}),l("button",{type:"button",class:"btn tutor-skip","aria-label":"Skip the first steps",onClick:r=>{s.bus.emit("guide:skip",void 0),r.detail&&r.currentTarget.blur()},children:"Skip"})]})]})}function Gh({game:s,store:e,hud:t,bust:n,artRev:o,touch:a,logs:i,toast:r,choice:c,talk:d,report:h,windowKind:u,windowTab:f,trader:p,tutorialStep:m,windowOpenSeq:v,windowRev:g,picked:x,pauseState:b,ringRef:_,logRef:z,stickRef:C,platesRef:k,floatersRef:P,tutorMarkRef:w,tutorPointRef:y,winRef:M,pauseRef:R,onPlaceMap:E,onLumenClick:U,onMenuOpen:Q,onCloseReport:L,onPick:F,onSelectTab:O,onCloseWindow:S,onMutateWindow:D,onPauseResume:G,onPauseBack:Y,onPauseOpenSettings:j,onPauseSelectSection:ne,onPauseOpenGuide:V,onPauseRestartSteps:ge,onPauseAskQuit:I}){De(()=>{const B=_.current;if(!B||typeof ResizeObserver>"u")return;const T=new ResizeObserver(E);return T.observe(B),E(),()=>T.disconnect()},[_,E]);const H=t.bossDefId?yr(t.bossDefId):"";return l("div",{id:"ui","data-art":o,children:[l(Uh,{hud:t,bust:n,onLumenClick:U,onMenuOpen:Q}),l("section",{id:"target",class:"plate","aria-label":"Your target",hidden:!t.targetName,children:[l("div",{class:"who",children:[l("span",{id:"t-name",children:t.targetName}),l("span",{id:"t-lvl",class:"dim",children:t.targetName?`Level ${t.targetLevel}`:""})]}),l("div",{class:"bar hp",children:l("i",{id:"t-fill",style:{transform:`scaleX(${t.targetRatio.toFixed(3)})`}})})]}),l("section",{id:"compass","aria-label":"Map and place",children:[l("button",{ref:_,type:"button",id:"map-ring",title:"Map","aria-label":"Map of what is near",onClick:B=>{B.detail&&B.currentTarget.blur()}}),l("div",{id:"place",class:"plate small",children:[l("span",{id:"zone",class:t.missionActive?"c-ink":"c-place",children:t.zoneName}),l("span",{id:"clock",class:t.missionActive?"c-place":"dim",children:t.clockText})]})]}),l("section",{id:"boss",class:t.bossMad?"plate mad":"plate","aria-label":"Elder",hidden:!t.bossName,children:[l("div",{class:"face",children:l("img",{id:"boss-face",src:H||void 0,alt:""})}),l("div",{class:"boss-words",children:[l("strong",{id:"boss-name",children:t.bossName}),l("small",{id:"boss-sub",children:t.bossSub})]}),l("div",{class:"bar hp",role:"img","aria-label":"Elder's health",children:[l("i",{id:"boss-fill",style:{transform:`scaleX(${t.bossRatio.toFixed(3)})`}}),l("b",{class:"half","aria-hidden":"true"})]})]}),l("section",{ref:z,id:"log",role:"log","aria-live":"polite","aria-label":"Messages",children:i.map(B=>l("p",{class:B.old?"old":void 0,children:B.segments.map((T,N)=>T.bold?l("b",{class:T.className,style:T.color?{color:T.color}:void 0,children:T.text},N):T.className||T.color?l("span",{class:T.className,style:T.color?{color:T.color}:void 0,children:T.text},N):T.text)},B.id))}),l("div",{id:"toast",class:r.show?"plate show":"plate",role:"status","aria-live":"polite",children:[l("strong",{children:r.title}),r.sub&&l("span",{children:r.sub})]}),l("section",{id:"talk",class:"plate","aria-live":"polite",hidden:!d,children:[l("div",{class:"face",children:l("img",{id:"talk-face",src:d?It(`crew-${d.name.toLowerCase()}`):void 0,alt:""})}),l("div",{class:"talk-words",children:[l("div",{class:"who",children:[l("strong",{id:"talk-name",children:d?.name||""}),l("small",{id:"talk-title",children:d?.title||""})]}),l("p",{id:"talk-line",children:d?`“${d.line}”`:""})]})]}),l(Rh,{game:s,choice:h?null:c,touch:a}),l($h,{game:s,report:h,onClose:L}),l("div",{ref:C,id:"stick","aria-hidden":"true",children:l("div",{class:"base",children:l("div",{class:"nub"})})}),l(Ih,{game:s,hud:t}),l("div",{ref:k,id:"plates","aria-hidden":"true"}),l("div",{ref:P,id:"floaters","aria-hidden":"true"}),l(Kh,{game:s,touch:a}),l("div",{ref:w,id:"tutor-mark","aria-hidden":"true",hidden:!0}),l("div",{ref:y,id:"tutor-point","aria-hidden":"true",hidden:!0}),l(Eh,{game:s,kind:u,tab:f,trader:p,touch:a,tutorialStep:m,openSeq:v,rev:g,picked:x,onPick:F,onSelectTab:O,onClose:S,onMutate:D,winRef:M}),l(Oh,{game:s,store:e,state:b,touch:a,onResume:G,onBack:Y,onOpenSettings:j,onSelectSection:ne,onOpenGuide:V,onRestartSteps:ge,onAskQuit:I,containerRef:R})]})}const Yh=2,Wh=Object.keys(ze);function Vh(){const s=document.querySelector(".select-head"),e=innerHeight;let t=(s?s.getBoundingClientRect().bottom:0)+12,n=e;for(const o of document.querySelectorAll(".select-col, .select-foot")){const a=o.getBoundingClientRect();a.height>0&&a.top<n&&(n=a.top)}return n-=16,n-t<150&&(n=t+150),[t,n]}function Xh({game:s,touch:e,onBegan:t}){const n=()=>s.fresh?[]:s.store.summaries(s.account),[o,a]=le(()=>n()),[i,r]=le(()=>n().length===0),[c,d]=le(null),[h,u]=le(()=>s.player.sheet.people||"unit"),[f,p]=le(()=>s.player.sheet.cls),[m,v]=le(()=>s.hero?.id||null),[g,x]=le(!1),[b,_]=le(!1),z=me(null),C=me(null),k=me(null),P=me({top:-1,bottom:-1}),w=me(0),y=me(0),M=o.length>0,R=i||!M;De(()=>{document.body.classList.toggle("has-saves",M),document.body.classList.toggle("creating",R)},[M,R]),De(()=>{const S=n();if(S.length>0){const Y=s.store.loadHero(S[0].id);Y&&(s.load(Y),v(Y.id),u(s.player.sheet.people||"unit"),p(s.player.sheet.cls)),r(!1)}else r(!0);a(S),s.look.fadeGoal=1;const D=(Y,j)=>{const ne=s.player,V=ne.y,ge=s.reducedMotion?0:Math.sin(Y*.22)*.22,I=innerWidth>620&&innerWidth>innerHeight,H=.18+ge;if(I)return P.current.top=-1,{pos:[ne.x+Math.sin(H)*5.6,V+1.25,ne.z+Math.cos(H)*5.6],look:[ne.x,V+.72,ne.z],lens:32*Math.PI/180,mix:1};const[B,T]=Vh();P.current.top<0?(P.current.top=B,P.current.bottom=T):(P.current.top=je(P.current.top,B,7,j),P.current.bottom=je(P.current.bottom,T,7,j));const N=30*Math.PI/180,$=Math.tan(N/2),K=innerHeight,W=1.3,J=1-2*P.current.top/K,ce=1-2*P.current.bottom/K;let re=2.5,ve=60,ee=8,Oe=0;for(let be=0;be<22;be++)ee=(re+ve)/2,Oe=Math.atan(W/ee)+Math.atan(ce*$),Math.tan(Oe+Math.atan((Yh-W)/ee))/$>J?re=ee:ve=ee;return ee=Math.max(ee,.75/($*innerWidth/K)),{pos:[ne.x+Math.sin(H)*ee,V+W,ne.z+Math.cos(H)*ee],look:[ne.x,V+W-Math.tan(Oe)*ee,ne.z],lens:N,mix:1}},G=[s.bus.on("people",()=>u(s.player.sheet.people||"unit")),s.bus.on("class",()=>p(s.player.sheet.cls)),s.bus.on("frame",Y=>{s.started||(w.current+=Y,s.player.yaw=0,s.camera.rail=D(w.current,Y))})];return()=>{for(const Y of G)Y();clearTimeout(y.current)}},[s]),De(()=>{const S=z.current;S&&(S.inert=g)},[g]);const E=S=>{if(s.started)return;const D=s.store.loadHero(S);D&&(s.load(D),v(D.id),u(s.player.sheet.people||"unit"),p(s.player.sheet.cls)),a(n())},U=()=>{s.started||(s.hero=null,v(null),s.chooseClass(s.player.sheet.cls),r(!0),d(null))},Q=S=>{if(s.started)return;s.store.deleteHero(S,s.account),d(null);const D=n();a(D),D.length>0?(E(D[0].id),r(!1)):U()},L=()=>{if(s.started)return;const S=n();a(S),S.length>0&&(E(S[0].id),r(!1))},F=(S,D)=>{const Y={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[S.key];if(!Y||!D)return;const j=Array.from(D.children).filter(ge=>ge instanceof HTMLElement);if(!j.length)return;const ne=j.indexOf(document.activeElement),V=j[(ne+Y+j.length)%j.length];V.focus(),V.click(),S.preventDefault()},O=()=>{if(s.started)return;document.body.classList.remove("titled"),document.activeElement instanceof HTMLElement&&document.activeElement.blur(),x(!0),y.current=window.setTimeout(()=>_(!0),1e3),s.camera.rail=null,s.player.yaw=Math.PI,s.begin(),t();const[S,D]=s.savedView||[yo.behind[0],yo.behind[1]*(s.touch?.9:1)];s.camera.goal.pitch=S,s.camera.goal.distance=D,s.player.yaw=Math.PI-s.camera.goal.yaw};return b?null:l("div",{id:"title",ref:z,children:l("div",{class:"select",children:[l("header",{class:"select-head",children:[l("h1",{children:"Lumenwake"}),l("p",{class:"tag",children:"Contracts across the sky islands"})]}),l("section",{class:"select-col saves",id:"saves","aria-labelledby":"pick-saves",hidden:!M||R,children:[l("h2",{class:"pick-label",id:"pick-saves",children:"Your surveyors"}),l("div",{id:"save-list",class:"save-list",role:"radiogroup","aria-labelledby":"pick-saves",children:o.map(S=>c===S.id?l("div",{class:"save-ask",role:"group","aria-label":"Let this surveyor go?",children:[l("p",{children:["Let this surveyor go? Level ",l("b",{class:"c-num",children:S.level}),", and everything they carry."]}),l("div",{children:[l("button",{type:"button",class:"btn","data-keep":S.id,onClick:()=>d(null),children:"Keep"}),l("button",{type:"button",class:"btn danger","data-gone":S.id,onClick:()=>Q(S.id),children:"Let go"})]})]},S.id):l("div",{class:"save-row",children:[l("button",{type:"button",class:"pick",role:"radio","data-hero":S.id,"aria-checked":m===S.id?"true":"false",onClick:()=>E(S.id),children:[l("img",{src:It(`people-${S.people}`),alt:""}),l("span",{class:"pick-words",children:[l("strong",{children:[wt[S.people].name," ",l("b",{class:`c-${S.cls}`,children:ze[S.cls].name})]}),l("span",{children:["Level ",l("b",{class:"c-num",children:S.level})," · ",S.missions," ",S.missions===1?"contract":"contracts"]}),l("small",{children:[ph(S.played)," played"]})]})]}),l("button",{type:"button",class:"x","data-drop":S.id,"aria-label":"Let this surveyor go",title:"Let this surveyor go",onClick:()=>d(S.id),children:"×"})]},S.id))}),l("button",{type:"button",id:"btn-create",class:"btn",onClick:U,children:"New surveyor"})]}),l("section",{class:"select-col people","aria-labelledby":"pick-people",children:[l("h2",{class:"pick-label",id:"pick-people",children:"Who you are"}),l("div",{ref:C,id:"people-pick",class:"people-pick",role:"radiogroup","aria-labelledby":"pick-people",onKeyDown:S=>F(S,C.current),children:Cr.map(S=>l("button",{type:"button",class:"pick people-tile",role:"radio","data-people":S,"aria-checked":h===S?"true":"false",onClick:()=>{s.started||s.choosePeople(S)},children:[l("img",{src:It(`people-${S}`),alt:"",loading:"eager"}),l("span",{class:"pick-words",children:[l("strong",{children:wt[S].name}),l("span",{children:wt[S].blurb})]})]},S))})]}),l("section",{class:"select-col classes","aria-labelledby":"pick-class",children:[l("h2",{class:"pick-label",id:"pick-class",children:"Your class"}),l("div",{ref:k,id:"class-pick",class:"class-pick",role:"radiogroup","aria-labelledby":"pick-class",onKeyDown:S=>F(S,k.current),children:Wh.map(S=>{const D=ze[S];return l("button",{type:"button",class:`pick class-card c-${S}`,role:"radio","data-class":S,"aria-checked":f===S?"true":"false",onClick:()=>{s.started||s.chooseClass(S)},children:[l("img",{src:It(`class-${S}`),alt:"",loading:"eager"}),l("span",{class:"pick-words",children:[l("strong",{children:D.name}),l("span",{children:D.blurb}),l("small",{children:[Ut[D.family].name," · ",D.abilities.map(G=>Os[G].name).join(", ")]})]})]},S)})})]}),l("footer",{class:"select-foot",children:[l("p",{id:"select-summary",role:"status","aria-live":"polite",children:[l("b",{class:"c-name",children:wt[h].name})," ",l("b",{class:`c-${f}`,children:ze[f].name})]}),l("div",{class:"title-actions",children:[l("button",{type:"button",id:"btn-begin",class:"primary",onClick:O,children:M&&!R?"Continue":"Begin"}),l("button",{type:"button",id:"btn-new",hidden:!M||!R,onClick:L,children:"Your surveyors"})]}),l("p",{class:"keys",id:"keys-hint",children:e?"The stick walks  ·  tap to fight or talk":"WASD to move  ·  F attack  ·  Space jump"})]})]})})}function Yn(s){return Math.round(Math.max(0,Math.min(1,s))*200)/200}function Li(s){const e=s.player,t=e.sheet,n=Math.max(1,e.maxHp),o=Math.max(1,e.maxFocus),a=Math.max(1,Gs(t.level)),i=t.lumen,r=e.target&&e.target.kind==="monster"&&!e.target.dead&&!e.target.boss?e.target:null,c=s.monsters.find(v=>v.boss&&!v.dead)||null,d=s.missions,h=wn(s),u=[!1,!1,!1,!1],f=[!1,!1,!1,!1],p=[0,0,0,0];for(let v=0;v<4;v++){const g=h[v];g&&(u[v]=t.level<g.unlock,f[v]=e.focus<g.focus,p[v]=Math.round((s.skills.cooldowns[v]||0)/Math.max(.001,g.cooldown)*100))}let m="idle";if(s.touch){const v=s.controls.actTarget();m=v?v.kind==="npc"?"talk":"attack":"idle"}return{name:e.name||"Surveyor",people:t.people||"unit",cls:t.cls,level:t.level,glint:t.glint,hp:Math.ceil(e.hp),maxHp:e.maxHp,hpRatio:Yn(e.hp/n),low:!!s.low,focus:Math.floor(e.focus),maxFocus:e.maxFocus,focusRatio:Yn(e.focus/o),xpPct:Math.round(t.xp/a*100),xpRatio:Yn(t.xp/a),boon:t.boon,due:t.picks>0||t.points>0,lumenKind:i.kind,lumenLevel:Sn(i),lumenCharge:Math.round(i.charge),lumenFull:i.charge>=100,tracker:d.track(),skillLocked:u,skillDry:f,skillCdPct:p,tonicCount:s.loot.count("tonic"),draughtCount:s.loot.count("draught"),actMode:m,targetName:r?r.name:"",targetLevel:r?r.level:0,targetRatio:r?Yn(r.hp/Math.max(1,r.maxHp)):0,bossName:c?c.name:"",bossSub:c?c.enraged?"Wounded, and faster for it":c.def.epithet||"":"",bossDefId:c?c.defId:"",bossMad:!!c?.enraged,bossRatio:c?Yn(c.hp/Math.max(1,c.maxHp)):0,zoneName:d.active?d.active.offer.name:s.biome.name,clockText:d.active?(d.active.offer.depth||1)>1?`Depth ${d.active.offer.depth} · ${s.biome.name}`:s.biome.name:"Aloft",missionActive:!!d.active}}function jh(s,e){return s.name===e.name&&s.people===e.people&&s.cls===e.cls&&s.level===e.level&&s.glint===e.glint&&s.hp===e.hp&&s.maxHp===e.maxHp&&s.hpRatio===e.hpRatio&&s.low===e.low&&s.focus===e.focus&&s.maxFocus===e.maxFocus&&s.focusRatio===e.focusRatio&&s.xpPct===e.xpPct&&s.xpRatio===e.xpRatio&&s.boon===e.boon&&s.due===e.due&&s.lumenKind===e.lumenKind&&s.lumenLevel===e.lumenLevel&&s.lumenCharge===e.lumenCharge&&s.lumenFull===e.lumenFull&&s.tracker===e.tracker&&s.tonicCount===e.tonicCount&&s.draughtCount===e.draughtCount&&s.actMode===e.actMode&&s.targetName===e.targetName&&s.targetLevel===e.targetLevel&&s.targetRatio===e.targetRatio&&s.bossName===e.bossName&&s.bossSub===e.bossSub&&s.bossDefId===e.bossDefId&&s.bossMad===e.bossMad&&s.bossRatio===e.bossRatio&&s.zoneName===e.zoneName&&s.clockText===e.clockText&&s.missionActive===e.missionActive&&s.skillLocked[0]===e.skillLocked[0]&&s.skillLocked[1]===e.skillLocked[1]&&s.skillLocked[2]===e.skillLocked[2]&&s.skillLocked[3]===e.skillLocked[3]&&s.skillDry[0]===e.skillDry[0]&&s.skillDry[1]===e.skillDry[1]&&s.skillDry[2]===e.skillDry[2]&&s.skillDry[3]===e.skillDry[3]&&s.skillCdPct[0]===e.skillCdPct[0]&&s.skillCdPct[1]===e.skillCdPct[1]&&s.skillCdPct[2]===e.skillCdPct[2]&&s.skillCdPct[3]===e.skillCdPct[3]}function Zh(s,e){const t=Array.from(e.querySelectorAll("button, input, select, textarea, a[href], [tabindex]")).filter(i=>!i.disabled&&i.tabIndex>=0&&i.getClientRects().length>0),n=document.activeElement,o=t[0],a=t[t.length-1];return o?!e.contains(n)||n===e||(s.shiftKey?n===o:n===a)?((s.shiftKey?a:o).focus(),!0):!1:!0}function Jh({game:s}){const e=Jo(()=>oh(s),[s]),[t,n]=le(()=>Li(s)),[o,a]=le(()=>s.portraits.bust||""),[i,r]=le(0),[c,d]=le(()=>!!s.touch),[h,u]=le([]),[f,p]=le({title:"",sub:"",show:!1}),[m,v]=le(null),[g,x]=le(null),[b,_]=le(null),[z,C]=le(null),[k,P]=le("character"),[w,y]=le(null),[M,R]=le(null),[E,U]=le(0),[Q,L]=le(0),[F,O]=le({gear:"",food:"",shop:""}),[S,D]=le({open:!1,view:"root",section:"display",asking:!1,direct:!1}),G=me(null),Y=me(null),j=me(null),ne=me(null),V=me(null),ge=me(null),I=me(null),H=me(null),B=me(null),T=me(t);T.current=t;const N=me(z);N.current=z;const $=me(k);$.current=k;const K=me(S);K.current=S;const W=me(g);W.current=g;const J=me(1),ce=me(new Set),re=me(0),ve=me(0),ee=Ye(te=>{const ie=J.current++;u(gt=>[...gt.slice(-4),{id:ie,segments:te,old:!1}]);const ye=window.setTimeout(()=>{ce.current.delete(ye),u(gt=>gt.map(tn=>tn.id===ie?{...tn,old:!0}:tn))},5200),Ke=window.setTimeout(()=>{ce.current.delete(Ke),u(gt=>gt.filter(tn=>tn.id!==ie))},6200);ce.current.add(ye),ce.current.add(Ke)},[]),Oe=Ye(te=>{ee(gh(te))},[ee]),be=Ye((te,ie="",ye=2.8)=>{p({title:te,sub:ie,show:!0}),clearTimeout(re.current),re.current=window.setTimeout(()=>{p(Ke=>({...Ke,show:!1}))},ye*1e3)},[]),$e=Ye(()=>{v(null),clearTimeout(ve.current)},[]),Je=Ye(()=>{const te=Y.current;if(!te||te.clientHeight<=0)return;let ie=-5;const ye=Array.from(te.children);for(const gt of ye)ie+=gt.offsetHeight+5;let Ke=0;for(;ye.length-Ke>1&&ie>te.clientHeight+1;)ie-=ye[Ke].offsetHeight+5,Ke++;Ke>0&&u(gt=>gt.slice(Ke))},[]);De(()=>{Je()},[h.length,Je]);const pt=Ye(()=>{const te=G.current;if(!te)return;const ie=ea(te),ye=s.canvas.getBoundingClientRect(),Ke=!document.body.classList.contains("titled")&&!document.body.classList.contains("cine");s.renderer.minimap.rect=[ie.left-ye.left+ie.width/2,ie.top-ye.top+ie.height/2,Ke?ie.width/2-3:0,.62*Math.max(1,150/Math.max(ie.width,1))]},[s]),mt=Ye(()=>{document.body.classList.toggle("compact",!!s.touch||innerWidth<900||innerHeight<640),s.resize(),pt(),Je()},[s,pt,Je]);De(()=>{s.halt=S.open||z==="menu"},[s,S.open,z]),De(()=>{document.body.classList.toggle("has-boon",!!t.boon)},[t.boon]);const Tt=Ye(()=>{document.activeElement instanceof HTMLElement&&document.activeElement!==document.body&&document.activeElement.blur()},[]),Le=Ye(()=>{N.current&&(C(null),Tt())},[Tt]),Re=Ye((te,ie)=>{!s.started||s.cinema.blocking||(C(te),ie&&P(ie),U(ye=>ye+1),L(ye=>ye+1),s.bus.emit("ui:click"))},[s]),qn=Ye(te=>{N.current==="menu"&&$.current===te?Le():Re("menu",te)},[Le,Re]),Ln=Ye(te=>{const ie=Et.findIndex(Ke=>Ke.id===$.current),ye=Et[(ie+te+Et.length)%Et.length].id;Re("menu",ye)},[Re]),fn=Ye((te="root",ie)=>{if(!s.started||s.cinema.blocking)return;const ye=K.current.open;D(Ke=>({open:!0,view:te,section:ie||Ke.section,asking:!1,direct:!ye&&te==="settings"})),ye||s.bus.emit("ui:click")},[s]),St=Ye(()=>{K.current.open&&(D(te=>({...te,open:!1,asking:!1})),Tt())},[Tt]),de=Ye(()=>{const te=K.current;te.asking?D(ie=>({...ie,asking:!1})):te.view==="settings"&&!te.direct?D(ie=>({...ie,view:"root"})):St()},[St]),Ve=Ye(()=>{W.current&&(x(null),s.bus.emit("report:closed"))},[s]),Nt=Ye((te,ie)=>{O(ye=>ye[te]===ie?ye:{...ye,[te]:ie})},[]),vt=Ye(()=>{L(te=>te+1)},[]);return De(()=>{Object.keys(s.portraits.gear).length>0&&mi(s.portraits.gear),Object.keys(s.portraits.elders).length>0&&pi(s.portraits.elders),s.portraits.bust&&a(s.portraits.bust);const te=ne.current,ie=V.current,ye=te&&ie?new lh(s,te,ie):null,Ke=j.current?dh(s,j.current):()=>{},gt=ch(s,()=>{d(!0),L(q=>q+1),mt()}),tn=ge.current&&I.current?fh(s,ge.current,I.current):()=>{},X=s.bus;let Cn=0;const Ue=()=>{N.current&&L(q=>q+1)},Sr=[X.on("frame",q=>{ye?.update(q);const pe=Li(s);jh(T.current,pe)||(T.current=pe,n(pe))}),X.on("portrait",q=>{q.gear&&mi(q.gear),q.elders&&pi(q.elders),q.bust&&a(q.bust),r(pe=>pe+1),Ue()}),X.on("ui:toggle",q=>{q==="sound"?(e.set("mute",!e.values.mute),ee([{text:"Sound "},{text:e.values.mute?"off":"on",className:e.values.mute?"c-bad":"c-good",bold:!0}])):q==="view"?fn("settings","controls"):_i[q]&&qn(_i[q])}),X.on("ui:close",()=>{Le(),Ve(),$e()}),X.on("ui:escape",()=>{K.current.open?de():N.current?Le():W.current?Ve():s.started&&!s.cinema.blocking&&($e(),s.controls.clearTarget()||fn("root"))}),X.on("npc:talk",q=>{if(q.role==="shop"||q.role==="bounty"){y(q),Re(q.role);return}const pe=q.says&&q.says.length?q.says:["Fair winds."];q.sayIdx=(q.sayIdx+1)%pe.length,X.emit("talk",{name:q.name,title:q.title||"",people:q.people,line:pe[q.sayIdx]})}),X.on("talk",q=>{v({name:q.name,title:q.title,line:q.line}),clearTimeout(ve.current),ve.current=window.setTimeout($e,5200)}),X.on("moveclick",$e),X.on("zone",Le),X.on("cine:begin",q=>{$e(),q.blocking&&(St(),Le())}),X.on("mission:begin",q=>{$e(),Ve(),s.cinema.quiet&&be(q.offer.name,`${q.biome.name} · ${hs[q.offer.goal].name}`,4)}),X.on("mission:report",q=>{x(q)}),X.on("begin",()=>{s.store.failed&&be("This browser will not keep your journey","A private window, or its storage is full. Settings, Saves can keep a copy in a file.",6)}),X.on("settings",q=>{(!q.key||q.key==="text")&&mt()}),X.on("guide",q=>{R(q)}),X.on("guide:chapter",q=>{q.id!=="town"&&be(q.title,"",2.4)}),X.on("guide:done",q=>{q.quiet||(q.skipped?ee([{text:"First steps skipped. The "},{text:"Guide",className:"c-key",bold:!0},{text:" has the controls, and the menu can start them again."}]):be("The board is yours","Three contracts, three places. Each is laid out afresh.",5))}),X.on("log",q=>Oe(q.text)),X.on("pickup",q=>{if(q.gear){const bt=ft(q.gear);ee([{text:"Picked up "},{text:bt.name,color:bt.color,bold:!0},{text:" "},{text:bt.rarity,className:"dim"}]);return}if(!q.item)return;const pe=Ce[q.item],un=q.n??1;if(pe.kind==="coin")ee([{text:`+${un} glint`,className:"c-coin",bold:!0}]);else{const bt=[{text:"Picked up "},{text:pe.name,className:"c-item",bold:!0}];un>1&&bt.push({text:" "},{text:`×${un}`,className:"c-num",bold:!0}),ee(bt)}}),X.on("equip",q=>{if(!q.item)return;const pe=ft(q.item);ee([{text:"Now using "},{text:pe.name,color:pe.color,bold:!0},{text:"."}])}),X.on("relic:found",q=>{const pe=q.first??(s.player.sheet.relics[q.id]||0)<=1;be(ft(q.item).name,pe?"A relic. The Gear tab says what it does.":"A relic, again.",4.6)}),X.on("salvage",q=>{q.count===1&&ee([{text:"Salvaged: "},{text:`+${q.parts} parts`,className:"c-parts",bold:!0},{text:"."}])}),X.on("hone",q=>{const pe=ft(q.item);ee([{text:"Honed "},{text:pe.name,color:pe.color,bold:!0},{text:" to level "},{text:String(q.item.ilvl),className:"c-num",bold:!0},{text:"."}])}),X.on("boss:arrive",q=>{s.cinema.quiet&&be(q.name,"It holds this island.",3.2)}),X.on("boss:fell",q=>{ee([{text:q.name,className:"c-foe",bold:!0},{text:" is down."}])}),X.on("boss:enrage",q=>{ee([{text:q.name,className:"c-foe",bold:!0},{text:" is wounded, and faster for it."}])}),X.on("talent",q=>{ee([{text:"Talent taken: "},{text:q.name,className:"c-key",bold:!0},{text:"."}])}),X.on("levelup",q=>{be(`Level ${q.level}`,s.touch?"A talent to choose.":"A talent to choose: press C.",3.6)}),X.on("trade",q=>{const pe=q.kind==="sell"&&!q.name&&q.glint||0;pe>0&&ee([{text:"Sold materials for "},{text:`${pe} glint`,className:"c-coin",bold:!0}])}),X.on("monster:died",q=>{q.elite&&ee([{text:"You felled an "},{text:q.name,className:"c-foe",bold:!0},{text:"."}])}),X.on("xp",q=>{q.amount>=40&&ee([{text:`+${q.amount} experience`,className:"c-xp",bold:!0}])}),X.on("mission:taken",q=>{q&&be(q.name,"Taken. Step onto the pad at the south gate.",4)}),X.on("room:wave",q=>{q.wave>0&&ee([{text:"More of them."}])}),X.on("room:clear",q=>{q.kind!=="boss"&&(q.kind==="cache"||q.kind==="side"?ee([{text:"Clear.",className:"c-good",bold:!0}]):ee([{text:"Island clear.",className:"c-good",bold:!0},{text:" The gate is down."}]))}),X.on("pod:open",q=>{q.core&&be("A survey core",s.missions.track(),3)}),X.on("site:used",q=>{const pe=[{text:q.name,className:"c-key",bold:!0}];q.text&&pe.push({text:" · "},...zr(q.text)),ee(pe)}),X.on("site:guard",q=>{const pe=q.name||ts[q.site].name;ee([{text:"Something was sitting on the "},{text:pe.toLowerCase(),className:"c-key",bold:!0},{text:": "},{text:q.guard.name,className:"c-foe",bold:!0},{text:"."}])}),X.on("mission:done",q=>{if(window.clearTimeout(Cn),!q.choose){_(null),be(q.offer.depth&&q.offer.depth>1?`Depth ${q.offer.depth} done`:"Contract done","Lifting out…",2.6);return}Cn=window.setTimeout(()=>_(Ah(s)),1800)}),X.on("run:deeper",()=>{window.clearTimeout(Cn),_(null)}),X.on("mission:report",()=>{window.clearTimeout(Cn),_(null)}),X.on("lumen:ready",()=>{const q=zt[s.player.sheet.lumen.kind].burst.name,pe=[{text:"Your lumen is full: "},{text:q,className:"c-key",bold:!0},{text:" is ready"}];s.touch||pe.push({text:" ("},{text:"G",className:"c-key",bold:!0},{text:")"}),pe.push({text:"."}),ee(pe)}),X.on("lumen:burst",q=>{ee([{text:q.burst.name,className:"c-key",bold:!0}])}),X.on("lumen:changed",q=>{be(`Your lumen is now a ${q.name}`,zt[q.kind].blurb,4.5)}),X.on("lumen:level",q=>{ee([{text:"Your lumen is level "},{text:String(q.level),className:"c-num",bold:!0},{text:"."}])}),X.on("lumen:changed",Ue),X.on("lumen:level",Ue),X.on("lumen:ready",Ue),X.on("lumen:burst",Ue),X.on("bag:changed",Ue),X.on("levelup",Ue),X.on("trade",Ue),X.on("xp",Ue),X.on("boon",Ue),X.on("talent",Ue),X.on("mission:taken",Ue),X.on("mission:begin",Ue),X.on("mission:progress",Ue),X.on("mission:done",Ue),X.on("room:clear",Ue),X.on("site:used",Ue),X.on("class",Ue),X.on("people",Ue)],sa=q=>{if(!s.started||s.cinema.blocking)return;const pe=q.target instanceof Element&&/INPUT|TEXTAREA|SELECT/.test(q.target.tagName),un=K.current.open,bt=un?B.current:N.current?H.current:null;if(!bt){W.current&&q.code==="Escape"?(Ve(),q.preventDefault(),q.stopImmediatePropagation()):q.code==="KeyH"&&!q.repeat&&!pe&&!q.metaKey&&!q.ctrlKey&&!q.altKey&&X.emit("ui:toggle","help");return}if(q.stopImmediatePropagation(),q.repeat&&(q.code==="Escape"||/^Key/.test(q.code))){pe||q.preventDefault();return}let fs=!1;if(un){if(q.code==="Escape")de(),fs=!0;else if(!q.metaKey&&!q.ctrlKey&&!q.altKey&&q.target instanceof Element){const us=q.code==="ArrowDown"?1:q.code==="ArrowUp"?-1:0;if(us){const ps=q.target,pn=ps.matches(".pause-item, .pause-ask .btn")?Array.from(bt.querySelectorAll(".pause-item, .pause-ask .btn")):ps.matches(".set-tab")?Array.from(bt.querySelectorAll(".set-tab")):null;if(pn&&pn.length){const aa=pn[(pn.indexOf(ps)+us+pn.length)%pn.length];ps.matches(".set-tab")?aa.click():aa.focus(),fs=!0}}}}else fs=Ch(q,H.current,N.current,$.current,s,{onClose:Le,onToggleTab:qn,onSelectTab:us=>Re("menu",us),onStepTab:Ln});(fs||q.code==="Tab"&&Zh(q,bt))&&q.preventDefault()};addEventListener("keydown",sa,!0),addEventListener("resize",mt);const oa=typeof ResizeObserver<"u"?new ResizeObserver(mt):null;return oa?.observe(s.canvas),mt(),()=>{for(const q of Sr)q();clearTimeout(Cn),removeEventListener("keydown",sa,!0),removeEventListener("resize",mt),oa?.disconnect(),ye?.destroy(),Ke(),gt(),tn(),clearTimeout(re.current),clearTimeout(ve.current);for(const q of ce.current)clearTimeout(q);ce.current.clear(),s.halt=!1}},[s,e,mt,Le,Re,qn,Ln,fn,St,de,Ve,$e,ee,Oe,be]),l(oe,{children:[l(Gh,{game:s,store:e,hud:t,bust:o,artRev:i,touch:c,logs:h,toast:f,choice:b,talk:m,report:g,windowKind:z,windowTab:k,trader:w,tutorialStep:M,windowOpenSeq:E,windowRev:Q,picked:F,pauseState:S,ringRef:G,logRef:Y,stickRef:j,platesRef:ne,floatersRef:V,tutorMarkRef:ge,tutorPointRef:I,winRef:H,pauseRef:B,onPlaceMap:pt,onLumenClick:()=>{s.companion.burst()||s.bus.emit("ui:toggle","lumen")},onMenuOpen:te=>{te==="menu"?fn("root"):s.bus.emit("ui:toggle",te)},onCloseReport:Ve,onPick:Nt,onSelectTab:te=>Re("menu",te),onCloseWindow:Le,onMutateWindow:vt,onPauseResume:St,onPauseBack:de,onPauseOpenSettings:()=>D(te=>({...te,view:"settings",direct:!1})),onPauseSelectSection:te=>D(ie=>({...ie,section:te})),onPauseOpenGuide:()=>{St(),Re("menu","guide")},onPauseRestartSteps:()=>{St(),s.bus.emit("guide:restart")},onPauseAskQuit:te=>D(ie=>({...ie,asking:te}))}),l(yh,{game:s,onLayout:mt}),l(Xh,{game:s,touch:c,onBegan:mt})]})}function Qh(s){const e=document.getElementById("ui-root");return e?(oi(l(Jh,{game:s}),e),()=>{oi(null,e)}):()=>{}}const Ci=document.getElementById("view");try{if(!Ci)throw new Error("Canvas element #view not found");const s=new Yc(Ci);Qh(s);try{Ed(s)}catch(e){console.warn("Audio unavailable:",e)}s.start()}catch(s){console.error(s);const e=document.getElementById("fatal");if(e){e.hidden=!1;const t=e.querySelector("p");t&&(t.textContent=String(s instanceof Error?s.message:s))}}
