import { captureError, proxyFetch, proxyXhr } from "./capture";
import { reportData } from "./report";
import polyfill from "./polyfill.js";
import { IOptionsConfig, IErrorInfo } from "./interface";

polyfill();

function main(option: IOptionsConfig): void {
  const filterUrl = [
    "/livereload.js?snipver=1",
    "/sockjs-node/",
    "/dev-server/",
    "/api/report",
  ];
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
    filterUrl: [""],
    // 是否上报请求接口性能数据
    isReportApiRequest: true,
    // 其他数据上报
    add: [],
    // 支持特殊自定义上报方式
    fn: null,
  };
  opt = Object.assign(opt, option);
  opt.filterUrl = opt.filterUrl.concat(filterUrl);

  // error上报
  if (opt.isReportError) captureError(opt);

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

  // 建听用户是否离开页面，离开时将未上报的数据进行上报
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (main.otherData.length > 0 || main.errorList.length > 0) {
        reportData(opt, "addData");
      }
    }
  });
}

// 提供给第三方上报错误信息
main.errorList = [];
main.addError = function (err: IErrorInfo) {
  err = {
    type: err.type,
    data: {
      msg: err.data.msg,
      stack: err.data.stack,
      col: err.data.col || 0,
      line: err.data.line || 0,
    },
  };
  main.errorList.push(err);
};

// 用户特定行为事件ID上报（如：上报按钮点击次数）
main.otherData = [];
main.addOtherData = function (eventId: string) {
  main.otherData.push(eventId);
};

export default main;
