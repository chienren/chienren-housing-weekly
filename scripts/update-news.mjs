import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const reportPath = path.join(root, "data", "latest.json");
const reviewPath = path.join(root, "data", "review-queue.json");
const QUOTA = { total: 15 };
const MEDIA_TYPES = new Set(["即時新聞", "專業市場資訊"]);
const GOOGLE_NEWS = "https://news.google.com/rss/search";
const DIRECT_FEEDS = [
  { name: "自由財經", type: "即時新聞", url: "https://news.ltn.com.tw/rss/business.xml" },
  { name: "自由國際", type: "即時新聞", url: "https://news.ltn.com.tw/rss/world.xml" },
];
const ARK_STYLE_QUERIES = [
  "房市政策 OR 央行房貸 OR 信用管制 OR 住宅政策",
  "台灣房市 OR 房價 OR 預售屋 OR 中古屋 OR 交易量",
  "台中房市 OR 台中房價 OR 台中預售屋 OR 台中重大建設",
  "國際財經 OR 通膨 OR 聯準會 OR 利率 房市",
];

async function loadConfig() {
  if (process.env.CONFIG_API_URL) {
    const response = await fetch(process.env.CONFIG_API_URL, {
      headers: process.env.CONFIG_API_TOKEN
        ? { authorization: `Bearer ${process.env.CONFIG_API_TOKEN}` }
        : {},
    });
    if (!response.ok) throw new Error(`Config API ${response.status}`);
    const data = await response.json();
    return {
      keywords: data.keywords.filter((item) => item.enabled).map((item) => item.keyword),
      sources: data.sources.filter((item) => item.enabled),
    };
  }
  return JSON.parse(
    await fs.readFile(path.join(root, "config", "collector-defaults.json"), "utf8"),
  );
}

const clean = (value = "") =>
  value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const tag = (block, name) =>
  clean(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]);

const sourceTag = (block) => {
  const match = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
  return clean(match?.[1]);
};

const normalize = (value = "") => value.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

const similarity = (left, right) => {
  const a = new Set([...normalize(left)]);
  const b = new Set([...normalize(right)]);
  const intersection = [...a].filter((char) => b.has(char)).length;
  return intersection / Math.max(1, new Set([...a, ...b]).size);
};

const sourceMatches = (publishedName, configuredName) => {
  const published = normalize(publishedName);
  const configured = normalize(configuredName);
  if (!published || !configured) return false;
  const aliases = {
    自由時報: ["自由時報", "自由財經", "自由國際"],
    樂居或591: ["樂居", "591"],
    ettoday房產雲: ["ettoday房產雲", "ettoday"],
  };
  const candidates = aliases[configured] || [configured];
  return candidates.some((name) => published.includes(normalize(name)) || normalize(name).includes(published));
};

const configuredSource = (name, sources) =>
  sources.find((source) => sourceMatches(name, typeof source === "string" ? source : source.name));

const sourceGroup = (source) => (MEDIA_TYPES.has(source?.type) ? "media" : "official");

const localAllowed = (title, source) => {
  const text = `${title} ${source}`;
  const mentionsOtherLocalGovernment =
    /(台北|新北|桃園|新竹|苗栗|彰化|南投|雲林|嘉義|台南|高雄|屏東|宜蘭|花蓮|台東|澎湖|金門|連江).*(地政|戶政|市府|縣府|市政府|縣政府)/.test(text);
  return !mentionsOtherLocalGovernment || /台中|臺中/.test(text);
};

const relevanceScore = (item) => {
  const hours = (Date.now() - item.timestamp) / 36e5;
  const recent = hours <= 72 ? 1000 : 0;
  const national = /(央行|中央銀行|內政部|財政部|行政院|金管會|國土管理署|全國|六都|房貸|利率|信用管制|房地合一|房屋稅|住宅指數|移轉棟數)/.test(item.title)
    ? 300
    : 0;
  const taichung = /(台中|臺中|南屯|西屯|北屯|水湳|烏日|太平|大里|海線|捷運藍線|捷運綠線)/.test(item.title)
    ? 250
    : 0;
  return recent + national + taichung - hours;
};

function parseFeed(xml, fallbackSource = "") {
  return (xml.match(/<item>[\s\S]*?<\/item>/gi) || []).map((item) => ({
    title: tag(item, "title"),
    url: tag(item, "link") || tag(item, "guid"),
    source: sourceTag(item) || fallbackSource,
    date: new Date(tag(item, "pubDate") || tag(item, "published") || tag(item, "date")),
  }));
}

function addCandidate(found, candidate, sources, forcedConfig = null) {
  const sourceRow = forcedConfig || configuredSource(candidate.source, sources);
  if (
    !candidate.title ||
    !candidate.url ||
    !localAllowed(candidate.title, candidate.source) ||
    Number.isNaN(+candidate.date) ||
    Date.now() - +candidate.date > 7 * 864e5 ||
    found.some((item) => similarity(item.title, candidate.title) > 0.72)
  ) return;

  found.push({
    id: Buffer.from(candidate.url).toString("base64url").slice(0, 12),
    title: candidate.title,
    url: candidate.url,
    source: candidate.source,
    sourceGroup: sourceRow ? sourceGroup(sourceRow) : "media",
    timestamp: +candidate.date,
    publishedAt: new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(candidate.date),
  });
}

