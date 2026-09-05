import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { startGameAnalytics } from "./game";
// Runtime selection point: a different primary loop (for example combat)
// exports its own experience component here instead of StealthExperience.
import { StealthExperience as ActiveExperience } from "./mechanics/stealth/experience";
import "./styles.css";

function App() {
  useEffect(() => {
    startGameAnalytics();
  }, []);
  return <ActiveExperience />;
}

createRoot(document.getElementById("root")!).render(<App />);
