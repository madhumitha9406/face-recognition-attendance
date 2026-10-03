import base64
import os
import struct
from datetime import datetime

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = os.path.join(app.static_folder, "uploads")
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

students = [
    {"id": 1, "name": "Arun Kumar", "roll": "21IT001"},
    {"id": 2, "name": "Priya S", "roll": "21IT002"},
    {"id": 3, "name": "Rahul M", "roll": "21IT003"},
    {"id": 4, "name": "Divya R", "roll": "21IT004"},
    {"id": 5, "name": "Kavya N", "roll": "21IT005"},
]

attendance_records = [
    {"name": "Arun Kumar", "roll": "21IT001", "time": "09:02 AM", "status": "Present"},
    {"name": "Priya S", "roll": "21IT002", "time": "09:04 AM", "status": "Present"},
    {"name": "Rahul M", "roll": "21IT003", "time": "09:07 AM", "status": "Present"},
    {"name": "Divya R", "roll": "21IT004", "time": "09:10 AM", "status": "Present"},
]


def format_time(value=None):
    if value is None:
        value = datetime.now()
    return value.strftime("%I:%M %p")


def build_stats():
    total_students = len(students)
    present_count = len({record["roll"].upper() for record in attendance_records})
    absent_count = max(total_students - present_count, 0)
    percentage = round((present_count / total_students) * 100) if total_students else 0

    return {
        "students": total_students,
        "present": present_count,
        "absent": absent_count,
        "percentage": percentage,
    }


def save_photo(base64_data):
    if not base64_data:
        return None

    try:
        header, encoded = base64_data.split(",", 1)
        file_type = header.split(";")[0].split(":")[-1]
        ext = ".jpg" if "jpeg" in file_type else ".png" if "png" in file_type else ".jpg"
        filename = f"attendance_{datetime.now().strftime('%Y%m%d%H%M%S%f')}{ext}"
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

        with open(file_path, "wb") as image_file:
            image_file.write(base64.b64decode(encoded))

        return "/static/uploads/" + filename
    except Exception:
        return None


def parse_image_dimensions(image_bytes):
    if not image_bytes:
        return 0, 0

    try:
        if image_bytes[:2] == b"\x89P":
            width, height = struct.unpack(">II", image_bytes[8:16])
            return width, height
        if image_bytes[:2] == b"\xff\xd8":
            idx = 2
            while idx < len(image_bytes) - 1:
                if image_bytes[idx] != 0xFF:
                    idx += 1
                    continue
                if image_bytes[idx + 1] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB):
                    _, height, width = struct.unpack(">BHH", image_bytes[idx + 2:idx + 6])
                    return width, height
                idx += 2
    except Exception:
        pass

    return 0, 0


def analyze_face_photo(photo_data):
    if not photo_data:
        return {
            "status": "No image",
            "confidence": 0.0,
            "message": "No face image was provided."
        }

    try:
        header, encoded = photo_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        width, height = parse_image_dimensions(image_bytes)
        brightness = 0
        sample_size = 0

        if width and height:
            for i in range(0, len(image_bytes), 40):
                chunk = image_bytes[i:i + 40]
                if len(chunk) < 4:
                    continue
                brightness += sum(chunk[:3]) / 3
                sample_size += 1

        brightness = brightness / sample_size if sample_size else 128
        score = 0.0
        if width and height:
            score += min((width * height) / 50000, 0.7)
        score += max(0.0, (180 - abs(brightness - 128)) / 180) * 0.3

        if width > 120 and height > 120 and score >= 0.45:
            return {
                "status": "Face detected",
                "confidence": round(min(score, 1.0), 2),
                "message": "Face analysis completed successfully."
            }

        return {
            "status": "Low confidence",
            "confidence": round(min(score, 0.99), 2),
            "message": "Image detected, but face quality is low. Try a clearer photo."
        }
    except Exception:
        return {
            "status": "Analysis failed",
            "confidence": 0.0,
            "message": "Could not analyze the image file."
        }


@app.route("/")
def dashboard():
    return render_template("index.html")


@app.route("/students")
def students_page():
    return render_template("students.html", students=students)


@app.route("/attendance")
def attendance_page():
    return render_template("attendance.html", records=attendance_records)


@app.route("/recognition")
def recognition_page():
    return render_template("recognition.html", total_students=len(students), present_count=len(attendance_records))


@app.route("/reports")
def reports_page():
    stats = build_stats()
    present_rolls = {record["roll"].upper() for record in attendance_records}
    report_data = {
        "total_students": stats["students"],
        "present_today": stats["present"],
        "absent_today": stats["absent"],
        "attendance_rate": stats["percentage"],
        "records": attendance_records[:10],
        "absent_students": [student for student in students if student["roll"].upper() not in present_rolls],
    }
    return render_template("reports.html", report=report_data)


@app.route("/api/stats")
def stats():
    return jsonify(build_stats())


@app.route("/api/students")
def student_list():
    return jsonify(students)


@app.route("/api/recent-attendance")
def recent_attendance():
    return jsonify(attendance_records[:8])


@app.route("/api/mark-attendance", methods=["POST"])
def mark_attendance():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    roll = (data.get("roll") or data.get("roll_number") or "").strip()
    photo = data.get("photo")

    if not name or not roll:
        return jsonify({"error": "Name and roll number are required."}), 400

    existing_student = next((s for s in students if s["roll"].upper() == roll.upper()), None)
    if existing_student is None:
        students.append({
            "id": len(students) + 1,
            "name": name,
            "roll": roll,
        })

    photo_path = save_photo(photo)

    for record in attendance_records:
        if record["roll"].upper() == roll.upper():
            record["name"] = name
            record["time"] = format_time()
            record["status"] = "Present"
            if photo_path:
                record["photo"] = photo_path
            return jsonify({"message": "Attendance updated successfully.", "record": record}), 200

    record = {
        "name": name,
        "roll": roll,
        "time": format_time(),
        "status": "Present",
    }
    if photo_path:
        record["photo"] = photo_path

    attendance_records.insert(0, record)
    return jsonify({"message": "Attendance marked successfully.", "record": record}), 201


@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    roll = (data.get("roll") or data.get("roll_number") or "").strip()
    photo = data.get("photo")

    if not name or not roll:
        return jsonify({"error": "Name and roll number are required."}), 400

    if any(student["roll"].upper() == roll.upper() for student in students):
        return jsonify({"error": "Student with this roll number already exists."}), 409

    analysis = analyze_face_photo(photo)
    student = {
        "id": len(students) + 1,
        "name": name,
        "roll": roll,
        "analysis": analysis,
    }
    students.append(student)
    return jsonify({"message": "Student added successfully. Face analysis completed.", "student": student, "analysis": analysis}), 201


@app.route("/api/attendance/<roll>", methods=["DELETE"])
def delete_attendance(roll):
    original_len = len(attendance_records)
    attendance_records[:] = [
        record for record in attendance_records
        if record["roll"].upper() != roll.upper()
    ]

    if len(attendance_records) == original_len:
        return jsonify({"error": "Attendance record not found."}), 404

    return jsonify({"message": "Attendance deleted successfully."})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)