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
 * Functions to monitor memory usage that only work in Chrome
 */
var min_heap_used;
var max_heap_used;
var time_checkpoint;
/**
 * Update memory usage
 */
export function check_memory_usage() {
	if ( performance.memory ) {
		if ( max_heap_used < performance.memory.usedJSHeapSize )
			max_heap_used = performance.memory.usedJSHeapSize;
		if ( min_heap_used > performance.memory.usedJSHeapSize )
			min_heap_used = performance.memory.usedJSHeapSize;
	}
}
/**
 * Reset memory and cpu counters to their default values
 */
export function monitor_reset() {
	min_heap_used = Number.MAX_SAFE_INTEGER;
	max_heap_used = 0;
	time_checkpoint = performance.now();
}
/**
 * Report memory usage to the console
 */
export function report_memory_usage() {
	check_memory_usage();
	if ( performance.memory ){
		console.log("memory used: "+((max_heap_used-min_heap_used)/1048576)+"MB");
	}
}
/**
 * Rport on cpu usage since cpu_reset
 */
export function report_cpu(method) {
	let end = performance.now();
	console.log("Method: "+method+": execution time: "+(end-time_checkpoint)+" ms");
}
