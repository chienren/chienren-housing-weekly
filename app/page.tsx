import Dashboard from "./dashboard";
import report from "../data/latest.json";

export default function Home() {
  return <Dashboard report={report} />;
}
