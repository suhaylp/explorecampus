import { InsightDataset, InsightDatasetKind, InsightError, NotFoundError } from "../IInsightFacade";
import fs from "fs-extra";
import path from "path";
import JSZip from "jszip";
import { Section } from "./Section";
import { PersistedDataset } from "./PersistedDataset";

const persistFilePath: string = path.join(__dirname, "..", "..", "data", "storedDatasets.json");

async function sectionsParser(sections: Section[], files: Promise<string>[]): Promise<void> {
	const defaultYear = 1900;
	try {
		for (const file of await Promise.all(files)) {
			const json = JSON.parse(file);

			if (!json.result || !Array.isArray(json.result)) {
				return Promise.reject(new InsightError("Invalid JSON structure: Missing or incorrect 'result' array."));
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
		// You can choose to log or handle the error differently.
		return;
	}
}

export default class DatasetProcessor {
	// Helper methods for persisting datasets
	private static async readPersistFile(): Promise<PersistedDataset[]> {
		try {
			if (await fs.pathExists(persistFilePath)) {
				return await fs.readJSON(persistFilePath);
			} else {
				return [];
			}
		} catch (err) {
			throw new InsightError("Error reading persisted datasets: " + err);
		}
	}

	private static async writePersistFile(datasets: PersistedDataset[]): Promise<void> {
		try {
			await fs.ensureDir(path.dirname(persistFilePath));
			await fs.writeJSON(persistFilePath, datasets, { spaces: 4 });
		} catch (err) {
			throw new InsightError("Error writing persisted datasets: " + err);
		}
	}

	private validateAddParameters(id: string, kind: InsightDatasetKind, persistedDatasets: PersistedDataset[]): void {
		if (id.includes("_") || id.trim() === "") {
			throw new InsightError("Invalid id.");
		}
		if (persistedDatasets.find((ds) => ds.meta.id === id)) {
			throw new InsightError("Dataset with this id already exists.");
		}
		if (kind !== InsightDatasetKind.Sections) {
			throw new InsightError("Invalid kind.");
		}
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		const persistedDatasets: PersistedDataset[] = await DatasetProcessor.readPersistFile();

		this.validateAddParameters(id, kind, persistedDatasets);

		const zip = new JSZip();
		const sections: Section[] = [];

		try {
			const courses = await zip.loadAsync(content, { base64: true });

			if (!Object.keys(courses.files).some((file) => file.startsWith("courses/") && !courses.files[file].dir)) {
				return Promise.reject(new InsightError("Courses folder does not exist or contains no valid files."));
			}

			const fileContents: Promise<string>[] = Object.values(courses.files)
				.filter((file) => file.name.endsWith(".txt"))
				.map(async (file) => file.async("string"));

			await sectionsParser(sections, fileContents);
		} catch (e) {
			throw new InsightError(e as string);
		}

		if (sections.length === 0) {
			throw new InsightError("No valid sections.");
		}

		const newDataset: PersistedDataset = {
			meta: {
				id: id,
				kind: kind,
				numRows: sections.length,
			},
			data: sections,
		};

		persistedDatasets.push(newDataset);
		await DatasetProcessor.writePersistFile(persistedDatasets);

		return persistedDatasets.map((dataset) => dataset.meta.id);
	}

	public async removeDataset(id: string): Promise<string> {
		if (id.includes("_") || id.trim() === "") {
			throw new InsightError("Invalid id.");
		}

		const persistedDatasets: PersistedDataset[] = await DatasetProcessor.readPersistFile();

		const index = persistedDatasets.findIndex((ds) => ds.meta.id === id);
		if (index === -1) {
			throw new NotFoundError("Dataset not found.");
		}

		persistedDatasets.splice(index, 1);
		await DatasetProcessor.writePersistFile(persistedDatasets);

		return id;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const persistedDatasets: PersistedDataset[] = await DatasetProcessor.readPersistFile();

		return persistedDatasets.map((dataset) => dataset.meta);
	}
}
