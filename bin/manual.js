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
    document.getElementById("mark").addEventListener('click', function(event) {
        let sel = document.getSelection();
        if (sel.rangeCount > 0) {
            let r = sel.getRangeAt(0);
            let div_ancestor = get_ancestor(r.startContainer,"DIV");
            let i_elems = document.getElementsByTagName("I");
            let ok = true;
            for ( let i=0;i<i_elems.length;i++ ) {
                let i_elem = i_elems.item(i);
                let i_ancestor = i_ancestor = get_ancestor(i_elem);
                if ( i_ancestor == div_ancestor ) {
                    alert("clear marked text or select match");
                    ok = false;
                    break;
                }
            }
            if ( ok )
                wrap_selection(sel,"marked",null);
        }        
    }); 
    document.getElementById("align").addEventListener('click', function(event) {
        let sel = document.getSelection();
    });
    document.getElementById("transpose").addEventListener('click', function(event) {
        let sel = document.getSelection();
        if (sel.rangeCount > 0) {
            wrap_selection(sel,"mark",null);
        }        
    });
    document.getElementById("save").addEventListener('click', function(event) {
        alert("unimplemented as yet");      
    });
    change_sample();
    // reload from local storage or load afresh
    let lhs_html = get_local_storage("lhs_html");
    let rhs_html = get_local_storage("rhs_html");
    if ( lhs_html != null ) 
        document.getElementById("lhs_body").innerHTML = lhs_html; 
    if ( rhs_html != null )
        document.getElementById("rhs_body").innerHTML = rhs_html; 
}
/**
 * Get the side of the current selection
 * @param sel the current selection
 * @return "left" or "right"
 */
