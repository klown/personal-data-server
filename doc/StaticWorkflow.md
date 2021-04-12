# Preferences Edge Proxy Workflow

One of the workflows we want the Personal Data Storage or Preferences Service to
support is one where a static site makes save/retrieve requests of the secured
service.  Included in this workflow is an OAuth2 authorization sequence where
users are authenticated by a third party single sign on (SSO) provider, such as
Google or Github.

This documents the requests, responses, payloads, and database structures needed
to support static access and single sign on workflows.  For example, a static
site may have incorporated UIO into their pages.  The user wants to save or
retrieve their UIO preferences from the preferences server.

The examples of requests and payloads assume that the OAuth2 authorization server
is Google.  Google provides an [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
where each step can be tried and information about the requests is
displayed, which was used to document some of the details.

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
* **Preferences Server**: An instance of the Preferences Server. Stores
  preferenences and authenticates with a single sign on (SSO) provider, e.g. Google.
* **Google SSO**: Using Google as SSO provider. The examples are based on their
  API but others could be substituted.

## Workflow Description

1. Open login
    1. Trigger login to Preferences server from UIO
    2. UIO makes a local request handled by the Edge Proxy. This is to prevent
       cross origin requests. e.g. `/login/google`
    3. The Edge Proxy redirects this request to the proper endpoint on the
       Preferences Server.
2. The Preferences Server sends the [authentication request](https://developers.google.com/identity/protocols/oauth2/openid-connect#sendauthrequest)
   to Google.
   1. the authentication request includes the following as query parameters:
      - `client_id` identifying the Preferences Server to Google
      - `response_type` which is usually `code`
      - `scope` which would likely be `openid email`
      - `redirect_uri` which is the endpoint on the Preferences Server that
           will receive the response from Google. It must match the authorized
           redirect URI that was pre-registered with Google.
      - `state`, the anti-forgery unique session token
   2. Login and consent:  The Resource Owner may be presented with a login
      screen by Google in their domain, and asked to consent the requested
      scope.
      - If the user is already logged into Google, they will be presented
        with the consent dialog.
   3. The Resource Owner authenticates with Google and grants consent
      - If the user has previously provided consent, Google will present no
        dialog, but will retrieve the scopes that have the user's consent.
   4. [Authorization code and anti-forgery](https://developers.google.com/identity/protocols/oauth2/openid-connect#confirmxsrftoken):
      Google responds to the Preferences Server at the `redirect_uri` including:
      - `state` anti-forgery token from step 2i
      - `code` the authentication code provided by Google
      - `scope` the scopes that the user consented to at step 2iii.
   5. The Preferences Server confirms that the `state` (anti-forgery token) is
      valid by checking that it matches the value it sent to Google in step 2i.
   6. [Exchange Authorization Code](https://developers.google.com/identity/protocols/oauth2/openid-connect#exchangecode):
      The Preferences Server requests exchanging the Authorization Code for an
      Access Token and ID Token. This includes the following:
      - `code`, the Authorization Code sent from the previous response from
         Google
      - `client_id` for the Preferences Server (same value as steps 2i)
      - `redirect_uri` which is the endpoint on the Preferences Server that
         will receive the response from Google (same value as step 2i)
      - `grant_type` which must be set to `authorization_code`
   7. Google responds at the previously specified redirect uri with the Access
      Token and ID Token
      - The `access_token` can be used by the Preferences Server to access the Google API
      - The `id_token` is a [JWT](https://tools.ietf.org/html/rfc7519)
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

## Questions

1. How to best establish the state (anti-forgery token) (see: 1d, 3b)?
2. After authenticating with Google how exactly does the Preferences Server
   return the authorization to UIO (see: 5)?
3. How does UIO pass along its authorization to the Preferences server with the
   requests to Preferences Server API (see: 6a, 6b)?
4. How does the Preferences Server verify UIO's authorization (see: 6c)?
5. Can refresh tokens be used? How long will the `id_token` from Google be valid
   and how long should the authorization of UIO with the Preferences Server be
   valid.

## Single Sign On Details

This section gives more details regarding step 2 above; the part of the static
workflow that is specific to authorization with an SSO provider.

### Client Information From SSO Provider

Prior to executing the SSO workflow, the client must be registered with the SSO
provider, with the result that the provider generates a client id and a client
secret that identifies the Preferences Server to the SSO provider.  This client
id and secret need to be stored in the Preferences Server's database to use when
it sends requests of the provider.

In the following, the REQUIRED, OPTIONAL, and RECOMMENDED descriptions of the
request parmeters are taken from the [OAuth2 specification](https://tools.ietf.org/html/rfc6749#section-4.1.1)

**2i**. The workflow begins with the Preferences Server requesting authorization
from the provider:

```text
GET https://accounts.google.com/o/oauth2/auth
```

#### Parameters

| Name             | Type     | Description |
| ---              | ---      | ---         |
| `client_id`      | `String` | __Required__. The client id of the Preferences Server, stored in an [`ApplicationProvider` record](#application-provider-data-model) |
| `redirect_uri`   | `String` | __Recommended__. The endpoint of the Preferences Server where the provider redirects to upon successful authorization |
| `scope`          | `String` | __Optional__. The scope of the access to the user's information as stored with the provider.  `openId` and `email` will ask for the user's Google profile and email address |
| `response_type`  | `String` | __Required__. The value `code` will request an access token to use to access the user's Google information |
| `state`          | `String` | __Recommended__. Anti-forgery unique session token |
| `access_type`    | `String`, one of [`offline`, `online`] | __Optional__. Whether to return a refresh token with the access token (`offline`), defaults to `online` |

Payload: none

Notes:

- The `access_type` is specific to Google's SSO.

**2ii, 2iii**.  Login and consent:  Google SSO redirects back to the Resource
Owner’s space for their login credentials (e.g., user name and password), and
their consent.  Since this is entirely Google's domain, the specifics of it are
not documented here.  Assuming the user successfully logs in and provides the
required consent, Google redirects back to the Preferences Server, as documented
in the next step.

**2iv**. Google redirects to the Preferences Server using the `redirect_uri`,
passing an authorization code:

```text
GET https://<callback_uri>/
```
#### Parameters

| Name             | Type     | Description |
| ---              | ---      | ---         |
| `code`           | `String` | __Required__. The authorization code (random characters) generated by Google's authorization service |
| `state`          | `String` | __Required__. Anti-forgery unique session token sent to Google by the Preferences Server in step 2i. |
| `scope`          | `String` | The scope of access to the user's information as stored with Google. |

Payload: None

Notes:
- Reference: [OAuth2 Specification](https://tools.ietf.org/html/rfc6749#section-4.1.2) of this step.

**CONTINUE EDITING FROM HERE**

4. Step 3 - this is then separately provided to the /access_token endpoint to
   exchange for an access token which can be used in further requests for
   preferences.
  - a. The /access_token endpoint *is* proxied by the edge server.
  - b. Part of this POST body is the client secret. It appears that providing this
     is the key responsibility of the multi-personality server. It will be
     maintained securely in its configuration and fished out when it receives a
     matching request from the edge server.

```text
OAuth2: https://tools.ietf.org/html/rfc6749#section-4.1.3

POST https://accounts.google.com/o/oauth2/token
Body:
 grant_type=authorization_code
 code=:the_authorization_code
 redirect_uri=:redirect_uri
 client_id=:client_id
 client_secret=:client_secret

"Okay Google, please give me (Preferences Server) an access token. Here's the
authorization code you sent me (as well as the original callback uri, my id, and
the secret we share)."

- grant_type
  - REQUIRED
  - must be set to "authorization_code"
- code
  - REQUIRED
  - The authorization code sent by Google at the previous step where it called
    back to the client.
  - Google checks this value against the one it sent at the previous step.  They
    must be identical.
- redirect_uri
  - REQUIRED
  - The redirect_uri that was specified in the first step by the client.  This
    must be identical.
- client_id
  - REQUIRED if the client was not authenticated previously.
  - the client_id generated by Google during manual registration with Google.
  - as noted at step 1, the client_id is stored in the client's database.
- client_secret
  - REQUIRED if the client was not authenticated previously.
  - the client_secret that was generated by Google during manual registration.
  - the client_secret is stored in the client's database.

Note that GPII stored the client_id and client_secret as part of the
"Client Credentials" record.  The django-allauth package stores them in a
"Social Application" record.
```

5. The access token can be used in preferences endpoints.
  - a. Question - is identication purely by access token sufficient for all of
     these endpoints? it appears that the authorization server can always decode
     the preferences consumer’s id by fishing this out of its tables indexed by
     the token - does this mean that the edge server’s actions for all these
     endpoints can just be a no-op proxying?
  - b. Question - i) do we still need two different grant types (authorization
     code, and client credentials) - ii) does the presence of these different
     grant types have any implications at all for the implementation of the edge
     and proxy servers?

```text
OAuth2: https://tools.ietf.org/html/rfc6749#section-4.1.4

"Preferences Server, here is your access token."

Response from Google:
Payload example:
{
   "access_token": "2YotnFZFEjr1zCsicMWpAA",
   "token_type": "Bearer",
   "expires_in": 3600,
   "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA",
}

- access_token
  - REQUIRED
  - The access token issued by Google
- token_type
  - One of [bearer, mac], and used in the Authorization block of future request
    headers.  GPII and Clusive use "bearer".
  - e.g., Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA
  - see https://tools.ietf.org/html/rfc6749#section-7.1 for more details.
- expires_in
  - RECOMMENDED
  - The number of seconds, typcially 3600, that the access_token is vald for.
- refresh_token
  - OPTIONAL
  - Can be used by the client to request a new access_token from Google when the
    current one expires.
  - Client must use the same authorization_code as in the previous step to get
    a new access_token.
- scope
  - OPTIONAL if identical to the scope specified in the first step.
  - REQUIRED if no scope was initially specified by the client at step one.
  - Defines the scope of access to Google user's information, e.g., their gmail
    address.  The format is specified by the authorization server (Google).
- state
  - REQUIRED if there was a state given in the authorization request at step
    one.
  - It must match the state generated by the client at step one.

All of the above is stored in a record in the client's data base. GPII
termed them "App Installation Authorization" records.  The django-allauth
library calls them "Social Application Token" records.
```
