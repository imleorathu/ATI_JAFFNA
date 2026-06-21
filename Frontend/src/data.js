export const stats = [
  { label: "Courses", value: "12+" },
  { label: "Departments", value: "7" },
  { label: "Students", value: "1,200+" },
  { label: "Lecturers", value: "80+" },
  { label: "Events", value: "35" }
];

export const departments = [
  {
    title: "Higher National Diploma in Accountancy - (HNDA)",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
    description: "Financial reporting, taxation, auditing, and professional accounting practice."
  },
  {
    title: "Higher National Diploma in English",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
    description: "Communication, academic writing, literature, and professional fluency."
  },
  {
    title: "Higher National Diploma in Engineering - Civil",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80",
    description: "Construction technology, surveying, materials, and infrastructure foundations."
  },
  {
    title: "Higher National Diploma in Engineering - Electrical",
    image: "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=900&q=80",
    description: "Circuits, power systems, machines, and applied electrical technology."
  },
  {
    title: "Higher National Diploma in Management - (HNDM)",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    description: "Leadership, operations, organizational practice, and administration."
  },
  {
    title: "Higher National Diploma in Information Technology - (HNDIT)",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80",
    description: "Software, networking, databases, and practical digital problem solving."
  },
  {
    title: "Higher National Diploma in Quantity Surveying",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
    description: "Cost estimation, contracts, measurement, and construction economics."
  }
];

export const courses = [
  { title: "HND in IT", duration: "2.5 Years", requirements: "A/L with ICT or equivalent", fee: "Contact office" },
  { title: "HND in Management", duration: "2 Years", requirements: "A/L in any stream", fee: "Contact office" },
  { title: "HND in English", duration: "2 Years", requirements: "A/L and English proficiency", fee: "Contact office" },
  { title: "HND in Accountancy", duration: "2.5 Years", requirements: "A/L commerce preferred", fee: "Contact office" },
  { title: "HND in Engineering Technology", duration: "3 Years", requirements: "A/L technology or maths stream", fee: "Contact office" },
  { title: "Diploma in Business IT", duration: "1 Year", requirements: "O/L with basic computer literacy", fee: "Contact office" }
];

export const events = [
  {
    title: "Annual Research Forum",
    date: "2026-06-18",
    image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=80",
    description: "Students and lecturers present practical research, prototypes, and community-focused solutions."
  },
  {
    title: "Campus Open Day",
    date: "2026-07-04",
    image: "https://images.unsplash.com/photo-1544531585-9847b68c8c86?auto=format&fit=crop&w=900&q=80",
    description: "Meet departments, explore course pathways, and get help from the campus office."
  },
  {
    title: "Inter-Department Sports Meet",
    date: "2026-08-12",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
    description: "A campus-wide event celebrating teamwork, fitness, and student life."
  }
];

export const dashboardItems = [
  "Profile",
  "My Courses",
  "Timetable",
  "Notices",
  "Grade Results",
  "Assignment Upload",
  "Payment Status"
];

export const adminItems = [
  "Students",
  "Courses",
  "Departments",
  "Applications",
  "Notices",
  "Events",
  "Gallery",
  "Contact Messages"
];

export const studentProfile = {
  id: "STU2024001",
  name: "Kumaralingam Sutharsan",
  email: "sutharsan.k@ati-jaffna.lk",
  phone: "+94 77 123 4567",
  address: "No. 45, KKS Road, Thirunagar, Jaffna",
  course: "HND in IT",
  year: 2,
  semester: 3,
  avatar: "https://i.pravatar.cc/150?img=11",
  enrollmentDate: "2024-09-02"
};

export const subjects = [
  { code: "IT301", name: "Advanced Web Development", credits: 4, lecturer: "Mr. S. Sivakumar", hoursPerWeek: 5 },
  { code: "IT302", name: "Database Management Systems", credits: 4, lecturer: "Mrs. K. Janani", hoursPerWeek: 4 },
  { code: "IT303", name: "Software Engineering", credits: 3, lecturer: "Mr. P. Raveendran", hoursPerWeek: 4 },
  { code: "IT304", name: "Computer Networks", credits: 3, lecturer: "Mr. N. Kajendran", hoursPerWeek: 4 },
  { code: "IT305", name: "Object-Oriented Programming", credits: 4, lecturer: "Ms. T. Nirosha", hoursPerWeek: 5 },
  { code: "MG302", name: "Project Management", credits: 3, lecturer: "Mr. V. Thuraisingham", hoursPerWeek: 3 }
];

