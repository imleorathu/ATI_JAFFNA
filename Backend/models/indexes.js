/**
 * Database Indexes for ATI Jaffna
 * 
 * Run: `node models/indexes.js`
 * 
 * Proper indexes are critical for:
 * - Query performance (scalability)
 * - Reducing CPU/memory pressure
 * - Avoiding collection scans on large datasets
 * - Supporting role-based data scoping
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function ensureIndexes() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_Jaffna";
  
  try {
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB: ${mongoose.connection.name}`);

    // =========================================================================
    // User indexes
    // =========================================================================
    const userCollection = mongoose.connection.collection("users");
    
    // Support login by email (unique already exists from schema)
    await userCollection.createIndex({ email: 1 }, { unique: true });
    
    // Support filtering by role and account status (admin panel queries)
    await userCollection.createIndex({ role: 1, accountStatus: 1 });
    
    // Support checking existing admin
    await userCollection.createIndex({ role: 1 });
    
    // Support student profile queries
    await userCollection.createIndex({ "studentProfile.studentId": 1 }, { 
      sparse: true, 
      partialFilterExpression: { "studentProfile.studentId": { $exists: true } } 
    });
    
    // Support department-based queries
    await userCollection.createIndex({ "studentProfile.department": 1 }, { 
      sparse: true 
    });

    // =========================================================================
    // Student indexes
    // =========================================================================
    const studentCollection = mongoose.connection.collection("students");
    
    // Support lookup by email or studentId
    await studentCollection.createIndex({ email: 1 }, { unique: true });
    await studentCollection.createIndex({ studentId: 1 }, { 
      sparse: true, 
      unique: true,
      partialFilterExpression: { studentId: { $exists: true, $ne: "" } }
    });
    
    // Support department-based queries (faculty scoping)
    await studentCollection.createIndex({ department: 1 });
    
    // Support combined queries for attendance
    await studentCollection.createIndex({ department: 1, academicStage: 1 });

    // =========================================================================
    // Faculty indexes
    // =========================================================================
    const facultyCollection = mongoose.connection.collection("faculties");
    
    await facultyCollection.createIndex({ email: 1 }, { unique: true });
    
    // Support department-based scoping
    await facultyCollection.createIndex({ department: 1, staffType: 1 });

    // =========================================================================
    // TimetableEntry indexes
    // =========================================================================
    const timetableCollection = mongoose.connection.collection("timetableentries");
    
    // Support the common query pattern: department + day + academicStage
    await timetableCollection.createIndex({ department: 1, day: 1, academicStage: 1 });
    
    // Support time-based sorting
    await timetableCollection.createIndex({ department: 1, day: 1, time: 1 });

    // =========================================================================
    // Course indexes
    // =========================================================================
    const courseCollection = mongoose.connection.collection("courses");
    
    await courseCollection.createIndex({ department: 1, createdAt: -1 });

    // =========================================================================
    // AttendanceRecord indexes
    // =========================================================================
    const attendanceCollection = mongoose.connection.collection("attendancerecords");
    
    // Prevent duplicate attendance marks (unique compound index)
    await attendanceCollection.createIndex(
      { student: 1, timetableEntry: 1, date: 1 },
      { unique: true }
    );
    
    // Support querying by user, department, date
    await attendanceCollection.createIndex({ student: 1, markedAt: -1 });
    await attendanceCollection.createIndex({ department: 1, date: 1, markedAt: -1 });

    // =========================================================================
    // Assignment indexes
    // =========================================================================
    const assignmentCollection = mongoose.connection.collection("assignments");
    
    await assignmentCollection.createIndex({ department: 1, status: 1, dueDate: 1 });

    // =========================================================================
    // KnowledgeChunk indexes (for RAG search)
    // =========================================================================
    const chunkCollection = mongoose.connection.collection("knowledgechunks");
    
    await chunkCollection.createIndex({ document: 1, chunkIndex: 1 });
    await chunkCollection.createIndex({ department: 1, tokens: 1 });
    await chunkCollection.createIndex({ department: 1, visibility: 1 });

    // =========================================================================
    // KnowledgeDocument indexes
    // =========================================================================
    const docCollection = mongoose.connection.collection("knowledgedocuments");
    
    await docCollection.createIndex({ department: 1, visibility: 1, createdAt: -1 });
    await docCollection.createIndex({ uploadedBy: 1 });

    // =========================================================================
    // Contact indexes
    // =========================================================================
    const contactCollection = mongoose.connection.collection("contacts");
    
    await contactCollection.createIndex({ department: 1, type: 1, createdAt: -1 });

    // =========================================================================
    // PageContent indexes
    // =========================================================================
    const pageContentCollection = mongoose.connection.collection("pagecontents");
    
    await pageContentCollection.createIndex({ slug: 1 }, { unique: true });

    console.log("All indexes created successfully");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error creating indexes:", error);
    process.exit(1);
  }
}

ensureIndexes();