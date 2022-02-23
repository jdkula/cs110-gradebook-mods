// ==UserScript==
// @name        CS110 Hover Loader
// @author      Jonathan Kula
// @description This script makes the "saving..." text appear with a nice CSS loader in the top right.
// @version     0.1
// @match       https://web.stanford.edu/*/cs110/*/assign*
// @grant       none
// ==/UserScript==

(() => {
  // Thanks to loading.io/css for the loader.
  const style = `<style id="mod-hover-loader-style">
        #ajax_warning#ajax_warning {
            position: fixed;
            top: 10px;
            right: 10px;
        }

        :root {
          --lds-scale: 2.5;
        }

        .lds-grid {
            display: inline-block;
            position: relative;
            width: calc(80px / var(--lds-scale));
            height: calc(80px / var(--lds-scale));
            opacity: 0.7;
          }
          .lds-grid div {
            position: absolute;
            width: calc(16px / var(--lds-scale));
            height: calc(16px / var(--lds-scale));
            border-radius: 50%;
            background: #000;
            animation: lds-grid 1.2s ease-in-out infinite;
          }
          .lds-grid div:nth-child(1) {
            top: calc(8px / var(--lds-scale));
            left: calc(8px / var(--lds-scale));
            animation-delay: 0s;
          }
          .lds-grid div:nth-child(2) {
            top: calc(8px / var(--lds-scale));
            left: calc(32px / var(--lds-scale));
            animation-delay: -0.4s;
          }
          .lds-grid div:nth-child(3) {
            top: calc(8px / var(--lds-scale));
            left: calc(56px / var(--lds-scale));
            animation-delay: -0.8s;
          }
          .lds-grid div:nth-child(4) {
            top: calc(32px / var(--lds-scale));
            left: calc(8px / var(--lds-scale));
            animation-delay: -0.4s;
          }
          .lds-grid div:nth-child(5) {
            top: calc(32px / var(--lds-scale));
            left: calc(32px / var(--lds-scale));
            animation-delay: -0.8s;
          }
          .lds-grid div:nth-child(6) {
            top: calc(32px / var(--lds-scale));
            left: calc(56px / var(--lds-scale));
            animation-delay: -1.2s;
          }
          .lds-grid div:nth-child(7) {
            top: calc(56px / var(--lds-scale));
            left: calc(8px / var(--lds-scale));
            animation-delay: -0.8s;
          }
          .lds-grid div:nth-child(8) {
            top: calc(56px / var(--lds-scale));
            left: calc(32px / var(--lds-scale));
            animation-delay: -1.2s;
          }
          .lds-grid div:nth-child(9) {
            top: calc(56px / var(--lds-scale));
            left: calc(56px / var(--lds-scale));
            animation-delay: -1.6s;
          }
          @keyframes lds-grid {
            0%, 100% {
              background: #444;
            }
            50% {
              background: #ccc;
            }
          }
          
    </style>`;

  const loaderHtml = `<div class="lds-grid"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>`;

  document.head.insertAdjacentHTML("beforeend", style);
  const warning = document.getElementById("ajax_warning");
  document.body.appendChild(warning);
  warning.innerHTML = loaderHtml;
})();
