import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";
import DatasetProcessor from "./DatasetProcessor";

export default class InsightFacade implements IInsightFacade {
	// Create an instance of DatasetProcessor
	private datasetProcessor: DatasetProcessor;

	constructor() {
		this.datasetProcessor = new DatasetProcessor();
	}

	/**
	 * Delegates the addDataset operation to the DatasetProcessor.
	 */
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return this.datasetProcessor.addDataset(id, content, kind);
	}

	/**
	 * Delegates the removeDataset operation to the DatasetProcessor.
	 */
	public async removeDataset(id: string): Promise<string> {
		return this.datasetProcessor.removeDataset(id);
	}

	/**
	 * Delegates the listDatasets operation to the DatasetProcessor.
	 */
	public async listDatasets(): Promise<InsightDataset[]> {
		return this.datasetProcessor.listDatasets();
	}

	/**
	 * You can implement or delegate query processing here.
	 */
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		throw new InsightError(`InsightFacade::performQuery() is unimplemented! - query=${query}`);
	}
}
