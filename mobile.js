const fieldMode=matchMedia('(max-width:760px)').matches||new URLSearchParams(location.search).has('mobile');
if(fieldMode){
 document.body.classList.add('field-mode');
 try{tech=localStorage.getItem('unity-technician')||'Tech 1'}catch{tech='Tech 1'}page='today';
 const baseRender=render;
 render=function(){baseRender();
  const labels={today:'My day',orders:'Jobs',estimates:'Estimate',settings:'More'};
  $('#nav').innerHTML=Object.entries(labels).map(([key,label])=>`<button data-page="${key}" class="${page===key?'active':''}" aria-label="${label}"><span>${({today:'?',orders:'?',estimates:'+',settings:'?'})[key]}</span>${label}</button>`).join('');
  $('#new-job').style.display='none';$('.eyebrow').textContent='UNITY PROPERTY SERVICES';
  $('.notice').innerHTML=`<span class="connection-dot"></span> ${navigator.onLine?'Device demo':'Offline � device demo'} <span>Saved on this device � no team sync</span>`;
  if(page==='today'){
   const jobs=dayJobs().filter(j=>j.tech===tech),completed=jobs.filter(j=>j.status==='Complete'),work=jobs.reduce((n,j)=>n+Number(j.hours),0),active=jobs.find(j=>j.timer),next=active||jobs.find(j=>!['Complete','On hold','Need materials','Cannot access','Needs approval'].includes(j.status));
   $('#app').innerHTML=`<div class="field-controls"><select id="tech" aria-label="Technician">${['Tech 1','Tech 2'].map(t=>`<option ${t===tech?'selected':''}>${t}</option>`).join('')}</select><input id="schedule-date" aria-label="Work date" type="date" value="${selectedDate}"></div><div class="field-summary"><div><small>YOUR DAY, AT A GLANCE</small><h2>${completed.length}<span> / ${jobs.length} jobs done</span></h2></div><div><b>${work.toFixed(1)}h</b><small>planned work</small></div><div class="bar"><i style="width:${jobs.length?completed.length/jobs.length*100:0}%"></i></div></div>${next?`<div class="next-job"><div class="section-head"><span class="eyebrow">${active?'ON THE CLOCK':'UP NEXT'}</span>${badge(next)}</div><h2>${esc(next.property)}</h2><p>${esc(next.title)}</p><div class="muted">${esc(next.zone)} � ${next.hours}h planned</div><button class="primary field-primary" data-job="${esc(next.id)}">${active?'Continue job':'Open job & start'} </button><button class="field-estimate" data-addition="${esc(next.id)}">+ Estimate additional work</button></div>`:'<div class="panel"><h2>All caught up.</h2><p class="muted">Review ready work or choose another date.</p></div>'}<div class="section-head" style="margin-top:25px"><h3>Today's work orders</h3><span class="muted">${jobs.length} jobs</span></div>${jobs.map(card).join('')}<button class="field-primary" id="suggest">Find work that fits</button><p class="muted">Eight-hour shift � target 6-6� job-hours. Travel and other time use office planning allowances.</p>`;
  }
  if(page==='settings')$('#app').insertAdjacentHTML('afterbegin','<div class="panel install-card"><h2>Keep Unity on your home screen</h2><p class="muted">On the hosted HTTPS version: iPhone  Safari  Share  Add to Home Screen. Android  browser menu  Install app / Add to Home screen.</p><p class="muted">This computer's preview address cannot be opened on another phone. Company login and shared data are still pending.</p></div>');
  bind();if($('#tech'))$('#tech').onchange=e=>{tech=e.target.value;localStorage.setItem('unity-technician',tech);render()};document.querySelectorAll('[data-addition]').forEach(b=>b.onclick=()=>{page='estimates';render();$('#estimate-job').value=b.dataset.addition});
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;render();window.scrollTo(0,0)});
 };render();
}
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});

