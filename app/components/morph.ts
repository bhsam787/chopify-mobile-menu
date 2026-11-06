/**
 * Updates `target`'s children in place to match `html`, touching only what
 * changed. Re-rendering a preview with innerHTML recreates every element:
 * images decode again (a blank frame each time) and scroll positions reset,
 * which reads as flicker while a merchant drags a slider. Matching nodes are
 * kept (same tag, and the same `data-chm-node` when they have one).
 */
export function morphChildren(target: Element, html: string): void {
  const template = document.createElement("template");
  template.innerHTML = html;
  patchChildren(target, template.content);
}

function sameNode(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType !== Node.ELEMENT_NODE) return true;
  const from = a as Element;
  const to = b as Element;
  return (
    from.tagName === to.tagName &&
    from.getAttribute("data-chm-node") === to.getAttribute("data-chm-node")
  );
}

function patchAttributes(from: Element, to: Element) {
  for (const { name } of [...from.attributes]) {
    if (!to.hasAttribute(name)) from.removeAttribute(name);
  }
  for (const { name, value } of [...to.attributes]) {
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }
}

function patchChildren(from: ParentNode, to: ParentNode) {
  const current = [...from.childNodes];
  const next = [...to.childNodes];
  next.forEach((wanted, index) => {
    const existing = current[index];
    if (!existing) {
      from.appendChild(wanted.cloneNode(true));
    } else if (!sameNode(existing, wanted)) {
      from.replaceChild(wanted.cloneNode(true), existing);
    } else if (existing.nodeType === Node.ELEMENT_NODE) {
      patchAttributes(existing as Element, wanted as Element);
      patchChildren(existing as Element, wanted as Element);
    } else if (existing.nodeValue !== wanted.nodeValue) {
      existing.nodeValue = wanted.nodeValue;
    }
  });
  for (const extra of current.slice(next.length)) extra.remove();
}
