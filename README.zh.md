# Sa2web Plugin Editor

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Sa2web Plugin Editor 是 sa2web 站点插件的桌面编辑器。可编辑完整的插件配置与脚本，使用 Monaco 的 `api.` 提示，在已部署站点的隔离浏览器会话中联调，并导出插件 JSON。

## 在线联调

1. 在已部署的 sa2web 管理平台中，打开目标站点的**插件管理**页面。创建一个与编辑器中同名的插件，并为它生成**调试令牌**；请妥善保管令牌。
2. 在编辑器中填写相同的**插件名称**和**调试令牌**，再填写该站点的 HTTP(S) **测试地址**。编辑插件配置和脚本；草稿会保存在本地。
3. 点击 **Launch**，在新窗口中打开测试地址。如尚未登录，请使用站点管理员账号登录。登录 Cookie 默认保留，以后启动通常无需重复登录。
4. 当新窗口进入该站点的 `/app/index` 时，编辑器会将草稿同步到名称和令牌匹配的插件。名称或令牌不匹配会报错；同步成功后，新窗口内显示提示，五秒后自动消失。
5. 在新窗口中访问站点以测试插件。调试令牌仅绑定该窗口的会话，其他没有令牌的访客不会加载调试配置。修改后再次点击 **Launch** 即可同步新版。

## 导出插件

填写插件**名称**、**版本号**（`ver`）和**描述**（`remark`），然后点击**导出**。下载的 JSON 包含插件元数据、当前配置和脚本。

## 开源协议

本项目采用 [Apache License 2.0](LICENSE)。
