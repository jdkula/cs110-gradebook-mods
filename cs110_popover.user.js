// ==UserScript==
// @name        CS110 Grading Popover
// @author      Jonathan Kula
// @description This script provides a pop-over so you can scroll and grade CS110 assignments at the same time!
// @version     1.8.8.7
// @grant       none
// @include https://web.stanford.edu/*/cs110/*/assign*
// ==/UserScript==

(() => {
  // @ts-ignore
  if (review && !review.staff) {
    return;
  }

  const style = `
  <style>
    #grade-popout-container {
      max-width: 1000px;
      margin: 5px auto 0 auto;
      padding: 5px;

      position: fixed;
      top: 0;
      left: 0;
      right: 0;

      z-index: 100;

      display: flex;
      flex-direction: column;

      background: none;
      box-shadow: none;
      pointer-events: none;
      
      font-size: x-small;
    }

    #grade-popout-container.open {
      background: white;
      box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
      pointer-events: auto;
    }

    #grade-popout-header {
      padding-bottom: 0;
      background: white;
      place-self: flex-start;
    }
    #grade-popout-container.open #grade-popout-header {
      padding-bottom: 5px;
    }

    #grade-popout-button {
      width: 30px;
      pointer-events: auto;
    }
  </style>
  `;

  const html = `
  <div id="grade-popout-container">
    <span id="grade-popout-header">
      <button id="grade-popout-button" title="Hide/show: Alt/Option+\` to toggle">
        +
      </button>
      <span id="grade-popout-savetext" style="margin-left: 5px; display: none;"></span>
    </span>
  </div>
  `;

  let isPoppedOut = false;

  // The "saving..." text.
  const ajaxWarning = document.getElementById("ajax_warning");

  // Where we re-attach (after the overview header)
  const dock = document.querySelector("div#sec_style > div.overview_header");

  // Gets the overview box and the pull-down selectors
  const popouts = () => [
    document.getElementById("overview"),
    document.querySelector(".bucket").parentElement,
  ];

  // Pop-in/pull-down container that floats
  document.head.insertAdjacentHTML("beforeend", style);
  document.body.insertAdjacentHTML("beforeend", html);
  const container = document.getElementById("grade-popout-container");
  const minmax = document.getElementById("grade-popout-button");
  const saving = document.getElementById("grade-popout-savetext");

  minmax.addEventListener("click", () => {
    if (isPoppedOut) {
      minmax.innerText = "+";
      container.classList.remove("open");
      popin();
    } else {
      minmax.innerText = "-";
      container.classList.add("open");
      popout();
    }
  });

  saving.innerText = ajaxWarning.innerText;
  const mutationObserver = new MutationObserver(() => {
    saving.style.display = ajaxWarning.style.display;
  });
  mutationObserver.observe(ajaxWarning, { attributes: true });

  // Alt+` will toggle
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.code === "Backquote") {
      e.preventDefault();
      minmax.click();
    }
  });

  // Pulls overview and pull-downs into the popout
  function popout() {
    if (isPoppedOut) return;

    for (const node of popouts()) {
      container.appendChild(node);
    }
    isPoppedOut = true;
  }

  // Puts them back
  function popin() {
    if (!isPoppedOut) return;

    let last = dock;
    for (const node of popouts()) {
      last.parentNode.insertBefore(node, last.nextSibling);
      last = node;
    }
    isPoppedOut = false;
  }
})();
