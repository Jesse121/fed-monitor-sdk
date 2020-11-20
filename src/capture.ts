import { reportData } from "./report";
import {
  IoptionsConfig,
  IerrorInfo,
  IrequestInfo,
  IreportDataInfo,
} from "./interface";

// error default
const errorInfo: IerrorInfo = {
  type: "",
  data: {
    msg: "",
    stack: "",
  },
};

const requestInfo: IrequestInfo = {
  method: "",
  url: "",
  statusCode: 0,
  timeConsuming: 0,
  responseMsg: "",
};

export const conf: IreportDataInfo = {
  platform: "",
  UA: "",
  url: "",
  // 页面性能列表
  performance: {
    dnst: 0,
    tcpt: 0,
    wit: 0,
    domt: 0,
    lodt: 0,
    radt: 0,
    rdit: 0,
    uodt: 0,
    reqt: 0,
    andt: 0,
  },
  // 错误列表
  errorList: [],
  // 接口请求列表
  requestList: [],
};

// 捕获error信息
export function captureError(opt: IoptionsConfig): void {
  // 捕获资源加载错误
  window.addEventListener(
    "error",
    function (e) {
      const defaults = Object.assign({}, errorInfo);
      defaults.type = "loadError";
      defaults.data = {
        msg:
          (e.target as any).href ||
          (e.target as any).currentSrc + " is load error",
      };
      if (e.target != window) conf.errorList.push(defaults);
      reportData(opt, "error");
    },
    true
  );
  // 捕获js错误
  window.onerror = function (msg, _url, line, col, error) {
    const defaults = Object.assign({}, errorInfo);
    setTimeout(() => {
      defaults.type = "jsError";
      defaults.data = {
        msg: msg,
        stack: error && error.stack ? error.stack.toString() : "",
        line: line,
        col: col,
      };
      conf.errorList.push(defaults);
      // 上报错误信息
      reportData(opt, "error");
    }, 0);
  };
  // 捕获未处理的reject
  window.addEventListener("unhandledrejection", function (e) {
    const error = e && e.reason;
    const message = error.message || "";
    const stack = error.stack || "";
    // Processing error
    let col = 0;
    let line = 0;
    let errs = stack.match(/\(.+?\)/);
    if (errs && errs.length) errs = errs[0];
    // errs = errs.replace(/\w.+[js|html]/g, $1 => {
    // 	resourceUrl = $1;
    // 	return "";
    // });
    errs = errs.split(":");
    if (errs && errs.length > 1) {
      line = parseInt(errs[1] || 0);
    }
    col = parseInt(errs[2] || 0);
    const defaults = Object.assign({}, errorInfo);
    defaults.type = "unhandledrejection";
    defaults.data = {
      msg: message,
      line,
      col,
    };
    conf.errorList.push(defaults);
    reportData(opt, "error");
  });
  // 重写console.error
  const oldError = console.error;
  console.error = function (e: any) {
    const defaults = Object.assign({}, errorInfo);
    setTimeout(() => {
      defaults.type = "console";
      defaults.data = {
        msg: e,
      };
      conf.errorList.push(defaults);
      reportData(opt, "error");
    }, 0);
    return oldError.apply(console, [e]);
  };
}

// 拦截xhr请求
export function proxyXhr(opt: IoptionsConfig): void {
  function xhrEventTrigger(this: any, event) {
    const xhrEvent = new CustomEvent(event, { detail: this });
    window.dispatchEvent(xhrEvent);
  }

  const xhrProto = XMLHttpRequest.prototype;
  const origOpen = xhrProto.open;
  xhrProto.open = function (method: string, url: string) {
    // 拿到请求方法和地址
    (this as any)._method = method;
    (this as any)._url = url;
    return origOpen.apply(this, arguments as any);
  };

  const oldXHR = window.XMLHttpRequest;
  function newXHR() {
    const realXHR = new oldXHR();
    realXHR.addEventListener(
      "readystatechange",
      function () {
        xhrEventTrigger.call(this, "xhrReadyStateChange");
      },
      false
    );
    return realXHR;
  }

  let startTime = 0;
  let gapTime = 0;
  (window.XMLHttpRequest as any) = newXHR;
  window.addEventListener("xhrReadyStateChange", function (e: any) {
    const xhr = e.detail;
    const status = xhr.status;
    const readyState = xhr.readyState;
    if (readyState === 1) {
      startTime = new Date().getTime();
    }

    if (readyState === 4) {
      gapTime = new Date().getTime() - startTime;
      // 解决IE不支持xhr.responseURL
      if (!xhr.responseURL) {
        xhr.responseURL = xhr._url;
      }
      // 过滤请求
      const result =
        opt.filterUrl &&
        opt.filterUrl.some((item) => {
          return xhr.responseURL.includes(item);
        });
      if (result) return false;

      const defaults = Object.assign({}, requestInfo);
      if (status !== 200 && status !== 304 && status !== 401) {
        // 接口异常时捕获异常接口响应
        defaults.responseMsg = xhr.responseText;
      }
      defaults.method = xhr._method;
      defaults.url = xhr.responseURL;
      defaults.statusCode = xhr.status;
      defaults.timeConsuming = gapTime;
      conf.requestList && conf.requestList.push(defaults);

      reportData(opt, "request");
    }
  });
}

// 拦截fetch请求
export function proxyFetch(opt: IoptionsConfig): void {
  if (!window.fetch) return;
  const oldFetch = fetch;
  window.fetch = function (...args) {
    const result = formatFetchArguments(args);
    const fetchStartTime = new Date().getTime();
    return oldFetch.apply(this, args).then((res: Response) => {
      result.statusCode = res.status;
      result.timeConsuming = new Date().getTime() - fetchStartTime;
      if (res.status !== 200 && res.status !== 304 && res.status !== 401) {
        res
          .clone()
          .text()
          .then((res) => {
            result.responseMsg = res;
          });
      }
      conf.requestList && conf.requestList.push(result);
      reportData(opt, "request");
      return res;
    });
    // .catch((err) => {
    //   //当网络故障时或请求被阻止时，才会标记为 reject
    //   console.log(err);
    // });
  };

  // 规范化fetch上报内容
  function formatFetchArguments(args) {
    const defaults = Object.assign({}, requestInfo);

    if (!args || !args.length) return requestInfo;
    const result = args[0];
    if (args.length === 1) {
      if (typeof result === "string") {
        defaults.url = result ? result.split("?")[0] : "";
      } else if (typeof result === "object") {
        defaults.url = result.url ? result.url.split("?")[0] : "";
        defaults.method = result.method;
      }
    } else {
      defaults.url = result.split("?")[0];
      defaults.method = args[1].method || "GET";
    }
    return defaults;
  }
}

// 统计页面性能
export function getPerformance(): void {
  if (!window.performance) return;
  const timing = performance.timing;
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
    andt: timing.domComplete - timing.domInteractive || 0,
  };
}
