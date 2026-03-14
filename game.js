// game.js - قهوة | لعبة الجاسوس - نسخة نظيفة

// ===== FIREBASE =====
window.DB = null;
function initFirebase() {
  try {
    const cfg = {
      apiKey: "AIzaSyA4kyqlEtpQ1Uw2j4IA8_Eh9gS6QijJEMk",
      authDomain: "qahwa-game-a76de.firebaseapp.com",
      databaseURL: "https://qahwa-game-a76de-default-rtdb.firebaseio.com",
      projectId: "qahwa-game-a76de",
      storageBucket: "qahwa-game-a76de.firebasestorage.app",
      messagingSenderId: "449752562946",
      appId: "1:449752562946:web:cf41c2af265710cf21d61b"
    };
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    const db = firebase.database();
    window.DB = {
      async createRoom(c,d)     { await db.ref(`rooms/${c}`).set(d); },
      async getRoom(c)          { const s=await db.ref(`rooms/${c}`).once('value'); return s.exists()?s.val():null; },
      async updateRoom(c,u)     { await db.ref(`rooms/${c}`).update(u); },
      listenRoom(c,cb)          { const r=db.ref(`rooms/${c}`); r.on('value',s=>cb(s.exists()?s.val():null)); return ()=>r.off('value'); },
      async deleteRoom(c)       { await db.ref(`rooms/${c}`).remove(); },
      async addPlayer(c,pid,d)  { await db.ref(`rooms/${c}/players/${pid}`).set(d); },
      async removePlayer(c,pid) { await db.ref(`rooms/${c}/players/${pid}`).remove(); }
    };
    console.log('✅ Firebase ready');
  } catch(e) { console.log('Firebase offline:', e.message); }
}

// ===== AUDIO =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null, masterGain = null, soundOn = true;
let musicOn = false, musicNodes = [], musicInterval = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function toggleSound() {
  soundOn = !soundOn;
  if (masterGain) masterGain.gain.setValueAtTime(soundOn ? 1 : 0, audioCtx.currentTime);
  document.getElementById('sound-btn').textContent = soundOn ? '🔊' : '🔇';
  toast(soundOn ? '🔊 الصوت شغال' : '🔇 الصوت مكتوم');
}

function playSound(type) {
  if (!soundOn) return;
  try {
    const ctx = getAudioCtx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(masterGain);
    const s = { tap:{f:520,d:0.06,v:0.08}, success:{f:640,d:0.18,v:0.12}, flip:{f:380,d:0.12,v:0.08}, tick:{f:700,d:0.04,v:0.05}, alert:{f:280,d:0.3,v:0.12}, win:{f:523,d:0.4,v:0.12} }[type] || {f:520,d:0.06,v:0.08};
    o.frequency.value = s.f; o.type = 'sine';
    g.gain.setValueAtTime(s.v, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.d);
    o.start(); o.stop(ctx.currentTime + s.d);
    if (type === 'win') { setTimeout(()=>playTone(659,0.3),120); setTimeout(()=>playTone(784,0.35),260); }
  } catch(e) {}
}

function playTone(freq, dur) {
  if (!soundOn) return;
  try {
    const ctx = getAudioCtx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(masterGain);
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch(e) {}
}

const RAST = [264,297,330,352,396,440,462,528];

function startMusic() {
  if (musicOn) return;
  try {
    const ctx = getAudioCtx();
    musicOn = true;
    [[132,0.025],[264,0.02],[396,0.015]].forEach(([freq,vol]) => {
      const o=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
      f.type='lowpass'; f.frequency.value=600;
      o.connect(f); f.connect(g); g.connect(masterGain);
      o.type='sine'; o.frequency.value=freq;
      g.gain.setValueAtTime(0,ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol,ctx.currentTime+3);
      o.start(); musicNodes.push({osc:o,gain:g});
    });
    musicInterval = setInterval(() => {
      if (!musicOn) return;
      try {
        const ctx2=getAudioCtx(), freq=RAST[Math.floor(Math.random()*RAST.length)];
        const o=ctx2.createOscillator(), g=ctx2.createGain(), f=ctx2.createBiquadFilter();
        f.type='lowpass'; f.frequency.value=1200;
        o.connect(f); f.connect(g); g.connect(masterGain);
        o.type='sine'; o.frequency.value=freq;
        g.gain.setValueAtTime(0,ctx2.currentTime);
        g.gain.linearRampToValueAtTime(0.035,ctx2.currentTime+0.3);
        g.gain.linearRampToValueAtTime(0,ctx2.currentTime+2.5);
        o.start(); o.stop(ctx2.currentTime+2.6);
      } catch(e) {}
    }, 2200);
  } catch(e) {}
}

function stopMusic() {
  musicOn = false;
  clearInterval(musicInterval); musicInterval = null;
  musicNodes.forEach(({osc,gain}) => {
    try { gain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+1); osc.stop(audioCtx.currentTime+1.1); } catch(e) {}
  });
  musicNodes = [];
}

