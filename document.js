// Device
let device = String(navigator.userAgent.match(/steam|macos/i)).toLowerCase();
if (
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
) device = 'ios';
document.documentElement.setAttribute('data-device', device);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const finalVoteStatusEl = $('.final-vote-status');
const casperEl = $('.casper');
const items = $$('.magi-item');
const bodyEl = document.body;

const caseInputEl = $('.case-input');
const caseSubmitEl = $('.case-submit');
const caseClearEl = $('.case-clear');

const randAll = _ => {
  $('.code').innerHTML = 100 + Math.floor(Math.random() * 600);
};

// ===== Sound =====
let sound = true;
const soundEl = $('.sound');
soundEl.onclick = e => {
  e.stopPropagation();
  sound = !sound;
  soundEl.setAttribute('data-text', sound ? 'ON' : 'OFF');
};
soundEl.setAttribute('data-text', sound ? 'ON' : 'OFF');

// WebAudio
let play = _ => {
  startWebAudio();
  play();
};
let stopAll = _ => {};
let playOscillator = _ => {};

let audioCtx;
let osc;
let lfo;
let VCO;
let carrierVolume;
AudioContext = window.AudioContext || window.webkitAudioContext;

let load = _ => {
  audioCtx = new AudioContext();
  carrierVolume = audioCtx.createGain();
  carrierVolume.gain.linearRampToValueAtTime(.5, 0);
  carrierVolume.connect(audioCtx.destination);
};

let startWebAudio = _ => {
  play = function () {
    if (!audioCtx) load();

    osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 2080;

    lfo = audioCtx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = exMode ? 30 : 10;

    lfo.connect(carrierVolume.gain);
    osc.connect(carrierVolume);
    lfo.start(0);
    osc.start(0);
  };

  playOscillator = (hz = 3400) => {
    if (!audioCtx) load();

    VCO = audioCtx.createOscillator();
    VCO.frequency.value = hz;
    VCO.connect(carrierVolume);
    VCO.start(0);
    VCO.stop(audioCtx.currentTime + .8);
  };

  stopAll = _ => {
    try {
      osc.stop(0);
      lfo.stop(0);
    } catch (e) {}
    try {
      VCO.stop(audioCtx.currentTime);
    } catch (e) {}
  };
};

document.addEventListener('visibilitychange', e => {
  if (document['hidden']) {
    stopAll();
    try {
      audioCtx.close();
      audioCtx = null;
    } catch (e) {}
  }
});

if (!AudioContext) {
  soundEl.setAttribute('data-text', 'ERR');
}

// ===== Config =====
let volume = 66;
let reject;

// ex mode
let exMode = false;
const exModeEl = $('.ex-mode');
exModeEl.onclick = e => {
  e.stopPropagation();
  exMode = !exMode;
  bodyEl.setAttribute('data-ex-mode', exMode);
  exModeEl.setAttribute('data-text', exMode ? 'ON' : 'OFF');
};
exModeEl.setAttribute('data-text', exMode ? 'ON' : 'OFF');

// input file
const fileEl = $('.file');
fileEl.onclick = e => {
  e.stopPropagation();
  fileEl.innerText = prompt('INPUT FILE', fileEl.innerText) || 'MAGI_SYS';
};

// volume
const volumeEl = $('.volume');
const volumes = [1, 10, 33, 50, 66, 90, 65535];
volumeEl.onclick = e => {
  e.stopPropagation();
  const index = volumes.indexOf(volume);
  let nextIndex = index + 1;
  if (nextIndex >= volumes.length) nextIndex = 0;
  volume = volumes[nextIndex];
  volumeEl.setAttribute('data-text', volume);
};
volumeEl.setAttribute('data-text', volume);

