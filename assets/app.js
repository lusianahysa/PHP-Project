// ═══════════════════════════════════════════════════════════════════════════
//  PARKSTER — app.js
//  • Landing page animations
//  • Auth modal
//  • Dashboard / Parking map
//  • PayPal payment + reserve.php DB sync
// ═══════════════════════════════════════════════════════════════════════════

const IS_LOGGED_IN    = document.body.dataset.loggedIn === 'true';
const HAS_LOGIN_ERR   = document.body.dataset.loginErr === 'true';
const FORCE_REGISTER  = document.body.dataset.forceRegister === 'true';
const ALL_SPOTS       = JSON.parse(document.body.dataset.spots || '[]');
const TOTAL_SPOTS     = parseInt(document.body.dataset.totalSpots || '0');
const FREE_SPOTS      = parseInt(document.body.dataset.freeSpots || '0');
const RESERVED_SPOTS  = parseInt(document.body.dataset.reservedSpots || '0');
const OCCUPIED_SPOTS  = parseInt(document.body.dataset.occupiedSpots || '0');

// Vendosja e vlerave të sakta nga Databaza në Front-end sapo hapet faqja
if (document.getElementById('statSpots')) {
    document.getElementById('statSpots').textContent = TOTAL_SPOTS;
    document.getElementById('statFree').textContent = FREE_SPOTS;
    document.getElementById('statOccupied').textContent = OCCUPIED_SPOTS;
}
if (document.getElementById('liveSpots')) {
    document.getElementById('liveSpots').textContent = FREE_SPOTS;
}

// ── Page switch ───────────────────────────────────
document.getElementById('page-landing').style.display   = IS_LOGGED_IN ? 'none'  : 'block';
document.getElementById('page-dashboard').style.display = IS_LOGGED_IN ? 'block' : 'none';
if (!IS_LOGGED_IN && FORCE_REGISTER) openAuth('register');
else if (!IS_LOGGED_IN && HAS_LOGIN_ERR) openAuth('login');

// ── Custom cursor (landing only) ──────────────────────────────────────────────
if (!IS_LOGGED_IN) {
  const cur = document.getElementById('cursor');
  const rng = document.getElementById('cursorRing');
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cur.style.left=(mx-6)+'px'; cur.style.top=(my-6)+'px';
  });
  (function loop(){
    rx+=(mx-rx-18)*.12; ry+=(my-ry-18)*.12;
    rng.style.left=rx+'px'; rng.style.top=ry+'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('button,a').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.style.transform='scale(2.5)'; rng.style.transform='scale(1.5)'; rng.style.opacity='.8'; });
    el.addEventListener('mouseleave', () => { cur.style.transform=''; rng.style.transform=''; rng.style.opacity='.5'; });
  });
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
document.querySelectorAll('.reveal').forEach(r => {
  new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  }), { threshold: .1 }).observe(r);
});

