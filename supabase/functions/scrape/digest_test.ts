import {
  digestSubject,
  escapeHtml,
  orgInitials,
  renderFeedDigestHtml,
  renderFeedDigestText,
  sortStories,
  validRecipients,
  type DigestStory,
} from "./digest.ts";

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(message ?? "assertion failed");
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

const sample: DigestStory = {
  tick: "NVDA",
  title: 'NVIDIA <expands> "platform"',
  summary: "New deals & demand.",
  whyItMatters: "Locked-in hyperscale demand.",
  url: "https://blogs.nvidia.com/",
  publishedAt: "2026-10-04T15:58:00.000Z",
  category: "Market",
  materiality: "material",
};

Deno.test("escapes user copy in the digest html", () => {
  const html = renderFeedDigestHtml({
    orgName: "Org <1>",
    logoUrl: null,
    stories: [sample],
    screenedCount: 1,
    sentAt: new Date("2026-10-04T18:00:00.000Z"),
  });
  assert(!html.includes("<expands>"));
  assert(html.includes("NVIDIA &lt;expands&gt;"));
  assert(html.includes("Org &lt;1&gt;"));
  assert(html.includes("Why it matters"));
  assert(html.includes("https://blogs.nvidia.com/"));
});

Deno.test("sorts material stories first", () => {
  const sorted = sortStories([
    { ...sample, materiality: "potentially", title: "Later" },
    { ...sample, materiality: "material", title: "First" },
  ]);
  assertEquals(sorted[0]?.title, "First");
});

Deno.test("validates and dedupes recipients", () => {
  assertEquals(
    JSON.stringify(validRecipients(["Dan@Tickwise.io", "bad", "dan@tickwise.io", "team@tickwise.io"])),
    JSON.stringify(["dan@tickwise.io", "team@tickwise.io"])
  );
});

Deno.test("subject and plain text stay readable", () => {
  assertEquals(digestSubject("Organization 1", 1), "Organization 1 · 1 story");
  assertEquals(orgInitials("Organization 1"), "O1");
  const text = renderFeedDigestText({
    orgName: "Organization 1",
    logoUrl: null,
    stories: [sample],
    screenedCount: 1,
    sentAt: new Date("2026-10-04T18:00:00.000Z"),
  });
  assert(text.includes("NVIDIA <expands>"));
  assert(text.includes("Why it matters: Locked-in hyperscale demand."));
});
