import { InsightError } from "../IInsightFacade";
import { WhereValidator } from "./validationhelpers/QueryWhereValidator";
import { OptionsValidator } from "./validationhelpers/QueryOptionsValidator";
import { TransformationsValidator } from "./validationhelpers/QueryTransformationsValidator";

export class QueryValidator {


	public static validateQuery(query: any, datasetKind: "rooms" | "sections"): void {
		if (typeof query !== "object" || query === null || Array.isArray(query)) {
			throw new InsightError("Query must be a non-null object");
		}
		const keys = Object.keys(query);
		const two = 2;
		const three = 3;
		if (!(keys.length === two || keys.length === three) || !keys.includes("WHERE") || !keys.includes("OPTIONS")) {
			throw new InsightError("Query must contain WHERE and OPTIONS, and optionally TRANSFORMATIONS");
		}

		OptionsValidator.validateOptions(query.OPTIONS);
		WhereValidator.validateWhere(query.WHERE, datasetKind);

		if ("TRANSFORMATIONS" in query) {
			TransformationsValidator.validateTransformations(query.TRANSFORMATIONS);
			TransformationsValidator.validateColumns(query.OPTIONS.COLUMNS, query.TRANSFORMATIONS);
		}

		const datasetIdFromOptions = QueryValidator.extractDatasetIdFromColumns(query.OPTIONS.COLUMNS);
		const datasetIdsFromWhere = QueryValidator.extractDatasetIdsFromWhere(query.WHERE);

		if (
			datasetIdsFromWhere.size > 0 &&
			(datasetIdsFromWhere.size !== 1 || !datasetIdsFromWhere.has(datasetIdFromOptions))
		) {
			throw new InsightError("Query must reference exactly one dataset in WHERE and OPTIONS");
		}
	}



private static extractDatasetIdFromColumns(columns: string[]): string {
		const firstColumn = columns[0];
		const parts = firstColumn.split("_");
		if (parts.length !== 2) {
			throw new InsightError(`Invalid column format: ${firstColumn}`);
		}
		return parts[0];
	}

	private static extractDatasetIdsFromWhere(filter: any): Set<string> {
		if (!this.isValidFilterObject(filter)) {
			return new Set<string>();
		}
		const ids = new Set<string>();
		for (const key in filter) {
			if (this.isLogicalOperator(key)) {
				const logicalIds = this.extractIdsFromLogical(filter[key]);
				this.mergeSets(ids, logicalIds);
			} else if (key === "NOT") {
				const notIds = this.extractDatasetIdsFromWhere(filter[key]);
				this.mergeSets(ids, notIds);
			} else if (this.isComparisonOperator(key)) {
				const compIds = this.extractIdsFromComparison(filter[key]);
				this.mergeSets(ids, compIds);
			}
		}
		return ids;
	}

	private static isValidFilterObject(filter: any): boolean {
		return typeof filter === "object" && filter !== null && Object.keys(filter).length > 0;
	}

	private static isLogicalOperator(key: string): boolean {
		return key === "AND" || key === "OR";
	}

	private static isComparisonOperator(key: string): boolean {
		return key === "LT" || key === "GT" || key === "EQ" || key === "IS";
	}

	private static extractIdsFromLogical(arr: any): Set<string> {
		const ids = new Set<string>();
		if (Array.isArray(arr)) {
			for (const subFilter of arr) {
				const subIds = this.extractDatasetIdsFromWhere(subFilter);
				this.mergeSets(ids, subIds);
			}
		}
		return ids;
	}

	private static extractIdsFromComparison(compObj: any): Set<string> {
		const ids = new Set<string>();
		if (typeof compObj === "object" && compObj !== null) {
			const compKeys = Object.keys(compObj);
			if (compKeys.length === 1) {
				const datasetKey = compKeys[0];
				const parts = datasetKey.split("_");
				if (parts.length === 2) {
					ids.add(parts[0]);
				}
			}
		}
		return ids;
	}

	private static mergeSets(target: Set<string>, source: Set<string>): void {
		for (const item of source) {
			target.add(item);
		}
	}
}
