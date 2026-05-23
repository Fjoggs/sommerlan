export function buildSommerlanLogo(color1: string, color2: string): HTMLElement {
  const wrap = createElement("div") as HTMLDivElement;
  wrap.className = "sommerlan-logo";
  wrap.style.setProperty("--logo-c1", color1);
  wrap.style.setProperty("--logo-c2", color2);

  const sommer = createElement("span") as HTMLSpanElement;
  sommer.className = "logo-sommer";
  sommer.textContent = "Sommer";

  const right = createElement("span") as HTMLSpanElement;
  right.className = "logo-right";

  const lan = createElement("span") as HTMLSpanElement;
  lan.className = "logo-lan";
  lan.textContent = "LAN";

  const ten = createElement("span") as HTMLSpanElement;
  ten.className = "logo-ten";
  ten.textContent = "10";

  right.appendChild(lan);
  right.appendChild(ten);
  wrap.appendChild(sommer);
  wrap.appendChild(right);
  return wrap;
}

export const createElement = (
  tagName: keyof HTMLElementTagNameMap,
  id?: string,
) => {
  const element = document.createElement(tagName);
  if (id) {
    element.setAttribute("id", id);
  }
  return element;
};

export function createStarIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("width", "1em");
  svg.setAttribute("height", "1em");
  svg.setAttribute("aria-hidden", "true");
  svg.style.verticalAlign = "-0.1em";
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z");
  svg.appendChild(path);
  return svg;
}
