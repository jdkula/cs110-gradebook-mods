//@ts-check
// ==UserScript==
// @name         Smart autocomplete for comments
// @version      1.0.4
// @author       Jonathan Kula
// @match        https://web.stanford.edu/*/cs110/*/assign*
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

    class OptionsViewer {
      static _templates = {
        container: `
        <div style="position: fixed; bottom: 0px; width: 100%; z-index: 1000; font-size: 9pt;" id="_options_viewer">
        </div>
        `,
        style: `
        <style id="_options_viewer_style">
        </style>
        `,
        selectStyle: (selectedIdx) => `
        <style id="_options_style_select">
          #_options_viewer .options-viewer-option:nth-child(${selectedIdx}) {
            background: blue !important;
            color: white;
          }
        </style>
        `,
        item: (text) => `
        <div style="background: white; width: 100%; border: 1px solid gray;" class="options-viewer-option">
          ${text}
        </div>
      `,
        result: (score, text) =>
          `<span style="color: purple; font-weight: 700;">${score}%</span>&nbsp;&nbsp;${text}`,
      };

      static create() {
        if (document.getElementById("_options_viewer")) return;

        document.body.insertAdjacentHTML(
          "beforeend",
          this._templates.container
        );

        document.head.insertAdjacentHTML("beforeend", this._templates.style);
      }

      static destroy() {
        const ov = document.getElementById("_options_viewer");
        if (ov) document.body.removeChild(ov);

        const os = document.getElementById("_options_viewer_style");
        if (os) document.head.removeChild(os);

        const oss = document.getElementById("_options_viewer_select_style");
        if (oss) document.head.removeChild(oss);
      }

      static hide() {
        OptionsViewer.create();
        document.getElementById("_options_viewer").style.display = "none";
      }

      static show() {
        OptionsViewer.create();
        document.getElementById("_options_viewer").style.display = "block";
      }

      static clear() {
        OptionsViewer.destroy();
        OptionsViewer.create();
      }

      static set(options) {
        OptionsViewer.clear();
        const ov = document.getElementById("_options_viewer");
        for (const option of options) {
          ov.insertAdjacentHTML("beforeend", this._templates.item(option));
        }
      }

      static search(options, query) {
        // @ts-ignore
        const res = fuzzysort.go(query, options, {
          threshold: -1000,
          allowTypo: false,
          limit: 6,
        });
        const results = [];
        const plainResults = [];
        for (const match of res) {
          const normedScore = (1 + match.score / 1000).toFixed(2);
          const fancyResult = match.highlight(
            match,
            '<span style="text-decoration: underline;">',
            "</span>"
          );

          results.push(this._templates.result(normedScore, fancyResult));
          plainResults.push(match.target);
        }

        OptionsViewer.set(results);
        return plainResults;
      }

      static select(idx) {
        const os = document.getElementById("_options_select_style");
        if (os) {
          document.head.removeChild(os);
        }

        if (idx <= 0) return;

        document.head.insertAdjacentHTML(
          "beforeend",
          this._templates.selectStyle(idx)
        );
      }
    }

    class Picker {
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

        this.startText = "";

        this.storage = new AutocompleteStorage(el.name || el.id || "___ANY___");

        this.currOptions = null;
        this.currSelected = 0;

        this.escOnce = false;
        this.dontRefresh = false;

        this._on_remove_event = this._onRemoveEvent.bind(this);
        this._mutationObserver = new MutationObserver(this._onRemoveEvent);
        this._mutationObserver.observe(document, {
          childList: true,
          subtree: true,
        });

        this._keydown_capture = this._onKeydownCapture.bind(this);
        el.addEventListener("keydown", this._onKeydownCapture, true);
        this._keydown = this._onKeyDown.bind(this);
        el.addEventListener("keydown", this._onKeyDown);

        this._keyup = this._onKeyUp.bind(this);
        el.addEventListener("keyup", this._onKeyUp);
      }

      disconnect() {
        this._mutationObserver.disconnect();
        this.el.removeEventListener("keydown", this._onKeydownCapture, true);
        this.el.removeEventListener("keydown", this._onKeyDown);
        this.el.removeEventListener("keyup", this._onKeyUp);
        delete this.el.__picker;
      }

      _onRemoveEvent() {
        // if (this element was removed from the DOM)
        if (!this.el.closest("html")) {
          OptionsViewer.clear();
          if (!this.escOnce) {
            this.storage.delOption(this.startText);
            this.startText = this.el.value;
            this.storage.saveOption(this.el.value);
          }
          this._mutationObserver.disconnect();
        }
      }

      _onKeydownCapture(kp) {
        if (kp.code === "Escape") {
          if (!this.escOnce) {
            kp.preventDefault();
            kp.stopPropagation();
            kp.stopImmediatePropagation();
            this.escOnce = true;
          }
          OptionsViewer.clear();
        } else if (kp.code === "Enter" && this.currSelected !== 0) {
          console.log("Selecting", this.currSelected, this.currOptions);
          this.el.value = this.currOptions[this.currSelected - 1];
          this.currSelected = 0;
          OptionsViewer.select(0);
          OptionsViewer.clear();
          this.dontRefresh = true;
          kp.preventDefault();
          kp.stopPropagation();
          kp.stopImmediatePropagation();
        }
      }

      _onKeyDown(kp) {
        if (kp.code === "Escape") {
          OptionsViewer.clear();
          return;
        }

        this.escOnce = false;

        if (kp.code === "ArrowUp") {
          // TODO: Go thru list
          this.currSelected =
            (this.currSelected - 1 + (this.currOptions.length + 1)) %
            (this.currOptions.length + 1);
          kp.preventDefault();
        } else if (kp.code === "ArrowDown") {
          // TODO: Go thru list
          this.currSelected =
            (this.currSelected + 1) % (this.currOptions.length + 1);
          kp.preventDefault();
        } else if (kp.code === "Delete" && this.currSelected !== 0) {
          this.storage.delOption(this.currOptions[this.currSelected - 1]);
          this.currSelected = 0;
          kp.preventDefault();
        } else {
          this.currSelected = 0;
        }
      }

      _onKeyUp(kp) {
        if (kp.code === "Escape") return;

        OptionsViewer.clear();
        if (!this.el.value) return;

        if (this.dontRefresh) {
          this.dontRefresh = false;
          return;
        }

        this.currOptions = OptionsViewer.search(
          this.storage.getOptions(),
          this.el.value
        );
        OptionsViewer.select(this.currSelected);
      }
    }

    function attachAll(el) {
      if (!el.querySelectorAll) return;

      for (const node of el.querySelectorAll("textarea")) {
        new Picker(node);
      }

      for (const node of el.querySelectorAll('input[type="text"]')) {
        new Picker(node);
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
                console.warn(e);
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
