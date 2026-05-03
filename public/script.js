// ===================== DATA =====================
const topics = [
  { id:'voting-age', label:'Lower voting age to 16?',
    sides:[{title:'Yes — 16-year-olds should vote',sub:'They pay taxes, deserve a voice'},
           {title:'No — 18 is the right threshold',sub:'Maturity and civic readiness matter'}],
    hints:['They are affected by long-term policies','Brain development is ongoing','Several countries already allow it']
  },
  { id:'evm', label:'Are EVMs fully trustworthy?',
    sides:[{title:'EVMs are secure & reliable',sub:'ECI safeguards are strong'},
           {title:'Paper ballots are safer',sub:'Transparency and auditability matter'}],
    hints:['Tamper-proof hardware by design','VVPAT paper trail is a backup','Independent audits are conducted']
  },
  { id:'nota', label:'NOTA should trigger re-election?',
    sides:[{title:'NOTA winner = fresh elections',sub:'Give voters a real reject option'},
           {title:'NOTA should stay symbolic',sub:'Stability over protest votes'}],
    hints:['Candidates must be accountable','Re-elections are costly/slow','Forces better candidate selection']
  },
  { id:'compulsory', label:'Should voting be compulsory?',
    sides:[{title:'Yes — make voting mandatory',sub:'Civic duty, stronger democracy'},
           {title:'No — voting is a free choice',sub:'The right to abstain matters'}],
    hints:['Australia has done it successfully','Low turnout skews representation','Coerced votes lose legitimacy']
  },
  { id:'social-media', label:'Ban paid political online ads?',
    sides:[{title:'Yes — ban them all',sub:'Stops misinformation and micro-targeting'},
           {title:'No — allow regulated ads',sub:'Reach voters where they are'}],
    hints:['Cambridge Analytica is a warning','Micro-targeting manipulates voters','Small parties need cheap outreach']
  }
];

const processSteps = [
  {id:'registration',title:'Voter Registration',badge:'Step 1'},
  {id:'campaigning',title:'Campaigning & MCC',badge:'Step 2'},
  {id:'evm',title:'Voting (EVM/VVPAT)',badge:'Step 3'},
  {id:'counting',title:'Vote Counting',badge:'Step 4'},
  {id:'post',title:'Result & Swearing In',badge:'Step 5'}
];

// ===================== STATE =====================
let state = {topic:null,yourSide:null,aiSide:null,round:0,maxRounds:3,points:0,wins:0,history:[],busy:false,currentLang:'en'};

function setLanguage(lang) {
  state.currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
  // Update placeholders
  const input = document.getElementById('arg-input');
  if (input) input.placeholder = translations[lang].placeholder;
  
  // Re-render components that are dynamic
  renderChips();
  if (state.topic) renderHints();
  updateUI();
}

// ===================== CORE LOGIC =====================

function renderChips() {
  const c = document.getElementById('chips'); 
  if (!c) return;
  c.innerHTML = '';
  topics.forEach(t => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.topic?.id===t.id ? ' active' : '');
    b.textContent = t.label; 
    b.addEventListener('click', () => selectTopic(t));
    c.appendChild(b);
  });
}

function selectTopic(t) {
  state.topic=t; state.yourSide=null; state.aiSide=null; state.round=0; state.history=[];
  renderChips();
  document.getElementById('battle-zone').classList.add('hidden');
  document.getElementById('verdict-card').style.display='none';
  document.getElementById('debate-log').innerHTML='';
  document.getElementById('stance-card').classList.remove('hidden');
  
  const stanceGrid = document.getElementById('stance-grid');
  stanceGrid.innerHTML = '';
  t.sides.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'stance-card';
    card.id = `sc${i}`;
    card.innerHTML = `
      <div class="stance-owner you">YOUR STANCE</div>
      <div class="stance-title">${s.title}</div>
      <div class="stance-sub">${s.sub}</div>
    `;
    card.addEventListener('click', () => pickStance(i));
    stanceGrid.appendChild(card);
  });
}

function pickStance(i) {
  state.yourSide = state.topic.sides[i];
  state.aiSide = state.topic.sides[1-i];
  document.querySelectorAll('.stance-card').forEach((c, idx) => {
    const owner = c.querySelector('.stance-owner');
    owner.textContent = idx===i ? 'YOUR STANCE' : 'AI OPPONENT';
    owner.className = 'stance-owner ' + (idx===i ? 'you' : 'ai');
    c.className = 'stance-card ' + (idx===i ? 'chosen-you' : 'chosen-ai');
    // Remove the event listener by replacing the element or just ignoring clicks
    c.style.pointerEvents = 'none';
  });
  setTimeout(startDebate, 400);
}

