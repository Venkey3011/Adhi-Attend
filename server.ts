import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { LOGO_BASE64 } from "./src/logo";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = "college_attendance_secret_key_2026";

console.log("Checking MongoDB URI...");
if (MONGODB_URI) {
  console.log("MONGODB_URI found, attempting to connect...");
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
  })
    .then(() => console.log("Successfully connected to MongoDB Atlas"))
    .catch(err => {
      console.error("CRITICAL: MongoDB connection error:");
      console.error(err.message);
      console.error("Please check your MONGODB_URI and ensure IP 0.0.0.0/0 is whitelisted in Atlas.");
    });
} else {
  console.error("ERROR: MONGODB_URI is not defined in environment variables.");
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ 
    status: "ok", 
    database: dbStatus,
    env: {
      hasUri: !!MONGODB_URI
    }
  });
});

// Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "coordinator"], required: true },
  name: String,
  department: String
});

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  batch: { type: String, required: true },
  department: { type: String, required: true }
});

const attendanceSessionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, required: true }, // e.g., "Java", "HackerRank"
  batch: { type: String, required: true },
  department: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  status: { type: String, enum: ["P", "A", "OD"], required: true },
  reason: String
});

const User = mongoose.model("User", userSchema);
const Student = mongoose.model("Student", studentSchema);
const AttendanceSession = mongoose.model("AttendanceSession", attendanceSessionSchema);
const AttendanceRecord = mongoose.model("AttendanceRecord", attendanceRecordSchema);

// Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1] || req.query.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token as string, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
};

// Auth Routes
app.get("/api/users", authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/users", authenticate, isAdmin, async (req, res) => {
  const { username, password, role, name, department } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role, name, department });
    await user.save();
    res.json({ message: "User created successfully" });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.put("/api/users/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { username, password, role, name, department } = req.body;
    const updateData: any = { username, role, name, department };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await User.findByIdAndUpdate(req.params.id, updateData);
    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

app.delete("/api/users/:id", authenticate, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, department: user.department }, JWT_SECRET);
    res.json({ token, user: { id: user._id, role: user.role, name: user.name, department: user.department } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Initial Admin Creation (for testing/setup)
app.post("/api/auth/setup", async (req, res) => {
  const { username, password, role, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role, name });
    await user.save();
    res.json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ error: "User already exists or invalid data" });
  }
});

