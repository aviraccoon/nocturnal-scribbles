/**
 * Template reading and page generation functions.
 */

import { join } from "node:path";
import { format } from "date-fns";
import {
	HOMEPAGE_POST_LIMIT,
	ROOT_DIR,
	SITE_DESCRIPTION,
	SITE_TITLE,
	SITE_URL,
	TEMPLATES_DIR,
} from "./config";
import { groupPostsByYearMonth } from "./content";
import type { Page, Post, StaticAssetMap } from "./types";

/**
 * Processes {{INCLUDE:path}} directives in template content.
 * Paths are relative to the project root.
 */
export async function processIncludes(
	content: string,
	rootDir: string,
): Promise<string> {
	const includeRegex = /{{INCLUDE:([^}]+)}}/g;
	const matches = [...content.matchAll(includeRegex)];

	if (matches.length === 0) {
		return content;
	}

	let result = content;
	for (const match of matches) {
		const [fullMatch, includePath] = match;
		if (!includePath) continue;

		const filePath = join(rootDir, includePath.trim());
		const includeContent = await Bun.file(filePath).text();
		result = result.replace(fullMatch, includeContent);
	}

	return result;
}

/**
 * Formats a date string into human-readable format (e.g., "November 24, 2025").
 */
export function formatDate(dateString: string): string {
	return format(new Date(dateString), "MMMM d, yyyy");
}

/**
 * Converts a date string to ISO format (YYYY-MM-DD).
 */
export function toISODate(dateString: string): string {
	return new Date(dateString).toISOString().split("T")[0] ?? "";
}

/**
 * Reads an HTML template file from the templates directory.
 */
export async function readTemplate(
	name: string,
	templatesDir = TEMPLATES_DIR,
): Promise<string> {
	return Bun.file(join(templatesDir, name)).text();
}

/**
 * Extracts theme names from data-theme-btn attributes in HTML.
 * Uses data-theme-variants if present, otherwise uses the button value.
 * Filters out "system" and "chaos" as those aren't real themes.
 */
export function extractChaosThemes(html: string): string[] {
	const buttonRegex =
		/data-theme-btn="([^"]+)"(?:\s+data-theme-variants="([^"]+)")?/g;
	const themes: string[] = [];

	for (const match of html.matchAll(buttonRegex)) {
		const btnTheme = match[1];
		const variants = match[2];

		if (btnTheme === "system" || btnTheme === "chaos") continue;

		if (variants) {
			themes.push(...variants.split(","));
		} else if (btnTheme) {
			themes.push(btnTheme);
		}
	}

	return themes;
}

/**
 * Wraps content in the base HTML template with title and description.
 * Replaces static asset references with hashed versions.
 */
type BaseTemplateOptions = {
	content: string;
	title: string;
	description?: string;
	assetMap?: StaticAssetMap;
	templatesDir?: string;
	rootDir?: string;
	canonicalPath?: string;
	ogType?: "website" | "article";
	/** ISO date string for article:published_time (posts only) */
	publishedTime?: string;
};

export async function applyBaseTemplate(
	options: BaseTemplateOptions,
): Promise<string> {
	const {
		content,
		title,
		description = "",
		assetMap = {},
		templatesDir = TEMPLATES_DIR,
		rootDir = ROOT_DIR,
		canonicalPath = "/",
		ogType = "website",
		publishedTime,
	} = options;

	const articleMeta = publishedTime
		? `\n    <meta property="article:published_time" content="${publishedTime}">\n    <meta property="article:author" content="aviraccoon">`
		: "";

	let baseTemplate = await readTemplate("base.html", templatesDir);

	// Extract chaos themes before processing includes
	const chaosThemes = extractChaosThemes(baseTemplate);

	// Process {{INCLUDE:path}} directives
	baseTemplate = await processIncludes(baseTemplate, rootDir);

	// Inject chaos themes into scripts
	baseTemplate = baseTemplate.replace(
		"__CHAOS_THEMES__",
		chaosThemes.join(","),
	);

	// Replace static asset references with hashed versions
	for (const [original, hashed] of Object.entries(assetMap)) {
		baseTemplate = baseTemplate.replace(original, hashed);
	}

	return baseTemplate
		.replaceAll("{{TITLE}}", title)
		.replaceAll("{{DESCRIPTION}}", description)
		.replace("{{CONTENT}}", content)
		.replace("{{BUILD_TIME}}", new Date().toISOString())
		.replace("{{CANONICAL_URL}}", `${SITE_URL}${canonicalPath}`)
		.replace("{{OG_TYPE}}", ogType)
		.replace("{{SITE_TITLE}}", SITE_TITLE)
		.replace("{{SITE_URL}}", SITE_URL)
		.replace("{{ARTICLE_META}}", articleMeta);
}

