# Editing the Protocol Diagram

The Protocol Diagram was created using [Web Sequence Diagrams](https://www.websequencediagrams.com/)
and can be edited by pasting in the following.  The resulting diagram is
downloaded and save as "StaticAuthWorkflow.png".

```text
title Preferences OpenID Connect Flow
actor Resource Owner

Resource Owner->UIO: 1a) Login
UIO->Edge Proxy: 1b) open local login page (e.g. /login/google)
Edge Proxy->Preferences Server: 1c) redirect to prefs server login
Preferences Server->Google (SSO): 2a) redirect to Google login
Google (SSO)->Resource Owner: 2b) request user login and consent
Resource Owner->Google (SSO): 2c) login and grant consent
Google (SSO)->Preferences Server: 2d) state (anti-forgery token) and authorization code
note left of Preferences Server: 2e) confirm state (anti-forgery token)
Preferences Server->Google (SSO): 2f) exchange authorization code
Google (SSO)->Preferences Server: 2g) access token and id token
note left of Preferences Server: 3a) use id token to authenticate resource owner and grant authorization
Preferences Server->Edge Proxy: 3b) ?? pass authorization
Edge Proxy->UIO: 3c) ?? pass authorization
UIO->Edge Proxy: 4a) make local authorized requets (e.g. /preferences)
Edge Proxy->Preferences Server: 4b) redirect to prefs server resource
note right of Preferences Server: Verify authorization
Preferences Server->Edge Proxy: 4c) return response
Edge Proxy->UIO: 4d) return response
```
