import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";
import fs from "fs-extra";
import path from "path";
import JSZip from "jszip";
import { Section } from "./Section"; // Our Section class
import { StoredDataset } from "./StoredDataset"; // Our StoredDataset class

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
const persistFilePath: string = path.join("project_team299", "data", "storedDatasets.json");
async function sectionsParser(sections: Section[], files: Promise<string>[]): Promise<void> {
	const defaultYear = 1900;

	try {
		for (const file of await Promise.all(files)) {
			const json = JSON.parse(file);

			if (!json.result || !Array.isArray(json.result)) {
				throw new Error("Invalid JSON structure: Missing or incorrect 'result' array.");
			}

			for (const section of json.result) {
				sections.push({
					uuid: String(section.id),
					id: section.Course,
					title: section.Title,
					instructor: section.Professor,
					dept: section.Subject,
					year: section.Section === "overall" ? defaultYear : Number(section.Year) || defaultYear,
					avg: Number(section.Avg) || 0,
					pass: Number(section.Pass) || 0,
					fail: Number(section.Fail) || 0,
					audit: Number(section.Audit) || 0,
				});
			}
		}
	} catch {
		return; // idk what to do here
	}
}

export default class InsightFacade implements IInsightFacade {
	// private datasets: Map<string, InsightDataset> = new Map();

	/**
	 * Reads the persisted datasets from disk.
	 * If the file doesn't exist, returns an empty array.
	 */
	private static async readPersistFile(): Promise<StoredDataset[]> {
		try {
			if (await fs.pathExists(persistFilePath)) {
				const data = await fs.readJSON(persistFilePath);
				return data;
			} else {
				return [];
			}
		} catch (err) {
			throw new InsightError("Error reading persisted datasets: " + err);
		}
	}

	private static async writePersistFile(datasets: StoredDataset[]): Promise<void> {
		try {
			// Ensure the directory exists before writing the file.
			await fs.ensureDir(path.dirname(persistFilePath));
			await fs.writeJSON(persistFilePath, datasets, { spaces: 4 });
		} catch (err) {
			throw new InsightError("Error writing persisted datasets: " + err);
		}
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Step 1: Read JSON from content
		const storedDatasets: StoredDataset[] = await InsightFacade.readPersistFile();

		//Step 2: Check if valid id, valid kind
		if (id.includes("_") || id.trim() === "" || storedDatasets.find((dataset) => dataset.id === id)) {
			throw new InsightError("Invalid id.");
		} else if (kind !== InsightDatasetKind.Sections) {
			throw new InsightError("Invalid kind.");
		}

		// Step 3: Load and extract ZIP  file (content is base64-encoded ZIP file)
		const zip = new JSZip();
		const sections: Section[] = [];

		// Step 4: Extract and Read JSON files inside "courses/"
		try {
			const courses = await zip.loadAsync(content, { base64: true });

			if (!Object.keys(courses.files).some((file) => file.startsWith("courses/") && !courses.files[file].dir)) {
				throw new InsightError("Courses folder does not exist or contains no valid files.");
			}

			const fileContents: Promise<string>[] = Object.values(courses.files)
				.filter((file) => file.name.endsWith(".txt"))
				.map(async (file) => file.async("string"));

			await sectionsParser(sections, fileContents);

			// Step 5: Parse and Process Course Data
		} catch (e) {
			throw new InsightError(e as string);
		}

		// Step6: Check for valid sections
		if (sections.length === 0) {
			throw new InsightError("No valid sections.");
		}
		// Step 7: Save dataset to storage
		storedDatasets.push(new StoredDataset(id, kind, sections));

		await InsightFacade.writePersistFile(storedDatasets);

		// Step 8: Return array of all dataset IDs
		return storedDatasets.map((dataset) => dataset.id);
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
