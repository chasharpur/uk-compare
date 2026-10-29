/**
 * Increment the suffix of an alignment id for reuse
 * @param suffix the id whose suffix needs incrementing
 * @returns the id with its new suffix
 */
function increment_id( id ) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const regex = /([ad])(\d+)([a-z]+)/;
    const match = id.match(regex);
    if (match ) {
        let suffix = match[3];
        let num = match[2];
        let prefix = match[1];
        let index = alphabet.indexOf(suffix[suffix.length-1]);
        let new_suffix = "";
        if ( index+1 >= alphabet.length )
            new_suffix = suffix + alphabet[0];
        else
            new_suffix = suffix.slice(0,suffix.length-1)+alphabet[index+1];
        return prefix+num+new_suffix;
    }
    else {
        console.log("invalid id "+id);
        return id;
    }
}
/**
 * Is a piece of text purely whitespace?
 * @param text the potential whitespace
 * @return true if it is
 */
function is_whitespace(text) {
    const regex = /^[ \n\t]+$/;
    return regex.test(text);
}
/**
 * Replace an i-element with its textual contents
 * @param i_elem the element to unwrap
 */
function unwrap_i( i_elem ) {
    let text = i_elem.textContent;
    let text_node = document.createTextNode(text);
    i_elem.parentNode.replaceChild(text_node,i_elem);
}
/**
 * Remove all i elements with a given base id (number)
 * @param base_id the id number to remove
 */
function undo_wrap( base_id ) {
    let curr_id = 'd'+base_id+'a';
    let curr_i = document.getElementById(curr_id);
    while ( curr_i != null ) {
        unwrap_i( curr_i );
        curr_id = increment_id( curr_id );
        curr_i = document.getElementById(curr_id);
    }
    curr_id = 'a'+base_id+'a';
    curr_i = document.getElementById(curr_id);
    while ( curr_i != null ) {
        unwrap_i( curr_i );
        curr_id = increment_id( curr_id );
        curr_i = document.getElementById(curr_id);
    }
}
/**
 * Wrap a flat text range in italics
 * @param node the text node to wrap 
 * @param start the start offset within node
 * @param end the end offset within node
 * @param cls the classname to add to the i-element
 * @param id the id for the i-element
 * @return the new wrapped text range
 */
function wrap_text_range( node, start, end, cls, id ) {
    let text = node.textContent;
    let span = node;
    const regex = /([ad][0-9]+)[a-z]+/;
    const match = id.match(regex);
    let short_id = (match)?match[1]:id;
    if ( !is_whitespace(text) ) {
        var parent = node.parentNode;
        // we only support the italics format
        if ( parent.tagName != "I" ) {
            var first = null;
            var mid = null;
            var last = null;
            if ( start > 0 )
                first = text.substring(0,start);
            if ( end < text.length )
                last = text.substring(end);
            mid = text.substring(start,end);
            var m_node = document.createElement("I");
            m_node.setAttribute("class",cls);
            m_node.setAttribute("id",id);
            m_node.setAttribute("title",short_id);
            m_node.appendChild(document.createTextNode(mid));
            node.parentNode.replaceChild(m_node,node);
            span = m_node;
            node = span.firstChild;
            if ( first != null ) {
                var s_node = document.createTextNode(first);
                span.parentNode.insertBefore(s_node,span);
            }
            if ( last != null ) {
                var e_node = document.createTextNode(last);
                if ( span.nextSibling == null )
                    span.parentNode.appendChild(e_node);
                else
                    span.parentNode.insertBefore(e_node,span.nextSibling);
            }
        }
    }
    return span.firstChild;
}
/**
 * Get the first text node of an element
 * @param node a node possibly text or a comment
 * @return the first text node decendant of node or null
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
    var sibling = t_node.previousSibling;
    while ( sibling != null ) {
        if ( sibling.nodeType == 3 )
            return sibling;
        else if ( sibling.nodeType == 1 )
            return this.last_text_node(sibling);
        else
            sibling = sibling.previousSibling;
    }
    if ( sibling == null ) {
        var parent = t_node.parentNode;
        while ( parent != null && parent.nodeName != "BODY" && parent.previousSibling == null )
            parent = parent.parentNode;
        if ( parent.nodeName != "BODY" )
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
    var sibling = t_node.nextSibling;
    while ( sibling != null ) {
        if ( sibling.nodeType == 3 )
            return sibling;
        else if ( sibling.nodeType == 1 )
            return first_text_node(sibling);
        else
            sibling = sibling.nextSibling;
    }
    if ( sibling == null ) {
        var parent = t_node.parentNode;
        while ( parent != null && parent.nodeName != "BODY" && parent.nextSibling == null )
            parent = parent.parentNode;
        if ( parent == null||parent.nodeName == "BODY" )
            return null;
        else 
            return first_text_node(parent.nextSibling);  
    }
}
/**
 * Merge successive spans of the same type
 * @param first the first text node
 * @param last the last text node 
 */
