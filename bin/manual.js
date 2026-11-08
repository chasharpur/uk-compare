var left_id = "d1";
var right_id  = "a1";
/**
 * Load the default style sheet inline
 */
async function set_sample_css(sample) {
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
/**
 * Load a predefined alignment object
 */
async function load(){
    let file = document.getElementById("load").files[0];
    try {
        const text = await file.text(); 
        let spec = JSON.parse(text);
        await set_sample_css(spec.sample);
        set_local_storage('left_url',spec.lhs);
        set_local_storage('right_url',spec.rhs);
        set_local_storage('sample',spec.sample);
        let lhs_html = await load_user_html("./samples/"+spec.sample+"/"+get_local_storage('left_url'));
        let rhs_html = await load_user_html("./samples/"+spec.sample+"/"+get_local_storage('right_url'));
        lhs_html = html_add_diffs(spec.similarities,lhs_html,1);
        rhs_html = html_add_diffs(spec.similarities,rhs_html,2);
        document.getElementById("lhs_body").innerHTML = lhs_html;
        document.getElementById("rhs_body").innerHTML = rhs_html;
        // set left_id and right_id to the largest value found on the page
        let all_ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
        let left_base_id = 1;
        let right_base_id = 1;
        const regex = /([ad][0-9]+)[a-z]+/;
        for ( let id of all_ids ) {
            let m = id.match(regex);
            if ( m ) {
                let base_id = m[1]; 
                let num_value = parseInt(base_id.slice(1));
                if ( base_id[0] == 'd' && num_value > left_base_id )
                    left_base_id = num_value;
                else if ( base_id[0] == 'a' && num_value > right_base_id )
                    right_base_id = num_value;
            }
        }
        // point to NEXT left and right ids
        left_id = 'd'+(left_base_id+1);
        right_id = 'a'+(right_base_id+1);
    } catch (error) {
        console.error("Error reading file:", error);
    }
}
/**
 * Mark the current selection with i-elements
 */
function mark() {
    let sel = document.getSelection();
    if (sel.rangeCount > 0) {
        let r;
        // selection must not include aligned text
        for ( let i=0;i<sel.rangeCount;i++ ) {
            r = sel.getRangeAt(i);
            let p_class = r.startContainer.parentNode.getAttribute("class");
            if ( p_class == "aligned" || p_class == "transposed" ) {
                alert("remove existing alignment before marking");
                return;
            }
        }
        // OK to proceed
        r = sel.getRangeAt(0);
        let div_ancestor = get_ancestor(r.startContainer,"DIV");
        // selection must not be on same side as already marked text
        let i_elems = document.getElementsByTagName("I");
        let ok = true;
        for ( let i=0;i<i_elems.length;i++ ) {
            let i_elem = i_elems.item(i);
            let i_ancestor = get_ancestor(i_elem,"DIV");
            if ( i_ancestor == div_ancestor ) {
                alert("remove previous marking on this side");
                ok = false;
                break;
            }
        }
        if ( ok )
            wrap_selection(sel,"marked",null);
    }        
}
/**
 * Test a set of marked i-elems to see if any are already aligned
 * @param set the set of i-elements
 * @return true if at least one is aligned/transposed
 */
function already_aligned( set ) {
    for ( let i=0;i<set.length;i++ ) {
        let parent = set[i].parentNode;
        let cls = parent.getAttribute("class");
        if ( parent.tagName == 'SPAN' && (cls == 'aligned' || cls == 'transposed') ) {
            return true;
        }
    }
    return false;
}
/**
 * Extract the text content of a set of i-elements
 * @param set the set to extract from
 * @return the extracted text
 */
function extract_text(set) {
    let text = "";
    for ( let i=0;i<set.length;i++ )
        text += set[i].textContent;
    return text;
}
/**
 * Convert a marked set to an aligned set
 * @param set an ordered array of i-elements of class marked
 * @param cls the alignment class: aligned or transposed
 * @param base_id the base id to use (minus suffix)
 */
function align_marked( set, cls, base_id ) {
    let id = base_id+'a';
    for ( let i=0;i<set.length;i++ ) {
        let parent = set[i].parentNode;
        let grandparent = parent.parentNode;
        let state =0;
        let child1 = document.createElement("SPAN");
        child1.setAttribute("class",parent.getAttribute("class"));
        let child2 = document.createElement("SPAN");
        child2.setAttribute("class",cls);
        child2.setAttribute("id",id);
        let child3 = document.createElement("SPAN");
        child3.setAttribute("class",parent.getAttribute("class"));
        for (const child of parent.childNodes) {
            switch ( state ) {
                case 0: // looking for children preceding set[i]
                    if ( child.nodeType == 3 )  // text node
                        child1.appendChild(document.createTextNode(child.textContent));
                    else if ( child.nodeType == 1 ) {
                        child2.appendChild(document.createTextNode(child.textContent));
                        state = 1;
                    }
                    break;
                case 1: // found i-node - convert to text
                    if ( child.nodeType == 1 )
                        child2.appendChild(document.createTextNode(child.textContent));
                    else {
                        child3.appendChild(document.createTextNode(child.textContent));
                        state = 2;
                    }
                    break;
                case 2: // following text nodes
                    child3.appendChild(document.createTextNode(child.textContent));
                    break;
            }
        }       
        //grandparent.removeChild(parent);
        if ( child1.childNodes.length > 0 )
            grandparent.insertBefore(child1,parent);
        if ( child2.childNodes.length > 0 )
            grandparent.insertBefore(child2,parent);
        if ( child3.childNodes.length > 0 )
            grandparent.insertBefore(child3,parent);
        grandparent.removeChild(parent);
        id = increment_id( id );
    }
}
/**
 * Get the previous alignment id
 * @param from the element node to move backwards from
 */
function get_prev_align_id(from) {
    let prev_id = null;
    let tn = first_text_node(from);
    while ( tn != null ) {
        let tn_class = tn.parentNode.getAttribute("class");
        if ( tn_class == "aligned" || tn_class == "transposed" ){
            prev_id = tn.parentNode.getAttribute("id");
            break;
        }
        tn = prev_text_node(tn);
    }
    if ( prev_id == null )
        return null;
    else {
        const regex = /[ad]([0-9]+)[a-z]/;
        let m = prev_id.match(regex);
        if ( m )
            return m[1];
        else
            return null;
    }
}
/**
 * Get the previous alignment id
 * @param from the element node to move backwards from
 */
function get_next_align_id(from) {
    let next_id = null;
    let tn = last_text_node(from);
    while ( tn != null ) {
        let tn_class = tn.parentNode.getAttribute("class");
        if ( tn_class == "aligned" || tn_class == "transposed" ){
            next_id = tn.parentNode.getAttribute("id");
            break;
        }
        tn = next_text_node(tn);
    }
     if ( next_id == null )
        return null;
    else {
        const regex = /[ad]([0-9]+)[a-z]/;
        let m = next_id.match(regex);
        if ( m )
            return m[1];
        else
            return null;
    }
}
/**
 * For a set of left and right marked elements decide if 
 * their forced alignment would be direct or transposed
 * @param lhs an array of i-nodes on the left hand side
 * @param rhs an array of i-nodes on the right hand side
 */
function get_alignment_class(lhs,rhs) {
    // get previous lhs aligned
    let lhs_prev_id = get_prev_align_id(lhs[0]);
    let rhs_prev_id = get_prev_align_id(rhs[0]);
    let lhs_next_id = get_next_align_id(lhs[lhs.length-1]);
    let rhs_next_id = get_next_align_id(rhs[rhs.length-1]);
    if ( lhs_prev_id == rhs_prev_id && lhs_next_id == rhs_next_id )
        return "aligned";
    else
        return "transposed";
}
/**
 * align two sets of marked elements on left and right
 */
function do_align() {
    // 1. find all marked segments in document
    let marked = document.getElementsByClassName("marked");
    // partition into lhs and rhs
    let lhs = [];
    let rhs = [];
    for ( let i=0;i<marked.length;i++ ) {
        let item = marked.item(i);
        let div_ancestor = get_ancestor(item,"DIV");
        if ( div_ancestor != null ) {
            let div_id = div_ancestor.getAttribute("id");
            if ( div_id == "lhs_body" )
                lhs.push(item);
            else if ( div_id == "rhs_body" )
                rhs.push(item);
        }
    }
    if ( lhs.length > 0 && rhs.length > 0 ) {
        // check not already aligned
        if ( already_aligned(lhs) || already_aligned(rhs) ) {
            alert( "marked text is already aligned or transposed" );
            return;
        }
        // check that the two sides are equal
        let lhs_marked_text = extract_text(lhs);
        let rhs_marked_text = extract_text(rhs);
        if ( lhs_marked_text != rhs_marked_text ) {
            alert("marked sides not equal");
            return;
        }
        let align_cls = get_alignment_class(lhs,rhs);
        align_marked(lhs,align_cls,left_id);
        align_marked(rhs,align_cls,right_id);
        left_id = inc_alignment_id(left_id);
        right_id = inc_alignment_id(right_id);
    }
    else
        alert("mark text on both sides first");
}
/**
 * Remove all amrked i-elements back to raw text
 */
function unmark() {
    let i_elems = document.getElementsByClassName("marked");
    // copy to arr to make loop work
    let arr = [];
    for ( let i=0;i<i_elems.length;i++ )
        arr.push(i_elems.item(i));
    for ( let i=0;i<arr.length;i++ ) {
        let i_elem = arr[i];
        let tn = document.createTextNode(i_elem.textContent);
        i_elem.parentNode.replaceChild(tn,i_elem);
    }
}
/**
 * User clicked on cancel export
 */
function cancel_export() {
	let dialog = document.getElementById("save_dialog");
	dialog.style.display = "none";
}
/**
 * User clicked OK export ->copy to clipboard
 */
function ok_export() {
	navigator.clipboard.writeText(document.getElementById("save_text_area").value);
	let dialog = document.getElementById("save_dialog");
	dialog.style.display = "none";
}
/**
 * Show a dialog with a JSON file containing the two versions 
 * being compared and the alignments between them
 */
function save() {
	let dialog = document.getElementById("save_dialog");
	dialog.style.display = "block";
    let lhs = document.getElementById("lhs_body");
	let rhs = document.getElementById("rhs_body");
    let l_url = localStorage.getItem('left_url');
    let r_url = localStorage.getItem('right_url');
    let sample = localStorage.getItem('sample');
    if ( sample != null && l_url != null && r_url != null ) {
        let obj = html_export(lhs.innerHTML,rhs.innerHTML,l_url,r_url,sample);
        document.getElementById("save_text_area").value = JSON.stringify(obj);
    }
    else {
        alert("failed to find right or left url or sample");
    }
}
/**
 * Remove all aligned text left and right that start 
 * with the base-id in the current selection
 */
function remove(){
    let sel = document.getSelection();
    if ( sel.rangeCount > 0 ) {
        // find first range with an id
        let id = null;
        let i = 0;
        let matched = false;
        for ( i=0;i<sel.rangeCount;i++ ) {
            let r = sel.getRangeAt(i);
            id = r.startContainer.parentNode.getAttribute("id");
            const regex = /[ad]([0-9]+)[a-z]+/;
            let m = id.match(regex);
            if ( m ) {
                // replace alignment with deleted/added spans
                // do these separately as they may not match
                let d_id = 'd'+m[1]+'a';
                let d_elem = document.getElementById(d_id);
                while ( d_elem != null ) {
                    d_txt = document.createTextNode(d_elem.textContent);
                    let deleted = document.createElement('SPAN');
                    deleted.setAttribute('class','deleted');
                    deleted.appendChild(d_txt);
                    d_elem.parentNode.replaceChild(deleted,d_elem);
                    d_id = increment_id(d_id);
                    d_elem = document.getElementById(d_id);
                }
                let a_id = 'a'+m[1]+'a';
                let a_elem = document.getElementById(a_id);
                while ( a_elem != null ) {
                    a_txt = document.createTextNode(a_elem.textContent);
                    let added = document.createElement('SPAN');
                    added.setAttribute('class','added');
                    added.appendChild(a_txt);
                    a_elem.parentNode.replaceChild(added,a_elem);
                    a_id = increment_id(a_id);
                    a_elem = document.getElementById(a_id);
                }
                matched = true;
                break;
            }
        }
        if ( !matched )
            alert("No alignment selected!");
    }
    else
        console.log("selection is empty");
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
function inc_alignment_id(id) {
    let num = Number.parseInt(id.slice(1))+1;
    return id.slice(0,1)+num;
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