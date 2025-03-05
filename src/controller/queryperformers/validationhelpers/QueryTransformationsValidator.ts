import { InsightError } from "../../IInsightFacade";

export class TransformationsValidator {
    public static validateTransformations(transformations: any): void {
        if (typeof transformations !== "object" || transformations === null || Array.isArray(transformations)) {
            throw new InsightError("TRANSFORMATIONS must be an object");
        }
        const keys = Object.keys(transformations);
        if (!keys.includes("GROUP") || !keys.includes("APPLY")) {
            throw new InsightError("TRANSFORMATIONS must contain GROUP and APPLY");
        }
        if (!Array.isArray(transformations.GROUP) || transformations.GROUP.length === 0) {
            throw new InsightError("GROUP must be a non-empty array");
        }
        if (!Array.isArray(transformations.APPLY)) {
            throw new InsightError("APPLY must be an array");
        }
        for (const rule of transformations.APPLY) {
            if (typeof rule !== "object" || rule === null || Array.isArray(rule)) {
                throw new InsightError("Each APPLY rule must be an object");
            }
            const ruleKeys = Object.keys(rule);
            if (ruleKeys.length !== 1) {
                throw new InsightError("Each APPLY rule must have exactly one key");
            }
            const applyTokenObj = rule[ruleKeys[0]];
            if (typeof applyTokenObj !== "object" || applyTokenObj === null || Array.isArray(applyTokenObj)) {
                throw new InsightError("Each APPLY rule's value must be an object");
            }
            const operators = ["MAX", "MIN", "AVG", "SUM", "COUNT"];
            const opKeys = Object.keys(applyTokenObj);
            if (opKeys.length !== 1 || !operators.includes(opKeys[0])) {
                throw new InsightError("Each APPLY rule must have exactly one operator: MAX, MIN, AVG, SUM, or COUNT");
            }
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
