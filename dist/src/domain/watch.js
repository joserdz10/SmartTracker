export function createWatch(input) {
    const normalized = input.query.trim().replace(/\s+/g, " ");
    if (normalized.length < 2)
        throw new Error("El watch necesita un nombre o tema válido.");
    const id = `${input.scopeCode}-${slug(normalized)}-${input.now.slice(0, 10)}`;
    return { ...input, query: normalized, id, active: true, createdAt: input.now };
}
function slug(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 32);
}
