import { QueryValidator } from "./QueryValidator";
import { QueryExecutor } from "./QueryExecutor";

export class QueryEngine {
	public static runQuery(query: any, dataset: any[]): any[] {
		QueryValidator.validateQuery(query);
		return QueryExecutor.executeQuery(query, dataset);
	}
}
