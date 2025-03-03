// test/RoomsDatasetProcessor.test.ts
import { expect } from "chai";
import { processRoomsDataset } from "../../src/controller/RoomsDatasetProcessor";
import * as path from "path";

describe("RoomsDatasetProcessor Integration Test", function () {
	this.timeout(10000); // Increase timeout if needed
	it("should process campus.zip and produce a non-empty rooms dataset", async () => {
		const zipPath = path.join(__dirname, "..", "resources", "archives", "campus.zip");
		const rooms = await processRoomsDataset(zipPath);
		expect(rooms).to.be.an("array").that.is.not.empty;

		// Optionally, check that the first room has the expected fields.
		const firstRoom = rooms[0];
		expect(firstRoom.rooms_number).to.be.a("string").that.is.not.empty;
		expect(firstRoom.rooms_seats).to.be.a("number");
		expect(firstRoom.rooms_shortname).to.be.a("string").that.is.not.empty;
		expect(firstRoom.rooms_address).to.be.a("string").that.is.not.empty;
		expect(firstRoom.rooms_lat).to.be.a("number");
		expect(firstRoom.rooms_lon).to.be.a("number");
	});
});
