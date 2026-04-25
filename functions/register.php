<?php
session_start();
require_once '../database/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $first_name  = trim($_POST['first_name']);
    $last_name   = trim($_POST['last_name']);
    $email       = trim($_POST['email']);
    $password    = $_POST['password'];
    $phone       = trim($_POST['phone_number'] ?? '');

    // ── 1. Password Validation ──────────────────────────────────────────
    $pwd_errors = [];

    if (strlen($password) < 8) {
        $pwd_errors[] = 'at least 8 characters';
    }
    if (!preg_match('/[A-Z]/', $password)) {
        $pwd_errors[] = 'at least 1 uppercase letter (A-Z)';
    }
    if (!preg_match('/[a-z]/', $password)) {
        $pwd_errors[] = 'at least 1 lowercase letter (a-z)';
    }
    if (!preg_match('/[0-9]/', $password)) {
        $pwd_errors[] = 'at least 1 number (0-9)';
    }
    if (!preg_match('/[\W_]/', $password)) {
        $pwd_errors[] = 'at least 1 special character (!, @, #, $, ...)';
    }

    if (!empty($pwd_errors)) {
        $_SESSION['register_error'] = 'Password must contain: ' . implode(', ', $pwd_errors) . '.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // ── 2. Email Validation (Format + DNS) ─────────────────────────────
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $_SESSION['register_error'] = 'Invalid email format.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // Get email domain and check for MX or A records
    $emailDomain = substr(strrchr($email, '@'), 1);

    if (!checkdnsrr($emailDomain, 'MX') && !checkdnsrr($emailDomain, 'A')) {
        $_SESSION['register_error'] = 'The email "' . htmlspecialchars($email) . '" does not appear to be real. Please enter a valid email.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // ── 3. Phone Number Validation ────────────────────────────────
    if (!empty($phone) && !preg_match('/^\+?[0-9\s\-]{7,15}$/', $phone)) {
        $_SESSION['register_error'] = 'Invalid phone number format. Example: +355 69 123 4567';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // ── 4. Check if email already exists ─────────────────────────
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        $_SESSION['register_error'] = 'This email is already registered! Please try logging in or use another one.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

    // ── 5. Hash password before saving ─────────────────────────────────
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);

    // ── 6. Insert User ─────────────────────────────────────────────────
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
        $_SESSION['register_error'] = 'An error occurred during registration. Please try again later.';
        header("Location: ../index.php?show_register=true");
        exit;
    }

} else {
    header("Location: ../index.php");
    exit;
}
?>