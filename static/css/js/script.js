// ================= DATE =================

function updateDate() {
    const dateElement = document.getElementById("currentDate");
    if (!dateElement) return;

    const today = new Date();
    const options = {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    };

    dateElement.textContent = today.toLocaleDateString("en-US", options);
}

// ================= LOAD DASHBOARD STATS =================

async function loadStats() {
    const studentsEl = document.getElementById("students");
    const presentEl = document.getElementById("present");
    const absentEl = document.getElementById("absent");
    const percentageEl = document.getElementById("percentage");

    if (!studentsEl || !presentEl || !absentEl || !percentageEl) return;

    try {
        const response = await fetch("/api/stats");
        const data = await response.json();

        studentsEl.textContent = data.students;
        presentEl.textContent = data.present;
        absentEl.textContent = data.absent;
        percentageEl.textContent = data.percentage;
    } catch (error) {
        console.log("Could not load statistics.");
    }
}

// ================= RECENT ATTENDANCE =================

async function loadAttendance() {
    const table = document.getElementById("attendanceTable");
    if (!table) return;

    try {
        const response = await fetch("/api/recent-attendance");
        const data = await response.json();

        table.innerHTML = "";

        data.forEach(student => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${student.name}</strong></td>
                <td>${student.roll}</td>
                <td>${student.time}</td>
                <td><span class="status">${student.status}</span></td>
                <td>
                    <button class="delete-btn" data-roll="${student.roll}" type="button">
                        Delete
                    </button>
                </td>
            `;
            table.appendChild(row);
        });

        document.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const roll = button.getAttribute("data-roll");
                if (!roll) return;
                await deleteAttendance(roll);
            });
        });
    } catch (error) {
        console.log("Could not load attendance.");
    }
}

async function deleteAttendance(roll) {
    try {
        const response = await fetch(`/api/attendance/${encodeURIComponent(roll)}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error || "Could not delete attendance.");
            return;
        }

        alert(result.message || "Attendance deleted.");
        await loadAttendance();
        await loadStats();
    } catch (error) {
        console.log("Delete attendance failed.");
    }
}

async function loadStudents() {
    const table = document.getElementById("studentTable");
    if (!table) return;

    try {
        const response = await fetch("/api/students");
        const data = await response.json();

        table.innerHTML = "";

        data.forEach(student => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${student.id}</td>
                <td><strong>${student.name}</strong></td>
                <td>${student.roll}</td>
            `;
            table.appendChild(row);
        });
    } catch (error) {
        console.log("Could not load students.");
    }
}

async function submitStudentForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = {
        name: formData.get("name"),
        roll: formData.get("roll"),
        photo: formData.get("photoData") || formData.get("photo") || ""
    };

    try {
        const response = await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error || "Could not add student.");
            return;
        }

        alert(`${result.message || "Student added successfully."} ${result.analysis ? "Analysis: " + result.analysis.status : ""}`);
        form.reset();
        if (document.getElementById("studentPhotoPreview")) {
            document.getElementById("studentPhotoPreview").src = "";
            document.getElementById("studentPhotoPreview").hidden = true;
        }
        const studentPhotoInput = document.getElementById("studentPhoto");
        if (studentPhotoInput) studentPhotoInput.value = "";
        const studentPhotoData = document.getElementById("studentPhotoData");
        if (studentPhotoData) studentPhotoData.value = "";
        await loadStudents();
        await loadStats();
    } catch (error) {
        console.log("Student submit failed.");
    }
}

async function submitRecognitionForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = {
        name: formData.get("name"),
        roll: formData.get("roll"),
        photo: formData.get("photo") || ""
    };

    try {
        const response = await fetch("/api/mark-attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error || "Could not mark attendance.");
            return;
        }

        alert(result.message || "Attendance marked.");
        form.reset();
        document.getElementById("photoData").value = "";
        const preview = document.getElementById("photoPreview");
        if (preview) {
            preview.src = "";
            preview.hidden = true;
        }
        await loadStats();
        await loadAttendance();
    } catch (error) {
        console.log("Recognition submit failed.");
    }
}

// ================= CAMERA CAPTURE =================

let cameraStream = null;

async function startCamera() {
    const video = document.getElementById("cameraVideo");
    const emptyState = document.getElementById("cameraEmptyState");
    const captureBtn = document.getElementById("capturePhotoBtn");

    if (!video || !captureBtn) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support camera access.");
        return;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        });

        video.srcObject = cameraStream;
        video.hidden = false;
        if (emptyState) emptyState.style.display = "none";
        captureBtn.disabled = false;
    } catch (error) {
        alert("Camera access was denied. You can still mark attendance manually.");
    }
}

function capturePhoto() {
    const video = document.getElementById("cameraVideo");
    const canvas = document.getElementById("photoCanvas");
    const preview = document.getElementById("photoPreview");
    const photoData = document.getElementById("photoData");

    if (!video || !canvas || !preview || !photoData) return;

    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    preview.src = imageData;
    preview.hidden = false;
    photoData.value = imageData;

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    video.srcObject = null;
    video.hidden = true;
    const emptyState = document.getElementById("cameraEmptyState");
    if (emptyState) emptyState.style.display = "flex";
    const captureBtn = document.getElementById("capturePhotoBtn");
    if (captureBtn) captureBtn.disabled = true;
}

// ================= RECOGNITION MODAL =================

function startRecognition() {
    const modal = document.getElementById("recognitionModal");
    if (modal) modal.classList.add("show");
    if (window.location.pathname !== "/recognition") {
        window.location.href = "/recognition";
    }
}

function closeRecognition() {
    const modal = document.getElementById("recognitionModal");
    if (modal) modal.classList.remove("show");
}

window.addEventListener("click", function(event) {
    const modal = document.getElementById("recognitionModal");
    if (modal && event.target === modal) {
        closeRecognition();
    }
});

window.addEventListener("DOMContentLoaded", function() {
    updateDate();
    loadStats();
    loadAttendance();
    loadStudents();

    const studentForm = document.getElementById("studentForm");
    if (studentForm) {
        studentForm.addEventListener("submit", submitStudentForm);
    }

    const addStudentButton = document.getElementById("addStudentDashboardBtn");
    if (addStudentButton) {
        addStudentButton.addEventListener("click", () => {
            window.location.href = "/students";
        });
    }

    const reportButton = document.getElementById("downloadReportBtn");
    if (reportButton) {
        reportButton.addEventListener("click", () => {
            window.location.href = "/reports";
        });
    }

    const recognitionButton = document.getElementById("startRecognitionBtn");
    if (recognitionButton) {
        recognitionButton.addEventListener("click", () => {
            window.location.href = "/recognition";
        });
    }

    const recognitionForm = document.getElementById("recognitionForm");
    if (recognitionForm) {
        recognitionForm.addEventListener("submit", submitRecognitionForm);
    }

    const startCameraBtn = document.getElementById("startCameraBtn");
    if (startCameraBtn) {
        startCameraBtn.addEventListener("click", startCamera);
    }

    const capturePhotoBtn = document.getElementById("capturePhotoBtn");
    if (capturePhotoBtn) {
        capturePhotoBtn.addEventListener("click", capturePhoto);
    }

    const studentPhotoInput = document.getElementById("studentPhoto");
    if (studentPhotoInput) {
        studentPhotoInput.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById("studentPhotoPreview");
                if (preview) {
                    preview.src = e.target.result;
                    preview.hidden = false;
                }
                const hidden = document.getElementById("studentPhotoData");
                if (hidden) hidden.value = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
});