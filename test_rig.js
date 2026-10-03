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
var method="Ukkonen";
// global hash of all works indexed by docid
var all_works;
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
 * User selected a new method
 */
function change_method() {
	let select_method = document.getElementById("method");
	method = select_method.value;
	console.log("method is now "+method);
}
/**
 * Get the numeric value of a css dimension
 * @param dimen a dimension like "30px"
 * @return its numeric value
 */
function value_of(dimen) {
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
 * Scale a div to its parent's size
 */
function fit_within_parent( id ) {
	let elem = document.getElementById(id);
	let top_offset = synchro_scroller.get_top_offset(elem);
	let window_height = window.innerHeight;
	// compute the height, set it
	const elem_styles = window.getComputedStyle(elem);
	let v_padding = value_of(elem_styles.getPropertyValue("padding-top"))
		+value_of(elem_styles.getPropertyValue("padding-bottom"));
	let v_border = value_of(elem_styles.getPropertyValue("border-top-width"))
		+value_of(elem_styles.getPropertyValue("border-bottom-width"));
	let temp_height = window_height-(top_offset+v_padding+v_border);
	if ( temp_height > 0 )
		elem.style.height = temp_height+"px";
}
/**
 * Compute the diffs between the lhs and rhs and set them
 */
function compute_diffs() {
	// compute differences and alignments
	let lhs_html = document.getElementById("lhs_body").innerHTML;
	let rhs_html = document.getElementById("rhs_body").innerHTML;
	let lhs_text = html_strip(lhs_html);
	let rhs_text = html_strip(rhs_html);
	let method = document.getElementById("method").value;
	let similarities;
	// check performance
	const start = performance.now();
	if ( method.toLowerCase() == "ukkonen" )
		similarities = calc_alignments(lhs_text,rhs_text);
	else if ( method.toLowerCase() == "myers" )
		similarities = myers_compare(lhs_text,rhs_text);
	else {
		console.log("unimplemented method" + method );
		return;
	}
	// calc run time
	const end = performance.now();
	console.log("Method: "+method+": execution time: "+(end-start)+" ms");
	lhs_html = html_add_diffs(similarities,lhs_html,1);
	rhs_html = html_add_diffs(similarities,rhs_html,2);
	document.getElementById("lhs_body").innerHTML = lhs_html;
	document.getElementById("rhs_body").innerHTML = rhs_html;
	fit_within_parent("lhs_body");
	fit_within_parent("rhs_body");
}
/**
 * Ensure that the layers chosen on the lhs and rhs are different 
 * IF the versions of lhs and rhs are the same
 * @param layer_id the id of the layer select to switch
 * @param layer_value its current value
 * @return the new layer value (or old one)
 */
function switch_layer(layer_id,layer_value) {
	let this_version_id = layer_id.replace("layers","versions");
	let this_version_select = document.getElementById(this_version_id);
	let this_version_value = this_version_select.value;
	let other_version_id,other_version_select,other_version_value;
	if ( this_version_id.includes("lhs") ) 
		other_version_id = this_version_id.replace("lhs","rhs");
	else
		other_version_id = this_version_id.replace("rhs","lhs");
	other_version_select = document.getElementById(other_version_id);
	other_version_value = other_version_select.value;
	if ( other_version_value == this_version_value ) {
		let this_layer_id = this_version_id.replace("versions","layers");
		let other_layer_id = other_version_id.replace("versions","layers");
		let this_layer_select = document.getElementById(this_layer_id);
		let other_layer_select = document.getElementById(other_layer_id);
		if ( this_layer_select.value == other_layer_select.value ) {
			if ( this_layer_select.length > 1 ) {
				let this_select_index = (this_layer_select.selectedIndex+1)%this_layer_select.length;
				layer_value = this_layer_select.options[this_select_index].value;
				this_layer_select.value = layer_value;
			}
		}
	}
	return layer_value;	
}
/**
 * Load the layer content
 * @param side rhs or lhs
 * @param data_path the full data path relative to the sample subdirectory
 */
async function load_layer(side,data_path) {
	let rel_url = "./samples/"+document.getElementById("sample").value+"/"+data_path;
	let html = await load_user_html( rel_url );
	let target = document.getElementById(side+"_body");
	while (target.firstChild)
		target.removeChild(target.lastChild);
	target.innerHTML = html;
}
/**
 * The user changed the layer
 */
async function change_layer(side) {
	let layer_select = document.getElementById(side+"_layers");
	let layer_opt = layer_select.options[layer_select.selectedIndex];
	let layer_storage_key = side+'_layer';
	localStorage.setItem(layer_storage_key,layer_select.value);
	let data_path = layer_opt.getAttribute("data-path");
	await load_layer(side,data_path);
	// need to recompute diffs
	compute_diffs();
}
/**
 * Set the text of a side to its chosen version
 * @param select_id the id of the version dropdown
 * @param versions the object from all_works holding the versions
 * @param version_key the selected version name
 */
async function set_version(select_id,versions,version_key) {
	// set version dropdown if not already set
	let version_select = document.getElementById(select_id);
	version_select.value = version_key;
	// set layer
	let layers = versions[version_key];
	let layer_keys = Object.keys(layers);
	if ( layer_keys.length > 0 ) {
		let layer_id = select_id.replace("versions","layers");
		let layer_select = document.getElementById(layer_id);
		// clear menu out
		while (layer_select.firstChild)
			layer_select.removeChild(layer_select.lastChild);
		// get previously set value
		let layer_storage_key = layer_id.slice(0,3)+'_layer';
		let selected = localStorage.getItem(layer_storage_key);
		if ( layer_select ) {
			// rebuild layer menu
			for ( let layer_key of layer_keys ) {
				let opt = document.createElement('option');
				opt.setAttribute("data-path",layers[layer_key]);
				opt.textContent = layer_key;
				if ( selected != null && selected == layer_key )
					opt.selected = "selected";
				layer_select.appendChild(opt);
			}
			// switch to layer not the same as the other side
			let layer_value = switch_layer(layer_id,layer_select.value);
			// load the layer!
			let selected_option = layer_select.options[layer_select.selectedIndex];
			// save layer value
			localStorage.setItem(layer_storage_key,layer_value);
			await load_layer(layer_id.slice(0,3),selected_option.getAttribute("data-path"));
		}
	}
}
/**
 * Populate a version dropdown
 * @param select_id the version dropdown to populate
 * @param keys the sorted list of version names
 */
function populate_version_dropdown(select_id,keys) {
	let version_select = document.getElementById(select_id);
	// clear menu
	while (version_select.firstChild)
		version_select.removeChild(version_select.lastChild);
	// get previously set value
	let version_storage_key = select_id.slice(0,select_id.length-1);
	let selected = localStorage.getItem(version_storage_key);
	// add new keys
	for ( let key of keys ) {
		let opt = document.createElement('option');
		opt.textContent = key;
		if ( selected != null && selected == key )
			opt.selected = "selected";
		version_select.appendChild(opt);
	}
}
/**
 * User changed the version menu.
 * @param side lhs or rhs
 */
async function change_version(side) {
	let side_versions_key = side+'_versions';
	let side_version_key = side+'_version';
	let side_layer_key = side+'_layer';
	let version_select = document.getElementById(side_versions_key);
	// remember chosen version on refresh
	localStorage.setItem(side_version_key,version_select.value);
	// invalidate stored layer value because version changed
	localStorage.setItem(side_layer_key,null);
	let work_select = document.getElementById("works");
	let work = work_select.value;
	let versions = all_works[work];
	// remember chosen versions on refresh
	let version_storage_key = side_versions_key.slice(0,side_versions_key.length-1);
	localStorage.setItem(version_storage_key, version_select.value);
	await set_version(side_versions_key,versions,version_select.value);
	// compute diffs here because BOTH sides need recomputing
	compute_diffs();
	// also need to rebuild scroll tables
	synchro_scroller.build_scroll_tables("lhs_body","rhs_body");
}
/** 
 * User selected a new work from the dropdown
 */
async function change_work() {
	let work_select = document.getElementById("works");
	let work = work_select.value;
	// remember chosen work on refresh
	localStorage.setItem('docid', work);
	// invalidate saved versions and layers now invalid
	localStorage.setItem('lhs_version', null);
	localStorage.setItem('rhs_version', null);
	localStorage.setItem('lhs_layer', null);
	localStorage.setItem('rhs_layer', null);
	let versions = all_works[work];
	let keys = Object.keys(versions);
	keys.sort();
	populate_version_dropdown("lhs_versions",keys);
	populate_version_dropdown("rhs_versions",keys);
	await set_version("lhs_versions",versions,keys[0]);
	if ( keys.length > 1 )
		await set_version("rhs_versions",versions,keys[1]);
	else
		await set_version("rhs_versions",versions,keys[0]);
	compute_diffs();
	synchro_scroller.build_scroll_tables("lhs_body","rhs_body");
}
/**
 * Load the default style sheet inline
 */
async function set_sample_css() {
	// sample menu already set to saved value
	let sample = document.getElementById("sample").value;
	let css_url = "./samples/"+sample+"/default.css";
	let css = await load_user_html(css_url);
	let style = document.createElement("style");
	style.innerHTML = css;
	document.head.appendChild(style);
}
/**
 * Digest the raw index into a nested object of works
 * @param raw_index the index read off disk, one entry per layer
 * @return a nested index works->versions->layers
 */
function digest_works(raw_index) {
	let index = {};
	// each item: {"layer":<l>,"version":<v>,"work":<w>,"path":<p>}
	for ( let item of raw_index ) {
		let work;
		if ( index.hasOwnProperty(item.work) )
			work = index[item.work];
		else {
			work = {};
			index[item.work] = work;
		}
		// now work is present in the index 
		let version;
		if ( work.hasOwnProperty(item.version) )
			version = work[item.version];
		else {
			version = {};
			work[item.version] = version;
		}
		// now version is present in the work
		// add path to layer
		version[item.layer] = item.path;
	}
	return index;
}
/**
 * Populate the top level sample index
 */
async function populate_sample_index(){
	let works = null;
	// top_level is a JSON array of strings
	let top_level = await load_user_json('./samples/index.json');
	if ( top_level.length > 0 ) {
		// get sample menu
		let select = document.getElementById("sample");
		// clear it out
		while (select.firstChild)
    		select.removeChild(select.lastChild);
		let sample_set = localStorage.getItem('sample_set');
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
		// load the index for the first sample set
		let raw_index = await load_user_json('./samples/'+select.firstElementChild.textContent+'/index.json');
		// raw index is a JSON array of objects describing layers
		if ( raw_index.length > 0 ) {
			// deduce the works and create a hierarchical index of them
			works = digest_works(raw_index);
			let works_select = document.getElementById("works");
			// clear out works menu
			while (works_select.firstChild)
    			works_select.removeChild(works_select.lastChild);
			// sort works index
			let works_keys = Object.keys(works);
			// fetch selected document id
			let docid = localStorage.getItem('docid');
			works_keys.sort();
			for ( let key of works_keys ) {
				let opt = document.createElement('option');
				opt.textContent = key;
				if ( docid != null && docid == key )
					opt.selected = "selected";
				works_select.appendChild(opt);
			}
			// set default
			if ( docid == null )
				localStorage.setItem('docid',docid);
		}
	}
	return works;
}
/**
 * Load the entire page
 */
async function reload_page() {
	all_works = await populate_sample_index();
	await set_sample_css();
	await change_work();	// computes diffs
}
