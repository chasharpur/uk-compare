var left_id = "d1";
var right_id = "a1";
function reload_page() {
    document.getElementById("change_lhs").addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) 
            return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
            document.getElementById("lhs_body").innerHTML = contents; 
            set_local_storage("lhs_html",contents);
        };
        reader.readAsText(file);
    });
    document.getElementById("change_rhs").addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) 
            return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
            document.getElementById("rhs_body").innerHTML = contents; 
            set_local_storage("rhs_html",contents);
        };
        reader.readAsText(file);
    });
    document.getElementById("align_left").addEventListener('click', function(event) {
        let selection = document.getSelection();
        if (selection.rangeCount > 0) {
            wrap_selection(selection,"aligned",left_id);
            left_id = next_alignment_id(left_id);
        }        
    });
    document.getElementById("align_right").addEventListener('click', function(event) {
        let selection = document.getSelection();
        if (selection.rangeCount > 0) {
            wrap_selection(selection,"aligned",right_id);
            right_id = next_alignment_id(right_id);
        } 
    }); 
    document.getElementById("transpose_left").addEventListener('click', function(event) {
        let selection = document.getSelection();
        if (selection.rangeCount > 0) {
            const firstRange = selection.getRangeAt(0);
            console.log( firstRange );
        }        
    });
    document.getElementById("transpose_right").addEventListener('click', function(event) {
        let selection = document.getSelection();
        if (selection.rangeCount > 0) {
            const firstRange = selection.getRangeAt(0);
            console.log( firstRange );
        }  
    });
    document.getElementById("undo").addEventListener('click', function(event) {
        let l_num = Number.parseInt(left_id.slice(1));
        let r_num = Number.parseInt(right_id.slice(1));
        if ( l_num > r_num ) {
            l_num--;
            left_id = 'd'+l_num;
            undo_wrap('d'+l_num);
        }
        else if ( r_num > l_num ) {
            r_num--;
            right_id = 'a'+r_num;
            undo_wrap('a'+r_num);
        }
        else {
            lnum--;
            r_num--;
            right_id = 'a'+r_num;
            left_id = 'd'+l_num;
            undo_wrap('d'+l_num);
            undo_wrap('a'+r_num);
        }
    });
    change_sample();
    let lhs_html = get_local_storage("lhs_html");
    let rhs_html = get_local_storage("rhs_html");
    if ( lhs_html != null ) 
        document.getElementById("lhs_body").innerHTML = lhs_html; 
    if ( rhs_html != null )
        document.getElementById("rhs_body").innerHTML = rhs_html; 
}
/**
 * Low-level method to load json from site
 * @param file the relative file path to load
 */
async function load_user_json(file) {
  try {
    const response = await fetch(file);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let data = await response.json();
    return data;
  } catch (error) {
    console.error("Could not fetch the JSON file:", error);
    return null;
  }
}
/**
 * Low-level method to load html text from the site
 * @param file the relative file path to load
 */
async function load_user_html(file) {
  try {
    const response = await fetch(file);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let data = await response.text();
    return data;
  } catch (error) {
    console.error("Could not fetch the HTML file:", error);
    return null;
  }
}
/**
 * Compute the next alignment id, left or right
 * @param id a123 or d123
 * @return a string being e.g. a124 or d124 
 */
function next_alignment_id(id) {
    let num = Number.parseInt(id.slice(1))+1;
    return id.slice(0,1)+num;
}
/**
 * Load the default style sheet inline
 */
async function set_sample_css() {
	// sample menu already set to saved value
	let sample = document.getElementById("sample").value;
	let sample_css = document.getElementById("sample_css");
	// clear out the existing sample css, if any
	if ( sample_css != null )
		sample_css.remove();
	let css_url = "./samples/"+sample+"/default.css";
	let css = await load_user_html(css_url);
	let style = document.createElement("style");
	style.setAttribute("id","sample_css");
	style.innerHTML = css;
	document.head.appendChild(style);
}
function get_local_storage(key) {
	let value = localStorage.getItem(key);
	if ( value == "null" || value == "" )
		return null;
	else
		return value;
}
function set_local_storage(key,value) {
	localStorage.setItem(key,value);
}
/**
 * Populate the top level sample index
 */
async function populate_sample_index(){
	// top_level is a JSON array of strings
	let top_level = await load_user_json('./samples/index.json');
	if ( top_level.length > 0 ) {
		// get sample menu
		let select = document.getElementById("sample");
		// clear it out
		while (select.firstChild)
    		select.removeChild(select.lastChild);
		let sample_set = get_local_storage('sample_set');
		// append all the defined top-level samples
		for ( let name of top_level ) {
			let opt = document.createElement('option');
			opt.textContent = name;
			if ( sample_set != null && sample_set == name )
				opt.selected = "selected";
			select.appendChild(opt);
		}
		// set default
		if ( sample_set == null )
			localStorage.setItem('sample_set',top_level[0]);
	}
}
/**
 * The user changed the sample index menu
 * *** NB: invoked by GUI only ***
 */
async function change_sample() {
	await populate_sample_index();
	await set_sample_css();
}