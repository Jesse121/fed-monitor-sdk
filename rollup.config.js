import babel from "rollup-plugin-babel";
import { uglify } from "rollup-plugin-uglify";

export default {
	input: "src/main.js",
	output: {
		file: "dist/monitor.js",
		name: "monitor",
		format: "iife"
	},
	plugins: [
		// uglify(),
		babel({
			exclude: "node_modules/**"
		})
	]
};
