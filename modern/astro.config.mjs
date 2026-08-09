// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeFigureGrid from './src/lib/rehypeFigureGrid.mjs';

// https://astro.build/config
export default defineConfig({
	// Needed for canonical URLs and the sitemap the legacy Jekyll site published.
	site: 'https://bishaladhikari.info.np',
	integrations: [sitemap()],
	// URLs the Jekyll site published that this one does not carry forward.
	// Astro emits a small meta-refresh page for each in a static build.
	redirects: {
		'/articles': '/research',
		'/request': '/research',
		'/docs/github': '/'
	},
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatex, rehypeFigureGrid]
	}
});
