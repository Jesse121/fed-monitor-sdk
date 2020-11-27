import main from "./main";
import { getPerformance, conf } from "./capture";
import { IOptionsConfig, IReportDataInfo } from "./interface";

// 暂时只区分PC和H5
function getPlatform(): string {
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

export function clear(): void {
  if (window.performance && window.performance.clearResourceTimings) {
    performance.clearResourceTimings();
  }
  conf.performance = {
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
  };
  conf.errorList = [];
  conf.requestList = [];
  main.errorList = [];
  // main.ADDDATA = {};
}

// performance:页面级性能上报
// request:接口性能上报
// error：页面错误信息上报
export function reportData(opt: IOptionsConfig, type: string): void {
  setTimeout(() => {
    if (main.errorList && main.errorList.length > 0) {
      conf.errorList = conf.errorList.concat(main.errorList);
    }
    let result: IReportDataInfo = {
      platform: getPlatform(),
      UA: navigator.userAgent,
      url: location.href,
      errorList: [],
    };

    switch (type) {
      case "performance":
        if (opt.isReportPerformance) getPerformance();
        result = Object.assign(result, {
          // preUrl: conf.preUrl,
          performance: conf.performance,
          requestList: conf.requestList,
        });
        break;
      case "request":
        if (conf.requestList && conf.requestList.length === 0) return false;
        result = Object.assign(result, {
          requestList: conf.requestList,
        });
        break;
      case "addData":
        result = Object.assign(result, {
          otherData: main.otherData,
        });
        break;
      case "error":
        if (conf.errorList && conf.errorList.length === 0) return false;
        result = Object.assign(result, {
          errorList: conf.errorList,
        });
        break;
    }

    opt.fn && opt.fn(result);
    if (!opt.fn && navigator.sendBeacon) {
      // sendBeacon 如果成功进入浏览器的发送队列后，会返回true；
      // 如果受到队列总数、数据大小的限制后，会返回false。
      const res = navigator.sendBeacon(opt.domain, JSON.stringify(result));
      if (!res) {
        xhrReportData(opt.domain, result);
      }
    } else {
      xhrReportData(opt.domain, result);
    }
    // 清空无关数据
    Promise.resolve().then(() => {
      clear();
    });
  }, opt.delay);
}
// 用于sendBeacon 降级支持
function xhrReportData(url: string, data: IReportDataInfo) {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.send(JSON.stringify(data));
}
