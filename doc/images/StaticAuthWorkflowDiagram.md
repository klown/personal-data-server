# Editing the Protocol Diagram

The Protocol Diagram was created using [Web Sequence Diagrams](https://www.websequencediagrams.com/)
and can be edited by pasting in the following.

```text
title Preferences OpenID Connect Flow
actor Resource Owner

Resource Owner->UIO: 1a) Login
UIO->Edge Proxy: 1b) open local login page (e.g. /login/google)
Edge Proxy->Preferences Server: 1c) redirect to prefs server login
Preferences Server->Google (SSO): 1d) redirect to Google login
Google (SSO)->Resource Owner: 2a) request user login and consent
Resource Owner->Google (SSO): 2b) login and grant consent
Google (SSO)->Preferences Server: 3a) state (anti-forgery token) and authorization code
note left of Preferences Server: 3b) confirm state (anti-forgery token)
Preferences Server->Google (SSO): 4a) exchange authorization code
Google (SSO)->Preferences Server: 4b) access token and id token
note left of Preferences Server: 5a) use id token to authenticate resource owner and grant authorization
Preferences Server->Edge Proxy: 5b) ?? pass authorization
Edge Proxy->UIO: 5c) ?? pass authorization
UIO->Edge Proxy: 6a) make local authorized requets (e.g. /preferences)
Edge Proxy->Preferences Server: 6b) redirect to prefs server resource
note right of Preferences Server: Verify authorization
Preferences Server->Edge Proxy: 6d) return response
Edge Proxy->UIO: 6e) return response
```
