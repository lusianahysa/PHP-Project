<?php
session_start();
require_once '../database/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $first_name  = trim($_POST['first_name']);
    $last_name   = trim($_POST['last_name']);
    $email       = trim($_POST['email']);
    $password    = $_POST['password'];
    $phone       = trim($_POST['phone_number'] ?? '');

    // ── 1. Validimi i passwordit ──────────────────────────────────────────
    $pwd_errors = [];

    if (strlen($password) < 8) {
        $pwd_errors[] = 'të paktën 8 karaktere';
    }
    if (!preg_match('/[A-Z]/', $password)) {
        $pwd_errors[] = 'të paktën 1 shkronjë të madhe (A-Z)';
    }
    if (!preg_match('/[a-z]/', $password)) {
        $pwd_errors[] = 'të paktën 1 shkronjë të vogël (a-z)';
    }
    if (!preg_match('/[0-9]/', $password)) {
        $pwd_errors[] = 'të paktën 1 numër (0-9)';
    }
    if (!preg_match('/[\W_]/', $password)) {
        $pwd_errors[] = 'të paktën 1 simbol (!, @, #, $, ...)';
    }

    if (!empty($pwd_errors)) {
        $_SESSION['register_error'] = 'Fjalëkalimi duhet të përmbajë: ' . implode(', ', $pwd_errors) . '.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // ── 2. Validimi i emailit (format + DNS) ─────────────────────────────
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $_SESSION['register_error'] = 'Formati i emailit është i pavlefshëm.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // Merr domain-in e emailit dhe kontrollo nëse ka MX ose A record
    $emailDomain = substr(strrchr($email, '@'), 1);

    if (!checkdnsrr($emailDomain, 'MX') && !checkdnsrr($emailDomain, 'A')) {
        $_SESSION['register_error'] = 'Emaili "' . htmlspecialchars($email) . '" nuk ekziston. Ju lutem vendosni një email të vërtetë.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // ── 3. Validimi i numrit të telefonit ────────────────────────────────
    if (!empty($phone) && !preg_match('/^\+?[0-9\s\-]{7,15}$/', $phone)) {
        $_SESSION['register_error'] = 'Numri i telefonit është i pavlefshëm. Shembull: +355 69 123 4567';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // ── 4. Kontrollo nëse emaili ekziston tashmë ─────────────────────────
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        $_SESSION['register_error'] = 'Ky email ekziston tashmë! Ju lutem provoni një tjetër.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // ── 5. Hash passwordin para ruajtjes ─────────────────────────────────
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);

    // ── 6. Inserto userin ─────────────────────────────────────────────────
    $stmt = $pdo->prepare('
        INSERT INTO users (first_name, last_name, email, password, phone_number, role) 
        VALUES (?, ?, ?, ?, ?, ?)
    ');

    if ($stmt->execute([$first_name, $last_name, $email, $hashed_password, $phone ?: null, 'customer'])) {
        $stmt_login = $pdo->prepare('SELECT id, role FROM users WHERE email = ?');
        $stmt_login->execute([$email]);
        $new_user = $stmt_login->fetch();

        $_SESSION['user_id'] = $new_user['id'];
        $_SESSION['role']    = $new_user['role'];

        header("Location: ../index.php");
        exit;
    } else {
        $_SESSION['register_error'] = 'Ndodhi një gabim gjatë regjistrimit. Ju lutem provoni përsëri.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

} else {
    header("Location: ../index.php");
    exit;
}
?>