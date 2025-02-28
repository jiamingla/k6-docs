---
title: "BrowserContext"
excerpt: "Browser module: BrowserContext Class"
weight: 02
weight: 02
---

# BrowserContext

`BrowserContext`s provide a way to operate multiple independent sessions, with separate pages, cache, and cookies. A default `BrowserContext` is created when a browser is launched.

The [browser module API](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser#browser-module-api) is used to create a new `BrowserContext`.

If a [page](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/page) opens another page, e.g. with a `window.open` call, the popup will belong to the parent page's `BrowserContext`.

| Method                                                                                                                                                             | Description                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [BrowserContext.addCookies()](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/addcookies)                                          | Adds [cookies](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/cookie) into the `BrowserContext`.              |
| [BrowserContext.clearCookies()](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/clearcookies)                                      | Clear the `BrowserContext`'s [cookies](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/cookie).                |
| [BrowserContext.clearPermissions()](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/clearpermissions)                              | Clears all permission overrides for the `BrowserContext`.                                                                                     |
| [BrowserContext.cookies()](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/cookies)                                                | Returns a list of [cookies](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/cookie) from the `BrowserContext`. |
| [BrowserContext.close()](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/close)                                                    | Close the `BrowserContext` and all its [page](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/page)s.                         |
| [BrowserContext.grantPermissions(permissions[, options])](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/grantpermissions)                                 | Grants specified permissions to the `BrowserContext`.                                                                                         |
| [BrowserContext.newPage()](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/newpage)                                                | Uses the `BrowserContext` to create a new [Page](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/page) and returns it.        |
| [BrowserContext.pages()](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/pages) <BWIPT id="444"/>                                  | Returns a list of [page](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/page)s that belongs to the `BrowserContext`.         |
| [BrowserContext.setDefaultNavigationTimeout(timeout)](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/setdefaultnavigationtimeout) | Sets the default navigation timeout in milliseconds.                                                                                          |
| [BrowserContext.setDefaultTimeout(timeout)](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/setdefaulttimeout)                     | Sets the default maximum timeout for all methods accepting a timeout option in milliseconds.                                                  |
| [BrowserContext.setGeolocation(geolocation)](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/setgeolocation) <BWIPT id="435"/>     | Sets the `BrowserContext`'s geolocation.                                                                                                      |
| [BrowserContext.setOffline(offline)](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/setoffline)                                   | Toggles the `BrowserContext`'s connectivity on/off.                                                                                           |
| [BrowserContext.waitForEvent(event[, optionsOrPredicate])](https://grafana.com/docs/k6/<K6_VERSION>/javascript-api/k6-experimental/browser/browsercontext/waitforevent)           | Waits for the event to fire and passes its value into the predicate function.                                                                 |
