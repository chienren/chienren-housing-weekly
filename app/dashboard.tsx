"use client";

import { useMemo, useState } from "react";

type Item={id:string;title:string;source:string;publishedAt:string;url:string;category:string;summary:string;impact:string};
type Report={edition:string;updatedAt:string;nextRun:string;items:Item[];buyer:{headline:string;opening:string;points:string[];cta:string};seller:{headline:string;opening:string;points:string[];cta:string}};

const labels:Record<string,string>={all:"全部",policy:"政策貸款",market:"價量趨勢",regional:"區域市場",tax:"稅務法規"};

export default function Dashboard({report}:{report:Report}){
 const [audience,setAudience]=useState<"buyer"|"seller">("buyer");
 const [category,setCategory]=useState("all");
 const [copied,setCopied]=useState(false);
 const script=report[audience];
 const filtered=useMemo(()=>report.items.filter(x=>category==="all"||x.category===category),[category,report.items]);
 const copy=async()=>{await navigator.clipboard.writeText([script.headline,script.opening,...script.points.map((p,i)=>`${i+1}. ${p}`),script.cta].join("\n\n"));setCopied(true);setTimeout(()=>setCopied(false),1600)};
 return <main>
  <header className="top"><a className="brand" href="#"><span>謙仁團隊</span><small>TAIWAN HOUSING INTELLIGENCE</small></a><div className="schedule"><i/>每週一・三・五自動更新</div></header>
  <section className="hero"><div><p className="eyebrow">AI 房市情報週報</p><h1>把新聞，變成<br/><em>能成交的說法。</em></h1><p className="lead">自動蒐集台灣房市新聞，完成分類、去重與重點改寫，讓每一次客戶對話都有可信來源與明確下一步。</p></div><aside><small>本期情報</small><b>{report.edition}</b><span>更新 {report.updatedAt}</span><div><strong>{report.items.length}</strong><small>精選議題</small></div><div><strong>2</strong><small>客群版本</small></div><p>下次更新：{report.nextRun}</p></aside></section>
  <section className="pulse"><div><span>本週市場溫度</span><b>量縮價撐</b></div><p>信用管制持續，自住買盤仍在；成交關鍵回到資金條件、物件差異與合理議價。</p></section>
  <section className="workspace">
   <div className="section-head"><div><small>01 / 客戶說帖</small><h2>一鍵切換溝通角度</h2></div><button onClick={copy}>{copied?"已複製":"複製整份說帖"}</button></div>
   <div className="switch"><button className={audience==="buyer"?"active":""} onClick={()=>setAudience("buyer")}>買方版</button><button className={audience==="seller"?"active":""} onClick={()=>setAudience("seller")}>賣方版</button></div>
   <article className={`talk ${audience}`}><div className="talk-label">{audience==="buyer"?"BUYER BRIEF｜買方溝通版":"SELLER BRIEF｜賣方溝通版"}</div><h3>{script.headline}</h3><p className="opening">{script.opening}</p><ol>{script.points.map((p,i)=><li key={p}><span>0{i+1}</span><p>{p}</p></li>)}</ol><blockquote>{script.cta}</blockquote></article>
  </section>
  <section className="news">
   <div className="section-head"><div><small>02 / 新聞情報庫</small><h2>本期精選與來源</h2></div></div>
   <div className="filters">{Object.entries(labels).map(([k,v])=><button key={k} className={category===k?"active":""} onClick={()=>setCategory(k)}>{v}</button>)}</div>
   <div className="cards">{filtered.map((item,i)=><a href={item.url} target="_blank" rel="noreferrer" className="card" key={item.id}><div className="card-top"><span>{labels[item.category]||item.category}</span><b>0{i+1}</b></div><h3>{item.title}</h3><p>{item.summary}</p><div className="impact"><small>顧問觀察</small>{item.impact}</div><footer>{item.source}<time>{item.publishedAt}</time></footer></a>)}</div>
  </section>
  <section className="flow"><small>03 / 自動化流程</small><h2>每次更新，固定完成六道工序</h2><div>{["蒐集可信來源","擷取標題摘要","語意比對去重","政策／市場分類","AI 雙版本改寫","發布最新週報"].map((x,i)=><span key={x}><b>{i+1}</b>{x}</span>)}</div><p>排程：每週一、三、五 08:00（台北時間）</p></section>
  <footer className="footer"><b>謙仁團隊・房市情報室</b><span>內容供市場資訊與溝通參考；個案仍應依最新法規、銀行核貸與實價登錄確認。</span></footer>
 </main>
}
