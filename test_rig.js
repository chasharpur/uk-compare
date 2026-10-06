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
// NB the change_* functions are ONLY invoked by the user in the GUI
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
 * *** NB: invoked by GUI only ***
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
function get_local_storage(key) {
	let value = localStorage.getItem(key);
	if ( value == "null" || value == "" )
		return null;
	else
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
			// else nothing to change it to
		}
	}
	// else don't change the layer value
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
 *  *** NB: invoked by GUI only ***
 */
async function change_layer(side) {
	let other_side = (side=='lhs')?'rhs':'lhs';
	let layer_select = document.getElementById(side+"_layers");
	let layer_opt = layer_select.options[layer_select.selectedIndex];
	// must also reload other side, as it contains dels or adds
	let other_layer_select = document.getElementById(other_side+"_layers");
	let other_layer_opt = layer_select.options[other_layer_select.selectedIndex];
	// save this layer menu selection
	localStorage.setItem(side+'_layer',layer_select.value);
	// load the two sides
	let data_path = layer_opt.getAttribute("data-path");
	let other_data_path = other_layer_opt.getAttribute("data-path");
	await load_layer(side,data_path);
	await load_layer(other_side,other_data_path);
	// recompute diffs
	compute_diffs();
	// and scroll tables
	synchro_scroller.build_scroll_tables("lhs_body","rhs_body");
}
/**
 * Fill the layers dropdown for the relevant side
 * @param side lhs or rhs
 */
function populate_layers_dropdown(side) {
	let work_select = document.getElementById('works');
	let versions = all_works[work_select.value];
	let version_select = document.getElementById(side+'_versions');
	let layers = versions[version_select.value];
	let layer_keys = Object.keys(layers);
	if ( layer_keys.length > 0 ) {
		layer_keys.sort();
		let layer_select = document.getElementById(side+'_layers');
		// clear menu out
		while (layer_select.firstChild)
			layer_select.removeChild(layer_select.lastChild);
		// get previously set value
		let layer_storage_key = side+'_layer';
		let selected = get_local_storage(layer_storage_key);
		// rebuild layer menu
		for ( let layer_key of layer_keys ) {
			let opt = document.createElement('option');
			opt.setAttribute("data-path",layers[layer_key]);
			opt.textContent = layer_key;
			if ( selected != null && selected == layer_key )
				opt.selected = "selected";
			layer_select.appendChild(opt);
		}
	}
	else
		throw new Error('empty layers for version '+version_select.value);
}
/**
 * Set and load a layer
 * @param side the side of the layer to load
 */
async function set_layer(side) {
	let layer_id = side+'_layers';
	let layer_value = get_local_storage(side+'_layer');
	layer_select = document.getElementById(layer_id);
	if ( layer_value == null )
		layer_value = layer_select.value;
	else
		layer_select.value = layer_value;
	// switch to layer not the same as the other side
	layer_value = switch_layer(layer_id,layer_value);
	// save layer value
	localStorage.setItem(side+'_layer',layer_value);
	// load the layer!
	let selected_option = layer_select.options[layer_select.selectedIndex];
	await load_layer(side,selected_option.getAttribute("data-path"));
}
/**
 * Set the text of a side to its chosen version
 * @param side the side: lhs or rhs
 * @param version_key the selected version name
 */
