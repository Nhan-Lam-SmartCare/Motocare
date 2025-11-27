function i(n){const e=document.getElementById(n);if(!e)return;const t=window.open("","_blank","width=800,height=600");t&&(t.document.write(`<!doctype html><html><head><title>Print</title>
  <style>
    body{font-family: Arial, Helvetica, sans-serif;}
    @media print{ .no-print{ display:none } }
  </style>
  </head><body>${e.outerHTML}</body></html>`),t.document.close(),t.focus(),t.print(),t.close())}export{i as p};