// Student Routes
app.get("/api/students/template", authenticate, isAdmin, (req, res) => {
  const templateData = [
    {
      Name: "John Doe",
      RollNumber: "21CS001",
      Batch: "2021",
      Department: "CSE"
    },
    {
      Name: "Jane Smith",
      RollNumber: "22EC045",
      Batch: "2022",
      Department: "ECE"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", "attachment; filename=student_upload_template.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

app.get("/api/students/batches", authenticate, async (req, res) => {
  try {
    const batches = await Student.distinct("batch");
    res.json(batches.sort());
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/students/departments", authenticate, async (req, res) => {
  try {
    const filter: any = {};
    if ((req as any).user.role === 'coordinator' && (req as any).user.department) {
      filter.department = (req as any).user.department;
    }
    const departments = await Student.distinct("department", filter);
    res.json(departments.sort());
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/students", authenticate, async (req, res) => {
  const { batch, department } = req.query;
  const filter: any = {};
  if (batch) filter.batch = batch;
  if (department) filter.department = department;
  
  // If user is a coordinator with a department, restrict to that department
  if ((req as any).user.role === 'coordinator' && (req as any).user.department) {
    filter.department = (req as any).user.department;
  }
  
  const students = await Student.find(filter).sort({ rollNumber: 1 });
  res.json(students);
});

app.post("/api/students", authenticate, isAdmin, async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: "Roll number must be unique" });
  }
});

app.put("/api/students/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

app.delete("/api/students/:id", authenticate, isAdmin, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    await AttendanceRecord.deleteMany({ studentId: req.params.id });
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.post("/api/students/bulk-delete", authenticate, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "Invalid request" });
    await Student.deleteMany({ _id: { $in: ids } });
    await AttendanceRecord.deleteMany({ studentId: { $in: ids } });
    res.json({ message: "Students deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

const upload = multer({ storage: multer.memoryStorage() });
app.post("/api/students/bulk", authenticate, isAdmin, upload.single("file"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    const students = data.map(item => ({
      name: item.Username || item.username || item.Name || item.name,
      rollNumber: String(item['Register N'] || item['Register Number'] || item.RegisterNumber || item.RollNumber || item.rollNumber),
      batch: String(item.Batch || item.batch),
      department: String(item.Department || item.department)
    }));

    const rollNumbers = students.map(s => s.rollNumber);
    const existingStudents = await Student.find({ rollNumber: { $in: rollNumbers } });
    const existingRollNumbers = new Set(existingStudents.map(s => s.rollNumber));
    
    const uniqueStudents: any[] = [];
    const duplicates: any[] = [];
    const seenRollNumbers = new Set();

    for (const student of students) {
      if (existingRollNumbers.has(student.rollNumber) || seenRollNumbers.has(student.rollNumber)) {
        duplicates.push(student);
      } else {
        uniqueStudents.push(student);
        seenRollNumbers.add(student.rollNumber);
      }
    }

    if (uniqueStudents.length > 0) {
      await Student.insertMany(uniqueStudents);
    }

    res.json({ message: "Bulk upload processed", added: uniqueStudents.length, duplicates });
  } catch (err) {
    res.status(500).json({ error: "Error processing file" });
  }
});

// Attendance Routes
app.post("/api/attendance/session", authenticate, isAdmin, async (req, res) => {
  const { type, batch, department, records } = req.body;
  try {
    const session = new AttendanceSession({ type, batch, department, createdBy: (req as any).user.id });
    await session.save();

    const attendanceRecords = records.map((r: any) => ({
      sessionId: session._id,
      studentId: r.studentId,
      status: r.status,
      reason: r.reason
    }));
    await AttendanceRecord.insertMany(attendanceRecords);
    res.json({ message: "Attendance marked successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error marking attendance" });
  }
});

app.get("/api/attendance/reports", authenticate, async (req, res) => {
  const { startDate, endDate, batch, department, type } = req.query;
  const filter: any = {};
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate && startDate !== "") {
      const start = new Date(startDate as string);
      start.setUTCHours(0, 0, 0, 0);
      filter.date.$gte = start;
    }
    if (endDate && endDate !== "") {
      const end = new Date(endDate as string);
      end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
    if (Object.keys(filter.date).length === 0) delete filter.date;
  }
  
  if (batch && batch !== "") filter.batch = batch;
  if (department && department !== "") filter.department = department;
  if (type && type !== "") filter.type = type;

  // If user is a coordinator with a department, restrict to that department
  if ((req as any).user.role === 'coordinator' && (req as any).user.department) {
    filter.department = (req as any).user.department;
  }

  const sessions = await AttendanceSession.find(filter).populate("createdBy", "name");
  const sessionIds = sessions.map(s => s._id);
  
  const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } })
    .populate("studentId")
    .populate("sessionId")
    .sort({ _id: -1 });

  res.json(records);
});

