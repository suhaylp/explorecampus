const SERVER_URL = "http://localhost:4321";
let map;
let directionsService;
let directionsRenderer;
let allRooms = [];
let selectedRooms = [];
let markers = [];
let selectedMarkers = [];

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		center: { lat: 49.2606, lng: -123.2460 },
		zoom: 15
	});
	directionsService = new google.maps.DirectionsService();
	directionsRenderer = new google.maps.DirectionsRenderer({
		suppressMarkers: false
	});
	directionsRenderer.setMap(map);

	window.addEventListener("load", async () => {
		await loadAllRooms();
		populateDatalist(allRooms);
		displayRooms(allRooms);
		setupSearch();
		setupResetButton();
		placeBuildingMarkers(allRooms);
	});
}

window.initMap = initMap;

async function loadAllRooms() {
	try {
		const query = {
			WHERE: {},
			OPTIONS: {
				COLUMNS: [
					"rooms_shortname",
					"rooms_fullname",
					"rooms_number",
					"rooms_name",
					"rooms_address",
					"rooms_lat",
					"rooms_lon",
					"rooms_seats"
				],
				ORDER: "rooms_shortname"
			}
		};
		const response = await fetch(`${SERVER_URL}/query`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(query)
		});
		const data = await response.json();
		if (!response.ok) {
			console.error("Error retrieving rooms:", data.error);
			return;
		}
		allRooms = data.result;
	} catch (err) {
		console.error("Failed to load rooms:", err);
	}
}

function populateDatalist(rooms) {
	const datalist = document.getElementById("building-options");
	const buildings = new Set(rooms.map(r => r.rooms_shortname));
	datalist.innerHTML = "";
	buildings.forEach(bldg => {
		const option = document.createElement("option");
		option.value = bldg;
		datalist.appendChild(option);
	});
}

function placeBuildingMarkers(rooms) {
	markers.forEach(marker => marker.setMap(null));
	markers = [];
	const buildingsMap = new Map();
	rooms.forEach(r => {
		if (!buildingsMap.has(r.rooms_shortname)) {
			buildingsMap.set(r.rooms_shortname, {
				lat: parseFloat(r.rooms_lat),
				lng: parseFloat(r.rooms_lon),
				fullname: r.rooms_fullname,
				shortname: r.rooms_shortname
			});
		}
	});
	buildingsMap.forEach(bldg => {
		const marker = new google.maps.Marker({
			position: { lat: bldg.lat, lng: bldg.lng },
			map: map,
			title: `${bldg.fullname} (${bldg.shortname})`
		});
		markers.push(marker);
	});
}

function displayRooms(rooms) {
	const roomsList = document.getElementById("rooms-list");
	roomsList.innerHTML = "";
	const groups = {};
	rooms.forEach(r => {
		if (!groups[r.rooms_shortname]) {
			groups[r.rooms_shortname] = [];
		}
		groups[r.rooms_shortname].push(r);
	});
	for (const building in groups) {
		const header = document.createElement("div");
		header.textContent = building;
		header.classList.add("building-header");
		roomsList.appendChild(header);
		groups[building].forEach(r => {
			const card = document.createElement("div");
			card.classList.add("room-card");
			card.innerHTML = `<strong>Room ${r.rooms_number}</strong><br>Capacity: ${r.rooms_seats}`;
			card.addEventListener("click", () => selectRoom(r));
			roomsList.appendChild(card);
		});
	}
}

function setupSearch() {
	const searchInput = document.getElementById("building-search");
	const minCapacityInput = document.getElementById("min-capacity");
	searchInput.addEventListener("input", filterRooms);
	minCapacityInput.addEventListener("input", filterRooms);
}

function filterRooms() {
	const searchTerm = document.getElementById("building-search").value.trim().toLowerCase();
	const minCapacity = parseInt(document.getElementById("min-capacity").value, 10) || 0;
	const filtered = allRooms.filter(r => {
		const bldg = r.rooms_shortname.toLowerCase();
		const fullname = r.rooms_fullname.toLowerCase();
		return (bldg.includes(searchTerm) || fullname.includes(searchTerm)) && (r.rooms_seats >= minCapacity);
	});
	displayRooms(filtered);
}

function setupResetButton() {
	const resetButton = document.getElementById("reset-rooms");
	resetButton.addEventListener("click", () => {
		selectedRooms = [];
		updateSelectedRooms();
		directionsRenderer.set('directions', null);
		selectedMarkers.forEach(marker => marker.setMap(null));
		selectedMarkers = [];
	});
}