// ===== STARS =====
const canvas = document.getElementById('stars-canvas');
const ctx2 = canvas.getContext('2d');
let stars = [], animT = 0;

function initStars() {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  stars = Array.from({length:90}, () => ({ x:Math.random(), y:Math.random(), size:Math.random()*2.5+0.5, speed:Math.random()*0.25+0.08, phase:Math.random()*Math.PI*2 }));
}
function drawStars() {
  ctx2.clearRect(0,0,canvas.width,canvas.height); animT+=0.003;
  stars.forEach(s => {
    const op=(Math.sin(animT*2*Math.PI*s.speed+s.phase)+1)/2*0.7+0.15;
    ctx2.beginPath(); ctx2.arc(s.x*canvas.width, s.y*canvas.height, s.size, 0, Math.PI*2);
    ctx2.fillStyle=`rgba(108,99,255,${op*0.55})`; ctx2.fill();
  });
  requestAnimationFrame(drawStars);
}
window.addEventListener('resize', initStars);
initStars(); drawStars();

// ===== PARTICLES =====
function initParticles() {
  const wrap = document.getElementById('particles');
  wrap.innerHTML = '';
  ['#6C63FF','#FFD700','#00C896','#FF4E6A','#FF9500'].forEach((color,i) => {
    for(let j=0;j<3;j++){
      const p=document.createElement('div'); p.className='particle';
      const size=Math.random()*6+3;
      p.style.cssText=`width:${size}px;height:${size}px;left:${Math.random()*100}%;background:${color};animation-duration:${Math.random()*12+8}s;animation-delay:${Math.random()*8}s;opacity:0;`;
      wrap.appendChild(p);
    }
  });
}
initParticles();

// ===== THEME =====
let isDark = true;
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('light', !isDark);
  document.getElementById('theme-btn').textContent = isDark ? '🌙' : '☀️';
  playSound('tap');
}

// ===== NAV =====
function goTo(id) {
  playSound('tap');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  if (id === 'screen-home') startMusic();
  else stopMusic();
}

// ===== TOAST =====
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ===== MODAL =====
function showComingSoon(name) {
  playSound('tap');
  document.getElementById('modal-title').textContent = `${name} قريباً! 🔒`;
  document.getElementById('modal-body').textContent = 'اللعبة دي هتكون متاحة قريب 👀';
  document.getElementById('modal').classList.add('show');
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }

// ===== SPLASH =====
window.addEventListener('load', () => {
  document.body.classList.add('dark');
  setTimeout(() => { goTo('screen-home'); startMusic(); }, 2200);
});

