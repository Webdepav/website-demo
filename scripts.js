/**
 * Meal Attendance Tracker - Version 3.0
 * Updated with new features including:
 * - Admin/User role separation
 * - Date-based reporting
 * - QR code generation
 * - End-of-day notifications
 * - Responsive design
 * - Visual confirmation animations
 * - QR code database validation
 */

// Global Variables
let attendanceRecords = [];
let qrCodesDatabase = [];
let currentReport = [];
let scanner = null;
let notificationTimer = null;

// Initialize Application
document.addEventListener("DOMContentLoaded", function() {
    loadAttendanceData();
    loadQRCodeDatabase();
    setupEventListeners();
    setupTabNavigation();
    updateTime();
    setInterval(updateTime, 1000);
    setRegistrationDate();
    checkLoginStatus();
    setupNotifications();
});

// Load Attendance Data from localStorage
function loadAttendanceData() {
    const storedData = localStorage.getItem("attendanceRecords");
    if (storedData) {
        attendanceRecords = JSON.parse(storedData);
    }
    updateAttendanceCounts();
}

// Load QR Code Database from localStorage
function loadQRCodeDatabase() {
    const storedQRCodes = localStorage.getItem("qrCodesDatabase");
    if (storedQRCodes) {
        qrCodesDatabase = JSON.parse(storedQRCodes);
    }
}

// Save QR Code Database to localStorage
function saveQRCodeDatabase() {
    localStorage.setItem("qrCodesDatabase", JSON.stringify(qrCodesDatabase));
}

// Setup Event Listeners
function setupEventListeners() {
    // Login and Authentication
    document.getElementById("loginButton")?.addEventListener("click", handleLogin);
    document.getElementById("logoutButton")?.addEventListener("click", handleLogout);
    document.getElementById("adminLogoutButton")?.addEventListener("click", handleLogout);
    
    // User Page Controls
    document.getElementById("scanButton")?.addEventListener("click", startQRScanner);
    document.getElementById("stopScanButton")?.addEventListener("click", stopQRScanner);
    document.getElementById("fullscreenButton")?.addEventListener("click", toggleFullScreen);
    
    // Admin Dashboard Controls
    document.getElementById("downloadTodayCSV")?.addEventListener("click", downloadTodayData);
    document.getElementById("resetTodayButton")?.addEventListener("click", resetTodayCount);
    document.getElementById("generateReport")?.addEventListener("click", generateReport);
    document.getElementById("downloadReportCSV")?.addEventListener("click", downloadReportData);
    document.getElementById("generateQRCodes")?.addEventListener("click", generateQRCodes);
    document.getElementById("downloadQRZip")?.addEventListener("click", downloadQRCodesAsZip);
    document.getElementById("exportAllData")?.addEventListener("click", exportAllData);
    document.getElementById("clearAllData")?.addEventListener("click", clearAllData);
    
    // End of Day Notification Modal
    document.getElementById("closeEodModal")?.addEventListener("click", closeEODModal);
    document.getElementById("eodDownloadBtn")?.addEventListener("click", downloadEODData);
    document.getElementById("eodSkipBtn")?.addEventListener("click", closeEODModal);
    
    // Form Input Validation
    const qrCountInput = document.getElementById("qrCount");
    if (qrCountInput) {
        qrCountInput.addEventListener("input", function() {
            if (this.value > 500) this.value = 500;
            if (this.value < 1) this.value = 1;
        });
    }
    
    // Enter key for login
    document.getElementById("password")?.addEventListener("keypress", function(event) {
        if (event.key === "Enter") handleLogin();
    });
}

// Setup Tab Navigation for Admin Dashboard
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach(button => {
        button.addEventListener("click", function() {
            const tabId = this.getAttribute("data-tab");
            
            // Remove active class from all tabs and buttons
            document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
            document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
            
            // Add active class to selected tab and button
            document.getElementById(tabId).classList.add("active");
            this.classList.add("active");
        });
    });
}

