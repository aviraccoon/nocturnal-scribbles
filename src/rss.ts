/**
 * RSS feed generation for the blog.
 */

import { Feed } from "feed";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "./config";
import type { Post } from "./types";

/**
 * Creates a base Feed instance with common configuration.
 */
function createBaseFeed(
	title: string,
	description: string,
	id: string,
	feedUrl: string,
): Feed {
	return new Feed({
		title,
		description,
		id,
		link: id,
		language: "en",
		feedLinks: {
			rss: feedUrl,
		},
		copyright: "",
	});
}

/**
 * Adds a post to a feed instance.
 */
function addPostToFeed(feed: Feed, post: Post): void {
	feed.addItem({
		title: post.frontmatter.title,
		id: `${SITE_URL}/posts/${post.slug}/`,
		link: `${SITE_URL}/posts/${post.slug}/`,
		description: post.frontmatter.description || "",
		content: post.html,
		date: new Date(post.frontmatter.date),
		category: post.frontmatter.tags?.map((tag) => ({ name: tag })) || [],
	});
}

/**
 * Generates the main RSS feed with all published posts.
 */
export function generateRSSFeed(posts: Post[]): string {
	const feed = createBaseFeed(
		SITE_TITLE,
		SITE_DESCRIPTION,
		`${SITE_URL}/`,
		`${SITE_URL}/feed.xml`,
	);

	for (const post of posts) {
		addPostToFeed(feed, post);
	}

	return feed.rss2();
}

/**
 * Generates an RSS feed for a specific tag.
 */
export function generateTagRSSFeed(tag: string, posts: Post[]): string {
	const feed = createBaseFeed(
		`${SITE_TITLE} - ${tag}`,
		`Posts tagged with ${tag}`,
		`${SITE_URL}/tags/${tag}/`,
		`${SITE_URL}/tags/${tag}/feed.xml`,
	);

	for (const post of posts) {
		addPostToFeed(feed, post);
	}

	return feed.rss2();
}
