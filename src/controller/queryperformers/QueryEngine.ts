import { QueryValidator } from "./QueryValidator";
import { QueryExecutor } from "./QueryExecutor";

export class QueryEngine {
	public static runQuery(query: any, dataset: Record<string, any>, records: Record<string, any>[]): any[] {
		const datasetKind = dataset.meta.kind;
		QueryValidator.validateQuery(query, datasetKind);
		return QueryExecutor.executeQuery(query, records);
	}
}
