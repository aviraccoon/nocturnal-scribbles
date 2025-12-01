/**
 * Static asset handling with content hashing for cache busting.
 */

import { cpSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { StaticAssetMap } from "./types";

/**
 * Hashes file content and returns a short hash string (8 characters).
 */
function hashContent(content: string | Buffer): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(content);
	const hash = hasher.digest("hex");
	return hash.slice(0, 8);
}

/**
 * Copies static files with content hashing for cache busting.
 * Returns a mapping of original paths to hashed paths.
 *
 * @example
 * // Returns { "/static/style.css": "/static/style-abc12345.css" }
 */
export async function copyStaticWithHashing(
	sourceDir: string,
	destDir: string,
): Promise<StaticAssetMap> {
	const assetMap: StaticAssetMap = {};
	const entries = readdirSync(sourceDir);

	for (const entry of entries) {
		const sourcePath = join(sourceDir, entry);
		const stat = statSync(sourcePath);

		if (stat.isFile()) {
			// Read file and generate hash
			const fileContent = await Bun.file(sourcePath).arrayBuffer();
			const hash = hashContent(Buffer.from(fileContent));

			// Generate hashed filename: style.css -> style-abc12345.css
			const ext = extname(entry);
			const name = basename(entry, ext);
			const hashedName = `${name}-${hash}${ext}`;

			// Copy with hashed name
			const destPath = join(destDir, hashedName);
			await Bun.write(destPath, fileContent);

			// Store mapping: /static/style.css -> /static/style-abc12345.css
			const originalPath = `/static/${entry}`;
			const hashedPath = `/static/${hashedName}`;
			assetMap[originalPath] = hashedPath;
		}
	}

	return assetMap;
}

/**
 * Copies files from public/ to dist root without modification.
 * Used for files like CNAME, robots.txt, favicon.ico, etc.
 */
export async function copyPublicFiles(
	sourceDir: string,
	destDir: string,
): Promise<void> {
	const entries = readdirSync(sourceDir);

	for (const entry of entries) {
		const sourcePath = join(sourceDir, entry);
		const stat = statSync(sourcePath);

		if (stat.isFile()) {
			cpSync(sourcePath, join(destDir, entry));
		}
	}
}

/**
 * Copies all assets (non-markdown files) from a post directory to the output directory.
 * Used for posts that include images or other media.
 */
export async function copyPostAssets(
	sourceDir: string,
	destDir: string,
): Promise<void> {
	const entries = readdirSync(sourceDir);

	for (const entry of entries) {
		// Skip index.md and any other markdown files
		if (entry.endsWith(".md")) {
			continue;
		}

		const sourcePath = join(sourceDir, entry);
		const destPath = join(destDir, entry);
		const stat = statSync(sourcePath);

		if (stat.isFile()) {
			cpSync(sourcePath, destPath);
		}
	}
}
