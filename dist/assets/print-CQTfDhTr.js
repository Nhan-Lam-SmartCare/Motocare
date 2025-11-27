import{c as i}from"./index-Y4_AZb1T.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r=i("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);function a(n){const e=document.getElementById(n);if(!e)return;const t=window.open("","_blank","width=800,height=600");t&&(t.document.write(`<!doctype html><html><head><title>Print</title>
  <style>
    body{font-family: Arial, Helvetica, sans-serif;}
    @media print{ .no-print{ display:none } }
  </style>
  </head><body>${e.outerHTML}</body></html>`),t.document.close(),t.focus(),t.print(),t.close())}export{r as P,a as p};
