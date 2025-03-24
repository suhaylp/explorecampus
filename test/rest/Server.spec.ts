import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Log } from "@ubccpsc310/project-support";
import Server from "../../src/rest/Server"; // Adjust path if needed
import fs from "fs-extra";
import path from "path";

describe("InsightUBC Server API Tests", function () {
	let server: Server;
	const SERVER_URL = "http://localhost:4321";
	const SERVER_NUM = 4321;

	before(async function () {
		server = new Server(SERVER_NUM);
		await server.start().catch((err) => {
			Log.error("Failed to start server: " + err);
		});
	});

	after(async function () {
		await server.stop();
	});

	beforeEach(function () {
		Log.info("Starting new test...");
	});

	afterEach(function () {
		Log.info("Test completed.");
	});

	it("should successfully add a valid dataset", async function () {
		const datasetPath = path.join(__dirname, "../resources/archives/pair.zip");
		const zipData = await fs.readFile(datasetPath);

		const res = await request(SERVER_URL)
			.put("/dataset/courses/sections")
			.send(zipData)
			.set("Content-Type", "application/x-zip-compressed");

		expect(res.status).to.equal(StatusCodes.OK);
		expect(res.body).to.have.property("result").that.is.an("array");
		expect(res.body.result).to.include("courses");
	});

	it("should list all added datasets", async function () {
		const res = await request(SERVER_URL).get("/datasets");
		expect(res.status).to.equal(StatusCodes.OK);
		expect(res.body).to.have.property("result").that.is.an("array");
		expect(res.body.result).to.deep.include({ id: "courses", kind: "sections", numRows: 64612 });
	});

	it("should successfully perform a valid query", async function () {
		const query = {
			WHERE: { GT: { courses_avg: 90 } },
			OPTIONS: { COLUMNS: ["courses_dept", "courses_avg"], ORDER: "courses_avg" },
		};

		const res = await request(SERVER_URL).post("/query").send(query).set("Content-Type", "application/json");

		expect(res.status).to.equal(StatusCodes.OK);
		expect(res.body).to.have.property("result").that.is.an("array");
		expect(res.body.result.length).to.be.greaterThan(0);
	});

	it("should successfully remove an existing dataset", async function () {
		const res = await request(SERVER_URL).delete("/dataset/courses");
		expect(res.status).to.equal(StatusCodes.OK);
		expect(res.body).to.have.property("result", "courses");

		const listRes = await request(SERVER_URL).get("/datasets");
		expect(listRes.status).to.equal(StatusCodes.OK);
		expect(listRes.body.result).to.not.deep.include({ id: "courses" });
	});

	it("should return 400 for adding an invalid dataset", async function () {
		const invalidData = "Invalid content";

		const res = await request(SERVER_URL)
			.put("/dataset/invalid/sections")
			.send(invalidData)
			.set("Content-Type", "application/x-zip-compressed");

		expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
		expect(res.body).to.have.property("error");
	});

	it("should return 404 for deleting a non-existent dataset", async function () {
		const res = await request(SERVER_URL).delete("/dataset/nonexistent");
		expect(res.status).to.equal(StatusCodes.NOT_FOUND);
		expect(res.body).to.have.property("error");
	});
});
