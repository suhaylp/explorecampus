import { InsightError } from "../../IInsightFacade";

export class FilterEvaluator {
	public static evaluateFilter(filter: any, record: any): boolean {
		if (this.isEmptyFilter(filter)) {
			return true;
		}
		const operator = this.getSingleOperator(filter);
		const operand = filter[operator];

		if (this.isLogicalOperator(operator)) {
			return this.evaluateLogicalFilter(operator, operand, record);
		} else if (operator === "NOT") {
			return this.evaluateNotFilter(operand, record);
		} else if (this.isComparisonOperator(operator)) {
			return this.evaluateComparisonFilter(operator, operand, record);
		} else if (operator === "IS") {
			return this.evaluateISFilter(operand, record);
		} else {
			throw new InsightError(`Unknown operator: ${operator}`);
		}
	}

	private static isEmptyFilter(filter: any): boolean {
		return Object.keys(filter).length === 0;
	}

	private static getSingleOperator(filter: any): string {
		const keys = Object.keys(filter);
		if (keys.length !== 1) {
			throw new InsightError("Filter must have exactly one operator");
		}
		return keys[0];
	}

	private static isLogicalOperator(operator: string): boolean {
		return operator === "AND" || operator === "OR";
	}

	private static isComparisonOperator(operator: string): boolean {
		return operator === "LT" || operator === "GT" || operator === "EQ";
	}

	private static evaluateLogicalFilter(operator: string, operand: any, record: any): boolean {
		if (!Array.isArray(operand) || operand.length === 0) {
			throw new InsightError(`${operator} operand must be a non-empty array`);
		}
		if (operator === "AND") {
			return operand.every((subFilter: any) => this.evaluateFilter(subFilter, record));
		} else {
			return operand.some((subFilter: any) => this.evaluateFilter(subFilter, record));
		}
	}

	private static evaluateNotFilter(operand: any, record: any): boolean {
		if (typeof operand !== "object" || operand === null || Array.isArray(operand)) {
			throw new InsightError("NOT operand must be an object");
		}
		return !this.evaluateFilter(operand, record);
	}

	private static evaluateComparisonFilter(operator: string, operand: any, record: any): boolean {
		if (typeof operand !== "object" || operand === null || Array.isArray(operand)) {
			throw new InsightError(`${operator} operand must be an object`);
		}
		const subKeys = Object.keys(operand);
		if (subKeys.length !== 1) {
			throw new InsightError(`${operator} operand must have exactly one key`);
		}
		const key = subKeys[0];
		const targetValue = operand[key];
		const recordValue = record[key];
		if (typeof recordValue !== "number") {
			throw new InsightError(`Record value for ${key} is not a number`);
		}
		switch (operator) {
			case "LT":
				return recordValue < targetValue;
			case "GT":
				return recordValue > targetValue;
			case "EQ":
				return recordValue === targetValue;
			default:
				throw new InsightError(`Unknown comparison operator: ${operator}`);
		}
	}

	private static evaluateISFilter(operand: any, record: any): boolean {
		if (typeof operand !== "object" || operand === null || Array.isArray(operand)) {
			throw new InsightError("IS operand must be an object");
		}
		const subKeys = Object.keys(operand);
		if (subKeys.length !== 1) {
			throw new InsightError("IS operand must have exactly one key");
		}
		const key = subKeys[0];
		const targetString = operand[key];
		const recordString = record[key];
		if (typeof recordString !== "string") {
			// REMOVE LATER
			// COME BACK

			throw new InsightError(`Record value for ${key} is not a string`);
		}
		return this.evaluateStringComparison(recordString, targetString);
	}

	private static evaluateStringComparison(recordStr: string, queryStr: string): boolean {
		if (queryStr === "*") return true;
		const startsWithWildcard = queryStr.startsWith("*");
		const endsWithWildcard = queryStr.endsWith("*");
		let core = queryStr;
		if (startsWithWildcard) core = core.slice(1);
		if (endsWithWildcard) core = core.slice(0, -1);

		if (startsWithWildcard && endsWithWildcard) {
			return recordStr.includes(core);
		} else if (startsWithWildcard) {
			return recordStr.endsWith(core);
		} else if (endsWithWildcard) {
			return recordStr.startsWith(core);
		} else {
			return recordStr === queryStr;
		}
	}
}
