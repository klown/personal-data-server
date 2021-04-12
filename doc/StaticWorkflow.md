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
    a. Trigger login to Preferences server from UIO
    b. UIO makes a local request handled by the Edge Proxy. This is to prevent
       cross origin requests. e.g. `/login/google`
    c. The Edge Proxy redirects this request to the proper endpoint on the
       Preferences Server.
2. The Preferences Server sends the [authentication request](https://developers.google.com/identity/protocols/oauth2/openid-connect#sendauthrequest)
   to Google.
    a. the authentication request includes the following as query parameters:
        * `client_id` identifying the Preferences Server to Google
        * `response_type` which is usually `code`
        * `scope` which would likely be `openid email`
        * `redirect_uri` which is the endpoint on the Preferences Server that
           will receive the response from Google. It must match the authorized
           redirect URI that was pre-regisitered with Google.
        * `state`, the anti-forgery unique session token
    b. Login and consent:  The Resource Owner may be presented with a login
       screen by Google in their domain, and asked to consent the requested
       scope.
        * If the user is already logged into Google, they will be presented
          with the consent dialog unless they have previously consented.  In
          that case, Google automatically authorizes the user and retrieves
          their consent.
    c. The Resource Owner authenticates with Google and grants consent
    d. [Authorization code and anti-forgery](https://developers.google.com/identity/protocols/oauth2/openid-connect#confirmxsrftoken):
       Google responds to the Preferences Server at the `redirect_uri` including:
        * `state` anti-forgery token from step 1d
        * `code` the authentication code provided by Google
        * `scope` the scopes that the user consented to at step 2.
    e. The Preferences Server confirms that the `state` (anti-forgery token) is
       valid by checking that it matches the value it sent to Google in step 1d.
    f. [Exchange Authorization Code](https://developers.google.com/identity/protocols/oauth2/openid-connect#exchangecode):
       The Preferences Server requests exchanging the Authorization Code for an
       Access Token and ID Token. This includes the following:
        * `code`, the Authorization Code sent from the previous response from
           Google
        * `client_id` for the Preferences Server (same value as steps 2a and 2d)
        * `redirect_uri` which is the endpoint on the Preferences Server that
          will receive the response from Google (same value as step 2a and 2d)
        * `grant_type` which must be set to `authorization_code`
    g. Google responds at the previously specified redirect uri with the Access
       Token and ID Token
        * The `access_token` can be sent to Google to access the Google API
        * The `id_token` is a [JWT](https://tools.ietf.org/html/rfc7519)
          identifying the Resource Owner and is signed by Google.
3. Authenticate and Authorize UIO
    a. Using the `id_token` the Preferences Server authenticates the Resource Owner
    b. Somehow the Preferences Server passes back the authorization to the Edge
       Proxy
    c. Somehow the Edge Proxy passes back the authorization to UIO
4. Making Authorized Requests to the Preferences Server
    a. Somehow, using the authorization, makes a local request to the
       Preferences Server handled by the Edge Proxy. e.g. a GET request to
       `/preferences`
    b. Somehow, the Edge Proxy redirects this request to a Preferences Server
       end point
    c. Somehow, the Preferences Server validates the authorization of this
       request
    d. The Preferences Server responds to the Edge Proxy
    e. The Edge Proxy responds to UIO

## Questions

1. How to best establish the state (anti-forgery token) (see: 1d, 3b)?
2. After authenticating with Google how exactly does the Preferences Server
   return the authorization to UIO (see: 5)?
3. How does UIO pass along its authorization to the Preferences server with the
   requests to Preferences Server API (see: 6a, 6b)?
4. How does the Preferences Server verify UIO's authorization (see: 6c)?
5. Can refresh tokens be used? How long will the `id_token` from Google be valid
   and how long should the authorization of UIO with the Preferences Server be valid.


## Single Sign On Workflow Details

This section give more details regarding the portion of the static workflow that
is specific to authorization with an SSO provider.

```text
In the following, the REQUIRED, OPTIONAL, and RECOMMENDED are as documented in
the [OAuth2 specification](https://tools.ietf.org/html/rfc6749#section-4.1.1)

Line feeds in the URLs are for clarity and to avoid long lines that scroll
horizontally.

GET https://accounts.google.com/o/oauth2/auth
    ?client_id=:clientId&redirect_uri=:redirectUri&scope=:scope
    &response_type=code&state-:state&access_type=offline
Payload: none

"Google, authorize a user to access the preferences server."

Parameter breakdown:
- client_id
  - REQUIRED
  - Generated by Google during a prior manual registration process.
  - Stored by the client in its database.
  - Passed to Google by the client when making this /o/oauth2/auth/ request
  - This is the client_id associated with the preferences server.
  - Stored in the proxy server's database?
- redirect_uri
  - RECOMMENDED
  - Decided on by the client and set during the manual Google registration
    process.  It is stored in Google's database.
  - Used by Google at the end of its authorization process to call back to the
    client.  Thus it must be an endpoint implemented by the client.
  - Can also be used as another way to confirm that the client *is* legitimate
    since it is known to both parties and can be checked.
  - But, passing a redirect_uri that Google does not have registered is allowed,
    and is a way to have multiple callbacks.
    - It may be that even if the endpoint is different, the callback's host
      domain must be identical to one registered with Google -- this
      requires further invesitigation. For example, the redirect registered with
      Google might be "preferences.org/callback/", but on this request, it's set
      to "preferences.org/anothercallback/".  Same server, different end point.
  - If no redirect_uri is specified, Google will use the one in its database
    that was set at manual registration.
- scope
  - OPTIONAL
  - defines which information about the user is shared by this authorization
  - the format of this parameter is defined by Google, e.g. "profile" for user's
    name and email; "openId" to get an OpenID JWT.  Other OAuth2 providers may
    define their scopes differently.
- response_type
  - REQUIRED
  - one of [code, token, or an extended type], depending on the workflow.
  - "code" means this is a request for an authorization code, and, ultimately,
    an access token.  The rest of this document assumes "code", but the "token"
    work flow might be more appropriate for the proxy server scenario -- this
    needs further investigation.
  - "token" is used in the "Implicate Grant" workflow
    (https://tools.ietf.org/html/rfc6749#section-4.2).  Here, the resource owner
    (who is that?) asks the authorization server (Google) to first check the
    client_id and redirect_uri against its known clients (the preferences
    server is the client).  If they match, Google will somehow authenticate the
    resource owner.  If successful, Google will respond with an access token,
    sending it to the client -- skip to step 5.
  - an extended type is a mutually defined type known to the client and provider
    See "Defining New Types" in the OAuth2 spec: https://tools.ietf.org/html/rfc6749#se
- state
  - RECOMMENDED
  - generated by the client and passed back-and-forth between the client and
    Google for the duration of the OAuth2 process.  Another way both parties
    can confirm that the exchange is legitimate.
  - needs to be stored somewhere by the client for use throughout the
    authorization process (see final step 5 below -- the client stores it inside
    the same record as the one containing the access token).
- access_type
  - OPTIONAL and specific to Google's implementation of this endpoint.
  - One of [online, offline]
  - "Offline" means to return a refresh token in addition to an access token at
    the point in the process where Google sends the access token (Step 5 below),
    and whenever reauthentication requests are made of Google.
  - "Online" means to not issue a refresh token.
  - Google must store the access_type value.
  - Client will store this vaue in its database when it receives the access
    token (Step 5 below)
```

3. The login UI redirects the user back to the consumer’s space, now including
   an AUTHORIZATION CODE in the URL - Step 2. This can be read from the
   consumer’s origin by client or server-side code.

```
Specification reference for this step: https://tools.ietf.org/html/rfc6749#section-4.1.2

GET https://<callback_uri>/
    ?state=:state&code=:code
    &scope=email profile openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile
    &authuser=0&prompt=consent
Payload: none
"Preferences Server, I (Google) have authorized this user; here's an
authorization code".

- callback_uri
  - The callback_uri either passed at the previous step, or the callback_uri
    stored by Google in its database when the client was registerd with Google.
  - Used as the client's endpoint for Google to inform the client that the user
    was successfully authorized.
- code
  - REQUIRED
  - The authorization code (random characters) generated by the authorization
    server (Google).
- state
  - REQUIRED IF SENT BY CLIENT AT PREVIOUS STEP
  - The same value that the client generated and sent to Google at the previous
    step and used to check the legitimacy of this request.
  - If no state was generated at the previous step, Google does not send a
    state value on this callback request.
- scope
  - NOT PART OF THE OAUTH2 SPEC
  - Sent by Google using their format specifying the scope of the access to
    information about the user stored on Google's site.  For example:
    - email
    - profile
    - https://www.googleapis.com/auth/userinfo.email
    - https://www.googleapis.com/auth/userinfo.profile
- authuser=0
  - NOT PART OF THE OAUTH2 SPEC
  - Sent by Google indicating ??? -- not sure what this is.
- prompt=consent
  - NOT PART OF THE OAUTH2 SPEC
  - Sent by Google indicating ??? -- guess -- that consent was asked of the user
    and they agreed.
```

Comment:  the above is how OAuth2 normally works.  The requirement for the Edge
Proxy is for the redirection, the `redirect_uri`, to return to the consumer's
space, passing it the authorization code -- "Consumer
(static-site-with-prefs-editor), I (Google) have authorized this user; here is
an authorization code".  Can this be done?

4. Step 3 - this is then separately provided to the /access_token endpoint to
   exchange for an access token which can be used in further requests for
   preferences.
  - a. The /access_token endpoint *is* proxied by the edge server.
  - b. Part of this POST body is the client secret. It appears that providing this
     is the key responsibility of the multi-personality server. It will be
     maintained securely in its configuration and fished out when it receives a
     matching request from the edge server.

```
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

```
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
