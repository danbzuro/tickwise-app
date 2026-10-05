// Digest HTML alineado a src/server/emails/feed-digest.html

export type DigestMateriality = "material" | "potentially" | "noteworthy";
export type DigestCategory = "Earnings" | "Product" | "M&A" | "Regulation" | "Market";

export interface DigestStory {
  tick: string | null;
  title: string;
  summary: string;
  whyItMatters: string | null;
  url: string;
  publishedAt: string;
  category: DigestCategory;
  materiality: DigestMateriality;
}

export interface DigestInput {
  orgName: string;
  logoUrl: string | null;
  stories: DigestStory[];
  screenedCount: number;
  sentAt?: Date;
}

const RANK: Record<DigestMateriality, number> = {
  noteworthy: 0,
  potentially: 1,
  material: 2,
};

const CATEGORY_STYLE: Record<DigestCategory, string> = {
  Earnings:
    "display:inline-block;margin:0 6px 6px 0;border:1px solid transparent;border-radius:6px;background:#18181b;padding:2px 10px;font-size:12px;font-weight:600;line-height:16px;color:#fafafa;",
  Product:
    "display:inline-block;margin:0 6px 6px 0;border:1px solid transparent;border-radius:6px;background:#f4f4f5;padding:2px 10px;font-size:12px;font-weight:600;line-height:16px;color:#18181b;",
  "M&A":
    "display:inline-block;margin:0 6px 6px 0;border:1px solid transparent;border-radius:6px;background:#18181b;padding:2px 10px;font-size:12px;font-weight:600;line-height:16px;color:#fafafa;",
  Regulation:
    "display:inline-block;margin:0 6px 6px 0;border:1px solid transparent;border-radius:6px;background:#ef4444;padding:2px 10px;font-size:12px;font-weight:600;line-height:16px;color:#fafafa;",
  Market:
    "display:inline-block;margin:0 6px 6px 0;border:1px solid #e4e4e7;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:600;line-height:16px;color:#09090b;",
};

