/*
Copyright (C) [2026]  [Desmond Mackie]

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://gnu.org>.
*/
function load_page() {
    let ht = window.innerHeight;
    ht -= (document.getElementById("head").offsetHeight+16);
    document.getElementById("container").style.height=ht+"px";
    document.getElementById("score").addEventListener("click",(event)=>{
        window.location.href = "./html/score.html";
    });;
    document.getElementById("align").addEventListener("click",(event)=>{
        window.location.href = "./html/align.html";
    });;
    document.getElementById("edit").addEventListener("click",(event)=>{
        window.location.href = "./html/manual.html";
    });;
}
// add event listeners for page - necessary here since this is now a module
window.addEventListener("load", load_page);
