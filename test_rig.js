var method="Ukkonen";
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
 * Digest the raw index into a nested object of works
 * @param raw_index the index read off disk, one entry per layer
 * @return a nested index works->versions->layers
 */
function digest_works(raw_index) {
	let index = {};
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
		version[item.layer] = item.path;
	}
	return index;
}
async function populate_sample_index(){
	let works = null;
	let top_level = await load_user_json('./samples/index.json');
	if ( top_level.length > 0 ) {
		let select = document.getElementById("sample");
		while (select.firstChild)
    		select.removeChild(select.lastChild);
		for ( let name of top_level ) {
			let opt = document.createElement('option');
			opt.textContent = name;
			select.appendChild(opt);
		}
		let raw_index = await load_user_json('./samples/'+select.firstElementChild.textContent+'/index.json');
		if ( raw_index.length > 0 ) {
			works = digest_works(raw_index);
			let works_select = document.getElementById("works");
			while (works_select.firstChild)
    			works_select.removeChild(works_select.lastChild);
			for ( let key in works ) {
				let obj = works[key];
				let opt = document.createElement('option');
				opt.textContent = key;
				works_select.appendChild(opt);
			}
		}
	}
	return works;
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
async function change_layer(side) {
	let layer_select = document.getElementById(side+"_layers");
	let layer_opt = layer_select.options[layer_select.selectedIndex];
	let data_path = layer_opt.getAttribute("data-path");
	let rel_url = "./samples/"+document.getElementById("sample").value+"/"+data_path;
	let html = await load_user_html( rel_url);
	let target = document.getElementById(side+"_body");
	while (target.firstChild)
		target.removeChild(target.lastChild);
	target.innerHTML = html;
}
async function set_version(select_id,versions,version_key) {
	let version_select = document.getElementById(select_id);
	version_select.value = version_key;
	// set layer
	let layers = versions[version_key];
	let layer_keys = Object.keys(layers);
	if ( layer_keys.length > 0 ) {
		let layer_id = select_id.replace("versions","layers");
		let layer_select = document.getElementById(layer_id);
		while (layer_select.firstChild)
			layer_select.removeChild(layer_select.lastChild);
		if ( layer_select ) {
			for ( let layer_key of layer_keys ) {
				let opt = document.createElement('option');
				opt.setAttribute("data-path",layers[layer_key]);
				opt.textContent = layer_key;
				layer_select.appendChild(opt);
			}
			// load the layer!
			let load_key = switch_layer(layer_id,layer_select.value);
			let rel_url = "./samples/"+document.getElementById("sample").value+"/"+layers[load_key];
			let html = await load_user_html( rel_url);
			let target = document.getElementById(select_id.replace("versions","body"));
			while (target.firstChild)
				target.removeChild(target.lastChild);
			target.innerHTML = html;
		}
	}
}
function populate_version_dropdown(select_id,keys) {
	let version_select = document.getElementById(select_id);
	while (version_select.firstChild)
		version_select.removeChild(version_select.lastChild);
	for ( let key of keys ) {
		let opt = document.createElement('option');
		opt.textContent = key;
		version_select.appendChild(opt);
	}
}
/** 
 * User selected a new work
 */
async function change_work() {
	let work_select = document.getElementById("works");
	let work = work_select.value;
	let versions = all_works[work];
	let keys = Object.keys(versions);
	populate_version_dropdown("lhs_versions",keys);
	populate_version_dropdown("rhs_versions",keys);
	await set_version("lhs_versions",versions,keys[0]);
	if ( keys.length > 1 )
		await set_version("rhs_versions",versions,keys[1]);
	else
		await set_version("rhs_versions",versions,keys[0]);
	// compute differences
	let lhs_html = document.getElementById("lhs_body").innerHTML;
	let rhs_html = document.getElementById("rhs_body").innerHTML;
	let lhs_text = html_strip(lhs_html);
	let rhs_text = html_strip(rhs_html);
	(lhs_text,rhs_text);
}
var all_works;
async function set_sample_css() {
	let sample = document.getElementById("sample").value;
	let css_url = "./samples/"+sample+"/default.css";
	let css = await load_user_html(css_url);
	let style = document.createElement("style");
	style.innerHTML = css;
	document.head.appendChild(style);
}
async function reload_page() {
	all_works = await populate_sample_index();
	await set_sample_css();
	await change_work();
}
