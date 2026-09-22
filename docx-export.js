(function (global) {
  "use strict";

  const A4_WIDTH = 11906;
  const A4_HEIGHT = 16838;
  const TWIPS_PER_MM = 56.692913;

  function mmToTwips(value) {
    return Math.round(Number(value) * TWIPS_PER_MM);
  }

  function wordFont(cssFont) {
    if (cssFont.includes("Georgia")) return "Georgia";
    if (cssFont.includes("Arial")) return "Arial";
    if (cssFont.includes("Courier")) return "Courier New";
    return "Times New Roman";
  }

  function safeFileName(value) {
    return String(value || "question-paper")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "question-paper";
  }

  function dataUrlBytes(dataUrl) {
    const [, encoded = ""] = dataUrl.split(",", 2);
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  async function normalizeLogo(dataUrl) {
    if (!dataUrl) return null;
    const mime = (dataUrl.match(/^data:([^;,]+)/i) || [])[1]?.toLowerCase();
    const directTypes = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/bmp": "bmp"
    };

    if (directTypes[mime]) {
      return { type: directTypes[mime], data: dataUrlBytes(dataUrl) };
    }

    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 256;
    canvas.height = image.naturalHeight || 256;
    canvas.getContext("2d").drawImage(image, 0, 0);
    return { type: "png", data: dataUrlBytes(canvas.toDataURL("image/png")) };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function buildDocument(data, parsed) {
    if (!global.docx) throw new Error("The DOCX export library did not load.");

    const {
      AlignmentType,
      BorderStyle,
      Document,
      Footer,
      ImageRun,
      Packer,
      PageNumber,
      PageOrientation,
      Paragraph,
      Table,
      TableBorders,
      TableCell,
      TableLayoutType,
      TableRow,
      TextRun,
      WidthType
    } = global.docx;

    const font = wordFont(data.fontFamily || "");
    const fontSizePt = Number(data.fontSize) || 11;
    const fontSize = Math.round(fontSizePt * 2);
    const lineSpacing = Math.round(fontSizePt * 20 * (Number(data.lineHeight) || 1.4));
    const paragraphAfter = Math.max(60, Math.round((Number(data.questionGap) || 10) * 15));
    const margin = mmToTwips(Number(data.pageMargin) || 18);
    const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

    const run = (text, options = {}) => new TextRun({
      text: String(text ?? ""),
      font,
      size: options.size || fontSize,
      bold: Boolean(options.bold),
      italics: Boolean(options.italics),
      color: options.color
    });

    const paragraph = (children, options = {}) => new Paragraph({
      children: Array.isArray(children) ? children : [run(children)],
      alignment: options.alignment,
      keepNext: options.keepNext,
      keepLines: options.keepLines,
      indent: options.indent,
      border: options.border,
      spacing: {
        line: lineSpacing,
        before: options.before || 0,
        after: options.after ?? paragraphAfter
      }
    });

    const valueCell = (label, value) => new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      children: [paragraph([
        run(`${label}: `, { bold: true }),
        run(value || "—")
      ], { after: 0 })]
    });

    const children = [];
    const logo = data.headingRowEnabled ? await normalizeLogo(data.logoDataUrl) : null;

    if (data.headingRowEnabled) {
      if (logo) {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 90 },
          children: [new ImageRun({
            type: logo.type,
            data: logo.data,
            transformation: { width: 54, height: 54 },
            altText: { title: "Institution logo", description: "Institution logo", name: "Institution logo" }
          })]
        }));
      }

      children.push(paragraph([
        run((data.institution || "Institution Name").toUpperCase(), {
          bold: true,
          size: Math.max(fontSize + 6, 28)
        })
      ], { alignment: AlignmentType.CENTER, keepNext: true, after: 80 }));

      children.push(paragraph([
        run(data.examTitle || "Examination", { bold: true, size: Math.max(fontSize + 2, 24) })
      ], {
        alignment: AlignmentType.CENTER,
        keepNext: true,
        after: 180,
        border: { bottom: { ...thinBorder, size: 8 } }
      }));
    }

    const metadataRows = [];
    if (data.subjectRowEnabled) {
      metadataRows.push(new TableRow({
        cantSplit: true,
        children: [valueCell("Subject", data.subject), valueCell("Course code", data.courseCode)]
      }));
    }
    if (data.classRowEnabled) {
      metadataRows.push(new TableRow({
        cantSplit: true,
        children: [valueCell("Class / Course", data.className), valueCell("Date", data.examDate)]
      }));
    }
    if (data.durationRowEnabled) {
      metadataRows.push(new TableRow({
        cantSplit: true,
        children: [valueCell("Duration", data.duration), valueCell("Maximum marks", data.maxMarks)]
      }));
    }
    if (metadataRows.length) {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: {
          top: thinBorder,
          bottom: thinBorder,
          left: thinBorder,
          right: thinBorder,
          insideHorizontal: thinBorder,
          insideVertical: thinBorder
        },
        rows: metadataRows
      }));
      children.push(paragraph("", { after: 80 }));
    }

    if (data.studentDetailsEnabled) {
      const studentFields = [
        [data.studentNameEnabled, "Name"],
        [data.studentRollEnabled, "Roll No."],
        [data.studentDateEnabled, "Date"],
        [data.studentSignEnabled, "Signature"]
      ].filter(([enabled]) => enabled);

      if (studentFields.length) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: {
            top: thinBorder,
            bottom: thinBorder,
            left: thinBorder,
            right: thinBorder,
            insideHorizontal: thinBorder,
            insideVertical: thinBorder
          },
          rows: [new TableRow({
            cantSplit: true,
            children: studentFields.map(([, label]) => new TableCell({
              width: { size: 100 / studentFields.length, type: WidthType.PERCENTAGE },
              margins: { top: 110, bottom: 110, left: 100, right: 100 },
              children: [paragraph([run(`${label}: `, { bold: true }), run("________________")], { after: 0 })]
            }))
          })]
        }));
        children.push(paragraph("", { after: 80 }));
      }
    }

    const instructions = String(data.instructions || "")
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean);
    if (data.instructionsEnabled && instructions.length) {
      children.push(paragraph([run("Instructions", { bold: true })], { keepNext: true, after: 40 }));
      instructions.forEach((instruction, index) => {
        children.push(paragraph(`${index + 1}. ${instruction}`, {
          keepNext: index < instructions.length - 1,
          indent: { left: 300, hanging: 220 },
          after: 25
        }));
      });
      children.push(paragraph("", {
        after: 100,
        border: { bottom: thinBorder }
      }));
    }

    let questionNumber = 0;
    parsed.nodes.forEach(node => {
      if (node.type === "section") {
        children.push(paragraph([
          run(node.title.toUpperCase(), { bold: true })
        ], {
          alignment: AlignmentType.CENTER,
          keepNext: true,
          before: 180,
          after: 70
        }));
        return;
      }

      if (node.type === "instruction") {
        children.push(paragraph([
          run(node.text, { bold: true, italics: true })
        ], {
          alignment: AlignmentType.CENTER,
          keepNext: true,
          after: 90
        }));
        return;
      }

      if (node.type === "separator") {
        children.push(paragraph("", { before: 80, after: 100, border: { bottom: thinBorder } }));
        return;
      }

      questionNumber += 1;
      const questionChildren = [paragraph([
        run(`${questionNumber}. `, { bold: true }),
        run(node.text)
      ], { keepLines: true, after: node.options.length || node.subpoints.length ? 50 : paragraphAfter })];

      const extras = [
        ...node.options.map(option => ({ type: "option", option })),
        ...node.subpoints.map(item => ({ type: "subpoint", item }))
      ];
      extras.forEach((extra, index) => {
        const after = index === extras.length - 1 ? paragraphAfter : 20;
        if (extra.type === "option") {
          questionChildren.push(paragraph([
            run(`${extra.option.label}. `, { bold: true }),
            run(extra.option.text)
          ], { indent: { left: 520 }, after }));
        } else {
          questionChildren.push(paragraph(`• ${extra.item}`, {
            indent: { left: 520, hanging: 220 },
            after
          }));
        }
      });

      const marks = Number.isFinite(node.marks) ? `[${node.marks}]` : "";
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [9000, 1100],
        layout: TableLayoutType.FIXED,
        borders: TableBorders.NONE,
        rows: [new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 90, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 100 },
              borders: TableBorders.NONE,
              children: questionChildren
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              borders: TableBorders.NONE,
              children: [paragraph([run(marks, { bold: true })], {
                alignment: AlignmentType.RIGHT,
                after: 0
              })]
            })
          ]
        })]
      }));
    });

    const footer = new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          font,
          size: 16,
          color: "666666",
          children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES]
        })]
      })]
    });

    const documentFile = new Document({
      title: data.examTitle || "Question Paper",
      subject: data.subject || "Question Paper",
      creator: "Cibin Joseph",
      description: "Question paper",
      features: { updateFields: true },
      sections: [{
        properties: {
          page: {
            size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: PageOrientation.PORTRAIT },
            margin: { top: margin, right: margin, bottom: margin, left: margin, footer: 400 },
            pageNumbers: { start: 1 }
          }
        },
        footers: { default: footer },
        children
      }]
    });

    return Packer.toBlob(documentFile);
  }

  async function download(data, parsed) {
    const blob = await buildDocument(data, parsed);
    const baseName = safeFileName(data.subject || data.examTitle || "question-paper");
    downloadBlob(blob, `${baseName}.docx`);
  }

  global.QuestionPaperDocx = { buildDocument, download };
})(globalThis);
