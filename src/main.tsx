import { render } from "preact";
import { App } from "~/app";
import { seedIfNeeded } from "~/db/seed";
import "~/styles/tokens.css";

const root = document.getElementById("app")!;

seedIfNeeded()
  .catch((e) => console.error("seed failed", e))
  .finally(() => render(<App />, root));
