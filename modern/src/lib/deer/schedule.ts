export type WindowUTC = { start_utc?: string; end_utc?: string; start?: string; end?: string };
export type Schedule = {
  schema_version?: number;
  node_id?: string;
  version?: string | null;
  schedule_version?: string | null;
  timezone?: string;
  enabled?: boolean;
  effective_from_utc?: string;
  boot_grace_s?: number;
  windows?: WindowUTC[];
  daily_windows?: WindowUTC[];
  exceptions?: { date_utc: string; enabled?: boolean; windows?: WindowUTC[] }[];
  source?: string;
  verified_at_utc?: string | null;
  esp_session_id?: string | null;
  current_esp_session_verified?: boolean;
  stale?: boolean;
};
export type Prediction = {
  state: 'SCHEDULED_ACTIVE' | 'SCHEDULED_SLEEP' | 'BOOT_GRACE' | 'UNKNOWN_SCHEDULE';
  nextAt: number | null;
  nextAction: 'wake' | 'shutdown' | null;
  activeStart: number | null;
  graceUntil: number | null;
};
const DAY = 86400000;
const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
function minute(value: string | undefined) {
  if (!value || !HHMM.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
function dayStart(ms: number) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function occurrences(schedule: Schedule, now: number) {
  const intervals: { start: number; end: number }[] = [];
  const base = dayStart(now);
  for (let offset = -2; offset <= 4; offset++) {
    const date = base + offset * DAY;
    const key = new Date(date).toISOString().slice(0, 10);
    const exception = schedule.exceptions?.find((e) => e.date_utc === key);
    if (exception?.enabled === false) continue;
    const windows = exception?.windows ?? schedule.windows ?? schedule.daily_windows ?? [];
    for (const window of windows) {
      const start = minute(window.start_utc ?? window.start);
      const end = minute(window.end_utc ?? window.end);
      if (start === null || end === null || start === end) continue;
      const from = date + start * 60000;
      const to = date + end * 60000 + (end < start ? DAY : 0);
      intervals.push({ start: from, end: to });
    }
  }
  intervals.sort((a, b) => a.start - b.start);
  const merged: typeof intervals = [];
  for (const item of intervals) {
    const last = merged[merged.length - 1];
    if (last && item.start <= last.end) last.end = Math.max(last.end, item.end);
    else merged.push({ ...item });
  }
  return merged;
}
export function scheduleVersion(schedule: Schedule | null | undefined) {
  return schedule?.version ?? schedule?.schedule_version ?? null;
}
export function isValidSchedule(value: unknown): value is Schedule {
  if (!value || typeof value !== 'object') return false;
  const s = value as Schedule;
  if (s.timezone !== 'UTC' || typeof s.enabled !== 'boolean' || !scheduleVersion(s)) return false;
  const windows = s.windows ?? s.daily_windows;
  if (!Array.isArray(windows)) return false;
  if (s.enabled && windows.length === 0) return false;
  if (s.boot_grace_s !== undefined && (!Number.isFinite(s.boot_grace_s) || s.boot_grace_s < 0)) return false;
  if (s.effective_from_utc && !Number.isFinite(Date.parse(s.effective_from_utc))) return false;
  return windows.every((w) => minute(w.start_utc ?? w.start) !== null && minute(w.end_utc ?? w.end) !== null && (w.start_utc ?? w.start) !== (w.end_utc ?? w.end));
}
export function predict(schedule: Schedule | null, now = Date.now()): Prediction {
  const unknown: Prediction = { state: 'UNKNOWN_SCHEDULE', nextAt: null, nextAction: null, activeStart: null, graceUntil: null };
  if (!schedule || !isValidSchedule(schedule) || !schedule.enabled) return unknown;
  const effective = schedule.effective_from_utc ? Date.parse(schedule.effective_from_utc) : -Infinity;
  if (now < effective) return unknown;
  const intervals = occurrences(schedule, now).filter((w) => w.end > effective);
  const current = intervals.find((w) => w.start <= now && now < w.end);
  if (current) {
    const graceUntil = current.start + (schedule.boot_grace_s ?? 180) * 1000;
    return {
      state: now < graceUntil ? 'BOOT_GRACE' : 'SCHEDULED_ACTIVE',
      nextAt: current.end,
      nextAction: 'shutdown',
      activeStart: current.start,
      graceUntil
    };
  }
  const next = intervals.find((w) => w.start > now);
  return { state: 'SCHEDULED_SLEEP', nextAt: next?.start ?? null, nextAction: next ? 'wake' : null, activeStart: null, graceUntil: null };
}
export function duration(seconds: number) {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60), sec = s % 60;
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
}
export function utc(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—';
}