app.put("/api/attendance/records/:id", authenticate, async (req, res) => {
  try {
    const { status, reason } = req.body;
    await AttendanceRecord.findByIdAndUpdate(req.params.id, { status, reason });
    res.json({ message: "Record updated" });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// Export Route
app.get("/api/attendance/export", authenticate, async (req, res) => {
  const { startDate, endDate, batch, department, type } = req.query;
  const filter: any = {};
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate && startDate !== "") {
      const start = new Date(startDate as string);
      start.setUTCHours(0, 0, 0, 0);
      filter.date.$gte = start;
    }
    if (endDate && endDate !== "") {
      const end = new Date(endDate as string);
      end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
    if (Object.keys(filter.date).length === 0) delete filter.date;
  }
  
  if (batch && batch !== "") filter.batch = batch;
  if (department && department !== "") filter.department = department;
  if (type && type !== "") filter.type = type;

  // If user is a coordinator with a department, restrict to that department
  if ((req as any).user.role === 'coordinator' && (req as any).user.department) {
    filter.department = (req as any).user.department;
  }

  const sessions = await AttendanceSession.find(filter).sort({ date: 1 });
  const sessionIds = sessions.map(s => s._id);
  
  const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } })
    .populate("studentId")
    .populate("sessionId");

  // Determine display titles
  let displayType = type as string;
  let displayBatch = batch as string || "All";

  if (!displayType && records.length > 0) {
    const types = new Set(records.map(r => (r.sessionId as any).type));
    if (types.size === 1) {
      displayType = Array.from(types)[0];
    } else {
      displayType = "Multiple Sessions";
    }
  } else if (!displayType) {
    displayType = "General";
  }

  if (!batch && records.length > 0) {
    const batches = new Set(records.map(r => (r.sessionId as any).batch));
    if (batches.size === 1) {
      displayBatch = Array.from(batches)[0];
    }
  }

  // Extract unique students for the selected batch/department
  const studentFilter: any = {};
  if (batch) studentFilter.batch = batch;
  if (department) studentFilter.department = department;
  const students = await Student.find(studentFilter).sort({ rollNumber: 1 });

  // Map records for faster lookup
  const recordMap = new Map();
  records.forEach(r => {
    if (r.studentId && r.sessionId) {
      const studentId = (r.studentId as any)._id ? (r.studentId as any)._id.toString() : r.studentId.toString();
      const sessionId = (r.sessionId as any)._id ? (r.sessionId as any)._id.toString() : r.sessionId.toString();
      recordMap.set(`${studentId}_${sessionId}`, r);
    }
  });

  const workbook = new ExcelJS.Workbook();

  // Use local logo
  let logoBuffer: Buffer | null = null;
  try {
    logoBuffer = Buffer.from(LOGO_BASE64, 'base64');
  } catch (err) {
    console.error('Failed to load local logo', err);
  }

  if (sessions.length === 0 || students.length === 0) {
    const worksheet = workbook.addWorksheet("Attendance");
    worksheet.addRow(["No data available"]);
    worksheet.getCell("A1").font = { name: "Times New Roman" };
  } else {
    // Group sessions by date
    const sessionsByDate = new Map<string, any[]>();
    sessions.forEach(s => {
      const date = new Date(s.date);
      const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!sessionsByDate.has(dateStr)) {
        sessionsByDate.set(dateStr, []);
      }
      sessionsByDate.get(dateStr)!.push(s);
    });

    const sessionsWithRecords = new Set();
    recordMap.forEach((record, key) => {
      const [studentId, sessionId] = key.split('_');
      sessionsWithRecords.add(sessionId);
    });

    const uniqueDates = Array.from(sessionsByDate.keys()).filter(dateStr => {
      const sessionsForDate = sessionsByDate.get(dateStr) || [];
      return sessionsForDate.some(session => sessionsWithRecords.has(session._id.toString()));
    });

    // No chunking needed, use all dates and students
    const dateChunk = uniqueDates;
    const studentChunk = students;
    const worksheet = workbook.addWorksheet("Attendance");
    
    const totalCols = 4 + uniqueDates.length;

        // Add Logo
        if (logoBuffer) {
          const imageId = workbook.addImage({
            buffer: logoBuffer,
            extension: 'png',
          });
          
          const logoWidth = Math.min(totalCols, 8);
          const logoStartCol = (totalCols - logoWidth) / 2;
          
          worksheet.addImage(imageId, {
            tl: { col: logoStartCol, row: 0 } as any,
            br: { col: logoStartCol + logoWidth, row: 3 } as any,
            editAs: 'oneCell'
          });
        }

        // Row 1
        const startRow = logoBuffer ? 4 : 1;
        const row1 = worksheet.getRow(startRow);
        row1.values = ["DEPARTMENT OF TRAINING AND PLACEMENT CELL"];
        worksheet.mergeCells(row1.number, 1, row1.number, totalCols);
        row1.getCell(1).font = { name: "Times New Roman", bold: true, size: 14 };
        row1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        // Row 2
        const row2 = worksheet.getRow(startRow + 1);
        row2.values = [`${displayType.toUpperCase()} ATTENDANCE SHEET - BATCH - ${displayBatch.toUpperCase()}`];
        worksheet.mergeCells(row2.number, 1, row2.number, totalCols);
        row2.getCell(1).font = { name: "Times New Roman", bold: true, size: 12 };
        row2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Row 3: Headers
        const headerRowValues = ["S.No", "Register No", "Name", "Dept", ...dateChunk];
        const headerRow = worksheet.getRow(startRow + 2);
        headerRow.values = headerRowValues;
        headerRow.font = { name: "Times New Roman", bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        let presentCounts = new Array(dateChunk.length).fill(0);
        let absentCounts = new Array(dateChunk.length).fill(0);
        let odCounts = new Array(dateChunk.length).fill(0);

        // Student Rows
        studentChunk.forEach((student: any, i: number) => {
          const rowValues: any[] = [
            i + 1,
            student.rollNumber || "N/A",
            student.name || "N/A",
            student.department || "N/A"
          ];

          dateChunk.forEach((dateStr, dateIdx) => {
            const sessionsForDate = sessionsByDate.get(dateStr) || [];
            let statusDisplay = "";
            
            let hasP = false;
            let hasOD = false;
            let hasA = false;

            sessionsForDate.forEach(session => {
              const record = recordMap.get(`${student._id.toString()}_${session._id.toString()}`);
              if (record) {
                if (record.status === "P") hasP = true;
                else if (record.status === "OD") hasOD = true;
                else if (record.status === "A") hasA = true;
              }
            });

            if (hasP) {
              statusDisplay = "P";
              presentCounts[dateIdx]++;
            } else if (hasOD) {
              statusDisplay = "OD";
              odCounts[dateIdx]++;
            } else if (hasA) {
              statusDisplay = "A";
              absentCounts[dateIdx]++;
            }
            
            rowValues.push(statusDisplay);
          });

          worksheet.addRow(rowValues);
        });

        // Footer rows
        const totalStudentsRow = worksheet.addRow(["", "Total Students", "", "", ...new Array(dateChunk.length).fill(studentChunk.length)]);
        const presentCountRow = worksheet.addRow(["", "Present Count", "", "", ...presentCounts]);
        const absentCountRow = worksheet.addRow(["", "Absent Count", "", "", ...absentCounts]);
        const odCountRow = worksheet.addRow(["", "OD Count", "", "", ...odCounts]);

        // Empty row
        worksheet.addRow([]);

        // Signatures row
        const sigRowValues = ["", "Principal", "", ""];
        for (let i = 0; i < dateChunk.length - 1; i++) sigRowValues.push("");
        sigRowValues.push("Co-ordinator - Placement");
        worksheet.addRow(sigRowValues);

        // Styling
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            if (!cell.font) cell.font = { name: "Times New Roman" };
            if (!cell.alignment) cell.alignment = { vertical: 'middle', horizontal: 'center' };
          });
        });

        // Column widths
        worksheet.columns = [
          { width: 6 },  // S.No
          { width: 15 }, // Reg No
          { width: 25 }, // Name
          { width: 8 },  // Dept
          ...Array(dateChunk.length).fill({ width: 8 }) // Unique dates
        ];
  }

  res.setHeader("Content-Disposition", `attachment; filename=attendance_report_${new Date().getTime()}.xlsx`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  
  await workbook.xlsx.write(res);
  res.end();
});

