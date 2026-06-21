var slen;
var str;
var node_id=0;
var alignments = [];
// the last created internal node
var current = null;
// the initial start position of phase 1
var start_pos = 0;
// the last position of str[j..i-1] used in the extension algorithm
var last;
// the last value of j in the previous extension
var old_j = 0;
// location of last suffix str[j..i] inserted by an extension
var old_beta = {};
var root={},f={};
var left_html= "<body><p>The quick brown fox jumps over the lazy dog</p></body>";//63 chars
var right_html="<body><p>The slow old fox jumps over the energetic dog</p></body>";//65 extra chars
var debug_tree = "";
// Javascript uses signed 32 bit integers
// so here we fake 31 bit unsigned ints
// with the top bit acting as our KIND_MASK
// leaving just the bottom 30 bits for length
// whether the children are in a list or hashtable
const KIND_MASK = 0x40000000;
const LEN_MASK = 0x3FFFFFFF;
const MAX_LIST_CHILDREN = 6;
// this is 2^30-1, the maximum 30 bit unsigned
const INFINITY = 1073741823;
const DEBUG = false;
var slen;
// end of current leaves
var e = 0;
var root;
// define masks
const BAR_VALUE = 61708863;
const BAR_SPACE = 536870912;
// for print_tree
var links = null;
function PARENT_HASH(p) {
    return (p.len&KIND_MASK)==KIND_MASK;
}
function PARENT_LIST(p) {
    return (p.len&KIND_MASK)==0;
}
/**
 * Exit the program on an error
 * @param message display this message first
 */
function fail( message ) {
    console.log(message);
}
function hash( key, nbuckets ) {
    if ( !key )
        console.log("oops!");
    return key.charCodeAt(0) % nbuckets;
}
/**
 * Create a hashtable by conversion from a list of child-nodes
 * @param children add these nodes to the hashtable for starters
 * @return an initialised hashtable
 */
function hashtable_create( parent ) {
    let ht = {};
    let nnodes = node_num_children( parent );
    ht.nbuckets = nnodes*2;
    ht.items = [];
    ht.nitems = 0;
    for ( let i=0;i<ht.nbuckets;i++ )
        ht.items.push(null);
    let iter = node_children( parent );
    while ( node_iterator_has_next(iter) ) {
        let temp = node_iterator_next( iter );
        node_clear_next( temp );
        hashtable_add( ht, temp );
    }
    return ht;
}
/**
 * Add an item to the hashtable
 * @param ht the table
 * @param child the node
 */
function hashtable_add( ht, child ) {
    let b = {};
    let res = 1;
    b.next = null;
    b.v = child;
    b.c = node_first_char( child );
    let index = hash( b.c, ht.nbuckets);
    if ( ht.items[index] == null )
        ht.items[index] = b;
    else {
        let b2 = ht.items[index];
        while ( b2.next != null )
            b2 = b2.next;
        b2.next = b;
    }
    ht.nitems++;
    return res;
}
/**
 * Get a node from the table. Has to be fast.
 * @param ht the hashtable in question
 * @param c the first char 
 * @return the node or null if not found
 */
function hashtable_get( ht, c ) {
    let index = hash( c, ht.nbuckets );
    let b = ht.items[index];
    while ( b != null && b.c != c )
        b = b.next;
    if ( b != null )
        return b.v;
    else
        return null;
}
/**
 * Remove a node from the hashtable
 * @param ht the table to remove it from
 * @param first_char the first char of the entry to remove
 * @return 1 if it was removed
 */
function hashtable_remove( ht, v, first_char ) {
    let index = hash( first_char, ht.nbuckets);
    let b = ht.items[index];
    if ( b != null ) {
        let last = b;
        while ( b != null && b.c != first_char ) {
            last = b;
            b = b.next;
        }
        if ( b != null ) { // found it
            if ( last != b )
                last.next = b.next;
            else
                ht.items[index] = b.next;
            ht.nitems--;
            return 1;
        }
    }
    return 0;
}
/**
 * Replace one node with another
 * @param ht the hashtable to do it in
 * @param u the node to replace it with
 * @return 1 if it worked
 */
function hashtable_replace( ht, v, u ) {
    if ( hashtable_remove(ht,v,node_first_char(u)) )
        return hashtable_add(ht,u);
    else
        return 0;
}
/**
 * How many nodes are in the table?
 * @param ht the hashtable object
 * @return the number of current nodes stored
 */
