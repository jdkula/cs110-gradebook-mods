// ==UserScript==
// @name        CS110 Grading Popover
// @author      Jonathan Kula
// @description This script provides a pop-over so you can scroll and grade CS110 assignments at the same time!
// @version     1.8.8.7
// @match       https://web.stanford.edu/*/cs110/*/assign*
// @grant       none
// ==/UserScript==

(() => {
  // Do not enable if we're not a staff mamber
  if (window.review && !window.review.staff) {
    return;
  }

  const popoutStyle = `
  <style id="grade-popout-style">
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

  const popoutHtml = `
  <div id="grade-popout-container">
    <span id="grade-popout-header">
      <button id="grade-popout-button" title="Hide/show: Alt/Option+\` to toggle">
        +
      </button>
      <span id="grade-popout-savetext" style="margin-left: 5px; display: none;"></span>
    </span>
  </div>
  `;

  class Popout {
    static install() {
      if (this._isInstalled) {
        throw new Error("Popout already installed in the DOM");
      }

      // The "saving..." text.
      this._ajaxWarning = document.getElementById("ajax_warning");

      // Where we re-attach (after the overview header)
      this._dock = document.querySelector(
        "div#sec_style > div.overview_header"
      );

      // Pop-in/pull-down container that floats
      document.head.insertAdjacentHTML("beforeend", popoutStyle);
      document.body.insertAdjacentHTML("beforeend", popoutHtml);
      this._container = document.getElementById("grade-popout-container");
      this._toggle = document.getElementById("grade-popout-button");
      this._saving = document.getElementById("grade-popout-savetext");

      this._toggle.addEventListener("click", () => {});

      this._saving.innerText = this._ajaxWarning.innerText;
      this._mutationObserver = new MutationObserver(() => {
        this._saving.style.display = this._ajaxWarning.style.display;
      });
      this._mutationObserver.observe(this._ajaxWarning, { attributes: true });

      // Alt+` will toggle
      this._onKeyDown = this._onKeyDown.bind(this);
      document.addEventListener("keydown", this._onKeyDown);

      this._isPoppedOut = false;
      this._initialized = true;
    }

    static _isInstalled() {
      return document.getElementById("grade-popout-container");
    }

    static _getElements() {
      return [
        document.getElementById("overview"),
        document.querySelector(".bucket").parentElement,
      ];
    }

    static _onToggle() {
      if (this._isPoppedOut) {
        this._toggle.innerText = "+";
        this._container.classList.remove("open");
        this.popin();
      } else {
        this._toggle.innerText = "-";
        this._container.classList.add("open");
        this.popout();
      }
    }

    static _onKeyDown(e) {
      if (e.altKey && e.code === "Backquote") {
        e.preventDefault();
        this._toggle.click();
      }
    }

    static popin() {
      if (!this._isPoppedOut) return;

      let last = this._dock;
      for (const node of this._getElements()) {
        last.parentNode.insertBefore(node, last.nextSibling);
        last = node;
      }
      this._isPoppedOut = false;
    }

    static popout() {
      if (this._isPoppedOut) return;

      for (const node of this._getElements()) {
        this._container.appendChild(node);
      }
      this._isPoppedOut = true;
    }

    static uninstall() {
      if (!this._initialized) {
        throw new Error("Uninstall called before initializaiton");
      }
      this._mutationObserver.disconnect();
      document.body.removeChild(this._container);
      document.head.removeChild(document.getElementById("grade-popout-style"));
      document.removeEventListener("keydown", this._onKeyDown);
      this._initialized = false;
    }
  }

  window.__GRADE_POPOUT = Popout;
  Popout.install();
})();
