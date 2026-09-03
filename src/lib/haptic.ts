/* Тактильный отклик. Работает на Android (navigator.vibrate).
   На iOS Safari вибрации для веб-приложений нет — это ограничение Apple,
   не баг. Пробуем трюк со switch-инпутом (iOS 17.4+), но он ненадёжен. */

let sw: HTMLLabelElement | null = null;

function iosSwitchPulse() {
  try {
    if (!sw) {
      sw = document.createElement("label");
      sw.style.cssText = "position:fixed;left:-9999px;opacity:0;pointer-events:none";
      const i = document.createElement("input");
      i.type = "checkbox";
      i.setAttribute("switch", "");
      sw.appendChild(i);
      document.body.appendChild(sw);
    }
    const i = sw.firstChild as HTMLInputElement;
    i.checked = !i.checked;
  } catch {
    /* ignore */
  }
}

export function haptic(ms = 8): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    if (navigator.vibrate(ms)) return;
  }
  iosSwitchPulse();
}
