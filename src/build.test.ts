/**
 * Integration tests for the build process.
 * Tests the full build() function end-to-end.
 */

import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { build } from "./build";

const TEST_DIRS = {
	dist: "tests/tmp-build-dist",
	posts: "tests/tmp-build-posts",
	pages: "tests/tmp-build-pages",
} as const;

describe("build integration", () => {
	beforeAll(() => {
		// Clean up before tests
		for (const dir of Object.values(TEST_DIRS)) {
			if (existsSync(dir)) {
				rmSync(dir, { recursive: true });
			}
		}
	});

	afterAll(() => {
		// Clean up after tests
		for (const dir of Object.values(TEST_DIRS)) {
			if (existsSync(dir)) {
				rmSync(dir, { recursive: true });
			}
		}
	});

	describe("basic build", () => {
		test("should create dist directory structure", async () => {
			mkdirSync(TEST_DIRS.posts, { recursive: true });

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(TEST_DIRS.dist)).toBe(true);
			expect(existsSync(join(TEST_DIRS.dist, "index.html"))).toBe(true);
			expect(existsSync(join(TEST_DIRS.dist, "static"))).toBe(true);
		});

		test("should clean existing dist directory", async () => {
			mkdirSync(TEST_DIRS.dist, { recursive: true });
			writeFileSync(join(TEST_DIRS.dist, "old-file.txt"), "should be deleted");

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "old-file.txt"))).toBe(false);
		});

		test("should generate index.html with valid HTML", async () => {
			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			const indexHtml = await Bun.file(
				join(TEST_DIRS.dist, "index.html"),
			).text();

			expect(indexHtml).toContain("<!DOCTYPE html>");
			expect(indexHtml.length).toBeGreaterThan(100);
		});
	});

	describe("post generation", () => {
		beforeEach(() => {
			if (existsSync(TEST_DIRS.posts)) {
				rmSync(TEST_DIRS.posts, { recursive: true });
			}
			mkdirSync(TEST_DIRS.posts, { recursive: true });
		});

		test("should generate post pages", async () => {
			writeFileSync(
				join(TEST_DIRS.posts, "test.md"),
				`---
title: Test Post
date: 2025-01-15
slug: test-post
---

Post content here.`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(
				existsSync(join(TEST_DIRS.dist, "posts", "test-post", "index.html")),
			).toBe(true);
		});

		test("should process markdown content correctly", async () => {
			writeFileSync(
				join(TEST_DIRS.posts, "content.md"),
				`---
title: Content Test
date: 2025-01-15
slug: content-test
---

# Heading

Check [external](https://example.com) link.

![image](photo.jpg)`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			const html = await Bun.file(
				join(TEST_DIRS.dist, "posts", "content-test", "index.html"),
			).text();

			// Heading shifted and anchored
			expect(html).toContain('<h3 id="heading">');
			expect(html).toContain('class="heading-anchor"');

			// External link opens in new tab
			expect(html).toContain('target="_blank"');

			// Image is clickable with lazy loading
			expect(html).toContain('<a href="photo.jpg"');
			expect(html).toContain('loading="lazy"');
		});

		test("should handle directory-based posts with assets", async () => {
			const postDir = join(TEST_DIRS.posts, "dir-post");
			mkdirSync(postDir, { recursive: true });
			writeFileSync(
				join(postDir, "index.md"),
				`---
title: Dir Post
date: 2025-01-15
slug: dir-post
---

![](image.jpg)`,
			);
			writeFileSync(join(postDir, "image.jpg"), "fake image");

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			// Post page exists
			expect(
				existsSync(join(TEST_DIRS.dist, "posts", "dir-post", "index.html")),
			).toBe(true);

			// Asset was copied
			expect(
				existsSync(join(TEST_DIRS.dist, "posts", "dir-post", "image.jpg")),
			).toBe(true);
		});

		test("should generate draft posts but exclude from index", async () => {
			writeFileSync(
				join(TEST_DIRS.posts, "published.md"),
				`---
title: Published Post
date: 2025-01-15
slug: published
draft: false
---

Published`,
			);
			writeFileSync(
				join(TEST_DIRS.posts, "draft.md"),
				`---
title: Draft Post
date: 2025-01-16
slug: draft
draft: true
---

Draft`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			// Both posts are generated
			expect(
				existsSync(join(TEST_DIRS.dist, "posts", "published", "index.html")),
			).toBe(true);
			expect(
				existsSync(join(TEST_DIRS.dist, "posts", "draft", "index.html")),
			).toBe(true);

			// Only published post appears in index
			const indexHtml = await Bun.file(
				join(TEST_DIRS.dist, "index.html"),
			).text();
			expect(indexHtml).toContain("Published Post");
			expect(indexHtml).not.toContain("Draft Post");
		});

		test("should show draft warning on draft posts", async () => {
			writeFileSync(
				join(TEST_DIRS.posts, "draft.md"),
				`---
title: Draft Post
date: 2025-01-15
slug: draft-warning-test
draft: true
---

Draft content`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			const html = await Bun.file(
				join(TEST_DIRS.dist, "posts", "draft-warning-test", "index.html"),
			).text();

			expect(html).toContain("draft");
		});
	});

	describe("tag pages", () => {
		beforeEach(() => {
			if (existsSync(TEST_DIRS.posts)) {
				rmSync(TEST_DIRS.posts, { recursive: true });
			}
			mkdirSync(TEST_DIRS.posts, { recursive: true });
		});

		test("should generate tag pages for all unique tags", async () => {
			writeFileSync(
				join(TEST_DIRS.posts, "post1.md"),
				`---
title: Post One
date: 2025-01-15
slug: post-one
tags: ["dev", "typescript"]
---

Content`,
			);
			writeFileSync(
				join(TEST_DIRS.posts, "post2.md"),
				`---
title: Post Two
date: 2025-01-16
slug: post-two
tags: ["dev", "rust"]
---

Content`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(
				existsSync(join(TEST_DIRS.dist, "tags", "dev", "index.html")),
			).toBe(true);
			expect(
				existsSync(join(TEST_DIRS.dist, "tags", "typescript", "index.html")),
			).toBe(true);
			expect(
				existsSync(join(TEST_DIRS.dist, "tags", "rust", "index.html")),
			).toBe(true);
		});

		test("should generate tags index page", async () => {
			writeFileSync(
				join(TEST_DIRS.posts, "tagged.md"),
				`---
title: Tagged
date: 2025-01-15
slug: tagged
tags: ["dev"]
---

Content`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "tags", "index.html"))).toBe(true);

			const tagsIndex = await Bun.file(
				join(TEST_DIRS.dist, "tags", "index.html"),
			).text();
			expect(tagsIndex).toContain("dev");
		});

		test("should only include published posts in tag pages", async () => {
			writeFileSync(
				join(TEST_DIRS.posts, "published.md"),
				`---
title: Published
date: 2025-01-15
slug: published
tags: ["dev"]
---

Published`,
			);
			writeFileSync(
				join(TEST_DIRS.posts, "draft.md"),
				`---
title: Draft
date: 2025-01-16
slug: draft
draft: true
tags: ["dev"]
---

Draft`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			const tagPage = await Bun.file(
				join(TEST_DIRS.dist, "tags", "dev", "index.html"),
			).text();

			expect(tagPage).toContain("Published");
			expect(tagPage).not.toContain("Draft");
		});

		test("should generate per-tag RSS feeds", async () => {
			writeFileSync(
				join(TEST_DIRS.posts, "tagged.md"),
				`---
title: Tagged Post
date: 2025-01-15
slug: tagged
tags: ["dev"]
---

Content`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "tags", "dev", "feed.xml"))).toBe(
				true,
			);
		});
	});

	describe("archive page", () => {
		test("should generate archive page", async () => {
			mkdirSync(TEST_DIRS.posts, { recursive: true });
			writeFileSync(
				join(TEST_DIRS.posts, "post.md"),
				`---
title: Archive Test
date: 2025-01-15
slug: archive-test
---

Content`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "archive", "index.html"))).toBe(
				true,
			);

			const archive = await Bun.file(
				join(TEST_DIRS.dist, "archive", "index.html"),
			).text();
			expect(archive).toContain("Archive Test");
			expect(archive).toContain("2025");
		});
	});

	describe("RSS feed", () => {
		test("should generate main RSS feed", async () => {
			mkdirSync(TEST_DIRS.posts, { recursive: true });
			writeFileSync(
				join(TEST_DIRS.posts, "post.md"),
				`---
title: RSS Test
date: 2025-01-15
slug: rss-test
---

Content`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "feed.xml"))).toBe(true);

			const feed = await Bun.file(join(TEST_DIRS.dist, "feed.xml")).text();
			expect(feed).toContain("RSS Test");
			expect(feed).toContain("raccoon.land");
		});
	});

	describe("custom pages", () => {
		beforeEach(() => {
			if (existsSync(TEST_DIRS.pages)) {
				rmSync(TEST_DIRS.pages, { recursive: true });
			}
			mkdirSync(TEST_DIRS.pages, { recursive: true });
		});

		test("should generate custom pages", async () => {
			writeFileSync(
				join(TEST_DIRS.pages, "about.md"),
				`---
title: About
slug: about
---

About page content.`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				pagesDir: TEST_DIRS.pages,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "about", "index.html"))).toBe(
				true,
			);

			const page = await Bun.file(
				join(TEST_DIRS.dist, "about", "index.html"),
			).text();
			expect(page).toContain("About page content");
		});

		test("should generate multiple pages", async () => {
			writeFileSync(
				join(TEST_DIRS.pages, "about.md"),
				`---
title: About
slug: about
---

About`,
			);
			writeFileSync(
				join(TEST_DIRS.pages, "now.md"),
				`---
title: Now
slug: now
---

Now`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				pagesDir: TEST_DIRS.pages,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "about", "index.html"))).toBe(
				true,
			);
			expect(existsSync(join(TEST_DIRS.dist, "now", "index.html"))).toBe(true);
		});

		test("should handle missing pages directory", async () => {
			await build({
				postsDir: TEST_DIRS.posts,
				pagesDir: "tests/non-existent-pages",
				distDir: TEST_DIRS.dist,
			});

			// Build should complete without error
			expect(existsSync(TEST_DIRS.dist)).toBe(true);
		});
	});

	describe("static assets", () => {
		test("should copy and hash static assets", async () => {
			await build({ distDir: TEST_DIRS.dist });

			const staticDir = join(TEST_DIRS.dist, "static");
			expect(existsSync(staticDir)).toBe(true);

			const files = readdirSync(staticDir);
			const cssFile = files.find((f) => f.endsWith(".css"));

			expect(cssFile).toBeDefined();
			expect(cssFile).toMatch(/-[a-f0-9]{8}\.css$/);
		});

		test("should update asset references in HTML", async () => {
			await build({ distDir: TEST_DIRS.dist });

			const indexHtml = await Bun.file(
				join(TEST_DIRS.dist, "index.html"),
			).text();

			// Should contain hashed asset path, not original
			expect(indexHtml).toMatch(/\/static\/style-[a-f0-9]{8}\.css/);
			expect(indexHtml).not.toContain("/static/style.css");
		});
	});

	describe("edge cases", () => {
		beforeEach(() => {
			// Clean up posts directory to ensure isolation
			if (existsSync(TEST_DIRS.posts)) {
				rmSync(TEST_DIRS.posts, { recursive: true });
			}
		});

		test("should build with no posts", async () => {
			const emptyPosts = "tests/tmp-empty-posts";
			mkdirSync(emptyPosts, { recursive: true });

			await build({
				postsDir: emptyPosts,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "index.html"))).toBe(true);

			rmSync(emptyPosts, { recursive: true });
		});

		test("should build with only draft posts", async () => {
			mkdirSync(TEST_DIRS.posts, { recursive: true });
			writeFileSync(
				join(TEST_DIRS.posts, "draft.md"),
				`---
title: Only Draft
date: 2025-01-15
slug: only-draft
draft: true
---

Draft`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			expect(existsSync(join(TEST_DIRS.dist, "index.html"))).toBe(true);
			expect(
				existsSync(join(TEST_DIRS.dist, "posts", "only-draft", "index.html")),
			).toBe(true);
		});

		test("should handle posts without tags", async () => {
			mkdirSync(TEST_DIRS.posts, { recursive: true });
			writeFileSync(
				join(TEST_DIRS.posts, "no-tags.md"),
				`---
title: No Tags
date: 2025-01-15
slug: no-tags
---

No tags here`,
			);

			await build({
				postsDir: TEST_DIRS.posts,
				distDir: TEST_DIRS.dist,
			});

			// Tags directory should exist with just index
			const tagsDir = join(TEST_DIRS.dist, "tags");
			expect(existsSync(tagsDir)).toBe(true);

			const tagContents = readdirSync(tagsDir);
			expect(tagContents).toEqual(["index.html"]);
		});
	});
});
