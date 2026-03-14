// game.js - قهوة | لعبة الجاسوس

// ===== AMBIENT MUSIC =====
let musicOn = false;
let musicNodes = [];

function startMusic() {
  if (musicOn) return;
  try {
    const ctx = getAudioCtx();
    musicOn = true;

    // Ambient drone - deep warm tone
    const playNote = (freq, vol, detune = 0) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
      osc.start();
      musicNodes.push({ osc, gain });
      return gain;
    };

    // Warm chord: A minor ambient
    playNote(110, 0.04);        // A1
    playNote(220, 0.05);        // A2
    playNote(330, 0.03, 5);     // E3 slightly detuned
    playNote(440, 0.025);       // A3
    playNote(165, 0.03, -3);    // E2

    // Slow LFO tremolo on top layer
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    musicNodes.forEach(n => lfoGain.connect(n.gain));
    lfo.start();
    musicNodes.push({ osc: lfo, gain: lfoGain });

  } catch(e) { console.log('music error', e); }
}

function stopMusic() {
  musicOn = false;
  musicNodes.forEach(({ osc, gain }) => {
    try {
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
      osc.stop(audioCtx.currentTime + 1.5);
    } catch(e) {}
  });
  musicNodes = [];
}

// ===== SOUND =====
let soundOn = true;
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playSound(type) {
  if (!soundOn) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const sounds = {
      tap:     { freq: 880, type: 'sine',   dur: 0.08, vol: 0.15 },
      success: { freq: 660, type: 'sine',   dur: 0.25, vol: 0.2  },
      flip:    { freq: 440, type: 'sine',   dur: 0.15, vol: 0.12 },
      tick:    { freq: 800, type: 'square', dur: 0.04, vol: 0.08 },
      alert:   { freq: 330, type: 'sine',   dur: 0.4,  vol: 0.2  },
      win:     { freq: 523, type: 'sine',   dur: 0.5,  vol: 0.2  },
    };
    const s = sounds[type] || sounds.tap;
    osc.frequency.setValueAtTime(s.freq, ctx.currentTime);
    osc.type = s.type;
    gain.gain.setValueAtTime(s.vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + s.dur);

    // Chord for win
    if (type === 'win') {
      setTimeout(() => playTone(659, 0.3), 120);
      setTimeout(() => playTone(784, 0.4), 250);
    }
  } catch(e) {}
}

function playTone(freq, dur) {
  if (!soundOn) return;
  try {
    const ctx = getAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch(e) {}
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById('sound-btn').textContent = soundOn ? '🔊' : '🔇';
  toast(soundOn ? '🔊 الصوت شغال' : '🔇 الصوت مقفول');
}

// ===== STARS =====
const canvas = document.getElementById('stars-canvas');
const ctx2 = canvas.getContext('2d');
let stars = [];
let animT = 0;

function initStars() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  stars = Array.from({ length: 90 }, () => ({
    x: Math.random(), y: Math.random(),
    size: Math.random() * 2.5 + 0.5,
    speed: Math.random() * 0.25 + 0.08,
    phase: Math.random() * Math.PI * 2,
  }));
}

function drawStars() {
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  animT += 0.003;
  const isDark = document.body.classList.contains('dark');
  stars.forEach(s => {
    const op = (Math.sin(animT * 2 * Math.PI * s.speed + s.phase) + 1) / 2 * 0.7 + 0.15;
    ctx2.beginPath();
    ctx2.arc(s.x * canvas.width, s.y * canvas.height, s.size, 0, Math.PI * 2);
    ctx2.fillStyle = isDark
      ? `rgba(108,99,255,${op * 0.55})`
      : `rgba(108,99,255,${op * 0.25})`;
    ctx2.fill();
  });
  requestAnimationFrame(drawStars);
}

window.addEventListener('resize', initStars);
initStars();
drawStars();