function get_side( sel ) {
    let r = sel.getRangeAt(0);
    let div = r.startContainer.closest("div");
    if ( div != null ) {
        let div_id = div.getAttribute("id");
        if ( div_id != null ) {
            if ( div_id == "lhs_body" )
                return "left";
            else if ( div_id == "rhs_body" )
                return "right";
        }
    }
    return null;
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
/**
 * Get the text of all elements in an array
 * @param arr the array of elements whose ids start with the same string
 */
function get_text_from_elems(arr) {
    let text = "";
    arr.sort( a,b,(a.getAttribute("id")<b.getAttribute("id")) );
    for ( let i=0;i<arr.length;i++ ) {
        text += arr[i].textContent;
    }
    return text;
}
/**
 * Get the first text node of an element
 * @param node a node possibly text or a comment
 * @return the first text node descendant of node or null
 */
function first_text_node(node) {
    if ( node.nodeType == 3 )
        return node;
    else if ( node.firstChild != null )
        return first_text_node(node.firstChild);
    else if ( node.nextSibling != null )
        return first_text_node(node.nextSibling);
    else
        return null;
}
/**
 * Get the last text node of an element
 * @param node a node possibly text or a comment
 * @return the last text node decendant of node or null
 */
function last_text_node(node) {
    if ( node.nodeType == 3 )
        return node;
    else if ( node.lastChild != null )
        return last_text_node(node.lastChild);
    else if ( node.previousSibling != null )
        return last_text_node(node.previousSibling);
    else
        return null;
}
/**
 * Get the next text node in sequence
 * @param t_node the current text node
 * @return the next text node or null if no more
 */
function next_text_node(t_node) {
    let sibling = t_node.nextSibling;
    while ( sibling != null ) {
        if ( sibling.nodeType == 3 )
            return sibling;
        else if ( sibling.nodeType == 1 )
            return first_text_node(sibling);
        else
            sibling = sibling.nextSibling;
    }
    if ( sibling == null ) {
        let parent = t_node.parent_node;
        while ( parent != null && parent.tagName != 'DIV' && parent.nextSibling == null )
            parent = parent.parent_node;
        if ( parent == null||parent.tagName == 'DIV' )
            return null;
        else
            return first_text_node(parent.nextSibling);
    }
}
/**
 * Get the previous text node in reverse sequence
 * @param t_node the current text node
 * @return the previous text node or null if no more
 */
function prev_text_node(t_node) {
    let sibling = t_node.previousSibling;
    while ( sibling != null ) {
        if ( sibling.nodeType == 3 )
            return sibling;
        else if ( sibling.nodeType == 1 )
            return last_text_node(sibling);
        else
            sibling = sibling.previousSibling;
    }
    if ( sibling == null ) {
        let parent = t_node.parent_node;
        while ( parent != null && parent.tagName != 'DIV' && parent.previousSibling == null )
            parent = parent.parent_node;
        if ( parent != null && parent.previousSibling != null && parent.tagName != 'DIV' )
            return last_text_node(parent.previousSibling);
        else
            return null;
    }
}
/**
 * Get the previous i-node or null if none
 * @param from the current i-node
 * @return the previous i-node or null
 */
function get_prev_i( from ) {
    let prev_tn = first_text_node(from);
    prev_tn = prev_text_node(prev_tn);
    while ( prev_tn != null && prev_tn.parentNode.tagName != "I" )
        prev_tn = prev_text_node(prev_tn);
    if ( prev_tn != null )
        return prev_tn.parentNode;
    else
        return null;
}
/**
 * Get the next i-node or null if none
 * @param from the current i-node
 * @return the next i-node or null
 */
function get_next_i( from ) {
    let next_tn = last_text_node(from);
    next_tn = next_text_node(next_tn);
    while ( next_tn != null && next_tn.parentNode.tagName != "I" )
        next_tn = next_text_node(next_tn);
    if ( next_tn != null )
        return next_tn.parentNode;
    else
        return null;
}
function base_id_from_id( id ) {
    const regex = /([ad][0-9]+)[a-z]+/;
    const m = id.match(regex);
    if ( m ) 
        return m[1];
    else {
        console.log("id "+id+" has wrong format");
        return id;
    }
}
/**
 * Wrap a sequence of text-nodes in i-elements
 * @param seq the array of text nodes in order
 * @param cls the class name to add
 * @param base_id the base id (minus suffix)
 */
function wrap_text_sequence( seq, cls, base_id ) {
    let id = base_id+'a';
    for ( let i=0;i<seq.length;i++ ) {
        let i_elem = document.createElement("I");
        i_elem.appendChild( seq[i] );
        i_elem.setAttribute("class",cls);
        i_elem.setAttribute(id);
        seq[i].parentNode.replaceChild(i_elem,seq[i]);
        id = increment_id( id );
    }
}
/**
 * Extract a sequence of text nodes given a string
 * @param parent the parent node of the text to search
 * @return an array of text-nodes or null if not found
 */
function get_text_sequence(parent,text) {
    let arr = [];
    let remaining = text;
    let state = 0;
    let tn = first_text_node(parent);
    while ( remaining.length > 0 ) {
        let tn_text = tn.textContent;
        switch ( state ) {
            case 0: // looking for start
                for ( let i=0;i<tn_text.length;i++ ) {
                    if ( remaining[0] == tn_text[i] ){
                        for ( let j=i,k=0;j<tn_text.length;j++ ) {
                            if ( tn_text[j] != remaining[k] )
                                break;
                        }
                        if ( k == remaining.length ) {    // woo-hoo! matched the rest of the string! 
                            let tn1 = document.createTextNode(tn_text.slice(0,i));
                            let tn2 = document.createTextNode(tn_text.slice(i,j));
                            let tn3 = document.createTextNode(tn_text.slice(j));
                            if ( tn1.textContent.length > 0 ) {
                                parentNode.replaceChild(tn1,tn);
                                tn1.after(tn2);
                                if ( tn3.textContent.length > 0 )
                                    tn2.after(tn3);
                            }
                            else {
                                parentNode.replaceChild(tn2,tn);
                                if ( tn3.textContent.length > 0 )
                                    tn2.after(tn3);
                            }
                            arr.push( tn2 );
                            return arr;
                        }
                        else if ( j == tn_text.length ) {   // prefix of remaining matches to the end of tn
                            if ( i > 0 ) {
                                let tn1 = document.createtextNode(tn_text.slice(0,i));
                                tn.parentNode.replaceChild(tn1);
                                let tn2 = document.createTextNode(tn_text.slice(i));
                                tn1.after(tn2);
                                remaining = remaining.slice(k);
                                state = 1; 
                            }
                        }
                        // keep looking in the next text node
                    }
                }
            case 1: // matching middle
                for ( let i=0;i<remaining.length && i<tn_text.length;i++ ) {
                    if ( tn_text[i] != remaining[i] ) {
                        state = 0;
                        remaining = text;
                        break;
                    }
                }
                // 1. matched all of remaining against tn_text - rare
                if ( tn_text == remaining ) {
                    arr.push(tn);
                    return arr;
                }
                // 2. matched to the end of remaining, still more tn_text to go
                else if ( tn_text.slice(0,remaining.length) == remaining ) { 
                    let tn1 = document.createTextNode(tn_text.slice(0,remaining.length));
                    let tn2 = document.createTextNode(tn_text.slice(remaining.length));
                    tn.parentNode.replaceChild(tn1,tn);
                    tn1.after(tn2);
                    arr.push(tn1);
                    return arr;
                }
                // 3. matched to the end of tn_text, more remaining to go
                else {
                    remaining = remaining.slice(tn_text.length);
                    arr.push(tn);
                }
                break;
        }
        tn = next_text_node(parent);
    }
    return null;
}
function check_selection(sel) {
    if ( sel.startContainer == sel.endContainer 
        && sel.startContainer.parentNode.tagName == "I" )
        return false;
    else {
        let tn = sel.startContainer;
        while ( tn!=null ) {
            if ( tn.parentNode.tagName == "I" ) 
                return false;
            if ( tn == sel.endContainer )
                break;
            else
                tn = next_text_node(tn);
        }
    }
    return true;
}
/**
 * Try to match the unique text-nodes on one side with text nodes 
 * on the other side
 * @param unique an array of i-nodes on one side only
 * @param prev_i the first preceding i-element or null
 * @param next_i the next i-element or null
 */
function test_align_side(unique,prev_i,next_i) {
    let first_id = unique[0].getAttribute("id");
    let base_id = base_id_from_id(first_id);
    let prefix = first_id[0];
    let other_prefix = (prefix=='d')?'a':'d';
    let parent_id = (prefix=='d')?"rhs_body":"lhs_body";
    let other_side = (prefix=='d')?"right":"left";
    let text = get_text_from_elems(unique);
    let seq = get_text_sequence(document.getElementById(parent_id),text);
    if ( seq == null ) {
        alert("no match found on "+other_side+" side");
        undo_wrap( base_id );
    }
    else
        wrap_text_sequence( seq, "aligned", other_prefix+base_id.slice(1) );
}
/**
 * Match the selection "aligned" on only one side or the other with the other side
 * @return true if the alignment matched with the other side else false
 */
function update_alignments() {
    const sel = document.getSelection();
    if ( sel.rangeCount > 0 ) {
        if ( ! check_selection(sel) ) {
            return false; 
        }
        let side = get_side(sel);
        let id = (side=="left")?left_id:right_id;
        wrap_selection(sel,"aligned",id);
        // get wrapped elements
        const i_elements = document.getElementsByTagName("I");
        for ( let i = 0; i < i_elements.length; i++ ) {
            let i_elem = i_elements.item(i);
            let id_value = i_elem.getAttribute("id");
            const regex = /([ad][0-9]+)[a-z]+/;
            const m = id_value.match(regex);
            if ( m[1] == id )
                unique.push(i_elem);
        }
        unique.sort((a,b)=>a.getAttribute("id")<b.getAttribute("id"));
        // find the first preceding i-tag and the next i-tag
        let prev_i = get_prev_i( unique[0] );
        let next_i = get_next_i( unique[unique[unique.length-1]] );
        test_align_side(unique,prev_i,next_i);
    }
    else
        alert("select text to align on left or right first");
}