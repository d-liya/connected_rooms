import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ACTIVE_GAME, startGameAnalytics } from "./game";
import { GameExperience as ActiveExperience } from "./experience";
import "./styles.css";

function App() {
  useEffect(() => {
    document.title = ACTIVE_GAME.copy.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", ACTIVE_GAME.copy.titleSummary);
    startGameAnalytics();
  }, []);
  return <ActiveExperience />;
}

createRoot(document.getElementById("root")!).render(<App />);
