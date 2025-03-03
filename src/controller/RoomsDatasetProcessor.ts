// src/controller/RoomsDatasetProcessor.ts
import * as JSZip from "jszip";
import * as fs from "fs/promises";
import { parseIndexHtml, BuildingData } from "./IndexParserUtils";
import { parseBuildingHtml, RoomData } from "./BuildingParserUtils";
import { fetchGeolocation } from "./GeoHelper";

/**
 * Process the campus zip to build the complete rooms dataset.
 * @param zipPath Path to campus.zip
 * @returns An array of RoomData objects
 */
export async function processRoomsDataset(zipPath: string): Promise<RoomData[]> {
	const data = await fs.readFile(zipPath);
	const zip = await JSZip.loadAsync(data);

	// Extract index.htm from the root.
	const indexFile = zip.file("index.htm");
	if (!indexFile) {
		throw new Error("index.htm not found in zip");
	}
	const indexContent = await indexFile.async("string");
	const buildings: BuildingData[] = parseIndexHtml(indexContent);
	console.log(`Found ${buildings.length} buildings in index.htm`);

	const allRooms: RoomData[] = [];

	// Process each building sequentially.
	for (const building of buildings) {
		try {
			// Get geolocation for the building.
			const geo = await fetchGeolocation(building.address);
			const buildingInfo = {
				shortname: building.shortname,
				address: building.address,
				lat: geo.lat,
				lon: geo.lon,
				fullname: building.shortname // or update if you have the full name
			};

			// Adjust the building file path.
			let buildingPath = building.href;
			if (buildingPath.startsWith("./")) {
				buildingPath = buildingPath.slice(2);
			}
			console.log(`Looking for building file: ${buildingPath} for building ${building.shortname}`);

			// Try to find the file in the zip.
			let buildingFile = zip.file(buildingPath);
			if (!buildingFile) {
				// As an alternative, try removing a leading slash.
				buildingFile = zip.file(buildingPath.replace(/^\/+/, ""));
			}
			if (!buildingFile) {
				console.warn(`Building file ${building.href} not found for building ${building.shortname}`);
				continue;
			}
			const buildingHtml = await buildingFile.async("string");

			// Parse the building file to extract room data.
			const rooms: RoomData[] = parseBuildingHtml(buildingHtml, buildingInfo);
			console.log(`Found ${rooms.length} rooms in building ${building.shortname}`);
			allRooms.push(...rooms);
		} catch (err) {
			console.error(`Error processing building ${building.shortname}:`, err);
			// Continue processing other buildings.
		}
	}

	// Optionally, cache to disk.
	const cachePath = "./data/rooms.json";
	await fs.writeFile(cachePath, JSON.stringify(allRooms, null, 2));
	console.log(`Rooms dataset written to ${cachePath}`);

	return allRooms;
}
