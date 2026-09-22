const STORAGE_KEY = "questionPaperMaker.v1";
const LAYOUT_STORAGE_KEY = "questionPaperMaker.layout.v1";
const LEGACY_STORAGE_KEYS = ["examPaperMaker.v1", "questionPaperFormatter.v1"];

const textIds = [
  "institution", "examTitle", "subject", "courseCode", "className", "examDate",
  "duration", "maxMarks", "instructions", "fontFamily", "fontSize", "lineHeight",
  "pageMargin", "questionGap", "watermark", "questionInput"
];

const checkboxIds = [
  "headingRowEnabled", "subjectRowEnabled", "classRowEnabled",
  "durationRowEnabled", "instructionsEnabled",
  "studentDetailsEnabled", "studentNameEnabled", "studentRollEnabled",
  "studentDateEnabled", "studentSignEnabled"
];

const elements = Object.fromEntries(textIds.map(id => [id, document.getElementById(id)]));

const ui = {
  paper: document.getElementById("paper"),
  previewPages: document.getElementById("previewPages"),
  pageCount: document.getElementById("pageCount"),
  paperLogo: document.getElementById("paperLogo"),
  paperInstitution: document.getElementById("paperInstitution"),
  paperExamTitle: document.getElementById("paperExamTitle"),
  paperSubject: document.getElementById("paperSubject"),
  paperCourseCode: document.getElementById("paperCourseCode"),
  paperClass: document.getElementById("paperClass"),
  paperDate: document.getElementById("paperDate"),
  paperDuration: document.getElementById("paperDuration"),
  paperMaxMarks: document.getElementById("paperMaxMarks"),
  paperInstructions: document.getElementById("paperInstructions"),
  instructionsBlock: document.getElementById("instructionsBlock"),
  questionPreview: document.getElementById("questionPreview"),
  questionCount: document.getElementById("questionCount"),
  calculatedMarks: document.getElementById("calculatedMarks"),
  marksWarning: document.getElementById("marksWarning"),
  watermarkLayer: document.getElementById("watermarkLayer"),
  saveStatus: document.getElementById("saveStatus"),
  zoomLabel: document.getElementById("zoomLabel"),
  importInput: document.getElementById("importInput"),
  logoInput: document.getElementById("logoInput"),
  paperHeader: document.getElementById("paperHeader"),
  metaGrid: document.getElementById("metaGrid"),
  subjectMetaRow: document.getElementById("subjectMetaRow"),
  classMetaRow: document.getElementById("classMetaRow"),
  durationMetaRow: document.getElementById("durationMetaRow"),
  studentDetailsRow: document.getElementById("studentDetailsRow"),
  studentDetailsOptions: document.getElementById("studentDetailsOptions"),
  workspace: document.querySelector(".workspace"),
  sideBySideToggle: document.getElementById("sideBySideToggle")
};

let state = {
  logoDataUrl: "",
  zoom: 0.85,
  sideBySide: false
};

