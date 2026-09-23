export const SCOPES = [
    { code: "AGU", name: "Aguascalientes" },
    { code: "BCN", name: "Baja California" },
    { code: "BCS", name: "Baja California Sur" },
    { code: "CAM", name: "Campeche" },
    { code: "CHP", name: "Chiapas" },
    { code: "CHH", name: "Chihuahua" },
    { code: "CMX", name: "Ciudad de México" },
    { code: "COA", name: "Coahuila" },
    { code: "COL", name: "Colima" },
    { code: "DUR", name: "Durango" },
    { code: "GUA", name: "Guanajuato" },
    { code: "GRO", name: "Guerrero" },
    { code: "HID", name: "Hidalgo" },
    { code: "JAL", name: "Jalisco" },
    { code: "MEX", name: "Estado de México" },
    { code: "MIC", name: "Michoacán" },
    { code: "MOR", name: "Morelos" },
    { code: "NAY", name: "Nayarit" },
    { code: "NLE", name: "Nuevo León" },
    { code: "OAX", name: "Oaxaca" },
    { code: "PUE", name: "Puebla" },
    { code: "QUE", name: "Querétaro" },
    { code: "ROO", name: "Quintana Roo" },
    { code: "SLP", name: "San Luis Potosí" },
    { code: "SIN", name: "Sinaloa" },
    { code: "SON", name: "Sonora" },
    { code: "TAB", name: "Tabasco" },
    { code: "TAM", name: "Tamaulipas" },
    { code: "TLA", name: "Tlaxcala" },
    { code: "VER", name: "Veracruz" },
    { code: "YUC", name: "Yucatán" },
    { code: "ZAC", name: "Zacatecas" },
    { code: "NAC", name: "Política Nacional" }
];
export function getScope(code) {
    return SCOPES.find((scope) => scope.code === code);
}
export function scopePage(page, pageSize = 8) {
    const start = Math.max(page, 0) * pageSize;
    return SCOPES.slice(start, start + pageSize);
}
export function scopePageCount(pageSize = 8) {
    return Math.ceil(SCOPES.length / pageSize);
}
