"use client";

import { useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  summary: string;
  buyerTalk: string;
  sellerTalk: string;
  policyStatus?: string;
  category?: string;
};

type Report = { edition: string; updatedAt: string; nextRun: string; items: Item[] };
type TalkMode = "buyer" | "seller";

const sections = [
  { roman: "I", name: "政策／房市監管", tone: "red" },
  { roman: "II", name: "市場行情", tone: "ochre" },
  { roman: "III", name: "台中房市／重大建設", tone: "green" },
  { roman: "IV", name: "國際財經／利率通膨", tone: "navy" },
];

function classify(item: Item) {
  if (item.category && sections.some((section) => section.name === item.category)) return item.category;
  const text = `${item.title} ${item.summary}`;
  if (/台中|臺中|南屯|西屯|北屯|水湳|烏日|太平|大里|海線|捷運藍線|捷運綠線/.test(text)) return sections[2].name;
  if (/央行|政策|法規|稅|信用管制|貸款|房貸|內政部|財政部|金管會/.test(text)) return sections[0].name;
  if (/國際|聯準會|Fed|通膨|匯率|美國|中國|戰爭|地緣|油價/.test(text)) return sections[3].name;
  return sections[1].name;
}

function NewsItem({ item, index }: { item: Item; index: number }) {
  const [open, setOpen] = useState<TalkMode | null>(null);
  const [copied, setCopied] = useState(false);
  const talk = open === "buyer" ? item.buyerTalk : item.sellerTalk;
  const copy = async () => {
    await navigator.clipboard.writeText(`${talk}\n\n${item.url}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <article className="weekly-story">
      <div className="story-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="story-content">
        <div className="story-meta">
          <span>{item.source}</span><i />
          <time>{item.publishedAt}</time>
          {item.policyStatus && <><i /><span>{item.policyStatus}</span></>}
        </div>
        <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3>
        <p className="story-summary">{item.summary}</p>
        <div className="viewpoint-buttons">
          <button className={open === "buyer" ? "active" : ""} onClick={() => setOpen(open === "buyer" ? null : "buyer")}>買方觀點</button>
          <button className={open === "seller" ? "active" : ""} onClick={() => setOpen(open === "seller" ? null : "seller")}>賣方觀點</button>
          <a href={item.url} target="_blank" rel="noreferrer">閱讀原文 ↗</a>
        </div>
        {open && (
          <div className={`viewpoint-panel ${open}`}>
            <div className="viewpoint-label">給{open === "buyer" ? "買方" : "賣方"}</div>
            <p>{talk}</p>
            <button onClick={copy}>{copied ? "已複製" : "複製 LINE 訊息"}</button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function Dashboard({ report }: { report: Report }) {
  const grouped = useMemo(() => {
    const result = new Map(sections.map((section) => [section.name, [] as Item[]]));
    report.items.forEach((item) => result.get(classify(item))?.push(item));
    return result;
  }, [report.items]);

  return (
    <main className="weekly-page">
      <header className="masthead">
        <div className="masthead-top"><span>VOL. {report.updatedAt}</span><span>謙仁房市・市場情報</span></div>
        <h1>謙仁房市週報</h1>
        <p>房市政策　／　市場行情　／　台中房市　・　每週更新最新一期</p>
        <div className="issue-strip">
          <span>{report.items.length} STORIES</span><span>{report.edition}</span><span>{report.items.length} 買賣觀點</span><span>SCOPE・全台灣</span>
        </div>
      </header>

      <section className="weekly-actions">
        <a href="/admin"><b>⚙</b><span>來源與關鍵字後台<small>SOURCE SETTINGS</small></span></a>
        <a href="#latest"><b>↓</b><span>閱讀本期週報<small>LATEST EDITION</small></span></a>
      </section>

      <aside className="weekly-note">本週報自動抓取房市政策、市場行情、台中房市與國際財經最新新聞。每則新聞可展開「買方觀點／賣方觀點」，由 AI 從房仲對客戶溝通角度整理產出。</aside>

      <div id="latest">
        {sections.map((section) => {
          const items = grouped.get(section.name) || [];
          if (!items.length) return null;
          return (
            <section className={`weekly-section ${section.tone}`} key={section.name}>
              <header className="section-title"><strong>{section.roman}</strong><div><small>本期共 {items.length} 則</small><h2>{section.name}</h2></div></header>
              {items.map((item, index) => <NewsItem key={item.id} item={item} index={index} />)}
            </section>
          );
        })}
      </div>

      <footer className="weekly-footer"><b>謙仁房市週報</b><span>生成時間：{report.updatedAt}</span><span>來源：Google News RSS、自由財經、自由國際</span><p>資料僅供市場資訊與溝通參考；政策、貸款與稅務仍以主管機關及個案審核為準。</p></footer>
    </main>
  );
}
