import type { Metadata } from "next";
import "./globals.css";
import "./detail.css";
import "./admin/admin.css";
import "./simple.css";
export const metadata:Metadata={title:"謙仁房市情報週報",description:"每週一、三、五自動彙整台灣房市新聞，產生買方與賣方溝通說帖。"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