export const attendanceData = [
  { subject: "Advanced Web Development", percentage: 85, totalClasses: 40, attended: 34, trend: [80, 82, 88, 85, 90, 85] },
  { subject: "Database Management Systems", percentage: 78, totalClasses: 36, attended: 28, trend: [75, 80, 78, 75, 82, 78] },
  { subject: "Software Engineering", percentage: 92, totalClasses: 32, attended: 30, trend: [90, 92, 95, 92, 90, 92] },
  { subject: "Computer Networks", percentage: 70, totalClasses: 34, attended: 24, trend: [65, 68, 72, 70, 74, 70] },
  { subject: "Object-Oriented Programming", percentage: 88, totalClasses: 38, attended: 33, trend: [85, 86, 90, 88, 91, 88] },
  { subject: "Project Management", percentage: 95, totalClasses: 28, attended: 27, trend: [94, 96, 95, 95, 94, 95] }
];

export const gradeData = [
  { subject: "Advanced Web Development", grade: "A", credits: 4, score: 85, semester: 3 },
  { subject: "Database Management Systems", grade: "B+", credits: 4, score: 72, semester: 3 },
  { subject: "Software Engineering", grade: "A-", credits: 3, score: 80, semester: 3 },
  { subject: "Computer Networks", grade: "B", credits: 3, score: 68, semester: 3 },
  { subject: "Object-Oriented Programming", grade: "A", credits: 4, score: 88, semester: 3 },
  { subject: "Project Management", grade: "A+", credits: 3, score: 92, semester: 3 },
  { subject: "Web Technologies", grade: "A", credits: 4, score: 86, semester: 2 },
  { subject: "Mathematics for Computing", grade: "B+", credits: 3, score: 75, semester: 2 },
  { subject: "Programming Fundamentals", grade: "A", credits: 4, score: 90, semester: 1 },
  { subject: "Information Systems", grade: "B+", credits: 3, score: 78, semester: 1 }
];

export const assignments = [
  { id: 1, title: "E-Commerce Website Development", subject: "Advanced Web Development", dueDate: "2026-04-20", status: "submitted", marks: 42, totalMarks: 50, description: "Build a fully functional e-commerce site using React and Node.js" },
  { id: 2, title: "Database Normalization Report", subject: "Database Management Systems", dueDate: "2026-04-25", status: "pending", marks: 0, totalMarks: 40, description: "Analyse and normalise a given relational database to 3NF" },
  { id: 3, title: "SRS Document", subject: "Software Engineering", dueDate: "2026-04-15", status: "graded", marks: 36, totalMarks: 40, description: "Prepare a Software Requirements Specification for a library system" },
  { id: 4, title: "Network Topology Design", subject: "Computer Networks", dueDate: "2026-05-02", status: "pending", marks: 0, totalMarks: 50, description: "Design a campus network topology with Cisco Packet Tracer" },
  { id: 5, title: "Java ATM Simulation", subject: "Object-Oriented Programming", dueDate: "2026-04-10", status: "graded", marks: 45, totalMarks: 50, description: "Implement an ATM simulation using Java OOP concepts" },
  { id: 6, title: "Project Charter", subject: "Project Management", dueDate: "2026-04-30", status: "draft", marks: 0, totalMarks: 30, description: "Create a project charter for a software development project" }
];

export const notifications = [
  { id: 1, title: "Assignment Reminder", message: "Database Normalization Report is due on April 25th.", type: "warning", time: "2 hours ago", read: false },
  { id: 2, title: "Timetable Updated", message: "Semester 3 class timetable has been updated.", type: "info", time: "1 day ago", read: false },
  { id: 3, title: "Fee Payment", message: "Your semester fee payment has been confirmed. Thank you!", type: "success", time: "3 days ago", read: true },
  { id: 4, title: "Class Cancelled", message: "Computer Networks class on Friday is cancelled due to staff meeting.", type: "error", time: "4 days ago", read: true },
  { id: 5, title: "Library Notice", message: "Books borrowed on March 1st are due for return.", type: "info", time: "1 week ago", read: true },
  { id: 6, title: "Result Published", message: "Semester 2 results are now available on the portal.", type: "success", time: "2 weeks ago", read: true },
  { id: 7, title: "Workshop Registration", message: "Register for the AI workshop on May 10th by April 30th.", type: "warning", time: "2 weeks ago", read: true }
];

