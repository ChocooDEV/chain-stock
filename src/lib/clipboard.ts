/**
 * Copies text to the clipboard, working even outside a "secure context."
 * `navigator.clipboard` only exists on HTTPS or `http://localhost` — it's
 * `undefined` on a plain-HTTP LAN address (e.g. testing on a phone via
 * `http://192.168.x.x:3400`), which is a real path through this app during
 * development, not an edge case to ignore. Falls back to the legacy
 * `document.execCommand("copy")` trick (a temporary, off-screen, selected
 * textarea), which isn't secure-context-gated.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);

  return succeeded;
}
