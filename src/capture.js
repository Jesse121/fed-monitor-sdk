import { reportData } from "./report";

// error default
const errorInfo = {
	type: "",
	data: {
		msg: "",
		url: "",
		stack: ""
	}
};

const requestInfo = {
	url: "",
	statusCode: 0,
	timeConsuming: 0,
	responseMsg: ""
};

export const conf = {
	// 页面性能列表
	performance: {},
	// 错误列表
	errorList: [],
	// 接口请求列表
	requestList: [],

	// 页面fetch数量
	fetchNum: 0,
	// ajax onload数量
	loadNum: 0,
	// 页面ajax数量
	ajaxLength: 0,
	// 页面fetch总数量
	fetLength: 0,
	// 页面ajax信息
	ajaxMsg: {},
	// ajax成功执行函数
	goingType: "",
	// 是否有ajax
	haveAjax: false,
	// 是否有fetch
	haveFetch: false,
	// 来自域名
	preUrl: document.referrer && document.referrer !== location.href ? document.referrer : "",
	// 当前页面
	page: ""
};

// 捕获error信息
export function captureError(opt) {
	// img,script,css,jsonp
	window.addEventListener(
		"error",
		function (e) {
			let defaults = Object.assign({}, errorInfo);
			defaults.type = "loadError";
			defaults.data = {
				msg: e.target.href || e.target.currentSrc + " is load error"
			};
			if (e.target != window) conf.errorList.push(defaults);
		},
		true
	);
	// js
	window.onerror = function (msg, _url, line, col, error) {
		let defaults = Object.assign({}, errorInfo);
		setTimeout(function () {
			col = col || (window.event && window.event.errorCharacter) || 0;
			defaults.type = "jsError";
			defaults.data = {
				msg: msg,
				stack: error && error.stack ? error.stack.toString() : "",
				line: line,
				col: col
			};
			conf.errorList.push(defaults);
			// 上报错误信息
			if (conf.page === location.href) reportData(opt, "error");
		}, 0);
	};
	window.addEventListener("unhandledrejection", function (e) {
		const error = e && e.reason;
		const message = error.message || "";
		const stack = error.stack || "";
		// Processing error
		let col, line;
		let errs = stack.match(/\(.+?\)/);
		if (errs && errs.length) errs = errs[0];
		// errs = errs.replace(/\w.+[js|html]/g, $1 => {
		// 	resourceUrl = $1;
		// 	return "";
		// });
		errs = errs.split(":");
		if (errs && errs.length > 1) line = parseInt(errs[1] || 0);
		col = parseInt(errs[2] || 0);
		let defaults = Object.assign({}, errorInfo);
		defaults.type = "unhandledrejection";
		defaults.data = {
			msg: message,
			line,
			col
		};
		conf.errorList.push(defaults);
		if (conf.page === location.href) reportData(opt, "error");
	});
	// 重写console.error
	const oldError = console.error;
	console.error = function (e) {
		let defaults = Object.assign({}, errorInfo);
		console.log(e);
		setTimeout(function () {
			defaults.type = "console";
			defaults.data = {
				stack: e
			};
			conf.errorList.push(defaults);
			if (conf.page === location.href) reportData(opt, "error");
		}, 0);
		return oldError.apply(console, arguments);
	};
}

