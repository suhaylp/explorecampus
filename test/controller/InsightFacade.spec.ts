import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
//import { IInsightFacade, InsightDatasetKind, InsightError, NotFoundError } from "../../src/controller/IInsightFacade";

import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";
//import { clearDisk, getContentFromArchives } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		// afterEach(async function () {
		// 	//do stuff
		// });

		it("should reject with an empty dataset id", async function () {
			// Read the "Free Mutant Walkthrough" in the spec for tips on how to get started!
			try {
				//const result = await facade.addDataset("", sections, InsightDatasetKind.Sections);
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an only-whitespace dataset id", async function () {
			try {
				await facade.addDataset("  ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a dataset id containing underscore", async function () {
			try {
				await facade.addDataset("random_datasetid", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a dataset id that is duplicate (already exists)", async function () {
			try {
				await facade.addDataset("aNewDataset", sections, InsightDatasetKind.Sections);
				await facade.addDataset("aNewDataset", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a dataset content that is string type", async function () {
			try {
				await facade.addDataset("aNewDataset", "randomString", InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a dataset that has kind other than section", async function () {
			try {
				await facade.addDataset("aDataset", sections, "test" as InsightDatasetKind);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset with no section", async function () {
			try {
				await facade.addDataset("aDataset", await getContentFromArchives("noSection.zip"), InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset with nothing (no course)", async function () {
			try {
				await facade.addDataset("aDataset", await getContentFromArchives("nothing.zip"), InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset with bad folder name", async function () {
			try {
				await facade.addDataset(
					"aDataset",
					await getContentFromArchives("badFolderName.zip"),
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset with JSON errors", async function () {
			try {
				await facade.addDataset("aDataset", await getContentFromArchives("JSONerror.zip"), InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should accept dataset with no errors", async function () {
			const result = await facade.addDataset("aDataset", sections, InsightDatasetKind.Sections);
			expect(result).to.deep.equal(["aDataset"]);
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		// afterEach(async function () {
		// 	//do stuff
		// });
		it("should remove valid dataset", async function () {
			await facade.addDataset("temp", sections, InsightDatasetKind.Sections);
			const result = await facade.removeDataset("temp");
			expect(result).to.equal("temp");
		});

		it("should remove valid dataset and leave rest unchanged", async function () {
			try {
				await facade.addDataset("temp", await getContentFromArchives("oneCourse.zip"), InsightDatasetKind.Sections);
				await facade.addDataset("temp2", await getContentFromArchives("oneCourse.zip"), InsightDatasetKind.Sections);
				await facade.removeDataset("temp");
				const tempList = await facade.listDatasets();
				expect(tempList).to.deep.equal([
					{
						id: "temp2",
						kind: InsightDatasetKind.Sections,
						numRows: 6,
					},
				]);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removal with an empty dataset id", async function () {
			try {
				//const result = await facade.addDataset("", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removal with an only-whitespace dataset id", async function () {
			try {
				//const result = await facade.addDataset("", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("  ");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removal with a dataset id containing underscore", async function () {
			try {
				//const result = await facade.addDataset("", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("random_dataset");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removal dataset that does not exist", async function () {
			try {
				//const result = await facade.addDataset("", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("nonexistent");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});
	});

	describe("ListDatasets", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		// afterEach(async function () {
		// 	//do stuff
		// });

		it("should NOT reject with empty dataset list", async function () {
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([]);
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			//I COMMENTED THIS OUT, COME BACK
			let result: InsightResult[]; // dummy value before being reassigned
			try {
				//I COMMENTED THIS OUT, COME BACK
				result = await facade.performQuery(input);
				//await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				// TODO: replace this failing assertion with your assertions. You will need to reason about the code in this function
				// to determine what to put here :)

				if (expected === "NotFoundError") {
					expect(err).to.be.instanceOf(NotFoundError);
				} else if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else if (expected === "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else {
					expect.fail("Expected error was not thrown error");
				}
				return;
			}

			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}
			// TODO: replace this failing assertion with your assertions. You will need to reason about the code in this function
			// to determine what to put here :)
			// do something with result
			expect(result).to.deep.equal(expected);
			return;
			//return expect.fail("Write your assertion(s) here.");
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.

			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("oneCourse", await getContentFromArchives("oneCourse.zip"), InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[valid/wildcardBothSides.json] Wildcard both sides", checkQuery);
		it("[valid/wildcardLeft.json] Wildcard left", checkQuery);
		it("[valid/wildcardRight.json] Wildcard right", checkQuery);
		it("[valid/complexValid.json] Complex valid", checkQuery);
		it("[valid/noOutput.json] No output", checkQuery);
		it("[valid/unorderedOutput.json] Unordered output", checkQuery);
		it("[valid/complexExample.json] Complex example", checkQuery);
		it("[valid/singleColumn.json] Single column", checkQuery);
		it("[valid/multipleTest.json] Multiple test", checkQuery);

		it("[invalid/queryMissingWhere.json] Query missing WHERE", checkQuery);
		it("[invalid/queryMissingOptions.json] Query missing OPTIONS", checkQuery);
		it("[invalid/wildcardMiddle.json] Wildcard middle", checkQuery);
		it("[invalid/tooLarge.json] Too large", checkQuery);
		it("[invalid/orderKeyIsNotInColumns.json] Order key is not in columns", checkQuery);
		it("[invalid/queryNoInput.json] Query no input", checkQuery);
		it("[invalid/queryNoInputString.json] Query no input string", checkQuery);
		it("[invalid/referencedDatasetNotAdded.json] Referenced dataset not added", checkQuery);
		it("[invalid/moreThanOneDatasetWhere.json] More than one dataset WHERE", checkQuery);
		it("[invalid/moreThanOneDatasetOptions.json] More than one dataset OPTIONS", checkQuery);
		it("[invalid/invalidKeyType.json] Invalid key type", checkQuery);
		it("[invalid/noColumns.json] No columns", checkQuery);
		it("[invalid/optionNoColumns.json] Option no columns", checkQuery);
		it("[invalid/eqNotObject.json] EQ not object", checkQuery);
	});
});
