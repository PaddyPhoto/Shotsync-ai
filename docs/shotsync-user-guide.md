# ShotSync.ai — User Guide
### For Brand & Ecommerce Coordinators

---

## Table of Contents

1. [Overview](#overview)
2. [Step 1 — Brand Setup](#step-1--brand-setup)
3. [Step 2 — Upload](#step-2--upload)
4. [Step 3 — Review](#step-3--review)
5. [Step 4 — Export](#step-4--export)
6. [Tips & Best Practices](#tips--best-practices)
7. [Glossary](#glossary)

---

## Overview

ShotSync.ai is a post-production workflow tool for fashion and ecommerce teams. It takes your raw shoot files, groups them into product looks, matches them to your style list, and exports them with marketplace-ready filenames — all in one place.

**The core workflow is four steps:**

```
Brand Setup → Upload → Review → Export
```

Brand setup is a one-time configuration. Once it's done, your day-to-day workflow is Upload → Review → Export.

![Overview — ShotSync.ai dashboard showing the four-step workflow](images/01-dashboard-overview.png)
_The ShotSync.ai dashboard. Recent jobs, marketplace status, and quick actions are visible at a glance._

---

## Step 1 — Brand Setup

> **Where:** Settings → Brands

Brand setup tells ShotSync.ai how your files should be named when exported. You only need to do this once per brand.

### 1.1 Create a Brand

1. Go to **Settings** in the left sidebar.
2. Click the **Brands** tab.
3. Click **New Brand**.
4. Enter your brand name (e.g. `My Brand`).
5. Enter a short brand code (e.g. `MB`) — this is used in filenames.

![Brand setup — creating a new brand](images/02-settings-brands.png)
_The Brands tab in Settings. Each brand has its own naming template and angle sequences._

### 1.2 Set Your Naming Template

The naming template defines the structure of your exported filenames. It uses tokens — placeholders that get replaced with real values at export time.

**Available tokens:**

| Token | What it produces | Example |
|---|---|---|
| `{BRAND}` | Brand code | `MB` |
| `{SKU}` | Product SKU | `NS27502` |
| `{COLOR}` | Colour name | `BLACK` |
| `{COLOUR_CODE}` | Colour code | `062` |
| `{STYLE_NUMBER}` | Style number | `05324` |
| `{VIEW}` | Shot angle | `FRONT` |
| `{SEQ}` | Look sequence number | `001` |
| `{INDEX}` | Image number within a look | `01` |
| `{SEASON}` | Season code | `SS25` |
| `{SUPPLIER_CODE}` | Supplier code | `PR` |
| `{CUSTOM_TEXT}` | Fixed text you define | `WEB` |

**Example templates and their output:**

| Template | Output filename |
|---|---|
| `{SKU}_{COLOR}_{VIEW}` | `NS27502_BLACK_FRONT.jpg` |
| `{BRAND}_{SKU}_{COLOR}_{VIEW}` | `MB_NS27502_BLACK_FRONT.jpg` |
| `{SKU}_{VIEW}_{INDEX}` | `NS27502_FRONT_01.jpg` |

**To build your template:** Click the token buttons to add them in order. Tokens are joined with underscores automatically. Click an active token to remove it.

> **Note:** If a token has no value (e.g. no colour was entered for a cluster), it is automatically dropped from the filename — no double underscores will appear.

![Naming template builder — token chips](images/03-naming-template.png)
_Click tokens to build your naming pattern. The live preview below shows an example filename._

### 1.3 Marketplace Naming Rules

> **Where:** Settings → Marketplaces

Each marketplace (Shopify, THE ICONIC, David Jones, Myer) can have its own naming template that overrides your brand default.

- If a marketplace has no custom template set, it uses your brand's default template.
- You can customise each marketplace independently to meet their specific requirements.

![Marketplace naming rules](images/04-settings-marketplaces.png)
_Each marketplace card has its own naming template. Changes here override the brand default for that marketplace only._

### 1.4 Still Life Angle Sequences (Accessories)

> **Where:** Settings → Brands → scroll to Still Life Angle Sequences

If you shoot accessories (shoes, bags, jewellery, etc.), you can define a custom angle sequence per accessory category. This controls the order in which angles are assigned to images within a cluster.

For example, for **Shoes** you might set: `Front → Side → Back → Detail → Top Down`

- Click the category name to expand its sequence editor.
- Use ▲ ▼ to reorder angles.
- Use × to remove an angle.
- Use **+ Add angle** to add more.
- Click **Reset** to restore the default sequence for that category.

![Still life angle sequences per accessory category](images/05-still-life-sequences.png)
_Each accessory category has its own collapsible sequence editor. The order here determines how angles are assigned to images in a cluster._

---

## Step 2 — Upload

> **Where:** Dashboard → Upload (or click **New Job** in the sidebar)

![Upload page — job configuration](images/06-upload-page.png)
_The Upload page. Configure your job before dropping in images._

### 2.1 Configure Your Job

**Job Name**
Give the job a name — typically your shoot date or campaign name (e.g. `SS25 Campaign A`).

**Shoot Type**
Choose the type of shoot you're uploading:

- **On-Model** — clothing on a model. ShotSync.ai will assign angles (Full Length, Front, Side, Back, Detail, Mood) based on position in the file sequence.
- **Still Life** — product photography without a model. Choose a sub-type:
  - **Ghost Mannequin** — clothing on an invisible ghost mannequin. Angles: Front, Back.
  - **Accessories** — shoes, bags, jewellery, and other accessories. Angles: Front, Side, Detail, Back, Inside. AI will automatically identify the specific accessory type per cluster on the review page.

![Shoot type selector — On-Model vs Still Life](images/07-shoot-type.png)
_Select On-Model or Still Life. For Still Life, a second selector appears for Ghost Mannequin or Accessories._

**Images per Look**
Set how many images make up one complete product look (e.g. if each product has 5 shots, set this to 5). ShotSync.ai uses this number to group your images into clusters — it splits the uploaded files sequentially into groups of this size.

> **Tip:** Sort your images consistently before uploading. ShotSync.ai groups files in alphabetical/numeric order — the same order your camera roll produces. Make sure all 5 shots for Product 1 come before all shots for Product 2.

### 2.2 Import Your Style List (Optional but Recommended)

Upload your brand's range list to automatically populate SKU, product name, colour, colour code, and style number for each cluster.

**Supported formats:** `.xlsx`, `.xls`, `.csv`

**How matching works:** ShotSync.ai looks at each image filename in a cluster. If the filename contains a SKU from your spreadsheet, it assigns that SKU and its associated data to the cluster automatically.

For this to work reliably, **include the SKU in your image filenames** when shooting (e.g. `NS27502_BLACK_FRONT.jpg`).

![Style list import](images/08-style-list.png)
_Once imported, the style list shows how many styles and colour variants were found._

**Expected columns in your spreadsheet:**

| Column | Required | Notes |
|---|---|---|
| SKU | Yes | Must appear in filenames |
| Product Name | No | Auto-fills product name |
| Colour | No | Auto-fills colour field |
| Colour Code | No | Auto-fills colour code |
| Style Number | No | Auto-fills style number |

### 2.3 Select Your Marketplaces

Choose which marketplaces you're preparing files for (Shopify, THE ICONIC, David Jones, Myer). This selection determines which naming rules and required angle checks are applied at export.

### 2.4 Upload Your Images

Drag and drop your images (or click to browse). Supported formats: `.jpg`, `.jpeg`, `.png`.

Once uploaded, click **Process** to begin grouping.

![Image upload drop zone](images/09-image-upload.png)
_Drag and drop your shoot images. Files are sorted alphabetically before grouping._

---

## Step 3 — Review

> **Where:** Dashboard → Review

This is where you verify and refine your clusters before export.

![Review page — clusters overview](images/10-review-clusters.png)
_The Review page showing grouped clusters. Each card represents one product look._

### 3.1 What You'll See

Each cluster represents one product look. It shows:
- The images grouped together with their angle labels
- The SKU, colour, and other metadata fields
- A Confirm button

**Still Life — Accessories:** ShotSync.ai will automatically use AI to identify the specific accessory type (shoes, bags, jewellery, etc.) for each cluster and apply the correct angle sequence. This happens in the background when the review page loads — you'll see a brief "detecting…" indicator on each cluster.

![AI detecting accessory category on a cluster](images/11-ai-detecting.png)
_The "detecting…" indicator shows the AI is identifying the accessory type. It updates the category dropdown and angle sequence automatically._

### 3.2 Editing Cluster Details

Each cluster has editable fields:

- **SKU** — the product identifier. Type directly, or use the search/dropdown if a style list was imported.
- **Colour** — the colour name that appears in the filename (e.g. `BLACK`, `NAVY`).
- **Colour Code** — a numeric or alphanumeric code (e.g. `062`).
- **Style #** — the internal style number.

> These fields feed the naming template tokens. Empty fields are simply omitted from the filename.

![Cluster detail fields — SKU, colour, style number](images/12-cluster-fields.png)
_Cluster fields auto-fill from the style list when a SKU match is found. All fields are editable._

### 3.3 Editing Image Angles

Each image in a cluster has an angle label. If the automatic assignment is wrong:
- Click the angle label on an image to change it via the dropdown.
- Images within a cluster can be reordered by dragging.

![Angle label dropdown on an image](images/13-angle-dropdown.png)
_Click an image's angle label to change it. Drag images to reorder them within the cluster._

### 3.4 Accessory Category

For still-life clusters, a category dropdown appears at the top of the cluster. The AI will pre-select this, but you can manually change it if needed. Changing the category immediately re-applies the correct angle sequence for that accessory type.

![Accessory category dropdown on a cluster](images/14-accessory-category.png)
_The category dropdown on a still-life cluster. Changing it immediately updates the angle sequence._

### 3.5 Missing Shots Warning

If a cluster is missing shots required by your selected marketplaces, a warning indicator will appear. This is informational — you can still export, but the marketplace may reject or flag the listing.

![Missing shots warning on a cluster](images/15-missing-shots.png)
_A warning appears listing which required angles are absent for each marketplace._

### 3.6 Confirming Clusters

Once you're happy with a cluster, click the **Confirm** button. Only confirmed clusters are included in the export.

Use **Confirm all** (top right) to confirm every cluster at once if everything looks correct.

![Confirming a cluster and the Confirm all button](images/16-confirm-cluster.png)
_Click Confirm on individual clusters, or use Confirm all to confirm everything at once. The counter in the top bar tracks progress._

---

## Step 4 — Export

> **Where:** Review page → click **Export** button (top right)

![Export panel](images/17-export-panel.png)
_The Export panel showing confirmed clusters, marketplace breakdown, and download options._

### 4.1 Export as ZIP

The default export method. ShotSync.ai packages all confirmed clusters into a ZIP file, organised into folders per marketplace.

**Folder structure inside the ZIP:**
```
JobName_Export.zip
├── Shopify/
│   ├── NS27502_BLACK_FRONT.jpg
│   ├── NS27502_BLACK_BACK.jpg
│   └── ...
├── THE ICONIC/
│   ├── NS27502_BLACK_F.jpg
│   └── ...
└── David Jones/
    └── ...
```

Each marketplace folder contains images named according to that marketplace's naming template.

### 4.2 Export to Folder (Chrome / Edge only)

If you're on Chrome or Edge, you can export directly to a folder on your computer instead of a ZIP. Click **Choose Folder**, select a destination, then click **Export**.

### 4.3 Flat Export

Toggle **Flat export** if you want all files in a single folder with no marketplace subfolders. Useful when exporting for a single marketplace only.

### 4.4 Shopify Direct Upload

If your brand has Shopify connected (Settings → Integrations — coming soon), you can upload images directly to your Shopify product listings without downloading a ZIP.

---

## Tips & Best Practices

**Naming your images before the shoot**
The cleaner and more consistent your filenames, the better the auto-matching works. Recommended convention:
```
[SKU]_[COLOR]_[ANGLE].jpg
e.g.  NS27502_BLACK_FRONT.jpg
```

**Images per Look — get it right**
This is the most important setting. If you set it to 5 but some products have 4 and some have 6, clusters will be uneven. Either:
- Shoot the same number of angles for every product, or
- Use the review page to manually split or merge clusters that are off.

**Style list column headers**
ShotSync.ai looks for these exact column names (case-insensitive):
`SKU`, `Style Name` or `Product Name`, `Colour`, `Colour Code`, `Style Number`

If your spreadsheet uses different names, rename the column headers before importing.

**Confirming before export**
Only confirmed clusters are exported. If you click Export and nothing downloads, check that at least one cluster is confirmed.

**Accessory shoots — mixed types in one job**
If your accessories batch includes both shoes and bags in the same upload, that's fine — AI will classify each cluster individually. Make sure your "Images per Look" is consistent across all products in the batch.

---

## Glossary

| Term | Definition |
|---|---|
| **Cluster** | A group of images representing one product look or SKU |
| **Look** | One complete set of shots for a single product (same as a cluster) |
| **Naming template** | The pattern used to name exported files, built from tokens |
| **Token** | A placeholder like `{SKU}` or `{VIEW}` that gets replaced with real data at export |
| **Style list** | A spreadsheet (.xlsx or .csv) containing your product range data |
| **Angle / View** | The shot type — e.g. Front, Back, Side, Detail, Full Length |
| **Shoot type** | On-Model or Still Life — determines how angles are assigned |
| **Still Life type** | Ghost Mannequin or Accessories — sub-type of still life shoots |
| **Confirm** | Marking a cluster as ready for export |
| **Marketplace rules** | Per-marketplace settings for naming templates and required angles |
