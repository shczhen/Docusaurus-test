// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "TiDB | Community",
  tagline: "TiDB | Community",
  url: "https://tidb.net",
  baseUrl: "/book/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/book_favicon.png",
  organizationName: "pingcap", // Usually your GitHub org/user name.
  projectName: "community", // Usually your repo name.

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        // docs: {
        //   sidebarPath: require.resolve("./sidebars.js"),
        //   path: "monthly",
        //   routeBasePath: "/monthly",
        //   // Please change this to your repo.
        //   // editUrl: "https://github.com/pingcap/book.tidb.net/tree/main/website",
        // },
        docs: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  plugins: [
    [
      "@docusaurus/plugin-client-redirects",
      {
        fromExtensions: ["html", "htm"], // /myPage.html -> /myPage
        redirects: [
          // baseUrl is `/book/`
          // Temporarily redirect baseUrl request: /book/ => /book/monthly/
          {
            to: "/monthly/",
            from: "/",
          },
        ],
      },
    ],
    [
      "content-docs",
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: "monthly",
        path: "monthly",
        routeBasePath: "/monthly",
        editUrl: "https://github.com/pingcap/book.tidb.net/tree/main/website",
        sidebarPath: require.resolve("./sidebars.js"),
      }),
    ],
    [
      "content-docs",
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: "bookrush",
        path: "bookrush",
        routeBasePath: "/bookrush",
        // editUrl: ({locale, versionDocsDirPath, docPath}) => {
        //   if (locale !== 'en') {
        //     return `https://github.com/pingcap/book.tidb.net/tree/main/website/${locale}`;
        //   }
        //   return `https://github.com/pingcap/book.tidb.net/tree/main/website/${versionDocsDirPath}/${docPath}`;
        // },
        sidebarPath: require.resolve("./sidebars.js"),
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "TiDB | Community",
        logo: {
          alt: "TiDB | Community Logo",
          src: "img/logo.svg",
          href: "/book/monthly",
        },
        items: [
          {
            to: "/monthly",
            position: "left",
            label: "??????",
          },
          {
            to: "/bookrush",
            position: "left",
            label: "Book Rush",
          },
          {
            href: "https://github.com/pingcap/community",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "???????????????",
            items: [
              {
                label: "??????",
                to: "https://tidb.net/events",
              },
              {
                label: "????????????",
                href: "https://asktug.com/",
              },
              {
                label: "???????????????",
                href: "https://internals.tidb.io",
              },
              {
                label: "TiKV ??????",
                href: "https://tikv.org/",
              },
              {
                label: "Chaos Mesh ??????",
                href: "https://chaos-mesh.org/",
              },
            ],
          },
          {
            title: "???????????????",
            items: [
              {
                label: "??????",
                href: "https://docs.pingcap.com/zh/tidb/stable",
              },
              {
                label: "??????",
                to: "https://tidb.net/blog",
              },
              {
                label: "????????????",
                href: "https://learn.pingcap.com/learner/course",
              },
              {
                label: "????????????",
                href: "https://learn.pingcap.com/learner/certification-center",
              },
              {
                label: "????????????",
                href: "https://pingcap.com/case/",
              },
              {
                label: "???????????????",
                href: "https://pingcap.github.io/tidb-dev-guide",
              },
            ],
          },
          {
            title: "????????????",
            items: [
              {
                label: "TiDB User Group",
                to: "https://tidb.net/tug",
              },
              {
                label: "????????????",
                href: "https://asktug.com/x/ranking",
              },
              {
                label: "????????????",
                href: "https://tidb-jobs.pingcap.com/",
              },
              {
                label: "????????????",
                href: "https://github.com/pingcap/community/blob/master/CODE_OF_CONDUCT.md?from=from_parent_mindnote",
              },
              {
                label: "????????????",
                href: "https://pingcap.com/zh/contact",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Mail",
                href: "mailto:user-zh@tidb.io",
              },
              {
                label: "GitHub",
                href: "https://github.com/pingcap/community",
              },
              {
                label: "BiliBili",
                href: "https://space.bilibili.com/584479667",
              },
              {
                label: "Mailing List",
                href: "https://lists.tidb.io/g/main",
              },
            ],
          },
        ],
        copyright: `?? ${new Date().getFullYear()} TiDB Community. <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer">???ICP???16046278???-7</a> <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010802039111" target="_blank" rel="noreferrer"><span><img src="https://img1.tidb.net/images/beian.png" alt="beian">??????????????? 11010802039111???</span></a>`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
