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
import { QueryEngine } from "./queryperformers/QueryEngine";
import { Section } from "./dataset/Section";
import { parseIndexHtml } from "./dataset/IndexParserUtils";
import { parseBuildingHtml, RoomData } from "./dataset/BuildingParserUtils";
import { fetchGeolocation } from "./dataset/GeoHelper";

export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, { meta: InsightDataset; data: Section[] | RoomData[] }>;
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
		this.validateDatasetParam(id, kind);

		const zip = await this.parseZip(content);

		if (kind === InsightDatasetKind.Sections) {
			return this.processSectionsDataset(id, zip);
		} else if (kind === InsightDatasetKind.Rooms) {
			return this.processRoomsDataset(id, zip);
		} else {
			throw new InsightError("Invalid dataset kind");
		}
	}

	private async parseZip(content: string): Promise<JSZip> {
		try {
			return await JSZip.loadAsync(content, { base64: true });
		} catch (error) {
			throw new InsightError("Invalid dataset content: Failed to parse as ZIP: " + error);
		}
	}

	private async processSectionsDataset(id: string, zip: JSZip): Promise<string[]> {
		if (!zip.files["courses/"]) {
			throw new InsightError("No courses folder.");
		}

		const fileContents = await Promise.all(
			Object.values(zip.files)
				.filter((file) => !file.dir)
				.map(async (file) => file.async("string"))
		);

		const sections = this.parseSections(fileContents);
		if (sections.length === 0) {
			throw new InsightError("No valid sections found in dataset");
		}

		return this.storeDataset(id, InsightDatasetKind.Sections, sections);
	}

	private async processRoomsDataset(id: string, zip: JSZip): Promise<string[]> {
		const indexFile = zip.file("index.htm");
		if (!indexFile) throw new InsightError("index.htm not found in the zip file");

		const buildings = parseIndexHtml(await indexFile.async("string"));
		if (buildings.length === 0) throw new InsightError("No valid building data found in dataset");

		const roomPromises = buildings.map(async (building) => {
			try {
				const geo = await fetchGeolocation(building.address);
				const buildingFile = this.getBuildingFile(zip, building.href);
				if (!buildingFile) return [];

				return parseBuildingHtml(await buildingFile.async("string"), {
					shortname: building.shortname,
					address: building.address,
					lat: geo.lat,
					lon: geo.lon,
					fullname: building.shortname,
				});
			} catch (err) {
				this.errorsList.push(`Error processing ${building.shortname}: ${err}`);
				return [];
			}
		});

		const rooms = (await Promise.all(roomPromises)).flat();
		if (rooms.length === 0) throw new InsightError("No valid rooms found in dataset");

		return this.storeDataset(id, InsightDatasetKind.Rooms, rooms);
	}

	private getBuildingFile(zip: JSZip, href_path: string): JSZip.JSZipObject | null {
		const cleanedPath = href_path.startsWith("./") ? href_path.slice(2) : href_path;
		return zip.file(cleanedPath) || zip.file(cleanedPath.replace(/^\/+/, "")) || null;
	}

	private async storeDataset(id: string, kind: InsightDatasetKind, data: any[]): Promise<string[]> {
		const dataset = { meta: { id, kind, numRows: data.length }, data };
		this.datasets.set(id, dataset);
		await fs.writeJson(path.join(this.datasetStoragePath, `${id}.json`), dataset);
		return Array.from(this.datasets.keys());
	}

	private parseSections(fileContents: string[]): Section[] {
		const sections: Section[] = [];
		const defaultYear = 1900;
		for (const fileContent of fileContents) {
			try {
				const parsed = JSON.parse(fileContent);
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
				if (typeof query !== "object" || query === null) {
					throw new InsightError("Query must be a non-null object");
				}
				const { dataset, records } = this.getRecordsFromQuery(query);
				resolve(QueryEngine.runQuery(query, dataset, records));
			} catch (err) {
				reject(err);
			}
		});
	}

	private getRecordsFromQuery(query: any): { dataset: Record<string, any>; records: Record<string, any>[] } {
		if (!query.OPTIONS || !Array.isArray(query.OPTIONS.COLUMNS) || query.OPTIONS.COLUMNS.length === 0) {
			throw new InsightError("OPTIONS.COLUMNS is missing or empty");
		}
		const parts = query.OPTIONS.COLUMNS[0].split("_");
		if (parts.length !== 2) {
			throw new InsightError(`Invalid column format in OPTIONS.COLUMNS: ${query.OPTIONS.COLUMNS[0]}`);
		}
		const datasetId = parts[0];
		if (/[\r\n]/.test(datasetId)) {
			throw new InsightError("Dataset id contains newline or carriage return characters, query rejected.");
		}
		if (!this.datasets.has(datasetId)) {
			throw new InsightError(`Dataset ${datasetId} not found`);
		}
		const dataset = this.datasets.get(datasetId)!;
		const records =
			dataset.meta.kind === InsightDatasetKind.Rooms
				? (dataset.data as RoomData[])
				: this.transformDataset(datasetId, dataset.data as Section[]);
		return { dataset, records };
	}

	private transformDataset(datasetId: string, data: Section[]): Record<string, any>[] {
		return data.map((record) => ({
			[`${datasetId}_dept`]: record.dept ?? "",
			[`${datasetId}_avg`]: record.avg ?? 0,
			[`${datasetId}_pass`]: record.pass ?? 0,
			[`${datasetId}_fail`]: record.fail ?? 0,
			[`${datasetId}_audit`]: record.audit ?? 0,
			[`${datasetId}_year`]: record.year ?? 0,
			[`${datasetId}_id`]: record.id ?? "",
			[`${datasetId}_instructor`]: record.instructor ?? "",
			[`${datasetId}_title`]: record.title ?? "",
			[`${datasetId}_uuid`]: record.uuid ?? "",
		}));
	}

	private validateDatasetParam(id: string, kind: InsightDatasetKind): void {
		if (!this.isValidId(id) || this.datasets.has(id)) {
			throw new InsightError("Invalid or duplicate dataset ID");
		}
		if (kind !== InsightDatasetKind.Sections && kind !== InsightDatasetKind.Rooms) {
			throw new InsightError("Invalid kind.");
		}
	}

	private isValidId(id: string): boolean {
		return id.trim().length > 0 && !id.includes("_");
	}
}