function startDebate() {
  state.round = 1;
  document.getElementById('battle-zone').classList.remove('hidden');
  document.getElementById('verdict-card').style.display='none';
  updateUI(); 
  renderHints();
  document.getElementById('debate-log').innerHTML='';
  addBubble('ai', `I'm locked in: "${state.aiSide.title}". You believe ${state.yourSide.title.toLowerCase()} — prove it!`);
  setTimeout(() => document.getElementById('arg-input').focus(), 100);
}

function updateUI() {
  document.getElementById('round-pill').textContent = `Round ${state.round} / ${state.maxRounds}`;
  document.getElementById('pts').textContent = state.points;
  document.getElementById('wins').textContent = state.wins;
}

function renderHints() {
  const container = document.getElementById('quick-args');
  container.innerHTML = '';
  (state.topic?.hints || []).forEach(h => {
    const btn = document.createElement('button');
    btn.className = 'qa-btn';
    btn.textContent = `+ ${h}`;
    btn.addEventListener('click', () => {
      const input = document.getElementById('arg-input');
      input.value = h;
      input.focus();
    });
    container.appendChild(btn);
  });
}

function addBubble(who, text, typing=false) {
  const log = document.getElementById('debate-log');
  const wrap = document.createElement('div');
  wrap.className = `bubble-wrap ${who}-wrap`;
  const html = typing ? `<div class="dot"></div><div class="dot"></div><div class="dot"></div>` : text;
  wrap.innerHTML = `<div class="avatar ${who}-av">${who==='ai'?'AI':'YOU'}</div><div class="bubble ${who}-b${typing?' typing-b':''}">${html}</div>`;
  log.appendChild(wrap); 
  log.scrollTop = log.scrollHeight;
  return wrap;
}

async function fire() {
  const input = document.getElementById('arg-input');
  const btn = document.getElementById('fire-btn');
  const arg = input.value.trim();
  if (!arg || state.busy) return;
  
  input.value=''; state.busy=true; btn.disabled=true;
  addBubble('you', arg);
  state.history.push({role:'user',content:arg});
  
  const typingWrap = addBubble('ai','',true);
  try {
    const res = await fetch('/api/debate', {
      method:'POST', 
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        history:state.history.slice(0,-1), 
        topic:state.topic.label,
        yourSide:state.yourSide.title, 
        aiSide:state.aiSide.title,
        round:state.round, 
        maxRounds:state.maxRounds
      })
    });
    const {text:raw} = await res.json();
    const vm = raw.match(/VERDICT:(\{.*\})/);
    const display = raw.replace(/VERDICT:\{.*\}/,'').trim();
    const bubble = typingWrap.querySelector('.bubble');
    bubble.innerHTML = display; 
    bubble.classList.remove('typing-b');
    state.history.push({role:'assistant',content:display});
    
    if (vm) {
      try {
        const v = JSON.parse(vm[1]);
        const gained = Math.min(10,Math.max(0,Math.round(v.userScore)));
        state.points += gained;
        if (v.winner==='you') state.wins++;
        updateUI(); 
        setTimeout(()=>showVerdict(v,gained), 1200);
      } catch(e){}
    } else {
      const p = Math.floor(Math.random()*3)+3;
      state.points += p;
      const pf = document.createElement('div');
      pf.className='pts-flash'; pf.textContent=`+${p} pts`;
      document.getElementById('debate-log').appendChild(pf);
      document.getElementById('debate-log').scrollTop=9999;
      state.round++; 
      updateUI();
    }
  } catch(e) {
    const bubble = typingWrap.querySelector('.bubble');
    bubble.textContent='Network error. Try again.';
    bubble.classList.remove('typing-b');
  }
  state.busy=false; btn.disabled=false; input.focus();
}

function showVerdict(v, gained) {
  document.getElementById('battle-zone').classList.add('hidden');
  const vc = document.getElementById('verdict-card'); 
  vc.style.display='block';
  let t='Round Over';
  if(v.winner==='you') t='Victory!';
  if(v.winner==='ai') t='AI Wins.';
  if(v.winner==='draw') t="It's a Draw.";
  document.getElementById('v-score').textContent=`+${gained} PTS`;
  document.getElementById('v-title').textContent=t;
  document.getElementById('v-body').textContent=v.summary;
  updateUI();
}