// Login Logic
function handleLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const loginError = document.getElementById("loginError");
    
    if (!username || !password) {
        showLoginError("Please enter both username and password");
        return;
    }
    
    if (username === "admin" && password === "1234") {
        sessionStorage.setItem("userRole", "admin");
        checkLoginStatus();
    } else if (username === "staff" && password === "5678") {
        sessionStorage.setItem("userRole", "staff");
        checkLoginStatus();
    } else {
        showLoginError("Invalid credentials. Please try again.");
    }
}

// Show Login Error
function showLoginError(message) {
    const loginError = document.getElementById("loginError");
    loginError.textContent = message;
    loginError.style.display = "block";
    
    // Auto-hide error after 3 seconds
    setTimeout(() => {
        loginError.style.display = "none";
    }, 3000);
}

// Logout Logic
function handleLogout() {
    sessionStorage.removeItem("userRole");
    checkLoginStatus();
    if (scanner) {
        stopQRScanner();
    }
}

// Check Login Status and Show Appropriate Interface
function checkLoginStatus() {
    const userRole = sessionStorage.getItem("userRole");
    const loginContainer = document.getElementById("loginContainer");
    const staffContainer = document.getElementById("staffContainer");
    const adminContainer = document.getElementById("adminContainer");
    
    // Hide all containers first
    loginContainer.style.display = "none";
    staffContainer.style.display = "none";
    adminContainer.style.display = "none";
    
    if (!userRole) {
        // No user logged in, show login
        loginContainer.style.display = "block";
    } else if (userRole === "admin") {
        // Admin user, show admin dashboard
        adminContainer.style.display = "block";
        updateAdminDashboard();
    } else if (userRole === "staff") {
        // Staff user, show staff interface
        staffContainer.style.display = "block";
    }
}

// Update Admin Dashboard with Latest Data
function updateAdminDashboard() {
    const today = new Date().toLocaleDateString();
    document.getElementById("adminCurrentDate").textContent = today;
    
    // Calculate statistics
    const todayRecords = attendanceRecords.filter(record => 
        new Date(record.time).toLocaleDateString() === today
    );
    
    const weekRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.time);
        const now = new Date();
        const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return recordDate >= oneWeekAgo;
    });
    
    const monthRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.time);
        const now = new Date();
        return recordDate.getMonth() === now.getMonth() && 
               recordDate.getFullYear() === now.getFullYear();
    });
    
    // Update counts
    document.getElementById("todayCount").textContent = todayRecords.length;
    document.getElementById("weekCount").textContent = weekRecords.length;
    document.getElementById("monthCount").textContent = monthRecords.length;
    
    // Set last scan time
    if (todayRecords.length > 0) {
        const lastScan = todayRecords[todayRecords.length - 1];
        document.getElementById("lastScanTime").textContent = new Date(lastScan.time).toLocaleTimeString();
    }
}

// QR Scanner Functions
function startQRScanner() {
    const scanButton = document.getElementById("scanButton");
    const stopScanButton = document.getElementById("stopScanButton");
    const scannerDiv = document.getElementById("qr-scanner");
    
    scanButton.style.display = "none";
    stopScanButton.style.display = "inline-block";
    
    // Clear previous scanner instance
    scannerDiv.innerHTML = "";
    
    // Create new scanner instance
    scanner = new Html5Qrcode("qr-scanner"); // Changed to match the HTML5QRCode library's constructor
    
    const config = { fps: 15, qrbox: { width: 180, height: 180 }, aspectRatio: 1.7778 };
    
    scanner.start(
        { facingMode: "environment" }, // Use back camera if available
        config,
        (decodedText) => {
            handleSuccessfulScan(decodedText);
        },
        (errorMessage) => {
            console.log("QR scan error:", errorMessage);
        }
    ).catch(err => {
        console.error("Scanner start error:", err);
    });
}