function hashtable_size( ht ) {
    if ( ht == undefined )
        console.log("undefined");
    return ht.nitems;
}
/**
 * Convert a hashtable's values to an array
 * @param ht the hashtable to convert
 * @return an array of nodes in the hashtable
 */
function hashtable_to_array( ht ) {
    let i,j;
    let nodes = [];
    for ( i=0,j=0;i<ht.nbuckets;i++ ) {
        let b = ht.items[i];
        while ( b != null ) {
            nodes.push( b.v );
            b = b.next;
        }
    }
    return nodes;
}
/**
 * Add a child node (can't fail)
 * @param parent the node to add the child to
 * @param child the child to add
 */
function node_add_child( parent, child ) {
    if ( PARENT_LIST(parent) )
        node_append_sibling( parent, child );
    else
        hashtable_add( parent.ht, child );
    child.parent = parent;
}
/**
 * Add another child to the sibling list
 * @param parent the parent
 * @param child the new sibling of parent's children
 */
function node_append_sibling( parent, child ) {
    if ( parent.children == null )
        parent.children = child;
    else {
        let temp = parent.children;
        let size = 1;
        while ( temp.next != null ) {
            size++;
            if ( size >= MAX_LIST_CHILDREN ) {
                parent.ht = hashtable_create( parent );
                delete parent.children;
                parent.len |= KIND_MASK;
                hashtable_add( parent.ht, child );
                return;
            }
            temp = temp.next;
        }
        temp.next = child;
    }
}
/**
 * Iterate through a set of nodes
 * @param parent the parent whose children should be iterated through
 * @return an iterator or null if it failed
 */
function node_children( parent ) {
    let iter = {};
    if ( PARENT_LIST(parent) ) {
        let size = node_num_children( parent );
        iter.nodes = [];
        iter.num_nodes = size;
        iter.position = 0;
        let i=0;
        let v = parent.children;
        while ( v != null ) {
            iter.nodes[i++] = v;
            v = v.next;
        }
    }
    else {
       let size = hashtable_size( parent.ht );
       iter.num_nodes = size;
       iter.nodes = hashtable_to_array( parent.ht );
       iter.position = 0;
    }
    return iter;
}
function node_clear_next( v ) {
    if ( PARENT_LIST(v.parent) )
        v.next = null;
}
/**
 * Create a node safely
 * @param start the start index in the side version
 * @param len the length of the fragment
 * @return the finished node 
 */
function node_create( start, len ) {
    let n = {};
    n.start = start;
    n.len = len;
    n.id = ++node_id;
    n.next = null;
    n.children = null;
    // we will replace "children" with "ht" if it gets too big
    // this was a union in C
    // suffix link 
    n.link = null;
    // parent of node : needed to implement splits
    n.parent = null;
    return n;
}
/**
 * Create a leaf starting at a given offset 
 * @param i the offset into the string
 * @return the finished leaf
 */
function node_create_leaf( i ) {
    let leaf = {};
    leaf.id = ++node_id;
    leaf.start = i;
    leaf.len = INFINITY;
    leaf.children = null;
    leaf.parent = null;
    leaf.next = null;
    return leaf;
}
function node_end( v, max ) {
    if ( node_len(v) == INFINITY )
        return max;
    else {
        let temp = v.start+node_len(v)-1;
        return v.start+node_len(v)-1;
    }
}
function node_first_char( v ) {
    return str[node_start(v)];
}
/**
 * Is this node the last one in this branch of the tree?
 * @param v the node to test
 * @return 1 if it is else 0
 */
function node_is_leaf( v ) {
    if ( PARENT_LIST(v) )
        return v.children == null;
    else
        return 0;
}
/**
 * Are there any more nodes in this iterator?
 * @param iter the iterator
 * @return 1 if it does else 0
 */
function node_iterator_has_next( iter ) {
    return iter.position < iter.num_nodes;
}
/**
 * Get the next node pointed to by the iterator
 * @param iter the iterator 
 * @return the next node object
 */
function node_iterator_next( iter ) {
    try {
        if ( iter.position < iter.num_nodes )
            return iter.nodes[iter.position++];
        else
            return null;
    }
    catch ( e ) {
        console.log(e);
    }
}
function node_len_real( v ) {
    return (node_len(v)==INFINITY)?e:node_len(v);
}
function node_len( v ) {
    return LEN_MASK&v.len;
}
/**
 * Get the suffix link
 * @param v the node to get the link of
 * @return the node sv
 */
