import { captureError, proxyFetch, proxyXhr } from "./capture";
import { reportData } from "./report";

function main(option) {
	let filterUrl = ["livereload.js?snipver=1", "/sockjs-node/"];
	let opt = {
		// 上报地址
		domain: "http://localhost/api",
		// 脚本延迟上报时间
		delay: 300,
		// 是否是单页面应用
		isSPA: true,
		// 是否上报页面性能数据
		isReportPerformance: true,
		// 是否上报错误信息
		isReportError: true,
		// 请求时需要过滤的url信息
		filterUrl: [],
		// 是否上报请求接口性能数据
		isReportApiRequest: true,
		// 支持特殊自定义上报方式
		fn: null,
		// 其他上报
		add: {}
	};
	opt = Object.assign(opt, option);
	opt.filterUrl = opt.filterUrl.concat(filterUrl);

	// error上报
	if (opt.isReportError) captureError();

	// 非SPA上报页面性能数据
	if (!opt.isSPA) {
		addEventListener(
			"load",
			function () {
				reportData(opt, "performance");
			},
			false
		);
	}

	if (opt.isReportApiRequest) {
		// 拦截fetch请求
		proxyFetch(opt);
		// 拦截xhr请求
		proxyXhr(opt);
	}
}
// 提供给第三方上报错误信息
main.addError = function (err) {
	err = {
		type: err.type,
		data: {
			url: err.data.url,
			msg: err.data.msg,
			stack: err.data.stack,
			col: err.col || 0,
			line: err.line || 0
		}
	};
	main.ERRORLIST.push(err);
};
main.addData = function (fn) {
	fn && fn(ADDDATA);
};
main.ERRORLIST = [];
main.ADDDATA = {};

export default main;