function resetAll() {
  state.topic=null; state.yourSide=null; state.aiSide=null; state.round=0; state.history=[];
  document.getElementById('stance-card').classList.add('hidden');
  document.getElementById('battle-zone').classList.add('hidden');
  document.getElementById('verdict-card').style.display='none';
  renderChips();
}

// ===================== INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.setAttribute('aria-selected','false'); t.tabIndex = -1; });
        tabContents.forEach(c => c.classList.remove('active'));
        tab.setAttribute('aria-selected','true'); tab.tabIndex = 0;
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
      tab.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const idx = Array.from(tabs).indexOf(tab);
          const next = e.key === 'ArrowLeft' ? (idx-1+tabs.length)%tabs.length : (idx+1)%tabs.length;
          tabs[next].click(); tabs[next].focus();
        }
      });
    });

    // Load facts ticker
    async function loadFacts() {
      try {
        const res = await fetch('/api/election-facts');
        const { facts } = await res.json();
        document.getElementById('facts-ticker').innerHTML = `<span>${facts.join(' · ')}</span>`;
      } catch(e) {}
    }
    loadFacts();

    // Debate Arena
    const fireBtn = document.getElementById('fire-btn');
    if (fireBtn) fireBtn.addEventListener('click', fire);
    
    const argInput = document.getElementById('arg-input');
    if (argInput) argInput.addEventListener('keydown', e => { if(e.key==='Enter') fire(); });
    
    const playAgainBtn = document.querySelector('.play-again-btn');
    if (playAgainBtn) playAgainBtn.addEventListener('click', resetAll);

    renderChips();

    // Language selector
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
    }

    // Election Process Steps
    const stepsContainer = document.getElementById('process-steps');
    if (stepsContainer) {
        processSteps.forEach(step => {
            const div = document.createElement('div'); 
            div.className='process-step';
            div.innerHTML = `
              <div class="step-header">
                <div class="step-title">${step.title}</div>
                <div class="step-badge">${step.badge}</div>
              </div>
              <div class="step-desc">Click below for a simplified, jargon-free explanation.</div>
              <button class="explain-btn">✨ Explain Simply</button>
              <div class="explain-output" id="explain-${step.id}"></div>`;
            
            const btn = div.querySelector('.explain-btn');
            btn.addEventListener('click', () => loadStep(step.id, btn));
            stepsContainer.appendChild(div);
        });
    }

    async function loadStep(id, btn) {
      const out = document.getElementById(`explain-${id}`);
      if(out.style.display==='block'){out.style.display='none';return;}
      btn.disabled=true; btn.textContent='Loading...';
      try {
        const res = await fetch(`/api/election-process?step=${id}`);
        const {text} = await res.json();
        out.textContent=text; out.style.display='block';
      } catch(e) { out.textContent='Failed to load.'; out.style.display='block'; }
      btn.disabled=false; btn.textContent='✨ Explain Simply';
    }

    // Voter Checker
    const checkBtn = document.querySelector('.check-btn');
    if (checkBtn) {
        checkBtn.addEventListener('click', async () => {
            const ageInput = document.getElementById('checker-age');
            const stateInput = document.getElementById('checker-state');
            const hasIdInput = document.getElementById('checker-voter-id');
            const resultDiv = document.getElementById('checker-result');
            
            const age = parseInt(ageInput.value);
            const st = stateInput.value.trim();
            const hasId = hasIdInput.checked;
            
            if(!age||age<16){
                resultDiv.textContent='Please enter a valid age (16+).';
                resultDiv.className='checker-result ineligible';
                resultDiv.style.display='block';
                return;
            }
            try {
                const res = await fetch('/api/check-eligibility',{
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({age,hasVoterId:hasId,state:st})
                });
                const {eligible,message} = await res.json();
                resultDiv.textContent=message; 
                resultDiv.className=`checker-result ${eligible?'eligible':'ineligible'}`; 
                resultDiv.style.display='block';
            } catch(e) { 
                resultDiv.textContent='Network error.'; 
                resultDiv.className='checker-result ineligible'; 
                resultDiv.style.display='block'; 
            }
        });
    }
});