function node_link( v ) {
    return v.link;
}
/**
 * Find out the number of children we have
 * @param v the node in question
 * @return an integer
 */
function node_num_children( v ) {
    let size = 0;
    if ( PARENT_LIST(v) ) {
        let temp = v.children;
        while ( temp != null ) {
            size++;
            temp = temp.next;
        }
    }
    else
        size = hashtable_size( v.ht );
    return size;
}
function node_parent( v ) {
    return v.parent;
}
/**
 * Replace one child with another
 * @param v the node to be replaced
 * @param u its replacement
 */
function node_replace_child( v, u ) {
    if ( PARENT_LIST(v.parent) ) {
        // isolate v and repair the list of children
        let child = v.parent.children;
        let prev = child;
        while ( child != null && child != v ) {
            prev = child;
            child = child.next;
        }
        if ( child == prev )
            v.parent.children = u;
        else
            prev.next = u;
        u.next = child.next;
        v.next = null;
        //node_print_children(v.parent);
    }
    else if ( PARENT_HASH(v.parent) ) {
        let res = hashtable_replace( v.parent.ht, v, u );
        if (!res)
            fail( "failed to replace node\n" );
    }
    else
        fail( "unknown node kind \n" );
}
function node_set_len( v, len ) {
    v.len = (v.len&KIND_MASK)+len;
}
/**
 * Set the node's suffix link
 * @param v the node in question
 * @param link the node sv
 */
function node_set_link( v, link ) {
    v.link = link;
}
/**
 * Get the node's side (left or right)
 * @param v the node  
 * @returns the side: 1=left, 2=right
 */
function node_side( v ) {
    return (v.start<=slen)?1:2;
}
/**
 * Split this node's edge by creating a new node in the middle. Remember 
 * to preserve the "once a leaf always a leaf" property or f will be wrong.
 * @param v the node in question
 * @param loc the place on str after which to split it
 * @return the new internal node
 */
function node_split( v, loc ) {
    // create front edge u leading to internal node v
    let u_len = loc-v.start+1;
    let u = node_create( v.start, u_len );
    // now shorten the following node v
    if ( !node_is_leaf(v) ) {
        if ( v.id == 1 )
            console.log("root!");
        v.len -= u_len;
    }
    // replace v with u in the children of v.parent
    node_replace_child( v, u );
    v.start = loc+1;
    // reset parents
    u.parent = v.parent;
    v.parent = u;
    // NB v is the ONLY child of u
    u.children = v;
    return u;
}
function node_start( v ) {
    if ( v != null )
        return v.start;
    else
        return -1;
}
/**
 * Create a path
 * @param start the start index into str
 * @param len the length of this path 
 * @return the complete path
 */
function path_create( start, len ) {
    let p = {};
    p.start = start;
    p.len = len;
    return p;
}
/**
 * Access the start field
 * @param p the path in question
 * @return the path length
 */
function path_len( p ) {
    return p.len;
}
/**
 * Add one path to the front of another
 * @param p the current path
 * @param len the length of the prefix
 */
function path_prepend( p, len ) {
    p.start -= len;
    p.len += len;
}
/**
 * Access the start field
 * @param p the path in question
 * @return the path start index in str
 */
function path_start( p ) {
    return p.start;
}
function inc_e(offset) {
    e++;
}
/**
 * Does the position continue with the given character?
 * @param p a position in the tree. 
 * @param c the character to test for in the next position
 * @return 1 if it does else 0
 */
function continues( p, c ) {
    if ( node_end(p.v,e) > p.loc )
        return str[p.loc+1] == c;
    else
        return find_child(p.v,c) != null;
}
function verify_beta(j,i){
    let txt = str.substring(j,i+1);
    let v = root;
    while ( txt.length > 0 ) {
        v = find_child(v, txt[0]);
        if ( v == null )
            break;
        else if ( node_len(v) > txt.length )
        {
            let test = str.substring(v.start,v.start+txt.length);
            if ( test == txt )
                txt = "";
            else
                console.log("expected "+txt+" but found "+test);
        } 
        else
            txt = txt.substring(v.len);
    }
}
/**
 * Find a location of the suffix in the tree.
 * @param j the extension number counting from 0
 * @param i the current phase - 1
 * @return the position (combined node and edge-offset)
 */ 
