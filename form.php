<?php
$First_name = $_POST['First_name'];
$Last_name = $_POST['Last_name'];
$Phone = $_POST['Phone'];
$Location = $_POST['Location'];

// Database connection
$conn = new mysqli('localhost', 'root', '', 'form');
if ($conn->connect_error) {
    die("Connection Failed: " . $conn->connect_error);
} else {
    $stmt = $conn->prepare("INSERT INTO tingz (First_name, Last_name, Phone, Location) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssis", $First_name, $Last_name, $Phone, $Location);
    $execval = $stmt->execute();

    $stmt->close();
    $conn->close();
}
?>