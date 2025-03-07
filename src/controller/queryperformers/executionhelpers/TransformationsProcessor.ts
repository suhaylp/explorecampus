import Decimal from "decimal.js";


export function groupData(data: any[], groupKeys: string[]): Map<string, any[]> {
	const groups = new Map<string, any[]>();
	data.forEach((record) => {
		// should we have undefined as fallback?
		const groupIdentifier = groupKeys.map(key => record[key] ?? "undefined").join("|");
		if (!groups.has(groupIdentifier)) {
			groups.set(groupIdentifier, []);
		}
		groups.get(groupIdentifier)?.push(record);
		console.log(record)
	});
	return groups;
}

type Aggregator = (records: any[], field: string) => number;

const aggregators: { [op: string]: Aggregator } = {
	MAX: (records, field) => Math.max(...records.map(r => r[field] ?? 0)),
	MIN: (records, field) => Math.min(...records.map(r => r[field] ?? 0)),
	SUM: (records, field) => {
		const sum = records.reduce((acc, r) => acc.plus(new Decimal(r[field] ?? 0)), new Decimal(0));
		return Number(sum.toFixed(2));
	},
	AVG: (records, field) => {
		const total = records.reduce((acc, r) => acc.plus(new Decimal(r[field] ?? 0)), new Decimal(0));
		return Number(total.dividedBy(records.length).toFixed(2));
	},
	COUNT: (records, field) => new Set(records.map(r => r[field])).size,
};

export function computeAggregationForRule(records: any[], rule: any): number {
	const applyKey = Object.keys(rule)[0];
	const opObj = rule[applyKey];
	const operator = Object.keys(opObj)[0];
	const field = opObj[operator];
	if (!(operator in aggregators)) {
		throw new Error(`Unsupported operator: ${operator}`);
	}
	return aggregators[operator](records, field);
}


export function applyAggregations(
	groups: Map<string, any[]>,
	applyRules: any[],
	groupKeys: string[]
): any[] {
	const results: any[] = [];
	groups.forEach((records) => {
		const result: any = {};
		const firstRecord = records[0];
		groupKeys.forEach((key) => {
			result[key] = firstRecord[key];
		});
		for (const rule of applyRules) {
			result[Object.keys(rule)[0]] = computeAggregationForRule(records, rule);
		}
		results.push(result);
	});
	return results;
}


export function performTransformations(
	data: any[],
	groupKeys: string[],
	applyRules: any[]
): any[] {
	const groups = groupData(data, groupKeys);
	return applyAggregations(groups, applyRules, groupKeys);
}
