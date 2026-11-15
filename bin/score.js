
async function load_page() {
	document.getElementById("computed_file").addEventListener("change",async (event) =>{
        const file = event.target.files[0];
        let output = document.getElementById("computed_json");
        if (!file) return;
        try {
        const text = await file.text();
        output.textContent = text;
        } catch (error) {
        console.error('Error reading file:', error);
        }
    });
    document.getElementById("reference_file").addEventListener("change",async (event) =>{
        const file = event.target.files[0];
        let output = document.getElementById("reference_json");
        if (!file) return;
        try {
        const text = await file.text();
        output.textContent = text;
        } catch (error) {
        console.error('Error reading file:', error);
        }
    });
    document.getElementById("score_button").addEventListener("click",(event)=>{
        let success = false;
        let ref_textarea = document.getElementById("reference_json");
        let comp_textarea = document.getElementById("computed_json");
        if (ref_textarea.textContent.length==0 || comp_textarea.textContent.length==0 )
            alert( "load json into each box first");
        else {
            try {
                let ref_json = JSON.parse(ref_textarea.textContent);
                let comp_json = JSON.parse(comp_textarea.textContent);
                if ( !Object.hasOwn(ref_json, "sample")|| !Object.hasOwn(comp_json,"sample") )
                    alert("alignment sets must come from a sample set");
                else {
                    if ( ref_json.sample != comp_json.sample ) 
                        alert("alignment sets not from the same sample");
                    else {
                        if ( ref_json.lhs != comp_json.lhs || ref_json.rhs != comp_json.rhs )
                            alert("lhs and rhs don't match")
                        else {
                            let comp = {};
                            let ref = {};
                            let E = 0;  // error count
                            let C = 0;  // correct alignment count
                            for ( const a of comp_json.similarities ) {
                                let end = a.start1+a.text.length;
                                for ( let i = a.start1,j=a.start2; i<end; i++,j++ )
                                    comp[i.toString()] = j;
                            }
                            for ( const b of ref_json.similarities ) {
                                let end = b.start1+b.text.length;
                                for ( let i = b.start1,j=b.start2; i<end; i++,j++ )
                                    ref[i.toString()] = j;
                            }
                            // so now we have 2 objects, ref and comp, indexed by 
                            // the offsets of the aligned characters
                            let R = Object.keys(ref).length;    // ref alignment count
                            for ( const key in Object.keys(comp) ) {
                                if ( Object.hasOwn(ref,key) && ref[key] == comp[key] )
                                    C++;
                                else
                                    E++;
                            }
                            let score = 100*(C-E)/R;
                            document.getElementById("score_value").value = score.toFixed(2)+'%';
                            success = true;
                        }
                    }
                }
                if (!success)
                    document.getElementById("score_value").textContent = "";
            }
            catch ( error ) {
                alert("not json: "+error);
            }
        }
    });
    document.getElementById("score_value").value="";
}
// add event listeners for page - necessary here since this is now a module
window.addEventListener("load", load_page);