// 拦截xhr请求
export function proxyXhr(opt) {
	function ajaxEventTrigger(event) {
		const ajaxEvent = new CustomEvent(event, { detail: this });
		window.dispatchEvent(ajaxEvent);
	}

	const oldXHR = window.XMLHttpRequest;
	function newXHR() {
		var realXHR = new oldXHR();
		realXHR.addEventListener(
			"readystatechange",
			function () {
				ajaxEventTrigger.call(this, "ajaxReadyStateChange");
			},
			false
		);
		return realXHR;
	}

	let gapTime = 0; // 计算请求延时
	let startTime = 0;
	window.XMLHttpRequest = newXHR;
	window.addEventListener("ajaxReadyStateChange", function (e) {
		var xhr = e.detail;
		var status = xhr.status;
		var readyState = xhr.readyState;
		if (readyState === 1) {
			startTime = new Date().getTime();
		}
		if (readyState === 4) {
			gapTime = new Date().getTime() - startTime;
		}
		/**
		 * 上报请求信息
		 */
		if (readyState === 4) {
			// 过滤请求
			const result = opt.filterUrl.some(item => {
				return xhr.responseURL.includes(item);
			});
			if (result) return false;

			if (status === 200) {
				// 接口正常响应时捕获接口响应耗时
				let defaults = Object.assign({}, requestInfo);
				(defaults.url = xhr.responseURL),
					(defaults.statusCode = xhr.status),
					(defaults.timeConsuming = gapTime),
					conf.requestList.push(defaults);
			} else if (status !== 401) {
				// 接口异常时捕获异常接口及状态码
				let defaults = Object.assign({}, requestInfo);
				(defaults.url = xhr.responseURL),
					(defaults.statusCode = xhr.status),
					(defaults.timeConsuming = gapTime),
					(defaults.responseMsg = xhr.responseText);
				conf.requestList.push(defaults);
			}
			reportData(opt, "request");
		}
	});
}

// 拦截fetch请求
export function proxyFetch() {
	if (!window.fetch) return;
	const oldFetch = fetch;
	window.fetch = function () {
		const _arg = arguments;
		const result = fetArg(_arg);
		if (result.type !== "report-data") {
			clearPerformance();
			const url = result.url ? result.url.split("?")[0] : "";
			conf.ajaxMsg[url] = result;
			conf.fetLength = conf.fetLength + 1;
			conf.haveFetch = true;
		}
		const fetchStartTime = new Date().getTime();
		return oldFetch
			.apply(this, arguments)
			.then(res => {
				if (result.type === "report-data") return res;
				try {
					const url = res.url ? res.url.split("?")[0] : "";
					res
						.clone()
						.text()
						.then(data => {
							if (conf.ajaxMsg[url]) conf.ajaxMsg[url]["decodedBodySize"] = data.length;
						});
				} catch (e) {}
				getFetchTime(fetchStartTime);
				return res;
			})
			.catch(err => {
				if (result.type === "report-data") return;
				getFetchTime(fetchStartTime);
				//error
				let defaults = Object.assign({}, errorInfo);
				defaults.time = new Date().getTime();
				defaults.type = "fetch";
				defaults.msg = "fetch request error";
				defaults.method = result.method;
				// defaults.errorPageUrl =
				defaults.data = {
					resourceUrl: result.url,
					text: err.stack || err,
					status: 0
				};
				conf.errorList.push(defaults);
				return err;
			});
	};
}

// 统计页面性能
export function perforPage() {
	if (!window.performance) return;
	let timing = performance.timing;
	conf.performance = {
		// DNS解析时间
		dnst: timing.domainLookupEnd - timing.domainLookupStart || 0,
		//TCP建立时间
		tcpt: timing.connectEnd - timing.connectStart || 0,
		// 白屏时间
		wit: timing.responseStart - timing.navigationStart || 0,
		//dom渲染完成时间
		domt: timing.domContentLoadedEventEnd - timing.navigationStart || 0,
		//页面onload时间
		lodt: timing.loadEventEnd - timing.navigationStart || 0,
		// 页面准备时间
		radt: timing.fetchStart - timing.navigationStart || 0,
		// 页面重定向时间
		rdit: timing.redirectEnd - timing.redirectStart || 0,
		// unload时间
		uodt: timing.unloadEventEnd - timing.unloadEventStart || 0,
		//request请求耗时
		reqt: timing.responseEnd - timing.requestStart || 0,
		//页面解析dom耗时
		andt: timing.domComplete - timing.domInteractive || 0
	};
}