// ===== CATEGORIES DATA =====
const categoryItems = {
  'أماكن':['المطار','الشاطئ','المستشفى','المدرسة','السوق','المطعم','الفندق','الملعب','المسجد','السينما','المكتبة','البنك','الحديقة','المنزل','المصنع','الجامعة','الشرطة','المحكمة','الميناء','الكافيه','الصيدلية','الجيم','الحلاق','الملاهي','المتحف','المسرح','القصر','الكهف','البرج','المحطة','المزرعة','الغابة','الصحراء','الجبل','السجن','الجسر'],
  'أكل':['فول','طعمية','كشري','مكرونة','أرز','جبنة','بيض','فراخ','لحمة','سمك','بطاطس','موز','تفاح','برتقال','مانجو','شاي','قهوة','عصير','زبادي','شوكولاتة','فطير','بسبوسة','كنافة','بقلاوة','شاورما','كباب','كفتة','بيتزا','برجر','آيس كريم','وافل','دونات'],
  'أفلام':['ليلة البيبي دول','إسماعيلية رايح جاي','عسل أسود','الإرهاب والكباب','حسن ومرقص','الفرح','ساعة ونص','تيتو','اللمبي','الناظر','كابوريا','الفيل الأزرق','أهل كايرو','الجزيرة','عمارة يعقوبيان','مولانا','كيرة والجن','أبو شنب','ببجي'],
  'مسلسلات':['تحت الوصاية','لعبة نيوتن','الاختيار','كلبش','نسل الأغراب','البرنس','الأسطورة','ضل راجل','أبو العروسة','كبير أوي','شقة في وسط البلد','العهد','رأفت الهجان','وادي الذئاب','قيامة أرطغرل'],
  'كرتون':['سمسم','بكار','ميكي ماوس','توم وجيري','سبونج بوب','ناروتو','دراغون بول','ون بيس','بوكيمون','كابتن ماجد','هايكيو','أتاك أون تيتان','ديث نوت','سيلور مون','سكوبي دو','شريك','سيمبسونز'],
  'حيوانات':['قطة','كلب','أسد','نمر','فيل','زرافة','قرد','حصان','بقرة','تمساح','أفعى','أرنب','فأر','غزال','دب','ذئب','ثعلب','دولفين','حوت','قرش','بطريق','نعامة','كنغر','كوالا','جمل'],
  'مهن':['دكتور','مهندس','محامي','معلم','طيار','شرطي','طباخ','نجار','حلاق','صيدلاني','مصور','رسام','كاتب','ممثل','مغني','لاعب','مبرمج','مخرج','جراح','محقق','جاسوس','عسكري'],
  'بلاد':['مصر','السعودية','الإمارات','أمريكا','فرنسا','ألمانيا','اليابان','الصين','المغرب','تركيا','إيطاليا','إسبانيا','البرازيل','الهند','روسيا','إنجلترا','هولندا','بلجيكا','السويد','بولندا'],
  'مشاهير':['محمد صلاح','عمرو دياب','نانسي عجرم','أم كلثوم','أحمد زكي','يسرا','تامر حسني','محمد رمضان','كريم عبد العزيز','منى زكي','أحمد حلمي','هشام عباس','شيرين','رامي صبري','عادل إمام'],
  'برندات':['نايك','أديداس','أبل','سامسونج','تويوتا','مرسيدس','زارا','ماكدونالدز','بيبسي','كوكاكولا','نستله','ستاربكس','إيكيا','مايكروسوفت','جوجل','أمازون','تيسلا'],
  'منتخبات':['مصر','البرازيل','ألمانيا','فرنسا','الأرجنتين','إسبانيا','إنجلترا','إيطاليا','المغرب','البرتغال','بلجيكا','كرواتيا','السنغال','اليابان','كوريا','أمريكا','هولندا'],
  'هدوم':['جلابية','قميص','بنطلون','جينز','تيشيرت','جاكيت','كوت','بلوزة','تنورة','فستان','شورت','بيجاما','طرحة','كاب','حذاء','شبشب','جزمة','حزام','شال'],
  'لاعبو كرة':['محمد صلاح','كريم بنزيمة','رونالدو','ميسي','نيمار','مبابي','هالاند','دي بروين','راشفورد','هازارد','زيدان','رونالدينيو','بيرلو','إنييستا','ريكيلمي'],
  'أغاني':['تسلم الأيادي','حبيبي يا نور العين','أمال حياتي','بشرة خير','مزيكا','حلوة يا بلدي','أهواك','الليلة يا سمرا','بعيد عنك','صافيني مرة','ليلى','زهرة المدائن'],
};

