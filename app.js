import * as THREE from "three";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "enchanted-dream-museum-v3";
const defaultData = {
  name:"Enchanted Dream Museum", subtitle:"A little world of treasured moments",
  exhibits:Array.from({length:6},(_,i)=>({title:`Treasured Moment ${i+1}`,description:"A memory worth keeping forever.",image:"",frame:["gold","rose","crystal"][i%3]}))
};
let data = loadData(), scene, camera, renderer, clock, museumReady=false, yaw=0, pitch=0, move={x:0,y:0}, look={x:0,y:0}, keys={}, dragging=false, lastPointer=null;
const frames=[], textures=[], raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
let player={x:0,z:3.4}, tapStart=null;

function loadData(){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const d=JSON.parse(raw);if(d.exhibits?.length===6)return d;}}catch(e){}return structuredClone(defaultData)}
// A published museum-data.json beside the site is the shared gallery.
async function loadPublishedGallery(){
 try{
   const response=await fetch("./museum-data.json?ts="+Date.now(),{cache:"no-store"});
   if(!response.ok)return;
   const published=await response.json();
   if(!published || !Array.isArray(published.exhibits) || published.exhibits.length!==6)return;
   data={...structuredClone(defaultData),...published};
   setupEditor();
   if(scene)rebuildFrames();
   $("museumHeading").textContent=data.name||"Enchanted Dream Museum";
   toast("Shared gallery loaded ✦");
 }catch(e){/* No published gallery yet: use this browser's saved gallery. */}
}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));return true}catch(e){toast("Storage is full. Try using smaller photos.");return false}}
function toast(message){const n=$("notice");n.textContent=message;n.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove("show"),3000)}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function setupEditor(){
 $("museumName").value=data.name;$("museumSubtitle").value=data.subtitle;$("museumHeading").textContent=data.name;
 $("exhibitsForm").innerHTML=data.exhibits.map((e,i)=>`<div class="exhibit" data-index="${i}"><h3>EXHIBIT ${String(i+1).padStart(2,"0")}</h3><input class="title" maxlength="70" placeholder="Title above the frame" value="${escapeHtml(e.title)}"><textarea class="description" maxlength="220" placeholder="Description">${escapeHtml(e.description)}</textarea><div class="small-row"><select class="frame"><option value="gold" ${e.frame==="gold"?"selected":""}>Gold frame</option><option value="rose" ${e.frame==="rose"?"selected":""}>Rose frame</option><option value="crystal" ${e.frame==="crystal"?"selected":""}>Crystal frame</option></select><button type="button" class="pill photo-btn" data-photo="${i}">Photo</button></div><input class="image-url" maxlength="500" placeholder="Optional image URL" value="${escapeHtml(e.image?.startsWith("data:")?"":e.image||"")}"></div>`).join("");
 $("exhibitsForm").querySelectorAll(".photo-btn").forEach(b=>b.addEventListener("click",()=>{activePhoto=+b.dataset.photo;$("photoPicker").click()}));
 $("museumName").addEventListener("input",e=>{data.name=e.target.value||"My Dream Museum";$("museumHeading").textContent=data.name});
 $("museumSubtitle").addEventListener("input",e=>data.subtitle=e.target.value);
 $("exhibitsForm").querySelectorAll(".exhibit").forEach((el,i)=>{el.querySelector(".title").addEventListener("input",e=>data.exhibits[i].title=e.target.value);el.querySelector(".description").addEventListener("input",e=>data.exhibits[i].description=e.target.value);el.querySelector(".frame").addEventListener("change",e=>data.exhibits[i].frame=e.target.value);el.querySelector(".image-url").addEventListener("change",e=>{if(e.target.value.trim())data.exhibits[i].image=e.target.value.trim();});});
}
let activePhoto=0;
$("photoPicker").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){toast("Please choose an image file.");return}if(file.size>5*1024*1024){toast("Choose a photo smaller than 5 MB.");e.target.value="";return}try{const url=await compressImage(file);data.exhibits[activePhoto].image=url;const input=$("exhibitsForm").querySelectorAll(".image-url")[activePhoto];if(input)input.value="";toast("Photo added to exhibit "+(activePhoto+1)+". Tap Save changes.");}catch(err){toast("Couldn't load that photo. Try another one.")}e.target.value=""});
function compressImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL("image/jpeg",.82))};img.onerror=reject;img.src=url})}
function saveEditor(){document.querySelectorAll(".exhibit").forEach((el,i)=>{data.exhibits[i].title=el.querySelector(".title").value;data.exhibits[i].description=el.querySelector(".description").value;data.exhibits[i].frame=el.querySelector(".frame").value;const url=el.querySelector(".image-url").value.trim();if(url)data.exhibits[i].image=url;});data.name=$("museumName").value.trim()||"My Dream Museum";data.subtitle=$("museumSubtitle").value.trim();$("museumHeading").textContent=data.name;persist();rebuildFrames();toast("Your museum has been saved on this device ✦")}
$("saveBtn").addEventListener("click",saveEditor);
$("publishBtn").addEventListener("click",()=>{
 saveEditor();
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download="museum-data.json";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast("Gallery exported. Upload museum-data.json to your website repository root.");
});
$("enterBtn").addEventListener("click",()=>{saveEditor();$("editor").hidden=true;toast("Welcome to "+data.name+" ✦");});
$("closeEditor").addEventListener("click",()=>{$("editor").hidden=true;toast("Welcome inside your museum ✦")});
$("editorBtn").addEventListener("click",()=>{$("editor").hidden=false;setupEditor()});
$("openEditor").addEventListener("click",()=>{$("editor").hidden=false;setupEditor()});
$("helpBtn").addEventListener("click",()=>$("help").hidden=false);
$("closeHelp").addEventListener("click",()=>$("help").hidden=true);
$("startFromHelp").addEventListener("click",()=>$("help").hidden=true);
$("qrBtn").addEventListener("click",()=>{const area=$("qrArea");area.hidden=false;area.innerHTML="";const url=location.href.split("#")[0];const img=document.createElement("img");img.alt="QR code for museum website";img.src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="+encodeURIComponent(url);const p=document.createElement("p");p.textContent="Scan to open this website. This does not sync photos to other devices.";area.append(img,p)});
$("uploadAll").addEventListener("click",()=>{activePhoto=0;$("photoPicker").click();toast("Choose a photo for exhibit 1, or use a Photo button beside any exhibit.")});

function init3D(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x0b0615);scene.fog=new THREE.FogExp2(0x0b0615,.035);
 camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,100);camera.position.set(player.x,1.62,player.z);
 renderer=new THREE.WebGLRenderer({canvas:$("museum"),antialias:true,alpha:false,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 clock=new THREE.Clock();
 scene.add(new THREE.HemisphereLight(0xd9c9ff,0x25132d,2.1));
 const ambient=new THREE.AmbientLight(0xffffff,.48);scene.add(ambient);
 const light=new THREE.PointLight(0xffdba2,35,22);light.position.set(0,4.7,0);light.castShadow=true;scene.add(light);
 const fill=new THREE.PointLight(0x9674ff,18,18);fill.position.set(-4,2.7,-1);scene.add(fill);
 buildRoom();rebuildFrames();buildDust();
 window.addEventListener("resize",onResize);
 renderer.domElement.addEventListener("pointerdown",onPointerDown);renderer.domElement.addEventListener("pointermove",onPointerMove);renderer.domElement.addEventListener("pointerup",onPointerUp);renderer.domElement.addEventListener("pointercancel",onPointerUp);
 window.addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault()});
 window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
 setupJoystick("moveJoy",v=>move=v);setupJoystick("lookJoy",v=>look=v);
 museumReady=true;animate();setTimeout(()=>$("loading").classList.add("done"),450);
}
function mat(color,roughness=.7,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness})}
function box(w,h,d,material,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m}
function buildRoom(){
 const floor=box(13,.35,15,mat(0x21152b,.42,.12),0,-.2,-2);floor.receiveShadow=true;
 box(13,.25,15,mat(0x49315b,.4,.15),0,5.25,-2);
 box(.3,5.5,15,mat(0x241632),-6.5,2.5,-2);box(.3,5.5,15,mat(0x241632),6.5,2.5,-2);
 box(13,5.5,.3,mat(0x1b1029),0,2.5,-9.5);
 // decorative wall panels and gold trims
 for(let x=-5.6;x<=5.61;x+=1.4){box(.035,4.6,.06,mat(0x795a82,.35,.5),x,2.45,-9.31)}
 for(let y of [.2,4.8])box(12.7,.07,.08,mat(0xd0ad70,.25,.65),0,y,-9.27);
 // ceiling stars / luminous rings
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.4,.025,8,72),new THREE.MeshStandardMaterial({color:0xd6b878,metalness:.75,roughness:.3,emissive:0x5c3c12}));ring.rotation.x=Math.PI/2;ring.position.set(0,5.08,-2);scene.add(ring);
 for(let i=0;i<22;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.025,8,8),new THREE.MeshBasicMaterial({color:i%2?0xe9d5a4:0xc5a9ff}));s.position.set((Math.random()-.5)*11,Math.random()*4.7-0.1,(Math.random()-.5)*12-2);scene.add(s)}
 // floor inlaid stone tiles and subtle brass seams
 const seamMat=mat(0x6e5379,.5,.25);
 for(let x=-6;x<=6;x+=1.5)box(.018,.012,14,seamMat,x,-.018,-2);
 for(let z=-9;z<=5;z+=1.5)box(12,.012,.018,seamMat,0,-.018,z);
 // tall architectural pilasters, baseboards and crown moulding
 for(let x=-5.8;x<=5.81;x+=2.9){
   box(.18,4.9,.22,mat(0x493253,.38,.35),x,2.4,-9.12);
   box(.25,.12,.3,mat(0xd0ad70,.25,.7),x,.12,-9.05);
   box(.25,.12,.3,mat(0xd0ad70,.25,.7),x,4.75,-9.05);
 }
 // luminous tall side windows with mullions create depth and a sense of place
 for(let side of [-1,1])for(let z of [-6.2,-2.5,1.2]){
   const pane=new THREE.MeshStandardMaterial({color:0x493a72,emissive:0x32245b,roughness:.25,metalness:.2});
   box(.035,2.5,1.25,pane,side*6.31,2.9,z);
   box(.06,2.65,.07,mat(0xc6a7ef,.3,.5),side*6.27,2.9,z-0.62);
   box(.06,2.65,.07,mat(0xc6a7ef,.3,.5),side*6.27,2.9,z+0.62);
   box(.06,.06,1.35,mat(0xc6a7ef,.3,.5),side*6.27,2.9,z);
 }
 // low glowing pedestals along side walls
 for(let side of [-1,1])for(let z=-6;z<2;z+=3){box(.5,.7,.5,mat(0x493356,.4,.2),side*5.5,.25,z);const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,1),new THREE.MeshStandardMaterial({color:0xc6a6ff,emissive:0x3e1d70,metalness:.4}));orb.position.set(side*5.5,.85,z);scene.add(orb)}
}
function frameMaterial(style){if(style==="rose")return new THREE.MeshStandardMaterial({color:0xc87c91,metalness:.75,roughness:.25});if(style==="crystal")return new THREE.MeshStandardMaterial({color:0x9cd9ee,metalness:.45,roughness:.18,transparent:true,opacity:.9});return new THREE.MeshStandardMaterial({color:0xe1bd72,metalness:.78,roughness:.22})}
function textureFor(exhibit){if(exhibit.image){try{const tex=new THREE.TextureLoader().load(exhibit.image,()=>{tex.colorSpace=THREE.SRGBColorSpace});tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);return tex}catch(e){}}return null}
function makeCanvasTexture(exhibit,i){const c=document.createElement("canvas");c.width=512;c.height=640;const ctx=c.getContext("2d");const g=ctx.createLinearGradient(0,0,512,640);g.addColorStop(0,["#50346c","#74495d","#334d68","#694c3f"][i%4]);g.addColorStop(1,"#110b20");ctx.fillStyle=g;ctx.fillRect(0,0,512,640);ctx.strokeStyle="#e6ce9a";ctx.lineWidth=3;ctx.strokeRect(18,18,476,604);ctx.textAlign="center";ctx.fillStyle="#f8e6c2";ctx.font="64px Georgia";ctx.fillText("✦",256,270);ctx.font="28px Georgia";ctx.fillText("YOUR MEMORY",256,340);ctx.font="19px sans-serif";ctx.fillStyle="#d9c8e6";ctx.fillText("Add a photo in Customize",256,380);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function rebuildFrames(){
 if(!scene)return;frames.forEach(g=>scene.remove(g));frames.length=0;
 data.exhibits.forEach((e,i)=>{
   const group=new THREE.Group();const x=(i-2.5)*2.05;const z=-9.12;group.position.set(x,2.62,z);
   const frame=frameMaterial(e.frame);const outer=new THREE.Mesh(new THREE.BoxGeometry(1.72,2.28,.2),frame);outer.castShadow=true;group.add(outer);
   const inner=new THREE.Mesh(new THREE.BoxGeometry(1.51,2.05,.08),mat(0x0b0810,.35));inner.position.z=.105;group.add(inner);
   let tex=textureFor(e);if(!tex)tex=makeCanvasTexture(e,i);
   const picture=new THREE.Mesh(new THREE.PlaneGeometry(1.42,1.92),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));picture.position.set(0,-.015,.15);group.add(picture);
   // title plaque mounted above frame, readable while walking in
   const plaque=new THREE.Mesh(new THREE.BoxGeometry(1.72,.34,.11),mat(0x24152f,.35,.4));plaque.position.set(0,1.28,.02);group.add(plaque);
   const titleTexture=textTexture((e.title||`Exhibit ${i+1}`).slice(0,32));const titleMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.62,.25),new THREE.MeshBasicMaterial({map:titleTexture,transparent:true}));titleMesh.position.set(0,1.28,.083);group.add(titleMesh);
   const glow=new THREE.PointLight(e.frame==="rose"?0xe88ca8:e.frame==="crystal"?0x86cfff:0xffd18a,1.1,2.8);glow.position.set(0,0,.6);group.add(glow);
   group.userData={index:i,title:e.title,description:e.description};scene.add(group);frames.push(group);
 });
}
function textTexture(text){const c=document.createElement("canvas");c.width=640;c.height=100;const ctx=c.getContext("2d");ctx.clearRect(0,0,640,100);ctx.fillStyle="#f5dfad";ctx.font="bold 31px Georgia";ctx.textAlign="center";ctx.textBaseline="middle";let s=text;while(ctx.measureText(s).width>600&&s.length>3)s=s.slice(0,-1);ctx.fillText(s,320,50);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function buildDust(){const positions=[];for(let i=0;i<300;i++)positions.push((Math.random()-.5)*12,Math.random()*5,(Math.random()-.5)*14-2);const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xe7d4ff,size:.025,transparent:true,opacity:.65})))}
function onResize(){if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7))}
function onPointerDown(e){if(e.target.closest("button,.panel"))return;dragging=true;lastPointer={x:e.clientX,y:e.clientY};tapStart={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture?.(e.pointerId)}
function onPointerMove(e){if(!dragging||!lastPointer)return;const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;yaw-=dx*.004;pitch=Math.max(-.65,Math.min(.65,pitch-dy*.003));lastPointer={x:e.clientX,y:e.clientY}}
function onPointerUp(e){if(!dragging)return;dragging=false;lastPointer=null;if(tapStart&&Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)<10)pickFrame(e);tapStart=null}
function pickFrame(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(frames,true);if(hits.length){let obj=hits[0].object;while(obj.parent&&!obj.userData.index&&obj.parent!==scene)obj=obj.parent;const g=obj.userData.index!==undefined?obj:obj.parent;if(g?.userData?.index!==undefined){const ex=data.exhibits[g.userData.index];toast((ex.title||"Exhibit")+" — "+(ex.description||"A treasured moment."))}}}
function setupJoystick(id,callback){
 const el=$(id),knob=el.querySelector(".joy-knob");let active=false,pointerId=null;
 function update(e){
   const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
   let dx=e.clientX-cx,dy=e.clientY-cy;const max=Math.max(12,(r.width-knob.offsetWidth)/2-4);
   const len=Math.hypot(dx,dy);if(len>max){dx=dx/len*max;dy=dy/len*max}
   knob.style.left=`${50+dx/r.width*100}%`;knob.style.top=`${50+dy/r.height*100}%`;
   callback({x:Math.max(-1,Math.min(1,dx/max)),y:Math.max(-1,Math.min(1,dy/max))});
 }
 function reset(e){if(!active)return;if(e&&pointerId!==null&&e.pointerId!==pointerId)return;active=false;pointerId=null;knob.style.left="50%";knob.style.top="50%";callback({x:0,y:0});}
 el.addEventListener("pointerdown",e=>{e.preventDefault();active=true;pointerId=e.pointerId;try{el.setPointerCapture(pointerId)}catch(_){}update(e)});
 el.addEventListener("pointermove",e=>{if(active&&e.pointerId===pointerId){e.preventDefault();update(e)}});
 el.addEventListener("pointerup",reset);el.addEventListener("pointercancel",reset);el.addEventListener("lostpointercapture",()=>reset());
}
function animate(){requestAnimationFrame(animate);if(!museumReady)return;const dt=Math.min(clock.getDelta(),.05);
 yaw-=look.x*dt*1.9;pitch=Math.max(-.65,Math.min(.65,pitch+look.y*dt*.8));
 let f=-move.y,r=move.x;
 if(keys.w||keys.arrowup)f-=1;if(keys.s||keys.arrowdown)f+=1;if(keys.a||keys.arrowleft)r-=1;if(keys.d||keys.arrowright)r+=1;
 // Normalize diagonal movement and use a little acceleration/deceleration.
 const inputLen=Math.hypot(f,r);if(inputLen>1){f/=inputLen;r/=inputLen}
 const speed=3.6*dt,fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
 player.x+=(fx*f+rx*r)*speed;player.z+=(fz*f+rz*r)*speed;
 player.x=Math.max(-5.75,Math.min(5.75,player.x));player.z=Math.max(-8.65,Math.min(5.5,player.z));
 camera.position.x=THREE.MathUtils.damp(camera.position.x,player.x,10,dt);camera.position.z=THREE.MathUtils.damp(camera.position.z,player.z,10,dt);camera.position.y=THREE.MathUtils.damp(camera.position.y,1.62,8,dt);
 camera.rotation.order="YXZ";camera.rotation.y=yaw;camera.rotation.x=pitch;
 renderer.render(scene,camera)}
setupEditor();
try{init3D();loadPublishedGallery()}catch(err){console.error(err);$("loading").innerHTML="<div class='moon'>✦</div><p>The 3D scene could not start. Check your internet connection and reload.</p>";}
