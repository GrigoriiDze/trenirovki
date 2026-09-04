import { render } from "preact";
import { registerSW } from "virtual:pwa-register";
import { App } from "~/app";
import "~/styles/tokens.css";

// autoUpdate: новый SW активируется сам и перезагружает страницу. Плюс
// пока приложение открыто — проверяем обновление раз в минуту и при
// возврате из фона (standalone-PWA на iOS иначе не перечитывает HTML).
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    setInterval(() => void reg.update(), 60_000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void reg.update();
    });
  },
});
void updateSW;

// iOS Safari не применяет :active к элементам без обработчика касания.
// Пустой глобальный слушатель включает :active для всей страницы.
document.addEventListener("touchstart", () => {}, { passive: true });

render(<App />, document.getElementById("app")!);
