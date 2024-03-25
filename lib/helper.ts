import * as path from 'node:path';

export function withDefault<K, V>(m: Map<K, V>, k: K, build: (k: K) => V): V {
  if (m.has(k)) {
    return m.get(k)!;
  }
  const update = build(k);
  m.set(k, update);
  return update;
}

export function relativize(s: string) {
  if (s.startsWith('./') || s.startsWith('../')) {
    return s;
  }
  try {
    new URL(s);
    return s;
  } catch (e) {}
  return './' + s;
}

export function isUrl(s: string) {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export function buildJoin(s: string) {
  if (isUrl(s)) {
    return (other: string) => {
      const u = new URL(other, s);
      return u.toString();
    };
  }
  return (other: string) => path.join(s, other);
}

export function urlAgnosticRelativeBasename(s: string) {
  if (isUrl(s)) {
    // e.g. "https://example.com/src/x.js" => "x.js"
    const u = new URL(s);
    return relativize(path.posix.basename(u.pathname));
  }
  return relativize(path.basename(s));
}

export function renderSkip(
  raw: string,
  skip: Iterable<{ start: number; end: number; replace?: string }>,
): string {
  const replaces = [...skip];
  replaces.sort(({ start: a }, { start: b }) => a - b);

  let out = raw.substring(0, replaces.at(0)?.start);
  for (let i = 0; i < replaces.length; ++i) {
    if (replaces[i].replace !== undefined) {
      out += replaces[i].replace;
    }
    const part = raw.substring(replaces[i].end, replaces.at(i + 1)?.start);
    out += part;
  }
  return out;
}

export function renderOnly(raw: string, include: { start: number; end: number }[]) {
  include = [...include].sort(({ start: a }, { start: b }) => a - b);

  const holes: { start: number; end: number }[] = [];

  let lastPart = '';
  let lastEnd = 0;
  const out = include
    .map(({ start, end }) => {
      const holeLength = start - lastEnd;
      let space = ''.padEnd(holeLength);

      if (!holeLength) {
        // zero padding (or start)
        lastEnd = end;
      } else {
        const hole = { start: lastEnd, end: start };
        holes.push(hole);
        lastEnd = end;

        if (partNeedsSemi(lastPart)) {
          ++hole.start;
          space = ';'.padEnd(holeLength);
        }
      }

      const part = raw.substring(start, end);
      lastPart = part;
      return space + part;
    })
    .join('');

  return { out, holes };
}

function partNeedsSemi(raw: string) {
  if (/^(class|function)\b/.test(raw)) {
    return false;
  }
  if (raw.endsWith(';')) {
    return false;
  }
  return true;
}
