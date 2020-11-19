## 前端监控错误上报 SDK

主要功能如下：

1. 上报运行时 js 错误 - 已完成
2. 上报页面性能数据 - 已完成
3. 上报 api 接口性能数据 - 已完成
4. 上报项目运行平台 - 已完成

### 如何使用

通过公司 cdn 直接引入

```js
<script src="***/monitor.js"></script>
<script>
  monitor({
    domain: "yourHost/api/report?name=projectName"
  });
</script>
```

### 配置项

```js
{
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
		// 是否上报请求接口性能数据
		isReportApiRequest: true,
		// 请求时需要过滤的url信息
		filterUrl: [],
		// 支持特殊自定义上报方式
		fn: null,
		// 其他上报
		add: {}
}

```