export const timetable = [
  { day: "Monday", periods: [
    { time: "08:00 - 09:00", subject: "Object-Oriented Programming", lecturer: "Ms. T. Nirosha", room: "Lab 1" },
    { time: "09:00 - 10:00", subject: "Advanced Web Development", lecturer: "Mr. S. Sivakumar", room: "Lab 3" },
    { time: "10:00 - 11:00", subject: "Advanced Web Development", lecturer: "Mr. S. Sivakumar", room: "Lab 3" },
    { time: "11:00 - 12:00", subject: "Database Management Systems", lecturer: "Mrs. K. Janani", room: "Hall A" },
    { time: "12:00 - 01:00", subject: "Lunch Break", lecturer: "", room: "" },
    { time: "01:00 - 02:00", subject: "Software Engineering", lecturer: "Mr. P. Raveendran", room: "Hall B" }
  ]},
  { day: "Tuesday", periods: [
    { time: "08:00 - 09:00", subject: "Computer Networks", lecturer: "Mr. N. Kajendran", room: "Lab 2" },
    { time: "09:00 - 10:00", subject: "Object-Oriented Programming", lecturer: "Ms. T. Nirosha", room: "Lab 1" },
    { time: "10:00 - 11:00", subject: "Project Management", lecturer: "Mr. V. Thuraisingham", room: "Hall A" },
    { time: "11:00 - 12:00", subject: "Project Management", lecturer: "Mr. V. Thuraisingham", room: "Hall A" },
    { time: "12:00 - 01:00", subject: "Lunch Break", lecturer: "", room: "" },
    { time: "01:00 - 02:00", subject: "Database Management Systems", lecturer: "Mrs. K. Janani", room: "Hall A" }
  ]},
  { day: "Wednesday", periods: [
    { time: "08:00 - 10:00", subject: "Advanced Web Development", lecturer: "Mr. S. Sivakumar", room: "Lab 3" },
    { time: "10:00 - 11:00", subject: "Computer Networks", lecturer: "Mr. N. Kajendran", room: "Lab 2" },
    { time: "11:00 - 12:00", subject: "Software Engineering", lecturer: "Mr. P. Raveendran", room: "Hall B" },
    { time: "12:00 - 01:00", subject: "Lunch Break", lecturer: "", room: "" },
    { time: "01:00 - 02:00", subject: "Object-Oriented Programming", lecturer: "Ms. T. Nirosha", room: "Lab 1" }
  ]},
  { day: "Thursday", periods: [
    { time: "08:00 - 09:00", subject: "Database Management Systems", lecturer: "Mrs. K. Janani", room: "Hall A" },
    { time: "09:00 - 10:00", subject: "Software Engineering", lecturer: "Mr. P. Raveendran", room: "Hall B" },
    { time: "10:00 - 11:00", subject: "Project Management", lecturer: "Mr. V. Thuraisingham", room: "Hall A" },
    { time: "11:00 - 12:00", subject: "Computer Networks", lecturer: "Mr. N. Kajendran", room: "Lab 2" },
    { time: "12:00 - 01:00", subject: "Lunch Break", lecturer: "", room: "" },
    { time: "01:00 - 03:00", subject: "Advanced Web Development", lecturer: "Mr. S. Sivakumar", room: "Lab 3" }
  ]},
  { day: "Friday", periods: [
    { time: "08:00 - 10:00", subject: "Object-Oriented Programming", lecturer: "Ms. T. Nirosha", room: "Lab 1" },
    { time: "10:00 - 11:00", subject: "Database Management Systems", lecturer: "Mrs. K. Janani", room: "Hall A" },
    { time: "11:00 - 12:00", subject: "Computer Networks", lecturer: "Mr. N. Kajendran", room: "Lab 2" },
    { time: "12:00 - 01:00", subject: "Lunch Break", lecturer: "", room: "" },
    { time: "01:00 - 02:00", subject: "Project Management", lecturer: "Mr. V. Thuraisingham", room: "Hall A" }
  ]}
];

export const feeData = {
  totalFee: 125000,
  paid: 87500,
  due: 37500,
  paymentHistory: [
    { id: 1, date: "2026-01-15", amount: 45000, type: "Semester Fee", status: "paid", method: "Bank Transfer" },
    { id: 2, date: "2026-03-10", amount: 42500, type: "Semester Fee", status: "paid", method: "Online Payment" },
    { id: 3, date: "2026-05-01", amount: 37500, type: "Semester Fee", status: "pending", method: "" }
  ],
  scholarships: [
    { name: "District Merit Scholarship", amount: 25000, status: "active", provider: "Ministry of Education" },
    { name: "ATI Academic Excellence Award", amount: 15000, status: "active", provider: "ATI Jaffna" }
  ]
};

