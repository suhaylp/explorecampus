import { InsightDataset, InsightDatasetKind } from "./IInsightFacade";
import { Section } from "./Section"; // Adjust the import path as needed

export class StoredDataset implements InsightDataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;
	public data: Section[];

	constructor(id: string, kind: InsightDatasetKind, data: Section[]) {
		this.id = id;
		this.kind = kind;
		this.data = data;
		this.numRows = data.length;
	}
}
