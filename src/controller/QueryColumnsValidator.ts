import { InsightError } from "./IInsightFacade";

export class QueryColumnsValidator {
	public static validateColumns(columns: any): void {
		if (!Array.isArray(columns) || columns.length === 0) {
			throw new InsightError("OPTIONS.COLUMNS must be a non-empty array");
		}

		const datasetIds = new Set<string>();
		for (const column of columns) {
			if (typeof column !== "string") {
				throw new InsightError(`Column names must be strings, but received type ${typeof column}`);
			}
			const trimmedColumn = column.trim();
			if (!trimmedColumn.includes("_")) {
				throw new InsightError(`Invalid column name: ${column}`);
			}
			const [datasetId] = trimmedColumn.split("_");
			datasetIds.add(datasetId);
		}

		if (datasetIds.size !== 1) {
			throw new InsightError("Query must reference exactly one dataset");
		}
	}
}
