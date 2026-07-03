import { PIPE, EMPTY, dict, list, link, page, safe } from "./utils.js";
import { bracket } from "./bracket.js";
import { specContent } from "./spec.js";
import { researchContent } from "./research.js";

const HOME = `<div id="logo"><img src="ace-shot-logo.png"><br>Premium Tournament Direction<br>&amp;<br>Calcutta Auctions</div>`;
// const HOME = bracket();
const PAGES = list(`
&#127968;|Home
&#128274;|Login/Logout
&#128214;|Register
&#127942;|Tournaments
&#127933;|Players
&#128176;|Auctions
&#128506;|Roadmap
&#128270;|Research
`);

window.CONTENT = dict(`
    Home        | ${HOME}
    Login/Logout| <input placeholder="Login"><input placeholder="Password" type="password"><input type="submit" value="Login">
    Register    | <input placeholder="EMail" type="email"><input type="submit" value="Register">
    Players     | <table><tr><th>NAME (rating)</th></tr><tr><td>Kevin Long (425)</td></tr></table>
    Auctions    |
    Roadmap     | ${specContent}
    Research    | ${researchContent}
    Tournaments | ${bracket({
        players: [
            { name: "Alfred Almond.", rating: 501, seed: Math.random() },
            { name: "Barry Bogart", rating: 502, seed: Math.random() },
            { name: "Charles Carpenter", rating: 503, seed: Math.random() },
            { name: "David Dolly", rating: 504, seed: Math.random() },
            { name: "Eric Eagle", rating: 501, seed: Math.random() },
            { name: "Alfred Almond.", rating: 501, seed: Math.random() },
            { name: "Barry Bogart", rating: 502, seed: Math.random() },
            { name: "Charles Carpenter", rating: 503, seed: Math.random() },
            { name: "David Dolly", rating: 504, seed: Math.random() },
            { name: "Eric Eagle", rating: 501, seed: Math.random() },
            { name: "Alfred Almond.", rating: 501, seed: Math.random() },
            { name: "Barry Bogart", rating: 502, seed: Math.random() },
            { name: "Charles Carpenter", rating: 503, seed: Math.random() },
            { name: "David Dolly", rating: 504, seed: Math.random() },
            { name: "Eric Eagle", rating: 501, seed: Math.random() },
        ],
        sides: ["A", "B"]
    })}
`);

document.body.innerHTML = `
    <nav>
        ${PAGES.map(p => link(p, "#" + safe(p.split(PIPE)[1]))).join(EMPTY)}
        ${HOME}
    </nav>
    <content>
        ${PAGES.map(p => page(p.split(PIPE)[1])).join(EMPTY)}
    </content>
`;
