# OAuth2 Guide

Note:  This is based on the
[GPII OAuth2 Guide](https://wiki.gpii.net/w/GPII_OAuth_2_Guide) from the
[GPII wiki](https://wiki.gpii.net).

## Introduction

We are adding access control to the Cloud-Based Flow Manger to secure access to
user preferences. We are implementing the security using the
[OAuth 2.0 Authorization Framework](http://oauth.net/2/). Please see the
[OAuth 2.0 Resources](#oauth-20-resources) section below for a list of resources.

## Supported OAuth 2.0 Grant Types

The OAuth 2.0 specification provides for a number of different usage scenarios.
GPII supports a custom grant types "Resource Owner GPII Key Grant" that is used
for GPII app installation to access user settings from GPII Cloud.

## Resource Owner GPII Key Grant

Resource Owner GPII Key Grant is a custom grant created based upon
[The OAuth 2.0 Resource Owner Password Credentials Grant](https://tools.ietf.org/html/rfc6749#section-4.3).
This grant is used when requesting user settings from GPII Cloud. A typical use
case is, a GPII app installed on a user's computer requests user settings
associated with a GPII key from GPII Cloud.

### Work Flow

Requesting a user's setting from GPII Cloud follows these steps:

1. The OAuth client, such as a GPII app, authenticates with the authorization
server and requests an access token
2. Use the access token to request user settings

## Step 1: Request an access token

`POST <authorization-server>/access_token`

### Parameters

Send these parameters in the `POST` body using the
`application/x-www-form-urlencoded` `Content-Type`.

| Name            | Description |
| ----            | ----------- |
| `grant_type`    | The value must be set to "password". |
| `client_id`     | The OAuth2 client id. |
| `client_secret` | The OAuth2 client secret. Confidential shared secret, used to verify the identity of the OAuth2 client. |
| `username`      | The GPII key. |
| `password`      | Any string.<br><em>Note:</em> The GPII authorization server [uses the oauth2orize library](https://github.com/jaredhanson/oauth2orize) to implement the support of the OAuth2 authorization grants. The value of the `password` field can NOT be left empty due to the requirement of this library:<ol><li>The source code in the [oauth2orize library](https://github.com/jaredhanson/oauth2orize) that requires the presence of `password` field: [https://github.com/jaredhanson/oauth2orize/blob/master/lib/exchange/password.js#L90](https://github.com/jaredhanson/oauth2orize/blob/master/lib/exchange/password.js#L90)</li><li>The oauth2orize library does not yet support custom grant type: [https://github.com/jaredhanson/oauth2orize/issues/202](https://github.com/jaredhanson/oauth2orize/issues/202)</li></ol> |

### Response

The `/access_token` endpoint will respond with a JSON document of this form:

```snippet
{
    "access_token": "<access_token>",
    "expiresIn": <number_of_seconds_to_expire>,
    "token_type": "Bearer"
}
```

For example:

``` .json
{
    "access_token": "8ea3457bf283db5d34ea5a4079fa36b2",
    "expiresIn": 3600,
    "token_type": "Bearer"
}
```

## Step 2.1: Use the access token to request user settings

<em>Note: The implementation of this step is in progress.</em>

With the acesss token, we can now request user settings.

`GET /:gpiiKey/settings/:device`

Provide the access token using an "Authorization" header:

`Authorization: Bearer <access_token>`

For example:

`Authorization: Bearer 8ea3457bf283db5d34ea5a4079fa36b2`

### Response

The `/settings` endpoint will respond with a JSON document of lifecycle
instructions. An example of the return payload can be found
[here](https://github.com/cindyli/gpii-architecture-docs/blob/GPII-2164/payloads/CloudBasedFlowManagerUntrustedSettings.md#user-content-return-payload).

## Step 2.2: Use the access token to save user preferences

<em>Note: The implementation of this step is in progress.</em>

With the access token, we can now request user settings.

`PUT /:gpiiKey/settings`

Provide the access token using an "Authorization" header:

`Authorization: Bearer <access_token>`

For example:

`Authorization: Bearer 8ea3457bf283db5d34ea5a4079fa36b2`

### Response

The `/settings` endpoint will respond with a JSON document of whether the save
is successful.

For example:

``` .json
{
    "gpiiKey": "li",
    "message": "Successfully updated."
}
```

## Solution Registry entries

| Name                 | Description |
| ----                 | ----------- |
| OAuth2 client `id`   | Used as the OAuth 2.0 `client_id`. |
| OAuth2 client `name` | The client name used in the user interface. |
| `client_secret`      | Confidential shared secret, used to verify the identity of the OAuth2 client. |

## OAuth 2.0 Resources

- [The OAuth 2.0 website](http://oauth.net/2/)
- [RFC 6749 The OAuth 2.0 Authorization Framework](http://tools.ietf.org/html/rfc6749)
- [RFC 6819 OAuth 2.0 Threat Model and Security Considerations](http://tools.ietf.org/html/rfc6819)
- ["OAuth 2 Simplified" article by Aaron Parecki](http://aaronparecki.com/articles/2012/07/29/1/oauth2-simplified)
- [GitHub OAuth2 API documentation](https://developer.github.com/v3/oauth/)
