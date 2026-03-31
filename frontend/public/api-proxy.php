<?php
declare(strict_types=1);

/**
 * TAKYMED API proxy (Apache/PHP)
 *
 * Goal:
 * - Browser calls https://takymed.com/api/...
 * - Apache rewrites to this file
 * - This script forwards to backend HTTP origin
 */

$backendOrigin = getenv('TAKYMED_API_ORIGIN') ?: 'http://dev.takymed.com:3500';

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$parsedPath = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$query = $_SERVER['QUERY_STRING'] ?? '';

// Only proxy /api routes (safety)
if (strpos($parsedPath, '/api/') !== 0 && $parsedPath !== '/api') {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Invalid proxy path']);
    exit;
}

$targetUrl = rtrim($backendOrigin, '/') . $parsedPath . ($query !== '' ? ('?' . $query) : '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$ch = curl_init($targetUrl);
if ($ch === false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Failed to initialize cURL']);
    exit;
}

curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_HEADER, true);

$incomingHeaders = function_exists('getallheaders') ? getallheaders() : [];
$forwardHeaders = [];
foreach ($incomingHeaders as $name => $value) {
    $lower = strtolower($name);
    if ($lower === 'host' || $lower === 'content-length') {
        continue;
    }
    $forwardHeaders[] = $name . ': ' . $value;
}
if (!empty($forwardHeaders)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
}

$body = file_get_contents('php://input');
if ($body !== false && $body !== '') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$rawResponse = curl_exec($ch);
if ($rawResponse === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Upstream request failed', 'details' => $err]);
    exit;
}

$statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$respHeadersRaw = substr($rawResponse, 0, $headerSize);
$respBody = substr($rawResponse, $headerSize);
curl_close($ch);

http_response_code($statusCode > 0 ? $statusCode : 200);

$hopByHop = [
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade'
];
$lines = preg_split("/\r\n|\n|\r/", trim($respHeadersRaw));
foreach ($lines as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0 || strpos($line, ':') === false) {
        continue;
    }
    [$hName, $hValue] = array_map('trim', explode(':', $line, 2));
    if ($hName === '') {
        continue;
    }
    if (in_array(strtolower($hName), $hopByHop, true)) {
        continue;
    }
    header($hName . ': ' . $hValue, false);
}

echo $respBody;