/**
 * Renders a single post as a list item with title, date, and optional description.
 */
export function renderPostListItem(
	post: Post,
	headingLevel: "h3" | "h4" = "h3",
	showDescription = true,
): string {
	const formattedDate = formatDate(post.frontmatter.date);
	const description =
		showDescription && post.frontmatter.description
			? `<p class="post-description">${post.frontmatter.description}</p>`
			: "";
	const HeadingTag = headingLevel;

	return `
        <li>
            <a href="/posts/${post.slug}/">
                <${HeadingTag}>${post.frontmatter.title}</${HeadingTag}>
                <div class="post-meta">
                    <time datetime="${post.frontmatter.date}">${formattedDate}</time>
                </div>
                ${description}
            </a>
        </li>`;
}

/**
 * Generates a complete HTML page for a single blog post.
 */
export async function generatePostPage(
	post: Post,
	assetMap: StaticAssetMap,
	templatesDir = TEMPLATES_DIR,
): Promise<string> {
	const postTemplate = await readTemplate("post.html", templatesDir);

	const formattedDate = formatDate(post.frontmatter.date);
	const isoDate = toISODate(post.frontmatter.date);

	const tags = post.frontmatter.tags
		? post.frontmatter.tags
				.map((tag) => `<a href="/tags/${tag}/">${tag}</a>`)
				.join(" ")
		: "";

	let postHtml = postTemplate
		.replace("{{TITLE}}", post.frontmatter.title)
		.replace("{{DATE}}", formattedDate)
		.replace("{{DATE_ISO}}", isoDate)
		.replace("{{CONTENT}}", post.html);

	// Handle conditional draft warning
	if (post.draft) {
		postHtml = postHtml.replace("{{#DRAFT}}", "").replace("{{/DRAFT}}", "");
	} else {
		postHtml = postHtml.replace(/{{#DRAFT}}[\s\S]*?{{\/DRAFT}}/g, "");
	}

	// Handle conditional tags
	if (tags) {
		postHtml = postHtml.replace("{{#TAGS}}", "").replace("{{/TAGS}}", "");
		postHtml = postHtml.replace("{{TAGS}}", tags);
	} else {
		postHtml = postHtml.replace(/{{#TAGS}}[\s\S]*?{{\/TAGS}}/g, "");
	}

	return applyBaseTemplate({
		content: postHtml,
		title: post.frontmatter.title,
		description: post.frontmatter.description,
		assetMap,
		templatesDir,
		canonicalPath: `/posts/${post.slug}/`,
		ogType: "article",
		publishedTime: new Date(post.frontmatter.date).toISOString(),
	});
}

/**
 * Generates a complete HTML page for a simple page (like /now).
 */
export async function generateSimplePage(
	page: Page,
	assetMap: StaticAssetMap,
	templatesDir = TEMPLATES_DIR,
): Promise<string> {
	const pageTemplate = await readTemplate("page.html", templatesDir);

	const pageHtml = pageTemplate
		.replace("{{TITLE}}", page.frontmatter.title)
		.replace("{{CONTENT}}", page.html);

	return applyBaseTemplate({
		content: pageHtml,
		title: page.frontmatter.title,
		description: page.frontmatter.description,
		assetMap,
		templatesDir,
		canonicalPath: `/${page.slug}/`,
	});
}

/**
 * Generates the index page with a list of recent posts.
 */
export async function generateIndexPage(
	posts: Post[],
	assetMap: StaticAssetMap,
	templatesDir = TEMPLATES_DIR,
): Promise<string> {
	const indexTemplate = await readTemplate("index.html", templatesDir);

	// Limit to most recent posts
	const recentPosts = posts.slice(0, HOMEPAGE_POST_LIMIT);
	const postsList = recentPosts
		.map((post) => renderPostListItem(post))
		.join("\n");

	let indexContent = indexTemplate.replace(
		"{{POSTS}}",
		`<ul class="post-list">${postsList}</ul>`,
	);

	// Show "View all posts" link only if there are more posts than the limit
	if (posts.length > HOMEPAGE_POST_LIMIT) {
		indexContent = indexContent
			.replace("{{#MORE_POSTS}}", "")
			.replace("{{/MORE_POSTS}}", "");
	} else {
		indexContent = indexContent.replace(
			/{{#MORE_POSTS}}[\s\S]*?{{\/MORE_POSTS}}/g,
			"",
		);
	}

	return applyBaseTemplate({
		content: indexContent,
		title: "Home",
		description: SITE_DESCRIPTION,
		assetMap,
		templatesDir,
		canonicalPath: "/",
	});
}

/**
 * Generates a tag archive page with all posts for a specific tag.
 */
export async function generateTagPage(
	tag: string,
	posts: Post[],
	assetMap: StaticAssetMap,
	templatesDir = TEMPLATES_DIR,
): Promise<string> {
	const tagTemplate = await readTemplate("tag.html", templatesDir);

	const postsList = posts.map((post) => renderPostListItem(post)).join("\n");

	const postCount = posts.length;
	const postCountPlural = postCount !== 1 ? "s" : "";

	const tagContent = tagTemplate
		.replace(/{{TAG}}/g, tag)
		.replace("{{POST_COUNT}}", postCount.toString())
		.replace("{{POST_COUNT_PLURAL}}", postCountPlural)
		.replace("{{POSTS}}", `<ul class="post-list">${postsList}</ul>`);

	return applyBaseTemplate({
		content: tagContent,
		title: `Tag: ${tag}`,
		description: `Posts tagged with ${tag}`,
		assetMap,
		templatesDir,
		canonicalPath: `/tags/${tag}/`,
	});
}

/**
 * Generates the tags index page listing all tags with post counts.
 */
export async function generateTagsIndexPage(
	tags: string[],
	posts: Post[],
	assetMap: StaticAssetMap,
	templatesDir = TEMPLATES_DIR,
): Promise<string> {
	const tagsIndexTemplate = await readTemplate("tags-index.html", templatesDir);

	const tagsList = tags
		.map((tag) => {
			const postCount = posts.filter((post) =>
				post.frontmatter.tags?.includes(tag),
			).length;
			const postCountText = `${postCount} post${postCount !== 1 ? "s" : ""}`;
			return `<div class="tag-item"><a href="/tags/${tag}/"><span class="tag-name">${tag}</span> <span class="tag-count">(${postCountText})</span></a></div>`;
		})
		.join("\n");

	const tagsContent = tagsIndexTemplate.replace("{{TAGS}}", tagsList);

	return applyBaseTemplate({
		content: tagsContent,
		title: "Tags",
		description: "All tags used in posts",
		assetMap,
		templatesDir,
		canonicalPath: "/tags/",
	});
}

/**
 * Generates the archive page with posts grouped by year and month.
 */
export async function generateArchivePage(
	posts: Post[],
	assetMap: StaticAssetMap,
	templatesDir = TEMPLATES_DIR,
): Promise<string> {
	const archiveTemplate = await readTemplate("archive.html", templatesDir);

	const grouped = groupPostsByYearMonth(posts);
	const years = Array.from(grouped.keys()).sort((a, b) => b - a);

	const archiveContent = years
		.map((year) => {
			const months = grouped.get(year);
			if (!months) return "";

			const sortedMonths = Array.from(months.keys()).sort((a, b) => b - a);

			const monthsHtml = sortedMonths
				.map((monthIndex) => {
					const monthPosts = months.get(monthIndex);
					if (!monthPosts) return "";

					const monthName = format(new Date(year, monthIndex), "MMMM");

					const postsHtml = monthPosts
						.map((post) => renderPostListItem(post, "h4", false))
						.join("\n");

					return `
                <div class="archive-month">
                    <h3>${monthName}</h3>
                    <ul class="post-list">
                        ${postsHtml}
                    </ul>
                </div>`;
				})
				.join("\n");

			return `
            <section class="archive-year">
                <h2>${year}</h2>
                ${monthsHtml}
            </section>`;
		})
		.join("\n");

	const postCount = posts.length;
	const postCountPlural = postCount !== 1 ? "s" : "";

	const archiveHtml = archiveTemplate
		.replace("{{POST_COUNT}}", postCount.toString())
		.replace("{{POST_COUNT_PLURAL}}", postCountPlural)
		.replace("{{CONTENT}}", archiveContent);

	return applyBaseTemplate({
		content: archiveHtml,
		title: "Archive",
		description: "All posts organized by date",
		assetMap,
		templatesDir,
		canonicalPath: "/archive/",
	});
}
