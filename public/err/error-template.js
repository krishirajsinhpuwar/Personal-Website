// Error page configurations
const errorConfig = {
	'400': {
		message: 'Bad Request. The server could not understand your request.',
		color: '#38bdf8',
		buttonColor: '#0f172a'
	},
	'401': {
		message: 'Unauthorized. Please log in to access this page.',
		color: '#f59e0b',
		buttonColor: '#0f172a'
	},
	'403': {
		message: "Forbidden. You don't have permission to access this page.",
		color: '#ef4444',
		buttonColor: '#fff'
	},
	'404': {
		message: "Page Not Found. The page you're looking for doesn't exist.",
		color: '#22c55e',
		buttonColor: '#0f172a'
	},
	'500': {
		message: 'Internal Server Error. Something went wrong on our end.',
		color: '#a855f7',
		buttonColor: '#fff'
	},
	'503': {
		message: 'Service Unavailable. Please try again later.',
		color: '#06b6d4',
		buttonColor: '#0f172a'
	}
};

// Initialize error page
function initErrorPage(errorCode) {
	const config = errorConfig[errorCode];
	if (!config) {
		console.error('Error configuration not found for:', errorCode);
		return;
	}

	// Set error code with color
	const errorCodeElement = document.querySelector('h1');
	if (errorCodeElement) {
		errorCodeElement.textContent = errorCode;
		errorCodeElement.style.color = config.color;
	}

	// Set error message
	const messageElement = document.querySelector('p');
	if (messageElement) {
		messageElement.textContent = config.message;
	}

	// Set button colors
	const buttonElement = document.querySelector('a');
	if (buttonElement) {
		buttonElement.style.background = config.color;
		buttonElement.style.color = config.buttonColor;
	}
}
