// ProjectionEvaluator.ts
export class ProjectionEvaluator {
	public static project(records: any[], columns: string[]): any[] {
		return records.map((record) => {
			const projected: any = {};
			for (const col of columns) {
				projected[col] = record[col];
			}
			return projected;
		});
	}
}
