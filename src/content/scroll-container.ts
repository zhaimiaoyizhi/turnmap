function countMessageBlocks(element: HTMLElement): number {
  return element.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]')
    .length;
}

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  return (
    (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
    element.scrollHeight > element.clientHeight + 120 &&
    isVisible(element)
  );
}

export function describeScrollElement(element: HTMLElement): string {
  const id = element.id ? `#${element.id}` : "";
  const className =
    typeof element.className === "string"
      ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${element.tagName.toLowerCase()}${id}${className}`;
}

export function getChatScrollElement(): HTMLElement {
  const fallback = (document.scrollingElement ?? document.documentElement) as HTMLElement;
  const candidates = [fallback, ...Array.from(document.querySelectorAll<HTMLElement>("body *"))]
    .filter(isScrollable)
    .map((element) => ({
      element,
      messageCount: countMessageBlocks(element),
      scrollableHeight: element.scrollHeight - element.clientHeight
    }))
    .sort((left, right) => {
      const messageDelta = right.messageCount - left.messageCount;
      if (messageDelta !== 0) return messageDelta;
      return right.scrollableHeight - left.scrollableHeight;
    });

  return candidates[0]?.element ?? fallback;
}