const categoryMeta = {
  'أماكن':      { g:'linear-gradient(135deg,#6C63FF,#3A35CC)', s:'<circle cx="22" cy="18" r="8" fill="rgba(255,255,255,0.3)"/><path d="M22 26 L22 38" stroke="white" stroke-width="2.5" stroke-linecap="round"/><rect x="8" y="28" width="28" height="18" rx="4" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><rect x="17" y="34" width="10" height="12" rx="2" fill="white" opacity="0.4"/>' },
  'أكل':        { g:'linear-gradient(135deg,#FF9500,#CC6600)', s:'<circle cx="22" cy="20" r="12" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><path d="M16 20 Q22 14 28 20 Q22 26 16 20Z" fill="rgba(255,255,255,0.5)"/><line x1="22" y1="32" x2="22" y2="40" stroke="white" stroke-width="2.5" stroke-linecap="round"/><line x1="14" y1="36" x2="30" y2="36" stroke="white" stroke-width="2" stroke-linecap="round"/>' },
  'أفلام':      { g:'linear-gradient(135deg,#FF4E6A,#CC1A35)', s:'<rect x="6" y="12" width="32" height="22" rx="4" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><polygon points="18,18 18,28 28,23" fill="white" opacity="0.7"/><line x1="6" y1="8" x2="38" y2="8" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="6" x2="10" y2="10" stroke="white" stroke-width="2"/><line x1="18" y1="6" x2="18" y2="10" stroke="white" stroke-width="2"/><line x1="26" y1="6" x2="26" y2="10" stroke="white" stroke-width="2"/>' },
  'مسلسلات':   { g:'linear-gradient(135deg,#9B59B6,#6C3483)', s:'<rect x="4" y="10" width="36" height="24" rx="3" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><rect x="14" y="34" width="16" height="4" rx="2" fill="rgba(255,255,255,0.3)"/><circle cx="22" cy="22" r="7" fill="none" stroke="white" stroke-width="1.5"/><polygon points="19,19 19,25 26,22" fill="white" opacity="0.7"/>' },
  'كرتون':      { g:'linear-gradient(135deg,#00C896,#007A5E)', s:'<circle cx="22" cy="18" r="10" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><circle cx="17" cy="16" r="3" fill="white" opacity="0.6"/><circle cx="27" cy="16" r="3" fill="white" opacity="0.6"/><path d="M16 22 Q22 27 28 22" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 8 Q16 4 18 8" stroke="white" stroke-width="1.5" fill="none"/><path d="M26 8 Q28 4 32 8" stroke="white" stroke-width="1.5" fill="none"/>' },
  'حيوانات':   { g:'linear-gradient(135deg,#E67E22,#A04000)', s:'<ellipse cx="22" cy="24" rx="13" ry="10" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><circle cx="22" cy="14" r="7" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><circle cx="18" cy="12" r="2" fill="white" opacity="0.6"/><circle cx="26" cy="12" r="2" fill="white" opacity="0.6"/><ellipse cx="15" cy="8" rx="3" ry="4" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1"/><ellipse cx="29" cy="8" rx="3" ry="4" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1"/>' },
  'مهن':        { g:'linear-gradient(135deg,#3498DB,#1A5276)', s:'<rect x="8" y="18" width="28" height="20" rx="4" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><rect x="14" y="12" width="16" height="8" rx="3" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="1.5"/><line x1="8" y1="26" x2="36" y2="26" stroke="white" stroke-width="1.5"/><rect x="18" y="26" width="8" height="6" rx="2" fill="white" opacity="0.4"/>' },
  'بلاد':       { g:'linear-gradient(135deg,#1ABC9C,#0E6655)', s:'<circle cx="22" cy="22" r="14" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="1.5"/><ellipse cx="22" cy="22" rx="6" ry="14" fill="none" stroke="white" stroke-width="1" opacity="0.5"/><line x1="8" y1="22" x2="36" y2="22" stroke="white" stroke-width="1" opacity="0.5"/>' },
  'مشاهير':    { g:'linear-gradient(135deg,#F39C12,#7D6608)', s:'<polygon points="22,6 26,16 38,16 28,23 32,34 22,27 12,34 16,23 6,16 18,16" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="1.5"/>' },
  'برندات':     { g:'linear-gradient(135deg,#E74C3C,#7B241C)', s:'<path d="M10 30 L22 10 L34 30 Z" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><circle cx="22" cy="24" r="6" fill="rgba(255,255,255,0.3)"/>' },
  'منتخبات':   { g:'linear-gradient(135deg,#27AE60,#145A32)', s:'<circle cx="22" cy="22" r="14" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="1.5"/><path d="M8 22 Q15 15 22 22 Q29 29 36 22" stroke="white" stroke-width="1.5" fill="none"/>' },
  'هدوم':       { g:'linear-gradient(135deg,#8E44AD,#4A235A)', s:'<path d="M14 10 L10 18 L16 18 L16 36 L28 36 L28 18 L34 18 L30 10 L26 14 L22 10 L18 14 Z" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>' },
  'لاعبو كرة': { g:'linear-gradient(135deg,#2ECC71,#186A3B)', s:'<circle cx="22" cy="22" r="13" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="1.5"/><path d="M22 9 L25 18 L35 18 L27 24 L30 34 L22 28 L14 34 L17 24 L9 18 L19 18 Z" fill="rgba(255,255,255,0.3)"/>' },
  'أغاني':      { g:'linear-gradient(135deg,#E91E8C,#880E4F)', s:'<circle cx="28" cy="12" r="6" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><circle cx="28" cy="30" r="6" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/><line x1="22" y1="12" x2="14" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="30" x2="14" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="14" cy="28" r="5" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5"/>' },
};

