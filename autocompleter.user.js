// ==UserScript==
// @name         Smart autocomplete for comments
// @version      1.0.5
// @author       Jonathan Kula
// @match        https://web.stanford.edu/*/cs110/*/assign*
// @match        https://web.stanford.edu/*/cs111/*/assign*
// @grant        none
// ==/UserScript==

(function () {
  const main = () => {
    "use strict";

    /*** =-=-=-=-=-= AutocompleteStorage =-=-=-=-=-= ****/
    /**
     * A localStorage-backed list of autocomplete entries
     * for a given key (usually the "name" of an input)
     */
    class AutocompleteStorage {
      static STORAGE_KEY = "__AUTOCOMPLETE_SEARCH_KEY";

      constructor(name) {
        this.name = name;
      }

      static _getStorage() {
        const blob = JSON.parse(
          localStorage.getItem(this.STORAGE_KEY) || "null"
        );
        if (!blob) return {};

        return blob;
      }

      static _setStorage(blob) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(blob));
      }

      /**
       * Retrieves the list of completions associated with the
       * key provided in the constructor.
       * @returns {string[]}
       */
      getOptions() {
        const storage = AutocompleteStorage._getStorage();
        if (!storage) {
          return [];
        }

        return storage[this.name] || [];
      }

      /**
       * Adds the provided option to the list of autocomplete options.
       * If the option is a duplicate, it is silently discarded.
       * @param {string} option The option to add
       */
      saveOption(option) {
        if (!option) return;

        const storage = AutocompleteStorage._getStorage();
        const options = storage[this.name] || [];
        if (!options.includes(option)) {
          AutocompleteStorage._setStorage({
            ...storage,
            [this.name]: [...options, option],
          });
        }
      }

      /**
       * Removes the provided option from the list of autocomplete options.
       * If the option doesn't exist, this method is a no-op.
       * @param {string} option The option to remove
       */
      delOption(option) {
        const storage = AutocompleteStorage._getStorage();
        const options = storage[this.name] || [];

        AutocompleteStorage._setStorage({
          ...storage,
          [this.name]: options.filter((el) => el !== option),
        });
      }
    }

    /*** =-=-=-=-=-= OptionsViewer =-=-=-=-=-= ****/
    /**
     * A small pop-under at the bottom of the screen that
     * provides/shows search results
     */
    class OptionsViewer {
      static _templates = {
        container: `
        <div style="position: fixed; bottom: 0px; width: 100%; z-index: 1000; font-size: 9pt;" id="options_viewer">
        </div>
        `,
        style: `
        <style id="options_viewer_style">
          .options-viewer-option {
            background: white;
            width: 100%;
            border: 1px solid gray;
          }

          #options_viewer:hover .options-viewer-option:hover {
            background: blue;
            color: white;
          }

          .options-viewer-score {
            color: purple;
            font-weight: 700;
          }

          #options_viewer:hover .options-viewer-option:hover .options-viewer-score {
            color: yellow;
          }
        </style>
        `,
        selectStyle: (selectedIdx) => `
        <style id="options_viewer_style_select">
          #options_viewer:not(:hover) .options-viewer-option:nth-child(${selectedIdx}) {
            background: blue;
            color: white;
          }

          #options_viewer:not(:hover) .options-viewer-option:nth-child(${selectedIdx}) .options-viewer-score {
            color: yellow;
          }
        </style>
        `,
        item: (text, idx) => `
        <div class="options-viewer-option" data-idx="${idx}">
          ${text}
        </div>
      `,
        result: (score, text, weight) =>
          `<span class="options-viewer-score">${score}%</span><span style="margin-left: 0.5em; ${weight ? 'font-weight: ' + weight + ';' : ''}">${text}</span>`,
      };

      static _elements = {
        get container() {
          return document.getElementById("options_viewer");
        },
        get style() {
          return document.getElementById("options_viewer_style");
        },
        get selectStyle() {
          return document.getElementById("options_viewer_style_select");
        },
        get items() {
          return document.querySelectorAll(".options-viewer-option");
        },
      };

      static create() {
        if (this._elements.container) return;

        document.body.insertAdjacentHTML(
          "beforeend",
          this._templates.container
        );

        document.head.insertAdjacentHTML("beforeend", this._templates.style);
      }

      static destroy() {
        if (this._elements.container) {
          document.body.removeChild(this._elements.container);
        }
        if (this._elements.style) {
          document.head.removeChild(this._elements.style);
        }
        if (this._elements.selectStyle) {
          document.head.removeChild(this._elements.selectStyle);
        }
      }

      static hide() {
        OptionsViewer.create();
        this._elements.container.style.display = "none";
      }

      static show() {
        OptionsViewer.create();
        this._elements.container.style.display = "block";
      }

      static clear() {
        OptionsViewer.destroy();
        OptionsViewer.create();
      }

      static set(options, onClick) {
        OptionsViewer.clear();
        for (let i = 0; i < options.length; i++) {
          this._elements.container.insertAdjacentHTML(
            "beforeend",
            this._templates.item(options[i], i)
          );
        }
        for (const node of this._elements.items) {
          node.addEventListener("click", () => {
            onClick(node.innerText, parseInt(node.dataset["idx"]));
          });
        }
      }

      static search(options, query, onClick) {
        const res = fuzzysort.go(query, options, {
          //threshold: -10000,
          limit: 6,
        });
        const results = [];
        const plainResults = [];
        for (const match of res) {
          let normedScore = (1 + match.score / 2000);
          if (normedScore < 0) normedScore = (normedScore * 2000 / (100000 - 2000));
          normedScore = Math.max((100 * normedScore).toFixed(2), -1000);
          const fancyResult = fuzzysort.highlight(
            match,
            '<span style="text-decoration: underline;">',
            "</span>"
          );

          results.push(this._templates.result(normedScore, fancyResult, normedScore > 0 ? 700 : null));
          plainResults.push(match.target);
        }

        OptionsViewer.set(results, onClick);
        return plainResults;
      }

      static select(idx) {
        const style = this._elements.selectStyle;
        if (style) {
          document.head.removeChild(style);
        }

        if (idx <= 0) return;

        document.head.insertAdjacentHTML(
          "beforeend",
          this._templates.selectStyle(idx)
        );
      }
    }

    /*** =-=-=-=-=-= AutocompleteProvider =-=-=-=-=-= ****/
    /**
     * A small class that attches itself to a textarea or input[type="text"]
     * and provides enhanced autocomplete using OptionsViewer and AutocompleteStorage.
     */
    class AutocompleteProvider {
      constructor(el) {
        if (el._picker) {
          throw Error("Picker already initialized on element");
        }
        if (el.autocomplete === "off") {
          console.warn("Enabling Picker on element with autocomplete off", el);
        }

        el._picker = this;
        this.el = el;
        this.el.autocomplete = "off";

        this._startText = "";

        this._storage = new AutocompleteStorage(
          el.name || el.id || "___ANY___"
        );

        this._currOptions = [];
        this._currSelected = 0;

        this._onRemoveEvent = this._onRemoveEvent.bind(this);
        this._mutationObserver = new MutationObserver(this._onRemoveEvent);
        this._mutationObserver.observe(document, {
          childList: true,
          subtree: true,
        });

        this._onKeydownCapture = this._onKeydownCapture.bind(this);
        el.addEventListener("keydown", this._onKeydownCapture, true);
        this._onKeyDown = this._onKeyDown.bind(this);
        el.addEventListener("keydown", this._onKeyDown);

        this._onKeyUp = this._onKeyUp.bind(this);
        el.addEventListener("keyup", this._onKeyUp);

        this._onClickEvent = this._onClickEvent.bind(this);
      }

      disconnect() {
        this._mutationObserver.disconnect();
        this.el.removeEventListener("keydown", this._onKeydownCapture, true);
        this.el.removeEventListener("keydown", this._onKeyDown);
        this.el.removeEventListener("keyup", this._onKeyUp);
        delete this.el.__picker;
      }

      _clear() {
        this._currOptions = [];
        this._currSelected = 0;
        OptionsViewer.clear();
      }

      _onClickEvent(option, idx) {
        this.el.value = this._currOptions[idx];
        this._clear();
      }

      _onRemoveEvent() {
        // if (this element was removed from the DOM)
        if (!this.el.closest("html")) {
          OptionsViewer.clear();
          if (!this.escOnce) {
            this._storage.delOption(this._startText);
            this._startText = this.el.value;
            this._storage.saveOption(this.el.value);
          }
          this._mutationObserver.disconnect();
        }
      }

      _onKeydownCapture(kp) {
        if (kp.code === "Escape") {
          if (this._currOptions.length !== 0) {
            kp.preventDefault();
            kp.stopPropagation();
            kp.stopImmediatePropagation();
            this.escOnce = true;
          }
          this._clear();
        } else if (kp.code === "Enter" && this._currSelected !== 0) {
          this.el.value = this._currOptions[this._currSelected - 1];
          this._clear();
          kp.preventDefault();
          kp.stopPropagation();
          kp.stopImmediatePropagation();
        }
      }

      _onKeyDown(kp) {
        if (kp.code === "Escape") {
          return;
        }

        this.escOnce = false;

        if (kp.code === "ArrowUp" && this._currOptions.length !== 0) {
          this._currSelected =
            (this._currSelected - 1 + (this._currOptions.length + 1)) %
            (this._currOptions.length + 1);
          kp.preventDefault();
        } else if (kp.code === "ArrowDown" && this._currOptions.length !== 0) {
          this._currSelected =
            (this._currSelected + 1) % (this._currOptions.length + 1);
          kp.preventDefault();
        } else if (kp.code === "Delete" && this._currSelected !== 0) {
          this._storage.delOption(this._currOptions[this._currSelected - 1]);
          this._currSelected = 0;
          kp.preventDefault();
        } else {
          this._currSelected = 0;
        }
      }

      _onKeyUp(kp) {
        if (
          kp.code === "Escape" ||
          (kp.code === "ArrowDown" && this._currOptions.length === 0) ||
          kp.code === "ArrowLeft" ||
          (kp.code === "ArrowUp" && this._currOptions.length === 0) ||
          kp.code === "ArrowRight" ||
          kp.code === "Enter"
        ) {
          return;
        }

        OptionsViewer.clear();
        if (!this.el.value) return;

        this._currOptions = OptionsViewer.search(
          this._storage.getOptions(),
          this.el.value,
          this._onClickEvent
        );
        OptionsViewer.select(this._currSelected);
      }
    }

    function attachAll(el) {
      if (!el.querySelectorAll) return;

      for (const node of el.querySelectorAll("textarea")) {
        new AutocompleteProvider(node);
      }

      for (const node of el.querySelectorAll('input[type="text"]')) {
        new AutocompleteProvider(node);
      }
    }

    const mobv = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes) {
          for (const node of [
            ...mutation.addedNodes,
            ...mutation.removedNodes,
          ]) {
            if (node instanceof HTMLElement && node.closest("html")) {
              try {
                attachAll(node);
              } catch (e) {
                // No-op on double-initalization
                // console.warn(e);
              }
            }
          }
        }
      }
    });

    mobv.observe(document, {
      subtree: true,
      childList: true,
    });

    attachAll(document);
  };

  const scr = document.createElement("script");
  scr.setAttribute(
    "src",
    "https://rawgit.com/farzher/fuzzysort/master/fuzzysort.js"
  );
  scr.onload = () => {
    "Fuzzysort loaded";
    main();
  };
  document.body.appendChild(scr);
})();
