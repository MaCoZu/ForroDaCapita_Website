import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_rl2U3wMO.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/auth.astro.mjs');
const _page2 = () => import('./pages/api/messages.astro.mjs');
const _page3 = () => import('./pages/forro.astro.mjs');
const _page4 = () => import('./pages/pa58.astro.mjs');
const _page5 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/.pnpm/astro@5.9.2_@netlify+blobs@8.2.0_@types+node@24.0.0_jiti@2.4.2_lightningcss@1.30.1_rollup@4.43.0_typescript@5.8.3/node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/auth.ts", _page1],
    ["src/pages/api/messages.ts", _page2],
    ["src/pages/forro.astro", _page3],
    ["src/pages/pa58.astro", _page4],
    ["src/pages/index.astro", _page5]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "7647951f-1e7c-49aa-9d96-4d0beee77134"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (_start in serverEntrypointModule) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
