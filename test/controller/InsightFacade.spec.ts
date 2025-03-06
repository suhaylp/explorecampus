import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
// import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import path from "path";
import JSZip from "jszip";

// import { expect } from "chai";
import { parseBuildingHtml } from "../../src/controller/dataset/BuildingParserUtils";
import { QueryValidator } from "../../src/controller/queryperformers/QueryValidator";
// import { InsightDatasetKind, InsightError } from "../../src/controller/IInsightFacade";
import { performTransformations } from "../../src/controller/queryperformers/executionhelpers/TransformationsProcessor";
import { OrderEvaluator } from "../../src/controller/queryperformers/executionhelpers/OrderEvaluator";

import { fetchGeolocation } from "../../src/controller/dataset/GeoHelper";

import {
	validateSField,
	validateMField,
	validateSKey,
	validateMKey,
} from "../../src/controller/queryperformers/validationhelpers/QueryKeyValidator";
import InsightFacade from "../../src/controller/InsightFacade";
import { parseIndexHtml } from "../../src/controller/dataset/IndexParserUtils";
import { BuildingData } from "../../src/controller/dataset/IndexParserUtils";
import { TransformationsValidator } from "../../src/controller/queryperformers/validationhelpers/QueryTransformationsValidator";
// import {QueryExecutor} from "../../src/controller/queryperformers/QueryExecutor";
// import {QueryEngine} from "../../src/controller/queryperformers/QueryEngine";

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

	describe("OrderEvaluator.order", () => {
		const records = [
			{ a: 3, b: "c" },
			{ a: 1, b: "a" },
			{ a: 2, b: "b" },
		];

		describe("when order is a string", () => {
			it("should sort records in ascending order based on the provided key", () => {
				const sorted = OrderEvaluator.order([...records], "a");
				expect(sorted[0].a).to.equal(1);
				expect(sorted[1].a).to.equal(2);
				const three = 3;
				expect(sorted[2].a).to.equal(three);
			});

			it("should throw an error when the ORDER string is empty", () => {
				expect(() => OrderEvaluator.order([...records], "   ")).to.throw(InsightError, "ORDER string is empty");
			});
		});

		describe("when order is an object", () => {
			it("should throw an error if ORDER.dir is not 'UP' or 'DOWN'", () => {
				expect(() => OrderEvaluator.order([...records], { dir: "SIDE", keys: ["a"] })).to.throw(
					InsightError,
					"ORDER.dir must be either 'UP' or 'DOWN'"
				);
			});

			it("should throw an error if ORDER.keys is not a non-empty array", () => {
				expect(() => OrderEvaluator.order([...records], { dir: "UP", keys: [] })).to.throw(
					InsightError,
					"ORDER.keys must be a non-empty array"
				);
			});

			it("should sort records based on multiple keys in 'UP' direction", () => {
				// Construct records where first key is equal and second key differs.
				const multiRecords = [
					{ a: 1, b: "z" },
					{ a: 1, b: "a" },
					{ a: 2, b: "b" },
				];
				const orderObj = { dir: "UP", keys: ["a", "b"] };
				const sorted = OrderEvaluator.order([...multiRecords], orderObj);
				// With a ascending sort, record with a:1 and b:"a" should come before a:1 and b:"z"
				expect(sorted[0]).to.deep.equal({ a: 1, b: "a" });
				expect(sorted[1]).to.deep.equal({ a: 1, b: "z" });
				expect(sorted[2]).to.deep.equal({ a: 2, b: "b" });
			});

			it("should sort records based on multiple keys in 'DOWN' direction", () => {
				// Construct records where first key is equal and second key differs.
				const multiRecords = [
					{ a: 1, b: "a" },
					{ a: 1, b: "z" },
					{ a: 2, b: "b" },
				];
				const orderObj = { dir: "DOWN", keys: ["a", "b"] };
				const sorted = OrderEvaluator.order([...multiRecords], orderObj);
				// With a descending sort, record with a:2 should be first, and then records with a:1 are sorted in reverse alphabetical order.
				expect(sorted[0]).to.deep.equal({ a: 2, b: "b" });
				expect(sorted[1]).to.deep.equal({ a: 1, b: "z" });
				expect(sorted[2]).to.deep.equal({ a: 1, b: "a" });
			});
		});

		describe("when order is of invalid type", () => {
			it("should throw an error if order is not a string or an object", () => {
				const num = 123;
				expect(() => OrderEvaluator.order([...records], num as any)).to.throw(
					InsightError,
					"ORDER must be a string or a valid object"
				);
			});
		});
	});

	describe("TransformationsValidator.validateTransformations", () => {
		it("should throw error when transformations is not an object", () => {
			expect(() => TransformationsValidator.validateTransformations("not an object")).to.throw(
				InsightError,
				"TRANSFORMATIONS must be an object"
			);
			expect(() => TransformationsValidator.validateTransformations(null)).to.throw(
				InsightError,
				"TRANSFORMATIONS must be an object"
			);
			const three = 3;
			expect(() => TransformationsValidator.validateTransformations([1, 2, three])).to.throw(
				InsightError,
				"TRANSFORMATIONS must be an object"
			);
		});

		it("should throw error when GROUP or APPLY keys are missing", () => {
			expect(() => TransformationsValidator.validateTransformations({})).to.throw(
				InsightError,
				"TRANSFORMATIONS must contain GROUP and APPLY"
			);
			expect(() => TransformationsValidator.validateTransformations({ GROUP: ["dept"] })).to.throw(
				InsightError,
				"TRANSFORMATIONS must contain GROUP and APPLY"
			);
			expect(() => TransformationsValidator.validateTransformations({ APPLY: [] })).to.throw(
				InsightError,
				"TRANSFORMATIONS must contain GROUP and APPLY"
			);
		});

		it("should throw error when GROUP is not a non-empty array", () => {
			// GROUP is not an array.
			expect(() => TransformationsValidator.validateTransformations({ GROUP: "not an array", APPLY: [] })).to.throw(
				InsightError,
				"GROUP must be a non-empty array"
			);

			// GROUP is an empty array.
			expect(() => TransformationsValidator.validateTransformations({ GROUP: [], APPLY: [] })).to.throw(
				InsightError,
				"GROUP must be a non-empty array"
			);
		});

		it("should throw error when APPLY is not an array", () => {
			expect(() =>
				TransformationsValidator.validateTransformations({ GROUP: ["dept"], APPLY: "not an array" })
			).to.throw(InsightError, "APPLY must be an array");
		});

		describe("APPLY rule validations", () => {
			const baseValid = {
				GROUP: ["dept"],
				APPLY: [],
			};

			it("should throw error if an APPLY rule is not an object", () => {
				// APPLY contains a string instead of an object.
				expect(() =>
					TransformationsValidator.validateTransformations({
						...baseValid,
						APPLY: ["not an object"],
					})
				).to.throw(InsightError, "Each APPLY rule must be an object");
			});

			it("should throw error if an APPLY rule has not exactly one key", () => {
				// APPLY rule with two keys.
				expect(() =>
					TransformationsValidator.validateTransformations({
						...baseValid,
						APPLY: [{ a: { MAX: "courses_avg" }, b: { MIN: "courses_avg" } }],
					})
				).to.throw(InsightError, "Each APPLY rule must have exactly one key");
			});

			it("should throw error if an APPLY rule's value is not an object", () => {
				// APPLY rule with value that is not an object.
				expect(() =>
					TransformationsValidator.validateTransformations({
						...baseValid,
						APPLY: [{ ruleKey: "not an object" }],
					})
				).to.throw(InsightError, "Each APPLY rule's value must be an object");
			});

			it("should throw error if an APPLY rule's operator is invalid", () => {
				// APPLY rule with an invalid operator.
				expect(() =>
					TransformationsValidator.validateTransformations({
						...baseValid,
						APPLY: [{ ruleKey: { INVALID: "courses_avg" } }],
					})
				).to.throw(InsightError, "Each APPLY rule must have exactly one operator: MAX, MIN, AVG, SUM, or COUNT");

				// APPLY rule with more than one key in its operator object.
				expect(() =>
					TransformationsValidator.validateTransformations({
						...baseValid,
						APPLY: [{ ruleKey: { MAX: "courses_avg", MIN: "courses_avg" } }],
					})
				).to.throw(InsightError, "Each APPLY rule must have exactly one operator: MAX, MIN, AVG, SUM, or COUNT");
			});

			it("should pass for a valid transformations object", () => {
				const validTransformations = {
					GROUP: ["dept", "id"],
					APPLY: [{ maxGrade: { MAX: "grade" } }, { countStudents: { COUNT: "students" } }],
				};
				expect(() => TransformationsValidator.validateTransformations(validTransformations)).to.not.throw();
			});
		});
	});

	describe("TransformationsValidator.validateColumns", () => {
		it("should throw error if a column is not in GROUP or APPLY keys", () => {
			const transformations = {
				GROUP: ["dept", "id"],
				APPLY: [{ maxGrade: { MAX: "grade" } }],
			};
			// "avg" is neither in GROUP nor defined in APPLY.
			expect(() => TransformationsValidator.validateColumns(["dept", "avg"], transformations)).to.throw(
				InsightError,
				'Column "avg" must appear in GROUP or be defined in APPLY'
			);
		});

		it("should not throw error if all columns are in GROUP or APPLY keys", () => {
			const transformations = {
				GROUP: ["dept", "id"],
				APPLY: [{ maxGrade: { MAX: "grade" } }],
			};
			expect(() =>
				TransformationsValidator.validateColumns(["dept", "id", "maxGrade"], transformations)
			).to.not.throw();
		});
	});

	describe("parseIndexHtml", () => {
		it("should extract building data from valid index HTML", () => {
			const sampleHtml = `
      <html>
        <body>
          <table>
            <tbody>
              <tr>
                <td class="views-field views-field-title">
                  <a href="./campus/discover/buildings-and-classrooms/BIOL.htm" title="Building Details and Map">
                    BIOL
                  </a>
                </td>
                <td class="views-field views-field-field-building-address">
                  Biological Sciences, 6270 University Blvd
                </td>
              </tr>
              <tr>
                <td class="views-field views-field-title">
                  <a href="./campus/discover/buildings-and-classrooms/LSC.htm" title="Building Details and Map">
                    LSC
                  </a>
                </td>
                <td class="views-field views-field-field-building-address">
                  Life Sciences Centre, 2350 Health Sciences Mall
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

			const expected: BuildingData[] = [
				{
					shortname: "BIOL",
					address: "Biological Sciences, 6270 University Blvd",
					href: "./campus/discover/buildings-and-classrooms/BIOL.htm",
				},
				{
					shortname: "LSC",
					address: "Life Sciences Centre, 2350 Health Sciences Mall",
					href: "./campus/discover/buildings-and-classrooms/LSC.htm",
				},
			];

			const result = parseIndexHtml(sampleHtml);
			expect(result).to.deep.equal(expected);
		});

		it("should return an empty array if no valid building data is found", () => {
			// HTML without any <td> with class "views-field views-field-title"
			const invalidHtml = `
      <html>
        <body>
          <table>
            <tbody>
              <tr>
                <td class="not-the-right-class">No building here</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
			const result = parseIndexHtml(invalidHtml);
			expect(result).to.be.an("array").that.is.empty;
		});

		it("should ignore entries missing href, shortname or address", () => {
			const partialHtml = `
      <html>
        <body>
          <table>
            <tbody>
              <tr>
                <!-- Missing href -->
                <td class="views-field views-field-title">
                  <a title="Building Details and Map">BIOL</a>
                </td>
                <td class="views-field views-field-field-building-address">
                  Biological Sciences, 6270 University Blvd
                </td>
              </tr>
              <tr>
                <!-- Missing address -->
                <td class="views-field views-field-title">
                  <a href="./campus/discover/buildings-and-classrooms/LSC.htm" title="Building Details and Map">
                    LSC
                  </a>
                </td>
                <td class="views-field views-field-field-building-address"></td>
              </tr>
              <tr>
                <!-- Complete valid entry -->
                <td class="views-field views-field-title">
                  <a href="./campus/discover/buildings-and-classrooms/MC.htm" title="Building Details and Map">
                    MC
                  </a>
                </td>
                <td class="views-field views-field-field-building-address">
                  Main Campus, 123 Campus Way
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
			const expected: BuildingData[] = [
				{
					shortname: "MC",
					address: "Main Campus, 123 Campus Way",
					href: "./campus/discover/buildings-and-classrooms/MC.htm",
				},
			];
			const result = parseIndexHtml(partialHtml);
			expect(result).to.deep.equal(expected);
		});
	});

	describe("InsightFacade.performQuery Integration Test (Rooms Query)", function () {
		const timo = 10000;
		this.timeout(timo);
		let insightFacade: InsightFacade;

		before(async () => {
			insightFacade = new InsightFacade();
			// Dummy dataset for rooms.
			// Only records with more than 300 seats and furniture containing "Tables" will qualify.
			const dummyRooms = [
				{ rooms_shortname: "OSBO", rooms_seats: 442, rooms_furniture: "Tables and Chairs", rooms_address: "Addr1" },
				{ rooms_shortname: "OSBO", rooms_seats: 400, rooms_furniture: "Tables and Chairs", rooms_address: "Addr1" },
				{ rooms_shortname: "OSBO", rooms_seats: 300, rooms_furniture: "Tables and Chairs", rooms_address: "Addr1" }, // Fails GT condition
				{ rooms_shortname: "OSBO", rooms_seats: 450, rooms_furniture: "Chairs", rooms_address: "Addr1" }, // Fails IS condition
				{ rooms_shortname: "HEBB", rooms_seats: 375, rooms_furniture: "Large Tables", rooms_address: "Addr2" },
				{ rooms_shortname: "LSC", rooms_seats: 350, rooms_furniture: "Tables", rooms_address: "Addr3" },
			];

			// We want only OSBO, HEBB, and LSC groups.
			const dummyDataset = {
				meta: { id: "rooms", kind: InsightDatasetKind.Rooms, numRows: dummyRooms.length },
				data: dummyRooms,
			};

			// Inject the dummy dataset into InsightFacade's datasets map.
			// (Using a type assertion to access the private field.)
			(insightFacade as any).datasets.set("rooms", dummyDataset);
		});

		it("should perform the rooms query and return correct results", async () => {
			const query = {
				WHERE: {
					AND: [{ IS: { rooms_furniture: "*Tables*" } }, { GT: { rooms_seats: 300 } }],
				},
				OPTIONS: {
					COLUMNS: ["rooms_shortname", "maxSeats"],
					ORDER: { dir: "DOWN", keys: ["maxSeats"] },
				},
				TRANSFORMATIONS: {
					GROUP: ["rooms_shortname"],
					APPLY: [{ maxSeats: { MAX: "rooms_seats" } }],
				},
			};

			const results = await insightFacade.performQuery(query);
			// We expect three groups: OSBO, HEBB, and LSC.
			const three = 3;
			expect(results).to.be.an("array").with.lengthOf(three);

			// Sorted descending by maxSeats: OSBO (442), then HEBB (375), then LSC (350).
			expect(results[0].rooms_shortname).to.equal("OSBO");
			const num1 = 442;
			expect(results[0].maxSeats).to.equal(num1);
			expect(results[1].rooms_shortname).to.equal("HEBB");
			const num2 = 375;
			expect(results[1].maxSeats).to.equal(num2);
			expect(results[2].rooms_shortname).to.equal("LSC");
			const num3 = 350;
			expect(results[2].maxSeats).to.equal(num3);
		});
	});

	describe("TransformationsProcessor with Missing Values", () => {
		const sampleData = [
			{ sections_title: "310", sections_avg: 90 },
			{ sections_title: "310", sections_avg: 80 },
			{ sections_title: "310" }, // missing sections_avg, treat as 0
			{ sections_title: "310", sections_avg: 85 },
			{ sections_title: "210", sections_avg: 74 },
			{ sections_title: "210", sections_avg: 78 },
			{ sections_title: "210", sections_avg: 72 },
			{ sections_title: "210", sections_avg: 85 },
		];
		const groupKeys = ["sections_title"];
		const applyRules = [{ overallAvg: { AVG: "sections_avg" } }];

		it("should handle missing fields by treating them as 0", () => {
			const results = performTransformations(sampleData, groupKeys, applyRules);
			expect(results).to.be.an("array").with.lengthOf(2);

			const group310 = results.find((r) => r.sections_title === "310");
			const group210 = results.find((r) => r.sections_title === "210");

			expect(group310).to.exist;
			expect(group210).to.exist;

			const num1 = 63.75;
			const num2 = 77.25;
			const tol = 0.01;

			// For group "310": average = (90 + 80 + 0 + 85)/4 = 63.75
			expect(group310.overallAvg).to.be.closeTo(num1, tol);
			// For group "210": average = (74+78+72+85)/4 = 77.25
			expect(group210.overallAvg).to.be.closeTo(num2, tol);
		});
	});

	// it("should perform the rooms query and return correct results", async () => {
	// 	const query = {
	//
	//  "WHERE": {},
	//
	//  "OPTIONS": {
	//
	//       "COLUMNS": ["sections_title", "overallAvg"]
	//
	//    },
	//
	//    "TRANSFORMATIONS": {
	//
	//       "GROUP": ["sections_title"],
	//
	//       "APPLY": [{
	//
	//           "overallAvg": {
	//
	//              "AVG": "sections_avg"
	//
	//           }
	//
	//       }]
	//
	//    }
	//
	// },
	// 	};
	//
	// 	const results = await insightFacade.performQuery(query);
	// 	// We expect three groups: OSBO, HEBB, and LSC.
	// 	const three = 3;
	// 	expect(results).to.be.an("array").with.lengthOf(three);
	//
	// 	// Sorted descending by maxSeats: OSBO (442), then HEBB (375), then LSC (350).
	// 	expect(results[0].rooms_shortname).to.equal("OSBO");
	// 	const num1 = 442;
	// 	expect(results[0].maxSeats).to.equal(num1);
	// 	expect(results[1].rooms_shortname).to.equal("HEBB");
	// 	const num2 = 375;
	// 	expect(results[1].maxSeats).to.equal(num2);
	// 	expect(results[2].rooms_shortname).to.equal("LSC");
	// 	const num3 = 350;
	// 	expect(results[2].maxSeats).to.equal(num3);
	// });

	describe("OrderEvaluator", () => {
		it("should sort records in descending order by maxSeats", () => {
			const data = [
				{ rooms_fullname: "A", maxSeats: 150 },
				{ rooms_fullname: "B", maxSeats: 200 },
			];
			const sorted = OrderEvaluator.order(data, { dir: "DOWN", keys: ["maxSeats"] });
			expect(sorted[0].rooms_fullname).to.equal("B");
			expect(sorted[1].rooms_fullname).to.equal("A");
		});
	});

	describe("InsightFacade performQuery with rooms dataset", () => {
		let insightFacade: InsightFacade;
		const sampleRoomsData = [
			{ rooms_fullname: "A", rooms_seats: 150, rooms_shortname: "A", rooms_number: "101" },
			{ rooms_fullname: "A", rooms_seats: 100, rooms_shortname: "A", rooms_number: "102" },
			{ rooms_fullname: "B", rooms_seats: 200, rooms_shortname: "B", rooms_number: "201" },
		];

		before(async () => {
			insightFacade = new InsightFacade();
			// Wait for initialization if necessary
			// Directly inject a dummy "rooms" dataset into the in-memory map.
			// (This is for testing purposes only.)
			(insightFacade as any).datasets.set("rooms", {
				meta: { id: "rooms", kind: InsightDatasetKind.Rooms, numRows: sampleRoomsData.length },
				data: sampleRoomsData,
			});
		});

		it("should perform a valid query with TRANSFORMATIONS", async () => {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["rooms_fullname", "maxSeats"],
					ORDER: { dir: "DOWN", keys: ["maxSeats"] },
				},
				TRANSFORMATIONS: {
					GROUP: ["rooms_fullname"],
					APPLY: [{ maxSeats: { MAX: "rooms_seats" } }],
				},
			};

			const results = await insightFacade.performQuery(query);
			expect(results).to.be.an("array").with.lengthOf(2);
			// Since group "B" (max 200) should come before group "A" (max 150) when ordering DOWN
			expect(results[0].rooms_fullname).to.equal("B");
			const num1 = 200;
			expect(results[0].maxSeats).to.equal(num1);
			expect(results[1].rooms_fullname).to.equal("A");
			const num2 = 150;
			expect(results[1].maxSeats).to.equal(num2);
		});
	});

	describe("TransformationsProcessor", () => {
		const sampleData = [
			{ rooms_fullname: "A", rooms_seats: 100, rooms_shortname: "A", rooms_number: "101" },
			{ rooms_fullname: "A", rooms_seats: 150, rooms_shortname: "A", rooms_number: "102" },
			{ rooms_fullname: "B", rooms_seats: 200, rooms_shortname: "B", rooms_number: "201" },
			{ rooms_fullname: "B", rooms_seats: 250, rooms_shortname: "B", rooms_number: "202" },
		];
		const groupKeys = ["rooms_fullname"];
		const applyRules = [
			{ maxSeats: { MAX: "rooms_seats" } },
			{ avgSeats: { AVG: "rooms_seats" } },
			{ countRooms: { COUNT: "rooms_number" } },
		];

		it("should group data correctly and apply aggregations", () => {
			const results = performTransformations(sampleData, groupKeys, applyRules);
			expect(results).to.be.an("array").with.lengthOf(2);

			const groupA = results.find((r) => r.rooms_fullname === "A");
			const groupB = results.find((r) => r.rooms_fullname === "B");

			expect(groupA).to.exist;
			const num3 = 150;
			expect(groupA.maxSeats).to.equal(num3);
			const num4 = 125.0;
			expect(groupA.avgSeats).to.equal(num4);
			expect(groupA.countRooms).to.equal(2);
			const num5 = 250;
			const num6 = 225.0;
			expect(groupB).to.exist;
			expect(groupB.maxSeats).to.equal(num5);
			expect(groupB.avgSeats).to.equal(num6);
			expect(groupB.countRooms).to.equal(2);
		});
	});

	describe("Combined Query Validator Tests", () => {
		it("should validate a basic query without TRANSFORMATIONS", () => {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["rooms_fullname", "rooms_seats"],
					ORDER: "rooms_seats",
				},
			};
			expect(() => QueryValidator.validateQuery(query, "rooms")).to.not.throw();
		});

		it("should validate a query with valid TRANSFORMATIONS", () => {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["rooms_fullname", "maxSeats"],
					ORDER: { dir: "DOWN", keys: ["maxSeats"] },
				},
				TRANSFORMATIONS: {
					GROUP: ["rooms_fullname"],
					APPLY: [{ maxSeats: { MAX: "rooms_seats" } }],
				},
			};
			expect(() => QueryValidator.validateQuery(query, "rooms")).to.not.throw();
		});

		it("should reject a query with TRANSFORMATIONS if a column is not in GROUP or APPLY", () => {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["rooms_fullname", "rooms_seats"], // rooms_seats is not in GROUP or APPLY
					ORDER: "rooms_fullname",
				},
				TRANSFORMATIONS: {
					GROUP: ["rooms_fullname"],
					APPLY: [{ maxSeats: { MAX: "rooms_seats" } }],
				},
			};
			expect(() => QueryValidator.validateQuery(query, "rooms")).to.throw(InsightError, /rooms_seats/);
		});
	});

	describe("BuildingParserUtils Tests", () => {
		it("should extract room data from sample building HTML with valid classes", () => {
			const sampleBuildingHtml = `
      <html>
        <body>
          <h1>Biological Sciences</h1>
          <p>6270 University Boulevard</p>
          <table>
            <tr>
              <th>Room</th>
              <th>Capacity</th>
              <th>Furniture type</th>
              <th>Room type</th>
              <th>More info</th>
            </tr>
            <tr>
              <td class="views-field views-field-field-room-number">1503</td>
              <td class="views-field views-field-field-room-capacity">16</td>
              <td class="views-field views-field-field-room-furniture">Classroom-Movable Tables & Chairs</td>
              <td class="views-field views-field-field-room-type">Small Group</td>
              <td class="views-field views-field-title"><a href="./BIOL1503.htm">More info</a></td>
            </tr>
            <tr>
              <td class="views-field views-field-field-room-number">2000</td>
              <td class="views-field views-field-field-room-capacity">228</td>
              <td class="views-field views-field-field-room-furniture">Classroom-Fixed Tablets</td>
              <td class="views-field views-field-field-room-type">Tiered Large Group</td>
              <td class="views-field views-field-title"><a href="./BIOL2000.htm">More info</a></td>
            </tr>
            <tr>
              <td class="views-field views-field-field-room-number">2200</td>
              <td class="views-field views-field-field-room-capacity">76</td>
              <td class="views-field views-field-field-room-furniture">Classroom-Fixed Tables/Movable Chairs</td>
              <td class="views-field views-field-field-room-type">Tiered Large Group</td>
              <td class="views-field views-field-title"><a href="./BIOL2200.htm">More info</a></td>
            </tr>
            <tr>
              <td class="views-field views-field-field-room-number">2519</td>
              <td class="views-field views-field-field-room-capacity">16</td>
              <td class="views-field views-field-field-room-furniture">Classroom-Movable Tables & Chairs</td>
              <td class="views-field views-field-field-room-type">Small Group</td>
              <td class="views-field views-field-title"><a href="./BIOL2519.htm">More info</a></td>
            </tr>
          </table>
        </body>
      </html>
    `;

			const buildingInfo = {
				shortname: "BIOL",
				address: "6270 University Boulevard",
				lat: 49.26125,
				lon: -123.24807,
				fullname: "Biological Sciences",
			};

			const rooms = parseBuildingHtml(sampleBuildingHtml, buildingInfo);
			const four = 4;
			expect(rooms).to.be.an("array").with.lengthOf(four);

			// Verify the first room's details
			const room1 = rooms[0];
			expect(room1.rooms_number).to.equal("1503");
			const num = 16;
			expect(room1.rooms_seats).to.equal(num);
			expect(room1.rooms_furniture).to.equal("Classroom-Movable Tables & Chairs");
			expect(room1.rooms_type).to.equal("Small Group");
			expect(room1.rooms_href).to.equal("./BIOL1503.htm");
			expect(room1.rooms_name).to.equal("BIOL_1503");
			expect(room1.rooms_fullname).to.equal("Biological Sciences");
		});
	});

	describe("GeoHelper Unit Tests", () => {
		it("should return valid lat and lon for a known valid address", async () => {
			const validAddress = "6245 Agronomy Road V6T 1Z4";
			try {
				const { lat, lon } = await fetchGeolocation(validAddress);
				expect(lat).to.be.a("number");
				expect(lon).to.be.a("number");
			} catch (error) {
				expect.fail(`Expected valid geolocation, but got error: ${(error as Error).message}`);
			}
		});

		it("should reject for an invalid address", async () => {
			const invalidAddress = "Invalid Address 123";
			try {
				await fetchGeolocation(invalidAddress);
				expect.fail("Expected fetchGeolocation to reject for an invalid address");
			} catch (error) {
				expect(error).to.be.instanceOf(Error);
				expect((error as Error).message).to.be.a("string");
			}
		});
	});

	// QueryKeyValidator - Rooms
	describe("QueryKeyValidator - Rooms", () => {
		it("should accept valid rooms SFields", () => {
			expect(() => validateSField("fullname", "rooms")).to.not.throw();
			expect(() => validateSField("shortname", "rooms")).to.not.throw();
			expect(() => validateSField("number", "rooms")).to.not.throw();
			expect(() => validateSField("name", "rooms")).to.not.throw();
			expect(() => validateSField("address", "rooms")).to.not.throw();
			expect(() => validateSField("type", "rooms")).to.not.throw();
			expect(() => validateSField("furniture", "rooms")).to.not.throw();
			expect(() => validateSField("href", "rooms")).to.not.throw();
		});

		it("should reject invalid rooms SFields", () => {
			expect(() => validateSField("dept", "rooms")).to.throw();
			expect(() => validateSField("id", "rooms")).to.throw();
		});

		it("should accept valid rooms MFields", () => {
			expect(() => validateMField("lat", "rooms")).to.not.throw();
			expect(() => validateMField("lon", "rooms")).to.not.throw();
			expect(() => validateMField("seats", "rooms")).to.not.throw();
		});

		it("should reject invalid rooms MFields", () => {
			expect(() => validateMField("avg", "rooms")).to.throw();
		});
	});

	// Tests for a Rooms dataset
	describe("QueryKeyValidator - Rooms", () => {
		it("should accept a valid string key for Rooms", () => {
			// Pass "rooms" explicitly as the dataset kind.
			expect(() => validateSKey("rooms_fullname", "rooms")).to.not.throw(InsightError);
		});

		it("should reject a string key with a wrong prefix for Rooms", () => {
			expect(() => validateSKey("sections_fullname", "rooms")).to.throw(InsightError);
			expect(() => validateSKey("fullname", "rooms")).to.throw(InsightError);
		});

		it("should accept a valid mkey for Rooms", () => {
			expect(() => validateMKey("rooms_seats", "rooms")).to.not.throw(InsightError);
		});

		it("should reject a mkey with a wrong prefix for Rooms", () => {
			expect(() => validateMKey("sections_avg", "rooms")).to.throw(InsightError);
			expect(() => validateMKey("avg", "rooms")).to.throw(InsightError);
		});
	});

	// Tests for a Sections dataset
	describe("QueryKeyValidator - Sections", () => {
		it("should accept a valid string key for Sections", () => {
			expect(() => validateSKey("sections_dept", "sections")).to.not.throw(InsightError);
		});

		it("should reject a string key with a wrong prefix for Sections", () => {
			expect(() => validateSKey("rooms_dept", "sections")).to.throw(InsightError);
			expect(() => validateSKey("dept", "sections")).to.throw(InsightError);
		});

		it("should accept a valid mkey for Sections", () => {
			expect(() => validateMKey("sections_avg", "sections")).to.not.throw(InsightError);
		});

		it("should reject a mkey with a wrong prefix for Sections", () => {
			expect(() => validateMKey("rooms_avg", "sections")).to.throw(InsightError);
			expect(() => validateMKey("avg", "sections")).to.throw(InsightError);
		});
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			await clearDisk();

			facade = new InsightFacade();
		});

		it("should reject with a new line dataset id 0", async function () {
			// Read the "Free Mutant Walkthrough" in the spec for tips on how to get started!
			try {
				await facade.addDataset("\n", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject with a /r dataset id 0.5", async function () {
			// Read the "Free Mutant Walkthrough" in the spec for tips on how to get started!
			try {
				await facade.addDataset("\r", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
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
	// Helper to create a dummy ZIP (as a base64 string)
	// The ZIP contains a folder "courses/" and one JSON file with minimal valid content.
	async function createDummyZip(): Promise<string> {
		const zip = new JSZip();
		const coursesFolder = zip.folder("courses");
		if (!coursesFolder) {
			throw new Error("Failed to create courses folder in zip");
		}
		// Dummy dataset data – adjust the keys to match what your implementation expects.
		const dummyData = {
			result: [
				{
					id: "123",
					Course: "CPSC 310",
					Title: "Software Engineering",
					Professor: "Dr. Smith",
					Subject: "CPSC",
					Year: 2020,
					Avg: 85,
					Pass: 100,
					Fail: 0,
					Audit: 0,
					Section: "1",
				},
			],
		};
		coursesFolder.file("course1.json", JSON.stringify(dummyData));
		return zip.generateAsync({ type: "base64" });
	}

	describe("C0 - Handling of Newline/Carriage Return in Dataset IDs", () => {
		let validDataset: string;

		before(async () => {
			validDataset = await createDummyZip();
		});

		// This test adds a dataset whose id contains newline/carriage-return characters.
		// The spec indicates that while addDataset() may allow these, they are not queryable.
		it("should add a dataset with newline/CR characters in its id but fail to query it", async () => {
			facade = new InsightFacade();
			// Use an id with newline and carriage return characters.
			const i = "test\r\nid";

			// Add the dataset – expected to succeed.
			await expect(facade.addDataset(i, validDataset, InsightDatasetKind.Sections)).to.eventually.be.an("array");

			// Verify that listDatasets includes the dataset.
			const datasets = await facade.listDatasets();
			expect(datasets).to.satisfy((ds: any[]) => ds.some((d) => d.id === i));

			// Construct a query referencing the dataset id exactly (including newline).
			// According to the discussion, such datasets are unqueryable.
			const query = {
				WHERE: {},
				OPTIONS: {
					// The transformation keys will be `${id}_field`
					COLUMNS: [`${i}_dept`, `${i}_avg`],
					ORDER: `${i}_avg`,
				},
			};

			// Expect the query to be rejected with an InsightError.
			await expect(facade.performQuery(query)).to.be.rejectedWith(InsightError);
		});
	});

	describe("Invalid Query String Handling", () => {
		let validDataset: string;

		before(async () => {
			validDataset = await createDummyZip();
		});

		// This test verifies that an invalid query (e.g. one with an improperly formatted column)
		// is rejected with an InsightError.
		it("should throw an InsightError for an invalid query string", async () => {
			// Add a dataset with a normal id.
			await facade.addDataset("test", validDataset, InsightDatasetKind.Sections);

			// Create an invalid query:
			// For example, the column does not follow the expected "<id>_<field>" format.
			const invalidQuery = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["invalidField"], // Does not have the proper "test_field" format.
					ORDER: "invalidField",
				},
			};

			// Expect an InsightError to be thrown.
			await expect(facade.performQuery(invalidQuery)).to.be.rejectedWith(InsightError);
		});
	});

	describe("TransformationsProcessor with Valid Data", () => {
		const sampleData = [
			{ sections_uuid: "1", sections_instructor: "Jean", sections_avg: 90, sections_title: "310" },
			{ sections_uuid: "2", sections_instructor: "Jean", sections_avg: 80, sections_title: "310" },
			{ sections_uuid: "3", sections_instructor: "Casey", sections_avg: 95, sections_title: "310" },
			{ sections_uuid: "4", sections_instructor: "Casey", sections_avg: 85, sections_title: "310" },
			{ sections_uuid: "5", sections_instructor: "Kelly", sections_avg: 74, sections_title: "210" },
			{ sections_uuid: "6", sections_instructor: "Kelly", sections_avg: 78, sections_title: "210" },
			{ sections_uuid: "7", sections_instructor: "Kelly", sections_avg: 72, sections_title: "210" },
			{ sections_uuid: "8", sections_instructor: "Eli", sections_avg: 85, sections_title: "210" },
		];
		const groupKeys = ["sections_title"];
		const applyRules = [{ overallAvg: { AVG: "sections_avg" } }];

		it("should correctly compute the average per group", () => {
			const results = performTransformations(sampleData, groupKeys, applyRules);
			expect(results).to.be.an("array").with.lengthOf(2);
			// console.log(results);

			const group310 = results.find((r) => r.sections_title === "310");
			const group210 = results.find((r) => r.sections_title === "210");

			expect(group310).to.exist;
			expect(group210).to.exist;

			const expectedAvg310 = 87.5; // (90 + 80 + 95 + 85)/4
			const expectedAvg210 = 77.25; // (74 + 78 + 72 + 85)/4
			const tolerance = 0.01;

			expect(group310.overallAvg).to.be.closeTo(expectedAvg310, tolerance);
			expect(group210.overallAvg).to.be.closeTo(expectedAvg210, tolerance);
		});
	});

	// COME BACK TO THIS
	// describe("InsightFacade performQuery with sections dataset", () => {
	// 	let insightFacade: InsightFacade;
	// 	const sampleSectionsData = [
	// 		{ sections_uuid: "1", sections_instructor: "Jean", sections_avg: 90, sections_title: "310" },
	// 		{ sections_uuid: "2", sections_instructor: "Jean", sections_avg: 80, sections_title: "310" },
	// 		{ sections_uuid: "3", sections_instructor: "Casey", sections_avg: 95, sections_title: "310" },
	// 		{ sections_uuid: "4", sections_instructor: "Casey", sections_avg: 85, sections_title: "310" },
	// 		{ sections_uuid: "5", sections_instructor: "Kelly", sections_avg: 74, sections_title: "210" },
	// 		{ sections_uuid: "6", sections_instructor: "Kelly", sections_avg: 78, sections_title: "210" },
	// 		{ sections_uuid: "7", sections_instructor: "Kelly", sections_avg: 72, sections_title: "210" },
	// 		{ sections_uuid: "8", sections_instructor: "Eli", sections_avg: 85, sections_title: "210" }
	// 	];
	//
	// 	before(async () => {
	// 		insightFacade = new InsightFacade();
	// 		// (insightFacade as any).datasets.set("sections", {
	// 		// 	meta: { id: "sections", kind: InsightDatasetKind.Sections, numRows: sampleSectionsData.length },
	// 		// 	data: sampleSectionsData,
	// 		// });
	// 		insightFacade.addDataset("idk", sampleSectionsData,)
	// 	});
	//
	// 	it("should correctly group and calculate averages", async () => {
	// 		const query = {
	// 			WHERE: {},
	// 			OPTIONS: {
	// 				COLUMNS: ["sections_title", "overallAvg"],
	// 				ORDER: { dir: "DOWN", keys: ["overallAvg"] }
	// 			},
	// 			TRANSFORMATIONS: {
	// 				GROUP: ["sections_title"],
	// 				APPLY: [{ overallAvg: { AVG: "sections_avg" } }]
	// 			}
	// 		};
	//
	// 		const results = await insightFacade.performQuery(query);
	// 		console.log(results);
	// 		expect(results).to.be.an("array").with.lengthOf(2);
	//
	// 		// this.timeout(10000);
	// 		const group310 = results.find((r) => r.sections_title === "310");
	// 		const group210 = results.find((r) => r.sections_title === "210");
	//
	// 		expect(group310).to.exist;
	// 		expect(group210).to.exist;
	//
	// 		const expectedAvg310 = 87.5; // (90 + 80 + 95 + 85) / 4
	// 		const expectedAvg210 = 77.25; // (74 + 78 + 72 + 85) / 4
	// 		const tolerance = 0.01;
	//
	// 		// @ts-ignore
	// 		expect(group310.overallAvg).to.be.closeTo(expectedAvg310, tolerance);
	// 		// @ts-ignore
	// 		expect(group210.overallAvg).to.be.closeTo(expectedAvg210, tolerance);
	// 	});
	// });

	describe("Data Persistence and Transformation", () => {
		let facade2: InsightFacade;
		const persistenceDatasetId = "persistTest";
		let initialContent: string;
		before(async () => {
			await clearDisk();
			initialContent = await getContentFromArchives("singleCourse.zip");
			facade2 = new InsightFacade();
			await facade2.addDataset(persistenceDatasetId, initialContent, InsightDatasetKind.Sections);
		});

		it("should correctly load and transform persisted dataset", async () => {
			const newFacade = new InsightFacade();
			// Wait a bit for newFacade to initialize and load persisted data.
			await new Promise((resolve) => setTimeout(resolve, 100));
			const datasets = await newFacade.listDatasets();
			const dsMeta = datasets.find((d) => d.id === persistenceDatasetId);
			expect(dsMeta).to.not.be.undefined;
			// Perform a query to ensure transformation occurs.
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: [`${persistenceDatasetId}_dept`],
				},
			};
			const queryResult = await newFacade.performQuery(query);
			// Check that transformation produced valid output.
			expect(queryResult).to.be.an("array").that.is.not.empty;
			queryResult.forEach((record: any) => {
				expect(record[`${persistenceDatasetId}_dept`]).to.be.a("string");
			});
		});
	});
});
