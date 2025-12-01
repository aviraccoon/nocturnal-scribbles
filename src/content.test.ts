import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	collectTags,
	getPublishedPosts,
	groupPostsByYearMonth,
	readPages,
	readPosts,
	validatePageSlugs,
	validatePostSlugs,
} from "./content";
import type { Page, Post } from "./types";

const TEST_DIR = "tests/tmp-content-test";
const POSTS_DIR = join(TEST_DIR, "posts");
const PAGES_DIR = join(TEST_DIR, "pages");

describe("content", () => {
	beforeAll(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
		mkdirSync(POSTS_DIR, { recursive: true });
		mkdirSync(PAGES_DIR, { recursive: true });
	});

	afterAll(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
	});

	describe("readPosts", () => {
		test("should read flat markdown files", async () => {
			writeFileSync(
				join(POSTS_DIR, "test-post.md"),
				`---
title: Test Post
date: 2025-01-15
slug: test-post
---

Content here.`,
			);

			const posts = await readPosts(POSTS_DIR);

			expect(posts.length).toBe(1);
			expect(posts[0]?.frontmatter.title).toBe("Test Post");
			expect(posts[0]?.slug).toBe("test-post");
			expect(posts[0]?.sourceDir).toBeNull();
		});

		test("should read directory-based posts with index.md", async () => {
			const postDir = join(POSTS_DIR, "dir-post");
			mkdirSync(postDir, { recursive: true });
			writeFileSync(
				join(postDir, "index.md"),
				`---
title: Directory Post
date: 2025-01-16
slug: dir-post
---

Content with assets.`,
			);

			const posts = await readPosts(POSTS_DIR);
			const dirPost = posts.find((p) => p.slug === "dir-post");

			expect(dirPost).toBeDefined();
			expect(dirPost?.sourceDir).toBe(postDir);
		});

		test("should skip directories without index.md", async () => {
			const emptyDir = join(POSTS_DIR, "empty-dir");
			mkdirSync(emptyDir, { recursive: true });
			writeFileSync(join(emptyDir, "readme.txt"), "Not an index.md");

			const posts = await readPosts(POSTS_DIR);
			const emptyPost = posts.find((p) => p.slug === "empty-dir");

			expect(emptyPost).toBeUndefined();
		});

		test("should skip non-markdown files", async () => {
			writeFileSync(join(POSTS_DIR, "notes.txt"), "Not a markdown file");

			const posts = await readPosts(POSTS_DIR);
			const txtPost = posts.find((p) => p.content.includes("Not a markdown"));

			expect(txtPost).toBeUndefined();
		});

		test("should sort posts by date (newest first)", async () => {
			writeFileSync(
				join(POSTS_DIR, "old.md"),
				`---
title: Old Post
date: 2025-01-01
slug: old-post
---
Old`,
			);
			writeFileSync(
				join(POSTS_DIR, "new.md"),
				`---
title: New Post
date: 2025-01-20
slug: new-post
---
New`,
			);

			const posts = await readPosts(POSTS_DIR);

			expect(posts[0]?.slug).toBe("new-post");
		});

		test("should parse draft status correctly", async () => {
			writeFileSync(
				join(POSTS_DIR, "draft.md"),
				`---
title: Draft Post
date: 2025-01-15
slug: draft-post
draft: true
---
Draft content`,
			);

			const posts = await readPosts(POSTS_DIR);
			const draft = posts.find((p) => p.slug === "draft-post");

			expect(draft?.draft).toBe(true);
		});

		test("should parse tags correctly", async () => {
			writeFileSync(
				join(POSTS_DIR, "tagged.md"),
				`---
title: Tagged Post
date: 2025-01-15
slug: tagged-post
tags: ["dev", "typescript"]
---
Tagged content`,
			);

			const posts = await readPosts(POSTS_DIR);
			const tagged = posts.find((p) => p.slug === "tagged-post");

			expect(tagged?.frontmatter.tags).toEqual(["dev", "typescript"]);
		});

		test("should return empty array for non-existent directory", async () => {
			const posts = await readPosts("tests/non-existent-dir");
			expect(posts).toEqual([]);
		});

		test("should process HTML with markdown transformations", async () => {
			writeFileSync(
				join(POSTS_DIR, "formatted.md"),
				`---
title: Formatted
date: 2025-01-15
slug: formatted
---

# Heading

Check [external](https://example.com) link.`,
			);

			const posts = await readPosts(POSTS_DIR);
			const formatted = posts.find((p) => p.slug === "formatted");

			// Heading should be shifted (h1 -> h3) and have anchor
			expect(formatted?.html).toContain("<h3");
			expect(formatted?.html).toContain('class="heading-anchor"');
			// External link should have target="_blank"
			expect(formatted?.html).toContain('target="_blank"');
		});
	});

	describe("readPages", () => {
		test("should read page markdown files", async () => {
			writeFileSync(
				join(PAGES_DIR, "about.md"),
				`---
title: About
slug: about
---

About page content.`,
			);

			const pages = await readPages(PAGES_DIR);

			expect(pages.length).toBeGreaterThanOrEqual(1);
			const about = pages.find((p) => p.slug === "about");
			expect(about?.frontmatter.title).toBe("About");
		});

		test("should skip non-markdown files", async () => {
			writeFileSync(join(PAGES_DIR, "readme.txt"), "Not a page");

			const pages = await readPages(PAGES_DIR);
			const txtPage = pages.find((p) => p.content.includes("Not a page"));

			expect(txtPage).toBeUndefined();
		});

		test("should return empty array for non-existent directory", async () => {
			const pages = await readPages("tests/non-existent-pages");
			expect(pages).toEqual([]);
		});

		test("should process HTML with markdown transformations", async () => {
			writeFileSync(
				join(PAGES_DIR, "links.md"),
				`---
title: Links
slug: links
---

Visit [external](https://example.com).`,
			);

			const pages = await readPages(PAGES_DIR);
			const links = pages.find((p) => p.slug === "links");

			expect(links?.html).toContain('target="_blank"');
		});
	});

	describe("getPublishedPosts", () => {
		test("should filter out draft posts", () => {
			const posts: Post[] = [
				{
					frontmatter: {
						title: "Published",
						date: "2025-01-15",
						slug: "published",
					},
					content: "",
					html: "",
					slug: "published",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: { title: "Draft", date: "2025-01-16", slug: "draft" },
					content: "",
					html: "",
					slug: "draft",
					sourceDir: null,
					draft: true,
				},
			];

			const published = getPublishedPosts(posts);

			expect(published.length).toBe(1);
			expect(published[0]?.slug).toBe("published");
		});

		test("should return all posts when none are drafts", () => {
			const posts: Post[] = [
				{
					frontmatter: { title: "One", date: "2025-01-15", slug: "one" },
					content: "",
					html: "",
					slug: "one",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: { title: "Two", date: "2025-01-16", slug: "two" },
					content: "",
					html: "",
					slug: "two",
					sourceDir: null,
					draft: false,
				},
			];

			const published = getPublishedPosts(posts);
			expect(published.length).toBe(2);
		});

		test("should return empty array when all posts are drafts", () => {
			const posts: Post[] = [
				{
					frontmatter: { title: "Draft", date: "2025-01-15", slug: "draft" },
					content: "",
					html: "",
					slug: "draft",
					sourceDir: null,
					draft: true,
				},
			];

			const published = getPublishedPosts(posts);
			expect(published.length).toBe(0);
		});
	});

	describe("collectTags", () => {
		test("should collect unique tags from posts", () => {
			const posts: Post[] = [
				{
					frontmatter: {
						title: "One",
						date: "2025-01-15",
						slug: "one",
						tags: ["dev", "typescript"],
					},
					content: "",
					html: "",
					slug: "one",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: {
						title: "Two",
						date: "2025-01-16",
						slug: "two",
						tags: ["dev", "rust"],
					},
					content: "",
					html: "",
					slug: "two",
					sourceDir: null,
					draft: false,
				},
			];

			const tags = collectTags(posts);

			expect(tags).toContain("dev");
			expect(tags).toContain("typescript");
			expect(tags).toContain("rust");
			expect(tags.length).toBe(3);
		});

		test("should return sorted tags", () => {
			const posts: Post[] = [
				{
					frontmatter: {
						title: "One",
						date: "2025-01-15",
						slug: "one",
						tags: ["zebra", "apple", "mango"],
					},
					content: "",
					html: "",
					slug: "one",
					sourceDir: null,
					draft: false,
				},
			];

			const tags = collectTags(posts);

			expect(tags).toEqual(["apple", "mango", "zebra"]);
		});

		test("should handle posts without tags", () => {
			const posts: Post[] = [
				{
					frontmatter: {
						title: "No Tags",
						date: "2025-01-15",
						slug: "no-tags",
					},
					content: "",
					html: "",
					slug: "no-tags",
					sourceDir: null,
					draft: false,
				},
			];

			const tags = collectTags(posts);
			expect(tags).toEqual([]);
		});

		test("should return empty array for empty posts array", () => {
			const tags = collectTags([]);
			expect(tags).toEqual([]);
		});
	});

	describe("groupPostsByYearMonth", () => {
		test("should group posts by year and month", () => {
			const posts: Post[] = [
				{
					frontmatter: { title: "Jan", date: "2025-01-15", slug: "jan" },
					content: "",
					html: "",
					slug: "jan",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: { title: "Feb", date: "2025-02-10", slug: "feb" },
					content: "",
					html: "",
					slug: "feb",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: {
						title: "Jan Again",
						date: "2025-01-20",
						slug: "jan-again",
					},
					content: "",
					html: "",
					slug: "jan-again",
					sourceDir: null,
					draft: false,
				},
			];

			const grouped = groupPostsByYearMonth(posts);

			expect(grouped.has(2025)).toBe(true);
			const year2025 = grouped.get(2025);
			expect(year2025?.has(0)).toBe(true); // January is month 0
			expect(year2025?.has(1)).toBe(true); // February is month 1
			expect(year2025?.get(0)?.length).toBe(2); // Two posts in January
			expect(year2025?.get(1)?.length).toBe(1); // One post in February
		});

		test("should handle posts across multiple years", () => {
			const posts: Post[] = [
				{
					frontmatter: { title: "2024", date: "2024-12-15", slug: "2024" },
					content: "",
					html: "",
					slug: "2024",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: { title: "2025", date: "2025-01-10", slug: "2025" },
					content: "",
					html: "",
					slug: "2025",
					sourceDir: null,
					draft: false,
				},
			];

			const grouped = groupPostsByYearMonth(posts);

			expect(grouped.has(2024)).toBe(true);
			expect(grouped.has(2025)).toBe(true);
		});

		test("should return empty map for empty posts array", () => {
			const grouped = groupPostsByYearMonth([]);
			expect(grouped.size).toBe(0);
		});
	});

	describe("validatePostSlugs", () => {
		test("should pass with unique slugs", () => {
			const posts: Post[] = [
				{
					frontmatter: { title: "One", date: "2025-01-15", slug: "one" },
					content: "",
					html: "",
					slug: "one",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: { title: "Two", date: "2025-01-16", slug: "two" },
					content: "",
					html: "",
					slug: "two",
					sourceDir: null,
					draft: false,
				},
			];

			expect(() => validatePostSlugs(posts)).not.toThrow();
		});

		test("should throw on duplicate slugs", () => {
			const posts: Post[] = [
				{
					frontmatter: {
						title: "First Post",
						date: "2025-01-15",
						slug: "same",
					},
					content: "",
					html: "",
					slug: "same",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: {
						title: "Second Post",
						date: "2025-01-16",
						slug: "same",
					},
					content: "",
					html: "",
					slug: "same",
					sourceDir: null,
					draft: false,
				},
			];

			expect(() => validatePostSlugs(posts)).toThrow(/Duplicate post slugs/);
			expect(() => validatePostSlugs(posts)).toThrow(/same/);
			expect(() => validatePostSlugs(posts)).toThrow(/Second Post/);
			expect(() => validatePostSlugs(posts)).toThrow(/First Post/);
		});

		test("should pass with empty array", () => {
			expect(() => validatePostSlugs([])).not.toThrow();
		});
	});

	describe("validatePageSlugs", () => {
		test("should pass with unique slugs", () => {
			const pages: Page[] = [
				{
					frontmatter: { title: "About", slug: "about" },
					content: "",
					html: "",
					slug: "about",
				},
				{
					frontmatter: { title: "Now", slug: "now" },
					content: "",
					html: "",
					slug: "now",
				},
			];

			expect(() => validatePageSlugs(pages)).not.toThrow();
		});

		test("should throw on duplicate slugs", () => {
			const pages: Page[] = [
				{
					frontmatter: { title: "About", slug: "about" },
					content: "",
					html: "",
					slug: "about",
				},
				{
					frontmatter: { title: "About Me", slug: "about" },
					content: "",
					html: "",
					slug: "about",
				},
			];

			expect(() => validatePageSlugs(pages)).toThrow(/Duplicate page slugs/);
			expect(() => validatePageSlugs(pages)).toThrow(/about/);
		});

		test("should pass with empty array", () => {
			expect(() => validatePageSlugs([])).not.toThrow();
		});
	});
});
