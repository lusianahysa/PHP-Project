<?php
session_start();
require_once '../database/db.php';

if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];

    // 1. (Opsionale) Marrim emrin e fotos aktuale për ta fshirë nga serveri
    $stmt = $pdo->prepare("SELECT profile_image_url FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if ($user && $user['profile_image_url']) {
        $filePath = '../uploads/profiles/' . $user['profile_image_url'];
        if (file_exists($filePath)) {
            unlink($filePath); // Fshin skedarin fizik
        }
    }

    // 2. Bëjmë fushën në databazë NULL
    $updateStmt = $pdo->prepare("UPDATE users SET profile_image_url = NULL WHERE id = ?");
    $updateStmt->execute([$user_id]);
}

header("Location: ../index.php?photo_removed=true");
exit;