function find_beta( j, i ) {
    let p;
    if ( old_j > start_pos && old_j == j ) {
        p = pos_create();
        p.loc = old_beta.loc;
        p.v = old_beta.v;
    }
    else if ( j>i ) { // empty string
        p = pos_create();
        p.loc = start_pos;
        p.v = root;
    }
    else if ( j==start_pos ) {  // entire string
        p = pos_create();
        p.loc = i;
        p.v = (start_pos<slen)?f:g;
    }
    else { // walk across tree
        let v = last.v;
        let len = last.loc-node_start(last.v)+1;
        let q = path_create( node_start(v), len );
        v = node_parent( v );
        while ( v != root && node_link(v)==null ) {
            path_prepend( q, node_len(v) );
            v = node_parent( v );
        }
        if ( v != root ) {
            v = node_link( v );
            p = walk_down( v, q );
        }
        else
            p = walk_down( root, path_create(j,i-j+1) );
    }
    last = p;
    verify_beta(j,i);
    return p;
}
/**
 * If current is set, set its link to point to the next node, then clear it
 * @param v the link to point current to
 */
function update_current_link( v ) {
    if ( current != null ) {
        node_set_link( current, v );
        current = null;
    }
}
/**
 * Extend the implicit suffix tree by adding one suffix of the current prefix
 * @param j the offset into str of the suffix's start
 * @param i the offset into str at the end of the current prefix
 * @return 1 if the phase continues else 0
 */
function extension( j, i ) {
    let res = 1;
    let p = find_beta( j, i-1 );
    // rule 1 (once a leaf always a leaf)
    if ( node_is_leaf(p.v) && pos_at_edge_end(p) ){
        res = 1;
    }
    // rule 2
    else if ( !continues(p,str[i]) ) {
        //printf("applying rule 2 at j=%d for phase %d\n",j,i);
        let leaf = node_create_leaf( i );
        if ( p.v==root || pos_at_edge_end(p) ) {
            node_add_child( p.v, leaf );
            update_current_link( p.v );
        }
        else {
            let u = node_split( p.v, p.loc );
            update_current_link( u );
            if ( i-j==1 )
                node_set_link( u, root );
            else 
                current = u;
            node_add_child( u, leaf );
        }
        update_old_beta( p, i );
    }
    // rule 3
    else {
        //printf("applying rule 3 at j=%d for phase %d\n",j,i);
        update_current_link( p.v );
        update_old_beta( p, i );
        res = 0;
    }
    return res;
}
/**
 * Find a child of an internal node starting with a character
 * @param v the internal node
 * @param c the char to look for
 * @return the child node or null
 */
function find_child( v, c ) {
    if ( PARENT_LIST(v) ) {
        v = v.children;
        while ( v != null && str[v.start] != c )   
           v = v.next;
        return v;
    }
    else if ( PARENT_HASH(v) ) {
        let u = hashtable_get( v.ht, c );
        return u;
    }
    else
        return null;
}
function find_string( txt, debug ) {
    let v = root;
    if ( debug )
        console.log("looking for "+txt);
    while ( txt.length > 0 ) {
        v = find_child(v, txt[0]);
        if ( v == null )
            return false;
        else {
            if ( debug )
                console.log("found id "+v.id+" txt="+str.substring(v.start,v.start+node_len_real(v))+" @ "+v.start);
            txt = txt.substring(node_len_real(v));
        }
    }
    return true;
}
/**
 * Process the prefix of str ending in the given offset
 * @param i the inclusive end-offset of the prefix
 */
function phase( i ) {
    let j;
    //if ( i==129 )
    //    console.log("last suffix="+str.slice(old_j,i));
    current = null;
    for ( j=old_j;j<=i;j++ )            
        if ( !extension(j,i) )
            break;
    // remember number of last extension for next phase
    old_j = (j>i)?i:j;
    // update all leaf ends
    inc_e(i);
   // print_tree( root );
}
/**
 * Create a position safely
 * @return the finished pos or fail
 */
function pos_create() {
    let p = {
        v: null,
        loc: 0
    };
    return p;
}
/**
 * Are we at the end of this edge?
 * @param p the position to test
 * @return 1 if it is, else 0
 */
