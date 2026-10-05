// Limpia el texto que llega del RSS (entidades y el titular repetido).

export function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function squash(value: string): string {
  return decodeEntities(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// El RSS de Google News repite el titular y solo agrega el medio.
function repeats(text: string, bases: string[]): boolean {
  const next = squash(text);
  if (!next) return true;
  return bases.some((base) => {
    const prev = squash(base);
    if (!prev) return false;
    if (next === prev) return true;
    const [shorter, longer] =
      next.length < prev.length ? [next, prev] : [prev, next];
    return longer.includes(shorter) && longer.length - shorter.length <= 60;
  });
}

// Devuelve el texto solo si aporta algo que todavía no se mostró.
export function extraCopy(text: string, ...bases: string[]): string {
  if (repeats(text, bases)) return "";
  return decodeEntities(text);
}