// priority
const priorityEl = $('.priority');
let priority = 'AAA';
const prioritys = ['E', '+++', 'A', 'AA', 'AAA'];
priorityEl.onclick = e => {
  e.stopPropagation();
  const index = prioritys.indexOf(priority);
  let nextIndex = index + 1;
  if (nextIndex >= prioritys.length) nextIndex = 0;
  priority = prioritys[nextIndex];
  priorityEl.setAttribute('data-text', priority);
};
priorityEl.setAttribute('data-text', priority);

// reset
$('.reset').onclick = e => {
  e.stopPropagation();
  bodyEl.removeAttribute('data-status');
  finalVoteStatusEl.removeAttribute('data-status');
  bodyEl.removeAttribute('data-vote-status');
  items.forEach(el => {
    el.setAttribute('data-status', '');
    const h2 = el.querySelector('h2');
    if (h2) h2.innerText = '';
    el.removeAttribute('title');
  });
};

// ===== LLM Vote =====
function setVotingUI() {
  items.forEach(el => {
    el.setAttribute('data-status', 'resolve');
    const h2 = el.querySelector('h2');
    if (h2) h2.innerText = '';
    el.removeAttribute('title');
  });
  finalVoteStatusEl.removeAttribute('data-status');
  bodyEl.setAttribute('data-status', 'voting');
}

function applyResult(result) {
  const { votes, final } = result || {};

  const map = {
    melchior: $('.melchior'),
    balthasar: $('.malthasar'),
    casper: $('.casper')
  };

  for (const key of Object.keys(map)) {
    const el = map[key];
    const v = votes?.[key];
    if (!el || !v) continue;

    el.setAttribute('data-status', v.vote);
    const h2 = el.querySelector('h2');
    if (h2) h2.innerText = v.vote === 'resolve' ? '可決' : '否決';
    el.title = `${v.role}: ${v.vote} (${v.confidence})\n${v.reason}`;
  }

  finalVoteStatusEl.setAttribute('data-status', final);
  bodyEl.setAttribute('data-status', 'voted');
  bodyEl.setAttribute('data-vote-status', final);

  // 声音提示
  if (sound) {
    stopAll();
    playOscillator(final === 'reject' ? 3400 : 2000);
  }
}

function applyError(err) {
  console.error(err);
  // 失败时用 CASPER 强制否决来“报警”
  items.forEach(el => el.setAttribute('data-status', 'reject'));
  casperEl.setAttribute('data-status', 'reject');
  finalVoteStatusEl.setAttribute('data-status', 'reject');
  bodyEl.setAttribute('data-status', 'voted');
  bodyEl.setAttribute('data-vote-status', 'reject');

  if (sound) {
    stopAll();
    playOscillator(3400);
  }

  alert(`决议失败：${err?.message || err}`);
}

let inflight = false;
async function doVote() {
  if (inflight) return;

  const current = bodyEl.getAttribute('data-status');
  if (current === 'voting') return;

  // 如果正在“voted”，再触发一次相当于重新投票
  setVotingUI();

  // 声音：投票过程的嗡鸣
  if (sound) {
    stopAll();
    play();
  }

  inflight = true;
  try {
    const payload = {
      caseText: (caseInputEl?.value || '').trim(),
      file: fileEl?.innerText || 'MAGI_SYS',
      volume,
      exMode,
      priority
    };

    const resp = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data?.error || `HTTP ${resp.status}`);
    }

    // 停掉投票嗡鸣
    if (sound) stopAll();

    applyResult(data);
    randAll();
  } catch (err) {
    if (sound) stopAll();
    applyError(err);
  } finally {
    inflight = false;
  }
}

// ===== Events =====
randAll();

$('.magi-box').onclick = doVote;
window.onkeydown = e => {
  if (e.keyCode === 32) {
    e.preventDefault();
    doVote();
  }
};

caseSubmitEl?.addEventListener('click', doVote);
caseClearEl?.addEventListener('click', () => {
  if (caseInputEl) caseInputEl.value = '';
});

setTimeout(_ => {
  bodyEl.removeAttribute('data-loading');
}, 1000);
