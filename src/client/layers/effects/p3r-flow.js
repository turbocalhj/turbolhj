/* 背景动态流光：常驻光晕 + 横扫光束，仅注入装饰层，不接管任何交互。 */
(function () {
  'use strict';

  if (document.querySelector('.ts-flow')) return;
  if (!document.body) return;

  var flow = document.createElement('div');
  flow.className = 'ts-flow';
  flow.setAttribute('aria-hidden', 'true');
  flow.innerHTML =
    '<span class="ts-flow-glow"></span>' +
    '<span class="ts-flow-beam"></span>' +
    '<span class="ts-flow-beam"></span>' +
    '<span class="ts-flow-beam"></span>' +
    '<span class="ts-flow-sweep"></span>' +
    '<span class="ts-flow-scan"></span>';
  document.body.appendChild(flow);
})();