// Stats Route
app.get("/api/stats", authenticate, async (req, res) => {
  try {
    const filter: any = {};
    // If user is a coordinator with a department, restrict to that department
    if ((req as any).user.role === 'coordinator' && (req as any).user.department) {
      filter.department = (req as any).user.department;
    }

    const totalStudents = await Student.countDocuments(filter);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessionFilter: any = { date: { $gte: today, $lt: tomorrow } };
    if (filter.department) {
      sessionFilter.department = filter.department;
    }

    const todaySessions = await AttendanceSession.find(sessionFilter);
    const sessionIds = todaySessions.map(s => s._id);

    let attendancePercentage = 0;
    let presentCount = 0;
    let absentCount = 0;
    let odCount = 0;

    if (sessionIds.length > 0) {
      const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } });
      presentCount = records.filter(r => r.status === "P").length;
      absentCount = records.filter(r => r.status === "A").length;
      odCount = records.filter(r => r.status === "OD").length;
      attendancePercentage = records.length > 0 ? Math.round(((presentCount + odCount) / records.length) * 100) : 0;
    }

    res.json({ totalStudents, attendancePercentage, presentCount, absentCount, odCount });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/analytics/daily", authenticate, async (req, res) => {
  try {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      last7Days.push(d);
    }

    const analytics = await Promise.all(last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      const sessionFilter: any = { date: { $gte: date, $lt: nextDay } };
      if ((req as any).user.role === 'coordinator' && (req as any).user.department) {
        sessionFilter.department = (req as any).user.department;
      }

      const sessions = await AttendanceSession.find(sessionFilter);
      const sessionIds = sessions.map(s => s._id);

      let percentage = 0;
      if (sessionIds.length > 0) {
        const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } });
        const present = records.filter(r => r.status === "P" || r.status === "OD").length;
        percentage = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
      }

      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        percentage
      };
    }));

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Background tasks after server starts
    if (MONGODB_URI) {
      mongoose.connection.asPromise().then(async () => {
        try {
          const adminExists = await User.findOne({ username: "Admin" });
          if (!adminExists) {
            const hashedPassword = await bcrypt.hash("Admin123", 10);
            const admin = new User({
              username: "Admin",
              password: hashedPassword,
              role: "admin",
              name: "System Administrator"
            });
            await admin.save();
            console.log("✅ Default admin user created: Admin / Admin123");
          } else {
            console.log("ℹ️ Admin user already exists.");
          }
        } catch (err) {
          console.error("❌ Error during seeding:", err);
        }
      }).catch(err => {
        console.error("❌ MongoDB connection failed for seeding:", err);
      });
    }
  });
}

startServer();
