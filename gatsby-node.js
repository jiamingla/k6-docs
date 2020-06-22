const utils = require('./src/utils/utils');
const Path = require('path');

// auxilary flag to determine the environment (staging/prod)
const isProduction = process.env.GATSBY_DEFAULT_MAIN_URL === 'https://k6.io';

exports.onCreateWebpackConfig = ({ getConfig, actions, stage, loaders }) => {
  const { replaceWebpackConfig, setWebpackConfig } = actions;
  const existingConfig = getConfig();
  const PRODUCTION = stage !== 'develop';
  const isSSR = stage.includes('html');

  const rules = existingConfig.module.rules.map((rule) => {
    if (
      String(rule.test) === String(/\.(ico|svg|jpg|jpeg|png|gif|webp)(\?.*)?$/)
    ) {
      return { ...rule, test: /\.(ico|jpg|jpeg|png|gif|webp)(\?.*)?$/ };
    }

    return rule;
  });

  replaceWebpackConfig({
    ...existingConfig,
    module: {
      ...existingConfig.module,
      rules,
    },
  });

  const sassLoader = {
    loader: 'sass-loader',
    options: {
      sourceMap: !PRODUCTION,
      implementation: require('sass'),
    },
  };

  const sassResourcesLoader = {
    loader: 'sass-resources-loader',
    options: {
      resources: [
        `${__dirname}/src/styles/variables.scss`,
        `${__dirname}/src/styles/mixins.scss`,
      ],
    },
  };

  const sassRuleModules = {
    test: /\.module\.s(a|c)ss$/,
    use: [
      !isSSR && loaders.miniCssExtract({ hmr: false }),
      loaders.css({
        localIdentName: '[local]_[hash:base64:5]',
        modules: true,
        importLoaders: 2,
      }),
      loaders.postcss(),
      sassLoader,
      sassResourcesLoader,
    ].filter(Boolean),
  };

  const sassRule = {
    test: /\.s(a|c)ss$/,
    use: isSSR
      ? [loaders.null()]
      : [
          loaders.miniCssExtract(),
          loaders.css({ importLoaders: 2 }),
          loaders.postcss(),
          sassLoader,
          sassResourcesLoader,
        ],
  };

  const inlineSvgRule = {
    test: /\.inline.svg$/,
    use: [
      {
        loader: require.resolve('@svgr/webpack'),
        options: {
          svgoConfig: {
            removeViewBox: false,
            cleanupIDs: {
              prefix: {
                toString() {
                  this.counter = this.counter || 0;
                  return `id-${this.counter++}`;
                },
              },
            },
          },
        },
      },
    ],
    issuer: {
      test: /\.(js|jsx|ts|tsx)$/,
    },
  };

  const svgRule = {
    test: /\.svg$/,
    use: [loaders.url()],
    issuer: {
      test: /\.(js|jsx|ts|tsx)$/,
    },
  };

  const nonJsSVGRule = {
    test: /\.svg$/,
    use: [loaders.url()],
    issuer: {
      test: /\.(?!(js|jsx|ts|tsx)$)([^.]+$)/,
    },
  };

  let configRules = [];

  switch (stage) {
    case 'develop':
    case 'build-javascript':
    case 'build-html':
    case 'develop-html':
      configRules = configRules.concat([
        { oneOf: [sassRuleModules, sassRule] },
        { oneOf: [inlineSvgRule, svgRule, nonJsSVGRule] },
      ]);
      break;
  }

  setWebpackConfig({
    module: {
      rules: configRules,
    },
  });
};

