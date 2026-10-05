function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(message ?? "assertion failed");
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

import {
  companyRef,
  googleNewsQuery,
  mentionsCompany,
  perplexityNewsQuery,
} from "./news.ts";

const strategy = companyRef({
  name: "Strategy",
  tick: "MSTR",
  url: "https://www.strategy.com/",
});

const apple = companyRef({
  name: "Apple Newsroom",
  tick: "AAPL",
  url: "https://www.apple.com/newsroom/",
});

const nvidia = companyRef({
  name: "NVIDIA Blog",
  tick: "NVDA",
  url: "https://blogs.nvidia.com/",
});

Deno.test("a generic name is not searched as a bare word", () => {
  const query = googleNewsQuery(strategy, "1d");
  const clauses = query
    .replace(/ when:1d$/, "")
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split(" OR ");

  assert(clauses.includes('"MSTR"'));
  assert(clauses.includes('"strategy.com"'));
  assert(clauses.includes('"Strategy Inc"'));
  assert(!clauses.includes('"Strategy"'));
  assert(query.endsWith("when:1d"));
});

Deno.test("a distinctive name stays in the Google query", () => {
  const query = googleNewsQuery(apple, "1d");
  assert(query.includes('"Apple"'));
  assert(query.includes('"AAPL"'));
  assert(query.includes('"apple.com"'));

  const nvidiaQuery = googleNewsQuery(nvidia, "12h");
  assert(nvidiaQuery.includes('"NVIDIA"'));
  assert(nvidiaQuery.includes('"NVDA"'));
  assert(nvidiaQuery.endsWith("when:12h"));
});

Deno.test("Perplexity asks for the company, not the dictionary word", () => {
  const query = perplexityNewsQuery(strategy);
  assert(query.includes("ticker MSTR"));
  assert(query.includes("strategy.com"));
  assert(query.includes("ordinary word"));

  const appleQuery = perplexityNewsQuery(apple);
  assert(appleQuery.includes("ticker AAPL"));
  assert(!appleQuery.includes("ordinary word"));
});

Deno.test("sports and investment-strategy headlines are not about MSTR", () => {
  const unrelated = [
    "Falcons vs. Saints NFL DFS Showdown Picks and Strategy for Monday Night Football",
    "TH investment strategy, risk management among focus in Dewan Rakyat on Monday",
    "HDFC Bank new leadership to focus on three-pronged strategy: Exclusive",
    "AWC's Golden Hen Strategy: Freehold Assets Fuel THB 32 Billion Capital Recycling Drive",
    "Man City appeal: Club's strategy brought into question",
    "Todd Bowles reveals strategy on how to fix Buccaneers after 0-4 start",
    "Iraq shifts oil strategy by arranging tanker to move past Hormuz",
    "Tom Cruise's Digger Faces Box Office Disappointment Amid Bold Marketing Strategy",
  ];
  for (const title of unrelated) {
    assert(!mentionsCompany(title, strategy), title);
  }
  assertEquals(
    mentionsCompany(
      "Strategy Halts Bitcoin Buying To Build Up Cash Reserve",
      strategy
    ),
    true
  );
});

Deno.test("real Strategy headlines still match", () => {
  assertEquals(
    mentionsCompany("Strategy (MSTR) buys more bitcoin", strategy),
    true
  );
  assertEquals(
    mentionsCompany("Strategy announces a bitcoin purchase", strategy),
    true
  );
  assertEquals(
    mentionsCompany("Michael Saylor's Strategy now holds more bitcoin", strategy),
    true
  );
  assertEquals(
    mentionsCompany("Strategy is adding bitcoin to its balance sheet", strategy),
    true
  );
  assertEquals(
    mentionsCompany("Strategy\u2019s Bitcoin Flywheel Is Running Backwards", strategy),
    true
  );
  assertEquals(
    mentionsCompany("Strategy for Monday Night Football", strategy),
    false
  );
});

Deno.test("ambiguous brands need a company cue or a proper-name use", () => {
  assertEquals(mentionsCompany("Apple unveils a new MacBook", apple), true);
  assertEquals(mentionsCompany("Apple and Google push states on app stores", apple), true);
  assertEquals(mentionsCompany("Apple\u2019s John Ternus has a new design chief", apple), true);
  assertEquals(mentionsCompany("Best apple pie recipe for the holidays", apple), false);
  assertEquals(mentionsCompany("Crowds flock to the annual Apple Fest", apple), false);
  assertEquals(
    mentionsCompany("NVIDIA expands its data center platform", nvidia),
    true
  );
});
