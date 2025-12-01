/**
 * Type definitions for the static site generator.
 */

/** Frontmatter fields for blog posts */
type PostFrontmatter = {
	title: string;
	date: string;
	tags?: string[];
	slug: string;
	description?: string;
	draft?: boolean;
};

/** A parsed blog post with content and metadata */
type Post = {
	frontmatter: PostFrontmatter;
	/** Raw markdown content */
	content: string;
	/** Rendered HTML content */
	html: string;
	slug: string;
	/** Directory path for posts with assets (e.g., "posts/hello-world/"), null for flat files */
	sourceDir: string | null;
	/** Whether this post is a draft */
	draft: boolean;
};

/** Frontmatter fields for static pages */
type PageFrontmatter = {
	title: string;
	slug: string;
	date?: string;
	description?: string;
};

/** A parsed static page with content and metadata */
type Page = {
	frontmatter: PageFrontmatter;
	/** Raw markdown content */
	content: string;
	/** Rendered HTML content */
	html: string;
	slug: string;
};

/** Maps original static asset paths to hashed versions for cache busting */
type StaticAssetMap = Record<string, string>;

/** Options for the build process */
type BuildOptions = {
	postsDir?: string;
	pagesDir?: string;
	templatesDir?: string;
	staticDir?: string;
	publicDir?: string;
	distDir?: string;
};

export type {
	PostFrontmatter,
	Post,
	PageFrontmatter,
	Page,
	StaticAssetMap,
	BuildOptions,
};
