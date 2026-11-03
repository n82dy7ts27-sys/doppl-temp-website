# Website copy handoff

`lib/site-copy.json` holds website wording under stable content IDs. Edit this JSON directly, or use `scripts/copy-deck.py` to export and re-import a Word document.

## Export for a writer

Use Python 3 with `python-docx` installed. From the project root:

```sh
mkdir -p copy-handoff
python3 scripts/copy-deck.py export copy-handoff/Doppl-website-copy.docx
```

The export creates the Word document and a matching `.baseline.json`. Send the Word document to the writer and keep the baseline unchanged. Export will not replace either file unless `--overwrite` is supplied.

Ask the writer to edit the text inside each content block, preserving the grey COPY ID and placeholders such as `{year}`, `{title}` and `%s`. Keep text in its original block and accept tracked changes before returning the document. Comments are not imported, and Word styling does not alter website styling. Exported copy includes shared labels, metadata and secondary routes; homepage content uses `home.*` and `production.*` IDs.

## Import and review

```sh
python3 scripts/copy-deck.py import copy-handoff/returned-copy.docx \
  --baseline copy-handoff/Doppl-website-copy.baseline.json
```

This shows a wording diff without changing the site. Review it, then repeat with `--apply` to update `lib/site-copy.json`. Preview the result and build before publishing. Importing does not deploy the website.

The importer rejects missing, extra, duplicate or altered IDs; invalid placeholders; unaccepted tracked changes; unsupported block structures; and conflicts with copy changed since export. It preserves Unicode and line breaks. Only the three optional decorative fields `difference.fieldHuman`, `difference.fieldGenerative` and `difference.fieldCaption` may be empty.

After an import, make a fresh export for the next editing round. Keep the original baseline intact for its matching document.
