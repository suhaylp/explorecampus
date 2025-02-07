import { InsightError } from "./IInsightFacade";
import { QueryColumnsValidator } from "./QueryColumnsValidator";
import { QueryOrderValidator } from "./QueryOrderValidator";

export class OptionsValidator {
	public static validateOptions(options: any): void {
		if (!options || typeof options !== "object") {
			throw new InsightError("OPTIONS must be an object");
		}

		if (!("COLUMNS" in options)) {
			throw new InsightError("OPTIONS must include a COLUMNS key");
		}

		QueryColumnsValidator.validateColumns(options.COLUMNS);

		QueryOrderValidator.validateOrder(options.ORDER, options.COLUMNS);
	}
}
