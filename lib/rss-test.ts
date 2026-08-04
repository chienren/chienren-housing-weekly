import type { RssSource } from "./rss-sources";

export type RssTestResult = {
  id:string; name:string; group:string; url:string;
  checkedAt:string; count:number; latestPublishedAt:string|null;
  status:"success"|"failed"; error:string|null;
};

const decode = (value="") => value.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
const tag = (block:string,name:string) => decode(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,"i"))?.[1]);

export async function testRssSource(source:RssSource):Promise<RssTestResult>{
  const checkedAt=new Date().toISOString();
  try{
    const response=await fetch(source.url,{headers:{"user-agent":"ChienrenHousingWeeklyRSS/2.0","accept":"application/rss+xml, application/xml, text/xml"},signal:AbortSignal.timeout(20000),cache:"no-store"});
    if(!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    const xml=await response.text();
    const items=xml.match(/<item[\s>][\s\S]*?<\/item>/gi)||[];
    if(!items.length) throw new Error("RSS回應成功，但沒有可解析的新聞項目");
    const dates=items.map(item=>new Date(tag(item,"pubDate")||tag(item,"published")||tag(item,"updated"))).filter(date=>!Number.isNaN(+date)).sort((a,b)=>+b-+a);
    return {id:source.id,name:source.name,group:source.group,url:source.url,checkedAt,count:items.length,latestPublishedAt:dates[0]?.toISOString()||null,status:"success",error:null};
  }catch(error){
    return {id:source.id,name:source.name,group:source.group,url:source.url,checkedAt,count:0,latestPublishedAt:null,status:"failed",error:error instanceof Error?error.message:String(error)};
  }
}