function clean_spans(first,last) {
    var tn = first;
    var prev_tn = null;
    while ( tn != null ) { 
        var next_tn = next_text_node(tn);
        if ( prev_tn!= null &&
            prev_tn.parentNode.tagName == "I" && tn.parentNode.tagName=="I") {
                prev_tn.textContent += tn.textContent;
                tn.parentNode.parentNode.removeChild(tn.parentNode);
        }
        else
            prev_tn = tn;
        if ( tn == last )
            break;
        else
            tn = next_tn;
    }
    set_selection(prev_tn,prev_tn);
}
/**
 * Set the selection for whole text nodes
 * @param sNode the start text node of the selected range
 * @param eNode the end text node of the selection
 */
function set_selection(sNode, eNode ) {
    var sel = document.getSelection();
    var r = document.createRange();
    r.setStartBefore(sNode);
    r.setEndAfter(eNode);
    sel.removeAllRanges();
    sel.addRange(r);
}
/**
 * Exclude any trivial leading/trailing whitespace in the current range
 * @param r the untrimmed range
 * @return a trimmed range
 */
function trim_range(r) {
    var start = r.startContainer;
    var start_offset = r.startOffset;
    if ( r.startContainer.textContent.length == r.startOffset ) {
        start = next_text_node(r.startContainer);
        start_offset = 0;
    }
    var end = r.endContainer;
    var end_offset = r.endOffset;
    if ( r.endOffset == 0 ) {
        end = prev_text_node(r.endContainer);
        end_offset = end.textContent.length;
    }
    var one = start.textContent.substring(start_offset);
    var two = "";
    var i = 0;
    while ( one.length > 0 && is_whitespace(one[i++]) )
        one = one.substring(1);
    if ( start != end ) {
        two = end.textContent.substring(0,end_offset);
        while ( two.length > 0 && is_whitespace(two[two.length-1]) )
            two = two.substring(0,two.length-1);
    }
    var r2 = {};
    r2.commonAncestorContainer = r.commonAncestorContainer;
    if ( one.length == 0 ) {
        r2.endContainer = end;
        r2.endOffset = endOffset;
        r2.startContainer = end;
        r2.startOffset = 0;
    }
    else if ( two.length == 0 ) {
        r2.startContainer = start;
        r2.startOffset = startOffset;
        r2.endContainer = end;
        r2.endOffset = one.length;
    }
    else
        r2 = r;
    return r2;
}
/**
 * Wrap the selection in the given format
 * @param sel the current Selection object
 * @param cls the name of the class for i-element
 * @param id base id for the whole selection - no suffix
 */
function wrap_selection(sel,cls,id) {
    let full_id = id+'a';
    let last_tn,first_tn;
    let r = sel.getRangeAt(0);
    if ( r.startContainer == r.endContainer ) {
        first_tn = last_tn = wrap_text_range(r.startContainer, 
            r.startOffset,realEndOffset(r),cls,full_id);
        full_id = increment_id(full_id);
        set_selection(first_tn,last_tn);
    }
    else {
        r = trim_range(r);
        let tn_start = r.startContainer;
        let tn_end = r.endContainer;
        if ( tn_start.nodeType!= 3 )
            tn_start = first_text_node(tn_start);
        if ( tn_end.nodeType != 3 )
            tn_end = last_text_node(tn_end);
        let tn = tn_start;
        while ( tn != null ) {
            let old_tn = tn;
            if ( !is_whitespace(tn.textContent) ) {
                if ( tn == tn_start ) {
                    tn = first_tn = wrap_text_range( tn, r.startOffset, 
                    tn.textContent.length,cls,full_id);
                    full_id = increment_id(full_id);
                }
                else if ( tn == tn_end ) {
                    tn = wrap_text_range(tn,0,r.endOffset,cls,full_id);
                    full_id = increment_id(full_id);
                }
                else {
                    tn = wrap_text_range(tn,0,tn.textContent.length,cls,full_id);
                    full_id = increment_id(full_id);
                }
            }
            if ( old_tn == tn_end ) {
                last_tn = tn;
                break;
            }
            else
                tn = next_text_node(tn);
        }
        clean_spans(first_tn,last_tn);
        window.getSelection().removeAllRanges();
    }
}