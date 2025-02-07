import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import path from "path";

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
		// sections = await getContentFromArchives("pair.zip");
		sections = await getContentFromArchives("singleCourse.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			await clearDisk();

			facade = new InsightFacade();
		});

		it("should accept valid course 1", async function () {
			await expect(facade.addDataset("courseID", sections, InsightDatasetKind.Sections)).to.eventually.include(
				"courseID"
			);
		});

		it("should reject with  an empty dataset id 2", async function () {
			// Read the "Free Mutant Walkthrough" in the spec for tips on how to get started!
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject adding a dataset with whitespace-only ID 3", async function () {
			await expect(facade.addDataset("   ", sections, InsightDatasetKind.Sections)).to.be.eventually.rejectedWith(
				InsightError
			);
		});

		it("should reject adding a dataset with underscore ID 4", async function () {
			await expect(
				facade.addDataset("under_score", sections, InsightDatasetKind.Sections)
			).to.be.eventually.rejectedWith(InsightError);
		});

		it("should reject adding a dataset with a duplicate ID 5", async function () {
			const id = "courses1";
			const content = sections;
			const kind = InsightDatasetKind.Sections;

			await facade.addDataset(id, content, kind);
			await expect(facade.addDataset(id, content, kind)).to.be.eventually.rejectedWith(InsightError);
		});

		// not rooms?
		it("should reject adding invalid kind 6", async function () {
			await expect(facade.addDataset("yolo", sections, "" as InsightDatasetKind)).to.be.eventually.rejectedWith(
				InsightError
			);
		});

		// Make one more for invalid json/ string as input
		it("should reject adding with badString 7", async function () {
			const badString = "i'm hungry";
			await expect(facade.addDataset("hi", badString, InsightDatasetKind.Sections)).to.be.eventually.rejectedWith(
				InsightError
			);
		});

		it("should reject adding with invalid JSON syntax 7.5", async function () {
			const invalidJsonContent: string = await getContentFromArchives("badJSON.zip");
			await expect(
				facade.addDataset("hi", invalidJsonContent, InsightDatasetKind.Sections)
			).to.be.eventually.rejectedWith(InsightError);
		});

		// BADDDDDDDDDDDDDDDDD. Good now?
		it("should reject adding with invalid file structure 8", async function () {
			const badFileStructure: string = await getContentFromArchives("badFileStructure.zip");
			await expect(
				facade.addDataset("bye", badFileStructure, InsightDatasetKind.Sections)
			).to.be.eventually.rejectedWith(InsightError);
		});

		it("should reject adding with no courses inside folder 8.5", async function () {
			const noCourses: string = await getContentFromArchives("noCourses.zip");
			await expect(
				facade.addDataset("noCourses", noCourses, InsightDatasetKind.Sections)
			).to.be.eventually.rejectedWith(InsightError);
		});

		it("should reject adding with no sections 9", async function () {
			const noSections: string = await getContentFromArchives("noSections.zip");
			await expect(facade.addDataset("no", noSections, InsightDatasetKind.Sections)).to.be.eventually.rejectedWith(
				InsightError
			);
		});

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

		// New Test: Verify that added dataset contains nonzero sections and is persisted correctly.
		it("should store non-zero sections in dataset and match persisted data", async function () {
			const id = "aDataset";
			const result = await facade.addDataset(id, sections, InsightDatasetKind.Sections);
			expect(result).to.include(id);

			// Verify via listDatasets
			const datasets = await facade.listDatasets();
			const dsMeta = datasets.find((ds) => ds.id === id);
			expect(dsMeta).to.not.be.undefined;
			expect(dsMeta!.numRows).to.be.greaterThan(0);

			// Read the persisted file from disk.
			const datasetFilePath = path.join(__dirname, "../../data", `${id}.json`);
			const persistedDataset = await fs.readJson(datasetFilePath);
			//console.log("Persisted dataset contents:", persistedDataset);
			expect(persistedDataset.meta.numRows).to.equal(dsMeta!.numRows);
			expect(persistedDataset.data.length).to.equal(dsMeta!.numRows);
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(async function () {
			await clearDisk();

			facade = new InsightFacade();
		});

		it("should accept removal of dataset 10", async function () {
			sections = await getContentFromArchives("singleCourse.zip");
			await facade.addDataset("first", sections, InsightDatasetKind.Sections);
			await facade.addDataset("second", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("first");
			return expect(facade.listDatasets()).to.become([
				{
					id: "second",
					kind: InsightDatasetKind.Sections,
					numRows: 2,
				},
			]);
		});

		it("should reject removing a dataset with whitespace-only ID 11", async function () {
			await expect(facade.removeDataset("   ")).to.be.eventually.rejectedWith(InsightError);
		});

		it("should reject removing a dataset with empty ID 12", async function () {
			await expect(facade.removeDataset("")).to.be.eventually.rejectedWith(InsightError);
		});

		it("should reject removing a dataset with underscore ID 13", async function () {
			await expect(facade.removeDataset("under_score")).to.be.eventually.rejectedWith(InsightError);
		});

		it("should reject removing a dataset that does not exist 14", async function () {
			await facade.addDataset("real", sections, InsightDatasetKind.Sections);
			return expect(facade.removeDataset("unreal")).to.be.eventually.rejectedWith(NotFoundError);
		});

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

		it("should return an empty array if no datasets are added 15", async function () {
			const datasets = await facade.listDatasets();
			expect(datasets).to.have.deep.members([]);
		});

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
			// COMMENTED OUT
			let result: InsightResult[] = []; // dummy value before being reassigned
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					// errorExpected is false, expected is a result of tuples
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}

				// to determine what to put here :)
				// if you catch an error and it is expected
				if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceof(ResultTooLargeError);
				} else if (expected === "InsightError") {
					expect(err).to.be.instanceof(InsightError);
				}
				// expect(err).to.be.instanceOf(expected);
				return; // optional?
			}

			// expected an error but did not catch
			if (errorExpected) {
				// errorExpected is true, expect is error
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}

			// to determine what to put here :)
			// no error, no expectation, return result
			// change this?
			expect(result).to.have.deep.members(expected);
			return; // optional?
		}

		// before(async function () {
		// 	try {
		// 		sections = await getContentFromArchives("singleCourse.zip");
		// 		console.log("Dataset loaded successfully");
		// 		await clearDisk();
		// 		console.log("Disk cleared successfully");
		// 	} catch (err) {
		// 		console.error("Error in before hook:", err);
		// 		throw err;  // Re-throw to fail the test suite if necessary
		// 	}
		// });

		before(async function () {
			// after(async function () {
			// added this
			await clearDisk();
			// });
			facade = new InsightFacade();
			//added
			sections = await getContentFromArchives("pair.zip");
			// let single;
			const single = await getContentFromArchives("singleCourse.zip");

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("single", single, InsightDatasetKind.Sections),
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
		// WRITE it TESTS HERE
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[valid/both_ends_wc.json] wc text wc", checkQuery);
		it("[valid/complex.json] complex", checkQuery);
		it("[valid/complicated.json] complicated", checkQuery);
		it("[valid/left_wc.json] wc text", checkQuery);
		it("[valid/no_order.json] no order okay", checkQuery);
		it("[valid/one_column.json] one column", checkQuery);
		it("[valid/right_wc.json] text wc", checkQuery);
		it("[valid/single_filter.json] one filter", checkQuery);
		it("[valid/zeroResults.json] no results", checkQuery);

		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/columns_empty.json] empty columns", checkQuery);
		it("[invalid/empty_string.json] empty query as string", checkQuery);
		it("[invalid/invalid_key.json] invalid key", checkQuery);
		it("[invalid/invalid_wildcard.json] invalid wildcard", checkQuery);
		it("[invalid/many_columns_datasets.json] many datasets", checkQuery);
		it("[invalid/many_where_datasets.json] many datasets", checkQuery);
		it("[invalid/missing_options.json] no options", checkQuery);
		it("[invalid/non_object.json] non object EQ", checkQuery);
		it("[invalid/notAdded.json] unadded dataset", checkQuery);
		it("[invalid/options_missing_columns.json] no columns", checkQuery);
		it("[invalid/order_notin_columns.json] bad order", checkQuery);
		it("[invalid/tooLarge.json] too large", checkQuery);

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

	describe("Data Persistence", function () {
		let persistenceFacade: InsightFacade;
		const datasetId = "testDataset";
		let persistenceSections: string;

		before(async function () {
			await clearDisk();
			persistenceSections = await getContentFromArchives("singleCourse.zip");
			persistenceFacade = new InsightFacade();
		});

		after(async function () {
			await clearDisk();
		});

		it("should create a dataset file on disk after addDataset", async function () {
			await persistenceFacade.addDataset(datasetId, persistenceSections, InsightDatasetKind.Sections);
			const datasetFilePath = path.join(__dirname, "../../data", `${datasetId}.json`);
			const exists = await fs.pathExists(datasetFilePath);
			expect(exists).to.be.true;
		});

		it("should load the dataset from disk in a new instance of InsightFacade", async function () {
			const newFacade = new InsightFacade();
			await new Promise((resolve) => setTimeout(resolve, 100));
			const datasets = await newFacade.listDatasets();
			const found = datasets.find((ds) => ds.id === datasetId);
			expect(found).to.not.be.undefined;
		});
	});
});
