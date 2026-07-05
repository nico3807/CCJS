<?php
// proxy.php — la clé n'est visible que sur le serveur
define('GEMINI_API_KEY', 'AIzaSyBV-BKJkTjOJg92DMqHhKEuNmu4am_5AVg'); //CCJS
define('GEMINI_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' . GEMINI_API_KEY);

// Sécurité : on n'accepte que les requêtes POST depuis ton domaine
header('Access-Control-Allow-Origin: https://web-mmi2.iutbeziers.fr/');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

// Récupère le payload envoyé par le navigateur
$input = file_get_contents('php://input');

// Transmet à Gemini
$ch = curl_init(GEMINI_URL);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo $response;