function pos_at_edge_end( p ) {
    return p.loc==node_end(p.v,e);
}
/**
 * Add a new bar to the bars array
 * @param bars an array of bar positions
 * @param bar a new bar position to add
 * @return the revised array of bar-positions
 */
function add_bar( bars, bar ) {
    if ( bars == null )
        bars = [];
    bars.push(bar);
    return bars;
}
/**
 * Print a series of bars
 * @param bars the bars themselves
 * @param skip_last print a space instead of a vertical bar for the last bar
 */
function print_bars( bars, skip_last ) {
    if ( bars != null ) {
        let j,i = 0;
        while ( bars[i] != 0 ) {
            let bar_value = bars[i] & BAR_VALUE;
            for ( j=0;j<bar_value;j++ )
                debug_tree += " ";
            if ( !skip_last || bars[i+1]!=0 ) {
                if ( bars[i] & BAR_SPACE )
                    debug_tree += " ";
                else
                    debug_tree += "|";
            }
            i++;
        }
    }
}
/**
 * Print a series of bars and then a CR
 */
function print_bar_line( bars ) {
    print_bars( bars, 0 );
    debug_tree += "\n";
}
/**
 * Print the label of the node
 * @param v the node to print
 * @return number of characters written
 */
function print_label( v ) {
    let i,start,end;
    end = node_end(v,e);
    start = node_start(v);
    debug_tree += "("+v.parent.id+"->"+v.id+")"+start+": ";
    for ( i=node_start(v);i<=end;i++ ) {
        if ( str[i]=='\0' ) // !needs to account for side
            debug_tree += "$";
        else
            debug_tree += str[i];   // ! needs to account for side
    }
    // print terminal star for unfinished leaves
    if ( node_num_children(v)==0 && e < slen )
        debug_tree += "*";
    return end-start+1;
}
/**
 * Set the mode of the final bar in a series
 * @param bars the bar array to modify
 * @param mode the new mode for the last bar
 */
function set_last_bar( bars, mode ) {
    bars[bars.length-1] |= mode;
}
/**
 * Print a tree out left to right by preorder traversal
 * @param v the node to start printing from
 * @param bars array of vertical bars to draw on each line
 */
function print_node( iter, bars ) {
    let depth;
    let first = true;
    while ( node_iterator_has_next(iter) ) {
        let u = node_iterator_next(iter);
        if ( !first ) {
            print_bar_line( bars );
            print_bars( bars, 1 );
            first = false;
        }
        if ( !node_iterator_has_next(iter) )
            set_last_bar(bars,BAR_SPACE);
        debug_tree += "-";
        depth = print_label(u);
        if ( node_is_leaf(u) )
            debug_tree += "\n";
        else
            print_node( node_children(u), add_bar(bars,depth) );
    }
}
/**
 * Print the entire tree recursively
 * @param root the node to start from
 */
function print_tree( root ) {
    print_node( node_children(root), add_bar(null,0) );
    console.log(debug_tree);
}
/**
 * Set the length of each leaf to e recursively
 * @param v the node in question
 */
function set_e( v ) {
    if ( node_is_leaf(v) ) {
        // if a leaf and len != INFINITY then it is already set for version 1
        if ( node_len(v) == INFINITY ){
            node_set_len( v, e-node_start(v) );
        }
    }
    else { 
        let iter = node_children( v );
        if ( iter != null ) {
            while ( node_iterator_has_next(iter) ) {
                let u = node_iterator_next( iter );
                set_e( u );
            }
        }
    }
}
/**
 * Record the position where the latest suffix was inserted
 * @param p the position of j..i-1.
 * @param i the desired index of the extra char
 */
function update_old_beta( p, i ) {
    if ( node_end(p.v,e) > p.loc ) {
        old_beta.v = p.v;
        old_beta.loc = p.loc+1;
    }
    else {
        let u = find_child( p.v, str[i] );
        old_beta.v = u;
        old_beta.loc = node_start( u );
    }
}
/**
 * Walk down the tree from the given node following the given path
 * @param v the node to start from its children
 * @param p the path to walk down and then free
 * @return a position corresponding to end
 */
