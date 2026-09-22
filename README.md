# Question Paper Maker

A free browser-based tool for creating clean, professional examination question papers.

[Open Question Paper Maker](https://cibinjoseph.github.io/question-paper-maker/)

## What it does

Question Paper Maker converts structured question text into a formatted, print-ready A4 question paper. The preview updates immediately as the content or formatting is changed.

Everything runs inside the browser. No account, installation, or document upload is required.

## Features

* Live A4 question-paper preview
* Automatic overflow across multiple pages
* Stacked or side-by-side editor and preview layouts
* Institution name, examination title, subject, course code, class, date, duration, and maximum marks
* Optional institution logo
* Optional student information fields
* Section headings and unnumbered instructions
* Automatic and consistent question numbering
* Right-aligned marks
* Multiple-choice question formatting
* Bulleted sub-points
* Automatic mark-total calculation
* Warning when the calculated total differs from the stated maximum marks
* Font, spacing, and page-margin controls
* Optional watermark
* Automatic local draft saving
* JSON import and export for editable backups
* Editable Microsoft Word document download
* Print-ready PDF output

## Quick start

1. Enter the institution and examination details.
2. Paste or type the questions in the editor.
3. Use the formatting syntax below for sections, instructions, marks, MCQs, and sub-points.
4. Review the generated pages in the live preview.
5. Download an editable DOCX file or use **Print / Save PDF** for final output.

## Question formatting

```text
# Section A

> Answer ALL questions.

1. Define Reynolds number. [2]

2. Explain induced drag. [5]

[MCQ]
Which of the following is dimensionless? [1]
A. Lift
B. Reynolds number
C. Velocity
D. Density

3. Explain the following:
- Ground effect
- Induced velocity
- Tip loss

---
```

### Syntax reference

| Syntax                                | Result                            |
| ------------------------------------- | --------------------------------- |
| `# Section A`                         | Section heading                   |
| `[SECTION A]`                         | Alternative section heading       |
| `> Answer ALL questions.`             | Unnumbered instruction            |
| `[INSTRUCTION] Answer ALL questions.` | Explicit unnumbered instruction   |
| `1. Question text`                    | Numbered question                 |
| `[5]` or `{5}`                        | Marks assigned to a question      |
| `[MCQ]`                               | Starts a multiple-choice question |
| `A. Option text`                      | MCQ option                        |
| `- Sub-point`                         | Bulleted sub-point                |
| `---`                                 | Horizontal separator              |

Typed question numbers are normalized automatically. A standalone sentence outside a question block remains unnumbered, making it suitable for section instructions.

## PDF and Word output

Use **Print / Save PDF** when the final page layout must match the preview closely.

Use **Download DOCX** when the paper needs further editing in Microsoft Word. Word may paginate the document differently from the browser preview.

## Privacy

Question content and imported logos remain in the browser. They are not uploaded to a server.

The current draft is stored locally in the browser so it can be restored when the website is reopened.

## Creator

Created by [Cibin Joseph](https://github.com/cibinjoseph).