async function set_version(side,version_key) {
	let select_id = side+"_versions";
	let version_select = document.getElementById(select_id);
	version_select.value = version_key;
	localStorage.setItem(side+'_version',version_key);
	populate_layers_dropdown(side);
	await set_layer(side);
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
	let selected = get_local_storage(version_storage_key);
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
 * *** NB: invoked by GUI only ***
 * @param side lhs or rhs
 */
async function change_version(side) {
	let version_select = document.getElementById(side+'_versions');
	localStorage.setItem(side+'_version',version_select.value);
	localStorage.setItem(side+'_layer',null);
	await set_version(side,version_select.value);
	// need to clear out diffs from other side before recomputing
	let other_side = (side=='lhs')?'rhs':'lhs';
	let other_version_select = document.getElementById(other_side+'_versions');
	await set_version(other_side,other_version_select.value);
	// compute diffs here because BOTH sides need recomputing
	compute_diffs();
	// also need to rebuild scroll tables
	synchro_scroller.build_scroll_tables("lhs_body","rhs_body");
}
/** 
 * Load a given work and its versions from stored values
 */
async function reload_work() {
	let work = get_local_storage('docid');
	if ( work == null ) {
		let work_keys = Object.keys(all_works);
		if ( work_keys.length > 0 ) {
			work = work_keys[0];
			invalidate_stored_data(false,true,true);
			localStorage.setItem('docid',work);
		}
		else
			throw new Error("no works found in sample index!");
	}
	// make sure work is set correctly
	let work_select = document.getElementById("works");
	if ( work_select.value != work )
		work_select.value = work;
	// set up version menu
	let versions = all_works[work];
	let version_keys = Object.keys(versions);
	version_keys.sort();
	populate_version_dropdown("lhs_versions",version_keys);
	populate_version_dropdown("rhs_versions",version_keys);
	// fetch stored, or set default version
	let lhs_version = get_local_storage('lhs_version');
	let rhs_version = get_local_storage('rhs_version');
	// if stored versions are empty use defaults
	if ( lhs_version == null )
		lhs_version = version_keys[0];
	if ( rhs_version == null ) {
		if ( version_keys.length > 1 )
			rhs_version = version_keys[1];
		else
			rhs_version = version_keys[0];
	}
	let start = performance.now();
	await set_version("lhs",lhs_version);
	let end = performance.now();
	console.log("loaded first version in "+(end-start)+" milliseconds");
	await set_version("rhs",rhs_version);
	end = performance.now();
	console.log("loaded second version in "+(end-start)+" milliseconds");
	compute_diffs();
	synchro_scroller.build_scroll_tables("lhs_body","rhs_body");
}
/** 
 * User selected a new work from the dropdown
 * *** NB: invoked by GUI only ***
 */
async function change_work() {
	let work_select = document.getElementById("works");
	let work = work_select.value;
	// remember chosen work on refresh
	localStorage.setItem('docid', work);
	// clear version and layer data
	invalidate_stored_data(false,true,true);
	await reload_work();
}
/**
 * Invalidate 
 */
function invalidate_stored_data(clear_work,clear_version,clear_layer) {
	if ( clear_work )
		localStorage.setItem('docid',null);
	if ( clear_version ) {
		localStorage.setItem('lhs_version', null);
		localStorage.setItem('rhs_version', null);
	}
	if ( clear_layer ) {
		localStorage.setItem('lhs_layer', null);
		localStorage.setItem('rhs_layer', null);
	}
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
async function load_sample_index(){
	let works = null;
	let select = document.getElementById("sample");
	localStorage.setItem('sample_set',select.value);
	// load the index for the first sample set
	let raw_index = await load_user_json('./samples/'+select.options[select.selectedIndex].textContent+'/index.json');
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
		let docid = get_local_storage('docid');
		works_keys.sort();
		let present = false;
		for ( let key of works_keys ) {
			let opt = document.createElement('option');
			opt.textContent = key;
			if ( docid != null && docid == key ) {
				opt.selected = "selected";
				present = true;
			}
			works_select.appendChild(opt);
		}
		if ( !present )
			localStorage.setItem('docid',works_keys[0]);
	}
	return works;
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
		works = await load_sample_index();
	}
	return works;
}
/**
 * The user changed the sample index menu
 * *** NB: invoked by GUI only ***
 */
async function change_sample() {
	// reset stored data, now invalid
	invalidate_stored_data(true,true,true);
	all_works = await load_sample_index();
	await set_sample_css();
	await reload_work();	// computes diffs
}
/**
 * Load the entire page
 */
async function reload_page() {
	// use stored data for work, versions + layers
	all_works = await populate_sample_index();
	await set_sample_css();
	await reload_work();	// computes diffs
}
