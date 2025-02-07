import { InsightDataset } from "./IInsightFacade";
import { Section } from "./Section";

export interface PersistedDataset {
	meta: InsightDataset;
	data: Section[]; // extra internal data
}