function walk_down( v, p ) {
    let q = null;
    let start = path_start( p );
    let len = path_len( p );
    let u = v;
    v = find_child( v, str[start] );
    while ( len > 0 ) {
        if ( len <= node_len(v) ) {
            q = pos_create();
            q.loc = node_start(v)+len-1;
            q.v = v;
            break;
        }
        else {
            start += node_len(v);
            len -= node_len(v);
            v = find_child( v, str[start] );
        }
    }
    return q;
}
/**
 * Are two leaf nodes split between the two versions?
 * @param v the first leaf node
* @param w the other leaf node with the same parent
* @return true if they belong to two versions, false otherwise
*/
function leaf_is_split( v, w ) {
    return v.start <= slen && w.start > slen+1;
}
/**
 * Extract the text of a node, counting back to root
 * @param u the node
 * @return a string
 */
function path_extract_text( u ) {
    let e_str = "";
    while ( u != root ) {
        e_str = str.substring(u.start,u.start+node_len_real(u))+e_str;
        u = u.parent;
    }
    return e_str;
}
/**
 * Extract a string back to root and add it to the alignments
 * @param u the node to start from (included) 
 */
function path_extract_align( u ) {
    let text = path_extract_text(u);
    let end = u.start+node_len_real(u);
    let start = end-text.length;
    let a = {start:start,end:end,text:text};
    alignments.push(a);
}
function find_alignments( u ) {
    let nnodes = node_num_children( u );
    if ( nnodes == 2 ) {
        let iter = node_children( u );
        let v = node_iterator_next(iter);
        let w = node_iterator_next(iter);
        if ( node_is_leaf(v) && node_is_leaf(w) && leaf_is_split(v,w) ) {
            if ( node_start(u) >= slen )
                console.log("this shouldn't happen" )
            else
                path_extract_align(u);
        }
        else {
            if ( !node_is_leaf(v) )
                find_alignments( v );
            if ( !node_is_leaf(w) )
                find_alignments( w );
        }
    }
    else {
        let iter = node_children( u );
        while ( node_iterator_has_next(iter) ) {
            let v = node_iterator_next(iter);
            find_alignments(v);
        }
    }
}
/**
 * Sort alignments in situ by decreasing length
 */
function shell_sort() {
    const n = alignments.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        for (let i = gap; i < n; i++) {
            let temp = alignments[i];
            let j = i;
            let t_len = temp.end - temp.start;
            let a_len = alignments[j-gap].end - alignments[j-gap].start;
            for (j=i; j >= gap && a_len < t_len; j -= gap) {
                a_len = alignments[j-gap].end - alignments[j-gap].start;
                alignments[j] = alignments[j-gap];
            }
            alignments[j] = temp;
        }
    }
}
function filter_alignments() {
    shell_sort();
    // now all alignments are in decreasing order by length
    // try to add them to a select set so they don't overlap
    let filtered = [];
    for ( const a of alignments ) {
        let present = false;
        for ( const f of filtered ) {
            if ( (a.start >= f.start && a.start < f.end) 
                || (a.end <= f.end && a.end > f.start) ) {
                    present = true;
                    break;
            }
        }
        if ( !present )
            filtered.push(a);
    }
    return filtered;
}
/**
 * Remove all interior or leaf nodes whose text runs over the middle 
 * @param v the node to start from (initially root)
 */
function prune_tree( v ) {
    let end = v.start+node_len_real(v);
    if ( v.start <= slen && end > slen ) {
        if ( node_is_leaf(v) )
            v.len = slen-v.start;
        else { // internal node with children
            if ( PARENT_HASH(v) ) {
                v.ht = null;
                v.len = slen-v.start;
            }
            else {
                v.len = slen-v.start;
                v.children = null;
            }
        }
    }
    else if ( !node_is_leaf(v) ) {
        let iter = node_children( v );
        let u = node_iterator_next(iter);
        while ( u != null ) {
            prune_tree(u);
            u = node_iterator_next(iter);
        }
    }
}
/** main entry point */
function compare(lhs,rhs) {
    // create I_0 manually
    slen = lhs.length;
    str = lhs+'\0'+rhs+'%';
    // do the lhs first
    root = node_create( 0, 0 );
    f = node_create_leaf( 0 );
    node_add_child( root, f );
    for ( let i=1; i<str.length; i++ )
        phase(i);
    set_e( root );
    // todo: trim all suffixes that cross over middle
    prune_tree( root );
    //print_tree(root);
    find_alignments(root);
    alignments = filter_alignments();
    //find_string( " dog</p></body>", true );
}
compare(left_html,right_html);
for ( const a of alignments )
    console.log(a.start+":"+a.end+"="+a.text);
