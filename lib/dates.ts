function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRelative(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return formatDate(iso) ?? "";
  const diff = Math.floor((date.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${-diff}d ago`;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff}d`;
}

function dayDiff(dateStr: string): number {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return NaN;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

export function upcomingLabel(dateStr: string): string {
  const diff = dayDiff(dateStr);
  if (Number.isNaN(diff)) return dateStr;
  if (diff < 0) return diff === -1 ? "Yesterday" : `${-diff} days overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    new Date(`${dateStr.slice(0, 10)}T00:00:00`),
  );
  if (diff <= 6) return weekday;
  if (diff <= 13) return `Next ${weekday}`;
  return formatDate(dateStr) ?? dateStr;
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `~${minutes} min`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return hours === 1 ? "~1 hr" : `~${hours} hrs`;
  return `~${hours.toFixed(1).replace(/\.0$/, "")} hrs`;
}
