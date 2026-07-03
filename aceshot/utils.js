const NEW_LINE = "\n";
const EMPTY = "";
const PIPE = "|";


const getContent = (s) => window.CONTENT[s] ? window.CONTENT[s] : "COMING SOON";
const safe = (name) => encodeURI(name.toLowerCase());
const list = s => s.split(NEW_LINE).map(s => s.trim()).filter(s => s.length > 0);

const link = (s, h) => {
    s = s.replace("|"," ");
    h = h ? safe(h) : "#" + safe(s);
    return `<a href="${h}" class="link">${s}</a>`;
}

const dict = (s, d = PIPE) => {
    const r = {};
    const lines = list(s);
    console.log(lines);
    lines.forEach(item => {
        const parts = item.split(d);
        r[parts[0].trim()] = parts.length > 0 ? parts[1].trim() : EMPTY;
    });
    return r;
}

const page = (name) => `
    <div class="page ${safe(name)}" id="${safe(name)}">
        <div class="title">${link("&lt;&nbsp;" + name, "#app")}</div>
        ${getContent(name)}
    </div>
`;

export { getContent, safe, link, list, dict, page, NEW_LINE, EMPTY, PIPE }