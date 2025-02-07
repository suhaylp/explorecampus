export class OrderEvaluator {
	public static order(records: any[], orderKey: string): any[] {
		return records.sort((a, b) => {
			if (a[orderKey] < b[orderKey]) return -1;
			if (a[orderKey] > b[orderKey]) return 1;
			return 0;
		});
	}
}
