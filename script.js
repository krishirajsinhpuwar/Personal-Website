// Section Routing Logic
// Every section is addressable from the URL, e.g. https://site/#projects
const SECTIONS = {
	cv: "CV",
	profile: "Profile",
	experience: "Experience",
	education: "Education",
	skills: "Skills",
	projects: "Projects",
	certificates: "Certificates",
	hackathons: "Hackathons",
	contact: "Contact",
};

const DEFAULT_SECTION = "profile";
const BASE_TITLE = "Krishirajsinh Puwar";

// Resolve which section the current URL points at
function sectionFromUrl() {
	const hash = decodeURIComponent(location.hash.replace(/^#/, ""))
		.trim()
		.toLowerCase();
	if (hash in SECTIONS) return hash;

	// Also honour path-style URLs (e.g. /projects) so they work on hosts
	// that rewrite unknown paths to index.html
	const path = decodeURIComponent(location.pathname.split("/").pop() || "")
		.replace(/\.html?$/, "")
		.toLowerCase();
	if (path in SECTIONS) return path;

	return DEFAULT_SECTION;
}

function showSection(sectionId) {
	const id = sectionId in SECTIONS ? sectionId : DEFAULT_SECTION;

	// Show only the selected section
	document
		.querySelectorAll(".section")
		.forEach((sec) => sec.classList.toggle("hidden-section", sec.id !== id));

	// Update active sidebar item
	document
		.querySelectorAll(".nav-item")
		.forEach((item) =>
			item.classList.toggle("active", item.dataset.section === id),
		);

	document.title =
		id === DEFAULT_SECTION ? BASE_TITLE : `${SECTIONS[id]} | ${BASE_TITLE}`;

	// Start each section from the top
	const content = document.getElementById("main-output");
	if (content) content.scrollTop = 0;
}

function route() {
	showSection(sectionFromUrl());
}

// The sidebar links carry the URL, so back/forward navigation just works
window.addEventListener("hashchange", route);

// The script is deferred, so the DOM is already parsed by the time it runs
if (document.readyState === "loading") {
	window.addEventListener("DOMContentLoaded", route);
} else {
	route();
}
