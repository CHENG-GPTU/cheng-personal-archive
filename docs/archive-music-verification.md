# 档案音乐与导航验证

`tests/archive-experience.browser.test.mjs` 使用 Node Test Runner 和 Playwright 驱动真实 Chrome。

单元与相关回归检查：`npm run test:archive`。包含音乐状态、暂停记忆、过期播放请求，以及优化音频与原始音乐帧逐字节一致的验证。

构建并执行浏览器验证：`npm run test:archive:browser`。也可在已有生产构建后单独执行：

```powershell
node --test tests/archive-experience.browser.test.mjs
```

默认自行启动 `http://127.0.0.1:3418`，完成后关闭。已有服务可通过 `ARCHIVE_TEST_URL` 复用：

```powershell
$env:ARCHIVE_TEST_URL = 'http://127.0.0.1:3011'
node --test tests/archive-experience.browser.test.mjs
```

Windows 默认使用已安装的 Chrome；可设 `ARCHIVE_TEST_BROWSER=msedge`。其他系统默认使用 Playwright Chromium，首次需执行 `npx playwright install chromium`；Windows 也可设置 `ARCHIVE_TEST_BROWSER=chromium` 使用它。

覆盖内容：

- 正常网络只预热元数据，通过实际范围响应确认至少一半音频尚未下载，并输出实测字节数；省流模式和 2g 网络在开信前不请求音频。元数据请求的块大小由浏览器决定。
- 在浏览器用户激活策略下真实点击开信，确认 `play()` 保留点击激活、音频请求发生在揭示动画结束前，原生音频时间实际前进。
- 跳过动画同样启动；播放中客户端切换页面保留同一个音频元素；手动暂停在当前标签页刷新、重新开信后仍生效，手动播放清除暂停记录。
- About 导航当前页标识与实际链接可用；进入简历和作品详情后仍可通过其顶部操作区暂停音乐。
- 直接访问作品页保持静音，点击控件才能播放；加载中可取消；旧播放请求和迟到事件不能覆盖用户的新选择。
- 浏览器拒播、解码失败提供可点击重试；会话存储不可用时仍能播放和暂停。
- 首页及作品页在 1440、375、320 像素视口下，音乐排在 Home 左侧；滚动后导航收为靠右悬浮栏，控件可见且没有横向溢出，返回顶部恢复展开。
- 系统开启减少动态效果后，歌名停止滚动，播放与暂停仍可操作。

播放成功用真实音频和原生媒体方法验证；故障、迟到事件通过媒体原型注入稳定复现，不能替代真实设备音频验收。测试没有使用放开自动播放的浏览器参数，也不会声称已在 Safari / iOS / Android 上验证。首次上线时还应在目标移动设备上检查浏览器的静音开关、节电模式与独立自动播放政策。

## 音频与设计依据

原音频保留。`npm run audio:prepare` 生成网页专用 MP3，移除开头 561,169 字节的 ID3 标签，剩余 8,698,902 字节的编码音乐保持不变。播放器先请求元数据，在信封或播放按钮获得悬停、焦点、按下等交互意图后提高预加载等级；省流、2g、已手动暂停的访问保持 `preload=none`，等待主动播放。`preload` 是浏览器提示，并非跨浏览器的固定流量上限。

播放遵循 [MDN play() 说明](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play)；导航采用提供的 [Modern Navbar](https://framer.com/m/Modern-Navbar-VoWUeq.js@oVVLpffE3sD117Do5FBy) 与 [Dynamic Navbar](https://framer.com/m/Dyanmic-Navbar-MD51bK.js@mDPLUu5eFS42KaFa2LkM) 的黑色胶囊、分组和紧凑态设计，适配本站路由及靠右位置。

## 本次验证结果（2026-09-17）

- 生产构建与 TypeScript 检查通过。
- 20 项专项测试通过；20 项生产 Chrome 浏览器测试通过；31 项相关渲染、工牌、光效、开信与联系控件回归通过。
- 生产 Chrome 普通网络实测：预读 1,048,576 / 8,698,902 字节，206 范围响应；开信前未播放，省流/2g 场景开信前不请求音频。
- 浏览器测试日志：`artifacts/archive-browser-final.log`。
- 已检查桌面及 375px 手机截图，并自动覆盖 320px。真机 Safari/iOS 尚未验证。
- 新增音乐、导航、公开页面音乐控件与测试文件的 ESLint 检查通过。仓库原有 `archive-entry.tsx` 的 effect 内同步 setState 规则报错未在本次范围内重构。
