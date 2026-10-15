(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'dailyflow.tasks.v1';
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dateLabel = (value) => {
    if (!value) return '';
    const d = new Date(`${value}T12:00:00`);
    return d.toLocaleDateString(undefined, {month:'short', day:'numeric'});
  };
  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let tasks = [];
  try { tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (!Array.isArray(tasks)) tasks = []; } catch { tasks = []; }
  let view = 'all', priorityFilter = 'all', searchTerm = '', editingId = null, toastTimer;

  const viewNames = {all:'All tasks', today:'Today', upcoming:'Upcoming', completed:'Completed'};
  const descriptions = {all:'A little progress each day adds up.',today:'One day, one step at a time.',upcoming:'A clear view of what’s ahead.',completed:'Look how far you’ve come.'};
  $('headerDate').textContent = new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  $('dayLabel').textContent = new Date().toLocaleDateString(undefined,{weekday:'long'}).toUpperCase() + ' AT A GLANCE';
  $('taskDue').min = today();

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); render(); }
  function notify(message){ $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2200); }
  function visibleTasks(){
    let result = tasks.filter(t => {
      if(view==='today' && t.due!==today()) return false;
      if(view==='upcoming' && (!t.due || t.due<=today() || t.completed)) return false;
      if(view==='completed' && !t.completed) return false;
      if(priorityFilter!=='all' && t.priority!==priorityFilter) return false;
      const q=searchTerm.toLowerCase();
      if(q && !(t.title+' '+(t.notes||'')).toLowerCase().includes(q)) return false;
      return true;
    });
    const sort=$('sortSelect').value;
    result.sort((a,b)=>{
      if(sort==='due') return (a.due||'9999').localeCompare(b.due||'9999');
      if(sort==='priority') return ({high:0,medium:1,low:2}[a.priority]-({high:0,medium:1,low:2}[b.priority])) || b.created-a.created;
      return b.created-a.created;
    });
    return result;
  }
  function render(){
    const completed=tasks.filter(t=>t.completed).length, total=tasks.length, percent=total?Math.round(completed/total*100):0;
    $('allCount').textContent=total; $('todayCount').textContent=tasks.filter(t=>t.due===today()&&!t.completed).length;
    $('progressBar').style.width=percent+'%'; $('progressCount').textContent=`${completed} of ${total} tasks completed`; $('progressPercent').textContent=percent+'%';
    $('progressText').textContent=percent===100&&total?'Amazing work — you’ve completed everything!':completed?'Nice work! Keep that momentum going.':'You’re just getting started. Pick one thing and begin.';
    $('breadcrumbView').textContent=viewNames[view]; $('pageTitle').innerHTML=escapeHTML(viewNames[view])+'<span class="title-dot">.</span>'; $('pageSubtitle').textContent=descriptions[view];
    $('listTitle').textContent=({all:'Your tasks',today:'Tasks for today',upcoming:'Coming up',completed:'Completed tasks'})[view];
    $('listSubtitle').textContent=({all:'Keep your momentum going.',today:'Focus on what matters today.',upcoming:'Plan ahead, feel prepared.',completed:'Every checkmark counts.'})[view];
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.priority===priorityFilter));
    const list=visibleTasks(); $('taskList').innerHTML='';
    list.forEach(t=>{
      const row=document.createElement('article'); row.className='task-row'+(t.completed?' done':'');
      const dueText=t.due?(t.due<today()&&!t.completed?'Overdue · ': '')+dateLabel(t.due):'';
      row.innerHTML=`<input class="task-check" type="checkbox" aria-label="Complete ${escapeHTML(t.title)}" ${t.completed?'checked':''} data-action="toggle" data-id="${t.id}"><div class="task-content"><div class="task-title">${escapeHTML(t.title)}</div>${t.notes?`<div class="task-notes">${escapeHTML(t.notes)}</div>`:''}<div class="task-meta"><span class="priority-tag ${t.priority}">${t.priority} priority</span>${dueText?`<span class="due-tag ${t.due<today()&&!t.completed?'overdue':''}">◷ ${escapeHTML(dueText)}</span>`:''}</div></div><div class="task-actions"><button class="mini-button" data-action="edit" data-id="${t.id}" aria-label="Edit task">✎</button><button class="mini-button" data-action="delete" data-id="${t.id}" aria-label="Delete task">×</button></div>`;
      $('taskList').appendChild(row);
    });
    const empty=list.length===0; $('emptyState').hidden=!empty; $('taskList').style.display=empty?'none':'block'; $('listFooter').style.display=empty?'none':'flex';
    $('emptyTitle').textContent=searchTerm?'No matches found.':view==='completed'?'Nothing completed yet.':view==='upcoming'?'Nothing on the horizon.':'A fresh start.';
    $('emptyText').textContent=searchTerm?'Try another search or change your filters.':'No tasks here yet. Add a task to get your day moving.';
    $('emptyAdd').style.display=view==='completed'?'none':'inline-block';
    $('footerCount').textContent=`${list.length} task${list.length===1?'':'s'}`;
  }
  function openDialog(task=null){
    editingId=task?task.id:null; $('taskForm').reset(); $('taskDue').min=today();
    $('dialogTitle').textContent=task?'Edit task':'Create a task'; $('saveTask').textContent=task?'Save changes':'Create task';
    if(task){$('taskName').value=task.title;$('taskNotes').value=task.notes||'';$('taskDue').value=task.due||'';$('taskPriority').value=task.priority;}
    $('taskDialog').showModal(); setTimeout(()=>$('taskName').focus(),50);
  }
  function closeDialog(){ $('taskDialog').close(); editingId=null; }
  $('addTaskTop').addEventListener('click',()=>openDialog());
  $('emptyAdd').addEventListener('click',()=>openDialog());
  $('closeDialog').addEventListener('click',closeDialog); $('cancelDialog').addEventListener('click',closeDialog);
  $('taskForm').addEventListener('submit',e=>{
    e.preventDefault(); const title=$('taskName').value.trim(); if(!title){$('taskName').focus();return;}
    const data={title,notes:$('taskNotes').value.trim(),due:$('taskDue').value,priority:$('taskPriority').value};
    if(editingId){tasks=tasks.map(t=>t.id===editingId?{...t,...data}:t);notify('Task updated');}
    else{tasks.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),...data,completed:false,created:Date.now()});notify('Task added');}
    closeDialog();save();
  });
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{priorityFilter=b.dataset.priority;render();}));
  $('searchInput').addEventListener('input',e=>{searchTerm=e.target.value.trim();render();});
  $('sortSelect').addEventListener('change',render);
  $('taskList').addEventListener('click',e=>{
    const el=e.target.closest('[data-action]');if(!el)return;const task=tasks.find(t=>t.id===el.dataset.id);if(!task)return;
    if(el.dataset.action==='toggle'){task.completed=el.checked;notify(task.completed?'Task completed':'Task reopened');save();}
    if(el.dataset.action==='edit')openDialog(task);
    if(el.dataset.action==='delete'){tasks=tasks.filter(t=>t.id!==task.id);notify('Task deleted');save();}
  });
  $('clearCompleted').addEventListener('click',()=>{const n=tasks.filter(t=>t.completed).length;if(!n){notify('No completed tasks to clear');return;}tasks=tasks.filter(t=>!t.completed);save();notify(`${n} completed task${n===1?'':'s'} cleared`);});
  $('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('dailyflow.dark',document.body.classList.contains('dark')?'1':'0');});
  if(localStorage.getItem('dailyflow.dark')==='1')document.body.classList.add('dark');
  render();
})();