async function createDocPages({ graphql, actions }) {
  /*
   * custom path processing rules
   */

  // guides category is the root: / or /docs in prod, so we removing that part
  const removeGuides = (path) => path.replace(/guides\//, '');

  // examples page contains `examples` folder which causing path
  // duplication, removing it as well
  const dedupeExamples = (path) =>
    path.replace(/examples\/examples/, 'examples');

  // no /guides route; welcome is redirecting to the root path
  // difference from removeGuides: this one is for sidebar links processing and
  // the former is for creatingPages
  const removeGuidesAndRedirectWelcome = (path) =>
    path.replace(/guides\/(getting-started\/welcome)?/, '');

  // ensures that no trailing slash is left
  const noTrailingSlash = (path) =>
    path === '/' ? '/' : path.replace(/(.+)\/$/, '$1');

  const { data } = await graphql(`
    query docPagesQuery {
      allFile(
        filter: { ext: { in: [".md"] }, relativeDirectory: { regex: "/docs/" } }
        sort: { fields: absolutePath, order: ASC }
      ) {
        nodes {
          name
          relativeDirectory
          children {
            ... on Mdx {
              body
              frontmatter {
                title
                head_title
                excerpt
                redirect
                hideFromSidebar
                draft
              }
            }
          }
        }
      }
    }
  `);

  // Build a tree for a sidebar
  const sidebarTreeBuilder = utils.buildFileTree(utils.buildFileTreeNode);
  data.allFile.nodes.forEach(
    ({ name, relativeDirectory, children, children: [remarkNode] }) => {
      // for debuggin purpose in case there is errors in md/html syntax
      if (typeof children === 'undefined' || typeof remarkNode === 'undefined')
        return;

      const {
        frontmatter: { title, redirect, hideFromSidebar, draft },
      } = remarkNode;
      // skip altogether if this content has draft flag
      // OR hideFromSidebar
      if ((draft === 'true' && isProduction) || hideFromSidebar) return;
      const path = utils.slugify(
        `/${utils.stripDirectoryPath(
          relativeDirectory,
          'docs',
        )}/${title.replace(/\//g, '-')}`,
      );
      // titles like k6/html treated like paths otherwise
      sidebarTreeBuilder.addNode(
        utils.unorderify(utils.stripDirectoryPath(relativeDirectory, 'docs')),
        utils.unorderify(name),
        {
          path: utils.compose(
            noTrailingSlash,
            dedupeExamples,
            removeGuidesAndRedirectWelcome,
            utils.unorderify,
          )(path),
          title,
          redirect,
        },
      );
    },
  );

  // tree representation of a data/markdown/docs folder
  const sidebar = sidebarTreeBuilder.getTree();

  // local helper function that uses carrying, expects one more arg
  const getSidebar = utils.getChildSidebar(sidebar);
  const docPageNav = Object.keys(sidebar.children);

  // create data for rendering docs navigation
  const docPageNavLinks = docPageNav
    .map((item) => ({
      label: item === 'cloud' ? 'Cloud Docs' : item.toUpperCase(),
      to: item === 'guides' ? `/` : `/${utils.slugify(item)}`,
    }))
    .filter(Boolean);
  // creating actual docs pages
  data.allFile.nodes.forEach(
    ({ relativeDirectory, children, children: [remarkNode], name }) => {
      const strippedDirectory = utils.stripDirectoryPath(
        relativeDirectory,
        'docs',
      );
      // for debuggin purpose in case there is errors in md/html syntax
      if (typeof remarkNode === 'undefined') {
        console.log('remarkNode is', remarkNode);
        console.log('children is', children);
        console.log(
          '\nmarkup is broken! check the following file: \n\n',
          `${relativeDirectory}/${name}`,
        );
        return;
      }
      const { title, redirect, draft } = remarkNode.frontmatter;
      // if there is value in redirect field, skip page creation
      // OR there is draft flag and mode is prod
      if ((draft === 'true' && isProduction) || redirect) return;
      const path = utils.slugify(
        `${strippedDirectory}/${title.replace(/\//g, '-')}`,
      );
      const breadcrumbs = utils.compose(
        utils.buildBreadcrumbs,
        removeGuides,
        utils.unorderify,
      )(path);
      const extendedRemarkNode = {
        ...remarkNode,
        frontmatter: {
          ...remarkNode.frontmatter,
          slug: utils.compose(
            noTrailingSlash,
            dedupeExamples,
            removeGuides,
            utils.unorderify,
          )(path),
          // injection of a link to an article in git repo
          fileOrigin: encodeURI(
            `https://github.com/loadimpact/k6-docs/blob/master/src/data/${relativeDirectory}/${name}.md`,
          ),
        },
      };

      actions.createPage({
        path: utils.compose(
          dedupeExamples,
          removeGuides,
          utils.unorderify,
        )(path),
        component: Path.resolve('./src/templates/doc-page.js'),
        context: {
          remarkNode: extendedRemarkNode,
          // dynamically evalute which part of the sidebar tree are going to be used
          sidebarTree: utils.compose(
            getSidebar,
            utils.getDocSection,
            utils.unorderify,
          )(strippedDirectory),
          breadcrumbs,
          navLinks: docPageNavLinks,
        },
      });
    },
  );

  // generating pages currently presented in templates/docs/ folder
  [...docPageNav].forEach((item) => {
    const slug = utils.slugify(item);
    actions.createPage({
      path: slug === 'guides' ? `/` : `/${slug}`,
      component: Path.resolve(`./src/templates/docs/${slug}.js`),
      context: {
        sidebarTree: getSidebar(item),
        navLinks: docPageNavLinks,
      },
    });
  });

  // generating a bunch of breadcrumbs stubs for top level non-links categories

  // ! attention: filtering here because of unplanned case with actual pages for top level sidebar sections. Removing breadcrumbs stub generation manually.
  [...docPageNav]
    .filter((s) => s !== 'javascript api')
    .forEach((section) => {
      utils.childrenToList(getSidebar(section).children).forEach(({ name }) => {
        const path = utils.compose(
          removeGuides,
          utils.slugify,
        )(`${section}/${name}`);
        const breadcrumbs = utils.buildBreadcrumbs(path);
        actions.createPage({
          path: noTrailingSlash(path),
          component: Path.resolve('./src/templates/docs/breadcrumb-stub.js'),
          context: {
            sidebarTree: getSidebar(section),
            breadcrumbs,
            title: name,
            navLinks: docPageNavLinks,
            directChildren: getSidebar(section).children[name].children,
          },
        });
      });
    });
}

const createRedirects = ({ actions, pathPrefix }) => {
  const { createRedirect } = actions;

  createRedirect({
    fromPath: `${pathPrefix}/getting-started/welcome`,
    toPath: pathPrefix || `/`,
    redirectInBrowser: true,
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-http/cookiejar-k6-http',
    toPath: '/javascript-api/k6-http/cookiejar',
    isPermanent: true,
  });
  createRedirect({
    fromPath:
      '/javascript-api/k6-http/cookiejar-k6-http/cookiejar-cookiesforurl-url',
    toPath: '/javascript-api/k6-http/cookiejar/cookiejar-cookiesforurl-url',
    isPermanent: true,
  });
  createRedirect({
    fromPath:
      '/javascript-api/k6-http/cookiejar-k6-http/cookiejar-set-name-value-options',
    toPath:
      '/javascript-api/k6-http/cookiejar/cookiejar-set-name-value-options',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-http/filedata-k6-http',
    toPath: '/javascript-api/k6-http/filedata',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-http/params-k6-http',
    toPath: '/javascript-api/k6-http/params',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-http/response-k6-http',
    toPath: '/javascript-api/k6-http/response',
    isPermanent: true,
  });
  createRedirect({
    fromPath:
      '/javascript-api/k6-http/response-k6-http/response-clicklink-params',
    toPath: '/javascript-api/k6-http/response/response-clicklink-params',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-http/response-k6-http/response-html',
    toPath: '/javascript-api/k6-http/response/response-html',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-http/response-k6-http/response-json-selector',
    toPath: '/javascript-api/k6-http/response/response-json-selector',
    isPermanent: true,
  });
  createRedirect({
    fromPath:
      '/javascript-api/k6-http/response-k6-http/response-submitform-params',
    toPath: '/javascript-api/k6-http/response/response-submitform-params',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-metrics/counter-k6-metrics',
    toPath: '/javascript-api/k6-metrics/counter',
    isPermanent: true,
  });
  createRedirect({
    fromPath:
      '/javascript-api/k6-metrics/counter-k6-metrics/counter-add-value-tags',
    toPath: '/javascript-api/k6-metrics/counter/counter-add-value-tags',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-metrics/gauge-k6-metrics',
    toPath: '/javascript-api/k6-metrics/gauge',
    isPermanent: true,
  });
  createRedirect({
    fromPath:
      '/javascript-api/k6-metrics/gauge-k6-metrics/gauge-add-value-tags',
    toPath: '/javascript-api/k6-metrics/gauge/gauge-add-value-tags',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-metrics/rate-k6-metrics',
    toPath: '/javascript-api/k6-metrics/rate',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-metrics/rate-k6-metrics/rate-add-value-tags',
    toPath: '/javascript-api/k6-metrics/rate/rate-add-value-tags',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/javascript-api/k6-metrics/trend-k6-metrics',
    toPath: '/javascript-api/k6-metrics/trend',
    isPermanent: true,
  });
  createRedirect({
    fromPath:
      '/javascript-api/k6-metrics/trend-k6-metrics/trend-add-value-tags',
    toPath: '/javascript-api/k6-metrics/trend/trend-add-value-tags',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/using-k6/archives-for-bundling-sharing-a-test',
    toPath: '/misc/archive',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/using-k6/ssl-tls',
    toPath: '/using-k6/protocols/ssl-tls',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/using-k6/ssl-tls/online-certificate-status-protocol-ocsp',
    toPath:
      '/using-k6/protocols/ssl-tls/online-certificate-status-protocol-ocsp',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/using-k6/ssl-tls/ssl-tls-client-certificates',
    toPath: '/using-k6/protocols/ssl-tls/ssl-tls-client-certificates',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/using-k6/ssl-tls/ssl-tls-version-and-ciphers',
    toPath: '/using-k6/protocols/ssl-tls/ssl-tls-version-and-ciphers',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/using-k6/multipart-requests-file-uploads',
    toPath: '/examples/data-uploads',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/getting-started/results-output/apache-kafka',
    toPath: '/results-visualization/apache-kafka',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/getting-started/results-output/cloud',
    toPath: '/results-visualization/cloud',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/results-visualization/k6-cloud-test-results',
    toPath: '/results-visualization/cloud',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/getting-started/results-output/datadog',
    toPath: '/results-visualization/datadog',
    isPermanent: true,
  });
  createRedirect({
    fromPath: '/getting-started/results-output/influxdb',
    toPath: '/results-visualization/influxdb-+-grafana',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/getting-started/results-output/json',
    toPath: '/results-visualization/json',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/getting-started/results-output/statsd',
    toPath: '/results-visualization/statsd',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/javascript-api/k6-metrics/counter/counter-add-value-tags',
    toPath:
      '/javascript-api/k6-metrics/counter-k6-metrics/counter-add-value-tags',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/javascript-api/k6-metrics/gauge/gauge-add-value-tags',
    toPath: '/javascript-api/k6-metrics/gauge-k6-metrics/gauge-add-value-tags',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/javascript-api/k6-metrics/rate/rate-add-value-tags',
    toPath: '/javascript-api/k6-metrics/rate-k6-metrics/rate-add-value-tags',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/javascript-api/k6-metrics/trend/trend-add-value-tags',
    toPath: '/javascript-api/k6-metrics/trend-k6-metrics/trend-add-value-tags',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/javascript-api/k6-http/cookiejar/cookiejar-cookiesforurl-url',
    toPath:
      '/javascript-api/k6-http/cookiejar-k6-http/cookiejar-cookiesforurl-url',
    isPermanent: true,
  });

  createRedirect({
    fromPath:
      '/javascript-api/k6-http/cookiejar/cookiejar-set-name-value-options',
    toPath:
      '/javascript-api/k6-http/cookiejar-k6-http/cookiejar-set-name-value-options',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/javascript-api/k6-http/response/response-clicklink-params',
    toPath:
      '/javascript-api/k6-http/response-k6-http/response-clicklink-params',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/javascript-api/k6-http/response/response-submitform-params',
    toPath:
      '/javascript-api/k6-http/response-k6-http/response-submitform-params',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/using-k6/cloud-execution',
    toPath: '/cloud/creating-and-running-a-test/cloud-tests-from-the-cli',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/using-k6/html/working-with-html-forms',
    toPath: '/examples/html-forms',
    isPermanent: true,
  });

  createRedirect({
    fromPath: '/using-k6/html',
    toPath: '/javascript-api/k6-html',
    isPermanent: true,
  });
};

exports.createPages = async (options) => {
  await createDocPages(options);
  await createRedirects(options);
};

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions;
  // Adding default values for some fields and moving them under node.fields
  // because that how createNodeField works
  if (node.frontmatter) {
    createNodeField({
      node,
      name: 'redirect',
      value: node.frontmatter.redirect || '',
    });
    createNodeField({
      node,
      name: 'hideFromSidebar',
      value: node.frontmatter.hideFromSidebar || false,
    });
    createNodeField({
      node,
      name: 'draft',
      value: node.frontmatter.draft || 'false',
    });
    createNodeField({
      node,
      name: 'head_title',
      value: node.frontmatter.head_title || '',
    });
  }
};
