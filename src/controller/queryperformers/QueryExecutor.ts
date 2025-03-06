import { FilterEvaluator } from "./executionhelpers/FilterEvaluator";
import { ProjectionEvaluator } from "./executionhelpers/ProjectionEvaluator";
import { OrderEvaluator } from "./executionhelpers/OrderEvaluator";
import { ResultTooLargeError } from "../IInsightFacade";
import { performTransformations } from "./executionhelpers/TransformationsProcessor"; // New module for GROUP/APPLY

export class QueryExecutor {
	private static MAX_SIZE: number = 5000;

	public static executeQuery(query: any, dataset: any[]): any[] {
		const filtered = dataset.filter((record) => FilterEvaluator.evaluateFilter(query.WHERE, record));
		if (filtered.length > this.MAX_SIZE) {
			throw new ResultTooLargeError("Query result exceeds limit of 5000 records");
		}



		let processedData = filtered;
		if ("TRANSFORMATIONS" in query) {
			const { GROUP, APPLY } = query.TRANSFORMATIONS;
			processedData = performTransformations(filtered, GROUP, APPLY);
		}

		if (query.OPTIONS.ORDER) {
			processedData = OrderEvaluator.order(processedData, query.OPTIONS.ORDER);
		}

		const projected = ProjectionEvaluator.project(processedData, query.OPTIONS.COLUMNS);

		return projected;
	}
}
