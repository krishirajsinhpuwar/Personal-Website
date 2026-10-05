// Section Routing Logic
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

// Work out which section the current URL points at
function sectionFromUrl() {
	// Clean path, e.g. /projects or /projects/
	const path = decodeURIComponent(location.pathname)
		.split("/")
		.filter(Boolean)
		.pop()
		?.replace(/\.html?$/, "")
		.toLowerCase();
	if (path in SECTIONS) return path;

	// Legacy hash links, e.g. /#projects
	const hash = decodeURIComponent(location.hash.replace(/^#/, ""))
		.trim()
		.toLowerCase();
	if (hash in SECTIONS) return hash;

	return DEFAULT_SECTION;
}

function showSection(sectionId) {
	const id = sectionId in SECTIONS ? sectionId : DEFAULT_SECTION;

	document
		.querySelectorAll(".section")
		.forEach((sec) => sec.classList.toggle("hidden-section", sec.id !== id));

	document
		.querySelectorAll(".nav-item")
		.forEach((item) =>
			item.classList.toggle("active", item.dataset.section === id),
		);

	document.title =
		id === DEFAULT_SECTION ? BASE_TITLE : `${SECTIONS[id]} | ${BASE_TITLE}`;

	const content = document.getElementById("main-output");
	if (content) content.scrollTop = 0;
}

// Change section WITHOUT reloading the page
function navigate(id) {
	if (!(id in SECTIONS)) return;
	const url = `/${id}`;
	if (location.pathname !== url) {
		history.pushState({ section: id }, "", url);
	}
	showSection(id);
}

// Intercept clicks on sidebar items (and any in-page link to a section)
document.addEventListener("click", (e) => {
	// Let ctrl/cmd/shift/middle-click behave normally (open in new tab, etc.)
	if (e.defaultPrevented || e.button !== 0) return;
	if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

	const el = e.target.closest(".nav-item, a[href]");
	if (!el) return;

	let id = el.dataset.section;

	// Fallback for plain links like <a href="/projects">
	if (!id && el.tagName === "A") {
		const url = new URL(el.href, location.origin);
		if (url.origin !== location.origin) return;
		const slug = url.pathname.split("/").filter(Boolean).pop();
		if (slug in SECTIONS) id = slug;
	}

	if (!id || !(id in SECTIONS)) return;

	e.preventDefault(); // stops the full page load
	navigate(id);
});

// Back/forward buttons
window.addEventListener("popstate", () => showSection(sectionFromUrl()));

// Old-style #hash links still work
window.addEventListener("hashchange", () => showSection(sectionFromUrl()));

// Initial render
if (document.readyState === "loading") {
	window.addEventListener("DOMContentLoaded", () =>
		showSection(sectionFromUrl()),
	);
} else {
	showSection(sectionFromUrl());
}