export const courseProgress = [
  { subject: "Advanced Web Development", progress: 75, completedTopics: 9, totalTopics: 12 },
  { subject: "Database Management Systems", progress: 60, completedTopics: 6, totalTopics: 10 },
  { subject: "Software Engineering", progress: 90, completedTopics: 9, totalTopics: 10 },
  { subject: "Computer Networks", progress: 45, completedTopics: 5, totalTopics: 11 },
  { subject: "Object-Oriented Programming", progress: 80, completedTopics: 8, totalTopics: 10 },
  { subject: "Project Management", progress: 55, completedTopics: 5, totalTopics: 9 }
];

export const transportData = {
  route: "Jaffna Town - ATI Campus",
  busNumber: "NP-1234",
  stops: ["Jaffna Clock Tower", "Nallur", "Kokuvil", "Ariyalai", "Thirunagar", "ATI Jaffna"],
  timings: {
    morning: "07:00 AM",
    evening: "04:30 PM"
  },
  fee: 2500
};

export const chatMessages = [
  { id: 1, sender: "Mr. S. Sivakumar", message: "Please submit your web development projects by Friday.", time: "09:15 AM", type: "lecturer" },
  { id: 2, sender: "Mrs. K. Janani", message: "The database assignment has been uploaded. Check the portal.", time: "10:30 AM", type: "lecturer" },
  { id: 3, sender: "Kumaralingam Sutharsan", message: "Will the DBMS class be held tomorrow?", time: "11:00 AM", type: "student" },
  { id: 4, sender: "Mrs. K. Janani", message: "Yes, class will be held as usual.", time: "11:02 AM", type: "lecturer" },
  { id: 5, sender: "Mr. P. Raveendran", message: "Reminder: SRS document submission is next week.", time: "01:15 PM", type: "lecturer" },
  { id: 6, sender: "Niroshan K.", message: "Anyone formed a group for the SE project?", time: "02:00 PM", type: "student" },
  { id: 7, sender: "Yalini S.", message: "Yes, we need one more member. Interested?", time: "02:05 PM", type: "student" },
  { id: 8, sender: "System", message: "Semester 3 class timetable has been updated.", time: "03:00 PM", type: "system" }
];

export const lmsCourses = [
  {
    id: 1, title: "Advanced Web Development", description: "Modern web development with React, Node.js, and responsive design principles.", instructor: "Mr. S. Sivakumar", progress: 75,
    modules: [
      { title: "React Fundamentals", lessons: ["JSX and Components", "State and Props", "Hooks Overview"], quizzes: ["React Basics Quiz"], assignments: ["Build a Todo App"] },
      { title: "Node.js & Express", lessons: ["RESTful APIs", "Middleware", "Database Integration"], quizzes: ["Node.js Quiz"], assignments: ["Create a REST API"] },
      { title: "Full Stack Project", lessons: ["Authentication", "Deployment", "Testing"], quizzes: [], assignments: ["E-Commerce Website"] }
    ]
  },
  {
    id: 2, title: "Database Management Systems", description: "Relational databases, SQL, and NoSQL systems with practical implementation.", instructor: "Mrs. K. Janani", progress: 60,
    modules: [
      { title: "Relational Model", lessons: ["Tables and Schemas", "Keys and Constraints", "ER Diagrams"], quizzes: ["ERD Quiz"], assignments: ["Design a Library Database"] },
      { title: "SQL Deep Dive", lessons: ["Advanced Queries", "Joins and Subqueries", "Views and Indexes"], quizzes: ["SQL Mastery Quiz"], assignments: ["Database Normalization Report"] }
    ]
  },
  {
    id: 3, title: "Software Engineering", description: "Software development lifecycle, agile methodologies, and requirements engineering.", instructor: "Mr. P. Raveendran", progress: 90,
    modules: [
      { title: "SDLC Models", lessons: ["Waterfall vs Agile", "Scrum Framework", "User Stories"], quizzes: ["SDLC Quiz"], assignments: ["Project Charter"] },
      { title: "Requirements Engineering", lessons: ["Functional Requirements", "Non-Functional Requirements", "SRS Documentation"], quizzes: [], assignments: ["SRS Document"] }
    ]
  }
];

