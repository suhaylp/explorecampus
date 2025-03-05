import { InsightError } from "../../IInsightFacade";

export class QueryOrderValidator {
	public static validateOrder(order: any, columns: string[]): void {
		if (order === undefined) {
			return;
		}


		if (typeof order === "string") {
			const trimmedOrder = order.trim();
			if (trimmedOrder.length === 0) {
				throw new InsightError("ORDER must be a non-empty string");
			}
			if (!columns.includes(trimmedOrder)) {
				throw new InsightError("ORDER must be one of the COLUMNS");
			}
			return;
		}

		if (typeof order === "object" && order !== null) {
			if (!("dir" in order) || !("keys" in order)) {
				throw new InsightError("ORDER object must contain dir and keys");
			}
			const { dir, keys } = order;
			if (dir !== "UP" && dir !== "DOWN") {
				throw new InsightError("ORDER.dir must be either 'UP' or 'DOWN'");
			}
			if (!Array.isArray(keys) || keys.length === 0) {
				throw new InsightError("ORDER.keys must be a non-empty array");
			}
			for (const key of keys) {
				if (typeof key !== "string" || !columns.includes(key)) {
					throw new InsightError("Each ORDER key must be one of the COLUMNS");
				}
			}
			return;
		}

		throw new InsightError("ORDER must be a string or a valid object");
	}
}
