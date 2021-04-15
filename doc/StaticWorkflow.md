# Preferences Edge Proxy Workflow

A workflow that the Personal Data Storage or Preferences Servier supports
i where a static site makes save/retrieve requests for the user's preferences.
An example is where a user changes their UIO options and wants to save them.

Included in this workflow is an OAuth2 authorization sequence where
users are authenticated by a third party single sign on (SSO) provider, such as
Google or Github.

This document describes the requests, responses, payloads, and database structures
needed to support static access and single sign on workflows.

The examples all assume that the OAuth2 authorization server
is Google.  Google provides an [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
where each step of the workflow can be executed in isolation, and where information
about the requests and responses are displayed.  This was used to determine
the details of the SSO process.

## OpenID Connect Workflow

![Preferences OpenID Connect Flow](./images/StaticAuthWorkflow.png)

## Actors/Resources

* **Resource Owner**: The user attempting to authorize UIO to use their
  preferences
* **UIO**: An embedded instance of User Interface Options (UI Options);
  preferences editor/enactors
* **Edge Proxy**: Lambda functions, server configuration, or light weight server
  to handle redirects between UIO and the prefs server. To allow cross origin
  requests.
* **SSO Client**: A client of an SSO provider, where the client uses the
  provider as a way of authenticating users.  The Preferences Server is a client
  in this context.
* **SSO Provider**: An OAuth2 server that is used to authenticate users.  Google is
  an SSO provider.
* **Preferences Server**: An instance of the Preferences Server. Stores
  preferences and authenticates with a single sign on (SSO) provider, e.g. Google.
* **Google SSO**: Using Google as SSO provider. The examples are based on their
  API but others could be substituted.

## Workflow Description

1. Open login
    1. Trigger login to Preferences server from UIO
    2. UIO makes a local request handled by the Edge Proxy. This is to prevent
       cross origin requests. e.g. `/login/google`
    3. The Edge Proxy redirects this request to the proper endpoint on the
       Preferences Server.
2. The Preferences Server sends an [authentication request](https://developers.google.com/identity/protocols/oauth2/openid-connect#sendauthrequest)
   to Google.
   1. the authentication request includes the following as query parameters:
      * `client_id` identifying the Preferences Server to Google
      * `response_type` which is usually `code`
      * `scope` which would likely be `openid email`
      * `redirect_uri` which is the endpoint on the Preferences Server that
           will receive the response from Google. It must match the authorized
           redirect URI that was pre-registered with Google.
      * `state`, the anti-forgery unique session token
   2. Login and consent:  The Resource Owner may be presented with a login
      screen by Google in their domain, and asked to consent the requested
      scope.
      * If the user is already logged into Google, they will be presented
        with the consent dialog.
   3. The Resource Owner authenticates with Google and grants consent
      * If the user has previously provided consent, Google will present no
        dialog, but will retrieve the scope(s) of information for which the user
        has consented.
   4. [Authorization code and anti-forgery](https://developers.google.com/identity/protocols/oauth2/openid-connect#confirmxsrftoken):
      Google responds to the Preferences Server at the `redirect_uri` including:
      * `state` anti-forgery token from step 2i
      * `code` the authentication code provided by Google
      * `scope` the scopes for which the user consented at step 2iii.
   5. The Preferences Server confirms that the `state` (anti-forgery token) is
      valid by checking that it matches the value it sent to Google in step 2i.
   6. [Exchange Authorization Code](https://developers.google.com/identity/protocols/oauth2/openid-connect#exchangecode):
      The Preferences Server requests exchanging the Authorization Code for an
      Access Token and ID Token. This includes the following:
      * `code`, the Authorization Code sent from the previous response from
         Google
      * `client_id` for the Preferences Server (same value as steps 2i)
      * `redirect_uri` which is the endpoint on the Preferences Server that
         will receive the response from Google (same value as step 2i)
      * `grant_type` which must be set to `authorization_code`
   7. Google responds at the previously specified redirect uri with the Access
      Token and ID Token
      * The `access_token` can be used by the Preferences Server to access the Google API
      * The `id_token` is a [JWT](https://tools.ietf.org/html/rfc7519)
        identifying the Resource Owner and is signed by Google.
3. Authenticate and Authorize UIO
   1. Using the `id_token` the Preferences Server authenticates the Resource
      Owner
   2. Somehow the Preferences Server passes back the authorization to the Edge
      Proxy
   3. Somehow the Edge Proxy passes back the authorization to UIO
4. Making Authorized Requests to the Preferences Server
   1. Somehow, using the authorization, makes a local request to the
      Preferences Server handled by the Edge Proxy. e.g. a GET request to
      `/preferences`
   2. Somehow, the Edge Proxy redirects this request to a Preferences Server
      end point
   3. Somehow, the Preferences Server validates the authorization of this
      request
   4. The Preferences Server responds to the Edge Proxy
   5. The Edge Proxy responds to UIO

## Single Sign On Details

This section gives more details regarding step 2 above, the part of the static
workflow that is specific to user authentication using an SSO provider.

### Client Registration with SSO Provider

Prior to executing the SSO workflow, the Preferences Server must register as a
client of an SSO provider, e.g., Google.  Registration is a manual process.
The provider will generate a client id and a client secret that identifies the
Preferences Server to the provider during the SSO workflow.  The client id and
secret need to be stored in the Preferences Server's database for use when it
communicates with the SSO provider.  The client also specified a redirect uri for
the provider to call to contact the client.  The redirect uri is stored with the
SSO provider.

In addition to the client id and secret, providers typically require links to the
client's main website, the client's privacy policy, and an icon that identifies the
client.  These are included in the provider's with their login and consent dialogs
to inform users which client is requesting access to the user's information.  The
links and icons are persisted with the SSO provider.

Given this manual setup, the SSO workflow proceeds as described below.  In the
following, the REQUIRED, OPTIONAL, and RECOMMENDED descriptions of the request
parmeters are taken from the [OAuth2 specification](https://tools.ietf.org/html/rfc6749#section-4.1.1)

**2i**. The workflow begins with the Preferences Server requesting authorization
from the provider:

```text
GET https://accounts.google.com/o/oauth2/auth
```

#### Parameters

| Name             | Type     | Description |
| ---              | ---      | ---         |
| `client_id`      | `String` | __Required__. The client id of the Preferences Server, generated by Google during registration, and stored in an [`AppAuthProvider`](#application-auth-provider-data-model) record |
| `redirect_uri`   | `String` | __Recommended__. The endpoint of the Preferences Server where the provider redirects to upon successful authorization |
| `scope`          | `String` | __Optional__. The scope of the access to the user's information as stored with the provider.  For example, `openid profile email` will ask for the user's Google profile, email address, and open ID |
| `response_type`  | `String` | __Required__. The value `code` will request an access token to use to access the user's Google information |
| `state`          | `String` | __Recommended__. Anti-forgery unique session token |
| `access_type`    | `String`, one of [`offline`, `online`] | __Optional__. Whether to return a refresh token with the access token (`offline`), defaults to `online`.  This parameter is specfic to Google's API |

Payload: none

**2ii, 2iii**.  Login and consent:  Google SSO redirects back to the Resource
Owner’s space for their login credentials (e.g., user name and password), and
their consent.  Since this is entirely Google's domain, the specifics of it are
not documented here.  Assuming the user successfully logs in and provides the
required consent, Google redirects back to the Preferences Server, as documented
in the next step.

**2iv**. Google redirects to the Preferences Server using the `redirect_uri`,passing an
authorization code:

```text
GET https://<redirect_uri>/
```

#### Parameters

| Name             | Type     | Description |
| ---              | ---      | ---         |
| `code`           | `String` | __Required__. The authorization code generated by Google's authorization service |
| `state`          | `String` | __Required__. Anti-forgery unique session token sent to Google by the Preferences Server in step 2i. |
| `scope`          | `String` | The scope of access to the user's information as stored with Google that the user consented to. |

Payload: None

Notes:

* Reference: [OAuth2 Specification](https://tools.ietf.org/html/rfc6749#section-4.1.2) of this step.
* Google documentation about the [authorization code and anti-forgery token](https://developers.google.com/identity/protocols/oauth2/openid-connect#confirmxsrftoken)
* Google documentaion about the `scope` parameter: [OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)

**2v**. Confirm anti-forgery token:

The Preferences Server checks the value of the `state` parameter and confirms
that it matches the value it generated and sent to Google at step 2i.  If they
match, the Preferences Server concludes that the is a valid request from Google.

**2vi**. Preferences Server Exchanges the authorization code for an access token:

```text
POST https://accounts.google.com/o/oauth2/token
```

#### Body of POST

| Name             | Type     | Description |
| ---              | ---      | ---         |
| `grant_type`     | `String` | __Required__. Must be set to `authorization_code` |
| `code`           | `String` | __Required__. The authorization code sent by Google in the previous step, 2iv |
| `redirect_uri`   | `String` | __Required__. The endpoint of the Preferences Server as was sent to Google in step 2i. |
| `client_id`      | `String` | __Required__. The client id of the Preferences Server, generated by Google during registration, and stored in an [`AppAuthProvider` record](#application-auth-provider-data-model). This is the same value as in step 2i |
| `client_secret`  | `String` | __Required__. The client secret shared between the Preferences Server and Google, generated by Google during registration, and stored in an [`AppAuthProvider` record](#application-auth-provider-data-model). |

Notes:

* Reference: [OAuth2 Access Token Request](https://tools.ietf.org/html/rfc6749#section-4.1.3)

**2vii** Google responds with an access token and an ID token.

```text
HTTP/1.1 200 OK
Content-Type: application/json;charset=UTF-8
{
    "access_token":"2YotnFZFEjr1zCsicMWpAA",
    "token_type":"bearer",
    "expires_in":3600,
    "refresh_token":"tGzv3JOkF0XG5Qx2TlKWIA"
    "state": "FZFEjr1tGzv3JO",
    "id_token": eyJhbGciOiJSUzI1NiIsImtp..." (truncated),
    "scope": "openid"
}
```

#### Payload of response

| Name             | Type     | Description |
| ---              | ---      | ---         |
| `access_token`   | `String` | __Required__. Generated by Google to use to access the user's Google information in the context of the scopes specified in step 2iv |
| `token_type`     | `String` | __Required__. The type of access token, e.g. `bearer` |
| `expires_in`     | `Number` | __Recommended__. The lifespan of the `access_token` in seconds.  After expiring, it will no longer work to access the user's Google information |
| `refresh_token`  | `String` | __Optional__. Used to request new access tokens from Google when the current one expires |
| `state`          | `String` | __Required__. The anti-forgery token sent by the Preferences Server to Google at step 2i |
| `scope`          | `String` | The scope of access to the user's information as stored with Google that the user consented to.  Same value as step 2iv. |
| `id_token`       | `String` | __Optional__. Serialized version of Google user's OpenID. |

Notes:

* The `access_token` can be added to the `Authorization` header of requests sent to Google.
* Reference [OAuth2 Access Token Response](https://tools.ietf.org/html/rfc6749#section-4.1.4)

## To Do

* Document step 1 -- how does UIO and the Edge Proxy trigger the SSO workflow?
  * might be as simple `GET https://<prefsServer>/google/login'
  * use a session id?
* Document steps 3 and 4, after the SSO workflow is complete. What is exchanged
  between the Preferences Server and Edge Proxy, and between the Edge Proxy and UIO?
  * how exactly does the Preferences Server return the authorization to UIO (see: 3ii and
    3iii)?
  * how does UIO pass along its authorization to the Preferences server with the
    requests to Preferences Server API (see: 4i, 4ii?)
  * how does the Preferences Server verify UIO's authorization (see: 4iii)?
* Can refresh tokens be used? How long will the `id_token` from Google be valid
  and how long should the authorization of UIO with the Preferences Server be
  valid?
* Provide a link to Google's documentation on the openID structure
* Document the data model to support SSO -- in terms of what is stored in the Preferences Server database? Possibilities:
  * `AppAuthProvider` for at least the `client_id` and `client_secret` that is shared with Google SSO provider.
  * `User` for storing user particulars such as name, email, password, etc.
  * `SsoAccount` foro profile and openID for SSO users; cross references to `user` and `appAuthProvider`.
  * `AccessToken` for access to the user's Google data; cross references to `ssoAccount`, and `appAuthProvider`
  * `PrefsSafes` for storing user preferences, as per previous GPII model; cross references
    to `user`.
