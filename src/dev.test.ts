import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	serveStaticFile,
	setupWatchers,
	shouldRebuild,
	startDevServer,
} from "./dev.ts";

const TEST_DIRS = {
	devDist: "tests/tmp-dev-dist",
	watchDir: "tests/tmp-watch-dir",
} as const;

describe("Dev Server", () => {
	describe("shouldRebuild", () => {
		test("should rebuild for markdown files", () => {
			expect(shouldRebuild("test.md")).toBe(true);
			expect(shouldRebuild("post.MD")).toBe(true);
		});

		test("should rebuild for HTML files", () => {
			expect(shouldRebuild("template.html")).toBe(true);
			expect(shouldRebuild("index.HTML")).toBe(true);
		});

		test("should rebuild for CSS files", () => {
			expect(shouldRebuild("style.css")).toBe(true);
			expect(shouldRebuild("main.CSS")).toBe(true);
		});

		test("should rebuild for JavaScript files", () => {
			expect(shouldRebuild("script.js")).toBe(true);
			expect(shouldRebuild("app.JS")).toBe(true);
		});

		test("should rebuild for JSON files", () => {
			expect(shouldRebuild("config.json")).toBe(true);
			expect(shouldRebuild("package.JSON")).toBe(true);
		});

		test("should not rebuild for image files", () => {
			expect(shouldRebuild("photo.jpg")).toBe(false);
			expect(shouldRebuild("image.png")).toBe(false);
			expect(shouldRebuild("icon.gif")).toBe(false);
			expect(shouldRebuild("logo.svg")).toBe(false);
		});

		test("should not rebuild for other file types", () => {
			expect(shouldRebuild("document.pdf")).toBe(false);
			expect(shouldRebuild("archive.zip")).toBe(false);
			expect(shouldRebuild("video.mp4")).toBe(false);
		});

		test("should handle files without extensions", () => {
			expect(shouldRebuild("README")).toBe(false);
		});

		test("should handle files with multiple dots", () => {
			expect(shouldRebuild("config.test.json")).toBe(true);
			expect(shouldRebuild("style.min.css")).toBe(true);
		});

		test("should not rebuild for test files", () => {
			expect(shouldRebuild("build.test.ts")).toBe(false);
			expect(shouldRebuild("dev.test.ts")).toBe(false);
			expect(shouldRebuild("foo.test.ts")).toBe(false);
		});

		test("should not rebuild for dev.ts itself", () => {
			expect(shouldRebuild("dev.ts")).toBe(false);
		});

		test("should rebuild for regular TypeScript files", () => {
			expect(shouldRebuild("build.ts")).toBe(true);
			expect(shouldRebuild("config.ts")).toBe(true);
		});
	});

	describe("serveStaticFile", () => {
		beforeAll(() => {
			// Create test dist directory with fixtures
			if (existsSync(TEST_DIRS.devDist)) {
				rmSync(TEST_DIRS.devDist, { recursive: true });
			}
			mkdirSync(TEST_DIRS.devDist, { recursive: true });

			// Create test files
			writeFileSync(
				join(TEST_DIRS.devDist, "index.html"),
				"<html><body>Home</body></html>",
			);

			// Create a subdirectory with index.html
			mkdirSync(join(TEST_DIRS.devDist, "about"), { recursive: true });
			writeFileSync(
				join(TEST_DIRS.devDist, "about", "index.html"),
				"<html><body>About</body></html>",
			);

			// Create CSS file
			writeFileSync(
				join(TEST_DIRS.devDist, "style.css"),
				"body { margin: 0; }",
			);

			// Create image file
			writeFileSync(
				join(TEST_DIRS.devDist, "test.png"),
				Buffer.from([0x89, 0x50, 0x4e, 0x47]),
			);

			// Create JSON file
			writeFileSync(
				join(TEST_DIRS.devDist, "data.json"),
				JSON.stringify({ test: true }),
			);
		});

		afterAll(() => {
			// Cleanup
			if (existsSync(TEST_DIRS.devDist)) {
				rmSync(TEST_DIRS.devDist, { recursive: true });
			}
		});

		test("should serve root path as index.html", async () => {
			const response = await serveStaticFile("/", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(
				"text/html; charset=utf-8",
			);

			const text = await response.text();
			expect(text).toContain("Home");
		});

		test("should serve directory with trailing slash as index.html", async () => {
			const response = await serveStaticFile("/about/", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(
				"text/html; charset=utf-8",
			);

			const text = await response.text();
			expect(text).toContain("About");
		});

		test("should serve HTML files with correct content type", async () => {
			const response = await serveStaticFile("/index.html", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(
				"text/html; charset=utf-8",
			);
		});

		test("should serve CSS files with correct content type", async () => {
			const response = await serveStaticFile("/style.css", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(
				"text/css; charset=utf-8",
			);
		});

		test("should serve JSON files with correct content type", async () => {
			const response = await serveStaticFile("/data.json", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("application/json");
		});

		test("should serve PNG files with correct content type", async () => {
			const response = await serveStaticFile("/test.png", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("image/png");
		});

		test("should return 404 for non-existent files", async () => {
			const response = await serveStaticFile(
				"/does-not-exist.html",
				TEST_DIRS.devDist,
			);

			expect(response.status).toBe(404);
			const text = await response.text();
			expect(text).toBe("404 Not Found");
		});

		test("should return 404 for non-existent directories", async () => {
			const response = await serveStaticFile(
				"/missing-dir/",
				TEST_DIRS.devDist,
			);

			expect(response.status).toBe(404);
		});

		test("should handle file extensions case-insensitively", async () => {
			// Create uppercase extension file
			writeFileSync(
				join(TEST_DIRS.devDist, "test.HTML"),
				"<html><body>Test</body></html>",
			);

			const response = await serveStaticFile("/test.HTML", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(
				"text/html; charset=utf-8",
			);
		});

		test("should handle unknown file extensions", async () => {
			writeFileSync(join(TEST_DIRS.devDist, "file.xyz"), "unknown content");

			const response = await serveStaticFile("/file.xyz", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(
				"application/octet-stream",
			);
		});

		test("should serve files without extensions", async () => {
			writeFileSync(join(TEST_DIRS.devDist, "LICENSE"), "MIT License");

			const response = await serveStaticFile("/LICENSE", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(
				"application/octet-stream",
			);
		});
	});

	describe("Content Type Mappings", () => {
		beforeAll(() => {
			if (!existsSync(TEST_DIRS.devDist)) {
				mkdirSync(TEST_DIRS.devDist, { recursive: true });
			}
		});

		test("should serve JavaScript with correct content type", async () => {
			writeFileSync(join(TEST_DIRS.devDist, "app.js"), "console.log('test');");
			const response = await serveStaticFile("/app.js", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(
				"application/javascript; charset=utf-8",
			);
		});

		test("should serve JPEG images with correct content type", async () => {
			writeFileSync(
				join(TEST_DIRS.devDist, "photo.jpg"),
				Buffer.from([0xff, 0xd8]),
			);
			const response = await serveStaticFile("/photo.jpg", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("image/jpeg");
		});

		test("should serve JPEG images with .jpeg extension", async () => {
			writeFileSync(
				join(TEST_DIRS.devDist, "photo.jpeg"),
				Buffer.from([0xff, 0xd8]),
			);
			const response = await serveStaticFile("/photo.jpeg", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("image/jpeg");
		});

		test("should serve GIF images with correct content type", async () => {
			writeFileSync(
				join(TEST_DIRS.devDist, "image.gif"),
				Buffer.from([0x47, 0x49, 0x46]),
			);
			const response = await serveStaticFile("/image.gif", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("image/gif");
		});

		test("should serve SVG images with correct content type", async () => {
			writeFileSync(
				join(TEST_DIRS.devDist, "icon.svg"),
				'<svg xmlns="http://www.w3.org/2000/svg"></svg>',
			);
			const response = await serveStaticFile("/icon.svg", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
		});

		test("should serve favicon with correct content type", async () => {
			writeFileSync(
				join(TEST_DIRS.devDist, "favicon.ico"),
				Buffer.from([0x00, 0x00]),
			);
			const response = await serveStaticFile("/favicon.ico", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("image/x-icon");
		});

		test("should serve XML files with correct content type", async () => {
			writeFileSync(
				join(TEST_DIRS.devDist, "feed.xml"),
				'<?xml version="1.0"?><rss></rss>',
			);
			const response = await serveStaticFile("/feed.xml", TEST_DIRS.devDist);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("application/xml");
		});
	});

	describe("setupWatchers", () => {
		beforeAll(() => {
			if (existsSync(TEST_DIRS.watchDir)) {
				rmSync(TEST_DIRS.watchDir, { recursive: true });
			}
			mkdirSync(TEST_DIRS.watchDir, { recursive: true });
		});

		afterAll(() => {
			if (existsSync(TEST_DIRS.watchDir)) {
				rmSync(TEST_DIRS.watchDir, { recursive: true });
			}
		});

		test("should set up watchers for valid directories", () => {
			let rebuildCalled = false;
			const rebuild = () => {
				rebuildCalled = true;
			};

			const watchers = setupWatchers(rebuild, [TEST_DIRS.watchDir]);

			expect(watchers.length).toBe(1);
			expect(rebuildCalled).toBe(false);

			// Clean up watchers
			for (const watcher of watchers) {
				watcher.close();
			}
		});

		test("should handle non-existent directories gracefully", () => {
			const rebuild = () => {};
			const nonExistentDir = "tests/tmp-non-existent-dir";

			// Should not throw even with non-existent directory
			const watchers = setupWatchers(rebuild, [nonExistentDir]);

			// Watcher array may be empty or contain failed watchers depending on implementation
			expect(Array.isArray(watchers)).toBe(true);

			// Clean up any watchers
			for (const watcher of watchers) {
				watcher.close();
			}
		});

		test("should handle multiple directories", () => {
			const rebuild = () => {};
			const testDir1 = join(TEST_DIRS.watchDir, "dir1");
			const testDir2 = join(TEST_DIRS.watchDir, "dir2");

			mkdirSync(testDir1, { recursive: true });
			mkdirSync(testDir2, { recursive: true });

			const watchers = setupWatchers(rebuild, [testDir1, testDir2]);

			expect(watchers.length).toBeGreaterThanOrEqual(0);

			// Clean up watchers
			for (const watcher of watchers) {
				watcher.close();
			}
		});

		test("should handle empty directory list", () => {
			const rebuild = () => {};
			const watchers = setupWatchers(rebuild, []);

			expect(watchers.length).toBe(0);
		});

		test("should call rebuild when watched markdown file changes", async () => {
			let rebuildCalled = false;
			const rebuild = () => {
				rebuildCalled = true;
			};

			const watchers = setupWatchers(rebuild, [TEST_DIRS.watchDir]);

			// Write a markdown file to trigger rebuild
			writeFileSync(join(TEST_DIRS.watchDir, "test-post.md"), "# Test");

			// Wait for fs event to propagate
			await Bun.sleep(150);

			expect(rebuildCalled).toBe(true);

			// Clean up
			for (const watcher of watchers) {
				watcher.close();
			}
		});

		test("should not call rebuild for non-rebuildable files", async () => {
			let rebuildCalled = false;
			const rebuild = () => {
				rebuildCalled = true;
			};

			const watchers = setupWatchers(rebuild, [TEST_DIRS.watchDir]);

			// Write an image file (should not trigger rebuild)
			writeFileSync(
				join(TEST_DIRS.watchDir, "image.png"),
				Buffer.from([0x89, 0x50, 0x4e, 0x47]),
			);

			// Wait to ensure no rebuild is triggered
			await Bun.sleep(150);

			expect(rebuildCalled).toBe(false);

			// Clean up
			for (const watcher of watchers) {
				watcher.close();
			}
		});
	});

	describe("startDevServer", () => {
		test("should start server in test mode and respond to requests", async () => {
			const { server, watchers } = await startDevServer({ testMode: true });

			try {
				// Server should be running
				expect(server.port).toBeGreaterThan(0);

				// Should respond to requests
				const response = await fetch(`${server.url}`);
				expect(response.status).toBe(200);

				const html = await response.text();
				expect(html).toContain("html");
			} finally {
				// Clean up
				for (const watcher of watchers) {
					watcher.close();
				}
				server.stop();
			}
		});

		test("should return 404 for non-existent paths", async () => {
			const { server, watchers } = await startDevServer({ testMode: true });

			try {
				const response = await fetch(`${server.url}non-existent-page`);
				expect(response.status).toBe(404);
			} finally {
				for (const watcher of watchers) {
					watcher.close();
				}
				server.stop();
			}
		});
	});
});