const sampleData = {
  institution: "Institute of Aeronautical Engineering",
  examTitle: "End Semester Examination",
  subject: "Aerodynamics",
  courseCode: "AE301",
  className: "B.Tech Aerospace Engineering",
  examDate: "22 September 2026",
  duration: "3 Hours",
  maxMarks: "20",
  instructions: "Answer all questions.\nUse SI units unless otherwise stated.\nAssume suitable data if necessary.",
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: "11",
  lineHeight: "1.4",
  pageMargin: "18",
  questionGap: "10",
  watermark: "",
  headingRowEnabled: true,
  subjectRowEnabled: true,
  classRowEnabled: true,
  durationRowEnabled: true,
  instructionsEnabled: true,
  studentDetailsEnabled: true,
  studentNameEnabled: true,
  studentRollEnabled: true,
  studentDateEnabled: true,
  studentSignEnabled: true,
  questionInput: `# Section A

Answer ALL questions.

1. Define Reynolds number and state its physical significance. [2]

2. Explain the origin of induced drag on a finite wing. [4]

[MCQ]
Which of the following is dimensionless? [1]
A. Lift
B. Reynolds number
C. Dynamic pressure
D. Density

# Section B

> Answer any TWO questions.

4. A finite wing has an aspect ratio of 8 and an Oswald efficiency factor of 0.85. Derive the induced-drag coefficient in terms of lift coefficient and evaluate it for C_L = 0.6. [5]

5. Discuss boundary-layer separation and explain how an adverse pressure gradient promotes separation. [8]`
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseQuestionPaper(rawText) {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const nodes = [];
  let current = null;

  function newQuestion(isMcq = false) {
    return {
      type: "question",
      text: "",
      marks: null,
      options: [],
      subpoints: [],
      isMcq
    };
  }

  function flushCurrent() {
    if (!current) return;
    if (current.text.trim()) nodes.push(current);
    current = null;
  }

  for (const originalLine of lines) {
    const line = originalLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushCurrent();
      continue;
    }

    if (trimmed === "---") {
      flushCurrent();
      nodes.push({ type: "separator" });
      continue;
    }

    if (/^#+\s+/.test(trimmed) || /^\[SECTION\b.*\]$/i.test(trimmed)) {
      flushCurrent();
      const title = trimmed.startsWith("#")
        ? trimmed.replace(/^#+\s+/, "")
        : trimmed.replace(/^\[/, "").replace(/\]$/, "");
      nodes.push({ type: "section", title });
      continue;
    }

    const explicitInstruction = trimmed.match(/^(?:>\s*|\[INSTRUCTION\]\s*)(.+)$/i);
    if (explicitInstruction) {
      flushCurrent();
      nodes.push({ type: "instruction", text: explicitInstruction[1].trim() });
      continue;
    }

    if (/^\[MCQ\]$/i.test(trimmed)) {
      flushCurrent();
      current = newQuestion(true);
      continue;
    }

    const optionMatch = trimmed.match(/^([A-Ha-h])[\.\)]\s+(.+)$/);
    if (optionMatch && current) {
      current.options.push({
        label: optionMatch[1].toUpperCase(),
        text: optionMatch[2]
      });
      current.isMcq = true;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch && current) {
      current.subpoints.push(bulletMatch[1]);
      continue;
    }

    const numberedMatch = trimmed.match(/^(?:Q(?:uestion)?\s*)?(\d+)\s*[\.\):\-]\s*(.+)$/i);

    if (numberedMatch) {
      const openMcq = current?.isMcq && !current.text;
      if (!openMcq) {
        flushCurrent();
        current = newQuestion(false);
      }

      let questionLine = numberedMatch[2].trim();
      const marksMatch = questionLine.match(/(?:\[(\d+(?:\.\d+)?)\]|\{(\d+(?:\.\d+)?)\})\s*$/);
      if (marksMatch) {
        current.marks = Number(marksMatch[1] ?? marksMatch[2]);
        questionLine = questionLine.slice(0, marksMatch.index).trim();
      }
      current.text = questionLine;
      continue;
    }

    if (!current) {
      nodes.push({ type: "instruction", text: trimmed });
      continue;
    }

    const marksMatch = trimmed.match(/(?:\[(\d+(?:\.\d+)?)\]|\{(\d+(?:\.\d+)?)\})\s*$/);
    let questionLine = trimmed;

    if (marksMatch) {
      current.marks = Number(marksMatch[1] ?? marksMatch[2]);
      questionLine = trimmed.slice(0, marksMatch.index).trim();
    }

    if (current.text) {
      current.text += " " + questionLine;
    } else {
      current.text = questionLine;
    }
  }

  flushCurrent();

  const questions = nodes.filter(node => node.type === "question");
  const totalMarks = questions.reduce(
    (sum, question) => sum + (Number.isFinite(question.marks) ? question.marks : 0),
    0
  );

  return {
    nodes,
    questionCount: questions.length,
    totalMarks
  };
}

