/**
 * HTML post-processing functions for rendered markdown content.
 */

/**
 * Wraps standalone images in anchor tags to make them clickable.
 * Also adds lazy loading for better performance.
 */
export function makeImagesClickable(html: string): string {
	return html.replace(
		/<img\s+([^>]*\bsrc=["']([^"']+)["'][^>]*)>/g,
		'<a href="$2" target="_blank"><img $1 loading="lazy"></a>',
	);
}

/**
 * Adds anchor links to headings with IDs for easy linking.
 * Shows a # symbol on hover that links to the heading.
 */
export function addHeadingAnchors(html: string): string {
	return html.replace(
		/<(h[3-6])\s+id="([^"]+)">([\s\S]*?)<\/\1>/g,
		'<$1 id="$2">$3 <a href="#$2" class="heading-anchor" aria-hidden="true">#</a></$1>',
	);
}

/**
 * Makes external links open in a new tab with security attributes.
 * External links are those starting with http:// or https://.
 */
export function processExternalLinks(html: string): string {
	return html.replace(
		/<a\s+href="(https?:\/\/[^"]+)"([^>]*)>/g,
		'<a href="$1" target="_blank" rel="noopener"$2>',
	);
}

/**
 * Extracts footnote content and injects it as data-tooltip attributes on references.
 * This enables tooltip display without scrolling to the footnotes section.
 */
export function injectFootnoteTooltips(html: string): string {
	// Extract footnote definitions: <li id="footnote-N"><p>Content... <a data-footnote-backref>↩</a></p></li>
	const footnotes = new Map<string, string>();
	const footnoteDefRegex =
		/<li id="(footnote-\d+)">\s*<p>([\s\S]*?)<a[^>]*data-footnote-backref[^>]*>[^<]*<\/a>\s*<\/p>\s*<\/li>/g;

	for (const match of html.matchAll(footnoteDefRegex)) {
		const id = match[1];
		const rawContent = match[2];
		if (id && rawContent) {
			footnotes.set(id, rawContent.trim());
		}
	}

	if (footnotes.size === 0) {
		return html;
	}

	// Inject data-tooltip attribute into each reference link
	return html.replace(
		/<a\s+id="(footnote-ref-\d+)"\s+href="#(footnote-\d+)"\s+data-footnote-ref/g,
		(fullMatch, refId, footnoteId) => {
			const content = footnotes.get(footnoteId);
			if (content) {
				// Escape quotes for HTML attribute
				const escaped = content.replace(/"/g, "&quot;");
				return `<a id="${refId}" href="#${footnoteId}" data-footnote-ref data-tooltip="${escaped}"`;
			}
			return fullMatch;
		},
	);
}

/**
 * Applies all HTML post-processing to rendered markdown.
 * Processes images, headings, external links, and footnotes.
 */
export function processHtml(html: string): string {
	let processed = html;
	processed = makeImagesClickable(processed);
	processed = addHeadingAnchors(processed);
	processed = processExternalLinks(processed);
	processed = injectFootnoteTooltips(processed);
	return processed;
}
