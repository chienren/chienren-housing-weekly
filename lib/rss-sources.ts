export type RssSource = {
  id: string;
  name: string;
  group: "主題RSS" | "指定媒體" | "官方RSS";
  url: string;
};

const googleRss = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:3d`)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

export const rssSources: RssSource[] = [
  { id:"topic-taiwan", name:"全台房市", group:"主題RSS", url:googleRss("台灣房市 OR 房價 OR 房地產 OR 房貸 OR 預售屋 OR 成屋") },
  { id:"topic-taichung", name:"台中房市", group:"主題RSS", url:googleRss("台中房市 OR 台中房價 OR 南屯房市 OR 西屯房市 OR 北屯房市 OR 南區房市 OR 台中重劃區") },
  { id:"topic-loan", name:"政策與貸款", group:"主題RSS", url:googleRss("央行信用管制 OR 房貸政策 OR 新青安 OR 銀行房貸 OR 第二戶 OR 第三戶 OR 換屋族") },
  { id:"topic-tax", name:"稅務與法規", group:"主題RSS", url:googleRss("房地合一稅 OR 囤房稅 OR 重購退稅 OR 土地增值稅 OR 平均地權條例 OR 預售屋法規") },
  { id:"topic-data", name:"交易數據", group:"主題RSS", url:googleRss("實價登錄 OR 建物買賣移轉棟數 OR 住宅價格指數 OR 房貸負擔率 OR 預售屋交易量") },
  { id:"topic-build", name:"台中建設", group:"主題RSS", url:googleRss("台中捷運 OR 台中巨蛋 OR 水湳 OR 十四期 OR 十三期 OR 單元二 OR 單元三 OR 都市計畫 OR 區段徵收") },
  ...["money.udn.com","ctee.com.tw","cna.com.tw","udn.com","estate.ltn.com.tw","ettoday.net"].map((domain) => ({
    id:`media-${domain}`, name:`指定媒體 · ${domain}`, group:"指定媒體" as const,
    url:googleRss(`(房市 OR 房價 OR 房地產 OR 房貸) site:${domain}`),
  })),
  { id:"official-cna", name:"中央社產經證券RSS", group:"官方RSS", url:"https://feeds.feedburner.com/rsscna/finance" },
  { id:"official-moi", name:"內政部新聞發布RSS", group:"官方RSS", url:"https://www.moi.gov.tw/OpenData.aspx?SN=76F358C679FAD4CF" },
  { id:"official-mof", name:"財政部本部新聞RSS", group:"官方RSS", url:"https://www.mof.gov.tw/Rss/384fb3077bb349ea973e7fc6f13b6974" },
  { id:"official-taichung", name:"台中市政府公開新聞RSS", group:"官方RSS", url:googleRss("site:taichung.gov.tw (房市 OR 房價 OR 房地產 OR 捷運 OR 水湳 OR 都市計畫)") },
];