function createPreviewNode(node, questionNumber) {
  const wrapper = document.createElement("div");

  if (node.type === "section") {
    wrapper.innerHTML = `<div class="section-heading">${escapeHtml(node.title)}</div>`;
    return wrapper.firstElementChild;
  }

  if (node.type === "separator") {
    wrapper.innerHTML = `<hr class="separator" />`;
    return wrapper.firstElementChild;
  }

  if (node.type === "instruction") {
    wrapper.innerHTML = `<div class="section-instruction">${escapeHtml(node.text)}</div>`;
    return wrapper.firstElementChild;
  }

  const marks = Number.isFinite(node.marks) ? `[${escapeHtml(node.marks)}]` : "";
  const subpoints = node.subpoints.length
    ? `<ul class="subpoint">${node.subpoints.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  const options = node.options.length
    ? `<div class="mcq-options">${node.options.map(option => `
        <div class="mcq-option">
          <strong>${escapeHtml(option.label)}.</strong>
          <span>${escapeHtml(option.text)}</span>
        </div>`).join("")}
      </div>`
    : "";

  wrapper.innerHTML = `
    <section class="question-block">
      <div class="question-line">
        <div class="question-number">${questionNumber}.</div>
        <div class="question-text">${escapeHtml(node.text)}</div>
        <div class="question-marks">${marks}</div>
      </div>
      ${options}
      ${subpoints}
    </section>
  `;
  return wrapper.firstElementChild;
}

function createContinuationPage(pageNumber) {
  const page = document.createElement("article");
  page.className = "paper continuation-page";
  page.setAttribute("aria-label", `Question paper preview, page ${pageNumber}`);
  page.innerHTML = `
    <div class="watermark">${escapeHtml(elements.watermark.value.trim())}</div>
    <div class="questions"></div>
    <footer class="paper-footer">
      <span>Created with Question Paper Maker</span>
      <span class="page-number"></span>
    </footer>
  `;
  ui.previewPages.appendChild(page);
  return page;
}

function pageOverflows(page) {
  return page.scrollHeight > page.clientHeight + 2;
}

function updatePageAppearance() {
  const pages = [...ui.previewPages.querySelectorAll(".paper")];
  pages.forEach(page => {
    page.style.transform = `scale(${state.zoom})`;
    page.style.marginBottom = `${-(1 - state.zoom) * page.offsetHeight + 24}px`;
  });
  ui.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function updatePageNumbers() {
  const pages = [...ui.previewPages.querySelectorAll(".paper")];
  const total = pages.length;
  pages.forEach((page, index) => {
    page.setAttribute("aria-label", `Question paper preview, page ${index + 1} of ${total}`);
    page.querySelector(".page-number").textContent = `Page ${index + 1} of ${total}`;
  });
  ui.pageCount.textContent = `${total} ${total === 1 ? "page" : "pages"}`;
}

function paginateQuestions(parsed) {
  ui.previewPages.querySelectorAll(".continuation-page").forEach(page => page.remove());
  ui.paper.classList.remove("has-oversized-content");
  ui.questionPreview.innerHTML = "";

  let currentPage = ui.paper;
  let currentQuestions = ui.questionPreview;
  let questionNumber = 0;
  let startNewPage = false;

  parsed.nodes.forEach(node => {
    if (startNewPage) {
      currentPage = createContinuationPage(ui.previewPages.querySelectorAll(".paper").length + 1);
      currentQuestions = currentPage.querySelector(".questions");
      startNewPage = false;
    }

    if (node.type === "question") questionNumber += 1;
    const element = createPreviewNode(node, questionNumber);
    currentQuestions.appendChild(element);

    if (!pageOverflows(currentPage)) return;

    const elementsToMove = [element];
    let previous = element.previousElementSibling;
    while (
      previous &&
      (previous.classList.contains("section-heading") ||
       previous.classList.contains("section-instruction"))
    ) {
      elementsToMove.unshift(previous);
      previous = previous.previousElementSibling;
    }

    elementsToMove.forEach(item => item.remove());
    currentPage = createContinuationPage(ui.previewPages.querySelectorAll(".paper").length + 1);
    currentQuestions = currentPage.querySelector(".questions");
    elementsToMove.forEach(item => currentQuestions.appendChild(item));

    if (pageOverflows(currentPage)) {
      currentPage.classList.add("has-oversized-content");
      startNewPage = true;
    }
  });

  updatePageNumbers();
  updatePageAppearance();
}

function getFormData() {
  const data = {};
  textIds.forEach(id => data[id] = elements[id].value);
  checkboxIds.forEach(id => data[id] = document.getElementById(id).checked);
  data.logoDataUrl = state.logoDataUrl;
  return data;
}

function applyFormData(inputData) {
  const data = { ...inputData };

  const defaults = {
    headingRowEnabled: true,
    subjectRowEnabled: true,
    classRowEnabled: true,
    durationRowEnabled: true,
    instructionsEnabled: true,
    studentDetailsEnabled: false,
    studentNameEnabled: true,
    studentRollEnabled: true,
    studentDateEnabled: true,
    studentSignEnabled: true
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (data[key] === undefined) data[key] = value;
  });

  textIds.forEach(id => {
    if (data[id] !== undefined && data[id] !== null) {
      elements[id].value = data[id];
    }
  });

  checkboxIds.forEach(id => {
    if (data[id] !== undefined && data[id] !== null) {
      document.getElementById(id).checked = Boolean(data[id]);
    }
  });

  state.logoDataUrl = data.logoDataUrl || "";
  render();
}

function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormData()));
    ui.saveStatus.textContent = "Saved locally";
  } catch (error) {
    ui.saveStatus.textContent = "Local save unavailable";
  }
}

function loadLocal() {
  const candidateKeys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const saved = JSON.parse(raw);
      applyFormData(saved);

      if (key !== STORAGE_KEY) saveLocal();
      return true;
    } catch (error) {
      console.warn(`Could not load saved paper from ${key}:`, error);
    }
  }

  return false;
}

function applyWorkspaceLayout() {
  ui.workspace.classList.toggle("side-by-side", state.sideBySide);
  ui.sideBySideToggle.checked = state.sideBySide;
  ui.sideBySideToggle.setAttribute("aria-checked", String(state.sideBySide));
}

function saveWorkspaceLayout() {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, state.sideBySide ? "side-by-side" : "stacked");
  } catch (error) {
    console.warn("Could not save workspace layout:", error);
  }
}

function loadWorkspaceLayout() {
  try {
    state.sideBySide = localStorage.getItem(LAYOUT_STORAGE_KEY) === "side-by-side";
  } catch (error) {
    state.sideBySide = false;
  }

  applyWorkspaceLayout();
}

function renderMetaRows() {
  const rowStates = [
    [ui.subjectMetaRow, document.getElementById("subjectRowEnabled").checked],
    [ui.classMetaRow, document.getElementById("classRowEnabled").checked],
    [ui.durationMetaRow, document.getElementById("durationRowEnabled").checked]
  ];

  const visibleRows = [];

  rowStates.forEach(([row, enabled]) => {
    row.classList.toggle("hidden", !enabled);
    row.classList.remove("last-visible");
    if (enabled) visibleRows.push(row);
  });

  ui.metaGrid.classList.toggle("hidden", visibleRows.length === 0);

  if (visibleRows.length) {
    visibleRows[visibleRows.length - 1].classList.add("last-visible");
  }

  return visibleRows.length > 0;
}

function renderHeader() {
  ui.paperInstitution.textContent = elements.institution.value.trim() || "Institution Name";
  ui.paperExamTitle.textContent = elements.examTitle.value.trim() || "Examination";

  ui.paperSubject.textContent = elements.subject.value.trim() || "—";
  ui.paperCourseCode.textContent = elements.courseCode.value.trim() || "—";
  ui.paperClass.textContent = elements.className.value.trim() || "—";
  ui.paperDate.textContent = elements.examDate.value.trim() || "—";
  ui.paperDuration.textContent = elements.duration.value.trim() || "—";
  ui.paperMaxMarks.textContent = elements.maxMarks.value.trim() || "—";

  ui.paperHeader.classList.toggle(
    "hidden",
    !document.getElementById("headingRowEnabled").checked
  );

  const metaVisible = renderMetaRows();

  const instructionLines = elements.instructions.value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const instructionsEnabled = document.getElementById("instructionsEnabled").checked;
  ui.instructionsBlock.classList.toggle(
    "hidden",
    !instructionsEnabled || instructionLines.length === 0
  );
  ui.paperInstructions.innerHTML = instructionLines
    .map(line => `<li>${escapeHtml(line)}</li>`)
    .join("");

  if (state.logoDataUrl) {
    ui.paperLogo.src = state.logoDataUrl;
    ui.paperLogo.classList.remove("hidden");
  } else {
    ui.paperLogo.removeAttribute("src");
    ui.paperLogo.classList.add("hidden");
  }

  const studentDetailsEnabled = document.getElementById("studentDetailsEnabled").checked;
  ui.studentDetailsOptions.classList.toggle("hidden", !studentDetailsEnabled);

  const studentFields = [
    ["studentNameEnabled", "Name"],
    ["studentRollEnabled", "Roll No."],
    ["studentDateEnabled", "Date"],
    ["studentSignEnabled", "Signature"]
  ].filter(([id]) => document.getElementById(id).checked);

  const showStudentDetails = studentDetailsEnabled && studentFields.length > 0;
  ui.studentDetailsRow.classList.toggle("hidden", !showStudentDetails);
  ui.studentDetailsRow.classList.toggle("attached-to-meta", showStudentDetails && metaVisible);

  ui.studentDetailsRow.innerHTML = studentFields.map(([, label]) => `
    <div class="student-detail-cell">
      <span class="student-detail-label">${escapeHtml(label)}:</span>
      <span class="student-detail-line"></span>
    </div>
  `).join("");
}

function renderAppearance() {
  ui.previewPages.style.setProperty("--paper-font", elements.fontFamily.value);
  ui.previewPages.style.setProperty("--paper-font-size", `${elements.fontSize.value}pt`);
  ui.previewPages.style.setProperty("--paper-line-height", elements.lineHeight.value);
  ui.previewPages.style.setProperty("--paper-margin", `${elements.pageMargin.value}mm`);
  ui.previewPages.style.setProperty("--question-gap", `${elements.questionGap.value}px`);
  ui.watermarkLayer.textContent = elements.watermark.value.trim();
}

function render() {
  renderHeader();
  renderAppearance();

  const parsed = parseQuestionPaper(elements.questionInput.value);
  paginateQuestions(parsed);

  ui.questionCount.textContent = parsed.questionCount;
  ui.calculatedMarks.textContent = parsed.totalMarks;

  const maxMarksNumeric = Number(elements.maxMarks.value);
  const mismatch = Number.isFinite(maxMarksNumeric) &&
                   elements.maxMarks.value.trim() !== "" &&
                   maxMarksNumeric !== parsed.totalMarks;

  if (mismatch && parsed.totalMarks > 0) {
    ui.marksWarning.textContent =
      `Maximum marks is ${maxMarksNumeric}, but the marked questions total ${parsed.totalMarks}.`;
    ui.marksWarning.classList.remove("hidden");
  } else {
    ui.marksWarning.classList.add("hidden");
  }

  saveLocal();
}

function downloadFile(filename, contents, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function handleLogo(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.logoDataUrl = reader.result;
    render();
  };
  reader.readAsDataURL(file);
}

function importJson(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      applyFormData(data);
      saveLocal();
    } catch (error) {
      alert("That file is not a valid Question Paper Maker JSON file.");
    }
  };
  reader.readAsText(file);
}

textIds.forEach(id => {
  elements[id].addEventListener("input", render);
  elements[id].addEventListener("change", render);
});

checkboxIds.forEach(id => {
  document.getElementById(id).addEventListener("change", render);
});

document.getElementById("sampleBtn").addEventListener("click", () => {
  applyFormData(sampleData);
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const safeSubject = (elements.subject.value || "exam-paper")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  downloadFile(
    `${safeSubject || "exam-paper"}.json`,
    JSON.stringify(getFormData(), null, 2),
    "application/json"
  );
});

ui.importInput.addEventListener("change", event => {
  importJson(event.target.files[0]);
  event.target.value = "";
});

ui.logoInput.addEventListener("change", event => {
  handleLogo(event.target.files[0]);
  event.target.value = "";
});

document.getElementById("removeLogoBtn").addEventListener("click", () => {
  state.logoDataUrl = "";
  render();
});

document.getElementById("useCalculatedMarksBtn").addEventListener("click", () => {
  const parsed = parseQuestionPaper(elements.questionInput.value);
  elements.maxMarks.value = parsed.totalMarks || "";
  render();
});

document.getElementById("printBtn").addEventListener("click", () => {
  window.print();
});

document.getElementById("downloadDocxBtn").addEventListener("click", async event => {
  const button = event.currentTarget;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "Preparing DOCX…";

  try {
    const parsed = parseQuestionPaper(elements.questionInput.value);
    await window.QuestionPaperDocx.download(getFormData(), parsed);
  } catch (error) {
    console.error("DOCX export failed:", error);
    alert("The DOCX file could not be created. Please reload the page and try again.");
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = originalLabel;
  }
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("Clear the current paper? This replaces the locally saved draft.")) return;

  [
    "institution", "examTitle", "subject", "courseCode", "className", "examDate",
    "duration", "maxMarks", "instructions", "watermark", "questionInput"
  ].forEach(id => {
    elements[id].value = "";
  });

  elements.fontFamily.value = "'Times New Roman', Times, serif";
  elements.fontSize.value = "11";
  elements.lineHeight.value = "1.4";
  elements.pageMargin.value = "18";
  elements.questionGap.value = "10";

  document.getElementById("headingRowEnabled").checked = true;
  document.getElementById("subjectRowEnabled").checked = true;
  document.getElementById("classRowEnabled").checked = true;
  document.getElementById("durationRowEnabled").checked = true;
  document.getElementById("instructionsEnabled").checked = true;

  document.getElementById("studentDetailsEnabled").checked = false;
  document.getElementById("studentNameEnabled").checked = true;
  document.getElementById("studentRollEnabled").checked = true;
  document.getElementById("studentDateEnabled").checked = true;
  document.getElementById("studentSignEnabled").checked = true;

  state.logoDataUrl = "";
  render();
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
  state.zoom = Math.max(0.5, +(state.zoom - 0.05).toFixed(2));
  updatePageAppearance();
});

document.getElementById("zoomInBtn").addEventListener("click", () => {
  state.zoom = Math.min(1.15, +(state.zoom + 0.05).toFixed(2));
  updatePageAppearance();
});

ui.sideBySideToggle.addEventListener("change", event => {
  state.sideBySide = event.target.checked;
  applyWorkspaceLayout();
  saveWorkspaceLayout();
});

loadWorkspaceLayout();
if (!loadLocal()) {
  applyFormData(sampleData);
}