async function fetchXml(url) {
  const response = await fetch(url, { headers: { "user-agent": "ChienrenHousingBrief/11.0" } });
  if (!response.ok) throw new Error(`Feed ${response.status}: ${url}`);
  return response.text();
}

async function collect() {
  const config = await loadConfig();
  const queries = [...ARK_STYLE_QUERIES];
  for (let index = 0; index < config.keywords.length; index += 8) {
    queries.push(config.keywords.slice(index, index + 8).join(" OR "));
  }

  const found = [];
  for (const days of [3, 7]) {
    for (const query of queries) {
      const url = `${GOOGLE_NEWS}?q=${encodeURIComponent(`${query} when:${days}d`)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
      try {
        for (const candidate of parseFeed(await fetchXml(url))) {
          addCandidate(found, candidate, config.sources);
        }
      } catch (error) {
        console.warn(`Google News RSS 暫時無法讀取：${error.message}`);
      }
    }
    if (found.length >= 45) break;
  }

  const configuredFeeds = config.sources
    .filter((source) => source.rssUrl)
    .map((source) => ({ name: source.name, type: source.type, url: source.rssUrl, source }));
  const directFeeds = [...configuredFeeds];
  for (const feed of DIRECT_FEEDS) {
    if (!directFeeds.some((item) => item.url === feed.url)) {
      directFeeds.push({ ...feed, source: configuredSource(feed.name, config.sources) || feed });
    }
  }

  for (const feed of directFeeds) {
    try {
      for (const candidate of parseFeed(await fetchXml(feed.url), feed.name)) {
        addCandidate(found, candidate, config.sources, feed.source);
      }
    } catch (error) {
      console.warn(`${feed.name} RSS 暫時無法讀取：${error.message}`);
    }
  }

  found.sort((a, b) => relevanceScore(b) - relevanceScore(a));
  return {
    items: found.slice(0, 80),
    quota: QUOTA,
    updatedAt: new Date().toISOString(),
    primaryWindowHours: 72,
    fallbackWindowDays: 7,
    collectionChannels: ["Google News RSS", "後台直接 RSS", "自由財經／自由國際 RSS"],
  };
}

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("未設定 OPENAI_API_KEY，保留上一期內容，不覆蓋正式週報。");
    return;
  }

  const input = await collect();
  const previous = JSON.parse(await fs.readFile(reportPath, "utf8"));
  const prompt = `你是台灣房市週報編輯。採用方舟週報式的廣泛新聞挑選方式，請從候選資料中選出正好15則，不限制媒體與官方比例。優先順序為72小時內、全國房市政策與數據、台中房市與重大建設；若房市新聞不足，可選擇會影響利率、通膨、資金環境或購屋信心的國際財經新聞，不足才使用7日內新聞。放寬文字與觀點表達，可自然討論可能機會、風險、議價與市場氣氛，不必過度保守或制式化；但相同事件或高度重複內容只能保留一則，並排除明顯廣告、純個股行情及非台中市的地方地政或戶政新聞。每則保留原始id，產生summary、policyStatus、buyerTalk、sellerTalk、category；category只能是「政策／房市監管」「市場行情」「台中房市／重大建設」「國際財經／利率通膨」其中之一。buyerTalk與sellerTalk各至少100個中文字，語氣專業、人性化且容易理解。仍不可捏造數字、政策或法規，不可保證房價漲跌、保證獲利、保證成交或製造最後上車式急迫感。媒體推測不得寫成確定事實；政策須明確區分已生效、草案或討論。涉及法規、稅務、央行政策或貸款時，加入：實際適用條件仍應以主管機關、金融機構、地政士或專業人士最新公告與個案審核為準。只輸出JSON：{"items":[...],"review":[{"id":"...","reason":"..."}]}。候選資料：${JSON.stringify(input)}`;
  const response = await fetch(process.env.OPENAI_API_URL || "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: prompt,
      text: { format: { type: "json_object" } },
    }),
  });
  if (!response.ok) throw new Error(`AI ${response.status}`);
  const payload = await response.json();
  const output = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  const result = JSON.parse(output);
  const candidates = new Map(input.items.map((item) => [item.id, item]));
  const items = (result.items || [])
    .map((item) => ({ ...candidates.get(item.id), ...item }))
    .filter((item) => item.title && item.buyerTalk && item.sellerTalk);

  if (items.length !== QUOTA.total) throw new Error(`新聞數量必須為15則，目前為${items.length}則`);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (Date.now() - item.timestamp > 7 * 864e5) throw new Error(`新聞超過7日：${item.id}`);
    if ([...item.buyerTalk].length < 100 || [...item.sellerTalk].length < 100) throw new Error(`說帖少於100字：${item.id}`);
    if (items.slice(0, index).some((other) => similarity(other.title, item.title) > 0.72)) throw new Error(`重複新聞：${item.id}`);
  }

  const now = new Date();
  previous.items = items;
  previous.updatedAt = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(now);
  previous.nextRun = "每週一、三、五 08:00";
  await Promise.all([
    fs.writeFile(reportPath, `${JSON.stringify(previous, null, 2)}\n`),
    fs.writeFile(reviewPath, `${JSON.stringify({ updatedAt: previous.updatedAt, items: result.review || [] }, null, 2)}\n`),
  ]);
  console.log("週報已更新：15則（Google News RSS＋直接 RSS）");
}

await run();
