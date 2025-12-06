/**
 * JavaScript bundling and transpilation using Bun.build.
 */

import { mkdirSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

type BundleResult = {
	/** Original path (e.g., "/static/geocities.js") */
	originalPath: string;
	/** Hashed path (e.g., "/static/geocities-abc12345.js") */
	hashedPath: string;
};

/**
 * Bundles the geocities theme modules into a single minified file.
 * Returns the hashed filename for asset mapping.
 */
export async function bundleGeocities(
	distStaticDir: string,
): Promise<BundleResult> {
	const entrypoint = join(import.meta.dir, "geocities/index.ts");

	const result = await Bun.build({
		entrypoints: [entrypoint],
		outdir: distStaticDir,
		naming: "geocities-[hash].[ext]",
		minify: true,
		target: "browser",
		format: "iife",
	});

	if (!result.success) {
		console.error("Bundle errors:", result.logs);
		throw new Error("Failed to bundle geocities theme");
	}

	const output = result.outputs[0];
	if (!output) {
		throw new Error("No output produced from geocities bundle");
	}
	const filename = basename(output.path);

	return {
		originalPath: "/static/geocities.js",
		hashedPath: `/static/${filename}`,
	};
}

/**
 * Bundles the standalone music player into a single minified file.
 * Returns the hashed filename for asset mapping.
 */
export async function bundleMusic(
	distStaticDir: string,
): Promise<BundleResult> {
	const entrypoint = join(import.meta.dir, "geocities/music-standalone.ts");

	const result = await Bun.build({
		entrypoints: [entrypoint],
		outdir: distStaticDir,
		naming: "music-[hash].[ext]",
		minify: true,
		target: "browser",
		format: "iife",
	});

	if (!result.success) {
		console.error("Bundle errors:", result.logs);
		throw new Error("Failed to bundle music player");
	}

	const output = result.outputs[0];
	if (!output) {
		throw new Error("No output produced from music bundle");
	}
	const filename = basename(output.path);

	return {
		originalPath: "/static/music.js",
		hashedPath: `/static/${filename}`,
	};
}

/**
 * Transpiles TypeScript files from src/scripts/ to .build/scripts/.
 * Each file is transpiled individually (not bundled) for inline inclusion.
 */
export async function transpileScripts(rootDir: string): Promise<void> {
	const srcDir = join(rootDir, "src/scripts");
	const outDir = join(rootDir, ".build/scripts");

	mkdirSync(outDir, { recursive: true });

	const files = readdirSync(srcDir).filter(
		(f) => f.endsWith(".ts") && !f.endsWith(".d.ts"),
	);

	for (const file of files) {
		const entrypoint = join(srcDir, file);
		const outName = file.replace(/\.ts$/, ".js");

		const result = await Bun.build({
			entrypoints: [entrypoint],
			outdir: outDir,
			naming: outName,
			minify: false,
			target: "browser",
			format: "iife",
		});

		if (!result.success) {
			console.error(`Failed to transpile ${file}:`, result.logs);
			throw new Error(`Failed to transpile ${file}`);
		}
	}
}
