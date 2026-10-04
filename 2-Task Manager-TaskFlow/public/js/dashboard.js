// ========================================
// TASKFLOW DASHBOARD
// Existing dashboard behavior + working
// navigation, task stats, activity and shortcuts.
// ========================================

document.addEventListener("DOMContentLoaded", function () {
    const storedUser = localStorage.getItem("taskflowUser");
    if (!storedUser) { window.location.href="/login.html"; return; }

    let currentUser;
    try { currentUser = JSON.parse(storedUser); }
    catch { localStorage.removeItem("taskflowUser"); window.location.href="/login.html"; return; }

    currentUser.id = currentUser.id || currentUser._id;

    const $ = s => document.querySelector(s);
    const userName=$("#userName"), userUsername=$("#userUsername"), userAvatar=$("#userAvatar"), welcomeName=$("#welcomeName");
    const projectCount=$("#projectCount"), taskCount=$("#taskCount"), completedCount=$("#completedCount"), completionRate=$("#completionRate");
    const progressPercentage=$("#progressPercentage"), progressCompleted=$("#progressCompleted"), progressPending=$("#progressPending");
    const projectList=$("#projectList"), activityList=$("#activityList"), search=$("#dashboardSearch");

    const TASK_KEY="taskflowTasks_"+(currentUser.id||currentUser.username);
    let allTasks=[];

    function escapeHTML(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
    function formatDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});}
    function getLocalTasks(){try{const x=JSON.parse(localStorage.getItem(TASK_KEY)||"[]");return Array.isArray(x)?x:[];}catch{return [];}}
    function isDone(t){return ["completed","done","complete"].includes(String(t.status||"").toLowerCase());}

    function displayUser(){
        const name=currentUser.name||currentUser.username||"User";
        const username=currentUser.username||"";
        if(userName)userName.textContent=name;
        if(userUsername)userUsername.textContent=username?`@${username}`:"";
        if(welcomeName)welcomeName.textContent=name.split(" ")[0];
        if(userAvatar)userAvatar.textContent=name.charAt(0).toUpperCase();
    }

    async function loadProjects(){
        if(!currentUser.id)return [];
        try{
            const r=await fetch(`/api/projects/user/${encodeURIComponent(currentUser.id)}`);
            if(!r.ok)throw new Error("Could not load projects.");
            const d=await r.json();
            const projects=d.projects||[];
            renderProjects(projects);
            updateProjectTaskStats(projects);
            if(projectCount)projectCount.textContent=projects.length;
            renderActivity(projects,allTasks);
            return projects;
        }catch(e){
            console.error("Project loading error:",e);
            if(projectList)projectList.innerHTML=`<div class="empty-state"><div class="empty-icon">!</div><h3>Couldn't load projects</h3><p>Please refresh and try again.</p><button type="button" class="secondary-button" id="retryProjects">Try again</button></div>`;
            $("#retryProjects")?.addEventListener("click",loadProjects);
            return [];
        }
    }

    function updateProjectTaskStats(projects){
        const items = [];
        (projects || []).forEach(project => {
            const checklist = Array.isArray(project.checklist) ? project.checklist : [];
            checklist.forEach(item => items.push(item));
        });
        const total = items.length;
        const completed = items.filter(item => item && item.completed).length;
        const active = Math.max(total - completed, 0);
        const rate = total ? Math.round(completed / total * 100) : 0;
        if(taskCount) taskCount.textContent = active;
        if(completedCount) completedCount.textContent = completed;
        if(completionRate) completionRate.textContent = rate + "%";
        if(progressPercentage) progressPercentage.textContent = rate + "%";
        if(progressCompleted) progressCompleted.textContent = completed;
        if(progressPending) progressPending.textContent = active;
        const ring = $(".progress-ring");
        if(ring) ring.style.background = `conic-gradient(#8b5cf6 0deg,#6366f1 ${rate*3.6}deg,rgba(255,255,255,.06) ${rate*3.6}deg)`;
    }

    function renderProjects(projects){
        if(!projectList)return;
        if(!projects.length){
            projectList.innerHTML=`<div class="empty-state"><div class="empty-icon">✦</div><h3>Your workspace is ready</h3><p>Nothing is open yet. Create a project and give your next idea a place to grow.</p><a href="/project.html" class="secondary-button">＋ Start a project</a></div>`;
            return;
        }
        projectList.innerHTML=projects.slice(0,5).map(p=>{
            const initial=(p.name||"P").charAt(0).toUpperCase();
            const status=p.status||"Planning";
            const priority=p.priority||"Medium";
            const progress = Number.isFinite(Number(p.progress)) ? Number(p.progress) : 0;
            return `<div class="dashboard-project" data-search="${escapeHTML((p.name||"")+" "+(p.description||""))}" onclick="window.location.href='/project-details.html?id=${p._id}'">
                <div class="dashboard-project-icon">${escapeHTML(initial)}</div>
                <div class="dashboard-project-info">
                    <strong>${escapeHTML(p.name||"Untitled Project")}</strong>
                    <span>${escapeHTML(p.description||"No description")}</span>
                    <small>${escapeHTML(status)} · ${escapeHTML(priority)} priority</small>
                    <div class="dashboard-project-progress">
                        <div class="dashboard-project-progress-top"><span>Progress</span><strong>${progress}%</strong></div>
                        <div class="dashboard-project-progress-track"><div class="dashboard-project-progress-fill" style="width:${progress}%"></div></div>
                    </div>
                </div>
                <div class="dashboard-project-meta"><small>${formatDate(p.createdAt)}</small><span>View project ↗</span></div>
            </div>`;
        }).join("");
    }

    async function loadTasks(){
        let local=getLocalTasks();
        let api=[];
        if(currentUser.id){
            try{
                const r=await fetch(`/api/tasks/user/${encodeURIComponent(currentUser.id)}`);
                if(r.ok){
                    const d=await r.json();
                    api=Array.isArray(d)?d:(d.tasks||[]);
                }
            }catch{}
        }
        const normalizedApi=api.map(t=>({...t,id:String(t._id||t.id),source:"api"}));
        const localOnly=local.filter(t=>t.source!=="api");
        allTasks=[...normalizedApi,...localOnly];
        renderActivity(null,allTasks);
        return allTasks;
    }

    function updateTaskStats(tasks){
        const total=tasks.length;
        const completed=tasks.filter(isDone).length;
        const active=Math.max(total-completed,0);
        const rate=total?Math.round(completed/total*100):0;
        if(taskCount)taskCount.textContent=active;
        if(completedCount)completedCount.textContent=completed;
        if(completionRate)completionRate.textContent=rate+"%";
        if(progressPercentage)progressPercentage.textContent=rate+"%";
        if(progressCompleted)progressCompleted.textContent=completed;
        if(progressPending)progressPending.textContent=active;
        const ring=$(".progress-ring");
        if(ring)ring.style.background=`conic-gradient(#8b5cf6 0deg,#6366f1 ${rate*3.6}deg,rgba(255,255,255,.06) ${rate*3.6}deg)`;
    }

    function renderActivity(projects,tasks){
        if(!activityList)return;
        const items=[];
        (projects||[]).slice(0,10).forEach(p=>items.push({time:p.createdAt,icon:"✦",title:"Project added",text:p.name||"Untitled project"}));
        (tasks||[]).slice(0,10).forEach(t=>items.push({time:t.updatedAt||t.createdAt,icon:isDone(t)?"✓":"○",title:isDone(t)?"Task completed":"Task created",text:t.title||t.name||"Untitled task"}));
        items.sort((a,b)=>new Date(b.time)-new Date(a.time));
        activityList.innerHTML=items.length?items.slice(0,6).map(x=>`<div class="activity-row"><span>${x.icon}</span><div><strong>${escapeHTML(x.title)}</strong><small>${escapeHTML(x.text)} · ${formatDate(x.time)}</small></div></div>`).join(""):`<div class="activity-empty"><span>◷</span><p>Your recent activity will appear here.</p></div>`;
    }

    function setupSearch(){
        if(!search)return;
        search.addEventListener("input",function(){
            const q=this.value.trim().toLowerCase();
            document.querySelectorAll(".dashboard-project").forEach(p=>p.style.display=p.textContent.toLowerCase().includes(q)?"":"none");
        });
        document.addEventListener("keydown",e=>{
            if(e.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)){e.preventDefault();search.focus();}
        });
    }

    function setupShortcuts(){
        const settingsKey="taskflowSettings_"+(currentUser.id||currentUser.username);
        let enabled=true;
        try {
            const saved=JSON.parse(localStorage.getItem(settingsKey)||"{}");
            enabled=saved.shortcuts !== false;
        } catch {}
        if(!enabled)return;

        document.addEventListener("keydown",e=>{
            if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName))return;
            const k=e.key.toLowerCase();
            if(k==="n")window.location.href="/project.html";
            if(k==="t")window.location.href="/my-tasks.html";
            if(k==="a")window.location.href="/activity.html";
            if(k==="p")window.location.href="/profile.html";
            if(k==="s")window.location.href="/settings.html";
        });
    }

    window.logoutUser=function(){localStorage.removeItem("taskflowUser");window.location.href="/login.html";};

    displayUser();
    setupSearch();
    setupShortcuts();
    Promise.all([loadTasks(),loadProjects()]).then(()=>{});
});
