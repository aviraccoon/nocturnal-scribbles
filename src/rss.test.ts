import { describe, expect, test } from "bun:test";
import { generateRSSFeed, generateTagRSSFeed } from "./rss";
import type { Post } from "./types";

describe("rss", () => {
	const samplePost: Post = {
		frontmatter: {
			title: "Test Post",
			date: "2025-01-15",
			slug: "test-post",
			description: "A test post",
			tags: ["dev", "typescript"],
		},
		content: "Raw content",
		html: "<p>HTML content</p>",
		slug: "test-post",
		sourceDir: null,
		draft: false,
	};

	describe("generateRSSFeed", () => {
		test("should generate valid RSS XML", () => {
			const feed = generateRSSFeed([samplePost]);

			expect(feed).toContain('<?xml version="1.0"');
			expect(feed).toContain("<rss");
			expect(feed).toContain("<channel>");
		});

		test("should include site metadata", () => {
			const feed = generateRSSFeed([samplePost]);

			expect(feed).toContain("<title>aviraccoon's nocturnal scribbles</title>");
			expect(feed).toContain("<link>https://raccoon.land/</link>");
			expect(feed).toContain("<language>en</language>");
		});

		test("should include feed link", () => {
			const feed = generateRSSFeed([samplePost]);

			expect(feed).toContain("https://raccoon.land/feed.xml");
		});

		test("should include post items", () => {
			const feed = generateRSSFeed([samplePost]);

			expect(feed).toContain("<item>");
			// Title is CDATA wrapped
			expect(feed).toContain("<![CDATA[Test Post]]>");
			expect(feed).toContain(
				"<link>https://raccoon.land/posts/test-post/</link>",
			);
		});

		test("should include post description", () => {
			const feed = generateRSSFeed([samplePost]);

			// Description is CDATA wrapped
			expect(feed).toContain("<![CDATA[A test post]]>");
		});

		test("should include post HTML content", () => {
			const feed = generateRSSFeed([samplePost]);

			// Content is CDATA wrapped
			expect(feed).toContain("<p>HTML content</p>");
		});

		test("should include post categories from tags", () => {
			const feed = generateRSSFeed([samplePost]);

			expect(feed).toContain("<category>dev</category>");
			expect(feed).toContain("<category>typescript</category>");
		});

		test("should include post date", () => {
			const feed = generateRSSFeed([samplePost]);

			expect(feed).toContain("<pubDate>");
			expect(feed).toContain("2025");
		});

		test("should handle multiple posts", () => {
			const posts: Post[] = [
				samplePost,
				{
					...samplePost,
					frontmatter: { ...samplePost.frontmatter, title: "Second Post" },
					slug: "second-post",
				},
			];

			const feed = generateRSSFeed(posts);

			// Titles are CDATA wrapped
			expect(feed).toContain("<![CDATA[Test Post]]>");
			expect(feed).toContain("<![CDATA[Second Post]]>");
		});

		test("should handle posts without description", () => {
			const postNoDesc: Post = {
				...samplePost,
				frontmatter: { ...samplePost.frontmatter, description: undefined },
			};

			const feed = generateRSSFeed([postNoDesc]);

			// Should still include the item without description
			expect(feed).toContain("<item>");
			expect(feed).toContain("<![CDATA[Test Post]]>");
		});

		test("should handle posts without tags", () => {
			const postNoTags: Post = {
				...samplePost,
				frontmatter: { ...samplePost.frontmatter, tags: undefined },
			};

			const feed = generateRSSFeed([postNoTags]);

			expect(feed).not.toContain("<category>");
		});

		test("should handle empty posts array", () => {
			const feed = generateRSSFeed([]);

			expect(feed).toContain("<channel>");
			expect(feed).not.toContain("<item>");
		});
	});

	describe("generateTagRSSFeed", () => {
		test("should generate valid RSS XML", () => {
			const feed = generateTagRSSFeed("dev", [samplePost]);

			expect(feed).toContain('<?xml version="1.0"');
			expect(feed).toContain("<rss");
		});

		test("should include tag in title", () => {
			const feed = generateTagRSSFeed("dev", [samplePost]);

			expect(feed).toContain(
				"<title>aviraccoon's nocturnal scribbles - dev</title>",
			);
		});

		test("should include tag-specific description", () => {
			const feed = generateTagRSSFeed("typescript", [samplePost]);

			expect(feed).toContain("Posts tagged with typescript");
		});

		test("should include tag-specific link", () => {
			const feed = generateTagRSSFeed("dev", [samplePost]);

			expect(feed).toContain("<link>https://raccoon.land/tags/dev/</link>");
		});

		test("should include tag-specific feed link", () => {
			const feed = generateTagRSSFeed("dev", [samplePost]);

			expect(feed).toContain("https://raccoon.land/tags/dev/feed.xml");
		});

		test("should include post items", () => {
			const feed = generateTagRSSFeed("dev", [samplePost]);

			expect(feed).toContain("<item>");
			// Title is CDATA wrapped
			expect(feed).toContain("<![CDATA[Test Post]]>");
		});

		test("should handle empty posts array", () => {
			const feed = generateTagRSSFeed("dev", []);

			expect(feed).toContain("<channel>");
			expect(feed).not.toContain("<item>");
		});
	});
});
