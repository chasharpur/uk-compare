var method="Ukkonen";
async function load_user_data(file) {
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
	let top_level = await load_user_data('./samples/index.json');
	if ( top_level.length > 0 ) {
		let select = document.getElementById("sample");
		while (select.firstChild)
    		select.removeChild(select.lastChild);
		for ( let name of top_level ) {
			let opt = document.createElement('option');
			opt.textContent = name;
			select.appendChild(opt);
		}
		let raw_index = await load_user_data('./samples/'+select.firstElementChild.textContent+'/index.json');
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
function set_version(select_id,key) {
	let version_select = document.getElementById(select_id);
	version_select.value = key;
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
function change_work() {
	let work_select = document.getElementById("works");
	let work = work_select.value;
	let versions = all_works[work];
	let keys = Object.keys(versions);
	populate_version_dropdown("lhs_files",keys);
	populate_version_dropdown("rhs_files",keys);
	set_version("lhs_files",keys[0]);
	if ( keys.length > 1 )
		set_version("rhs_files",keys[1]);
	else
		set_version("rhs_files",keys[0]);
}
var all_works;
async function reload_page() {
	all_works = await populate_sample_index();
	change_work();
}
