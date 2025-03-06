import { InsightError } from "../../IInsightFacade";
import { validateMKey, validateSKey } from "./QueryKeyValidator";

export class WhereValidator {
	// Now require datasetKind to be passed in (“rooms” or “sections”)
	public static validateWhere(where: any, datasetKind: "rooms" | "sections"): void {
		if (typeof where !== "object" || where === null || Array.isArray(where)) {
			throw new InsightError("WHERE clause must be an object");
		}
		if (Object.keys(where).length === 0) {
			return;
		}
		this.validateFilter(where, datasetKind);
	}

	private static validateFilter(filter: any, datasetKind: "rooms" | "sections"): void {
		if (!this.isValidObject(filter)) {
			throw new InsightError("Filter must be an object");
		}
		const keys = Object.keys(filter);
		if (keys.length !== 1) {
			throw new InsightError("Each filter must have exactly one operator");
		}
		const operator = keys[0];
		const value = filter[operator];
		if (["AND", "OR"].includes(operator)) {
			this.validateLogicalOperator(operator, value, datasetKind);
		} else if (operator === "NOT") {
			this.validateNotOperator(value, datasetKind);
		} else if (["LT", "GT", "EQ"].includes(operator)) {
			this.validateMComparison(operator, value, datasetKind);
		} else if (operator === "IS") {
			this.validateSComparison(value, datasetKind);
		} else {
			throw new InsightError(`Unknown operator in WHERE clause: ${operator}`);
		}
	}

	private static isValidObject(filter: any): boolean {
		return typeof filter === "object" && filter !== null && !Array.isArray(filter);
	}

	private static validateLogicalOperator(operator: string, value: any, datasetKind: "rooms" | "sections"): void {
		if (!Array.isArray(value) || value.length === 0) {
			throw new InsightError(`${operator} operator must have a non-empty array of filters`);
		}
		value.forEach((subFilter) => this.validateFilter(subFilter, datasetKind));
	}

	private static validateNotOperator(value: any, datasetKind: "rooms" | "sections"): void {
		if (!this.isValidObject(value)) {
			throw new InsightError("NOT operator must have an object as its value");
		}
		this.validateFilter(value, datasetKind);
	}

	private static validateMComparison(operator: string, value: any, datasetKind: "rooms" | "sections"): void {
		if (!this.isValidObject(value)) {
			throw new InsightError(`${operator} operator must have an object as its value`);
		}
		const subKeys = Object.keys(value);
		if (subKeys.length !== 1) {
			throw new InsightError(`${operator} operator must have exactly one key in its object`);
		}
		const mkey = subKeys[0];
		// Pass the datasetKind into validateMKey
		this.validateKey(mkey, validateMKey, operator, "MKey", datasetKind);
		if (typeof value[mkey] !== "number") {
			throw new InsightError(`${operator} comparison value must be a number`);
		}
	}

	private static validateSComparison(value: any, datasetKind: "rooms" | "sections"): void {
		if (!this.isValidObject(value)) {
			throw new InsightError("IS operator must have an object as its value");
		}
		const subKeys = Object.keys(value);
		if (subKeys.length !== 1) {
			throw new InsightError("IS operator must have exactly one key in its object");
		}
		const skey = subKeys[0];
		// Pass the datasetKind into validateSKey
		this.validateKey(skey, validateSKey, "IS", "SKey", datasetKind);
		if (typeof value[skey] !== "string") {
			throw new InsightError("IS comparison value must be a string");
		}
		this.validateWildcard(value[skey]);
	}

	// Updated validateKey to require datasetKind
	private static validateKey(
		key: string,
		validator: (key: string, datasetKind: "rooms" | "sections") => void,
		operator: string,
		keyType: string,
		datasetKind: "rooms" | "sections"
	): void {
		try {
			validator(key, datasetKind);
		} catch (e: any) {
			throw new InsightError(`Invalid ${keyType} in ${operator} comparison: ${e.message}`);
		}
	}

	private static validateWildcard(input: string): void {
		const count = (input.match(/\*/g) || []).length;
		if (count === 0) {
			return;
		}
		if (count === 1) {
			if (input.startsWith("*") || input.endsWith("*")) {
				return;
			} else {
				throw new InsightError("Wildcard '*' in IS comparison can only appear at the beginning or end");
			}
		}
		if (count === 2) {
			if (input.startsWith("*") && input.endsWith("*")) {
				return;
			} else {
				throw new InsightError(
					"Wildcard '*' in IS comparison, if used twice, must appear at both the beginning and end"
				);
			}
		}
		throw new InsightError("Invalid usage of wildcard '*' in IS comparison");
	}
}
