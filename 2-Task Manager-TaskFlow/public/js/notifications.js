
document.addEventListener("DOMContentLoaded",function(){
const user=(()=>{try{return JSON.parse(localStorage.getItem("taskflowUser")||"null")}catch{return null}})();
if(!user)return;
const userId=String(user.id||user._id||user.username||"");
const bell=document.querySelector("#notificationBell"),dot=document.querySelector("#notificationDot");
if(!bell)return;
const settingsKey="taskflowSettings_"+userId,readKey="taskflowNotificationRead_"+userId;
function settings(){try{return {...{notifications:true},...JSON.parse(localStorage.getItem(settingsKey)||"{}")}}catch{return {notifications:true}}}
function read(){try{return JSON.parse(localStorage.getItem(readKey)||"[]")}catch{return []}}
let readIds=read(),notifications=[];
const panel=document.createElement("div");panel.id="notificationPanel";panel.className="notification-panel";panel.hidden=true;
panel.innerHTML=`<div class="notification-panel-head"><div class="notification-heading"><div class="notification-heading-icon"><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-7-3-9M10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg></div><div><strong>Notifications</strong><span>Your latest TaskFlow updates</span></div></div><span id="notificationCount" class="notification-count-pill" hidden>0</span></div><div id="notificationList" class="notification-list"></div><div class="notification-footer"><button type="button" id="markNotificationsRead" class="notification-mark-read">✓ Mark all as read</button></div>`;
document.body.appendChild(panel);
const list=panel.querySelector("#notificationList"),count=panel.querySelector("#notificationCount"),mark=panel.querySelector("#markNotificationsRead");
function esc(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function time(v){const d=new Date(v);if(Number.isNaN(d.getTime()))return "";const x=Math.max(0,Date.now()-d.getTime()),m=Math.floor(x/60000),h=Math.floor(x/3600000),dy=Math.floor(x/86400000);return m<1?"Just now":m<60?m+"m ago":h<24?h+"h ago":dy<7?dy+"d ago":d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
function days(v){return Math.ceil((new Date(v).getTime()-Date.now())/86400000)}
function id(t,i){return t+":"+i}
function position(){if(panel.hidden)return;const r=bell.getBoundingClientRect();panel.style.top=(r.bottom+10)+"px";panel.style.right="18px"}
function render(){
const unread=notifications.filter(n=>!readIds.includes(n.id));count.textContent=unread.length>99?"99+":unread.length;count.hidden=!unread.length;dot.hidden=!unread.length;
if(!notifications.length){list.innerHTML=`<div class="notification-empty"><div class="notification-empty-icon">🔔</div><strong>No new notifications</strong><span>You're all caught up!</span></div>`;return}
list.innerHTML=notifications.slice(0,15).map(n=>{const u=!readIds.includes(n.id);return `<button type="button" class="notification-item ${u?"unread":"read"}" data-id="${esc(n.id)}"><span class="notification-icon ${n.type}">${n.icon}</span><span class="notification-copy"><strong>${esc(n.title)}</strong><small>${esc(n.text)}</small><em>${esc(time(n.time))}</em></span>${u?'<i class="notification-unread-dot"></i>':""}</button>`}).join("")
}
async function load(){
if(!settings().notifications){notifications=[];render();return}
const out=[],now=Date.now(),three=3*86400000;
try{
const r=await fetch("/api/tasks/user/"+encodeURIComponent(userId));if(r.ok){const d=await r.json();(d.tasks||[]).forEach(t=>{
const aid=String(t.assignedTo?._id||t.assignedTo?.id||""),cid=String(t.createdBy?._id||t.createdBy?.id||""),title=t.title||"Task",status=String(t.status||"").toLowerCase();
if(aid===userId&&cid&&cid!==userId&&status!=="completed")out.push({id:id("assigned",t._id),title:"Task assigned to you",text:`${t.createdBy?.name||t.createdBy?.username||"A teammate"} assigned "${title}" to you.`,icon:"✓",type:"assignment",time:t.createdAt||Date.now()});
if(t.dueDate&&status!=="completed"){const due=new Date(t.dueDate).getTime();if(due>=now&&due-now<=three){const d=days(t.dueDate);out.push({id:id("task-deadline",t._id),title:"Task deadline nearby",text:d<=1?`"${title}" is due tomorrow.`:`"${title}" is due in ${d} days.`,icon:"◷",type:"deadline",time:t.dueDate})}}
})}
}catch(e){console.error("Task notification error:",e)}
try{
const r=await fetch("/api/projects/user/"+encodeURIComponent(userId));if(r.ok){const d=await r.json();(d.projects||[]).forEach(p=>{if(!p.dueDate||String(p.status||"").toLowerCase()==="completed")return;const due=new Date(p.dueDate).getTime();if(due>=now&&due-now<=three){const d=days(p.dueDate);out.push({id:id("project-deadline",p._id),title:"Project deadline nearby",text:d<=1?`"${p.name||"Project"}" is due tomorrow.`:`"${p.name||"Project"}" is due in ${d} days.`,icon:"▣",type:"deadline",time:p.dueDate})}})}
}catch(e){console.error("Project notification error:",e)}
const map=new Map();out.forEach(n=>map.set(n.id,n));notifications=Array.from(map.values()).sort((a,b)=>new Date(b.time)-new Date(a.time));render()
}
bell.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();panel.hidden=!panel.hidden;if(!panel.hidden){position();load()}});
list.addEventListener("click",e=>{const item=e.target.closest(".notification-item");if(!item)return;const i=item.dataset.id;if(!readIds.includes(i))readIds.push(i);localStorage.setItem(readKey,JSON.stringify(readIds.slice(-100)));render()});
mark.addEventListener("click",()=>{readIds=notifications.map(n=>n.id);localStorage.setItem(readKey,JSON.stringify(readIds.slice(-100)));render()});
document.addEventListener("click",e=>{if(!panel.hidden&&!panel.contains(e.target)&&!bell.contains(e.target))panel.hidden=true});
window.addEventListener("resize",position);
window.addEventListener("taskflow:settings-updated",load);
load();setInterval(load,60000);
});
