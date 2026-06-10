const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUTPUT = path.join(ROOT, 'ATI-JAFFNA-LINE-BY-LINE-EXPLANATION.pdf');

// Register Roboto font for full Unicode support (from pdfmake package)
const FONT_DIR = path.join(ROOT, 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto');
const FONT_REGULAR = path.join(FONT_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Roboto-Medium.ttf');
const FONT_ITALIC = path.join(FONT_DIR, 'Roboto-Italic.ttf');
const FONT_BOLD_ITALIC = path.join(FONT_DIR, 'Roboto-MediumItalic.ttf');
// Use Courier as fallback standard PDF font for code (ASCII-safe, monospace)
const FONT_MONO = 'Courier';
const FONT_MONO_BOLD = 'Courier-Bold';

// ======================== FILES TO INCLUDE ========================
const FILE_GROUPS = [
  {
    title: 'ROOT CONFIGURATION FILES',
    files: [
      'package.json',
      '.env.example',
      '.gitignore',
      'README.md',
    ],
  },
  {
    title: 'BACKEND - Entry Point',
    files: ['Backend/server.js'],
  },
  {
    title: 'BACKEND - Library Modules',
    files: [
      'Backend/lib/config.js',
      'Backend/lib/mongo.js',
      'Backend/lib/logger.js',
      'Backend/lib/gracefulShutdown.js',
    ],
  },
  {
    title: 'BACKEND - Middleware',
    files: [
      'Backend/middleware/asyncHandler.js',
      'Backend/middleware/auth.js',
      'Backend/middleware/circuitBreaker.js',
      'Backend/middleware/errorHandler.js',
      'Backend/middleware/pagination.js',
      'Backend/middleware/rateLimiter.js',
      'Backend/middleware/requestId.js',
      'Backend/middleware/requestLogger.js',
      'Backend/middleware/security.js',
    ],
  },
  {
    title: 'BACKEND - Models',
    files: [
      'Backend/models/indexes.js',
      'Backend/models/Admin.js',
      'Backend/models/Application.js',
      'Backend/models/Assignment.js',
      'Backend/models/AttendanceRecord.js',
      'Backend/models/Blog.js',
      'Backend/models/Contact.js',
      'Backend/models/Course.js',
      'Backend/models/Department.js',
      'Backend/models/Event.js',
      'Backend/models/Faculty.js',
      'Backend/models/GradeRecord.js',
      'Backend/models/KnowledgeChunk.js',
      'Backend/models/KnowledgeDocument.js',
      'Backend/models/Notice.js',
      'Backend/models/PageContent.js',
      'Backend/models/Student.js',
      'Backend/models/SystemSetting.js',
      'Backend/models/TimetableEntry.js',
      'Backend/models/User.js',
    ],
  },
  {
    title: 'BACKEND - Controllers',
    files: [
      'Backend/controllers/aiController.js',
      'Backend/controllers/assignmentController.js',
      'Backend/controllers/attendanceController.js',
      'Backend/controllers/authController.js',
      'Backend/controllers/contactController.js',
      'Backend/controllers/crudController.js',
      'Backend/controllers/facultyStudentController.js',
      'Backend/controllers/gradeController.js',
      'Backend/controllers/pageContentController.js',
      'Backend/controllers/studentImportController.js',
      'Backend/controllers/userController.js',
    ],
  },
  {
    title: 'BACKEND - Routes',
    files: [
      'Backend/routes/index.js',
      'Backend/routes/aiRoutes.js',
      'Backend/routes/assignmentRoutes.js',
      'Backend/routes/attendanceRoutes.js',
      'Backend/routes/authRoutes.js',
      'Backend/routes/contactRoutes.js',
      'Backend/routes/gradeRoutes.js',
      'Backend/routes/healthRoutes.js',
      'Backend/routes/pageContentRoutes.js',
      'Backend/routes/resourceRoutes.js',
      'Backend/routes/settingsRoutes.js',
      'Backend/routes/studentImportRoutes.js',
      'Backend/routes/userRoutes.js',
    ],
  },
  {
    title: 'BACKEND - Package Configuration',
    files: ['Backend/package.json'],
  },
  {
    title: 'FRONTEND - Entry Points & Root Config',
    files: [
      'Frontend/package.json',
      'Frontend/vite.config.js',
      'Frontend/tailwind.config.js',
      'Frontend/postcss.config.js',
    ],
  },
  {
    title: 'FRONTEND - Core Source',
    files: [
      'Frontend/src/main.jsx',
      'Frontend/src/App.jsx',
      'Frontend/src/data.js',
      'Frontend/src/styles.css',
    ],
  },
  {
    title: 'FRONTEND - Context & Hooks',
    files: [
      'Frontend/src/contexts/AuthContext.jsx',
      'Frontend/src/hooks/useCmsPage.js',
      'Frontend/src/lib/api.js',
    ],
  },
  {
    title: 'FRONTEND - Layouts',
    files: [
      'Frontend/src/layouts/MainLayout.jsx',
      'Frontend/src/layouts/DashboardLayout.jsx',
    ],
  },
  {
    title: 'FRONTEND - Components',
    files: [
      'Frontend/src/components/Button.jsx',
      'Frontend/src/components/GlassCard.jsx',
      'Frontend/src/components/SectionHeader.jsx',
      'Frontend/src/components/AIAssistant.jsx',
      'Frontend/src/components/CmsSections.jsx',
      'Frontend/src/components/material/ClassroomComponents.jsx',
    ],
  },
  {
    title: 'FRONTEND - Public Pages',
    files: [
      'Frontend/src/pages/Home.jsx',
      'Frontend/src/pages/About.jsx',
      'Frontend/src/pages/Courses.jsx',
      'Frontend/src/pages/Faculties.jsx',
      'Frontend/src/pages/News.jsx',
      'Frontend/src/pages/BlogDetail.jsx',
      'Frontend/src/pages/Contact.jsx',
      'Frontend/src/pages/Login.jsx',
      'Frontend/src/pages/Register.jsx',
      'Frontend/src/pages/ChangePassword.jsx',
      'Frontend/src/pages/Dashboard.jsx',
    ],
  },
  {
    title: 'FRONTEND - Dashboard Pages',
    files: [
      'Frontend/src/pages/dashboard/AdminDashboard.jsx',
      'Frontend/src/pages/dashboard/StudentDashboard.jsx',
      'Frontend/src/pages/dashboard/FacultyManagement.jsx',
      'Frontend/src/pages/dashboard/StudentManagement.jsx',
      'Frontend/src/pages/dashboard/CourseManagement.jsx',
      'Frontend/src/pages/dashboard/UserManagement.jsx',
      'Frontend/src/pages/dashboard/GradesPage.jsx',
      'Frontend/src/pages/dashboard/AttendancePage.jsx',
      'Frontend/src/pages/dashboard/AssignmentsPage.jsx',
      'Frontend/src/pages/dashboard/ExamsPage.jsx',
      'Frontend/src/pages/dashboard/FeesPage.jsx',
      'Frontend/src/pages/dashboard/TransportPage.jsx',
      'Frontend/src/pages/dashboard/TimetablePage.jsx',
      'Frontend/src/pages/dashboard/SettingsPage.jsx',
      'Frontend/src/pages/dashboard/AnalyticsPage.jsx',
      'Frontend/src/pages/dashboard/CmsManagement.jsx',
    ],
  },
  {
    title: 'FRONTEND - Faculty, LMS & Communication',
    files: [
      'Frontend/src/pages/faculty/FacultyDashboard.jsx',
      'Frontend/src/pages/lms/LMSDashboard.jsx',
      'Frontend/src/pages/parent/ParentPortal.jsx',
      'Frontend/src/pages/communication/MessagesPage.jsx',
    ],
  },
];

// ======================== LINE EXPLANATION ENGINE ========================
function makeExplanation(line, prevLine, ext) {
  const t = line.trim();
  if (!t) {
    if (!prevLine || !prevLine.trim()) return null;
    return 'Blank line separating logical sections of code.';
  }

  if (t.startsWith('//')) return 'Comment: ' + t.replace(/^\/\/\s*/, '');
  if (t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/')) {
    const c = t.replace(/^\/\*+\s*|^\*\s*|^\*\//, '').trim();
    return c ? 'Block comment: ' + c : 'Block comment delimiter.';
  }

  if (/^import\s/.test(t)) {
    const m = t.match(/import\s+(?:(\w+)\s+from\s+)?['"](.+?)['"]/);
    if (m) return 'Imports' + (m[1] ? ' [' + m[1] + '] from' : '') + ' module [' + m[2] + '].';
    const m2 = t.match(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"](.+?)['"]/);
    if (m2) return 'Imports { ' + m2[1] + ' } from [' + m2[2] + '].';
    return 'Import statement.';
  }
  if (/^const\s+.+=\s*require\(/.test(t)) {
    const m = t.match(/const\s+(\w+)\s*=\s*require\(['"](.+?)['"]\)/);
    if (m) return 'Requires module [' + m[2] + '] and assigns to [' + m[1] + '].';
    return 'Require statement: loads a Node.js module.';
  }

  if (/^export\s+default/.test(t)) {
    const m = t.match(/export\s+default\s+(function|const|class|let|var)?\s*(\w+)?/);
    return 'Default export' + (m[2] ? ' of [' + m[2] + ']' : '') + (m[1] ? ' (' + m[1] + ')' : '') + '.';
  }
  if (/^export\s+/.test(t)) {
    const m = t.match(/export\s+(const|let|var|function|class)\s+(\w+)/);
    if (m) return 'Named export: exports [' + m[2] + '] (' + m[1] + ').';
    return 'Named export statement.';
  }
  if (/^module\.exports/.test(t)) return 'CommonJS export.';

  if (/^(async\s+)?function\s+\w+\s*\(/.test(t)) {
    const m = t.match(/(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
    if (m) return 'Defines ' + (m[1] ? 'async ' : '') + 'function [' + m[2] + '] with params (' + (m[3] || 'none') + ').';
  }
  if (/^(async\s+)?function\s*\(/.test(t)) {
    const m = t.match(/(async\s+)?function\s*\(([^)]*)\)/);
    if (m) return 'Defines ' + (m[1] ? 'async ' : '') + 'anonymous function with params (' + (m[2] || 'none') + ').';
  }
  if (/^(const|let|var)\s+\w+\s*=\s*(\([^)]*\)|[^\s]+)\s*=>/.test(t)) {
    const m = t.match(/^(const|let|var)\s+(\w+)\s*=\s*(\([^)]*\)|[^\s]+)\s*=>/);
    if (m) return 'Arrow function [' + m[2] + ']' + (m[3] !== '()' ? ' with param ' + m[3] : '') + '.';
  }

  if (/^class\s+\w+/.test(t)) {
    const m = t.match(/class\s+(\w+)(?:\s+extends\s+(\w+))?/);
    if (m) return 'Class [' + m[1] + ']' + (m[2] ? ' extends [' + m[2] + ']' : '') + '.';
  }

  if (/^(const|let|var)\s+/.test(t)) {
    const m = t.match(/^(const|let|var)\s+(\w+)/);
    if (m) {
      let extra = '';
      if (t.includes('= require')) extra = ' (CommonJS module import)';
      else if (t.includes('=>')) extra = ' (arrow function)';
      else if (/=\s*['"`]/.test(t)) extra = ' (string value)';
      else if (t.includes('= [')) extra = ' (array literal)';
      else if (t.includes('= {') && !t.includes('=>')) extra = ' (object literal)';
      else if (t.includes('= true') || t.includes('= false')) extra = ' (boolean value)';
      else if (t.includes('= ')) extra = ' (assigned value)';
      return 'Declares [' + m[1] + '] with [' + m[2] + ']' + extra + '.';
    }
    return 'Variable declaration.';
  }

  if (/\w+:\s*\{\s*type:\s*(String|Number|Date|Boolean|ObjectId|Mixed|Buffer|Decimal128)/.test(t)) {
    const m = t.match(/(\w+):\s*\{\s*type:\s*(String|Number|Date|Boolean|ObjectId|Mixed|Buffer|Decimal128)/);
    if (m) return 'Schema field [' + m[1] + '] of type [' + m[2] + '].';
  }

  if (/\.(get|post|put|patch|delete|use)\s*\(/.test(t) && !/^const/.test(t)) {
    const m = t.match(/\.(get|post|put|patch|delete|use)\s*\(\s*['"]([^'"]+)['"]\s*,/);
    if (m) return 'Express route: ' + m[1].toUpperCase() + ' [' + m[2] + '].';
    if (/\.use\s*\(/.test(t)) return 'Applies middleware via app.use().';
    return 'Express route handler.';
  }
  if (/router\.(get|post|put|patch|delete)\s*\(/.test(t)) {
    const m = t.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/);
    if (m) return 'Router definition: ' + m[1].toUpperCase() + ' [' + m[2] + '].';
  }

  if (/^try\s*\{/.test(t)) return 'Begins a try block for error handling.';
  if (/^catch\s*\(/.test(t)) return 'Catch block - handles errors from the preceding try block.';
  if (/^finally\s*\{/.test(t)) return 'Finally block - executes regardless of error.';

  if (/^if\s*\(/.test(t)) {
    const c = t.replace(/^if\s*\((.*)\)\s*\{?/, '$1').trim();
    return 'Conditional: if (' + (c.length > 60 ? c.substring(0, 57) + '...' : c) + ').';
  }
  if (/^else\s+if\s*\(/.test(t)) return 'Else-if conditional branch.';
  if (/^else\s*/.test(t) && !/^else\s+if/.test(t)) return 'Else branch - fallback when condition is false.';
  if (/^for\s*\(/.test(t)) return 'For loop iteration.';
  if (/^while\s*\(/.test(t)) return 'While loop - repeats while condition is true.';
  if (/^switch\s*\(/.test(t)) return 'Switch statement - multi-branch conditional.';
  if (/^case\s+/.test(t)) return 'Case branch: ' + t.trim() + '.';
  if (/^default\s*:/.test(t)) return 'Default case in switch statement.';

  if (/^return\s/.test(t) || /^return;/.test(t)) {
    const v = t.replace(/^return\s*/, '');
    return 'Returns' + (v ? ' [' + (v.length > 60 ? v.substring(0, 57) + '...' : v) + ']' : ' void/undefined') + '.';
  }
  if (/^throw\s/.test(t)) return 'Throws an error.';

  if (/^await\s/.test(t) || /=\s*await\s/.test(t)) return 'Awaits a Promise' + (t.includes('=') ? ' and assigns result' : '') + '.';

  if (/^new\s+/.test(t)) {
    const m = t.match(/new\s+(\w+)/);
    if (m) return 'Creates new instance of [' + m[1] + '].';
  }

  if (/\.\w+\s*\(/.test(t) && !/^import/.test(t) && !/^const/.test(t) && t.includes('(') && t.includes(')')) {
    const m = t.match(/\.(\w+)\s*\(/);
    if (m) {
      const methodExplanations = {
        find: 'Mongoose query: finds document(s) in the database.',
        findOne: 'Mongoose: finds a single matching document.',
        findById: 'Mongoose: finds a document by its ID.',
        save: 'Mongoose: saves the document to the database.',
        create: 'Mongoose: creates and saves a new document.',
        findByIdAndUpdate: 'Mongoose: finds a document and updates it atomically.',
        findOneAndUpdate: 'Mongoose: finds and updates a document.',
        findByIdAndDelete: 'Mongoose: finds a document and deletes it.',
        findOneAndDelete: 'Mongoose: finds and deletes a document.',
        populate: 'Mongoose: populates referenced documents.',
        sort: 'Mongoose: sorts query results.',
        select: 'Mongoose: selects specific fields.',
        lean: 'Mongoose: returns plain JS objects instead of Mongoose documents.',
        countDocuments: 'Mongoose: counts matching documents.',
        then: 'Promise resolution: handles async result.',
        catch: 'Promise resolution: handles errors.',
        map: 'Array method: transforms each element.',
        filter: 'Array method: filters elements by condition.',
        forEach: 'Array method: iterates over elements.',
        reduce: 'Array method: reduces array to a single value.',
        includes: 'Array/string method: checks if value exists.',
        split: 'String method: splits into an array.',
        join: 'Array method: joins elements into a string.',
        trim: 'String method: removes whitespace from both ends.',
        toLowerCase: 'String method: converts to lowercase.',
        toUpperCase: 'String method: converts to uppercase.',
        json: 'Express/HTTP: sends JSON response.',
        status: 'Express: sets HTTP status code.',
        send: 'Express: sends response body.',
        sendStatus: 'Express: sends status code with no body.',
        redirect: 'Express: redirects to another URL.',
        next: 'Express: passes control to next middleware.',
        useState: 'React hook: declares state variable.',
        useEffect: 'React hook: runs side effects after render.',
        useContext: 'React hook: accesses context value.',
        useRef: 'React hook: creates a mutable ref.',
        useMemo: 'React hook: memoizes a computed value.',
        useCallback: 'React hook: memoizes a callback.',
        useReducer: 'React hook: state management with reducer.',
        useNavigate: 'React Router hook: programmatic navigation.',
        useParams: 'React Router hook: reads URL parameters.',
        useLocation: 'React Router hook: reads current URL location.',
      };
      if (methodExplanations[m[1]]) return methodExplanations[m[1]];
      return 'Calls method .' + m[1] + '().';
    }
    return 'Method call.';
  }

  if (/\.listen\s*\(/.test(t)) return 'Starts the HTTP server on the specified port.';

  if (ext === '.jsx') {
    if (t.includes('className=')) {
      const cls = t.match(/className=["']([^"']+)["']/);
      return 'JSX with Tailwind CSS classes' + (cls ? ': [' + cls[1] + ']' : '') + '.';
    }
    if (/^<\/?[A-Z]/.test(t) || /^<>/.test(t) || /^<\/>/.test(t)) {
      const el = t.match(/^<\/?(\w+)/);
      if (el) {
        const tag = el[1];
        if (t.startsWith('</')) return 'JSX closing tag for [' + tag + '].';
        if (t.endsWith('/>')) return 'JSX self-closing element [' + tag + '].';
        return 'JSX opening tag for [' + tag + '] (contains children).';
      }
      return 'JSX fragment.';
    }
    if (/\{[\w.]+\}/.test(t) && !/^import/.test(t) && !/^(const|let|var)/.test(t)) {
      return 'JSX expression: renders dynamic value [' + t.match(/\{[\w.]+\}/)[0] + '] in the template.';
    }
  }

  if (ext === '.css') {
    if (/\{/.test(t) && !t.includes('}')) return 'CSS selector: [' + t.trim() + '].';
    if (/[a-z-]+\s*:/.test(t) && t.includes(';')) {
      const p = t.match(/([a-z-]+)\s*:\s*([^;]+);/);
      if (p) return 'CSS property: [' + p[1] + ': ' + p[2] + '].';
    }
    if (/^\s*\}\s*$/.test(t)) return 'Closing brace - ends a CSS rule.';
  }

  if (/new\s+mongoose\.Schema/.test(t)) return 'Creates a new Mongoose schema instance.';
  if (/mongoose\.model\(/.test(t)) return 'Defines a Mongoose model from the schema.';
  if (/\.plugin\(/.test(t)) return 'Applies a Mongoose plugin to the schema.';
  if (/\{\s*timestamps:\s*true/.test(t)) return 'Enables automatic createdAt/updatedAt fields in Mongoose.';

  if (/^\s*\}\s*$/.test(t)) return 'Closing brace - ends a code block.';
  if (/^\s*\]\s*$/.test(t)) return 'Closing bracket - ends an array literal.';
  if (/^\s*\}\)?\s*,?\s*$/.test(t)) return 'Closing brace - ends an object literal.';

  const display = t.length > 80 ? t.substring(0, 77) + '...' : t;
  return 'Code: [' + display + ']';
}

// ======================== PDF GENERATION ========================
console.log('Initializing PDF document...');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 55, bottom: 55, left: 48, right: 48 },
  info: {
    Title: 'ATI Jaffna University Management System - Line-by-Line Explanation',
    Author: 'ATI Jaffna Development Team',
    Subject: 'Complete source code documentation with line-by-line explanations',
  },
  bufferPages: true,
});

// Register Unicode font (Roboto)
doc.registerFont('Unicode', FONT_REGULAR);
doc.registerFont('Unicode-Bold', FONT_BOLD);
doc.registerFont('Unicode-Italic', FONT_ITALIC);
doc.registerFont('Unicode-BoldItalic', FONT_BOLD_ITALIC);

const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);

let totalPages = 0;
let totalLines = 0;
let totalFiles = 0;

const COLORS = {
  primary: '#1a365d',
  secondary: '#2b6cb0',
  accent: '#38a169',
  codeBg: '#f7fafc',
  border: '#e2e8f0',
  text: '#1a202c',
  textMuted: '#718096',
  lineNum: '#a0aec0',
};

function pageNum() {
  totalPages++;
  const bottom = doc.page.height - 40;
  doc.fontSize(7.5).fillColor(COLORS.textMuted).font('Unicode');
  doc.text('Page ' + totalPages, 48, bottom, { align: 'center', width: doc.page.width - 96 });
}

function checkPage() {
  if (doc.y > doc.page.height - 100) {
    pageNum();
    doc.addPage();
  }
}

function fillBg(x, y, w, h, color) {
  doc.save();
  doc.rect(x, y, w, h).fill(color);
  doc.restore();
}

function writeH1(text) {
  checkPage();
  doc.fontSize(22).fillColor(COLORS.primary).font('Unicode-Bold');
  doc.text(text, 48, doc.y, { align: 'center' });
  doc.moveDown(0.5);
}

function writeH2(text) {
  checkPage();
  doc.fontSize(14).fillColor(COLORS.secondary).font('Unicode-Bold');
  doc.text(text);
  doc.moveDown(0.3);
}

function writeDivider() {
  const y = doc.y;
  doc.moveTo(48, y).lineTo(doc.page.width - 48, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.moveDown(0.6);
}

function writeFileSection(fileRelPath, content) {
  const lines = content.split('\n');
  const ext = path.extname(fileRelPath);

  checkPage();

  // File header background
  const headerY = doc.y;
  const headerH = 28;
  fillBg(48, headerY, doc.page.width - 96, headerH, COLORS.codeBg);
  doc.fontSize(10.5).fillColor(COLORS.primary).font('Unicode-Bold');
  doc.text(fileRelPath, 56, headerY + 6, { width: doc.page.width - 112 });
  doc.y = headerY + headerH + 6;

  // Stats
  const codeLines = lines.filter(l => l.trim()).length;
  doc.fontSize(7).fillColor(COLORS.textMuted).font('Unicode');
  doc.text('Lines: ' + lines.length + '  |  Code lines: ' + codeLines + '  |  Type: ' + (ext || '(none)'));
  doc.moveDown(0.2);
  writeDivider();

  totalFiles++;

  // Line-by-line
  for (let i = 0; i < lines.length; i++) {
    const num = i + 1;
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : null;

    if (doc.y > doc.page.height - 90) {
      pageNum();
      doc.addPage();
    }

    const lineY = doc.y;
    const codeX = 88; // left margin + line number width
    const codeW = doc.page.width - 48 - codeX;

    // Line number
    doc.fontSize(7.2).fillColor(COLORS.lineNum).font('Unicode');
    const paddedNum = String(num).padStart(4, ' ');
    doc.text(paddedNum, 48, lineY, { width: 36, align: 'right', lineBreak: false });

    // Code line
    doc.fontSize(7.5).fillColor(COLORS.text).font('Unicode');
    const displayLine = line || ' ';
    doc.text(displayLine, codeX, lineY, { width: codeW, lineBreak: false });

    // Explanation
    const expl = makeExplanation(line, prevLine, ext);
    if (expl) {
      const explY = doc.y;
      doc.fontSize(6.8).fillColor(COLORS.textMuted).font('Unicode');
      doc.text('  ' + expl, codeX, explY, { width: codeW });
    }

    doc.moveDown(0.25);
    totalLines++;
  }

  doc.moveDown(1.2);
}

function generateCover() {
  doc.fontSize(34).fillColor(COLORS.primary).font('Unicode-Bold');
  doc.text('ATI JAFFNA', 48, 160, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(24).fillColor(COLORS.secondary).font('Unicode-Bold');
  doc.text('University Management System', { align: 'center' });
  doc.moveDown(1);

  const y = doc.y;
  doc.moveTo(150, y).lineTo(doc.page.width - 150, y).strokeColor(COLORS.accent).lineWidth(2).stroke();
  doc.moveDown(1.5);

  doc.fontSize(16).fillColor(COLORS.text).font('Unicode');
  doc.text('Complete Source Code Documentation', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor(COLORS.textMuted).font('Unicode');
  doc.text('Line-by-Line Explanation of Every File', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(9.5).fillColor(COLORS.text).font('Unicode');
  const details = [
    'Total files documented: ' + FILE_GROUPS.reduce((s, g) => s + g.files.length, 0),
    'Generated: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    'Stack: MongoDB (Mongoose 9) + Express 5 + React 19 + Node.js',
    'PDF font: Roboto (full Unicode support)',
  ];
  details.forEach(d => {
    doc.text('  -  ' + d, { align: 'center' });
    doc.moveDown(0.2);
  });

  doc.moveDown(3);
  const y2 = doc.y;
  doc.moveTo(100, y2).lineTo(doc.page.width - 100, y2).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.moveDown(1);
  doc.fontSize(8.5).fillColor(COLORS.textMuted).font('Unicode');
  doc.text('ATI (Advanced Technological Institute) Jaffna - Sri Lanka', { align: 'center' });
}

function generateTOC() {
  doc.addPage();
  writeH1('Table of Contents');
  doc.moveDown(0.5);

  FILE_GROUPS.forEach((group, gi) => {
    checkPage();
    doc.fontSize(10.5).fillColor(COLORS.primary).font('Unicode-Bold');
    doc.text((gi + 1) + '. ' + group.title);
    doc.moveDown(0.1);

    group.files.forEach((f, fi) => {
      doc.fontSize(8).fillColor(COLORS.text).font('Unicode');
      doc.text('    ' + (gi + 1) + '.' + (fi + 1) + '  ' + f);
      doc.moveDown(0.05);
    });
    doc.moveDown(0.3);
  });
}

function generateEndPage() {
  doc.addPage();
  writeH1('End of Documentation');
  doc.moveDown(1);
  doc.fontSize(10.5).fillColor(COLORS.text).font('Unicode');
  doc.text('This concludes the line-by-line explanation of the ATI Jaffna University Management System.', { align: 'center' });
  doc.moveDown(0.5);
  doc.text('Total files documented: ' + FILE_GROUPS.reduce((s, g) => s + g.files.length, 0), { align: 'center' });
  doc.text('Email: info@atijaffna.edu.lk', { align: 'center' });
  doc.moveDown(3);
  doc.fontSize(9).fillColor(COLORS.textMuted).font('Unicode');
  doc.text('- End -', { align: 'center' });
}

// === MAIN ===
console.log('Generating cover...');
generateCover();

console.log('Generating table of contents...');
generateTOC();

console.log('Processing files...');
FILE_GROUPS.forEach((group) => {
  console.log('  Section: ' + group.title + ' (' + group.files.length + ' files)');
  doc.addPage();
  writeH1(group.title);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(COLORS.textMuted).font('Unicode');
  doc.text(group.files.length + ' file(s) in this section', { align: 'center' });
  doc.moveDown(0.8);

  group.files.forEach((fileRelPath) => {
    const fullPath = path.join(ROOT, fileRelPath);
    if (fs.existsSync(fullPath)) {
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      writeFileSection(fileRelPath, fileContent);
    } else {
      checkPage();
      doc.fontSize(9).fillColor('#e53e3e').font('Unicode-Bold');
      doc.text('[File not found: ' + fileRelPath + ']');
      doc.moveDown(0.5);
    }
  });
});

console.log('Generating end page...');
generateEndPage();

// Finalize
pageNum();

// Add page numbers to all pages
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);
  const bottom = doc.page.height - 40;
  doc.fontSize(7.5).fillColor(COLORS.textMuted).font('Unicode');
  doc.text('Page ' + (i + 1), 48, bottom, { align: 'center', width: doc.page.width - 96 });
}

doc.flushPages();

console.log('Finalizing PDF...');
doc.end();

stream.on('finish', () => {
  const stats = fs.statSync(OUTPUT);
  console.log('');
  console.log('PDF generated successfully!');
  console.log('  Location: ' + OUTPUT);
  console.log('  Size: ' + (stats.size / 1024).toFixed(1) + ' KB');
  console.log('  Pages: ' + totalPages);
  console.log('  Files: ' + totalFiles);
  console.log('  Code lines documented: ' + totalLines);
  console.log('  Font: Roboto (Unicode support)');
  console.log('');
});
