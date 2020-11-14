import {captureError,proxyFetch,proxyXhr} from './capture'
import {reportData} from './report'

function main(option,fn){
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
  if (opt.isReportError) captureError();

  // 非SPA上报页面性能数据
  if (!opt.isSPA) {
    addEventListener(
      "load",
      function () {
        reportData(opt,"performance");
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
export default main
