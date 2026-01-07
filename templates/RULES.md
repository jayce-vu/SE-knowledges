## Rules (generation)

### Content rules

- **One idea per post**: Keep the scope narrow and actionable.
- **Make it reproducible**: Prefer commands/snippets that can be copied and run.
- **State constraints early**: OS, versions, assumptions, and trade-offs.
- **Use headings**: `##` sections for scannability.
- **Add references**: Link specs, RFCs, docs, or source code.

### Language rules (EN/VI)

- **Keep both versions aligned**: Same structure and section order where possible.
- **Use `pair_id`**: If a post has two languages, both files must share the same `pair_id`.
- **Allow divergence when needed**: It’s OK if examples differ (e.g. localized output), but keep the core idea consistent.

### File & metadata rules

- **English posts** go to `_en_posts/`
- **Vietnamese posts** go to `_vi_posts/`
- **Required front matter**: `title`, `date`, `tags`, `summary`
- **Recommended**: `pair_id` for cross-linking

### Naming rules

- **Filename**: `your-topic.md` (kebab-case), stable and descriptive.
- **Tags**: lowercase, short, consistent.

### Review checklist

- [ ] Title clearly matches content
- [ ] Summary is 1–2 lines and accurate
- [ ] Snippets compile/run (if applicable)
- [ ] Links work
- [ ] (If bilingual) `pair_id` matches and both posts exist