// ===== CATEGORY CARDS =====
function goToCategorySelect() {
  if (localPlayers.length < 3) { toast('أضف 3 لاعبين على الأقل 👥'); return; }
  buildCategoryCards();
  goTo('screen-categories');
}

function buildCategoryCards() {
  const list = document.getElementById('category-cards-list');
  list.innerHTML = '';
  Object.keys(categoryItems).forEach((cat, i) => {
    const m = categoryMeta[cat] || { g:'linear-gradient(135deg,#6C63FF,#3A35CC)', s:'' };
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.cssText = `background:${m.g};box-shadow:0 6px 20px rgba(0,0,0,0.3);animation-delay:${i*0.04}s`;
    card.innerHTML = `
      <div class="cat-card-illustration">
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">${m.s}</svg>
      </div>
      <div class="cat-card-info">
        <div class="cat-card-title">${cat}</div>
        <div class="cat-card-count">${categoryItems[cat].length} عنصر</div>
      </div>
      <div class="cat-card-arrow">←</div>
    `;
    card.onclick = () => { playSound('success'); startLocalGame(cat); };
    list.appendChild(card);
  });
}

// ===== PLAYERS =====
let localPlayers = [];
let savedScores  = {};

function renderLocalPlayers() {
  const el = document.getElementById('players-local-list');
  el.innerHTML = '';
  localPlayers.forEach((name, i) => {
    const d = document.createElement('div');
    d.className = 'player-item';
    d.style.animationDelay = `${i*0.05}s`;
    d.innerHTML = `<div class="player-avatar">${name[0].toUpperCase()}</div><div class="player-name">${name}</div><button class="btn-remove" onclick="removePlayer(${i})">✕</button>`;
    el.appendChild(d);
  });
}

function addPlayer() {
  const input = document.getElementById('player-input');
  const name  = input.value.trim();
  if (!name) { toast('اكتب اسم اللاعب ✏️'); return; }
  if (localPlayers.includes(name)) { toast('الاسم موجود بالفعل ⚠️'); return; }
  if (localPlayers.length >= 12)   { toast('أقصى عدد 12 لاعب'); return; }
  localPlayers.push(name);
  input.value = '';
  renderLocalPlayers();
  playSound('success');
}

function removePlayer(i) {
  localPlayers.splice(i, 1);
  renderLocalPlayers();
  playSound('tap');
}

// ===== GAME STATE =====
let gameState = {};

function startLocalGame(cat) {
  const timeMin     = parseInt(document.getElementById('time-slider').value);
  const spyCount    = parseInt(document.getElementById('spy-slider').value);
  const actualSpies = Math.min(spyCount, Math.floor(localPlayers.length/3));
  const items       = categoryItems[cat];
  const location    = items[Math.floor(Math.random()*items.length)];
  const shuffled    = [...localPlayers].sort(()=>Math.random()-0.5);
  const spyNames    = new Set(shuffled.slice(0, actualSpies));
  const questionOrder = [...localPlayers].sort(()=>Math.random()-0.5);

  gameState = {
    players: localPlayers.map((name,i) => ({
      id:i, name,
      role: spyNames.has(name) ? 'spy' : 'civilian',
      location: spyNames.has(name) ? null : location,
      category: spyNames.has(name) ? null : cat,
      score: savedScores[name] || 0,
      vote: null,
    })),
    category: cat, location,
    spyCount: actualSpies,
    timeMinutes: timeMin,
    totalTime: timeMin*60,
    revealIndex: 0,
    cardFlipped: false,
    questionOrder,
    votedOutSpyIdx: -1,
  };

  startCountdown(() => startReveal());
}