// ===== PARTICLES =====
function initParticles() {
  const wrap = document.getElementById('particles');
  wrap.innerHTML = '';
  const colors = ['#6C63FF','#FFD700','#00C896','#FF4E6A','#FF9500'];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 3;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${Math.random() * 12 + 8}s;
      animation-delay:${Math.random() * 8}s;
      opacity:0;
    `;
    wrap.appendChild(p);
  }
}
initParticles();

// ===== THEME =====
let isDark = true;

function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('dark',  isDark);
  document.body.classList.toggle('light', !isDark);
  document.getElementById('theme-btn').textContent = isDark ? '🌙' : '☀️';
  playSound('tap');
}

// ===== NAVIGATION =====
function goTo(id) {
  playSound('tap');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  // Music only on home
  if (id === 'screen-home') startMusic();
  else stopMusic();
}

// ===== TOAST =====
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ===== MODAL =====
function showComingSoon(name) {
  playSound('tap');
  document.getElementById('modal-title').textContent = `${name} قريباً! 🔒`;
  document.getElementById('modal-body').textContent = 'اللعبة دي هتكون متاحة قريب، فضل معانا! 👀';
  document.getElementById('modal').classList.add('show');
}
function closeModal() {
  document.getElementById('modal').classList.remove('show');
  playSound('tap');
}

// ===== SPLASH SCREEN =====
window.addEventListener('load', () => {
  document.body.classList.add('dark');
  setTimeout(() => {
    goTo('screen-home');
    buildCategoryChips();
    buildOnlineCategoryChips();
    startMusic();
  }, 2200);
});

// ===== MODE TOGGLE =====
function setMode(m) {
  playSound('tap');
  document.getElementById('tab-local').classList.toggle('active', m === 'local');
  document.getElementById('tab-online').classList.toggle('active', m === 'online');
  document.getElementById('mode-local').style.display  = m === 'local'  ? 'block' : 'none';
  document.getElementById('mode-online').style.display = m === 'online' ? 'block' : 'none';
}

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

const allCategories = Object.keys(categoryItems);
let selectedCategories = [...allCategories];
let selectedOnlineCategories = [...allCategories];

function buildCategoryChips() {
  const wrap = document.getElementById('category-chips');
  wrap.innerHTML = '';
  allCategories.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'chip active';
    chip.textContent = c;
    chip.onclick = () => {
      playSound('tap');
      if (selectedCategories.includes(c)) {
        if (selectedCategories.length === 1) { toast('لازم تختار تصنيف واحد على الأقل ⚠️'); return; }
        selectedCategories = selectedCategories.filter(x => x !== c);
        chip.classList.remove('active');
      } else {
        selectedCategories.push(c);
        chip.classList.add('active');
      }
    };
    wrap.appendChild(chip);
  });
}

function buildOnlineCategoryChips() {
  const wrap = document.getElementById('online-category-chips');
  if (!wrap) return;
  wrap.innerHTML = '';
  allCategories.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'chip active';
    chip.textContent = c;
    chip.onclick = () => {
      playSound('tap');
      if (selectedOnlineCategories.includes(c)) {
        if (selectedOnlineCategories.length === 1) { toast('لازم تصنيف واحد على الأقل'); return; }
        selectedOnlineCategories = selectedOnlineCategories.filter(x => x !== c);
        chip.classList.remove('active');
      } else {
        selectedOnlineCategories.push(c);
        chip.classList.add('active');
      }
      updateRoomSettings();
    };
    wrap.appendChild(chip);
  });
}

// ===== LOCAL PLAYERS =====
let localPlayers = [];

function renderLocalPlayers() {
  const el = document.getElementById('players-local-list');
  el.innerHTML = '';
  localPlayers.forEach((name, i) => {
    const d = document.createElement('div');
    d.className = 'player-item';
    d.style.animationDelay = `${i * 0.05}s`;
    d.innerHTML = `
      <div class="player-avatar">${name[0].toUpperCase()}</div>
      <div class="player-name">${name}</div>
      <button class="btn-remove" onclick="removePlayer(${i})">✕</button>
    `;
    el.appendChild(d);
  });
}

function addPlayer() {
  const input = document.getElementById('player-input');
  const name  = input.value.trim();
  if (!name) { toast('اكتب اسم اللاعب ✏️'); return; }
  if (localPlayers.includes(name)) { toast('الاسم ده موجود بالفعل ⚠️'); return; }
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

function startLocalGame() {
  if (localPlayers.length < 3) { toast('محتاج 3 لاعبين على الأقل 👥'); return; }
  playSound('success');

  const timeMin  = parseInt(document.getElementById('time-slider').value);
  const spyCount = parseInt(document.getElementById('spy-slider').value);
  const maxSpies = Math.floor(localPlayers.length / 3);
  const actualSpies = Math.min(spyCount, maxSpies);

  // Pick category & item
  const cats = selectedCategories;
  const cat  = cats[Math.floor(Math.random() * cats.length)];
  const items = categoryItems[cat];
  const location = items[Math.floor(Math.random() * items.length)];

  // Assign roles
  const shuffled = [...localPlayers].sort(() => Math.random() - 0.5);
  const spyNames = new Set(shuffled.slice(0, actualSpies));

  gameState = {
    mode: 'local',
    players: localPlayers.map((name, i) => ({
      id: i,
      name,
      role: spyNames.has(name) ? 'spy' : 'civilian',
      location: spyNames.has(name) ? null : location,
      category: spyNames.has(name) ? null : cat,
      score: gameState.players
        ? (gameState.players.find(p => p.name === name)?.score || 0)
        : 0,
      vote: null,
    })),
    category: cat,
    location,
    spyCount: actualSpies,
    timeMinutes: timeMin,
    revealIndex: 0,
    cardFlipped: false,
    totalTime: timeMin * 60,
  };

  startReveal();
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
  document.getElementById('reveal-progress').textContent =
    `${gameState.revealIndex + 1} / ${gameState.players.length}`;

  document.getElementById('reveal-next-btn').textContent =
    gameState.revealIndex < gameState.players.length - 1
      ? 'التالي ➡️'
      : 'ابدأ اللعبة 🎮';

  // Reset flip
  const inner = document.getElementById('flip-inner');
  inner.classList.remove('flipped');

  const back = document.getElementById('flip-back');
  if (p.role === 'spy') {
    back.className = 'flip-back spy-back';
    document.getElementById('rc-emoji').textContent     = '🕵️';
    document.getElementById('rc-role-label').textContent = 'أنت';
    document.getElementById('rc-role').textContent      = 'الجاسوس!';
    document.getElementById('rc-location').textContent  = '';
    document.getElementById('rc-category').textContent  = 'حاول تعرف المكان من الأسئلة 🎯';
  } else {
    back.className = 'flip-back civ-back';
    document.getElementById('rc-emoji').textContent     = '👤';
    document.getElementById('rc-role-label').textContent = 'أنت';
    document.getElementById('rc-role').textContent      = 'مدني';
    document.getElementById('rc-location').textContent  = `📍 ${p.location}`;
    document.getElementById('rc-category').textContent  = `التصنيف: ${p.category}`;
  }
}

function flipCard() {
  if (gameState.cardFlipped) return;
  gameState.cardFlipped = true;
  document.getElementById('flip-inner').classList.add('flipped');
  playSound('flip');
}

function nextReveal() {
  if (!gameState.cardFlipped) { toast('اضغط على الكارت عشان تشوف دورك 👆'); return; }
  playSound('tap');
  gameState.revealIndex++;
  if (gameState.revealIndex >= gameState.players.length) {
    startGameTimer();
  } else {
    showRevealCard();
  }
}

// ===== TIMER =====
let timerInterval = null;
let timerSeconds  = 0;
let totalTimerSeconds = 0;

function startGameTimer() {
  goTo('screen-game');
  timerSeconds      = gameState.timeMinutes * 60;
  totalTimerSeconds = timerSeconds;

  // Render players
  const list = document.getElementById('players-game-list');
  list.innerHTML = '';
  gameState.players.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'player-item';
    d.style.animationDelay = `${i * 0.06}s`;
    d.innerHTML = `<div class="player-avatar">${p.name[0].toUpperCase()}</div><div class="player-name">${p.name}</div>`;
    list.appendChild(d);
  });

  document.getElementById('game-spy-label').textContent =
    `🕵️ ${gameState.spyCount} جاسوس بينكم`;

  clearInterval(timerInterval);
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds % 60 === 0 && timerSeconds > 0) playSound('tick');
    if (timerSeconds <= 10 && timerSeconds > 0) playSound('tick');
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      playSound('alert');
      toast('⏰ انتهى الوقت! ابدأ التصويت');
      setTimeout(goToVoting, 1200);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  document.getElementById('timer-text').textContent =
    `${m}:${s.toString().padStart(2, '0')}`;

  // SVG circle
  const circle = document.getElementById('timer-svg-circle');
  const pct = timerSeconds / totalTimerSeconds;
  const offset = 283 * (1 - pct);
  circle.style.strokeDashoffset = offset;

  if (timerSeconds <= 30) {
    circle.style.stroke = '#FF4E6A';
    circle.style.filter = 'drop-shadow(0 0 8px #FF4E6A)';
  } else if (timerSeconds <= 60) {
    circle.style.stroke = '#FFD700';
    circle.style.filter = 'drop-shadow(0 0 8px #FFD700)';
  } else {
    circle.style.stroke = 'var(--purple)';
    circle.style.filter = 'drop-shadow(0 0 6px var(--purple))';
  }
}

function confirmEndGame() {
  if (confirm('تريد إنهاء اللعبة والذهاب للتصويت؟')) {
    clearInterval(timerInterval);
    goToVoting();
  }
}

// ===== VOTING =====
let votingIndex = 0;
let selectedVote = null;

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
    d.style.animationDelay = `${i * 0.05}s`;
    d.innerHTML = `
      <div class="player-avatar">${p.name[0].toUpperCase()}</div>
      <div class="vote-name">${p.name}</div>
      <div class="vote-check"></div>
    `;
    d.onclick = () => {
      document.querySelectorAll('.vote-item').forEach(x => x.classList.remove('selected'));
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
  if (votingIndex >= gameState.players.length) {
    resolveVoting();
  } else {
    showVotingTurn();
  }
}

function resolveVoting() {
  const counts = {};
  gameState.players.forEach(p => {
    if (p.vote !== null) counts[p.vote] = (counts[p.vote] || 0) + 1;
  });

  let maxV = 0, mostVoted = -1;
  Object.entries(counts).forEach(([idx, cnt]) => {
    if (cnt > maxV) { maxV = cnt; mostVoted = parseInt(idx); }
  });

  const accused = gameState.players[mostVoted];
  if (accused && accused.role === 'spy') {
    gameState.votedOutSpy = mostVoted;
    showSpyGuess();
  } else {
    showResults('spies_win');
  }
}

// ===== SPY GUESS =====
let selectedGuess = null;

function showSpyGuess() {
  goTo('screen-spyguess');
  selectedGuess = null;
  document.getElementById('guess-confirm-btn').disabled = true;
  document.getElementById('guess-category').textContent = gameState.category;

  const items = categoryItems[gameState.category] || [];
  const grid  = document.getElementById('guess-grid');
  grid.innerHTML = '';

  // Shuffle so correct answer isn't always in same spot
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  shuffled.forEach(item => {
    const d = document.createElement('div');
    d.className = 'guess-item';
    d.textContent = item;
    d.onclick = () => {
      document.querySelectorAll('.guess-item').forEach(x => x.classList.remove('selected'));
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
  playSound(selectedGuess === gameState.location ? 'win' : 'alert');
  showResults(selectedGuess === gameState.location ? 'spy_win_guess' : 'civilians_win');
}

function skipGuess() {
  showResults('civilians_win');
}

// ===== RESULTS =====
function showResults(outcome) {
  goTo('screen-results');

  const banner  = document.getElementById('result-banner');
  const spies   = gameState.players.filter(p => p.role === 'spy');

  let emoji, title, subtitle, bannerClass;

  if (outcome === 'civilians_win') {
    bannerClass = 'result-banner win';
    emoji = '🎉'; title = 'المدنيون فازوا!'; subtitle = 'تم اكتشاف الجاسوس بنجاح';
    gameState.players.forEach(p => { if (p.role === 'civilian') p.score++; });
    playSound('win');
    spawnConfetti();
  } else if (outcome === 'spies_win') {
    bannerClass = 'result-banner lose';
    emoji = '🕵️'; title = 'الجاسوس فاز!'; subtitle = 'المدنيون صوّتوا غلط';
    gameState.players.forEach(p => { if (p.role === 'spy') p.score += 2; });
    playSound('alert');
  } else if (outcome === 'spy_win_guess') {
    bannerClass = 'result-banner lose';
    emoji = '🎯'; title = 'الجاسوس خمّن وفاز!'; subtitle = 'خمّن المكان الصحيح 🤯';
    gameState.players.forEach(p => { if (p.role === 'spy') p.score += 2; });
    playSound('alert');
  }

  banner.className = bannerClass;
  document.getElementById('result-emoji').textContent    = emoji;
  document.getElementById('result-title').textContent    = title;
  document.getElementById('result-subtitle').textContent = subtitle;
  document.getElementById('result-location').textContent = gameState.location;
  document.getElementById('result-category').textContent = `التصنيف: ${gameState.category}`;

  // Spies
  const spiesEl = document.getElementById('result-spies');
  spiesEl.innerHTML = '';
  spies.forEach(p => {
    const d = document.createElement('div');
    d.className = 'player-item';
    d.innerHTML = `
      <div class="player-avatar" style="background:linear-gradient(135deg,#FF4E6A,#CC1A35)">${p.name[0].toUpperCase()}</div>
      <div class="player-name">${p.name}</div>
      <span class="tag tag-spy">🕵️ جاسوس</span>
    `;
    spiesEl.appendChild(d);
  });

  // Scores
  const scoresEl = document.getElementById('result-scores');
  scoresEl.innerHTML = '';
  const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
  sorted.forEach((p, i) => {
    const medals = ['🥇','🥈','🥉'];
    const d = document.createElement('div');
    d.className = 'player-item';
    d.style.animationDelay = `${i * 0.07}s`;
    d.innerHTML = `
      <span style="font-size:22px;width:28px">${medals[i] || '🏅'}</span>
      <div class="player-name">${p.name}</div>
      <span class="player-score">${p.score} نقطة</span>
    `;
    scoresEl.appendChild(d);
  });
}

function spawnConfetti() {
  const wrap = document.getElementById('result-confetti');
  wrap.innerHTML = '';
  const colors = ['#6C63FF','#FFD700','#00C896','#FF4E6A','#FF9500','#fff'];
  for (let i = 0; i < 30; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-piece';
    c.style.cssText = `
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${Math.random()*2+1.5}s;
      animation-delay:${Math.random()*1}s;
      transform:rotate(${Math.random()*360}deg);
    `;
    wrap.appendChild(c);
  }
}

function newRound() {
  playSound('tap');
  startLocalGame();
}

// ===== ONLINE GAME =====
let onlineRoomCode   = null;
let onlinePlayerId   = null;
let onlineIsHost     = false;
let onlineUnsubscribe = null;
let onlineGameState  = null;

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}

async function createOnlineRoom() {
  const name = document.getElementById('online-name').value.trim();
  if (!name) { toast('اكتب اسمك الأول ✏️'); return; }

  if (!window.DB) { toast('Firebase مش جاهز، حاول تاني'); return; }

  playSound('success');
  const code = generateCode();
  const pid  = 'p_' + Date.now();

  onlineRoomCode = code;
  onlinePlayerId = pid;
  onlineIsHost   = true;

  const roomData = {
    code,
    hostId: pid,
    status: 'waiting',
    settings: { timeMinutes: 8, spyCount: 1, categories: allCategories },
    players: {
      [pid]: { id: pid, name, isReady: false, score: 0, isHost: true }
    }
  };

  try {
    await window.DB.createRoom(code, roomData);
    enterLobby(code, pid, true);
  } catch(e) {
    toast('حصل خطأ، جرب تاني ❌');
    console.error(e);
  }
}

async function joinOnlineRoom() {
  const name = document.getElementById('online-name').value.trim();
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();

  if (!name) { toast('اكتب اسمك ✏️'); return; }
  if (code.length !== 6) { toast('الكود لازم يكون 6 حروف'); return; }
  if (!window.DB) { toast('Firebase مش جاهز'); return; }

  try {
    const room = await window.DB.getRoom(code);
    if (!room) { toast('الغرفة دي مش موجودة ❌'); return; }
    if (room.status !== 'waiting') { toast('اللعبة بدأت بالفعل ⚠️'); return; }

    const pid = 'p_' + Date.now();
    onlineRoomCode = code;
    onlinePlayerId = pid;
    onlineIsHost   = false;

    await window.DB.addPlayerToRoom(code, pid, {
      id: pid, name, isReady: false, score: 0, isHost: false
    });

    enterLobby(code, pid, false);
    playSound('success');
  } catch(e) {
    toast('حصل خطأ ❌');
    console.error(e);
  }
}

function enterLobby(code, pid, isHost) {
  goTo('screen-lobby');
  document.getElementById('lobby-room-code').textContent = code;
  document.getElementById('lobby-host-controls').style.display  = isHost ? 'block' : 'none';
  document.getElementById('lobby-waiting-msg').style.display    = isHost ? 'none' : 'flex';

  // Listen to room
  if (onlineUnsubscribe) onlineUnsubscribe();
  onlineUnsubscribe = window.DB.listenRoom(code, roomData => {
    if (!roomData) { toast('الغرفة اتمسحت'); goTo('screen-spy-mode'); return; }
    updateLobbyUI(roomData);

    if (roomData.status === 'roleReveal' && !isHost) {
      onlineGameState = roomData;
      startOnlineReveal(roomData);
    }
    if (roomData.status === 'playing') {
      onlineGameState = roomData;
      syncOnlineGame(roomData);
    }
    if (roomData.status === 'voting') {
      syncOnlineVoting(roomData);
    }
    if (roomData.status === 'results') {
      syncOnlineResults(roomData);
    }
  });
}

function updateLobbyUI(room) {
  const players = Object.values(room.players || {});
  document.getElementById('lobby-count').textContent = `(${players.length})`;

  const list = document.getElementById('lobby-players-list');
  list.innerHTML = '';
  players.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'player-item';
    d.style.animationDelay = `${i * 0.06}s`;
    d.innerHTML = `
      <div class="player-avatar">${p.name[0].toUpperCase()}</div>
      <div class="player-name">${p.name}</div>
      ${p.isHost ? '<span class="player-badge host">هوست 👑</span>' : ''}
    `;
    list.appendChild(d);
  });

  // Enable start if 3+ players (host only)
  const startBtn = document.getElementById('start-online-btn');
  if (startBtn) startBtn.disabled = players.length < 3;

  // Update settings from room
  if (room.settings) {
    const ts = document.getElementById('online-time-slider');
    const ss = document.getElementById('online-spy-slider');
    if (ts) { ts.value = room.settings.timeMinutes; document.getElementById('online-time-val').textContent = room.settings.timeMinutes + ' دقيقة'; }
    if (ss) { ss.value = room.settings.spyCount; document.getElementById('online-spy-val').textContent = room.settings.spyCount + ' جاسوس'; }
  }
}

async function updateRoomSettings() {
  if (!onlineIsHost || !onlineRoomCode) return;
  try {
    await window.DB.updateRoom(onlineRoomCode, {
      settings: {
        timeMinutes: parseInt(document.getElementById('online-time-slider').value),
        spyCount:    parseInt(document.getElementById('online-spy-slider').value),
        categories:  selectedOnlineCategories,
      }
    });
  } catch(e) {}
}

async function startOnlineGame() {
  if (!onlineIsHost) return;
  const room = await window.DB.getRoom(onlineRoomCode);
  if (!room) return;

  const players  = Object.values(room.players);
  const settings = room.settings || { timeMinutes:8, spyCount:1, categories: allCategories };
  const cats     = settings.categories || allCategories;
  const cat      = cats[Math.floor(Math.random() * cats.length)];
  const items    = categoryItems[cat];
  const location = items[Math.floor(Math.random() * items.length)];

  const maxSpies = Math.floor(players.length / 3);
  const spyCnt   = Math.min(settings.spyCount, maxSpies);
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const spyIds   = new Set(shuffled.slice(0, spyCnt).map(p => p.id));

  const updates = {
    status: 'roleReveal',
    category: cat,
    location,
    revealIndex: 0,
  };

  players.forEach(p => {
    updates[`players/${p.id}/role`]     = spyIds.has(p.id) ? 'spy' : 'civilian';
    updates[`players/${p.id}/location`] = spyIds.has(p.id) ? null : location;
    updates[`players/${p.id}/category`] = spyIds.has(p.id) ? null : cat;
  });

  await window.DB.updateRoom(onlineRoomCode, updates);
  onlineGameState = { ...room, ...updates, players: Object.fromEntries(players.map(p => [p.id, {...p, role: spyIds.has(p.id)?'spy':'civilian', location: spyIds.has(p.id)?null:location}])) };
  startOnlineReveal(onlineGameState);
}

function startOnlineReveal(room) {
  const me = room.players[onlinePlayerId];
  if (!me) return;

  gameState = {
    mode: 'online',
    players: [me],
    category: room.category,
    location: room.location,
    revealIndex: 0,
    cardFlipped: false,
    timeMinutes: (room.settings || {}).timeMinutes || 8,
    totalTime: ((room.settings || {}).timeMinutes || 8) * 60,
    spyCount: Object.values(room.players).filter(p => p.role === 'spy').length,
  };

  goTo('screen-reveal');
  document.getElementById('reveal-turn-label').textContent = `دورك ${me.name} 👀`;
  document.getElementById('reveal-progress').textContent = '(أونلاين)';
  document.getElementById('reveal-next-btn').textContent = 'جاهز للعب 🚀';

  const back = document.getElementById('flip-back');
  document.getElementById('flip-inner').classList.remove('flipped');
  gameState.cardFlipped = false;

  if (me.role === 'spy') {
    back.className = 'flip-back spy-back';
    document.getElementById('rc-emoji').textContent     = '🕵️';
    document.getElementById('rc-role-label').textContent = 'أنت';
    document.getElementById('rc-role').textContent      = 'الجاسوس!';
    document.getElementById('rc-location').textContent  = '';
    document.getElementById('rc-category').textContent  = 'حاول تعرف المكان 🎯';
  } else {
    back.className = 'flip-back civ-back';
    document.getElementById('rc-emoji').textContent     = '👤';
    document.getElementById('rc-role-label').textContent = 'أنت';
    document.getElementById('rc-role').textContent      = 'مدني';
    document.getElementById('rc-location').textContent  = `📍 ${me.location}`;
    document.getElementById('rc-category').textContent  = `التصنيف: ${me.category}`;
  }
}

function syncOnlineGame(room) {
  if (document.getElementById('screen-game').classList.contains('active')) return;
  gameState.timeMinutes = (room.settings || {}).timeMinutes || 8;
  gameState.players = Object.values(room.players);
  gameState.spyCount = gameState.players.filter(p => p.role === 'spy').length;
  startGameTimer();
}

function syncOnlineVoting(room) {
  if (!document.getElementById('screen-voting').classList.contains('active')) {
    gameState.players = Object.values(room.players);
    goToVoting();
  }
}

function syncOnlineResults(room) {
  if (!document.getElementById('screen-results').classList.contains('active')) {
    gameState = { ...gameState, ...room, players: Object.values(room.players) };
    showResults(room.outcome || 'civilians_win');
  }
}

async function leaveRoom() {
  if (onlineUnsubscribe) onlineUnsubscribe();
  if (onlineRoomCode && onlinePlayerId) {
    try {
      if (onlineIsHost) {
        await window.DB.deleteRoom(onlineRoomCode);
      } else {
        await window.DB.removePlayer(onlineRoomCode, onlinePlayerId);
      }
    } catch(e) {}
  }
  onlineRoomCode = null;
  onlinePlayerId = null;
  onlineIsHost   = false;
  goTo('screen-spy-mode');
}

function copyRoomCode() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(onlineRoomCode).then(() => toast('تم نسخ الكود 📋'));
  } else {
    toast(`الكود: ${onlineRoomCode}`);
  }
  playSound('tap');
}
