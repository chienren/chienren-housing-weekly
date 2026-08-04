import { rssSources } from "../../../lib/rss-sources";
import { testRssSource } from "../../../lib/rss-test";
export const dynamic="force-dynamic";
export async function GET(){
  const results=await Promise.all(rssSources.map(source=>testRssSource(source)));
  return Response.json({checkedAt:new Date().toISOString(),allPassed:results.every(result=>result.status==="success"),results},{headers:{"cache-control":"no-store"}});
}