const MATERIALITY_STYLE: Record<DigestMateriality, { label: string; style: string }> = {
  material: {
    label: "Material",
    style:
      "display:inline-block;margin:0 6px 6px 0;border:1px solid transparent;border-radius:6px;background:#059669;padding:2px 10px;font-size:12px;font-weight:600;line-height:16px;color:#ffffff;",
  },
  potentially: {
    label: "Potentially material",
    style:
      "display:inline-block;margin:0 6px 6px 0;border:1px solid transparent;border-radius:6px;background:#f59e0b;padding:2px 10px;font-size:12px;font-weight:600;line-height:16px;color:#ffffff;",
  },
  noteworthy: {
    label: "Noteworthy",
    style:
      "display:inline-block;margin:0 6px 6px 0;border:1px solid #e4e4e7;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:600;line-height:16px;color:#71717a;",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function orgInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function sortStories(stories: DigestStory[]): DigestStory[] {
  return [...stories].sort((a, b) => {
    const rank = RANK[b.materiality] - RANK[a.materiality];
    if (rank !== 0) return rank;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function storyWhen(publishedAt: string, now: Date): string {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";
  if (sameDay(date, now)) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function headerDate(now: Date): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function safeHref(url: string): string {
  if (!/^https?:\/\//i.test(url)) return "#";
  return escapeHtml(url);
}

function storyCountLabel(count: number): string {
  return `${count} ${count === 1 ? "story" : "stories"}`;
}

export function digestSubject(orgName: string, storyCount: number): string {
  return `${orgName} · ${storyCountLabel(storyCount)}`;
}

function brandMark(orgName: string, logoUrl: string | null): string {
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    return `<img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="${escapeHtml(orgName)}" style="display:block;width:48px;height:48px;border-radius:6px;object-fit:cover;" />`;
  }
  return `<div style="width:48px;height:48px;background:#18181b;border-radius:6px;color:#fafafa;font-size:14px;font-weight:600;line-height:48px;text-align:center;">${escapeHtml(orgInitials(orgName) || "TW")}</div>`;
}

function storyRow(story: DigestStory, now: Date, last: boolean): string {
  const padding = last ? "16px 24px 24px" : "16px 24px";
  const tick = story.tick?.trim();
  const why = story.whyItMatters?.trim() ?? "";
  const summary = story.summary.trim();
  const mat = MATERIALITY_STYLE[story.materiality];
  return `<tr>
              <td style="padding:${padding};border-top:1px solid #e4e4e7;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:0;line-height:0;">
                      ${
                        tick
                          ? `<span style="display:inline-block;margin:0 6px 6px 0;border:1px solid #e4e4e7;border-radius:6px;padding:2px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:600;line-height:16px;color:#09090b;">${escapeHtml(tick)}</span>`
                          : ""
                      }
                      <span style="${CATEGORY_STYLE[story.category]}">${escapeHtml(story.category)}</span>
                      <span style="${mat.style}">${mat.label}</span>
                    </td>
                    <td align="right" valign="top" style="white-space:nowrap;font-size:12px;line-height:16px;color:#71717a;">${escapeHtml(storyWhen(story.publishedAt, now))}</td>
                  </tr>
                </table>
                <div style="margin-top:8px;font-size:16px;font-weight:600;line-height:1.35;color:#09090b;">${escapeHtml(story.title)}</div>
                ${
                  summary
                    ? `<div style="margin-top:4px;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(summary)}</div>`
                    : ""
                }
                ${
                  why
                    ? `<div style="margin-top:12px;border:1px solid #e4e4e7;border-radius:6px;background:#f4f4f5;padding:8px 12px;">
                  <div style="font-size:12px;font-weight:500;line-height:16px;color:#09090b;">Why it matters</div>
                  <div style="margin-top:4px;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(why)}</div>
                </div>`
                    : ""
                }
                <a href="${safeHref(story.url)}" style="display:inline-block;margin-top:12px;font-size:14px;font-weight:500;color:#09090b;text-decoration:underline;">Read article</a>
              </td>
            </tr>`;
}

export function renderFeedDigestHtml(input: DigestInput): string {
  const now = input.sentAt ?? new Date();
  const stories = sortStories(input.stories);
  const count = stories.length;
  const dateLabel = headerDate(now);
  const preview =
    stories[0]?.title ??
    `No stories kept for ${input.orgName}`;
  const empty = `<tr>
              <td style="padding:16px 24px 24px;border-top:1px solid #e4e4e7;font-size:14px;line-height:1.5;color:#71717a;">
                No stories passed the noise rules this run.
              </td>
            </tr>`;
  const rows = stories.length
    ? stories.map((story, index) => storyRow(story, now, index === stories.length - 1)).join("\n\n            ")
    : empty;
  const dropped =
    input.screenedCount > 0
      ? ` The noise rules already dropped ${input.screenedCount} ${input.screenedCount === 1 ? "story" : "stories"}.`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(digestSubject(input.orgName, count))}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <!-- Texto que muestra la bandeja antes de abrir el mail -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(`${input.orgName} · ${preview}`)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;">
            <tr>
              <td style="padding:32px 24px 0;">
                <!-- Marca de la organización, centrada -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      ${brandMark(input.orgName, input.logoUrl)}
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:12px;font-size:20px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;color:#09090b;">
                      ${escapeHtml(input.orgName)}
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:4px;padding-bottom:20px;font-size:14px;line-height:20px;color:#71717a;">
                      ${escapeHtml(dateLabel)} · ${escapeHtml(storyCountLabel(count))}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${rows}
          </table>

          <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#71717a;text-align:center;">
            Sent for ${escapeHtml(input.orgName)}.${dropped}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export function renderFeedDigestText(input: DigestInput): string {
  const now = input.sentAt ?? new Date();
  const stories = sortStories(input.stories);
  const lines = [
    `${input.orgName} · ${headerDate(now)} · ${storyCountLabel(stories.length)}`,
    "",
  ];
  if (stories.length === 0) {
    lines.push("No stories passed the noise rules this run.");
  }
  for (const story of stories) {
    const mat = MATERIALITY_STYLE[story.materiality].label;
    const tick = story.tick?.trim() ? `${story.tick.trim()} · ` : "";
    lines.push(`${tick}${story.category} · ${mat} · ${storyWhen(story.publishedAt, now)}`);
    lines.push(story.title);
    if (story.summary.trim()) lines.push(story.summary.trim());
    if (story.whyItMatters?.trim()) lines.push(`Why it matters: ${story.whyItMatters.trim()}`);
    lines.push(story.url);
    lines.push("");
  }
  const dropped =
    input.screenedCount > 0
      ? ` The noise rules already dropped ${input.screenedCount} ${input.screenedCount === 1 ? "story" : "stories"}.`
      : "";
  lines.push(`Sent for ${input.orgName}.${dropped}`);
  return lines.join("\n");
}

export function validRecipients(emails: string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    kept.push(email);
  }
  return kept;
}

export interface DigestSendResult {
  emailsSent: number;
  emailError?: string;
}

interface ResendErrorBody {
  message?: string;
  name?: string;
  error?: string;
}

async function resendRequest(
  apiKey: string,
  path: string,
  body: unknown,
  idempotencyKey: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (response.ok) return { ok: true };
  let detail = `Resend ${response.status}`;
  try {
    const json = (await response.json()) as ResendErrorBody;
    detail = json.message || json.error || detail;
  } catch {
    // El body no era JSON.
  }
  return { ok: false, message: detail };
}

export async function sendFeedDigestEmail(input: {
  apiKey: string;
  from: string;
  recipients: string[];
  orgId: string;
  runId: string;
  digest: DigestInput;
}): Promise<DigestSendResult> {
  const to = validRecipients(input.recipients);
  if (to.length === 0) return { emailsSent: 0 };

  const subject = digestSubject(input.digest.orgName, input.digest.stories.length);
  const html = renderFeedDigestHtml(input.digest);
  const text = renderFeedDigestText(input.digest);
  const payload = {
    from: input.from,
    subject,
    html,
    text,
    tags: [
      { name: "email_type", value: "feed-digest" },
      { name: "org_id", value: input.orgId },
    ],
  };

  if (to.length === 1) {
    const result = await resendRequest(
      input.apiKey,
      "/emails",
      { ...payload, to },
      `feed-digest/${input.runId}`
    );
    return result.ok
      ? { emailsSent: 1 }
      : { emailsSent: 0, emailError: result.message };
  }

  const batch = to.map((email) => ({ ...payload, to: [email] }));
  const result = await resendRequest(
    input.apiKey,
    "/emails/batch",
    batch,
    `batch-feed-digest/${input.runId}`
  );
  return result.ok
    ? { emailsSent: to.length }
    : { emailsSent: 0, emailError: result.message };
}
