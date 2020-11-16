import main from "./main";
import { perforPage, conf } from "./capture";

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
	main.ERRORLIST = [];
	main.ADDDATA = {};
}

// performance:页面级性能上报
// request:接口性能上报
// error：页面错误信息上报
export function reportData(opt, type) {
	setTimeout(() => {
		if (Performance.ERRORLIST && Performance.ERRORLIST.length) {
			conf.errorList = conf.errorList.concat(Performance.ERRORLIST);
		}
		let result = {
			addData: main.ADDDATA,
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
		opt.fn && opt.fn(result);
		if (!opt.fn && navigator.sendBeacon) {
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
