# SE-knowledges

A bilingual (EN/VI) technical knowledge base built for **GitHub Pages** using **Jekyll**.

## How it works

- **English posts**: `_en_posts/`
- **Vietnamese posts**: `_vi_posts/`
- **Language homepages**: `en/index.md`, `vi/index.md`
- **Cross-language linking**: set the same `pair_id` in both EN and VI posts

## Write a new post (rules + templates)

- **Rules**: `templates/RULES.md`
- **Templates**:
  - `templates/POST_TEMPLATE.en.md`
  - `templates/POST_TEMPLATE.vi.md`

### Minimal front matter (required)

```yaml
---
title: "..."
date: YYYY-MM-DD
tags: [tag1, tag2]
summary: "1–2 lines..."
pair_id: optional-shared-id
---
```

## Local development

```bash
bundle install
bundle exec jekyll serve
```

Then open the local URL printed by Jekyll (usually `http://127.0.0.1:4000`).

## CI/CD (GitHub Actions)

- **CI build-check** on Pull Requests: `.github/workflows/ci.yml`
- **Deploy to GitHub Pages** on push to `main`: `.github/workflows/pages.yml`

## Enable GitHub Pages

In GitHub repo settings:

- **Settings → Pages**
- **Build and deployment**: choose **GitHub Actions**