// ── Auth modal ────────────────────────────────────────────────────────────────
function openAuth(tab) {
  document.getElementById('authOverlay').classList.add('open');
  switchTab(tab || 'login');
  document.body.style.overflow = 'hidden';
}
function closeAuth() {
  document.getElementById('authOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  const T = tab.charAt(0).toUpperCase() + tab.slice(1);
  document.getElementById('tab'+T).classList.add('active');
  document.getElementById('form'+T).classList.add('active');
}
document.getElementById('authOverlay').addEventListener('click',function(e){ if(e.target===this) closeAuth(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeAuth(); });


// ── DASHBOARD UI LOGIC ────────────────────────────

const navDashboard = document.getElementById('nav-dashboard');
const navParking   = document.getElementById('nav-parking');
const viewDashboard = document.getElementById('view-dashboard');
const viewParking   = document.getElementById('view-parking');
let mapBuilt = false;

function dbView(v) {
    if (v === 'dash') {
        navDashboard.classList.add('active');
        navParking.classList.remove('active');
        viewDashboard.style.display = 'flex';
        viewParking.style.display = 'none';
    } else {
        navParking.classList.add('active');
        navDashboard.classList.remove('active');
        viewDashboard.style.display = 'none';
        viewParking.style.display = 'block';
        if (!mapBuilt) buildMap();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  GARAGE MAP
// ═══════════════════════════════════════════════════════════════════════════
let selectedSpot = null;
let duration     = 1;

function carSVG(color) {
  const c = color || '#6aaa50';
  return `<svg class="car" viewBox="0 0 34 58" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="10" width="24" height="36" rx="4" fill="${c}" opacity=".75"/>
    <path d="M9 10 L11 4 L23 4 L25 10z" fill="${c}" opacity=".85"/>
    <path d="M9 46 L11 54 L23 54 L25 46z" fill="${c}" opacity=".75"/>
    <rect x="9" y="5" width="16" height="7" rx="1" fill="rgba(180,220,255,.35)"/>
    <rect x="9" y="46" width="16" height="6" rx="1" fill="rgba(150,150,150,.25)"/>
    <rect x="3" y="12" width="5" height="9" rx="2" fill="#1a1a1a"/>
    <rect x="26" y="12" width="5" height="9" rx="2" fill="#1a1a1a"/>
    <rect x="3" y="37" width="5" height="9" rx="2" fill="#1a1a1a"/>
    <rect x="26" y="37" width="5" height="9" rx="2" fill="#1a1a1a"/>
    <rect x="6" y="7" width="8" height="2.5" rx="1" fill="rgba(255,60,60,.7)"/>
    <rect x="20" y="7" width="8" height="2.5" rx="1" fill="rgba(255,60,60,.7)"/>
    <rect x="6" y="49" width="8" height="2.5" rx="1" fill="rgba(255,230,100,.8)"/>
    <rect x="20" y="49" width="8" height="2.5" rx="1" fill="rgba(255,230,100,.8)"/>
    <rect x="15" y="5" width="4" height="6" rx="1" fill="rgba(255,255,255,.12)"/>
  </svg>`;
}

function buildMap() {
    mapBuilt = true;
    const g = document.getElementById('garage');
    if (!ALL_SPOTS.length) {
        g.innerHTML = '<p style="color:#fff;padding:20px;">No spots configured in the database.</p>';
        return;
    }

    const zones = {};
    ALL_SPOTS.forEach(s => {
        if (!zones[s.zone]) zones[s.zone] = [];
        zones[s.zone].push(s);
    });

    g.innerHTML = '';
    let rowCount = 0;
    const totalZones = Object.keys(zones).length;

    Object.keys(zones).sort().forEach(z => {
        const wrap = document.createElement('div');
        wrap.className = 'row-wrap';

        const lbl = document.createElement('div');
        lbl.className = 'row-label';
        lbl.textContent = z;
        wrap.appendChild(lbl);

        const row = document.createElement('div');
        row.className = 'spot-row';

        zones[z].forEach(spot => {
            const isTaken = spot.status !== 'available';

            const el = document.createElement('div');
            el.className = 'spot ' + (isTaken ? 'taken' : 'free');
            el.dataset.id = spot.id;

            const sb = document.createElement('div');
            sb.className = 'spot-status';
            sb.textContent = isTaken ? '' : 'FREE';
            el.appendChild(sb);

            if (isTaken) {
                el.innerHTML += carSVG();
            } else {
                el.onclick = () => selectSpot(spot, el);
            }

            const num = document.createElement('div');
            num.className = 'spot-num';
            num.textContent = spot.id;
            el.appendChild(num);

            row.appendChild(el);
        });

        wrap.appendChild(row);
        g.appendChild(wrap);

        rowCount++;
        if (rowCount % 2 === 0 && rowCount < totalZones) {
            const aisle = document.createElement('div');
            aisle.className = 'aisle';
            g.appendChild(aisle);
        }
    });

    wrap.appendChild(row);
    g.appendChild(wrap);

    rowCount++;
    if (rowCount % 2 === 0 && rowCount < zoneKeys.length) {
      const aisle = document.createElement('div');
      aisle.className = 'aisle';
      g.appendChild(aisle);
    }
  });

  updateStats();
}

// Build a single spot DOM element based on its DB status
function buildSpotEl(spot) {
  const status = spot.status; // 'available', 'reserved', 'occupied'

  const el = document.createElement('div');
  const cssClass = status === 'available' ? 'free'
                 : status === 'reserved'  ? 'reserved'
                 : 'taken';
  el.className      = 'spot ' + cssClass;
  el.dataset.id     = spot.id;
  el.dataset.status = status;

  const sb = document.createElement('div');
  sb.className = 'spot-status';
  sb.textContent = status === 'available' ? 'LIRË'
                 : status === 'reserved'  ? 'RES'
                 : '';
  el.appendChild(sb);

  if (status === 'occupied') {
    el.innerHTML += carSVG('#6aaa50');
  } else if (status === 'reserved') {
    el.innerHTML += carSVG('#c8a830');
    // Reserved spots are not clickable by others
  } else {
    // available — clickable
    el.onclick = () => selectSpot(spot, el);
  }

  const num = document.createElement('div');
  num.className = 'spot-num';
  num.textContent = spot.id;
  el.appendChild(num);

  return el;
}

function selectSpot(spot, el) {
    document.querySelectorAll('.spot.selected').forEach(s => s.classList.remove('selected'));
    if (selectedSpot && selectedSpot.id === spot.id) {
        selectedSpot = null;
        updateSidebar();
        return;
    }
    selectedSpot = spot;
    el.classList.add('selected');
    updateSidebar();
    return;
  }
  selectedSpot = spot;
  el.classList.add('selected');
  updateSidebar();
}

function updateSidebar() {
    const empty  = document.getElementById('sel-empty');
    const info   = document.getElementById('sel-info');
    const payBtn = document.getElementById('pay-btn');
    const timesBox = document.getElementById('times-box');

    if (!selectedSpot) {
        empty.style.display = 'block';
        info.style.display  = 'none';
        payBtn.style.display = 'none';
        timesBox.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    info.style.display  = 'block';
    payBtn.style.display = 'block';
    timesBox.style.display = 'block';

    document.getElementById('si-id').textContent     = selectedSpot.id;
    document.getElementById('si-type').textContent   = 'Standard — Sector ' + selectedSpot.zone;
    document.getElementById('si-status').textContent = 'Free';

    const rate = RATES.standard;
    document.getElementById('si-rate').textContent = rate + ' L';
    document.getElementById('pr-rate').textContent = rate + ' L';
    document.getElementById('pr-dur').textContent  = duration + (duration === 1 ? ' hr' : ' hrs');
    document.getElementById('pr-total').textContent = (rate * duration + FEE) + ' L';

    const now = new Date();
    const out = new Date(now.getTime() + duration * 3600000);
    document.getElementById('t-in').textContent  = fmtTime(now);
    document.getElementById('t-out').textContent = fmtTime(out);
}

function fmtTime(d) {
    return d.toTimeString().slice(0, 5);
}

// Duration buttons
document.getElementById('dur-row')?.addEventListener('click', e => {
  const b = e.target.closest('.dur');
  if (!b) return;
  document.querySelectorAll('.dur').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  duration = parseInt(b.dataset.h);
  updateSidebar();
});

// Update map stats counters
function updateStats() {
    const spots = document.querySelectorAll('.spot');
    let f = 0, r = 0, t = 0;
    spots.forEach(s => {
        if (s.classList.contains('free'))     f++;
        else if (s.classList.contains('reserved')) r++;
        else if (s.classList.contains('taken'))    t++;
    });
    const cF = document.getElementById('cnt-f'); if (cF) cF.textContent = f;
    const cR = document.getElementById('cnt-r'); if (cR) cR.textContent = r;
    const cT = document.getElementById('cnt-t'); if (cT) cT.textContent = t;
}

// Slider variables
const sliderTrack = document.getElementById('sliderTrack');
const notifBadge  = document.getElementById('notif-badge');
let maxScrolls = 0;

function doPay() {
    if (!selectedSpot) return;
    const btn = document.getElementById('pay-btn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    setTimeout(() => {
        // Visually mark the spot as taken
        const el = document.querySelector(`.spot[data-id="${selectedSpot.id}"]`);
        if (el) {
            el.classList.remove('free', 'selected');
            el.classList.add('taken');
            el.querySelector('.spot-status').textContent = '';
            el.innerHTML += carSVG();
            el.onclick = null;
        }

        toast('Confirmed! Spot ' + selectedSpot.id + ' has been successfully reserved.');

        // Create session card in dashboard
        createJobCard(selectedSpot.id);

        selectedSpot = null;
        updateSidebar();
        updateStats();
        btn.disabled = false;
        btn.textContent = 'Confirm & Pay';

        // Auto-return to Dashboard to view the session card
        setTimeout(() => dbView('dash'), 1000);
    }, 1400);
}

function createJobCard(spotId) {
    notifBadge.style.display = 'flex';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newCard = document.createElement('div');
    newCard.className = 'job-card';
    newCard.innerHTML = `
        <div class="job-banner" style="background-color: #1a1a1a;">
            <div class="company-logo" style="background:#fff;"><strong style="color:var(--teal); font-size:20px;">${spotId}</strong></div>
            <div class="no-match-badge" style="color: var(--teal);">RESERVED</div>
        </div>
        <div class="job-body">
            <div class="job-company">Active Session</div>
            <div class="job-title">Vehicle successfully registered in Sector ${spotId.charAt(0)}</div>
            <div class="job-location">Spot: ${spotId} &nbsp;|&nbsp; Duration: ${duration} ${duration === 1 ? 'hr' : 'hrs'}</div>
            <div class="open-badge" style="border-color: #2dde98; color: #2dde98;">ACTIVE</div>
            <div class="status-bars">
                <span class="active" style="background:#2dde98;"></span>
                <span class="active" style="background:#2dde98;"></span>
                <span class="active" style="background:#2dde98;"></span>
                <span></span><span></span>
            </div>
            <div class="job-footer-text">
                <i class="fa-solid fa-clock" style="color: #2dde98;"></i>
                <div>Check-in time:<br><span style="color:#2dde98; font-size: 11px;">${now}</span></div>
            </div>
            <div class="withdraw-btn" style="color: #ff6c5f;" onclick="endSession(this, '${spotId}')">
                <i class="fa-solid fa-circle-xmark"></i> End Session & Pay
            </div>
        </div>
    `;

    sliderTrack.insertBefore(newCard, sliderTrack.firstChild);
    maxScrolls++;
}

function endSession(btnElement, spotId) {
    if (!confirm(`End session for spot ${spotId}? The payment will be finalized.`)) return;

    btnElement.closest('.job-card').remove();

    // Free the spot on the map if visible
    const el = document.querySelector(`.spot[data-id="${spotId}"]`);
    if (el) {
        el.classList.remove('taken');
        el.classList.add('free');
        const car = el.querySelector('.car');
        if (car) car.remove();
        el.querySelector('.spot-status').textContent = 'FREE';
        el.onclick = () => selectSpot(
            { id: spotId, zone: spotId.charAt(0), status: 'available', type: 'standard' },
            el
        );
    }

    maxScrolls = Math.max(0, maxScrolls - 1);
    if (maxScrolls === 0) notifBadge.style.display = 'none';

    updateStats();
    alert(`Session for spot ${spotId} ended successfully!`);
}

function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
}

// Slider navigation
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
let position = 0;
const itemWidth = 340; // card width (320) + gap (20)

nextBtn?.addEventListener('click', () => {
  if (position < maxScrolls) {
    position++;
    sliderTrack.style.transform = `translateX(-${position * ITEM_W}px)`;
  }
});
prevBtn?.addEventListener('click', () => {
    if (position > 0) {
        position--;
        sliderTrack.style.transform = `translateX(-${position * itemWidth}px)`;
    }
});