function stopQRScanner() {
    if (scanner) {
        scanner.stop().then(() => {
            console.log("Scanner stopped");
            scanner = null;
            
            const scanButton = document.getElementById("scanButton");
            const stopScanButton = document.getElementById("stopScanButton");
            
            scanButton.style.display = "inline-block";
            stopScanButton.style.display = "none";
        }).catch(err => {
            console.error("Scanner stop error:", err);
        });
    }
}

// Handle Successful QR Scan
function handleSuccessfulScan(scannedText) {
    // Automatically stop the scanner after successful scan
    stopQRScanner();
    
    // Validate the QR code format (must start with UAC)
    if (!scannedText.startsWith("UAC")) {
        showScanStatus("Invalid QR Code format! ID must start with UAC.", "error");
        playSound("error");
        showVisualFeedback("error");
        return;
    }
    
    // Check if scanned QR code exists in database
    if (!isQRCodeInDatabase(scannedText)) {
        showScanStatus(`Invalid QR Code: ${scannedText} not found in database!`, "error");
        playSound("error");
        showVisualFeedback("error");
        return;
    }
    
    const currentTime = new Date().toISOString();
    const today = new Date().toLocaleDateString();
    
    // Check if this ID has already been scanned today
    const alreadyScannedToday = attendanceRecords.some(record => 
        record.id === scannedText && 
        new Date(record.time).toLocaleDateString() === today
    );
    
    if (alreadyScannedToday) {
        showScanStatus(`ID ${scannedText} has already been recorded today!`, "warning");
        playSound("error");
        showVisualFeedback("warning");
        return;
    }
    
    // Add new record
    attendanceRecords.push({
        id: scannedText,
        time: currentTime
    });
    
    // Save to local storage
    saveAttendanceData();
    
    // Update UI
    showScanStatus(`Success! ID ${scannedText} has been registered.`, "success");
    playSound("success");
    showVisualFeedback("success");
    updateAttendanceCounts();
}

// Check if QR code exists in database
function isQRCodeInDatabase(qrCode) {
    return qrCodesDatabase.includes(qrCode);
}

// Show scan status message
function showScanStatus(message, type) {
    const statusEl = document.getElementById("scanStatus");
    statusEl.textContent = message;
    statusEl.className = "status-message " + type;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "status-message";
    }, 5000);
}

// Show visual feedback animation
function showVisualFeedback(type) {
    // Create overlay element for animation
    const overlay = document.createElement("div");
    overlay.className = `feedback-overlay ${type}`;
    document.body.appendChild(overlay);
    
    // Create icon element
    const icon = document.createElement("div");
    icon.className = `feedback-icon ${type}`;
    
    // Set icon content based on type
    if (type === "success") {
        icon.innerHTML = `<svg viewBox="0 0 24 24" width="64" height="64">
            <path fill="white" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
        </svg>`;
    } else if (type === "error") {
        icon.innerHTML = `<svg viewBox="0 0 24 24" width="64" height="64">
            <path fill="white" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path>
        </svg>`;
    } else if (type === "warning") {
        icon.innerHTML = `<svg viewBox="0 0 24 24" width="64" height="64">
            <path fill="white" d="M12 2L1 21h22L12 2zm0 3.3L19.2 19H4.8L12 5.3z"></path>
            <path fill="white" d="M11 10h2v5h-2z"></path>
            <path fill="white" d="M11 16h2v2h-2z"></path>
        </svg>`;
    }
    
    overlay.appendChild(icon);
    
    // Animate the overlay
    setTimeout(() => {
        overlay.classList.add("visible");
    }, 10);
    
    // Remove overlay after animation completes
    setTimeout(() => {
        overlay.classList.remove("visible");
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 300);
    }, 1500);
}

