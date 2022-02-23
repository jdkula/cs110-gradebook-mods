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

  const templates = {
    style: `
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
      place-self: flex-start;
    }
    #grade-popout-container.open #grade-popout-header {
      padding-bottom: 5px;
    }

    #grade-popout-container button {
      width: 30px;
      height: 20px;
      pointer-events: auto;
      border: none;
      font-size: large;
      text-align: center;
      filter: brightness(100%);
      transition: filter 0.2s;
      border-radius: 9999px;
    }

    #grade-popout-container button:hover {
      filter: brightness(75%);
    }

    #grade-popout-container button:active {
      filter: brightness(100%) saturate(50%);
    }


    #grade-popout-close-button {
      color: black;
      background-color: #FF5F57;
    }

    #grade-popout-toggle-button {
      color: black;
      background-color: #28C840;
    }

    #grade-popout-container.open #grade-popout-toggle-button {
      background-color: #FEBC2E;
    }
    
    #grade-popout-container.open #grade-popout-toggle-button::after {
      content: "-"
    }
    #grade-popout-container:not(.open) #grade-popout-toggle-button::after {
      content: "+"
    }
  </style>
  `,

    popout: `
    <div id="grade-popout-container" style="visibility: hidden;">
      <span id="grade-popout-header">
        <button id="grade-popout-close-button">
          \u{292C}
        </button>
        <button id="grade-popout-toggle-button" title="Hide/show: Alt/Option+\` to toggle">
        </button>
        <span id="grade-popout-savetext" style="margin-left: 5px; display: none;"></span>
      </span>
    </div>
    `,
    openButton: `
    <div style="display: flex; justify-content: flex-end">
      <a href="javascript:void(0)" id="grade-open-button">Enable Popout</a>
    </div>
  `,
  };

  const elements = {
    get openButton() {
      return document.getElementById("grade-open-button");
    },
    get closeButton() {
      return document.getElementById("grade-popout-close-button");
    },
    get toggleButton() {
      return document.getElementById("grade-popout-toggle-button");
    },
    get container() {
      return document.getElementById("grade-popout-container");
    },
    get header() {
      return document.getElementById("grade-popout-header");
    },
    get savetext() {
      return document.getElementById("grade-popout-savetext");
    },
    get style() {
      return document.getElementById("grade-popout-style");
    },
    gradebook: {
      get ajaxWarning() {
        return document.getElementById("ajax_warning");
      },
      get overviewHeader() {
        return document.querySelector("div#sec_style > div.overview_header");
      },
      get overview() {
        return document.getElementById("overview");
      },
      get bucketList() {
        return document.querySelector(".bucket").parentElement;
      },
      get fileList() {
        return document.getElementById("file_list");
      },
    },
  };

  class Popout {
    static install() {
      if (this._isInstalled()) {
        throw new Error("Popout already installed in the DOM");
      }

      // Pop-in/pull-down container that floats
      document.head.insertAdjacentHTML("beforeend", templates.style);
      document.body.insertAdjacentHTML("beforeend", templates.popout);
      elements.gradebook.fileList.insertAdjacentHTML(
        "beforebegin",
        templates.openButton
      );
      this._enableButton = document.getElementById("grade-popout-enabler");

      this._onToggle = this._onToggle.bind(this);
      elements.toggleButton.addEventListener("click", this._onToggle);

      this._onEnable = this._onEnable.bind(this);
      elements.openButton.addEventListener("click", this._onEnable);

      this._onDisable = this._onDisable.bind(this);
      elements.closeButton.addEventListener("click", this._onDisable);

      elements.savetext.innerText = elements.gradebook.ajaxWarning.innerText;
      this._mutationObserver = new MutationObserver(() => {
        elements.savetext.innerText = elements.gradebook.ajaxWarning.innerText;
        elements.savetext.style.display =
          elements.gradebook.ajaxWarning.style.display;
      });
      this._mutationObserver.observe(elements.gradebook.ajaxWarning, {
        attributes: true,
      });

      // Alt+` will toggle
      this._onKeyDown = this._onKeyDown.bind(this);
      document.addEventListener("keydown", this._onKeyDown);

      this._isPoppedOut = false;
      this._initialized = true;
    }

    static _isInstalled() {
      return !!elements.container;
    }

    static get _elements() {
      return [elements.gradebook.overview, elements.gradebook.bucketList];
    }

    static _onDisable() {
      elements.openButton.style.visibility = "";
      elements.container.style.visibility = "hidden";
      this.popin();
    }
    static _onEnable() {
      elements.openButton.style.visibility = "hidden";
      elements.container.style.visibility = "";
    }

    static _onToggle() {
      this._onEnable();
      if (this._isPoppedOut) {
        this.popin();
      } else {
        this.popout();
      }
    }

    static _onKeyDown(e) {
      if (e.altKey && e.code === "Backquote") {
        e.preventDefault();
        elements.toggleButton.click();
      }
    }

    static popin() {
      if (!this._isPoppedOut) return;
      elements.container.classList.remove("open");

      let last = elements.gradebook.overviewHeader;
      for (const node of this._elements) {
        last.parentNode.insertBefore(node, last.nextSibling);
        last = node;
      }
      this._isPoppedOut = false;
    }

    static popout() {
      if (this._isPoppedOut) return;
      elements.container.classList.add("open");

      for (const node of this._elements) {
        elements.container.appendChild(node);
      }
      this._isPoppedOut = true;
    }

    static uninstall() {
      if (!this._initialized) {
        throw new Error("Uninstall called before initializaiton");
      }
      this._mutationObserver.disconnect();
      document.body.removeChild(elements.container);
      document.head.removeChild(elements.style);
      document.removeEventListener("keydown", this._onKeyDown);
      this._initialized = false;
    }
  }

  window.__GRADE_POPOUT = Popout;
  Popout.install();
})();
