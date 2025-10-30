<?php
// Server-side redirect generator for testing.
header('Content-Type: application/json; charset=utf-8');

$datapackPath = __DIR__ . '/ios/extention/Resources/indies/datapack-compiled.json';

function load_datapack($path) {
    if (!file_exists($path)) return null;
    $raw = file_get_contents($path);
    $trim = trim($raw);
    // Try JSON decode first
    $decoded = json_decode($trim, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) return $decoded;

    // If invalid, attempt to wrap with braces if it looks like entries without root.
    if (strpos($trim, '{') !== 0) {
        $try = '{' . $trim . '}';
        $decoded = json_decode($try, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) return $decoded;
    }

    // As a last resort, return null
    return null;
}

if (isset($_GET['preview'])) {
    // Return a short preview of the datapack file
    if (!file_exists($datapackPath)) {
        echo json_encode(['preview' => null, 'note' => 'no compiled mapping file present; using heuristics']);
        exit;
    }
    $raw = file_get_contents($datapackPath);
    // Show first 400 characters
    $preview = mb_substr($raw, 0, 400);
    echo json_encode(['preview' => $preview]);
    exit;
}

$url = isset($_GET['url']) ? trim($_GET['url']) : '';
if (!$url) {
    echo json_encode(['error' => 'missing url parameter']);
    exit;
}

$parsed = parse_url($url);
$host = isset($parsed['host']) ? strtolower($parsed['host']) : '';
$path = isset($parsed['path']) ? $parsed['path'] : '/';
$query = isset($parsed['query']) ? $parsed['query'] : '';

$dat = load_datapack($datapackPath);

$result = [
    'original' => $url,
    'host' => $host,
    'matched' => false,
    'redirect' => null,
    'reason' => ''
];

// Exact host match from datapack
if (is_array($dat) && isset($dat[$host])) {
    $entry = $dat[$host];
    $destBase = isset($entry['destBase']) ? $entry['destBase'] : '';
    $destPath = isset($entry['destPath']) ? $entry['destPath'] : '/';

    // Determine article/title
    $article = '';
    if (strpos($path, '/wiki/') === 0) {
        $article = substr($path, strlen('/wiki/'));
    } elseif (strpos($path, '/w/') === 0) {
        // try to get title from query
        parse_str($query, $q);
        if (isset($q['title'])) $article = $q['title'];
    } else {
        // fallback: strip leading /
        $article = ltrim($path, '/');
    }

    // Build URL. destBase may include path segments already.
    $destBase = rtrim($destBase, '/');
    $destPath = $destPath ?: '/';
    // Ensure destPath starts with /
    if ($destPath !== '/' && strpos($destPath, '/') !== 0) $destPath = '/' . $destPath;

    $proto = 'https://';
    $redirect = $proto . $destBase;
    // If destBase already contains scheme-like prefix, avoid duplicating
    if (strpos($destBase, 'http://') === 0 || strpos($destBase, 'https://') === 0) {
        $redirect = $destBase;
    }

    // Append destPath and article
    if ($redirect[-1] === '/' && $destPath[0] === '/') {
        // avoid double slash
        $redirect = rtrim($redirect, '/');
    }
    $redirect .= $destPath;
    if ($article !== '') {
        if (substr($redirect, -1) !== '/') $redirect .= '/';
        $redirect .= rawurlencode($article);
    }

    // Preserve query and fragment if present (basic handling)
    parse_str($query, $qparts);
    if (!empty($qparts)) {
        if (isset($qparts['title'])) unset($qparts['title']);
        if (!empty($qparts)) $redirect .= '?' . http_build_query($qparts);
    }
    if (isset($parsed['fragment']) && $parsed['fragment']) $redirect .= '#' . $parsed['fragment'];

    $result['matched'] = true;
    $result['redirect'] = $redirect;
    $result['entry'] = $entry;
    echo json_encode($result);
    exit;
}

// Heuristics fallback: try to convert .fandom.com -> .wiki.gg and use /wiki/ path
if (substr($host, -11) === '.fandom.com') {
    $base = substr($host, 0, -11) . '.wiki.gg';
    // Extract title preferring /wiki/ or query title
    $article = '';
    if (strpos($path, '/wiki/') === 0) {
        $article = substr($path, strlen('/wiki/'));
    } else {
        parse_str($query, $q);
        if (!empty($q['title'])) $article = $q['title'];
        else $article = ltrim($path, '/');
    }

    $redirect = 'https://' . rtrim($base, '/') . '/wiki/' . rawurlencode($article);
    parse_str($query, $qparts);
    if (!empty($qparts)) {
        if (isset($qparts['title'])) unset($qparts['title']);
        if (!empty($qparts)) $redirect .= '?' . http_build_query($qparts);
    }
    if (isset($parsed['fragment']) && $parsed['fragment']) $redirect .= '#' . $parsed['fragment'];

    $result['matched'] = true;
    $result['redirect'] = $redirect;
    $result['used'] = 'heuristic';
    echo json_encode($result);
    exit;
}

$result['reason'] = 'no mapping or heuristic available for host';
echo json_encode($result);
