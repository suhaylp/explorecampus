import fs from "fs-extra";
import JSZip from "jszip";
import path from "path";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	InsightResult,
} from "./IInsightFacade";
import { QueryEngine } from "./QueryEngine";
import { Section } from "./Section";

export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, { meta: InsightDataset; data: Section[] }>;
	private datasetStoragePath: string;
	private errorsList: string[];
	private initialized: Promise<void>;

	constructor() {
		this.datasets = new Map();
		this.datasetStoragePath = path.join(__dirname, "../../data");
		this.errorsList = [];
		this.initialized = this.initialize();
	}

	private async initialize(): Promise<void> {
		await fs.ensureDir(this.datasetStoragePath);
		await this.loadDatasetsFromDisk();
	}

	private async loadDatasetsFromDisk(): Promise<void> {
		try {
			const files = await fs.readdir(this.datasetStoragePath);

			const datasetPromises = files.map(async (file) => {
				const filePath = path.join(this.datasetStoragePath, file);
				try {
					const data = await fs.readJson(filePath);
					this.datasets.set(data.meta.id, data);
				} catch (error) {
					this.errorsList.push(`Failed to load dataset: ${error}`);
				}
			});

			await Promise.all(datasetPromises);
		} catch (error) {
			this.errorsList.push(`Failed to read dataset directory: ${error}`);
		}
	}
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.initialized;
		// Validate the dataset id and kind (throws an error if invalid or duplicate).
		this.validateDatasetParam(id, kind);
		// const defaultYear = 1900;

		let zip: JSZip;
		try {
			zip = await JSZip.loadAsync(content, { base64: true });
		} catch (error) {
			throw new InsightError("Invalid dataset content: Failed to parse as ZIP: " + error);
		}

		// Ensure that the ZIP contains a folder named "courses/"
		if (!zip.files["courses/"]) {
			throw new InsightError("No courses folder.");
		}

		// Gather the text content of all files in the ZIP.
		const filePromises: Array<Promise<string>> = [];
		for (const file of Object.values(zip.files)) {
			// Process every file (even if it has no extension), but skip directories.
			if (!file.dir) {
				filePromises.push(file.async("string"));
			}
		}

		const fileContents: string[] = await Promise.all(filePromises);

		// Process the file contents to extract sections.
		const sections: Section[] = this.parseSections(fileContents);

		if (sections.length === 0) {
			throw new InsightError("No valid sections found in dataset");
		}

		// Create the dataset object using your representation.
		const dataset = {
			meta: { id, kind, numRows: sections.length },
			data: sections,
		};
		// Store in-memory.
		this.datasets.set(id, dataset);
		// Persist to disk.
		await fs.writeJson(path.join(this.datasetStoragePath, `${id}.json`), dataset);

		return Array.from(this.datasets.keys());
	}

	private parseSections(fileContents: string[]): Section[] {
		const sections: Section[] = [];
		const defaultYear = 1900;

		for (const fileContent of fileContents) {
			try {
				const parsed = JSON.parse(fileContent);
				// If parsed data contains a result array, process it.
				if (parsed?.result && Array.isArray(parsed.result)) {
					for (const section of parsed.result) {
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
			} catch (error) {
				// If parsing fails, skip this file
				this.errorsList.push(error as string);
			}
		}

		return sections;
	}

	public async removeDataset(id: string): Promise<string> {
		await this.initialized;
		if (!this.isValidId(id)) {
			throw new InsightError("Invalid dataset ID");
		}

		if (!this.datasets.has(id)) {
			throw new NotFoundError("Dataset not found");
		}

		this.datasets.delete(id);
		const datasetPath = path.join(this.datasetStoragePath, `${id}.json`);
		await fs.remove(datasetPath);
		return id;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.initialized;
		return Array.from(this.datasets.values()).map((ds) => ds.meta);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		await this.initialized;
		return new Promise<InsightResult[]>((resolve, reject) => {
			try {
				// Check that the query is a non-null object.
				if (typeof query !== "object" || query === null) {
					throw new InsightError("Query must be a non-null object");
				}
				const q: any = query;

				// Check that OPTIONS.COLUMNS exists and is a non-empty array.
				if (!q.OPTIONS || !Array.isArray(q.OPTIONS.COLUMNS) || q.OPTIONS.COLUMNS.length === 0) {
					throw new InsightError("OPTIONS.COLUMNS is missing or empty");
				}

				// Extract dataset id from the first column.
				const firstColumn: string = q.OPTIONS.COLUMNS[0];
				// Expecting keys of the form "<id>_<field>"
				const parts = firstColumn.split("_");
				if (parts.length !== 2) {
					throw new InsightError(`Invalid column format in OPTIONS.COLUMNS: ${firstColumn}`);
				}
				const datasetId = parts[0];

				// Ensure that the dataset exists in our in-memory collection.
				if (!this.datasets.has(datasetId)) {
					throw new InsightError(`Dataset ${datasetId} not found`);
				}
				const dataset = this.datasets.get(datasetId)!;

				// Transform each Section record into a plain object with keys prefixed by datasetId.
				const transformedRecords = this.transformDataset(datasetId, dataset.data);

				// Delegate query validation and execution to the QueryEngine using the transformed records.
				const results = QueryEngine.runQuery(query, transformedRecords);

				resolve(results);
			} catch (err) {
				reject(err);
			}
		});
	}

	private transformDataset(datasetId: string, data: Section[]): Record<string, any>[] {
		return data.map((record) => ({
			[`${datasetId}_dept`]: record.dept,
			[`${datasetId}_avg`]: record.avg,
			[`${datasetId}_pass`]: record.pass,
			[`${datasetId}_fail`]: record.fail,
			[`${datasetId}_audit`]: record.audit,
			[`${datasetId}_year`]: record.year,
			[`${datasetId}_id`]: record.id,
			[`${datasetId}_instructor`]: record.instructor,
			[`${datasetId}_title`]: record.title,
			[`${datasetId}_uuid`]: record.uuid,
		}));
	}

	private validateDatasetParam(id: string, kind: InsightDatasetKind): void {
		if (!this.isValidId(id) || this.datasets.has(id)) {
			throw new InsightError("Invalid or duplicate dataset ID");
		}
		if (kind !== InsightDatasetKind.Sections) {
			throw new InsightError("Invalid kind.");
		}
	}

	private isValidId(id: string): boolean {
		return id.trim().length > 0 && !id.includes("_");
	}
}
