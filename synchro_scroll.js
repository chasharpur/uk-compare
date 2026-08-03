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
/**
 * Coordinate the scrolling of the two panels
 */
class synchro_scroller {
	static left_div;
	static right_div;
	static right_scroll_top;
	static scroller;
	static right_offsets_to_ids;
	static left_offsets_to_ids;
	static left_ids_to_offsets;
	static right_ids_to_offsets;
	static left_scroll_top;
	static right_scroll_top;
	static timeout_id;
	static banned;
	/**
	 * Get the element's offset from the top relative to the document
	 */
	static get_top_offset(elem) {
		const rect = elem.getBoundingClientRect();
		return rect.top + window.scrollY;
	}
	/**
     * Look for spans with an id attribute set
     * @param elem the element to search from
     * @param hash the hashtable to store the id->offset key-value
     * @param index the sorted offset array giving us the id
     */
    static find_ids( elem, hash, index ) {
        if ( elem.nodeName == "SPAN"
			&& elem.getAttribute('id') != null ) {
			let id_attr = elem.getAttribute('id');
			const elem_styles = window.getComputedStyle(elem);
			let elem_display = elem_styles.getPropertyValue("display");
			const parent_styles = window.getComputedStyle(elem.parentElement);
			let parent_display = parent_styles.getPropertyValue("display")
			if ( elem_display =="none" || parent_display =="none" ) {
				let top_off = synchro_scroller.get_top_offset(elem);
				synchro_scroller.banned[id_attr] = top_off;
				if ( id_attr.charAt(0)=='a' )
					synchro_scroller.banned['d'+id_attr.substr(1)] = top_off;
				else
					synchro_scroller.banned['a'+id_attr.substr(1)] = top_off;
			}
			else if ( !Object.hasOwn(synchro_scroller.banned,id_attr) ) {
				let span_offset = synchro_scroller.get_top_offset(elem);
				hash[id_attr] = span_offset;
				index.push( {offset: span_offset, id: id_attr} );
			}
		}
		else {
			for (const child of elem.children) {
				synchro_scroller.find_ids( child, hash, index );
			}
		}
		if ( elem.nextElementSibling != null )
	        synchro_scroller.find_ids( elem.nextElementSibling, hash, index );
	}
	/**
     * Find the highest offset in a sorted list of {offset, id} objects
     * @param list the list of objects
     * @param value the value which should be just a bit less or equal
     * @return the index of the item just a bit bigger than value
     */
    static find_highest_index( list, value ) {
        let top = 0;
        let bot = list.length-1;
        let mid=0;
        while ( top <= bot ) {
            mid = Math.floor((top+bot)/2);
            if ( value < list[mid].offset ) {
                if ( mid == 0 ) {
                    // value < than first item
                    return -1;
                }
                else
                    bot = mid-1;
            }
			// value >= list[mid].loc
            else {
            
                if ( mid == list.length-1 )
                    // value is >= last item
                    break;
                else if ( value >= list[mid+1].offset )
                    top = mid+1;
                else // list[mid] must be biggest <= value
                    break;
            }
        }
        return mid;
    }
	/**
     * Set a timeout for when we reset the .scroller field
     */
    static set_scroll_timeout() {
        if ( synchro_scroller.timeout_id == 0 ) {
            synchro_scroller.timeout_id = window.setTimeout(function(){
                synchro_scroller.scroller=undefined;
                synchro_scroller.timeout_id = 0;
                synchro_scroller.left_scroll_top = synchro_scroller.left_div.scrollTop;
                synchro_scroller.right_scroll_top = synchro_scroller.right_div.scrollTop;
            // this should be fairly coarse-grained
            // the shortest time for switching between scroll-sides
            }, 300);
		}
    }
	static value_of(dimen) {
		let value = 0;
		for ( let i=0;i<dimen.length;i++ ) {
			let token = dimen[i];
			if ( token >= '0' && token <= '9' ) {
				value *= 10;
				value += token - '0';
			}
			else
				break;
		}
		return value;
	}
	/**
	 * Call this routine every 70 milliseconds
	 * We keep scrolling one side until the timeout every 300 milliseconds
	 * Then we MAY switch. If synchro_scroller.scroller is undefined we set 
	 * it to left or right depending on which side changed.
	 * Then we re-launch the timeout
	 */
	static scroll() {
		let left_top = synchro_scroller.left_div.scrollTop;
		let right_top = synchro_scroller.right_div.scrollTop;
		// did right side scroll value change?
		if ( right_top != synchro_scroller.right_scroll_top ) {
			// are we still scrolling right or is the side temporarily unset?
			if ( synchro_scroller.scroller==undefined || synchro_scroller.scroller=="right" ) {
				let left_offset = 0;
				synchro_scroller.scroller = "right";
				let r_index = synchro_scroller.find_highest_index( synchro_scroller.right_offsets_to_ids,
					right_top+synchro_scroller.value_of(synchro_scroller.right_div.style.height)/2 );
				if ( r_index == -1 )
					left_offset = 0;
				else {
					let right_id = synchro_scroller.right_offsets_to_ids[r_index].id;
					let left_id = "d"+right_id.slice(1);
					// find offset of left id
					let left_entry = synchro_scroller.left_ids_to_offsets[left_id];
					if ( left_entry != undefined ) {
						left_offset = Math.round( left_entry
						-synchro_scroller.value_of(synchro_scroller.left_div.style.height)/2);
						if ( left_offset < 0 )
							left_offset = 0;
						synchro_scroller.left_scroll_top = left_offset;
						synchro_scroller.left_div.scrollTop = left_offset;  
					}
				}
				synchro_scroller.right_scroll_top = right_top;
				synchro_scroller.set_scroll_timeout();  
			}
			else
				console.log("ignoring left scroll")
		}
		if ( left_top != synchro_scroller.left_scroll_top ) {
			if (synchro_scroller.scroller==undefined||synchro_scroller.scroller=="left") {
				let right_offset = 0;
				synchro_scroller.scroller = "left";
				let l_index = synchro_scroller.find_highest_index( synchro_scroller.left_offsets_to_ids,
					left_top+synchro_scroller.value_of(synchro_scroller.left_div.style.height)/2);
				if ( l_index == -1 )
					right_offset = 0;
				else {
					let left_id = synchro_scroller.left_offsets_to_ids[l_index].id;
					let right_id = "a"+left_id.slice(1);
					// find offset of right id
					let right_value = synchro_scroller.right_ids_to_offsets[right_id];
					if ( right_value != undefined ) {
						right_offset = Math.round(right_value
							-synchro_scroller.value_of(synchro_scroller.right_div.style.height)/2);
						if ( right_offset < 0 )
							right_offset = 0;
						synchro_scroller.right_scroll_top = right_offset;
						synchro_scroller.right_div.scrollTop = right_offset; 
					}
					// else maybe no corresponding right entry
				}
				synchro_scroller.left_scroll_top = left_top;
				synchro_scroller.set_scroll_timeout(); 
			}
			else
				console.log("ignoring right scroll");
		}
		// wait until one side stabilises
	}
	static build_left_scroll_tables() {
		synchro_scroller.left_div.scrollTop = 0;
		synchro_scroller.left_scroll_top = 0;
		synchro_scroller.left_ids_to_offsets = {};
		synchro_scroller.left_offsets_to_ids = new Array();
		synchro_scroller.find_ids( synchro_scroller.left_div.children.item(0), 
			synchro_scroller.left_ids_to_offsets, synchro_scroller.left_offsets_to_ids );
		synchro_scroller.left_offsets_to_ids.sort((a,b)=>a.offset-b.offset );
	/*        for ( var i=0;i<50;i++ )
			console.log("left:"+this.leftOffsetsToIds[i].offset+" "+this.leftOffsetsToIds[i].id);*/
	}
	static build_right_scroll_tables() {
		synchro_scroller.right_div.scrollTop = 0;
		synchro_scroller.right_scroll_top = 0;
		synchro_scroller.right_ids_to_offsets = {};
		synchro_scroller.right_offsets_to_ids = new Array();
		synchro_scroller.find_ids( synchro_scroller.right_div.children.item(0), 
			synchro_scroller.right_ids_to_offsets, synchro_scroller.right_offsets_to_ids );
		synchro_scroller.right_offsets_to_ids.sort((a,b)=>a.offset-b.offset );
		// wait until both lists are loaded 
		// this should be fairly fine-grained
		setInterval(synchro_scroller.scroll,70);
	}
	/**
	 * Set up synchro-scrolling
	 */
	static build_scroll_tables(left_id,right_id) {
		try {
			// perform sanity checks before proceeding
			let lhs = document.getElementById(left_id);
			synchro_scroller.left_div = lhs;
			let rhs = document.getElementById(right_id);
			synchro_scroller.right_div = rhs;
			if ( synchro_scroller.left_div == null || synchro_scroller.right_div == null 
				|| synchro_scroller.left_div.tagName != "DIV" || synchro_scroller.right_div.tagName != "DIV" ) {
				throw new Error("left and right IDs must exist and belong to divs");
			}
			let left_styles = window.getComputedStyle(lhs);
			let right_styles = window.getComputedStyle(rhs);
			if ( left_styles.getPropertyValue("overflow-y")	!= "auto" 
				|| right_styles.getPropertyValue("overflow-y") != "auto" ) {
					throw new Error("overflow-y property not set for scrolling div");
			}
			synchro_scroller.timeout_id = 0
			synchro_scroller.banned = {};
			synchro_scroller.build_left_scroll_tables();
			synchro_scroller.build_right_scroll_tables();
		}
		catch ( e ) {
			console.log(e);
		}
	}
}