// Play success or error sound
function playSound(type) {
    // Create audio context on first user interaction
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // Generate a simple beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set frequency based on type
    oscillator.type = 'sine';
    oscillator.frequency.value = type === "success" ? 880 : 220; // A5 or A3
    
    // Set duration
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    // Play sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Save attendance data to localStorage
function saveAttendanceData() {
    localStorage.setItem("attendanceRecords", JSON.stringify(attendanceRecords));
}

// Update attendance counts on both staff and admin pages
function updateAttendanceCounts() {
    const today = new Date().toLocaleDateString();
    const todayCount = attendanceRecords.filter(record => 
        new Date(record.time).toLocaleDateString() === today
    ).length;
    
    // Update count on staff page
    const staffCountEl = document.getElementById("staffAttendanceCount");
    if (staffCountEl) staffCountEl.textContent = todayCount;
    
    // Update count on admin page
    const adminCountEl = document.getElementById("adminAttendanceCount");
    if (adminCountEl) adminCountEl.textContent = todayCount;
    
    // Update admin dashboard if active
    if (document.getElementById("adminContainer").style.display !== "none") {
        updateAdminDashboard();
    }
}

// Update clock display
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const currentTimeEl = document.getElementById("currentTime");
    if (currentTimeEl) currentTimeEl.textContent = timeString;
}

// Set registration date
function setRegistrationDate() {
    const todayElement = document.getElementById("registrationDate");
    if (todayElement) {
        todayElement.textContent = new Date().toLocaleDateString();
    }
}

// Toggle fullscreen mode
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Generate and download report for date range
function generateReport() {
    const startDate = document.getElementById("startDate").value; // Fixed ID to match HTML
    const endDate = document.getElementById("endDate").value; // Fixed ID to match HTML
    
    if (!startDate || !endDate) {
        alert("Please select both start and end dates");
        return;
    }
    
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999); // Set to end of day
    
    if (startDateTime > endDateTime) {
        alert("Start date cannot be after end date");
        return;
    }
    
    // Filter records for the date range
    currentReport = attendanceRecords.filter(record => {
        const recordDate = new Date(record.time);
        return recordDate >= startDateTime && recordDate <= endDateTime;
    });
    
    // Group by date and ID for the report
    const reportByDate = {};
    currentReport.forEach(record => {
        const date = new Date(record.time).toLocaleDateString();
        if (!reportByDate[date]) {
            reportByDate[date] = new Set();
        }
        reportByDate[date].add(record.id);
    });
    
    // Display report in the UI
    const reportResultsDiv = document.getElementById("reportResults");
    reportResultsDiv.innerHTML = "";
    
    if (Object.keys(reportByDate).length === 0) {
        reportResultsDiv.innerHTML = "<p>No data found for selected date range</p>";
        return;
    }
    
    // Create a table for the report
    const table = document.createElement("table");
    table.className = "report-table";
    
    // Add table header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Date", "Count", "Details"].forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Add table body
    const tbody = document.createElement("tbody");
    
    for (const date in reportByDate) {
        const row = document.createElement("tr");
        
        const dateCell = document.createElement("td");
        const countCell = document.createElement("td");
        const detailsCell = document.createElement("td");
        
        dateCell.textContent = date;
        countCell.textContent = reportByDate[date].size;
        detailsCell.textContent = Array.from(reportByDate[date]).join(", ");
        
        row.appendChild(dateCell);
        row.appendChild(countCell);
        row.appendChild(detailsCell);
        tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    reportResultsDiv.appendChild(table);
    
    // Show download button
    const downloadButton = document.getElementById("downloadReportCSV");
    if (downloadButton) {
        downloadButton.style.display = "inline-block";
    }
}

