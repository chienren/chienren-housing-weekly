import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const googleRss=(query)=>`https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:3d`)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
const feeds=[
  ["全台房市","主題RSS",googleRss("台灣房市 OR 房價 OR 房地產 OR 房貸 OR 預售屋 OR 成屋")],
  ["台中房市","主題RSS",googleRss("台中房市 OR 台中房價 OR 南屯房市 OR 西屯房市 OR 北屯房市 OR 南區房市 OR 台中重劃區")],
  ["政策與貸款","主題RSS",googleRss("央行信用管制 OR 房貸政策 OR 新青安 OR 銀行房貸 OR 第二戶 OR 第三戶 OR 換屋族")],
  ["稅務與法規","主題RSS",googleRss("房地合一稅 OR 囤房稅 OR 重購退稅 OR 土地增值稅 OR 平均地權條例 OR 預售屋法規")],
  ["交易數據","主題RSS",googleRss("實價登錄 OR 建物買賣移轉棟數 OR 住宅價格指數 OR 房貸負擔率 OR 預售屋交易量")],
  ["台中建設","主題RSS",googleRss("台中捷運 OR 台中巨蛋 OR 水湳 OR 十四期 OR 十三期 OR 單元二 OR 單元三 OR 都市計畫 OR 區段徵收")],
  ...["money.udn.com","ctee.com.tw","cna.com.tw","udn.com","estate.ltn.com.tw","ettoday.net"].map(domain=>[`指定媒體 · ${domain}`,"指定媒體",googleRss(`(房市 OR 房價 OR 房地產 OR 房貸) site:${domain}`)]),
  ["中央社產經證券RSS","官方RSS","https://feeds.feedburner.com/rsscna/finance"],
  ["內政部新聞發布RSS","官方RSS","https://www.moi.gov.tw/OpenData.aspx?SN=76F358C679FAD4CF"],
  ["財政部本部新聞RSS","官方RSS","https://www.mof.gov.tw/Rss/384fb3077bb349ea973e7fc6f13b6974"],
  ["台中市政府公開新聞RSS","官方RSS",googleRss("site:taichung.gov.tw (房市 OR 房價 OR 房地產 OR 捷運 OR 水湳 OR 都市計畫)")],
];
const now=Date.now(), cutoff=now-72*3600_000;
const decode=(v="")=>v.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const tag=(block,name)=>decode(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,"i"))?.[1]);
const attr=(block,name,attribute)=>decode(block.match(new RegExp(`<${name}[^>]*${attribute}=["']([^"']+)["']`,"i"))?.[1]);
const stripSource=(title)=>title.replace(/\s*[-｜|–—]\s*[^-｜|–—]{2,35}$/u,"").trim();
const normalized=(title)=>stripSource(title).normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
function similarity(a,b){
  a=normalized(a);b=normalized(b);if(a===b)return 1;if(!a||!b)return 0;
  const rows=Array.from({length:a.length+1},(_,i)=>i);
  for(let j=1;j<=b.length;j++){let prev=rows[0];rows[0]=j;for(let i=1;i<=a.length;i++){const old=rows[i];rows[i]=Math.min(rows[i]+1,rows[i-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}
  return 1-rows[a.length]/Math.max(a.length,b.length);
}
function category(text){
  if(/南屯/.test(text))return"南屯房市";if(/西屯/.test(text))return"西屯房市";if(/北屯/.test(text))return"北屯房市";if(/台中南區|南區房/.test(text))return"南區房市";
  if(/房地合一|囤房稅|重購退稅|土地增值稅|房屋稅|地價稅/.test(text))return"稅務";
  if(/央行|房貸|利率|信用管制|新青安|銀行|第二戶|第三戶/.test(text))return"房貸金融";
  if(/法規|條例|政策|管制/.test(text))return"政策法規";
  if(/移轉棟數|交易量|價格指數|負擔率|實價登錄/.test(text))return"交易量";
  if(/預售/.test(text))return"預售屋";if(/建商|推案|建案/.test(text))return"建商推案";
  if(/台中捷運|台中巨蛋|水湳|十四期|十三期|單元二|單元三|區段徵收/.test(text))return"台中建設";
  if(/房價|行情|成交/.test(text))return"房價行情";return"其他區域";
}
const region=(text)=>/南屯/.test(text)?"台中市南屯區":/西屯|水湳/.test(text)?"台中市西屯區":/北屯|十四期/.test(text)?"台中市北屯區":/台中南區|南區房/.test(text)?"台中市南區":/台中/.test(text)?"台中市":"全台灣";
const keywordList=(text)=>["房市","房價","房地產","房貸","預售屋","成屋","央行","信用管制","新青安","實價登錄","移轉棟數","台中捷運","水湳","十四期","南屯","西屯","北屯"].filter(k=>text.includes(k));
const isRelevant=(text)=>/(房市|房價|房地產|不動產|住宅|房貸|預售屋|新成屋|中古屋|成屋|實價登錄|買賣移轉|住宅價格指數|房貸負擔率|央行.*信用管制|新青安|第二戶|第三戶|換屋族|房地合一|囤房稅|重購退稅|土地增值稅|平均地權|預售屋法規|台中捷運|台中巨蛋|水湳|十四期|十三期|單元二|單元三|區段徵收)/.test(text);
const isForeign=(text)=>/(韓國|韓元|首爾|澳洲|香港房|中國大陸|大紀元|大纪元|동아일보|韓聯社|香港經濟日報)/.test(text);
function viewpoints(item){
  const policy=/政策法規|房貸金融|稅務/.test(item.category);
  const buyer=policy?`這則消息可能影響貸款、稅務或購屋條件，但仍要區分媒體分析與已正式生效的規定。建議先用現行條件試算自備款與月付金，再向銀行或專業人士確認個案適用，不因單一標題急著出價。`:`這則市場消息可作為看屋比較的背景，但不能直接推論所有區域房價同步變化。建議回到目標社區近期實價、待售數量、屋況與貸款能力，至少比較數個相近物件後，再提出符合自身預算的價格。`;
  const seller=policy?`貸款或政策消息可能讓買方需要更長時間確認資金。賣方可先備妥權狀、屋況與成交資料，並在合約及銷售節奏中預留合理的核貸時間；定價仍應依同類成交與實際詢問調整，不以政策預測保證成交。`:`市場數據只能作為背景，個別物件的成交速度仍取決於總價、屋況及競品。建議整理照片與帶看動線，依同社區實價設定合理開價，並持續觀察點閱、詢問與帶看回饋，務實調整曝光及議價策略。`;
  return {buyerTalk:buyer,sellerTalk:seller,agentAction:"核對原始來源與發布日期，確認政策是否生效；整理同區實價、在售競品及買方貸款條件，再進行客戶說明與後續追蹤。"};
}
function professionalViewpoints(item){
  const policy=/政策法規|房貸金融|稅務/.test(item.category);
  const local=/台中建設|南屯房市|西屯房市|北屯房市|南區房市|其他區域/.test(item.category);
  const project=/預售屋|建商推案/.test(item.category);
  const buyerLead=policy ? "這篇屬於政策、稅務或貸款制度訊息。以歷經多次房市循環的實務角度來看，政策影響通常不是所有區域與產品立即齊漲齊跌，而是先改變銀行授信、自備款門檻、持有成本及買方決策時間。" : local ? "這篇與台中區域行情或重大建設有關。從長期在地市場的經驗來看，建設題材真正形成住宅需求，必須經過規劃、動工、完工、人口與商業機能進駐等階段，不能把遠期想像直接當成今天的房價。" : project ? "這則預售屋或建商推案消息，可以用來觀察區域供給、產品規劃與市場信心。做過多個景氣循環後會發現，新案熱度與未來轉手價並不是同一件事，買方仍要回到建商履歷、契約、付款節奏與產品條件。" : "這則房價、交易或市場消息反映的是特定期間與統計範圍。從長期實務經驗來看，量往往先於價出現變化，但不同總價帶、屋齡、地段與產品的反應速度並不相同，不能用一個全國或行政區數字套用到每間房屋。";
  const sellerLead=policy ? "這類政策、利率或貸款消息，通常先反映在買方自備款、銀行估價、核貸條件與成交時間。多年第一線經驗顯示，市場轉折時最先改變的常是來客量與出價意願，不是所有成交價同一天一起變動。" : local ? "區域建設新聞有助於增加買方對生活圈的理解，但要轉化為成交，仍需說清楚建設與物件的實際距離、使用便利性及可能帶來的施工影響。長期市場經驗告訴我們，題材能創造注意力，產品條件與合理價格才會形成成交。" : project ? "新案供給或建商推案增加，會直接影響中古屋賣方的競爭環境，尤其是總價接近、屋齡較新或客群重疊的產品。市場走過幾輪循環後，買方通常會把新屋付款彈性與中古屋立即入住、成熟機能放在同一張表比較。" : "市場統計能協助判斷整體成交節奏，但房屋能否順利出售，仍取決於同類產品競爭、開價與成交價差、屋況以及曝光品質。實務上，新聞數字是市場氣壓計，不是個別房屋的估價報告。";
  const buyer=`針對這篇「${stripSource(item.title)}」，${buyerLead}\n\n站在買方立場，我會先把新聞拆成三層判讀：第一層是已正式發生、可由官方或原始數據確認的事實；第二層是媒體或業者對後市的推估；第三層才是這項訊息是否真的影響您想買的區域、社區與總價帶。這三層若沒有分開，很容易因為一則消息過度樂觀或過度擔心。\n\n實際購屋時，建議先把可動用自備款、每月安全還款額度、稅費、裝修與持有成本分開計算，再比對目標社區近一年實價、目前在售戶數、成交速度，以及樓層、車位、朝向、採光與屋況差異。實價登錄要看完整條件，不能只挑最高價或最低價；銀行估價也不一定等於成交價，因此出價前最好預留額外自備款緩衝。若同類物件增加，可利用比較期耐心篩選與議價；若好物件供給有限，也應守住預算與必要條件，不因市場氣氛追價。\n\n我會把這篇新聞當成談判與風險檢查的材料，而不是替您決定一定要買或不能買。真正適合的購屋決策，應同時符合居住需求、持有年限、家庭現金流與物件本身條件。${policy?" 實際適用條件仍應以主管機關、金融機構、地政士或專業人士最新公告與個案審核為準。":""}`;
  const seller=`針對這篇「${stripSource(item.title)}」，${sellerLead}\n\n站在賣方立場，我會先觀察這項消息是否改變三件事：有效買方數量、買方可負擔總價，以及從看屋到核貸成交所需時間。這三項比單純討論房價會不會漲跌更有實務意義。若市場貸款條件轉緊，未必代表沒有買方，而是買方需要更完整的財務準備；若交易回溫，也不代表任何開價都能被接受。\n\n定價前應整理同社區或同生活圈最近成交案例，排除樓層、車位、面向、裝潢與特殊交易差異，再盤點目前在售競品的價格、曝光天數及優缺點。開價要留有合理談判空間，但不能與可驗證行情脫節。照片、文案、屋況整理、權利資料與看屋便利性都會影響有效詢問；成熟生活機能、可立即入住或稀有條件，則要用具體資料呈現，不用空泛話術放大。\n\n銷售過程中，建議每兩至四週檢視一次點閱、詢問、帶看與出價的轉換。如果詢問量高但出價少，通常要檢查價格與交易條件；若曝光多卻沒有帶看，則先改善照片、文案與平台配置。真正務實的銷售策略，是用買方的真實反饋逐步修正，而不是用一篇新聞保證成交價格或市場方向。${policy?" 實際適用條件仍應以主管機關、金融機構、地政士或專業人士最新公告與個案審核為準。":""}`;
  return {buyerTalk:buyer,sellerTalk:seller};
}
function score(item){let s=30;if(item.group==="官方RSS")s+=35;if(/央行|政策|稅|法規|新青安/.test(item.title))s+=25;if(/台中|移轉棟數|價格指數/.test(item.title))s+=15;s+=Math.max(0,10-Math.floor((now-item.time)/3600_000));return Math.min(100,s)}
async function readFeed([feedName,group,url]){
  try{
    const response=await fetch(url,{headers:{"user-agent":"ChienrenHousingWeeklyRSS/2.0","accept":"application/rss+xml, application/xml, text/xml"},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const xml=await response.text();
    return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi)||[]).map(block=>{
      const title=tag(block,"title"),link=tag(block,"link")||tag(block,"guid"),published=tag(block,"pubDate")||tag(block,"published")||tag(block,"updated"),time=+new Date(published);
      const google=/news\.google\.com/.test(link);const source=tag(block,"source")||feedName;const text=`${title} ${decode(tag(block,"description"))}`;
      return {feedName,group,title,source,time,published_at:Number.isNaN(time)?null:new Date(time).toISOString(),original_url:link,google_news_url:google?link:null,excerpt:decode(tag(block,"description")).slice(0,240),image_url:attr(block,"media:content","url")||attr(block,"enclosure","url")||null,category:category(text),region:region(text),keywords:keywordList(text),collected_at:new Date(now).toISOString(),fetch_status:google?"google_news_redirect":"rss_ok"};
    }).filter(item=>item.title&&item.original_url&&item.time>=cutoff&&isRelevant(item.title)&&!isForeign(`${item.title} ${item.source}`));
  }catch(error){console.warn(`[RSS失敗] ${feedName}: ${error instanceof Error?error.message:error}`);return[]}
}

const raw=(await Promise.all(feeds.map(readFeed))).flat().sort((a,b)=>b.time-a.time);
const events=[];
for(const item of raw){
  let event=events.find(e=>e.primary.original_url===item.original_url||similarity(e.primary.title,item.title)>.85);
  if(!event){events.push({primary:item,media:new Map([[item.source,item]])});continue}
  event.media.set(item.source,item);
  const official=item.group==="官方RSS", currentOfficial=event.primary.group==="官方RSS";
  if((official&&!currentOfficial)||(official===currentOfficial&&item.time>event.primary.time&&item.excerpt.length>=event.primary.excerpt.length))event.primary=item;
}
const items=events.map(event=>{
  const item=event.primary;const talks=professionalViewpoints(item);return {
    id:crypto.createHash("sha256").update(normalized(item.title)).digest("hex").slice(0,16),
    source:item.source,title:stripSource(item.title),published_at:item.published_at,original_url:item.original_url,google_news_url:item.google_news_url,excerpt:item.excerpt||stripSource(item.title),image_url:item.image_url,category:item.category,region:item.region,keywords:item.keywords,collected_at:item.collected_at,importance_score:score(item),fetch_status:item.fetch_status,
    sources:[...event.media.values()].map(source=>({source:source.source,published_at:source.published_at,original_url:source.original_url,google_news_url:source.google_news_url})),
    ...talks,
    publishedAt:item.published_at?.slice(0,10)||"",relativeTime:"72小時內",url:item.original_url,summary:item.excerpt||stripSource(item.title),
  }
}).sort((a,b)=>b.importance_score-a.importance_score).slice(0,15);
if(items.length<10)throw new Error(`72小時內去重後僅 ${items.length} 則，未達最低10則`);
const report={edition:new Date(now).toISOString().slice(0,10),updatedAt:new Intl.DateTimeFormat("zh-TW",{timeZone:"Asia/Taipei",dateStyle:"short",timeStyle:"short",hour12:false}).format(now),period:"最近72小時",collectionMode:"RSS_ONLY",items};
await fs.writeFile(path.join(root,"data","latest.json"),`${JSON.stringify(report,null,2)}\n`);
console.log(`RSS蒐集完成：原始 ${raw.length} 則，主事件 ${events.length} 筆，正式週報 ${items.length} 則。`);
