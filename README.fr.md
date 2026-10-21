# Sa2web Plugin Editor

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Sa2web Plugin Editor est une application de bureau pour modifier des plugins complets de sites sa2web. Elle permet de configurer le plugin et ses scripts avec Monaco et les suggestions `api.`, de les tester sur un site déployé et d’exporter un fichier JSON.

## Débogage en ligne

1. Dans l’administration sa2web déployée, ouvrez la page **Plugins** du site, créez un plugin portant le même nom que dans l’éditeur et générez un **jeton de débogage**. Gardez-le confidentiel.
2. Dans l’éditeur, saisissez le même **nom de plugin** et **jeton**, ainsi qu’une **URL de test** HTTP(S) du site. Modifiez la configuration et les scripts ; le brouillon est enregistré localement.
3. Cliquez sur **Launch**. Dans la nouvelle fenêtre, connectez-vous avec un compte administrateur si nécessaire. Les cookies sont conservés pour les lancements suivants.
4. À l’arrivée sur `/app/index`, l’éditeur synchronise le brouillon avec le plugin correspondant au nom et au jeton. Une erreur signale toute discordance ; un avis de réussite reste affiché cinq secondes dans cette fenêtre.
5. Testez le site dans cette fenêtre. Seule cette session reçoit la configuration de débogage ; les visiteurs sans jeton ne la chargent pas. Relancez **Launch** après vos modifications.

## Exportation

Saisissez le **nom**, la **version** (`ver`) et la **description** (`remark`), puis cliquez sur **Export**. Le JSON contient les métadonnées, la configuration et les scripts.

## Licence

Sous [licence Apache 2.0](LICENSE).
