// ==UserScript==
// @name         Markdown for comments
// @version      0.1.7
// @author       Jonathan Kula
// @match        https://web.stanford.edu/*/cs110/*/assign*
// @grant        none
// ==/UserScript==

(function () {
  const main = () => {
    "use strict";

    function apply(commentBox) {
      // If not in DOM, do nothing
      if (!commentBox.closest("html")) return;

      // If we're applying but nothing has changed, do nothing
      if (commentBox.innerHTML === commentBox.dataset["marked"]) return;

      // Only apply to divs containing only text
      if (commentBox.childElementCount > 0) return;

      const md = commentBox.innerHTML || commentBox.value;
      if (!md) return;

      commentBox.innerHTML = DOMPurify.sanitize(marked.parseInline(md));

      commentBox.dataset["marked"] = commentBox.innerHTML;
    }

    function applyAll(el) {
      for (const commentBox of el.querySelectorAll(".comment_box")) {
        apply(commentBox);
      }
    }

    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const changedNode of [
          ...mutation.addedNodes,
          ...mutation.removedNodes,
          mutation.target,
        ]) {
          if (changedNode instanceof HTMLElement) {
            applyAll(changedNode);
          }
        }
      }
    });

    mo.observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    applyAll(document);
  };

  const scr = document.createElement("script");
  let loaded = 0;
  scr.setAttribute("src", "https://cdn.jsdelivr.net/npm/marked/marked.min.js");
  scr.onload = () => {
    loaded++;
    if (loaded == 2) {
      main();
    }
  };
  document.body.appendChild(scr);

  const scr2 = document.createElement("script");
  scr2.setAttribute(
    "src",
    "https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.3.6/purify.min.js"
  );
  scr2.onload = scr.onload;
  document.body.appendChild(scr2);
})();
