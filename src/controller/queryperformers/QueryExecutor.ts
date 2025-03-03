import { FilterEvaluator } from "./validationhelpers/FilterEvaluator";
import { ProjectionEvaluator } from "../dataset/ProjectionEvaluator";
import { OrderEvaluator } from "./validationhelpers/OrderEvaluator";
import { ResultTooLargeError } from "../IInsightFacade";

export class QueryExecutor {
	private static MAX_SIZE: number = 5000;
	public static executeQuery(query: any, dataset: any[]): any[] {
		const filtered = dataset.filter((record) => FilterEvaluator.evaluateFilter(query.WHERE, record));
		if (filtered.length > this.MAX_SIZE) {
			throw new ResultTooLargeError("Query result exceeds limit of 5000 records");
		}
		const projected = ProjectionEvaluator.project(filtered, query.OPTIONS.COLUMNS);
		if (query.OPTIONS.ORDER) {
			return OrderEvaluator.order(projected, query.OPTIONS.ORDER);
		}
		return projected;
	}
}
