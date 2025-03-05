import { InsightError } from "../../IInsightFacade";

export class OrderEvaluator {
	public static order(records: any[], order: string | { dir: string; keys: string[] }): any[] {
		if (typeof order === "string") {
			const orderStr = order.trim();
			if (!orderStr) {
				throw new InsightError("ORDER string is empty");
			}
			return records.sort((a, b) => (a[orderStr] < b[orderStr] ? -1 : a[orderStr] > b[orderStr] ? 1 : 0));
		} else if (typeof order === "object" && order !== null) {
			const { dir, keys } = order;
			if (dir !== "UP" && dir !== "DOWN") {
				throw new InsightError("ORDER.dir must be either 'UP' or 'DOWN'");
			}
			if (!Array.isArray(keys) || keys.length === 0) {
				throw new InsightError("ORDER.keys must be a non-empty array");
			}
			return records.sort((a, b) => {
				for (const key of keys) {
					if (a[key] < b[key]) return dir === "UP" ? -1 : 1;
					if (a[key] > b[key]) return dir === "UP" ? 1 : -1;
				}
				return 0;
			});
		}
		throw new InsightError("ORDER must be a string or a valid object");
	}
}
