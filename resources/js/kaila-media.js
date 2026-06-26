export async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
    });
}

export async function readFilesAsAttachments(fileList, max = 6) {
    const files = Array.from(fileList || []).slice(0, max);
    const attachments = [];
    for (const file of files) {
        attachments.push({
            name: file.name,
            dataUrl: await fileToDataUrl(file),
        });
    }
    return attachments;
}

export function renderAttachments(items = []) {
    if (!items?.length) return "";
    return `<div class="kaila-media-grid">${items.map((item) => {
        const mime = String(item.mimeType || item.mime_type || "");
        if (mime.startsWith("video/")) {
            return `<video class="kaila-media-item" controls src="${item.url}"></video>`;
        }
        return `<a class="kaila-media-item" href="${item.url}" target="_blank" rel="noopener"><img src="${item.url}" alt="${item.originalName || "attachment"}"></a>`;
    }).join("")}</div>`;
}

export function mediaUploadField(name = "attachments", accept = "image/jpeg,image/png,image/webp,video/mp4,video/webm") {
    return `
        <div class="kaila-field">
            <label>Add photos or video</label>
            <input class="kaila-input" type="file" name="${name}" accept="${accept}" multiple data-media-input>
            <p class="kaila-field-hint">JPG, PNG, WebP, MP4, or WebM up to 10 MB each.</p>
        </div>`;
}

export async function attachmentsFromForm(form, fieldName = "attachments") {
    const input = form.querySelector(`[name="${fieldName}"]`) || form.querySelector("[data-media-input]");
    if (!input?.files?.length) return [];
    return readFilesAsAttachments(input.files, Number(input.dataset.max || 6));
}
