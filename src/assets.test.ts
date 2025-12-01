import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
	copyPostAssets,
	copyPublicFiles,
	copyStaticWithHashing,
} from "./assets";

const TEST_DIR = "tests/tmp-assets-test";
const SOURCE_DIR = join(TEST_DIR, "source");
const DEST_DIR = join(TEST_DIR, "dest");

describe("assets", () => {
	beforeAll(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
		mkdirSync(SOURCE_DIR, { recursive: true });
		mkdirSync(DEST_DIR, { recursive: true });
	});

	afterAll(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
	});

	describe("copyStaticWithHashing", () => {
		test("should copy files with hash in filename", async () => {
			writeFileSync(join(SOURCE_DIR, "style.css"), "body { margin: 0; }");

			await copyStaticWithHashing(SOURCE_DIR, DEST_DIR);

			// Check that a hashed file was created
			const files = readdirSync(DEST_DIR);
			const cssFile = files.find(
				(f) => f.startsWith("style-") && f.endsWith(".css"),
			);

			expect(cssFile).toBeDefined();
			expect(cssFile).toMatch(/^style-[a-f0-9]{8}\.css$/);
		});

		test("should return asset map with original to hashed paths", async () => {
			writeFileSync(join(SOURCE_DIR, "app.js"), "console.log('test');");

			const assetMap = await copyStaticWithHashing(SOURCE_DIR, DEST_DIR);

			expect(assetMap["/static/app.js"]).toBeDefined();
			expect(assetMap["/static/app.js"]).toMatch(
				/^\/static\/app-[a-f0-9]{8}\.js$/,
			);
		});

		test("should generate different hashes for different content", async () => {
			writeFileSync(join(SOURCE_DIR, "a.txt"), "content A");
			writeFileSync(join(SOURCE_DIR, "b.txt"), "content B");

			const assetMap = await copyStaticWithHashing(SOURCE_DIR, DEST_DIR);

			const hashA = assetMap["/static/a.txt"]?.match(/-([a-f0-9]{8})\./)?.[1];
			const hashB = assetMap["/static/b.txt"]?.match(/-([a-f0-9]{8})\./)?.[1];

			expect(hashA).not.toBe(hashB);
		});

		test("should generate same hash for same content", async () => {
			writeFileSync(join(SOURCE_DIR, "same1.txt"), "identical content");
			writeFileSync(join(SOURCE_DIR, "same2.txt"), "identical content");

			const assetMap = await copyStaticWithHashing(SOURCE_DIR, DEST_DIR);

			const hash1 =
				assetMap["/static/same1.txt"]?.match(/-([a-f0-9]{8})\./)?.[1];
			const hash2 =
				assetMap["/static/same2.txt"]?.match(/-([a-f0-9]{8})\./)?.[1];

			expect(hash1).toBe(hash2);
		});

		test("should preserve file content", async () => {
			const content = "body { color: red; }";
			writeFileSync(join(SOURCE_DIR, "preserve.css"), content);

			const assetMap = await copyStaticWithHashing(SOURCE_DIR, DEST_DIR);
			const hashedPath = assetMap["/static/preserve.css"];
			const hashedFilename = hashedPath?.split("/").pop();

			if (hashedFilename) {
				const copiedContent = await Bun.file(
					join(DEST_DIR, hashedFilename),
				).text();
				expect(copiedContent).toBe(content);
			}
		});

		test("should handle multiple file types", async () => {
			writeFileSync(join(SOURCE_DIR, "styles.css"), "css");
			writeFileSync(join(SOURCE_DIR, "script.js"), "js");
			writeFileSync(join(SOURCE_DIR, "data.json"), "{}");

			const assetMap = await copyStaticWithHashing(SOURCE_DIR, DEST_DIR);

			expect(assetMap["/static/styles.css"]).toMatch(/\.css$/);
			expect(assetMap["/static/script.js"]).toMatch(/\.js$/);
			expect(assetMap["/static/data.json"]).toMatch(/\.json$/);
		});

		test("should skip directories", async () => {
			mkdirSync(join(SOURCE_DIR, "subdir"), { recursive: true });
			writeFileSync(join(SOURCE_DIR, "subdir", "nested.css"), "nested");

			const assetMap = await copyStaticWithHashing(SOURCE_DIR, DEST_DIR);

			// Should not include the directory or nested file
			expect(assetMap["/static/subdir"]).toBeUndefined();
			expect(assetMap["/static/subdir/nested.css"]).toBeUndefined();
		});
	});

	describe("copyPostAssets", () => {
		const postSource = join(TEST_DIR, "post-source");
		const postDest = join(TEST_DIR, "post-dest");

		beforeAll(() => {
			mkdirSync(postSource, { recursive: true });
			mkdirSync(postDest, { recursive: true });
		});

		test("should copy non-markdown files", async () => {
			writeFileSync(join(postSource, "image.jpg"), "fake image data");
			writeFileSync(join(postSource, "diagram.png"), "fake png data");

			await copyPostAssets(postSource, postDest);

			expect(existsSync(join(postDest, "image.jpg"))).toBe(true);
			expect(existsSync(join(postDest, "diagram.png"))).toBe(true);
		});

		test("should skip markdown files", async () => {
			writeFileSync(join(postSource, "index.md"), "# Markdown content");
			writeFileSync(join(postSource, "notes.md"), "# Notes");
			writeFileSync(join(postSource, "asset.png"), "image");

			await copyPostAssets(postSource, postDest);

			expect(existsSync(join(postDest, "index.md"))).toBe(false);
			expect(existsSync(join(postDest, "notes.md"))).toBe(false);
			expect(existsSync(join(postDest, "asset.png"))).toBe(true);
		});

		test("should preserve file content", async () => {
			const content = "binary content here";
			writeFileSync(join(postSource, "file.bin"), content);

			await copyPostAssets(postSource, postDest);

			const copiedContent = await Bun.file(join(postDest, "file.bin")).text();
			expect(copiedContent).toBe(content);
		});

		test("should handle empty directory", async () => {
			const emptySource = join(TEST_DIR, "empty-source");
			const emptyDest = join(TEST_DIR, "empty-dest");
			mkdirSync(emptySource, { recursive: true });
			mkdirSync(emptyDest, { recursive: true });

			// Should not throw
			await copyPostAssets(emptySource, emptyDest);

			expect(readdirSync(emptyDest).length).toBe(0);
		});

		test("should skip directories in source", async () => {
			const nestedDir = join(postSource, "nested");
			mkdirSync(nestedDir, { recursive: true });
			writeFileSync(join(nestedDir, "deep.png"), "deep image");

			await copyPostAssets(postSource, postDest);

			// Should not copy the nested directory
			expect(existsSync(join(postDest, "nested"))).toBe(false);
		});
	});

	describe("copyPublicFiles", () => {
		const publicSource = join(TEST_DIR, "public-source");
		const publicDest = join(TEST_DIR, "public-dest");

		beforeAll(() => {
			mkdirSync(publicSource, { recursive: true });
			mkdirSync(publicDest, { recursive: true });
		});

		test("should copy files without modification", async () => {
			writeFileSync(join(publicSource, "CNAME"), "example.com");
			writeFileSync(join(publicSource, "robots.txt"), "User-agent: *");

			await copyPublicFiles(publicSource, publicDest);

			expect(existsSync(join(publicDest, "CNAME"))).toBe(true);
			expect(existsSync(join(publicDest, "robots.txt"))).toBe(true);
		});

		test("should preserve file content exactly", async () => {
			const content = "example.com\n";
			writeFileSync(join(publicSource, "cname-test"), content);

			await copyPublicFiles(publicSource, publicDest);

			const copiedContent = await Bun.file(
				join(publicDest, "cname-test"),
			).text();
			expect(copiedContent).toBe(content);
		});

		test("should skip directories", async () => {
			const nestedDir = join(publicSource, "subdir");
			mkdirSync(nestedDir, { recursive: true });
			writeFileSync(join(nestedDir, "nested.txt"), "nested");

			await copyPublicFiles(publicSource, publicDest);

			expect(existsSync(join(publicDest, "subdir"))).toBe(false);
		});

		test("should handle empty directory", async () => {
			const emptySource = join(TEST_DIR, "empty-public");
			const emptyDest = join(TEST_DIR, "empty-public-dest");
			mkdirSync(emptySource, { recursive: true });
			mkdirSync(emptyDest, { recursive: true });

			await copyPublicFiles(emptySource, emptyDest);

			expect(readdirSync(emptyDest).length).toBe(0);
		});
	});
});
