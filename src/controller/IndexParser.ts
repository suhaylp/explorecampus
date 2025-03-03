// src/IndexParser.ts
import * as JSZip from "jszip";
import * as fs from "fs/promises";
import { parseIndexHtml, BuildingData } from "./IndexParserUtils";

/**
 * Extracts index.htm from the given zip file and parses it for building data.
 * @param zipPath The path to the campus.zip file.
 * @returns A promise that resolves with an array of building objects.
 */
export async function parseCampusZip(zipPath: string): Promise<BuildingData[]> {
	const data = await fs.readFile(zipPath);
	const zip = await JSZip.loadAsync(data);
	// The zip should contain index.htm at its root.
	const indexFile = zip.file("index.htm");
	if (!indexFile) {
		throw new Error("index.htm not found in the zip file");
	}
	const indexContent = await indexFile.async("string");
	return parseIndexHtml(indexContent);
}
