/*
 * scripts/examples/indesign/verify-example.jsx — run inside InDesign by
 * verify-indesign.ts. Opens ONE assembled example, records what InDesign
 * makes of it, exports a PDF and re-saves it as IDML, then closes without
 * saving. Everything is written to $.global.VERIFY_OUT/result.json; the
 * caller judges the run by that file, never by the AppleScript reply.
 *
 * Globals set by the caller's shim: VERIFY_IDML (path), VERIFY_OUT (dir).
 */
(function () {
    var out = Folder(String($.global.VERIFY_OUT));
    var result = { ok: false, version: app.version, errors: [] };

    function json(v) {
        if (v === null || v === undefined) return 'null';
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (typeof v === 'string') {
            var esc = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            // Every control character, not just CR/LF: InDesign error strings
            // and names can carry tabs.
            esc = esc.replace(/[\u0000-\u001f]/g, function (c) {
                return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
            });
            return '"' + esc + '"';
        }
        if (v instanceof Array) {
            var a = [];
            for (var i = 0; i < v.length; i++) a.push(json(v[i]));
            return '[' + a.join(',') + ']';
        }
        var parts = [];
        for (var k in v) if (v.hasOwnProperty(k)) parts.push(json(k) + ':' + json(v[k]));
        return '{' + parts.join(',') + '}';
    }
    function write() {
        var f = File(out.fsName + '/result.json');
        f.encoding = 'UTF-8';
        f.open('w');
        f.write(json(result));
        f.close();
    }

    // Localised names of the High Quality Print preset (InDesign 20.x).
    var PRESETS = ['[High Quality Print]', '[Qualitativ hochwertiger Druck]', '[Calidad de impresión alta]', '[Qualité supérieure]', '[高品質印刷]'];

    var doc = null;
    try {
        // Alerts are suppressed but not fatal: a missing font or link is
        // recorded below instead of aborting the open.
        app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
        doc = app.open(File(String($.global.VERIFY_IDML)), false);

        result.pages = doc.pages.length;
        result.stories = doc.stories.length;
        result.spreads = doc.spreads.length;
        result.hyperlinks = doc.hyperlinks.length;
        // InDesign's own paragraph count: the arbiter of where a paragraph
        // ends (a <Br/> does, a forced line break does not).
        result.paragraphs = 0;
        for (var ps = 0; ps < doc.stories.length; ps++) result.paragraphs += doc.stories[ps].paragraphs.length;
        result.overset = [];
        for (var s = 0; s < doc.stories.length; s++) {
            if (doc.stories[s].overflows) result.overset.push(doc.stories[s].id);
        }
        result.missingFonts = [];
        for (var f = 0; f < doc.fonts.length; f++) {
            var font = doc.fonts[f];
            if (font.status !== FontStatus.INSTALLED) result.missingFonts.push(font.name);
        }
        result.missingLinks = [];
        for (var l = 0; l < doc.links.length; l++) {
            if (doc.links[l].status === LinkStatus.LINK_MISSING) result.missingLinks.push(doc.links[l].name);
        }

        var preset = null;
        for (var p = 0; p < PRESETS.length; p++) {
            var c = app.pdfExportPresets.itemByName(PRESETS[p]);
            if (c.isValid) { preset = c; result.preset = PRESETS[p]; break; }
        }
        if (preset === null) throw new Error('no High Quality Print preset found');
        doc.exportFile(ExportFormat.PDF_TYPE, File(out.fsName + '/indesign.pdf'), false, preset);

        // Proof that InDesign accepts the file: it re-saves it as IDML.
        doc.exportFile(ExportFormat.INDESIGN_MARKUP, File(out.fsName + '/roundtrip.idml'), false);
        result.roundTrip = File(out.fsName + '/roundtrip.idml').exists;
        result.ok = true;
    } catch (e) {
        result.errors.push(String(e));
    }
    try {
        if (doc !== null) doc.close(SaveOptions.NO);
    } catch (e2) {
        result.errors.push('close: ' + e2);
    }
    write();
})();
