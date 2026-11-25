const titles = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Server Error',
  503: 'Service Unavailable',
};

export function renderErrorPages() {
  return Object.entries(titles).map(([status, title]) => [`${status}.html`, `<!doctype html>
<html lang="en">

<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${status} - ${title}</title>
	<link rel="stylesheet" href="/err/error-styles.css" />
</head>

<body>
	<div class="container">
		<h1>${status}</h1>
		<p>Loading...</p>
		<a href="/">Go Home</a>
	</div>
	<script src="/err/error-template.js"></script>
	<script>
		initErrorPage('${status}');
	</script>
</body>

</html>`]);
}