// ===== COUNTDOWN =====
function startCountdown(cb) {
  goTo('screen-countdown');
  let num = 3;
  const el = document.getElementById('countdown-number');
  el.textContent = num;
  playSound('alert');
  const iv = setInterval(() => {
    num--;
    if (num <= 0) { clearInterval(iv); cb(); return; }
    el.textContent = num;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'countPulse 0.8s ease-in-out';
    playSound('alert');
  }, 900);
}

// ===== REVEAL =====
function startReveal() {
  goTo('screen-reveal');
  showRevealCard();
}

function showRevealCard() {
  const p = gameState.players[gameState.revealIndex];
  gameState.cardFlipped = false;
  document.getElementById('reveal-turn-label').textContent = `دور ${p.name} 👀`;
  document.getElementById('reveal-progress').textContent = `${gameState.revealIndex+1} / ${gameState.players.length}`;
  document.getElementById('reveal-next-btn').textContent = gameState.revealIndex < gameState.players.length-1 ? 'التالي ➡️' : 'ابدأ اللعبة 🎮';
  document.getElementById('flip-inner').classList.remove('flipped');
  const back = document.getElementById('flip-back');
  if (p.role === 'spy') {
    back.className = 'flip-back spy-back';
    document.getElementById('rc-emoji').textContent      = '🕵️';
    document.getElementById('rc-role-label').textContent = 'أنت';
    document.getElementById('rc-role').textContent       = 'الجاسوس!';
    document.getElementById('rc-location').textContent   = '';
    document.getElementById('rc-category').textContent   = 'حاول تعرف الكلمة من الأسئلة 🎯';
  } else {
    back.className = 'flip-back civ-back';
    document.getElementById('rc-emoji').textContent      = '👤';
    document.getElementById('rc-role-label').textContent = 'أنت';
    document.getElementById('rc-role').textContent       = 'مدني';
    document.getElementById('rc-location').textContent   = `📍 ${p.location}`;
    document.getElementById('rc-category').textContent   = `التصنيف: ${p.category}`;
  }
}

function flipCard() {
  if (gameState.cardFlipped) return;
  gameState.cardFlipped = true;
  document.getElementById('flip-inner').classList.add('flipped');
  playSound('flip');
}

function nextReveal() {
  if (!gameState.cardFlipped) { toast('اضغط على الكارت الأول 👆'); return; }
  playSound('tap');
  gameState.revealIndex++;
  if (gameState.revealIndex >= gameState.players.length) startGameTimer();
  else showRevealCard();
}

// ===== TIMER =====
let timerInterval = null, timerSeconds = 0, totalTimerSeconds = 0;

