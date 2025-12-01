/**
 * Development server with file watching and auto-rebuild.
 */

import type { FSWatcher } from "node:fs";
import { watch } from "node:fs";
import { join } from "node:path";
import { CONTENT_TYPES, DIST_DIR, WATCH_DIRS } from "./config";

type DevServerOptions = {
	testMode?: boolean;
};

/**
 * Starts the development server with file watching and auto-rebuild.
 */
export async function startDevServer(options: DevServerOptions = {}) {
	console.log("🚀 Starting dev server...\n");

	// Initial build
	await runBuild();

	// Debounce rebuild to avoid multiple rapid rebuilds
	let rebuildTimeout: Timer | null = null;
	const debouncedRebuild = () => {
		if (rebuildTimeout) {
			clearTimeout(rebuildTimeout);
		}
		rebuildTimeout = setTimeout(async () => {
			await runBuild();
		}, 100);
	};

	// Set up file watchers
	const watchers = setupWatchers(debouncedRebuild);

	// Start server
	// In test mode, use port 0 (random available port) to avoid conflicts
	// In normal mode, use PORT env var or default 4269
	const port = options.testMode
		? 0
		: Number.parseInt(process.env.PORT || "4269", 10);
	const server = Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);
			return serveStaticFile(url.pathname);
		},
		error(error) {
			console.error("Server error:", error);
			return new Response("Internal Server Error", { status: 500 });
		},
	});

	console.log(`\n✨ Dev server running at ${server.url}`);
	console.log("Press Ctrl+C to stop\n");

	// Cleanup on exit
	process.on("SIGINT", () => {
		console.log("\n\n👋 Shutting down dev server...");
		for (const watcher of watchers) {
			watcher.close();
		}
		server.stop();
		process.exit(0);
	});

	return { server, watchers };
}

/**
 * Triggers a rebuild of the static site.
 * Uses dynamic import to ensure we get the latest version of the build module.
 */
async function runBuild() {
	console.log("\n🔨 Rebuilding...");
	// Use dynamic import with cache busting to get fresh module
	const { build } = await import(`./build.ts?t=${Date.now()}`);
	await build();
}

/**
 * Serves static files from the dist directory with appropriate content types.
 */
export async function serveStaticFile(
	pathname: string,
	distDir = DIST_DIR,
): Promise<Response> {
	// Handle root path
	if (pathname === "/") {
		pathname = "/index.html";
	}

	// Handle directory paths
	if (pathname.endsWith("/")) {
		pathname += "index.html";
	}

	// Build full file path
	const filePath = join(distDir, pathname);
	const file = Bun.file(filePath);

	// Check if file exists
	if (!(await file.exists())) {
		return new Response("404 Not Found", { status: 404 });
	}

	// Determine content type
	const ext = pathname.split(".").pop()?.toLowerCase();
	const contentType = CONTENT_TYPES[ext || ""] || "application/octet-stream";

	return new Response(file, {
		headers: {
			"Content-Type": contentType,
		},
	});
}

/**
 * Determines if a file change should trigger a rebuild.
 * Only rebuilds for content files (markdown, templates, styles, source code).
 * Excludes dev.ts and test files from triggering rebuilds.
 */
export function shouldRebuild(filename: string): boolean {
	const rebuildExtensions = [".md", ".html", ".css", ".js", ".json", ".ts"];
	const ext = `.${filename.toLowerCase().split(".").pop()}`;

	if (!rebuildExtensions.includes(ext)) {
		return false;
	}

	// Skip test files and dev.ts itself
	if (filename.endsWith(".test.ts") || filename.endsWith("dev.ts")) {
		return false;
	}

	return true;
}

/**
 * Sets up file watchers for posts, templates, static files, and source code.
 * Triggers rebuild when files change.
 */
export function setupWatchers(rebuild: () => void, watchDirs = WATCH_DIRS) {
	const watchers: FSWatcher[] = [];

	for (const dir of watchDirs) {
		try {
			const watcher = watch(
				dir,
				{ recursive: true },
				(_eventType, filename) => {
					if (filename && shouldRebuild(filename)) {
						console.log(`📝 Changed: ${dir}/${filename}`);
						rebuild();
					}
				},
			);
			watchers.push(watcher);
			console.log(`👀 Watching: ${dir}/`);
		} catch (error) {
			console.warn(`⚠️  Could not watch ${dir}/:`, error);
		}
	}

	return watchers;
}

// Run the dev server only if this is the main module
if (import.meta.main) {
	startDevServer().catch((error) => {
		console.error("Failed to start dev server:", error);
		process.exit(1);
	});
}
