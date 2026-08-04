import type { Metadata } from "next";
import "./globals.css";
import "./admin/admin.css";
export const metadata:Metadata={title:"謙仁房市週報",description:"自動彙整台灣房市新聞，提供買方與賣方觀點。"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
