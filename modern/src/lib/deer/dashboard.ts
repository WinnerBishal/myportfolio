import { duration, isValidSchedule, predict, scheduleVersion, utc, type Schedule } from './schedule';

type RecordData = Record<string, any>;
type EventData = RecordData & { event_id?: string; observed_at_utc?: string; timestamp_utc?: string; type?: string; event_type?: string };
type PowerPoint = { t: number; watts: number | null; quality: string; source: string };
const CACHE_DB = 'deer-network-v1';
const KEYS = { endpoint: 'deer-node-01-endpoint', demo: 'deer-demo-opt-in' };
const $ = (id: string) => document.getElementById(id)!;
const set = (id: string, value: string) => { $(id).textContent = value; };
const number = (v: unknown, digits = 1) => typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '—';
const field = (...values: unknown[]) => values.find((v) => v !== null && v !== undefined);
const parseTime = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null;
const ageText = (t: number | null) => t === null ? 'No confirmed contact' : `Last measurement ${duration((Date.now() - t) / 1000)} ago · ${utc(t)}`;
const clean = (value: unknown) => typeof value === 'string' ? value : '';
const DEFAULT_ENDPOINT = 'https://edge.tail90fc2a.ts.net/api/v1';
let endpoint = localStorage.getItem(KEYS.endpoint) ?? DEFAULT_ENDPOINT;
let demo = sessionStorage.getItem(KEYS.demo) === 'yes';
let online = false;
let lastResponse: number | null = null;
let status: RecordData | null = null;
let metadata: RecordData | null = null;
let schedule: Schedule | null = null;
let scheduleOrigin = 'none';
let manifestSchedule: Schedule | null = null;
let events: EventData[] = [];
let points: PowerPoint[] = [];
let powerHours = 1;
let error = '';
let requestInFlight = false;
let clockDelta: number | null = null;
let liveScheduleVersion: string | null = null;
let previousScheduleVersion: string | null = null;
let lastStatusPoll = 0;
let lastHistoryPoll = 0;
let lastEventsPoll = 0;
let lastSchedulePoll = 0;
let lastSessionsPoll = 0;
let failures = 0;
let cursor: string | null = null;
let pageVisible = !document.hidden;
let timeoutController: AbortController | null = null;
const demoStart = Date.now();
const DEMO_WINDOWS = [{ start_utc: '00:00', end_utc: '03:30' }, { start_utc: '11:30', end_utc: '15:00' }];

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('items')) request.result.createObjectStore('items'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function cacheGet(key: string) {
  try {
    const database = await db();
    return await new Promise<any>((resolve) => {
      const transaction = database.transaction('items', 'readonly');
      const request = transaction.objectStore('items').get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
      transaction.oncomplete = () => database.close();
    });
  } catch { return null; }
}
async function cachePut(key: string, value: unknown) {
  try {
    const database = await db();
    await new Promise<void>((resolve) => {
      const transaction = database.transaction('items', 'readwrite');
      transaction.objectStore('items').put(value, key);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => resolve();
    });
  } catch {}
}
async function request(path: string, query = ''): Promise<RecordData> {
  if (!endpoint) throw new Error('No endpoint configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  timeoutController = controller;
  try {
    const response = await fetch(endpoint + path + query, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal, credentials: 'omit' });
    if (!response.ok) {
      if (response.status === 429) throw new Error('API rate limit reached');
      if (response.status === 401 || response.status === 403) throw new Error('Tailscale access denied');
      throw new Error(`HTTP ${response.status}`);
    }
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid API response');
    const payload = value as RecordData;
    if (payload.schema_version !== undefined && payload.schema_version !== 1) throw new Error('Incompatible API schema');
    return payload;
  } finally {
    clearTimeout(timer);
    if (timeoutController === controller) timeoutController = null;
  }
}
function endpointValid(value: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return false;
    return url.pathname.replace(/\/$/, '').endsWith('/api/v1');
  } catch { return false; }
}
function normalizePower(raw: RecordData): PowerPoint[] {
  const items = Array.isArray(raw.samples) ? raw.samples : Array.isArray(raw.data) ? raw.data : Array.isArray(raw.points) ? raw.points : [];
  return items.map((item: RecordData) => {
    const t = parseTime(field(item.sampled_at_utc, item.timestamp_utc, item.time_utc));
    const quality = clean(field(item.quality, 'MISSING'));
    const watts = field(item.power_w, item.watts, item.power?.watts, item.value);
    const valid = quality !== 'MISSING' && quality !== 'UNTRUSTED_TIME' && item.time_trusted !== false && typeof watts === 'number' && Number.isFinite(watts);
    return { t: t ?? NaN, watts: valid ? watts as number : null, quality, source: clean(field(item.source, 'unknown')) };
  }).filter((item: PowerPoint) => Number.isFinite(item.t)).sort((a: PowerPoint, b: PowerPoint) => a.t - b.t).slice(-1500);
}
function normalizeEvents(raw: RecordData): EventData[] {
  const items = Array.isArray(raw.events) ? raw.events : Array.isArray(raw.data) ? raw.data : [];
  return items.filter((item: unknown) => item && typeof item === 'object').slice(-200);
}
function measuredAt(s: RecordData | null) {
  const times = [s?.observed_at_utc, s?.power?.sampled_at_utc, s?.vision?.sampled_at_utc, s?.timestamp_utc]
    .map(parseTime).filter((t): t is number => t !== null);
  return times.length ? Math.max(...times) : null;
}
function isTimeFresh(time: number | null, maxAge = 30000) {
  return online && time !== null && Date.now() - time >= -30000 && Date.now() - time <= maxAge;
}
function isFresh(s: RecordData | null) {
  return isTimeFresh(measuredAt(s));
}
function liveState() {
  const observed = clean(field(status?.observed_state, status?.manager?.state, status?.manager_state)) || 'UNKNOWN';
  const predicted = predict(schedule);
  if (demo) return { observed: 'MONITORING', label: 'DEMO / SIMULATED', expected: predicted.state };
  if (!online) {
    if (predicted.state === 'BOOT_GRACE') return { observed, label: 'BOOT GRACE / UNVERIFIED', expected: predicted.state };
    if (predicted.state === 'SCHEDULED_ACTIVE' && predicted.graceUntil !== null && Date.now() >= predicted.graceUntil) return { observed, label: 'WAKE OVERDUE', expected: predicted.state };
    if (predicted.state === 'SCHEDULED_SLEEP') return { observed, label: 'EXPECTED SLEEP / UNVERIFIED', expected: predicted.state };
    return { observed, label: 'OFFLINE / UNKNOWN', expected: predicted.state };
  }
  if (observed === 'DEGRADED') return { observed, label: 'DEGRADED / CONFIRMED', expected: predicted.state };
  if (predicted.state === 'SCHEDULED_SLEEP') return { observed, label: 'UNSCHEDULED ACTIVE', expected: predicted.state };
  if (predicted.state === 'BENCH_COMPLETE') return { observed, label: 'BENCH COMPLETE / CONNECTED', expected: predicted.state };
  if (observed === 'WAITING_FOR_TIME') return { observed, label: 'WAITING FOR TIME / CONFIRMED', expected: predicted.state };
  if (isTimeFresh(parseTime(status?.observed_at_utc))) return { observed, label: 'ACTIVE / CONFIRMED', expected: predicted.state };
  return { observed, label: 'CONNECTED / STATUS STALE', expected: predicted.state };
}
function setPill(id: string, label: string) {
  const el = $(id);
  el.textContent = label;
  el.classList.toggle('is-good', label.includes('CONFIRMED') && !label.includes('DEGRADED'));
  el.classList.toggle('is-warn', label.includes('OVERDUE') || label.includes('DEGRADED') || label.includes('MISMATCH'));
}
function info() {
  const pred = predict(schedule);
  const state = liveState();
  const rawPower = field(status?.power?.power_w, status?.power?.watts, status?.power_w, status?.sensors?.power_w);
  const rawVoltage = field(status?.power?.voltage_v, status?.voltage_v, status?.sensors?.voltage_v);
  const rawCurrent = field(status?.power?.current_a, status?.current_a, status?.sensors?.current_a);
  const vision = status?.vision ?? {};
  const powerTime = parseTime(status?.power?.sampled_at_utc);
  const powerFresh = demo || isTimeFresh(powerTime);
  const visionTime = parseTime(field(vision.sampled_at_utc, vision.observed_at_utc, vision.frame_utc));
  const visionFresh = demo || isTimeFresh(visionTime);
  const rtcTrusted = status?.esp?.rtc_trusted === true;
  const voltage = powerFresh ? rawVoltage : null;
  const current = powerFresh ? rawCurrent : null;
  const watts = powerFresh ? rawPower : null;
  const fps = visionFresh ? field(vision.fps, vision.camera_fps) : null;
  const observed = state.observed;
  const seen = measuredAt(status);
  const seenText = seen !== null ? ageText(seen) : 'No confirmed contact';
  set('fleet-online', online && !demo ? '01' : '00');
  set('fleet-active', pred.state === 'UNKNOWN_SCHEDULE' ? '—' : pred.state === 'SCHEDULED_SLEEP' ? '00' : '01');
  set('fleet-last', seen ? duration((Date.now() - seen) / 1000) + ' ago' : '—');
  setPill('fleet-state', state.label);
  setPill('node-status', state.label);
  set('fleet-observed', observed);
  set('fleet-expected', pred.state.replace(/_/g, ' '));
  set('fleet-power', number(watts) + ' W');
  set('fleet-next', pred.nextAt ? utc(pred.nextAt).replace(' UTC', '') : '—');
  set('fleet-seen', seenText);
  set('node-seen', seenText);
  set('metric-voltage', number(voltage, 2) + ' V');
  set('metric-current', number(current, 2) + ' A');
  set('metric-power', number(watts, 2) + ' W');
  set('metric-fps', number(fps) + ' FPS');
  const powerFreshness = demo ? 'SIMULATED · DEMO' : powerFresh ? (rtcTrusted ? 'FRESH · MEASURED' : 'MEASURED · RTC UNTRUSTED') : powerTime ? 'STALE · LAST KNOWN' : 'No measurement';
  set('metric-voltage-info', powerFreshness);
  set('metric-power-info', powerFreshness);
  set('metric-vision-info', demo ? 'SIMULATED · DEMO' : visionFresh ? 'FRESH · MEASURED' : vision.pipeline_ready === true ? 'PIPELINE READY · NO FPS SAMPLE' : 'No measurement');
  const latestCount = visionFresh ? field(vision.latest_deer_count, vision.deer_count, vision.detection_count, vision.track_count, vision.latest_detection_count) : null;
  set('vision-count', latestCount === null || latestCount === undefined ? '—' : String(latestCount));
  set('vision-total', visionFresh ? String(field(vision.session_detection_count, vision.total_detections, '—')) : '—');
  set('vision-latency', visionFresh ? number(field(vision.inference_latency_ms, vision.inference_ms, vision.latency_ms)) + ' ms' : '—');
  set('vision-camera', demo ? 'READY' : online && vision.pipeline_ready === true ? 'PIPELINE READY' : visionFresh ? String(field(vision.camera_state, vision.camera_status, 'UNKNOWN')) : 'UNKNOWN');
  const recording = field(vision.recording_state, vision.recording_enabled, vision.recording);
  set('vision-recording', visionFresh && recording !== undefined ? typeof recording === 'boolean' ? recording ? 'ON' : 'OFF' : String(recording) : 'UNKNOWN');
  set('diag-manager', observed);
  set('diag-api', demo ? 'DEMO' : online ? 'ONLINE' : 'OFFLINE');
  set('diag-session', String(field(status?.esp?.session_id, status?.esp_session_id, metadata?.esp_session_id, '—')));
  set('diag-trust', String(field(status?.time?.quality, status?.time_quality, status?.esp?.rtc_trusted === true ? 'TRUSTED' : status?.esp?.rtc_trusted === false ? 'UNTRUSTED' : null, 'UNKNOWN')));
  set('diag-services', status?.services && typeof status.services === 'object' ? Object.entries(status.services).map(([name, v]) => name + ':' + (typeof v === 'string' ? v : (v as RecordData)?.state ?? '?')).join(' · ') : '—');
  set('diag-fault', String(field(status?.last_fault?.message, status?.last_fault, '—')));
  set('schedule-mode', pred.state.replace(/_/g, ' '));
  set('schedule-version', scheduleVersion(schedule) ?? '—');
  set('schedule-verified', utc(schedule?.verified_at_utc));
  set('schedule-source', scheduleOrigin === 'verified' ? 'ESP VERIFIED' : scheduleOrigin === 'cache' ? 'CACHED / LAST VERIFIED' : scheduleOrigin === 'published' ? 'PUBLISHED / UNVERIFIED' : demo ? 'DEMO' : 'NONE');
  const now = Date.now();
  const countdown = pred.nextAt ? duration((pred.nextAt - now) / 1000) : '—';
  set('countdown', countdown);
  set('transition-utc', pred.nextAt ? `${pred.nextAction?.toUpperCase()} · ${utc(pred.nextAt)}` : 'Awaiting schedule');
  set('schedule-banner', schedule?.mode === 'BENCH_ONE_SHOT'
    ? `BENCH ONE-SHOT · ${scheduleOrigin === 'verified' ? 'Verified current ESP session' : 'Unverified / last known'} · Not a recurring production schedule`
    : scheduleOrigin === 'verified' ? 'Verified against the current ESP session' : scheduleOrigin === 'cache' ? 'Last verified schedule · Current firmware unconfirmed' : scheduleOrigin === 'published' ? 'Published snapshot · Current firmware unverified' : demo ? 'Simulated operating windows' : 'No verified schedule available');
  set('global-connection', demo ? 'SIMULATED' : online ? 'NODE CONNECTED' : 'NOT CONNECTED');
  $('global-connection').classList.toggle('is-online', online && !demo);
  set('data-mode', demo ? 'DEMO DATA' : online ? 'LIVE CONNECTION' : 'NO LIVE DATA');
  $('data-mode').classList.toggle('is-demo', demo);
  set('demo-toggle', demo ? 'Exit demo' : 'Enable demo');
  const notice = $('notification');
  notice.textContent = demo ? 'DEMO DATA — All measurements and events are simulated. No connection to a field node.' : online ? (error ? `Jetson API reachable. ${error}.` : scheduleOrigin === 'verified' ? 'Private telemetry connected. ESP schedule verified for the current session.' : 'Private telemetry connected. Schedule not yet verified for the current ESP session.') : `Private node unreachable — connect to Tailscale for live telemetry. ${error ? error + '. ' : ''}Last reported readings are not live.`;
  if (manifestSchedule && schedule && scheduleVersion(manifestSchedule) !== scheduleVersion(schedule)) notice.textContent += ' SCHEDULE MISMATCH / VERIFY ON NEXT CONNECTION.';
  drawSchedule();
}
function drawSchedule() {
  const el = $('schedule-strip');
  el.replaceChildren();
  if (!schedule || !isValidSchedule(schedule) || !schedule.enabled) {
    el.textContent = 'No active UTC windows available';
    return;
  }
  const bench = schedule.mode === 'BENCH_ONE_SHOT';
  const boot = bench ? schedule.esp_boot_epoch_utc! * 1000 : 0;
  const today = new Date();
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startOfView = bench ? boot : midnight;
  const endOfView = bench ? boot + schedule.end_at_ms! : midnight + 86400000;
  const addSlot = (start: number, end: number) => {
    const left = Math.max(start, startOfView), right = Math.min(end, endOfView);
    if (right <= left) return;
    const slot = document.createElement('span');
    slot.className = 'slot';
    slot.style.left = `${((left - startOfView) / (endOfView - startOfView)) * 100}%`;
    slot.style.width = `${((right - left) / (endOfView - startOfView)) * 100}%`;
    el.append(slot);
  };
  if (bench) {
    addSlot(boot, boot + schedule.shutdown_at_ms!);
    addSlot(boot + schedule.wake_at_ms!, boot + schedule.end_at_ms!);
  } else {
    const windows = schedule.windows ?? schedule.daily_windows ?? [];
    for (const offset of [-1, 0]) {
      for (const win of windows) {
        const start = (win.start_utc ?? win.start ?? '00:00').split(':').map(Number);
        const end = (win.end_utc ?? win.end ?? '00:00').split(':').map(Number);
        const a = midnight + offset * 86400000 + (start[0] * 60 + start[1]) * 60000;
        const b = midnight + offset * 86400000 + (end[0] * 60 + end[1]) * 60000 + ((end[0] * 60 + end[1]) < (start[0] * 60 + start[1]) ? 86400000 : 0);
        addSlot(a, b);
      }
    }
  }
  const fraction = (Date.now() - startOfView) / (endOfView - startOfView);
  if (fraction >= 0 && fraction <= 1) {
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.style.left = `${fraction * 100}%`;
    el.append(cursor);
  }
  const caption = document.createElement('span');
  caption.className = 'slot-label';
  caption.textContent = bench ? `BENCH ONE-SHOT · ${utc(boot)} to ${utc(endOfView)}` : '00:00 — 24:00 UTC';
  el.append(caption);
}
function drawPower() {
  const el = $('power-plot');
  el.replaceChildren();
  const end = Date.now(), start = end - powerHours * 3600000;
  const visible = points.filter((p) => p.t >= start && p.t <= end);
  const valid = visible.filter((p) => p.watts !== null);
  if (!valid.length) { const empty = document.createElement('div'); empty.className = 'deer-plot-empty'; empty.textContent = 'No measured power samples in this interval.'; el.append(empty); }
  else {
    const width = 900, height = 225, padding = 16, max = Math.max(5, ...valid.map((p) => p.watts!)) * 1.15;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-label', 'Power history line chart with disconnected gaps');
    const fragments: PowerPoint[][] = [];
    for (const p of visible) {
      const last = fragments[fragments.length - 1];
      const gap = last && last.length > 0 && p.t - last[last.length - 1].t > Math.max(120000, powerHours * 3600000 / 40);
      if (p.watts === null) { fragments.push([]); continue; }
      if (!last || gap) fragments.push([p]);
      else last.push(p);
    }
    for (const segment of fragments.filter((x) => x.length > 0)) {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', segment.map((p) => `${((p.t - start) / (end - start)) * width},${height - padding - (p.watts! / max) * (height - padding * 2)}`).join(' '));
      polyline.setAttribute('fill', 'none'); polyline.setAttribute('stroke', 'var(--brand-ink)'); polyline.setAttribute('stroke-width', '2'); polyline.setAttribute('vector-effect', 'non-scaling-stroke'); svg.append(polyline);
    }
    el.append(svg);
  }
  set('power-quality', `${valid.length} measured samples · ${visible.length - valid.length} unavailable or untrusted · Missing periods are not interpreted as zero watts.`);
  const body = $('power-table'); body.replaceChildren();
  for (const point of visible.slice(-200).reverse()) {
    const row = document.createElement('tr');
    for (const value of [utc(point.t), point.watts === null ? '—' : number(point.watts, 2), point.quality]) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    body.append(row);
  }
  if (!visible.length) { const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 3; cell.textContent = 'No measurements'; row.append(cell); body.append(row); }
}
function drawEvents() {
  const el = $('event-timeline'); el.replaceChildren();
  const ordered = [...events].sort((a, b) => {
    if (a.time_trusted === false || b.time_trusted === false) return 0;
    return (parseTime(field(b.occurred_at_utc, b.observed_at_utc, b.timestamp_utc, b.time_utc)) ?? 0) - (parseTime(field(a.occurred_at_utc, a.observed_at_utc, a.timestamp_utc, a.time_utc)) ?? 0);
  });
  for (const e of ordered.slice(0, 60)) {
    const item = document.createElement('li');
    const time = document.createElement('time'); time.textContent = e.time_trusted === false ? 'TIME UNTRUSTED' : utc(field(e.occurred_at_utc, e.observed_at_utc, e.timestamp_utc, e.time_utc) as string);
    const content = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = clean(field(e.event_type, e.type, e.code, 'EVENT'));
    const desc = document.createElement('small'); desc.textContent = clean(field(e.message, e.description, e.source, ''));
    content.append(title, desc); item.append(time, content); el.append(item);
  }
  if (!ordered.length) { const item = document.createElement('li'); item.className = 'deer-empty'; item.textContent = 'No events available.'; el.append(item); }
  set('events-meta', `${ordered.length} recent events`);
}
async function loadManifest() {
  try {
    const response = await fetch('/dashboard/schedule-manifest.json', { cache: 'no-cache' });
    if (!response.ok) return;
    const raw = await response.json();
    const value = raw.schedule ?? raw;
    if (isValidSchedule(value)) {
      manifestSchedule = value;
      if (!schedule) { schedule = value; scheduleOrigin = 'published'; }
    }
  } catch {}
}
async function restore() {
  await loadManifest();
  const cached = await cacheGet('node-01');
  if (cached && typeof cached === 'object') {
    if (cached.status && !demo) status = cached.status;
    if (Array.isArray(cached.points) && !demo) points = cached.points.slice(-1500);
    if (Array.isArray(cached.events) && !demo) events = cached.events.slice(-200);
    if (!demo && cached.schedule && isValidSchedule(cached.schedule)) { schedule = cached.schedule; scheduleOrigin = 'cache'; }
  }
  render();
}
function persist() {
  if (demo) return;
  cachePut('node-01', { status, points: points.slice(-1500), events: events.slice(-200), schedule: scheduleOrigin === 'verified' || scheduleOrigin === 'cache' ? schedule : null });
}
async function syncSchedule() {
  const raw = await request('/schedule');
  const candidate = (raw.schedule ?? raw) as Schedule;
  const currentVersion = field(status?.schedule_version, metadata?.schedule_version);
  if (!isValidSchedule(candidate)) throw new Error('Unverified or invalid schedule response');
  const version = scheduleVersion(candidate);
  const same = currentVersion === version;
  if (candidate.current_esp_session_verified !== true || candidate.stale === true || !same) throw new Error('Schedule is not verified for the current ESP session');
  schedule = candidate;
  scheduleOrigin = 'verified';
  previousScheduleVersion = version;
  persist();
}
async function connect() {
  if (requestInFlight || !endpoint || demo || !pageVisible) return;
  requestInFlight = true;
  try {
    const health = await request('/health');
    if (health.status !== 'ok') throw new Error('API health is not OK');
    const serverTime = parseTime(health.server_time_utc);
    if (serverTime) clockDelta = serverTime - Date.now();
    online = true;
    failures = 0;
    error = '';
    lastResponse = Date.now();
    lastStatusPoll = Date.now();

    const results = await Promise.allSettled([request('/meta'), request('/status')]);
    const meta = results[0].status === 'fulfilled' ? results[0].value : null;
    const snap = results[1].status === 'fulfilled' ? results[1].value : null;
    if (meta) metadata = meta;
    if (snap) status = snap;

    if (!snap) {
      error = 'API reachable, but /status is unavailable';
    } else {
      liveScheduleVersion = clean(field(snap.schedule_version, meta?.schedule_version, metadata?.schedule_version)) || null;
      if (scheduleOrigin !== 'verified' || previousScheduleVersion !== liveScheduleVersion || Date.now() - lastSchedulePoll > 60000) {
        try { await syncSchedule(); } catch (e) {
          if (scheduleOrigin === 'verified') scheduleOrigin = 'cache';
          error = e instanceof Error ? e.message : 'Schedule verification failed';
        }
        lastSchedulePoll = Date.now();
      }
    }
    persist();
  } catch (e) {
    online = false;
    failures++;
    const message = e instanceof Error ? e.message : 'Connection failed';
    error = message === 'Failed to fetch' || message === 'Load failed' || message === 'NetworkError when attempting to fetch resource.'
      ? 'Browser fetch blocked or unreachable — check CORS, Tailscale, and browser Network tab'
      : e instanceof Error && e.name === 'AbortError' ? 'API timeout' : message;
  } finally { requestInFlight = false; render(); }
}
async function history() {
  if (demo || !online || !endpoint || !pageVisible) return;
  const to = new Date().toISOString(), from = new Date(Date.now() - powerHours * 3600000).toISOString();
  const resolution = powerHours >= 24 ? 'hour' : powerHours >= 6 ? 'minute' : 'raw';
  try {
    const raw = await request('/power', `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&resolution=${resolution}`);
    points = normalizePower(raw); persist(); drawPower();
  } catch {}
  lastHistoryPoll = Date.now();
}
async function fetchEvents() {
  if (demo || !online || !endpoint || !pageVisible) return;
  try {
    const raw = await request('/events', `?limit=100${cursor ? '&after=' + encodeURIComponent(cursor) : ''}`);
    const next = normalizeEvents(raw);
    const unique = new Map<string, EventData>();
    for (const e of [...events, ...next]) unique.set(clean(e.event_id) || `${e.source}/${e.session_id}/${e.seq}`, e);
    events = [...unique.values()].slice(-200);
    if (typeof raw.next_cursor === 'string') cursor = raw.next_cursor;
    persist(); drawEvents();
  } catch {}
  lastEventsPoll = Date.now();
}
async function fetchSessionsAndVision() {
  if (demo || !online || !endpoint || !pageVisible) return;
  await Promise.allSettled([
    request('/sessions', '?limit=30').then((data) => { if (data.sessions?.length && status && !status.esp_session_id) status.esp_session_id = data.sessions[0].session_id; }),
    request('/vision', `?from=${encodeURIComponent(new Date(Date.now() - 3600000).toISOString())}&to=${encodeURIComponent(new Date().toISOString())}`).then((data) => { if (status && data.current && typeof data.current === 'object') status.vision = { ...data.current, ...(status.vision ?? {}) }; })
  ]);
  lastSessionsPoll = Date.now(); render();
}
function demoData() {
  const t = Date.now();
  const phase = (t - demoStart) / 1000;
  schedule = { timezone: 'UTC', enabled: true, version: 'demo-only', windows: DEMO_WINDOWS, boot_grace_s: 180, source: 'demo' };
  scheduleOrigin = 'demo'; online = false;
  status = { observed_state: 'MONITORING', observed_at_utc: new Date(t).toISOString(), power: { voltage_v: 12.76, current_a: 1.23 + .1 * Math.sin(phase), power_w: 15.69 + Math.sin(phase) }, vision: { fps: 12.4, latest_deer_count: 2, session_detection_count: 41, inference_latency_ms: 78, camera_state: 'READY', recording_state: 'ON' }, esp_session_id: 'demo-session', time_quality: 'SIMULATED', services: { manager: 'active', vision: 'active', esp: 'active' } };
  points = Array.from({ length: 90 }, (_, i) => ({ t: t - (89 - i) * 60000, watts: i >= 38 && i <= 45 ? null : 14.5 + 1.5 * Math.sin(i / 7) + .3 * Math.cos(i / 3), quality: 'MEASURED', source: 'demo' }));
  events = [{ event_id: 'demo-1', event_type: 'MONITORING', observed_at_utc: new Date(t - 180000).toISOString(), message: 'Simulated monitoring session' }, { event_id: 'demo-2', event_type: 'TIME_READY', observed_at_utc: new Date(t - 420000).toISOString(), message: 'Simulated NTP synchronization' }];
}
function render() { info(); drawPower(); drawEvents(); }
function view(name: string) {
  $('fleet-view').hidden = name !== 'fleet'; $('node-view').hidden = name !== 'node';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    const active = button.dataset.view === name;
    button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
  }
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click', () => view(button.dataset.view ?? 'fleet'));
$('node-open').addEventListener('click', () => view('node'));
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-range]')) button.addEventListener('click', () => {
  powerHours = Number(button.dataset.range);
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-range]')) b.setAttribute('aria-pressed', String(b === button));
  drawPower(); if (!demo) history();
});
const dialog = $('settings-dialog') as HTMLDialogElement;
$('settings-open').addEventListener('click', () => { ($('endpoint-input') as HTMLInputElement).value = endpoint; set('endpoint-error', ''); dialog.showModal(); });
$('endpoint-save').addEventListener('click', () => {
  const candidate = ($('endpoint-input') as HTMLInputElement).value.trim().replace(/\/$/, '');
  if (!endpointValid(candidate)) { set('endpoint-error', 'Use an HTTPS URL ending in /api/v1 (local HTTP permitted only on localhost).'); return; }
  endpoint = candidate; localStorage.setItem(KEYS.endpoint, endpoint); online = false; error = ''; failures = 0; dialog.close(); connect();
});
$('endpoint-clear').addEventListener('click', () => { endpoint = ''; localStorage.removeItem(KEYS.endpoint); online = false; error = ''; dialog.close(); render(); });
$('demo-toggle').addEventListener('click', async () => {
  demo = !demo;
  sessionStorage.setItem(KEYS.demo, demo ? 'yes' : 'no');
  if (demo) { demoData(); render(); } else { status = null; points = []; events = []; schedule = null; scheduleOrigin = 'none'; await restore(); if (endpoint) connect(); }
});
document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; if (!pageVisible) timeoutController?.abort(); else if (!demo) connect(); });
window.addEventListener('online', () => { if (!demo) connect(); });
window.addEventListener('pagehide', () => timeoutController?.abort());
setInterval(() => {
  set('utc-clock', utc(Date.now()));
  if (demo) { demoData(); render(); return; }
  info();
  if (!pageVisible || !endpoint || requestInFlight) return;
  const now = Date.now();
  const retry = Math.min(60000, Math.max(5000, Math.pow(2, Math.min(4, failures)) * 5000));
  if (now - lastStatusPoll > (online ? 5000 : retry)) { lastStatusPoll = now; connect(); }
  if (online && now - lastHistoryPoll > 30000) history();
  if (online && now - lastEventsPoll > 15000) fetchEvents();
  if (online && now - lastSessionsPoll > 60000) fetchSessionsAndVision();
}, 1000);
restore().then(() => { if (demo) { demoData(); render(); } else if (endpoint) connect(); });