function startGameTimer() {
  goTo('screen-game');
  timerSeconds = gameState.timeMinutes * 60;
  totalTimerSeconds = timerSeconds;

  // ترتيب الأسئلة
  const orderList = document.getElementById('question-order-list');
  orderList.innerHTML = '';
  gameState.questionOrder.forEach((name, i) => {
    const next = gameState.questionOrder[(i+1) % gameState.questionOrder.length];
    const d = document.createElement('div');
    d.className = 'question-order-item';
    d.innerHTML = `<div class="q-num">${i+1}</div><div style="font-weight:700">${name}</div><div class="q-arrow">←</div><div style="color:var(--gold);font-weight:700">${next}</div>`;
    orderList.appendChild(d);
  });

  // اللاعبون
  const list = document.getElementById('players-game-list');
  list.innerHTML = '';
  gameState.players.forEach((p,i) => {
    const d = document.createElement('div');
    d.className = 'player-item';
    d.style.animationDelay = `${i*0.06}s`;
    d.innerHTML = `<div class="player-avatar">${p.name[0].toUpperCase()}</div><div class="player-name">${p.name}</div><span class="player-score">${p.score} نقطة</span>`;
    list.appendChild(d);
  });

  document.getElementById('game-spy-label').textContent = `🕵️ ${gameState.spyCount} جاسوس`;

  clearInterval(timerInterval);
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 10 && timerSeconds > 0) playSound('tick');
    if (timerSeconds <= 0) { clearInterval(timerInterval); playSound('alert'); toast('⏰ انتهى الوقت!'); setTimeout(goToVoting, 1000); }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds/60), s = timerSeconds%60;
  document.getElementById('timer-text').textContent = `${m}:${s.toString().padStart(2,'0')}`;
  const circle = document.getElementById('timer-svg-circle');
  circle.style.strokeDashoffset = 283 * (1 - timerSeconds/totalTimerSeconds);
  if      (timerSeconds<=30) { circle.style.stroke='#FF4E6A'; circle.style.filter='drop-shadow(0 0 8px #FF4E6A)'; }
  else if (timerSeconds<=60) { circle.style.stroke='#FFD700'; circle.style.filter='drop-shadow(0 0 8px #FFD700)'; }
  else                       { circle.style.stroke='var(--purple)'; circle.style.filter='drop-shadow(0 0 6px var(--purple))'; }
}

function confirmEndGame() {
  if (confirm('تريد إنهاء اللعبة والذهاب للتصويت؟')) { clearInterval(timerInterval); goToVoting(); }
}

// ===== VOTING =====
let votingIndex = 0, selectedVote = null;

function goToVoting() {
  clearInterval(timerInterval);
  votingIndex = 0;
  gameState.players.forEach(p => p.vote = null);
  goTo('screen-voting');
  showVotingTurn();
  playSound('alert');
}

function showVotingTurn() {
  const voter = gameState.players[votingIndex];
  document.getElementById('voting-current-player').textContent = voter.name;
  selectedVote = null;
  document.getElementById('vote-confirm-btn').disabled = true;
  const list = document.getElementById('voting-list');
  list.innerHTML = '';
  gameState.players.forEach((p, i) => {
    if (i === votingIndex) return;
    const d = document.createElement('div');
    d.className = 'vote-item';
    d.style.animationDelay = `${i*0.05}s`;
    d.innerHTML = `<div class="player-avatar">${p.name[0].toUpperCase()}</div><div class="vote-name">${p.name}</div><div class="vote-check"></div>`;
    d.onclick = () => {
      document.querySelectorAll('.vote-item').forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
      selectedVote = i;
      document.getElementById('vote-confirm-btn').disabled = false;
      playSound('tap');
    };
    list.appendChild(d);
  });
}

function confirmVote() {
  if (selectedVote === null) return;
  gameState.players[votingIndex].vote = selectedVote;
  votingIndex++;
  playSound('success');
  if (votingIndex >= gameState.players.length) resolveVoting();
  else showVotingTurn();
}

function resolveVoting() {
  const counts = {};
  gameState.players.forEach(p => { if(p.vote!==null) counts[p.vote]=(counts[p.vote]||0)+1; });
  let maxV=0, mostVoted=-1;
  Object.entries(counts).forEach(([idx,cnt]) => { if(cnt>maxV){maxV=cnt;mostVoted=parseInt(idx);} });
  const accused = gameState.players[mostVoted];
  if (accused && accused.role==='spy') { gameState.votedOutSpyIdx=mostVoted; showSpyGuess(); }
  else showResults('spies_win');
}

// ===== SPY GUESS =====
let selectedGuess = null;

function showSpyGuess() {
  goTo('screen-spyguess');
  selectedGuess = null;
  document.getElementById('guess-confirm-btn').disabled = true;
  document.getElementById('guess-category').textContent = gameState.category;
  const grid = document.getElementById('guess-grid');
  grid.innerHTML = '';
  [...categoryItems[gameState.category]].sort(()=>Math.random()-0.5).forEach(item => {
    const d = document.createElement('div');
    d.className = 'guess-item';
    d.textContent = item;
    d.onclick = () => {
      document.querySelectorAll('.guess-item').forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
      selectedGuess = item;
      document.getElementById('guess-confirm-btn').disabled = false;
      playSound('tap');
    };
    grid.appendChild(d);
  });
}

