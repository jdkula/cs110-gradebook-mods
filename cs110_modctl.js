/**
 * A small file to en/disable these mods without a UserScript runner;
 * to be embedded on a target webpage. Simple console-based
 * UX/""CLI"" inspired by sysctl.
 *
 * This file is designed to be backwards compatible with older JS engines.
 */

(function () {
  var CONFIG_KEY = "__MODCTL_CONFIG";

  var scripts = {
    popover: {
      stable_url:
        "https://cdn.jsdelivr.net/gh/jdkula/cs110-gradebook-mods@stable/cs110_popover.user.js",
      latest_url:
        "https://web.stanford.edu/~jdkula/cs110_mods/cs110_popover.user.js",
    },
    autocompleter: {
      stable_url:
        "https://cdn.jsdelivr.net/gh/jdkula/cs110-gradebook-mods@stable/autocompleter.user.js",
      latest_url:
        "https://web.stanford.edu/~jdkula/cs110_mods/autocompleter.user.js",
    },
    markdown: {
      stable_url:
        "https://cdn.jsdelivr.net/gh/jdkula/cs110-gradebook-mods@stable/cs110_markdown.user.js",
      latest_url:
        "https://web.stanford.edu/~jdkula/cs110_mods/cs110_markdown.user.js",
    },
    hoverloader: {
      stable_url:
        "https://cdn.jsdelivr.net/gh/jdkula/cs110-gradebook-mods@stable/cs110_hoverloader.user.js",
      latest_url:
        "https://web.stanford.edu/~jdkula/cs110_mods/cs110_hoverloader.user.js",
    },
  };

  var config = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
  if (!config.enabled) {
    config.enabled = [];
  }

  // TODO: Change this when the scripts are more stable.
  if (config.useLatest !== false) {
    config.useLatest = true;
  }

  function saveConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  function load(name, script) {
    var scriptEl = document.createElement("script");
    scriptEl.setAttribute("charset", "UTF-8");
    scriptEl.setAttribute("src", script);
    scriptEl.onload = function () {
      console.log("Script " + name + " has been loaded");
    };

    document.body.appendChild(scriptEl);
  }

  function start(name) {
    if (config.useLatest) {
      load(name, scripts[name].latest_url);
    } else {
      load(name, scripts[name].stable_url);
    }
  }

  function enable(name) {
    if (!config.enabled.includes(name)) {
      config.enabled.push(name);
      saveConfig();
      console.log(name + " enabled, and will run on page load");
    } else {
      console.log(name + " already enabled");
    }
  }

  function disable(name) {
    const idx = config.enabled.indexOf(name);
    if (idx >= 0) {
      config.enabled.splice(idx, 1);
      console.log(name + " disabled");
      saveConfig();
    } else {
      console.log(name + " already disabled");
    }
  }

  function onLoad() {
    for (var i = 0; i < config.enabled.length; i++) {
      start(config.enabled[i]);
    }
  }

  var modctl = {
    enable: {},
    start: {},
    disable: {},
    isEnabled: {},
    enableBleedingEdge() {
      console.log("Enabled bleeding edge mode, reload the page");
      config.useLatest = true;
      saveConfig();
    },
    disableBleedingEdge() {
      console.log("Disabled bleeding edge mode, reload the page");
      config.useLatest = false;
      saveConfig();
    },
    help() {
      console.log("Use to start/enable/disable codemods.");
      console.log("Usage: modctl.<action>.<mod>()");
      console.log("modctl.start.<mod>() will run the code mod immediately");
      console.log(
        "modctl.enable.<mod>() will mark the code mod so it runs on page load"
      );
      console.log(
        "modctl.disable.<mod>() will mark the code mod so it does not run on page load"
      );
      console.log("These mods are available: ", Object.keys(scripts));
    },
  };

  Object.keys(scripts).forEach(function (key) {
    modctl.enable[key] = function () {
      enable(key);
    };
    modctl.start[key] = function () {
      start(key);
    };
    modctl.disable[key] = function () {
      disable(key);
    };
    modctl.isEnabled[key] = function () {
      return config.enabled.includes(key);
    };
  });

  window.modctl = modctl;

  if (!window.DISABLE_MODCTL_AUTOLOAD) {
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("DOMContentLoaded", onLoad);
    }
  }
})();
