<?php
session_start();
require_once '../database/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    // Kërkojmë nga 'email' dhe marrim të gjitha të dhënat me '*'
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Përdorim password_verify për të krahasuar fjalëkalimin e shkruar me Hash-in në databazë
    if ($user && password_verify($password, $user['password'])) { 
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role']; 
        
        // ── KËTU BËHET NDARJA SIPAS ROLIT ──
        if ($user['role'] === 'admin') {
            // Nëse është admin, dërgoje tek paneli i adminit
            header("Location: ../admin.php"); 
        } else {
            // Nëse është klient normal, dërgoje tek faqja kryesore
            header("Location: ../index.php");
        }
        exit;
        // ───────────────────────────────────
        
    } else {
        $_SESSION['login_error'] = 'Invalid email or password!';
        header("Location: ../index.php?error=true");
        exit;
    }
} else {
    header("Location: ../index.php");
    exit;
}
?>