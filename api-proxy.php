<?php
// ---------------------------------------------------------------------------
// Secure API Proxy
// Forwards requests from /api/* to the configured backend API endpoint
// Works in environments without mod_proxy
// ---------------------------------------------------------------------------

// Enable error logging for debugging
error_reporting(E_ALL);
ini_set('display_errors', '1');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Default internal API base (HTTP allowed only for private networks)
$api_base = getenv('API_BASE_URL') ?: 'http://10.0.1.141:30001';

// If running in production, automatically enforce HTTPS
$app_env = getenv('APP_ENV') ?: 'development';
if ($app_env === 'production' && strpos($api_base, 'http://') === 0) {
    $api_base = preg_replace('/^http:/i', 'https:', $api_base);
}

// Optional: path to internal CA certificate for self-signed HTTPS
$internal_ca = getenv('API_CA_CERT') ?: null;

// ---------------------------------------------------------------------------
// Request Handling
// ---------------------------------------------------------------------------

$request_uri = $_SERVER['REQUEST_URI'];
$request_path = parse_url($request_uri, PHP_URL_PATH);

// Extract /api/* route
if (preg_match('#^/api/(.*)$#', $request_path, $matches)) {
    $api_path = '/api/' . $matches[1];
    $url = $api_base . $api_path;

    // Append query string if present
    if (!empty($_SERVER['QUERY_STRING'])) {
        $url .= '?' . $_SERVER['QUERY_STRING'];
    }

    // Read request body
    $body = '';
    $isMultipart = isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false;

    if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        if (!$isMultipart) {
            $body = file_get_contents('php://input');
        } else {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                $body = file_get_contents('php://input');
            } else {
                $body = null;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Debug logging
    // -----------------------------------------------------------------------
    $debug_log = $_SERVER['DOCUMENT_ROOT'] . "/api-proxy-debug.log";
    $debug_info = [
        'timestamp' => date('Y-m-d H:i:s'),
        'environment' => $app_env,
        'request_uri' => $request_uri,
        'method' => $_SERVER['REQUEST_METHOD'],
        'api_base' => $api_base,
        'url' => $url,
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
        'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'none',
        'is_multipart' => $isMultipart,
    ];
    file_put_contents($debug_log, json_encode($debug_info, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

    // -----------------------------------------------------------------------
    // Initialize cURL
    // -----------------------------------------------------------------------
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

    // Enforce SSL verification for HTTPS connections
    if (strpos($url, 'https://') === 0) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        if ($internal_ca && file_exists($internal_ca)) {
            curl_setopt($ch, CURLOPT_CAINFO, $internal_ca);
        }
    }

    // -----------------------------------------------------------------------
    // Forward request body
    // -----------------------------------------------------------------------
    if ($isMultipart && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $postData = [];

        foreach ($_POST as $key => $value) {
            $postData[$key] = $value;
        }

        foreach ($_FILES as $key => $file) {
            if (isset($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
                $postData[$key] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
            }
        }

        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    } elseif ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    // -----------------------------------------------------------------------
    // Forward headers (excluding problematic ones)
    // -----------------------------------------------------------------------
    $headers = [];
    $hasAuthorization = false;

    $sourceHeaders = function_exists('getallheaders') ? getallheaders() : [];
    if (!$sourceHeaders) {
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_') {
                $header = str_replace('_', '-', substr($key, 5));
                $sourceHeaders[$header] = $value;
            }
        }
    }

    foreach ($sourceHeaders as $key => $value) {
        $lowerKey = strtolower($key);
        if ($lowerKey === 'authorization') {
            $hasAuthorization = true;
        }
        if (!in_array($lowerKey, ['host', 'connection', 'content-length'])) {
            $headers[] = "$key: $value";
        }
    }

    if (!$hasAuthorization) {
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers[] = "Authorization: " . $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $headers[] = "Authorization: " . $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    // -----------------------------------------------------------------------
    // Execute request
    // -----------------------------------------------------------------------
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if ($curl_error) {
        error_log("API Proxy cURL Error: " . $curl_error);
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Proxy error: ' . $curl_error]);
        exit;
    }

    // Return response
    http_response_code($status);
    if ($content_type) {
        header('Content-Type: ' . $content_type);
    }
    echo $response;

} else {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Not found']);
}
?>
