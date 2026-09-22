# Question Paper Maker

Question Paper Maker is a completely static question-paper formatting tool built with HTML, CSS and vanilla JavaScript.

It is designed for educators who already have their questions and want to turn them into a clean, consistent, print-ready examination paper.

## Features

- Live A4 preview
- Automatic pagination with a multi-page A4 preview
- Toggle between stacked and side-by-side editor/preview layouts
- Institution and exam metadata
- Independent visibility switches for major header rows
- Optional institution logo
- Optional student information row
- Individually selectable Name, Roll No., Date and Signature fields
- Section headings
- Consistent question numbering
- Right-aligned marks using `[5]` or `{5}`
- MCQ formatting
- Bulleted sub-points
- Calculated mark total and mismatch warning
- Font, spacing and margin controls
- Optional watermark
- Local autosave using `localStorage`
- Export/import papers as JSON
- Editable Microsoft Word (`.docx`) export
- Browser Print / Save as PDF
- No backend, login, database or external network dependency
- Static About page
- Search-engine metadata and structured data

## Run locally

You can simply double-click `index.html`.

For the closest behaviour to a hosted site:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Question syntax

```text
# Section A

Answer ALL questions.

1. Define Reynolds number. [2]

2. Explain induced drag. [5]

[MCQ]
Which quantity is dimensionless? [1]
A. Lift
B. Reynolds number
C. Velocity
D. Density

- Optional sub-point
- Another sub-point

---
```

### Syntax rules

- `# Section A` creates a centered section heading.
- `[SECTION A]` also creates a section heading.
- A standalone unnumbered line is formatted as an unnumbered instruction.
- `> Answer ALL questions` or `[INSTRUCTION] Answer ALL questions` explicitly creates an unnumbered instruction.
- `[5]` or `{5}` at the end of a question sets marks.
- `[MCQ]` starts an MCQ block.
- `A.`, `B.`, `C.` etc. become MCQ options.
- `- item` becomes an indented bullet under the current question.
- `---` inserts a separator line.
- Blank lines end the current question.
- Typed question numbers are removed and normalized automatically.

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files in this folder.
3. Open the repository **Settings**.
4. Go to **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Choose the default branch, usually `main`, and the `/root` folder.
7. Save.

GitHub will provide the public URL.

## Search-engine setup

The HTML already contains:

- descriptive page titles and meta descriptions
- crawlable explanatory content
- semantic headings
- internal navigation
- Open Graph and Twitter metadata
- `WebApplication` and `AboutPage` structured data
- absolute canonical and Open Graph URLs
- `robots.txt`
- `sitemap.xml`

The search metadata is configured for:

`https://cibinjoseph.github.io/question-paper-maker/`

You can submit `sitemap.xml` to Google Search Console and Bing Webmaster Tools for faster discovery.

## Privacy

Everything runs in the browser. The app does not send question content to a server.

The last paper is stored in the browser's `localStorage`. Imported logos are stored there as data URLs as part of the saved draft.

## PDF output

Use **Print / Save PDF**.

Recommended browser print settings:

- Paper size: A4
- Scale: 100%
- Browser headers and footers: Off

## DOCX output

Use **Download DOCX** to create an editable Microsoft Word document directly in the browser. Word controls its own pagination, so the DOCX may not break at exactly the same locations as the browser's A4 preview. Use PDF when exact visual output is required.

DOCX generation uses the bundled [`docx`](https://github.com/dolanmiu/docx) library under the MIT License. Its license is included in `vendor/docx-LICENSE.txt`.

## Notes

Browser print engines control final pagination. Individual question blocks use `break-inside: avoid`, so modern browsers will usually keep each question together where possible.
