// ==UserScript==
// @name         Syntax highlighting for Gradescope
// @version      1.0
// @description  Imports highlight.js and triggers it on the gradescope page.
// @author       Jonathan Kula
// @match        https://www.gradescope.com/courses/344136/questions/*/submissions/*/grade
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const init = () => {
    const inject = () => {
      const el = document.querySelector(
        ".form--textArea.form--textArea-prominent > span"
      );
      // Already highlighted
      if (el.firstChild.tagName == "PRE") return;

      // Probably not a code block if it doesn't have a curly brace or semicolon.
      if (
        !el.innerText.includes("{") &&
        !el.innerText.includes("}") &&
        !el.innerText.includes(";")
      )
        return;

      const code = document.createElement("code");
      code.innerHTML = el.innerHTML;
      code.classList.add("language-cpp");

      const pre = document.createElement("pre");
      pre.appendChild(code);
      pre.style.fontFamily =
        '"Victor Mono", "Fira Code", "Ubuntu Mono", "Roboto Mono", monospaced';
      pre.style.fontSize = "small";

      el.innerHTML = "";
      el.appendChild(pre);

      hljs.highlightElement(code);
      hljs.lineNumbersBlock(code);
    };

    const mo = new MutationObserver(inject);
    mo.observe(document, { childList: true, subtree: true });
    inject();
  };

  const hljscss = document.createElement("link");
  hljscss.setAttribute("rel", "stylesheet");
  hljscss.setAttribute("type", "text/css");
  hljscss.setAttribute(
    "href",
    "//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/atom-one-dark.min.css"
  );
  document.head.appendChild(hljscss);

  let loaded = 0;
  const highlightjs = document.createElement("script");
  highlightjs.setAttribute(
    "src",
    "//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/highlight.min.js"
  );
  highlightjs.onload = () => {
    loaded++;
    if (loaded == 1) {
      document.body.appendChild(highlightjsln);
    } else if (loaded == 2) {
      init();
    }
  };
  document.body.appendChild(highlightjs);

  const highlightjsln = document.createElement("script");
  highlightjsln.setAttribute(
    "src",
    "//cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js"
  );
  highlightjsln.onload = highlightjs.onload;

  document.head.insertAdjacentHTML(
    "beforeend",
    "<style> .hljs-ln-numbers.hljs-ln-numbers { padding-right: 10px; } </style>"
  );
})();
