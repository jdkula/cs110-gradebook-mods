// ==UserScript==
// @name         Smart autocomplete for comments
// @version      1.0.4
// @author       Jonathan Kula
// @match        https://web.stanford.edu/*/cs110/*/assign*
// @icon         https://www.google.com/s2/favicons?domain=stanford.edu
// @grant        none
// ==/UserScript==

(function () {
  const main = () => {
    "use strict";
    const STORAGE_KEY = "__AUTOCOMPLETE_SEARCH_KEY";

    class AutocompleteStorage {
      constructor(name) {
        this.name = name;
      }

      static _getStorage() {
        const blob = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!blob) return {};

        return blob;
      }

      static _setStorage(blob) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
      }

      getOptions() {
        const storage = AutocompleteStorage._getStorage();
        if (!storage) {
          return [];
        }

        return storage[this.name] || [];
      }

      saveOption(option) {
        if (!option) return;

        const storage = AutocompleteStorage._getStorage();
        AutocompleteStorage._setStorage({
          ...(storage || {}),
          [this.name]: [
            ...new Set([...((storage || {})[this.name] || []), option]),
          ],
        });
      }

      delOption(option) {
        const storage = AutocompleteStorage._getStorage();
        AutocompleteStorage._setStorage({
          ...(storage || {}),
          [this.name]: ((storage || {})[this.name] || []).filter(
            (el) => el !== option
          ),
        });
      }
    }

    class OptionsViewer {
      constructor() {}

      static create() {
        if (document.getElementById("_options_viewer")) return;

        document.body.insertAdjacentHTML(
          "beforeend",
          `
      <div style="position: fixed; bottom: 0px; width: 100%; z-index: 1000; font-size: 9pt;" id="_options_viewer">
      </div>
      `
        );
      }

      static destroy() {
        const ov = document.getElementById("_options_viewer");
        if (!ov) return;

        document.body.removeChild(ov);
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
          ov.insertAdjacentHTML(
            "beforeend",
            `
          <div style="background: white; width: 100%; border: 1px solid gray;" class="options-viewer-option">
            ${option}
          </div>
        `
          );
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
          plainResults.push(match.target);
          results.push(
            `<span style="color: purple; font-weight: 700;">${(
              1 + match.score / 1000
            // @ts-ignore
            ).toFixed(2)}%</span>&nbsp;&nbsp;${fuzzysort.highlight(match, "<span style=\"text-decoration: underline;\">", "</span>")}`
          );
        }

        OptionsViewer.set(results);
        return plainResults;
      }

      static select(idx) {
        const os = document.getElementById("_options_style");
        if (os) {
          document.head.removeChild(os);
        }

        if (idx <= 0) return;

        document.head.insertAdjacentHTML(
          "beforeend",
          `
      <style id="_options_style">
        #_options_viewer .options-viewer-option:nth-child(${idx}) {
          background: blue !important;
          color: white;
        }
      </style>
      `
        );
      }
    }

    let nonce = 0;

    class Picker {
      constructor(el) {
        if (el.__picker) {
          return;
        }
        el.__picker = this;
        this._id = nonce++;
        this.el = el;
        this.el.autocomplete = "off";

        this.startText = "";

        this.storage = new AutocompleteStorage(el.name || el.id || "___ANY___");

        this.currOptions = null;
        this.currSelected = 0;

        this.escOnce = false;
        this.dontRefresh = false;

        const onRemoved = new MutationObserver(() => {
          // if (this element was removed from the DOM)
          if (!this.el.closest("html")) {
            OptionsViewer.clear();
            if (!this.escOnce) {
              this.storage.delOption(this.startText);
              this.startText = this.el.value;
              this.storage.saveOption(this.el.value);
            }
            onRemoved.disconnect();
          }
        });
        onRemoved.observe(document, { childList: true, subtree: true });

        el.addEventListener(
          "keydown",
          (kp) => {
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
          },
          true
        );
        el.addEventListener("keydown", (kp) => {
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
        });
        el.addEventListener("keyup", (kp) => {
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
        });
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
            if (document.body.contains(node)) {
              attachAll(node);
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
