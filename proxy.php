<?php
// proxy.php — la clé n'est visible que sur le serveur
require_once __DIR__ . '/config.php'; // définit CLAUDE_API_KEY, non versionné
define('CLAUDE_URL', 'https://api.anthropic.com/v1/messages');

// Sécurité : on n'accepte que les requêtes POST depuis ton domaine
header('Access-Control-Allow-Origin: https://web-mmi2.iutbeziers.fr/');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

// Récupère le payload envoyé par le navigateur
$input = file_get_contents('php://input');

// Transmet à Claude
$ch = curl_init(CLAUDE_URL);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . CLAUDE_API_KEY,
    'anthropic-version: 2023-06-01',
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo $response;
