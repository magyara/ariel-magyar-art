import { theme } from '../../theme';
import { toLocalInput } from '../../lib/scheduleTime';
import { input, select } from './adminStyles';

const STEP_MINUTES = 15;

const pad = (n: number) => String(n).padStart(2, '0');

/** Every quarter hour of the day as `HH:MM`. */
const TIMES = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, i) => {
  const minutes = i * STEP_MINUTES;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
});

const label = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Snaps an `HH:MM` value to the nearest quarter hour at or before it. */
const snap = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return `${pad(h)}:${pad(m - (m % STEP_MINUTES))}`;
};

interface Props {
  /** datetime-local style value, `YYYY-MM-DDTHH:MM`, in local time. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Date + quarter-hour time picker. The native datetime-local picker can't be
 * limited to 15-minute steps, and the scheduler only runs every 15 minutes anyway.
 */
export default function ScheduleInput({ value, onChange }: Props) {
  const [date = '', rawTime = '17:00'] = value.split('T');
  const time = snap(rawTime);
  const now = toLocalInput(new Date());
  const today = now.slice(0, 10);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      <input
        type="date"
        aria-label="Post on date"
        style={{ ...input, maxWidth: 180, colorScheme: 'dark' }}
        min={today}
        value={date}
        onChange={(e) => onChange(`${e.target.value}T${time}`)}
      />
      <select
        aria-label="Post at time"
        style={{ ...select, maxWidth: 140, color: theme.paper }}
        value={time}
        onChange={(e) => onChange(`${date}T${e.target.value}`)}
      >
        {TIMES.map((t) => (
          <option key={t} value={t} disabled={date === today && `${date}T${t}` <= now}>
            {label(t)}
          </option>
        ))}
      </select>
    </div>
  );
}
