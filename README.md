# 謙仁房市情報週報

每週一、三、五 08:00（台北時間）蒐集台灣房市新聞，依標題語意去重與分類，再由 AI 產生摘要、顧問觀察及買方／賣方雙版本說帖。

## 上線自動更新

1. 將專案推送至 GitHub，在 Settings → Pages 選擇 GitHub Actions。
2. 在 Settings → Secrets and variables → Actions 新增 `OPENAI_API_KEY`。
3. 手動執行一次「更新房市週報」；之後依排程自動更新與發布。

未設定金鑰時，更新程式會保留上一期正式內容，不會發布未經 AI 整理的新聞。
