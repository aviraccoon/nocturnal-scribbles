/**
 * Shared configuration and constants for the static site generator.
 */

import { Marked } from "marked";
import markedFootnote from "marked-footnote";
import { gfmHeadingId } from "marked-gfm-heading-id";

/** Project root directory */
export const ROOT_DIR = ".";

/** Directory containing blog post markdown files */
export const POSTS_DIR = "posts";

/** Directory containing static page markdown files */
export const PAGES_DIR = "pages";

/** Directory containing HTML templates */
export const TEMPLATES_DIR = "templates";

/** Directory containing static assets (CSS, images, etc.) */
export const STATIC_DIR = "static";

/** Directory containing files copied to dist root without modification (CNAME, robots.txt, etc.) */
export const PUBLIC_DIR = "public";

/** Directory containing scripts to be inlined */
export const SCRIPTS_DIR = "scripts";

/** Output directory for the built site */
export const DIST_DIR = "dist";

/** Maximum number of posts to show on the homepage */
export const HOMEPAGE_POST_LIMIT = 10;

/** Base URL for the site */
export const SITE_URL = "https://raccoon.land";

/** Site title used in feeds and templates */
export const SITE_TITLE = "aviraccoon's nocturnal scribbles";

/** Site description used in feeds and meta tags */
export const SITE_DESCRIPTION =
	"A raccoon's late-night thoughts on ADHD, game dev, dev tools, self-hosting, and whatever keeps me up at 2am.";

/** Directories to watch for changes in dev mode */
export const WATCH_DIRS = [
	"posts",
	"pages",
	"templates",
	"static",
	"public",
	"scripts",
	"src",
];

/** Content-Type headers for serving static files */
export const CONTENT_TYPES: Record<string, string> = {
	html: "text/html; charset=utf-8",
	css: "text/css; charset=utf-8",
	js: "application/javascript; charset=utf-8",
	json: "application/json",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	svg: "image/svg+xml",
	ico: "image/x-icon",
	xml: "application/xml",
};

/**
 * Configured Marked instance for parsing markdown.
 * Includes footnotes, GFM heading IDs, and heading level shifting.
 */
export const marked = new Marked()
	.use(markedFootnote())
	.use(gfmHeadingId())
	.use({
		// Shift heading levels down by 2 (h1 -> h3, h2 -> h4, etc.)
		// Site title is h1, post/page title is h2, so content starts at h3
		walkTokens(token) {
			if (token.type === "heading") {
				token.depth = Math.min(token.depth + 2, 6) as 1 | 2 | 3 | 4 | 5 | 6;
			}
		},
	});
