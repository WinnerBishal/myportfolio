/**
 * Groups runs of consecutive image-only paragraphs into a figure grid.
 *
 * Markdown renders every image as its own full-width paragraph, which on a
 * 1120px page turns a set of screenshots into a column of billboards. This
 * collects neighbouring images into one grid element so they tile instead, and
 * promotes each image's alt text to a caption. Images that already sit inside a
 * link, a table, or raw HTML are left alone.
 */

const isWhitespace = (node) => node.type === "text" && !node.value.trim();

/**
 * Images in a paragraph, if that is all it holds.
 *
 * Both authoring styles land here: images separated by blank lines become one
 * paragraph each, while images on consecutive lines are merged by the markdown
 * parser into a single paragraph holding several, separated by line breaks.
 */
function paragraphImages(node) {
  if (node.type !== "element" || node.tagName !== "p") return null;

  const images = [];
  for (const child of node.children) {
    if (isWhitespace(child)) continue;
    if (child.type !== "element") return null;
    if (child.tagName === "br") continue;
    if (child.tagName !== "img") return null;
    images.push(child);
  }

  return images.length > 0 ? images : null;
}

function toFigure(img) {
  const alt = typeof img.properties?.alt === "string" ? img.properties.alt.trim() : "";
  const src = img.properties?.src;

  // The image links to itself so dense diagrams can still be read full size.
  const link = {
    type: "element",
    tagName: "a",
    properties: { className: ["figure-grid__link"], href: src, target: "_blank", rel: "noopener" },
    children: [img]
  };

  const children = [link];
  if (alt) {
    children.push({
      type: "element",
      tagName: "figcaption",
      properties: { className: ["figure-grid__caption"] },
      children: [{ type: "text", value: alt }]
    });
  }

  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["figure-grid__item"] },
    children
  };
}

function toGrid(images) {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["figure-grid"], "data-count": String(images.length) },
    children: images.map(toFigure)
  };
}

function walk(parent) {
  if (!Array.isArray(parent.children)) return;

  const out = [];
  let run = [];
  const flush = () => {
    if (run.length > 0) {
      out.push(toGrid(run));
      run = [];
    }
  };

  for (const child of parent.children) {
    const images = paragraphImages(child);
    if (images) {
      run.push(...images);
      continue;
    }
    // Whitespace between two image paragraphs must not break the run.
    if (isWhitespace(child) && run.length > 0) continue;

    flush();
    walk(child);
    out.push(child);
  }
  flush();

  parent.children = out;
}

export default function rehypeFigureGrid() {
  return (tree) => walk(tree);
}
