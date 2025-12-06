/**
 * Main build orchestration for the static site generator.
 * Coordinates reading content, generating pages, and copying assets.
 */

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
	copyPostAssets,
	copyPublicFiles,
	copyStaticWithHashing,
} from "./assets";
import { bundleGeocities, bundleMusic, transpileScripts } from "./bundler";
import {
	DIST_DIR,
	PAGES_DIR,
	POSTS_DIR,
	PUBLIC_DIR,
	ROOT_DIR,
	STATIC_DIR,
	TEMPLATES_DIR,
} from "./config";
import {
	collectTags,
	getPublishedPosts,
	readPages,
	readPosts,
	validatePageSlugs,
	validatePostSlugs,
} from "./content";
import { generateRSSFeed, generateTagRSSFeed } from "./rss";
import {
	generateArchivePage,
	generateIndexPage,
	generatePostPage,
	generateSimplePage,
	generateTagPage,
	generateTagsIndexPage,
} from "./templates";
import type { BuildOptions } from "./types";

/**
 * Builds the complete static site by reading posts, generating HTML pages,
 * and copying static assets to the dist directory.
 */
export async function build(options: BuildOptions = {}) {
	const buildStartTime = performance.now();

	const postsDir = options.postsDir ?? POSTS_DIR;
	const pagesDir = options.pagesDir ?? PAGES_DIR;
	const templatesDir = options.templatesDir ?? TEMPLATES_DIR;
	const staticDir = options.staticDir ?? STATIC_DIR;
	const publicDir = options.publicDir ?? PUBLIC_DIR;
	const distDir = options.distDir ?? DIST_DIR;

	console.log("Building site...");

	// Transpile TypeScript scripts for inline inclusion
	await transpileScripts(ROOT_DIR);
	console.log("Transpiled scripts");

	// Clean dist directory
	if (existsSync(distDir)) {
		rmSync(distDir, { recursive: true });
	}
	mkdirSync(distDir, { recursive: true });

	// Copy static assets with hashing
	const staticDistDir = join(distDir, "static");
	mkdirSync(staticDistDir, { recursive: true });
	const assetMap = await copyStaticWithHashing(staticDir, staticDistDir);
	console.log("Copied and hashed static assets");

	// Bundle geocities theme (lazy-loaded)
	const geocitiesBundle = await bundleGeocities(staticDistDir);
	assetMap[geocitiesBundle.originalPath] = geocitiesBundle.hashedPath;
	console.log("Bundled geocities theme");

	// Bundle standalone music player (lazy-loaded)
	const musicBundle = await bundleMusic(staticDistDir);
	assetMap[musicBundle.originalPath] = musicBundle.hashedPath;
	console.log("Bundled music player");

	// Copy public files to dist root (CNAME, robots.txt, etc.)
	if (existsSync(publicDir)) {
		await copyPublicFiles(publicDir, distDir);
		console.log("Copied public files");
	}

	// Read all posts (including drafts)
	const posts = await readPosts(postsDir);
	validatePostSlugs(posts);
	const publishedPosts = getPublishedPosts(posts);
	const draftCount = posts.length - publishedPosts.length;

	if (draftCount > 0) {
		console.log(
			`Found ${publishedPosts.length} published post${publishedPosts.length !== 1 ? "s" : ""} and ${draftCount} draft${draftCount !== 1 ? "s" : ""}`,
		);
	} else {
		console.log(
			`Found ${publishedPosts.length} published post${publishedPosts.length !== 1 ? "s" : ""}`,
		);
	}

	// Generate post pages
	for (const post of posts) {
		const postHtml = await generatePostPage(post, assetMap, templatesDir);
		const postDir = join(distDir, "posts", post.slug);
		mkdirSync(postDir, { recursive: true });
		await Bun.write(join(postDir, "index.html"), postHtml);

		// Copy assets for directory-based posts
		if (post.sourceDir) {
			await copyPostAssets(post.sourceDir, postDir);
		}

		console.log(`Generated: /posts/${post.slug}/`);
	}

	// Generate index page (only show published posts)
	const indexHtml = await generateIndexPage(
		publishedPosts,
		assetMap,
		templatesDir,
	);
	await Bun.write(join(distDir, "index.html"), indexHtml);
	console.log("Generated: /index.html");

	// Generate tag pages
	const tags = collectTags(publishedPosts);
	for (const tag of tags) {
		const tagPosts = publishedPosts.filter((post) =>
			post.frontmatter.tags?.includes(tag),
		);
		const tagHtml = await generateTagPage(
			tag,
			tagPosts,
			assetMap,
			templatesDir,
		);
		const tagDir = join(distDir, "tags", tag);
		mkdirSync(tagDir, { recursive: true });
		await Bun.write(join(tagDir, "index.html"), tagHtml);
		console.log(`Generated: /tags/${tag}/`);
	}

	// Generate tags index page
	const tagsIndexHtml = await generateTagsIndexPage(
		tags,
		publishedPosts,
		assetMap,
		templatesDir,
	);
	const tagsDir = join(distDir, "tags");
	mkdirSync(tagsDir, { recursive: true });
	await Bun.write(join(tagsDir, "index.html"), tagsIndexHtml);
	console.log("Generated: /tags/");

	// Generate archive page
	const archiveHtml = await generateArchivePage(
		publishedPosts,
		assetMap,
		templatesDir,
	);
	const archiveDir = join(distDir, "archive");
	mkdirSync(archiveDir, { recursive: true });
	await Bun.write(join(archiveDir, "index.html"), archiveHtml);
	console.log("Generated: /archive/");

	// Generate main RSS feed
	const rssFeed = generateRSSFeed(publishedPosts);
	await Bun.write(join(distDir, "feed.xml"), rssFeed);
	console.log("Generated: /feed.xml");

	// Generate per-tag RSS feeds
	for (const tag of tags) {
		const tagPosts = publishedPosts.filter((post) =>
			post.frontmatter.tags?.includes(tag),
		);
		const tagRSSFeed = generateTagRSSFeed(tag, tagPosts);
		const tagDir = join(distDir, "tags", tag);
		await Bun.write(join(tagDir, "feed.xml"), tagRSSFeed);
		console.log(`Generated: /tags/${tag}/feed.xml`);
	}

	// Generate simple pages (like /now)
	const pages = await readPages(pagesDir);
	validatePageSlugs(pages);
	for (const page of pages) {
		const pageHtml = await generateSimplePage(page, assetMap, templatesDir);
		const pageDir = join(distDir, page.slug);
		mkdirSync(pageDir, { recursive: true });
		await Bun.write(join(pageDir, "index.html"), pageHtml);
		console.log(`Generated: /${page.slug}/`);
	}

	const buildEndTime = performance.now();
	const buildTimeMs = buildEndTime - buildStartTime;
	const buildTimeDisplay =
		buildTimeMs < 1000
			? `${buildTimeMs.toFixed(0)}ms`
			: `${(buildTimeMs / 1000).toFixed(2)}s`;

	console.log("\nBuild complete! 🎉");
	console.log(`Output: ${distDir}/`);
	console.log(`Build time: ${buildTimeDisplay}`);
}

// Run build only if this is the main module
if (import.meta.main) {
	build().catch((error) => {
		console.error("Build failed:", error);
		process.exit(1);
	});
}
