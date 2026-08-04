"use client";

import { useMemo, useState } from "react";

type Item = { id:string; title:string; source:string; publishedAt:string; relativeTime?:string; url:string; summary:string; buyerTalk:string; sellerTalk:string; category?:string };
type Report = { edition:string; updatedAt:string; period?:string; items:Item[] };
type Mode = "buyer" | "seller";

const sections = [
  { roman:"I", name:"政策／房市監管", tone:"red" },
  { roman:"II", name:"市場行情", tone:"ochre" },
  { roman:"III", name:"國際財經／通膨", tone:"green" },
  { roman:"IV", name:"台中建設／區域動態", tone:"navy" },
];

const stores = [
  { brand:"永慶不動產", logo:"/yongqing-logo-transparent.png", name:"八期豐樂公園店", address:"台中市南屯區向心南路766號", phone:"04-2473-5511", tel:"0424735511", map:"https://maps.app.goo.gl/FTFUhNQbA4Rkg5nX6" },
  { brand:"永義房屋", logo:"/yongyi-logo-transparent.png", name:"南屯豐樂公園店", address:"台中市南屯區向心南路762號", phone:"04-2473-2211", tel:"0424732211", map:"https://maps.app.goo.gl/Y2c4SkipRKuy5xzd8" },
];

function classify(item:Item) {
  if (item.category && sections.some(s => s.name === item.category)) return item.category;
  const text = `${item.title} ${item.summary}`;
  if (/台中|西屯|北屯|南屯|水湳|烏日|捷運藍線/.test(text)) return sections[3].name;
  if (/央行|信用管制|房貸|政策|稅|新青安|法規/.test(text)) return sections[0].name;
  if (/聯準會|通膨|美國|油價|國際|匯率/.test(text)) return sections[2].name;
  return sections[1].name;
}

function Story({item,index}:{item:Item;index:number}) {
  const [open,setOpen] = useState<Mode|null>(null);
  const [lineMode,setLineMode] = useState<Mode|null>(null);
  const [copied,setCopied] = useState(false);
  const talk = open === "buyer" ? item.buyerTalk : item.sellerTalk;
  const lineText = `${open === "buyer" ? "您好，和您分享一則近期房市消息：" : "您好，最近市場有一則消息值得留意："}\n\n${talk}\n\n新聞連結：${item.url}`;
  const lineShareUrl=`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(item.url)}&text=${encodeURIComponent(`${item.title}\n${item.summary}`)}`;
  async function copyLine(){ await navigator.clipboard.writeText(lineText); setCopied(true); setTimeout(()=>setCopied(false),1800); }
  function toggle(mode:Mode){ setOpen(open===mode?null:mode); setLineMode(null); }
  return <article className="weekly-story">
    <div className="story-number">{String(index+1).padStart(2,"0")}</div>
    <div className="story-content">
      <div className="story-meta"><span>{item.source}</span><i/><time>{item.publishedAt}</time>{item.relativeTime&&<><i/><span>{item.relativeTime}</span></>}</div>
      <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3>
      <p className="story-summary">{item.summary}</p>
      <div className="viewpoint-buttons">
        <button className={open==="buyer"?"active":""} onClick={()=>toggle("buyer")}>買方觀點</button>
        <button className={open==="seller"?"active":""} onClick={()=>toggle("seller")}>賣方觀點</button>
        <div className="story-links"><a href={lineShareUrl} className="line-share" target="_blank" rel="noreferrer" aria-label={`使用 LINE 分享：${item.title}`}>LINE 分享</a><a href={item.url} target="_blank" rel="noreferrer">閱讀原文 ↗</a></div>
      </div>
      {open&&<div className={`viewpoint-panel ${open}`}>
        <div className="viewpoint-label">{`給${open==="buyer"?"買方":"賣方"}的專業觀點`}</div>
        <p>{talk}</p>
        {lineMode!==open?<button onClick={()=>setLineMode(open)}>💬 生成 LINE 訊息</button>:<div className="line-message"><p>{lineText}</p><button onClick={copyLine}>{copied?"已複製 ✓":"複製訊息"}</button><small>複製後可直接貼到 LINE，再依客戶狀況調整。</small></div>}
      </div>}
    </div>
  </article>;
}

export default function Dashboard({report}:{report:Report}) {
  const grouped=useMemo(()=>{const map=new Map(sections.map(s=>[s.name,[] as Item[]]));report.items.forEach(i=>map.get(classify(i))?.push(i));return map},[report.items]);
  return <main className="weekly-page">
    <header className="masthead">
      <div className="masthead-top"><span>VOL. {report.edition}</span><span>謙仁房產團隊 · 專業整理</span></div>
      <div className="brand-lockup"><img src="/chienren-logo.png" alt="謙仁不動產 Logo"/><div><h1>謙仁房市週報</h1><p>房市政策 ∕ 市場行情 ∕ 國際財經 ∕ 台中區域 ・ 每週一、三、五更新</p></div></div>
      <div className="issue-strip"><span>{report.items.length} STORIES</span><span>{report.period||report.updatedAt}</span><span>{report.items.length} 買賣觀點</span><span>SCOPE · 全台灣／台中</span></div>
    </header>
    <section className="weekly-actions"><a href="#latest"><b>↓</b><span>閱讀本期週報<small>LATEST EDITION</small></span></a><a href="/rss-test"><b>✓</b><span>RSS來源測試<small>SOURCE MONITOR</small></span></a></section>
    <section className="store-section" aria-label="服務門市"><div className="store-grid">{stores.map(store=><article className="store-card" key={store.name}><div className="store-brand"><img src={store.logo} alt={`${store.brand} Logo`}/><div><span>{store.brand}</span><h3>{store.name}</h3></div></div><p>{store.address}</p><div className="store-links"><a className="phone-link" href={`tel:${store.tel}`}>☎ {store.phone}</a><a href={store.map} target="_blank" rel="noreferrer">Google 地圖 ↗</a></div></article>)}</div></section>
    <aside className="weekly-note">本週報彙整房市政策、市場行情、國際財經與台中區域動態。每則新聞均保留原始連結，並提供可展開的買方觀點、賣方觀點與 LINE 訊息。內容為資訊整理，不代表價格漲跌保證；貸款、稅務及政策適用條件，仍應以主管機關、金融機構或專業人士最新公告與個案審核為準。</aside>
    <div id="latest">{sections.map(section=>{const items=grouped.get(section.name)||[];if(!items.length)return null;return <section className={`weekly-section ${section.tone}`} key={section.name}><header className="section-title"><strong>{section.roman}</strong><div><small>本期共 {items.length} 則</small><h2>{section.name}</h2></div></header>{items.map((item,index)=><Story key={item.id} item={item} index={index}/>)}</section>})}</div>
    <footer className="weekly-footer"><b>謙仁房市週報 · CHIENREN WEEKLY</b><span>更新時間：{report.updatedAt}</span><span>來源：官方公開資訊及合法新聞連結</span><p>AI 協助彙整與撰寫買賣觀點；實際數據、法規、貸款及個案條件，請以原始來源與主管機關公告為準。</p></footer>
  </main>;
}