function confirmGuess() {
  if (!selectedGuess) return;
  playSound(selectedGuess===gameState.location ? 'alert' : 'win');
  showResults(selectedGuess===gameState.location ? 'spy_win_guess' : 'civilians_win');
}

function skipGuess() { showResults('civilians_win'); }

// ===== RESULTS =====
// النقاط:
// المدنيون صوتوا صح + الجاسوس خمّن غلط  → كل مدني +200
// المدنيون صوتوا صح + الجاسوس خمّن صح   → اللي صوت عليه +100 بس
// المدنيون صوتوا غلط                      → الجاسوس +200

function showResults(outcome) {
  goTo('screen-results');
  const spies   = gameState.players.filter(p=>p.role==='spy');
  const spyIdx  = gameState.votedOutSpyIdx;
  let emoji, title, subtitle, bannerClass;

  if (outcome === 'civilians_win') {
    bannerClass='result-banner win'; emoji='🎉'; title='المدنيون فازوا!'; subtitle='الجاسوس اتكشف وخمّن غلط';
    gameState.players.forEach(p => { if(p.role==='civilian') p.score+=200; });
    playSound('win'); spawnConfetti();
  } else if (outcome === 'spies_win') {
    bannerClass='result-banner lose'; emoji='🕵️'; title='الجاسوس فاز!'; subtitle='المدنيون صوتوا غلط!';
    gameState.players.forEach(p => { if(p.role==='spy') p.score+=200; });
    playSound('alert');
  } else if (outcome === 'spy_win_guess') {
    bannerClass='result-banner lose'; emoji='🎯'; title='الجاسوس خمّن وفاز!'; subtitle='اللي صوت عليه ياخد 100 نقطة';
    if (spyIdx>=0) gameState.players.forEach(p => { if(p.role==='civilian'&&p.vote===spyIdx) p.score+=100; });
    gameState.players.forEach(p => { if(p.role==='spy') p.score+=200; });
    playSound('alert');
  }

  document.getElementById('result-banner').className  = bannerClass;
  document.getElementById('result-emoji').textContent    = emoji;
  document.getElementById('result-title').textContent    = title;
  document.getElementById('result-subtitle').textContent = subtitle;
  document.getElementById('result-location').textContent = gameState.location;
  document.getElementById('result-category').textContent = `التصنيف: ${gameState.category}`;

  // حفظ النقاط للجولة الجاية
  gameState.players.forEach(p => savedScores[p.name] = p.score);

  // الجاسوس
  const spiesEl = document.getElementById('result-spies');
  spiesEl.innerHTML = '';
  spies.forEach(p => {
    const d = document.createElement('div'); d.className='player-item';
    d.innerHTML=`<div class="player-avatar" style="background:linear-gradient(135deg,#FF4E6A,#CC1A35)">${p.name[0].toUpperCase()}</div><div class="player-name">${p.name}</div><span class="tag tag-spy">🕵️ جاسوس</span>`;
    spiesEl.appendChild(d);
  });

  // النقاط
  const scoresEl = document.getElementById('result-scores');
  scoresEl.innerHTML = '';
  [...gameState.players].sort((a,b)=>b.score-a.score).forEach((p,i) => {
    const medals=['🥇','🥈','🥉'];
    const d = document.createElement('div'); d.className='player-item'; d.style.animationDelay=`${i*0.07}s`;
    d.innerHTML=`<span style="font-size:22px;width:28px">${medals[i]||'🏅'}</span><div class="player-name">${p.name}</div><span class="player-score">${p.score} نقطة</span>`;
    scoresEl.appendChild(d);
  });
}

function spawnConfetti() {
  const wrap = document.getElementById('result-confetti');
  wrap.innerHTML = '';
  ['#6C63FF','#FFD700','#00C896','#FF4E6A','#FF9500','#fff'].forEach(color => {
    for(let i=0;i<5;i++){
      const c=document.createElement('div'); c.className='confetti-piece';
      c.style.cssText=`left:${Math.random()*100}%;background:${color};animation-duration:${Math.random()*2+1.5}s;animation-delay:${Math.random()}s;`;
      wrap.appendChild(c);
    }
  });
}

function newRound() { playSound('tap'); buildCategoryCards(); goTo('screen-categories'); }
