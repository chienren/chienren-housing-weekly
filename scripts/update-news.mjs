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
  let buyer;
  let seller;
  if(policy){
    buyer="這則消息和您的貸款、自備款或稅費比較有關，但先不用緊張，也不要只看標題就改變購屋計畫。建議先確認是否已正式生效，再請銀行依您的收入、負債與名下房屋試算，出價時也多留一點資金空間。實際條件仍以主管機關、銀行或專業人士最新公告與個案審核為準。";
    seller="這類政策或貸款消息，可能讓買方需要更多時間準備自備款及確認核貸。建議先把房屋資料整理完整，並參考同社區近期成交與目前競品來定價，簽約和交屋時間也保留彈性。實際條件仍以主管機關、銀行或專業人士最新公告與個案審核為準。";
  }else if(local){
    buyer="這則台中區域或建設消息可以當作選屋參考，但規劃、動工和完工是不同階段，不代表周邊房價一定會上漲。建議實際走訪生活圈，確認通勤、噪音與未來供給，再比較同社區近期實價。喜歡物件可以談，但還是要守住自己的預算。";
    seller="區域建設能增加買方對生活圈的注意，但真正影響成交的仍是距離、便利性、屋況與價格。建議把已完成、施工中及規劃中的內容說清楚，再用同社區近期成交設定合理開價。若帶看後反覆出現相同疑慮，就調整說明、整理方式或銷售條件。";
  }else if(project){
    buyer="這則新案消息代表區域選擇可能增加，但熱銷或推案多，不等於每個建案都適合您。除了單價，也要一起比較車位、付款方式、公設比、格局、建商紀錄與交屋時間。多看幾個案子再決定，簽約前也要把契約和廣告內容逐項確認清楚。";
    seller="附近新案增加後，買方通常會拿新屋付款方式和中古屋的總價、屋況一起比較。建議把立即入住、成熟機能、實際空間等優點說清楚，並用同類成交與在售競品檢查價格。若詢問多卻沒有出價，可再調整屋況呈現、曝光方式或議價空間。";
  }else{
    buyer="這則行情或交易數據可以幫您了解市場氣氛，但不代表每個社區都會一起漲跌。建議再看看目標社區近一年實價、目前在售數量，以及樓層、車位和屋況差異。看屋前先抓好總預算，喜歡再依可比較的成交案例出價，不需要被單一新聞催著做決定。";
    seller="這則市場數據可以用來觀察成交速度，但不能直接當成您房屋的成交價。建議先比較同社區、相近坪數與屋齡的實價，再看看目前競品開價和曝光時間。若有詢問卻少出價，就檢查價格；若連帶看都不多，則先改善照片、文案與看屋安排。";
  }
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