// Download report as CSV
function downloadReportData() {
    if (currentReport.length === 0) {
        alert("No report data to download");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,ID,Date,Time\n";
    
    currentReport.forEach(record => {
        const date = new Date(record.time);
        csvContent += `${record.id},${date.toLocaleDateString()},${date.toLocaleTimeString()}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download today's data as CSV
function downloadTodayData() {
    const today = new Date().toLocaleDateString();
    const todayRecords = attendanceRecords.filter(record => 
        new Date(record.time).toLocaleDateString() === today
    );
    
    if (todayRecords.length === 0) {
        alert("No records found for today");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,ID,Time\n";
    
    todayRecords.forEach(record => {
        csvContent += `${record.id},${new Date(record.time).toLocaleTimeString()}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_today_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Reset today's count (admin function)
function resetTodayCount() {
    if (!confirm("Are you sure you want to delete all of today's records? This cannot be undone.")) {
        return;
    }
    
    const today = new Date().toLocaleDateString();
    attendanceRecords = attendanceRecords.filter(record => 
        new Date(record.time).toLocaleDateString() !== today
    );
    
    saveAttendanceData();
    updateAttendanceCounts();
    alert("Today's records have been cleared");
}

// Generate QR codes
function generateQRCodes() {
    const count = parseInt(document.getElementById("qrCount").value) || 10;
    const startNumber = parseInt(document.getElementById("startNumber").value) || 100000;
    const prefix = document.getElementById("qrPrefix").value || "UAC";
    const qrCodesContainer = document.getElementById("qrCodesContainer");
    
    // Clear previous QR codes
    qrCodesContainer.innerHTML = "";
    
    for (let i = 0; i < count; i++) {
        const id = `${prefix}${(startNumber + i).toString().padStart(6, '0')}`;
        
        // Create QR item container
        const qrItem = document.createElement("div");
        qrItem.className = "qr-item";
        
        // Create QR canvas
        const qrCanvas = document.createElement("div");
        qrCanvas.id = `qr-${i}`;
        qrItem.appendChild(qrCanvas);
        
        // Create ID label
        const idLabel = document.createElement("p");
        idLabel.textContent = id;
        qrItem.appendChild(idLabel);
        
        // Add to container
        qrCodesContainer.appendChild(qrItem);
        
        // Generate QR code
        QRCode.toCanvas(qrCanvas, id, {
            width: 128,
            margin: 1,
            color: {
                dark: "#000000",
                light: "#ffffff"
            }
        }, function(error) {
            if (error) console.error(error);
        });
    }
    
    // Show download button
    const downloadButton = document.getElementById("downloadQRZip");
    if (downloadButton) {
        downloadButton.style.display = "inline-block";
    }
}


// Add QR codes to the database
function addQRCodesToDatabase(codes) {
    // Filter out any codes that are already in the database
    const newCodes = codes.filter(code => !qrCodesDatabase.includes(code));
    
    // Add the new codes to the database
    qrCodesDatabase = [...qrCodesDatabase, ...newCodes];
    
    // Save the updated database
    saveQRCodeDatabase();
    
    // Show notification about added codes
    if (newCodes.length > 0) {
        const message = `${newCodes.length} new QR code${newCodes.length === 1 ? '' : 's'} added to database`;
        const adminNotificationEl = document.getElementById("adminNotification");
        if (adminNotificationEl) {
            adminNotificationEl.textContent = message;
            adminNotificationEl.style.display = "block";
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                adminNotificationEl.style.display = "none";
            }, 5000);
        }
    }
}

// Download QR codes as ZIP file
function downloadQRCodesAsZip() {

    // Create a new ZIP file
    const zip = new JSZip();
    
    // Get all QR code canvases
    const qrCanvases = document.querySelectorAll('.qr-code-canvas'); // Adjust selector to match your QR code canvases
    
    if (qrCanvases.length === 0) {
        alert("No QR codes found to download.");
        return;
    }
    
    // Add each QR code to the ZIP file
    let counter = 0;
    const totalQR = qrCanvases.length;
    
    qrCanvases.forEach((canvas, index) => {
        // Convert canvas to blob
        canvas.toBlob(function(blob) {
            // Get the QR code data or use index as filename
            const qrData = canvas.getAttribute('data-qr-value') || `qr-code-${index + 1}`;
            
            // Add file to zip with a clean filename (remove special characters)
            const filename = `${qrData.replace(/[^a-z0-9]/gi, '-').substring(0, 20)}.png`;
            zip.file(filename, blob);
            
            counter++;
            
            // When all QR codes are processed, generate and download the ZIP
            if (counter === totalQR) {
                zip.generateAsync({type: "blob"})
                    .then(function(content) {
                        // Download the ZIP file
                        saveAs(content, "qr-codes.zip");
                    });
            }
        }, 'image/png');
    });
    
    // Show a loading message if there are many QR codes
    if (totalQR > 10) {
        alert(`Preparing ${totalQR} QR codes for download. This may take a moment...`);
    }
}

// Export all data (admin function)
function exportAllData() {
    if (attendanceRecords.length === 0) {
        alert("No data to export");
        return;
    }
    
    const dataStr = JSON.stringify({
        attendanceRecords: attendanceRecords,
        qrCodesDatabase: qrCodesDatabase
    }, null, 2);
    
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    
    const exportLink = document.createElement("a");
    exportLink.setAttribute("href", dataUri);
    exportLink.setAttribute("download", `meal_tracker_data_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(exportLink);
    exportLink.click();
    document.body.removeChild(exportLink);
}

// Clear all data (admin function)
function clearAllData() {
    if (!confirm("WARNING: This will permanently delete ALL attendance records. This action cannot be undone. Continue?")) {
        return;
    }
    
    // Double-check with second confirmation
    if (!confirm("Are you absolutely sure? All data will be permanently lost.")) {
        return;
    }
    
    // Prompt for database reset
    const resetDatabase = confirm("Do you also want to clear the QR code database?");
    
    attendanceRecords = [];
    saveAttendanceData();
    
    if (resetDatabase) {
        qrCodesDatabase = [];
        saveQRCodeDatabase();
    }
    
    updateAttendanceCounts();
    alert("All data has been cleared" + (resetDatabase ? " including the QR code database" : ""));
}

// Setup End-of-Day Notifications
function setupNotifications() {
    // Check for notification settings
    const enableNotifications = document.getElementById("enableNotifications");
    if (enableNotifications && !enableNotifications.checked) {
        return; // Notifications disabled
    }
    
    const checkForEndOfDay = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Get notification time or use default (5:00 PM)
        const notificationTimeEl = document.getElementById("notificationTime");
        let targetHour = 17; // Default to 5:00 PM
        let targetMinute = 0;
        
        if (notificationTimeEl && notificationTimeEl.value) {
            const timeParts = notificationTimeEl.value.split(':');
            targetHour = parseInt(timeParts[0]);
            targetMinute = parseInt(timeParts[1]);
        }
        
        // Check if it's notification time
        if (hours === targetHour && minutes === targetMinute) {
            showEndOfDayModal();
        }
        
        // Set timer for next minute check
        clearTimeout(notificationTimer);
        const secondsUntilNextMinute = 60 - now.getSeconds();
        notificationTimer = setTimeout(checkForEndOfDay, secondsUntilNextMinute * 1000);
    };
    
    // Start the notification checker
    checkForEndOfDay();
}

// Show End-of-Day Modal
function showEndOfDayModal() {
    const today = new Date().toLocaleDateString();
    const todayRecords = attendanceRecords.filter(record => 
        new Date(record.time).toLocaleDateString() === today
    );
    
    // Set modal data
    document.getElementById("eodMealCount").textContent = todayRecords.length;
    document.getElementById("eodDate").textContent = today;
    
    // Show modal
    document.getElementById("eodNotification").style.display = "flex";
}

// Close End-of-Day Modal
function closeEODModal() {
    document.getElementById("eodNotification").style.display = "none";
}

// Download End-of-Day Data
function downloadEODData() {
    downloadTodayData();
    closeEODModal();
}
