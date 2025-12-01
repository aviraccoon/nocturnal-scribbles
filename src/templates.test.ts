import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	applyBaseTemplate,
	formatDate,
	generateArchivePage,
	generateIndexPage,
	generatePostPage,
	generateSimplePage,
	generateTagPage,
	generateTagsIndexPage,
	processIncludes,
	readTemplate,
	renderPostListItem,
	toISODate,
} from "./templates";
import type { Page, Post } from "./types";

const TEST_DIR = "tests/tmp-templates-test";
const TEMPLATES_DIR = join(TEST_DIR, "templates");

describe("templates", () => {
	beforeAll(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
		mkdirSync(TEMPLATES_DIR, { recursive: true });
		mkdirSync(join(TEST_DIR, "scripts"), { recursive: true });

		// Create test include files
		writeFileSync(join(TEST_DIR, "scripts/test.js"), "console.log('test');");
		writeFileSync(join(TEST_DIR, "scripts/other.js"), "alert('hello');");

		// Create minimal test templates
		writeFileSync(
			join(TEMPLATES_DIR, "base.html"),
			`<!DOCTYPE html>
<html>
<head><title>{{TITLE}}</title><meta name="description" content="{{DESCRIPTION}}"></head>
<body>{{CONTENT}}</body>
</html>`,
		);

		writeFileSync(
			join(TEMPLATES_DIR, "post.html"),
			`<article>
<h2>{{TITLE}}</h2>
<time datetime="{{DATE_ISO}}">{{DATE}}</time>
{{#DRAFT}}<span class="draft-warning">Draft</span>{{/DRAFT}}
{{#TAGS}}<div class="tags">{{TAGS}}</div>{{/TAGS}}
<div class="content">{{CONTENT}}</div>
</article>`,
		);

		writeFileSync(
			join(TEMPLATES_DIR, "page.html"),
			`<article class="page">
<h2>{{TITLE}}</h2>
<div class="content">{{CONTENT}}</div>
</article>`,
		);

		writeFileSync(
			join(TEMPLATES_DIR, "index.html"),
			`<main>
<h2>Recent Posts</h2>
{{POSTS}}
{{#MORE_POSTS}}<a href="/archive/">View all posts</a>{{/MORE_POSTS}}
</main>`,
		);

		writeFileSync(
			join(TEMPLATES_DIR, "tag.html"),
			`<main>
<h2>Posts tagged with "{{TAG}}"</h2>
<p>{{POST_COUNT}} post{{POST_COUNT_PLURAL}}</p>
{{POSTS}}
</main>`,
		);

		writeFileSync(
			join(TEMPLATES_DIR, "tags-index.html"),
			`<main>
<h2>All Tags</h2>
{{TAGS}}
</main>`,
		);

		writeFileSync(
			join(TEMPLATES_DIR, "archive.html"),
			`<main>
<h2>Archive</h2>
<p>{{POST_COUNT}} post{{POST_COUNT_PLURAL}} total</p>
{{CONTENT}}
</main>`,
		);
	});

	afterAll(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
	});

	describe("formatDate", () => {
		test("should format date as 'Month D, YYYY'", () => {
			expect(formatDate("2025-01-15")).toBe("January 15, 2025");
			expect(formatDate("2025-11-24")).toBe("November 24, 2025");
			expect(formatDate("2025-12-01")).toBe("December 1, 2025");
		});

		test("should handle ISO date strings", () => {
			expect(formatDate("2025-01-15T12:00:00Z")).toBe("January 15, 2025");
		});
	});

	describe("toISODate", () => {
		test("should return YYYY-MM-DD format", () => {
			expect(toISODate("2025-01-15")).toBe("2025-01-15");
			expect(toISODate("November 24, 2025")).toBe("2025-11-24");
		});
	});

	describe("readTemplate", () => {
		test("should read template file content", async () => {
			const content = await readTemplate("base.html", TEMPLATES_DIR);

			expect(content).toContain("<!DOCTYPE html>");
			expect(content).toContain("{{TITLE}}");
		});
	});

	describe("processIncludes", () => {
		test("should replace include directive with file content", async () => {
			const content = "<script>{{INCLUDE:scripts/test.js}}</script>";
			const result = await processIncludes(content, TEST_DIR);

			expect(result).toBe("<script>console.log('test');</script>");
		});

		test("should handle multiple includes", async () => {
			const content =
				"<script>{{INCLUDE:scripts/test.js}}</script><script>{{INCLUDE:scripts/other.js}}</script>";
			const result = await processIncludes(content, TEST_DIR);

			expect(result).toBe(
				"<script>console.log('test');</script><script>alert('hello');</script>",
			);
		});

		test("should return content unchanged when no includes", async () => {
			const content = "<p>No includes here</p>";
			const result = await processIncludes(content, TEST_DIR);

			expect(result).toBe(content);
		});

		test("should trim whitespace in include path", async () => {
			const content = "<script>{{INCLUDE: scripts/test.js }}</script>";
			const result = await processIncludes(content, TEST_DIR);

			expect(result).toBe("<script>console.log('test');</script>");
		});
	});

	describe("applyBaseTemplate", () => {
		test("should replace title and content placeholders", async () => {
			const result = await applyBaseTemplate(
				"<p>Hello</p>",
				"Test Title",
				"Test description",
				{},
				TEMPLATES_DIR,
			);

			expect(result).toContain("<title>Test Title</title>");
			expect(result).toContain('content="Test description"');
			expect(result).toContain("<p>Hello</p>");
		});

		test("should replace asset paths with hashed versions", async () => {
			writeFileSync(
				join(TEMPLATES_DIR, "base-assets.html"),
				`<link href="/static/style.css">`,
			);

			const assetMap = { "/static/style.css": "/static/style-abc123.css" };
			const baseContent = await readTemplate("base-assets.html", TEMPLATES_DIR);

			let result = baseContent;
			for (const [original, hashed] of Object.entries(assetMap)) {
				result = result.replace(original, hashed);
			}

			expect(result).toContain("/static/style-abc123.css");
			expect(result).not.toContain("/static/style.css");
		});
	});

	describe("renderPostListItem", () => {
		const post: Post = {
			frontmatter: {
				title: "Test Post",
				date: "2025-01-15",
				slug: "test-post",
				description: "A test post description",
			},
			content: "",
			html: "",
			slug: "test-post",
			sourceDir: null,
			draft: false,
		};

		test("should render post with h3 by default", () => {
			const html = renderPostListItem(post);

			expect(html).toContain("<h3>Test Post</h3>");
			expect(html).toContain('href="/posts/test-post/"');
			expect(html).toContain("January 15, 2025");
		});

		test("should render with h4 when specified", () => {
			const html = renderPostListItem(post, "h4");

			expect(html).toContain("<h4>Test Post</h4>");
		});

		test("should include description by default", () => {
			const html = renderPostListItem(post);

			expect(html).toContain("A test post description");
			expect(html).toContain('class="post-description"');
		});

		test("should hide description when showDescription is false", () => {
			const html = renderPostListItem(post, "h3", false);

			expect(html).not.toContain("A test post description");
		});

		test("should handle post without description", () => {
			const postNoDesc: Post = {
				...post,
				frontmatter: { ...post.frontmatter, description: undefined },
			};
			const html = renderPostListItem(postNoDesc);

			expect(html).not.toContain('class="post-description"');
		});
	});

	describe("generatePostPage", () => {
		test("should generate post page with all placeholders replaced", async () => {
			const post: Post = {
				frontmatter: {
					title: "My Post",
					date: "2025-01-15",
					slug: "my-post",
					tags: ["dev", "typescript"],
					description: "Post description",
				},
				content: "",
				html: "<p>Post content here</p>",
				slug: "my-post",
				sourceDir: null,
				draft: false,
			};

			const html = await generatePostPage(post, {}, TEMPLATES_DIR);

			expect(html).toContain("<title>My Post</title>");
			expect(html).toContain("<h2>My Post</h2>");
			expect(html).toContain("January 15, 2025");
			expect(html).toContain('datetime="2025-01-15"');
			expect(html).toContain("<p>Post content here</p>");
			expect(html).toContain('href="/tags/dev/"');
			expect(html).toContain('href="/tags/typescript/"');
		});

		test("should show draft warning for draft posts", async () => {
			const post: Post = {
				frontmatter: {
					title: "Draft Post",
					date: "2025-01-15",
					slug: "draft-post",
				},
				content: "",
				html: "<p>Draft</p>",
				slug: "draft-post",
				sourceDir: null,
				draft: true,
			};

			const html = await generatePostPage(post, {}, TEMPLATES_DIR);

			expect(html).toContain('class="draft-warning"');
		});

		test("should hide draft warning for published posts", async () => {
			const post: Post = {
				frontmatter: {
					title: "Published Post",
					date: "2025-01-15",
					slug: "published",
				},
				content: "",
				html: "<p>Published</p>",
				slug: "published",
				sourceDir: null,
				draft: false,
			};

			const html = await generatePostPage(post, {}, TEMPLATES_DIR);

			expect(html).not.toContain("draft-warning");
		});

		test("should hide tags section when post has no tags", async () => {
			const post: Post = {
				frontmatter: {
					title: "No Tags",
					date: "2025-01-15",
					slug: "no-tags",
				},
				content: "",
				html: "<p>No tags</p>",
				slug: "no-tags",
				sourceDir: null,
				draft: false,
			};

			const html = await generatePostPage(post, {}, TEMPLATES_DIR);

			expect(html).not.toContain('class="tags"');
		});
	});

	describe("generateSimplePage", () => {
		test("should generate page with title and content", async () => {
			const page: Page = {
				frontmatter: {
					title: "About",
					slug: "about",
				},
				content: "",
				html: "<p>About page content</p>",
				slug: "about",
			};

			const html = await generateSimplePage(page, {}, TEMPLATES_DIR);

			expect(html).toContain("<title>About</title>");
			expect(html).toContain("<h2>About</h2>");
			expect(html).toContain("<p>About page content</p>");
			expect(html).toContain('class="page"');
		});
	});

	describe("generateIndexPage", () => {
		test("should generate index with post list", async () => {
			const posts: Post[] = [
				{
					frontmatter: {
						title: "First Post",
						date: "2025-01-15",
						slug: "first",
					},
					content: "",
					html: "",
					slug: "first",
					sourceDir: null,
					draft: false,
				},
			];

			const html = await generateIndexPage(posts, {}, TEMPLATES_DIR);

			expect(html).toContain("First Post");
			expect(html).toContain('href="/posts/first/"');
		});

		test("should show 'View all posts' when more than limit", async () => {
			// Create 11 posts (more than HOMEPAGE_POST_LIMIT of 10)
			const posts: Post[] = Array.from({ length: 11 }, (_, i) => ({
				frontmatter: {
					title: `Post ${i}`,
					date: `2025-01-${String(i + 1).padStart(2, "0")}`,
					slug: `post-${i}`,
				},
				content: "",
				html: "",
				slug: `post-${i}`,
				sourceDir: null,
				draft: false,
			}));

			const html = await generateIndexPage(posts, {}, TEMPLATES_DIR);

			expect(html).toContain('href="/archive/"');
			expect(html).toContain("View all posts");
		});

		test("should hide 'View all posts' when at or below limit", async () => {
			const posts: Post[] = [
				{
					frontmatter: { title: "One", date: "2025-01-15", slug: "one" },
					content: "",
					html: "",
					slug: "one",
					sourceDir: null,
					draft: false,
				},
			];

			const html = await generateIndexPage(posts, {}, TEMPLATES_DIR);

			expect(html).not.toContain("View all posts");
		});
	});

	describe("generateTagPage", () => {
		test("should generate tag page with posts", async () => {
			const posts: Post[] = [
				{
					frontmatter: {
						title: "Tagged Post",
						date: "2025-01-15",
						slug: "tagged",
						tags: ["dev"],
					},
					content: "",
					html: "",
					slug: "tagged",
					sourceDir: null,
					draft: false,
				},
			];

			const html = await generateTagPage("dev", posts, {}, TEMPLATES_DIR);

			expect(html).toContain('Posts tagged with "dev"');
			expect(html).toContain("1 post");
			expect(html).toContain("Tagged Post");
		});

		test("should pluralize post count correctly", async () => {
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

			const html = await generateTagPage("dev", posts, {}, TEMPLATES_DIR);

			expect(html).toContain("2 posts");
		});
	});

	describe("generateTagsIndexPage", () => {
		test("should list all tags with counts", async () => {
			const tags = ["dev", "typescript"];
			const posts: Post[] = [
				{
					frontmatter: {
						title: "One",
						date: "2025-01-15",
						slug: "one",
						tags: ["dev"],
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
						tags: ["dev", "typescript"],
					},
					content: "",
					html: "",
					slug: "two",
					sourceDir: null,
					draft: false,
				},
			];

			const html = await generateTagsIndexPage(tags, posts, {}, TEMPLATES_DIR);

			expect(html).toContain('href="/tags/dev/"');
			expect(html).toContain('href="/tags/typescript/"');
			expect(html).toContain("2 posts"); // dev has 2 posts
			expect(html).toContain("1 post"); // typescript has 1 post
		});
	});

	describe("generateArchivePage", () => {
		test("should group posts by year and month", async () => {
			const posts: Post[] = [
				{
					frontmatter: { title: "Jan Post", date: "2025-01-15", slug: "jan" },
					content: "",
					html: "",
					slug: "jan",
					sourceDir: null,
					draft: false,
				},
				{
					frontmatter: { title: "Feb Post", date: "2025-02-10", slug: "feb" },
					content: "",
					html: "",
					slug: "feb",
					sourceDir: null,
					draft: false,
				},
			];

			const html = await generateArchivePage(posts, {}, TEMPLATES_DIR);

			expect(html).toContain("2025");
			expect(html).toContain("January");
			expect(html).toContain("February");
			expect(html).toContain("Jan Post");
			expect(html).toContain("Feb Post");
			expect(html).toContain("2 posts total");
		});

		test("should show correct post count", async () => {
			const posts: Post[] = [
				{
					frontmatter: { title: "One", date: "2025-01-15", slug: "one" },
					content: "",
					html: "",
					slug: "one",
					sourceDir: null,
					draft: false,
				},
			];

			const html = await generateArchivePage(posts, {}, TEMPLATES_DIR);

			expect(html).toContain("1 post total");
		});
	});
});
