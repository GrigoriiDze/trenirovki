import { render } from "preact";
import { App } from "~/app";
import "~/styles/tokens.css";

// iOS Safari не применяет :active к элементам без обработчика касания.
// Пустой глобальный слушатель включает :active для всей страницы.
document.addEventListener("touchstart", () => {}, { passive: true });

render(<App />, document.getElementById("app")!);
