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
