import type { Metadata } from "next";
import "./globals.css";
import "./brand.css";
import "./brand-adjustments.css";
import "./admin/admin.css";
export const metadata:Metadata={title:"謙仁房市週報",description:"房市政策、市場行情與台中區域新聞，提供買方及賣方觀點。"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
