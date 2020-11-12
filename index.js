(function (window) {
	Performance.ERRORLIST = [];
	window.ADDDATA = {};
	// 获取平台信息 PC(chrome,IE,firefox) H5(ios,android,ios_webview,android_webview,weChart)
	// 暂时只区分PC和H5
	function getPlatform() {
		if (
			window.navigator.userAgent.match(
				/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
			)
		) {
			return "H5"; // 移动端
		} else {
			return "PC"; // PC端
		}
	}

	function Performance(option, fn) {
		try {
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
				// 其他上报
				add: {}
			};
			opt = Object.assign(opt, option);
			opt.filterUrl = opt.filterUrl.concat(filterUrl);

			const conf = {
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

			// error上报
			if (opt.isReportError) _error();

			// 非SPA上报页面性能数据
			if (!opt.isSPA) {
				addEventListener(
					"load",
					function () {
						reportData("performance");
					},
					false
				);
			}

			if (opt.isReportApiRequest) {
				// 执行fetch重写
				_fetch();
				//  拦截xhr
				_xhr();
			}

			// performance:页面级性能上报
			// request:接口性能上报
			// error：页面错误信息上报
			function reportData(type) {
				setTimeout(() => {
					if (Performance.ERRORLIST && Performance.ERRORLIST.length) {
						conf.errorList = conf.errorList.concat(Performance.ERRORLIST);
					}
					let result = {
						addData: ADDDATA,
						platform: getPlatform(),
						UA: navigator.userAgent,
						url: location.href
					};

					if (type === "performance") {
						if (opt.isReportPerformance) perforPage();
						result = Object.assign(result, {
							// preUrl: conf.preUrl,
							performance: conf.performance,
							requestList: conf.requestList
						});
					} else if (type === "request") {
						if (conf.requestList.length === 0) return false;
						result = Object.assign(result, {
							requestList: conf.requestList
						});
					}
					result = Object.assign(result, {
						errorList: conf.errorList
					});

					result = Object.assign(result, opt.add);
					fn && fn(result);
					if (!fn && navigator.sendBeacon) {
						navigator.sendBeacon(opt.domain, JSON.stringify(result));
					} else {
						const xhr = new XMLHttpRequest();
						xhr.open("POST", opt.domain, true);
						xhr.send(JSON.stringify(result));
					}
					// 清空无关数据
					Promise.resolve().then(() => {
						clear();
					});
				}, opt.delay);
			}

			// 统计页面性能
			function perforPage() {
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

			// 拦截xhr请求
			function _xhr() {
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
						reportData("request");
					}
				});
			}

			// 拦截fetch请求
			function _fetch() {
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

			// fetch arguments
			function fetArg(arg) {
				let result = { method: "GET", type: "fetchrequest" };
				let args = Array.prototype.slice.apply(arg);

				if (!args || !args.length) return result;
				try {
					if (args.length === 1) {
						if (typeof args[0] === "string") {
							result.url = args[0];
						} else if (typeof args[0] === "object") {
							result.url = args[0].url;
							result.method = args[0].method;
						}
					} else {
						result.url = args[0];
						result.method = args[1].method || "GET";
						result.type = args[1].type || "fetchrequest";
					}
				} catch (err) {}
				return result;
			}
			// 拦截js error信息
			function _error() {
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
						if (conf.page === location.href) reportData("error");
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
					if (conf.page === location.href) reportData("error");
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
						if (conf.page === location.href) reportData("error");
					}, 0);
					return oldError.apply(console, arguments);
				};
			}

			// fetch get time
			function getFetchTime(startTime) {
				conf.fetchNum += 1;
				if (conf.fetLength === conf.fetchNum) {
					conf.fetchNum = conf.fetLength = 0;
					fetchTime = new Date().getTime() - startTime;
					getLargeTime();
				}
			}

			function clearPerformance(type) {
				if (window.performance && window.performance.clearResourceTimings) {
					if (conf.haveAjax && conf.haveFetch && conf.ajaxLength == 0 && conf.fetLength == 0) {
						clear(1);
					} else if (!conf.haveAjax && conf.haveFetch && conf.fetLength == 0) {
						clear(1);
					} else if (conf.haveAjax && !conf.haveFetch && conf.ajaxLength == 0) {
						clear(1);
					}
				}
			}

			function clear(type = 0) {
				if (window.performance && window.performance.clearResourceTimings) performance.clearResourceTimings();
				conf.performance = {};
				conf.errorList = [];
				conf.requestList = [];
				conf.preUrl = "";
				conf.resourceList = [];
				conf.page = type === 0 ? location.href : "";
				conf.haveAjax = false;
				conf.haveFetch = false;
				conf.ajaxMsg = {};
				Performance.ERRORLIST = [];
				ADDDATA = {};
				ajaxTime = 0;
				fetchTime = 0;
			}
		} catch (err) {
			console.error(err);
		}
	}
	Performance.addError = function (err) {
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
		Performance.ERRORLIST.push(err);
	};
	Performance.addData = function (fn) {
		fn && fn(ADDDATA);
	};
	window.Performance = Performance;
})(window);
