import { InsightError } from "../../IInsightFacade";

export class QueryOrderValidator {
	public static validateOrder(order: any, columns: string[]): void {
		if (order === undefined) {
			return;
		}

		if (typeof order !== "string") {
			throw new InsightError("ORDER must be a string");
		}

		const trimmedOrder = order.trim();
		if (trimmedOrder.length === 0) {
			throw new InsightError("ORDER must be a non-empty string");
		}

		if (!columns.includes(trimmedOrder)) {
			throw new InsightError("ORDER must be one of the COLUMNS");
		}
	}
}
