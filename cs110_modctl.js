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
      stable_url: "",
      latest_url: "",
    },
    autocompleter: {
      stable_url: "",
      latest_url: "",
    },
    markdown: {
      stable_url: "",
      latest_url: "",
    },
  };

  var config = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
  if (!config.enabled) {
    config.enabled = [];
  }

  function saveConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  function load(name, script) {
    var scriptEl = document.createElement("script");
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
    const found = config.enabled.pop(name);
    saveConfig();

    if (found) {
      console.log(name + " disabled");
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
  });

  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("DOMContentLoaded", onLoad);
  }
})();