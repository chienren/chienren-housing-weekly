import Link from "next/link";
import { rssSources } from "../../lib/rss-sources";
import { testRssSource } from "../../lib/rss-test";
import "./rss-test.css";
export const dynamic="force-dynamic";

const fmt=(value:string|null)=>value?new Intl.DateTimeFormat("zh-TW",{timeZone:"Asia/Taipei",dateStyle:"medium",timeStyle:"short",hour12:false}).format(new Date(value)):"—";
export default async function RssTestPage(){
  const results=await Promise.all(rssSources.map(source=>testRssSource(source)));
  const passed=results.filter(result=>result.status==="success").length;
  const allPassed=passed===results.length;
  return <main className="rss-page">
    <header><div><p className="eyebrow">CHIENREN RSS MONITOR</p><h1>RSS來源測試</h1><p>正式週報接入前的獨立連線檢查；重新整理頁面即可再次測試全部來源。</p></div><Link href="/">返回週報</Link></header>
    <section className={`rss-summary ${allPassed?"ok":"warn"}`}><strong>{passed} / {results.length}</strong><div><b>{allPassed?"所有來源測試成功":"仍有來源需要處理"}</b><p>{allPassed?"已具備接入正式週報的技術條件。":"正式週報資料流維持隔離，不會使用失敗來源。"}</p></div><span>檢查時間<br/>{fmt(results[0]?.checkedAt||null)}</span></section>
    <div className="rss-table-wrap"><table><thead><tr><th>來源名稱</th><th>類型</th><th>最後更新時間</th><th>本次取得</th><th>最新新聞日期</th><th>狀態</th><th>錯誤原因</th></tr></thead><tbody>{results.map(result=><tr key={result.id}><td><a href={result.url} target="_blank" rel="noreferrer">{result.name}</a></td><td>{result.group}</td><td>{fmt(result.checkedAt)}</td><td>{result.count} 則</td><td>{fmt(result.latestPublishedAt)}</td><td><span className={`status ${result.status}`}>{result.status==="success"?"成功":"失敗"}</span></td><td className="error">{result.error||"—"}</td></tr>)}</tbody></table></div>
    <aside>測試頁只讀取RSS中的公開標題、摘要、日期、媒體名稱與連結，不讀取新聞全文，也不處理登入、付費牆、CAPTCHA或反爬蟲機制。單一來源失敗不會中斷其他來源。</aside>
  </main>;
}
