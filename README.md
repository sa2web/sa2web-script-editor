# Sa2web Plugin Editor

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Sa2web Plugin Editor is a desktop editor for complete sa2web site plugins. It lets you edit plugin configuration and scripts with Monaco and `api.` suggestions, test them against a deployed site in an isolated browser session, and export a plugin JSON file.

## Online debugging

1. On the deployed sa2web management platform, open the target site’s **Plugins** page. Create a plugin with the name you will use in the editor, then generate a **debug token** for it. Keep that token private.
2. In the editor, enter the identical **plugin name** and **debug token**, plus an HTTP(S) **test URL** on that site. Configure the plugin and edit its scripts. The editor saves the draft locally.
3. Click **Launch**. A separate window opens the test URL. Sign in with a site administrator account if needed. Its login cookies persist, so later launches normally reuse the session.
4. When that window reaches the site’s `/app/index` page, the editor synchronizes the draft to the matching plugin. It reports an invalid name or token as an error; on success, a notice appears inside the Launch window for five seconds.
5. Browse the site in that window to test the plugin. The debug token is bound to that window’s session, so visitors without it do not load the debug configuration. Edit and click **Launch** again to sync another revision.

## Export

Enter the plugin **name**, **version** (`ver`), and **description** (`remark`), then click **Export**. The downloaded JSON contains the plugin metadata and current configuration, including scripts.

## License

Licensed under the [Apache License 2.0](LICENSE).
