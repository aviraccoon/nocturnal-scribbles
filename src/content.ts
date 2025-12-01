/**
 * Content reading and processing for posts and pages.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked, PAGES_DIR, POSTS_DIR } from "./config";
import { processHtml } from "./markdown";
import type { Page, PageFrontmatter, Post, PostFrontmatter } from "./types";

/**
 * Reads all markdown posts from the posts directory, parses frontmatter and content,
 * and sorts by date (newest first). Includes drafts for preview access via direct URL.
 * Supports both flat files and directories with index.md.
 */
export async function readPosts(postsDir = POSTS_DIR): Promise<Post[]> {
	if (!existsSync(postsDir)) {
		return [];
	}

	const entries = readdirSync(postsDir);
	const posts: Post[] = [];

	for (const entry of entries) {
		const entryPath = join(postsDir, entry);
		const stat = statSync(entryPath);

		let filePath: string;
		let sourceDir: string | null = null;

		if (stat.isDirectory()) {
			// Directory-based post: look for index.md
			const indexPath = join(entryPath, "index.md");
			if (await Bun.file(indexPath).exists()) {
				filePath = indexPath;
				sourceDir = entryPath;
			} else {
				continue;
			}
		} else if (entry.endsWith(".md")) {
			// Flat file post
			filePath = entryPath;
		} else {
			// Skip non-markdown files
			continue;
		}

		const fileContent = await Bun.file(filePath).text();
		const { data, content } = matter(fileContent);

		const frontmatter = data as PostFrontmatter;

		const rawHtml = await marked.parse(content);
		const html = processHtml(rawHtml);

		posts.push({
			frontmatter,
			content,
			html,
			slug: frontmatter.slug,
			sourceDir,
			draft: frontmatter.draft === true,
		});
	}

	// Sort by date, newest first
	posts.sort(
		(a, b) =>
			new Date(b.frontmatter.date).getTime() -
			new Date(a.frontmatter.date).getTime(),
	);

	return posts;
}

/**
 * Reads all markdown pages from the pages directory and parses frontmatter and content.
 */
export async function readPages(pagesDir = PAGES_DIR): Promise<Page[]> {
	if (!existsSync(pagesDir)) {
		return [];
	}

	const entries = readdirSync(pagesDir);
	const pages: Page[] = [];

	for (const entry of entries) {
		if (!entry.endsWith(".md")) {
			continue;
		}

		const filePath = join(pagesDir, entry);
		const fileContent = await Bun.file(filePath).text();
		const { data, content } = matter(fileContent);

		const frontmatter = data as PageFrontmatter;

		const rawHtml = await marked.parse(content);
		const html = processHtml(rawHtml);

		pages.push({
			frontmatter,
			content,
			html,
			slug: frontmatter.slug,
		});
	}

	return pages;
}

/**
 * Filters posts to only include published (non-draft) posts.
 */
export function getPublishedPosts(posts: Post[]): Post[] {
	return posts.filter((post) => !post.draft);
}

/**
 * Collects all unique tags from a list of posts, sorted alphabetically.
 */
export function collectTags(posts: Post[]): string[] {
	const tagSet = new Set<string>();
	for (const post of posts) {
		if (post.frontmatter.tags) {
			for (const tag of post.frontmatter.tags) {
				tagSet.add(tag);
			}
		}
	}
	return Array.from(tagSet).sort();
}

/**
 * Validates that all posts have unique slugs. Throws an error listing duplicates.
 */
export function validatePostSlugs(posts: Post[]): void {
	const seen = new Map<string, string>();
	const duplicates: string[] = [];

	for (const post of posts) {
		const existing = seen.get(post.slug);
		if (existing) {
			duplicates.push(
				`"${post.slug}" in "${post.frontmatter.title}" (already used by "${existing}")`,
			);
		} else {
			seen.set(post.slug, post.frontmatter.title);
		}
	}

	if (duplicates.length > 0) {
		throw new Error(
			`Duplicate post slugs found:\n  ${duplicates.join("\n  ")}`,
		);
	}
}

/**
 * Validates that all pages have unique slugs. Throws an error listing duplicates.
 */
export function validatePageSlugs(pages: Page[]): void {
	const seen = new Map<string, string>();
	const duplicates: string[] = [];

	for (const page of pages) {
		const existing = seen.get(page.slug);
		if (existing) {
			duplicates.push(
				`"${page.slug}" in "${page.frontmatter.title}" (already used by "${existing}")`,
			);
		} else {
			seen.set(page.slug, page.frontmatter.title);
		}
	}

	if (duplicates.length > 0) {
		throw new Error(
			`Duplicate page slugs found:\n  ${duplicates.join("\n  ")}`,
		);
	}
}

/**
 * Groups posts by year and month for archive display.
 * Returns a nested map: year -> month -> posts[]
 */
export function groupPostsByYearMonth(
	posts: Post[],
): Map<number, Map<number, Post[]>> {
	const grouped = new Map<number, Map<number, Post[]>>();

	for (const post of posts) {
		const date = new Date(post.frontmatter.date);
		const year = date.getFullYear();
		const month = date.getMonth();

		if (!grouped.has(year)) {
			grouped.set(year, new Map());
		}

		const yearMap = grouped.get(year);
		if (yearMap && !yearMap.has(month)) {
			yearMap.set(month, []);
		}

		yearMap?.get(month)?.push(post);
	}

	return grouped;
}
