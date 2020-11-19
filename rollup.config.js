import babel from "rollup-plugin-babel";
import { uglify } from "rollup-plugin-uglify";

export default {
	input: "src/main.js",
	output: {
		file: "dist/monitor.js",
		name: "monitor",
		exports: "default"
	},
	plugins: [
		process.env.NODE_ENV === "production" && uglify(),
		babel({
			exclude: "node_modules/**"
		})
	]
};