function selectRoom(room) {
	if (selectedRooms.length >= 5) {
		alert("You can only select up to 5 rooms!");
		return;
	}
	if (selectedRooms.find(r => r.rooms_name === room.rooms_name)) {
		alert("Room already selected!");
		return;
	}
	selectedRooms.push(room);
	updateSelectedRooms();
}

function updateSelectedRooms() {
	const selectedList = document.getElementById("selected-rooms");
	selectedList.innerHTML = "";
	selectedRooms.forEach(r => {
		const card = document.createElement("div");
		card.classList.add("room-card");
		card.innerHTML = `
      <strong>Fullname:</strong> ${r.rooms_fullname},
      <strong>Shortname:</strong> ${r.rooms_shortname},
      <strong>Room:</strong> ${r.rooms_number},
      <strong>Address:</strong> ${r.rooms_address},
      <strong>Seats:</strong> ${r.rooms_seats}
    `;
		selectedList.appendChild(card);
	});
	updateSelectedMarkers();
	showRoomRelationships();
	drawRouteBetweenBuildings();
}

function updateSelectedMarkers() {
	selectedMarkers.forEach(marker => marker.setMap(null));
	selectedMarkers = [];
	const labels = ["A", "B", "C", "D", "E"];
	selectedRooms.forEach((room, index) => {
		const position = new google.maps.LatLng(parseFloat(room.rooms_lat), parseFloat(room.rooms_lon));
		const marker = new google.maps.Marker({
			position: position,
			map: map,
			label: labels[index] || "",
			title: `${room.rooms_fullname} (${room.rooms_shortname}) - Room ${room.rooms_number}`
		});
		selectedMarkers.push(marker);
	});
}

function showRoomRelationships() {
	const relationshipsList = document.getElementById("selected-relationships");
	relationshipsList.innerHTML = "";
	if (selectedRooms.length < 2) return;
	for (let i = 0; i < selectedRooms.length; i++) {
		for (let j = i + 1; j < selectedRooms.length; j++) {
			const roomA = selectedRooms[i];
			const roomB = selectedRooms[j];
			const estTime = (roomA.rooms_shortname === roomB.rooms_shortname)
				? 1
				: computeWalkingTime(roomA, roomB);
			const div = document.createElement("div");
			div.textContent = `From ${roomA.rooms_shortname} ${roomA.rooms_number} to ${roomB.rooms_shortname} ${roomB.rooms_number}: ~${estTime} min walk`;
			relationshipsList.appendChild(div);
		}
	}
}

//Helper
function computeWalkingTime(roomA, roomB) {
	const dist = computeDistance(
		parseFloat(roomA.rooms_lat),
		parseFloat(roomA.rooms_lon),
		parseFloat(roomB.rooms_lat),
		parseFloat(roomB.rooms_lon)
	);
	return (dist / 80).toFixed(1);
}

function drawRouteBetweenBuildings() {
	const uniqueBuildings = {};
	selectedRooms.forEach(r => {
		uniqueBuildings[r.rooms_shortname] = {
			lat: parseFloat(r.rooms_lat),
			lng: parseFloat(r.rooms_lon)
		};
	});
	const locations = Object.values(uniqueBuildings);
	const routeContainer = document.getElementById("selected-route");
	if (locations.length < 2) {
		directionsRenderer.set('directions', null);
		routeContainer.innerHTML = "";
		return;
	}
	const origin = new google.maps.LatLng(locations[0].lat, locations[0].lng);
	const destination = new google.maps.LatLng(
		locations[locations.length - 1].lat,
		locations[locations.length - 1].lng
	);
	const waypoints = locations.slice(1, locations.length - 1).map(loc => ({
		location: new google.maps.LatLng(loc.lat, loc.lng),
		stopover: true
	}));
	const request = {
		origin: origin,
		destination: destination,
		waypoints: waypoints,
		travelMode: google.maps.TravelMode.WALKING,
		optimizeWaypoints: true
	};
	directionsService.route(request, (result, status) => {
		if (status === google.maps.DirectionsStatus.OK) {
			directionsRenderer.setDirections(result);
			map.fitBounds(result.routes[0].bounds);
			const totalSeconds = result.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0);
			const minutes = (totalSeconds / 60).toFixed(1);
			routeContainer.innerHTML = `<div>Estimated walking time along route: ${minutes} minutes</div>`;
		} else {
			console.error("Directions request failed due to " + status);
		}
	});
}

function computeDistance(lat1, lng1, lat2, lng2) {
	const R = 6371000; // Earth's radius in meters
	const toRad = (val) => (val * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
		Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}
