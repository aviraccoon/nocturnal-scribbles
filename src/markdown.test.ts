import { describe, expect, test } from "bun:test";
import {
	addHeadingAnchors,
	injectFootnoteTooltips,
	makeImagesClickable,
	processExternalLinks,
	processHtml,
} from "./markdown";

describe("markdown", () => {
	describe("makeImagesClickable", () => {
		test("should wrap images in anchor tags", () => {
			const html = '<img src="photo.jpg" alt="A photo">';
			const result = makeImagesClickable(html);

			expect(result).toContain('<a href="photo.jpg" target="_blank">');
			expect(result).toContain("</a>");
		});

		test("should add lazy loading attribute", () => {
			const html = '<img src="photo.jpg" alt="A photo">';
			const result = makeImagesClickable(html);

			expect(result).toContain('loading="lazy"');
		});

		test("should handle images with double quotes in src", () => {
			const html = '<img src="path/to/image.png" alt="Test">';
			const result = makeImagesClickable(html);

			expect(result).toContain('<a href="path/to/image.png"');
		});

		test("should handle images with single quotes in src", () => {
			const html = "<img src='photo.jpg' alt='A photo'>";
			const result = makeImagesClickable(html);

			expect(result).toContain('<a href="photo.jpg"');
		});

		test("should handle multiple images", () => {
			const html = '<img src="a.jpg"><img src="b.png">';
			const result = makeImagesClickable(html);

			expect(result).toContain('<a href="a.jpg"');
			expect(result).toContain('<a href="b.png"');
		});

		test("should preserve existing attributes", () => {
			const html = '<img src="photo.jpg" alt="A photo" class="featured">';
			const result = makeImagesClickable(html);

			expect(result).toContain('alt="A photo"');
			expect(result).toContain('class="featured"');
		});

		test("should not wrap images already inside anchor tags", () => {
			const html = '<a href="/page/"><img src="photo.jpg" alt="Linked"></a>';
			const result = makeImagesClickable(html);

			// Should not add another anchor wrapper (only one <a tag)
			const anchorCount = (result.match(/<a /g) || []).length;
			expect(anchorCount).toBe(1);
			expect(result).toContain('href="/page/"');
			// Should still add lazy loading
			expect(result).toContain('loading="lazy"');
		});

		test("should handle mixed linked and unlinked images", () => {
			const html =
				'<a href="/page/"><img src="linked.jpg"></a><img src="standalone.jpg">';
			const result = makeImagesClickable(html);

			// Linked image should keep original anchor
			expect(result).toContain('href="/page/"');
			// Standalone image should get wrapped
			expect(result).toContain('<a href="standalone.jpg"');
		});
	});

	describe("addHeadingAnchors", () => {
		test("should add anchor links to h3 headings", () => {
			const html = '<h3 id="section">Section Title</h3>';
			const result = addHeadingAnchors(html);

			expect(result).toContain('href="#section"');
			expect(result).toContain('class="heading-anchor"');
			expect(result).toContain('aria-hidden="true"');
			expect(result).toContain("#</a>");
		});

		test("should add anchor links to h4 headings", () => {
			const html = '<h4 id="subsection">Subsection</h4>';
			const result = addHeadingAnchors(html);

			expect(result).toContain('href="#subsection"');
		});

		test("should add anchor links to h5 and h6 headings", () => {
			const h5 = '<h5 id="small">Small</h5>';
			const h6 = '<h6 id="tiny">Tiny</h6>';

			expect(addHeadingAnchors(h5)).toContain('href="#small"');
			expect(addHeadingAnchors(h6)).toContain('href="#tiny"');
		});

		test("should not modify h1 or h2 headings", () => {
			const h1 = '<h1 id="title">Title</h1>';
			const h2 = '<h2 id="subtitle">Subtitle</h2>';

			expect(addHeadingAnchors(h1)).toBe(h1);
			expect(addHeadingAnchors(h2)).toBe(h2);
		});

		test("should handle headings without id", () => {
			const html = "<h3>No ID</h3>";
			const result = addHeadingAnchors(html);

			expect(result).toBe(html);
		});

		test("should handle multiple headings", () => {
			const html = '<h3 id="one">One</h3><h4 id="two">Two</h4>';
			const result = addHeadingAnchors(html);

			expect(result).toContain('href="#one"');
			expect(result).toContain('href="#two"');
		});

		test("should preserve heading content with inline elements", () => {
			const html = '<h3 id="code">Using <code>npm</code></h3>';
			const result = addHeadingAnchors(html);

			expect(result).toContain("Using <code>npm</code>");
			expect(result).toContain('href="#code"');
		});
	});

	describe("processExternalLinks", () => {
		test("should add target=_blank to https links", () => {
			const html = '<a href="https://example.com">Example</a>';
			const result = processExternalLinks(html);

			expect(result).toContain('target="_blank"');
			expect(result).toContain('rel="noopener"');
		});

		test("should add target=_blank to http links", () => {
			const html = '<a href="http://example.com">Example</a>';
			const result = processExternalLinks(html);

			expect(result).toContain('target="_blank"');
		});

		test("should not modify internal links starting with /", () => {
			const html = '<a href="/about/">About</a>';
			const result = processExternalLinks(html);

			expect(result).not.toContain("target=");
			expect(result).toBe(html);
		});

		test("should not modify anchor links starting with #", () => {
			const html = '<a href="#section">Jump</a>';
			const result = processExternalLinks(html);

			expect(result).not.toContain("target=");
			expect(result).toBe(html);
		});

		test("should handle multiple external links", () => {
			const html =
				'<a href="https://a.com">A</a> and <a href="https://b.com">B</a>';
			const result = processExternalLinks(html);

			const matches = result.match(/target="_blank"/g);
			expect(matches?.length).toBe(2);
		});

		test("should preserve existing attributes", () => {
			const html = '<a href="https://example.com" class="btn">Example</a>';
			const result = processExternalLinks(html);

			expect(result).toContain('class="btn"');
			expect(result).toContain('target="_blank"');
		});
	});

	describe("injectFootnoteTooltips", () => {
		test("should inject footnote content as data attribute", () => {
			const html = `
				<a id="footnote-ref-1" href="#footnote-1" data-footnote-ref>1</a>
				<li id="footnote-1"><p>Footnote content here. <a data-footnote-backref>↩</a></p></li>
			`;
			const result = injectFootnoteTooltips(html);

			expect(result).toContain('data-tooltip="Footnote content here."');
		});

		test("should escape quotes in footnote content", () => {
			const html = `
				<a id="footnote-ref-1" href="#footnote-1" data-footnote-ref>1</a>
				<li id="footnote-1"><p>Content with "quotes" here. <a data-footnote-backref>↩</a></p></li>
			`;
			const result = injectFootnoteTooltips(html);

			expect(result).toContain("&quot;quotes&quot;");
		});

		test("should escape HTML tags in footnote content", () => {
			const html = `
				<a id="footnote-ref-1" href="#footnote-1" data-footnote-ref>1</a>
				<li id="footnote-1"><p>The <code>&lt;marquee&gt;</code> element works. <a data-footnote-backref>↩</a></p></li>
			`;
			const result = injectFootnoteTooltips(html);

			// HTML tags should be escaped so they don't render in tooltip
			expect(result).toContain("&lt;code&gt;");
			expect(result).toContain("&lt;/code&gt;");
			expect(result).not.toContain('data-tooltip="The <code>');
		});

		test("should handle multiple footnotes", () => {
			const html = `
				<a id="footnote-ref-1" href="#footnote-1" data-footnote-ref>1</a>
				<a id="footnote-ref-2" href="#footnote-2" data-footnote-ref>2</a>
				<li id="footnote-1"><p>First note. <a data-footnote-backref>↩</a></p></li>
				<li id="footnote-2"><p>Second note. <a data-footnote-backref>↩</a></p></li>
			`;
			const result = injectFootnoteTooltips(html);

			expect(result).toContain('data-tooltip="First note."');
			expect(result).toContain('data-tooltip="Second note."');
		});

		test("should return unchanged html when no footnotes present", () => {
			const html = "<p>No footnotes here.</p>";
			const result = injectFootnoteTooltips(html);

			expect(result).toBe(html);
		});

		test("should leave footnote refs unchanged when definition not found", () => {
			// Reference exists but no matching definition
			const html = `
				<a id="footnote-ref-1" href="#footnote-1" data-footnote-ref>1</a>
				<a id="footnote-ref-2" href="#footnote-2" data-footnote-ref>2</a>
				<li id="footnote-1"><p>Only first note defined. <a data-footnote-backref>↩</a></p></li>
			`;
			const result = injectFootnoteTooltips(html);

			// First footnote should have data-tooltip attribute
			expect(result).toContain('data-tooltip="Only first note defined."');
			// Second footnote ref should be unchanged (no matching definition)
			expect(result).toContain(
				'id="footnote-ref-2" href="#footnote-2" data-footnote-ref',
			);
			expect(result).not.toMatch(/footnote-ref-2[^>]*data-tooltip="/);
		});

		test("should handle named footnotes", () => {
			const html = `
				<a id="footnote-ref-note-a" href="#footnote-note-a" data-footnote-ref>1</a>
				<a id="footnote-ref-note-b" href="#footnote-note-b" data-footnote-ref>2</a>
				<li id="footnote-note-a"><p>First named note. <a data-footnote-backref>↩</a></p></li>
				<li id="footnote-note-b"><p>Second named note. <a data-footnote-backref>↩</a></p></li>
			`;
			const result = injectFootnoteTooltips(html);

			expect(result).toContain('data-tooltip="First named note."');
			expect(result).toContain('data-tooltip="Second named note."');
		});

		test("should handle mixed numbered and named footnotes", () => {
			const html = `
				<a id="footnote-ref-1" href="#footnote-1" data-footnote-ref>1</a>
				<a id="footnote-ref-named" href="#footnote-named" data-footnote-ref>2</a>
				<li id="footnote-1"><p>Numbered footnote. <a data-footnote-backref>↩</a></p></li>
				<li id="footnote-named"><p>Named footnote. <a data-footnote-backref>↩</a></p></li>
			`;
			const result = injectFootnoteTooltips(html);

			expect(result).toContain('data-tooltip="Numbered footnote."');
			expect(result).toContain('data-tooltip="Named footnote."');
		});
	});

	describe("processHtml", () => {
		test("should apply all transformations", () => {
			const html = `
				<img src="photo.jpg" alt="Photo">
				<h3 id="section">Section</h3>
				<a href="https://example.com">External</a>
			`;
			const result = processHtml(html);

			// Images should be clickable with lazy loading
			expect(result).toContain('<a href="photo.jpg"');
			expect(result).toContain('loading="lazy"');

			// Headings should have anchors
			expect(result).toContain('href="#section"');
			expect(result).toContain('class="heading-anchor"');

			// External links should open in new tab
			expect(result).toContain('target="_blank"');
			expect(result).toContain('rel="noopener"');
		});

		test("should process in correct order without conflicts", () => {
			const html = '<h3 id="images">Images <img src="a.jpg"></h3>';
			const result = processHtml(html);

			// Both transformations should work
			expect(result).toContain('href="#images"');
			expect(result).toContain('<a href="a.jpg"');
		});
	});
});
