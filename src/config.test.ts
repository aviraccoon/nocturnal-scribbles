import { describe, expect, test } from "bun:test";
import {
	CONTENT_TYPES,
	DIST_DIR,
	HOMEPAGE_POST_LIMIT,
	marked,
	PAGES_DIR,
	POSTS_DIR,
	STATIC_DIR,
	TEMPLATES_DIR,
	WATCH_DIRS,
} from "./config";

describe("config", () => {
	describe("directory constants", () => {
		test("POSTS_DIR should be 'posts'", () => {
			expect(POSTS_DIR).toBe("posts");
		});

		test("PAGES_DIR should be 'pages'", () => {
			expect(PAGES_DIR).toBe("pages");
		});

		test("TEMPLATES_DIR should be 'templates'", () => {
			expect(TEMPLATES_DIR).toBe("templates");
		});

		test("STATIC_DIR should be 'static'", () => {
			expect(STATIC_DIR).toBe("static");
		});

		test("DIST_DIR should be 'dist'", () => {
			expect(DIST_DIR).toBe("dist");
		});
	});

	describe("HOMEPAGE_POST_LIMIT", () => {
		test("should be 10", () => {
			expect(HOMEPAGE_POST_LIMIT).toBe(10);
		});
	});

	describe("WATCH_DIRS", () => {
		test("should include all content directories", () => {
			expect(WATCH_DIRS).toContain("posts");
			expect(WATCH_DIRS).toContain("pages");
			expect(WATCH_DIRS).toContain("templates");
			expect(WATCH_DIRS).toContain("static");
			expect(WATCH_DIRS).toContain("src");
		});
	});

	describe("CONTENT_TYPES", () => {
		test("should map html to text/html with charset", () => {
			expect(CONTENT_TYPES.html).toBe("text/html; charset=utf-8");
		});

		test("should map css to text/css with charset", () => {
			expect(CONTENT_TYPES.css).toBe("text/css; charset=utf-8");
		});

		test("should map js to application/javascript with charset", () => {
			expect(CONTENT_TYPES.js).toBe("application/javascript; charset=utf-8");
		});

		test("should map json to application/json", () => {
			expect(CONTENT_TYPES.json).toBe("application/json");
		});

		test("should map image extensions correctly", () => {
			expect(CONTENT_TYPES.png).toBe("image/png");
			expect(CONTENT_TYPES.jpg).toBe("image/jpeg");
			expect(CONTENT_TYPES.jpeg).toBe("image/jpeg");
			expect(CONTENT_TYPES.gif).toBe("image/gif");
			expect(CONTENT_TYPES.svg).toBe("image/svg+xml");
			expect(CONTENT_TYPES.ico).toBe("image/x-icon");
		});

		test("should map xml to application/xml", () => {
			expect(CONTENT_TYPES.xml).toBe("application/xml");
		});
	});

	describe("marked instance", () => {
		test("should be configured and parse markdown", async () => {
			const result = await marked.parse("**bold** text");

			expect(result).toContain("<strong>bold</strong>");
		});

		test("should shift heading levels (h1 -> h3)", async () => {
			const result = await marked.parse("# Heading 1");

			expect(result).toContain("<h3");
			expect(result).not.toContain("<h1");
		});

		test("should shift heading levels (h2 -> h4)", async () => {
			const result = await marked.parse("## Heading 2");

			expect(result).toContain("<h4");
			expect(result).not.toContain("<h2");
		});

		test("should cap heading at h6", async () => {
			const result = await marked.parse("##### Heading 5");

			// h5 + 2 = h7, but capped at h6
			expect(result).toContain("<h6");
		});

		test("should add IDs to headings (GFM heading ID)", async () => {
			const result = await marked.parse("# Test Heading");

			expect(result).toContain('id="test-heading"');
		});

		test("should parse footnotes", async () => {
			const result = await marked.parse(
				"Text with footnote[^1].\n\n[^1]: Footnote content.",
			);

			expect(result).toContain("footnote");
			expect(result).toContain("Footnote content");
		});
	});
});
