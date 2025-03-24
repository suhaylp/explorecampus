import { InsightError } from "../../IInsightFacade";

function isObject(obj: any): boolean {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

function getAllowedFields(datasetKind: "rooms" | "sections"): string[] {
	return datasetKind === "sections" ? ["avg", "pass", "fail", "audit", "year"] : ["lat", "lon", "seats"];
}

function getValidOps(): string[] {
	return ["MAX", "MIN", "AVG", "SUM", "COUNT"];
}
function validateApplyRule(rule: any, allowed: string[], validOps: string[], applyKeySet: Set<string>): void {
	if (!isObject(rule)) throw new InsightError("Each APPLY rule must be an object");
	const ruleKeys = Object.keys(rule);
	if (ruleKeys.length !== 1) throw new InsightError("Each APPLY rule must have exactly one key");
	const key = ruleKeys[0];

	// Ensure the applyKey does not contain an underscore.
	if (key.includes("_")) {
		throw new InsightError("APPLY key cannot contain underscores");
	}

	if (applyKeySet.has(key)) throw new InsightError(`Duplicate APPLY key: ${key}`);
	applyKeySet.add(key);

	const opObj = rule[key];
	if (!isObject(opObj)) throw new InsightError("Each APPLY rule's value must be an object");
	const opKeys = Object.keys(opObj);
	if (opKeys.length !== 1 || !validOps.includes(opKeys[0])) {
		throw new InsightError("Each APPLY rule must have exactly one operator: MAX, MIN, AVG, SUM, or COUNT");
	}

	if (["MAX", "MIN", "AVG", "SUM"].includes(opKeys[0])) {
		const parts = opObj[opKeys[0]].split("_");
		if (parts.length !== 2 || !allowed.includes(parts[1])) {
			throw new InsightError(`Operator ${opKeys[0]} applied to non-numeric key ${opObj[opKeys[0]]}`);
		}
	}
}

export class TransformationsValidator {
	public static validateTransformations(transformations: any, datasetKind: "rooms" | "sections"): void {
		if (!isObject(transformations)) {
			throw new InsightError("TRANSFORMATIONS must be an object");
		}
		const keys: string[] = Object.keys(transformations);
		if (!keys.includes("GROUP") || !keys.includes("APPLY")) {
			throw new InsightError("TRANSFORMATIONS must contain GROUP and APPLY");
		}
		if (!Array.isArray(transformations.GROUP) || transformations.GROUP.length === 0) {
			throw new InsightError("GROUP must be a non-empty array");
		}
		if (!Array.isArray(transformations.APPLY)) {
			throw new InsightError("APPLY must be an array");
		}

		const allowed: string[] = getAllowedFields(datasetKind);
		const validOps: string[] = getValidOps();
		const applyKeySet = new Set<string>();

		for (const rule of transformations.APPLY) {
			validateApplyRule(rule, allowed, validOps, applyKeySet);
		}
	}

	public static validateColumns(columns: string[], transformations: any): void {
		const groupKeys: string[] = transformations.GROUP;
		const applyKeys: string[] = transformations.APPLY.map((rule: any) => Object.keys(rule)[0]);
		for (const col of columns) {
			if (!groupKeys.includes(col) && !applyKeys.includes(col)) {
				throw new InsightError(`Column "${col}" must appear in GROUP or be defined in APPLY`);
			}
		}
	}
}
