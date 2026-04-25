<?php
session_start();
require_once '../database/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['profile_image'])) {
    $user_id = $_SESSION['user_id'];
    $file = $_FILES['profile_image'];

    // 1. Kontrolli i gabimeve gjatë ngarkimit
    if ($file['error'] !== 0) {
        header("Location: ../index.php?upload_error=true");
        exit;
    }

    // 2. Lejojmë vetëm formate të caktuara
    $allowed = ['jpg', 'jpeg', 'png'];
    $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (in_array($fileExt, $allowed)) {
        // 3. Krijojmë një emër unik për foton që të mos mbivendosen
        $newFileName = "profile_" . $user_id . "_" . time() . "." . $fileExt;
        $uploadDir = '../uploads/profiles/';
        
        // Krijojmë dosjen nëse nuk ekziston
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $destPath = $uploadDir . $newFileName;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            // 4. Përditësojmë emrin e fotos në databazë
            $stmt = $pdo->prepare("UPDATE users SET profile_image_url = ? WHERE id = ?");
            $stmt->execute([$newFileName, $user_id]);

            header("Location: ../index.php?upload=success");
            exit;
        }
    }
}

header("Location: ../index.php?upload=error");
exit;