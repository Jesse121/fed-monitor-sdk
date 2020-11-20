/**
 * @description 配置参数数据类型
 * @author yangdong
 * @date 2020-11-19
 * @export
 * @interface optionsConfig
 */
export interface IoptionsConfig {
  domain: string;
  delay?: number;
  isSPA?: boolean;
  isReportPerformance?: boolean;
  isReportError?: boolean;
  filterUrl?: Array<string>;
  isReportApiRequest?: boolean;
  otherData?: Array<string>;
  fn?: any;
}

/**
 * @description 上报数据类型
 * @author yangdong
 * @date 2020-11-19
 * @export
 * @interface reportDataInfo
 */
export interface IreportDataInfo {
  // addData: Record<string, unknown>;
  platform: string;
  UA: string;
  url: string;
  errorList: Array<IerrorInfo>;
  performance?: IperformanceInfo;
  requestList?: Array<IrequestInfo>;
}

/**
 * @description 上报错误数据类型
 * @author yangdong
 * @date 2020-11-19
 * @export
 * @interface errorInfo
 */
export interface IerrorInfo {
  type: string;
  data: {
    msg?: string | Event; // 错误提示
    stack?: string; // 错误堆栈
    col?: number; // 错误列
    line?: number; // 错误行
  };
}

/**
 * @description 上报性能数据类型
 * @author yangdong
 * @date 2020-11-19
 * @export
 * @interface performanceInfo
 */
export interface IperformanceInfo {
  // DNS解析时间
  dnst: number;
  //TCP建立时间
  tcpt: number;
  // 白屏时间
  wit: number;
  //dom渲染完成时间
  domt: number;
  //页面onload时间
  lodt: number;
  // 页面准备时间
  radt: number;
  // 页面重定向时间
  rdit: number;
  // unload时间
  uodt: number;
  //request请求耗时
  reqt: number;
  //页面解析dom耗时
  andt: number;
}

/**
 * @description 上报接口数据类型
 * @author yangdong
 * @date 2020-11-19
 * @export
 * @interface requestInfo
 */
export interface IrequestInfo {
  method: string;
  url: string;
  statusCode: number;
  timeConsuming: number;
  responseMsg?: string;
}
