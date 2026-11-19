import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulseify — Real-Time Spotify Stats, Monthly Listeners & Viral Charts",
  description:
    "Next-generation Spotify analytics tracker inspired by Kworb. Track monthly listeners, daily +/- deltas, peak records, regional charts, and stream songs live.",
};

const STRIP_EXTENSION_ATTRS_SCRIPT = `
(function () {
  var ATTRS = ['bis_skin_checked', 'bis_register', 'bis_size', 'data-bis-config'];
  function clean(root) {
    if (!root || !root.querySelectorAll) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var attr = ATTRS[i];
      if (root.hasAttribute && root.hasAttribute(attr)) root.removeAttribute(attr);
      var nodes = root.querySelectorAll('[' + attr + ']');
      for (var j = 0; j < nodes.length; j++) {
        nodes[j].removeAttribute(attr);
      }
    }
  }
  clean(document.documentElement);
  var obs = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'attributes' && m.target && m.target.removeAttribute) {
        if (ATTRS.indexOf(m.attributeName) !== -1) {
          m.target.removeAttribute(m.attributeName);
        }
      } else if (m.type === 'childList') {
        for (var k = 0; k < m.addedNodes.length; k++) {
          clean(m.addedNodes[k]);
        }
      }
    }
  });
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ATTRS,
    childList: true,
    subtree: true
  });
  window.addEventListener('load', function () {
    setTimeout(function () { obs.disconnect(); }, 4000);
  });
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS_SCRIPT }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#07080C] text-[#F4F6FB] antialiased selection:bg-[#1ED760] selection:text-black"
      >
        {children}
      </body>
    </html>
  );
}
